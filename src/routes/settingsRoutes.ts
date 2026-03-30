import { Router } from "express";
import { getHomePageLayout, getCheckoutSettings } from "../controllers/settingsController";

const router = Router();

router.get("/home-layout", getHomePageLayout);
router.get("/checkout", getCheckoutSettings);

export default router;
