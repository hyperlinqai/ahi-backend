import express from "express";
import cors from "cors";
import morgan from "morgan";
import { config } from "./config";
import { errorHandler } from "./middleware/errorHandler";
import { AppError } from "./utils/AppError";
import routes from "./routes";

const app = express();

// Body parser
app.use(express.json());

// Dev logging middleware
if (config.nodeEnv === "development") {
    app.use(morgan("dev"));
}

// Enable CORS
app.use(
    cors({
        origin: config.cors.origins,
        credentials: true,
        allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    })
);

// Mount routers
app.use("/api/v1", routes);

// Unhandled route coverage
app.all(/(.*)/, (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handler
app.use(errorHandler);

export default app;
