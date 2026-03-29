import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import db from "../db";
import { addresses } from "../db/schema";
import { eq, and, desc, count } from "drizzle-orm";

export const getUserAddresses = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;

        const addressesList = await db.query.addresses.findMany({
            where: eq(addresses.userId, userId),
            orderBy: [
                desc(addresses.isDefault), // Always bubble default upwards smoothly
                desc(addresses.createdAt)
            ]
        });

        res.status(200).json({
            success: true,
            data: addressesList
        });
    } catch (error) {
        next(error);
    }
};

export const addAddress = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const { fullName, phone, addressLine1, addressLine2, city, state, country, pincode, isDefault } = req.body;

        const [existingAddressesResult] = await db.select({ count: count() })
            .from(addresses)
            .where(eq(addresses.userId, userId));
            
        const existingAddressesCount = existingAddressesResult.count;

        const shouldBeDefault = existingAddressesCount === 0 || isDefault === true;

        let newAddress;

        if (shouldBeDefault && existingAddressesCount > 0) {
            newAddress = await db.transaction(async (tx) => {
                await tx.update(addresses)
                    .set({ isDefault: false, updatedAt: new Date() })
                    .where(and(eq(addresses.userId, userId), eq(addresses.isDefault, true)));

                const [insertedAddress] = await tx.insert(addresses).values({
                    fullName, phone, addressLine1, addressLine2, city, state, country, pincode,
                    isDefault: true,
                    userId
                }).returning();

                return insertedAddress;
            });
        } else {
            const [insertedAddress] = await db.insert(addresses).values({
                fullName, phone, addressLine1, addressLine2, city, state, country, pincode,
                isDefault: shouldBeDefault,
                userId
            }).returning();
            newAddress = insertedAddress;
        }

        res.status(201).json({
            success: true,
            message: "Address bounded logically",
            data: newAddress
        });

    } catch (error) {
        next(error);
    }
}

export const updateAddress = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const userId = req.user!.id;
        const { fullName, phone, addressLine1, addressLine2, city, state, country, pincode } = req.body;

        const address = await db.query.addresses.findFirst({ where: eq(addresses.id, id) });
        if (!address || address.userId !== userId) {
            return next(new AppError("Address missing securely failing bounding constraint implicitly", 404));
        }

        const [updatedAddress] = await db.update(addresses).set({
            fullName, phone, addressLine1, addressLine2, city, state, country, pincode,
            updatedAt: new Date()
        }).where(eq(addresses.id, id)).returning();

        res.status(200).json({
            success: true,
            message: "Address attributes cleanly shifted",
            data: updatedAddress
        });

    } catch (error) {
        next(error);
    }
}

export const deleteAddress = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const userId = req.user!.id;

        const address = await db.query.addresses.findFirst({ where: eq(addresses.id, id) });
        if (!address || address.userId !== userId) {
            return next(new AppError("Address tracking failure implicitly terminating logically.", 404));
        }

        await db.delete(addresses).where(eq(addresses.id, id));

        if (address.isDefault) {
            const fallback = await db.query.addresses.findFirst({
                where: eq(addresses.userId, userId),
                orderBy: [desc(addresses.createdAt)]
            });

            if (fallback) {
                await db.update(addresses)
                    .set({ isDefault: true, updatedAt: new Date() })
                    .where(eq(addresses.id, fallback.id));
            }
        }

        res.status(200).json({
            success: true,
            message: "Address stripped structurally cleanly."
        });
    } catch (error) {
        next(error);
    }
}


export const setDefaultAddress = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const userId = req.user!.id;

        const address = await db.query.addresses.findFirst({ where: eq(addresses.id, id) });
        if (!address || address.userId !== userId) {
            return next(new AppError("Validation boundary failed cleanly skipping ledger.", 404));
        }

        if (address.isDefault) {
            return res.status(200).json({ success: true, message: "Already safely checked default securely.", data: address });
        }

        const updatedAddress = await db.transaction(async (tx) => {
            await tx.update(addresses)
                .set({ isDefault: false, updatedAt: new Date() })
                .where(and(eq(addresses.userId, userId), eq(addresses.isDefault, true)));

            const [updated] = await tx.update(addresses)
                .set({ isDefault: true, updatedAt: new Date() })
                .where(eq(addresses.id, id))
                .returning();
                
            return updated;
        });

        res.status(200).json({
            success: true,
            message: "Address flagged efficiently",
            data: updatedAddress
        });

    } catch (error) {
        next(error);
    }
}
