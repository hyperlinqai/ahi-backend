import { Request, Response, NextFunction } from "express";
import slugify from "slugify";
import db from "../db";
import { products, productVariants, productImages, categories, reviews } from "../db/schema";
import { eq, or, and, gt, gte, lte, ilike, desc, asc, count, inArray, sql, SQL } from "drizzle-orm";
import { AppError } from "../utils/AppError";
import { uploadToCloudinary } from "../utils/cloudinary";

const enrichProduct = (product: any) => {
    let avgRating = 0;
    const reviewCount = product.reviews ? product.reviews.length : 0;

    if (reviewCount > 0) {
        const sum = product.reviews.reduce((acc: number, review: any) => acc + review.rating, 0);
        avgRating = Number((sum / reviewCount).toFixed(1));
    }

    const { reviews: _r, ...rest } = product;
    return { ...rest, avgRating, reviewCount };
};

export const getAllProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;

        const { category, minPrice, maxPrice, inStock, isFeatured, brand, sort } = req.query;

        const conditions: SQL<unknown>[] = [];

        if (category) conditions.push(eq(products.categoryId, category as string));
        if (brand) conditions.push(eq(products.brand, brand as string));
        if (isFeatured === 'true') conditions.push(eq(products.isFeatured, true));

        if (minPrice) conditions.push(gte(products.price, parseFloat(minPrice as string)));
        if (maxPrice) conditions.push(lte(products.price, parseFloat(maxPrice as string)));

        if (inStock === 'true') {
            const inStockSubquery = db.select({ id: productVariants.productId })
                .from(productVariants)
                .where(gt(productVariants.stock, 0));
            conditions.push(inArray(products.id, inStockSubquery));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        let orderByConfig: any = [desc(products.createdAt)];
        if (sort === "price_asc") orderByConfig = [asc(products.price)];
        if (sort === "price_desc") orderByConfig = [desc(products.price)];
        if (sort === "newest") orderByConfig = [desc(products.createdAt)];
        if (sort === "popularity") {
            orderByConfig = [desc(products.reviewCount)]; // Proxying popularity using reviewCount natively
        }

        const [productsList, totalCountResult] = await Promise.all([
            db.query.products.findMany({
                where: whereClause,
                offset: skip,
                limit: limit,
                orderBy: orderByConfig,
                with: {
                    images: { orderBy: [asc(productImages.sortOrder)] },
                    category: { columns: { name: true, slug: true } },
                    variants: true,
                    reviews: { columns: { rating: true } },
                }
            }),
            db.select({ count: count() }).from(products).where(whereClause),
        ]);

        const totalCount = totalCountResult[0].count;
        const enrichedProducts = productsList.map(enrichProduct);

        res.status(200).json({
            success: true,
            data: enrichedProducts,
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

export const getProductById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;

        const product = await db.query.products.findFirst({
            where: eq(products.id, id),
            with: {
                images: { orderBy: [asc(productImages.sortOrder)] },
                category: true,
                variants: true,
                reviews: {
                    with: {
                        user: { columns: { id: true, name: true } }
                    },
                    orderBy: [desc(reviews.createdAt)]
                },
            }
        });

        if (!product) return next(new AppError("Product not found", 404));

        res.status(200).json({
            success: true,
            data: enrichProduct(product),
        });
    } catch (error) {
        next(error);
    }
};

export const getProductBySlug = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const slug = req.params.slug as string;

        const product = await db.query.products.findFirst({
            where: eq(products.slug, slug),
            with: {
                images: { orderBy: [asc(productImages.sortOrder)] },
                category: true,
                variants: true,
                reviews: {
                    with: {
                        user: { columns: { id: true, name: true } }
                    },
                    orderBy: [desc(reviews.createdAt)]
                },
            }
        });

        if (!product) return next(new AppError("Product natively mapping to slug not found", 404));

        res.status(200).json({
            success: true,
            data: enrichProduct(product),
        });
    } catch (error) {
        next(error);
    }
};

