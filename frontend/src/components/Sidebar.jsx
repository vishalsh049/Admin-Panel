import { Fragment, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { setAuthHeader } from "../utils/authHeader";
import {
  FaHome,
  FaUser,
  FaShoppingCart,
  FaTruck,
  FaBoxOpen,
  FaCogs,
  FaChevronDown,
  FaChevronUp,
  FaSignOutAlt,
  FaUsersCog,
  FaMoneyBillWave,
  FaChartBar,
  FaImages,
  FaBlog,
  FaBars,
  FaBullhorn,
  FaCommentDots,
  FaFileAlt,
  FaCashRegister,
} from "react-icons/fa";

/**
 * Navigation is data-driven: sections contain items, items may contain children
 * (rendered as a collapsible group). `roles` limits visibility — omit it to show
 * the entry to everyone; items without their own `roles` inherit the section's,
 * and children without their own inherit the item's.
 *
 * Structure follows the standard ERP module layout (Sales / Purchases /
 * Inventory / Accounting / Website / Administration). List pages only — create
 * and edit screens are reached from buttons on their list page, not from here.
 */
const NAV_SECTIONS = [
  {
    label: "Main",
    items: [{ to: "/dashboard", label: "Dashboard", icon: FaHome, color: "purple" }],
  },
  {
    label: "Operations",
    items: [
      { to: "/pos", label: "POS", icon: FaCashRegister, color: "green", roles: ["admin", "sales"] },
      {
        label: "Sales", icon: FaShoppingCart, color: "green", roles: ["admin", "sales"],
        children: [
          { to: "/orders", label: "Orders" },
          { to: "/customers", label: "Customers" },
          { to: "/sale-bills", label: "Sale Bills" },
          { to: "/payments", label: "Payments" },
          { to: "/contact-messages", label: "Contact Messages" },
        ],
      },
      {
        label: "Purchases", icon: FaTruck, color: "orange", roles: ["admin", "inventory", "accounts"],
        children: [
          { to: "/vendors", label: "Vendors", roles: ["admin", "inventory"] },
          { to: "/purchase-bills", label: "Purchase Bills" },
          { to: "/vendor-payouts", label: "Vendor Payouts", roles: ["admin", "accounts"] },
        ],
      },
      {
        label: "Inventory", icon: FaBoxOpen, color: "blue", roles: ["admin", "inventory"],
        children: [
          { to: "/products", label: "Products" },
          { to: "/categories", label: "Categories" },
          { to: "/inventory", label: "Stock Manager" },
        ],
      },
      {
        label: "Accounting", icon: FaMoneyBillWave, color: "red", roles: ["admin", "accounts"],
        children: [
          { to: "/expenses", label: "Expenses" },
          { to: "/expense-bills", label: "Expense Bills" },
        ],
      },
      { to: "/reports", label: "Reports", icon: FaChartBar, color: "cyan", roles: ["admin"] },
    ],
  },
  {
    label: "Website",
    roles: ["admin", "editor"],
    items: [
      { to: "/pages", label: "Pages", icon: FaFileAlt, color: "purple" },
      {
        label: "Blog", icon: FaBlog, color: "cyan",
        children: [
          { to: "/blog", label: "All Posts" },
          { to: "/blog/categories", label: "Categories" },
          { to: "/blog/authors", label: "Authors" },
        ],
      },
      { to: "/media", label: "Media Library", icon: FaImages, color: "violet" },
      { to: "/menus", label: "Menus", icon: FaBars, color: "teal" },
      { to: "/banners", label: "Banners", icon: FaBullhorn, color: "orange" },
      { to: "/testimonials", label: "Testimonials", icon: FaCommentDots, color: "yellow" },
    ],
  },
  {
    label: "Administration",
    roles: ["admin"],
    items: [
      {
        label: "Users & Roles", icon: FaUsersCog, color: "yellow",
        children: [
          { to: "/users", label: "Users List" },
          { to: "/roles", label: "Roles & Permissions" },
        ],
      },
      {
        label: "Settings", icon: FaCogs, color: "indigo",
        children: [
          { to: "/settings", label: "Site Settings" },
          { to: "/settings/integrations", label: "Integrations" },
          { to: "/settings/woo-import", label: "WooCommerce Import" },
        ],
      },
    ],
  },
  {
    items: [{ to: "/profile", label: "Profile", icon: FaUser, color: "blue" }],
  },
];

/* Every path the nav links to, used for longest-prefix active matching so
   detail routes (/vendors/4, /orders/12) highlight their parent entry. */
const ALL_NAV_PATHS = NAV_SECTIONS.flatMap((section) =>
  section.items.flatMap((item) => (item.children ? item.children.map((c) => c.to) : [item.to]))
);

const matchesPath = (navPath, pathname) =>
  pathname === navPath || pathname.startsWith(navPath + "/");

const bestMatch = (pathname) =>
  ALL_NAV_PATHS.filter((p) => matchesPath(p, pathname)).sort((a, b) => b.length - a.length)[0];

const groupsContaining = (pathname) => {
  const open = {};
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      if (item.children?.some((c) => matchesPath(c.to, pathname))) open[item.label] = true;
    }
  }
  return open;
};

