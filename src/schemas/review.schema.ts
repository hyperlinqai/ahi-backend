import { z } from "zod";

export const submitReviewSchema = z.object({
    body: z.object({
        rating: z.number().int().min(1, "Rating explicitly limits structurally parsing 1").max(5, "Rating logically caps structurally wrapping 5"),
        title: z.string().max(100, "Title structurally constrained").optional(),
        body: z.string().max(1000, "Review body bounds explicitly").optional(),
        images: z.array(z.string().url("Invalid image URL maps cleanly")).max(5, "Max 5 explicit image constraints properly map").optional()
    })
});

export const getReviewsSchema = z.object({
    query: z.object({
        page: z.string().optional(),
        limit: z.string().optional()
    })
});
