const express = require('express');
const prisma = require('../prismaClient');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken'); 
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

// --- CONFIGURATION: MULTER (DYNAMIC STORAGE) ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folderPath = '';
    
    if (file.fieldname === 'image') {
      // Folder: uploads/campaigns/nama_campaign
      const campaignName = (req.body.title || 'temp').trim().replace(/\s+/g, '_').toLowerCase();
      folderPath = path.join('uploads', 'campaigns', campaignName);
    } else if (file.fieldname === 'photos' || file.fieldname === 'new_photos') {
      const catIdentifier = req.params.id ? `cat_${req.params.id}` : (req.body.name || 'temp').trim().replace(/\s+/g, '_').toLowerCase();
      folderPath = path.join('uploads', 'cats', catIdentifier);
    } else {
      const userName = (req.body.fullName || 'unknown').trim().replace(/\s+/g, '_').toLowerCase();
      const catName = (req.body.catName || 'cat').trim().replace(/\s+/g, '_').toLowerCase();
      folderPath = path.join('uploads', 'adoptions', `${userName}_${catName}`);
    }

    if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
    cb(null, folderPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `img_${Date.now()}${ext}`);
  }
});

const upload = multer({ storage: storage });

// --- ROUTES ---

// 1. GET: SEMUA KUCING (PUBLIC)
router.get('/cats', async (req, res) => {
  try {
    const cats = await prisma.cat.findMany({
      where: { isApproved: true, isAdopted: false },
      orderBy: { createdAt: 'desc' },
      include: { 
        shelter: { 
          select: { 
            name: true, shelterAddress: true, phoneNumber: true,
            isClinic: true, isShelterVerified: true, nickname: true 
          } 
        } 
      }
    });
    res.json(cats);
  } catch (error) {
    res.status(500).json({ error: 'Gagal ambil data kucing' });
  }
});

// 2. GET: DETAIL KUCING BY ID
router.get('/cats/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cat = await prisma.cat.findUnique({
      where: { id: parseInt(id) },
      include: { shelter: { select: { id: true, name: true, shelterAddress: true, phoneNumber: true } } }
    });
    if (!cat) return res.status(404).json({ error: 'Kucing tidak ditemukan' });
    res.json(cat);
  } catch (error) {
    res.status(500).json({ error: 'Gagal ambil detail kucing' });
  }
});

// 3. PUT: UPDATE DATA KUCING (SHELTER SIDE)
// Ganti bagian route PUT di data.js kamu:
router.put('/cats/:id', authenticateToken, upload.array('new_photos', 5), async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, breed, age, gender, description, 
      existing_images, personality, health 
    } = req.body;
    const catId = parseInt(id);

    const oldCat = await prisma.cat.findUnique({ where: { id: catId } });
    if (!oldCat) return res.status(404).json({ message: 'Kucing tidak ditemukan' });

    let finalImages = [];
    if (existing_images) {
      finalImages = existing_images.split(',').filter(img => img.trim() !== "");
    }

    if (req.files && req.files.length > 0) {
      const newPhotoPaths = req.files.map(file => `/uploads/cats/cat_${id}/${file.filename}`);
      finalImages = [...finalImages, ...newPhotoPaths];
    }

    const parsedAge = parseInt(age);

    const updatedCat = await prisma.cat.update({
      where: { id: catId },
      data: {
        name,
        breed,
        age: isNaN(parsedAge) ? oldCat.age : parsedAge,
        gender,
        description,
        personality: personality || "", 
        health: health || "",
        images: finalImages.join(',')
      }
    });

    res.json({ message: 'Update berhasil', data: updatedCat });
  } catch (error) {
    console.error("Update Cat Error:", error);
    res.status(500).json({ message: 'Gagal update database', error: error.message });
  }
});

// 4. DELETE: HAPUS KUCING
router.delete('/cats/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const catId = parseInt(id);

    // Gunakan transaction agar jika salah satu gagal, semua dibatalkan
    await prisma.$transaction([
      // 1. Hapus semua pengajuan adopsi yang nempel ke kucing ini
      prisma.adoption.deleteMany({ where: { catId: catId } }),
      
      // 2. Hapus data kucingnya
      prisma.cat.delete({ where: { id: catId } })
    ]);

    res.json({ message: 'Berhasil menghapus anabul dan data terkait' });
  } catch (error) {
    console.error("Delete Error:", error);
    res.status(500).json({ error: 'Gagal menghapus anabul karena ada data terkait (adopsi/chat)' });
  }
});