export const searchProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { q, category, minPrice, maxPrice, sort } = req.query;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;

        const conditions: SQL<unknown>[] = [];

        if (q) {
            const searchCondition = or(
                ilike(products.title, `%${q}%`),
                ilike(products.description, `%${q}%`)
            );
            if (searchCondition) conditions.push(searchCondition);
        }

        if (category) conditions.push(eq(products.categoryId, category as string));
        if (minPrice) conditions.push(gte(products.price, parseFloat(minPrice as string)));
        if (maxPrice) conditions.push(lte(products.price, parseFloat(maxPrice as string)));

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        let orderByConfig: any = [desc(products.createdAt)];
        if (sort === "price_asc") orderByConfig = [asc(products.price)];
        if (sort === "price_desc") orderByConfig = [desc(products.price)];

        const [productsList, totalCountResult] = await Promise.all([
            db.query.products.findMany({
                where: whereClause,
                offset: skip,
                limit: limit,
                orderBy: orderByConfig,
                with: {
                    images: { orderBy: [asc(productImages.sortOrder)] },
                    reviews: { columns: { rating: true } }
                }
            }),
            db.select({ count: count() }).from(products).where(whereClause)
        ]);

        const totalCount = totalCountResult[0].count;
        const enrichedProducts = productsList.map(enrichProduct);

        res.status(200).json({
            success: true,
            data: enrichedProducts,
            meta: { totalCount, page, limit, totalPages: Math.ceil(totalCount / limit) }
        });
    } catch (error) {
        next(error);
    }
};

export const getProductsByCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const catId = req.params.catId as string;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;

        const whereClause = eq(products.categoryId, catId);

        const [productsList, totalCountResult] = await Promise.all([
            db.query.products.findMany({
                where: whereClause,
                offset: skip,
                limit: limit,
                orderBy: [desc(products.createdAt)],
                with: {
                    images: { orderBy: [asc(productImages.sortOrder)] },
                    reviews: { columns: { rating: true } }
                }
            }),
            db.select({ count: count() }).from(products).where(whereClause)
        ]);

        const totalCount = totalCountResult[0].count;
        const enrichedProducts = productsList.map(enrichProduct);

        res.status(200).json({
            success: true,
            data: enrichedProducts,
            meta: { totalCount, page, limit, totalPages: Math.ceil(totalCount / limit) }
        });
    } catch (error) {
        next(error);
    }
}

export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { title, description, price, categoryId, brand, isFeatured, weight, length, width, height, metaTitle, metaDescription, metaKeywords, variants } = req.body;

        const slug = slugify(title, { lower: true, strict: true });
        
        const existingProduct = await db.query.products.findFirst({ where: eq(products.slug, slug) });
        if (existingProduct) {
            return next(new AppError("Product with corresponding title slug already explicitly exists securely.", 400));
        }

        const newProduct = await db.transaction(async (tx) => {
            const [createdProduct] = await tx.insert(products).values({
                title,
                slug,
                description,
                price: parseFloat(price),
                categoryId,
                brand,
                isFeatured: isFeatured || false,
                weight: weight ? parseFloat(weight) : null,
                length: length ? parseFloat(length) : null,
                width: width ? parseFloat(width) : null,
                height: height ? parseFloat(height) : null,
                metaTitle,
                metaDescription,
                metaKeywords,
            }).returning();

            if (variants && Array.isArray(variants) && variants.length > 0) {
                const variantsData = variants.map((v: any) => ({
                    name: v.name,
                    value: v.value,
                    sku: v.sku,
                    stock: parseInt(v.stock, 10) || 0,
                    lowStockAlert: parseInt(v.lowStockAlert, 10) || 5,
                    productId: createdProduct.id
                }));
                await tx.insert(productVariants).values(variantsData);
            }

            return createdProduct;
        });

        const fullProduct = await db.query.products.findFirst({
            where: eq(products.id, newProduct.id),
            with: { variants: true }
        });

        res.status(201).json({
            success: true,
            message: "Product safely mapped securely",
            data: fullProduct,
        });
    } catch (error) {
        next(error);
    }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const { title, description, price, categoryId, brand, isFeatured, weight, length, width, height, metaTitle, metaDescription, metaKeywords, variants } = req.body;

        const product = await db.query.products.findFirst({ where: eq(products.id, id) });
        if (!product) return next(new AppError("Product mapping missing securely.", 404));

        let slug = product.slug;
        if (title && title !== product.title) {
            slug = slugify(title, { lower: true, strict: true });
            const existingSlug = await db.query.products.findFirst({ where: eq(products.slug, slug) });
            if (existingSlug && existingSlug.id !== id) {
                return next(new AppError("Product auto-slug collision occurring logically securely.", 400));
            }
        }

        const [updatedProduct] = await db.update(products).set({
            title,
            slug,
            description,
            price: price !== undefined ? parseFloat(price) : undefined,
            categoryId,
            brand,
            isFeatured,
            weight: weight !== undefined ? parseFloat(weight) : undefined,
            length: length !== undefined ? parseFloat(length) : undefined,
            width: width !== undefined ? parseFloat(width) : undefined,
            height: height !== undefined ? parseFloat(height) : undefined,
            metaTitle,
            metaDescription,
            metaKeywords,
            updatedAt: new Date()
        }).where(eq(products.id, id)).returning();

        // Sync Variants Dynamically
        if (variants && Array.isArray(variants)) {
            const existingVariants = await db.query.productVariants.findMany({ where: eq(productVariants.productId, id) });
            const incomingIds = variants.map((v: any) => v.id).filter(Boolean);

            const toDelete = existingVariants.filter(ev => !incomingIds.includes(ev.id));
            if (toDelete.length > 0) {
                const idsToDelete = toDelete.map(v => v.id);
                try {
                    await db.delete(productVariants).where(inArray(productVariants.id, idsToDelete));
                } catch (e) {
                    await db.update(productVariants).set({ stock: 0 }).where(inArray(productVariants.id, idsToDelete));
                }
            }

            for (const v of variants) {
                if (v.id) {
                    await db.update(productVariants).set({
                        name: v.name,
                        value: v.value,
                        sku: v.sku,
                        stock: v.stock !== undefined ? parseInt(v.stock, 10) : undefined,
                        lowStockAlert: v.lowStockAlert !== undefined ? parseInt(v.lowStockAlert, 10) : undefined,
                        updatedAt: new Date()
                    }).where(eq(productVariants.id, v.id));
                } else {
                    await db.insert(productVariants).values({
                        name: v.name,
                        value: v.value,
                        sku: v.sku,
                        stock: v.stock !== undefined ? parseInt(v.stock, 10) : 0,
                        lowStockAlert: v.lowStockAlert !== undefined ? parseInt(v.lowStockAlert, 10) : 5,
                        productId: id
                    });
                }
            }
        }

        res.status(200).json({
            success: true,
            message: "Product dynamically modified securely.",
            data: updatedProduct,
        });

    } catch (error) {
        next(error);
    }
}

