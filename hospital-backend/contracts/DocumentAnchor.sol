// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Minimal anchor for medical document SHA-256 (32 bytes) on Polygon Amoy / any EVM testnet.
contract DocumentAnchor {
    event DocumentAnchored(bytes32 indexed docHash, uint256 whenAnchored);

    function anchor(bytes32 docHash) external {
        emit DocumentAnchored(docHash, block.timestamp);
    }
}
