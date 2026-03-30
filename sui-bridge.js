// Bundle this with esbuild to produce web/sui-bundle.js
// Exposes the Sui SDK as window.SuiSDK for Nim JS to consume.
import { SuiClient } from '@mysten/sui/client';
import { Transaction, Inputs } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { getWallets } from '@mysten/wallet-standard';

window.SuiSDK = { SuiClient, Transaction, Inputs, Ed25519Keypair, decodeSuiPrivateKey, getWallets };
