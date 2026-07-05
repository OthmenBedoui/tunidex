UPDATE "User"
SET "role" = 'USER'
WHERE "role" = 'CLIENT';

UPDATE "User"
SET "role" = 'AGENT'
WHERE "role" IN ('SELLER', 'SUB_ADMIN');
