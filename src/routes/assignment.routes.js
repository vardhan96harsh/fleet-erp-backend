import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import validate from "../middleware/validate.middleware.js";
import {
  createAssignmentSchema,
  updateAssignmentSchema,
  returnAssignmentSchema,
} from "../validators/assignment.validator.js";
import {
  handleCreateAssignment,
  handleGetAssignments,
  handleGetAssignmentsByVehicle,
  handleGetAssignmentById,
  handleUpdateAssignment,
  handleReturnAssignment,
  handleDeleteAssignment,
} from "../controllers/assignment.controller.js";

const router = express.Router();

router.use(authenticate);

router.post("/", validate(createAssignmentSchema), handleCreateAssignment);
router.get("/", handleGetAssignments);
router.get("/by-vehicle", handleGetAssignmentsByVehicle);
router.get("/:id", handleGetAssignmentById);
router.patch("/:id", validate(updateAssignmentSchema), handleUpdateAssignment);
router.post("/:id/return", validate(returnAssignmentSchema), handleReturnAssignment);
router.delete("/:id", handleDeleteAssignment);

export default router;
