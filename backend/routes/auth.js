const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../prismaClient'); // Pastikan ini mengarah ke file prismaClient.js

const router = express.Router();

// --- REGISTER ---
router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ message: 'Email sudah terdaftar!' });

    const hashedPassword = await bcrypt.hash(password, 10);

    // Default role USER, kecuali dikirim 'SHELTER'
    const assignedRole = role === 'SHELTER' ? 'SHELTER' : 'USER';

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: assignedRole,
        isShelterVerified: false 
      }
    });

    res.status(201).json({ message: 'Registrasi berhasil!', user });
  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

// --- LOGIN ---
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: 'Email tidak ditemukan' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Password salah' });

    // Cek status Shelter
    if (user.role === 'SHELTER' && !user.isShelterVerified) {
       return res.status(403).json({ message: 'Akun Shelter Anda sedang diverifikasi Admin.' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' } 
    );

    res.json({
      message: 'Login berhasil',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isShelterVerified: user.isShelterVerified
      }
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

// --- PENTING: JANGAN LUPA BAGIAN INI ---
module.exports = router;