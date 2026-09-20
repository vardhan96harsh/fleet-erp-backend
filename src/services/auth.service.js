import User from "../models/User.js";
import RefreshToken from "../models/RefreshToken.js";
import ApiError from "../utils/ApiError.js";

import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.js";

import { hashToken } from "../utils/token.js";

const getRefreshExpiryDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date;
};

export const loginUser = async ({
  username,
  password,
  ipAddress,
  userAgent,
}) => {
  const user = await User.findOne({
    username: username.toLowerCase(),
  }).select("+password");

  if (!user) {
    throw new ApiError(
      401,
      "Invalid username or password"
    );
  }

  if (!user.isActive) {
    throw new ApiError(
      403,
      "Your account has been disabled"
    );
  }

  const isPasswordValid =
    await user.comparePassword(password);

  if (!isPasswordValid) {
    throw new ApiError(
      401,
      "Invalid username or password"
    );
  }

  const accessToken =
    generateAccessToken(user);

  const refreshToken =
    generateRefreshToken(user);

  await RefreshToken.create({
    user: user._id,
    tokenHash: hashToken(refreshToken),
    expiresAt: getRefreshExpiryDate(),
    ipAddress,
    userAgent,
  });

  user.lastLoginAt = new Date();

  await user.save({
    validateBeforeSave: false,
  });

  return {
    user: user.toSafeObject(),
    accessToken,
    refreshToken,
  };
};

export const refreshUserToken = async ({
  refreshToken,
  ipAddress,
  userAgent,
}) => {
  if (!refreshToken) {
    throw new ApiError(
      401,
      "Refresh token is required"
    );
  }

  let payload;

  try {
    payload = verifyRefreshToken(
      refreshToken
    );
  } catch {
    throw new ApiError(
      401,
      "Invalid or expired refresh token"
    );
  }

  const tokenHash =
    hashToken(refreshToken);

  const storedToken =
    await RefreshToken.findOne({
      tokenHash,
      revokedAt: null,
    });

  if (!storedToken) {
    throw new ApiError(
      401,
      "Refresh token is no longer valid"
    );
  }

  if (
    storedToken.expiresAt <
    new Date()
  ) {
    throw new ApiError(
      401,
      "Refresh token has expired"
    );
  }

  const user = await User.findById(
    payload.sub
  );

  if (!user || !user.isActive) {
    throw new ApiError(
      401,
      "User account is unavailable"
    );
  }

  storedToken.revokedAt =
    new Date();

  await storedToken.save();

  const newAccessToken =
    generateAccessToken(user);

  const newRefreshToken =
    generateRefreshToken(user);

  await RefreshToken.create({
    user: user._id,
    tokenHash:
      hashToken(newRefreshToken),
    expiresAt:
      getRefreshExpiryDate(),
    ipAddress,
    userAgent,
  });

  return {
    accessToken:
      newAccessToken,
    refreshToken:
      newRefreshToken,
  };
};

export const logoutUser = async (
  refreshToken
) => {
  if (!refreshToken) return;

  await RefreshToken.findOneAndUpdate(
    {
      tokenHash:
        hashToken(refreshToken),
      revokedAt: null,
    },
    {
      revokedAt:
        new Date(),
    }
  );
};