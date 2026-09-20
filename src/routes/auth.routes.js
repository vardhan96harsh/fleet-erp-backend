import express from "express";

import {
  login,
  logout,
  refresh,
  getMe,
} from "../controllers/auth.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import validate from "../middleware/validate.middleware.js";

import {
  loginSchema,
} from "../validators/auth.validator.js";

const router = express.Router();

router.post(
  "/login",
  validate(loginSchema),
  login
);

router.post(
  "/refresh",
  refresh
);

router.post(
  "/logout",
  logout
);

router.get(
  "/me",
  authenticate,
  getMe
);

export default router;