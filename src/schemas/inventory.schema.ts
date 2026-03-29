import { z } from "zod";

export const adjustInventorySchema = z.object({
    body: z.object({
        stock: z.number().int().min(0, "Stock cannot be negative").optional(),
        adjustment: z.number().int().optional(),
    }).refine((data) => data.stock !== undefined || data.adjustment !== undefined, {
        message: "Must provide either absolute `stock` or relative `adjustment` difference.",
    })
});
