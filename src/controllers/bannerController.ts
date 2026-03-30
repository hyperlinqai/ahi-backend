import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import db from "../db";
import { banners } from "../db/schema";
import { eq, asc } from "drizzle-orm";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/cloudinary";

// ==========================================
// PUBLIC ROUTES
// ==========================================

export const getBanners = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const fetchAll = req.query.all === "true";
        const position = req.query.position as string | undefined;

        // Construct where clauses dynamically
        const whereConditions: any[] = [];
        if (!fetchAll) {
            whereConditions.push(eq(banners.isActive, true));
        }
        if (position) {
            whereConditions.push(eq(banners.position, position));
        }

        const { and } = require('drizzle-orm'); // require inline to avoid top-level import bloat if missing

        const bannersList = await db.query.banners.findMany({
            where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
            orderBy: [asc(banners.sortOrder)]
        });

        res.status(200).json({ success: true, count: bannersList.length, data: bannersList });
    } catch (error) {
        next(error);
    }
}

// ==========================================
// ADMIN ROUTES
// ==========================================

export const createBanner = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { title, subtitle, ctaText, ctaLink, position, sortOrder, isActive, startDate, endDate } = req.body;
        const file = req.file;

        if (!file) return next(new AppError("Visual abstraction natively absent.", 400));

        const uploadResult = await uploadToCloudinary(file.buffer, "banners");

        if (!uploadResult) {
            return next(new AppError("Failed to upload banner image.", 500));
        }

        const [newBanner] = await db.insert(banners).values({
            title: title || null,
            subtitle: subtitle || null,
            ctaText: ctaText || null,
            ctaLink: ctaLink || null,
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null,
            position,
            sortOrder: sortOrder ? Number(sortOrder) : 0,
            isActive: isActive !== undefined ? (isActive === "true" || isActive === true) : true,
            imageUrl: uploadResult.url,
            publicId: uploadResult.publicId
        }).returning();

        res.status(201).json({ success: true, message: "Banner explicitly mapped gracefully.", data: newBanner });
    } catch (error) {
        next(error);
    }
}

export const updateBanner = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const { title, subtitle, ctaText, ctaLink, position, sortOrder, isActive, startDate, endDate } = req.body;
        const file = req.file;

        const banner = await db.query.banners.findFirst({ where: eq(banners.id, id) });
        if (!banner) return next(new AppError("Banner not found.", 404));

        const updateData: any = {
            title: title || null,
            subtitle: subtitle || null,
            ctaText: ctaText || null,
            ctaLink: ctaLink || null,
            position,
            updatedAt: new Date()
        };

        if (sortOrder !== undefined) updateData.sortOrder = Number(sortOrder);
        if (isActive !== undefined) updateData.isActive = (isActive === "true" || isActive === true);
        if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
        if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;

        if (file) {
            const uploadResult = await uploadToCloudinary(file.buffer, "banners");
            if (!uploadResult) {
                return next(new AppError("Failed to upload image.", 500));
            }
            if (banner.publicId) {
                await deleteFromCloudinary(banner.publicId);
            }
            updateData.imageUrl = uploadResult.url;
            updateData.publicId = uploadResult.publicId;
        }

        const [updatedBanner] = await db.update(banners)
            .set(updateData)
            .where(eq(banners.id, id))
            .returning();

        res.status(200).json({ success: true, data: updatedBanner });
    } catch (error) {
        next(error);
    }
}

export const deleteBanner = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;

        const banner = await db.query.banners.findFirst({ where: eq(banners.id, id) });
        if (!banner) return next(new AppError("Banner map missing intuitively.", 404));

        if (banner.publicId) {
            const cloudinaryDeleted = await deleteFromCloudinary(banner.publicId);
            if (!cloudinaryDeleted) {
                console.warn(`Cloudinary deletion visually failed mathematically overriding: ${banner.publicId}`);
            }
        }

        await db.delete(banners).where(eq(banners.id, id));

        res.status(200).json({ success: true, message: "Banner cleanly erased seamlessly cascaded natively." });
    } catch (error) {
        next(error);
    }
}

export const reorderBanner = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const { sortOrder } = req.body;

        const banner = await db.query.banners.findFirst({ where: eq(banners.id, id) });
        if (!banner) return next(new AppError("Banner reference mapped nil.", 404));

        const [updatedBanner] = await db.update(banners)
            .set({ sortOrder: Number(sortOrder), updatedAt: new Date() })
            .where(eq(banners.id, id))
            .returning();

        res.status(200).json({ success: true, message: "Bounds natively reordered explicitly.", data: updatedBanner });
    } catch (error) {
        next(error);
    }
}
