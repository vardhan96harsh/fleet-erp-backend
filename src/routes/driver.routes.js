import express from "express";

import {
  addDriver,
  listDrivers,
  getDriver,
  editDriver,
  removeDriver,
  listDeletedDrivers,
  restoreDeletedDriver,
} from "../controllers/driver.controller.js";

import {
  authenticate,
} from "../middleware/auth.middleware.js";

import validate from "../middleware/validate.middleware.js";

import {
  createDriverSchema,
  updateDriverSchema,
} from "../validators/driver.validator.js";

const router = express.Router();

router.use(authenticate);

router.get(
  "/deleted",
  listDeletedDrivers
);

router
  .route("/")
  .get(listDrivers)
  .post(
    validate(createDriverSchema),
    addDriver
  );

router.post(
  "/:id/restore",
  restoreDeletedDriver
);

router
  .route("/:id")
  .get(getDriver)
  .patch(
    validate(updateDriverSchema),
    editDriver
  )
  .delete(removeDriver);

export default router;