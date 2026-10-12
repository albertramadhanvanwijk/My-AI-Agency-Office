import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();

async function main() {
  const users = await db.user.findMany({
    where: { email: { in: ['owner@myagency.local', 'client@demo.local'] } },
    select: { email: true, passwordHash: true, role: true }
  });
  console.log('Users:', JSON.stringify(users, null, 2));
  for (const u of users) {
    const match123 = await bcrypt.compare('password123', u.passwordHash || '');
    const matchOwner123 = await bcrypt.compare('owner123', u.passwordHash || '');
    const matchClient123 = await bcrypt.compare('client123', u.passwordHash || '');
    console.log(u.email, 'password123:', match123, 'owner123:', matchOwner123, 'client123:', matchClient123);
  }
}

main().finally(() => db.$disconnect());