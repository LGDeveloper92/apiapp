const fs = require("fs");
const cors = require("cors");
const express = require('express');
const cookieParser = require("cookie-parser");
const connectDB = require('./src/database/dataBase');

const mediaRouter = require('./src/routes/media');
const testRouter = require('./src/routes/test');
const authRouter = require('./src/routes/auth/login');
const profileRouter = require('./src/routes/users/profile');
const serverRouter = require('./src/routes/config/server');
const app = express();
const path = require("path");


// Conectar a la base de datos
connectDB();

// Configuración de CORS abierta
app.use(cors({
    origin: '*',          // permite cualquier origen
    credentials: true      // permite envío de cookies/autenticación
}));

// Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "src/downloads")));

// Rutas
app.use('/media', mediaRouter);
app.use('/api', testRouter);
app.use('/auth', authRouter);
app.use('/users', profileRouter);
app.use('/config', serverRouter);

// Escuchar en todas las interfaces de red
app.listen(3000, '0.0.0.0', () => console.log('Server running on port 3000'));