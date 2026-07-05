ALTER TABLE "Payment"
  ADD COLUMN "reference" TEXT,
  ADD COLUMN "proofUrl" TEXT,
  ADD COLUMN "declaredAt" TIMESTAMP(3);
