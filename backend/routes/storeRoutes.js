const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const PDFDocument = require("pdfkit");
const { Op } = require("sequelize");
const sequelize = require("../config/db");
const { sendMail } = require("../utils/mailer");
const Product = require("../models/Products");
const Category = require("../models/Category");
const {
  ProductImage,
  ProductAttribute,
  ProductAttributeValue,
  ProductVariation,
} = require("../models");
const { buildProductPayload } = require("../utils/serializers/productSerializer");
const toRelativeUploadPath = require("../utils/toRelativeUploadPath");
const { PLACEHOLDER_IMAGE_PATH } = require("../utils/constants");
const StoreCustomer = require("../models/StoreCustomer");
const StoreOrder = require("../models/StoreOrder");
const StoreOrderStatusHistory = require("../models/StoreOrderStatusHistory");
const StoreOrderRequest = require("../models/StoreOrderRequest");
const StoreWishlist = require("../models/StoreWishlist");
const StoreAddress = require("../models/StoreAddress");
const SiteSetting = require("../models/SiteSetting");
const { cancelFshipOrder } = require("../services/fshipService");
const { createShipmentForOrder } = require("../controllers/shippingController");
const googleAuthService = require("../services/googleAuthService");
const facebookAuthService = require("../services/facebookAuthService");
const { renderInvoicePdf } = require("../utils/invoiceRenderer");
const { orderConfirmationEmail } = require("../utils/emailTemplates");

const JWT_SECRET = process.env.JWT_SECRET || "please-set-JWT_SECRET";
const CLIENT_URL =
  process.env.CLIENT_URL || process.env.CLIENT_ORIGIN?.split(",")[0]?.trim() || "";
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const ORDER_REQUEST_TYPES = ["return", "exchange", "refund", "complaint"];
const {
  resolveOwnedOrder,
  buildCourierUrl,
  parseJsonField,
  computeReturnEligibility,
  formatOrder,
} = require("../utils/orderHelpers");

// ─── Customer Auth Middleware ──────────────────────────────────────────────────
// Shared with routes/paymentRoutes.js — single source of truth.
const customerAuth = require("../middleware/customerAuth");
const authRateLimit = require("../middleware/authRateLimit");

// ─── PRODUCTS (public) ────────────────────────────────────────────────────────

const STORE_PRODUCT_INCLUDE = [
  { model: Category, as: "categoryRef" },
  { model: ProductImage, as: "images" },
];

const STORE_PRODUCT_INCLUDE_FULL = [
  ...STORE_PRODUCT_INCLUDE,
  {
    model: ProductAttribute,
    as: "attributes",
    include: [{ model: ProductAttributeValue, as: "values" }],
  },
  {
    model: ProductVariation,
    as: "variations",
    include: [{ model: ProductAttributeValue, as: "attributeValues" }],
  },
];

// Selecting a parent category should also surface its children's products —
// walks the (shallow, but not assumed single-level) parent_id tree.
async function withDescendantCategoryIds(rootId) {
  const ids = [Number(rootId)];
  let frontier = [Number(rootId)];
  while (frontier.length) {
    const children = await Category.findAll({
      where: { parent_id: { [Op.in]: frontier } },
      attributes: ["id"],
      raw: true,
    });
    frontier = children.map((c) => c.id).filter((id) => !ids.includes(id));
    ids.push(...frontier);
  }
  return ids;
}

