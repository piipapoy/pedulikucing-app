const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10);

  console.log('--- CLEANING DATABASE (STRICT MODE) ---');

  // Hapus child dulu → parent
  await prisma.donation.deleteMany();
  await prisma.adoption.deleteMany();
  await prisma.cat.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.user.deleteMany();

  console.log('Database bersih total. Memasukkan data baru...');

  /* ===============================
     1. SEED USERS (SHELTERS)
  =============================== */
  const sheltersData = [
    {
      name: 'Rumah Kucing Bandung',
      email: 'rkbandung@test.com',
      nickname: 'RK Bandung',
      shelterAddress: 'Dago Atas, Bandung',
      isClinic: true,
      phoneNumber: '0811223344'
    },
    {
      name: 'Sahabat Anabul Cibadak',
      email: 'cibadak@test.com',
      nickname: 'Sahabat Anabul',
      shelterAddress: 'Cibadak, Bandung',
      isClinic: false,
      phoneNumber: '0877665544'
    },
    {
      name: 'Paw Rescue Jakarta',
      email: 'pawjakarta@test.com',
      nickname: 'Paw Jakarta',
      shelterAddress: 'Kemang, Jakarta',
      isClinic: true,
      phoneNumber: '081299991111'
    },
    {
      name: 'Meow Care Surabaya',
      email: 'meowcare@test.com',
      nickname: 'Meow Care',
      shelterAddress: 'Wonokromo, Surabaya',
      isClinic: false,
      phoneNumber: '082233445566'
    },
    {
      name: 'Cat Haven Jogja',
      email: 'cathaven@test.com',
      nickname: 'Cat Haven',
      shelterAddress: 'Sleman, Yogyakarta',
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
     2. SEED CATS (BANYAK)
  =============================== */
  const catTemplates = [
    {
      name: 'Snowy',
      breed: 'Anggora',
      personality: 'Manja,Tenang',
      health: 'Vaksin,Sehat'
    },
    {
      name: 'Mochi',
      breed: 'Domestik',
      personality: 'Aktif,Penurut',
      health: 'Steril,Vaksin'
    },
    {
      name: 'Luna',
      breed: 'Persia',
      personality: 'Pemalu,Tenang',
      health: 'Sehat'
    },
    {
      name: 'Oreo',
      breed: 'Domestik',
      personality: 'Aktif,Manja',
      health: 'Vaksin'
    },
    {
      name: 'Simba',
      breed: 'Maine Coon',
      personality: 'Berani,Penurut',
      health: 'Steril,Sehat'
    }
  ];

  for (const shelter of shelters) {
    for (let i = 0; i < catTemplates.length; i++) {
      const base = catTemplates[i];
      await prisma.cat.create({
        data: {
          name: `${base.name} ${shelter.nickname}`,
          age: Math.floor(Math.random() * 5),
          gender: Math.random() > 0.5 ? 'Jantan' : 'Betina',
          breed: base.breed,
          description: `${base.name} adalah kucing lucu dari ${shelter.nickname}.`,
          images:
            'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba,https://images.unsplash.com/photo-1599771957573-68c6b99c7305',
          personality: base.personality,
          health: base.health,
          shelterId: shelter.id,
          isApproved: true
        }
      });
    }
  }

  /* ===============================
     3. SEED DONATION CAMPAIGNS
  =============================== */
  const campaignTemplates = [
    {
      title: 'Operasi Darurat Kucing',
      description: 'Penggalangan dana untuk operasi darurat.',
      targetAmount: 3000000
    },
    {
      title: 'Pakan Bulanan Shelter',
      description: 'Bantuan pakan untuk kucing terlantar.',
      targetAmount: 5000000
    },
    {
      title: 'Sterilisasi Massal',
      description: 'Program sterilisasi untuk kucing jalanan.',
      targetAmount: 7000000
    }
  ];

  for (const shelter of shelters) {
    for (const c of campaignTemplates) {
      await prisma.campaign.create({
        data: {
          title: `${c.title} - ${shelter.nickname}`,
          description: c.description,
          targetAmount: c.targetAmount,
          currentAmount: Math.floor(Math.random() * c.targetAmount),
          imageUrl: 'https://images.unsplash.com/photo-1533733508377-ce873a6745b4',
          shelterId: shelter.id,
          isApproved: true
        }
      });
    }
  }

  console.log('SEEDING SUKSES TOTAL! 🐾🔥');
}

main()
  .catch((e) => {
    console.error('SEEDING GAGAL:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });