import { ethers } from 'ethers';

const ANCHOR_ABI = [
    'function anchor(bytes32 docHash) external',
    'event DocumentAnchored(bytes32 indexed docHash, uint256 whenAnchored)'
];

export function sha256HexToBytes32(sha256Hex: string): string {
    const h = sha256Hex.replace(/^0x/i, '').toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(h)) {
        throw new Error('contentSha256 invalide (64 hex attendu)');
    }
    return `0x${h}`;
}

export async function anchorHashOnChain(sha256Hex: string): Promise<{
    txHash: string;
    chainId: number;
    contractAddress: string;
    blockNumber: bigint;
} | null> {
    const pk = (process.env.ANCHOR_PRIVATE_KEY || '').trim();
    const rpc = (process.env.ANCHOR_RPC_URL || '').trim();
    const contractAddr = (process.env.ANCHOR_CONTRACT_ADDRESS || '').trim();
    if (!pk || !rpc || !contractAddr) {
        console.warn('[anchor] ANCHOR_PRIVATE_KEY / ANCHOR_RPC_URL / ANCHOR_CONTRACT_ADDRESS incomplets — ancrage ignoré');
        return null;
    }

    const provider = new ethers.JsonRpcProvider(rpc);
    const wallet = new ethers.Wallet(pk.startsWith('0x') ? pk : `0x${pk}`, provider);
    const contract = new ethers.Contract(contractAddr, ANCHOR_ABI, wallet);
    const docHash = sha256HexToBytes32(sha256Hex);

    const tx = await contract.anchor(docHash);
    const receipt = await tx.wait();
    if (!receipt) return null;

    const net = await provider.getNetwork();
    return {
        txHash: receipt.hash,
        chainId: Number(net.chainId),
        contractAddress: contractAddr,
        blockNumber: receipt.blockNumber
    };
}

export async function verifyAnchorInReceipt(params: {
    txHash: string;
    expectedSha256Hex: string;
    contractAddress: string;
    rpcUrl: string;
    chainId: number;
}): Promise<boolean> {
    try {
        const provider = new ethers.JsonRpcProvider(params.rpcUrl);
        const receipt = await provider.getTransactionReceipt(params.txHash);
        if (!receipt) return false;

        const iface = new ethers.Interface(ANCHOR_ABI);
        const expectedHash = sha256HexToBytes32(params.expectedSha256Hex);
        const addr = params.contractAddress.toLowerCase();

        for (const log of receipt.logs) {
            if (!log.address || log.address.toLowerCase() !== addr) continue;
            try {
                const parsed = iface.parseLog({
                    topics: log.topics as string[],
                    data: log.data
                });
                if (parsed?.name === 'DocumentAnchored') {
                    const emitted = String(parsed.args[0]).toLowerCase();
                    if (emitted === String(expectedHash).toLowerCase()) return true;
                }
            } catch {
                /* ignore */
            }
        }
        return false;
    } catch (e) {
        console.warn('[anchor] verifyAnchorInReceipt', e);
        return false;
    }
}
