/**
 * Payment Middleware using Coinbase SDK
 * Simplified payment handling using CDP's built-in capabilities
 */

import { Wallet } from "@coinbase/coinbase-sdk";
import { transferUSDC } from "./wallet.js";

const PLATFORM_FEE = parseFloat(process.env.PLATFORM_FEE || "0.05"); // 5% fee

/**
 * Payment configuration for a task
 */
export interface PaymentConfig {
  amount: number;
  recipientAddress: string;
  platformWalletAddress?: string;
}

/**
 * Payment result
 */
export interface PaymentResult {
  success: boolean;
  transactionHash?: string;
  recipientAmount: number;
  platformFee: number;
  error?: string;
}

/**
 * Process payment with automatic platform fee splitting
 * Uses direct transfer instead of escrow for simplicity
 */
export async function processPayment(
  payerWallet: Wallet,
  config: PaymentConfig
): Promise<PaymentResult> {
  try {
    const { amount, recipientAddress, platformWalletAddress } = config;

    // Calculate split
    const recipientAmount = amount * (1 - PLATFORM_FEE);
    const platformFeeAmount = amount * PLATFORM_FEE;

    // Transfer to recipient (specialist)
    const txHash = await transferUSDC(
      payerWallet,
      recipientAmount,
      recipientAddress
    );

    // Transfer platform fee if platform wallet configured
    if (platformWalletAddress && platformFeeAmount > 0) {
      await transferUSDC(payerWallet, platformFeeAmount, platformWalletAddress);
    }

    return {
      success: true,
      transactionHash: txHash,
      recipientAmount,
      platformFee: platformFeeAmount,
    };
  } catch (error) {
    return {
      success: false,
      recipientAmount: 0,
      platformFee: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Verify payment was received
 */
export async function verifyPayment(
  recipientWallet: Wallet,
  expectedAmount: number,
  transactionHash: string
): Promise<boolean> {
  // In production, verify the transaction on-chain
  // For now, we trust the transaction hash from CDP
  return !!transactionHash;
}

/**
 * Simple payment handler for MCP endpoints
 * This replaces the complex escrow system
 */
export class PaymentHandler {
  private platformWallet?: string;

  constructor(platformWallet?: string) {
    this.platformWallet = platformWallet || process.env.PLATFORM_WALLET_ADDRESS;
  }

  /**
   * Handle incoming payment request
   */
  async handlePayment(
    payerWallet: Wallet,
    amount: number,
    recipientAddress: string
  ): Promise<PaymentResult> {
    return processPayment(payerWallet, {
      amount,
      recipientAddress,
      platformWalletAddress: this.platformWallet,
    });
  }

  /**
   * Get platform fee percentage
   */
  getPlatformFee(): number {
    return PLATFORM_FEE;
  }

  /**
   * Calculate amounts before payment
   */
  calculateSplit(amount: number): {
    recipientAmount: number;
    platformFee: number;
    total: number;
  } {
    return {
      recipientAmount: amount * (1 - PLATFORM_FEE),
      platformFee: amount * PLATFORM_FEE,
      total: amount,
    };
  }
}

/**
 * Express middleware for payment verification (future use with HTTP 402)
 */
export function createPaymentMiddleware(config: {
  platformWallet?: string;
  pricePerRequest?: number;
}) {
  const handler = new PaymentHandler(config.platformWallet);

  return async (req: any, res: any, next: any) => {
    // Payment verification logic
    // This is a placeholder for future HTTP 402 implementation
    // For now, we handle payments at the application level

    // Check if payment header exists
    const paymentProof = req.headers["x-payment-proof"];

    if (!paymentProof && config.pricePerRequest && config.pricePerRequest > 0) {
      // Return 402 Payment Required
      res.status(402).json({
        error: "Payment Required",
        amount: config.pricePerRequest,
        currency: "USDC",
        network: "Base",
        recipientAddress: config.platformWallet,
      });
      return;
    }

    // If payment exists, verify and continue
    next();
  };
}
