const { Sequelize } = require("sequelize");

const requiredEnvVars = ["DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD"];
const missingEnvVars = requiredEnvVars.filter(
  (name) => !process.env[name] || !process.env[name].trim()
);

if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing required database environment variables: ${missingEnvVars.join(", ")}`
  );
}

const DB_HOST = process.env.DB_HOST.trim();
const DB_PORT = Number(process.env.DB_PORT || 3306);
const DB_NAME = process.env.DB_NAME.trim();
const DB_USER = process.env.DB_USER.trim();
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_SSL = (process.env.DB_SSL || "false").toLowerCase() === "true";

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: "mysql",
  logging: false,
  dialectOptions: DB_SSL
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      }
    : undefined,
});

module.exports = sequelize;
