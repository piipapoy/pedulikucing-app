const express = require('express');
const prisma = require('../prismaClient');
const router = express.Router();

// GET: Semua Kucing yang Approved (Limit dihapus agar Pagination Frontend jalan)
router.get('/cats', async (req, res) => {
  try {
    const cats = await prisma.cat.findMany({
      where: { isApproved: true, isAdopted: false },
      // take: 5, <-- HAPUS INI BOS!
      orderBy: { createdAt: 'desc' },
      include: { shelter: { select: { name: true, shelterAddress: true } } }
    });
    res.json(cats);
  } catch (error) {
    res.status(500).json({ error: 'Gagal ambil data kucing' });
  }
});

// GET: Semua Campaign yang Aktif
router.get('/campaigns', async (req, res) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      where: { isApproved: true, isClosed: false },
      // take: 5, <-- HAPUS JUGA DI SINI
      orderBy: { createdAt: 'desc' },
    });
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ error: 'Gagal ambil data campaign' });
  }
});

module.exports = router;