import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";

import logger from "./config/logger.js";
import { env } from "./config/env.js";
import ApiResponse from "./utils/ApiResponse.js";

import {
  errorHandler,
  notFoundHandler,
} from "./middleware/error.middleware.js";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import vehicleRoutes from "./routes/vehicle.routes.js";
import driverRoutes from "./routes/driver.routes.js";
import inventoryRoutes from "./routes/inventory.routes.js";
import importExportRoutes from "./routes/importExport.routes.js";

import dashboardRoutes from "./routes/dashboard.routes.js";
import attendanceRoutes from "./routes/attendance.routes.js";

const app = express();

/*
|--------------------------------------------------------------------------
| Security
|--------------------------------------------------------------------------
*/

app.disable("x-powered-by");

app.use(helmet());

const allowedOrigins = (env.clientUrl || "")
  .split(",")
  .map((u) => u.trim().replace(/\/+$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      const normalizedOrigin = origin.replace(/\/+$/, "");
      if (
        allowedOrigins.length === 0 ||
        allowedOrigins.includes("*") ||
        allowedOrigins.includes(normalizedOrigin) ||
        env.nodeEnv !== "production"
      ) {
        return callback(null, true);
      }
      return callback(null, true); // Allow during staging/testing or callback(new Error("CORS origin not allowed"))
    },
    credentials: true,
  })
);

/*
|--------------------------------------------------------------------------
| Parsers
|--------------------------------------------------------------------------
*/

app.use(
  express.json({
    limit: "1mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb",
  })
);

app.use(cookieParser());

/*
|--------------------------------------------------------------------------
| Logging
|--------------------------------------------------------------------------
*/

app.use(
  pinoHttp({
    logger,
  })
);

/*
|--------------------------------------------------------------------------
| Health Check
|--------------------------------------------------------------------------
*/

app.get("/", (req, res) => {
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        status: "healthy",
        service: "Fleet ERP Backend API",
        version: "1.0.0",
        environment: env.nodeEnv,
        timestamp: new Date().toISOString(),
      },
      "Fleet ERP Backend API is live and operational"
    )
  );
});

app.get("/health", (req, res) => {
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        status: "healthy",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
      "Service is healthy"
    )
  );
});

app.get("/api/v1/health", (req, res) => {
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        environment: env.nodeEnv,
        timestamp: new Date().toISOString(),
      },
      "ERP API is running"
    )
  );
});

/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
*/

app.use(
  "/api/v1/auth",
  authRoutes
);

app.use(
  "/api/v1/users",
  userRoutes
);

app.use(
  "/api/v1/vehicles",
  vehicleRoutes
);

app.use(
  "/api/v1/drivers",
  driverRoutes
);

app.use(
  "/api/v1/inventory",
  inventoryRoutes
);

app.use(
  "/api/v1/import-export",
  importExportRoutes
);

app.use(
  "/api/v1/dashboard",
  dashboardRoutes
);

app.use(
  "/api/v1/attendance",
  attendanceRoutes
);

/*
|--------------------------------------------------------------------------
| Error Handling
|--------------------------------------------------------------------------
*/

app.use(notFoundHandler);

app.use(errorHandler);

export default app;