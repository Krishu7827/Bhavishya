/**
 * Agent registry - fetches specialist agents from Supabase
 */

import { createClient } from "@supabase/supabase-js";
import type { Specialty } from "./classifier.js";
import { getFavoriteAgent } from "./preferences.js";

export interface Agent {
  id: string;
  name: string;
  specialty: string[];
  price_per_million_input_tokens: number;
  price_per_million_output_tokens: number;
  wallet_address: string;
  mcp_endpoint: string;
  rating: number;
  total_tasks: number;
  response_time_avg: number;
  created_at?: string;
  updated_at?: string;
}

export interface AgentWithScore extends Agent {
  score: number;
}

let supabaseClient: ReturnType<typeof createClient> | null = null;

/**
 * Calculate intelligent score for agent selection
 * Combines rating, response time, and price
 */
export function calculateAgentScore(agent: Agent): number {
  // Normalize rating (0-5 scale)
  const ratingScore = (agent.rating / 5.0) * 0.5; // 50% weight
  
  // Normalize response time (faster = better, cap at 5 minutes)
  const maxResponseTime = 300; // 5 minutes in seconds
  const responseTimeScore = Math.max(0, 1 - (agent.response_time_avg / maxResponseTime)) * 0.3; // 30% weight
  
  // Normalize price (cheaper = better, use typical price range)
  const typicalHighPrice = 2.0; // $2 per million tokens
  const avgPrice = (agent.price_per_million_input_tokens + agent.price_per_million_output_tokens) / 2;
  const priceScore = Math.max(0, 1 - (avgPrice / typicalHighPrice)) * 0.2; // 20% weight
  
  // Total score (0-1 range)
  return ratingScore + responseTimeScore + priceScore;
}

/**
 * Sort agents by intelligent score
 */
export function sortAgentsByScore(agents: Agent[]): AgentWithScore[] {
  return agents
    .map(agent => ({
      ...agent,
      score: calculateAgentScore(agent)
    }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Initialize Supabase client
 */
export function initRegistry() {
  if (supabaseClient) return supabaseClient;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_ANON_KEY in .env"
    );
  }

  supabaseClient = createClient(supabaseUrl, supabaseKey);
  return supabaseClient;
}

/**
 * Fetch top agents for a given specialty
 * Returns agents sorted by intelligent score (rating + speed + price)
 */
export async function fetchAgents(
  specialty: Specialty,
  options: { limit?: number; sortByScore?: boolean } = {}
): Promise<Agent[]> {
  const { limit = 3, sortByScore = true } = options;
  
  if (specialty === "general") return [];

  const client = initRegistry();

  const { data, error } = await client
    .from("agents")
    .select("*")
    .contains("specialty", [specialty])
    .gte("rating", 0) // Get all agents with any rating
    .limit(10); // Fetch more for scoring

  if (error) {
    console.error("Error fetching agents:", error);
    return [];
  }

  let agents = (data || []) as Agent[];
  
  // Sort by intelligent score if requested
  if (sortByScore && agents.length > 0) {
    const scored = sortAgentsByScore(agents);
    agents = scored.slice(0, limit);
  } else {
    // Fallback to rating only
    agents = agents
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit);
  }

  return agents;
}

/**
 * Get best agent for auto-selection
 * Checks favorite agent first, then falls back to highest scored
 */
export async function getBestAgentForAutoSelection(
  specialty: Specialty,
  minRating: number = 3.8,
  minTasks: number = 5
): Promise<Agent | null> {
  // Check for favorite agent first
  const favoriteAgentId = getFavoriteAgent(specialty);
  if (favoriteAgentId) {
    const client = initRegistry();
    const { data, error } = await client
      .from("agents")
      .select("*")
      .eq("id", favoriteAgentId)
      .single();
    
    if (!error && data) {
      const agent = data as Agent;
      if (agent.rating >= minRating) {
        return agent;
      }
    }
  }

  // Fetch agents and apply quality filters
  const agents = await fetchAgents(specialty, { limit: 5, sortByScore: true });
  
  // Filter by minimum thresholds
  const qualifiedAgents = agents.filter(
    agent => agent.rating >= minRating && agent.total_tasks >= minTasks
  );

  return qualifiedAgents.length > 0 ? qualifiedAgents[0] : null;
}

/**
 * Confidence level for auto-delegation decision
 */
export enum ConfidenceLevel {
  HIGH = "high",       // Auto-delegate immediately
  MEDIUM = "medium",   // Quick inline choice
  LOW = "low",         // Force manual selection
  NONE = "none"        // Skip entirely
}

export interface DelegationDecision {
  confidence: ConfidenceLevel;
  agent: Agent;
  reason: string;
  shouldAutoDelegate: boolean;
  requiresUserInput: boolean;
}

/**
 * Calculate confidence for auto-delegation based on multiple factors
 * Phase 2 enhancement: Smarter decision rules
 */
