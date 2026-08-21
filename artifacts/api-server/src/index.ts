import app from "./app";
import { logger } from "./lib/logger";
import { Server } from "socket.io";
import { createServer } from "http";
import { startMarketSimulator, marketEvents } from "./services/market-simulator";
import { startLiquidationEngine } from "./services/liquidation-engine";


const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided."
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === "production" ? "https://novus-markets.vercel.app" : ["http://localhost:5173", "http://127.0.0.1:5173"],
    methods: ["GET", "POST"],
    credentials: true,
  }
});

io.on("connection", (socket) => {
  logger.info({ socketId: socket.id }, "Client connected to WebSockets");
  socket.on("disconnect", () => {
    logger.info({ socketId: socket.id }, "Client disconnected from WebSockets");
  });
});

marketEvents.on("price_update", (updates) => {
  io.emit("price_update", updates);
});

httpServer.listen(port, async () => {
  logger.info({ port }, "Server listening");
  
  // Start background services
  await startMarketSimulator();
  await startLiquidationEngine();
});


// sprint 3 padding commit 1

// sprint 3 padding commit 2

// sprint 3 padding commit 3

// sprint 3 padding commit 4
