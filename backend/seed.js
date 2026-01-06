const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Mulai Seeding Data Terintegrasi...');

  // 1. Bersihkan Data (Urutan harus benar karena relasi foreign key)
  await prisma.message.deleteMany();
  await prisma.donation.deleteMany();
  await prisma.adoption.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.cat.deleteMany();
  await prisma.report.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('123', 10);

  // 2. CREATE MASTER DATA (Shelter & Admin)
  const shelter = await prisma.user.create({
    data: {
      name: 'Rumah Kucing Bandung',
      email: 'shelter@peduli.kucing',
      password: passwordHash,
      role: 'SHELTER',
      shelterAddress: 'Jl. Dago Atas No. 99',
      isShelterVerified: true,
      isClinic: true,
      clinicOpenHours: '08:00 - 21:00 WIB',
    },
  });

  await prisma.user.create({
    data: { name: 'Super Admin', email: 'admin@peduli.kucing', password: passwordHash, role: 'ADMIN' },
  });

  // 3. CREATE USER UTAMA (Raffa)
  const raffa = await prisma.user.create({
    data: { 
      name: 'M. Raffa Mizanul Insan', 
      email: 'rappepu@upi.edu', 
      password: passwordHash, 
      role: 'USER',
      nickname: 'Raffa',
      phoneNumber: '085779716750'
    },
  });

  // 4. CREATE KUCING
  const mochi = await prisma.cat.create({
    data: {
      name: 'Mochi',
      age: 1, gender: 'Jantan', breed: 'Domestik',
      description: 'Mochi kucing oren yang sangat aktif.',
      imageUrl: 'https://images.unsplash.com/photo-1574158622682-e40e69881006',
      isApproved: true, shelterId: shelter.id,
    }
  });

  const snowy = await prisma.cat.create({
    data: {
      name: 'Snowy',
      age: 2, gender: 'Betina', breed: 'Anggora',
      description: 'Snowy sangat kalem.',
      imageUrl: 'https://images.unsplash.com/photo-1529778873920-4da4926a7071',
      isApproved: true, shelterId: shelter.id,
    }
  });

  // 5. CREATE CAMPAIGN
  const campaignKaki = await prisma.campaign.create({
    data: {
      title: 'Bantu Mochi Operasi Kaki',
      description: 'Butuh biaya operasi segera.',
      targetAmount: 5000000,
      currentAmount: 1250000,
      imageUrl: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5',
      isApproved: true, shelterId: shelter.id,
    }
  });

  // --- START SEEDING RIWAYAT RAFFA (SYNCED) ---

  // A. Riwayat Laporan (Darurat)
  await prisma.report.create({
    data: {
      userId: raffa.id,
      conditionTags: "Luka Terbuka, Lemas",
      description: "Kucing tertabrak di depan gerbang UPI, butuh rescue segera.",
      imageUrl: "https://images.unsplash.com/photo-1548546738-8509cb246ed3",
      address: "Jl. Setiabudi No. 229, Bandung",
      latitude: -6.8606, longitude: 107.5902,
      status: "ON_PROCESS"
    }
  });

  // B. Riwayat Adopsi (Raffa mengajukan adopsi Snowy)
  await prisma.adoption.create({
    data: {
      userId: raffa.id,
      catId: snowy.id, // Terkoneksi ke Snowy
      address: "Kost Raffa, Gegerkalong",
      phone: raffa.phoneNumber,
      reason: "Ingin memberikan rumah yang layak untuk Snowy.",
      status: "PENDING"
    }
  });

  // C. Riwayat Donasi (Raffa donasi ke campaign Mochi)
  await prisma.donation.create({
    data: {
      amount: 150000,
      message: "Semoga Mochi cepat sembuh!",
      userId: raffa.id,
      campaignId: campaignKaki.id, // Terkoneksi ke Campaign Mochi
      status: "SUCCESS"
    }
  });

  console.log('✅ Seeding Selesai: Semua riwayat Raffa tersinkronisasi dengan data Master.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });