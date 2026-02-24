const Employee = require("../models/Employee");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const { logAction } = require("../services/auditService");
const {
  getDailyReport,
  getEmployeePerformanceReport,
  getMerchantReport,
  exportReportToExcel,
  exportReportToPdf,
} = require("../services/reportService");
const { isWhatsAppConfigured, sendWhatsAppText } = require("../services/whatsappService");

function normalizeType(type) {
  const value = String(type || "").trim().toLowerCase();
  if (!["daily", "employees", "merchants"].includes(value)) {
    throw new ApiError(400, "type must be one of: daily, employees, merchants");
  }
  return value;
}

async function getReportData(type, query) {
  if (type === "daily") {
    return getDailyReport(query.date);
  }
  if (type === "employees") {
    return getEmployeePerformanceReport(query.from, query.to);
  }
  return getMerchantReport(query.from, query.to);
}

function formatWhatsAppMessage(type, reportData) {
  if (type === "daily") {
    return (
      `Daily report\n` +
      `Date: ${reportData.range.start.toISOString().slice(0, 10)}\n` +
      `Total quantity: ${reportData.totals.totalQuantity}\n` +
      `Total sales: ${reportData.totals.totalSales}\n` +
      `Transactions: ${reportData.totals.totalTransactions}`
    );
  }

  if (type === "employees") {
    return (
      `Employees performance report\n` +
      `Range: ${reportData.range.start.toISOString().slice(0, 10)} to ${reportData.range.end
        .toISOString()
        .slice(0, 10)}\n` +
      `Total received: ${reportData.totals.totalReceived}\n` +
      `Total distributed: ${reportData.totals.totalDistributed}\n` +
      `Total sales: ${reportData.totals.totalSales}`
    );
  }

  return (
    `Merchants report\n` +
    `Range: ${reportData.range.start.toISOString().slice(0, 10)} to ${reportData.range.end
      .toISOString()
      .slice(0, 10)}\n` +
    `Total quantity: ${reportData.totals.totalQuantity}\n` +
    `Total sales: ${reportData.totals.totalSales}\n` +
    `Transactions: ${reportData.totals.totalTransactions}`
  );
}

const getDailyReportController = asyncHandler(async (req, res) => {
  const report = await getDailyReport(req.query.date);
  res.status(200).json({ success: true, data: report });
});

const getEmployeePerformanceReportController = asyncHandler(async (req, res) => {
  const report = await getEmployeePerformanceReport(req.query.from, req.query.to);
  res.status(200).json({ success: true, data: report });
});

const getMerchantReportController = asyncHandler(async (req, res) => {
  const report = await getMerchantReport(req.query.from, req.query.to);
  res.status(200).json({ success: true, data: report });
});

const exportReportController = asyncHandler(async (req, res) => {
  const type = normalizeType(req.query.type);
  const format = String(req.query.format || "").trim().toLowerCase();

  if (!["excel", "pdf"].includes(format)) {
    throw new ApiError(400, "format must be either excel or pdf");
  }

  const reportData = await getReportData(type, req.query);

  if (format === "excel") {
    const buffer = await exportReportToExcel(type, reportData);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename=${type}-report.xlsx`);
    return res.send(buffer);
  }

  const buffer = await exportReportToPdf(type, reportData);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=${type}-report.pdf`);
  return res.send(buffer);
});

const sendWhatsAppReportController = asyncHandler(async (req, res) => {
  if (!isWhatsAppConfigured()) {
    throw new ApiError(
      400,
      "WhatsApp integration is not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID."
    );
  }

  const type = normalizeType(req.body.reportType || req.body.type);
  const reportData = await getReportData(type, req.body);
  const message = formatWhatsAppMessage(type, reportData);

  const employeeIds = Array.isArray(req.body.employeeIds) ? req.body.employeeIds : [];
  const employeeFilter = { isActive: true };
  if (employeeIds.length > 0) {
    employeeFilter._id = { $in: employeeIds };
  }

  const employees = await Employee.find(employeeFilter).select("name phone");
  if (!employees.length) {
    throw new ApiError(404, "No active employees found to send WhatsApp report");
  }

  const results = await Promise.allSettled(
    employees.map((employee) => sendWhatsAppText({ to: employee.phone, body: message }))
  );

  const success = [];
  const failed = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      success.push({
        employeeId: employees[index]._id,
        name: employees[index].name,
        phone: employees[index].phone,
      });
    } else {
      failed.push({
        employeeId: employees[index]._id,
        name: employees[index].name,
        phone: employees[index].phone,
        reason: result.reason?.message || "Unknown error",
      });
    }
  });

  await logAction({
    actorRole: "admin",
    actorId: req.user.adminId,
    action: "WHATSAPP_REPORT_SENT",
    entityType: "Report",
    payload: {
      reportType: type,
      totalRecipients: employees.length,
      successful: success.length,
      failed: failed.length,
    },
  });

  res.status(200).json({
    success: true,
    data: {
      reportType: type,
      recipients: employees.length,
      successful: success.length,
      failed: failed.length,
      details: {
        success,
        failed,
      },
    },
  });
});

module.exports = {
  getDailyReportController,
  getEmployeePerformanceReportController,
  getMerchantReportController,
  exportReportController,
  sendWhatsAppReportController,
};
