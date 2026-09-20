import express from "express";

import {
  addVehicle,
  listVehicles,
  getVehicle,
  editVehicle,
  removeVehicle,
  listDeletedVehicles,
  restoreDeletedVehicle,
} from "../controllers/vehicle.controller.js";

import {
  authenticate,
} from "../middleware/auth.middleware.js";

import validate from "../middleware/validate.middleware.js";

import {
  createVehicleSchema,
  updateVehicleSchema,
} from "../validators/vehicle.validator.js";

const router = express.Router();

router.use(authenticate);

router.get(
  "/deleted",
  listDeletedVehicles
);

router
  .route("/")
  .get(listVehicles)
  .post(
    validate(createVehicleSchema),
    addVehicle
  );

router.post(
  "/:id/restore",
  restoreDeletedVehicle
);

router
  .route("/:id")
  .get(getVehicle)
  .patch(
    validate(updateVehicleSchema),
    editVehicle
  )
  .delete(removeVehicle);

export default router;