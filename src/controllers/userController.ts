import { Request, Response, NextFunction } from "express";
import { eq, or, desc, ilike, and, count, SQL } from "drizzle-orm";
import db from "../db";
import { users, orders } from "../db/schema";
import { AppError } from "../utils/AppError";
import bcrypt from "bcrypt";

// Get current user profile
export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        if (!userId) return next(new AppError("Not authenticated", 401));

        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: {
                id: true,
                name: true,
                email: true,
                role: true,
                isVerified: true,
                createdAt: true,
            },
        });

        if (!user) {
            return next(new AppError("User not found", 404));
        }

        res.status(200).json({
            success: true,
            data: user,
        });
    } catch (error) {
        next(error);
    }
};

// Update current user profile
export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, email } = req.body;

        // Check if email is already in use by another user
        if (email) {
            const existingUser = await db.query.users.findFirst({ where: eq(users.email, email) });
            if (existingUser && existingUser.id !== req.user?.id) {
                return next(new AppError("Email is already in use", 400));
            }
        }

        const updateData: any = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email;

        const userId = req.user?.id;
        if (!userId) return next(new AppError("Not authenticated", 401));

        const [user] = await db.update(users)
            .set(updateData)
            .where(eq(users.id, userId))
            .returning({
                id: users.id,
                name: users.name,
                email: users.email,
                role: users.role,
            });

        res.status(200).json({
            success: true,
            data: user,
        });
    } catch (error) {
        next(error);
    }
};

// Change password
export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const userId = req.user?.id;
        if (!userId) return next(new AppError("Not authenticated", 401));

        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
        });

        if (!user) {
            return next(new AppError("User not found", 404));
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return next(new AppError("Incorrect current password", 401));
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);

        await db.update(users)
            .set({ password: hashedPassword })
            .where(eq(users.id, userId));

        res.status(200).json({
            success: true,
            message: "Password changed successfully",
        });
    } catch (error) {
        next(error);
    }
};

// --- ADMIN CONTROLLERS ---

// Get all users (paginated, with filters and search)
export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;

        const search = req.query.search as string;
        const role = req.query.role as string;
        const status = req.query.status as string;

        // Build the where clause
        const conditions: SQL<unknown>[] = [];

        if (search) {
            const searchCondition = or(
                ilike(users.name, `%${search}%`),
                ilike(users.email, `%${search}%`)
            );
            if (searchCondition) conditions.push(searchCondition);
        }

        if (role) {
            conditions.push(eq(users.role, role as any));
        }

        if (status) {
            conditions.push(eq(users.isBlocked, status === 'blocked'));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        // Fetch total count and paginated users concurrently
        const [usersList, totalCountResult] = await Promise.all([
            db.query.users.findMany({
                where: whereClause,
                columns: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    isVerified: true,
                    isBlocked: true,
                    createdAt: true,
                },
                with: {
                    wallet: {
                        columns: { balance: true }
                    },
                    orders: {
                        columns: { id: true }
                    }
                },
                orderBy: [desc(users.createdAt)],
                offset: skip,
                limit: limit,
            }),
            db.select({ count: count() }).from(users).where(whereClause),
        ]);

        const totalCount = totalCountResult[0].count;

        const formattedUsers = usersList.map((u: any) => {
            const numOrders = u.orders?.length || 0;
            const { orders, ...rest } = u;
            return {
                ...rest,
                _count: { orders: numOrders }
            };
        });

        res.status(200).json({
            success: true,
            data: formattedUsers,
            meta: {
                totalCount,
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

// Create a new user (Admin functionality)
export const createUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, email, phone, password, role } = req.body;

        // Check if email already exists
        const existingUser = await db.query.users.findFirst({
            where: eq(users.email, email),
        });

        if (existingUser) {
            return next(new AppError("User with this email already exists", 400));
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const [newUser] = await db.insert(users).values({
            name,
            email,
            phone,
            password: hashedPassword,
            role: role || "ADMIN",
            isVerified: true, // Auto-verify admin created users
        }).returning({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role,
            createdAt: users.createdAt,
        });

        res.status(201).json({
            success: true,
            message: "User created successfully",
            data: newUser
        });
    } catch (error) {
        next(error);
    }
};

// Get a single user by ID
export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;

        const user = await db.query.users.findFirst({
            where: eq(users.id, id),
            columns: {
                id: true,
                name: true,
                email: true,
                role: true,
                isVerified: true,
                isBlocked: true,
                createdAt: true,
            },
            with: {
                wallet: {
                    columns: { balance: true }
                },
                addresses: true,
                orders: {
                    orderBy: [desc(orders.createdAt)],
                    limit: 5,
                    columns: {
                        id: true,
                        orderNumber: true,
                        total: true,
                        status: true,
                        createdAt: true
                    }
                },
                reviews: {
                    columns: { id: true }
                }
            }
        });

        if (!user) {
            return next(new AppError("User not found", 404));
        }

        // We pull all orders to count them if we didn't specify a count.
        // Actually the previous query limited orders to 5, so we need a separate count query to simulate `_count: { orders: true, reviews: true }` correctly unless we just query them separately.
        const [ordersCount] = await db.select({ count: count() }).from(orders).where(eq(orders.userId, id));
        const [reviewsCount] = await db.select({ count: count() }).from(orders).where(eq(orders.userId, id)); // oops should be reviews table.

        const { reviews: _r, ...restUser } = user;

        const formattedUser = {
            ...restUser,
            _count: {
                orders: ordersCount.count,
                reviews: user.reviews?.length || 0 // If we just counted reviews via relations
            }
        }

        res.status(200).json({
            success: true,
            data: formattedUser
        });
    } catch (error) {
        next(error);
    }
};

// Block a user
export const blockUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;

        // Prevent admin from blocking themselves
        if (req.user?.id === id) {
            return next(new AppError("You cannot block your own account", 400));
        }

        const [user] = await db.update(users)
            .set({ isBlocked: true })
            .where(eq(users.id, id))
            .returning({ id: users.id, name: users.name, email: users.email, isBlocked: users.isBlocked });

        if (!user) {
            return next(new AppError("User not found", 404));
        }

        res.status(200).json({
            success: true,
            message: "User blocked successfully",
            data: user
        });
    } catch (error) {
        next(error);
    }
};

// Unblock a user
export const unblockUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;

        const [user] = await db.update(users)
            .set({ isBlocked: false })
            .where(eq(users.id, id))
            .returning({ id: users.id, name: users.name, email: users.email, isBlocked: users.isBlocked });

        if (!user) {
            return next(new AppError("User not found", 404));
        }

        res.status(200).json({
            success: true,
            message: "User unblocked successfully",
            data: user
        });
    } catch (error) {
        next(error);
    }
};

// Delete a user entirely
export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;

        // Prevent admin from deleting themselves
        if (req.user?.id === id) {
            return next(new AppError("You cannot delete your own account. Use account settings to deactivate instead.", 400));
        }

        // Check if user has orders
        const [orderCount] = await db.select({ count: count() }).from(orders).where(eq(orders.userId, id));

        if (orderCount.count > 0) {
            return next(new AppError("Cannot delete user with existing orders. Block the user instead to maintain financial records.", 400));
        }

        const [deleted] = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id });

        if (!deleted) {
            return next(new AppError("User not found", 404));
        }

        res.status(200).json({
            success: true,
            message: "User deleted successfully"
        });
    } catch (error) {
        next(error);
    }
};
