import http from "http";

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    const headers = {
      "Content-Type": "application/json",
    };
    if (postData) {
      headers["Content-Length"] = Buffer.byteLength(postData);
    }
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: 5000,
        path: `/api/v1${path}`,
        method,
        headers,
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          try {
            const parsed = raw ? JSON.parse(raw) : {};
            resolve({ status: res.statusCode, headers: res.headers, body: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, headers: res.headers, raw });
          }
        });
      }
    );

    req.on("error", reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runFullSuite() {
  console.log("=================================================");
  console.log("🧪 RUNNING COMPREHENSIVE END-TO-END AUDIT SUITE");
  console.log("=================================================\n");

  let passed = 0;
  let total = 0;

  async function check(desc, fn) {
    total++;
    try {
      await fn();
      console.log(`✅ [${total}] ${desc}`);
      passed++;
    } catch (err) {
      console.error(`❌ [${total}] ${desc}`);
      console.error(`   Error: ${err.message}\n`);
    }
  }

  let superAdminToken = null;
  let subAdminToken = null;
  let subAdminId = null;
  let vehicleId = null;
  let driverId = null;
  let inventoryVidishaId = null;
  let inventoryManawarId = null;
  let customCategoryId = null;

  // 1. Health
  await check("API Health & DB Connectivity", async () => {
    const res = await request("GET", "/health");
    if (res.status !== 200 || !res.body.success) throw new Error(`Status ${res.status}`);
  });

  // 2. Super Admin Login
  await check("Super Admin Login & JWT Issuance", async () => {
    const res = await request("POST", "/auth/login", {
      username: "admin",
      password: "Pass@123",
    });
    if (res.status !== 200 || !res.body.data?.accessToken) throw new Error("Login failed");
    superAdminToken = res.body.data.accessToken;
  });

  // 3. Sub Admin Provisioning
  await check("Create Sub Admin User (Depot Manager)", async () => {
    const username = `depot_mgr_${Date.now().toString().slice(-4)}`;
    const res = await request(
      "POST",
      "/users",
      {
        name: "Vidisha & Manawar Depot Manager",
        username,
        email: `${username}@fleetledger.com`,
        password: "DepotManager@123",
        role: "SUB_ADMIN",
      },
      superAdminToken
    );
    if (res.status !== 201) throw new Error(`Create Sub Admin failed: ${JSON.stringify(res.body)}`);
    subAdminId = res.body.data.id || res.body.data._id;

    // Login as Sub Admin
    const loginRes = await request("POST", "/auth/login", {
      username,
      password: "DepotManager@123",
    });
    if (loginRes.status !== 200 || !loginRes.body.data?.accessToken) throw new Error("Sub admin login failed");
    subAdminToken = loginRes.body.data.accessToken;
  });

  // 4. Sub Admin Dashboard
  await check("Sub Admin Dashboard KPI Summary Retrieval", async () => {
    const res = await request("GET", "/dashboard/summary", null, subAdminToken);
    if (res.status !== 200 || !res.body.data?.totals) {
      throw new Error(`Dashboard retrieval failed: ${JSON.stringify(res.body)}`);
    }
  });

  // 5. Vehicle CRUD & Compliance Tracking
  await check("Vehicle Registration with National Permit & Accident Reports", async () => {
    const suffix = Date.now().toString().slice(-4);
    const res = await request(
      "POST",
      "/vehicles",
      {
        vehicleNo: `MP04TR${suffix}`,
        type: "16 Wheeler",
        capacity: "35 MT",
        ownership: "OWNED",
        ownerName: "Vidisha Fleet Center",
        ownerMobile: `98${Date.now().toString().slice(-8)}`,
        pucExpiry: "2027-08-31",
        fitnessExpiry: "2027-10-31",
        insuranceExpiry: "2027-12-31",
        permitExpiry: "2028-01-31",
        permitType: "NATIONAL",
        rcNumber: `RC-MP04-${suffix}`,
        rcExpiry: "2032-01-01",
        status: "ACTIVE",
        accidentReports: [
          {
            date: "2026-08-15",
            description: "Minor headlight glass repair",
            driverName: "Dinesh Kumar",
            driverMobile: "9826012345",
          },
        ],
      },
      subAdminToken
    );
    if (res.status !== 201 || !res.body.data?._id) throw new Error(`Vehicle create failed: ${JSON.stringify(res.body)}`);
    vehicleId = res.body.data._id;
  });

  // 6. Driver Registration & Allocation
  await check("Driver Registration & Vehicle Allocation", async () => {
    const mobile = `98${Date.now().toString().slice(-8)}`;
    const res = await request(
      "POST",
      "/drivers",
      {
        name: "Dinesh Kumar Sharma",
        driverId: `DRV-${mobile.slice(-4)}`,
        fatherName: "Ramswaroop Sharma",
        mobile,
        licenceNo: `MP-04-${mobile.slice(-6)}`,
        licenceExpiry: "2029-05-30",
        joiningDate: "2023-11-01",
        status: "ACTIVE",
        assignedVehicleId: vehicleId,
      },
      subAdminToken
    );
    if (res.status !== 201 || !res.body.data?._id) throw new Error(`Driver create failed: ${JSON.stringify(res.body)}`);
    driverId = res.body.data._id;
  });

  // 7. Inventory: Vidisha (LOCATION_A) with Tarpaulin / Tripal
  await check("Inventory at Vidisha: Tripal / Waterproof Tarpaulin (Auto Unit PCS)", async () => {
    const suffix = Date.now().toString().slice(-4);
    const res = await request(
      "POST",
      "/inventory",
      {
        itemCode: `TRP-24X18-${suffix}`,
        itemName: "Heavy Duty Waterproof Tripal 24x18",
        category: "Tripal / Waterproof Tarpaulin",
        brand: "Silpaulin Waterproof",
        size: "24x18 Ft",
        quantity: 80,
        unit: "PCS",
        purchaseRate: 1950,
        minimumStock: 15,
        location: "LOCATION_A",
        remarks: "Vidisha Central Warehouse Rack T-1",
        status: "ACTIVE",
      },
      subAdminToken
    );
    if (res.status !== 201 || res.body.data?.location !== "LOCATION_A") {
      throw new Error(`Vidisha Tripal failed: ${JSON.stringify(res.body)}`);
    }
    inventoryVidishaId = res.body.data._id;
  });

  // 8. Inventory: Manawar (LOCATION_B) with Safety Gear, Rope, Jack, Wheel Bolt
  await check("Inventory at Manawar: Jack & Wheel Bolt (Auto Unit PCS) and Rope (Auto Unit MTR)", async () => {
    const suffix = Date.now().toString().slice(-4);
    // Jack
    const jackRes = await request(
      "POST",
      "/inventory",
      {
        itemCode: `JCK-20T-${suffix}`,
        itemName: "Hydraulic Bottle Jack 20 Ton",
        category: "Jack",
        brand: "HeavyLift Pro",
        size: "20 Ton",
        quantity: 12,
        unit: "PCS",
        purchaseRate: 3400,
        minimumStock: 3,
        location: "MANAWAR",
        remarks: "Manawar Heavy Spares Bin J-2",
        status: "ACTIVE",
      },
      subAdminToken
    );
    if (jackRes.status !== 201 || jackRes.body.data?.location !== "LOCATION_B") {
      throw new Error(`Manawar Jack failed: ${JSON.stringify(jackRes.body)}`);
    }
    inventoryManawarId = jackRes.body.data._id;

    // Rope
    const ropeRes = await request(
      "POST",
      "/inventory",
      {
        itemCode: `ROP-18MM-${suffix}`,
        itemName: "Nylon Cargo Lashing Rope 18mm",
        category: "Rope",
        brand: "Garware",
        size: "18mm",
        quantity: 500,
        unit: "MTR",
        purchaseRate: 45,
        minimumStock: 100,
        location: "LOCATION_B",
        remarks: "Rope Spool Rack",
        status: "ACTIVE",
      },
      subAdminToken
    );
    if (ropeRes.status !== 201) throw new Error(`Rope creation failed: ${JSON.stringify(ropeRes.body)}`);
  });

  // 9. Inventory: Custom Category
  await check("Inventory: Custom Category Support ('Hydraulic Seals & Fittings')", async () => {
    const suffix = Date.now().toString().slice(-4);
    const res = await request(
      "POST",
      "/inventory",
      {
        itemCode: `HYD-SEAL-${suffix}`,
        itemName: "High Pressure Hydraulic O-Ring Kit",
        category: "Hydraulic Seals & Fittings",
        brand: "Parker",
        size: "Assorted 50pc",
        quantity: 30,
        unit: "BOX",
        purchaseRate: 650,
        minimumStock: 5,
        location: "VIDISHA",
        remarks: "Precision Cabinet A-4",
        status: "ACTIVE",
      },
      subAdminToken
    );
    if (res.status !== 201 || res.body.data?.category !== "Hydraulic Seals & Fittings") {
      throw new Error(`Custom category creation failed: ${JSON.stringify(res.body)}`);
    }
    customCategoryId = res.body.data._id;
  });

  // 10. Attendance Daily & Monthly
  await check("Attendance System: Mark Driver Check-in & Retrieve Monthly Sheet", async () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const monthStr = todayStr.slice(0, 7);

    const markRes = await request(
      "POST",
      "/attendance",
      {
        driverId,
        date: todayStr,
        status: "PRESENT",
        notes: "On-time arrival for Indore route",
      },
      subAdminToken
    );
    if (markRes.status !== 200 || markRes.body.data?.status !== "PRESENT") {
      throw new Error(`Mark attendance failed: ${JSON.stringify(markRes.body)}`);
    }

    const monthRes = await request("GET", `/attendance/monthly?month=${monthStr}`, null, subAdminToken);
    if (monthRes.status !== 200 || !Array.isArray(monthRes.body.data?.drivers)) {
      throw new Error(`Monthly attendance failed: ${JSON.stringify(monthRes.body)}`);
    }
  });

  // 11. Soft Delete & Recycle Bin
  await check("Recycle Bin: Soft Delete Product and Restore back to Active Inventory", async () => {
    const delRes = await request("DELETE", `/inventory/${customCategoryId}`, null, subAdminToken);
    if (delRes.status !== 200) throw new Error("Soft delete failed");

    const binRes = await request("GET", "/inventory/deleted", null, subAdminToken);
    if (binRes.status !== 200 || !binRes.body.data?.some((i) => i._id === customCategoryId)) {
      throw new Error("Item missing from recycle bin");
    }

    const restoreRes = await request("POST", `/inventory/${customCategoryId}/restore`, null, subAdminToken);
    if (restoreRes.status !== 200) throw new Error("Restore failed");
  });

  // 12. Excel Import / Export Endpoints
  await check("Excel Templates & Export: Vidisha and Manawar Inventory Downloads", async () => {
    const templateLocARes = await request("GET", "/import-export/templates/inventory?location=LOCATION_A", null, subAdminToken);
    if (templateLocARes.status !== 200) throw new Error(`Vidisha template download failed: ${templateLocARes.status}`);

    const templateLocBRes = await request("GET", "/import-export/templates/inventory?location=LOCATION_B", null, subAdminToken);
    if (templateLocBRes.status !== 200) throw new Error(`Manawar template download failed: ${templateLocBRes.status}`);

    const exportRes = await request("GET", "/import-export/export/inventory?location=LOCATION_A", null, subAdminToken);
    if (exportRes.status !== 200) throw new Error(`Vidisha inventory export failed: ${exportRes.status}`);
  });

  console.log("\n=================================================");
  console.log(`🏆 ALL AUDIT TESTS FINISHED: ${passed}/${total} PASSED`);
  console.log("=================================================\n");

  if (passed !== total) {
    process.exit(1);
  }
}

runFullSuite();
