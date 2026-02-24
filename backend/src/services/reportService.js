const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const Distribution = require("../models/Distribution");
const Employee = require("../models/Employee");
const Merchant = require("../models/Merchant");
const Receiving = require("../models/Receiving");
const { getCustomRange, getDayRange, getMonthRange } = require("../utils/dateUtils");

function toFixed2(value) {
  return Number(value || 0).toFixed(2);
}

function resolveRange({ date, from, to, defaultPeriod = "day" }) {
  if (date) {
    return getDayRange(date);
  }

  const custom = getCustomRange(from, to);
  if (custom) {
    return custom;
  }

  if (defaultPeriod === "month") {
    return getMonthRange(new Date());
  }

  return getDayRange(new Date());
}

async function getDailyReport(dateValue) {
  const { start, end } = getDayRange(dateValue || new Date());
  const match = { createdAt: { $gte: start, $lt: end } };

  const [totalsAgg, byEmployee, byMerchant] = await Promise.all([
    Distribution.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: "$quantity" },
          totalSales: { $sum: "$totalAmount" },
          totalTransactions: { $sum: 1 },
        },
      },
    ]),
    Distribution.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$employeeId",
          totalQuantity: { $sum: "$quantity" },
          totalSales: { $sum: "$totalAmount" },
          totalTransactions: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "employees",
          localField: "_id",
          foreignField: "_id",
          as: "employee",
        },
      },
      {
        $unwind: {
          path: "$employee",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 0,
          employeeId: "$_id",
          name: { $ifNull: ["$employee.name", "غير معروف"] },
          phone: { $ifNull: ["$employee.phone", ""] },
          car: { $ifNull: ["$employee.car", ""] },
          totalQuantity: 1,
          totalSales: 1,
          totalTransactions: 1,
        },
      },
      { $sort: { totalQuantity: -1 } },
    ]),
    Distribution.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$merchantId",
          merchantName: { $first: "$merchantName" },
          totalQuantity: { $sum: "$quantity" },
          totalSales: { $sum: "$totalAmount" },
          totalTransactions: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "merchants",
          localField: "_id",
          foreignField: "_id",
          as: "merchant",
        },
      },
      {
        $unwind: {
          path: "$merchant",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 0,
          merchantId: "$_id",
          merchantName: {
            $ifNull: ["$merchantName", { $ifNull: ["$merchant.name", "غير معروف"] }],
          },
          phone: { $ifNull: ["$merchant.phone", ""] },
          shopName: { $ifNull: ["$merchant.shopName", ""] },
          totalQuantity: 1,
          totalSales: 1,
          totalTransactions: 1,
        },
      },
      { $sort: { totalQuantity: -1 } },
    ]),
  ]);

  return {
    type: "daily",
    range: { start, end },
    totals: {
      totalQuantity: totalsAgg[0]?.totalQuantity || 0,
      totalSales: totalsAgg[0]?.totalSales || 0,
      totalTransactions: totalsAgg[0]?.totalTransactions || 0,
    },
    byEmployee,
    byMerchant,
  };
}

async function getEmployeePerformanceReport(fromValue, toValue) {
  const { start, end } = resolveRange({
    from: fromValue,
    to: toValue,
    defaultPeriod: "month",
  });
  const match = { createdAt: { $gte: start, $lt: end } };

  const [employees, distAgg, receivingAgg] = await Promise.all([
    Employee.find().lean(),
    Distribution.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$employeeId",
          totalDistributed: { $sum: "$quantity" },
          totalSales: { $sum: "$totalAmount" },
          totalTransactions: { $sum: 1 },
        },
      },
    ]),
    Receiving.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$employeeId",
          periodReceived: { $sum: "$quantity" },
        },
      },
    ]),
  ]);

  const distMap = new Map(distAgg.map((row) => [row._id.toString(), row]));
  const recvMap = new Map(receivingAgg.map((row) => [row._id.toString(), row]));

  const rows = employees
    .map((employee) => {
      const id = employee._id.toString();
      const dist = distMap.get(id);
      const recv = recvMap.get(id);
      const periodReceived = recv?.periodReceived || 0;
      const totalDistributed = dist?.totalDistributed || 0;
      const distributionRate =
        periodReceived > 0 ? (totalDistributed / periodReceived) * 100 : 0;

      return {
        employeeId: employee._id,
        name: employee.name,
        phone: employee.phone,
        car: employee.car,
        isActive: employee.isActive,
        currentStock: employee.currentStock,
        totalReceivedAllTime: employee.totalReceived,
        totalDistributedAllTime: employee.totalDistributed,
        periodReceived,
        periodDistributed: totalDistributed,
        periodSales: dist?.totalSales || 0,
        periodTransactions: dist?.totalTransactions || 0,
        distributionRate,
      };
    })
    .sort((a, b) => b.periodSales - a.periodSales);

  const totals = rows.reduce(
    (acc, row) => {
      acc.totalReceived += row.periodReceived;
      acc.totalDistributed += row.periodDistributed;
      acc.totalSales += row.periodSales;
      acc.totalTransactions += row.periodTransactions;
      return acc;
    },
    {
      totalReceived: 0,
      totalDistributed: 0,
      totalSales: 0,
      totalTransactions: 0,
    }
  );

  return {
    type: "employees",
    range: { start, end },
    totals,
    employees: rows,
  };
}

