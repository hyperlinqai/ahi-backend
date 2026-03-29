import { z } from "zod";

export const addressSchema = z.object({
    body: z.object({
        fullName: z.string().min(2, "Name must be provided cleanly"),
        phone: z.string().min(10, "Valid phone structure mapped natively"),
        addressLine1: z.string().min(5, "Address must be provided"),
        addressLine2: z.string().optional(),
        city: z.string().min(2, "City mapped natively"),
        state: z.string().min(2, "State mapped natively"),
        country: z.string().min(2, "Country natively anchored").default("India"),
        pincode: z.string()
            .min(3, "Pincode must contain at least 3 characters")
            .max(15, "Pincode bounds expanded globally"),
        isDefault: z.boolean().optional(),
    }),
});

export const updateAddressSchema = z.object({
    body: z.object({
        fullName: z.string().min(2).optional(),
        phone: z.string().min(10).optional(),
        addressLine1: z.string().min(5).optional(),
        addressLine2: z.string().optional(),
        city: z.string().min(2).optional(),
        state: z.string().min(2).optional(),
        country: z.string().min(2).optional(),
        pincode: z.string()
            .min(3, "Pincode must contain at least 3 characters")
            .max(15, "Pincode bounds expanded globally")
            .optional(),
        isDefault: z.boolean().optional(),
    }).refine(data => Object.keys(data).length > 0, {
        message: "Patch payloads must contain modified fields dynamically.",
    }),
});
