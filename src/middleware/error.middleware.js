import ApiError from "../utils/ApiError.js";
import { env } from "../config/env.js";

export const notFoundHandler = (req, res, next) => {
  next(
    new ApiError(
      404,
      `Route not found: ${req.method} ${req.originalUrl}`
    )
  );
};

export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid resource ID";
  }

  if (err.code === 11000) {
    statusCode = 409;
    message = "Duplicate value already exists";
  }

  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((error) => error.message)
      .join(", ");
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors: err.errors || [],
    stack:
      env.nodeEnv === "development"
        ? err.stack
        : undefined,
  });
};