// Menu Management — replaces the hardcoded NAV_ITEMS array in
// frontend/src/components/layout/Navbar.jsx and the "Quick Links"/"Policies"
// arrays in Footer.jsx. Seeded here with the exact current hardcoded values
// (as custom_url links) so cutover doesn't change the live nav/footer.
module.exports = {
  async up(queryInterface, { sequelize }) {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        location VARCHAR(50) NOT NULL,
        parent_id INT NULL,
        label VARCHAR(255) NOT NULL,
        link_type VARCHAR(20) NOT NULL DEFAULT 'custom_url',
        url VARCHAR(500) NULL,
        category_id INT NULL,
        blog_category_id INT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_menu_items_location (location),
        CONSTRAINT fk_menu_items_parent FOREIGN KEY (parent_id) REFERENCES menu_items(id),
        CONSTRAINT fk_menu_items_category FOREIGN KEY (category_id) REFERENCES product_categories(id),
        CONSTRAINT fk_menu_items_blog_category FOREIGN KEY (blog_category_id) REFERENCES blog_categories(id)
      )
    `);

    const [[{ count }]] = await sequelize.query(
      "SELECT COUNT(*) as count FROM menu_items WHERE location = 'header'"
    );
    if (Number(count) > 0) return; // already seeded (or admin has since edited) — never overwrite

    const { QueryTypes } = require("sequelize");
    async function insertItem({ location, label, url, parentId = null, sortOrder = 0 }) {
      const [insertId] = await sequelize.query(
        `INSERT INTO menu_items (location, parent_id, label, link_type, url, sort_order)
         VALUES (:location, :parentId, :label, 'custom_url', :url, :sortOrder)`,
        { replacements: { location, parentId, label, url, sortOrder }, type: QueryTypes.INSERT }
      );
      return insertId;
    }

    // Header — mirrors Navbar.jsx's NAV_ITEMS exactly.
    await insertItem({ location: "header", label: "Shop", url: "/shop", sortOrder: 0 });
    await insertItem({ location: "header", label: "Mandir Decoration", url: "/shop?category=Mandir Decoration", sortOrder: 1 });

    const pujaItemsId = await insertItem({ location: "header", label: "Puja Items", url: "/shop?category=Puja Items", sortOrder: 2 });
    const pujaChildren = ["Chandan", "Puja Potli", "Puja Thali", "Pavitar Jal", "Kalawa (Mauli)", "Camphor (Kapoor)", "Cotton Wicks"];
    for (let i = 0; i < pujaChildren.length; i++) {
      await insertItem({ location: "header", label: pujaChildren[i], url: `/shop?category=${pujaChildren[i]}`, parentId: pujaItemsId, sortOrder: i });
    }

    await insertItem({ location: "header", label: "Hawan Samagri", url: "/shop?category=Hawan Samagri", sortOrder: 3 });
    await insertItem({ location: "header", label: "Dhoop", url: "/shop?category=Dhoop", sortOrder: 4 });
    await insertItem({ location: "header", label: "Gift Box", url: "/shop?category=Gift Box", sortOrder: 5 });

    const gopalId = await insertItem({ location: "header", label: "Laddu Gopal Ji", url: "/shop?category=Laddu Gopal Ji", sortOrder: 6 });
    const gopalChildren = ["Poshak", "Pagdi / Mukut", "Earrings / Mala", "Hair / Eyes"];
    for (let i = 0; i < gopalChildren.length; i++) {
      await insertItem({ location: "header", label: gopalChildren[i], url: `/shop?category=${gopalChildren[i]}`, parentId: gopalId, sortOrder: i });
    }

    await insertItem({ location: "header", label: "Pandit Ji", url: "/shop?category=Pandit Ji", sortOrder: 7 });
    await insertItem({ location: "header", label: "Blog", url: "/blog", sortOrder: 8 });

    // Footer — Quick Links column.
    const quickLinks = [
      ["About Us", "/aboutus"],
      ["Blog", "/blog"],
      ["Contact Us", "/contactus"],
      ["My Account", "/my-account"],
      ["Track Order", "/track-order"],
      ["Wishlist", "/wishlist"],
      ["Shop", "/shop"],
    ];
    for (let i = 0; i < quickLinks.length; i++) {
      await insertItem({ location: "footer_quick_links", label: quickLinks[i][0], url: quickLinks[i][1], sortOrder: i });
    }

    // Footer — Policies column.
    const policyLinks = [
      ["Privacy Policy", "/privacy-policy"],
      ["Pricing Policy", "/pricing-policy"],
      ["Shipping Policy", "/shipping-policy"],
      ["Terms & Conditions", "/terms-conditions"],
      ["Return Policy", "/return-policy"],
      ["Refund Policy", "/refund-policy"],
    ];
    for (let i = 0; i < policyLinks.length; i++) {
      await insertItem({ location: "footer_policies", label: policyLinks[i][0], url: policyLinks[i][1], sortOrder: i });
    }
  },
};
