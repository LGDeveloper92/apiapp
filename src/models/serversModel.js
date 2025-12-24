const mongoose = require("mongoose");

const serversSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: true
  },
   urlServer: {
    type: String,
    required: true
  },
  registrationDate: {
    type: Date,
    default: Date.now
  }
});

// Exportar el modelo
module.exports = mongoose.model("servers", serversSchema);