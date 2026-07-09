require("dotenv").config();

const fs = require("fs");
const path = require("path");
const sequelize = require("../config/db");

const MIGRATIONS_DIR = path.join(__dirname, "..", "migrations");

async function ensureMigrationsTable() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      run_at DATETIME NOT NULL
    )
  `);
}

async function getAppliedMigrations() {
  const [rows] = await sequelize.query("SELECT name FROM schema_migrations");
  return new Set(rows.map((r) => r.name));
}

async function run() {
  await sequelize.authenticate();
  await ensureMigrationsTable();

  const applied = await getAppliedMigrations();
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".js"))
    .sort();

  const queryInterface = sequelize.getQueryInterface();
  const { DataTypes, Op } = require("sequelize");

  let ranCount = 0;
  for (const file of files) {
    if (applied.has(file)) continue;

    console.log(`Applying migration: ${file}`);
    const migration = require(path.join(MIGRATIONS_DIR, file));

    await migration.up(queryInterface, { DataTypes, Op, sequelize });

    await sequelize.query(
      "INSERT INTO schema_migrations (name, run_at) VALUES (:name, NOW())",
      { replacements: { name: file } }
    );
    console.log(`Applied: ${file}`);
    ranCount += 1;
  }

  if (ranCount === 0) {
    console.log("No pending migrations.");
  } else {
    console.log(`Applied ${ranCount} migration(s).`);
  }
}

if (require.main === module) {
  run()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Migration failed:", error.message || error);
      process.exit(1);
    });
}

module.exports = { run };
