import mongoose from "mongoose";

import Vehicle from "../models/Vehicle.js";
import Driver from "../models/Driver.js";
import Inventory from "../models/Inventory.js";
import ImportBatch from "../models/ImportBatch.js";

import ApiError from "../utils/ApiError.js";
import { ROLES } from "../constants/roles.js";

import {
  INVENTORY_LOCATION_VALUES,
  getInventoryLocationName,
} from "../constants/inventoryLocations.js";

import {
  buildExcelWorkbook,
  readImportWorkbook,
} from "../utils/importExportWorkbook.js";

import {
  createVehicleSchema,
} from "../validators/vehicle.validator.js";

import {
  createDriverSchema,
} from "../validators/driver.validator.js";

import {
  createInventorySchema,
} from "../validators/inventory.validator.js";

/*
|--------------------------------------------------------------------------
| CONFIGURATION
|--------------------------------------------------------------------------
*/

const MODELS = {
  VEHICLE: Vehicle,
  DRIVER: Driver,
  INVENTORY: Inventory,
};

const VALIDATORS = {
  VEHICLE: createVehicleSchema,
  DRIVER: createDriverSchema,
  INVENTORY: createInventorySchema,
};

const DATE_FIELDS = [
  "pucExpiry",
  "fitnessExpiry",
  "insuranceExpiry",
  "permitExpiry",
  "rcExpiry",
  "licenceExpiry",
  "joiningDate",
];

const NUMBER_FIELDS = [
  "quantity",
  "purchaseRate",
  "minimumStock",
];

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const ensurePermission = (currentUser) => {
  if (
    !currentUser ||
    ![
      ROLES.SUPER_ADMIN,
      ROLES.SUB_ADMIN,
    ].includes(currentUser.role)
  ) {
    throw new ApiError(
      403,
      "You do not have permission to import or export data"
    );
  }
};

const ensureType = (type) => {
  if (!Object.hasOwn(MODELS, type)) {
    throw new ApiError(
      400,
      "Unsupported import/export type"
    );
  }
};

const resolveLocation = (
  type,
  location,
  required = false
) => {
  if (type !== "INVENTORY") {
    if (location !== null && location !== undefined) {
      throw new ApiError(
        400,
        "Location applies only to inventory"
      );
    }

    return null;
  }

  if (location === null || location === undefined) {
    if (required) {
      throw new ApiError(
        400,
        "Select LOCATION_A or LOCATION_B"
      );
    }

    return null;
  }

  if (!INVENTORY_LOCATION_VALUES.includes(location)) {
    throw new ApiError(
      400,
      "Location must be LOCATION_A or LOCATION_B"
    );
  }

  return location;
};

const text = (value) =>
  String(value ?? "").trim();

const blank = (value) =>
  value === null ||
  value === undefined ||
  (
    typeof value === "string" &&
    value.trim() === ""
  );

const findOne = (Model, filter, session = null) => {
  const query = Model.findOne(filter);

  if (session) {
    query.session(session);
  }

  return query;
};

const buildSummary = (rows) => ({
  newCount: rows.filter(
    (row) => row.action === "NEW"
  ).length,

  updateCount: 0,
  unchangedCount: 0,

  invalidCount: rows.filter(
    (row) => row.action === "INVALID"
  ).length,
});

const buildErrorReport = (rows) =>
  rows
    .filter((row) => row.action === "INVALID")
    .map((row) => ({
      rowNumber: row.rowNumber,
      reason: row.reason,
      data: row.data,
    }));

/*
|--------------------------------------------------------------------------
| NORMALIZE AND VALIDATE AN EXCEL ROW
|--------------------------------------------------------------------------
*/

