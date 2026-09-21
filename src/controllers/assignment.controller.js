import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import {
  createAssignment,
  getAssignments,
  getAssignmentsByVehicle,
  getAssignmentById,
  updateAssignment,
  returnAssignment,
  deleteAssignment,
} from "../services/assignment.service.js";

export const handleCreateAssignment = asyncHandler(async (req, res) => {
  const assignment = await createAssignment({
    data: req.body,
    currentUser: req.user,
  });

  return res
    .status(201)
    .json(
      new ApiResponse(201, assignment, "Item successfully assigned to vehicle")
    );
});

export const handleGetAssignments = asyncHandler(async (req, res) => {
  const assignments = await getAssignments({
    query: req.query,
    currentUser: req.user,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(200, assignments, "Vehicle assignments fetched successfully")
    );
});

export const handleGetAssignmentsByVehicle = asyncHandler(async (req, res) => {
  const vehicleGroups = await getAssignmentsByVehicle({
    currentUser: req.user,
    location: req.query.location || null,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        vehicleGroups,
        "Vehicle equipment groups fetched successfully"
      )
    );
});

export const handleGetAssignmentById = asyncHandler(async (req, res) => {
  const assignment = await getAssignmentById({
    id: req.params.id,
    currentUser: req.user,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(200, assignment, "Assignment details fetched successfully")
    );
});

export const handleUpdateAssignment = asyncHandler(async (req, res) => {
  const updated = await updateAssignment({
    id: req.params.id,
    data: req.body,
    currentUser: req.user,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, updated, "Assignment updated successfully"));
});

export const handleReturnAssignment = asyncHandler(async (req, res) => {
  const returned = await returnAssignment({
    id: req.params.id,
    data: req.body,
    currentUser: req.user,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        returned,
        "Item successfully returned and restored to warehouse inventory"
      )
    );
});

export const handleDeleteAssignment = asyncHandler(async (req, res) => {
  const result = await deleteAssignment({
    id: req.params.id,
    currentUser: req.user,
  });

  return res.status(200).json(new ApiResponse(200, result, result.message));
});
