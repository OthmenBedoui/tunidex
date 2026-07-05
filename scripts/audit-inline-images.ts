import { auditInlineImageStorage } from '../server/services/imageMigrationService.js';
import prisma from '../server/prisma.js';

const main = async () => {
  const summary = await auditInlineImageStorage();

  console.log('Inline image audit summary');
  console.table(summary);
};

main()
  .catch((error) => {
    console.error('Unable to audit inline images.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
