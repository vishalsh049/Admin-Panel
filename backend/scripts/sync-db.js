require("dotenv").config();

const sequelize = require("../config/db");
require("../models");
const ensureProductSourceColumn = require("../utils/ensureProductSourceColumn");

async function syncDatabase() {
  try {
    await sequelize.authenticate();
    console.log("Database connected");

    await sequelize.sync({ alter: false, force: false });
    await ensureProductSourceColumn(sequelize);
    console.log("Database schema synced successfully");

    process.exit(0);
  } catch (error) {
    console.error("Database sync failed:", error.message || error);
    process.exit(1);
  }
}

syncDatabase();
