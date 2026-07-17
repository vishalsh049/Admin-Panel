const express = require("express");
const { QueryTypes } = require("sequelize");
const sequelize = require("../config/db");
const ensureUserColumns = require("../utils/ensureUserColumns");
const adminAuth = require("../middleware/adminAuth");
const requireAdminRole = require("../middleware/requireAdminRole");

const router = express.Router();

// User/role management is restricted to the "admin" role — any authenticated
// admin-panel user could otherwise list every account's password hash,
// change roles, reset passwords, or delete accounts.
router.use(adminAuth, requireAdminRole);

const normalizeEmail = (email) => email?.trim().toLowerCase() || "";
const normalizeName = (name, email) => {
  const trimmed = name?.trim();
  if (trimmed) return trimmed;
  return normalizeEmail(email).split("@")[0] || "User";
};

const normalizeRole = (role) => role?.trim().toLowerCase() || "staff";

router.get("/", async (req, res) => {
  try {
    await ensureUserColumns(sequelize);

    const users = await sequelize.query(
      `
      SELECT id, name, email, role, created_at
      FROM users
      ORDER BY id DESC
      `,
      {
        type: QueryTypes.SELECT,
      }
    );

    res.json(users);
  } catch (error) {
    console.error("GET USERS ERROR:", error);
    res.status(500).json({ message: "Failed to load users" });
  }
});

router.post("/", async (req, res) => {
  try {
    await ensureUserColumns(sequelize);

    const email = normalizeEmail(req.body.email);
    const password = req.body.password?.trim();
    const name = normalizeName(req.body.name, email);
    const role = normalizeRole(req.body.role);

    if (!email || !password) {
      return res.status(400).json({
        message: "Name, email, password, and role are required",
      });
    }

    const existing = await sequelize.query(
      "SELECT id FROM users WHERE LOWER(email) = LOWER(:email)",
      {
        replacements: { email },
        type: QueryTypes.SELECT,
      }
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: "Email already exists" });
    }

    await sequelize.query(
      `
      INSERT INTO users (name, email, password, role)
      VALUES (:name, :email, :password, :role)
      `,
      {
        replacements: {
          name,
          email,
          password: password,
          role,
        },
        type: QueryTypes.INSERT,
      }
    );

    res.json({ message: "User created successfully" });
  } catch (error) {
    console.error("CREATE USER ERROR:", error);
    res.status(500).json({
      message: error.message || "Failed to create user",
    });
  }
});

router.put("/reset-password/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const password = req.body.password?.trim();

    if (!password) {
      return res.status(400).json({
        message: "Password is required",
      });
    }

    await sequelize.query(
      "UPDATE users SET password = :password WHERE id = :id",
      {
        replacements: {
          id,
          password: password,
        },
        type: QueryTypes.UPDATE,
      }
    );

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);
    res.status(500).json({
      message: "Failed to update password",
    });
  }
});

router.put("/:id", async (req, res) => {
  try {
    await ensureUserColumns(sequelize);

    const { id } = req.params;
    const email = normalizeEmail(req.body.email);
    const name = normalizeName(req.body.name, email);
    const role = normalizeRole(req.body.role);
    const password = req.body.password?.trim();

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const existing = await sequelize.query(
      "SELECT id FROM users WHERE LOWER(email) = LOWER(:email) AND id != :id",
      {
        replacements: { email, id },
        type: QueryTypes.SELECT,
      }
    );

    if (existing.length > 0) {
      return res.status(400).json({
        message: "Email already used by another user",
      });
    }

    let query = `
      UPDATE users
      SET name = :name, email = :email, role = :role
    `;

    const replacements = { id, name, email, role };

    if (password) {
      query += ", password = :password";
      replacements.password = password;
    }

    query += " WHERE id = :id";

    await sequelize.query(query, {
      replacements,
      type: QueryTypes.UPDATE,
    });

    res.json({ message: "User updated successfully" });
  } catch (error) {
    console.error("UPDATE USER ERROR:", error);
    res.status(500).json({
      message: "Failed to update user",
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await sequelize.query(
      "DELETE FROM users WHERE id = :id",
      {
        replacements: { id },
        type: QueryTypes.DELETE,
      }
    );

    res.json({ message: "User deleted" });
  } catch (error) {
    console.error("DELETE USER ERROR:", error);
    res.status(500).json({ message: "Delete failed" });
  }
});

module.exports = router;