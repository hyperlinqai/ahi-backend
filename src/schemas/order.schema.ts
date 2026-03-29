import { z } from "zod";

export const updateOrderStatusSchema = z.object({
    body: z.object({
        status: z.enum(["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"]),
    })
});

// Used conceptually for the query parameter maps on standard GET endpoints 
export const orderFilterSchema = z.object({
    query: z.object({
        page: z.string().optional(),
        limit: z.string().optional(),
        status: z.enum(["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"]).optional(),
        dateFrom: z.string().datetime().optional(),
        dateTo: z.string().datetime().optional(),
        userId: z.string().uuid().optional()
    })
});
