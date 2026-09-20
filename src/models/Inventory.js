import mongoose from "mongoose";

import {
  INVENTORY_LOCATION_VALUES,
} from "../constants/inventoryLocations.js";

const inventorySchema = new mongoose.Schema(
  {
    /*
    |--------------------------------------------------------------------------
    | ITEM DETAILS
    |--------------------------------------------------------------------------
    */

    itemCode: {
      type: String,
      required: [
        true,
        "Item code is required",
      ],
      trim: true,
      uppercase: true,
    },

    itemName: {
      type: String,
      required: [
        true,
        "Item name is required",
      ],
      trim: true,
      maxlength: 150,
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
    | STOCK
    |--------------------------------------------------------------------------
    */

    quantity: {
      type: Number,
      default: 0,
      min: [
        0,
        "Quantity cannot be negative",
      ],
    },

    unit: {
      type: String,
      trim: true,
      default: "PCS",
      uppercase: true,
    },

    purchaseRate: {
      type: Number,
      default: 0,
      min: [
        0,
        "Purchase rate cannot be negative",
      ],
    },

    minimumStock: {
      type: Number,
      default: 0,
      min: [
        0,
        "Minimum stock cannot be negative",
      ],
    },

    /*
    |--------------------------------------------------------------------------
    | LOCATION
    |--------------------------------------------------------------------------
    |
    | Inventory belongs to Location A or Location B.
    |
    */

    location: {
      type: String,
      required: [
        true,
        "Inventory location is required",
      ],
      enum: {
        values:
          INVENTORY_LOCATION_VALUES,
        message:
          "Location must be LOCATION_A or LOCATION_B",
      },
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | ADDITIONAL DETAILS
    |--------------------------------------------------------------------------
    */

    remarks: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: [
        "ACTIVE",
        "INACTIVE",
      ],
      default: "ACTIVE",
    },

    /*
    |--------------------------------------------------------------------------
    | AUDIT
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

    /*
    |--------------------------------------------------------------------------
    | SOFT DELETE
    |--------------------------------------------------------------------------
    */

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

/*
|--------------------------------------------------------------------------
| INDEXES
|--------------------------------------------------------------------------
*/

inventorySchema.index({
  location: 1,
  isDeleted: 1,
  createdAt: -1,
});

/*
|--------------------------------------------------------------------------
| UNIQUE ITEM CODE PER LOCATION
|--------------------------------------------------------------------------
|
| Same item code can exist once in Location A and once in Location B.
| Duplicate item code inside the same location is not allowed.
|
*/

inventorySchema.index(
  {
    location: 1,
    itemCode: 1,
  },
  {
    unique: true,

    partialFilterExpression: {
      isDeleted: false,
    },
  }
);

const Inventory = mongoose.model(
  "Inventory",
  inventorySchema
);

export default Inventory;