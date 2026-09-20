import dotenv from "dotenv";

dotenv.config();

const requiredEnv = [
  "MONGO_URI",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing environment variable: ${key}`);
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 5000,

  mongoUri: process.env.MONGO_URI,

  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,

  jwtAccessExpiresIn:
    process.env.JWT_ACCESS_EXPIRES_IN || "15m",

  jwtRefreshExpiresIn:
    process.env.JWT_REFRESH_EXPIRES_IN || "7d",

  clientUrl:
    process.env.CLIENT_URL || "http://localhost:5173",

  superAdmin: {
    name: process.env.SUPER_ADMIN_NAME,
    username: process.env.SUPER_ADMIN_USERNAME,
    password: process.env.SUPER_ADMIN_PASSWORD,
    email: process.env.SUPER_ADMIN_EMAIL,
  },
};