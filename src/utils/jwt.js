import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export const generateAccessToken = (user) => {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
    },
    env.jwtAccessSecret,
    {
      expiresIn: env.jwtAccessExpiresIn,
      issuer: "fleet-erp-api",
      audience: "fleet-erp-client",
    }
  );
};

export const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      sub: user._id.toString(),
      type: "refresh",
    },
    env.jwtRefreshSecret,
    {
      expiresIn: env.jwtRefreshExpiresIn,
      issuer: "fleet-erp-api",
      audience: "fleet-erp-client",
    }
  );
};

export const verifyAccessToken = (token) => {
  return jwt.verify(token, env.jwtAccessSecret, {
    issuer: "fleet-erp-api",
    audience: "fleet-erp-client",
  });
};

export const verifyRefreshToken = (token) => {
  return jwt.verify(token, env.jwtRefreshSecret, {
    issuer: "fleet-erp-api",
    audience: "fleet-erp-client",
  });
};