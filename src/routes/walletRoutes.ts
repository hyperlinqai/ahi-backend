import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validateRequest";
import { useWalletBalanceSchema } from "../schemas/wallet.schema";

import {
    getWallet,
    useWalletBalance
} from "../controllers/walletController";

const router = Router();

// ==========================================
// USER ROUTES (Ledger access inherent to absolute sessions mapping naturally)
// ==========================================
router.use(authenticate);

router.get("/", getWallet);
router.post("/use", validate(useWalletBalanceSchema), useWalletBalance);

export default router;
