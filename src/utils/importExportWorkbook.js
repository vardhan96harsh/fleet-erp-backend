import ExcelJS from "exceljs";

import ApiError from "./ApiError.js";

import {
  INVENTORY_LOCATION_VALUES,
  getInventoryLocationName,
} from "../constants/inventoryLocations.js";

const MAX_IMPORT_ROWS = 1000;

/*
|--------------------------------------------------------------------------
| EXCEL COLUMNS
|--------------------------------------------------------------------------
|
| Each entry: [Excel heading, record field]
|
*/

export const IMPORT_COLUMNS = {
  VEHICLE: [
    ["Vehicle No", "vehicleNo"],
    ["Vehicle Type", "type"],
    ["Capacity", "capacity"],
    ["Ownership", "ownership"],
    ["Owner Name", "ownerName"],
    ["Owner Mobile", "ownerMobile"],
    ["PUC Expiry", "pucExpiry"],
    ["Fitness Expiry", "fitnessExpiry"],
    ["Insurance Expiry", "insuranceExpiry"],
    ["Permit Expiry", "permitExpiry"],
    ["RC Number", "rcNumber"],
    ["RC Expiry", "rcExpiry"],
    ["Status", "status"],
  ],

  DRIVER: [
    ["Driver ID", "driverId"],
    ["Name", "name"],
    ["Father Name", "fatherName"],
    ["Mobile", "mobile"],
    ["Licence No", "licenceNo"],
    ["Licence Expiry", "licenceExpiry"],
    ["Joining Date", "joiningDate"],
    ["Status", "status"],
    ["Assigned Vehicle", "assignedVehicleNo"],
  ],

  INVENTORY: [
    ["Item Code", "itemCode"],
    ["Item Name", "itemName"],
    ["Category", "category"],
    ["Brand", "brand"],
    ["Size", "size"],
    ["Quantity", "quantity"],
    ["Unit", "unit"],
    ["Purchase Rate", "purchaseRate"],
    ["Minimum Stock", "minimumStock"],
    ["Location", "location"],
    ["Remarks", "remarks"],
    ["Status", "status"],
  ],
};

const normalizeHeader = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const getColumns = (type) => {
  const columns = IMPORT_COLUMNS[type];

  if (!columns) {
    throw new ApiError(
      400,
      "Unsupported import/export type"
    );
  }

  return columns;
};

const isBlank = (value) =>
  value === null ||
  value === undefined ||
  (
    typeof value === "string" &&
    value.trim() === ""
  );

/*
|--------------------------------------------------------------------------
| READ CELL VALUES
|--------------------------------------------------------------------------
|
| Formula cells are rejected during import.
| Rich text and hyperlink display text are accepted.
|
*/

const readCellValue = (cell) => {
  const value = cell.value;

  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value !== "object") {
    return value;
  }

  if (
    "formula" in value ||
    "sharedFormula" in value
  ) {
    throw new Error(
      "Formula cells are not allowed; paste values instead"
    );
  }

  if (Array.isArray(value.richText)) {
    return value.richText
      .map((part) => part.text || "")
      .join("");
  }

  if (typeof value.text === "string") {
    return value.text;
  }

  throw new Error("Unsupported Excel cell value");
};

/*
|--------------------------------------------------------------------------
| CREATE TEMPLATE OR EXPORT WORKBOOK
|--------------------------------------------------------------------------
|
| Template:
| buildExcelWorkbook({ type, location, template: true })
|
| Export:
| buildExcelWorkbook({ type, location, records })
|
*/