// POST: TAMBAH KUCING BARU (SHELTER SIDE)
router.post('/cats', authenticateToken, upload.array('photos', 5), async (req, res) => {
  try {
    const { name, breed, age, gender, description, personality, health } = req.body;
    const shelterId = req.user.userId;

    // Nama folder yang dibuat Multer tadi
    const catFolderName = name.trim().replace(/\s+/g, '_').toLowerCase();

    const photoPaths = req.files.map(file => {
      // Simpan path yang BENAR ke database tanpa folder 'temp'
      return `/uploads/cats/${catFolderName}/${file.filename}`; 
    });

    const newCat = await prisma.cat.create({
      data: {
        name,
        breed,
        age: parseInt(age),
        gender,
        description,
        personality: personality || "",
        health: health || "",
        images: photoPaths.join(','),
        shelterId: parseInt(shelterId),
        isApproved: false, 
        isAdopted: false
      }
    });

    res.status(201).json({ message: 'Pendaftaran anabul berhasil', data: newCat });
  } catch (error) {
    console.error("Add Cat Error:", error);
    res.status(500).json({ message: 'Gagal simpan data', error: error.message });
  }
});

// --- SISA ROUTES CAMPAIGN, DONATE, CLINICS (Sama seperti sebelumnya) ---
router.post('/adopt', authenticateToken, upload.fields([{ name: 'documentKtp', maxCount: 1 }, { name: 'homePhotos', maxCount: 5 }]), async (req, res) => {
  try {
    const { fullName, phone, ktpNumber, socialMedia, homeStatus, isPermitted, stayingWith, childAges, hasExperience, reason, job, movingPlan, isCommitted, catId, catName } = req.body;
    const userId = req.user.userId;
    const existingAdoption = await prisma.adoption.findFirst({
      where: { userId: parseInt(userId), catId: parseInt(catId), status: { in: ['PENDING', 'INTERVIEW', 'APPROVED'] } }
    });
    if (existingAdoption) return res.status(400).json({ message: 'Anda sudah mengajukan adopsi ini.' });
    const folderName = `${fullName.trim().replace(/\s+/g, '_').toLowerCase()}_${catName.trim().replace(/\s+/g, '_').toLowerCase()}`;
    const ktpPath = req.files['documentKtp'] ? `/uploads/adoptions/${folderName}/${req.files['documentKtp'][0].filename}` : '';
    const housePaths = req.files['homePhotos'] ? req.files['homePhotos'].map(f => `/uploads/adoptions/${folderName}/${f.filename}`).join(',') : '';
    const newAdoption = await prisma.adoption.create({
      data: {
        userId: parseInt(userId), catId: parseInt(catId), fullName, phone, ktpNumber, socialMedia, idCardImage: ktpPath,
        homeStatus, isPermitted: isPermitted === 'true', stayingWith, childAges, houseImages: housePaths,
        hasExperience: hasExperience === 'true', reason, job, movingPlan, isCommitted: isCommitted === 'true', status: 'PENDING'
      }
    });
    res.status(201).json({ message: 'Sukses', data: newAdoption });
  } catch (error) { res.status(500).json({ message: 'Gagal', error: error.message }); }
});

router.get('/campaigns', async (req, res) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      where: { isApproved: true, isClosed: false },
      orderBy: { createdAt: 'asc' },
      include: { shelter: { select: { name: true, nickname: true, isShelterVerified: true } } }
    });
    res.json(campaigns);
  } catch (error) { res.status(500).json({ error: 'Gagal ambil data campaign' }); }
});

router.get('/campaigns/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (isNaN(id)) return res.status(400).json({ error: 'ID tidak valid' });
    const campaign = await prisma.campaign.findUnique({
      where: { id: parseInt(id) },
      include: {
        shelter: { select: { id: true, nickname: true, shelterAddress: true, shelterPhotos: true, isShelterVerified: true } },
        donations: { where: { status: 'COMPLETED' }, orderBy: { createdAt: 'desc' }, include: { user: { select: { name: true, photoProfile: true} } } },
        updates: { orderBy: { createdAt: 'desc' } }
      }
    });
    if (!campaign) return res.status(404).json({ error: 'Campaign tidak ditemukan' });
    res.json(campaign);
  } catch (error) { res.status(500).json({ error: 'Internal Server Error' }); }
});

