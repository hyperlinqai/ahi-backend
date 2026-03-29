const testCouponAuth = async () => {
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
    const errorText = await loginResponse.text();
    console.error("Error details:", errorText);
    return;
  }

  const loginData = await loginResponse.json();
  const token = loginData.data.accessToken;
  console.log("✅ Login successful!");
  console.log("Token (first 50 chars):", token.substring(0, 50) + "...");

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  };

  console.log("Headers being sent:", headers);

  // Test GET coupons with detailed error info
  console.log("\n📋 Testing GET coupons with auth...");
  try {
    const response = await fetch(`${baseURL}/coupons`, { headers });
    console.log(`Status: ${response.status}`);
    console.log(`Status Text: ${response.statusText}`);
    
    const responseText = await response.text();
    console.log("Response body:", responseText);
    
    if (response.ok) {
      try {
        const data = JSON.parse(responseText);
        console.log("✅ Success - Parsed JSON:", data.success ? "Success" : "Failed");
      } catch (e) {
        console.log("❌ Response is not valid JSON");
      }
    } else {
      console.log("❌ Request failed");
    }
  } catch (error) {
    console.error("❌ Network error:", error.message);
  }
};

testCouponAuth();
