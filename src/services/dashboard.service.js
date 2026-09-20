import mongoose from "mongoose";

import Vehicle from "../models/Vehicle.js";
import Driver from "../models/Driver.js";
import Inventory from "../models/Inventory.js";
import User from "../models/User.js";
import Attendance from "../models/Attendance.js";

import ApiError from "../utils/ApiError.js";
import { ROLES } from "../constants/roles.js";

const EXPIRY_FIELDS = [
  ["PUC", "pucExpiry"],
  ["Fitness", "fitnessExpiry"],
  ["Insurance", "insuranceExpiry"],
  ["Permit", "permitExpiry"],
  ["RC", "rcExpiry"],
];

const startOfToday = () => {
  const date = new Date();

  date.setUTCHours(
    0,
    0,
    0,
    0
  );

  return date;
};

const addDays = (date, days) =>
  new Date(date.getTime() + days * 86400000);

const resolveOwnerFilter = async ({
  currentUser,
  ownerId,
}) => {
  if (currentUser.role === ROLES.SUB_ADMIN) {
    return {
      owner: currentUser._id,
    };
  }

  if (currentUser.role !== ROLES.SUPER_ADMIN) {
    throw new ApiError(
      403,
      "You do not have permission to view dashboard data"
    );
  }

  // Super Admin: show all records
  if (!ownerId) {
    return {};
  }

  if (!mongoose.isValidObjectId(ownerId)) {
    throw new ApiError(
      400,
      "Invalid Sub Admin ID"
    );
  }

  const owner = await User.findOne({
    _id: ownerId,
    role: ROLES.SUB_ADMIN,
  }).select("_id");

  if (!owner) {
    throw new ApiError(
      404,
      "Sub Admin not found"
    );
  }

  return {
    owner: owner._id,
  };
};

const vehicleDateCondition = (condition) => ({
  $or: EXPIRY_FIELDS.map(([, field]) => ({
    [field]: condition,
  })),
});

