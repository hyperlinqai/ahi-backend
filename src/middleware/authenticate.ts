import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import { verifyAccessToken } from "../utils/jwt";
import db from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

// Global declaration to attach 'user' to the Express Request interface globally
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                role: string;
            };
        }
    }
}

export const authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        let token;

        console.log("🔐 Auth middleware - Headers:", req.headers.authorization ? "Present" : "Missing");

        // 1. Extract Bearer token from Authorization header
        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith("Bearer")
        ) {
            token = req.headers.authorization.split(" ")[1];
            console.log("🔑 Token extracted (first 30 chars):", token?.substring(0, 30) + "...");
        }

        if (!token) {
            console.log("❌ No token found in request");
            return next(
                new AppError("You are not logged in! Please log in to get access.", 401)
            );
        }

        // 2. Verify JWT using the access token utility (which uses ACCESS_TOKEN_SECRET)
        console.log("🔍 Verifying token...");
        const decoded = verifyAccessToken(token);
        console.log("✅ Token verified for user:", decoded.id);

        // 3. Verify user still exists in the database
        const currentUser = await db.query.users.findFirst({
            where: eq(users.id, decoded.id),
            columns: { id: true, role: true } // Only pull necessary fields
        });

        if (!currentUser) {
            console.log("❌ User not found in database:", decoded.id);
            return next(
                new AppError("The user belonging to this token no longer exists.", 401)
            );
        }

        console.log("✅ User authenticated:", currentUser.id, "Role:", currentUser.role);

        // 4. Attach decoded user successfully
        req.user = currentUser as { id: string, role: string };

        next();
    } catch (error) {
        console.error("💥 Auth error:", error);
        // Return 401 if any JWT decoding fails
        next(new AppError("Invalid or expired token", 401));
    }
};
