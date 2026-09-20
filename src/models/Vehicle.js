import mongoose from "mongoose";

/*
|--------------------------------------------------------------------------
| SERVICE HISTORY SUB-SCHEMA
|--------------------------------------------------------------------------
*/

const serviceHistorySchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: [true, "Service date is required"],
    },

    description: {
      type: String,
      required: [
        true,
        "Service description is required",
      ],
      trim: true,
      maxlength: 1000,
    },
  },
  {
    _id: true,
  }
);

/*
|--------------------------------------------------------------------------
| ACCIDENT REPORT SUB-SCHEMA
|--------------------------------------------------------------------------
*/

const accidentReportSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: [true, "Accident date is required"],
    },

    description: {
      type: String,
      required: [
        true,
        "Accident description is required",
      ],
      trim: true,
      maxlength: 1000,
    },
  },
  {
    _id: true,
  }
);

/*
|--------------------------------------------------------------------------
| VEHICLE SCHEMA
|--------------------------------------------------------------------------
*/

const vehicleSchema = new mongoose.Schema(
  {
    vehicleNo: {
      type: String,
      required: [
        true,
        "Vehicle number is required",
      ],
      trim: true,
      uppercase: true,
    },

    type: {
      type: String,
      trim: true,
      default: "",
    },

    capacity: {
      type: String,
      trim: true,
      default: "",
    },

    ownership: {
      type: String,
      trim: true,
      default: "",
    },

    ownerName: {
      type: String,
      trim: true,
      default: "",
    },

    ownerMobile: {
      type: String,
      trim: true,
      default: "",
    },

    /*
    |--------------------------------------------------------------------------
    | DOCUMENT EXPIRY
    |--------------------------------------------------------------------------
    */

    pucExpiry: {
      type: Date,
      default: null,
    },

    fitnessExpiry: {
      type: Date,
      default: null,
    },

    insuranceExpiry: {
      type: Date,
      default: null,
    },

    permitExpiry: {
      type: Date,
      default: null,
    },

    rcNumber: {
      type: String,
      trim: true,
      default: "",
    },

    rcExpiry: {
      type: Date,
      default: null,
    },

    /*
    |--------------------------------------------------------------------------
    | SERVICE HISTORY
    |--------------------------------------------------------------------------
    */

    serviceHistory: {
      type: [serviceHistorySchema],
      default: [],
    },

    /*
    |--------------------------------------------------------------------------
    | ACCIDENT REPORTS
    |--------------------------------------------------------------------------
    */

    accidentReports: {
      type: [accidentReportSchema],
      default: [],
    },

    /*
    |--------------------------------------------------------------------------
    | STATUS
    |--------------------------------------------------------------------------
    */

    status: {
      type: String,
      enum: [
        "ACTIVE",
        "INACTIVE",
        "UNDER_SERVICE",
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

vehicleSchema.index({
  isDeleted: 1,
  createdAt: -1,
});

/*
|--------------------------------------------------------------------------
| GLOBAL UNIQUE VEHICLE NUMBER
|--------------------------------------------------------------------------
|
| The same vehicle number cannot be created by another Admin or Sub Admin.
|
*/

vehicleSchema.index(
  {
    vehicleNo: 1,
  },
  {
    unique: true,

    partialFilterExpression: {
      isDeleted: false,
    },
  }
);

const Vehicle = mongoose.model(
  "Vehicle",
  vehicleSchema
);

export default Vehicle;