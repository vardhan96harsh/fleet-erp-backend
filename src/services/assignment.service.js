import mongoose from "mongoose";
import VehicleAssignment from "../models/VehicleAssignment.js";
import Inventory from "../models/Inventory.js";
import Vehicle from "../models/Vehicle.js";
import Driver from "../models/Driver.js";
import ApiError from "../utils/ApiError.js";
import { ROLES } from "../constants/roles.js";
import { getInventoryLocationName } from "../constants/inventoryLocations.js";

const ensureAssignmentPermission = (currentUser) => {
  const allowedRoles = [ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN];
  if (!allowedRoles.includes(currentUser.role)) {
    throw new ApiError(403, "You do not have permission to manage vehicle assignments");
  }
};

export const createAssignment = async ({ data, currentUser }) => {
  ensureAssignmentPermission(currentUser);

  const {
    vehicleId,
    inventoryItemId,
    quantity,
    location,
    assignedDate,
    driverId,
    purpose,
    remarks,
  } = data;

  if (!mongoose.isValidObjectId(vehicleId)) {
    throw new ApiError(400, "Invalid vehicle ID");
  }
  if (!mongoose.isValidObjectId(inventoryItemId)) {
    throw new ApiError(400, "Invalid inventory item ID");
  }

  // 1. Verify Vehicle
  const vehicle = await Vehicle.findOne({
    _id: vehicleId,
    isDeleted: false,
  });
  if (!vehicle) {
    throw new ApiError(404, "Vehicle not found");
  }

  // 2. Verify Inventory Item
  const inventoryItem = await Inventory.findOne({
    _id: inventoryItemId,
    isDeleted: false,
  });
  if (!inventoryItem) {
    throw new ApiError(404, "Inventory item not found");
  }

  // Check Location match
  if (inventoryItem.location !== location) {
    throw new ApiError(
      400,
      `Item '${inventoryItem.itemName}' belongs to ${getInventoryLocationName(
        inventoryItem.location
      )}, not ${getInventoryLocationName(location)}`
    );
  }

  // Check Stock Availability
  const assignQty = Number(quantity);
  if (inventoryItem.quantity < assignQty) {
    throw new ApiError(
      400,
      `Insufficient stock for '${inventoryItem.itemName}' at ${getInventoryLocationName(
        location
      )}. Available: ${inventoryItem.quantity} ${inventoryItem.unit}, Requested: ${assignQty} ${inventoryItem.unit}`
    );
  }

  // 3. Optional Driver resolution
  let driverName = "";
  let resolvedDriverId = null;
  if (driverId && mongoose.isValidObjectId(driverId)) {
    const driver = await Driver.findOne({ _id: driverId, isDeleted: false });
    if (driver) {
      resolvedDriverId = driver._id;
      driverName = driver.name;
    }
  } else if (vehicle.assignedDriver) {
    const driver = await Driver.findOne({ _id: vehicle.assignedDriver, isDeleted: false });
    if (driver) {
      resolvedDriverId = driver._id;
      driverName = driver.name;
    }
  }

  // 4. Atomically Deduct Stock from Inventory
  const updatedInventory = await Inventory.findOneAndUpdate(
    {
      _id: inventoryItemId,
      quantity: { $gte: assignQty },
    },
    {
      $inc: { quantity: -assignQty },
      updatedBy: currentUser._id,
    },
    { new: true }
  );

  if (!updatedInventory) {
    throw new ApiError(
      400,
      "Inventory stock was modified concurrently. Please retry assignment."
    );
  }

  // 5. Create Vehicle Assignment record
  const assignment = await VehicleAssignment.create({
    vehicle: vehicle._id,
    vehicleNo: vehicle.vehicleNo,
    inventoryItem: inventoryItem._id,
    itemCode: inventoryItem.itemCode,
    itemName: inventoryItem.itemName,
    category: inventoryItem.category || "",
    brand: inventoryItem.brand || "",
    size: inventoryItem.size || "",
    quantity: assignQty,
    unit: inventoryItem.unit || "PCS",
    location,
    assignedDate: assignedDate ? new Date(assignedDate) : new Date(),
    driver: resolvedDriverId,
    driverName,
    purpose: purpose || "Trip Equipment",
    remarks: remarks || "",
    status: "ASSIGNED",
    createdBy: currentUser._id,
  });

  return assignment;
};

