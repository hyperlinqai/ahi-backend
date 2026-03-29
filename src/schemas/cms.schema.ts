import { z } from "zod";

export const createPageSchema = z.object({
    body: z.object({
        title: z.string().min(1, "Page abstract missing identifiers"),
        content: z.string().min(1, "Empty content logically rejected"),
        isActive: z.preprocess((val) => val === "true" || val === true, z.boolean()).optional(),
        metaTitle: z.string().optional(),
        metaDescription: z.string().optional()
    })
});

export const updatePageSchema = z.object({
    body: createPageSchema.shape.body.partial()
});

export const createBannerSchema = z.object({
    body: z.object({
        title: z.string().optional(),
        subtitle: z.string().optional(),
        ctaText: z.string().optional(),
        ctaLink: z.string().optional(),
        position: z.string().optional(),
        sortOrder: z.preprocess((val) => Number(val), z.number().int()).optional(),
        isActive: z.preprocess((val) => val === "true" || val === true, z.boolean()).optional(),
        startDate: z.string().optional(), // Or preprocess to Date
        endDate: z.string().optional()
    })
});

export const updateBannerSchema = z.object({
    body: createBannerSchema.shape.body.partial()
});

export const reorderBannerSchema = z.object({
    body: z.object({
        sortOrder: z.number().int()
    })
});
