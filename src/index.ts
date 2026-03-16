/**
 * agentmarket - Main exports
 */

// Core
export { classify, classifyWithLLM, smartClassify, type Specialty } from "./core/classifier.js";
export {
  fetchAgents,
  registerAgent,
  updateAgentStats,
  initRegistry,
  type Agent,
} from "./core/registry.js";
export {
  formatChoices,
  promptAgentSelection,
  displayIncomingTask,
  createSpinner,
  displaySuccess,
  displayError,
  displayInfo,
  promptRating,
} from "./core/display.js";
export {
  estimateTaskCost,
  formatCostEstimate,
  getBudgetTier,
  isWithinBudget,
} from "./core/cost-estimator.js";

// MCP
export { createServer, startServer } from "./mcp/server.js";
export { agentmarketScanTool, callAgentmarketScan } from "./mcp/tools.js";

// Payments
export {
  initCoinbase,
  createWallet,
  loadWallet,
  getWalletBalance,
  transferUSDC,
  exportWalletData,
  fundWallet,
} from "./payments/wallet.js";
export {
  PaymentHandler,
  processPayment,
  verifyPayment,
  createPaymentMiddleware,
  type PaymentConfig,
  type PaymentResult,
} from "./payments/payment-handler.js";

// CLI
export { runInstall } from "./cli/install.js";
export { runPublish } from "./cli/publish.js";
