const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

// --- GAMBAR KUCING (Variatif) ---
const catImagesPool = [
  'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba', // Putih
  'https://images.unsplash.com/photo-1573865526739-10659fec78a5', // Abu
  'https://images.unsplash.com/photo-1495360019602-e05980bf54fe', // Kitten
  'https://images.unsplash.com/photo-1533738363-b7f9aef128ce', // Oren
  'https://images.unsplash.com/photo-1529778873920-4da4926a7071', // Belang
  'https://images.unsplash.com/photo-1513360371669-4adf3dd7dff8', // Main
  'https://images.unsplash.com/photo-1543852786-1cf6624b9987', // Hitam
];

// --- GAMBAR SHELTER ---
const shelterPhotosPool = [
  'https://images.unsplash.com/photo-1583337130417-3346a1be7dee', // Interior
  'https://images.unsplash.com/photo-1519052537078-e6302a4968ef', // Ruang Rawat
  'https://images.unsplash.com/photo-1505623776320-7edecf5f0771', // Halaman
  'https://images.unsplash.com/photo-1599443015574-be5fe8a05783', // Grooming
];

// --- GAMBAR CAMPAIGN ---
const campaignImagesPool = [
  'https://images.unsplash.com/photo-1574158622682-e40e69881006', // Makanan
  'https://images.unsplash.com/photo-1606425271394-c3ca9aa1fc06', // Operasi
  'https://images.unsplash.com/photo-1623387641168-d9803ddd3f35', // Kandang
];

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10);

  console.log('--- 🧹 MEMBERSIHKAN DATABASE... ---');
  // Hapus dari child ke parent biar ga error relation
  await prisma.donation.deleteMany();
  await prisma.adoption.deleteMany();
  await prisma.cat.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.user.deleteMany();

  console.log('--- 🏥 MEMASUKKAN DATA SHELTER & KLINIK... ---');

  /* =========================================
     1. SEED USER (SHELTER MIXED TYPES)
  ========================================= */
  const sheltersData = [
    // 1. KLINIK LENGKAP (isClinic: TRUE)
    { 
      name: 'Rumah Kucing Bandung', 
      email: 'bdg@test.com', 
      nick: 'RK Bandung', 
      addr: 'Jl. Dago Giri No. 10, Coblong, Kota Bandung, Jawa Barat', 
      desc: 'Klinik & Shelter terpadu. Kami memiliki fasilitas rawat inap, isolasi, dan dokter hewan berjaga 24 jam.',
      year: 2018,
      rescued: 342,
      services: 'Vaksin,Steril,Rawat Inap,UGD 24 Jam,USG',
      isClinic: true,
      openHours: '08:00 - 21:00 (Setiap Hari)'
    },
    // 2. KLINIK MODERN (isClinic: TRUE)
    { 
      name: 'Paw Jakarta Selatan', 
      email: 'jkt@test.com', 
      nick: 'Paw Jaksel', 
      addr: 'Jl. Kemang Raya No. 88, Mampang, Jakarta Selatan, DKI Jakarta', 
      desc: 'Klinik hewan modern yang fokus pada kesejahteraan anabul. Profit klinik digunakan untuk subsidi steril kucing jalanan.',
      year: 2020,
      rescued: 128,
      services: 'Grooming,Konsultasi,Hotel Kucing,Dental Care',
      isClinic: true,
      openHours: '09:00 - 17:00 (Senin-Sabtu)'
    },
    // 3. MURNI SHELTER / PENAMPUNGAN (isClinic: FALSE) -> TEST UI DISINI
    { 
      name: 'Meow Surabaya Rescue', 
      email: 'sby@test.com', 
      nick: 'Meow SBY', 
      addr: 'Jl. Darmo No. 5, Wonokromo, Kota Surabaya, Jawa Timur', 
      desc: 'Rumah singgah bagi kucing terlantar dan difabel. Kami fokus pada pemulihan trauma dan pencarian adopter.',
      year: 2015,
      rescued: 890,
      services: 'Adopsi,Edukasi,Rescue Darurat', // Service non-medis
      isClinic: false, // <--- PENTING: BUKAN KLINIK
      openHours: '10:00 - 16:00 (Kunjungan Saja)'
    },
    // 4. MURNI SHELTER KECIL (isClinic: FALSE)
    {
      name: 'Omah Kucing Jogja',
      email: 'jgj@test.com',
      nick: 'Omah Jogja',
      addr: 'Jl. Malioboro No. 12, Gedong Tengen, Kota Yogyakarta, DIY',
      desc: 'Shelter rumahan sederhana. Kami merawat kucing pasar dan kucing yang dibuang.',
      year: 2021,
      rescued: 45,
      services: 'Adopsi,Street Feeding',
      isClinic: false, // <--- PENTING: BUKAN KLINIK
      openHours: 'Hubungi via Chat'
    }
  ];

  const shelters = [];
  
  for (let i = 0; i < sheltersData.length; i++) {
    const s = sheltersData[i];
    // Assign foto shelter secara urut/random
    const shelterPhoto = shelterPhotosPool[i % shelterPhotosPool.length];

    const user = await prisma.user.create({
      data: {
        name: s.name,
        email: s.email,
        password: hashedPassword,
        nickname: s.nick,
        shelterAddress: s.addr,
        role: 'SHELTER',
        isShelterVerified: true,
        phoneNumber: '08123456789',
        isClinic: s.isClinic,
        clinicOpenHours: s.openHours,
        description: s.desc,
        operatingYear: s.year,
        catsRescued: s.rescued,
        services: s.services,
        shelterPhotos: shelterPhoto
      }
    });
    shelters.push(user);
  }

  /* =========================================
     2. SEED KUCING (2-3 Kucing per Shelter)
  ========================================= */
  const catNames = ['Mochi', 'Luna', 'Simba', 'Oreo', 'Bella', 'Garfield', 'Kuro', 'Molly'];
  const breeds = ['Domestik', 'Anggora', 'Persia', 'Maine Coon', 'British Shorthair'];
  
  for (const shelter of shelters) {
    // Tiap shelter dapet 2 kucing random
    for (let k = 0; k < 2; k++) {
      const name = catNames[Math.floor(Math.random() * catNames.length)];
      const breed = breeds[Math.floor(Math.random() * breeds.length)];
      const img = catImagesPool[Math.floor(Math.random() * catImagesPool.length)]; // Ambil random dari pool

      await prisma.cat.create({
        data: {
          name: `${name} (${shelter.nickname})`, // Kasih penanda biar tau punya siapa
          age: Math.floor(Math.random() * 5) + 1,
          gender: Math.random() > 0.5 ? 'Jantan' : 'Betina',
          breed: breed,
          description: `Halo, aku ${name}. Aku sekarang dirawat di ${shelter.nickname}. Aku sehat dan siap diadopsi!`,
          images: img,
          personality: 'Manja,Aktif',
          health: 'Vaksin,Sehat',
          shelterId: shelter.id,
          isApproved: true,
          isAdopted: false
        }
      });
    }
  }

  /* =========================================
     3. SEED CAMPAIGN (1 Campaign per Shelter)
  ========================================= */
  const campaignTitles = ['Bantuan Pakan', 'Operasi Kaki', 'Steril Subsidi', 'Renovasi Atap Shelter'];

  for (let i = 0; i < shelters.length; i++) {
    const shelter = shelters[i];
    // Cuma shelter index 0, 1, 2 yang punya campaign (biar ada yang kosong buat tes empty state)
    if (i < 3) {
        await prisma.campaign.create({
            data: {
            title: `${campaignTitles[i]} - ${shelter.nickname}`,
            description: `Kami membutuhkan bantuan teman-teman untuk program kebaikan di ${shelter.nickname}.`,
            targetAmount: 5000000 + (i * 1000000),
            currentAmount: 1500000 + (i * 500000),
            imageUrl: campaignImagesPool[i % campaignImagesPool.length],
            shelterId: shelter.id,
            isApproved: true
            }
        });
    }
  }

  console.log('✅ SEEDING SELESAI! Data sudah siap untuk simulasi.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });