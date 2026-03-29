import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { authorizeAdmin } from "../middleware/authorizeAdmin";
import {
    getReturns,
    getReturnById,
    approveReturn,
    rejectReturn,
} from "../controllers/returnController";

const router = Router();

router.use(authenticate);
router.use(authorizeAdmin(["ADMIN", "MANAGER"]));

router.get("/", getReturns);
router.get("/:id", getReturnById);
router.patch("/:id/approve", approveReturn);
router.patch("/:id/reject", rejectReturn);

export default router;
