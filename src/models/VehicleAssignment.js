import mongoose from "mongoose";
import { INVENTORY_LOCATION_VALUES } from "../constants/inventoryLocations.js";

const vehicleAssignmentSchema = new mongoose.Schema(
  {
    /*
    |--------------------------------------------------------------------------
    | VEHICLE & PRODUCT IDENTIFICATION
    |--------------------------------------------------------------------------
    */

    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: [true, "Vehicle is required"],
      index: true,
    },

    vehicleNo: {
      type: String,
      required: [true, "Vehicle number is required"],
      trim: true,
      uppercase: true,
      index: true,
    },

    inventoryItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inventory",
      required: [true, "Inventory item is required"],
      index: true,
    },

    itemCode: {
      type: String,
      required: [true, "Product code is required"],
      trim: true,
      uppercase: true,
    },

    itemName: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },

    category: {
      type: String,
      trim: true,
      default: "",
    },

    brand: {
      type: String,
      trim: true,
      default: "",
    },

    size: {
      type: String,
      trim: true,
      default: "",
    },

    /*
    |--------------------------------------------------------------------------
    | QUANTITY & WAREHOUSE LOCATION
    |--------------------------------------------------------------------------
    */

    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [0.01, "Quantity must be greater than zero"],
    },

    unit: {
      type: String,
      trim: true,
      default: "PCS",
      uppercase: true,
    },

    location: {
      type: String,
      required: [true, "Warehouse location is required"],
      enum: {
        values: INVENTORY_LOCATION_VALUES,
        message: "Location must be LOCATION_A (Vidisha) or LOCATION_B (Manawar)",
      },
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | ASSIGNMENT DETAILS
    |--------------------------------------------------------------------------
    */

    assignedDate: {
      type: Date,
      required: [true, "Assignment date is required"],
      default: Date.now,
      index: true,
    },

    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      default: null,
    },

    driverName: {
      type: String,
      trim: true,
      default: "",
    },

    purpose: {
      type: String,
      trim: true,
      default: "Trip Equipment",
    },

    remarks: {
      type: String,
      trim: true,
      default: "",
    },

    /*
    |--------------------------------------------------------------------------
    | STATUS & RETURN TRACKING
    |--------------------------------------------------------------------------
    */

    status: {
      type: String,
      enum: ["ASSIGNED", "RETURNED", "CONSUMED"],
      default: "ASSIGNED",
      index: true,
    },

    returnedDate: {
      type: Date,
      default: null,
    },

    returnedQuantity: {
      type: Number,
      default: 0,
      min: [0, "Returned quantity cannot be negative"],
    },

    /*
    |--------------------------------------------------------------------------
    | AUDIT & SOFT DELETE
    |--------------------------------------------------------------------------
    */

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

vehicleAssignmentSchema.index({ vehicle: 1, isDeleted: 1, createdAt: -1 });
vehicleAssignmentSchema.index({ location: 1, isDeleted: 1, createdAt: -1 });
vehicleAssignmentSchema.index({ inventoryItem: 1, isDeleted: 1 });

const VehicleAssignment = mongoose.model(
  "VehicleAssignment",
  vehicleAssignmentSchema
);

export default VehicleAssignment;
