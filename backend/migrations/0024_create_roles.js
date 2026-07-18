// Role-based access control. `permissions` is { module: [actions] } with "*"
// wildcards at either level. users.role (existing free-text column) matches
// roles.name; a user whose role has no row here gets NO module permissions
// (except the hardcoded "admin" bypass in middleware/requirePermission.js).
// Seeds mirror what the Sidebar already showed each legacy role, so nobody
// loses access they visibly had; `editor` and `support` are new.
module.exports = {
  async up(queryInterface, { sequelize }) {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        display_name VARCHAR(255) NOT NULL,
        description VARCHAR(500) NULL,
        permissions JSON NULL,
        is_system TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_roles_name (name)
      )
    `);

    const seeds = [
      ["admin", "Administrator", "Full access to every module.", { "*": ["*"] }, 1],
      ["sales", "Sales", "Customers, orders, payments and enquiries.", {
        customers: ["*"], orders: ["*"], payments: ["*"], contact_messages: ["*"], sale_bills: ["*"],
      }, 1],
      ["inventory", "Inventory", "Catalog, stock and vendors.", {
        products: ["*"], categories: ["*"], vendors: ["*"], purchase_bills: ["*"], inventory: ["*"],
      }, 1],
      ["accounts", "Accounts", "Expenses and finance.", {
        expenses: ["*"], expense_bills: ["*"], reports: ["view"],
      }, 1],
      ["editor", "Content Editor", "Blog, pages, media, menus, banners and testimonials.", {
        blog: ["*"], pages: ["*"], media: ["*"], menus: ["*"], banners: ["*"], testimonials: ["*"],
      }, 1],
      ["support", "Customer Support", "Enquiries and read-only orders.", {
        contact_messages: ["*"], orders: ["view"],
      }, 1],
      ["staff", "Staff", "No module access until permissions are granted.", {}, 1],
    ];

    for (const [name, displayName, description, permissions, isSystem] of seeds) {
      await sequelize.query(
        `INSERT INTO roles (name, display_name, description, permissions, is_system)
         SELECT :name, :displayName, :description, :permissions, :isSystem
         WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = :name)`,
        { replacements: { name, displayName, description, permissions: JSON.stringify(permissions), isSystem } }
      );
    }
  },
};