router.post('/donate', authenticateToken, async (req, res) => {
  const { campaignId, amount, paymentMethod, isAnonymous, message } = req.body;
  const userId = req.user.userId;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const donation = await tx.donation.create({
        data: { amount: parseInt(amount), paymentMethod, isAnonymous: isAnonymous || false, message: message || null, status: 'COMPLETED', userId: parseInt(userId), campaignId: parseInt(campaignId), },
      });
      await tx.campaign.update({ where: { id: parseInt(campaignId) }, data: { currentAmount: { increment: parseInt(amount) } }, });
      return { donation };
    });
    res.status(201).json({ message: 'Donasi berhasil!', data: result });
  } catch (error) { res.status(500).json({ message: 'Gagal memproses donasi', error: error.message }); }
});

router.get('/clinics', async (req, res) => {
  try {
    const clinics = await prisma.user.findMany({
      where: { role: 'SHELTER', isShelterVerified: true },
      select: { id: true, nickname: true, shelterAddress: true, shelterPhotos: true, clinicOpenHours: true, isClinic: true, services: true, catsRescued: true, operatingYear: true, description: true }
    });
    res.json(clinics);
  } catch (error) { res.status(500).json({ error: 'Gagal ambil data shelter' }); }
});

// --- ROUTES LAPORAN DARURAT (SHELTER SIDE) ---

// 1. Ambil Semua Laporan PENDING (Laporan Masuk)
router.get('/reports/incoming', authenticateToken, async (req, res) => {
  try {
    const reports = await prisma.report.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, phoneNumber: true } } }
    });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: 'Gagal ambil laporan masuk' });
  }
});

// 2. Ambil Laporan yang sedang ditangani Shelter ini
router.get('/reports/handled', authenticateToken, async (req, res) => {
  try {
    const reports = await prisma.report.findMany({
      where: { rescuerId: req.user.userId },
      orderBy: { updatedAt: 'desc' },
      include: { user: { select: { name: true, phoneNumber: true } } }
    });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: 'Gagal ambil laporan ditangani' });
  }
});