// GET /api/store/products
router.get("/products", async (req, res) => {
  try {
    const { category, category_id, search, sort, page, limit, price_max, in_stock } = req.query;

    const where = { status: "publish" };
    if (category_id) {
      const categoryIds = await withDescendantCategoryIds(category_id);
      where.category_id = { [Op.in]: categoryIds };
    } else if (category && category !== "All Categories") {
      // Legacy `?category=Name` deep links only — exact match, not a
      // substring, so e.g. "Puja" doesn't also match "Puja Potli".
      where.category = category;
    }
    if (search) {
      where.name = { [Op.like]: `%${search}%` };
    }
    if (price_max) {
      // Effective price is regular_price unless a (lower) sale_price is set —
      // match either so a discounted item under budget isn't excluded just
      // because its regular_price is higher than price_max.
      const max = parseFloat(price_max);
      where[Op.or] = [
        { regular_price: { [Op.lte]: max } },
        { sale_price: { [Op.ne]: null, [Op.lte]: max } },
      ];
    }
    if (in_stock === "true" || in_stock === "1") {
      where.stock_status = "in_stock";
    }

    let order = [["created_at", "DESC"]];
    if (sort === "price_asc") order = [["regular_price", "ASC"]];
    if (sort === "price_desc") order = [["regular_price", "DESC"]];

    // `page`/`limit` are opt-in so existing callers that expect a flat array
    // (no pagination params) keep working unchanged.
    if (page || limit) {
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
      const { rows, count } = await Product.findAndCountAll({
        where,
        order,
        include: STORE_PRODUCT_INCLUDE,
        limit: limitNum,
        offset: (pageNum - 1) * limitNum,
        distinct: true,
      });
      return res.json({
        products: rows.map((p) => buildProductPayload(p, { context: "store" })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count,
          totalPages: Math.max(1, Math.ceil(count / limitNum)),
        },
      });
    }

    const products = await Product.findAll({ where, order, include: STORE_PRODUCT_INCLUDE });
    res.json(products.map((p) => buildProductPayload(p, { context: "store" })));
  } catch (err) {
    console.error("Store products error:", err.message);
    res.status(500).json({ message: "Failed to fetch products" });
  }
});

// GET /api/store/categories
router.get("/categories", async (req, res) => {
  try {
    const categories = await Category.findAll({
      where: { status: "Active" },
      order: [
        ["sort_order", "ASC"],
        ["name", "ASC"],
      ],
    });
    res.json(
      categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description || "",
        image: c.image ? toRelativeUploadPath(c.image) : PLACEHOLDER_IMAGE_PATH,
        banner: c.banner ? toRelativeUploadPath(c.banner) : null,
        icon: c.icon ? toRelativeUploadPath(c.icon) : null,
        parent_id: c.parent_id,
        sort_order: c.sort_order,
        is_featured: !!c.is_featured,
      }))
    );
  } catch (err) {
    console.error("Store categories error:", err.message);
    res.status(500).json({ message: "Failed to fetch categories" });
  }
});

// GET /api/store/products/:id
router.get("/products/:id", async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, { include: STORE_PRODUCT_INCLUDE_FULL });
    if (!product || product.status !== "publish") {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(formatProduct(product));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── CUSTOMER AUTH ────────────────────────────────────────────────────────────

// Mirrors frontend/src/utils/authValidation.js PASSWORD_RULES — the frontend
// blocks weak passwords in the UI, but that's advisory only; the API itself
// must not accept anything the UI wouldn't.
function passwordStrengthError(password) {
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/\d/.test(password)) return "Password must include at least one number";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must include at least one special character";
  if (!/[A-Z]/.test(password)) return "Password must include at least one uppercase letter";
  if (!/[a-z]/.test(password)) return "Password must include at least one lowercase letter";
  return null;
}

// POST /api/store/auth/register
router.post("/auth/register", authRateLimit, async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    const passwordError = passwordStrengthError(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    const trimmedPhone = phone ? String(phone).trim() : null;
    if (trimmedPhone && !/^\d{10}$/.test(trimmedPhone)) {
      return res.status(400).json({ message: "Phone number must be 10 digits" });
    }

    const exists = await StoreCustomer.findOne({ where: { email: email.toLowerCase() } });
    if (exists) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const customer = await StoreCustomer.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      phone: trimmedPhone,
    });

    const token = jwt.sign({ id: customer.id, type: "customer" }, JWT_SECRET, { expiresIn: "30d" });

    res.status(201).json({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      token,
    });
  } catch (err) {
    // Two concurrent registrations with the same email can both pass the
    // findOne check above; the unique index rejects the loser — report it
    // as the duplicate it is, not as a server error.
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({ message: "Email already registered" });
    }
    // Log the underlying SQL error too — err.message alone hides the real
    // cause for Sequelize database errors.
    console.error("Register error:", err.parent?.sqlMessage || err.message, "\n", err.stack);
    res.status(500).json({ message: "Registration failed due to a server error. Please try again." });
  }
});