async function getMerchantReport(fromValue, toValue) {
  const { start, end } = resolveRange({
    from: fromValue,
    to: toValue,
    defaultPeriod: "month",
  });
  const match = { createdAt: { $gte: start, $lt: end } };

  const [rows, merchantCount] = await Promise.all([
    Distribution.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$merchantId",
          merchantName: { $first: "$merchantName" },
          totalQuantity: { $sum: "$quantity" },
          totalSales: { $sum: "$totalAmount" },
          totalTransactions: { $sum: 1 },
          uniqueEmployees: { $addToSet: "$employeeId" },
          lastDistributionAt: { $max: "$createdAt" },
        },
      },
      {
        $lookup: {
          from: "merchants",
          localField: "_id",
          foreignField: "_id",
          as: "merchant",
        },
      },
      {
        $unwind: {
          path: "$merchant",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 0,
          merchantId: "$_id",
          merchantName: {
            $ifNull: ["$merchantName", { $ifNull: ["$merchant.name", "غير معروف"] }],
          },
          phone: { $ifNull: ["$merchant.phone", ""] },
          shopName: { $ifNull: ["$merchant.shopName", ""] },
          totalQuantity: 1,
          totalSales: 1,
          totalTransactions: 1,
          employeeCount: { $size: "$uniqueEmployees" },
          lastDistributionAt: 1,
        },
      },
      { $sort: { totalQuantity: -1 } },
    ]),
    Merchant.countDocuments(),
  ]);

  const totals = rows.reduce(
    (acc, row) => {
      acc.totalQuantity += row.totalQuantity;
      acc.totalSales += row.totalSales;
      acc.totalTransactions += row.totalTransactions;
      return acc;
    },
    {
      totalQuantity: 0,
      totalSales: 0,
      totalTransactions: 0,
    }
  );

  return {
    type: "merchants",
    range: { start, end },
    totals,
    totalMerchants: merchantCount,
    topMerchant: rows[0] || null,
    merchants: rows,
  };
}

function addSummarySheet(workbook, reportType, reportData) {
  const summary = workbook.addWorksheet("Summary");
  summary.addRow(["Report Type", reportType]);
  summary.addRow(["Range Start", reportData.range.start.toISOString()]);
  summary.addRow(["Range End", reportData.range.end.toISOString()]);
  summary.addRow([]);

  Object.entries(reportData.totals || {}).forEach(([key, value]) => {
    summary.addRow([key, value]);
  });

  summary.columns.forEach((column) => {
    // eslint-disable-next-line no-param-reassign
    column.width = 28;
  });
}

function autoSizeColumns(sheet) {
  sheet.columns.forEach((column) => {
    let maxLength = 12;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const length = cell.value ? String(cell.value).length : 0;
      if (length > maxLength) {
        maxLength = length;
      }
    });
    // eslint-disable-next-line no-param-reassign
    column.width = Math.min(42, maxLength + 2);
  });
}

