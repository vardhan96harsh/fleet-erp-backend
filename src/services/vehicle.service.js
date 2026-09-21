import Vehicle from "../models/Vehicle.js";

import ApiError from "../utils/ApiError.js";
import { ROLES } from "../constants/roles.js";

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const ensureVehiclePermission = (currentUser) => {
  const allowedRoles = [
    ROLES.SUPER_ADMIN,
    ROLES.SUB_ADMIN,
  ];

  if (!allowedRoles.includes(currentUser.role)) {
    throw new ApiError(
      403,
      "You do not have permission to manage vehicle data"
    );
  }
};

const normalizeNullableDate = (value) => {
  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return null;
  }

  return value;
};

const populateVehicle = (query) =>
  query
    .populate(
      "createdBy",
      "name username email role"
    )
    .populate(
      "updatedBy",
      "name username email role"
    )
    .populate(
      "deletedBy",
      "name username email role"
    )
    .lean();

/*
|--------------------------------------------------------------------------
| CREATE VEHICLE
|--------------------------------------------------------------------------
*/

export const createVehicle = async ({
  data,
  currentUser,
}) => {
  ensureVehiclePermission(currentUser);

  const normalizedVehicleNo =
    data.vehicleNo.trim().toUpperCase();

  const existingVehicle =
    await Vehicle.findOne({
      vehicleNo: normalizedVehicleNo,
      isDeleted: false,
    });

  if (existingVehicle) {
    throw new ApiError(
      409,
      "Vehicle number already exists"
    );
  }

  const vehicle = await Vehicle.create({
    vehicleNo: normalizedVehicleNo,

    type: data.type || "",

    capacity: data.capacity || "",

    ownership: data.ownership || "",

    ownerName: data.ownerName || "",

    ownerMobile: data.ownerMobile || "",

    pucExpiry: normalizeNullableDate(
      data.pucExpiry
    ),

    fitnessExpiry: normalizeNullableDate(
      data.fitnessExpiry
    ),

    insuranceExpiry: normalizeNullableDate(
      data.insuranceExpiry
    ),

    permitExpiry: normalizeNullableDate(
      data.permitExpiry
    ),

    permitType: data.permitType || "NATIONAL",

    rcNumber: data.rcNumber || "",

    rcExpiry: normalizeNullableDate(
      data.rcExpiry
    ),

    serviceHistory:
      data.serviceHistory || [],

    accidentReports:
      data.accidentReports || [],

    status: data.status || "ACTIVE",

    createdBy: currentUser._id,

    updatedBy: currentUser._id,
  });

  return populateVehicle(
    Vehicle.findById(vehicle._id)
  );
};

/*
|--------------------------------------------------------------------------
| GET ALL VEHICLES
|--------------------------------------------------------------------------
|
| Vehicle data is common.
| Super Admin and every Sub Admin receive the same data.
|
*/

import Driver from "../models/Driver.js";

export const getVehicles = async ({
  currentUser,
}) => {
  ensureVehiclePermission(currentUser);

  const vehicles = await populateVehicle(
    Vehicle.find({
      isDeleted: false,
    })
  ).sort({
    createdAt: -1,
  });

  // Map currently assigned active drivers to vehicles
  const drivers = await Driver.find({
    assignedVehicle: { $ne: null },
    isDeleted: false,
  }).select("_id name driverId mobile assignedVehicle").lean();

  const driverByVehicleId = new Map();
  for (const d of drivers) {
    if (d.assignedVehicle) {
      driverByVehicleId.set(d.assignedVehicle.toString(), {
        _id: d._id,
        name: d.name,
        driverId: d.driverId,
        mobile: d.mobile,
      });
    }
  }

  return vehicles.map((v) => ({
    ...v,
    assignedDriver: driverByVehicleId.get(v._id.toString()) || null,
  }));
};

/*
|--------------------------------------------------------------------------
| GET SINGLE VEHICLE
|--------------------------------------------------------------------------
*/

export const getVehicleById = async ({
  id,
  currentUser,
}) => {
  ensureVehiclePermission(currentUser);

  const vehicle = await populateVehicle(
    Vehicle.findOne({
      _id: id,
      isDeleted: false,
    })
  );

  if (!vehicle) {
    throw new ApiError(
      404,
      "Vehicle not found"
    );
  }

  const driver = await Driver.findOne({
    assignedVehicle: vehicle._id,
    isDeleted: false,
  }).select("_id name driverId mobile").lean();

  return {
    ...vehicle,
    assignedDriver: driver || null,
  };
};

/*
|--------------------------------------------------------------------------
| UPDATE VEHICLE
|--------------------------------------------------------------------------
*/