export const buildExcelWorkbook = async ({
  type,
  location = null,
  records = [],
  template = false,
}) => {
  const columns = getColumns(type);

  if (type === "INVENTORY") {
    if (
      (template || location !== null) &&
      !INVENTORY_LOCATION_VALUES.includes(location)
    ) {
      throw new ApiError(
        400,
        "Select LOCATION_A or LOCATION_B"
      );
    }
  } else if (location !== null) {
    throw new ApiError(
      400,
      "Location applies only to inventory"
    );
  }

  const workbook = new ExcelJS.Workbook();

  const sheet = workbook.addWorksheet("Data");

  sheet.columns = columns.map(([header, key]) => ({
    header,
    key,
    width: 24,
  }));

  sheet.getRow(1).font = {
    bold: true,
  };

  sheet.views = [
    {
      state: "frozen",
      ySplit: 1,
    },
  ];

  // Keep identifiers and mobile numbers as text in Excel.
  const textFields = new Set([
    "vehicleNo",
    "ownerMobile",
    "rcNumber",
    "mobile",
    "licenceNo",
    "assignedVehicleNo",
    "itemCode",
    "size",
  ]);

  columns.forEach(([, key], index) => {
    if (textFields.has(key)) {
      sheet.getColumn(index + 1).numFmt = "@";
    }
  });

  if (template) {
    const validationsToApply = [];

    if (type === "INVENTORY") {
      // Provide a ready-to-fill first row for the chosen location.
      sheet.addRow({ location });

      const locationCol = columns.findIndex(([, key]) => key === "location") + 1;
      const categoryCol = columns.findIndex(([, key]) => key === "category") + 1;
      const unitCol = columns.findIndex(([, key]) => key === "unit") + 1;
      const statusCol = columns.findIndex(([, key]) => key === "status") + 1;

      if (locationCol > 0) {
        validationsToApply.push({
          col: locationCol,
          formula: `"${location}"`,
          title: "Location Code",
          error: `Use ${location} for this template`,
        });
      }

      if (categoryCol > 0) {
        validationsToApply.push({
          col: categoryCol,
          formula:
            '"Tripal / Waterproof Tarpaulin,Safety Gear,Rope,Jack,Wheel Bolt,Lubricants & Oils,Tires & Tubes,Filters,Brakes & Suspension,Electrical & Battery,Grease & Chemicals,Engine & Transmission,General Spares,Other"',
          title: "Select Category",
          error: "Select a valid category from the dropdown or choose Other",
        });
      }

      if (unitCol > 0) {
        validationsToApply.push({
          col: unitCol,
          formula: '"PCS,LTR,SET,PAIR,KG,MTR,CAN,DRUM,BOX"',
          title: "Select Unit",
          error: "Select a standard inventory unit from the dropdown",
        });
      }

      if (statusCol > 0) {
        validationsToApply.push({
          col: statusCol,
          formula: '"ACTIVE,INACTIVE"',
          title: "Select Status",
          error: "Status must be ACTIVE or INACTIVE",
        });
      }
    } else if (type === "VEHICLE") {
      const typeCol = columns.findIndex(([, key]) => key === "type") + 1;
      const ownershipCol = columns.findIndex(([, key]) => key === "ownership") + 1;
      const statusCol = columns.findIndex(([, key]) => key === "status") + 1;

      if (typeCol > 0) {
        validationsToApply.push({
          col: typeCol,
          formula:
            '"10-Wheeler Tipper,12-Wheeler Tipper,14-Wheeler Haulage,16-Wheeler Tipper,Trailer Tractor,10-Wheeler Haulage,Tanker,Container Truck,Other"',
          title: "Select Vehicle Type",
          error: "Select a valid vehicle type from the dropdown",
        });
      }

      if (ownershipCol > 0) {
        validationsToApply.push({
          col: ownershipCol,
          formula: '"OWNED,LEASED,ATTACHED"',
          title: "Select Ownership",
          error: "Ownership must be OWNED, LEASED, or ATTACHED",
        });
      }

      if (statusCol > 0) {
        validationsToApply.push({
          col: statusCol,
          formula: '"ACTIVE,MAINTENANCE,INACTIVE"',
          title: "Select Status",
          error: "Status must be ACTIVE, MAINTENANCE, or INACTIVE",
        });
      }
    } else if (type === "DRIVER") {
      const statusCol = columns.findIndex(([, key]) => key === "status") + 1;

      if (statusCol > 0) {
        validationsToApply.push({
          col: statusCol,
          formula: '"ACTIVE,ON_LEAVE,INACTIVE"',
          title: "Select Status",
          error: "Status must be ACTIVE, ON_LEAVE, or INACTIVE",
        });
      }
    }

    // Apply native Excel dropdown data validation to each cell in the template range (rows 2 to 1000)
    for (const val of validationsToApply) {
      for (let rowNumber = 2; rowNumber <= MAX_IMPORT_ROWS + 1; rowNumber++) {
        sheet.getCell(rowNumber, val.col).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [val.formula],
          showErrorMessage: true,
          errorStyle: "stop",
          errorTitle: val.title,
          error: val.error,
        };
      }
    }
  }

  for (const record of records) {
    const values = {};

    for (const [, key] of columns) {
      const value = record[key];

      values[key] =
        value instanceof Date
          ? value.toISOString().slice(0, 10)
          : value ?? "";
    }

    sheet.addRow(values);
  }

  const info = workbook.addWorksheet("Import Info");

  info.columns = [
    { width: 26 },
    { width: 95 },
  ];

  info.addRow(["Type", type]);
  info.addRow(["Location Code", location || ""]);
  info.addRow([
    "Location Name",
    location
      ? getInventoryLocationName(location)
      : "",
  ]);
  info.addRow([
    "Instructions",
    "Enter records in the Data sheet. Keep its column headings unchanged.",
  ]);
  info.addRow([
    "Dates",
    "Use YYYY-MM-DD or Excel date cells.",
  ]);
  info.addRow([
    "Duplicates",
    "Duplicate rows will be rejected and included in the error report.",
  ]);
  info.addRow([
    "Maximum Rows",
    MAX_IMPORT_ROWS,
  ]);

  return workbook.xlsx.writeBuffer();
};

