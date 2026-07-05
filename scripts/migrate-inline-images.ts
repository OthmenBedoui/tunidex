import { auditInlineImageStorage, migrateInlineImagesInDatabase } from '../server/services/imageMigrationService.js';
import prisma from '../server/prisma.js';

const main = async () => {
  const before = await auditInlineImageStorage();
  console.log('Before migration');
  console.table(before);

  const migrated = await migrateInlineImagesInDatabase();
  console.log('Migration summary');
  console.table(migrated);

  const after = await auditInlineImageStorage();
  console.log('After migration');
  console.table(after);
};

main()
  .catch((error) => {
    console.error('Inline image migration failed.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
