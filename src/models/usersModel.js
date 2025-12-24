const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  registrationDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: Number,
    default: 1 // 1 = activo, 0 = inactivo
  },
  role: {
    type: String,
    enum: ["admin", "standart"],
    default: "standart"
  },
  name: { type: String },        // nuevo campo
  lastName: { type: String },    // nuevo campo
  email: { type: String }        // nuevo campo
});

// Exportar el modelo
module.exports = mongoose.model("users", userSchema);