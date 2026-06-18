/**
 * Cost Estimation - Calculate task costs before payment with ranges
 */

import type { Agent } from "./registry.js";

/**
 * Estimate token count from text (rough approximation)
 * Average: 1 token ≈ 4 characters
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export interface CostEstimate {
  inputTokens: number;
  outputTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  formattedCost: string;
}

export interface CostRange {
  min: CostEstimate;
  max: CostEstimate;
  expected: CostEstimate;
  formattedRange: string;
  breakdown: string;
}

/**
 * Estimate cost for a task (single estimate)
 */
export function estimateTaskCost(
  query: string,
  agent: Agent,
  estimatedOutputTokens: number = 2000
): CostEstimate {
  // Estimate input tokens from query
  const inputTokens = estimateTokens(query);
  
  // Calculate costs
  const inputCost = (inputTokens / 1_000_000) * agent.price_per_million_input_tokens;
  const outputCost = (estimatedOutputTokens / 1_000_000) * agent.price_per_million_output_tokens;
  const totalCost = inputCost + outputCost;
  
  // Round up to 2 decimal places
  const formattedCost = `$${(Math.ceil(totalCost * 100) / 100).toFixed(2)}`;
  
  return {
    inputTokens,
    outputTokens: estimatedOutputTokens,
    inputCost,
    outputCost,
    totalCost,
    formattedCost,
  };
}

/**
 * Estimate cost range for a task (min/max scenarios)
 * Provides more transparency for user decision-making
 */
export function estimateTaskCostRange(
  query: string,
  agent: Agent,
  estimatedOutputTokens: number = 2000
): CostRange {
  // Conservative estimate (short response)
  const minTokens = Math.floor(estimatedOutputTokens * 0.5);
  const min = estimateTaskCost(query, agent, minTokens);
  
  // Expected estimate (typical response)
  const expected = estimateTaskCost(query, agent, estimatedOutputTokens);
  
  // Generous estimate (long response)
  const maxTokens = Math.ceil(estimatedOutputTokens * 1.5);
  const max = estimateTaskCost(query, agent, maxTokens);
  
  // Format range
  const formattedRange = `${min.formattedCost}–${max.formattedCost}`;
  
  // Breakdown for transparency
  const breakdown = `Based on ~${expected.inputTokens.toLocaleString()} input + ${minTokens.toLocaleString()}–${maxTokens.toLocaleString()} output tokens
${agent.name} pricing: $${agent.price_per_million_input_tokens.toFixed(2)} input / $${agent.price_per_million_output_tokens.toFixed(2)} output per 1M tokens`;
  
  return {
    min,
    max,
    expected,
    formattedRange,
    breakdown,
  };
}

/**
 * Format cost estimate for display
 */
export function formatCostEstimate(
  query: string,
  agent: Agent,
  estimatedOutputTokens: number = 2000
): string {
  const estimate = estimateTaskCost(query, agent, estimatedOutputTokens);
  
  return `💰 Estimated cost: ~${estimate.formattedCost} USDC
   (${estimate.inputTokens.toLocaleString()} input + ~${estimate.outputTokens.toLocaleString()} output tokens)`;
}

/**
 * Get budget tier based on cost
 */
export function getBudgetTier(cost: number): "low" | "medium" | "high" {
  if (cost < 0.10) return "low";
  if (cost < 1.00) return "medium";
  return "high";
}

/**
 * Check if cost is within budget
 */
export function isWithinBudget(cost: number, budget: number): boolean {
  return cost <= budget;
}