// --- UPDATE ROUTE KELOLA KUCING (SHELTER SIDE) ---
// --- UPDATE ROUTE KELOLA KUCING (SHELTER SIDE) ---
router.get('/shelter/cats', authenticateToken, async (req, res) => {
  try {
    const cats = await prisma.cat.findMany({
      where: { shelterId: req.user.userId },
      include: {
        adoptions: {
          select: { status: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedCats = cats.map(cat => {
      let label = "NO_APPLICANT"; 
      
      if (!cat.isApproved) {
        label = "WAITING_ADMIN"; // Menunggu Admin
      } else if (cat.isAdopted) {
        label = "ADOPTED"; // Sudah diadopsi
      } else if (cat.adoptions.length > 0) {
        const activeProcess = cat.adoptions.some(a => 
          ['PENDING', 'INTERVIEW', 'APPROVED'].includes(a.status)
        );
        if (activeProcess) label = "PROCESS";
      }

      return {
        ...cat,
        label,
        applicantCount: cat.adoptions.length
      };
    });

    res.json(formattedCats);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data kucing shelter' });
  }
});

// 3. Update Status Laporan (Aksi Bantu / Update Progres)
router.patch('/reports/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // PENDING, VERIFIED, ON_PROCESS, RESCUED, REJECTED

    const updateData = { status };
    
    // Jika status berubah dari PENDING ke VERIFIED, set rescuerId ke shelter ini
    if (status === 'VERIFIED') {
      updateData.rescuerId = req.user.userId;
    }

    const updatedReport = await prisma.report.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    res.json({ message: 'Status berhasil diupdate', data: updatedReport });
  } catch (error) {
    res.status(500).json({ error: 'Gagal update status laporan' });
  }
});

// --- ROUTES KELOLA ADOPSI (SHELTER SIDE) ---

// 1. Ambil semua pengajuan adopsi untuk kucing milik shelter ini
router.get('/adoptions/incoming', authenticateToken, async (req, res) => {
  try {
    const adoptions = await prisma.adoption.findMany({
      where: {
        cat: { shelterId: req.user.userId }
      },
      include: {
        user: { select: { id: true, name: true, photoProfile: true, phoneNumber: true } },
        cat: { select: { id: true, name: true, images: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(adoptions);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data adopsi' });
  }
});

// 2. Update status adopsi
router.patch('/adoptions/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // PENDING, ON_PROCESS, APPROVED, REJECTED

    const updatedAdoption = await prisma.adoption.update({
      where: { id: parseInt(id) },
      data: { status }
    });

    // Opsional: Jika status APPROVED, tandai kucing sebagai isAdopted = true
    if (status === 'APPROVED') {
        await prisma.cat.update({
            where: { id: updatedAdoption.catId },
            data: { isAdopted: true }
        });
    }

    res.json({ message: 'Status adopsi diperbarui', data: updatedAdoption });
  } catch (error) {
    res.status(500).json({ error: 'Gagal update status adopsi' });
  }
});

// --- ROUTES KELOLA CAMPAIGN (SHELTER SIDE) ---

// 1. Get Campaign Milik Shelter
router.get('/shelter/campaigns', authenticateToken, async (req, res) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      where: { shelterId: req.user.userId },
      include: {
        _count: { select: { donations: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = campaigns.map(c => ({
      ...c,
      label: !c.isApproved ? "WAITING_ADMIN" : c.isClosed ? "CLOSED" : "ACTIVE"
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: 'Gagal ambil data campaign' });
  }
});

// 2. Post Campaign Baru
router.post('/campaigns', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { title, targetAmount, deadline, description } = req.body;
    const shelterId = req.user.userId;
    
    // Path folder yang sama dengan destination multer
    const folderName = title.trim().replace(/\s+/g, '_').toLowerCase();
    const imagePath = req.file ? `/uploads/campaigns/${folderName}/${req.file.filename}` : '';

    const campaign = await prisma.campaign.create({
      data: {
        title,
        targetAmount: parseInt(targetAmount),
        currentAmount: 0,
        deadline: new Date(deadline),
        description,
        imageUrl: imagePath, // Path tersimpan rapi
        shelterId: parseInt(shelterId),
        isApproved: false,
        isClosed: false
      }
    });
    res.status(201).json(campaign);
  } catch (error) {
    res.status(500).json({ error: 'Gagal buat campaign' });
  }
});

// 1. Update Campaign Utama
router.put('/campaigns/:id', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, targetAmount, deadline, description } = req.body;
    
    let updateData = {
      title,
      targetAmount: parseInt(targetAmount),
      deadline: new Date(deadline),
      description
    };

    if (req.file) {
      const folderName = title.trim().replace(/\s+/g, '_').toLowerCase();
      updateData.imageUrl = `/uploads/campaigns/${folderName}/${req.file.filename}`;
    }

    const updated = await prisma.campaign.update({
      where: { id: parseInt(id) },
      data: updateData
    });
    res.json(updated);
  } catch (error) { res.status(500).json({ error: 'Gagal update campaign' }); }
});

// 2. Tambah Kabar Terbaru (Updates)
router.post('/campaigns/:id/updates', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;
    const update = await prisma.campaignUpdate.create({
      data: {
        campaignId: parseInt(id),
        title,
        description
      }
    });
    res.status(201).json(update);
  } catch (error) { res.status(500).json({ error: 'Gagal tambah kabar' }); }
});

// --- ADMIN APPROVAL ROUTES ---

router.get('/admin/pending-cats', authenticateToken, async (req, res) => {
  const cats = await prisma.cat.findMany({ where: { isApproved: false }, include: { shelter: true } });
  res.json(cats);
});

router.get('/admin/pending-campaigns', authenticateToken, async (req, res) => {
  const campaigns = await prisma.campaign.findMany({ where: { isApproved: false }, include: { shelter: true } });
  res.json(campaigns);
});

router.patch('/admin/approve-cat/:id', authenticateToken, async (req, res) => {
  await prisma.cat.update({ where: { id: parseInt(req.params.id) }, data: { isApproved: true } });
  res.json({ message: 'Approved' });
});

router.patch('/admin/approve-campaign/:id', authenticateToken, async (req, res) => {
  await prisma.campaign.update({ where: { id: parseInt(req.params.id) }, data: { isApproved: true } });
  res.json({ message: 'Approved' });
});

// --- ADMIN RICH DATA ROUTES ---

// 1. Ambil Kucing Pending + Detail Shelter
router.get('/admin/pending-cats', authenticateToken, async (req, res) => {
  try {
    const cats = await prisma.cat.findMany({ 
      where: { isApproved: false }, 
      include: { 
        shelter: {
          select: { id: true, name: true, nickname: true, email: true, phoneNumber: true, documentKtp: true, photoProfile: true, shelterAddress: true }
        } 
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(cats);
  } catch (e) { res.status(500).json({ error: "Gagal ambil data" }); }
});

// 2. Ambil Campaign Pending + Detail Shelter
router.get('/admin/pending-campaigns', authenticateToken, async (req, res) => {
  try {
    const campaigns = await prisma.campaign.findMany({ 
      where: { isApproved: false }, 
      include: { 
        shelter: {
          select: { id: true, name: true, nickname: true, email: true, phoneNumber: true, documentKtp: true, photoProfile: true, shelterAddress: true }
        } 
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(campaigns);
  } catch (e) { res.status(500).json({ error: "Gagal ambil data" }); }
});

router.patch('/admin/approve-cat/:id', authenticateToken, async (req, res) => {
  try {
    const updatedCat = await prisma.cat.update({
      where: { id: parseInt(req.params.id) },
      data: { isApproved: true }
    });
    // Seketika isApproved: true, kucing akan muncul di GET /data/cats (User)
    // Dan label di GET /data/shelter/cats (Shelter) otomatis berubah dari WAITING_ADMIN ke NO_APPLICANT/Tersedia
    res.json({ message: 'Kucing berhasil disetujui', data: updatedCat });
  } catch (error) {
    res.status(500).json({ error: 'Gagal menyetujui kucing' });
  }
});

// Patch: Approve Campaign
router.patch('/admin/approve-campaign/:id', authenticateToken, async (req, res) => {
  try {
    const updatedCampaign = await prisma.campaign.update({
      where: { id: parseInt(req.params.id) },
      data: { isApproved: true }
    });
    res.json({ message: 'Campaign berhasil disetujui', data: updatedCampaign });
  } catch (error) {
    res.status(500).json({ error: 'Gagal menyetujui campaign' });
  }
});

// 1. Ambil Shelter yang belum diverifikasi
router.get('/admin/pending-shelters', authenticateToken, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { 
        isShelterVerified: false, 
        // Hapus filter role: 'SHELTER' jika pendaftar awal masih berstatus 'USER'
        // Cukup cek apakah mereka sudah upload KTP (menandakan mereka sedang mendaftar)
        documentKtp: { not: null } 
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (e) { 
    res.status(500).json({ error: "Gagal ambil data shelter" }); 
  }
});

// 2. Approve Shelter
// backend/routes/data.js

router.patch('/admin/approve-shelter/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { 
        isShelterVerified: true, // Beri centang verifikasi
        role: 'SHELTER'
      }
    });

    res.json({ 
      message: 'Shelter berhasil diverifikasi dan role telah diperbarui.', 
      user: updatedUser 
    });
  } catch (e) { 
    console.error(e);
    res.status(500).json({ error: "Gagal memverifikasi shelter." }); 
  }
});

// 3. Reject (Hapus) - Universal untuk Cat, Campaign, atau Shelter
router.delete('/admin/reject/:type/:id', authenticateToken, async (req, res) => {
  try {
    const { type, id } = req.params;
    const targetId = parseInt(id);

    if (type === 'cat') await prisma.cat.delete({ where: { id: targetId } });
    else if (type === 'campaign') await prisma.campaign.delete({ where: { id: targetId } });
    else if (type === 'shelter') await prisma.user.update({ 
        where: { id: targetId }, 
        data: { documentKtp: null, shelterAddress: null } // Reset data pendaftaran
    });

    res.json({ message: 'Data berhasil ditolak dan dihapus.' });
  } catch (e) { res.status(500).json({ error: "Gagal menolak data" }); }
});

module.exports = router;