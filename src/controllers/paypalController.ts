import { Request, Response, NextFunction } from "express";
import db from "../db";
import { orders, payments } from "../db/schema";
import { eq } from "drizzle-orm";
import { AppError } from "../utils/AppError";
import { deductStockForOrder } from "./orderController";
import { config } from "../config";

// ==========================================
// USER ROUTES 
// ==========================================

export const verifyPaypalPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { orderID, payerID, paymentID } = req.body;
        
        // In a real implementation, you would verify the payment with PayPal's API
        // For now, we'll simulate a successful verification
        
        // Find the order (you might need to pass orderId in the request)
        const orderId = req.body.orderId;
        if (!orderId) {
            return next(new AppError("Order ID is required.", 400));
        }

        const order = await db.query.orders.findFirst({
            where: eq(orders.id, orderId)
        });

        if (!order) {
            return next(new AppError("Order not found.", 404));
        }

        // Verify user owns this order
        if (order.userId !== req.user!.id) {
            return next(new AppError("Unauthorized access to order.", 403));
        }

        // Check if order is in correct state for payment
        if (order.status !== "PENDING" && order.status !== "PROCESSING") {
            return next(new AppError("Order is not in a state that can be paid.", 400));
        }

        // Create payment record, update order, and deduct stock in one transaction
        const payment = await db.transaction(async (tx) => {
            const existingPayment = await tx.query.payments.findFirst({
                where: eq(payments.orderId, orderId)
            });

            let paymentRecord;
            if (existingPayment) {
                const [updated] = await tx.update(payments).set({
                    userId: req.user!.id,
                    amount: order.total,
                    status: "PAID",
                    razorpayOrderId: `PAYPAL_${Date.now()}`,
                    updatedAt: new Date()
                }).where(eq(payments.id, existingPayment.id)).returning();
                paymentRecord = updated;
            } else {
                const [created] = await tx.insert(payments).values({
                    userId: req.user!.id,
                    orderId,
                    amount: order.total,
                    status: "PAID",
                    razorpayOrderId: `PAYPAL_${Date.now()}`,
                    currency: "INR"
                }).returning();
                paymentRecord = created;
            }

            await tx.update(orders).set({
                status: "CONFIRMED",
                paymentStatus: "PAID",
                updatedAt: new Date()
            }).where(eq(orders.id, orderId));

            // Deduct stock now that payment is confirmed
            await deductStockForOrder(orderId, req.user!.id, tx);

            return paymentRecord;
        });

        res.status(200).json({
            success: true,
            message: "PayPal payment verified successfully.",
            data: {
                paymentId: payment.id,
                orderId: order.id
            }
        });
    } catch (error) {
        next(error);
    }
};

export const createGuestPaypalOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { orderId, email } = req.body;

        if (!orderId || !email) {
            return next(new AppError("Order ID and email are required.", 400));
        }

        const normalizedEmail = String(email).trim().toLowerCase();

        const order = await db.query.orders.findFirst({
            where: eq(orders.id, orderId),
            with: {
                user: {
                    columns: { id: true, email: true }
                }
            }
        });

        if (!order || order.user.email.toLowerCase() !== normalizedEmail) {
            return next(new AppError("Unable to process payment for this order.", 404));
        }

        if (order.status !== "PENDING" && order.status !== "PROCESSING") {
            return next(new AppError("Order is not in a state that can be paid.", 400));
        }

        // For guest orders, we create a temporary user record or use a guest user ID
        // In a real implementation, you might have a different approach for guest users
        const guestUserId = order.userId; // Assuming we have a way to handle guest users

        const payment = await db.transaction(async (tx) => {
            const existingPayment = await tx.query.payments.findFirst({
                where: eq(payments.orderId, orderId)
            });

            let paymentRecord;
            if (existingPayment) {
                const [updated] = await tx.update(payments).set({
                    userId: guestUserId,
                    amount: order.total,
                    status: "PAID",
                    razorpayOrderId: `PAYPAL_${Date.now()}`,
                    updatedAt: new Date()
                }).where(eq(payments.id, existingPayment.id)).returning();
                paymentRecord = updated;
            } else {
                const [created] = await tx.insert(payments).values({
                    userId: guestUserId,
                    orderId,
                    amount: order.total,
                    status: "PAID",
                    razorpayOrderId: `PAYPAL_${Date.now()}`,
                    currency: "INR"
                }).returning();
                paymentRecord = created;
            }

            await tx.update(orders).set({
                status: "CONFIRMED",
                paymentStatus: "PAID",
                updatedAt: new Date()
            }).where(eq(orders.id, orderId));

            // Deduct stock now that payment is confirmed
            await deductStockForOrder(orderId, guestUserId, tx);

            return paymentRecord;
        });

        res.status(200).json({
            success: true,
            message: "PayPal payment processed successfully for guest user.",
            data: {
                paymentId: payment.id,
                orderId: order.id
            }
        });
    } catch (error) {
        next(error);
    }
};