const prepareRow = async ({
  type,
  raw,
  location,
}) => {
  const data = { ...raw };

  for (const [key, value] of Object.entries(data)) {
    if (DATE_FIELDS.includes(key) || NUMBER_FIELDS.includes(key)) {
      continue;
    }

    if (value === null || value === undefined) {
      delete data[key];
    } else {
      const str = String(value).trim();
      if (str === "") {
        delete data[key];
      } else {
        data[key] = str;
      }
    }
  }

  for (const key of DATE_FIELDS) {
    if (!(key in data)) {
      continue;
    }

    const value = data[key];

    if (blank(value)) {
      data[key] = null;
      continue;
    }

    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) {
        throw new ApiError(400, `Invalid ${key}`);
      }
      data[key] = value.toISOString().slice(0, 10);
      continue;
    }

    // Handle numeric Excel date serials (e.g. 45321)
    if (typeof value === "number" && value > 1000 && value < 100000) {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const date = new Date(excelEpoch.getTime() + value * 86400000);
      if (!Number.isNaN(date.getTime())) {
        data[key] = date.toISOString().slice(0, 10);
        continue;
      }
    }

    const dateText = text(value).trim();

    // Standard YYYY-MM-DD or YYYY/MM/DD
    let match = dateText.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (match) {
      const y = match[1];
      const m = match[2].padStart(2, "0");
      const d = match[3].padStart(2, "0");
      const parsed = new Date(`${y}-${m}-${d}T00:00:00.000Z`);
      if (
        !Number.isNaN(parsed.getTime()) &&
        parsed.toISOString().slice(0, 10) === `${y}-${m}-${d}`
      ) {
        data[key] = `${y}-${m}-${d}`;
        continue;
      }
    }

    // Common Indian/European DD-MM-YYYY or DD/MM/YYYY
    match = dateText.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (match) {
      const d = match[1].padStart(2, "0");
      const m = match[2].padStart(2, "0");
      const y = match[3];
      const parsed = new Date(`${y}-${m}-${d}T00:00:00.000Z`);
      if (
        !Number.isNaN(parsed.getTime()) &&
        parsed.toISOString().slice(0, 10) === `${y}-${m}-${d}`
      ) {
        data[key] = `${y}-${m}-${d}`;
        continue;
      }
    }

    // Fallback date parse
    const timestamp = Date.parse(dateText);
    if (!Number.isNaN(timestamp)) {
      const parsed = new Date(timestamp);
      data[key] = parsed.toISOString().slice(0, 10);
      continue;
    }

    throw new ApiError(
      400,
      `${key} must be a valid date (YYYY-MM-DD or DD/MM/YYYY)`
    );
  }

  for (const key of NUMBER_FIELDS) {
    if (!(key in data)) {
      continue;
    }

    if (blank(data[key])) {
      delete data[key];
      continue;
    }

    if (
      !["number", "string"].includes(typeof data[key]) ||
      !Number.isFinite(Number(data[key]))
    ) {
      throw new ApiError(
        400,
        `${key} must be a valid number`
      );
    }

    data[key] = Number(data[key]);
  }

  data.status = text(data.status)
    .toUpperCase()
    .replace(/\s+/g, "_") || "ACTIVE";

  if (type === "VEHICLE") {
    data.vehicleNo = text(data.vehicleNo).toUpperCase();
    data.ownerMobile = text(data.ownerMobile);
  }

  if (type === "DRIVER") {
    data.mobile = text(data.mobile) || null;
    data.licenceNo = text(data.licenceNo).toUpperCase();

    const vehicleNo =
      text(data.assignedVehicleNo).toUpperCase();

    delete data.assignedVehicleNo;

    data.assignedVehicleId = null;

    if (vehicleNo) {
      const vehicle = await Vehicle.findOne({
        vehicleNo,
        isDeleted: false,
      });

      if (!vehicle) {
        throw new ApiError(
          400,
          `Assigned vehicle not found: ${vehicleNo}`
        );
      }

      data.assignedVehicleId = String(vehicle._id);
    }
  }

  if (type === "INVENTORY") {
    const rowLocation = text(data.location);

    if (rowLocation && rowLocation !== location) {
      throw new ApiError(
        400,
        `Row location does not match selected location ${location}`
      );
    }

    data.location = location;
    data.itemCode = text(data.itemCode).toUpperCase();
    data.unit = text(data.unit).toUpperCase() || "PCS";
  }

  const result = VALIDATORS[type].safeParse({
    body: data,
  });

  if (!result.success) {
    const reason = result.error.issues
      .map((issue) => {
        const path = issue.path
          .filter((part) => part !== "body")
          .join(".");

        return `${path}: ${issue.message}`;
      })
      .join("; ");

    throw new ApiError(400, reason);
  }

  return result.data.body;
};

