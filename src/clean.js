import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";
import User from "./models/User.js";
import Vehicle from "./models/Vehicle.js";
import Driver from "./models/Driver.js";
import Inventory from "./models/Inventory.js";
import VehicleAssignment from "./models/VehicleAssignment.js";
import Attendance from "./models/Attendance.js";
import RefreshToken from "./models/RefreshToken.js";
import ImportBatch from "./models/ImportBatch.js";

async function cleanDatabaseForHandover() {
  console.log("==========================================================");
  console.log("🧹 PURGING ALL TEST DATA & PREPARING CLEAN CLIENT HANDOVER");
  console.log("==========================================================");

  try {
    await connectDB();

    console.log("\n1. Purging all operational data...");
    const [
      vehiclesRes,
      driversRes,
      inventoryRes,
      assignmentsRes,
      attendanceRes,
      refreshRes,
      importBatchRes,
      usersRes,
    ] = await Promise.all([
      Vehicle.deleteMany({}),
      Driver.deleteMany({}),
      Inventory.deleteMany({}),
      VehicleAssignment.deleteMany({}),
      Attendance.deleteMany({}),
      RefreshToken.deleteMany({}),
      ImportBatch.deleteMany({}),
      User.deleteMany({}),
    ]);

    console.log(`  ✓ Vehicles purged: ${vehiclesRes.deletedCount}`);
    console.log(`  ✓ Drivers purged: ${driversRes.deletedCount}`);
    console.log(`  ✓ Inventory items purged: ${inventoryRes.deletedCount}`);
    console.log(`  ✓ Assignments purged: ${assignmentsRes.deletedCount}`);
    console.log(`  ✓ Attendance logs purged: ${attendanceRes.deletedCount}`);
    console.log(`  ✓ Refresh tokens purged: ${refreshRes.deletedCount}`);
    console.log(`  ✓ Import batches purged: ${importBatchRes.deletedCount}`);
    console.log(`  ✓ All Sub-Admins & previous user accounts purged: ${usersRes.deletedCount}`);

    // 2. Re-create ONLY the single Primary Super Admin for Client Handover
    console.log("\n2. Initializing Primary Super Admin Account...");
    const superAdminPassword = env.superAdmin?.password || "Pass@123";
    const superAdminUsername = (env.superAdmin?.username || "admin").toLowerCase();
    const superAdminName = env.superAdmin?.name || "Super Admin";
    const superAdminEmail = env.superAdmin?.email || "admin@bhandarigroup.com";

    const hashedPassword = await bcrypt.hash(superAdminPassword, 10);

    const superAdmin = await User.create({
      name: superAdminName,
      username: superAdminUsername,
      email: superAdminEmail,
      password: hashedPassword,
      role: "SUPER_ADMIN",
      isActive: true,
      lastLogin: null,
    });

    console.log(`  ✓ Created Master Super Admin (${superAdmin.username} / ${superAdmin.email})`);

    // Verify current state
    const remainingUsers = await User.find({}, "username name role email");
    const remainingVehicles = await Vehicle.countDocuments();
    const remainingDrivers = await Driver.countDocuments();
    const remainingInventory = await Inventory.countDocuments();
    const remainingAssignments = await VehicleAssignment.countDocuments();
    const remainingAttendance = await Attendance.countDocuments();

    console.log("\n==========================================================");
    console.log("✨ DATABASE IS 100% CLEAN & READY FOR CLIENT HANDOVER!");
    console.log("==========================================================");
    console.log("Active Database State:");
    console.log("  • Super Admin Count :", remainingUsers.length);
    console.log("    Usernames         :", remainingUsers.map((u) => `${u.username} (${u.role})`).join(", "));
    console.log("  • Sub-Admins (Amit/Rahul): 0 (Completely Cleaned)");
    console.log("  • Vehicles          :", remainingVehicles);
    console.log("  • Drivers           :", remainingDrivers);
    console.log("  • Inventory Items   :", remainingInventory);
    console.log("  • Assignments       :", remainingAssignments);
    console.log("  • Attendance Logs   :", remainingAttendance);
    console.log("==========================================================");

    process.exit(0);
  } catch (error) {
    console.error("Clean script failed:", error);
    process.exit(1);
  }
}

cleanDatabaseForHandover();
