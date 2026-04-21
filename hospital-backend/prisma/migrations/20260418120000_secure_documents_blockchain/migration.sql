-- Secure medical documents + Polygon testnet anchor metadata

ALTER TABLE "Medecin" ADD COLUMN IF NOT EXISTS "signingPublicKeySpkiBase64" TEXT;

ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "medecinId" INTEGER;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "publicId" TEXT;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "contentSha256" TEXT;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "signatureBase64" TEXT;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "signingKeySpkiSnapshot" TEXT;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "cipherStoragePath" TEXT;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "aesIvBase64" TEXT;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "aesAuthTagBase64" TEXT;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "anchorTxHash" TEXT;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "anchorChainId" INTEGER;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "anchorContractAddress" TEXT;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "anchorBlockNumber" BIGINT;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "anchoredAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "Document_publicId_key" ON "Document"("publicId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Document_medecinId_fkey'
  ) THEN
    ALTER TABLE "Document"
      ADD CONSTRAINT "Document_medecinId_fkey"
      FOREIGN KEY ("medecinId") REFERENCES "Medecin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
