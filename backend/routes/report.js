const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');

// --- MULTER STORAGE ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const date = new Date().toISOString().split('T')[0];
        const userFolder = req.user ? `user_${req.user.userId}` : 'guest';
        const finalPath = path.join('uploads', 'reports', `${userFolder}_${date}`);

        if (!fs.existsSync(finalPath)) {
            fs.mkdirSync(finalPath, { recursive: true });
        }
        cb(null, finalPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `report-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 20 * 1024 * 1024 } // Max 20MB per file
});

const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return next();
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (!err) req.user = user;
        next();
    });
};

router.post('/submit', optionalAuth, upload.fields([
    { name: 'image', maxCount: 5 }, // Terima sampai 5 foto
    { name: 'video', maxCount: 1 }
]), async (req, res) => {
    try {
        const { conditionTags, description, address, latitude, longitude, reporterName, reporterPhone } = req.body;
        const userId = req.user ? req.user.userId : null;

        // Limit harian
        if (userId) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const countToday = await prisma.report.count({
                where: { userId: userId, createdAt: { gte: today } }
            });
            if (countToday >= 3) return res.status(429).json({ message: 'Limit harian (3 laporan) tercapai.' });
        }

        // Simpan path gambar sebagai string CSV sesuai skema DB (imageUrl String)
        // Note: Di skema lu imageUrl itu String, bukan Json. Kita join paken koma.
        if (!req.files['image'] || req.files['image'].length < 3) {
            return res.status(400).json({ message: 'Minimal unggah 3 foto.' });
        }

        const imagesArray = req.files['image'].map(f => `/${f.path.replace(/\\/g, '/')}`);
        const imageUrls = imagesArray.join(','); // Simpan sbg: "/uploads/a.jpg,/uploads/b.jpg"
        
        const videoUrl = req.files['video'] ? `/${req.files['video'][0].path.replace(/\\/g, '/')}` : null;

        const newReport = await prisma.report.create({
            data: {
                userId,
                reporterName: reporterName || 'User Terdaftar',
                reporterPhone: reporterPhone,
                conditionTags,
                description,
                address,
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                imageUrl: imageUrls, // String CSV
                videoUrl,
                status: 'PENDING'
            }
        });

        res.status(201).json({ message: 'Laporan berhasil.', report: newReport });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Gagal.', error: error.message });
    }
});

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'Token diperlukan' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Token tidak valid' });
        req.user = user;
        next();
    });
};

// Shelter/Admin klik tombol "Bantu" atau "Respon"
router.post('/accept/:reportId', authenticateToken, async (req, res) => {
    const { reportId } = req.params;
    const rescuerId = req.user.userId; // ID Admin/Shelter

    try {
        const report = await prisma.report.findUnique({ where: { id: parseInt(reportId) } });
        
        if (report.status !== 'PENDING') {
            return res.status(400).json({ message: 'Laporan ini sudah ditangani orang lain.' });
        }

        // 1. Update Laporan
        await prisma.report.update({
            where: { id: parseInt(reportId) },
            data: { status: 'ON_PROCESS', rescuerId }
        });

        // 2. Buat Room (Tanpa contextId permanen agar tidak redundan)
        let room = await prisma.chatRoom.findFirst({
            where: {
                OR: [
                    { userOneId: rescuerId, userTwoId: report.userId },
                    { userOneId: report.userId, userTwoId: rescuerId }
                ]
            }
        });

        if (!room) {
            room = await prisma.chatRoom.create({
                data: { userOneId: rescuerId, userTwoId: report.userId }
            });
        }

        // 3. Pesan otomatis agar User Biasa tau siapa yang hubungin
        await prisma.message.create({
            data: {
                roomId: room.id,
                senderId: rescuerId,
                content: `Halo, saya telah menerima laporan Anda mengenai "${report.conditionTags}". Saya akan segera menuju lokasi atau membantu koordinasi.`
            }
        });

        res.json({ roomId: room.id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;