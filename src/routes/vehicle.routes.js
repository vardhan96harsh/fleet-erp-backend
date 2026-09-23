import express from "express";

import {
  addVehicle,
  listVehicles,
  getVehicle,
  editVehicle,
  removeVehicle,
  listDeletedVehicles,
  restoreDeletedVehicle,
  addServiceEntry,
  deleteServiceEntry,
  addAccidentEntry,
  deleteAccidentEntry,
} from "../controllers/vehicle.controller.js";

import {
  authenticate,
} from "../middleware/auth.middleware.js";

import validate from "../middleware/validate.middleware.js";

import {
  createVehicleSchema,
  updateVehicleSchema,
  addServiceRecordSchema,
  addAccidentReportSchema,
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

/*
|--------------------------------------------------------------------------
| SERVICE RECORD SUB-ROUTES
|--------------------------------------------------------------------------
*/

router.post(
  "/:id/service",
  validate(addServiceRecordSchema),
  addServiceEntry
);

router.delete(
  "/:id/service/:sid",
  deleteServiceEntry
);

/*
|--------------------------------------------------------------------------
| ACCIDENT REPORT SUB-ROUTES
|--------------------------------------------------------------------------
*/

router.post(
  "/:id/accident",
  validate(addAccidentReportSchema),
  addAccidentEntry
);

router.delete(
  "/:id/accident/:aid",
  deleteAccidentEntry
);

/*
|--------------------------------------------------------------------------
| VEHICLE CRUD
|--------------------------------------------------------------------------
*/

router
  .route("/:id")
  .get(getVehicle)
  .patch(
    validate(updateVehicleSchema),
    editVehicle
  )
  .delete(removeVehicle);

export default router;