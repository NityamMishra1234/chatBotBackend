const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  text: String,
  timestamp: Date,
  direction: {
    type: String,
    enum: ["incoming", "outgoing"],
  },
});

const leadSchema = new mongoose.Schema({
  number: { type: String, unique: true },
  name: String,
  messages: [messageSchema],
});

module.exports = mongoose.model("Lead", leadSchema);
