import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  getDailyAttendance,
  getMonthlyAttendance,
  recordAttendance,
  recordBulkAttendance,
} from "../controllers/attendance.controller.js";

const router = express.Router();

router.use(authenticate);

router.get("/daily", getDailyAttendance);
router.get("/monthly", getMonthlyAttendance);
router.post("/", recordAttendance);
router.post("/bulk", recordBulkAttendance);

export default router;
