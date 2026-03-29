import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import db from "../db";
import { addresses, carts, settings, orders, orderItems, productVariants, inventoryLogs, coupons, couponUsages, cartItems, returnRequests, returnRequestImages } from "../db/schema";
import { eq, and, asc, desc, count, sql, gte, lte, SQL } from "drizzle-orm";
// @ts-ignore
import PDFDocument from "pdfkit";

// Helper specifically designed returning strictly computed floating thresholds
const computeCartTotals = (cart: any) => {
    let subtotal = 0;
    cart.items.forEach((item: any) => {
        subtotal += item.product.price * item.quantity;
    });

    let discount = 0;
    if (cart.coupon) {
        if (cart.coupon.type === "FLAT") discount = cart.coupon.discountValue;
        else if (cart.coupon.type === "PERCENTAGE") {
            discount = subtotal * (cart.coupon.discountValue / 100);
            if (cart.coupon.maxDiscount && discount > cart.coupon.maxDiscount) discount = cart.coupon.maxDiscount;
        }

        if (cart.coupon.minOrderValue && subtotal < cart.coupon.minOrderValue) discount = 0;
    }

    const total = subtotal - discount > 0 ? subtotal - discount : 0;
    return { subtotal, discount, total };
};

// ==========================================
// USER ROUTES 
// ==========================================

export const placeOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const { addressId } = req.body;

        if (!addressId) return next(new AppError("An Address Identifier is actively required for checkout natively", 400));

        // 1. Validate Mapping
        const address = await db.query.addresses.findFirst({
            where: eq(addresses.id, addressId)
        });
        if (!address || address.userId !== userId) return next(new AppError("Invalid or explicitly missing execution mappings matching identity", 400));

        const cart = await db.query.carts.findFirst({
            where: eq(carts.userId, userId),
            with: {
                coupon: true,
                items: {
                    with: {
                        variant: true,
                        product: {
                            with: { variants: true }
                        }
                    }
                }
            }
        });

        if (!cart || cart.items.length === 0) return next(new AppError("Cannot execute financial logic natively checking against empty active sessions", 400));

        // 2. Mathematically Aggregate Safeties
        const calculated = computeCartTotals(cart);

        // 3. Begin Strict Validation Flow explicitly checking over Variant layers recursively
        for (const item of cart.items) {
            if (item.variant.productId !== item.productId) {
                return next(new AppError(`Selected variant is invalid for ${item.product.title}`, 400));
            }

            if (item.quantity > item.variant.stock) {
                return next(new AppError(`Critically insufficient inclusive bounding mapping stock levels intercepting ${item.product.title} structurally`, 400));
            }
        }

        // Generate order number from store settings (fallback to defaults)
        const orderSettings = await db.query.settings.findMany({
            where: eq(settings.group, "defaults")
        });
        const settingsMap: Record<string, string> = {};
        for (const s of orderSettings) settingsMap[s.key] = s.value;

        const prefix = settingsMap.orderPrefix || "AHI";
        const separator = settingsMap.orderSeparator || "-";
        const digits = parseInt(settingsMap.orderDigits || "5", 10);
        const includeYear = settingsMap.orderIncludeYear !== "false";

        const date = new Date();
        const randomNum = Math.floor(Math.pow(10, digits - 1) + Math.random() * 9 * Math.pow(10, digits - 1));
        const orderNumber = includeYear
            ? `${prefix}${separator}${date.getFullYear()}${separator}${randomNum}`
            : `${prefix}${separator}${randomNum}`;

        // 4. Fire execution bounded exclusively through $transaction guaranteeing state!
        const result = await db.transaction(async (tx) => {

            // 4a. Fire Order Creation
            const [order] = await tx.insert(orders).values({
                orderNumber,
                userId,
                addressId,
                subtotal: calculated.subtotal,
                discount: calculated.discount,
                total: calculated.total,
                appliedCouponId: cart.couponId,
            }).returning();

            const itemsData = cart.items.map(item => ({
                orderId: order.id,
                productId: item.productId,
                variantId: item.variantId,
                productName: item.product.title,
                sku: item.variant.sku,
                price: item.product.price,
                quantity: item.quantity
            }));
            
            await tx.insert(orderItems).values(itemsData);

            // 4b. Stock Adjustments & Accounting Ledgers dynamically!
            for (const item of cart.items) {
                const variantTarget = item.variant;

                // Decrease explicitly safely capturing returned values for safety checks
                const [updatedVariant] = await tx.update(productVariants)
                    .set({ stock: sql`${productVariants.stock} - ${item.quantity}` })
                    .where(eq(productVariants.id, variantTarget.id))
                    .returning();

                // Check mathematically
                if (updatedVariant.stock < 0) {
                    throw new Error(`Critical transaction boundary explicitly intercepted negative floats dropping stock mapped to ${item.product.title}`);
                }

                // Attach historical ledger securely mapping to active request execution natively
                await tx.insert(inventoryLogs).values({
                    variantId: variantTarget.id,
                    changeType: "ORDER_PLACED",
                    prevStock: variantTarget.stock,
                    newStock: updatedVariant.stock,
                    changedById: userId
                });
            }

            // 4c. Process Coupon Exhaustion Logic explicitly natively
            if (cart.coupon) {
                await tx.update(coupons)
                    .set({ usageCount: sql`${coupons.usageCount} + 1` })
                    .where(eq(coupons.id, cart.coupon.id));

                await tx.insert(couponUsages).values({
                    couponId: cart.coupon.id,
                    userId
                });
            }

            // 4d. Burn Cart safely terminating transaction bounds dynamically
            await tx.delete(cartItems).where(eq(cartItems.cartId, cart.id));
            if (cart.couponId) {
                await tx.update(carts).set({ couponId: null }).where(eq(carts.id, cart.id));
            }

            return order;
        });

        res.status(201).json({
            success: true,
            message: "Execution executed safely binding securely.",
            data: result
        });

    } catch (error: any) {
        // Explicitly catch manual transaction rollbacks dynamically securely
        if (error.message.includes("Critical transaction boundary explicitly intercepted negative floats")) {
            return next(new AppError(error.message, 400));
        }
        next(error);
    }
}

