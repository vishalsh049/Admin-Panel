const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sequelize = require("../config/db");
const nodemailer = require("nodemailer");
const { QueryTypes } = require("sequelize");

const JWT_SECRET = process.env.JWT_SECRET || "please-set-JWT_SECRET";
const CLIENT_URL =
  process.env.CLIENT_URL ||
  process.env.CLIENT_ORIGIN?.split(",")[0]?.trim() ||
  "";

const isBcryptHash = (value) => typeof value === "string" && /^\$2[aby]\$\d{2}\$/.test(value);
const getFallbackNameFromEmail = (email) => {
  if (!email || typeof email !== "string") return "Admin";
  return email.split("@")[0] || "Admin";
};


// CREATE ACCOUNT
router.post("/register", async (req, res) => {

  try {

    const { name, email, password, role } = req.body;
    const normalizedName = name?.trim();
    const normalizedEmail = email?.trim().toLowerCase();
    const normalizedPassword = password?.trim();

    if (!normalizedName || !normalizedEmail || !normalizedPassword) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    const existing = await sequelize.query(
      "SELECT * FROM users WHERE email=?",
      {
        replacements: [normalizedEmail],
        type: QueryTypes.SELECT
      }
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await sequelize.query(
"INSERT INTO users (name,email,password,role) VALUES (?,?,?,?)",
{
replacements: [normalizedName, normalizedEmail, hashedPassword, role || "staff"],
type: QueryTypes.INSERT
}
);

    res.json({ message: "Account created successfully" });

  } catch (error) {

    console.log(error);
    res.status(500).json({ message: "Server error" });

  }

});



router.post("/login", async (req, res) => {
  try {

    const { email, password } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const users = await sequelize.query(
      "SELECT * FROM users WHERE email=?",
      {
        replacements: [normalizedEmail],
        type: QueryTypes.SELECT,
      }
    );

    if (users.length === 0) {
      return res.status(400).json({ message: "User not found" });
    }

    const user = users[0];

    let isMatch = false;

    if (isBcryptHash(user.password)) {
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      isMatch = password === user.password;

      // Upgrade legacy plain-text passwords after a successful login.
      if (isMatch) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await sequelize.query(
          "UPDATE users SET password=? WHERE id=?",
          {
            replacements: [hashedPassword, user.id],
            type: QueryTypes.UPDATE,
          }
        );
        user.password = hashedPassword;
      }
    }

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "1d" });

   res.json({
  message: "Login successful",
  token: token,
  user: {
    id: user.id,
    name: user.name || getFallbackNameFromEmail(user.email),
    email: user.email,
    role: user.role || "admin"
  }
});

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});

// FORGOT PASSWORD 


router.post("/forgot-password", async (req, res) => {

const { email } = req.body;
const normalizedEmail = email?.trim().toLowerCase();

if (!normalizedEmail) {
return res.status(400).json({message:"Email is required"});
}

try {

const users = await sequelize.query(
"SELECT * FROM users WHERE LOWER(email)=LOWER(?)",
{
replacements:[normalizedEmail],
type:QueryTypes.SELECT
}
);

if(users.length === 0){
return res.status(404).json({message:"Email not found"});
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

await transporter.sendMail({
  from: process.env.SMTP_FROM || process.env.SMTP_USER,
  to: normalizedEmail,
  subject: "Reset Password",
  html: `<h2>Password Reset</h2>
<p>Click the link below to reset your password.</p>
<a href="${CLIENT_URL || "#"}${CLIENT_URL ? "/reset-password" : ""}">Reset Password</a>`,
});

res.json({message:"Reset link sent"});

}catch (error) {
  console.log("REGISTER ERROR:", error);

  res.status(500).json({
    message: error.message
  });
}

});

module.exports = router;
