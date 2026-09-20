import mongoose from "mongoose";
import { env } from "./env.js";

export const connectDB = async () => {
  try {
    mongoose.connection.on("error", (err) => {
      console.error("MongoDB connection runtime error:", err.message);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("MongoDB disconnected. Attempting to reconnect...");
    });

    mongoose.connection.on("reconnected", () => {
      console.log("MongoDB reconnected successfully.");
    });

    const connection = await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
    });

    console.log(
      `MongoDB connected: ${connection.connection.host}`
    );
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    if (error.name === "MongooseServerSelectionError") {
      console.error(
        "\n[ACTION REQUIRED]: Your current IP address is not whitelisted in MongoDB Atlas.\n" +
        "1. Open https://cloud.mongodb.com\n" +
        "2. Navigate to Security -> Network Access\n" +
        "3. Click 'Add IP Address' -> 'Add Current IP Address' or '0.0.0.0/0' (Allow anywhere).\n"
      );
    }
  }
};