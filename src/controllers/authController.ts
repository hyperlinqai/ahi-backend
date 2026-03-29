import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { eq, and, gt, desc } from "drizzle-orm";
import db from "../db";
import { users, verificationOtps, refreshTokens, resetTokens, wallets } from "../db/schema";
import { AppError } from "../utils/AppError";
import { signAccessToken, signRefreshToken } from "../utils/jwt";
import { sendEmail } from "../utils/email";

// Helper function to generate numeric OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, phone, password, name } = req.body;

        const existingUser = await db.query.users.findFirst({
            where: eq(users.email, email)
        });

        if (existingUser) {
            return next(new AppError("Email already in use", 400));
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Run user creation and wallet creation in a transaction
        const user = await db.transaction(async (tx) => {
            const [newUser] = await tx.insert(users).values({
                email,
                ...(phone && { phone }),
                password: hashedPassword,
                name,
                isVerified: true,
            }).returning();

            await tx.insert(wallets).values({
                userId: newUser.id,
                balance: 0
            });

            return newUser;
        });

        res.status(201).json({
            success: true,
            message: "User registered successfully.",
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                }
            },
        });
    } catch (error) {
        next(error);
    }
};

export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, otp } = req.body;

        const user = await db.query.users.findFirst({ where: eq(users.email, email) });
        if (!user) {
            return next(new AppError("User not found", 404));
        }

        const otpRecord = await db.query.verificationOtps.findFirst({
            where: and(
                eq(verificationOtps.userId, user.id),
                eq(verificationOtps.otp, otp),
                gt(verificationOtps.expiresAt, new Date())
            ),
            orderBy: [desc(verificationOtps.createdAt)],
        });

        if (!otpRecord) {
            return next(new AppError("Invalid or expired OTP", 400));
        }

        // Mark as verified
        await db.update(users)
            .set({ isVerified: true })
            .where(eq(users.id, user.id));

        // Delete used DB row
        await db.delete(verificationOtps)
            .where(eq(verificationOtps.userId, user.id));

        res.status(200).json({
            success: true,
            message: "Email verified successfully",
        });
    } catch (error) {
        next(error);
    }
};


export const login = async (req: Request, res: Response, next: NextFunction) => {
    try {
        console.log("🔐 Login attempt for:", req.body.email);
        const { email, password } = req.body;

        const user = await db.query.users.findFirst({ where: eq(users.email, email) });
        console.log("👤 User found:", user ? "Yes" : "No");

        if (!user) {
            return next(new AppError("Invalid email or password", 401));
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        console.log("🔑 Password valid:", isPasswordValid);
        if (!isPasswordValid) {
            return next(new AppError("Invalid email or password", 401));
        }

        const payload = { id: user.id, role: user.role };
        console.log("📝 Creating tokens with payload:", payload);
        console.log("🔧 JWT_ACCESS_SECRET length:", process.env.JWT_ACCESS_SECRET?.length || 0);
        
        try {
            const accessToken = signAccessToken(payload);
            const refreshToken = signRefreshToken(payload);
            console.log("✅ Tokens created successfully");

            // Store new refresh token inside RefreshToken table
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7); // 7 days matching JWT

            await db.insert(refreshTokens).values({
                token: refreshToken,
                userId: user.id,
                expiresAt,
            });

            res.status(200).json({
                success: true,
                message: "Logged in successfully",
                data: {
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        role: user.role,
                    },
                    accessToken,
                    refreshToken,
                },
            });
        } catch (tokenError) {
            console.error("💥 Token creation error:", tokenError);
            throw tokenError;
        }
    } catch (error) {
        console.error("💥 Login error:", error);
        next(error);
    }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Technically can pass token in body or headers
        const { refreshToken } = req.body;

        if (refreshToken) {
            await db.delete(refreshTokens)
                .where(eq(refreshTokens.token, refreshToken));
        }

        res.status(200).json({
            success: true,
            message: "Logged out successfully",
        });
    } catch (error) {
        next(error);
    }
};


export const refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { refreshToken } = req.body;

        const tokenRecord = await db.query.refreshTokens.findFirst({
            where: eq(refreshTokens.token, refreshToken),
            with: { user: true }
        });

        if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
            if (tokenRecord) {
                await db.delete(refreshTokens).where(eq(refreshTokens.id, tokenRecord.id));
            }
            return next(new AppError("Invalid or expired refresh token", 401));
        }

        // Verify token validity
        const payload = { id: tokenRecord.user.id, role: tokenRecord.user.role };

        // This will throw if expired underlying JWT
        const accessToken = signAccessToken(payload);
        const newRefreshToken = signRefreshToken(payload);

        // Rotate token mapping (delete old, create new)
        await db.delete(refreshTokens).where(eq(refreshTokens.id, tokenRecord.id));

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await db.insert(refreshTokens).values({
            token: newRefreshToken,
            userId: tokenRecord.userId,
            expiresAt,
        });

        res.status(200).json({
            success: true,
            message: "Tokens refreshed successfully",
            data: {
                accessToken,
                refreshToken: newRefreshToken,
            },
        });
    } catch (error) {
        next(error);
    }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email } = req.body;

        const user = await db.query.users.findFirst({ where: eq(users.email, email) });
        if (!user) {
            // Return success anyway to prevent email enumeration
            return res.status(200).json({ success: true, message: "If that email exists, a reset link was sent." });
        }

        // Create secure reset token
        const resetTokenRaw = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(resetTokenRaw).digest('hex');

        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await db.insert(resetTokens).values({
            token: tokenHash,
            userId: user.id,
            expiresAt
        });

        const resetURL = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetTokenRaw}`;

        await sendEmail({
            email: user.email,
            subject: "Password Reset Request - Ahi Jewellery",
            message: `<h1>Password Reset</h1><p>You requested a password reset. Please click the following link to assign a new password:</p><a href="${resetURL}">Reset Password</a><p>It will expire in 1 hour.</p>`
        });

        res.status(200).json({
            success: true,
            message: "If that email exists, a reset link was sent.",
        });

    } catch (error) {
        next(error);
    }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { token, newPassword } = req.body;

        // Hash the incoming raw token to find it in the DB
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        const resetRecord = await db.query.resetTokens.findFirst({
            where: eq(resetTokens.token, tokenHash),
            with: { user: true }
        });

        if (!resetRecord || resetRecord.expiresAt < new Date()) {
            return next(new AppError("Token is invalid or has expired", 400));
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await db.update(users)
            .set({ password: hashedPassword })
            .where(eq(users.id, resetRecord.userId));

        // Delete token to prevent reuse
        await db.delete(resetTokens).where(eq(resetTokens.id, resetRecord.id));

        res.status(200).json({
            success: true,
            message: "Password has been successfully reset! You can now login.",
        });
    } catch (error) {
        next(error);
    }
};
