require('dotenv').config();
require('@nomicfoundation/hardhat-toolbox');


function normalizePk(pk) {
    const s = String(pk || '').trim();
    if (!s) return null;
    return s.startsWith('0x') ? s : `0x${s}`;
}

module.exports = {
    solidity: {
        version: '0.8.20',
        settings: { optimizer: { enabled: true, runs: 200 } }
    },
    networks: {
        /** `npx hardhat node` puis `npm run deploy:anchor-local` — compte #0 uniquement (fiable en local). */
        localhost: {
            url: process.env.HARDHAT_NODE_URL || 'http://127.0.0.1:8545',
            chainId: 31337,
            accounts: [
                '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
            ]
        },
        polygonAmoy: {
            url: process.env.ANCHOR_RPC_URL || 'https://rpc-amoy.polygon.technology',
            chainId: Number(process.env.ANCHOR_CHAIN_ID || 80002),
            accounts: (() => {
                const pk = normalizePk(process.env.ANCHOR_PRIVATE_KEY);
                return pk ? [pk] : [];
            })()
        }
    },
    paths: {
        sources: './contracts',
        cache: './cache-hardhat',
        artifacts: './artifacts-hardhat'
    }
};
