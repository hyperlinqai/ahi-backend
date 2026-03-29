import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { authorizeAdmin } from "../middleware/authorizeAdmin";
import { getAllReviewsAdmin } from "../controllers/reviewController";

const router = Router();

router.use(authenticate);
router.use(authorizeAdmin(["ADMIN", "MANAGER", "CATALOG_MANAGER"]));

router.get("/", getAllReviewsAdmin);

export default router;
