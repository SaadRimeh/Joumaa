const http = require("http");
const app = require("./app");
const connectDB = require("./config/db");
const { PORT } = require("./config/env");
const { initSocket } = require("./config/socket");
const { ensureAdminAccount } = require("./services/bootstrapService");

async function start() {
  await connectDB();
  await ensureAdminAccount();

  const server = http.createServer(app);
  initSocket(server);

  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
