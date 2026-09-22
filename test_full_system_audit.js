const BACKEND_URL = "http://127.0.0.1:5000/api/v1";
const FRONTEND_URL = "http://127.0.0.1:5174";

async function runFullAudit() {
  console.log("===============================================================");
  console.log("🚀 FLEET ERP — COMPREHENSIVE FULL-SYSTEM END-TO-END AUDIT");
  console.log("===============================================================");

  let passed = 0;
  let failed = 0;

  function report(status, testName, details = "") {
    if (status) {
      console.log(`✅ PASS: ${testName}${details ? ` (${details})` : ""}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}${details ? ` -> ${details}` : ""}`);
      failed++;
    }
  }

  try {
    // 1. FRONTEND SERVER HEALTH
    console.log("\n--- 1. FRONTEND DEV SERVER & BUNDLE VERIFICATION ---");
    const feRes = await fetch(FRONTEND_URL);
    const feHtml = await feRes.text();
    report(
      feRes.status === 200 && feHtml.includes('id="root"'),
      "Frontend Dev Server is active and serves index.html",
      `Status: ${feRes.status}`
    );

    // 2. BACKEND API HEALTH
    console.log("\n--- 2. BACKEND SERVER HEALTH ---");
    const healthRes = await fetch(`${BACKEND_URL}/health`);
    const healthData = await healthRes.json();
    report(
      healthRes.status === 200 && healthData.success === true,
      "Backend API Health Check",
      healthData.message
    );

    // 3. AUTHENTICATION (SUPER ADMIN & SUB ADMINS)
    console.log("\n--- 3. AUTHENTICATION & ACCESS CONTROL ---");
    const adminLogin = await fetch(`${BACKEND_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "Pass@123" }),
    });
    const adminData = await adminLogin.json();
    const adminToken = adminData.data?.accessToken;
    report(
      adminLogin.status === 200 && !!adminToken,
      "Super Admin Login & Access Token",
      `Role: ${adminData.data?.user?.role}`
    );

    // Test or create dynamic Sub-Admin
    let amitToken = null;
    let amitData = null;
    const amitLogin = await fetch(`${BACKEND_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "amit", password: "Pass@123" }),
    });
    amitData = await amitLogin.json();

    if (amitLogin.status === 200 && amitData.data?.accessToken) {
      amitToken = amitData.data.accessToken;
      report(true, "Sub Admin Login & Access Token", `Role: ${amitData.data.user.role}`);
    } else {
      // Create temporary sub-admin via Super Admin endpoint to verify RBAC
      const randomSuffix = Date.now().toString().slice(-6);
      const testUsername = `subadmin_${randomSuffix}`;
      const createSubRes = await fetch(`${BACKEND_URL}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: "Test SubAdmin",
          username: testUsername,
          email: `subadmin_${randomSuffix}@test.local`,
          password: "Pass@123",
        }),
      });
      const createSubData = await createSubRes.json();
      const testUser = createSubData.data?.user || createSubData.data;

      const subLogin = await fetch(`${BACKEND_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: testUsername, password: "Pass@123" }),
      });
      const subLoginData = await subLogin.json();
      amitToken = subLoginData.data?.accessToken;
      report(
        subLogin.status === 200 && !!amitToken,
        "Sub Admin Dynamic Provisioning & Login",
        `Created & Logged in as: ${testUsername}`
      );

      // Clean up temporary subadmin after test
      if (testUser?.id) {
        await fetch(`${BACKEND_URL}/users/${testUser.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${adminToken}` },
        });
      }
    }

    // 4. VEHICLES MANAGEMENT & DRIVER POPULATION
    console.log("\n--- 4. VEHICLES & ASSIGNED DRIVER MAPPING ---");
    const vehListRes = await fetch(`${BACKEND_URL}/vehicles`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const vehListData = await vehListRes.json();
    report(
      vehListRes.status === 200 && Array.isArray(vehListData.data),
      "Fetch All Fleet Vehicles",
      `Total count: ${vehListData.data?.length}`
    );

    const testVehicleNo = `MP09AUDIT${Math.floor(1000 + Math.random() * 9000)}`;
    const createVehRes = await fetch(`${BACKEND_URL}/vehicles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        vehicleNo: testVehicleNo,
        type: "24 TON CONTAINER",
        capacity: "24 TONS",
        ownership: "OWNED",
        status: "ACTIVE",
      }),
    });
    const createVehData = await createVehRes.json();
    const testVehId = createVehData.data?._id;
    report(
      createVehRes.status === 201 && !!testVehId,
      "Create Commercial Fleet Vehicle",
      `VehicleNo: ${testVehicleNo}`
    );

    // 5. DRIVER REGISTRATION & VEHICLE ALLOCATION FLOW
    console.log("\n--- 5. DRIVER REGISTRATION, FREE/OCCUPIED VEHICLE & REASSIGNMENT ---");
    const driverMobile1 = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const createDriver1 = await fetch(`${BACKEND_URL}/drivers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: "Driver Alpha",
        mobile: driverMobile1,
        driverId: `DRV-${Date.now().toString().slice(-4)}`,
        assignedVehicleId: testVehId,
        status: "ACTIVE",
      }),
    });
    const driver1Data = await createDriver1.json();
    const driver1Id = driver1Data.data?._id;
    report(
      createDriver1.status === 201 && !!driver1Id,
      "Assign Free Vehicle to Driver Alpha",
      `Driver: Driver Alpha -> ${testVehicleNo}`
    );

    // Test conflict error when assigning already-occupied vehicle without forceReassign
    const driverMobile2 = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const createDriverConflict = await fetch(`${BACKEND_URL}/drivers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: "Driver Beta",
        mobile: driverMobile2,
        assignedVehicleId: testVehId,
        status: "ACTIVE",
      }),
    });
    const conflictData = await createDriverConflict.json();
    report(
      createDriverConflict.status === 409 && conflictData.message.includes("already assigned"),
      "Conflict Protection: Reject assignment of occupied vehicle without transfer flag",
      conflictData.message
    );

    // Test forceReassign transfer of occupied vehicle to Driver Beta
    const createDriverTransfer = await fetch(`${BACKEND_URL}/drivers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: "Driver Beta",
        mobile: driverMobile2,
        assignedVehicleId: testVehId,
        forceReassign: true,
        status: "ACTIVE",
      }),
    });
    const driver2Data = await createDriverTransfer.json();
    const driver2Id = driver2Data.data?._id;
    report(
      createDriverTransfer.status === 201 && !!driver2Id,
      "1-Click Vehicle Transfer: Successfully reassign vehicle to Driver Beta",
      `Vehicle: ${testVehicleNo} transferred`
    );

    // 6. INVENTORY MANAGEMENT (VIDISHA & MANAWAR)
    console.log("\n--- 6. INVENTORY WAREHOUSE MANAGEMENT ---");
    const itemCodeA = `TRP-E2E-${Date.now().toString().slice(-5)}`;
    const createInvA = await fetch(`${BACKEND_URL}/inventory`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        itemCode: itemCodeA,
        itemName: "Heavy Duty Waterproof Tripal (18x24 ft)",
        category: "Tripal / Tarpaulin",
        quantity: 15,
        unit: "PCS",
        location: "LOCATION_A",
        purchaseRate: 2500,
        minimumStock: 3,
      }),
    });
    const invAData = await createInvA.json();
    const itemIdA = invAData.data?._id;
    report(
      createInvA.status === 201 && !!itemIdA,
      "Create Inventory Item in Vidisha (LOCATION_A)",
      `Item: ${itemCodeA} (Qty: 15 PCS)`
    );

    // 7. VEHICLE EQUIPMENT ASSIGNMENT & REAL-TIME SYNC
    console.log("\n--- 7. VEHICLE EQUIPMENT ASSIGNMENT & REAL-TIME STOCK DEDUCTION ---");
    const assignRes = await fetch(`${BACKEND_URL}/assignments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        vehicleId: testVehId,
        inventoryItemId: itemIdA,
        location: "LOCATION_A",
        quantity: 4,
        purpose: "Trip Tarpaulin / Waterproof Tripal",
      }),
    });
    const assignData = await assignRes.json();
    const assignmentId = assignData.data?._id;
    report(
      assignRes.status === 201 && !!assignmentId && assignData.data?.quantity === 4,
      "Assign 4 Tripals to Vehicle with Stock Deduction",
      `Assigned: 4 PCS to ${testVehicleNo}`
    );

    // Verify Stock reduced from 15 to 11
    const checkStock1 = await fetch(`${BACKEND_URL}/inventory/${itemIdA}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const stock1Data = await checkStock1.json();
    report(
      stock1Data.data?.quantity === 11,
      "Verify Inventory Stock Reduced (15 -> 11)",
      `Current stock: ${stock1Data.data?.quantity} PCS`
    );

    // Over-assignment safeguard test
    const overAssignRes = await fetch(`${BACKEND_URL}/assignments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        vehicleId: testVehId,
        inventoryItemId: itemIdA,
        location: "LOCATION_A",
        quantity: 50,
      }),
    });
    report(
      overAssignRes.status === 400,
      "Over-Assignment Safeguard Rejection (Requesting 50 when only 11 available)",
      `Status: ${overAssignRes.status}`
    );

    // 8. PARTIAL RETURN & STOCK REFUND
    console.log("\n--- 8. EQUIPMENT RETURN & WAREHOUSE REFUND ---");
    const returnRes = await fetch(`${BACKEND_URL}/assignments/${assignmentId}/return`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        returnedQuantity: 1,
        remarks: "Returned 1 tripal in good condition",
      }),
    });
    const returnData = await returnRes.json();
    report(
      returnRes.status === 200 && returnData.data?.returnedQuantity === 1,
      "Return 1 Tripal to Vidisha Warehouse",
      `Returned: 1 PCS, Remaining on truck: 3 PCS`
    );

    // Verify Stock increased from 11 to 12
    const checkStock2 = await fetch(`${BACKEND_URL}/inventory/${itemIdA}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const stock2Data = await checkStock2.json();
    report(
      stock2Data.data?.quantity === 12,
      "Verify Stock Refunded upon Return (11 -> 12)",
      `Current stock: ${stock2Data.data?.quantity} PCS`
    );

    // 9. CLEANUP & SOFT DELETE REFUND
    console.log("\n--- 9. ASSIGNMENT DELETION & FULL INVENTORY RESTORATION ---");
    const delAssignRes = await fetch(`${BACKEND_URL}/assignments/${assignmentId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    report(
      delAssignRes.status === 200,
      "Delete Assignment & Fully Refund Remaining Stock to Warehouse",
      "Soft-deleted assignment"
    );

    const checkStock3 = await fetch(`${BACKEND_URL}/inventory/${itemIdA}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const stock3Data = await checkStock3.json();
    report(
      stock3Data.data?.quantity === 15,
      "Verify Inventory Stock Fully Restored to 15 PCS",
      `Restored stock: ${stock3Data.data?.quantity} PCS`
    );

    // Clean up test items
    await fetch(`${BACKEND_URL}/inventory/${itemIdA}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    await fetch(`${BACKEND_URL}/drivers/${driver1Id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    await fetch(`${BACKEND_URL}/drivers/${driver2Id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    await fetch(`${BACKEND_URL}/vehicles/${testVehId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    console.log("\n===============================================================");
    console.log(`AUDIT COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log("===============================================================");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("Full audit execution error:", err);
    process.exit(1);
  }
}

runFullAudit();
