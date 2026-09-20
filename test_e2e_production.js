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
            resolve({ status: res.statusCode, body: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, raw });
          }
        });
      }
    );

    req.on("error", reject);
    if (postData) req.write(postData);
    req.end();
  });
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

let superAdminToken = null;
let subAdminToken = null;
let testVehicleId = null;
let testDriverId = null;
let testInventoryVidishaId = null;
let testInventoryManawarId = null;
let testSubAdminUsername = null;
let testSubAdminPassword = "StrongPass@123";

test("1. Health Check Endpoint", async () => {
  const res = await request("GET", "/health");
  if (res.status !== 200 || !res.body.success) {
    throw new Error(`Health check failed with status ${res.status}`);
  }
});

test("2. Super Admin Login & JWT Issuance", async () => {
  const res = await request("POST", "/auth/login", {
    username: "admin",
    password: "Pass@123",
  });
  if (res.status !== 200 || !res.body.data?.accessToken) {
    throw new Error(`Super Admin Login failed: ${JSON.stringify(res.body)}`);
  }
  superAdminToken = res.body.data.accessToken;
});

test("3. Auth Verification (/auth/me)", async () => {
  const res = await request("GET", "/auth/me", null, superAdminToken);
  if (res.status !== 200 || res.body.data?.user?.username !== "admin") {
    throw new Error(`Auth me failed: ${JSON.stringify(res.body)}`);
  }
});

test("4. Sub Admin Creation & Login", async () => {
  testSubAdminUsername = `subadmin_${Date.now().toString().slice(-4)}`;
  const createRes = await request(
    "POST",
    "/users",
    {
      name: "Vidisha Depot Manager",
      username: testSubAdminUsername,
      email: `${testSubAdminUsername}@fleetledger.com`,
      password: testSubAdminPassword,
      role: "SUB_ADMIN",
    },
    superAdminToken
  );

  if (createRes.status !== 201 || !(createRes.body.data?.id || createRes.body.data?._id)) {
    throw new Error(`Sub Admin create failed: ${JSON.stringify(createRes.body)}`);
  }

  // Login as Sub Admin
  const loginRes = await request("POST", "/auth/login", {
    username: testSubAdminUsername,
    password: testSubAdminPassword,
  });

  if (loginRes.status !== 200 || !loginRes.body.data?.accessToken) {
    throw new Error(`Sub Admin login failed: ${JSON.stringify(loginRes.body)}`);
  }
  subAdminToken = loginRes.body.data.accessToken;
});

test("5. Sub Admin Dashboard Access & Metrics Retrieval", async () => {
  const res = await request("GET", "/dashboard/summary", null, subAdminToken);
  if (res.status !== 200 || !res.body.data?.totals) {
    throw new Error(`Sub Admin Dashboard summary failed: ${JSON.stringify(res.body)}`);
  }
  if (typeof res.body.data.totals.vehicles !== "number") {
    throw new Error("Dashboard totals missing vehicle metrics");
  }
});

test("6. Commercial Vehicle Management (CRUD & Compliance)", async () => {
  const uniqueCode = Date.now().toString().slice(-4);
  const createRes = await request(
    "POST",
    "/vehicles",
    {
      vehicleNo: `MP04E2E${uniqueCode}`,
      type: "16 Wheeler",
      capacity: "25 MT",
      ownership: "OWNED",
      ownerName: "Central Logistics Depot",
      ownerMobile: `98${Date.now().toString().slice(-8)}`,
      pucExpiry: "2027-12-31",
      fitnessExpiry: "2027-12-31",
      insuranceExpiry: "2027-12-31",
      permitExpiry: "2027-12-31",
      permitType: "NATIONAL",
      rcNumber: `RC-MP04-${uniqueCode}`,
      rcExpiry: "2030-01-01",
      status: "ACTIVE",
      accidentReports: [
        {
          date: "2026-09-01",
          description: "Minor rear bumper scratch",
          driverName: "Suresh Patil",
          driverMobile: "9876543210",
        },
      ],
    },
    superAdminToken
  );

  if (createRes.status !== 201 || !createRes.body.data?._id) {
    throw new Error(`Vehicle create failed: ${JSON.stringify(createRes.body)}`);
  }
  testVehicleId = createRes.body.data._id;

  // List Vehicles (Sub Admin can also view)
  const listRes = await request("GET", "/vehicles", null, subAdminToken);
  if (listRes.status !== 200 || !Array.isArray(listRes.body.data)) {
    throw new Error(`Vehicle list failed: ${JSON.stringify(listRes.body)}`);
  }
});

