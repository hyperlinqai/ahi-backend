import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import db from "../db";
import { products, productVariants, inventoryLogs } from "../db/schema";
import { desc, asc, lte, count, eq } from "drizzle-orm";

export const getAllInventory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        const [productsList, totalCountResult] = await Promise.all([
            db.query.products.findMany({
                offset: skip,
                limit: limit,
                orderBy: [desc(products.createdAt)],
                with: {
                    category: { columns: { name: true } },
                    variants: {
                        columns: {
                            id: true,
                            name: true,
                            value: true,
                            sku: true,
                            stock: true,
                            lowStockAlert: true,
                        }
                    }
                }
            }),
            db.select({ count: count() }).from(products),
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

export const getLowStockInventory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        const whereClause = lte(productVariants.stock, productVariants.lowStockAlert);

        // Drizzle natively supports comparing two columns without needing raw SQL!
        const [lowStockVariants, rawCount] = await Promise.all([
            db.query.productVariants.findMany({
                where: whereClause,
                with: {
                    product: {
                        columns: { title: true },
                        with: {
                            images: { limit: 1 }
                        }
                    }
                },
                orderBy: [asc(productVariants.stock)],
                offset: skip,
                limit: limit
            }),
            db.select({ count: count() }).from(productVariants).where(whereClause)
        ]);

        const formattedVariants = lowStockVariants.map(v => ({
            id: v.id,
            sku: v.sku,
            stock: v.stock,
            lowStockAlert: v.lowStockAlert,
            title: v.product?.title || ""
        }));

        res.status(200).json({
            success: true,
            data: formattedVariants,
            meta: {
                totalCount: Number(rawCount[0].count),
                page,
                limit,
                totalPages: Math.ceil(Number(rawCount[0].count) / limit)
            }
        });

    } catch (error) {
        next(error);
    }
}


export const adjustInventory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string; // Maps to Variant ID
        const { stock, adjustment } = req.body;
        const adminId = req.user!.id;

        const variant = await db.query.productVariants.findFirst({ where: eq(productVariants.id, id) });
        if (!variant) return next(new AppError("Variant not explicitly mapped.", 404));

        const prevStock = variant.stock;
        let newStock = prevStock;

        if (stock !== undefined) {
            newStock = stock;
        } else if (adjustment !== undefined) {
            newStock = prevStock + adjustment;
            if (newStock < 0) newStock = 0; // Prevent native negative offsets algorithmically 
        }

        if (prevStock === newStock) {
            return next(new AppError("Adjustment delta is 0; skipping log creation natively.", 400));
        }

        // Execute structural transaction explicitly grouping the variant override and the ledger insertion securely
        const [updatedVariant, log] = await db.transaction(async (tx) => {
            const [uv] = await tx.update(productVariants)
                .set({ stock: newStock, updatedAt: new Date() })
                .where(eq(productVariants.id, id))
                .returning();

            const [l] = await tx.insert(inventoryLogs).values({
                variantId: id,
                changeType: "MANUAL_ADJUST",
                prevStock,
                newStock,
                changedById: adminId,
            }).returning();

            return [uv, l];
        });

        res.status(200).json({
            success: true,
            message: "Inventory synced cleanly onto historical ledger",
            data: {
                variant: updatedVariant,
                adjustment: {
                    prevStock,
                    newStock,
                    delta: newStock - prevStock
                }
            }
        });

    } catch (error) {
        next(error);
    }
}
