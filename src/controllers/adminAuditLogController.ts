import { Request, Response, NextFunction } from "express";
import db from "../db";
import { auditLogs } from "../db/schema";
import { eq, and, gte, lte, desc, asc, count, SQL } from "drizzle-orm";

export const getAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      page = 1,
      limit = 20,
      userId,
      entity,
      dateFrom,
      dateTo,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const conditions: SQL<unknown>[] = [];

    if (userId) {
      conditions.push(eq(auditLogs.userId, userId as string));
    }

    if (entity) {
      conditions.push(eq(auditLogs.entity, entity as string));
    }

    if (dateFrom) {
      conditions.push(gte(auditLogs.createdAt, new Date(dateFrom as string)));
    }
    
    if (dateTo) {
      conditions.push(lte(auditLogs.createdAt, new Date(dateTo as string)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Safety fallback for dynamic ordering strings
    const validSortCols: Record<string, any> = {
      createdAt: auditLogs.createdAt,
      action: auditLogs.action,
      entity: auditLogs.entity,
      id: auditLogs.id
    };
    
    const sortField = validSortCols[sortBy as string] || auditLogs.createdAt;
    const orderDirection = sortOrder === "desc" ? desc(sortField) : asc(sortField);

    const [logsList, totalCountResult] = await Promise.all([
      db.query.auditLogs.findMany({
        where: whereClause,
        with: {
          user: {
            columns: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: [orderDirection],
        offset: skip,
        limit: limitNum
      }),
      db.select({ count: count() }).from(auditLogs).where(whereClause)
    ]);

    const totalCount = totalCountResult[0].count;
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    res.status(200).json({
      success: true,
      data: logsList,
      meta: {
        totalCount,
        currentPage: pageNum,
        totalPages,
        limit: limitNum,
        hasNextPage,
        hasPrevPage
      }
    });
  } catch (error) {
    next(error);
  }
};