/*
|--------------------------------------------------------------------------
| DUPLICATE KEYS INSIDE THE UPLOADED FILE
|--------------------------------------------------------------------------
*/

const getRowKeys = (type, data) => {
  if (type === "VEHICLE") {
    return [`vehicle:${data.vehicleNo}`];
  }

  if (type === "INVENTORY") {
    return [
      `inventory:${data.location}:${data.itemCode}`,
    ];
  }

  const keys = [];

  if (data.mobile) {
    keys.push(`mobile:${data.mobile}`);
  }

  if (data.assignedVehicleId) {
    keys.push(`assignment:${data.assignedVehicleId}`);
  }

  return keys;
};

/*
|--------------------------------------------------------------------------
| CHECK CURRENT DATABASE CONFLICTS
|--------------------------------------------------------------------------
*/

const getConflict = async ({
  type,
  data,
  session = null,
}) => {
  if (type === "VEHICLE") {
    const duplicate = await findOne(
      Vehicle,
      {
        vehicleNo: data.vehicleNo,
        isDeleted: false,
      },
      session
    );

    return duplicate
      ? "Duplicate vehicle number already exists"
      : null;
  }

  if (type === "INVENTORY") {
    const duplicate = await findOne(
      Inventory,
      {
        itemCode: data.itemCode,
        location: data.location,
        isDeleted: false,
      },
      session
    );

    return duplicate
      ? "Duplicate item code already exists at this location"
      : null;
  }

  if (data.mobile) {
    const duplicate = await findOne(
      Driver,
      {
        mobile: data.mobile,
        isDeleted: false,
      },
      session
    );

    if (duplicate) {
      return "Duplicate driver mobile already exists";
    }
  }

  if (data.assignedVehicleId) {
    const vehicle = await findOne(
      Vehicle,
      {
        _id: data.assignedVehicleId,
        isDeleted: false,
      },
      session
    );

    if (!vehicle) {
      return "Assigned vehicle is no longer available";
    }

    const assignedDriver = await findOne(
      Driver,
      {
        assignedVehicle: data.assignedVehicleId,
        isDeleted: false,
      },
      session
    );

    if (assignedDriver) {
      return "Vehicle is already assigned to another driver";
    }
  }

  return null;
};

/*
|--------------------------------------------------------------------------
| TEMPLATE DOWNLOAD
|--------------------------------------------------------------------------
|
| generateTemplate("VEHICLE")
| generateTemplate("DRIVER")
| generateTemplate("INVENTORY", "LOCATION_A")
|
*/

export const generateTemplate = async (
  type,
  location = null
) => {
  ensureType(type);

  const selectedLocation = resolveLocation(
    type,
    location,
    type === "INVENTORY"
  );

  return buildExcelWorkbook({
    type,
    location: selectedLocation,
    template: true,
  });
};

/*
|--------------------------------------------------------------------------
| IMPORT PREVIEW
|--------------------------------------------------------------------------
*/

