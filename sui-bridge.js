// Bundle this with esbuild to produce web/sui-bundle.js
// Exposes the Sui SDK as window.SuiSDK for Nim JS to consume.
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';

window.SuiSDK = { SuiClient, Transaction, Ed25519Keypair, decodeSuiPrivateKey };
