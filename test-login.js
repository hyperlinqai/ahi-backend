const axios = require('axios');
async function run() {
    try {
        const loginRes = await axios.post('http://127.0.0.1:5001/api/v1/auth/login', {
            email: 'admin@ahijewellery.com',
            password: 'admin123456'
        });
        const token = loginRes.data.data.accessToken;

        const cleanPayload = {
            code: "DUSSEHRA20",
            type: "PERCENTAGE",
            discountValue: 20,
            maxDiscount: 500,
            minOrderValue: 1000,
            isActive: true
        };

        const createRes = await axios.post('http://127.0.0.1:5001/api/v1/coupons', cleanPayload, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log("Coupon Created:", createRes.data);
    } catch (err) {
        if (err.response) {
            console.error("API Error Response:", err.response.status, JSON.stringify(err.response.data, null, 2));
        } else {
            console.error("Error:", err.message);
        }
    }
}
run();