// POST /api/store/auth/login
router.post("/auth/login", authRateLimit, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const customer = await StoreCustomer.findOne({ where: { email: email.toLowerCase().trim() } });
    if (!customer) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const match = await customer.matchPassword(password);
    if (!match) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign({ id: customer.id, type: "customer" }, JWT_SECRET, { expiresIn: "30d" });

    res.json({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      token,
    });
  } catch (err) {
    console.error("Login error:", err.parent?.sqlMessage || err.message, "\n", err.stack);
    res.status(500).json({ message: "Login failed due to a server error. Please try again." });
  }
});

// GET /api/store/auth/social-config  (public)
// Tells the login/register page which social buttons to show. Never
// returns secrets — just the public Client/App ID and the admin's
// enable/disable toggle from Settings > Integrations.
router.get("/auth/social-config", (req, res) => {
  res.json({
    google: googleAuthService.getPublicConfig(),
    facebook: facebookAuthService.getPublicConfig(),
  });
});

// Shared by /auth/google and /auth/facebook: look up (or create) the store
// customer for a verified social profile and issue the normal customer JWT.
async function loginOrCreateCustomerFromSocialProfile(res, { email, name }) {
  const normalizedEmail = email.toLowerCase().trim();
  let customer = await StoreCustomer.findOne({ where: { email: normalizedEmail } });
  if (!customer) {
    // Social-only accounts never use this password — it exists because the
    // column is NOT NULL. A user can still set a real one via reset link.
    customer = await StoreCustomer.create({
      name: (name || normalizedEmail.split("@")[0]).trim(),
      email: normalizedEmail,
      password: crypto.randomBytes(32).toString("hex"),
    });
  }

  const token = jwt.sign({ id: customer.id, type: "customer" }, JWT_SECRET, { expiresIn: "30d" });
  res.json({
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    token,
  });
}

// POST /api/store/auth/google  (public)
// Google Sign-In: the frontend obtains an OAuth access token via Google
// Identity Services and sends it here. googleAuthService verifies it was
// issued for this app's DB-configured Client ID before we trust the profile.
router.post("/auth/google", async (req, res) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) {
      return res.status(400).json({ message: "Google access token is required" });
    }

    const profile = await googleAuthService.verifyAccessToken(accessToken);
    await loginOrCreateCustomerFromSocialProfile(res, { email: profile.email, name: profile.name });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    console.error("Google auth error:", err.message);
    res.status(500).json({ message: "Google sign-in failed" });
  }
});

// POST /api/store/auth/facebook  (public)
// Facebook Login: the frontend obtains a user access token via the Facebook
// JS SDK's FB.login() and sends it here. facebookAuthService verifies it
// against this app's DB-configured App ID/Secret before we trust the profile.
router.post("/auth/facebook", async (req, res) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) {
      return res.status(400).json({ message: "Facebook access token is required" });
    }

    const profile = await facebookAuthService.verifyAccessToken(accessToken);
    await loginOrCreateCustomerFromSocialProfile(res, { email: profile.email, name: profile.name });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    console.error("Facebook auth error:", err.message);
    res.status(500).json({ message: "Facebook sign-in failed" });
  }
});

// POST /api/store/auth/forgot-password  (public)
router.post("/auth/forgot-password", authRateLimit, async (req, res) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Always return the same generic response whether or not the email is
    // registered — a distinct "not found" response here would let an
    // attacker enumerate which emails have store accounts.
    const genericResponse = {
      message: "If that email is registered, a password reset link has been sent.",
    };

    const customer = await StoreCustomer.findOne({ where: { email } });
    if (!customer) {
      return res.json(genericResponse);
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    await customer.update({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    });

    const resetLink = `${CLIENT_URL || ""}/reset-password?token=${rawToken}`;

    await sendMail({
      to: customer.email,
      subject: "Reset your Divya Darshnam password",
      html: `
        <h2>Password Reset Requested</h2>
        <p>Click the link below to set a new password. This link expires in 1 hour.</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      `,
    });

    res.json(genericResponse);
  } catch (err) {
    console.error("Forgot password error:", err.message);
    res.status(500).json({ message: "Failed to process request" });
  }
});

