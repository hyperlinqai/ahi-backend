import { z } from "zod";

export const cartItemSchema = z.object({
    body: z.object({
        productId: z.string().uuid("Invalid Product ID"),
        quantity: z.number().int().min(1, "Quantity must be at least 1").default(1),
    }),
});

export const updateCartItemSchema = z.object({
    body: z.object({
        quantity: z.number().int().min(1, "Quantity must be at least 1"),
    }),
});

export const mergeCartSchema = z.object({
    body: z.object({
        items: z.array(
            z.object({
                productId: z.string().uuid("Invalid Product ID"),
                quantity: z.number().int().min(1, "Quantity must be at least 1"),
            })
        ).min(1, "Items array cannot be empty"),
    }),
});
