import { Router } from "express";
import { getHomePageLayout } from "../controllers/settingsController";

const router = Router();

router.get("/home-layout", getHomePageLayout);

export default router;
