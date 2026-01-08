const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../prismaClient');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// --- CONFIGURATION: MULTER DYNAMIC STORAGE ---
// Ganti bagian storage di auth.js
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.user.userId;
    const userDir = path.join('uploads', `${userId}_shelterReq`);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    if (file.fieldname === 'documentKtp') {
      cb(null, `ktp${path.extname(file.originalname)}`);
    } else {
      // Logic penamaan shelter1.jpg, shelter2.jpg, dst
      // Kita gunakan body counter atau fieldname index jika tersedia
      // Cara paling aman adalah mengecek jumlah file yang sudah ada di folder tersebut
      const userId = req.user.userId;
      const userDir = path.join('uploads', `${userId}_shelterReq`);
      
      let index = 1;
      if (fs.existsSync(userDir)) {
        const files = fs.readdirSync(userDir).filter(f => f.startsWith('shelter'));
        index = files.length + 1;
      }
      cb(null, `shelter${index}${path.extname(file.originalname)}`);
    }
  }
});

const upload = multer({ storage: storage });

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

// backend/routes/auth.js

// 1. Tambahkan konfigurasi multer khusus untuk profile
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/profiles';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Penamaan file: userId_timestamp.jpg agar unik
    cb(null, `profile_${req.user.userId}_${Date.now()}${path.extname(file.originalname)}`);
  }
});

const uploadProfile = multer({ storage: profileStorage });

// 2. Endpoint Baru: Update Photo Profile
router.put('/update-photo', authenticateToken, uploadProfile.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Tidak ada file yang diunggah' });

    const photoPath = `/uploads/profiles/${req.file.filename}`;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data: { photoProfile: photoPath }
    });

    res.json({ 
      message: 'Foto profil diperbarui', 
      photoProfile: photoPath 
    });
  } catch (error) {
    res.status(500).json({ message: 'Gagal upload foto' });
  }
});

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
    
    // 🔥 FIX: Tambahin userId di response
    res.json({ 
      message: 'Login berhasil', 
      token, 
      userId: user.id, // ← INI YANG PENTING!
      user: userWithoutPassword 
    });
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

// 4. CHECK PHONE DUPLICATE
router.post('/check-phone', authenticateToken, async (req, res) => {
  const { phoneNumber } = req.body;
  const userId = req.user.userId;
  
  if (!phoneNumber) return res.status(200).json({ available: true });

  try {
    const existingUser = await prisma.user.findFirst({
      where: { phoneNumber: phoneNumber }
    });
    
    if (existingUser && existingUser.id !== userId) {
      return res.status(409).json({ available: false, message: 'Nomor telepon telah digunakan.' });
    }

    res.json({ available: true });
  } catch (error) {
    res.status(500).json({ message: 'Error checking phone' });
  }
});

// 5. UPDATE PROFILE (FIXED NULL CHECK FOR req.files)
router.put('/update-profile', authenticateToken, upload.fields([
  { name: 'documentKtp', maxCount: 1 },
  { name: 'shelterPhotos', maxCount: 5 }
]), async (req, res) => {
  const { nickname, phoneNumber, shelterAddress, isClinic, clinicOpenHours } = req.body;
  const userId = req.user.userId; 

  try {
    const updateData = {};
    if (nickname) updateData.nickname = nickname;
    if (phoneNumber) updateData.phoneNumber = phoneNumber;
    if (shelterAddress) updateData.shelterAddress = shelterAddress;
    if (clinicOpenHours) updateData.clinicOpenHours = clinicOpenHours;

    if (req.files) {
      if (req.files['documentKtp'] && req.files['documentKtp'][0]) {
        updateData.documentKtp = `/uploads/${userId}_shelterReq/${req.files['documentKtp'][0].filename}`;
      }
      
      if (req.files['shelterPhotos'] && req.files['shelterPhotos'].length > 0) {
        const paths = req.files['shelterPhotos'].map(f => `/uploads/${userId}_shelterReq/${f.filename}`);
        updateData.shelterPhotos = paths.join(',');
      }
    }

    if (isClinic !== undefined) {
      updateData.isClinic = isClinic === 'true' || isClinic === true;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    const { password, ...userWithoutPassword } = updatedUser;
    res.json({ message: 'Pendaftaran shelter berhasil dikirim', user: userWithoutPassword });

  } catch (error) {
    console.error("PRISMA UPDATE ERROR:", error);
    res.status(500).json({ message: 'Gagal memperbarui database.', error: error.message });
  }
});

// 6. RESET / CHANGE PASSWORD
router.post('/reset-password', async (req, res) => {
  const { email, newPassword } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { email: email },
      data: { password: hashedPassword }
    });
    res.json({ message: 'Kata sandi berhasil diperbarui' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal memperbarui kata sandi' });
  }
});

// 7. GET ALL ACTIVITIES
// 7. GET ALL ACTIVITIES (SHELTER & USER)
router.get('/activities', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const userRole = req.user.role;

  try {
    // --- LOGIC KHUSUS ROLE SHELTER ---
    if (userRole === 'SHELTER') {
  const [myCats, myHandledReports, globalPendingReports, incomingAdoptions, incomingDonations] = await Promise.all([
    // 1. Kucing milik shelter ini
    prisma.cat.findMany({ where: { shelterId: userId } }),
    
    // 2. Laporan yang SEDANG diurus oleh shelter ini
    prisma.report.findMany({ where: { rescuerId: userId } }),

    // 3. BARU: Total Laporan PENDING di seluruh sistem (Laporan Masuk)
    prisma.report.count({ where: { status: 'PENDING' } }),
    
    // 4. Pengajuan adopsi masuk
    prisma.adoption.findMany({
      where: { cat: { shelterId: userId } },
      include: { user: { select: { name: true } }, cat: true }
    }),
    
    // 5. Donasi masuk
    prisma.donation.findMany({
      where: { campaign: { shelterId: userId } }
    })
  ]);

  return res.json({ 
    isShelter: true,
    cats: myCats, 
    handledReports: myHandledReports, 
    globalPendingCount: globalPendingReports, // Kirim angka laporan masuk
    adoptions: incomingAdoptions, 
    donations: incomingDonations 
  });
}

    // --- LOGIC ROLE USER BIASA ---
    const [userReports, userAdoptions, userDonations] = await Promise.all([
      prisma.report.findMany({
        where: { userId: userId },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.adoption.findMany({
        where: { userId: userId },
        include: { 
          cat: {
            include: {
              shelter: { 
                select: { 
                  id: true, name: true, nickname: true,
                  shelterAddress: true, shelterPhotos: true 
                } 
              }
            } 
          } 
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.donation.findMany({
        where: { userId: userId },
        include: { 
          campaign: {
            include: {
              shelter: {
                select: {
                  id: true, name: true, nickname: true,
                  shelterAddress: true, shelterPhotos: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    res.json({ 
      reports: userReports, 
      adoptions: userAdoptions, 
      donations: userDonations 
    });

  } catch (error) {
    // Sangat penting untuk log error di terminal backend
    console.error("ACTIVITIES_ERROR:", error); 
    res.status(500).json({ 
      message: 'Gagal mengambil riwayat aktivitas',
      error: error.message 
    });
  }
});

// 8. VERIFY CURRENT PASSWORD
router.post('/verify-password', authenticateToken, async (req, res) => {
  const { currentPassword } = req.body;
  const userId = req.user.userId;
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) return res.status(401).json({ message: 'Kata sandi saat ini salah.' });
    res.json({ message: 'Password terverifikasi' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal verifikasi kata sandi' });
  }
});

module.exports = router;