import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";

import {
  generateTemplate,
  createImportPreview,
  confirmImport,
  exportVehicles,
  exportDrivers,
  exportInventory,
  createFullBackup,
} from "../services/importExport.service.js";

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const sendExcel = (res, buffer, filename) => {
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );

  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}"`
  );

  return res.status(200).send(Buffer.from(buffer));
};

const today = () =>
  new Date().toISOString().slice(0, 10);

/*
|--------------------------------------------------------------------------
| VEHICLE TEMPLATE
|--------------------------------------------------------------------------
*/

export const downloadVehicleTemplate = asyncHandler(
  async (req, res) => {
    const buffer = await generateTemplate("VEHICLE");

    return sendExcel(
      res,
      buffer,
      "vehicle-template.xlsx"
    );
  }
);

/*
|--------------------------------------------------------------------------
| DRIVER TEMPLATE
|--------------------------------------------------------------------------
*/

export const downloadDriverTemplate = asyncHandler(
  async (req, res) => {
    const buffer = await generateTemplate("DRIVER");

    return sendExcel(
      res,
      buffer,
      "driver-template.xlsx"
    );
  }
);

/*
|--------------------------------------------------------------------------
| INVENTORY TEMPLATE
|--------------------------------------------------------------------------
|
| Required query:
| ?location=LOCATION_A
| ?location=LOCATION_B
|
*/

export const downloadInventoryTemplate = asyncHandler(
  async (req, res) => {
    const location = req.query.location ?? null;

    // Service validates location before it is used in the filename.
    const buffer = await generateTemplate(
      "INVENTORY",
      location
    );

    return sendExcel(
      res,
      buffer,
      `inventory-template-${location}.xlsx`
    );
  }
);

/*
|--------------------------------------------------------------------------
| VEHICLE IMPORT PREVIEW
|--------------------------------------------------------------------------
*/

export const previewVehicleImport = asyncHandler(
  async (req, res) => {
    const result = await createImportPreview({
      type: "VEHICLE",
      file: req.file,
      currentUser: req.user,
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Vehicle import preview generated successfully"
      )
    );
  }
);

/*
|--------------------------------------------------------------------------
| DRIVER IMPORT PREVIEW
|--------------------------------------------------------------------------
*/

export const previewDriverImport = asyncHandler(
  async (req, res) => {
    const result = await createImportPreview({
      type: "DRIVER",
      file: req.file,
      currentUser: req.user,
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Driver import preview generated successfully"
      )
    );
  }
);

/*
|--------------------------------------------------------------------------
| INVENTORY IMPORT PREVIEW
|--------------------------------------------------------------------------
|
| Body: multipart/form-data
| file: Excel file
| location: LOCATION_A or LOCATION_B
|
*/

export const previewInventoryImport = asyncHandler(
  async (req, res) => {
    const result = await createImportPreview({
      type: "INVENTORY",
      file: req.file,
      currentUser: req.user,
      location: req.body?.location ?? null,
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Inventory import preview generated successfully"
      )
    );
  }
);

/*
|--------------------------------------------------------------------------
| CONFIRM IMPORT
|--------------------------------------------------------------------------
*/

export const confirmImportBatch = asyncHandler(
  async (req, res) => {
    const result = await confirmImport({
      batchId: req.params.batchId,
      currentUser: req.user,
    });

    const message =
      result.invalid > 0
        ? "Import completed with rejected rows. Check errorReport."
        : "Import completed successfully";

    return res.status(200).json(
      new ApiResponse(
        200,
        result,
        message
      )
    );
  }
);

/*
|--------------------------------------------------------------------------
| VEHICLE EXPORT
|--------------------------------------------------------------------------
*/

export const downloadVehicleExport = asyncHandler(
  async (req, res) => {
    const buffer = await exportVehicles({
      currentUser: req.user,
    });

    return sendExcel(
      res,
      buffer,
      `vehicles-${today()}.xlsx`
    );
  }
);

/*
|--------------------------------------------------------------------------
| DRIVER EXPORT
|--------------------------------------------------------------------------
*/

export const downloadDriverExport = asyncHandler(
  async (req, res) => {
    const buffer = await exportDrivers({
      currentUser: req.user,
    });

    return sendExcel(
      res,
      buffer,
      `drivers-${today()}.xlsx`
    );
  }
);

/*
|--------------------------------------------------------------------------
| INVENTORY EXPORT
|--------------------------------------------------------------------------
|
| No location query: export both locations.
| ?location=LOCATION_A: export Location A.
| ?location=LOCATION_B: export Location B.
|
*/

export const downloadInventoryExport = asyncHandler(
  async (req, res) => {
    const location = req.query.location ?? null;

    const buffer = await exportInventory({
      currentUser: req.user,
      location,
    });

    return sendExcel(
      res,
      buffer,
      `inventory-${location ?? "ALL"}-${today()}.xlsx`
    );
  }
);

/*
|--------------------------------------------------------------------------
| FULL BUSINESS DATA BACKUP
|--------------------------------------------------------------------------
*/

export const downloadFullBackup = asyncHandler(
  async (req, res) => {
    const backup = await createFullBackup({
      currentUser: req.user,
    });

    res.setHeader(
      "Content-Type",
      "application/json"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="fleet-backup-${today()}.json"`
    );

    return res.status(200).send(
      JSON.stringify(backup, null, 2)
    );
  }
);