const testCouponCRUD = async () => {
  const baseURL = "http://localhost:5001/api/v1";
  
  // Import node-fetch
  const fetch = (await import('node-fetch')).default;
  
  // First login to get token
  console.log("🔐 Logging in...");
  const loginResponse = await fetch(`${baseURL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      email: "admin@ahijewellery.com", 
      password: "admin123456" 
    }),
  });

  if (!loginResponse.ok) {
    console.error("❌ Login failed:", loginResponse.status);
    return;
  }

  const loginData = await loginResponse.json();
  const token = loginData.data.accessToken;
  console.log("✅ Login successful!");

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  };

  // Test 1: Get all coupons
  console.log("\n📋 Testing GET all coupons...");
  try {
    const response = await fetch(`${baseURL}/coupons`, { headers });
    console.log(`Status: ${response.status}`);
    const data = await response.json();
    console.log("Response:", data.success ? "✅ Success" : "❌ Failed");
    if (data.success) {
      console.log(`Found ${data.data?.length || 0} coupons`);
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }

  // Test 2: Create a coupon
  console.log("\n➕ Testing CREATE coupon...");
  const newCoupon = {
    code: "TEST2024",
    type: "PERCENTAGE",
    discountValue: 10,
    maxDiscount: 500,
    minOrderValue: 1000,
    usageLimit: 100,
    perUserLimit: 5,
    isActive: true,
    startDate: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
  };

  try {
    const response = await fetch(`${baseURL}/coupons`, {
      method: "POST",
      headers,
      body: JSON.stringify(newCoupon)
    });
    console.log(`Status: ${response.status}`);
    const data = await response.json();
    console.log("Response:", data.success ? "✅ Success" : "❌ Failed");
    if (data.success) {
      console.log("Created coupon:", data.data.code);
      const couponId = data.data.id;
      
      // Test 3: Get single coupon
      console.log("\n👁️ Testing GET single coupon...");
      const getResponse = await fetch(`${baseURL}/coupons/${couponId}`, { headers });
      console.log(`Status: ${getResponse.status}`);
      const getData = await getResponse.json();
      console.log("Response:", getData.success ? "✅ Success" : "❌ Failed");

      // Test 4: Update coupon
      console.log("\n✏️ Testing UPDATE coupon...");
      const updateResponse = await fetch(`${baseURL}/coupons/${couponId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ discountValue: 15 })
      });
      console.log(`Status: ${updateResponse.status}`);
      const updateData = await updateResponse.json();
      console.log("Response:", updateData.success ? "✅ Success" : "❌ Failed");

      // Test 5: Delete coupon
      console.log("\n🗑️ Testing DELETE coupon...");
      const deleteResponse = await fetch(`${baseURL}/coupons/${couponId}`, {
        method: "DELETE",
        headers
      });
      console.log(`Status: ${deleteResponse.status}`);
      const deleteData = await deleteResponse.json();
      console.log("Response:", deleteData.success ? "✅ Success" : "❌ Failed");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
};

testCouponCRUD();
