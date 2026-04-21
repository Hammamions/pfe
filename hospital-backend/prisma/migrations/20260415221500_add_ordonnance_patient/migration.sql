DELETE FROM "Ordonnance";

ALTER TABLE "Ordonnance" ADD COLUMN "patientId" INTEGER NOT NULL;

ALTER TABLE "Ordonnance" ADD CONSTRAINT "Ordonnance_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
