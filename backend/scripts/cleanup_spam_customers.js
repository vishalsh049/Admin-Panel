// ONE-OFF cleanup: the first sync-customers run (before the is_paying_customer
// filter was added to controllers/wooImportController.js) imported every
// WooCommerce "customer" role user verbatim, including ~3.5k bot-registered
// spam accounts. woo_customer_id did not exist as a column before that sync,
// so ANY store_customers row that has it set was touched by that one run —
// rows updated-in-place (matched by email to a real pre-existing local
// account) keep their ORIGINAL created_at, so filtering to the sync's narrow
// creation window safely limits deletion to freshly-created rows only, never
// touching a real pre-existing account. Delete this file after running once.
require("dotenv").config();
const sequelize = require("../config/db");
const StoreCustomer = require("../models/StoreCustomer");
const woo = require("../services/wooCommerceService");

async function main() {
  const [[range]] = await sequelize.query(
    "SELECT MIN(created_at) AS min_created, MAX(created_at) AS max_created, COUNT(*) AS total " +
      "FROM store_customers WHERE woo_customer_id IS NOT NULL"
  );
  console.log("Woo-linked rows window:", range);

  const wooCustomers = await woo.fetchAllCustomers();
  const payingIds = new Set(wooCustomers.filter((c) => c.is_paying_customer).map((c) => c.id));
  console.log(`WooCommerce customers: ${wooCustomers.length} total, ${payingIds.size} paying`);

  const candidates = await StoreCustomer.findAll({
    where: sequelize.literal(
      `woo_customer_id IS NOT NULL AND created_at BETWEEN '${range.min_created.toISOString().slice(0, 19).replace("T", " ")}' AND '${range.max_created
        .toISOString()
        .slice(0, 19)
        .replace("T", " ")}'`
    ),
    attributes: ["id", "woo_customer_id", "email", "created_at"],
  });
  console.log(`Freshly-created woo-linked rows in that window: ${candidates.length}`);

  const toDelete = candidates.filter((c) => !payingIds.has(c.woo_customer_id));
  const toKeep = candidates.length - toDelete.length;
  console.log(`Non-paying (spam) to delete: ${toDelete.length}; paying to keep: ${toKeep}`);

  if (toDelete.length) {
    const ids = toDelete.map((c) => c.id);
    const chunkSize = 500;
    let deleted = 0;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      deleted += await StoreCustomer.destroy({ where: { id: chunk } });
    }
    console.log(`Deleted ${deleted} spam customer rows.`);
  }

  const [[after]] = await sequelize.query("SELECT COUNT(*) AS total FROM store_customers");
  console.log("store_customers total after cleanup:", after.total);

  await sequelize.close();
}

main().catch((err) => {
  console.error("Cleanup failed:", err);
  process.exit(1);
});
