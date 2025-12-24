require('dotenv').config();
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const ecryptPassword = require('../../helpers/encryptPassword');
const User = require('../../models/usersModel');

router.post('/userData', async (req, res) => {
   const { username } = req.body;
    console.log(username.toLowerCase().replace(/\s+/g, ""))
   const user = await User.findOne({ username : username.toLowerCase().replace(/\s+/g, "") });
   if (!user) {
      return res.status(200).json({
        status: 0,
        msgStatus: "Invalid username",
        userData: null
      });
    }else{
      return res.status(200).json({
        status: 1,
        msgStatus: "User found",
        userData: {
          username: user.username,
          name: user.name,
          lastName: user.lastName,
          email: user.email
        }   
      }); 
    }
})

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Buscar 
    console.log(username.toLowerCase())
    const user = await User.findOne({ username : username.toLowerCase().replace(/\s+/g, "") });
    if (!user) {
      return res.status(401).json({
        status: 0,
        msgStatus: "Invalid username",
        response: null
      });
    }

    // Validar contraseña
    const validPassword = await ecryptPassword.matchPassword(password, user.password);
    if (!validPassword) {
      console.log(validPassword)
      return res.status(200).json({
        status: 0,
        msgStatus: "Invalid password",
        response: null
      });
    }

    // Generar token JWT
    const token = jwt.sign(
      { 
        id: user._id, 
        username: user.username, 
        name: user.name,
        lastName: user.lastName,
        email: user.email,
        status: user.status,
        role: user.role,
        registrationDate: user.registrationDate

      },
      process.env.JWT_SECRET,
      { expiresIn: '3h' } // más razonable que 1m
    );


    // Respuesta
    return res.status(200).json({
      status: 1,
      msgStatus: "Login successful",
      token, // <-- también lo devuelves en JSON para apps móviles
      response: {
        username: user.username,
        name: user.name,
        lastName: user.lastName,
        email: user.email,
        status: user.status,
        role: user.role,
        registrationDate: user.registrationDate
      }
    });

  } catch (err) {
    console.error(err);
    return res.status(200).json({
      status: 0,
      msgStatus: "Server error",
      response: { error: err.message }
    });
  }
});

module.exports = router;
