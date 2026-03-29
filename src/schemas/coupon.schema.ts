import { z } from "zod";

export const createCouponSchema = z.object({
    body: z.object({
        code: z.string().min(3, "Coupon code must be at least 3 characters").max(20).toUpperCase(),
        type: z.enum(["FLAT", "PERCENTAGE", "FREE_SHIPPING"]),
        discountValue: z.number().min(0, "Discount value cannot be negative"),
        maxDiscount: z.number().min(0).optional().nullable(),
        minOrderValue: z.number().min(0).optional().nullable(),
        usageLimit: z.number().int().min(1).optional().nullable(),
        perUserLimit: z.number().int().min(1).optional().nullable(),
        isActive: z.boolean().optional().default(true),
        startDate: z.string().datetime().optional().nullable(),
        expiresAt: z.string().datetime().optional().nullable(),
    }).refine((data) => {
        if (data.type === "PERCENTAGE" && data.discountValue > 100) {
            return false;
        }
        return true;
    }, {
        message: "Percentage discount cannot exceed 100%",
        path: ["discountValue"]
    })
});

export const updateCouponSchema = z.object({
    body: z.object({
        code: z.string().min(3).max(20).toUpperCase().optional(),
        type: z.enum(["FLAT", "PERCENTAGE", "FREE_SHIPPING"]).optional(),
        discountValue: z.number().min(0).optional(),
        maxDiscount: z.number().min(0).optional().nullable(),
        minOrderValue: z.number().min(0).optional().nullable(),
        usageLimit: z.number().int().min(1).optional().nullable(),
        perUserLimit: z.number().int().min(1).optional().nullable(),
        isActive: z.boolean().optional(),
        startDate: z.string().datetime().optional().nullable(),
        expiresAt: z.string().datetime().optional().nullable(),
    }).refine((data) => {
        if (data.type === "PERCENTAGE" && data.discountValue !== undefined && data.discountValue > 100) {
            return false;
        }
        return true;
    }, {
        message: "Percentage discount cannot exceed 100%",
        path: ["discountValue"]
    })
});

export const getCouponUsagesSchema = z.object({
    params: z.object({
        id: z.string().uuid("Invalid coupon ID"),
    }),
    query: z.object({
        page: z.string().optional(),
        limit: z.string().optional(),
    }),
});
