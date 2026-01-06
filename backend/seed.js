const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Mulai Seeding Data Lengkap...');

  // 1. Bersihkan Data
  await prisma.message.deleteMany();
  await prisma.donation.deleteMany();
  await prisma.adoption.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.cat.deleteMany();
  await prisma.report.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('123', 10);

  // 2. USER
  await prisma.user.create({
    data: { name: 'Budi Adopter', email: 'user@peduli.kucing', password: passwordHash, role: 'USER' },
  });

  // 3. ADMIN
  await prisma.user.create({
    data: { name: 'Super Admin', email: 'admin@peduli.kucing', password: passwordHash, role: 'ADMIN' },
  });

  // 4. SHELTER (Sekaligus KLINIK)
  const shelter = await prisma.user.create({
    data: {
      name: 'Rumah Kucing Bandung',
      email: 'shelter@peduli.kucing',
      password: passwordHash,
      role: 'SHELTER',
      shelterAddress: 'Jl. Dago Atas No. 99',
      isShelterVerified: true,
      isClinic: true, // <--- DIA PUNYA KLINIK
      clinicOpenHours: '08:00 - 21:00 WIB',
    },
  });

  // 5. KUCING (Data Dummy)
  await prisma.cat.createMany({
    data: [
      {
        name: 'Mochi',
        age: 1,
        gender: 'Jantan',
        breed: 'Domestik',
        description: 'Mochi kucing oren yang sangat aktif dan suka bermain bola.',
        imageUrl: 'https://images.unsplash.com/photo-1574158622682-e40e69881006', // Gambar Kucing Asli
        isApproved: true,
        shelterId: shelter.id,
      },
      {
        name: 'Snowy',
        age: 2,
        gender: 'Betina',
        breed: 'Anggora',
        description: 'Snowy sangat kalem, suka tidur di pangkuan, butuh adopter penyabar.',
        imageUrl: 'https://images.unsplash.com/photo-1529778873920-4da4926a7071',
        isApproved: true,
        shelterId: shelter.id,
      },
      {
        name: 'Bella',
        age: 3,
        gender: 'Betina',
        breed: 'Mix',
        description: 'Bella diselamatkan dari jalanan, sekarang sudah sehat dan gembul.',
        imageUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba',
        isApproved: true,
        shelterId: shelter.id,
      },
    ],
  });

  // 6. CAMPAIGN DONASI
  await prisma.campaign.createMany({
    data: [
      {
        title: 'Bantu Mochi Operasi Kaki',
        description: 'Mochi ditemukan dengan kaki patah. Butuh biaya operasi segera.',
        targetAmount: 5000000,
        currentAmount: 1250000,
        imageUrl: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5',
        isApproved: true,
        shelterId: shelter.id,
      },
      {
        title: 'Makanan untuk 50 Kucing Jalanan',
        description: 'Stok makanan di shelter menipis. Bantu kami memberi makan mereka.',
        targetAmount: 3000000,
        currentAmount: 500000,
        imageUrl: 'https://images.unsplash.com/photo-1596854703056-bf6005719511',
        isApproved: true,
        shelterId: shelter.id,
      },
    ],
  });

  console.log('✅ Seeding Selesai: Shelter punya Kucing, Klinik, & Donasi.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });