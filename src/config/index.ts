import dotenv from "dotenv";

dotenv.config();

const defaultCorsOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:5173",
    "http://localhost:5174",
    "https://admin.ahijewellery.com",
    "https://ahijewellery.com",
    "https://www.ahijewellery.com",
];

export const config = {
    port: process.env.PORT || 5000,
    nodeEnv: process.env.NODE_ENV || "development",
    dbUrl: process.env.DATABASE_URL,
    jwt: {
        accessSecret: process.env.JWT_ACCESS_SECRET || "fallback_access_secret",
        refreshSecret: process.env.JWT_REFRESH_SECRET || "fallback_refresh_secret",
        accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
    },
    razorpay: {
        keyId: process.env.RAZORPAY_KEY_ID || "rzp_test_fallback_key",
        keySecret: process.env.RAZORPAY_KEY_SECRET || "rzp_test_fallback_secret",
    },
    cors: {
        origins: process.env.CORS_ORIGINS
            ? process.env.CORS_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean)
            : defaultCorsOrigins,
    },
};
