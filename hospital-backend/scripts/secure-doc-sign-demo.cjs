

const fs = require('fs');
const crypto = require('crypto');

const pdfPath = process.argv[2];
if (!pdfPath || !fs.existsSync(pdfPath)) {
    console.error('Usage: node scripts/secure-doc-sign-demo.cjs <fichier.pdf>');
    process.exit(1);
}

const pdf = fs.readFileSync(pdfPath);
const sha256Hex = crypto.createHash('sha256').update(pdf).digest('hex');

const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });

const sign = crypto.createSign('SHA256');
sign.update(Buffer.from(sha256Hex, 'utf8'));
sign.end();
const signatureDer = sign.sign({ key: privateKey, dsaEncoding: 'der' });

const spkiDer = publicKey.export({ type: 'spki', format: 'der' });
const spkiBase64 = spkiDer.toString('base64');
const signatureBase64 = signatureDer.toString('base64');

const verify = crypto.createVerify('SHA256');
verify.update(Buffer.from(sha256Hex, 'utf8'));
verify.end();
const ok = verify.verify(publicKey, signatureDer);
if (!ok) {
    console.error('Erreur interne : la signature ne vérifie pas localement.');
    process.exit(1);
}

console.log('\n--- Coller dans Postman / Thunder Client ---\n');
console.log('sha256Hex:', sha256Hex);
console.log('signatureBase64:', signatureBase64);
console.log('\n--- POST /api/secure-documents/signing-key (une fois par médecin) ---\n');
console.log(JSON.stringify({ spkiBase64 }, null, 2));
console.log('\n--- Vérification locale (optionnel) ---\n');
console.log('Signature OK (local):', ok);
console.log('Taille PDF (octets):', pdf.length);
