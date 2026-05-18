const express = require("express");
const router = express.Router();
const sequelize = require("../config/db");
const { QueryTypes } = require("sequelize");

function normalizeItems(items) {
  if (typeof items === "string") {
    try {
      return JSON.parse(items);
    } catch (error) {
      return [];
    }
  }

  return Array.isArray(items) ? items : [];
}

function extractInsertId(queryResult) {
  if (!Array.isArray(queryResult)) return null;

  const [result, metadata] = queryResult;

  return (
    result?.insertId ??
    result?.insert_id ??
    metadata?.insertId ??
    metadata?.insert_id ??
    null
  );
}

async function insertBillItems(transaction, billId, items) {
  for (const item of items) {
    await sequelize.query(
      `INSERT INTO sale_bill_items
(bill_id, item_description, sku, hsn, quantity, rate, gst_percent, total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      {
        replacements: [
          billId,
          item.description || "",
          item.sku || "",
          item.hsn || "",
          parseFloat(item.qty) || 0,
          parseFloat(item.rate) || 0,
          parseFloat(item.gst) || 0,
          parseFloat(item.total) || 0
        ],
        transaction
      }
    );
  }
}


// GET ALL SALE BILLS
router.get("/", async (req, res) => {

try {

const bills = await sequelize.query(
"SELECT * FROM sale_bills ORDER BY id DESC",
{
type: QueryTypes.SELECT
}
);

res.json(bills);

} catch (error) {

console.error(error);
res.status(500).json({ error: error.message });

}

});

// GET SINGLE SALE BILL
router.get("/:id", async (req, res) => {
  try {

    const billId = req.params.id;

    const bill = await sequelize.query(
      "SELECT * FROM sale_bills WHERE id = ?",
      {
        replacements: [billId],
        type: QueryTypes.SELECT
      }
    );

  const items = await sequelize.query(
  `SELECT 
    item_description AS description,
    sku,
    hsn,
    quantity AS qty,
    rate,
    gst_percent AS gst,
    total
   FROM sale_bill_items
   WHERE bill_id = ?`,
  {
    replacements: [billId],
    type: QueryTypes.SELECT
  }
);

    if (!bill.length) {
      return res.status(404).json({ error: "Bill not found" });
    }

    console.log("Bill fetched:", bill[0]);
    console.log("Items fetched:", items);

    const response = {
      bill: bill[0],
      items: Array.isArray(items) ? items : []
    };

    console.log("Sending response:", response);

    res.json(response);

  } catch (error) {

    console.error("ERROR fetching bill:", error);
    res.status(500).json({ error: error.message });

  }
});


// SAVE SALE BILL
router.post("/", async (req, res) => {
let transaction;

try {

const bill = req.body;
const items = normalizeItems(bill.items);
transaction = await sequelize.transaction();

console.log("SALE BILL RECEIVED:", JSON.stringify(bill, null, 2));


// INSERT BILL
const sql = `
INSERT INTO sale_bills
(
billing_name, billing_phone, billing_email, billing_address, billing_city, billing_state, billing_pincode,
shipping_name, shipping_phone, shipping_address, shipping_city, shipping_state, shipping_pincode,
order_date, status, payment_method, subtotal, discount, shipping_charge,
gst_amount, total_amount
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

const values = [
  bill.customer || null,
  bill.phone || null,
  bill.email || null,
  bill.address || null,
  bill.city || null,
  bill.state || null,
  bill.pincode || null,

  (bill.shipping?.firstName || "") + " " + (bill.shipping?.lastName || ""),
  bill.shipping?.phone || null,
  bill.shipping?.address || null,
  bill.shipping?.city || null,
  bill.shipping?.state || null,
  bill.shipping?.pincode || null,

  bill.date || new Date(),
  bill.status || "pending",
  bill.paymentMethod || null,
  bill.subtotal || 0,
  bill.discount || 0,
  bill.shippingCharge || 0,

  (bill.igst || 0) + (bill.cgst || 0) + (bill.sgst || 0),
  bill.total || 0
];

console.log("VALUES:", values);
console.log("VALUES LENGTH:", values.length);

const queryResult = await sequelize.query(sql, {
  replacements: values,
  type: QueryTypes.INSERT,
  transaction
});

console.log("INSERT RESULT:", queryResult);

let billId = extractInsertId(queryResult);

if (!billId && queryResult?.[0]) {
  billId = queryResult[0];
}

console.log("NEW BILL ID:", billId);
console.log("ITEMS RECEIVED:", items);

if (!billId) {
  await transaction.rollback();
  return res.status(500).json({ error: "Failed to create sale bill ID" });
}

// INSERT ITEMS
if (items.length > 0) {

console.log("INSERTING ITEMS:", items);
await insertBillItems(transaction, billId, items);

} else {
console.log("NO ITEMS TO INSERT - Items array:", items);
}

await transaction.commit();
res.json({ success: true, billId: billId });

} catch (error) {

console.error("SAVE BILL ERROR:", error);
if (transaction) {
  try {
    await transaction.rollback();
  } catch (rollbackError) {
    console.error("ROLLBACK ERROR:", rollbackError);
  }
}
res.status(500).json({ error: error.message });

}

});

router.put("/:id", async (req, res) => {
  let transaction;

  try {
    const billId = req.params.id;
    const bill = req.body;
    const items = normalizeItems(bill.items);

    transaction = await sequelize.transaction();

    const sql = `
    UPDATE sale_bills
   SET billing_name = ?, 
billing_phone = ?, 
billing_email = ?, 
billing_address = ?, 
billing_city = ?, 
billing_state = ?, 
billing_pincode = ?,

shipping_name = ?, 
shipping_phone = ?, 
shipping_address = ?, 
shipping_city = ?, 
shipping_state = ?, 
shipping_pincode = ?,

order_date = ?, 
status = ?, 
payment_method = ?, 
subtotal = ?, 
discount = ?, 
shipping_charge = ?,
gst_amount = ?, 
total_amount = ?

WHERE id = ?
    `;

    await sequelize.query(sql, {
      replacements: [
        bill.customer || null,
        bill.phone || null,
        bill.email || null,
        bill.address || null,
        bill.city || null,
        bill.state || null,
        bill.pincode || null,
        `${bill.shipping?.firstName || ""} ${bill.shipping?.lastName || ""}`.trim() || null,
        bill.shipping?.phone || null,
        bill.shipping?.address || null,
        bill.shipping?.city || null,
        bill.shipping?.state || null,
        bill.shipping?.pincode || null,
        bill.date || new Date(),
        bill.status || "pending",
        bill.paymentMethod || null,
        bill.subtotal || 0,
        bill.discount || 0,
        bill.shippingCharge || bill.shipping_charge || 0,
        (bill.igst || 0) + (bill.cgst || 0) + (bill.sgst || 0),
        bill.total || bill.grandTotal || 0,
        billId
      ],
      transaction
    });

    await sequelize.query(
      "DELETE FROM sale_bill_items WHERE bill_id = ?",
      {
        replacements: [billId],
        transaction
      }
    );

    if (items.length > 0) {
      await insertBillItems(transaction, billId, items);
    }

    await transaction.commit();
    res.json({ success: true, billId: Number(billId) });
  } catch (error) {
    console.error("UPDATE BILL ERROR:", error);
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error("ROLLBACK ERROR:", rollbackError);
      }
    }
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", async (req, res) => {

  try {

    const id = req.params.id;

    await sequelize.query(
      "DELETE FROM sale_bill_items WHERE bill_id = ?",
      { replacements: [id] }
    );

    await sequelize.query(
      "DELETE FROM sale_bills WHERE id = ?",
      { replacements: [id] }
    );

    res.json({ success: true });

  } catch (error) {

    console.error(error);
    res.status(500).json({ error: error.message });

  }

});


module.exports = router;
