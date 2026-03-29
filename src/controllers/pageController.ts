import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import db from "../db";
import { staticPages } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import slugify from "slugify";

// ==========================================
// PUBLIC ROUTES
// ==========================================

export const getAllPages = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const fetchAll = req.query.all === "true";
        const pages = await db.query.staticPages.findMany({
            where: fetchAll ? undefined : eq(staticPages.isActive, true),
            columns: {
                id: true,
                title: true,
                slug: true,
                isActive: true,
                updatedAt: true
            },
            orderBy: [desc(staticPages.createdAt)]
        });

        res.status(200).json({ success: true, count: pages.length, data: pages });
    } catch (error) {
        next(error);
    }
}

export const getPageBySlug = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const slug = req.params.slug as string;
        const fetchAll = req.query.all === "true";
        
        const page = await db.query.staticPages.findFirst({ 
            where: eq(staticPages.slug, slug) 
        });

        if (!page || (!fetchAll && !page.isActive)) return next(new AppError("Page not found.", 404));

        res.status(200).json({ success: true, data: page });
    } catch (error) {
        next(error);
    }
}

// ==========================================
// ADMIN ROUTES
// ==========================================

export const createPage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { title, content, isActive, metaTitle, metaDescription } = req.body;

        const baseSlug = slugify(title, { lower: true, strict: true });

        const existing = await db.query.staticPages.findFirst({ 
            where: eq(staticPages.slug, baseSlug) 
        });
        
        if (existing) return next(new AppError("A Page mapping identically natively exists securely.", 400));

        const [newPage] = await db.insert(staticPages).values({
            title,
            slug: baseSlug,
            content,
            isActive: isActive ?? true,
            metaTitle,
            metaDescription
        }).returning();

        res.status(201).json({ success: true, message: "Page materialized successfully.", data: newPage });
    } catch (error) {
        next(error);
    }
}

export const updatePage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const slug = req.params.slug as string;
        const { title, content, isActive, metaTitle, metaDescription } = req.body;

        const page = await db.query.staticPages.findFirst({ 
            where: eq(staticPages.slug, slug) 
        });
        if (!page) return next(new AppError("Page inherently missing structurally.", 404));

        const updateData: any = { 
            content, 
            isActive, 
            metaTitle, 
            metaDescription,
            updatedAt: new Date()
        };

        if (title) {
            updateData.title = title;
            updateData.slug = slugify(title, { lower: true, strict: true });
        }

        const [updatedPage] = await db.update(staticPages)
            .set(updateData)
            .where(eq(staticPages.slug, slug))
            .returning();

        res.status(200).json({ success: true, data: updatedPage });
    } catch (error) {
        next(error);
    }
}

export const deletePage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const slug = req.params.slug as string;

        const existing = await db.query.staticPages.findFirst({ 
            where: eq(staticPages.slug, slug) 
        });
        if (!existing) return next(new AppError("Page implicitly deleted.", 404));

        await db.delete(staticPages).where(eq(staticPages.id, existing.id));

        res.status(200).json({ success: true, message: "Page removed seamlessly mathematically." });
    } catch (error) {
        next(error);
    }
}