/*
|--------------------------------------------------------------------------
| READ UPLOADED WORKBOOK
|--------------------------------------------------------------------------
|
| Returns:
| {
|   metadata: { type, location },
|   rows: [{ rowNumber, data, errors }]
| }
|
| The service will validate metadata against the selected location.
|
*/

export const readImportWorkbook = async ({
  buffer,
  type,
}) => {
  const columns = getColumns(type);

  if (!buffer?.length) {
    throw new ApiError(
      400,
      "Excel file is required"
    );
  }

  const workbook = new ExcelJS.Workbook();

  try {
    await workbook.xlsx.load(buffer);
  } catch {
    throw new ApiError(
      400,
      "Unable to read file. Upload a valid XLSX workbook."
    );
  }

  const sheet =
    workbook.getWorksheet("Data") ||
    workbook.worksheets[0];

  if (!sheet) {
    throw new ApiError(
      400,
      "Workbook does not contain a data sheet"
    );
  }

  const headers = new Map();

  sheet.getRow(1).eachCell((cell, columnNumber) => {
    let heading;

    try {
      heading = normalizeHeader(readCellValue(cell));
    } catch {
      throw new ApiError(
        400,
        "Invalid Excel column heading"
      );
    }

    if (!heading) {
      return;
    }

    if (headers.has(heading)) {
      throw new ApiError(
        400,
        `Repeated Excel heading: ${heading}`
      );
    }

    headers.set(heading, columnNumber);
  });

  for (const [heading] of columns) {
    if (!headers.has(normalizeHeader(heading))) {
      throw new ApiError(
        400,
        `Missing Excel column: ${heading}`
      );
    }
  }

  const rows = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }

    const data = {};
    const errors = [];

    for (const [heading, key] of columns) {
      const columnNumber =
        headers.get(normalizeHeader(heading));

      try {
        data[key] = readCellValue(
          row.getCell(columnNumber)
        );
      } catch (error) {
        data[key] = "";
        errors.push(`${heading}: ${error.message}`);
      }
    }

    // Ignore empty template rows containing only a location.
    const hasData = columns.some(
      ([, key]) =>
        key !== "location" &&
        !isBlank(data[key])
    );

    if (!hasData && errors.length === 0) {
      return;
    }

    rows.push({
      rowNumber,
      data,
      errors,
    });

    if (rows.length > MAX_IMPORT_ROWS) {
      throw new ApiError(
        400,
        `Maximum ${MAX_IMPORT_ROWS} data rows are allowed`
      );
    }
  });

  if (!rows.length) {
    throw new ApiError(
      400,
      "Excel file does not contain any data rows"
    );
  }

  const metadata = {
    type: null,
    location: null,
  };

  const info = workbook.getWorksheet("Import Info");

  if (info) {
    try {
      metadata.type =
        String(readCellValue(info.getCell("B1")))
          .trim() || null;

      metadata.location =
        String(readCellValue(info.getCell("B2")))
          .trim() || null;
    } catch {
      throw new ApiError(
        400,
        "Invalid import information sheet"
      );
    }
  }

  return {
    metadata,
    rows,
  };
};