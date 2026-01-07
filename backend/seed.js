const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

// --- BANK GAMBAR KUCING (UNSPLASH REAL) ---
const catImages = [
  'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba', // Putih
  'https://images.unsplash.com/photo-1573865526739-10659fec78a5', // Abu
  'https://images.unsplash.com/photo-1495360019602-e05980bf54fe', // Kitten
  'https://images.unsplash.com/photo-1533738363-b7f9aef128ce', // Oren
  'https://images.unsplash.com/photo-1529778873920-4da4926a7071', // Belang
  'https://images.unsplash.com/photo-1519052537078-e6302a4968ef', // Sedih/Jalanan
  'https://images.unsplash.com/photo-1513360371669-4adf3dd7dff8', // Main
  'https://images.unsplash.com/photo-1543852786-1cf6624b9987', // Black cat
];

// --- BANK GAMBAR CAMPAIGN ---
const campaignImages = [
  'https://images.unsplash.com/photo-1574158622682-e40e69881006', // Makan
  'https://images.unsplash.com/photo-1599443015574-be5fe8a05783', // Sakit/Vet
  'https://images.unsplash.com/photo-1548802673-380ab8ebc7b7', // Dokter
  'https://images.unsplash.com/photo-1583337130417-3346a1be7dee', // Kandang/Shelter
];

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10);

  console.log('--- CLEANING DATABASE (STRICT MODE) ---');

  // Hapus child dulu -> parent biar ga error foreign key
  await prisma.donation.deleteMany();
  await prisma.adoption.deleteMany();
  await prisma.cat.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.user.deleteMany(); // Reset User termasuk Shelter

  console.log('Database bersih total. Memasukkan data variatif...');

  /* ===============================
     1. SEED SHELTERS (USERS)
  =============================== */
  const sheltersData = [
    {
      name: 'Rumah Kucing Bandung',
      email: 'rkbandung@test.com',
      nickname: 'RK Bandung',
      shelterAddress: 'Jl. Dago Giri No. 10, Dago Atas, Bandung, Jawa Barat',
      isClinic: true,
      phoneNumber: '0811223344'
    },
    {
      name: 'Sahabat Anabul Cibadak',
      email: 'cibadak@test.com',
      nickname: 'Sahabat Anabul',
      shelterAddress: 'Jl. Jend. Sudirman No. 45, Cibadak, Bandung, Jawa Barat',
      isClinic: false,
      phoneNumber: '0877665544'
    },
    {
      name: 'Paw Rescue Jakarta',
      email: 'pawjakarta@test.com',
      nickname: 'Paw Jakarta',
      shelterAddress: 'Jl. Kemang Raya No. 12, Jakarta Selatan, DKI Jakarta',
      isClinic: true,
      phoneNumber: '081299991111'
    },
    {
      name: 'Meow Care Surabaya',
      email: 'meowcare@test.com',
      nickname: 'Meow Care',
      shelterAddress: 'Jl. A. Yani No. 88, Wonokromo, Surabaya, Jawa Timur',
      isClinic: false,
      phoneNumber: '082233445566'
    },
    {
      name: 'Cat Haven Jogja',
      email: 'cathaven@test.com',
      nickname: 'Cat Haven',
      shelterAddress: 'Jl. Kaliurang KM 5, Sleman, Yogyakarta',
      isClinic: false,
      phoneNumber: '083811223344'
    }
  ];

  const shelters = [];
  for (const s of sheltersData) {
    const shelter = await prisma.user.create({
      data: {
        ...s,
        password: hashedPassword,
        role: 'SHELTER',
        isShelterVerified: true
      }
    });
    shelters.push(shelter);
  }

  /* ===============================
     2. SEED CATS (VARIATIF)
  =============================== */
  const catTemplates = [
    { name: 'Snowy', breed: 'Anggora', personality: 'Manja,Tenang', health: 'Vaksin,Sehat' },
    { name: 'Mochi', breed: 'Domestik', personality: 'Aktif,Penurut', health: 'Steril,Vaksin' },
    { name: 'Luna', breed: 'Persia', personality: 'Pemalu,Tenang', health: 'Sehat' },
    { name: 'Oreo', breed: 'Domestik', personality: 'Aktif,Manja', health: 'Vaksin' },
    { name: 'Simba', breed: 'Maine Coon', personality: 'Berani,Penurut', health: 'Steril,Sehat' }
  ];

  for (const shelter of shelters) {
    for (let i = 0; i < catTemplates.length; i++) {
      const base = catTemplates[i];
      
      // Ambil gambar random dari array biar ga bosen
      const img1 = catImages[Math.floor(Math.random() * catImages.length)];
      const img2 = catImages[Math.floor(Math.random() * catImages.length)];
      
      await prisma.cat.create({
        data: {
          name: `${base.name}`, // Gak usah pake nama shelter biar natural
          age: Math.floor(Math.random() * 5) + 1, // Umur 1-5 tahun
          gender: Math.random() > 0.5 ? 'Jantan' : 'Betina',
          breed: base.breed,
          description: `${base.name} adalah kucing ${base.breed} yang sangat ${base.personality.split(',')[0].toLowerCase()}. Saat ini dirawat di ${shelter.nickname} dan menunggu adopter yang penyayang.`,
          images: `${img1},${img2}`, // Simpan CSV gambar
          personality: base.personality,
          health: base.health,
          shelterId: shelter.id,
          isApproved: true
        }
      });
    }
  }

  /* ===============================
     3. SEED CAMPAIGNS
  =============================== */
  const campaignTemplates = [
    { title: 'Operasi Darurat Kaki', desc: 'Butuh dana segera untuk operasi kaki kucing tertabrak.', target: 5000000 },
    { title: 'Bantuan Pakan 100 Kucing', desc: 'Stok makanan menipis untuk bulan ini.', target: 3000000 },
    { title: 'Program Steril Jalanan', desc: 'Mengurangi populasi overpopulasi di pasar.', target: 7000000 }
  ];

  for (const shelter of shelters) {
    // Tiap shelter punya 1-2 campaign random
    const randIdx = Math.floor(Math.random() * campaignTemplates.length);
    const c = campaignTemplates[randIdx];
    const campImg = campaignImages[Math.floor(Math.random() * campaignImages.length)];

    await prisma.campaign.create({
      data: {
        title: c.title,
        description: `${c.desc} Lokasi: ${shelter.shelterAddress}. Mohon bantuannya teman-teman.`,
        targetAmount: c.target,
        currentAmount: Math.floor(Math.random() * (c.target / 2)), // Udah keisi dikit
        imageUrl: campImg,
        shelterId: shelter.id,
        isApproved: true
      }
    });
  }

  console.log('SEEDING SUKSES TOTAL! 🐾🔥 Data Fresh & Variatif!');
}

main()
  .catch((e) => {
    console.error('SEEDING GAGAL:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });