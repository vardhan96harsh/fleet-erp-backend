import Driver from "../models/Driver.js";
import Vehicle from "../models/Vehicle.js";

import ApiError from "../utils/ApiError.js";
import { ROLES } from "../constants/roles.js";

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const ensureDriverPermission = (currentUser) => {
  const allowedRoles = [
    ROLES.SUPER_ADMIN,
    ROLES.SUB_ADMIN,
  ];

  if (!allowedRoles.includes(currentUser.role)) {
    throw new ApiError(
      403,
      "You do not have permission to manage driver data"
    );
  }
};

const normalizeMobile = (value) => {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  const mobile = String(value).trim();

  return mobile || null;
};

const normalizeNullableDate = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  return value;
};

const populateDriver = (query) =>
  query
    .populate(
      "assignedVehicle",
      "vehicleNo type status"
    )
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
| VALIDATE VEHICLE ASSIGNMENT
|--------------------------------------------------------------------------
*/

const validateAssignedVehicle = async ({
  vehicleId,
  currentDriverId = null,
}) => {
  if (!vehicleId) {
    return null;
  }

  const vehicle = await Vehicle.findOne({
    _id: vehicleId,
    isDeleted: false,
  });

  if (!vehicle) {
    throw new ApiError(
      400,
      "Assigned vehicle not found"
    );
  }

  const driverFilter = {
    assignedVehicle: vehicle._id,
    isDeleted: false,
  };

  if (currentDriverId) {
    driverFilter._id = {
      $ne: currentDriverId,
    };
  }

  const alreadyAssigned =
    await Driver.findOne(driverFilter);

  if (alreadyAssigned) {
    throw new ApiError(
      409,
      "This vehicle is already assigned to another driver"
    );
  }

  return vehicle._id;
};

/*
|--------------------------------------------------------------------------
| CREATE DRIVER
|--------------------------------------------------------------------------
*/

export const createDriver = async ({
  data,
  currentUser,
}) => {
  ensureDriverPermission(currentUser);

  const normalizedMobile =
    normalizeMobile(data.mobile);

  if (normalizedMobile) {
    const duplicate =
      await Driver.findOne({
        mobile: normalizedMobile,
        isDeleted: false,
      });

    if (duplicate) {
      throw new ApiError(
        409,
        "Driver with this mobile already exists"
      );
    }
  }

  const assignedVehicle =
    await validateAssignedVehicle({
      vehicleId:
        data.assignedVehicleId,
    });

  const driver = await Driver.create({
    name: data.name,

    mobile: normalizedMobile,

    licenceNo:
      data.licenceNo || "",

    licenceExpiry:
      normalizeNullableDate(
        data.licenceExpiry
      ),

    joiningDate:
      normalizeNullableDate(
        data.joiningDate
      ),

    status:
      data.status || "ACTIVE",

    assignedVehicle,

    createdBy: currentUser._id,

    updatedBy: currentUser._id,
  });

  return populateDriver(
    Driver.findById(driver._id)
  );
};

/*
|--------------------------------------------------------------------------
| GET ALL DRIVERS
|--------------------------------------------------------------------------
*/

export const getDrivers = async ({
  currentUser,
}) => {
  ensureDriverPermission(currentUser);

  return populateDriver(
    Driver.find({
      isDeleted: false,
    })
  ).sort({
    createdAt: -1,
  });
};

/*
|--------------------------------------------------------------------------
| GET SINGLE DRIVER
|--------------------------------------------------------------------------
*/

export const getDriverById = async ({
  id,
  currentUser,
}) => {
  ensureDriverPermission(currentUser);

  const driver = await populateDriver(
    Driver.findOne({
      _id: id,
      isDeleted: false,
    })
  );

  if (!driver) {
    throw new ApiError(
      404,
      "Driver not found"
    );
  }

  return driver;
};

/*
|--------------------------------------------------------------------------
| UPDATE DRIVER
|--------------------------------------------------------------------------
*/

