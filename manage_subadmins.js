import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./src/models/User.js";
import { ROLES } from "./src/constants/roles.js";

dotenv.config();

const mongoUri = process.env.MONGO_URI;

async function run() {
  if (!mongoUri) {
    console.error("MONGO_URI is missing in .env");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB.");

  // 1. Fetch Super Admin
  const superAdmin = await User.findOne({ role: ROLES.SUPER_ADMIN });
  if (!superAdmin) {
    console.error("No Super Admin found.");
  }

  // 2. Remove all existing sub admins EXCEPT amit and rahul (if they exist)
  const usersBefore = await User.find({ role: ROLES.SUB_ADMIN });
  console.log(`Found ${usersBefore.length} existing Sub Admin(s):`);
  usersBefore.forEach((u) => console.log(` - ${u.name} (@${u.username}) [${u.email || "no-email"}]`));

  // Delete all sub admins whose usernames are not 'amit' and 'rahul'
  const deleteResult = await User.deleteMany({
    role: ROLES.SUB_ADMIN,
    username: { $nin: ["amit", "rahul"] },
  });
  console.log(`Deleted ${deleteResult.deletedCount} other Sub Admin(s).`);

  // 3. Ensure Amit exists
  let amit = await User.findOne({ username: "amit" });
  if (!amit) {
    amit = await User.create({
      name: "Amit",
      username: "amit",
      email: "amit@fleetledger.com",
      password: "Pass@123",
      role: ROLES.SUB_ADMIN,
      isActive: true,
      createdBy: superAdmin?._id || null,
    });
    console.log("✅ Created Sub Admin: Amit (username: amit / password: Pass@123)");
  } else {
    amit.name = "Amit";
    amit.role = ROLES.SUB_ADMIN;
    amit.isActive = true;
    amit.password = "Pass@123";
    await amit.save();
    console.log("✅ Updated Sub Admin: Amit (username: amit / password: Pass@123)");
  }

  // 4. Ensure Rahul exists
  let rahul = await User.findOne({ username: "rahul" });
  if (!rahul) {
    rahul = await User.create({
      name: "Rahul",
      username: "rahul",
      email: "rahul@fleetledger.com",
      password: "Pass@123",
      role: ROLES.SUB_ADMIN,
      isActive: true,
      createdBy: superAdmin?._id || null,
    });
    console.log("✅ Created Sub Admin: Rahul (username: rahul / password: Pass@123)");
  } else {
    rahul.name = "Rahul";
    rahul.role = ROLES.SUB_ADMIN;
    rahul.isActive = true;
    rahul.password = "Pass@123";
    await rahul.save();
    console.log("✅ Updated Sub Admin: Rahul (username: rahul / password: Pass@123)");
  }

  // 5. Print final users list
  const finalUsers = await User.find().sort({ role: 1, name: 1 });
  console.log("\n=================================");
  console.log("CURRENT USERS IN FLEET ERP DATABASE:");
  console.log("=================================");
  finalUsers.forEach((u) => {
    console.log(`• ${u.name} | Role: ${u.role} | Username: ${u.username} | Active: ${u.isActive}`);
  });
  console.log("=================================\n");

  await mongoose.disconnect();
  console.log("Done.");
}

run().catch((err) => {
  console.error("Error managing sub admins:", err);
  process.exit(1);
});
