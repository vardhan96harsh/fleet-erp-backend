import app from "./app.js";
import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";
import logger from "./config/logger.js";
import { bootstrapSuperAdmin } from "./services/bootstrap.service.js";

let server;

const startServer = async () => {
  try {
    await connectDB();
    await bootstrapSuperAdmin();

    server = app.listen(env.port, () => {
      logger.info(
        `ERP API running on http://localhost:${env.port}`
      );
    });
  } catch (error) {
    logger.error(error, "Failed to start server");
    process.exit(1);
  }
};

const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Shutting down...`);

  if (server) {
    server.close(() => {
      logger.info("HTTP server closed");
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on("SIGTERM", () =>
  gracefulShutdown("SIGTERM")
);

process.on("SIGINT", () =>
  gracefulShutdown("SIGINT")
);

process.on("unhandledRejection", (error) => {
  logger.error(error, "Unhandled Promise Rejection");
});

process.on("uncaughtException", (error) => {
  logger.fatal(error, "Uncaught Exception");
  process.exit(1);
});

startServer();