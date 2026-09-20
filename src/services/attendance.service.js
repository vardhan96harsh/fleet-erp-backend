import Attendance from "../models/Attendance.js";
import Driver from "../models/Driver.js";
import ApiError from "../utils/ApiError.js";

export const getAttendanceByDate = async (date) => {
  if (!date) {
    throw new ApiError(400, "Date parameter (YYYY-MM-DD) is required");
  }

  // Fetch all active drivers
  const drivers = await Driver.find({ isDeleted: { $ne: true } })
    .select("name mobile status assignedVehicle")
    .populate("assignedVehicle", "vehicleNo type status")
    .sort({ name: 1 })
    .lean();

  // Fetch attendance records for this date
  const records = await Attendance.find({ date })
    .populate("markedBy", "name username")
    .lean();

  const recordMap = new Map();
  records.forEach((r) => {
    recordMap.set(String(r.driver), r);
  });

  const merged = drivers.map((d) => {
    const att = recordMap.get(String(d._id));
    return {
      driverId: d._id,
      name: d.name,
      mobile: d.mobile,
      driverStatus: d.status,
      assignedVehicle: d.assignedVehicle,
      attendanceId: att?._id || null,
      status: att?.status || "UNMARKED",
      notes: att?.notes || "",
      markedAt: att?.updatedAt || null,
    };
  });

  return {
    date,
    totalDrivers: drivers.length,
    records: merged,
  };
};

export const getAttendanceByMonth = async (month) => {
  if (!month) {
    throw new ApiError(400, "Month parameter (YYYY-MM) is required");
  }

  // Fetch all active drivers
  const drivers = await Driver.find({ isDeleted: { $ne: true } })
    .select("name mobile status assignedVehicle")
    .populate("assignedVehicle", "vehicleNo type status")
    .sort({ name: 1 })
    .lean();

  // Fetch attendance records for this month
  const records = await Attendance.find({ month })
    .select("driver date status notes")
    .lean();

  // Group by driver
  const driverAttendanceMap = new Map();
  records.forEach((r) => {
    const dId = String(r.driver);
    if (!driverAttendanceMap.has(dId)) {
      driverAttendanceMap.set(dId, {});
    }
    const day = parseInt(r.date.split("-")[2], 10);
    driverAttendanceMap.get(dId)[day] = {
      status: r.status,
      notes: r.notes,
    };
  });

  const merged = drivers.map((d) => {
    const days = driverAttendanceMap.get(String(d._id)) || {};
    let presentCount = 0;
    let absentCount = 0;
    let leaveCount = 0;
    let halfDayCount = 0;

    Object.values(days).forEach((entry) => {
      if (entry.status === "PRESENT") presentCount++;
      else if (entry.status === "ABSENT") absentCount++;
      else if (entry.status === "LEAVE") leaveCount++;
      else if (entry.status === "HALF_DAY") halfDayCount++;
    });

    return {
      driverId: d._id,
      name: d.name,
      mobile: d.mobile,
      driverStatus: d.status,
      assignedVehicle: d.assignedVehicle,
      days,
      summary: {
        present: presentCount,
        absent: absentCount,
        leave: leaveCount,
        halfDay: halfDayCount,
      },
    };
  });

  return {
    month,
    totalDrivers: drivers.length,
    drivers: merged,
  };
};

export const markAttendance = async ({ driverId, date, status, notes = "", userId }) => {
  if (!driverId || !date) {
    throw new ApiError(400, "driverId and date are required");
  }

  const month = date.slice(0, 7); // YYYY-MM

  if (status === "UNMARKED" || !status) {
    // Delete attendance record if unmarked
    await Attendance.findOneAndDelete({ driver: driverId, date });
    return { driverId, date, status: "UNMARKED" };
  }

  const validStatuses = ["PRESENT", "ABSENT", "LEAVE", "HALF_DAY"];
  if (!validStatuses.includes(status)) {
    throw new ApiError(400, `Invalid status. Must be one of: ${validStatuses.join(", ")}`);
  }

  const record = await Attendance.findOneAndUpdate(
    { driver: driverId, date },
    {
      driver: driverId,
      date,
      month,
      status,
      notes: String(notes || "").trim(),
      markedBy: userId,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return record;
};

export const markBulkAttendance = async ({ date, records = [], userId }) => {
  if (!date || !Array.isArray(records) || records.length === 0) {
    throw new ApiError(400, "date and records array are required");
  }

  const month = date.slice(0, 7);
  const validStatuses = ["PRESENT", "ABSENT", "LEAVE", "HALF_DAY"];

  const bulkOps = records.map(({ driverId, status, notes = "" }) => {
    if (status === "UNMARKED" || !status) {
      return {
        deleteOne: {
          filter: { driver: driverId, date },
        },
      };
    }

    if (!validStatuses.includes(status)) {
      throw new ApiError(400, `Invalid status ${status} for driver ${driverId}`);
    }

    return {
      updateOne: {
        filter: { driver: driverId, date },
        update: {
          $set: {
            driver: driverId,
            date,
            month,
            status,
            notes: String(notes || "").trim(),
            markedBy: userId,
          },
        },
        upsert: true,
      },
    };
  });

  const result = await Attendance.bulkWrite(bulkOps);
  return {
    date,
    affectedCount: records.length,
    result,
  };
};
