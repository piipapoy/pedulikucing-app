const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../prismaClient');

const router = express.Router();

// --- MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Akses ditolak (Butuh Token)' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token tidak valid' });
    req.user = user;
    next();
  });
};

// --- ROUTES ---

// 1. REGISTER
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ message: 'Email sudah terdaftar.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword },
    });
    res.status(201).json({ message: 'User berhasil dibuat', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. LOGIN
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ message: 'Email atau password salah.' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ message: 'Email atau password salah.' });

    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...userWithoutPassword } = user;
    res.json({ message: 'Login berhasil', token, user: userWithoutPassword });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. GET PROFILE
router.get('/profile', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: { select: { donations: true, reports: true, adoptions: true } }
      }
    });

    if (!user) return res.status(404).json({ message: 'User tidak ditemukan' });

    const { password, ...userData } = user;
    res.json({
      user: userData,
      stats: { donations: user._count.donations, reports: user._count.reports, adoptions: user._count.adoptions }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal mengambil profil' });
  }
});

// 4. CHECK PHONE DUPLICATE (ENDPOINT KHUSUS CEK DI AWAL)
router.post('/check-phone', authenticateToken, async (req, res) => {
  const { phoneNumber } = req.body;
  const userId = req.user.userId;
  
  if (!phoneNumber) return res.status(200).json({ available: true });

  try {
    const existingUser = await prisma.user.findFirst({
      where: { phoneNumber: phoneNumber }
    });
    
    // Kalau ada user lain yg punya no ini -> Gak Available
    if (existingUser && existingUser.id !== userId) {
      return res.status(409).json({ available: false, message: 'Nomor telepon telah digunakan.' });
    }

    res.json({ available: true });
  } catch (error) {
    res.status(500).json({ message: 'Error checking phone' });
  }
});

// 5. UPDATE PROFILE (FINAL - Cek Duplikat Lagi biar aman)
router.put('/update-profile', authenticateToken, async (req, res) => {
  const { nickname, phoneNumber } = req.body;
  const userId = req.user.userId; 

  try {
    if (nickname && nickname.length > 12) {
      return res.status(400).json({ message: 'Nickname maksimal 12 karakter.' });
    }

    if (phoneNumber) {
      const existingUser = await prisma.user.findFirst({ where: { phoneNumber } });
      if (existingUser && existingUser.id !== userId) {
        return res.status(409).json({ message: 'Nomor telepon telah digunakan akun lain.' });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { 
        nickname: nickname || null,
        phoneNumber: phoneNumber || null
      },
    });

    const { password, ...userWithoutPassword } = updatedUser;
    res.json({ message: 'Profil berhasil diperbarui', user: userWithoutPassword });

  } catch (error) {
    console.error(error);
    if (error.code === 'P2002') { // Error unik Prisma
      return res.status(409).json({ message: 'Data unik sudah digunakan.' });
    }
    res.status(500).json({ message: 'Gagal memperbarui profil' });
  }
});

module.exports = router;