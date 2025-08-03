const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// Signup
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    // console.log(req.body)
    const hashed = await bcrypt.hash(password, 10);
    const admin = await Admin.create({ name, email, password: hashed });
    res.json({ success: true, admin });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(req.body)
    const admin = await Admin.findOne({ email });
    //Debugging we are not using the node mon so we have to restart the server every time, 
    // console.log(admin)
    if (!admin) return res.status(404).json({ error: "Admin not found" });

    const match = await bcrypt.compare(password, admin.password);
    if (!match) return res.status(401).json({ error: "Invalid password" });

    const token = jwt.sign({ id: admin._id }, JWT_SECRET, { expiresIn: "1d" });

    //convert the moggoose objt to plane text and remove the password , not to disclose the password rather it is hasses 
    const adminData = admin.toObject();
    delete adminData.password;

    res.status(200).json({ success: true, admin: adminData, token });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


module.exports = router; 
