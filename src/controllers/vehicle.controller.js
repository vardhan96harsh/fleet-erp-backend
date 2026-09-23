import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";

import {
  createVehicle,
  getVehicles,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
  getDeletedVehicles,
  restoreVehicle,
  addServiceRecord,
  removeServiceRecord,
  addAccidentReport,
  removeAccidentReport,
} from "../services/vehicle.service.js";

/*
|--------------------------------------------------------------------------
| CREATE VEHICLE
|--------------------------------------------------------------------------
*/

export const addVehicle = asyncHandler(
  async (req, res) => {
    const vehicle = await createVehicle({
      data: req.validated.body,
      currentUser: req.user,
    });

    return res.status(201).json(
      new ApiResponse(
        201,
        vehicle,
        "Vehicle created successfully"
      )
    );
  }
);

/*
|--------------------------------------------------------------------------
| GET ALL VEHICLES
|--------------------------------------------------------------------------
*/

export const listVehicles = asyncHandler(
  async (req, res) => {
    const vehicles = await getVehicles({
      currentUser: req.user,
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        vehicles,
        "Vehicles fetched successfully"
      )
    );
  }
);

/*
|--------------------------------------------------------------------------
| GET SINGLE VEHICLE
|--------------------------------------------------------------------------
*/

export const getVehicle = asyncHandler(
  async (req, res) => {
    const vehicle = await getVehicleById({
      id: req.params.id,
      currentUser: req.user,
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        vehicle,
        "Vehicle fetched successfully"
      )
    );
  }
);

/*
|--------------------------------------------------------------------------
| UPDATE VEHICLE
|--------------------------------------------------------------------------
*/

export const editVehicle = asyncHandler(
  async (req, res) => {
    const vehicle = await updateVehicle({
      id: req.params.id,
      data: req.validated.body,
      currentUser: req.user,
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        vehicle,
        "Vehicle updated successfully"
      )
    );
  }
);

/*
|--------------------------------------------------------------------------
| SOFT DELETE VEHICLE
|--------------------------------------------------------------------------
*/

export const removeVehicle = asyncHandler(
  async (req, res) => {
    await deleteVehicle({
      id: req.params.id,
      currentUser: req.user,
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        null,
        "Vehicle moved to recycle bin"
      )
    );
  }
);

/*
|--------------------------------------------------------------------------
| GET DELETED VEHICLES
|--------------------------------------------------------------------------
*/

export const listDeletedVehicles =
  asyncHandler(async (req, res) => {
    const vehicles =
      await getDeletedVehicles({
        currentUser: req.user,
      });

    return res.status(200).json(
      new ApiResponse(
        200,
        vehicles,
        "Deleted vehicles fetched successfully"
      )
    );
  });

/*
|--------------------------------------------------------------------------
| RESTORE VEHICLE
|--------------------------------------------------------------------------
*/

export const restoreDeletedVehicle =
  asyncHandler(async (req, res) => {
    const vehicle = await restoreVehicle({
      id: req.params.id,
      currentUser: req.user,
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        vehicle,
        "Vehicle restored successfully"
      )
    );
  });

/*
|--------------------------------------------------------------------------
| ADD SERVICE RECORD
|--------------------------------------------------------------------------
*/

export const addServiceEntry = asyncHandler(
  async (req, res) => {
    const vehicle = await addServiceRecord({
      vehicleId: req.params.id,
      data: req.validated.body,
      currentUser: req.user,
    });

    return res.status(201).json(
      new ApiResponse(201, vehicle, "Service record added")
    );
  }
);

/*
|--------------------------------------------------------------------------
| REMOVE SERVICE RECORD
|--------------------------------------------------------------------------
*/

export const deleteServiceEntry = asyncHandler(
  async (req, res) => {
    const vehicle = await removeServiceRecord({
      vehicleId: req.params.id,
      recordId: req.params.sid,
      currentUser: req.user,
    });

    return res.status(200).json(
      new ApiResponse(200, vehicle, "Service record removed")
    );
  }
);

/*
|--------------------------------------------------------------------------
| ADD ACCIDENT REPORT
|--------------------------------------------------------------------------
*/

export const addAccidentEntry = asyncHandler(
  async (req, res) => {
    const vehicle = await addAccidentReport({
      vehicleId: req.params.id,
      data: req.validated.body,
      currentUser: req.user,
    });

    return res.status(201).json(
      new ApiResponse(201, vehicle, "Accident report added")
    );
  }
);

/*
|--------------------------------------------------------------------------
| REMOVE ACCIDENT REPORT
|--------------------------------------------------------------------------
*/

export const deleteAccidentEntry = asyncHandler(
  async (req, res) => {
    const vehicle = await removeAccidentReport({
      vehicleId: req.params.id,
      reportId: req.params.aid,
      currentUser: req.user,
    });

    return res.status(200).json(
      new ApiResponse(200, vehicle, "Accident report removed")
    );
  }
);