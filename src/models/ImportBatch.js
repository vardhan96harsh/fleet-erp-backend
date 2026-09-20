import mongoose from "mongoose";

import {
  INVENTORY_LOCATION_VALUES,
} from "../constants/inventoryLocations.js";

const importRowSchema = new mongoose.Schema(
  {
    rowNumber: {
      type: Number,
      required: true,
    },

    action: {
      type: String,
      enum: [
        "NEW",
        "UPDATE",
        "UNCHANGED",
        "INVALID",
      ],
      required: true,
    },

    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    changes: {
      type: [String],
      default: [],
    },

    reason: {
      type: String,
      default: "",
    },
  },
  {
    _id: false,
  }
);

const importBatchSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "VEHICLE",
        "DRIVER",
        "INVENTORY",
      ],
      required: true,
    },

    /*
    | Inventory imports require a location.
    | Vehicle and driver imports are common.
    */

    location: {
      type: String,
      enum: [
        ...INVENTORY_LOCATION_VALUES,
        null,
      ],
      default: null,

      required: function () {
        return this.type === "INVENTORY";
      },

      validate: {
        validator: function (value) {
          if (this.type === "INVENTORY") {
            return INVENTORY_LOCATION_VALUES.includes(
              value
            );
          }

          return value == null;
        },
        message:
          "Inventory imports require LOCATION_A or LOCATION_B. Vehicle and driver imports must not specify a location.",
      },
    },

    /*
    | Tracks who uploaded the file.
    | This is an audit field, not a business-data owner.
    */

    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    originalFileName: {
      type: String,
      default: "",
    },

    rows: {
      type: [importRowSchema],
      default: [],
    },

    summary: {
      newCount: {
        type: Number,
        default: 0,
      },

      updateCount: {
        type: Number,
        default: 0,
      },

      unchangedCount: {
        type: Number,
        default: 0,
      },

      invalidCount: {
        type: Number,
        default: 0,
      },
    },

    confirmedAt: {
      type: Date,
      default: null,
    },

    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

/*
| Automatically removes expired preview batches.
| Imported business records are unaffected.
*/

importBatchSchema.index(
  {
    expiresAt: 1,
  },
  {
    expireAfterSeconds: 0,
  }
);

const ImportBatch = mongoose.model(
  "ImportBatch",
  importBatchSchema
);

export default ImportBatch;