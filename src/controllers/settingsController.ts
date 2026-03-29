import { Request, Response, NextFunction } from "express";
import db from "../db";
import { settings } from "../db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Public endpoint to fetch the Home Page Layout setting.
 */
export const getHomePageLayout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const layoutSetting = await db.query.settings.findFirst({
      where: and(
        eq(settings.group, "storefront"),
        eq(settings.key, "home_page_layout")
      )
    });

    let layout: any[] = [];
    if (layoutSetting && layoutSetting.value) {
      try {
        layout = JSON.parse(layoutSetting.value);
      } catch (e) {
         console.error("Failed to parse home page layout setting", e);
      }
    } else {
        // Fallback default layout
        layout = [
            { id: "default-1", type: "HERO_BANNER" },
            { id: "default-2", type: "FEATURED_CATEGORIES", title: "Shop by Category" },
            { id: "default-3", type: "FEATURED_PRODUCTS", title: "Featured Products" },
            { id: "default-4", type: "PROMO_BANNER", position: "PROMO" },
            { id: "default-5", type: "NEW_ARRIVALS", title: "New Arrivals" }
        ];
    }

    res.status(200).json({
      success: true,
      data: layout
    });
  } catch (error) {
    next(error);
  }
};
