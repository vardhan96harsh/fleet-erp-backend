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

let authToken = null;
let testVehicleId = null;
let testDriverId = null;
let testInventoryId = null;
let testSubAdminId = null;

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
    throw new Error(`Login failed: ${JSON.stringify(res.body)}`);
  }
  authToken = res.body.data.accessToken;
});

test("3. Auth Verification (/auth/me)", async () => {
  const res = await request("GET", "/auth/me", null, authToken);
  if (res.status !== 200 || res.body.data?.user?.username !== "admin") {
    throw new Error(`Auth me failed: ${JSON.stringify(res.body)}`);
  }
});

test("4. Dashboard Metrics & KPI Aggregation", async () => {
  const res = await request("GET", "/dashboard/summary", null, authToken);
  if (res.status !== 200 || !res.body.data?.totals) {
    throw new Error(`Dashboard summary failed: ${JSON.stringify(res.body)}`);
  }
});

test("5. Commercial Vehicle Management (CRUD & Compliance)", async () => {
  const uniqueCode = Date.now().toString().slice(-4);
  // Create Vehicle
  const createRes = await request(
    "POST",
    "/vehicles",
    {
      vehicleNo: `MH04E2E${uniqueCode}`,
      type: "16 Wheeler",
      capacity: "25 MT",
      ownership: "OWNED",
      ownerName: "Central Logistics Depot",
      ownerMobile: `98${Date.now().toString().slice(-8)}`,
      pucExpiry: "2027-12-31",
      fitnessExpiry: "2027-12-31",
      insuranceExpiry: "2027-12-31",
      permitExpiry: "2027-12-31",
      rcNumber: `RC-MH04-${uniqueCode}`,
      rcExpiry: "2030-01-01",
      status: "ACTIVE",
    },
    authToken
  );

  if (createRes.status !== 201 || !createRes.body.data?._id) {
    throw new Error(`Vehicle create failed: ${JSON.stringify(createRes.body)}`);
  }
  testVehicleId = createRes.body.data._id;

  // List Vehicles
  const listRes = await request("GET", "/vehicles", null, authToken);
  if (listRes.status !== 200 || !Array.isArray(listRes.body.data)) {
    throw new Error(`Vehicle list failed: ${JSON.stringify(listRes.body)}`);
  }

  // Update Vehicle
  const updateRes = await request(
    "PATCH",
    `/vehicles/${testVehicleId}`,
    { capacity: "30 MT", status: "DRIVER_NOT_AVAILABLE" },
    authToken
  );
  if (updateRes.status !== 200 || updateRes.body.data?.capacity !== "30 MT" || updateRes.body.data?.status !== "DRIVER_NOT_AVAILABLE") {
    throw new Error(`Vehicle update failed: ${JSON.stringify(updateRes.body)}`);
  }
});

test("6. Driver Personnel & Vehicle Allocation", async () => {
  const uniqueMobile = `98${Date.now().toString().slice(-8)}`;
  // Create Driver
  const createRes = await request(
    "POST",
    "/drivers",
    {
      name: `Ramesh Driver ${uniqueMobile.slice(-4)}`,
      mobile: uniqueMobile,
      licenceNo: `DL-042026${uniqueMobile.slice(-6)}`,
      licenceExpiry: "2028-06-30",
      joiningDate: "2024-01-15",
      status: "ACTIVE",
      assignedVehicleId: testVehicleId,
    },
    authToken
  );

  if (createRes.status !== 201 || !createRes.body.data?._id) {
    throw new Error(`Driver create failed: ${JSON.stringify(createRes.body)}`);
  }
  testDriverId = createRes.body.data._id;

  // List Drivers
  const listRes = await request("GET", "/drivers", null, authToken);
  if (listRes.status !== 200 || !Array.isArray(listRes.body.data)) {
    throw new Error(`Driver list failed: ${JSON.stringify(listRes.body)}`);
  }
});

