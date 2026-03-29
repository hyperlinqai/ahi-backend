import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import db from "../db";
import { returnRequests, orders, users } from "../db/schema";
import { eq, and, or, ilike, desc, count, inArray, SQL } from "drizzle-orm";

// ==========================================
// ADMIN ROUTES — Returns Management
// ==========================================

export const getReturns = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;
        const status = req.query.status as string | undefined;
        const search = req.query.search as string | undefined;

        const conditions: SQL<unknown>[] = [];

        if (status && ["PENDING", "APPROVED", "REJECTED"].includes(status)) {
            conditions.push(eq(returnRequests.status, status as any));
        }

        if (search) {
            const matchingReturns = await db.select({ id: returnRequests.id })
                .from(returnRequests)
                .leftJoin(orders, eq(returnRequests.orderId, orders.id))
                .leftJoin(users, eq(returnRequests.userId, users.id))
                .where(
                    or(
                        ilike(orders.orderNumber, `%${search}%`),
                        ilike(users.name, `%${search}%`),
                        ilike(users.email, `%${search}%`),
                        ilike(returnRequests.reason, `%${search}%`)
                    )
                );

            if (matchingReturns.length > 0) {
                conditions.push(inArray(returnRequests.id, matchingReturns.map(r => r.id)));
            } else {
                conditions.push(eq(returnRequests.id, 'NO_MATCH'));
            }
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const [returnsList, totalCountResult] = await Promise.all([
            db.query.returnRequests.findMany({
                where: whereClause,
                with: {
                    user: { columns: { id: true, name: true, email: true } },
                    order: {
                        columns: {
                            id: true,
                            orderNumber: true,
                            total: true,
                            paymentStatus: true,
                            status: true,
                        }
                    },
                    images: true,
                },
                offset: skip,
                limit: limit,
                orderBy: [desc(returnRequests.createdAt)],
            }),
            db.select({ count: count() }).from(returnRequests).where(whereClause),
        ]);

        const totalCount = totalCountResult[0].count;

        res.status(200).json({
            success: true,
            data: {
                returns: returnsList,
                meta: {
                    totalCount,
                    page,
                    limit,
                    totalPages: Math.ceil(totalCount / limit),
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

export const getReturnById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;

        const returnRequest = await db.query.returnRequests.findFirst({
            where: eq(returnRequests.id, id),
            with: {
                user: { columns: { id: true, name: true, email: true } },
                order: {
                    with: {
                        items: {
                            columns: {
                                id: true,
                                productName: true,
                                sku: true,
                                price: true,
                                quantity: true,
                            }
                        },
                        address: {
                            columns: {
                                fullName: true,
                                phone: true,
                                addressLine1: true,
                                addressLine2: true,
                                city: true,
                                state: true,
                                pincode: true,
                            }
                        },
                        payment: {
                            columns: {
                                id: true,
                                razorpayPaymentId: true,
                                amount: true,
                                status: true,
                            }
                        },
                        refunds: {
                            columns: {
                                id: true,
                                amount: true,
                                status: true,
                                reason: true,
                                createdAt: true,
                            }
                        },
                    },
                },
                images: true,
            },
        });

        if (!returnRequest) return next(new AppError("Return request not found.", 404));

        res.status(200).json({ success: true, data: returnRequest });
    } catch (error) {
        next(error);
    }
};

export const approveReturn = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;

        const returnRequest = await db.query.returnRequests.findFirst({ where: eq(returnRequests.id, id) });
        if (!returnRequest) return next(new AppError("Return request not found.", 404));
        if (returnRequest.status !== "PENDING") {
            return next(new AppError("Only pending return requests can be approved.", 400));
        }

        await db.update(returnRequests)
            .set({ status: "APPROVED", updatedAt: new Date() })
            .where(eq(returnRequests.id, id));

        res.status(200).json({
            success: true,
            message: "Return approved. Use the refund endpoint to initiate the payment refund.",
        });
    } catch (error) {
        next(error);
    }
};

export const rejectReturn = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const { adminNote } = req.body;

        if (!adminNote || !adminNote.trim()) {
            return next(new AppError("An admin note is required when rejecting a return.", 400));
        }

        const returnRequest = await db.query.returnRequests.findFirst({ where: eq(returnRequests.id, id) });
        if (!returnRequest) return next(new AppError("Return request not found.", 404));
        if (returnRequest.status !== "PENDING") {
            return next(new AppError("Only pending return requests can be rejected.", 400));
        }

        await db.update(returnRequests)
            .set({ status: "REJECTED", adminNote: adminNote.trim(), updatedAt: new Date() })
            .where(eq(returnRequests.id, id));

        res.status(200).json({ success: true, message: "Return rejected." });
    } catch (error) {
        next(error);
    }
};
