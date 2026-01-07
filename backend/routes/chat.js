const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const jwt = require('jsonwebtoken');

// Middleware Auth
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

// 1. GET ALL ROOMS (Inbox)
router.get('/rooms', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    try {
        const rooms = await prisma.chatRoom.findMany({
            where: {
                OR: [
                    { userOneId: userId },
                    { userTwoId: userId }
                ]
            },
            include: {
                userOne: { select: { id: true, name: true, photoProfile: true } },
                userTwo: { select: { id: true, name: true, photoProfile: true } },
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            },
            orderBy: { updatedAt: 'desc' }
        });
        res.json(rooms);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. CREATE/GET ROOM (Mulai Chat dari Adopsi/Lapor)
router.post('/room/init', authenticateToken, async (req, res) => {
    const userOneId = req.user.userId;
    let { userTwoId, reportId } = req.body; // Kita fokus cari lawannya siapa

    try {
        // Cari Admin otomatis kalau ini urusan laporan
        if (!userTwoId && reportId) {
            const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
            userTwoId = admin.id;
        }

        // CARI ROOM BERDASARKAN USER SAJA (Biar gak duplikat room)
        let room = await prisma.chatRoom.findFirst({
            where: {
                OR: [
                    { userOneId, userTwoId },
                    { userOneId: userTwoId, userTwoId: userOneId }
                ]
            }
        });

        if (!room) {
          room = await prisma.chatRoom.create({
            data: { userOneId, userTwoId }
          });
        }
        res.status(201).json(room);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// 3. SEND MESSAGE
router.post('/message', authenticateToken, async (req, res) => {
    const { roomId, content } = req.body;
    const senderId = req.user.userId;
    try {
        const message = await prisma.message.create({
            data: { roomId: parseInt(roomId), senderId, content }
        });
        // Update timestamp room
        await prisma.chatRoom.update({
            where: { id: parseInt(roomId) },
            data: { updatedAt: new Date(), lastMessage: content }
        });
        res.json(message);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. GET MESSAGES IN ROOM
router.get('/messages/:roomId', authenticateToken, async (req, res) => {
    const { roomId } = req.params;
    try {
        const messages = await prisma.message.findMany({
            where: { roomId: parseInt(roomId) },
            include: {
                sender: { select: { id: true, name: true, photoProfile: true } }
            },
            orderBy: { createdAt: 'asc' } // Urutkan dari yang lama ke baru
        });
        
        // Tandai semua pesan di room ini sebagai sudah dibaca (isRead: true)
        // kecuali yang dikirim oleh user itu sendiri
        await prisma.message.updateMany({
            where: { roomId: parseInt(roomId), NOT: { senderId: req.user.userId } },
            data: { isRead: true }
        });

        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 5. GET CHAT CONTEXT (Urusan Adopsi & Laporan di antara 2 User)
router.get('/context/:roomId', authenticateToken, async (req, res) => {
    const { roomId } = req.params;
    const myId = req.user.userId;

    try {
        // 1. Cari tahu siapa lawan bicaranya di room ini
        const room = await prisma.chatRoom.findUnique({
            where: { id: parseInt(roomId) },
            select: { userOneId: true, userTwoId: true }
        });

        if (!room) return res.status(404).json({ message: 'Room tidak ditemukan' });

        const opponentId = room.userOneId === myId ? room.userTwoId : room.userOneId;

        // 2. Cari Adopsi (di mana salah satu adalah pengaju dan satu lagi shelter-nya)
        // Hubungkan lewat tabel Cat untuk dapet shelterId
        const adoptions = await prisma.adoption.findMany({
            where: {
                OR: [
                    { userId: myId, cat: { shelterId: opponentId } },
                    { userId: opponentId, cat: { shelterId: myId } }
                ]
            },
            include: { cat: true },
            orderBy: { createdAt: 'desc' }
        });

        // 3. Cari Laporan (di mana salah satu adalah pelapor dan satu lagi adalah ADMIN)
        const reports = await prisma.report.findMany({
            where: {
                OR: [
                    { userId: myId }, // Jika saya pelapor, lawan bicara diasumsikan penangan (Admin)
                    { userId: opponentId } // Jika lawan pelapor, saya diasumsikan penangan
                ]
            },
            orderBy: { createdAt: 'desc' }
        });

        // 4. Format data buat Frontend (Mapping data agar seragam)
        const contextData = [
            ...adoptions.map(a => ({
                id: a.id,
                type: 'adoption',
                title: a.cat.name,
                statusLabel: a.status === 'PENDING' ? 'Menunggu Review' : 'Dalam Proses',
                status: a.status
            })),
            ...reports.map(r => ({
                id: r.id,
                type: 'report',
                title: r.conditionTags.split(',')[0], // Ambil tag pertama sbg judul
                statusLabel: r.status === 'PENDING' ? 'Laporan Baru' : 'Sedang Ditangani',
                status: r.status
            }))
        ];

        res.json(contextData);
    } catch (error) {
        console.error("CONTEXT_ERROR:", error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;