export const updateVehicle = async ({
  id,
  data,
  currentUser,
}) => {
  ensureVehiclePermission(currentUser);

  const vehicle = await Vehicle.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!vehicle) {
    throw new ApiError(
      404,
      "Vehicle not found"
    );
  }

  /*
  |--------------------------------------------------------------------------
  | VEHICLE NUMBER
  |--------------------------------------------------------------------------
  */

  if (data.vehicleNo !== undefined) {
    const normalizedVehicleNo =
      data.vehicleNo.trim().toUpperCase();

    const duplicateVehicle =
      await Vehicle.findOne({
        _id: {
          $ne: vehicle._id,
        },

        vehicleNo: normalizedVehicleNo,

        isDeleted: false,
      });

    if (duplicateVehicle) {
      throw new ApiError(
        409,
        "Vehicle number already exists"
      );
    }

    vehicle.vehicleNo =
      normalizedVehicleNo;
  }

  /*
  |--------------------------------------------------------------------------
  | TEXT AND STATUS FIELDS
  |--------------------------------------------------------------------------
  */

  const allowedFields = [
    "type",
    "capacity",
    "ownership",
    "ownerName",
    "ownerMobile",
    "rcNumber",
    "permitType",
    "status",
  ];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      vehicle[field] = data[field];
    }
  }

  /*
  |--------------------------------------------------------------------------
  | DATE FIELDS
  |--------------------------------------------------------------------------
  */

  const dateFields = [
    "pucExpiry",
    "fitnessExpiry",
    "insuranceExpiry",
    "permitExpiry",
    "rcExpiry",
  ];

  for (const field of dateFields) {
    if (data[field] !== undefined) {
      vehicle[field] =
        normalizeNullableDate(
          data[field]
        );
    }
  }

  /*
  |--------------------------------------------------------------------------
  | SERVICE HISTORY
  |--------------------------------------------------------------------------
  */

  if (data.serviceHistory !== undefined) {
    vehicle.serviceHistory =
      data.serviceHistory;
  }

  /*
  |--------------------------------------------------------------------------
  | ACCIDENT REPORTS
  |--------------------------------------------------------------------------
  */

  if (data.accidentReports !== undefined) {
    vehicle.accidentReports =
      data.accidentReports;
  }

  vehicle.updatedBy = currentUser._id;

  await vehicle.save();

  return populateVehicle(
    Vehicle.findById(vehicle._id)
  );
};

/*
|--------------------------------------------------------------------------
| SOFT DELETE VEHICLE
|--------------------------------------------------------------------------
*/

export const deleteVehicle = async ({
  id,
  currentUser,
}) => {
  ensureVehiclePermission(currentUser);

  const vehicle = await Vehicle.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!vehicle) {
    throw new ApiError(
      404,
      "Vehicle not found"
    );
  }

  vehicle.isDeleted = true;

  vehicle.deletedAt = new Date();

  vehicle.deletedBy = currentUser._id;

  vehicle.updatedBy = currentUser._id;

  await vehicle.save();

  return true;
};

/*
|--------------------------------------------------------------------------
| GET DELETED VEHICLES
|--------------------------------------------------------------------------
|
| Recycle bin is also common for Admin and Sub Admin.
|
*/

export const getDeletedVehicles = async ({
  currentUser,
}) => {
  ensureVehiclePermission(currentUser);

  return populateVehicle(
    Vehicle.find({
      isDeleted: true,
    })
  ).sort({
    deletedAt: -1,
  });
};

/*
|--------------------------------------------------------------------------
| RESTORE VEHICLE
|--------------------------------------------------------------------------
*/

export const restoreVehicle = async ({
  id,
  currentUser,
}) => {
  ensureVehiclePermission(currentUser);

  const vehicle = await Vehicle.findOne({
    _id: id,
    isDeleted: true,
  });

  if (!vehicle) {
    throw new ApiError(
      404,
      "Deleted vehicle not found"
    );
  }

  const duplicateVehicle =
    await Vehicle.findOne({
      _id: {
        $ne: vehicle._id,
      },

      vehicleNo: vehicle.vehicleNo,

      isDeleted: false,
    });

  if (duplicateVehicle) {
    throw new ApiError(
      409,
      "An active vehicle with this vehicle number already exists"
    );
  }

  vehicle.isDeleted = false;

  vehicle.deletedAt = null;

  vehicle.deletedBy = null;

  vehicle.updatedBy = currentUser._id;

  await vehicle.save();

  return populateVehicle(
    Vehicle.findById(vehicle._id)
  );
};