import express from "express";

import {
  dashboardSummary,
} from "../controllers/dashboard.controller.js";

import {
  authenticate,
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authenticate);

router.get(
  "/summary",
  dashboardSummary
);

export default router;