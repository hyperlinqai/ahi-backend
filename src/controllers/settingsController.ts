import { Request, Response, NextFunction } from "express";
import db from "../db";
import { settings } from "../db/schema";
import { eq, and, inArray } from "drizzle-orm";

function parseSettingValue(value: string): any {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

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

export const getStorePolicies = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const policySettings = await db.query.settings.findMany({
      where: eq(settings.group, "policies"),
    });

    const policiesMap: Record<string, string> = {};
    for (const setting of policySettings) {
      policiesMap[setting.key] = setting.value;
    }

    res.status(200).json({
      success: true,
      data: {
        jewelleryCare: policiesMap.jewelleryCare || "",
        shippingInfo: policiesMap.shippingInfo || "",
        returnExchange: policiesMap.returnExchange || "",
        disclaimer: policiesMap.disclaimer || "",
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getCheckoutSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const checkoutSettings = await db.query.settings.findMany({
      where: inArray(settings.group, ["payment", "shipping"]),
    });

    const settingsMap = checkoutSettings.reduce<Record<string, Record<string, any>>>((acc, setting) => {
      if (!acc[setting.group]) {
        acc[setting.group] = {};
      }

      acc[setting.group][setting.key] = parseSettingValue(setting.value);
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        payment: {
          codEnabled: settingsMap.payment?.codEnabled ?? true,
          walletEnabled: settingsMap.payment?.walletEnabled ?? true,
        },
        shipping: {
          defaultCharge: settingsMap.shipping?.defaultCharge ?? 0,
          freeThreshold: settingsMap.shipping?.freeThreshold ?? 0,
          codExtraCharge: settingsMap.shipping?.codExtraCharge ?? 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
