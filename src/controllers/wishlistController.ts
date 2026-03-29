import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import db from "../db";
import { wishlists, wishlistItems, products } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";

const getOrCreateWishlist = async (userId: string) => {
    let wishlist = await db.query.wishlists.findFirst({
        where: eq(wishlists.userId, userId)
    });

    if (!wishlist) {
        const [newWishlist] = await db.insert(wishlists).values({ userId }).returning();
        wishlist = newWishlist;
    }
    return wishlist;
};

// ==========================================
// USER ROUTES 
// ==========================================

export const getWishlist = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const wishlist = await getOrCreateWishlist(userId);

        const populatedWishlist = await db.query.wishlists.findFirst({
            where: eq(wishlists.id, wishlist.id),
            with: {
                items: {
                    with: {
                        product: {
                            with: {
                                images: true,
                                variants: { columns: { id: true, stock: true } }
                            }
                        }
                    },
                    orderBy: [desc(wishlistItems.createdAt)]
                }
            }
        });

        res.status(200).json({
            success: true,
            data: populatedWishlist
        });

    } catch (error) {
        next(error);
    }
}

export const addToWishlist = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const { productId } = req.body;

        const product = await db.query.products.findFirst({ where: eq(products.id, productId) });
        if (!product) return next(new AppError("Abstract product identities absent globally.", 404));

        const wishlist = await getOrCreateWishlist(userId);

        const existingItem = await db.query.wishlistItems.findFirst({
            where: and(
                eq(wishlistItems.wishlistId, wishlist.id),
                eq(wishlistItems.productId, productId)
            )
        });

        if (existingItem) {
            return res.status(200).json({
                success: true,
                message: "Already in wishlist natively."
            });
        }

        await db.insert(wishlistItems).values({
            wishlistId: wishlist.id,
            productId
        });

        res.status(201).json({
            success: true,
            message: "Item cleanly appended seamlessly."
        });

    } catch (error) {
        next(error);
    }
}

export const removeFromWishlist = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const productId = req.params.productId as string;

        const wishlist = await db.query.wishlists.findFirst({ where: eq(wishlists.userId, userId) });
        if (!wishlist) return next(new AppError("Wishlist implicitly uninitialized gracefully.", 404));

        const item = await db.query.wishlistItems.findFirst({
            where: and(
                eq(wishlistItems.wishlistId, wishlist.id),
                eq(wishlistItems.productId, productId)
            )
        });

        if (!item) return next(new AppError("Item boundary missing fundamentally.", 404));

        await db.delete(wishlistItems).where(eq(wishlistItems.id, item.id));

        res.status(200).json({
            success: true,
            message: "Item securely unbounded dynamically."
        });

    } catch (error) {
        next(error);
    }
}
