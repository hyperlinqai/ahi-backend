import { Request, Response, NextFunction } from "express";
import slugify from "slugify";
import db from "../db";
import { categories, products } from "../db/schema";
import { eq, asc, desc, isNull, count } from "drizzle-orm";
import { AppError } from "../utils/AppError";
import { uploadToCloudinary } from "../utils/cloudinary";

export const getAllCategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const categoriesList = await db.query.categories.findMany({
            where: isNull(categories.parentId),
            with: {
                children: {
                    with: {
                        children: true, // go down up to 3 tree layers generally
                    }
                }
            },
            orderBy: [asc(categories.sortOrder)],
        });

        res.status(200).json({
            success: true,
            data: categoriesList,
        });
    } catch (error) {
        next(error);
    }
};

export const getCategoryById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;

        const category = await db.query.categories.findFirst({
            where: eq(categories.id, id),
            with: {
                parent: true,
                children: true,
            }
        });

        if (!category) return next(new AppError("Category not found", 404));

        const [productCountResult] = await db.select({ count: count() }).from(products).where(eq(products.categoryId, id));

        const formattedCategory = {
            ...category,
            _count: {
                products: productCountResult.count,
            }
        };

        res.status(200).json({
            success: true,
            data: formattedCategory,
        });
    } catch (error) {
        next(error);
    }
};

export const getCategoryProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;

        const category = await db.query.categories.findFirst({ where: eq(categories.id, id) });
        if (!category) return next(new AppError("Category not found", 404));

        const [productsList, totalCountResult] = await Promise.all([
            db.query.products.findMany({
                where: eq(products.categoryId, id),
                offset: skip,
                limit: limit,
                orderBy: [desc(products.createdAt)],
                with: { images: true }
            }),
            db.select({ count: count() }).from(products).where(eq(products.categoryId, id)),
        ]);

        const totalCount = totalCountResult[0].count;

        res.status(200).json({
            success: true,
            data: productsList,
            meta: {
                totalCount,
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, description, parentId, isActive, sortOrder } = req.body;
        const isActiveBool = isActive !== undefined ? (isActive === "true" || isActive === true) : true;
        const sortOrderInt = sortOrder !== undefined ? (parseInt(sortOrder as string) || 0) : 0;
        let { slug } = req.body;

        let imageUrl: string | null = null;
        if (req.file) {
            const uploadResult = await uploadToCloudinary(req.file.buffer, "categories");
            if (uploadResult) imageUrl = uploadResult.url;
        }

        if (!slug) {
            slug = slugify(name, { lower: true, strict: true });
        }

        const existingCategory = await db.query.categories.findFirst({ where: eq(categories.slug, slug) });
        if (existingCategory) {
            return next(new AppError("Category with this name or slug already exists", 400));
        }

        if (parentId) {
            const parent = await db.query.categories.findFirst({ where: eq(categories.id, parentId) });
            if (!parent) return next(new AppError("Parent category not found", 400));
        }

        const [newCategory] = await db.insert(categories).values({
            name,
            slug,
            description,
            parentId: parentId || null,
            imageUrl,
            isActive: isActiveBool,
            sortOrder: sortOrderInt,
        }).returning();

        res.status(201).json({
            success: true,
            message: "Category created successfully",
            data: newCategory,
        });
    } catch (error) {
        next(error);
    }
};

export const updateCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const { name, description, parentId, isActive, sortOrder } = req.body;
        let { slug } = req.body;

        const category = await db.query.categories.findFirst({ where: eq(categories.id, id) });
        if (!category) return next(new AppError("Category not found", 404));

        const isActiveBool = isActive !== undefined ? (isActive === "true" || isActive === true) : category.isActive;
        const sortOrderInt = sortOrder !== undefined ? (parseInt(sortOrder as string) || 0) : category.sortOrder;

        if (!slug) {
            if (name && name !== category.name) {
                slug = slugify(name, { lower: true, strict: true });
            } else {
                slug = category.slug;
            }
        }

        if (slug !== category.slug) {
            const existingSlug = await db.query.categories.findFirst({ where: eq(categories.slug, slug) });
            if (existingSlug && existingSlug.id !== id) {
                return next(new AppError("A category natively mapping to this auto-slug exists", 400));
            }
        }

        let imageUrl = category.imageUrl;
        if (req.file) {
            const uploadResult = await uploadToCloudinary(req.file.buffer, "categories");
            if (uploadResult) imageUrl = uploadResult.url;
        }

        const [updatedCategory] = await db.update(categories).set({
            name,
            slug,
            description,
            parentId: parentId || null,
            imageUrl,
            isActive: isActiveBool,
            sortOrder: sortOrderInt,
            updatedAt: new Date(),
        }).where(eq(categories.id, id)).returning();

        res.status(200).json({
            success: true,
            message: "Category updated successfully",
            data: updatedCategory,
        });
    } catch (error) {
        next(error);
    }
};

export const deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;

        const category = await db.query.categories.findFirst({ where: eq(categories.id, id) });
        if (!category) return next(new AppError("Category not found", 404));

        const [productCountResult] = await db.select({ count: count() }).from(products).where(eq(products.categoryId, id));
        const [childrenCountResult] = await db.select({ count: count() }).from(categories).where(eq(categories.parentId, id));

        if (productCountResult.count > 0) {
            return next(new AppError("Cannot delete category mapping because products recursively belong to it.", 400));
        }

        if (childrenCountResult.count > 0) {
            return next(new AppError("Cannot delete category because it inherently possess child tree nodes beneath it. Reassign subcategories first.", 400));
        }

        await db.delete(categories).where(eq(categories.id, id));

        res.status(200).json({
            success: true,
            message: "Category deleted successfully",
        });
    } catch (error) {
        next(error);
    }
};

export const reorderCategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { categories: categoriesOrderList } = req.body;

        if (!Array.isArray(categoriesOrderList)) {
            return next(new AppError("Invalid categories array format", 400));
        }

        const updatePromises = categoriesOrderList.map((c: any) =>
            db.update(categories)
              .set({ sortOrder: c.sortOrder })
              .where(eq(categories.id, c.id))
        );

        await Promise.all(updatePromises);

        res.status(200).json({
            success: true,
            message: "Categories reordered successfully",
        });
    } catch (error) {
        next(error);
    }
};