test("7. Inventory SKU & Stock Management across Locations", async () => {
  const uniqueCode = Date.now().toString().slice(-4);
  // Create Inventory Item
  const createRes = await request(
    "POST",
    "/inventory",
    {
      itemCode: `OIL-SYN-${uniqueCode}`,
      itemName: "Synthetic Diesel Engine Oil 15W-40",
      category: "Lubricants & Oils",
      brand: "Castrol",
      size: "20L Can",
      quantity: 60,
      unit: "LTR",
      purchaseRate: 290,
      minimumStock: 15,
      location: "LOCATION_A",
      remarks: "Rack 2-B",
      status: "ACTIVE",
    },
    authToken
  );

  if (createRes.status !== 201 || !createRes.body.data?._id) {
    throw new Error(`Inventory create failed: ${JSON.stringify(createRes.body)}`);
  }
  testInventoryId = createRes.body.data._id;

  // List Inventory
  const listRes = await request("GET", "/inventory", null, authToken);
  if (listRes.status !== 200 || !Array.isArray(listRes.body.data)) {
    throw new Error(`Inventory list failed: ${JSON.stringify(listRes.body)}`);
  }
});

test("8. Attendance System (Daily Roster, 1-Click Mark, Bulk Mark & Monthly Matrix)", async () => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const monthStr = todayStr.slice(0, 7);

  // Mark Daily
  const markRes = await request(
    "POST",
    "/attendance",
    {
      driverId: testDriverId,
      date: todayStr,
      status: "PRESENT",
    },
    authToken
  );
  if (markRes.status !== 200 || markRes.body.data?.status !== "PRESENT") {
    throw new Error(`Mark attendance failed: ${JSON.stringify(markRes.body)}`);
  }

  // Get Daily
  const dailyRes = await request(
    "GET",
    `/attendance/daily?date=${todayStr}`,
    null,
    authToken
  );
  if (dailyRes.status !== 200 || !Array.isArray(dailyRes.body.data?.records)) {
    throw new Error(`Get daily attendance failed: ${JSON.stringify(dailyRes.body)}`);
  }

  // Bulk Mark
  const bulkRes = await request(
    "POST",
    "/attendance/bulk",
    {
      date: todayStr,
      records: [{ driverId: testDriverId, status: "PRESENT" }],
    },
    authToken
  );
  if (bulkRes.status !== 200 || !bulkRes.body.success) {
    throw new Error(`Bulk mark attendance failed: ${JSON.stringify(bulkRes.body)}`);
  }

  // Get Monthly Sheet Matrix
  const monthlyRes = await request(
    "GET",
    `/attendance/monthly?month=${monthStr}`,
    null,
    authToken
  );
  if (monthlyRes.status !== 200 || !Array.isArray(monthlyRes.body.data?.drivers)) {
    throw new Error(`Get monthly attendance failed: ${JSON.stringify(monthlyRes.body)}`);
  }
});

test("9. Sub Admin Provisioning & Security Controls (RBAC)", async () => {
  const uniqueUser = `ops_staff_${Date.now().toString().slice(-4)}`;
  const createRes = await request(
    "POST",
    "/users",
    {
      name: "Operations Staff Member",
      username: uniqueUser,
      email: `${uniqueUser}@fleetledger.com`,
      password: "StrongPass@123",
      role: "SUB_ADMIN",
    },
    authToken
  );

  if (createRes.status !== 201 || !(createRes.body.data?.id || createRes.body.data?._id)) {
    throw new Error(`Sub Admin create failed: ${JSON.stringify(createRes.body)}`);
  }
  testSubAdminId = createRes.body.data.id || createRes.body.data._id;

  // List Sub Admins
  const listRes = await request("GET", "/users", null, authToken);
  if (listRes.status !== 200 || !Array.isArray(listRes.body.data)) {
    throw new Error(`User list failed: ${JSON.stringify(listRes.body)}`);
  }
});

test("10. Soft Delete & Recycle Bin Restoration", async () => {
  // Soft Delete Inventory Item
  const delRes = await request("DELETE", `/inventory/${testInventoryId}`, null, authToken);
  if (delRes.status !== 200) {
    throw new Error(`Inventory soft delete failed: ${JSON.stringify(delRes.body)}`);
  }

  // Check Recycle Bin
  const binRes = await request("GET", "/inventory/deleted", null, authToken);
  if (binRes.status !== 200 || !binRes.body.data?.some((i) => i._id === testInventoryId)) {
    throw new Error(`Recycle bin missing deleted item: ${JSON.stringify(binRes.body)}`);
  }

  // Restore from Recycle Bin
  const restoreRes = await request("POST", `/inventory/${testInventoryId}/restore`, null, authToken);
  if (restoreRes.status !== 200) {
    throw new Error(`Restore failed: ${JSON.stringify(restoreRes.body)}`);
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
