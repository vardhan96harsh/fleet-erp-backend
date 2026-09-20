import mongoose from "mongoose";

const driverSchema = new mongoose.Schema(
  {
    /*
    |--------------------------------------------------------------------------
    | BASIC DETAILS
    |--------------------------------------------------------------------------
    */

    name: {
      type: String,
      required: [
        true,
        "Driver name is required",
      ],
      trim: true,
      maxlength: 100,
    },

    mobile: {
      type: String,
      trim: true,
      default: null,
    },

    licenceNo: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    licenceExpiry: {
      type: Date,
      default: null,
    },

    joiningDate: {
      type: Date,
      default: null,
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
        "ON_LEAVE",
      ],
      default: "ACTIVE",
    },

    /*
    |--------------------------------------------------------------------------
    | ASSIGNED VEHICLE
    |--------------------------------------------------------------------------
    |
    | Driver is the source of truth for vehicle assignment.
    | All drivers can use vehicles from the common vehicle list.
    |
    */

    assignedVehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      default: null,
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

driverSchema.index({
  isDeleted: 1,
  createdAt: -1,
});

/*
|--------------------------------------------------------------------------
| GLOBAL UNIQUE MOBILE
|--------------------------------------------------------------------------
|
| The same mobile number cannot be used by multiple active drivers.
| Null mobile values are not included.
|
*/

driverSchema.index(
  {
    mobile: 1,
  },
  {
    unique: true,

    partialFilterExpression: {
      isDeleted: false,

      mobile: {
        $type: "string",
      },
    },
  }
);

/*
|--------------------------------------------------------------------------
| ONE VEHICLE → ONE ACTIVE DRIVER
|--------------------------------------------------------------------------
|
| A common vehicle can be assigned to only one active driver record.
|
*/

driverSchema.index(
  {
    assignedVehicle: 1,
  },
  {
    unique: true,

    partialFilterExpression: {
      isDeleted: false,

      assignedVehicle: {
        $type: "objectId",
      },
    },
  }
);

const Driver = mongoose.model(
  "Driver",
  driverSchema
);

export default Driver;