const { getIO } = require("../config/socket");
const { getDashboardStats } = require("./statsService");

function getIOOrNull() {
  try {
    return getIO();
  } catch (error) {
    return null;
  }
}

function emitPriceUpdated(payload) {
  const io = getIOOrNull();
  if (!io) {
    return;
  }
  io.emit("price:updated", payload);
}

function emitDistributionCreated(payload) {
  const io = getIOOrNull();
  if (!io) {
    return;
  }

  io.to("admins").emit("distribution:new", payload);

  if (payload?.employeeId?._id || payload?.employeeId) {
    const employeeId = payload.employeeId._id || payload.employeeId;
    io.to(`employee:${employeeId}`).emit("distribution:new", payload);
  }
}

function emitReceivingCreated(payload) {
  const io = getIOOrNull();
  if (!io) {
    return;
  }

  io.to("admins").emit("receiving:new", payload);

  if (payload?.employeeId?._id || payload?.employeeId) {
    const employeeId = payload.employeeId._id || payload.employeeId;
    io.to(`employee:${employeeId}`).emit("receiving:new", payload);
  }
}

function emitLowStockAlert(payload) {
  const io = getIOOrNull();
  if (!io) {
    return;
  }

  io.to("admins").emit("stock:low", payload);
  io.to(`employee:${payload.employeeId}`).emit("stock:low", payload);
}

function emitEmployeeStatusUpdated(payload) {
  const io = getIOOrNull();
  if (!io || !payload?.employeeId) {
    return;
  }

  io.to(`employee:${payload.employeeId}`).emit("employee:status-updated", payload);
}

function emitEmployeeSessionRevoked(payload) {
  const io = getIOOrNull();
  if (!io || !payload?.employeeId) {
    return;
  }

  io.to(`employee:${payload.employeeId}`).emit("employee:session-revoked", payload);
}

async function broadcastAdminStatsUpdate() {
  const io = getIOOrNull();
  if (!io) {
    return;
  }

  const stats = await getDashboardStats();
  io.to("admins").emit("stats:updated", stats);
}

module.exports = {
  emitPriceUpdated,
  emitDistributionCreated,
  emitReceivingCreated,
  emitLowStockAlert,
  emitEmployeeStatusUpdated,
  emitEmployeeSessionRevoked,
  broadcastAdminStatsUpdate,
};
