import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";

import {
  createSubAdmin,
  getSubAdmins,
  getSubAdminById,
  updateSubAdmin,
  updateSubAdminStatus,
  resetSubAdminPassword,
} from "../services/user.service.js";

export const createUser = asyncHandler(
  async (req, res) => {
    const user = await createSubAdmin({
      ...req.validated.body,
      createdBy: req.user._id,
    });

    return res.status(201).json(
      new ApiResponse(
        201,
        user,
        "Sub Admin created successfully"
      )
    );
  }
);

export const listUsers = asyncHandler(
  async (req, res) => {
    const users = await getSubAdmins();

    return res.status(200).json(
      new ApiResponse(
        200,
        users,
        "Sub Admins fetched successfully"
      )
    );
  }
);

export const getUser = asyncHandler(
  async (req, res) => {
    const user = await getSubAdminById(
      req.params.id
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        user.toSafeObject(),
        "Sub Admin fetched successfully"
      )
    );
  }
);

export const updateUser = asyncHandler(
  async (req, res) => {
    const user = await updateSubAdmin(
      req.params.id,
      req.validated.body
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        user,
        "Sub Admin updated successfully"
      )
    );
  }
);

export const updateUserStatus =
  asyncHandler(async (req, res) => {
    const user =
      await updateSubAdminStatus(
        req.params.id,
        req.validated.body.isActive
      );

    return res.status(200).json(
      new ApiResponse(
        200,
        user,
        user.isActive
          ? "Sub Admin enabled"
          : "Sub Admin disabled"
      )
    );
  });

export const resetUserPassword =
  asyncHandler(async (req, res) => {
    await resetSubAdminPassword(
      req.params.id,
      req.validated.body.password
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        null,
        "Password reset successfully"
      )
    );
  });