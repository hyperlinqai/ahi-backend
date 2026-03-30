import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import { logAudit } from "../utils/auditLogger";
import db from "../db";
import { settings } from "../db/schema";
import { eq, asc, and } from "drizzle-orm";

/**
 * Parse a stored string value back to its original type.
 * Handles JSON objects/arrays, booleans, and numbers.
 */
function parseValue(value: string): any {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/**
 * Serialize a value for storage as text.
 */
function serializeValue(value: any): string {
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

export const getAllSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settingsList = await db.query.settings.findMany({
      orderBy: [asc(settings.group), asc(settings.key)]
    });

    const grouped: Record<string, Record<string, any>> = {};

    for (const setting of settingsList) {
      if (!grouped[setting.group]) {
        grouped[setting.group] = {};
      }
      grouped[setting.group][setting.key] = parseValue(setting.value);
    }

    res.status(200).json({
      success: true,
      data: grouped
    });
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { body } = req;

    if (!body || typeof body !== 'object' || Object.keys(body).length === 0) {
      return next(new AppError("Please provide settings to update", 400));
    }

    const auditLogs: any[] = [];

    // Body is expected as: { group: { key: value, ... }, ... }
    for (const [group, fields] of Object.entries(body)) {
      if (!fields || typeof fields !== 'object') continue;

      for (const [key, value] of Object.entries(fields as Record<string, any>)) {
        const serialized = serializeValue(value);

        const existing = await db.query.settings.findFirst({ where: eq(settings.key, key) });
        const oldValue = existing?.value;

        await db.insert(settings)
          .values({ key, value: serialized, group })
          .onConflictDoUpdate({
            target: settings.key,
            set: { value: serialized, group, updatedAt: new Date() }
          });

        auditLogs.push({
          action: existing ? "UPDATE" : "CREATE",
          entity: "Setting",
          entityId: key,
          oldValue: oldValue || null,
          newValue: serialized
        });
      }
    }

    // Log audit trail
    for (const logData of auditLogs) {
      await logAudit(
        req,
        logData.action,
        logData.entity,
        logData.entityId || undefined,
        logData.oldValue || undefined,
        logData.newValue
      );
    }

    const allSettings = await db.query.settings.findMany({
      orderBy: [asc(settings.group), asc(settings.key)]
    });

    const grouped: Record<string, Record<string, any>> = {};
    for (const setting of allSettings) {
      if (!grouped[setting.group]) {
        grouped[setting.group] = {};
      }
      grouped[setting.group][setting.key] = parseValue(setting.value);
    }

    res.status(200).json({
      success: true,
      message: "Settings updated successfully",
      data: grouped
    });
  } catch (error) {
    next(error);
  }
};

export const resetOrderCounter = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderSettings = await db.query.settings.findMany({
      where: eq(settings.group, "defaults")
    });
    
    const settingsMap: Record<string, string> = {};
    for (const s of orderSettings) settingsMap[s.key] = s.value;
    
    const digits = parseInt(settingsMap.orderDigits || "5", 10);
    // Offset by -1 so the next order starts precisely at the clean padding baseline (e.g. 10000)
    const startNum = Math.pow(10, digits - 1) - 1;
    
    const existing = await db.query.settings.findFirst({
        where: eq(settings.key, "orderCounter")
    });

    const serialized = String(startNum);
    const oldValue = existing?.value;

    await db.insert(settings)
      .values({ key: "orderCounter", value: serialized, group: "defaults" })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: serialized, group: "defaults", updatedAt: new Date() }
      });

    await logAudit(
      req,
      existing ? "UPDATE" : "CREATE",
      "Setting",
      "orderCounter",
      oldValue || undefined,
      serialized
    );

    res.status(200).json({
      success: true,
      message: `Sequence explicitly reset mapping baseline. Next bound triggers at ${startNum + 1}`
    });

  } catch (error) {
    next(error);
  }
};