export const createImportPreview = async ({
  type,
  file,
  currentUser,
  location = null,
}) => {
  ensurePermission(currentUser);
  ensureType(type);

  const selectedLocation = resolveLocation(
    type,
    location,
    type === "INVENTORY"
  );

  if (!file?.buffer) {
    throw new ApiError(
      400,
      "Excel file is required"
    );
  }

  const { metadata, rows } =
    await readImportWorkbook({
      buffer: file.buffer,
      type,
    });

  if (metadata.type && metadata.type !== type) {
    throw new ApiError(
      400,
      "Template type does not match the selected import"
    );
  }

  if (type === "INVENTORY") {
    if (
      metadata.type !== "INVENTORY" ||
      metadata.location !== selectedLocation
    ) {
      throw new ApiError(
        400,
        "Use the inventory template for the selected location"
      );
    }
  } else if (metadata.location) {
    throw new ApiError(
      400,
      "Vehicle and driver templates cannot specify a location"
    );
  }

  const preview = [];
  const seenKeys = new Set();

  for (const row of rows) {
    let data = row.data;
    let reason = row.errors.join("; ");

    if (!reason) {
      try {
        data = await prepareRow({
          type,
          raw: row.data,
          location: selectedLocation,
        });
      } catch (error) {
        if (error.statusCode !== 400) {
          throw error;
        }

        reason = error.message;
      }
    }

    if (!reason) {
      const keys = getRowKeys(type, data);

      if (keys.some((key) => seenKeys.has(key))) {
        reason =
          "Duplicate record or vehicle assignment inside this file";
      } else {
        reason = await getConflict({
          type,
          data,
        });

        if (!reason) {
          keys.forEach((key) => seenKeys.add(key));
        }
      }
    }

    preview.push({
      rowNumber: row.rowNumber,
      action: reason ? "INVALID" : "NEW",
      data,
      reason: reason || "",
      changes: [],
      targetId: null,
    });
  }

  const summary = buildSummary(preview);

  const batch = await ImportBatch.create({
    type,
    location: selectedLocation,
    requestedBy: currentUser._id,
    originalFileName: file.originalname || "",
    rows: preview,
    summary,
    expiresAt: new Date(
      Date.now() + 30 * 60 * 1000
    ),
  });

  return {
    batchId: batch._id,
    type,
    location: selectedLocation,
    locationName: selectedLocation
      ? getInventoryLocationName(selectedLocation)
      : null,
    expiresAt: batch.expiresAt,
    summary,
    rows: preview,
    errorReport: buildErrorReport(preview),
  };
};

/*
|--------------------------------------------------------------------------
| CONVERT PREVIEW DATA TO DATABASE RECORD
|--------------------------------------------------------------------------
*/

const buildRecord = (type, data, currentUser) => {
  const record = { ...data };

  for (const key of DATE_FIELDS) {
    if (record[key] === "") {
      record[key] = null;
    }
  }

  if (type === "DRIVER") {
    record.assignedVehicle =
      record.assignedVehicleId || null;

    delete record.assignedVehicleId;

    record.mobile = text(record.mobile) || null;
  }

  record.createdBy = currentUser._id;
  record.updatedBy = currentUser._id;
  record.isDeleted = false;

  return record;
};

/*
|--------------------------------------------------------------------------
| CONFIRM IMPORT
|--------------------------------------------------------------------------
|
| Only the uploader can confirm their preview.
| Business records remain common for both roles.
|
| MongoDB transaction keeps the batch confirmation and inserted records
| together. Duplicate/invalid rows are skipped and reported.
|
*/

export const confirmImport = async ({
  batchId,
  currentUser,
}) => {
  ensurePermission(currentUser);

  if (!mongoose.isValidObjectId(batchId)) {
    throw new ApiError(400, "Invalid import batch ID");
  }

  const session = await mongoose.startSession();

  try {
    return await session.withTransaction(async () => {
      const batch = await ImportBatch.findOne({
        _id: batchId,
        requestedBy: currentUser._id,
        confirmedAt: null,
        expiresAt: { $gt: new Date() },
      })
        .session(session)
        .lean();

      if (!batch) {
        throw new ApiError(
          404,
          "Import preview not found, already confirmed, or expired"
        );
      }

      ensureType(batch.type);

      // Old owner-based previews must be uploaded again.
      if (
        batch.owner ||
        batch.rows.some(
          (row) =>
            !["NEW", "INVALID"].includes(row.action)
        )
      ) {
        throw new ApiError(
          409,
          "This preview uses the old import flow. Upload the file again."
        );
      }

      const location = resolveLocation(
        batch.type,
        batch.location ?? null,
        batch.type === "INVENTORY"
      );

      const resultRows = [];
      let created = 0;

      for (const row of batch.rows) {
        if (row.action === "INVALID") {
          resultRows.push(row);
          continue;
        }

        if (
          batch.type === "INVENTORY" &&
          row.data.location !== location
        ) {
          throw new ApiError(
            409,
            "Import location mismatch. Upload the file again."
          );
        }

        const reason = await getConflict({
          type: batch.type,
          data: row.data,
          session,
        });

        if (reason) {
          resultRows.push({
            ...row,
            action: "INVALID",
            reason,
          });

          continue;
        }

        const [record] = await MODELS[batch.type].create(
          [
            buildRecord(
              batch.type,
              row.data,
              currentUser
            ),
          ],
          { session }
        );

        created++;

        resultRows.push({
          ...row,
          targetId: record._id,
          reason: "",
        });
      }

      const summary = buildSummary(resultRows);

      const updatedBatch =
        await ImportBatch.updateOne(
          {
            _id: batch._id,
            confirmedAt: null,
          },
          {
            $set: {
              confirmedAt: new Date(),
              rows: resultRows,
              summary,
            },
          },
          {
            session,
            runValidators: true,
          }
        );

      if (updatedBatch.modifiedCount !== 1) {
        throw new ApiError(
          409,
          "Import batch was already confirmed"
        );
      }

      return {
        batchId: batch._id,
        type: batch.type,
        location,
        created,
        updated: 0,
        unchanged: 0,
        invalid: summary.invalidCount,
        errorReport: buildErrorReport(resultRows),
      };
    });
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(
        409,
        "A conflicting record was created during confirmation. No records from this confirmation were committed. Generate a new preview."
      );
    }

    throw error;
  } finally {
    await session.endSession();
  }
};

