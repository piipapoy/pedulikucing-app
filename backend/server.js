const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json()); // Supaya bisa baca JSON dari body request
app.use(express.urlencoded({ extended: true }));

// Folder statis untuk gambar (foto kucing/laporan nanti)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// -- IMPORT ROUTES DISINI --
const authRoutes = require('./routes/auth');
// Nanti kita tambah route lain (adoption, report) disini

// -- USE ROUTES DISINI --
app.use('/api/auth', authRoutes);

// Test Route
app.get('/', (req, res) => {
  res.send('Server PeduliKucing berjalan dengan lancar!');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});