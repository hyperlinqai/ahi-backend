import { Request } from "express";
import db from "../db";
import { auditLogs } from "../db/schema";

interface AuditLogData {
  action: string;
  entity: string;
  entityId?: string;
  oldValue?: string;
  newValue?: string;
}

export const logAudit = async (
  req: Request,
  action: string,
  entity: string,
  entityId?: string,
  oldValue?: string,
  newValue?: string
) => {
  try {
    const userId = req.user?.id;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';

    await db.insert(auditLogs).values({
      userId: userId || null,
      action,
      entity,
      entityId: entityId || null,
      oldValue: oldValue || null,
      newValue: newValue || null,
      ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
      userAgent
    });
  } catch (error) {
    // Log audit errors to console but don't throw to avoid breaking main functionality
    console.error('Failed to create audit log:', error);
  }
};
