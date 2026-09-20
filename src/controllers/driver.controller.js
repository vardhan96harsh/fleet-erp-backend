import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";

import {
  createDriver,
  getDrivers,
  getDriverById,
  updateDriver,
  deleteDriver,
  getDeletedDrivers,
  restoreDriver,
} from "../services/driver.service.js";

/*
|--------------------------------------------------------------------------
| CREATE DRIVER
|--------------------------------------------------------------------------
*/

export const addDriver = asyncHandler(
  async (req, res) => {
    const driver = await createDriver({
      data: req.validated.body,
      currentUser: req.user,
    });

    return res.status(201).json(
      new ApiResponse(
        201,
        driver,
        "Driver created successfully"
      )
    );
  }
);

/*
|--------------------------------------------------------------------------
| GET ALL DRIVERS
|--------------------------------------------------------------------------
*/

export const listDrivers = asyncHandler(
  async (req, res) => {
    const drivers = await getDrivers({
      currentUser: req.user,
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        drivers,
        "Drivers fetched successfully"
      )
    );
  }
);

/*
|--------------------------------------------------------------------------
| GET SINGLE DRIVER
|--------------------------------------------------------------------------
*/

export const getDriver = asyncHandler(
  async (req, res) => {
    const driver = await getDriverById({
      id: req.params.id,
      currentUser: req.user,
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        driver,
        "Driver fetched successfully"
      )
    );
  }
);

/*
|--------------------------------------------------------------------------
| UPDATE DRIVER
|--------------------------------------------------------------------------
*/

export const editDriver = asyncHandler(
  async (req, res) => {
    const driver = await updateDriver({
      id: req.params.id,
      data: req.validated.body,
      currentUser: req.user,
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        driver,
        "Driver updated successfully"
      )
    );
  }
);

/*
|--------------------------------------------------------------------------
| SOFT DELETE DRIVER
|--------------------------------------------------------------------------
*/

export const removeDriver = asyncHandler(
  async (req, res) => {
    await deleteDriver({
      id: req.params.id,
      currentUser: req.user,
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        null,
        "Driver moved to recycle bin"
      )
    );
  }
);

/*
|--------------------------------------------------------------------------
| GET DELETED DRIVERS
|--------------------------------------------------------------------------
*/

export const listDeletedDrivers =
  asyncHandler(async (req, res) => {
    const drivers =
      await getDeletedDrivers({
        currentUser: req.user,
      });

    return res.status(200).json(
      new ApiResponse(
        200,
        drivers,
        "Deleted drivers fetched successfully"
      )
    );
  });

/*
|--------------------------------------------------------------------------
| RESTORE DRIVER
|--------------------------------------------------------------------------
*/

export const restoreDeletedDriver =
  asyncHandler(async (req, res) => {
    const driver = await restoreDriver({
      id: req.params.id,
      currentUser: req.user,
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        driver,
        "Driver restored successfully"
      )
    );
  });