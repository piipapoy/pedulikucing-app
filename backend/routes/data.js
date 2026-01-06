const express = require('express');
const prisma = require('../prismaClient');
const router = express.Router();

// GET: Kucing Terbaru (Limit 5)
router.get('/cats', async (req, res) => {
  try {
    const cats = await prisma.cat.findMany({
      where: { isApproved: true, isAdopted: false },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { shelter: { select: { name: true, shelterAddress: true } } }
    });
    res.json(cats);
  } catch (error) {
    res.status(500).json({ error: 'Gagal ambil data kucing' });
  }
});

// GET: Campaign Terbaru (Limit 5)
router.get('/campaigns', async (req, res) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      where: { isApproved: true, isClosed: false },
      take: 5,
      orderBy: { createdAt: 'desc' },
    });
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ error: 'Gagal ambil data campaign' });
  }
});

module.exports = router;