export const getDashboardSummary = async ({
  currentUser,
  ownerId = null,
}) => {
  const ownerFilter = await resolveOwnerFilter({
    currentUser,
    ownerId,
  });

  const today = startOfToday();
  const in30Days = addDays(today, 30);
  const in45Days = addDays(today, 45);
  const todayDateStr = new Date().toISOString().slice(0, 10);

  const vehicleFilter = {
    ...ownerFilter,
    isDeleted: false,
  };

  const driverFilter = {
    ...ownerFilter,
    isDeleted: false,
  };

  const inventoryFilter = {
    ...ownerFilter,
    isDeleted: false,
  };

  const [
    vehicleCount,
    driverCount,
    inventoryCount,
    expiringVehicleCount,
    expiredVehicleCount,
    lowStockCount,
    lowStockItems,
    recentVehicles,
    recentDrivers,
    recentInventory,
    vehiclesWithRelevantDates,
    todayAttendanceRecords,
  ] = await Promise.all([
    Vehicle.countDocuments(vehicleFilter),

    Driver.countDocuments(driverFilter),

    Inventory.countDocuments(inventoryFilter),

    Vehicle.countDocuments({
      ...vehicleFilter,
      ...vehicleDateCondition({
        $gte: today,
        $lte: in30Days,
      }),
    }),

    Vehicle.countDocuments({
      ...vehicleFilter,
      ...vehicleDateCondition({
        $lt: today,
      }),
    }),

    Inventory.countDocuments({
      ...inventoryFilter,
      $expr: {
        $lte: [
          "$quantity",
          "$minimumStock",
        ],
      },
    }),

    Inventory.find({
      ...inventoryFilter,
      $expr: {
        $lte: [
          "$quantity",
          "$minimumStock",
        ],
      },
    })
      .select(
        "itemCode itemName quantity minimumStock unit owner updatedAt"
      )
      .sort({
        updatedAt: -1,
      })
      .limit(10)
      .lean(),

    Vehicle.find(vehicleFilter)
      .select(
        "vehicleNo type status owner createdAt updatedAt"
      )
      .sort({
        createdAt: -1,
      })
      .limit(5)
      .lean(),

    Driver.find(driverFilter)
      .select(
        "name mobile status assignedVehicle owner createdAt updatedAt"
      )
      .populate(
        "assignedVehicle",
        "vehicleNo"
      )
      .sort({
        createdAt: -1,
      })
      .limit(5)
      .lean(),

    Inventory.find(inventoryFilter)
      .select(
        "itemCode itemName quantity minimumStock unit status owner createdAt updatedAt"
      )
      .sort({
        createdAt: -1,
      })
      .limit(5)
      .lean(),

    Vehicle.find({
      ...vehicleFilter,
      ...vehicleDateCondition({
        $lte: in45Days,
      }),
    })
      .select(
        `vehicleNo owner ${EXPIRY_FIELDS
          .map(([, field]) => field)
          .join(" ")}`
      )
      .lean(),

    Attendance.find({ date: todayDateStr })
      .populate("driver", "name mobile assignedVehicle")
      .lean(),
  ]);

  // Attendance metrics computation
  let presentCount = 0;
  let absentCount = 0;
  let leaveCount = 0;
  let halfDayCount = 0;

  todayAttendanceRecords.forEach((r) => {
    if (r.status === "PRESENT") presentCount++;
    else if (r.status === "ABSENT") absentCount++;
    else if (r.status === "LEAVE") leaveCount++;
    else if (r.status === "HALF_DAY") halfDayCount++;
  });

  const unmarkedCount = Math.max(0, driverCount - todayAttendanceRecords.length);

  const documentsNeedingAttention = [];

  for (const vehicle of vehiclesWithRelevantDates) {
    for (const [document, field] of EXPIRY_FIELDS) {
      const expiryDate = vehicle[field]
        ? new Date(vehicle[field])
        : null;

      if (
        !expiryDate ||
        expiryDate > in45Days
      ) {
        continue;
      }

      const daysRemaining = Math.ceil(
        (expiryDate - today) / 86400000
      );

      documentsNeedingAttention.push({
        vehicleId: vehicle._id,
        vehicleNo: vehicle.vehicleNo,
        owner: vehicle.owner,
        document,
        expiryDate,
        daysRemaining,
        status:
          daysRemaining < 0
            ? "EXPIRED"
            : daysRemaining <= 30
              ? "EXPIRING_SOON"
              : "UPCOMING",
      });
    }
  }

  documentsNeedingAttention.sort(
    (a, b) =>
      a.daysRemaining - b.daysRemaining
  );

  return {
    generatedAt: new Date(),

    scope: {
      ownerId: ownerFilter.owner || null,
    },

    totals: {
      vehicles: vehicleCount,
      drivers: driverCount,
      inventoryItems: inventoryCount,
      vehiclesWithDocumentsExpiringIn30Days:
        expiringVehicleCount,
      vehiclesWithExpiredDocuments:
        expiredVehicleCount,
      lowStockItems: lowStockCount,
      attendance: {
        date: todayDateStr,
        present: presentCount,
        absent: absentCount,
        leave: leaveCount,
        halfDay: halfDayCount,
        unmarked: unmarkedCount,
        total: driverCount,
      },
    },

    attendanceToday: {
      date: todayDateStr,
      totalDrivers: driverCount,
      present: presentCount,
      absent: absentCount,
      leave: leaveCount,
      halfDay: halfDayCount,
      unmarked: unmarkedCount,
      records: todayAttendanceRecords.slice(0, 8).map((r) => ({
        driverId: r.driver?._id || r.driver,
        name: r.driver?.name || "Driver",
        mobile: r.driver?.mobile || "",
        status: r.status,
        notes: r.notes || "",
      })),
    },

    documentsNeedingAttention:
      documentsNeedingAttention.slice(0, 12),

    lowStockItems,

    recent: {
      vehicles: recentVehicles,
      drivers: recentDrivers,
      inventory: recentInventory,
    },
  };
};