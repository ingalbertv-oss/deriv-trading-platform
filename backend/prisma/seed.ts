import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

async function main() {
  console.log('🌱 Seeding database...');

  // Create test user
  const user = await prisma.user.upsert({
    where: { email: 'demo@deriv-platform.local' },
    update: {},
    create: {
      name: 'Demo User',
      email: 'demo@deriv-platform.local',
      passwordHash: hashPassword('Demo1234!'),
    },
  });

  console.log(`✅ User created: ${user.email}`);

  // Create default watchlist
  const watchlist = await prisma.watchlist.upsert({
    where: {
      id: 'default-watchlist',
    },
    update: {},
    create: {
      id: 'default-watchlist',
      userId: user.id,
      name: 'My Watchlist',
      isDefault: true,
    },
  });

  console.log(`✅ Watchlist created: ${watchlist.name}`);

  // Add some popular symbols to watchlist
  const symbols = ['R_100', 'R_50', 'R_75', 'R_10', 'R_25'];
  for (const [index, symbol] of symbols.entries()) {
    await prisma.watchlistSymbol.upsert({
      where: {
        watchlistId_symbol: {
          watchlistId: watchlist.id,
          symbol,
        },
      },
      update: {},
      create: {
        watchlistId: watchlist.id,
        symbol,
        sortOrder: index,
      },
    });
  }

  console.log(`✅ ${symbols.length} symbols added to watchlist`);
  console.log('\n🎉 Seed complete!');
  console.log('📧 Login: demo@deriv-platform.local');
  console.log('🔑 Password: Demo1234!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
