import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";

export const errorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    let error = { ...err };
    error.message = err.message;

    // Log to console for dev
    console.error(err);

    // Mongoose/Prisma bad ObjectId or similar formatting errors could be caught here
    // Prisma unique constraint violation
    if (err.code === "P2002") {
        const message = `Duplicate field value entered`;
        error = new AppError(message, 400);
    }

    // Zod validation errors
    if (err.name === "ZodError") {
        const message = err.errors.map((e: any) => e.message).join(". ");
        error = new AppError(message, 400);
    }

    // Don't forward upstream API status codes (e.g. Razorpay 401) to the client
    const statusCode = error.isOperational ? (error.statusCode || 500) : 500;
    const message = error.message || "Server Error";

    res.status(statusCode).json({
        success: false,
        error: message,
        stack: process.env.NODE_ENV === "production" ? null : err.stack,
    });
};
