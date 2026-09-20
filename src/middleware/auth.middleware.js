import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { verifyAccessToken } from "../utils/jwt.js";

// Ultra-fast in-memory cache for authenticated users (reduces redundant DB hits on parallel requests)
const userCache = new Map();
const CACHE_TTL_MS = 30000; // 30 seconds

export const invalidateUserCache = (userId) => {
  if (userId) userCache.delete(String(userId));
  else userCache.clear();
};

export const authenticate = asyncHandler(
  async (req, res, next) => {
    const authorization = req.headers.authorization;

    if (
      !authorization ||
      !authorization.startsWith("Bearer ")
    ) {
      throw new ApiError(
        401,
        "Authentication required"
      );
    }

    const token = authorization.split(" ")[1];

    let payload;

    try {
      payload = verifyAccessToken(token);
    } catch (error) {
      throw new ApiError(
        401,
        "Invalid or expired access token"
      );
    }

    const userId = payload.sub;
    const now = Date.now();

    let user = null;
    const cached = userCache.get(userId);

    if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
      user = cached.user;
    } else {
      user = await User.findById(userId).select("-password").lean().exec();
      if (user) {
        userCache.set(userId, { user, timestamp: now });
      }
    }

    if (!user) {
      userCache.delete(userId);
      throw new ApiError(
        401,
        "User no longer exists"
      );
    }

    if (!user.isActive) {
      userCache.delete(userId);
      throw new ApiError(
        403,
        "Your account has been disabled"
      );
    }

    req.user = user;

    next();
  }
);