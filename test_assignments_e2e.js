const API_BASE = "http://127.0.0.1:5000/api/v1";

async function runTests() {
  console.log("=== STARTING ASSIGNMENT & INVENTORY SYNC E2E TESTS ===");
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Login as Admin
    console.log("\n1. Logging in as Super Admin...");
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "admin",
        password: "Pass@123",
      }),
    });
    const loginData = await loginRes.json();
    assert(loginRes.ok && loginData.data?.accessToken, "Super Admin login successful");
    const token = loginData.data.accessToken;

    // 2. Fetch or Create test Vehicle
    console.log("\n2. Getting active vehicles...");
    const vehRes = await fetch(`${API_BASE}/vehicles`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const vehData = await vehRes.json();
    let vehicle = Array.isArray(vehData.data) ? vehData.data[0] : vehData.data?.vehicles?.[0];
    if (!vehicle) {
      console.log("  Creating a test vehicle...");
      const createVehRes = await fetch(`${API_BASE}/vehicles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          vehicleNo: `MP-04-${Math.floor(1000 + Math.random() * 9000)}`,
          type: "TRUCK",
          capacity: "24 TON",
          ownership: "OWNED",
          status: "ACTIVE",
        }),
      });
      const createVehData = await createVehRes.json();
      vehicle = createVehData.data;
    }
    assert(vehicle && vehicle._id, `Found or created vehicle: ${vehicle?.vehicleNo || "N/A"}`);
    const vehicleId = vehicle._id;

    // 3. Create a Test Inventory Item in Vidisha (LOCATION_A)
    console.log("\n3. Creating test inventory item in Vidisha (LOCATION_A)...");
    const invRes = await fetch(`${API_BASE}/inventory`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        itemCode: `TRIP-${Date.now().toString().slice(-6)}`,
        itemName: "E2E Test Waterproof Tripal",
        category: "TRIPAL",
        quantity: 10,
        unit: "PCS",
        location: "LOCATION_A",
        purchaseRate: 1500,
        minimumStock: 2,
        remarks: "Automated test item",
      }),
    });
    const invData = await invRes.json();
    assert(invRes.ok && invData.data?._id, `Created inventory item with 10 qty (ID: ${invData.data?._id})`);
    const itemId = invData.data._id;

    // 4. Create an Assignment of 3 Tripals to Vehicle
    console.log("\n4. Assigning 3 Tripals to vehicle...");
    const assignRes = await fetch(`${API_BASE}/assignments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        vehicleId: vehicleId,
        inventoryItemId: itemId,
        location: "LOCATION_A",
        quantity: 3,
        driverName: "Ramesh Test Driver",
        purpose: "Monsoon coverage",
        conditionOnAssign: "NEW",
      }),
    });
    const assignData = await assignRes.json();
    assert(assignRes.ok && assignData.data?._id, "Assignment created successfully");
    const assignmentId = assignData.data?._id;
    assert(assignData.data?.quantity === 3, "Assigned quantity is 3");
    assert(assignData.data?.status === "ASSIGNED", "Assignment status is ASSIGNED");

    // 5. Verify Inventory Stock Deducted from 10 to 7
    console.log("\n5. Checking inventory stock deduction...");
    const checkInvRes = await fetch(`${API_BASE}/inventory/${itemId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const checkInvData = await checkInvRes.json();
    assert(checkInvData.data?.quantity === 7, `Inventory stock properly reduced to 7 (Actual: ${checkInvData.data?.quantity})`);

    // 6. Test Over-assignment Safeguard (Attempt to assign 20 when only 7 remain)
    console.log("\n6. Testing over-assignment rejection safeguard...");
    const overRes = await fetch(`${API_BASE}/assignments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        vehicleId: vehicleId,
        inventoryItemId: itemId,
        location: "LOCATION_A",
        quantity: 20,
        purpose: "Exceed stock test",
      }),
    });
    const overData = await overRes.json();
    assert(!overRes.ok && overRes.status >= 400, `Over-assignment rejected as expected (Status: ${overRes.status}, Message: ${overData.message})`);

    // 7. Test By-Vehicle Grouped Breakdown
    console.log("\n7. Testing get assignments by vehicle breakdown...");
    const byVehRes = await fetch(`${API_BASE}/assignments/by-vehicle`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const byVehData = await byVehRes.json();
    const vehEntry = byVehData.data?.find(
      (v) => (v.vehicle?._id || v.vehicle)?.toString() === vehicleId.toString()
    );
    assert(
      vehEntry && (vehEntry.itemsCount >= 3 || vehEntry.items?.length > 0),
      `By-vehicle breakdown lists equipped vehicle with items count: ${vehEntry?.itemsCount}`
    );

    // 8. Test Partial Return (Return 1 Tripal)
    console.log("\n8. Returning 1 Tripal back to warehouse inventory...");
    const returnRes = await fetch(`${API_BASE}/assignments/${assignmentId}/return`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        returnQuantity: 1,
        conditionOnReturn: "GOOD",
        returnNotes: "Trip completed in good condition",
      }),
    });
    const returnData = await returnRes.json();
    assert(returnRes.ok, "Return operation succeeded");

    // Verify Stock increased from 7 to 8
    const checkInvRes2 = await fetch(`${API_BASE}/inventory/${itemId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const checkInvData2 = await checkInvRes2.json();
    assert(checkInvData2.data?.quantity === 8, `Inventory stock restored to 8 (Actual: ${checkInvData2.data?.quantity})`);

    // 9. Test Deleting Assignment (Restoring remaining 2 Tripals)
    console.log("\n9. Deleting assignment and verifying full refund...");
    const delRes = await fetch(`${API_BASE}/assignments/${assignmentId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const delData = await delRes.json();
    assert(delRes.ok, "Assignment deleted successfully");

    // Verify Stock increased from 8 to 10
    const checkInvRes3 = await fetch(`${API_BASE}/inventory/${itemId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const checkInvData3 = await checkInvRes3.json();
    assert(checkInvData3.data?.quantity === 10, `Inventory stock fully refunded back to 10 (Actual: ${checkInvData3.data?.quantity})`);

    // 10. Clean up test inventory item
    console.log("\n10. Cleaning up test inventory item...");
    await fetch(`${API_BASE}/inventory/${itemId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log("  ✓ Cleaned up test item.");

    // 11. Test Sub Admin access
    console.log("\n11. Testing Sub Admin (Amit) access to Assignments...");
    const subLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "amit",
        password: "Pass@123",
      }),
    });
    const subLoginData = await subLoginRes.json();
    assert(subLoginRes.ok && subLoginData.data?.accessToken, "Sub Admin 'amit' login successful");
    const subToken = subLoginData.data.accessToken;

    const subAssignListRes = await fetch(`${API_BASE}/assignments`, {
      headers: { Authorization: `Bearer ${subToken}` },
    });
    assert(subAssignListRes.ok, "Sub Admin can query assignments API successfully");

    console.log("\n==========================================");
    if (failed === 0) {
      console.log("🎉 ALL E2E ASSIGNMENT & SYNC TESTS PASSED!");
    } else {
      console.error(`💥 ${failed} TESTS FAILED!`);
      process.exit(1);
    }
  } catch (err) {
    console.error("Test execution failed:", err);
    process.exit(1);
  }
}

runTests();