/*
|--------------------------------------------------------------------------
| COMMON VEHICLE EXPORT
|--------------------------------------------------------------------------
*/

export const exportVehicles = async ({
  currentUser,
}) => {
  ensurePermission(currentUser);

  const records = await Vehicle.find({
    isDeleted: false,
  })
    .sort({ createdAt: -1 })
    .lean();

  return buildExcelWorkbook({
    type: "VEHICLE",
    records,
  });
};

/*
|--------------------------------------------------------------------------
| COMMON DRIVER EXPORT
|--------------------------------------------------------------------------
*/

export const exportDrivers = async ({
  currentUser,
}) => {
  ensurePermission(currentUser);

  const drivers = await Driver.find({
    isDeleted: false,
  })
    .populate("assignedVehicle", "vehicleNo")
    .sort({ createdAt: -1 })
    .lean();

  const records = drivers.map((driver) => ({
    ...driver,
    assignedVehicleNo:
      driver.assignedVehicle?.vehicleNo || "",
  }));

  return buildExcelWorkbook({
    type: "DRIVER",
    records,
  });
};

/*
|--------------------------------------------------------------------------
| INVENTORY EXPORT
|--------------------------------------------------------------------------
|
| No location: exports both locations.
| Selected location: exports that location only.
|
*/

export const exportInventory = async ({
  currentUser,
  location = null,
}) => {
  ensurePermission(currentUser);

  const selectedLocation = resolveLocation(
    "INVENTORY",
    location
  );

  const filter = {
    isDeleted: false,
  };

  if (selectedLocation) {
    filter.location = selectedLocation;
  }

  const records = await Inventory.find(filter)
    .sort({
      location: 1,
      itemCode: 1,
    })
    .lean();

  return buildExcelWorkbook({
    type: "INVENTORY",
    location: selectedLocation,
    records,
  });
};

/*
|--------------------------------------------------------------------------
| BUSINESS DATA BACKUP
|--------------------------------------------------------------------------
|
| Includes active and soft-deleted business records.
| Does not export passwords, refresh tokens, or user accounts.
|
*/

export const createFullBackup = async ({
  currentUser,
}) => {
  ensurePermission(currentUser);

  const [vehicles, drivers, inventory] =
    await Promise.all([
      Vehicle.find({}).lean(),
      Driver.find({}).lean(),
      Inventory.find({}).lean(),
    ]);

  return {
    exportedAt: new Date().toISOString(),

    exportedBy: {
      id: currentUser._id,
      name: currentUser.name,
      username: currentUser.username,
      role: currentUser.role,
    },

    scope: "COMMON",

    locations: INVENTORY_LOCATION_VALUES.map(
      (code) => ({
        code,
        name: getInventoryLocationName(code),
      })
    ),

    vehicles,
    drivers,
    inventory,
  };
};