export const getAssignments = async ({ query = {}, currentUser }) => {
  ensureAssignmentPermission(currentUser);

  const filter = { isDeleted: false };

  if (query.vehicleId && mongoose.isValidObjectId(query.vehicleId)) {
    filter.vehicle = query.vehicleId;
  }

  if (query.location && query.location !== "all") {
    filter.location = query.location;
  }

  if (query.status && query.status !== "all") {
    filter.status = query.status;
  }

  if (query.category) {
    filter.category = query.category;
  }

  if (query.startDate || query.endDate) {
    filter.assignedDate = {};
    if (query.startDate) filter.assignedDate.$gte = new Date(query.startDate);
    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      filter.assignedDate.$lte = end;
    }
  }

  if (query.search) {
    const q = query.search.trim();
    filter.$or = [
      { vehicleNo: { $regex: q, $options: "i" } },
      { itemCode: { $regex: q, $options: "i" } },
      { itemName: { $regex: q, $options: "i" } },
      { category: { $regex: q, $options: "i" } },
      { driverName: { $regex: q, $options: "i" } },
      { purpose: { $regex: q, $options: "i" } },
    ];
  }

  const assignments = await VehicleAssignment.find(filter)
    .populate("vehicle", "vehicleNo type capacity status")
    .populate("inventoryItem", "itemCode itemName category quantity unit purchaseRate")
    .populate("driver", "name mobile")
    .populate("createdBy", "name username")
    .sort({ assignedDate: -1, createdAt: -1 })
    .lean();

  return assignments;
};

export const getAssignmentsByVehicle = async ({ currentUser, location = null }) => {
  ensureAssignmentPermission(currentUser);

  const filter = { isDeleted: false, status: "ASSIGNED" };
  if (location && location !== "all") {
    filter.location = location;
  }

  const activeAssignments = await VehicleAssignment.find(filter)
    .populate("vehicle", "vehicleNo type capacity status ownership")
    .populate("inventoryItem", "itemCode itemName category unit")
    .populate("driver", "name mobile")
    .sort({ assignedDate: -1 })
    .lean();

  // Group by vehicle
  const vehicleMap = new Map();

  for (const a of activeAssignments) {
    const vId = a.vehicle?._id?.toString() || a.vehicle?.toString() || a.vehicleNo;
    if (!vehicleMap.has(vId)) {
      vehicleMap.set(vId, {
        vehicle: a.vehicle || { _id: vId, vehicleNo: a.vehicleNo },
        vehicleNo: a.vehicleNo,
        itemsCount: 0,
        items: [],
      });
    }

    const entry = vehicleMap.get(vId);
    const activeQty = Math.max(0, Number(a.quantity) - Number(a.returnedQuantity || 0));
    entry.itemsCount += activeQty;
    entry.items.push({
      ...a,
      activeQuantity: activeQty,
    });
  }

  return Array.from(vehicleMap.values());
};

export const getAssignmentById = async ({ id, currentUser }) => {
  ensureAssignmentPermission(currentUser);

  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, "Invalid assignment ID");
  }

  const assignment = await VehicleAssignment.findOne({
    _id: id,
    isDeleted: false,
  })
    .populate("vehicle")
    .populate("inventoryItem")
    .populate("driver")
    .populate("createdBy", "name username");

  if (!assignment) {
    throw new ApiError(404, "Vehicle assignment record not found");
  }

  return assignment;
};

