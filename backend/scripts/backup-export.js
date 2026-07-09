require("dotenv").config();

const fs = require("fs");
const path = require("path");
const sequelize = require("../config/db");

const TABLES = ["products", "product_categories"];

async function exportTable(tableName) {
  const [rows] = await sequelize.query(`SELECT * FROM \`${tableName}\``);
  return rows;
}

async function run() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = path.join(__dirname, "..", "backups");
  fs.mkdirSync(outDir, { recursive: true });

  try {
    await sequelize.authenticate();

    const dump = { timestamp, tables: {} };
    for (const table of TABLES) {
      try {
        dump.tables[table] = await exportTable(table);
        console.log(`Exported ${table}: ${dump.tables[table].length} rows`);
      } catch (error) {
        console.warn(`Skipping ${table}: ${error.message}`);
        dump.tables[table] = { error: error.message };
      }
    }

    const outFile = path.join(outDir, `backup-${timestamp}.json`);
    fs.writeFileSync(outFile, JSON.stringify(dump, null, 2));
    console.log(`Backup written to ${outFile}`);
    process.exit(0);
  } catch (error) {
    console.error("Backup failed:", error.message || error);
    process.exit(1);
  }
}

run();
