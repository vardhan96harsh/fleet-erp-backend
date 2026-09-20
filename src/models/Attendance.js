import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: [true, "Driver reference is required"],
      index: true,
    },

    date: {
      type: String, // Format: YYYY-MM-DD
      required: [true, "Date is required (YYYY-MM-DD)"],
      index: true,
    },

    month: {
      type: String, // Format: YYYY-MM
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["PRESENT", "ABSENT", "LEAVE", "HALF_DAY"],
      required: [true, "Attendance status is required"],
      default: "PRESENT",
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },

    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index ensuring only one attendance record per driver per calendar date
attendanceSchema.index({ driver: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model("Attendance", attendanceSchema);

export default Attendance;