export const updateDriver = async ({
  id,
  data,
  currentUser,
}) => {
  ensureDriverPermission(currentUser);

  const driver = await Driver.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!driver) {
    throw new ApiError(
      404,
      "Driver not found"
    );
  }

  /*
  |--------------------------------------------------------------------------
  | MOBILE
  |--------------------------------------------------------------------------
  */

  if (data.mobile !== undefined) {
    const normalizedMobile =
      normalizeMobile(data.mobile);

    if (
      normalizedMobile &&
      normalizedMobile !== driver.mobile
    ) {
      const duplicate =
        await Driver.findOne({
          _id: {
            $ne: driver._id,
          },

          mobile: normalizedMobile,

          isDeleted: false,
        });

      if (duplicate) {
        throw new ApiError(
          409,
          "Driver with this mobile already exists"
        );
      }
    }

    driver.mobile = normalizedMobile;
  }

  /*
  |--------------------------------------------------------------------------
  | VEHICLE ASSIGNMENT
  |--------------------------------------------------------------------------
  */

  if (
    data.assignedVehicleId !==
    undefined
  ) {
    if (
      data.assignedVehicleId ===
      null
    ) {
      driver.assignedVehicle = null;
    } else {
      driver.assignedVehicle =
        await validateAssignedVehicle({
          vehicleId:
            data.assignedVehicleId,

          currentDriverId:
            driver._id,
        });
    }
  }

  /*
  |--------------------------------------------------------------------------
  | STANDARD FIELDS
  |--------------------------------------------------------------------------
  */

  const allowedFields = [
    "name",
    "licenceNo",
    "status",
  ];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      driver[field] = data[field];
    }
  }

  /*
  |--------------------------------------------------------------------------
  | DATE FIELDS
  |--------------------------------------------------------------------------
  */

  if (
    data.licenceExpiry !==
    undefined
  ) {
    driver.licenceExpiry =
      normalizeNullableDate(
        data.licenceExpiry
      );
  }

  if (
    data.joiningDate !==
    undefined
  ) {
    driver.joiningDate =
      normalizeNullableDate(
        data.joiningDate
      );
  }

  driver.updatedBy = currentUser._id;

  await driver.save();

  return populateDriver(
    Driver.findById(driver._id)
  );
};

/*
|--------------------------------------------------------------------------
| SOFT DELETE DRIVER
|--------------------------------------------------------------------------
*/

export const deleteDriver = async ({
  id,
  currentUser,
}) => {
  ensureDriverPermission(currentUser);

  const driver = await Driver.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!driver) {
    throw new ApiError(
      404,
      "Driver not found"
    );
  }

  driver.isDeleted = true;

  driver.deletedAt = new Date();

  driver.deletedBy = currentUser._id;

  driver.updatedBy = currentUser._id;

  await driver.save();

  return true;
};

/*
|--------------------------------------------------------------------------
| GET DELETED DRIVERS
|--------------------------------------------------------------------------
*/

export const getDeletedDrivers = async ({
  currentUser,
}) => {
  ensureDriverPermission(currentUser);

  return populateDriver(
    Driver.find({
      isDeleted: true,
    })
  ).sort({
    deletedAt: -1,
  });
};

/*
|--------------------------------------------------------------------------
| RESTORE DRIVER
|--------------------------------------------------------------------------
*/

export const restoreDriver = async ({
  id,
  currentUser,
}) => {
  ensureDriverPermission(currentUser);

  const driver = await Driver.findOne({
    _id: id,
    isDeleted: true,
  });

  if (!driver) {
    throw new ApiError(
      404,
      "Deleted driver not found"
    );
  }

  /*
  |--------------------------------------------------------------------------
  | MOBILE DUPLICATE CHECK
  |--------------------------------------------------------------------------
  */

  if (driver.mobile) {
    const duplicate =
      await Driver.findOne({
        _id: {
          $ne: driver._id,
        },

        mobile: driver.mobile,

        isDeleted: false,
      });

    if (duplicate) {
      throw new ApiError(
        409,
        "An active driver with this mobile number already exists"
      );
    }
  }

  /*
  |--------------------------------------------------------------------------
  | VEHICLE ASSIGNMENT CHECK
  |--------------------------------------------------------------------------
  */

  if (driver.assignedVehicle) {
    const vehicle =
      await Vehicle.findOne({
        _id: driver.assignedVehicle,
        isDeleted: false,
      });

    if (!vehicle) {
      throw new ApiError(
        409,
        "The previously assigned vehicle is no longer available"
      );
    }

    const vehicleAssignedElsewhere =
      await Driver.findOne({
        _id: {
          $ne: driver._id,
        },

        assignedVehicle:
          driver.assignedVehicle,

        isDeleted: false,
      });

    if (vehicleAssignedElsewhere) {
      throw new ApiError(
        409,
        "The vehicle is currently assigned to another driver"
      );
    }
  }

  /*
  |--------------------------------------------------------------------------
  | RESTORE
  |--------------------------------------------------------------------------
  */

  driver.isDeleted = false;

  driver.deletedAt = null;

  driver.deletedBy = null;

  driver.updatedBy = currentUser._id;

  await driver.save();

  return populateDriver(
    Driver.findById(driver._id)
  );
};