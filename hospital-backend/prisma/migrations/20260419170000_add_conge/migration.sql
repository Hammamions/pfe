-- Congés médecins (aligné sur model Conge dans schema.prisma)

CREATE TABLE IF NOT EXISTS "Conge" (
    "id" SERIAL NOT NULL,
    "medecinId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,

    CONSTRAINT "Conge_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Conge_medecinId_fkey'
  ) THEN
    ALTER TABLE "Conge"
      ADD CONSTRAINT "Conge_medecinId_fkey"
      FOREIGN KEY ("medecinId") REFERENCES "Medecin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Conge_medecinId_idx" ON "Conge"("medecinId");