export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;

        const [deleted] = await db.delete(products).where(eq(products.id, id)).returning();
        if (!deleted) {
            return next(new AppError("Product string missing natively.", 404));
        }

        res.status(200).json({
            success: true,
            message: "Product purged thoroughly",
        });
    } catch (error) {
        next(error);
    }
}

export const uploadProductImages = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const files = req.files as Express.Multer.File[];

        if (!files || files.length === 0) {
            return next(new AppError("No files securely extracted via bounds", 400));
        }

        const product = await db.query.products.findFirst({ where: eq(products.id, id) });
        if (!product) return next(new AppError("Product not found securely logically.", 404));

        const uploadedImages: any[] = [];

        for (const file of files) {
            const uploadResult = await uploadToCloudinary(file.path, "products");
            if (uploadResult) {
                const [newImage] = await db.insert(productImages).values({
                    url: uploadResult.url,
                    productId: id
                }).returning();
                uploadedImages.push(newImage);
            }
        }

        res.status(200).json({
            success: true,
            message: "Images dynamically mapped onto active item.",
            data: uploadedImages
        });

    } catch (error) {
        next(error);
    }
}

export const deleteProductImage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const imgId = req.params.imgId as string;

        const image = await db.query.productImages.findFirst({ where: eq(productImages.id, imgId) });
        if (!image || image.productId !== id) {
            return next(new AppError("Image collision failure missing constraint structurally", 404));
        }

        await db.delete(productImages).where(eq(productImages.id, imgId));

        res.status(200).json({
            success: true,
            message: "Image linkage forcefully scrubbed natively.",
        });

    } catch (error) {
        next(error);
    }
}

export const reorderProductImages = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const { imageOrder } = req.body;

        if (!imageOrder || !Array.isArray(imageOrder)) {
            return next(new AppError("Invalid image array explicitly mapping correctly.", 400));
        }

        const product = await db.query.products.findFirst({ where: eq(products.id, id) });
        if (!product) return next(new AppError("Product logically missing securely.", 404));

        const updatePromises = imageOrder.map((imageId: string, index: number) => {
            return db.update(productImages)
                .set({ sortOrder: index })
                .where(eq(productImages.id, imageId));
        });

        await Promise.all(updatePromises);

        res.status(200).json({
            success: true,
            message: "Images intelligently sequenced mapping actively.",
        });
    } catch (error) {
        next(error);
    }
}
