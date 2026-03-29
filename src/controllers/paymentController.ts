import { Request, Response, NextFunction } from "express";
import db from "../db";
import { orders, payments, refunds } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { AppError } from "../utils/AppError";
import Razorpay from "razorpay";
import crypto from "crypto";
import { config } from "../config";

const razorpay = new Razorpay({
    key_id: config.razorpay.keyId,
    key_secret: config.razorpay.keySecret
});

// ==========================================
// USER ROUTES 
// ==========================================

export const createRazorpayOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const { orderId } = req.body;

        const order = await db.query.orders.findFirst({
            where: eq(orders.id, orderId)
        });

        if (!order || order.userId !== userId) {
            return next(new AppError("Order bindings implicitly isolated preventing access cleanly", 404));
        }

        if (order.status !== "PENDING" && order.status !== "PROCESSING") {
            return next(new AppError("Order state logically prevents re-attempting explicit payment logic", 400));
        }

        const amountInPaise = Math.round(order.total * 100);

        const options = {
            amount: amountInPaise,
            currency: "INR",
            receipt: order.orderNumber,
        };

        const razorpayOrder = await razorpay.orders.create(options);

        const existingPayment = await db.query.payments.findFirst({
            where: eq(payments.orderId, orderId)
        });

        let payment;
        if (existingPayment) {
            const [updatedPayment] = await db.update(payments).set({
                userId,
                razorpayOrderId: razorpayOrder.id,
                amount: order.total,
                status: "PENDING",
                razorpayPaymentId: null,
                razorpaySignature: null,
                updatedAt: new Date()
            }).where(eq(payments.id, existingPayment.id)).returning();
            payment = updatedPayment;
        } else {
            [payment] = await db.insert(payments).values({
                userId,
                orderId,
                razorpayOrderId: razorpayOrder.id,
                amount: order.total,
            }).returning();
        }

        res.status(200).json({
            success: true,
            message: "Razorpay tracking bindings fully secured.",
            data: {
                razorpayOrder,
                paymentId: payment.id
            }
        });

    } catch (error) {
        next(error);
    }
}

export const createGuestRazorpayOrder = async (req: Request, res: Response, next: NextFunction) => {
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
            return next(new AppError("Unable to start payment for this order.", 404));
        }

        if (order.status !== "PENDING" && order.status !== "PROCESSING") {
            return next(new AppError("Order state logically prevents re-attempting explicit payment logic", 400));
        }

        const amountInPaise = Math.round(order.total * 100);
        const razorpayOrder = await razorpay.orders.create({
            amount: amountInPaise,
            currency: "INR",
            receipt: order.orderNumber,
        });

        const existingPayment = await db.query.payments.findFirst({
            where: eq(payments.orderId, orderId)
        });

        let payment;
        if (existingPayment) {
            const [updatedPayment] = await db.update(payments).set({
                userId: order.userId,
                razorpayOrderId: razorpayOrder.id,
                amount: order.total,
                status: "PENDING",
                razorpayPaymentId: null,
                razorpaySignature: null,
                updatedAt: new Date()
            }).where(eq(payments.id, existingPayment.id)).returning();
            payment = updatedPayment;
        } else {
            [payment] = await db.insert(payments).values({
                userId: order.userId,
                orderId,
                razorpayOrderId: razorpayOrder.id,
                amount: order.total,
            }).returning();
        }

        res.status(200).json({
            success: true,
            data: {
                razorpayOrder,
                paymentId: payment.id
            }
        });
    } catch (error) {
        next(error);
    }
};

export const verifyPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        const bodyParts = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
            .update(bodyParts.toString())
            .digest("hex");

        const payment = await db.query.payments.findFirst({
            where: eq(payments.razorpayOrderId, razorpay_order_id)
        });

        if (!payment) return next(new AppError("Explicit payment mapping absent structurally.", 404));

        const isAuthentic = expectedSignature === razorpay_signature;

        if (isAuthentic) {
            await db.transaction(async (tx) => {
                await tx.update(payments).set({
                    status: "PAID",
                    razorpayPaymentId: razorpay_payment_id,
                    razorpaySignature: razorpay_signature,
                    updatedAt: new Date()
                }).where(eq(payments.id, payment.id));

                await tx.update(orders).set({
                    status: "CONFIRMED",
                    paymentStatus: "PAID",
                    updatedAt: new Date()
                }).where(eq(orders.id, payment.orderId));
            });

            res.status(200).json({
                success: true,
                message: "Verification mathematically certified perfectly."
            });
        } else {
            await db.update(payments)
                .set({ status: "FAILED", updatedAt: new Date() })
                .where(eq(payments.id, payment.id));

            await db.update(orders)
                .set({ paymentStatus: "FAILED", updatedAt: new Date() })
                .where(eq(orders.id, payment.orderId));

            return next(new AppError("Cryptographic signature manipulation intercepted functionally seamlessly", 400));
        }
    } catch (error) {
        next(error);
    }
}

export const getPaymentHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;

        const paymentsList = await db.query.payments.findMany({
            where: eq(payments.userId, userId),
            with: { order: true },
            orderBy: [desc(payments.createdAt)]
        });

        res.status(200).json({ success: true, data: paymentsList });
    } catch (error) {
        next(error);
    }
}


// ==========================================
// ADMIN ROUTES 
// ==========================================

export const getPaymentById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;

        const payment = await db.query.payments.findFirst({
            where: eq(payments.id, id),
            with: {
                order: true,
                user: { columns: { id: true, name: true, email: true } },
                refunds: true
            }
        });

        if (!payment) return next(new AppError("Implicit structural absence globally.", 404));

        res.status(200).json({ success: true, data: payment });
    } catch (error) {
        next(error);
    }
}

export const refundPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const orderId = req.params.orderId as string;
        const { amount, reason } = req.body;

        const order = await db.query.orders.findFirst({
            where: eq(orders.id, orderId),
            with: { payment: true }
        });

        if (!order || !order.payment || order.paymentStatus !== "PAID") {
            return next(new AppError("Explicit boundary constraints block refunds on unmapped orders safely.", 400));
        }

        const refundAmount = amount ? amount : order.total;
        const refundAmountPaise = Math.round(refundAmount * 100);

        if (!order.payment.razorpayPaymentId) {
            return next(new AppError("Missing explicitly secure Payment map identities structurally blocking Remote triggers", 400));
        }

        const refundTargetOptions: any = { amount: refundAmountPaise };
        if (reason) refundTargetOptions.notes = { reason };

        const razorpayRefund = await razorpay.payments.refund(order.payment.razorpayPaymentId, refundTargetOptions);

        const [refund] = await db.insert(refunds).values({
            paymentId: order.payment.id,
            orderId: order.id,
            razorpayRefundId: razorpayRefund.id,
            amount: refundAmount,
            reason: reason || null,
            status: razorpayRefund.status
        }).returning();

        await db.update(orders)
            .set({ paymentStatus: "REFUNDED", updatedAt: new Date() })
            .where(eq(orders.id, order.id));

        res.status(200).json({
            success: true,
            message: "Remote refund securely executed dynamically syncing local constraints perfectly.",
            data: refund
        });

    } catch (error) {
        next(error);
    }
}
