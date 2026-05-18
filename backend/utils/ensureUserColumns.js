const { QueryTypes } = require("sequelize");

async function ensureColumn(sequelize, columnName, definition) {
  const columns = await sequelize.query("DESCRIBE users", {
    type: QueryTypes.SELECT,
  });

  const exists = columns.some((column) => column.Field === columnName);

  if (!exists) {
    await sequelize.query(`ALTER TABLE users ADD COLUMN ${columnName} ${definition}`);
  }
}

async function ensureUserColumns(sequelize) {
  await ensureColumn(sequelize, "name", "VARCHAR(255) NOT NULL DEFAULT '' AFTER email");
  await ensureColumn(sequelize, "role", "VARCHAR(100) NOT NULL DEFAULT 'staff' AFTER password");

  await sequelize.query(
    `
    UPDATE users
    SET name = CASE
      WHEN name IS NULL OR TRIM(name) = '' THEN SUBSTRING_INDEX(email, '@', 1)
      ELSE name
    END,
    role = CASE
      WHEN id = 1 AND (role IS NULL OR TRIM(role) = '' OR role = 'staff') THEN 'admin'
      WHEN role IS NULL OR TRIM(role) = '' THEN 'staff'
      ELSE role
    END
    `
  );
}

module.exports = ensureUserColumns;
