import { z } from "zod";

export const createRazorpayOrderSchema = z.object({
    body: z.object({
        orderId: z.string().uuid("Provided identifier must mathematically match Prisma explicit UUID structs")
    })
});

export const verifyPaymentSchema = z.object({
    body: z.object({
        razorpay_order_id: z.string(),
        razorpay_payment_id: z.string(),
        razorpay_signature: z.string()
    })
});

export const verifyPaypalOrderSchema = z.object({
    body: z.object({
        orderID: z.string(),
        payerID: z.string(),
        paymentID: z.string(),
        orderId: z.string().uuid("Provided identifier must mathematically match Prisma explicit UUID structs")
    })
});

export const refundPaymentSchema = z.object({
    body: z.object({
        amount: z.number().positive("Refund amount conceptually must be greater than natively zero").optional(),
        reason: z.string().optional()
    })
});
