import express from "express";
import {
    getProfile,
    updateProfile,
    changePassword,
    createUser,
    getAllUsers,
    getUserById,
    blockUser,
    unblockUser,
    deleteUser
} from "../controllers/userController";
import { authenticate } from "../middleware/authenticate";
import { authorizeAdmin } from "../middleware/authorizeAdmin";
import { validate } from "../middleware/validateRequest";
import {
    updateUserSchema,
    changePasswordSchema,
    createUserSchema,
    getAllUsersSchema,
    getUserByIdSchema,
    blockUserSchema,
    unblockUserSchema,
    deleteUserSchema
} from "../schemas/user.schema";

const router = express.Router();

// Enable authentication for all user routes
router.use(authenticate);

// User Profile Routes (Any authenticated user)
router.get("/me", getProfile);
router.patch("/me", validate(updateUserSchema), updateProfile);
router.patch("/change-password", validate(changePasswordSchema), changePassword);

// --- ADMIN ROUTES ---
router.use(authorizeAdmin());

// User Management Routes
router.route("/")
    .get(validate(getAllUsersSchema), getAllUsers)
    .post(validate(createUserSchema), createUser);

router.route("/:id")
    .get(validate(getUserByIdSchema), getUserById)
    .delete(validate(deleteUserSchema), deleteUser);

router.patch("/:id/block", validate(blockUserSchema), blockUser);
router.patch("/:id/unblock", validate(unblockUserSchema), unblockUser);

export default router;
