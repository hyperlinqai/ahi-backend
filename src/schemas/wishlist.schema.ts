import { z } from "zod";

export const addToWishlistSchema = z.object({
    body: z.object({
        productId: z.string().uuid("Provided identifier explicitly misses Prisma UUID mapping struct")
    })
});
