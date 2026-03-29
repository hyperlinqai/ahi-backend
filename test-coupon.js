const axios = require('axios');
async function run() {
  try {
    const loginRes = await axios.post('http://localhost:5001/api/v1/auth/login', {
      email: 'admin@ahijewellery.com',
      password: 'admin123456'
    });
    const token = loginRes.data.data.accessToken;
    console.log("Logged in!");

    const createRes = await axios.post('http://localhost:5001/api/v1/coupons', {
      code: "DUSSEHR20",
      type: "PERCENTAGE",
      discountValue: 20,
      maxDiscount: 500,
      minOrderValue: 1000
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Create success:", createRes.data);
  } catch (err) {
    if (err.response) {
      console.error("API Error:", JSON.stringify(err.response.data, null, 2));
    } else {
      console.error(err.message);
    }
  }
}
run();
