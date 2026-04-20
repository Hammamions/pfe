
const fs = require('fs');
const path = require('path');
const { Wallet } = require('ethers');

const root = path.join(__dirname, '..');
const envPath = path.join(root, '.env');

require('dotenv').config({ path: envPath });

let raw = fs.readFileSync(envPath, 'utf8');
const hasPk = /^ANCHOR_PRIVATE_KEY=\s*[^\s#]/m.test(raw);

if (hasPk && String(process.env.ANCHOR_PRIVATE_KEY || '').trim()) {
    const w = new Wallet(String(process.env.ANCHOR_PRIVATE_KEY).trim().replace(/^(?!0x)/, '0x'));
    console.log('ANCHOR_PRIVATE_KEY déjà défini — adresse :', w.address);
    process.exit(0);
}

const w = Wallet.createRandom();
if (/^ANCHOR_PRIVATE_KEY=/m.test(raw)) {
    raw = raw.replace(/^ANCHOR_PRIVATE_KEY=.*$/m, `ANCHOR_PRIVATE_KEY=${w.privateKey}`);
} else {
    raw += `\nANCHOR_PRIVATE_KEY=${w.privateKey}\n`;
}
fs.writeFileSync(envPath, raw);

console.log('');
console.log('Wallet ancrage créé et enregistré dans .env');
console.log('Adresse à financer (MATIC test Amoy) :', w.address);
console.log('Faucet : https://faucet.polygon.technology/  (réseau Amoy)');
console.log('Puis lance : npm run deploy:anchor-amoy');
console.log('');
