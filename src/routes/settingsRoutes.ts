import { Router } from "express";
import { getHomePageLayout, getCheckoutSettings, getStorePolicies } from "../controllers/settingsController";

const router = Router();

router.get("/home-layout", getHomePageLayout);
router.get("/checkout", getCheckoutSettings);
router.get("/policies", getStorePolicies);

export default router;