// POST /api/store/auth/reset-password  (public)
router.post("/auth/reset-password", authRateLimit, async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: "Token and new password are required" });
    }
    // Only length is enforced here — unlike /auth/register, the reset-password
    // page shows a strength meter, not a rules checklist, so requiring the
    // full PASSWORD_RULES set would reject passwords the UI never told the
    // user were invalid.
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const customer = await StoreCustomer.findOne({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { [Op.gt]: new Date() },
      },
    });

    if (!customer) {
      return res.status(400).json({ message: "Invalid or expired reset link" });
    }

    customer.password = password;
    customer.resetPasswordToken = null;
    customer.resetPasswordExpires = null;
    await customer.save();

    res.json({ message: "Password reset successfully" });
  } catch (err) {
    console.error("Reset password error:", err.message);
    res.status(500).json({ message: "Failed to reset password" });
  }
});

// GET /api/store/auth/profile  (protected)
router.get("/auth/profile", customerAuth, async (req, res) => {
  try {
    const customer = await StoreCustomer.findByPk(req.customerId, {
      attributes: ["id", "name", "email", "phone", "created_at"],
    });
    if (!customer) return res.status(404).json({ message: "Not found" });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/store/auth/profile  (protected – update editable fields)
router.put("/auth/profile", customerAuth, async (req, res) => {
  try {
    const { name, phone } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Name is required" });
    }
    const customer = await StoreCustomer.findByPk(req.customerId);
    if (!customer) return res.status(404).json({ message: "Not found" });

    await customer.update({
      name: name.trim(),
      phone: phone ? phone.trim() : null,
    });

    res.json({
      message: "Profile updated successfully",
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
    });
  } catch (err) {
    console.error("Update profile error:", err.message);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

// PUT /api/store/auth/password  (protected – change password)
router.put("/auth/password", customerAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const customer = await StoreCustomer.findByPk(req.customerId);
    if (!customer) return res.status(404).json({ message: "Not found" });

    const match = await customer.matchPassword(currentPassword);
    if (!match) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    customer.password = newPassword;
    await customer.save();

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("Change password error:", err.message);
    res.status(500).json({ message: "Failed to change password" });
  }
});

// GET /api/store/auth/stats  (protected – dashboard stat cards)
router.get("/auth/stats", customerAuth, async (req, res) => {
  try {
    const orders = await StoreOrder.findAll({
      where: { customerId: req.customerId },
      attributes: ["status", "totalPrice"],
    });

    const totalOrders = orders.length;
    const pendingOrders = orders.filter((o) => ["pending", "processing"].includes(o.status)).length;
    const deliveredOrders = orders.filter((o) => o.status === "delivered").length;
    const totalSpent = orders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + Number(o.totalPrice || 0), 0);

    const wishlistCount = await StoreWishlist.count({ where: { customerId: req.customerId } });

    res.json({
      totalOrders,
      pendingOrders,
      deliveredOrders,
      wishlistCount,
      totalSpent,
    });
  } catch (err) {
    console.error("Account stats error:", err.message);
    res.status(500).json({ message: "Failed to fetch account stats" });
  }
});

// ─── WISHLIST ─────────────────────────────────────────────────────────────────

// GET /api/store/wishlist  (protected)
router.get("/wishlist", customerAuth, async (req, res) => {
  try {
    const rows = await StoreWishlist.findAll({
      where: { customerId: req.customerId },
      order: [["created_at", "DESC"]],
    });

    const productIds = rows.map((r) => r.productId);
    const products = productIds.length
      ? await Product.findAll({ where: { id: productIds } })
      : [];
    const productMap = new Map(products.map((p) => [p.id, formatProduct(p)]));

    const items = rows.map((row) => {
      const product = productMap.get(row.productId);
      return {
        id: row.id,
        productId: row.productId,
        addedAt: row.created_at,
        available: Boolean(product),
        product: product || null,
      };
    });

    res.json(items);
  } catch (err) {
    console.error("Get wishlist error:", err.message);
    res.status(500).json({ message: "Failed to fetch wishlist" });
  }
});

// POST /api/store/wishlist  (protected – add, idempotent)
router.post("/wishlist", customerAuth, async (req, res) => {
  try {
    const productId = Number(req.body.productId);
    if (!productId) {
      return res.status(400).json({ message: "productId is required" });
    }

    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const [row, created] = await StoreWishlist.findOrCreate({
      where: { customerId: req.customerId, productId },
    });

    res.status(created ? 201 : 200).json({
      message: created ? "Added to wishlist" : "Already in wishlist",
      alreadyExists: !created,
      id: row.id,
      productId,
    });
  } catch (err) {
    console.error("Add wishlist error:", err.message);
    res.status(500).json({ message: "Failed to add to wishlist" });
  }
});

// DELETE /api/store/wishlist/:productId  (protected)
router.delete("/wishlist/:productId", customerAuth, async (req, res) => {
  try {
    const deleted = await StoreWishlist.destroy({
      where: { customerId: req.customerId, productId: req.params.productId },
    });
    if (!deleted) {
      return res.status(404).json({ message: "Wishlist item not found" });
    }
    res.json({ message: "Removed from wishlist" });
  } catch (err) {
    console.error("Remove wishlist error:", err.message);
    res.status(500).json({ message: "Failed to remove from wishlist" });
  }
});

// ─── ADDRESSES ────────────────────────────────────────────────────────────────

// GET /api/store/addresses  (protected)
router.get("/addresses", customerAuth, async (req, res) => {
  try {
    const addresses = await StoreAddress.findAll({
      where: { customerId: req.customerId },
      order: [["created_at", "DESC"]],
    });
    res.json(addresses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

function validateAddressPayload(body) {
  const required = ["fullName", "phone", "addressLine", "city", "state", "postalCode"];
  const missing = required.filter((field) => !body[field] || !String(body[field]).trim());
  return missing.length ? `Missing required fields: ${missing.join(", ")}` : null;
}

// POST /api/store/addresses  (protected)
router.post("/addresses", customerAuth, async (req, res) => {
  try {
    const error = validateAddressPayload(req.body);
    if (error) return res.status(400).json({ message: error });

    const { label, fullName, phone, addressLine, city, state, postalCode, country, isDefaultShipping, isDefaultBilling } = req.body;

    const address = await sequelize.transaction(async (t) => {
      if (isDefaultShipping) {
        await StoreAddress.update(
          { isDefaultShipping: false },
          { where: { customerId: req.customerId }, transaction: t }
        );
      }
      if (isDefaultBilling) {
        await StoreAddress.update(
          { isDefaultBilling: false },
          { where: { customerId: req.customerId }, transaction: t }
        );
      }
      return StoreAddress.create(
        {
          customerId: req.customerId,
          label: label || "home",
          fullName: fullName.trim(),
          phone: phone.trim(),
          addressLine: addressLine.trim(),
          city: city.trim(),
          state: state.trim(),
          postalCode: postalCode.trim(),
          country: country ? country.trim() : "India",
          isDefaultShipping: Boolean(isDefaultShipping),
          isDefaultBilling: Boolean(isDefaultBilling),
        },
        { transaction: t }
      );
    });

    res.status(201).json(address);
  } catch (err) {
    console.error("Create address error:", err.message);
    res.status(500).json({ message: "Failed to create address" });
  }
});

// PUT /api/store/addresses/:id  (protected)
router.put("/addresses/:id", customerAuth, async (req, res) => {
  try {
    const address = await StoreAddress.findOne({
      where: { id: req.params.id, customerId: req.customerId },
    });
    if (!address) return res.status(404).json({ message: "Address not found" });

    const error = validateAddressPayload(req.body);
    if (error) return res.status(400).json({ message: error });

    const { label, fullName, phone, addressLine, city, state, postalCode, country } = req.body;
    // Omitted default-flag fields must leave the existing default status untouched —
    // only an explicit true/false in the payload may change it — otherwise a plain
    // detail edit (e.g. just fixing the city) would silently un-default the address.
    const nextIsDefaultShipping =
      req.body.isDefaultShipping === undefined ? address.isDefaultShipping : Boolean(req.body.isDefaultShipping);
    const nextIsDefaultBilling =
      req.body.isDefaultBilling === undefined ? address.isDefaultBilling : Boolean(req.body.isDefaultBilling);

    await sequelize.transaction(async (t) => {
      if (nextIsDefaultShipping) {
        await StoreAddress.update(
          { isDefaultShipping: false },
          { where: { customerId: req.customerId, id: { [Op.ne]: address.id } }, transaction: t }
        );
      }
      if (nextIsDefaultBilling) {
        await StoreAddress.update(
          { isDefaultBilling: false },
          { where: { customerId: req.customerId, id: { [Op.ne]: address.id } }, transaction: t }
        );
      }
      await address.update(
        {
          label: label || address.label,
          fullName: fullName.trim(),
          phone: phone.trim(),
          addressLine: addressLine.trim(),
          city: city.trim(),
          state: state.trim(),
          postalCode: postalCode.trim(),
          country: country ? country.trim() : address.country,
          isDefaultShipping: nextIsDefaultShipping,
          isDefaultBilling: nextIsDefaultBilling,
        },
        { transaction: t }
      );
    });

    res.json(address);
  } catch (err) {
    console.error("Update address error:", err.message);
    res.status(500).json({ message: "Failed to update address" });
  }
});

// PATCH /api/store/addresses/:id/default  (protected)
router.patch("/addresses/:id/default", customerAuth, async (req, res) => {
  try {
    const { type } = req.body;
    if (!["shipping", "billing"].includes(type)) {
      return res.status(400).json({ message: "type must be 'shipping' or 'billing'" });
    }
    const address = await StoreAddress.findOne({
      where: { id: req.params.id, customerId: req.customerId },
    });
    if (!address) return res.status(404).json({ message: "Address not found" });

    const field = type === "shipping" ? "isDefaultShipping" : "isDefaultBilling";

    await sequelize.transaction(async (t) => {
      await StoreAddress.update(
        { [field]: false },
        { where: { customerId: req.customerId }, transaction: t }
      );
      await address.update({ [field]: true }, { transaction: t });
    });

    res.json({ message: `Default ${type} address updated`, address });
  } catch (err) {
    console.error("Set default address error:", err.message);
    res.status(500).json({ message: "Failed to update default address" });
  }
});

// DELETE /api/store/addresses/:id  (protected)
router.delete("/addresses/:id", customerAuth, async (req, res) => {
  try {
    const deleted = await StoreAddress.destroy({
      where: { id: req.params.id, customerId: req.customerId },
    });
    if (!deleted) return res.status(404).json({ message: "Address not found" });
    res.json({ message: "Address deleted successfully" });
  } catch (err) {
    console.error("Delete address error:", err.message);
    res.status(500).json({ message: "Failed to delete address" });
  }
});

// ─── ORDERS ───────────────────────────────────────────────────────────────────

// POST /api/store/orders  (protected – place an order)
router.post("/orders", customerAuth, async (req, res) => {
  try {
    const { items, shippingAddress, billingAddress, totalPrice, paymentMethod, shippingCharges } = req.body;
    if (!items || !shippingAddress || !totalPrice) {
      return res.status(400).json({ message: "items, shippingAddress and totalPrice are required" });
    }

    const customer = await StoreCustomer.findByPk(req.customerId);
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    const order = await StoreOrder.create({
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: shippingAddress.phone || null,
      items,
      shippingAddress,
      billingAddress: billingAddress || null,
      totalPrice,
      paymentMethod: paymentMethod || "cod",
      shippingCharges: shippingCharges || 0,
      status: "pending",
      expectedDeliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    });

    // Automatic shipment creation. The order always survives a shipping
    // failure — createShipmentForOrder marks shippingStatus "pending" so the
    // admin can retry from the order page.
    const shipmentResult = await createShipmentForOrder(order);
    if (!shipmentResult.ok) {
      console.error(`FShip auto shipment for order ${order.id} not created:`, shipmentResult.error);
    }

    await StoreOrderStatusHistory.create({
      order_id: order.id,
      status: "pending",
      description: "Order placed",
    });

    // Best-effort — sendMail() never throws, so a mail outage can never block
    // order placement.
    sendMail({
      to: order.customerEmail,
      subject: `Order Confirmed — #${order.id}`,
      html: orderConfirmationEmail(order),
    });

    res.status(201).json({ message: "Order placed successfully", orderId: order.id });
  } catch (err) {
    console.error("Create order error:", err.message);
    res.status(500).json({ message: "Failed to place order" });
  }
});

const ORDER_SORT_OPTIONS = {
  newest: [["created_at", "DESC"]],
  oldest: [["created_at", "ASC"]],
  amount_desc: [["totalPrice", "DESC"]],
  amount_asc: [["totalPrice", "ASC"]],
};

// GET /api/store/orders/my  (protected – customer's own orders, paginated)
router.get("/orders/my", customerAuth, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const { search, status, sort } = req.query;

    const where = { customerId: req.customerId };
    if (status && status !== "all") {
      where.status = status;
    }
    if (search && search.trim()) {
      const term = search.trim();
      const orConditions = [{ trackingNumber: { [Op.like]: `%${term}%` } }];
      const numericId = Number(term);
      if (Number.isInteger(numericId) && numericId > 0) orConditions.push({ id: numericId });
      where[Op.or] = orConditions;
    }

    const { rows, count } = await StoreOrder.findAndCountAll({
      where,
      order: ORDER_SORT_OPTIONS[sort] || ORDER_SORT_OPTIONS.newest,
      limit,
      offset: (page - 1) * limit,
    });

    const orders = rows.map((order) => {
      const data = order.toJSON();
      return {
        ...data,
        items: parseJsonField(data.items, []),
        shippingAddress: parseJsonField(data.shippingAddress, null),
      };
    });

    res.json({
      orders,
      total: count,
      page,
      pages: Math.max(1, Math.ceil(count / limit)),
    });
  } catch (err) {
    console.error("Get my orders error:", err.message);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

// GET /api/store/orders/my/:id  (protected – single order, ownership re-checked)
router.get("/orders/my/:id", customerAuth, async (req, res) => {
  try {
    const order = await StoreOrder.findByPk(req.params.id);
    if (!order || order.customerId !== req.customerId) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.json(await formatOrder(order));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/store/orders/track  (public – guest lookup by orderId/trackingNumber + contact)
router.get("/orders/track", async (req, res) => {
  try {
    const order = await resolveOwnedOrder(req);
    if (!order) {
      return res.status(404).json({ message: "No order found matching the details provided." });
    }
    res.json(await formatOrder(order));
  } catch (err) {
    console.error("Track order error:", err.message);
    res.status(500).json({ message: "Failed to track order" });
  }
});

// GET /api/store/orders/:id/tracking-history  (dual-mode – live courier scans)
// Same ownership rules as /orders/track: a logged-in customer resolves via
// JWT, a guest must supply a matching contact value.
router.get("/orders/:id/tracking-history", async (req, res) => {
  try {
    const order = await resolveOwnedOrder(req);
    if (!order) {
      return res.status(404).json({ message: "Order not found or details did not match." });
    }
    if (!order.trackingNumber) {
      return res.json({ awb: null, courierName: null, summary: null, scans: [] });
    }
    const { getTrackingHistory } = require("../services/fshipService");
    const history = await getTrackingHistory(order.trackingNumber);
    res.json({
      awb: order.trackingNumber,
      courierName: history?.summary?.fulfilledby || order.courierName || null,
      summary: history?.summary || null,
      scans: history?.trackingdata || [],
    });
  } catch (err) {
    console.error("Customer tracking history error:", err.message);
    res.status(502).json({ message: "Live tracking is temporarily unavailable. Please try again later." });
  }
});

// PATCH /api/store/orders/:id/cancel  (dual-mode – logged-in or guest with contact)
router.patch("/orders/:id/cancel", async (req, res) => {
  try {
    const order = await resolveOwnedOrder(req);
    if (!order) {
      return res.status(404).json({ message: "Order not found or details did not match." });
    }
    if (!["pending", "processing"].includes(order.status)) {
      return res.status(409).json({ message: "This order can no longer be cancelled." });
    }

    if (order.trackingNumber) {
      try {
        await cancelFshipOrder(order.trackingNumber, "Cancelled by customer");
      } catch (cancelErr) {
        console.error("FShip cancel order failed:", cancelErr.message || cancelErr);
      }
    }

    await order.update({ status: "cancelled" });
    await StoreOrderStatusHistory.create({
      order_id: order.id,
      status: "cancelled",
      description: "Cancelled by customer",
    });
    res.json({ message: "Order cancelled successfully", order: await formatOrder(order) });
  } catch (err) {
    console.error("Cancel order error:", err.message);
    res.status(500).json({ message: "Failed to cancel order" });
  }
});

// POST /api/store/orders/:id/requests  (dual-mode – return/exchange/refund/complaint)
router.post("/orders/:id/requests", async (req, res) => {
  try {
    const { type, reason } = req.body;
    if (!ORDER_REQUEST_TYPES.includes(type)) {
      return res.status(400).json({ message: "Invalid request type" });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: "A reason is required" });
    }
    const order = await resolveOwnedOrder(req);
    if (!order) {
      return res.status(404).json({ message: "Order not found or details did not match." });
    }
    const request = await StoreOrderRequest.create({
      order_id: order.id,
      type,
      reason: reason.trim(),
    });
    await StoreOrderStatusHistory.create({
      order_id: order.id,
      status: order.status,
      description: `${type.charAt(0).toUpperCase() + type.slice(1)} request submitted`,
    });
    res.status(201).json({ message: "Request submitted successfully", requestId: request.id });
  } catch (err) {
    console.error("Create order request error:", err.message);
    res.status(500).json({ message: "Failed to submit request" });
  }
});

// GET /api/store/orders/:id/invoice  (dual-mode – streams a PDF invoice)
// ?layout=thermal for a narrow thermal-printer layout (default a4).
// ?share=<token> — signed order-scoped link (see issueInvoiceShareToken).
router.get("/orders/:id/invoice", async (req, res) => {
  try {
    const order = await resolveOwnedOrder(req);
    if (!order) {
      return res.status(404).json({ message: "Order not found or details did not match." });
    }
    if (!order.invoiceNumber) {
      await order.update({ invoiceNumber: `INV-${order.id}` });
    }

    const siteSettings = await SiteSetting.findByPk(1);
    const layout = req.query.layout === "thermal" ? "thermal" : "a4";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `${req.query.share ? "inline" : "attachment"}; filename="invoice-${order.id}.pdf"`
    );

    const doc = new PDFDocument(layout === "thermal" ? { size: [227, 800], margin: 10 } : { margin: 50 });
    doc.pipe(res);
    await renderInvoicePdf(doc, { order, siteSettings, layout });
    doc.end();
  } catch (err) {
    console.error("Invoice generation error:", err.message);
    if (!res.headersSent) {
      res.status(500).json({ message: "Failed to generate invoice" });
    }
  }
});

// ─── HELPERS ──────────────────────────────────────────────────────────────────
// normalizeContact/normalizePhone/resolveOwnedOrder/buildCourierUrl/
// parseJsonField/computeReturnEligibility/formatOrder now live in
// ../utils/orderHelpers.js (imported above) so orderAdmin.js can share them.

// Thin wrapper kept for call-site compatibility — all shaping now lives in
// the shared serializer so admin and store responses can never drift again.
function formatProduct(p) {
  return buildProductPayload(p, { context: "store" });
}

module.exports = router;
