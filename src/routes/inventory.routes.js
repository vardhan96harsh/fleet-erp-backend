import express from "express";

import {
  addInventoryItem,
  listInventory,
  getInventoryItem,
  editInventoryItem,
  removeInventoryItem,
  listDeletedInventory,
  restoreDeletedInventoryItem,
} from "../controllers/inventory.controller.js";

import {
  authenticate,
} from "../middleware/auth.middleware.js";

import validate from "../middleware/validate.middleware.js";

import {
  createInventorySchema,
  updateInventorySchema,
} from "../validators/inventory.validator.js";

const router = express.Router();

router.use(authenticate);

/*
|--------------------------------------------------------------------------
| DELETED
|--------------------------------------------------------------------------
*/

router.get(
  "/deleted",
  listDeletedInventory
);

/*
|--------------------------------------------------------------------------
| ROOT
|--------------------------------------------------------------------------
*/

router
  .route("/")
  .get(listInventory)
  .post(
    validate(createInventorySchema),
    addInventoryItem
  );

/*
|--------------------------------------------------------------------------
| RESTORE
|--------------------------------------------------------------------------
*/

router.post(
  "/:id/restore",
  restoreDeletedInventoryItem
);

/*
|--------------------------------------------------------------------------
| SINGLE ITEM
|--------------------------------------------------------------------------
*/

router
  .route("/:id")
  .get(getInventoryItem)
  .patch(
    validate(updateInventorySchema),
    editInventoryItem
  )
  .delete(removeInventoryItem);

export default router;