const bcrypt = require("bcryptjs");
const Admin = require("../models/Admin");
const { ADMIN_NAME, ADMIN_PHONE, ADMIN_PASSWORD, DEFAULT_KILO_PRICE } = require("../config/env");
const { logAction } = require("./auditService");

async function ensureAdminAccount() {
  let admin = await Admin.findOne({ phone: ADMIN_PHONE }).select("+password");

  if (!admin) {
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
    admin = await Admin.create({
      name: ADMIN_NAME,
      phone: ADMIN_PHONE,
      password: hashedPassword,
      currentKiloPrice: DEFAULT_KILO_PRICE,
    });

    await logAction({
      actorRole: "system",
      action: "ADMIN_ACCOUNT_BOOTSTRAPPED",
      entityType: "Admin",
      entityId: admin._id,
      payload: {
        phone: ADMIN_PHONE,
      },
    });
    return admin;
  }

  let shouldSave = false;
  if (admin.name !== ADMIN_NAME) {
    admin.name = ADMIN_NAME;
    shouldSave = true;
  }
  const passwordMatches = await bcrypt.compare(ADMIN_PASSWORD, admin.password);
  if (!passwordMatches) {
    admin.password = await bcrypt.hash(ADMIN_PASSWORD, 10);
    shouldSave = true;
  }
  if (typeof admin.currentKiloPrice !== "number") {
    admin.currentKiloPrice = DEFAULT_KILO_PRICE;
    shouldSave = true;
  }

  if (shouldSave) {
    await admin.save();
  }

  return admin;
}

module.exports = {
  ensureAdminAccount,
};
