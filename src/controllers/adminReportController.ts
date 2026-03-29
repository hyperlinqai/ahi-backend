import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import db from "../db";
import { orders, productVariants, users, refunds } from "../db/schema";
import { eq, and, notInArray, gte, lte, desc, asc } from "drizzle-orm";
import { parse } from "json2csv";

const extractDateBounds = (req: Request) => {
    const { dateFrom, dateTo } = req.query;

    const from = dateFrom ? new Date(dateFrom as string) : new Date(new Date().setDate(new Date().getDate() - 30));
    const to = dateTo ? new Date(dateTo as string) : new Date();

    return { from, to };
};

const handleExport = (res: Response, data: any[], filename: string) => {
    try {
        if (!data || data.length === 0) {
            return res.status(200).json({ success: true, count: 0, data: [] });
        }

        const csv = parse(data);
        res.header('Content-Type', 'text/csv');
        res.attachment(`${filename}.csv`);
        return res.send(csv);
    } catch (err) {
        return res.status(500).json({ success: false, message: "Export mechanism abstractly failed internally." });
    }
};

export const getSalesReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { from, to } = extractDateBounds(req);
        const { format } = req.query;

        const ordersList = await db.query.orders.findMany({
            where: and(
                gte(orders.createdAt, from),
                lte(orders.createdAt, to),
                notInArray(orders.status, ["CANCELLED", "RETURNED"])
            ),
            columns: { id: true, total: true, discount: true, createdAt: true, status: true, orderNumber: true }
        });

        const revenueTotal = ordersList.reduce((sum, order) => sum + Number(order.total), 0);

        if (format === 'csv') {
            return handleExport(res, ordersList, `sales_report_${from.toISOString().split('T')[0]}_to_${to.toISOString().split('T')[0]}`);
        }

        res.status(200).json({
            success: true,
            totalRevenue: revenueTotal,
            count: ordersList.length,
            data: ordersList
        });
    } catch (error) {
        next(error);
    }
}

export const getInventoryReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { format } = req.query;

        const variants = await db.query.productVariants.findMany({
            with: {
                product: {
                    columns: { title: true, brand: true },
                    with: { category: { columns: { name: true } } }
                }
            },
            orderBy: [asc(productVariants.stock)]
        });

        const flattenedData = variants.map(v => ({
            sku: v.sku,
            productName: v.product?.title || "N/A",
            brand: v.product?.brand || "N/A",
            category: v.product?.category?.name || "N/A",
            variantName: v.name,
            variantValue: v.value,
            stock: v.stock,
            alertLevel: v.lowStockAlert,
            status: v.stock === 0 ? "Out of Stock" : (v.stock <= v.lowStockAlert ? "Low Stock" : "In Stock")
        }));

        if (format === 'csv') {
            return handleExport(res, flattenedData, `inventory_report`);
        }

        res.status(200).json({ success: true, count: flattenedData.length, data: flattenedData });

    } catch (error) {
        next(error);
    }
}

export const getCustomerReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { from, to } = extractDateBounds(req);
        const { format } = req.query;

        const usersList = await db.query.users.findMany({
            where: and(
                eq(users.role, "USER"),
                gte(users.createdAt, from),
                lte(users.createdAt, to)
            ),
            columns: { id: true, name: true, email: true, isVerified: true, isBlocked: true, createdAt: true },
            orderBy: [desc(users.createdAt)]
        });

        const verifiedCount = usersList.filter(u => u.isVerified).length;

        if (format === 'csv') {
            return handleExport(res, usersList, `customer_report_${from.toISOString().split('T')[0]}`);
        }

        res.status(200).json({ success: true, verifiedCount, count: usersList.length, data: usersList });
    } catch (error) {
        next(error);
    }
}

export const getReturnsReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { from, to } = extractDateBounds(req);
        const { format } = req.query;

        const refundsList = await db.query.refunds.findMany({
            where: and(
                gte(refunds.createdAt, from),
                lte(refunds.createdAt, to)
            ),
            with: {
                order: {
                    columns: {
                        orderNumber: true,
                        userId: true
                    },
                    with: {
                        user: { columns: { name: true, email: true } },
                        items: {
                            columns: {
                                productName: true,
                                quantity: true,
                                price: true
                            }
                        }
                    }
                },
                payment: {
                    columns: {
                        razorpayPaymentId: true,
                        status: true
                    }
                }
            },
            orderBy: [desc(refunds.createdAt)]
        });

        const flattenedRefunds = refundsList.map(r => ({
            refundId: r.id,
            razorpayRefundId: r.razorpayRefundId,
            orderNumber: r.order?.orderNumber || "N/A",
            customerName: r.order?.user?.name || "N/A",
            customerEmail: r.order?.user?.email || "N/A",
            amount: Number(r.amount),
            reason: r.reason || "N/A",
            status: r.status,
            paymentStatus: r.payment?.status || "N/A",
            razorpayPaymentId: r.payment?.razorpayPaymentId || "N/A",
            itemsCount: r.order?.items?.length || 0,
            totalOrderValue: (r.order?.items || []).reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0),
            createdAt: r.createdAt
        }));

        const totalRefundAmount = refundsList.reduce((sum, r) => sum + Number(r.amount), 0);
        const refundCount = refundsList.length;

        if (format === 'csv') {
            return handleExport(res, flattenedRefunds, `returns_report_${from.toISOString().split('T')[0]}`);
        }

        res.status(200).json({
            success: true,
            count: refundCount,
            totalRefundAmount,
            data: flattenedRefunds
        });
    } catch (error) {
        next(error);
    }
}