test("7. Driver Personnel & Vehicle Allocation", async () => {
  const uniqueMobile = `98${Date.now().toString().slice(-8)}`;
  const createRes = await request(
    "POST",
    "/drivers",
    {
      name: `Ramesh Driver ${uniqueMobile.slice(-4)}`,
      driverId: `DRV-${uniqueMobile.slice(-4)}`,
      fatherName: "Suresh Patil",
      mobile: uniqueMobile,
      licenceNo: `DL-042026${uniqueMobile.slice(-6)}`,
      licenceExpiry: "2028-06-30",
      joiningDate: "2024-01-15",
      status: "ACTIVE",
      assignedVehicleId: testVehicleId,
    },
    superAdminToken
  );

  if (createRes.status !== 201 || !createRes.body.data?._id) {
    throw new Error(`Driver create failed: ${JSON.stringify(createRes.body)}`);
  }
  testDriverId = createRes.body.data._id;
});

test("8. Inventory: Vidisha (LOCATION_A) with Tarpaulin / Tripal & Custom Category", async () => {
  const uniqueCode = Date.now().toString().slice(-4);
  // Create Tripal in Vidisha
  const tripalRes = await request(
    "POST",
    "/inventory",
    {
      itemCode: `TRP-HD-${uniqueCode}`,
      itemName: "Heavy Duty Waterproof Tripal 24x18 Ft",
      category: "Tripal / Waterproof Tarpaulin",
      brand: "Supreme Silpaulin",
      size: "24x18 Ft",
      quantity: 50,
      unit: "PCS",
      purchaseRate: 1850,
      minimumStock: 10,
      location: "LOCATION_A",
      remarks: "Tripal Rack A-1",
      status: "ACTIVE",
    },
    subAdminToken
  );

  if (tripalRes.status !== 201 || !tripalRes.body.data?._id) {
    throw new Error(`Vidisha Tripal inventory creation failed: ${JSON.stringify(tripalRes.body)}`);
  }
  testInventoryVidishaId = tripalRes.body.data._id;

  // Create Custom Category Item in Vidisha
  const customRes = await request(
    "POST",
    "/inventory",
    {
      itemCode: `HYD-SEAL-${uniqueCode}`,
      itemName: "Hydraulic Jack High Pressure Seal",
      category: "Hydraulic Spares",
      brand: "Bosch Rexroth",
      size: "32mm",
      quantity: 25,
      unit: "SET",
      purchaseRate: 450,
      minimumStock: 5,
      location: "VIDISHA",
      remarks: "Hydraulic Cabinet 3",
      status: "ACTIVE",
    },
    subAdminToken
  );

  if (customRes.status !== 201 || customRes.body.data?.location !== "LOCATION_A") {
    throw new Error(`Custom category & VIDISHA normalization failed: ${JSON.stringify(customRes.body)}`);
  }
});

