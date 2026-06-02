import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { handleChat } from "./api/lib/chat";
import { handleTickets } from "./api/lib/tickets";
import { nodeHandler } from "./api/lib/http";

function apiDevPlugin(): Plugin {
  const chatHandler = nodeHandler(handleChat);
  const ticketsHandler = nodeHandler(handleTickets);

  return {
    name: "api-dev",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split("?")[0];
        if (path === "/api/chat") return void chatHandler(req, res);
        if (path === "/api/tickets") return void ticketsHandler(req, res);
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
    apiDevPlugin(),
  ],
  server: {
    port: 5173,
    strictPort: false,
  },
});
