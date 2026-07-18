// Banner Management (narrow "Homepage Builder") — replaces the hardcoded
// HERO_SLIDES array, the hardcoded offer-banner JSX block, and the
// TESTIMONIALS array in frontend/src/pages/Home.jsx. Seeded with the exact
// current hardcoded content so cutover doesn't change the live homepage.
// `placement` keys: home_hero (slider), home_promo (offer strip) — room to
// grow (e.g. category_page) without schema changes.
module.exports = {
  async up(queryInterface, { sequelize }) {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS banners (
        id INT AUTO_INCREMENT PRIMARY KEY,
        placement VARCHAR(50) NOT NULL,
        eyebrow VARCHAR(255) NULL,
        title VARCHAR(500) NOT NULL,
        subtitle VARCHAR(500) NULL,
        cta_label VARCHAR(255) NULL,
        cta_url VARCHAR(500) NULL,
        tone VARCHAR(255) NULL,
        image_path VARCHAR(500) NULL,
        starts_at DATETIME NULL,
        ends_at DATETIME NULL,
        sort_order INT NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_banners_placement (placement)
      )
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS testimonials (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        location VARCHAR(255) NULL,
        text TEXT NOT NULL,
        rating INT NOT NULL DEFAULT 5,
        sort_order INT NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    const [[{ bannerCount }]] = await sequelize.query("SELECT COUNT(*) as bannerCount FROM banners");
    if (Number(bannerCount) === 0) {
      const heroSlides = [
        ["Free shipping above ₹299", "Pure Puja Samagri, Delivered with Devotion", "Mala, Dhoop, Chandan, Kapoor & every essential for your daily worship.", "Shop Puja Items", "/shop?category=Puja Items", "from-red-950 via-red-900 to-orange-800"],
        ["New Shringar Collection", "Dress Your Laddu Gopal Ji in Royal Splendour", "Handcrafted poshak, pagdi, mala & accessories in every size.", "Explore Laddu Gopal Ji", "/shop?category=Laddu Gopal Ji", "from-orange-900 via-red-900 to-rose-950"],
        ["100% Natural & Trusted", "Sacred Dhoop & Hawan Samagri", "Pure ingredients sourced for an authentic, fragrant puja experience.", "Shop Hawan Samagri", "/shop?category=Hawan Samagri", "from-rose-950 via-orange-900 to-amber-800"],
      ];
      for (let i = 0; i < heroSlides.length; i++) {
        const [eyebrow, title, subtitle, ctaLabel, ctaUrl, tone] = heroSlides[i];
        await sequelize.query(
          `INSERT INTO banners (placement, eyebrow, title, subtitle, cta_label, cta_url, tone, sort_order)
           VALUES ('home_hero', :eyebrow, :title, :subtitle, :ctaLabel, :ctaUrl, :tone, :i)`,
          { replacements: { eyebrow, title, subtitle, ctaLabel, ctaUrl, tone, i } }
        );
      }

      await sequelize.query(
        `INSERT INTO banners (placement, eyebrow, title, subtitle, cta_label, cta_url, tone, sort_order)
         VALUES ('home_promo', 'Limited Time', 'Festive Poshak Sets, Up to 40% Off',
                 'Dress Laddu Gopal Ji in style this season.', 'Shop the Offer', '/shop?category=Poshak',
                 'from-orange-700 via-red-800 to-red-950', 0)`
      );
    }

    const [[{ testimonialCount }]] = await sequelize.query("SELECT COUNT(*) as testimonialCount FROM testimonials");
    if (Number(testimonialCount) === 0) {
      const testimonials = [
        ["Anjali Sharma", "Ludhiana, Punjab", "The dhoop cones smell absolutely authentic and the packaging arrived without a single dent. My morning aarti feels complete again."],
        ["Ramesh Verma", "Jaipur, Rajasthan", "Ordered a poshak set for our Laddu Gopal Ji — the stitching and stone work are far better than what I expected for the price."],
        ["Priya Nair", "Kochi, Kerala", "Fast delivery and the gangajal was sealed properly. This is now my go-to store for every festival's puja samagri."],
      ];
      for (let i = 0; i < testimonials.length; i++) {
        const [name, location, text] = testimonials[i];
        await sequelize.query(
          `INSERT INTO testimonials (name, location, text, sort_order) VALUES (:name, :location, :text, :i)`,
          { replacements: { name, location, text, i } }
        );
      }
    }
  },
};
