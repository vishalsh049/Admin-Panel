const express = require("express");
const router = express.Router();
const sequelize = require("../config/db");
const Expense = require("../models/Expense");
const ExpenseItem = require("../models/ExpenseItem");
const upload = require("../middleware/upload");

/* ================= ADD EXPENSE ================= */
router.post(
  "/",
  upload.fields([
    { name: "receiptImage", maxCount: 1 },
    { name: "invoicePdf", maxCount: 1 }
  ]),
  async (req, res) => {
    const t = await sequelize.transaction();

    try {

      let {
        date,
        vendorName,
        purchasePersonName,
        place,
        invoiceNo,
        paidThrough,
        gstAmount = 0,
        transportCharges = 0,
        amountPaid = 0,
        notes,
        items
      } = req.body;

      if (typeof items === "string") {
        items = JSON.parse(items);
      }

      const receiptImage = req.files?.receiptImage
        ? req.files.receiptImage[0].filename
        : null;

      const invoicePdf = req.files?.invoicePdf
        ? req.files.invoicePdf[0].filename
        : null;

      console.log('Files received:', req.files);
      console.log('Receipt image:', receiptImage);
      console.log('Invoice PDF:', invoicePdf);


      if (!items || items.length === 0) {
        return res.status(400).json({ message: "No expense items found" });
      }

      // ✅ Calculate subtotal from items
      const subtotal = items.reduce(
        (sum, item) => sum + parseFloat(item.amount || 0),
        0
      );

      const taxableAmount = subtotal + parseFloat(transportCharges);
      const totalAfterGst = taxableAmount + parseFloat(gstAmount);
      const pendingAmount = totalAfterGst - parseFloat(amountPaid);

      let status = "Unpaid";
      if (pendingAmount <= 0 && totalAfterGst > 0) status = "Paid";
      else if (amountPaid > 0 && pendingAmount > 0) status = "Partial";

      const count = await Expense.count();
      const expenseCode = "EXP-" + String(count + 1).padStart(3, "0");

      // ✅ Create Expense
      const expense = await Expense.create(
        {
          expenseCode,
          date,
          vendorName,
          receiptImage,
          invoicePdf,
          purchasePersonName,
          place,
          invoiceNo,
          paidThrough,
          totalBeforeGst: subtotal,
          gstAmount,
          transportCharges,
          totalAfterGst,
          amountPaid,
          amountPending: pendingAmount > 0 ? pendingAmount : 0,
          status,
          notes
        },
        { transaction: t }
      );

      // ✅ Save items
      const itemData = items.map((item) => ({
        expenseId: expense.id,
        categoryId: item.categoryId,
        notes: item.notes,
        amount: item.amount
      }));

      await ExpenseItem.bulkCreate(itemData, { transaction: t });

      await t.commit();

      res.status(201).json({ message: "Expense saved successfully" });

    } catch (err) {
      await t.rollback();
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  });

/* ================= GET ALL ================= */
router.get("/", async (req, res) => {
  try {
    const expenses = await Expense.findAll({
      order: [["createdAt", "DESC"]],
    });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= GET SINGLE WITH ITEMS ================= */
router.get("/:id", async (req, res) => {
  try {
    const expense = await Expense.findByPk(req.params.id, {
      include: {
        model: ExpenseItem,
        include: [
          {
            association: "category"
          }
        ]
      }
    });
    res.json(expense);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= UPDATE EXPENSE ================= */
router.put(
  "/:id",
  upload.fields([
    { name: "receiptImage", maxCount: 1 },
    { name: "invoicePdf", maxCount: 1 }
  ]),
  async (req, res) => {
    const t = await sequelize.transaction();

    try {
      let {
        date,
        vendorName,
        purchasePersonName,
        place,
        invoiceNo,
        paidThrough,
        gstAmount = 0,
        transportCharges = 0,
        amountPaid = 0,
        notes,
        items
      } = req.body;

      if (typeof items === "string") {
        items = JSON.parse(items);
      }

      const receiptImage = req.files?.receiptImage
        ? req.files.receiptImage[0].filename
        : null;

      const invoicePdf = req.files?.invoicePdf
        ? req.files.invoicePdf[0].filename
        : null;

      if (!items || items.length === 0) {
        return res.status(400).json({ message: "No expense items found" });
      }

      const subtotal = items.reduce(
        (sum, item) => sum + parseFloat(item.amount || 0),
        0
      );

      const taxableAmount = subtotal + parseFloat(transportCharges);
      const totalAfterGst = taxableAmount + parseFloat(gstAmount);
      const pendingAmount = totalAfterGst - parseFloat(amountPaid);

      let status = "Unpaid";
      if (pendingAmount <= 0 && totalAfterGst > 0) status = "Paid";
      else if (amountPaid > 0 && pendingAmount > 0) status = "Partial";

      // Update main expense
      await Expense.update(
        {
          date,
          vendorName,
          purchasePersonName,
          place,
          invoiceNo,
          paidThrough,
          totalBeforeGst: subtotal,
          gstAmount,
          transportCharges,
          totalAfterGst,
          amountPaid,
          amountPending: pendingAmount > 0 ? pendingAmount : 0,
          status,
          notes,
          ...(receiptImage && { receiptImage }),
          ...(invoicePdf && { invoicePdf })
        },
        { where: { id: req.params.id }, transaction: t }
      );

      // Delete old items
      await ExpenseItem.destroy({
        where: { expenseId: req.params.id },
        transaction: t
      });

      // Insert new items
      const itemData = items.map(item => ({
        expenseId: req.params.id,
        categoryId: item.categoryId,
        notes: item.notes,
        amount: item.amount
      }));

      await ExpenseItem.bulkCreate(itemData, { transaction: t });

      await t.commit();

      res.json({ message: "Expense updated successfully" });

    } catch (err) {
      await t.rollback();
      res.status(500).json({ message: err.message });
    }
  });

/* ================= DELETE EXPENSE ================= */
router.delete("/:id", async (req, res) => {
  const t = await sequelize.transaction();

  try {
    // Delete child items first
    await ExpenseItem.destroy({
      where: { expenseId: req.params.id },
      transaction: t
    });

    // Delete main expense
    await Expense.destroy({
      where: { id: req.params.id },
      transaction: t
    });

    await t.commit();

    res.json({ success: true });

  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;