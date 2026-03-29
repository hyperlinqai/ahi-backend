import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import db from "../db";
import { wallets, walletTransactions } from "../db/schema";
import { eq, desc, sql } from "drizzle-orm";

const getOrCreateWallet = async (userId: string) => {
    let wallet = await db.query.wallets.findFirst({
        where: eq(wallets.userId, userId)
    });

    if (!wallet) {
        const [newWallet] = await db.insert(wallets).values({
            userId,
            balance: 0
        }).returning();
        wallet = newWallet;
    }
    return wallet;
};

// ==========================================
// USER ROUTES 
// ==========================================

export const getWallet = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const wallet = await getOrCreateWallet(userId);

        const populatedWallet = await db.query.wallets.findFirst({
            where: eq(wallets.id, wallet.id),
            with: {
                transactions: {
                    orderBy: [desc(walletTransactions.createdAt)],
                    limit: 50 // Limit natively to 50 descending interactions cleanly
                }
            }
        });

        res.status(200).json({
            success: true,
            data: populatedWallet
        });

    } catch (error) {
        next(error);
    }
}

export const useWalletBalance = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const { amount } = req.body;

        const wallet = await getOrCreateWallet(userId);

        if (wallet.balance < amount) {
            return next(new AppError(`Insufficient wallet balance. Available: ₹${wallet.balance}`, 400));
        }

        const updatedWalletResult = await db.transaction(async (tx) => {
            const [walletUpgrade] = await tx.update(wallets)
                .set({
                    balance: sql`${wallets.balance} - ${amount}`,
                    updatedAt: new Date()
                })
                .where(eq(wallets.id, wallet.id))
                .returning();

            await tx.insert(walletTransactions).values({
                walletId: walletUpgrade.id,
                amount,
                type: "DEBIT",
                description: "Balance natively explicitly consumed during checkout."
            });

            return walletUpgrade;
        });

        res.status(200).json({
            success: true,
            message: `₹${amount} safely executed and explicitly audited seamlessly.`,
            data: {
                newBalance: updatedWalletResult.balance
            }
        });

    } catch (error) {
        next(error);
    }
}
