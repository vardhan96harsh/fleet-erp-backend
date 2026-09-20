import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";

import {
  loginUser,
  logoutUser,
  refreshUserToken,
} from "../services/auth.service.js";

import { env } from "../config/env.js";

const cookieOptions = {
  httpOnly: true,
  secure: env.nodeEnv === "production",
  sameSite:
    env.nodeEnv === "production"
      ? "none"
      : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const login = asyncHandler(
  async (req, res) => {
    const {
      username,
      password,
    } = req.validated.body;

    const result = await loginUser({
      username,
      password,

      ipAddress: req.ip,

      userAgent:
        req.headers["user-agent"] || null,
    });

    res.cookie(
      "refreshToken",
      result.refreshToken,
      cookieOptions
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          user: result.user,
          accessToken: result.accessToken,
        },
        "Login successful"
      )
    );
  }
);

export const refresh = asyncHandler(
  async (req, res) => {
    const refreshToken =
      req.cookies.refreshToken;

    const result =
      await refreshUserToken({
        refreshToken,

        ipAddress: req.ip,

        userAgent:
          req.headers["user-agent"] ||
          null,
      });

    res.cookie(
      "refreshToken",
      result.refreshToken,
      cookieOptions
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          accessToken:
            result.accessToken,
        },
        "Token refreshed"
      )
    );
  }
);

export const logout = asyncHandler(
  async (req, res) => {
    const refreshToken =
      req.cookies.refreshToken;

    await logoutUser(refreshToken);

    res.clearCookie(
      "refreshToken",
      cookieOptions
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        null,
        "Logged out successfully"
      )
    );
  }
);

export const getMe = asyncHandler(
  async (req, res) => {
    const user = req.user;
    const safeUser =
      typeof user.toSafeObject === "function"
        ? user.toSafeObject()
        : {
            id: user._id,
            _id: user._id,
            name: user.name,
            username: user.username,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            lastLoginAt: user.lastLoginAt,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          };

    return res.status(200).json(
      new ApiResponse(
        200,
        { user: safeUser },
        "Current user fetched"
      )
    );
  }
);