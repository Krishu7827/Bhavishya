/**
 * Wallet Management - Coinbase AgentKit wallet operations
 */

import { Coinbase, Wallet } from "@coinbase/coinbase-sdk";

let coinbaseClient: Coinbase | null = null;

/**
 * Get network ID based on environment
 */
function getNetworkId(): string {
  const nodeEnv = process.env.NODE_ENV || "development";
  
  if (nodeEnv === "production") {
    return Coinbase.networks.BaseMainnet;
  }
  
  return Coinbase.networks.BaseSepolia;
}

/**
 * Initialize Coinbase SDK
 */
export function initCoinbase(): Coinbase {
  if (coinbaseClient) return coinbaseClient;

  const apiKeyName = process.env.CDP_API_KEY_NAME;
  const privateKey = process.env.CDP_API_KEY_PRIVATE_KEY;

  if (!apiKeyName || !privateKey) {
    throw new Error(
      "Missing Coinbase credentials. Set CDP_API_KEY_NAME and CDP_API_KEY_PRIVATE_KEY in .env"
    );
  }

  coinbaseClient = Coinbase.configure({
    apiKeyName,
    privateKey,
  });

  return coinbaseClient;
}

/**
 * Create a new wallet for an agent
 */
export async function createWallet(): Promise<Wallet> {
  const coinbase = initCoinbase();
  const networkId = getNetworkId();
  
  console.log(`Creating wallet on ${networkId}...`);
  
  const wallet = await Wallet.create({
    networkId,
  });

  return wallet;
}

/**
 * Load an existing wallet
 */
export async function loadWallet(walletId: string, seed?: string): Promise<Wallet> {
  // TODO: Implement wallet loading based on Coinbase SDK
  // For now, create a new wallet
  const wallet = await createWallet();
  return wallet;
}

/**
 * Get wallet balance in USDC
 */
export async function getWalletBalance(wallet: Wallet): Promise<number> {
  const balance = await wallet.getBalance("usdc");
  return parseFloat(balance.toString());
}

/**
 * Transfer USDC to another address
 */
export async function transferUSDC(
  wallet: Wallet,
  amount: number,
  destination: string
): Promise<string> {
  const transfer = await wallet.createTransfer({
    amount,
    assetId: "usdc",
    destination,
  });

  await transfer.wait();

  return transfer.getTransactionHash() || "";
}

/**
 * Export wallet data for backup
 */
export async function exportWalletData(wallet: Wallet): Promise<{
  walletId: string;
  seed: string;
  address: string;
}> {
  const data = wallet.export();
  const defaultAddress = await wallet.getDefaultAddress();
  
  return {
    walletId: wallet.getId() || "",
    seed: data.seed,
    address: defaultAddress?.getId() || "",
  };
}

/**
 * Fund wallet with USDC (for testing)
 * In production, users would fund via exchange or on-ramp
 */
export async function fundWallet(wallet: Wallet): Promise<void> {
  // Request faucet funds on testnet
  // On mainnet, this would require actual USDC transfer
  const faucetTx = await wallet.faucet("usdc");
  await faucetTx.wait();
}
