import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import db from "../db";
import { reviews, products, reviewImages, users } from "../db/schema";
import { eq, and, or, ilike, desc, count, avg, inArray, SQL } from "drizzle-orm";

const recalculateProductRatings = async (productId: string) => {
    const [aggregation] = await db.select({
        avgRating: avg(reviews.rating),
        reviewCount: count(reviews.id)
    }).from(reviews).where(
        and(
            eq(reviews.productId, productId),
            eq(reviews.status, "APPROVED")
        )
    );

    const avgR = aggregation.avgRating ? Number(aggregation.avgRating) : 0;
    const countR = aggregation.reviewCount ? Number(aggregation.reviewCount) : 0;

    await db.update(products).set({
        avgRating: Number(avgR.toFixed(1)),
        reviewCount: countR,
        updatedAt: new Date()
    }).where(eq(products.id, productId));
};

// ==========================================
// PUBLIC ROUTES
// ==========================================

export const getApprovedReviews = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const productId = req.params.id as string;
        const { page = "1", limit = "10" } = req.query;

        const skip = (Number(page) - 1) * Number(limit);

        const conditions = and(
            eq(reviews.productId, productId),
            eq(reviews.status, "APPROVED")
        );

        const [reviewsList, totalCountResult] = await Promise.all([
            db.query.reviews.findMany({
                where: conditions,
                with: {
                    user: { columns: { id: true, name: true, email: true } },
                    images: true
                },
                offset: skip,
                limit: Number(limit),
                orderBy: [desc(reviews.createdAt)]
            }),
            db.select({ count: count() }).from(reviews).where(conditions)
        ]);

        const totalCount = totalCountResult[0].count;

        res.status(200).json({
            success: true,
            data: {
                reviews: reviewsList,
                meta: { totalCount, page: Number(page), limit: Number(limit) }
            }
        });
    } catch (error) {
        next(error);
    }
}

// ==========================================
// USER ROUTES 
// ==========================================

export const submitReview = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const productId = req.params.id as string;
        const userId = req.user!.id;
        const { rating, title, body, images } = req.body;

        const product = await db.query.products.findFirst({ where: eq(products.id, productId) });
        if (!product) return next(new AppError("Product identity bounds inherently absent globally.", 404));

        const existing = await db.query.reviews.findFirst({
            where: and(eq(reviews.productId, productId), eq(reviews.userId, userId))
        });
        if (existing) return next(new AppError("System explicitly blocks multiple feedback bounds matching per-user constraints natively.", 400));

        const result = await db.transaction(async (tx) => {
            const [review] = await tx.insert(reviews).values({
                productId,
                userId,
                rating,
                title,
                body,
                status: "PENDING"
            }).returning();

            let revImages: any[] = [];
            if (images && Array.isArray(images) && images.length > 0) {
                const imgData = images.map((url: string) => ({ url, reviewId: review.id }));
                revImages = await tx.insert(reviewImages).values(imgData).returning();
            }

            return {
                ...review,
                images: revImages
            };
        });

        res.status(201).json({
            success: true,
            message: "Feedback cleanly captured. It will structurally manifest dynamically post-approval entirely.",
            data: result
        });

    } catch (error) {
        next(error);
    }
}

// ==========================================
// ADMIN ROUTES 
// ==========================================

export const approveReview = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const productId = req.params.id as string;
        const reviewId = req.params.rid as string;

        const review = await db.query.reviews.findFirst({
            where: and(eq(reviews.id, reviewId), eq(reviews.productId, productId))
        });
        if (!review) return next(new AppError("Review identifier missing globally.", 404));

        await db.update(reviews)
            .set({ status: "APPROVED", updatedAt: new Date() })
            .where(eq(reviews.id, reviewId));

        await recalculateProductRatings(productId);

        res.status(200).json({
            success: true,
            message: "Status successfully affirmed and parent models synchronously recalculated securely!"
        });

    } catch (error) {
        next(error);
    }
}

// ==========================================
// ADMIN LISTING — all reviews across products
// ==========================================

export const getAllReviewsAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;
        const status = req.query.status as string | undefined;
        const search = req.query.search as string | undefined;

        const conditions: SQL<unknown>[] = [];

        if (status && ["PENDING", "APPROVED", "REJECTED"].includes(status)) {
            conditions.push(eq(reviews.status, status as any));
        }

        if (search) {
            const matchingReviews = await db.select({ id: reviews.id })
                .from(reviews)
                .leftJoin(products, eq(reviews.productId, products.id))
                .leftJoin(users, eq(reviews.userId, users.id))
                .where(
                    or(
                        ilike(products.title, `%${search}%`),
                        ilike(users.name, `%${search}%`),
                        ilike(users.email, `%${search}%`)
                    )
                );

            if (matchingReviews.length > 0) {
                conditions.push(inArray(reviews.id, matchingReviews.map(r => r.id)));
            } else {
                conditions.push(eq(reviews.id, 'NO_MATCH'));
            }
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const [reviewsList, totalCountResult] = await Promise.all([
            db.query.reviews.findMany({
                where: whereClause,
                with: {
                    user: { columns: { id: true, name: true, email: true } },
                    product: { columns: { id: true, title: true, slug: true } },
                    images: true,
                },
                offset: skip,
                limit: limit,
                orderBy: [desc(reviews.createdAt)],
            }),
            db.select({ count: count() }).from(reviews).where(whereClause),
        ]);

        const totalCount = totalCountResult[0].count;

        res.status(200).json({
            success: true,
            data: {
                reviews: reviewsList,
                meta: {
                    totalCount,
                    page,
                    limit,
                    totalPages: Math.ceil(totalCount / limit),
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

export const rejectReview = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const productId = req.params.id as string;
        const reviewId = req.params.rid as string;

        const review = await db.query.reviews.findFirst({
            where: and(eq(reviews.id, reviewId), eq(reviews.productId, productId))
        });
        if (!review) return next(new AppError("Review not found.", 404));

        await db.update(reviews)
            .set({ status: "REJECTED", updatedAt: new Date() })
            .where(eq(reviews.id, reviewId));

        if (review.status === "APPROVED") {
            await recalculateProductRatings(productId);
        }

        res.status(200).json({ success: true, message: "Review rejected." });
    } catch (error) {
        next(error);
    }
};

export const deleteReview = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const productId = req.params.id as string;
        const reviewId = req.params.rid as string;

        const review = await db.query.reviews.findFirst({
            where: and(eq(reviews.id, reviewId), eq(reviews.productId, productId))
        });
        if (!review) return next(new AppError("Review logically untraceable functionally.", 404));

        await db.delete(reviews).where(eq(reviews.id, reviewId));

        if (review.status === "APPROVED") {
            await recalculateProductRatings(productId);
        }

        res.status(200).json({
            success: true,
            message: "Execution executed gracefully safely mapping cleanup bounds."
        });

    } catch (error) {
        next(error);
    }
}
