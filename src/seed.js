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

async function seedDatabase() {
  console.log("==========================================================");
  console.log("🧹 CLEANING DATABASE AND SEEDING PRODUCTION-READY DATA");
  console.log("==========================================================");

  try {
    await connectDB();

    console.log("\n1. Purging old collection records...");
    await Promise.all([
      User.deleteMany({}),
      Vehicle.deleteMany({}),
      Driver.deleteMany({}),
      Inventory.deleteMany({}),
      VehicleAssignment.deleteMany({}),
      Attendance.deleteMany({}),
      RefreshToken.deleteMany({}),
      ImportBatch.deleteMany({}),
    ]);
    console.log("  ✓ All collections purged cleanly.");

    // 2. Create Users (Super Admin + ONLY Amit & Rahul as Sub Admins)
    console.log("\n2. Creating Admin Accounts...");
    const hashedPassword = await bcrypt.hash("Pass@123", 10);

    const superAdmin = await User.create({
      name: "Super Admin",
      username: "admin",
      email: "admin@fleet.local",
      password: "Pass@123", // Pre-save hook hashes password
      role: "SUPER_ADMIN",
    });

    const subAdminAmit = await User.create({
      name: "Amit Sharma",
      username: "amit",
      email: "amit@fleet.local",
      password: "Pass@123",
      role: "SUB_ADMIN",
    });

    const subAdminRahul = await User.create({
      name: "Rahul Verma",
      username: "rahul",
      email: "rahul@fleet.local",
      password: "Pass@123",
      role: "SUB_ADMIN",
    });

    console.log("  ✓ Created Super Admin (admin)");
    console.log("  ✓ Created Sub Admin (amit)");
    console.log("  ✓ Created Sub Admin (rahul)");

    // 3. Create Commercial Fleet Vehicles
    console.log("\n3. Creating Commercial Fleet Vehicles...");
    const now = new Date();
    const addDays = (days) => new Date(now.getTime() + days * 86400000);

    const vehiclesData = [
      {
        vehicleNo: "MP-09-HH-4521",
        type: "TATA SIGNA 4825.TK",
        capacity: "40 TON (Multi-Axle)",
        ownership: "OWNED",
        ownerName: "Fleet Logistics Ltd",
        ownerMobile: "9826011111",
        pucExpiry: addDays(180),
        fitnessExpiry: addDays(240),
        insuranceExpiry: addDays(300),
        permitExpiry: addDays(365),
        permitType: "NATIONAL",
        rcNumber: "RC-MP09-4521",
        rcExpiry: addDays(700),
        status: "ACTIVE",
        serviceHistory: [
          { date: addDays(-45), description: "Periodic 40,000km Major Service & Brake Fluid Replacement" },
          { date: addDays(-120), description: "New 12R22.5 Tubeless Tyres Installed (Rear Axle)" },
        ],
        createdBy: superAdmin._id,
      },
      {
        vehicleNo: "MP-09-HH-8812",
        type: "ASHOK LEYLAND 2820",
        capacity: "25 TON (Tipper)",
        ownership: "OWNED",
        ownerName: "Fleet Logistics Ltd",
        ownerMobile: "9826011111",
        pucExpiry: addDays(120),
        fitnessExpiry: addDays(190),
        insuranceExpiry: addDays(250),
        permitExpiry: addDays(310),
        permitType: "NATIONAL",
        rcNumber: "RC-MP09-8812",
        rcExpiry: addDays(650),
        status: "ACTIVE",
        serviceHistory: [
          { date: addDays(-30), description: "Engine Oil & Filter change (15W-40 CI-4)" },
        ],
        createdBy: superAdmin._id,
      },
      {
        vehicleNo: "MP-04-HE-1904",
        type: "BHARATBENZ 3528C",
        capacity: "35 TON (Heavy Haul)",
        ownership: "OWNED",
        ownerName: "Fleet Logistics Ltd",
        ownerMobile: "9826011111",
        pucExpiry: addDays(90),
        fitnessExpiry: addDays(150),
        insuranceExpiry: addDays(210),
        permitExpiry: addDays(280),
        permitType: "NATIONAL",
        rcNumber: "RC-MP04-1904",
        rcExpiry: addDays(600),
        status: "ACTIVE",
        serviceHistory: [
          { date: addDays(-60), description: "Hydraulic Tipper Cylinder Overhaul & Greasing" },
        ],
        createdBy: superAdmin._id,
      },
      {
        vehicleNo: "MP-04-HE-3351",
        type: "EICHER PRO 6028",
        capacity: "28 TON (Container)",
        ownership: "LEASED",
        ownerName: "Shree Ram Transport Services",
        ownerMobile: "9826022222",
        pucExpiry: addDays(60),
        fitnessExpiry: addDays(110),
        insuranceExpiry: addDays(18), // Expiring soon for badge testing
        permitExpiry: addDays(200),
        permitType: "NATIONAL",
        rcNumber: "RC-MP04-3351",
        rcExpiry: addDays(550),
        status: "ACTIVE",
        serviceHistory: [
          { date: addDays(-15), description: "Brake Lining & Air Tank Purge" },
        ],
        createdBy: superAdmin._id,
      },
      {
        vehicleNo: "MP-40-HA-7701",
        type: "TATA PRIMA 5530.S",
        capacity: "55 TON (Articulated Trailer)",
        ownership: "OWNED",
        ownerName: "Fleet Logistics Ltd",
        ownerMobile: "9826011111",
        pucExpiry: addDays(150),
        fitnessExpiry: addDays(210),
        insuranceExpiry: addDays(270),
        permitExpiry: addDays(330),
        permitType: "NATIONAL",
        rcNumber: "RC-MP40-7701",
        rcExpiry: addDays(720),
        status: "ACTIVE",
        serviceHistory: [
          { date: addDays(-90), description: "Fifth Wheel Coupling Service & Kingpin Replacement" },
        ],
        createdBy: superAdmin._id,
      },
      {
        vehicleNo: "MP-40-HA-9042",
        type: "ASHOK LEYLAND CAPTAIN 40i",
        capacity: "40 TON (Trailer)",
        ownership: "LEASED",
        ownerName: "Malwa Carriers Pvt Ltd",
        ownerMobile: "9826033333",
        pucExpiry: addDays(75),
        fitnessExpiry: addDays(22), // Expiring soon
        insuranceExpiry: addDays(180),
        permitExpiry: addDays(240),
        permitType: "NATIONAL",
        rcNumber: "RC-MP40-9042",
        rcExpiry: addDays(580),
        status: "ACTIVE",
        serviceHistory: [
          { date: addDays(-20), description: "Clutch Plate & Pressure Assembly Renewal" },
        ],
        createdBy: superAdmin._id,
      },
      {
        vehicleNo: "MP-09-GG-6120",
        type: "TATA LPT 1918 COWL",
        capacity: "19 TON (Cargo Truck)",
        ownership: "OWNED",
        ownerName: "Fleet Logistics Ltd",
        ownerMobile: "9826011111",
        pucExpiry: addDays(130),
        fitnessExpiry: addDays(170),
        insuranceExpiry: addDays(220),
        permitExpiry: addDays(300),
        permitType: "STATE",
        rcNumber: "RC-MP09-6120",
        rcExpiry: addDays(610),
        status: "ACTIVE",
        serviceHistory: [
          { date: addDays(-40), description: "Hub Greasing & Suspension Leaf Bushing Kit" },
        ],
        createdBy: superAdmin._id,
      },
      {
        vehicleNo: "MP-04-AB-5198",
        type: "EICHER PRO 3019",
        capacity: "19 TON (Box Body)",
        ownership: "OWNED",
        ownerName: "Fleet Logistics Ltd",
        ownerMobile: "9826011111",
        pucExpiry: addDays(110),
        fitnessExpiry: addDays(160),
        insuranceExpiry: addDays(210),
        permitExpiry: addDays(290),
        permitType: "STATE",
        rcNumber: "RC-MP04-5198",
        rcExpiry: addDays(630),
        status: "ACTIVE",
        serviceHistory: [
          { date: addDays(-70), description: "Full Electrical Wiring & LED Tail Lamp Update" },
        ],
        createdBy: superAdmin._id,
      },
      {
        vehicleNo: "MP-40-HB-1102",
        type: "MAHINDRA BLAZO X 35",
        capacity: "35 TON (Multi-Axle)",
        ownership: "ATTACHED",
        ownerName: "Narmada Freightways",
        ownerMobile: "9826044444",
        pucExpiry: addDays(-5), // Expired PUC for badge testing
        fitnessExpiry: addDays(140),
        insuranceExpiry: addDays(190),
        permitExpiry: addDays(260),
        permitType: "NATIONAL",
        rcNumber: "RC-MP40-1102",
        rcExpiry: addDays(500),
        status: "ACTIVE",
        serviceHistory: [
          { date: addDays(-10), description: "Diesel Injector Ultrasonic Cleaning" },
        ],
        createdBy: superAdmin._id,
      },
      {
        vehicleNo: "MP-09-JK-2345",
        type: "TATA ULTRA T.16",
        capacity: "16 TON (Medium Cargo)",
        ownership: "OWNED",
        ownerName: "Fleet Logistics Ltd",
        ownerMobile: "9826011111",
        pucExpiry: addDays(140),
        fitnessExpiry: addDays(200),
        insuranceExpiry: addDays(260),
        permitExpiry: addDays(320),
        permitType: "STATE",
        rcNumber: "RC-MP09-2345",
        rcExpiry: addDays(680),
        status: "ACTIVE",
        serviceHistory: [
          { date: addDays(-50), description: "Routine 20,000km Lubrication & Air Filter Clean" },
        ],
        createdBy: superAdmin._id,
      },
    ];

    const vehicles = await Vehicle.insertMany(vehiclesData);
    console.log(`  ✓ Created ${vehicles.length} Commercial Fleet Vehicles.`);

    // 4. Create Drivers
    console.log("\n4. Creating Drivers & Assigning Vehicles...");
    const driversData = [
      {
        name: "Ramesh Kumar",
        driverId: "DRV-101",
        fatherName: "Suresh Kumar",
        mobile: "9826011223",
        licenceNo: "MP-09-20150012345",
        licenceExpiry: addDays(350),
        joiningDate: addDays(-400),
        status: "ACTIVE",
        assignedVehicle: vehicles[0]._id, // MP-09-HH-4521
        createdBy: superAdmin._id,
      },
      {
        name: "Suresh Yadav",
        driverId: "DRV-102",
        fatherName: "Ramswaroop Yadav",
        mobile: "9826022334",
        licenceNo: "MP-09-20160023456",
        licenceExpiry: addDays(400),
        joiningDate: addDays(-350),
        status: "ACTIVE",
        assignedVehicle: vehicles[1]._id, // MP-09-HH-8812
        createdBy: superAdmin._id,
      },
      {
        name: "Mukesh Sharma",
        driverId: "DRV-103",
        fatherName: "Gopal Sharma",
        mobile: "9826033445",
        licenceNo: "MP-04-20170034567",
        licenceExpiry: addDays(280),
        joiningDate: addDays(-300),
        status: "ACTIVE",
        assignedVehicle: vehicles[2]._id, // MP-04-HE-1904
        createdBy: superAdmin._id,
      },
      {
        name: "Dharmendra Singh",
        driverId: "DRV-104",
        fatherName: "Balwant Singh",
        mobile: "9826044556",
        licenceNo: "MP-04-20180045678",
        licenceExpiry: addDays(21), // Expiring soon for licence badge testing
        joiningDate: addDays(-250),
        status: "ACTIVE",
        assignedVehicle: vehicles[3]._id, // MP-04-HE-3351
        createdBy: superAdmin._id,
      },
      {
        name: "Vikram Patel",
        driverId: "DRV-105",
        fatherName: "Hariram Patel",
        mobile: "9826055667",
        licenceNo: "MP-40-20190056789",
        licenceExpiry: addDays(420),
        joiningDate: addDays(-200),
        status: "ACTIVE",
        assignedVehicle: vehicles[4]._id, // MP-40-HA-7701
        createdBy: superAdmin._id,
      },
      {
        name: "Rajesh Verma",
        driverId: "DRV-106",
        fatherName: "Kailash Verma",
        mobile: "9826066778",
        licenceNo: "MP-40-20200067890",
        licenceExpiry: addDays(310),
        joiningDate: addDays(-180),
        status: "ACTIVE",
        assignedVehicle: vehicles[5]._id, // MP-40-HA-9042
        createdBy: superAdmin._id,
      },
      {
        name: "Sunil Chouhan",
        driverId: "DRV-107",
        fatherName: "Ratan Chouhan",
        mobile: "9826077889",
        licenceNo: "MP-09-20210078901",
        licenceExpiry: addDays(500),
        joiningDate: addDays(-120),
        status: "ACTIVE",
        assignedVehicle: vehicles[6]._id, // MP-09-GG-6120
        createdBy: superAdmin._id,
      },
      {
        name: "Manoj Ahirwar",
        driverId: "DRV-108",
        fatherName: "Bhagwandas Ahirwar",
        mobile: "9826088990",
        licenceNo: "MP-04-20220089012",
        licenceExpiry: addDays(480),
        joiningDate: addDays(-90),
        status: "ACTIVE",
        assignedVehicle: vehicles[7]._id, // MP-04-AB-5198
        createdBy: superAdmin._id,
      },
      {
        name: "Deepak Soni",
        driverId: "DRV-109",
        fatherName: "Om Prakash Soni",
        mobile: "9826099001",
        licenceNo: "MP-40-20230090123",
        licenceExpiry: addDays(600),
        joiningDate: addDays(-60),
        status: "ACTIVE",
        assignedVehicle: null, // Floating Pool (Unassigned)
        createdBy: superAdmin._id,
      },
      {
        name: "Kamal Joshi",
        driverId: "DRV-110",
        fatherName: "Narayan Joshi",
        mobile: "9826100112",
        licenceNo: "MP-09-20240101234",
        licenceExpiry: addDays(700),
        joiningDate: addDays(-30),
        status: "ON_LEAVE",
        assignedVehicle: null, // Floating Pool (Unassigned)
        createdBy: superAdmin._id,
      },
    ];

    const drivers = await Driver.insertMany(driversData);
    console.log(`  ✓ Created ${drivers.length} Drivers (8 Assigned to Trucks, 2 in Floating Pool).`);

    // 5. Create Inventory Warehouse Items (Vidisha & Manawar)
    console.log("\n5. Creating Warehouse Inventory Items...");
    const inventoryData = [
      // VIDISHA WAREHOUSE (LOCATION_A)
      {
        itemCode: "TRP-VID-001",
        itemName: "Heavy Duty Waterproof Tarpaulin (18x24 ft)",
        category: "Tripal / Tarpaulin",
        brand: "Silpaulin",
        size: "18 x 24 ft (250 GSM)",
        quantity: 25,
        unit: "PCS",
        purchaseRate: 2400,
        minimumStock: 5,
        location: "LOCATION_A",
        remarks: "100% waterproof UV-stabilized heavy duty cargo protection",
        status: "ACTIVE",
        createdBy: superAdmin._id,
      },
      {
        itemCode: "TRP-VID-002",
        itemName: "Cross-Laminated Silpaulin Tripal (24x36 ft)",
        category: "Tripal / Tarpaulin",
        brand: "Supreme",
        size: "24 x 36 ft (300 GSM)",
        quantity: 18,
        unit: "PCS",
        purchaseRate: 4200,
        minimumStock: 4,
        location: "LOCATION_A",
        remarks: "Large articulated container cover for monsoon long-haul",
        status: "ACTIVE",
        createdBy: superAdmin._id,
      },
      {
        itemCode: "TRP-VID-003",
        itemName: "Heavy Multi-Purpose HDPE Tarpaulin (15x18 ft)",
        category: "Tripal / Tarpaulin",
        brand: "Tiger",
        size: "15 x 18 ft (200 GSM)",
        quantity: 30,
        unit: "PCS",
        purchaseRate: 1600,
        minimumStock: 6,
        location: "LOCATION_A",
        remarks: "General weather covering for tipper and open body trucks",
        status: "ACTIVE",
        createdBy: superAdmin._id,
      },
      {
        itemCode: "JCK-VID-001",
        itemName: "20-Ton Hydraulic Bottle Jack",
        category: "Jacks & Tools",
        brand: "Eastman",
        size: "20 Ton Capacity",
        quantity: 12,
        unit: "PCS",
        purchaseRate: 3200,
        minimumStock: 3,
        location: "LOCATION_A",
        remarks: "Standard fleet hydraulic lifting bottle jack with overload valve",
        status: "ACTIVE",
        createdBy: superAdmin._id,
      },
      {
        itemCode: "JCK-VID-002",
        itemName: "30-Ton Heavy Duty Screw Jack",
        category: "Jacks & Tools",
        brand: "Stanley",
        size: "30 Ton Mechanical",
        quantity: 8,
        unit: "PCS",
        purchaseRate: 4500,
        minimumStock: 2,
        location: "LOCATION_A",
        remarks: "Heavy multi-axle trailer screw jack",
        status: "ACTIVE",
        createdBy: superAdmin._id,
      },
      {
        itemCode: "ROP-VID-001",
        itemName: "16mm Braided Polypropylene Cargo Lashing Rope (100m)",
        category: "Cargo Ropes",
        brand: "Garware",
        size: "16mm x 100m",
        quantity: 40,
        unit: "BUNDLES",
        purchaseRate: 850,
        minimumStock: 10,
        location: "LOCATION_A",
        remarks: "High-breaking-strength PP braided lashing coil",
        status: "ACTIVE",
        createdBy: superAdmin._id,
      },
      {
        itemCode: "ROP-VID-002",
        itemName: "5-Ton Ratchet Cargo Tie-Down Belt (9m with Hooks)",
        category: "Cargo Ropes",
        brand: "CargoSafe",
        size: "50mm x 9m (5 Ton)",
        quantity: 24,
        unit: "PCS",
        purchaseRate: 950,
        minimumStock: 5,
        location: "LOCATION_A",
        remarks: "Heavy duty polyester webbing with steel ratchet tensioner",
        status: "ACTIVE",
        createdBy: superAdmin._id,
      },
      {
        itemCode: "BLT-VID-001",
        itemName: "High-Tensile Wheel Hub Bolts & Nuts M22 (Set of 10)",
        category: "Wheel Bolts & Fasteners",
        brand: "Sundram",
        size: "M22 x 1.5 (Grade 10.9)",
        quantity: 50,
        unit: "SETS",
        purchaseRate: 650,
        minimumStock: 12,
        location: "LOCATION_A",
        remarks: "Commercial 10-stud wheel hub replacement fasteners",
        status: "ACTIVE",
        createdBy: superAdmin._id,
      },
      {
        itemCode: "SFT-VID-001",
        itemName: "High-Visibility Reflective Safety Jacket Class 2",
        category: "Driver Safety Gear",
        brand: "3M",
        size: "XL / Free Size",
        quantity: 35,
        unit: "PCS",
        purchaseRate: 280,
        minimumStock: 10,
        location: "LOCATION_A",
        remarks: "Fluorescent orange/yellow with silver prismatic retro-reflective tape",
        status: "ACTIVE",
        createdBy: superAdmin._id,
      },
      {
        itemCode: "SFT-VID-002",
        itemName: "4kg ABC Dry Powder Commercial Fire Extinguisher",
        category: "Driver Safety Gear",
        brand: "Ceasefire",
        size: "4kg ABC Stored Pressure",
        quantity: 10,
        unit: "PCS",
        purchaseRate: 1800,
        minimumStock: 2,
        location: "LOCATION_A",
        remarks: "Cabin-mounted fire extinguisher for inflammable cargo transit",
        status: "ACTIVE",
        createdBy: superAdmin._id,
      },
      {
        itemCode: "OIL-VID-001",
        itemName: "15W-40 CI-4 Heavy Duty Engine Oil (20L Bucket)",
        category: "Spares & Fluids",
        brand: "Castrol Vecton",
        size: "20 Litres",
        quantity: 16,
        unit: "BUCKETS",
        purchaseRate: 5400,
        minimumStock: 4,
        location: "LOCATION_A",
        remarks: "Turbo-tested long-drain synthetic technology diesel engine oil",
        status: "ACTIVE",
        createdBy: superAdmin._id,
      },
      {
        itemCode: "FLT-VID-001",
        itemName: "Heavy Truck Primary Diesel Fuel Filter Element",
        category: "Spares & Fluids",
        brand: "Bosch",
        size: "Universal Spin-On",
        quantity: 25,
        unit: "PCS",
        purchaseRate: 450,
        minimumStock: 6,
        location: "LOCATION_A",
        remarks: "Water-separator fuel filter cartridge for common-rail diesel",
        status: "ACTIVE",
        createdBy: superAdmin._id,
      },

      // MANAWAR WAREHOUSE (LOCATION_B)
      {
        itemCode: "TRP-MAN-001",
        itemName: "Heavy Duty Waterproof Tarpaulin (18x24 ft)",
        category: "Tripal / Tarpaulin",
        brand: "Silpaulin",
        size: "18 x 24 ft (250 GSM)",
        quantity: 20,
        unit: "PCS",
        purchaseRate: 2400,
        minimumStock: 5,
        location: "LOCATION_B",
        remarks: "100% waterproof UV-stabilized heavy duty cargo protection",
        status: "ACTIVE",
        createdBy: superAdmin._id,
      },
      {
        itemCode: "TRP-MAN-002",
        itemName: "Premium All-Weather Silpaulin Tripal (20x30 ft)",
        category: "Tripal / Tarpaulin",
        brand: "Supreme",
        size: "20 x 30 ft (280 GSM)",
        quantity: 15,
        unit: "PCS",
        purchaseRate: 3600,
        minimumStock: 3,
        location: "LOCATION_B",
        remarks: "Heavy duty laminated sheet for cement and agricultural haulage",
        status: "ACTIVE",
        createdBy: superAdmin._id,
      },
      {
        itemCode: "JCK-MAN-001",
        itemName: "20-Ton Hydraulic Bottle Jack",
        category: "Jacks & Tools",
        brand: "Eastman",
        size: "20 Ton Capacity",
        quantity: 10,
        unit: "PCS",
        purchaseRate: 3200,
        minimumStock: 2,
        location: "LOCATION_B",
        remarks: "Standard fleet hydraulic lifting bottle jack",
        status: "ACTIVE",
        createdBy: superAdmin._id,
      },
      {
        itemCode: "JCK-MAN-002",
        itemName: "15-Ton Portable Mechanical Screw Jack",
        category: "Jacks & Tools",
        brand: "GB Tools",
        size: "15 Ton Mechanical",
        quantity: 7,
        unit: "PCS",
        purchaseRate: 2800,
        minimumStock: 2,
        location: "LOCATION_B",
        remarks: "Emergency wheel change screw jack with folding handle",
        status: "ACTIVE",
        createdBy: superAdmin._id,
      },
      {
        itemCode: "ROP-MAN-001",
        itemName: "14mm Cargo Tie-Down PP Rope (100m Coil)",
        category: "Cargo Ropes",
        brand: "Garware",
        size: "14mm x 100m",
        quantity: 30,
        unit: "COILS",
        purchaseRate: 750,
        minimumStock: 8,
        location: "LOCATION_B",
        remarks: "Durable wear-resistant poly rope for side-body cargo securing",
        status: "ACTIVE",
        createdBy: superAdmin._id,
      },
      {
        itemCode: "BLT-MAN-001",
        itemName: "Wheel Studs & Heavy Locking Nuts Kit",
        category: "Wheel Bolts & Fasteners",
        brand: "Unbrako",
        size: "M22 x 1.5 Kit (10 Studs + Nuts)",
        quantity: 40,
        unit: "KITS",
        purchaseRate: 580,
        minimumStock: 8,
        location: "LOCATION_B",
        remarks: "Heat-treated high grade truck axle wheel studs",
        status: "ACTIVE",
        createdBy: superAdmin._id,
      },
      {
        itemCode: "SFT-MAN-001",
        itemName: "Industrial First Aid Emergency Medical Box",
        category: "Driver Safety Gear",
        brand: "St John",
        size: "Fleet First Aid Kit",
        quantity: 14,
        unit: "PCS",
        purchaseRate: 600,
        minimumStock: 3,
        location: "LOCATION_B",
        remarks: "Mandatory RTO compliant vehicle first aid kit with burn dressing & splints",
        status: "ACTIVE",
        createdBy: superAdmin._id,
      },
      {
        itemCode: "SFT-MAN-002",
        itemName: "Heavy Duty Hazard Road Safety Warning Triangles",
        category: "Driver Safety Gear",
        brand: "Autokraft",
        size: "Pack of 2 Foldable Triangles",
        quantity: 20,
        unit: "SETS",
        purchaseRate: 350,
        minimumStock: 5,
        location: "LOCATION_B",
        remarks: "High-luminance red reflective warning triangles for breakdown alerts",
        status: "ACTIVE",
        createdBy: superAdmin._id,
      },
      {
        itemCode: "OIL-MAN-001",
        itemName: "AP3 High-Temperature Heavy Duty Grease (5kg Tub)",
        category: "Spares & Fluids",
        brand: "Servo",
        size: "5 kg Tub",
        quantity: 12,
        unit: "TUBS",
        purchaseRate: 1650,
        minimumStock: 3,
        location: "LOCATION_B",
        remarks: "Lithium complex EP-3 wheel bearing & chassis grease",
        status: "ACTIVE",
        createdBy: superAdmin._id,
      },
      {
        itemCode: "OIL-MAN-002",
        itemName: "Heavy Duty Radiator Coolant Concentrate (5L)",
        category: "Spares & Fluids",
        brand: "Gulf",
        size: "5 Litres",
        quantity: 18,
        unit: "CANS",
        purchaseRate: 850,
        minimumStock: 4,
        location: "LOCATION_B",
        remarks: "Long-life anti-rust anti-freeze heavy engine coolant",
        status: "ACTIVE",
        createdBy: superAdmin._id,
      },
    ];

    const inventoryItems = await Inventory.insertMany(inventoryData);
    console.log(`  ✓ Created ${inventoryItems.length} Inventory Items across Vidisha (12 items) and Manawar (10 items).`);

    // Helper map to find inventory item by code
    const invMap = new Map();
    for (const item of inventoryItems) {
      invMap.set(item.itemCode, item);
    }

    // 6. Create Initial Vehicle Equipment Assignments (with real-time stock deduction)
    console.log("\n6. Creating Initial Active Equipment Assignments...");

    const assignmentsPlan = [
      // Vehicle 1: MP-09-HH-4521 (Ramesh Kumar) -> 2 Tripals, 1 Jack, 2 Ropes from Vidisha
      {
        vehicle: vehicles[0],
        itemCode: "TRP-VID-001",
        qty: 2,
        driver: drivers[0],
        purpose: "Trip Tarpaulin / Waterproof Tripal",
        remarks: "Issued 2 brand new waterproof tripals for Mumbai monsoon trip",
      },
      {
        vehicle: vehicles[0],
        itemCode: "JCK-VID-001",
        qty: 1,
        driver: drivers[0],
        purpose: "Hydraulic Jack & Wheel Tools",
        remarks: "Issued 20T hydraulic bottle jack with lever rod",
      },
      {
        vehicle: vehicles[0],
        itemCode: "ROP-VID-001",
        qty: 2,
        driver: drivers[0],
        purpose: "Cargo Lashing Rope",
        remarks: "Issued 2 coils 16mm PP cargo lashing rope",
      },

      // Vehicle 2: MP-09-HH-8812 (Suresh Yadav) -> 2 Tripals, 1 Fire Extinguisher from Vidisha
      {
        vehicle: vehicles[1],
        itemCode: "TRP-VID-001",
        qty: 2,
        driver: drivers[1],
        purpose: "Trip Tarpaulin / Waterproof Tripal",
        remarks: "Issued 2 waterproof tripals for Indore-Bhopal express route",
      },
      {
        vehicle: vehicles[1],
        itemCode: "SFT-VID-002",
        qty: 1,
        driver: drivers[1],
        purpose: "Driver Safety Gear",
        remarks: "Cabin mounted 4kg ABC fire extinguisher inspected and valid",
      },

      // Vehicle 3: MP-04-HE-1904 (Mukesh Sharma) -> 1 Tripal, 2 Ratchet Belts from Vidisha
      {
        vehicle: vehicles[2],
        itemCode: "TRP-VID-002",
        qty: 1,
        driver: drivers[2],
        purpose: "Trip Tarpaulin / Waterproof Tripal",
        remarks: "Issued large 24x36 ft silpaulin tripal for container cargo",
      },
      {
        vehicle: vehicles[2],
        itemCode: "ROP-VID-002",
        qty: 2,
        driver: drivers[2],
        purpose: "Cargo Lashing Rope",
        remarks: "Issued 2 heavy duty 5-ton ratchet lashing straps",
      },

      // Vehicle 5: MP-40-HA-7701 (Vikram Patel) -> 2 Tripals, 1 Jack, 2 Ropes from Manawar
      {
        vehicle: vehicles[4],
        itemCode: "TRP-MAN-001",
        qty: 2,
        driver: drivers[4],
        purpose: "Trip Tarpaulin / Waterproof Tripal",
        remarks: "Issued from Manawar warehouse for Gujarat cement haul",
      },
      {
        vehicle: vehicles[4],
        itemCode: "JCK-MAN-001",
        qty: 1,
        driver: drivers[4],
        purpose: "Hydraulic Jack & Wheel Tools",
        remarks: "Issued 20T Eastman bottle jack",
      },
      {
        vehicle: vehicles[4],
        itemCode: "ROP-MAN-001",
        qty: 2,
        driver: drivers[4],
        purpose: "Cargo Lashing Rope",
        remarks: "Issued 2 coils 14mm PP rope",
      },

      // Vehicle 6: MP-40-HA-9042 (Rajesh Verma) -> 1 Tripal, 1 First Aid from Manawar
      {
        vehicle: vehicles[5],
        itemCode: "TRP-MAN-002",
        qty: 1,
        driver: drivers[5],
        purpose: "Trip Tarpaulin / Waterproof Tripal",
        remarks: "Issued 20x30 ft premium all-weather tripal",
      },
      {
        vehicle: vehicles[5],
        itemCode: "SFT-MAN-001",
        qty: 1,
        driver: drivers[5],
        purpose: "Driver Safety Gear",
        remarks: "Complete industrial vehicle first aid kit",
      },
    ];

    for (const plan of assignmentsPlan) {
      const invItem = invMap.get(plan.itemCode);
      if (!invItem) continue;

      // 1. Create assignment record
      await VehicleAssignment.create({
        vehicle: plan.vehicle._id,
        vehicleNo: plan.vehicle.vehicleNo,
        inventoryItem: invItem._id,
        itemCode: invItem.itemCode,
        itemName: invItem.itemName,
        category: invItem.category,
        brand: invItem.brand,
        size: invItem.size,
        unit: invItem.unit,
        purchaseRate: invItem.purchaseRate,
        location: invItem.location,
        quantity: plan.qty,
        returnedQuantity: 0,
        assignedDate: addDays(-Math.floor(1 + Math.random() * 5)),
        driver: plan.driver._id,
        driverName: plan.driver.name,
        purpose: plan.purpose,
        remarks: plan.remarks,
        status: "ASSIGNED",
        createdBy: superAdmin._id,
      });

      // 2. Deduct quantity from warehouse stock
      await Inventory.findByIdAndUpdate(invItem._id, {
        $inc: { quantity: -plan.qty },
      });
    }
    console.log(`  ✓ Created ${assignmentsPlan.length} Initial Equipment Assignments and synchronized inventory stock.`);

    // 7. Create Driver Daily Attendance Register
    console.log("\n7. Creating Driver Attendance Records (Last 7 Days)...");
    const attendanceRecords = [];
    const statuses = ["PRESENT", "PRESENT", "PRESENT", "PRESENT", "PRESENT", "HALF_DAY", "LEAVE"];

    for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
      const attDate = new Date(now.getTime() - dayOffset * 86400000);
      const dateStr = attDate.toISOString().slice(0, 10);
      const monthStr = dateStr.slice(0, 7);

      for (let i = 0; i < drivers.length; i++) {
        const d = drivers[i];
        const status = d.status === "ON_LEAVE" ? "LEAVE" : statuses[(i + dayOffset) % statuses.length];

        attendanceRecords.push({
          driver: d._id,
          date: dateStr,
          month: monthStr,
          status: status,
          notes: status === "PRESENT" ? "On regular duty" : status === "HALF_DAY" ? "First half local duty" : "Approved leave",
          markedBy: superAdmin._id,
        });
      }
    }

    await Attendance.insertMany(attendanceRecords);
    console.log(`  ✓ Created ${attendanceRecords.length} Attendance Records for 10 drivers across 7 days.`);

    console.log("\n==========================================================");
    console.log("🎉 DATABASE SEEDING COMPLETED SUCCESSFULLY!");
    console.log("==========================================================");
    console.log("Summary of Created Records:");
    console.log("  • Users: 3 (Super Admin 'admin', Sub Admins 'amit' & 'rahul')");
    console.log("  • Commercial Fleet Vehicles: 10 (with full RC, insurance, fitness, PUC)");
    console.log("  • Commercial Drivers: 10 (8 assigned to vehicles, 2 in floating pool)");
    console.log("  • Warehouse Inventory: 22 items across Vidisha & Manawar");
    console.log("  • Vehicle Equipment Assignments: 11 active gear assignments with live sync");
    console.log("  • Attendance Records: 70 daily logs across 7 days");
    console.log("==========================================================");

    process.exit(0);
  } catch (error) {
    console.error("Seeding failed with error:", error);
    process.exit(1);
  }
}

seedDatabase();
