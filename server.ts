import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { startRealtimeServer } from "./lib/realtime/server";
import { startStandbyJob, stopStandbyJob } from "./lib/jobs/standby";
import { getIO } from "./lib/realtime/server";

const port = parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

let httpServer: ReturnType<typeof createServer> | null = null;

async function main() {
  try {
    await app.prepare();
    
    httpServer = createServer((req, res) => {
      const parsedUrl = parse(req.url!, true);
      handle(req, res, parsedUrl);
    });

    // Start Socket.io realtime server on separate port (3001)
    startRealtimeServer(3001);

    // Start standby job
    startStandbyJob(10);

    httpServer.listen(port, () => {
      console.log(`> Ready on http://localhost:${port}`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n${signal} received, shutting down gracefully...`);
      
      // Stop standby job
      stopStandbyJob();
      
      // Close Socket.io server
      const io = getIO();
      if (io) {
        io.close(() => {
          console.log("[Realtime] Socket.io server closed");
        });
      }
      
      // Close HTTP server
      if (httpServer) {
        httpServer.close(() => {
          console.log("[Next.js] HTTP server closed");
          process.exit(0);
        });
        
        // Force close after 10 seconds
        setTimeout(() => {
          console.error("Forced shutdown after timeout");
          process.exit(1);
        }, 10000);
      } else {
        process.exit(0);
      }
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
    
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

main();