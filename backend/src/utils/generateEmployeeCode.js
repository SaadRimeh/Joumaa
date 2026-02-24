async function generateEmployeeCode(EmployeeModel, maxAttempts = 40) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    // eslint-disable-next-line no-await-in-loop
    const exists = await EmployeeModel.exists({ uniqueCode: code });
    if (!exists) {
      return code;
    }
  }

  throw new Error("Could not generate a unique employee code");
}

module.exports = generateEmployeeCode;
