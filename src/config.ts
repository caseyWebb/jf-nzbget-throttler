import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

export const config = {
  jellyfin: {
    url: process.env.JELLYFIN_URL || "http://localhost:8096",
    apiKey: process.env.JELLYFIN_API_KEY || "",
  },
  nzbget: {
    url: process.env.NZBGET_URL || "http://localhost:6789",
    username: process.env.NZBGET_USERNAME || "nzbget",
    password: process.env.NZBGET_PASSWORD || "tegbzn6789",
  },
  throttling: {
    defaultSpeed: parseInt(process.env.DEFAULT_SPEED || "0", 10),
    checkInterval: parseInt(process.env.CHECK_INTERVAL || "30", 10),
    maxConnectionSpeed: parseInt(
      process.env.MAX_CONNECTION_SPEED || "125000",
      10,
    ), // 1Gbps = 125000 KB/s
    bufferPercentage: parseInt(process.env.BUFFER_PERCENTAGE || "20", 10),
  },
};