export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState(() => groupsContaining(location.pathname));

  const user = (() => { try { return JSON.parse(localStorage.getItem("user")) || {}; } catch { return {}; } })();
  const role = (user?.role || "admin").toLowerCase();
  const canSee = (roles) => !roles || roles.includes(role);

  const activePath = bestMatch(location.pathname);
  const isActive = (path) => path === activePath;

  // Keep the group of the current route expanded when navigating
  useEffect(() => {
    setOpenGroups((prev) => ({ ...prev, ...groupsContaining(location.pathname) }));
  }, [location.pathname]);

  const toggleGroup = (label) =>
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));

  const signOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("session-auth-active");
    setAuthHeader(null);
    window.dispatchEvent(new Event("auth-changed"));
    window.location.href = "/login";
  };

  /* Resolve role visibility ahead of render so empty sections drop their header too */
  const visibleSections = NAV_SECTIONS
    .filter((section) => canSee(section.roles))
    .map((section) => ({
      ...section,
      items: section.items
        .filter((item) => canSee(item.roles ?? section.roles))
        .map((item) =>
          item.children
            ? {
                ...item,
                children: item.children.filter((child) =>
                  canSee(child.roles ?? item.roles ?? section.roles)
                ),
              }
            : item
        )
        .filter((item) => !item.children || item.children.length > 0),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <>
      {isOpen && (
        <button
          type="button"
          className="sb-overlay lg:hidden"
          onClick={onClose}
          aria-label="Close sidebar"
        />
      )}

      <aside className={`sb-root ${isOpen ? "open" : ""}`} aria-label="Main navigation">
        {/* Logo */}
        <div className="sb-logo-row">
          <img src="/logodd.png" alt="Logo" className="sb-logo-icon" />
        </div>

        {/* Navigation */}
        <nav className="sb-nav">
          <ul>
            {visibleSections.map((section, idx) => (
              <Fragment key={section.label || `section-${idx}`}>
                {section.label && <li className="sb-section">{section.label}</li>}

                {section.items.map((item) =>
                  item.children ? (
                    <li key={item.label}>
                      <button
                        type="button"
                        className="sb-item"
                        onClick={() => toggleGroup(item.label)}
                        aria-expanded={!!openGroups[item.label]}
                      >
                        <span className={`sb-icon ${item.color}`}><item.icon /></span>
                        {item.label}
                        <span className="sb-chevron">
                          {openGroups[item.label] ? <FaChevronUp /> : <FaChevronDown />}
                        </span>
                      </button>
                      {openGroups[item.label] && (
                        <div className="sb-sub">
                          {item.children.map((child) => (
                            <Link
                              key={child.to}
                              to={child.to}
                              onClick={onClose}
                              className={`sb-sub-item${isActive(child.to) ? " active" : ""}`}
                            >
                              {child.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </li>
                  ) : (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        onClick={onClose}
                        className={`sb-item${isActive(item.to) ? " active" : ""}`}
                      >
                        <span className={`sb-icon ${item.color}`}><item.icon /></span>
                        {item.label}
                      </Link>
                    </li>
                  )
                )}
              </Fragment>
            ))}
          </ul>
        </nav>

        {/* Sign Out */}
        <div className="sb-footer">
          <button className="sb-signout" onClick={signOut}>
            <FaSignOutAlt style={{ width: 14, height: 14 }} />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
