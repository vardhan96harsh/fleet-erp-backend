import multer from "multer";

import ApiError from "../utils/ApiError.js";

const storage = multer.memoryStorage();

const fileFilter = (
  req,
  file,
  cb
) => {
  const allowedMimeTypes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
  ];

  const fileName =
    file.originalname
      ?.toLowerCase() || "";

  const validExtension =
    fileName.endsWith(".xlsx") ||
    fileName.endsWith(".xls");

  if (
    !allowedMimeTypes.includes(
      file.mimetype
    ) &&
    !validExtension
  ) {
    return cb(
      new ApiError(
        400,
        "Only Excel files (.xlsx or .xls) are allowed"
      )
    );
  }

  cb(null, true);
};

export const uploadExcel =
  multer({
    storage,

    limits: {
      fileSize:
        5 * 1024 * 1024,
    },

    fileFilter,
  });