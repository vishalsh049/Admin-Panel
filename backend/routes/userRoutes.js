const express = require("express");
const router = express.Router();
const db = require("../config/db");

// GET users
router.get("/users", (req, res) => {
  db.query("SELECT * FROM users", (err, result) => {
    if (err) {
      return res.status(500).json(err);
    }
    res.json(result);
  });
});

module.exports = router;