async function exportReportToExcel(reportType, reportData) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Joumaa Backend";
  workbook.created = new Date();

  addSummarySheet(workbook, reportType, reportData);

  if (reportType === "daily") {
    const employeesSheet = workbook.addWorksheet("Employee Daily");
    employeesSheet.columns = [
      { header: "Employee", key: "name" },
      { header: "Phone", key: "phone" },
      { header: "Car", key: "car" },
      { header: "Quantity", key: "totalQuantity" },
      { header: "Sales", key: "totalSales" },
      { header: "Transactions", key: "totalTransactions" },
    ];
    reportData.byEmployee.forEach((row) => employeesSheet.addRow(row));
    autoSizeColumns(employeesSheet);

    const merchantsSheet = workbook.addWorksheet("Merchant Daily");
    merchantsSheet.columns = [
      { header: "Merchant", key: "merchantName" },
      { header: "Phone", key: "phone" },
      { header: "Shop", key: "shopName" },
      { header: "Quantity", key: "totalQuantity" },
      { header: "Sales", key: "totalSales" },
      { header: "Transactions", key: "totalTransactions" },
    ];
    reportData.byMerchant.forEach((row) => merchantsSheet.addRow(row));
    autoSizeColumns(merchantsSheet);
  }

  if (reportType === "employees") {
    const sheet = workbook.addWorksheet("Employee Performance");
    sheet.columns = [
      { header: "Employee", key: "name" },
      { header: "Phone", key: "phone" },
      { header: "Car", key: "car" },
      { header: "Period Received", key: "periodReceived" },
      { header: "Period Distributed", key: "periodDistributed" },
      { header: "Period Sales", key: "periodSales" },
      { header: "Transactions", key: "periodTransactions" },
      { header: "Distribution Rate (%)", key: "distributionRate" },
      { header: "Current Stock", key: "currentStock" },
    ];
    reportData.employees.forEach((row) => {
      sheet.addRow({
        ...row,
        distributionRate: toFixed2(row.distributionRate),
      });
    });
    autoSizeColumns(sheet);
  }

  if (reportType === "merchants") {
    const sheet = workbook.addWorksheet("Merchants");
    sheet.columns = [
      { header: "Merchant", key: "merchantName" },
      { header: "Phone", key: "phone" },
      { header: "Shop", key: "shopName" },
      { header: "Quantity", key: "totalQuantity" },
      { header: "Sales", key: "totalSales" },
      { header: "Transactions", key: "totalTransactions" },
      { header: "Employee Count", key: "employeeCount" },
      { header: "Last Distribution", key: "lastDistributionAt" },
    ];
    reportData.merchants.forEach((row) => sheet.addRow(row));
    autoSizeColumns(sheet);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function addPdfKeyValue(doc, key, value) {
  doc.font("Helvetica-Bold").text(`${key}: `, { continued: true });
  doc.font("Helvetica").text(String(value));
}

async function exportReportToPdf(reportType, reportData) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(16).font("Helvetica-Bold").text(`Joumaa Report: ${reportType}`, {
      align: "center",
    });
    doc.moveDown(0.5);
    doc.fontSize(10).font("Helvetica").text(`Generated: ${new Date().toISOString()}`);
    doc.text(`Range: ${reportData.range.start.toISOString()} -> ${reportData.range.end.toISOString()}`);
    doc.moveDown();

    doc.fontSize(12).font("Helvetica-Bold").text("Summary");
    doc.moveDown(0.5);

    Object.entries(reportData.totals || {}).forEach(([key, value]) => {
      addPdfKeyValue(doc, key, value);
    });

    doc.moveDown();
    doc.fontSize(12).font("Helvetica-Bold").text("Top Records");
    doc.moveDown(0.5);

    if (reportType === "daily") {
      reportData.byEmployee.slice(0, 10).forEach((row, index) => {
        doc
          .font("Helvetica")
          .fontSize(10)
          .text(
            `${index + 1}. ${row.name} | Qty: ${toFixed2(row.totalQuantity)} | Sales: ${toFixed2(
              row.totalSales
            )}`
          );
      });
    }

    if (reportType === "employees") {
      reportData.employees.slice(0, 10).forEach((row, index) => {
        doc
          .font("Helvetica")
          .fontSize(10)
          .text(
            `${index + 1}. ${row.name} | Dist: ${toFixed2(row.periodDistributed)} | Sales: ${toFixed2(
              row.periodSales
            )}`
          );
      });
    }

    if (reportType === "merchants") {
      reportData.merchants.slice(0, 10).forEach((row, index) => {
        doc
          .font("Helvetica")
          .fontSize(10)
          .text(
            `${index + 1}. ${row.merchantName} | Qty: ${toFixed2(
              row.totalQuantity
            )} | Sales: ${toFixed2(row.totalSales)}`
          );
      });
    }

    doc.end();
  });
}

module.exports = {
  getDailyReport,
  getEmployeePerformanceReport,
  getMerchantReport,
  exportReportToExcel,
  exportReportToPdf,
  resolveRange,
};
