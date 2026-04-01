import prisma from './server/prisma.js';

async function test() {
  try {
    console.log('Prisma instance:', prisma);
    console.log('Prisma user model:', prisma.user);
    const count = await prisma.user.count();
    console.log('User count:', count);
  } catch (e) {
    console.error('Test failed:', e);
  }
}

test();