export const getMyOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;

        const ordersList = await db.query.orders.findMany({
            where: eq(orders.userId, userId),
            with: { items: true, address: true },
            orderBy: [desc(orders.createdAt)]
        });

        res.status(200).json({ success: true, data: ordersList });
    } catch (error) {
        next(error);
    }
}

export const getOrderById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const userId = req.user!.id;
        const role = req.user!.role;

        const order = await db.query.orders.findFirst({
            where: eq(orders.id, id),
            with: {
                items: true,
                address: true,
                user: { columns: { id: true, name: true, email: true } }
            }
        });

        if (!order) return next(new AppError("Execution implicitly missing bounded relations cleanly", 404));

        // Native access bounds
        if (role !== "ADMIN" && order.userId !== userId) {
            return next(new AppError("Forbidden explicit execution interception cleanly structurally bounding constraints safely", 403));
        }

        res.status(200).json({ success: true, data: order });
    } catch (error) {
        next(error);
    }
}


export const cancelOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const userId = req.user!.id;

        const order = await db.query.orders.findFirst({ where: eq(orders.id, id) });
        if (!order || order.userId !== userId) return next(new AppError("Undefined securely dropped.", 404));

        if (order.status !== "PENDING" && order.status !== "PROCESSING") {
            return next(new AppError("Active bindings explicitly block cancellations cleanly mapping execution structurally", 400));
        }

        // Restock constraints natively mapping bounds securely ...
        const [updatedOrder] = await db.update(orders)
            .set({ status: "CANCELLED", updatedAt: new Date() })
            .where(eq(orders.id, id))
            .returning();

        res.status(200).json({ success: true, message: "Actively resolved execution intelligently", data: updatedOrder });

    } catch (error) {
        next(error);
    }
}

export const requestReturn = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const userId = req.user!.id;
        const { reason, description, images } = req.body;

        if (!reason) return next(new AppError("Return reason is required.", 400));

        const order = await db.query.orders.findFirst({
            where: eq(orders.id, id),
            with: { returnRequest: true }
        });
        if (!order || order.userId !== userId) return next(new AppError("Order not found.", 404));
        if (order.status !== "DELIVERED") return next(new AppError("Only delivered orders can be returned.", 400));
        if (order.returnRequest !== null) return next(new AppError("A return request already exists for this order.", 400));

        const result = await db.transaction(async (tx) => {
            const [updatedOrder] = await tx.update(orders)
                .set({ status: "RETURNED" })
                .where(eq(orders.id, id))
                .returning();

            const [newReturnRequest] = await tx.insert(returnRequests).values({
                orderId: id,
                userId,
                reason,
                description: description || null
            }).returning();

            let reqImages: any[] = [];
            if (images && images.length > 0) {
                const imageData = images.map((url: string) => ({ url, returnId: newReturnRequest.id }));
                reqImages = await tx.insert(returnRequestImages).values(imageData).returning();
            }

            return {
                order: updatedOrder,
                returnRequest: {
                    ...newReturnRequest,
                    images: reqImages
                }
            };
        });

        res.status(200).json({
            success: true,
            message: "Return request submitted successfully.",
            data: result
        });

    } catch (error) {
        next(error);
    }
}

