import { z } from "zod";

export const createCategorySchema = z.object({
    body: z.object({
        name: z.string().min(2, "Name must be at least 2 characters"),
        slug: z.string().optional(),
        description: z.string().optional(),
        parentId: z.string().optional(),
        isActive: z.boolean().optional().or(z.string().transform(val => val === "true")),
        sortOrder: z.number().optional().or(z.string().transform(val => parseInt(val))),
    }),
});

export const updateCategorySchema = z.object({
    body: z.object({
        name: z.string().min(2, "Name must be at least 2 characters").optional(),
        slug: z.string().optional(),
        description: z.string().optional(),
        parentId: z.string().optional(),
        isActive: z.boolean().optional().or(z.string().transform(val => val === "true")),
        sortOrder: z.number().optional().or(z.string().transform(val => parseInt(val))),
    }),
});

export const reorderCategoriesSchema = z.object({
    body: z.object({
        categories: z.array(
            z.object({
                id: z.string(),
                sortOrder: z.number(),
            })
        ).min(1, "At least one category is required for reordering"),
    }),
});
