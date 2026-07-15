const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "please-set-JWT_SECRET";

// Verifies the storefront customer JWT issued by /api/store/auth/* —
// signed as { id, type: "customer" } (the admin JWT has no `type` claim).
module.exports = function customerAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized" });
  }
  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== "customer") {
      return res.status(401).json({ message: "Not authorized" });
    }
    req.customerId = decoded.id;
    next();
  } catch {
    res.status(401).json({ message: "Token failed" });
  }
};
