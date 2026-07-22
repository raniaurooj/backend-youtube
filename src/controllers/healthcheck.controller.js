import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";

const healthcheck = asyncHandler(async (req, res) => {
    const dbState = mongoose.connection.readyState;
    const dbStatus = {
        0: "Disconnected",
        1: "Connected",
        2: "Connecting",
        3: "Disconnecting"
    }[dbState] || "Unknown";

    const healthData = {
        uptime: process.uptime(),
        message: "OK",
        timestamp: new Date().toISOString(),
        database: dbStatus
    };

    return res
        .status(200)
        .json(new ApiResponse(200, healthData, "System is running healthy"));
});

export { healthcheck };