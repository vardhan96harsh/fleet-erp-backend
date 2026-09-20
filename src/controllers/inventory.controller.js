import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";

import {
  createInventory,
  getInventory,
  getInventoryById,
  updateInventory,
  deleteInventory,
  getDeletedInventory,
  restoreInventory,
} from "../services/inventory.service.js";

/*
|--------------------------------------------------------------------------
| CREATE
|--------------------------------------------------------------------------
*/

export const addInventoryItem = asyncHandler(
  async (req, res) => {
    const inventory =
      await createInventory({
        data: req.validated.body,
        currentUser: req.user,
      });

    return res.status(201).json(
      new ApiResponse(
        201,
        inventory,
        "Inventory item created successfully"
      )
    );
  }
);

/*
|--------------------------------------------------------------------------
| LIST
|--------------------------------------------------------------------------
|
| Optional filters:
| ?location=LOCATION_A
| ?location=LOCATION_B
|
*/

export const listInventory = asyncHandler(
  async (req, res) => {
    const inventory =
      await getInventory({
        currentUser: req.user,

        location:
          req.query.location || null,
      });

    return res.status(200).json(
      new ApiResponse(
        200,
        inventory,
        "Inventory fetched successfully"
      )
    );
  }
);

/*
|--------------------------------------------------------------------------
| SINGLE ITEM
|--------------------------------------------------------------------------
*/

export const getInventoryItem =
  asyncHandler(async (req, res) => {
    const inventory =
      await getInventoryById({
        id: req.params.id,
        currentUser: req.user,
      });

    return res.status(200).json(
      new ApiResponse(
        200,
        inventory,
        "Inventory item fetched successfully"
      )
    );
  });

/*
|--------------------------------------------------------------------------
| UPDATE
|--------------------------------------------------------------------------
*/

export const editInventoryItem =
  asyncHandler(async (req, res) => {
    const inventory =
      await updateInventory({
        id: req.params.id,
        data: req.validated.body,
        currentUser: req.user,
      });

    return res.status(200).json(
      new ApiResponse(
        200,
        inventory,
        "Inventory item updated successfully"
      )
    );
  });

/*
|--------------------------------------------------------------------------
| DELETE
|--------------------------------------------------------------------------
*/

export const removeInventoryItem =
  asyncHandler(async (req, res) => {
    await deleteInventory({
      id: req.params.id,
      currentUser: req.user,
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        null,
        "Inventory item moved to recycle bin"
      )
    );
  });

/*
|--------------------------------------------------------------------------
| DELETED LIST
|--------------------------------------------------------------------------
|
| Optional filters:
| ?location=LOCATION_A
| ?location=LOCATION_B
|
*/

export const listDeletedInventory =
  asyncHandler(async (req, res) => {
    const inventory =
      await getDeletedInventory({
        currentUser: req.user,

        location:
          req.query.location || null,
      });

    return res.status(200).json(
      new ApiResponse(
        200,
        inventory,
        "Deleted inventory fetched successfully"
      )
    );
  });

/*
|--------------------------------------------------------------------------
| RESTORE
|--------------------------------------------------------------------------
*/

export const restoreDeletedInventoryItem =
  asyncHandler(async (req, res) => {
    const inventory =
      await restoreInventory({
        id: req.params.id,
        currentUser: req.user,
      });

    return res.status(200).json(
      new ApiResponse(
        200,
        inventory,
        "Inventory item restored successfully"
      )
    );
  });