import express from "express";

import {
  createUser,
  listUsers,
  getUser,
  updateUser,
  updateUserStatus,
  resetUserPassword,
} from "../controllers/user.controller.js";

import {
  authenticate,
} from "../middleware/auth.middleware.js";

import {
  authorizeRoles,
} from "../middleware/role.middleware.js";

import validate from "../middleware/validate.middleware.js";

import { ROLES } from "../constants/roles.js";

import {
  createUserSchema,
  updateUserSchema,
  updateStatusSchema,
  resetPasswordSchema,
} from "../validators/user.validator.js";

const router = express.Router();

router.use(authenticate);
router.use(
  authorizeRoles(ROLES.SUPER_ADMIN)
);

router
  .route("/")
  .get(listUsers)
  .post(
    validate(createUserSchema),
    createUser
  );

router
  .route("/:id")
  .get(getUser)
  .patch(
    validate(updateUserSchema),
    updateUser
  );

router.patch(
  "/:id/status",
  validate(updateStatusSchema),
  updateUserStatus
);

router.patch(
  "/:id/reset-password",
  validate(resetPasswordSchema),
  resetUserPassword
);

export default router;