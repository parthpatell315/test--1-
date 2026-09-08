const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const password = process.env.ADMIN_PASSWORD || 'Trrabb@2026';
  const hash = await bcrypt.hash(password, 10);

  const admin1 = await prisma.admin.upsert({
    where: { email: 'admin@trrabb.com' },
    update: {
      password: hash,
      role: 'superadmin',
      isActive: true
    },
    create: {
      email: 'admin@trrabb.com',
      name: 'Trrabb Admin',
      password: hash,
      role: 'superadmin',
      isActive: true,
      tenantId: 'default'
    }
  });

  console.log(`✅ Super Admin Account Ready: ${admin1.email}`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
