import { Request, Response, NextFunction } from "express";
import db from "../db";
import { coupons, orders } from "../db/schema";
import { eq, and, or, ilike, lte, gt, desc, count, isNull, SQL } from "drizzle-orm";
import { AppError } from "../utils/AppError";

// Get all coupons (paginated)
export const getAllCoupons = async (req: Request, res: Response, next: NextFunction) => {
    try {
        console.log("📋 getAllCoupons called");
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;

        const search = req.query.search as string;
        const status = req.query.status as string;
        const type = req.query.type as string;

        console.log("📊 Query params:", { page, limit, search, status, type });

        const conditions: SQL<unknown>[] = [];

        if (search) {
            conditions.push(ilike(coupons.code, `%${search}%`));
        }

        if (type) {
            conditions.push(eq(coupons.type, type as any));
        }

        const now = new Date();
        if (status === 'active') {
            const activeCond = and(
                or(lte(coupons.startDate, now), isNull(coupons.startDate)),
                or(gt(coupons.expiresAt, now), isNull(coupons.expiresAt)),
                eq(coupons.isActive, true)
            );
            if (activeCond) conditions.push(activeCond);
        } else if (status === 'upcoming') {
            const upCond = and(
                gt(coupons.startDate, now),
                eq(coupons.isActive, true)
            );
            if (upCond) conditions.push(upCond);
        } else if (status === 'expired') {
            const expCond = or(
                lte(coupons.expiresAt, now),
                eq(coupons.isActive, false)
            );
            if (expCond) conditions.push(expCond);
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        console.log("🔍 Fetching coupons from database...");
        const [couponsList, totalCountResult] = await Promise.all([
            db.query.coupons.findMany({
                where: whereClause,
                orderBy: [desc(coupons.createdAt)],
                offset: skip,
                limit: limit,
            }),
            db.select({ count: count() }).from(coupons).where(whereClause),
        ]);

        const totalCount = totalCountResult[0].count;

        console.log("✅ Found", couponsList.length, "coupons, total:", totalCount);

        res.status(200).json({
            success: true,
            data: couponsList,
            meta: {
                totalCount,
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit),
            },
        });
    } catch (error) {
        console.error("❌ getAllCoupons error:", error);
        next(error);
    }
};

// Get single coupon
export const getCouponById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const coupon = await db.query.coupons.findFirst({
            where: eq(coupons.id, id)
        });

        if (!coupon) {
            return next(new AppError("Coupon not found", 404));
        }

        res.status(200).json({
            success: true,
            data: coupon
        });
    } catch (error) {
        next(error);
    }
};

// Create a new coupon
export const createCoupon = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = req.body;
        
        console.log("📥 Creating coupon with data:", data);

        // Check unique code
        const existing = await db.query.coupons.findFirst({
            where: eq(coupons.code, data.code)
        });
        if (existing) {
            return next(new AppError("Coupon code already exists", 400));
        }

        const couponData: any = {
            code: data.code,
            type: data.type,
            discountValue: data.discountValue,
            usageCount: 0
        };

        if (data.maxDiscount !== undefined) couponData.maxDiscount = data.maxDiscount;
        if (data.minOrderValue !== undefined) couponData.minOrderValue = data.minOrderValue;
        if (data.usageLimit !== undefined) couponData.usageLimit = data.usageLimit;
        if (data.perUserLimit !== undefined) couponData.perUserLimit = data.perUserLimit;
        if (data.isActive !== undefined) couponData.isActive = data.isActive;
        
        if (data.startDate) {
            couponData.startDate = new Date(data.startDate);
        }
        if (data.expiresAt) {
            couponData.expiresAt = new Date(data.expiresAt);
        }

        console.log("📝 Prepared coupon data:", couponData);

        const [coupon] = await db.insert(coupons).values(couponData).returning();

        console.log("✅ Coupon created successfully:", coupon.id);

        res.status(201).json({
            success: true,
            message: "Coupon created successfully",
            data: coupon
        });
    } catch (error) {
        console.error("❌ Error creating coupon:", error);
        next(error);
    }
};

// Update a coupon
export const updateCoupon = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const data = req.body;

        if (data.code) {
            const existing = await db.query.coupons.findFirst({
                where: eq(coupons.code, data.code)
            });
            if (existing && existing.id !== id) {
                return next(new AppError("Coupon code already exists", 400));
            }
        }

        const [coupon] = await db.update(coupons)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(coupons.id, id))
            .returning();

        if (!coupon) {
            return next(new AppError("Coupon not found", 404));
        }

        res.status(200).json({
            success: true,
            message: "Coupon updated successfully",
            data: coupon
        });
    } catch (error) {
        next(error);
    }
};

// Delete a coupon
export const deleteCoupon = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;

        // Ensure coupon isn't applied to ANY orders
        const ordersWithCoupon = await db.query.orders.findFirst({
            where: eq(orders.appliedCouponId, id)
        });

        if (ordersWithCoupon) {
            return next(new AppError("Cannot delete coupon that has been applied to orders. Mark it as inactive instead.", 400));
        }

        const [deleted] = await db.delete(coupons).where(eq(coupons.id, id)).returning();
        if (!deleted) {
            return next(new AppError("Coupon not found", 404));
        }

        res.status(200).json({
            success: true,
            message: "Coupon deleted successfully"
        });
    } catch (error) {
        next(error);
    }
};

// Get coupon usage history (Users who used it, matched by Orders)
export const getCouponUsages = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;

        const coupon = await db.query.coupons.findFirst({
            where: eq(coupons.id, id)
        });

        if (!coupon) {
            return next(new AppError("Coupon not found", 404));
        }

        // Find all orders that have this coupon applied
        const [usages, totalCountResult] = await Promise.all([
            db.query.orders.findMany({
                where: eq(orders.appliedCouponId, id),
                columns: {
                    id: true,
                    orderNumber: true,
                    createdAt: true,
                    total: true,
                    discount: true,
                },
                with: {
                    user: {
                        columns: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                },
                orderBy: [desc(orders.createdAt)],
                offset: skip,
                limit: limit
            }),
            db.select({ count: count() }).from(orders).where(eq(orders.appliedCouponId, id))
        ]);

        const totalCount = totalCountResult[0].count;

        // Format for frontend
        const formattedUsages = usages.map(order => ({
            id: order.id,
            orderId: order.id,
            orderNumber: order.orderNumber,
            userId: order.user.id,
            userName: order.user.name,
            userEmail: order.user.email,
            discountObtained: order.discount,
            orderTotal: order.total,
            usedAt: order.createdAt
        }));

        res.status(200).json({
            success: true,
            data: formattedUsages,
            meta: {
                totalCount,
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit)
            }
        });

    } catch (error) {
        next(error);
    }
};