export const updateAssignment = async ({ id, data, currentUser }) => {
  ensureAssignmentPermission(currentUser);

  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, "Invalid assignment ID");
  }

  const assignment = await VehicleAssignment.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!assignment) {
    throw new ApiError(404, "Assignment record not found");
  }

  // Handle Quantity adjustment if changing
  if (data.quantity !== undefined && Number(data.quantity) !== assignment.quantity) {
    const newQty = Number(data.quantity);
    const qtyDiff = newQty - assignment.quantity; // If positive, need more from inventory

    if (qtyDiff > 0) {
      // Need more stock from warehouse
      const updatedInventory = await Inventory.findOneAndUpdate(
        {
          _id: assignment.inventoryItem,
          quantity: { $gte: qtyDiff },
        },
        {
          $inc: { quantity: -qtyDiff },
          updatedBy: currentUser._id,
        },
        { new: true }
      );

      if (!updatedInventory) {
        throw new ApiError(
          400,
          `Cannot increase assigned quantity by ${qtyDiff}. Insufficient warehouse stock.`
        );
      }
    } else if (qtyDiff < 0) {
      // Returning excess quantity back to inventory
      const refundQty = Math.abs(qtyDiff);
      await Inventory.findByIdAndUpdate(assignment.inventoryItem, {
        $inc: { quantity: refundQty },
        updatedBy: currentUser._id,
      });
    }

    assignment.quantity = newQty;
  }

  if (data.assignedDate) assignment.assignedDate = new Date(data.assignedDate);
  if (data.driverId !== undefined) {
    assignment.driver = data.driverId || null;
    if (data.driverId) {
      const d = await Driver.findById(data.driverId);
      if (d) assignment.driverName = d.name;
    }
  }
  if (data.purpose !== undefined) assignment.purpose = data.purpose;
  if (data.remarks !== undefined) assignment.remarks = data.remarks;
  if (data.status !== undefined) assignment.status = data.status;

  assignment.updatedBy = currentUser._id;
  await assignment.save();

  return assignment;
};

export const returnAssignment = async ({ id, data = {}, currentUser }) => {
  ensureAssignmentPermission(currentUser);

  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, "Invalid assignment ID");
  }

  const assignment = await VehicleAssignment.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!assignment) {
    throw new ApiError(404, "Assignment record not found");
  }

  if (assignment.status === "RETURNED") {
    throw new ApiError(400, "This item has already been marked as returned");
  }

  const rawReturnQty = data.returnedQuantity !== undefined ? data.returnedQuantity : data.returnQuantity;
  const unreturnedBefore = Math.max(0, assignment.quantity - (assignment.returnedQuantity || 0));
  const returnQty = rawReturnQty !== undefined ? Number(rawReturnQty) : unreturnedBefore;

  if (returnQty <= 0 || returnQty > unreturnedBefore) {
    throw new ApiError(
      400,
      `Returned quantity must be between 1 and ${unreturnedBefore}`
    );
  }

  // Restore returned stock to warehouse Inventory
  await Inventory.findByIdAndUpdate(assignment.inventoryItem, {
    $inc: { quantity: returnQty },
    updatedBy: currentUser._id,
  });

  const totalReturned = (assignment.returnedQuantity || 0) + returnQty;
  assignment.returnedQuantity = totalReturned;
  assignment.returnedDate = new Date();
  assignment.remarks = data.remarks || data.returnNotes || assignment.remarks;
  assignment.status = totalReturned >= assignment.quantity ? "RETURNED" : "ASSIGNED";
  if (data.remarks) {
    assignment.remarks = assignment.remarks
      ? `${assignment.remarks} | Return Note: ${data.remarks}`
      : `Return Note: ${data.remarks}`;
  }
  assignment.updatedBy = currentUser._id;
  await assignment.save();

  return assignment;
};

export const deleteAssignment = async ({ id, currentUser }) => {
  ensureAssignmentPermission(currentUser);

  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, "Invalid assignment ID");
  }

  const assignment = await VehicleAssignment.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!assignment) {
    throw new ApiError(404, "Assignment record not found");
  }

  // If item was still assigned (not returned), refund the active quantity back to warehouse inventory
  if (assignment.status === "ASSIGNED") {
    const unreturnedQty = assignment.quantity - (assignment.returnedQuantity || 0);
    if (unreturnedQty > 0) {
      await Inventory.findByIdAndUpdate(assignment.inventoryItem, {
        $inc: { quantity: unreturnedQty },
        updatedBy: currentUser._id,
      });
    }
  }

  assignment.isDeleted = true;
  assignment.deletedAt = new Date();
  assignment.deletedBy = currentUser._id;
  await assignment.save();

  return { success: true, message: "Assignment deleted and inventory stock restored" };
};
