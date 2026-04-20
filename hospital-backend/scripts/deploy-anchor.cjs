
const fs = require('fs');
const path = require('path');
const hre = require('hardhat');

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
    if (!process.env.ANCHOR_PRIVATE_KEY || !String(process.env.ANCHOR_PRIVATE_KEY).trim()) {
        throw new Error('ANCHOR_PRIVATE_KEY manquant — lance d’abord : node scripts/ensure-anchor-wallet.cjs');
    }
    const Factory = await hre.ethers.getContractFactory('DocumentAnchor');
    const contract = await Factory.deploy();
    await contract.waitForDeployment();
    const address = await contract.getAddress();
    setEnvLine('ANCHOR_CONTRACT_ADDRESS', address);
    console.log('');
    console.log('DocumentAnchor déployé sur Polygon Amoy :');
    console.log(address);
    console.log('');
    console.log('ANCHOR_CONTRACT_ADDRESS mis à jour dans .env');
    console.log('Redémarre l’API : npm run dev');
    console.log('');
    console.log('Explorateur : https://amoy.polygonscan.com/address/' + address);
}

// Sortie explicite : évite parfois l’assertion libuv « UV_HANDLE_CLOSING » sur Windows à la fin du script.
main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
