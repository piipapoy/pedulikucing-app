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

// 1. GET ALL ROOMS
router.get('/rooms', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    try {
        const rooms = await prisma.chatRoom.findMany({
            where: { OR: [{ userOneId: userId }, { userTwoId: userId }] },
            include: {
                userOne: { select: { id: true, name: true, photoProfile: true, role: true } },
                userTwo: { select: { id: true, name: true, photoProfile: true, role: true } },
                messages: { orderBy: { createdAt: 'desc' }, take: 1 }
            },
            orderBy: { updatedAt: 'desc' }
        });
        res.json(rooms);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// 2. INIT ROOM
router.post('/room/init', authenticateToken, async (req, res) => {
    const userOneId = req.user.userId;
    let { userTwoId, reportId } = req.body;
    try {
        if (!userTwoId && reportId) {
            const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
            if (!admin) return res.status(404).json({ message: 'Admin belum tersedia' });
            userTwoId = admin.id;
        }
        let room = await prisma.chatRoom.findFirst({
            where: { OR: [{ userOneId, userTwoId }, { userOneId: userTwoId, userTwoId: userOneId }] }
        });
        if (!room) {
          room = await prisma.chatRoom.create({ data: { userOneId, userTwoId } });
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
        await prisma.chatRoom.update({
            where: { id: parseInt(roomId) },
            data: { updatedAt: new Date(), lastMessage: content }
        });
        res.json(message);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// 4. GET MESSAGES
router.get('/messages/:roomId', authenticateToken, async (req, res) => {
    const { roomId } = req.params;
    try {
        const messages = await prisma.message.findMany({
            where: { roomId: parseInt(roomId) },
            include: { sender: { select: { id: true, name: true, photoProfile: true } } },
            orderBy: { createdAt: 'asc' }
        });
        await prisma.message.updateMany({
            where: { roomId: parseInt(roomId), NOT: { senderId: req.user.userId } },
            data: { isRead: true }
        });
        res.json(messages);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// 5. GET CONTEXT (SINKRON LABEL)
// --- UPDATE ENDPOINT CONTEXT DI CHAT.JS ---

// --- UPDATE ENDPOINT CONTEXT DI CHAT.JS ---

router.get('/context/:roomId', authenticateToken, async (req, res) => {
    const { roomId } = req.params;
    const myId = req.user.userId;
    try {
        const room = await prisma.chatRoom.findUnique({
            where: { id: parseInt(roomId) },
            select: { userOneId: true, userTwoId: true }
        });
        if (!room) return res.status(404).json({ message: 'Room tidak ditemukan' });
        const opponentId = room.userOneId === myId ? room.userTwoId : room.userOneId;

        // 1. Ambil Adopsi yang aktif
        // FIX: Label tetap muncul saat PENDING, INTERVIEW, dan APPROVED
        const adoptions = await prisma.adoption.findMany({
            where: {
                OR: [
                    { userId: myId, cat: { shelterId: opponentId } },
                    { userId: opponentId, cat: { shelterId: myId } }
                ],
                // Label HILANG HANYA jika status sudah final (Selesai, Tolak, atau Batal)
                NOT: { status: { in: ['REJECTED', 'COMPLETED', 'CANCELLED'] } } 
            },
            include: { cat: true }
        });

        // 2. Ambil Laporan yang AKTIF
        const reports = await prisma.report.findMany({
            where: {
                OR: [
                    { userId: myId, rescuerId: opponentId },
                    { userId: opponentId, rescuerId: myId }
                ],
                rescuerId: { not: null }, 
                // Label laporan hilang saat sudah RESCUED atau REJECTED
                NOT: { status: { in: ['REJECTED', 'RESCUED'] } }
            }
        });

        const contextData = [
            ...adoptions.map(a => ({
                id: a.id,
                type: 'adoption',
                title: `Adopsi ${a.cat.name}`,
                status: a.status,
                canManage: a.cat.shelterId === myId 
            })),
            ...reports.map(r => ({
                id: r.id,
                type: 'report',
                title: `Laporan: ${r.conditionTags.split(',')[0]}`,
                status: r.status,
                canManage: r.rescuerId === myId
            }))
        ];
        res.json(contextData);
    } catch (error) { 
        console.error("Context Error Detail:", error);
        res.status(500).json({ error: "Gagal memuat label" }); 
    }
});

// 6. UPDATE STATUS (SHELTER)
router.patch('/context/update-status', authenticateToken, async (req, res) => {
    const { id, type, newStatus } = req.body;
    try {
        if (type === 'adoption') {
            await prisma.adoption.update({ where: { id: parseInt(id) }, data: { status: newStatus } });
        } else {
            await prisma.report.update({ where: { id: parseInt(id) }, data: { status: newStatus } });
        }
        res.json({ message: 'Ok' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;