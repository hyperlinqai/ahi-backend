import { z } from "zod";

export const updateProfileSchema = z.object({
    body: z.object({
        name: z.string().min(2, "Name must be at least 2 characters long").optional(),
        email: z.string().email("Invalid email address").optional(),
    }).refine((data) => Object.keys(data).length > 0, {
        message: "At least one field must be provided to update",
    }),
});

export const changePasswordSchema = z.object({
    body: z.object({
        currentPassword: z.string().min(1, "Current password is required"),
        newPassword: z.string().min(8, "New password must be at least 8 characters long"),
    }),
});

export const updateUserSchema = z.object({
    body: z.object({
        name: z.string().min(2, "Name must be at least 2 characters long").optional(),
        email: z.string().email("Invalid email address").optional(),
        role: z.enum(["USER", "ADMIN", "MANAGER", "SUPPORT", "CATALOG_MANAGER"]).optional(),
        isBlocked: z.boolean().optional(),
    }).refine((data) => Object.keys(data).length > 0, {
        message: "At least one field must be provided to update",
    }),
});

export const blockUserSchema = z.object({
    params: z.object({
        id: z.string().uuid("Invalid user ID"),
    }),
});

export const unblockUserSchema = z.object({
    params: z.object({
        id: z.string().uuid("Invalid user ID"),
    }),
});

export const deleteUserSchema = z.object({
    params: z.object({
        id: z.string().uuid("Invalid user ID"),
    }),
});

export const getUserByIdSchema = z.object({
    params: z.object({
        id: z.string().uuid("Invalid user ID"),
    }),
});

export const getAllUsersSchema = z.object({
    query: z.object({
        page: z.string().optional(),
        limit: z.string().optional(),
        search: z.string().optional(),
        role: z.enum(["USER", "ADMIN", "MANAGER", "SUPPORT", "CATALOG_MANAGER"]).optional(),
        status: z.enum(["active", "blocked"]).optional(),
    }),
});

export const createUserSchema = z.object({
    body: z.object({
        name: z.string().min(2, "Name must be at least 2 characters long"),
        email: z.string().email("Invalid email address"),
        phone: z
            .string()
            .min(10, "Phone number must be at least 10 digits long")
            .max(15, "Phone number must be 15 characters or fewer")
            .regex(/^[0-9+\-\s()]+$/, "Invalid phone number"),
        password: z.string().min(8, "Password must be at least 8 characters long"),
        role: z.enum(["USER", "ADMIN", "MANAGER", "SUPPORT", "CATALOG_MANAGER"]).default("ADMIN"),
    }),
});