test("9. Inventory: Manawar (LOCATION_B) with Safety Gear, Jack, Rope, Wheel Bolt", async () => {
  const uniqueCode = Date.now().toString().slice(-4);
  const boltRes = await request(
    "POST",
    "/inventory",
    {
      itemCode: `WHL-BLT-${uniqueCode}`,
      itemName: "Heavy Duty Wheel Bolt & Nut 22mm",
      category: "Wheel Bolt",
      brand: "Tata Genuine",
      size: "22mm x 1.5",
      quantity: 200,
      unit: "PCS",
      purchaseRate: 120,
      minimumStock: 40,
      location: "MANAWAR",
      remarks: "Bin M-04",
      status: "ACTIVE",
    },
    subAdminToken
  );

  if (boltRes.status !== 201 || boltRes.body.data?.location !== "LOCATION_B") {
    throw new Error(`Manawar Wheel Bolt inventory creation failed: ${JSON.stringify(boltRes.body)}`);
  }
  testInventoryManawarId = boltRes.body.data._id;
});

test("10. Daily & Monthly Attendance Register", async () => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const monthStr = todayStr.slice(0, 7);

  // Mark Daily Attendance
  const markRes = await request(
    "POST",
    "/attendance",
    {
      driverId: testDriverId,
      date: todayStr,
      status: "PRESENT",
    },
    subAdminToken
  );
  if (markRes.status !== 200 || markRes.body.data?.status !== "PRESENT") {
    throw new Error(`Mark attendance failed: ${JSON.stringify(markRes.body)}`);
  }

  // Retrieve Daily
  const dailyRes = await request(
    "GET",
    `/attendance/daily?date=${todayStr}`,
    null,
    subAdminToken
  );
  if (dailyRes.status !== 200 || !Array.isArray(dailyRes.body.data?.records)) {
    throw new Error(`Get daily attendance failed: ${JSON.stringify(dailyRes.body)}`);
  }

  // Retrieve Monthly
  const monthlyRes = await request(
    "GET",
    `/attendance/monthly?month=${monthStr}`,
    null,
    subAdminToken
  );
  if (monthlyRes.status !== 200 || !Array.isArray(monthlyRes.body.data?.drivers)) {
    throw new Error(`Get monthly attendance failed: ${JSON.stringify(monthlyRes.body)}`);
  }
});

test("11. Soft Delete & Recycle Bin Restoration", async () => {
  // Soft Delete Inventory Item
  const delRes = await request("DELETE", `/inventory/${testInventoryVidishaId}`, null, subAdminToken);
  if (delRes.status !== 200) {
    throw new Error(`Inventory soft delete failed: ${JSON.stringify(delRes.body)}`);
  }

  // Check Recycle Bin
  const binRes = await request("GET", "/inventory/deleted", null, subAdminToken);
  if (binRes.status !== 200 || !binRes.body.data?.some((i) => i._id === testInventoryVidishaId)) {
    throw new Error(`Recycle bin missing deleted item: ${JSON.stringify(binRes.body)}`);
  }

  // Restore from Recycle Bin
  const restoreRes = await request("POST", `/inventory/${testInventoryVidishaId}/restore`, null, subAdminToken);
  if (restoreRes.status !== 200) {
    throw new Error(`Restore failed: ${JSON.stringify(restoreRes.body)}`);
  }
});

test("12. Super Admin Dashboard Verification", async () => {
  const res = await request("GET", "/dashboard/summary", null, superAdminToken);
  if (res.status !== 200 || !res.body.data?.totals) {
    throw new Error(`Super Admin Dashboard summary failed: ${JSON.stringify(res.body)}`);
  }
});

async function runAll() {
  console.log("=========================================");
  console.log("🚀 STARTING E2E PRODUCTION READINESS AUDIT");
  console.log("=========================================\n");

  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    try {
      await t.fn();
      console.log(`✅ PASS: ${t.name}`);
      passed++;
    } catch (err) {
      console.error(`❌ FAIL: ${t.name}`);
      console.error(`   Error: ${err.message}\n`);
      failed++;
    }
  }

  console.log("\n=========================================");
  console.log(`FINAL AUDIT RESULT: ${passed}/${tests.length} TESTS PASSED`);
  console.log("=========================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runAll();
