const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "please-set-JWT_SECRET";

// Verifies the admin-panel JWT issued by POST /api/auth/login (routes/auth.js),
// which is signed as { id } with no `type` claim (unlike the customer JWT).
module.exports = function adminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Not authorized" });
  }
  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    // Customer JWTs are signed with the same secret but carry type:"customer" —
    // reject them here so a storefront login can never be replayed as an
    // admin-panel session.
    if (decoded.type) {
      return res.status(401).json({ success: false, message: "Not authorized" });
    }
    req.adminId = decoded.id;
    req.adminEmail = decoded.email || null;
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Not authorized" });
  }
};
