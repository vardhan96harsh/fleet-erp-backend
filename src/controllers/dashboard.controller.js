import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";

import {
  getDashboardSummary,
} from "../services/dashboard.service.js";

export const dashboardSummary = asyncHandler(
  async (req, res) => {
    const dashboard =
      await getDashboardSummary({
        currentUser: req.user,
        ownerId:
          req.query.ownerId || null,
      });

    return res.status(200).json(
      new ApiResponse(
        200,
        dashboard,
        "Dashboard summary fetched successfully"
      )
    );
  }
);