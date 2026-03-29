import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validateRequest";
import { addressSchema, updateAddressSchema } from "../schemas/address.schema";

import {
    getUserAddresses,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress
} from "../controllers/addressController";

const router = Router();

// ==========================================
// USER ADDRESS MANAGEMENT ROUTES
// ==========================================
// Restrict endpoint visibility natively guaranteeing bounds 
router.use(authenticate);

router.get("/", getUserAddresses);
router.post("/", validate(addressSchema), addAddress);
router.put("/:id", validate(updateAddressSchema), updateAddress);
router.delete("/:id", deleteAddress);
router.patch("/:id/default", setDefaultAddress);

export default router;
