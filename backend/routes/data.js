const express = require('express');
const prisma = require('../prismaClient');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken'); // Untuk verifikasi token
const router = express.Router();

// --- MIDDLEWARE AUTH ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Butuh Token' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token tidak valid' });
    req.user = user;
    next();
  });
};

// --- CONFIGURATION: MULTER DYNAMIC STORAGE UNTUK ADOPSI ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Slugify nama untuk folder: "budi santoso" -> "budi_santoso"
    const userName = req.body.fullName.trim().replace(/\s+/g, '_').toLowerCase();
    const catName = req.body.catName.trim().replace(/\s+/g, '_').toLowerCase();
    
    const folderPath = path.join('uploads', 'adoptions', `${userName}_${catName}`);

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    cb(null, folderPath);
  },
  filename: (req, file, cb) => {
    const userName = req.body.fullName.trim().replace(/\s+/g, '_').toLowerCase();
    const catName = req.body.catName.trim().replace(/\s+/g, '_').toLowerCase();
    const folderPath = path.join('uploads', 'adoptions', `${userName}_${catName}`);

    if (file.fieldname === 'documentKtp') {
      cb(null, `ktp${path.extname(file.originalname)}`);
    } else {
      // Logic house1, house2, dst. Selalu cek isi folder biar mulai dari 1 per folder
      let index = 1;
      if (fs.existsSync(folderPath)) {
        const files = fs.readdirSync(folderPath).filter(f => f.startsWith('house'));
        index = files.length + 1;
      }
      cb(null, `house${index}${path.extname(file.originalname)}`);
    }
  }
});

const upload = multer({ storage: storage });

// --- ROUTES ---

// 1. GET: SEMUA KUCING
router.get('/cats', async (req, res) => {
  try {
    const cats = await prisma.cat.findMany({
      where: { isApproved: true, isAdopted: false },
      orderBy: { createdAt: 'desc' },
      include: { 
        shelter: { select: { name: true, shelterAddress: true, phoneNumber: true } } 
      }
    });
    res.json(cats);
  } catch (error) {
    res.status(500).json({ error: 'Gagal ambil data kucing' });
  }
});

// 2. GET: DETAIL KUCING
router.get('/cats/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cat = await prisma.cat.findUnique({
      where: { id: parseInt(id) },
      include: { 
        shelter: { select: { name: true, shelterAddress: true, phoneNumber: true } } 
      }
    });
    if (!cat) return res.status(404).json({ error: 'Kucing tidak ditemukan' });
    res.json(cat);
  } catch (error) {
    res.status(500).json({ error: 'Gagal ambil detail kucing' });
  }
});

// --- 3. POST: SUBMIT FORM ADOPSI (UPGRADED DENGAN VALIDASI) ---
router.post('/adopt', authenticateToken, upload.fields([
  { name: 'documentKtp', maxCount: 1 },
  { name: 'homePhotos', maxCount: 5 }
]), async (req, res) => {
  try {
    const { 
      fullName, phone, ktpNumber, socialMedia, 
      homeStatus, isPermitted, stayingWith, childAges,
      hasExperience, reason, job, movingPlan, isCommitted, catId, catName 
    } = req.body;

    const userId = req.user.userId;

    // FIX 1: CEK APAKAH USER SUDAH MENGAJUKAN KUCING INI
    const existingAdoption = await prisma.adoption.findFirst({
      where: {
        userId: parseInt(userId),
        catId: parseInt(catId),
        status: { in: ['PENDING', 'INTERVIEW', 'APPROVED'] }
      }
    });

    if (existingAdoption) {
      return res.status(400).json({ message: 'Anda sudah mengirimkan pengajuan untuk kucing ini.' });
    }

    const folderName = `${fullName.trim().replace(/\s+/g, '_').toLowerCase()}_${catName.trim().replace(/\s+/g, '_').toLowerCase()}`;

    // Generate Path untuk DB
    const ktpPath = req.files['documentKtp'] 
      ? `/uploads/adoptions/${folderName}/${req.files['documentKtp'][0].filename}` 
      : '';
    
    const housePaths = req.files['homePhotos'] 
      ? req.files['homePhotos'].map(f => `/uploads/adoptions/${folderName}/${f.filename}`).join(',') 
      : '';

    const newAdoption = await prisma.adoption.create({
      data: {
        userId: parseInt(userId),
        catId: parseInt(catId),
        fullName,
        phone,
        ktpNumber,
        socialMedia,
        idCardImage: ktpPath,
        homeStatus,
        isPermitted: isPermitted === 'true',
        stayingWith,
        childAges,
        houseImages: housePaths,
        hasExperience: hasExperience === 'true',
        reason,
        job,
        movingPlan,
        isCommitted: isCommitted === 'true',
        status: 'PENDING'
      }
    });

    res.status(201).json({ message: 'Pengajuan adopsi berhasil dikirim!', data: newAdoption });
  } catch (error) {
    console.error("ADOPTION SUBMIT ERROR:", error);
    res.status(500).json({ message: 'Gagal mengirim pengajuan.', error: error.message });
  }
});

// 4. GET: SEMUA CAMPAIGN
router.get('/campaigns', async (req, res) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      where: { isApproved: true, isClosed: false },
      orderBy: { createdAt: 'desc' },
    });
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ error: 'Gagal ambil data campaign' });
  }
});

module.exports = router;