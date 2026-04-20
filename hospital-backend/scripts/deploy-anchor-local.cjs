/**
 * Déploie DocumentAnchor sur le nœud Hardhat local (127.0.0.1:8545).
 * Prérequis : dans un autre terminal, `npx hardhat node` (laisser tourner).
 */
const fs = require('fs');
const path = require('path');
const hre = require('hardhat');

/** Compte #0 du `npx hardhat node` — l’API doit utiliser la même clé pour signer `anchor()` en local. */
const DEFAULT_HARDHAT_ACC0_PK =
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

function setEnvLine(name, value) {
    const envPath = path.join(__dirname, '..', '.env');
    let raw = fs.readFileSync(envPath, 'utf8');
    const re = new RegExp(`^${name}=.*$`, 'm');
    const line = `${name}=${value}`;
    if (re.test(raw)) {
        raw = raw.replace(re, line);
    } else {
        raw = `${raw.trimEnd()}\n${line}\n`;
    }
    fs.writeFileSync(envPath, raw);
}

async function main() {
    const envPath = path.join(__dirname, '..', '.env');
    require('dotenv').config({ path: envPath });
    const hadPkBefore = !!String(process.env.ANCHOR_PRIVATE_KEY || '').trim();

    const Factory = await hre.ethers.getContractFactory('DocumentAnchor');
    const contract = await Factory.deploy();
    await contract.waitForDeployment();
    const address = await contract.getAddress();

    setEnvLine('ANCHOR_RPC_URL', 'http://127.0.0.1:8545');
    setEnvLine('ANCHOR_CHAIN_ID', '31337');
    setEnvLine('ANCHOR_CONTRACT_ADDRESS', address);

    console.log('');
    console.log('DocumentAnchor déployé sur Hardhat local (127.0.0.1:8545) :');
    console.log(address);
    console.log('');
    console.log('Mis à jour dans .env : ANCHOR_RPC_URL, ANCHOR_CHAIN_ID=31337, ANCHOR_CONTRACT_ADDRESS');
    if (!hadPkBefore) {
        setEnvLine('ANCHOR_PRIVATE_KEY', DEFAULT_HARDHAT_ACC0_PK);
        console.log('');
        console.log(
            'ANCHOR_PRIVATE_KEY était absent : enregistrement de la clé du compte #0 Hardhat (requis pour que l’API appelle anchor()).'
        );
    } else {
        console.log('');
        console.log(
            'ANCHOR_PRIVATE_KEY est déjà défini dans .env — non modifié. Pour ancrer en local, cette clé doit être celle du compte #0 du nœud (`npx hardhat node`), sinon remplacez-la par :'
        );
        console.log(DEFAULT_HARDHAT_ACC0_PK);
    }
    console.log('');
    console.log('Redémarre l’API : npm run dev');
    console.log('');
}

main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