// ==========================================
// ADMIN ROUTES 
// ==========================================

export const getAllOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { status, dateFrom, dateTo, userId, page = "1", limit = "10" } = req.query;

        const conditions: SQL<unknown>[] = [];
        if (status) conditions.push(eq(orders.status, status as any));
        if (userId) conditions.push(eq(orders.userId, userId as string));

        if (dateFrom) conditions.push(gte(orders.createdAt, new Date(dateFrom as string)));
        if (dateTo) conditions.push(lte(orders.createdAt, new Date(dateTo as string)));

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
        const skip = (Number(page) - 1) * Number(limit);

        const [ordersList, totalCountResult] = await Promise.all([
            db.query.orders.findMany({
                where: whereClause,
                with: {
                    address: true,
                    user: { columns: { name: true, email: true } }
                },
                offset: skip,
                limit: Number(limit),
                orderBy: [desc(orders.createdAt)]
            }),
            db.select({ count: count() }).from(orders).where(whereClause)
        ]);

        const totalCount = totalCountResult[0].count;

        res.status(200).json({
            success: true,
            data: {
                orders: ordersList,
                meta: { totalCount, page: Number(page), limit: Number(limit) }
            }
        });
    } catch (error) {
        next(error);
    }
}

export const updateOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const { status } = req.body;

        const [order] = await db.update(orders)
            .set({ status: status as any, updatedAt: new Date() })
            .where(eq(orders.id, id))
            .returning();

        res.status(200).json({ success: true, message: "Updated bound structures securely.", data: order });
    } catch (error) {
        next(error);
    }
}

// ==========================================
// UTILITIES (Invoice Generation natively buffering pure explicit PDFs efficiently)
// ==========================================

export const generateInvoicePDF = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const userId = req.user!.id;
        const role = req.user!.role;

        const order: any = await db.query.orders.findFirst({
            where: eq(orders.id, id),
            with: {
                items: true,
                address: true,
                user: { columns: { name: true, email: true } }
            }
        });

        if (!order) return next(new AppError("Execution bounds cleanly terminated.", 404));
        if (role !== "ADMIN" && order.userId !== userId) return next(new AppError("Privacy bounds securely maintained natively.", 403));

        // Initialize Explicit Response Stream Native Mapping
        const doc = new PDFDocument({ margin: 50 });
        const filename = `Invoice_${order.orderNumber}.pdf`;

        res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-type', 'application/pdf');

        doc.pipe(res);

        // Conceptual Layout
        doc.fontSize(20).text("AHI JEWELLERY INVOICE", { align: "center" });
        doc.moveDown();

        doc.fontSize(12).text(`Order Number: ${order.orderNumber}`);
        doc.text(`Date: ${order.createdAt.toLocaleDateString()}`);
        doc.text(`Status: ${order.status}`);
        doc.moveDown();

        doc.text("Bill To:");
        doc.text(order.address.fullName);
        doc.text(order.address.addressLine1);
        doc.text(`${order.address.city}, ${order.address.state} ${order.address.pincode}`);
        doc.moveDown();

        doc.text("---------------------------------------------------------");
        order.items.forEach((item: any) => {
            doc.text(`${item.productName} (x${item.quantity})  -  $${(item.price * item.quantity).toFixed(2)}`, { align: "left" });
        });
        doc.text("---------------------------------------------------------");

        doc.moveDown();
        doc.text(`Subtotal: $${order.subtotal.toFixed(2)}`, { align: "right" });
        doc.text(`Discount: -$${order.discount.toFixed(2)}`, { align: "right" });
        doc.text(`Total: $${order.total.toFixed(2)}`, { align: "right", underline: true });

        doc.end();

    } catch (error) {
        next(error);
    }
}
