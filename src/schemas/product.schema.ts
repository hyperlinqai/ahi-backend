import { z } from "zod";

export const variantSchema = z.object({
    id: z.string().optional(),
    name: z.string(),
    value: z.string(),
    sku: z.string(),
    stock: z.number().int().min(0).default(0),
});

export const createProductSchema = z.object({
    body: z.object({
        title: z.string().min(3, "Title must be at least 3 characters long"),
        description: z.string().min(10, "Description must be at least 10 characters long"),
        price: z.number().positive("Price must be a positive number"),
        categoryId: z.string().uuid("Invalid Category ID"),
        brand: z.string().optional(),
        isFeatured: z.boolean().optional(),
        weight: z.number().min(0).optional(),
        length: z.number().min(0).optional(),
        width: z.number().min(0).optional(),
        height: z.number().min(0).optional(),
        material: z.string().optional(),
        features: z.string().optional(),
        careInstructions: z.string().optional(),
        shippingInfo: z.string().optional(),
        returnPolicy: z.string().optional(),
        metaTitle: z.string().optional(),
        metaDescription: z.string().optional(),
        metaKeywords: z.string().optional(),
        variants: z.array(variantSchema).optional(),
    }),
});

export const updateProductSchema = z.object({
    body: z.object({
        title: z.string().min(3, "Title must be at least 3 characters long").optional(),
        description: z.string().min(10, "Description must be at least 10 characters long").optional(),
        price: z.number().positive("Price must be a positive number").optional(),
        categoryId: z.string().uuid("Invalid Category ID").optional(),
        brand: z.string().optional().nullable(),
        isFeatured: z.boolean().optional(),
        weight: z.number().min(0).optional().nullable(),
        length: z.number().min(0).optional().nullable(),
        width: z.number().min(0).optional().nullable(),
        height: z.number().min(0).optional().nullable(),
        material: z.string().optional().nullable(),
        features: z.string().optional().nullable(),
        careInstructions: z.string().optional().nullable(),
        shippingInfo: z.string().optional().nullable(),
        returnPolicy: z.string().optional().nullable(),
        metaTitle: z.string().optional().nullable(),
        metaDescription: z.string().optional().nullable(),
        metaKeywords: z.string().optional().nullable(),
        variants: z.array(variantSchema).optional(),
    }).refine((data) => Object.keys(data).length > 0, {
        message: "At least one field must be provided to update",
    }),
});
