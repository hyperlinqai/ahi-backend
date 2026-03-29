import { Request, Response, NextFunction } from "express";
import db from "../db";
import { orders, users, products, productVariants, refunds, orderItems } from "../db/schema";
import { eq, and, or, notInArray, gte, lt, desc, asc, count, sum, sql, inArray } from "drizzle-orm";

const getTodayBounds = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return { today, tomorrow };
};

// ─── Stats ───────────────────────────────────────────────────────────────────
export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { today, tomorrow } = getTodayBounds();

        const activeOrderStatuses = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CONFIRMED"]; // NOT cancelled/returned
        const excludedStatuses: any[] = ["CANCELLED", "RETURNED"];

        const [
            totalRevenueResult,
            totalOrdersResult,
            totalUsersResult,
            totalProductsResult,
            revenueTodayResult,
            ordersTodayResult,
            newUsersTodayResult,
            ordersByStatusResult,
            allVariants,
            totalReturnsResult,
            returnsTodayResult,
        ] = await Promise.all([
            db.select({ sum: sum(orders.total) }).from(orders).where(notInArray(orders.status, excludedStatuses)),
            db.select({ count: count() }).from(orders),
            db.select({ count: count() }).from(users).where(eq(users.role, "USER")),
            db.select({ count: count() }).from(products),
            db.select({ sum: sum(orders.total) }).from(orders).where(
                and(
                    notInArray(orders.status, excludedStatuses),
                    gte(orders.createdAt, today),
                    lt(orders.createdAt, tomorrow)
                )
            ),
            db.select({ count: count() }).from(orders).where(
                and(gte(orders.createdAt, today), lt(orders.createdAt, tomorrow))
            ),
            db.select({ count: count() }).from(users).where(
                and(eq(users.role, "USER"), gte(users.createdAt, today), lt(users.createdAt, tomorrow))
            ),
            db.select({ status: orders.status, count: count() }).from(orders).groupBy(orders.status),
            db.select({ stock: productVariants.stock, lowStockAlert: productVariants.lowStockAlert }).from(productVariants),
            db.select({ sum: sum(refunds.amount), count: count() }).from(refunds),
            db.select({ sum: sum(refunds.amount), count: count() }).from(refunds).where(
                and(gte(refunds.createdAt, today), lt(refunds.createdAt, tomorrow))
            ),
        ]);

        const totalRevenue = totalRevenueResult[0]?.sum ? Number(totalRevenueResult[0].sum) : 0;
        const totalOrders = totalOrdersResult[0]?.count || 0;
        const totalUsers = totalUsersResult[0]?.count || 0;
        const totalProducts = totalProductsResult[0]?.count || 0;
        const revenueToday = revenueTodayResult[0]?.sum ? Number(revenueTodayResult[0].sum) : 0;
        const ordersToday = ordersTodayResult[0]?.count || 0;
        const newUsersToday = newUsersTodayResult[0]?.count || 0;

        const statusBreakdown: Record<string, number> = {};
        for (const row of ordersByStatusResult) {
            statusBreakdown[row.status] = row.count;
        }

        const lowStockCount = allVariants.filter(v => v.stock > 0 && v.stock <= v.lowStockAlert).length;
        const outOfStockCount = allVariants.filter(v => v.stock === 0).length;

        const totalReturnsAmount = totalReturnsResult[0]?.sum ? Number(totalReturnsResult[0].sum) : 0;
        const totalReturnsCount = totalReturnsResult[0]?.count || 0;
        const returnsTodayAmount = returnsTodayResult[0]?.sum ? Number(returnsTodayResult[0].sum) : 0;
        const returnsTodayCount = returnsTodayResult[0]?.count || 0;

        res.status(200).json({
            success: true,
            data: {
                totalRevenue,
                totalOrders,
                totalUsers,
                totalProducts,
                revenueToday,
                ordersToday,
                newUsersToday,
                lowStockCount,
                outOfStockCount,
                statusBreakdown,
                totalReturnsAmount,
                totalReturnsCount,
                returnsTodayAmount,
                returnsTodayCount,
            },
        });
    } catch (error) {
        next(error);
    }
};

// ─── Recent Orders ────────────────────────────────────────────────────────────
export const getRecentOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const recentOrders = await db.query.orders.findMany({
            limit: 10,
            orderBy: [desc(orders.createdAt)],
            with: {
                user: { columns: { name: true, email: true } },
                items: { limit: 1, columns: { productName: true, quantity: true } },
            },
        });

        res.status(200).json({ success: true, count: recentOrders.length, data: recentOrders });
    } catch (error) {
        next(error);
    }
};