export function calculateDelegationConfidence(
  agent: Agent,
  estimatedCost: number,
  maxBudget: number,
  isFavorite: boolean = false,
  userHasRatedAgentBefore: boolean = false,
  previousRating?: number
): ConfidenceLevel {
  const priceRatio = estimatedCost / maxBudget;
  
  // HIGH CONFIDENCE: Auto-delegate immediately
  // - Rating ≥ 4.5 AND within budget
  // - OR it's a favorite agent with good history
  // - OR user previously rated ≥4
  if (agent.rating >= 4.5 && priceRatio <= 1.0) {
    return ConfidenceLevel.HIGH;
  }
  
  if (isFavorite && agent.rating >= 4.0 && priceRatio <= 1.2) {
    return ConfidenceLevel.HIGH;
  }
  
  if (userHasRatedAgentBefore && previousRating && previousRating >= 4.0 && priceRatio <= 1.0) {
    return ConfidenceLevel.HIGH;
  }
  
  // MEDIUM CONFIDENCE: Quick inline choice (3 buttons)
  // - Rating 4.0-4.4 AND within budget
  // - OR rating ≥ 4.5 but price 80-120% of budget
  if (agent.rating >= 4.0 && agent.rating < 4.5 && priceRatio <= 1.0) {
    return ConfidenceLevel.MEDIUM;
  }
  
  if (agent.rating >= 4.5 && priceRatio > 0.8 && priceRatio <= 1.2) {
    return ConfidenceLevel.MEDIUM;
  }
  
  if (agent.rating >= 4.0 && priceRatio > 0.8 && priceRatio <= 1.2) {
    return ConfidenceLevel.MEDIUM;
  }
  
  // LOW CONFIDENCE: Force manual selection
  // - Price > 150% of budget
  // - OR rating < 4.0
  if (priceRatio > 1.5 || agent.rating < 4.0) {
    return ConfidenceLevel.LOW;
  }
  
  // NONE: Don't delegate at all
  // - Rating < 3.8 (below quality threshold)
  if (agent.rating < 3.8) {
    return ConfidenceLevel.NONE;
  }
  
  // Default to medium for edge cases
  return ConfidenceLevel.MEDIUM;
}

/**
 * Get delegation decision with confidence level
 * Phase 2: Comprehensive decision-making
 */
export async function getDelegationDecision(
  specialty: Specialty,
  estimatedCost: number,
  maxBudget: number,
  minRating: number = 3.8,
  minTasks: number = 5
): Promise<DelegationDecision | null> {
  // Get best agent
  const agent = await getBestAgentForAutoSelection(specialty, minRating, minTasks);
  
  if (!agent) {
    return null;
  }
  
  // Check if favorite
  const favoriteAgentId = getFavoriteAgent(specialty);
  const isFavorite = favoriteAgentId === agent.id;
  
  // Calculate confidence
  const confidence = calculateDelegationConfidence(
    agent,
    estimatedCost,
    maxBudget,
    isFavorite
  );
  
  // Determine actions based on confidence
  let shouldAutoDelegate = false;
  let requiresUserInput = true;
  let reason = "";
  
  switch (confidence) {
    case ConfidenceLevel.HIGH:
      shouldAutoDelegate = true;
      requiresUserInput = false;
      reason = isFavorite 
        ? `Favorite agent with excellent rating (${agent.rating}★)`
        : `High-quality agent (${agent.rating}★) within budget`;
      break;
      
    case ConfidenceLevel.MEDIUM:
      shouldAutoDelegate = false;
      requiresUserInput = true;
      reason = `Good agent (${agent.rating}★) - quick choice recommended`;
      break;
      
    case ConfidenceLevel.LOW:
      shouldAutoDelegate = false;
      requiresUserInput = true;
      reason = estimatedCost > maxBudget * 1.5
        ? `Price exceeds budget (${(estimatedCost / maxBudget * 100).toFixed(0)}% of limit)`
        : `Rating below preference (${agent.rating}★)`;
      break;
      
    case ConfidenceLevel.NONE:
      shouldAutoDelegate = false;
      requiresUserInput = true;
      reason = `No agents meet quality threshold (${minRating}★)`;
      break;
  }
  
  return {
    confidence,
    agent,
    reason,
    shouldAutoDelegate,
    requiresUserInput,
  };
}

/**
 * Register a new agent in the marketplace
 */
export async function registerAgent(
  agent: Omit<Agent, "id" | "created_at" | "updated_at">
): Promise<Agent | null> {
  const client = initRegistry();

  const { data, error } = await client
    .from("agents")
    // @ts-ignore - Supabase type inference issue
    .insert([agent])
    .select()
    .single();

  if (error) {
    console.error("Error registering agent:", error);
    return null;
  }

  return data as Agent | null;
}

/**
 * Update agent stats after task completion
 */
export async function updateAgentStats(
  agentId: string,
  rating: number,
  responseTime: number
): Promise<boolean> {
  const client = initRegistry();

  // Fetch current agent stats
  const { data: agent, error: fetchError } = await client
    .from("agents")
    .select("*")
    .eq("id", agentId)
    .single();

  if (fetchError || !agent) {
    console.error("Error fetching agent:", fetchError);
    return false;
  }

  const agentData = agent as Agent;

  // Calculate new averages
  const totalTasks = agentData.total_tasks + 1;
  const newRating =
    (agentData.rating * agentData.total_tasks + rating) / totalTasks;
  const newResponseTime =
    (agentData.response_time_avg * agentData.total_tasks + responseTime) / totalTasks;

  // Update agent
  const { error: updateError } = await client
    .from("agents")
    // @ts-ignore - Supabase type inference issue
    .update({
      rating: newRating,
      total_tasks: totalTasks,
      response_time_avg: newResponseTime,
    })
    .eq("id", agentId);

  if (updateError) {
    console.error("Error updating agent stats:", updateError);
    return false;
  }

  return true;
}
