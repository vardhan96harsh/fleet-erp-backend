import express from "express";

import {
  authenticate,
} from "../middleware/auth.middleware.js";

import {
  uploadExcel,
} from "../middleware/upload.middleware.js";

import {
  downloadVehicleTemplate,
  downloadDriverTemplate,
  downloadInventoryTemplate,
  previewVehicleImport,
  previewDriverImport,
  previewInventoryImport,
  confirmImportBatch,
  downloadVehicleExport,
  downloadDriverExport,
  downloadInventoryExport,
  downloadFullBackup,
} from "../controllers/importExport.controller.js";

const router = express.Router();

router.use(authenticate);

/*
|--------------------------------------------------------------------------
| TEMPLATES
|--------------------------------------------------------------------------
*/

router.get(
  "/templates/vehicles",
  downloadVehicleTemplate
);

router.get(
  "/templates/drivers",
  downloadDriverTemplate
);

router.get(
  "/templates/inventory",
  downloadInventoryTemplate
);

/*
|--------------------------------------------------------------------------
| IMPORT PREVIEW
|--------------------------------------------------------------------------
*/

router.post(
  "/preview/vehicles",
  uploadExcel.single("file"),
  previewVehicleImport
);

router.post(
  "/preview/drivers",
  uploadExcel.single("file"),
  previewDriverImport
);

router.post(
  "/preview/inventory",
  uploadExcel.single("file"),
  previewInventoryImport
);

/*
|--------------------------------------------------------------------------
| CONFIRM IMPORT
|--------------------------------------------------------------------------
*/

router.post(
  "/confirm/:batchId",
  confirmImportBatch
);

/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

router.get(
  "/export/vehicles",
  downloadVehicleExport
);

router.get(
  "/export/drivers",
  downloadDriverExport
);

router.get(
  "/export/inventory",
  downloadInventoryExport
);

/*
|--------------------------------------------------------------------------
| BACKUP
|--------------------------------------------------------------------------
*/

router.get(
  "/backup",
  downloadFullBackup
);

export default router;