// ─── Top Products ─────────────────────────────────────────────────────────────
export const getTopProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const topOrderItems = await db.select({
            productId: orderItems.productId,
            quantity: sum(orderItems.quantity)
        })
        .from(orderItems)
        .groupBy(orderItems.productId)
        .orderBy(desc(sum(orderItems.quantity)))
        .limit(5);

        const productIds = topOrderItems.map(item => item.productId).filter(Boolean) as string[];

        let productsRaw: any[] = [];
        if (productIds.length > 0) {
            productsRaw = await db.query.products.findMany({
                where: inArray(products.id, productIds),
                columns: {
                    id: true,
                    title: true,
                    price: true,
                },
                with: {
                    images: { limit: 1, columns: { url: true } },
                    category: { columns: { name: true } }
                }
            });
        }

        const result = topOrderItems.map(aggr => {
            const product = productsRaw.find(p => p.id === aggr.productId);
            const totalSold = aggr.quantity ? Number(aggr.quantity) : 0;
            return {
                id: aggr.productId,
                title: product?.title || "Unknown Product",
                price: product?.price || 0,
                category: product?.category?.name || "—",
                image: product?.images?.[0]?.url || null,
                totalSold,
                totalRevenue: (product?.price || 0) * totalSold,
            };
        });

        res.status(200).json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
};

// ─── Revenue Chart ────────────────────────────────────────────────────────────
export const getRevenueChart = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { period = "daily", days = "30" } = req.query;

        // ── Monthly ─────────
        if (period === "monthly") {
            const currentYear = new Date().getFullYear();

            const monthlyRaw = await db.execute(sql`
                SELECT
                    EXTRACT(MONTH FROM "createdAt")::int AS month_num,
                    TO_CHAR("createdAt", 'Mon') AS name,
                    COALESCE(SUM(total), 0)::float AS revenue
                FROM "orders"
                WHERE status NOT IN ('CANCELLED', 'RETURNED')
                  AND EXTRACT(YEAR FROM "createdAt") = ${currentYear}
                GROUP BY EXTRACT(MONTH FROM "createdAt"), TO_CHAR("createdAt", 'Mon')
                ORDER BY month_num
            `);

            const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const dataMap = new Map<number, number>(monthlyRaw.rows.map((d: any) => [Number(d.month_num), Number(d.revenue)]));
            const complete = MONTHS.map((name, i) => ({ name, revenue: dataMap.get(i + 1) || 0 }));

            return res.status(200).json({ success: true, data: complete });
        }

        // ── Quarterly ─────────────────────
        if (period === "quarterly") {
            const currentYear = new Date().getFullYear();

            const quarterlyRaw = await db.execute(sql`
                SELECT
                    EXTRACT(QUARTER FROM "createdAt")::int AS quarter_num,
                    COALESCE(SUM(total), 0)::float AS revenue
                FROM "orders"
                WHERE status NOT IN ('CANCELLED', 'RETURNED')
                  AND EXTRACT(YEAR FROM "createdAt") = ${currentYear}
                GROUP BY EXTRACT(QUARTER FROM "createdAt")
                ORDER BY quarter_num
            `);

            const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];
            const dataMap = new Map<number, number>(quarterlyRaw.rows.map((d: any) => [Number(d.quarter_num), Number(d.revenue)]));
            const complete = QUARTERS.map((name, i) => ({ name, revenue: dataMap.get(i + 1) || 0 }));

            return res.status(200).json({ success: true, data: complete });
        }

        // ── Yearly ─────────────────────────────────────
        if (period === "yearly") {
            const currentYear = new Date().getFullYear();

            const yearlyRaw = await db.execute(sql`
                SELECT
                    EXTRACT(YEAR FROM "createdAt")::int AS year_num,
                    COALESCE(SUM(total), 0)::float AS revenue
                FROM "orders"
                WHERE status NOT IN ('CANCELLED', 'RETURNED')
                  AND EXTRACT(YEAR FROM "createdAt") >= ${currentYear - 4}
                GROUP BY EXTRACT(YEAR FROM "createdAt")
                ORDER BY year_num
            `);

            const years = Array.from({ length: 5 }, (_, i) => currentYear - 4 + i);
            const dataMap = new Map<number, number>(yearlyRaw.rows.map((d: any) => [Number(d.year_num), Number(d.revenue)]));
            const complete = years.map(y => ({ name: String(y), revenue: dataMap.get(y) || 0 }));

            return res.status(200).json({ success: true, data: complete });
        }

        // ── Daily (default) ───────────────────────────────────────
        const daysNum = parseInt(days as string) || 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysNum);

        const ordersList = await db.query.orders.findMany({
            where: and(
                gte(orders.createdAt, startDate),
                notInArray(orders.status, ["CANCELLED", "RETURNED"])
            ),
            columns: { total: true, createdAt: true },
            orderBy: [asc(orders.createdAt)],
        });

        const revenueByDate = ordersList.reduce((acc: Record<string, number>, order) => {
            const dateKey = order.createdAt.toISOString().split("T")[0];
            acc[dateKey] = (acc[dateKey] || 0) + Number(order.total);
            return acc;
        }, {});

        const today = new Date();
        const completeData: { name: string, revenue: number }[] = [];
        for (let i = daysNum - 1; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dateKey = d.toISOString().split("T")[0];
            const displayDate = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
            completeData.push({ name: displayDate, revenue: revenueByDate[dateKey] || 0 });
        }

        res.status(200).json({ success: true, data: completeData });
    } catch (error) {
        next(error);
    }
};
