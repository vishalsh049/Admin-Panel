const rateLimit = require("express-rate-limit");

// Throttles login/register/password-reset endpoints to slow down credential
// stuffing and account-creation spam — mirrors the limiter already used on
// the public contact form (routes/contactRoutes.js).
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again later." },
});

module.exports = authRateLimit;
