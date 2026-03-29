import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { authorizeAdmin } from "../middleware/authorizeAdmin";
import { validate } from "../middleware/validateRequest";
import { adjustInventorySchema } from "../schemas/inventory.schema";

import {
    getAllInventory,
    getLowStockInventory,
    adjustInventory,
} from "../controllers/inventoryController";

const router = Router();

// ==========================================
// SECURE INVENTORY MANAGEMENT ROUTES
// ==========================================
// Absolutely restrict all stock ledger modifications and views
// strictly to active Administrative staff and managers safely 
router.use(authenticate);
router.use(authorizeAdmin(["ADMIN", "MANAGER", "CATALOG_MANAGER"]));

router.get("/", getAllInventory);
router.get("/low-stock", getLowStockInventory);
router.patch("/:id", validate(adjustInventorySchema), adjustInventory);

export default router;
