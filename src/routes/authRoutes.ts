import { Router } from "express";
import { validate } from "../middleware/validateRequest";
import {
    registerSchema,
    loginSchema,
    refreshTokenSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    verifyEmailSchema
} from "../schemas/auth.schema";
import {
    register,
    login,
    refresh,
    logout,
    forgotPassword,
    resetPassword,
    verifyEmail
} from "../controllers/authController";

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/verify-email", validate(verifyEmailSchema), verifyEmail);
router.post("/login", validate(loginSchema), login);
router.post("/logout", logout); // No deep validation required for removal
router.post("/refresh", validate(refreshTokenSchema), refresh);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);

export default router;
