import app from "./app";
import { config } from "./config";
import { pool } from "./db";

const PORT = config.port;

const server = app.listen(PORT, async () => {
    try {
        // Check DB Connection
        const client = await pool.connect();
        client.release();
        console.log(`Database connected successfully.`);
        console.log(`Server running in ${config.nodeEnv} mode on port ${PORT}`);
    } catch (error) {
        console.error("Database connection failed:", error);
        process.exit(1);
    }
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err: Error) => {
    console.log("UNHANDLED REJECTION! 💥 Shutting down...");
    console.log(err.name, err.message);
    server.close(() => {
        process.exit(1);
    });
});
