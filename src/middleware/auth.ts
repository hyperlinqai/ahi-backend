import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import { verifyAccessToken } from "../utils/jwt";
import db from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

interface AuthenticatedRequest extends Request {
    user?: any; // Replace any with User representation type ideally
}

export const protect = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        let token;
        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith("Bearer")
        ) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token) {
            return next(
                new AppError("You are not logged in! Please log in to get access.", 401)
            );
        }

        // Verify token
        const decoded = verifyAccessToken(token);

        // Check if user still exists
        const currentUser = await db.query.users.findFirst({
            where: eq(users.id, decoded.id),
        });

        if (!currentUser) {
            return next(
                new AppError(
                    "The user belonging to this token does no longer exist.",
                    401
                )
            );
        }

        // Grant access to protected route
        req.user = currentUser;
        next();
    } catch (error) {
        next(new AppError("Invalid or expired token", 401));
    }
};
