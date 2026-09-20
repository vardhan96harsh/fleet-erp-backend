import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import {
  getAttendanceByDate,
  getAttendanceByMonth,
  markAttendance,
  markBulkAttendance,
} from "../services/attendance.service.js";

export const getDailyAttendance = asyncHandler(async (req, res) => {
  const { date } = req.query;
  const targetDate = date || new Date().toISOString().slice(0, 10);
  const data = await getAttendanceByDate(targetDate);

  return res.status(200).json(
    new ApiResponse(200, data, "Daily attendance records retrieved successfully")
  );
});

export const getMonthlyAttendance = asyncHandler(async (req, res) => {
  const { month } = req.query;
  const targetMonth = month || new Date().toISOString().slice(0, 7);
  const data = await getAttendanceByMonth(targetMonth);

  return res.status(200).json(
    new ApiResponse(200, data, "Monthly attendance records retrieved successfully")
  );
});

export const recordAttendance = asyncHandler(async (req, res) => {
  const { driverId, date, status, notes } = req.body;
  const result = await markAttendance({
    driverId,
    date,
    status,
    notes,
    userId: req.user._id,
  });

  return res.status(200).json(
    new ApiResponse(200, result, "Attendance recorded successfully")
  );
});

export const recordBulkAttendance = asyncHandler(async (req, res) => {
  const { date, records } = req.body;
  const result = await markBulkAttendance({
    date,
    records,
    userId: req.user._id,
  });

  return res.status(200).json(
    new ApiResponse(200, result, "Bulk attendance updated successfully")
  );
});
