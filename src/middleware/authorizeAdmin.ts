import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";

type AllowedRoles = "ADMIN" | "MANAGER" | "SUPPORT" | "CATALOG_MANAGER";

export const authorizeAdmin = (
    roles: AllowedRoles[] = ["ADMIN", "MANAGER", "SUPPORT", "CATALOG_MANAGER"]
) => {
    return (req: Request, res: Response, next: NextFunction) => {
        console.log("👮 Authorize middleware - User:", req.user?.id, "Role:", req.user?.role);
        console.log("👮 Required roles:", roles);
        
        // Double check authentication fallback
        if (!req.user || !req.user.role) {
            console.log("❌ No user/role in request");
            return next(new AppError("You are not logged in! Please log in.", 401));
        }

        // Check if req.user.role matches the passed AllowedRoles array
        if (!roles.includes(req.user.role as AllowedRoles)) {
            console.log("❌ Role not authorized:", req.user.role);
            return next(
                new AppError("You do not have permission to perform this action", 403)
            );
        }

        console.log("✅ User authorized");
        next();
    };
};
