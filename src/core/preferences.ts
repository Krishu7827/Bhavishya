/**
 * User preferences for auto-selection and delegation behavior
 */

import { homedir } from "os";
import { join } from "path";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";

export interface SpecialtyBehavior {
  auto_cancelled_count: number;
  auto_delegate: boolean;
  last_cancelled_at?: string;
  reason?: string;
}

export interface BehaviorPatterns {
  price_sensitive: boolean; // User often picks cheaper options
  quality_over_speed: boolean; // User prefers high-rated over fast
  trusted_agents: string[]; // Agent IDs user has rated ≥4
  blocked_agents: string[]; // Agent IDs user wants to avoid
}

export interface UserPreferences {
  // Auto-delegation settings
  auto_delegate: boolean;
  auto_delegate_by_specialty: Record<string, boolean>;
  
  // Budget and cost controls
  max_price_per_task: number;
  max_price_by_specialty: Record<string, number>;
  
  // Quality thresholds
  min_rating_threshold: number;
  min_tasks_threshold: number;
  
  // User history
  total_delegated_tasks: number;
  total_spent: number;
  favorite_agents: Record<string, string>; // specialty -> agent_id
  
  // Phase 2: Cancellation tracking and learning
  specialty_behavior: Record<string, SpecialtyBehavior>;
  behavior_patterns: BehaviorPatterns;
  agent_ratings: Record<string, number>; // agent_id -> user's rating
  
  // First-time setup
  first_time_user: boolean;
  wallet_funded: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  auto_delegate: true,
  auto_delegate_by_specialty: {},
  max_price_per_task: 2.0, // $2 default
  max_price_by_specialty: {},
  min_rating_threshold: 3.8,
  min_tasks_threshold: 5,
  total_delegated_tasks: 0,
  total_spent: 0,
  favorite_agents: {},
  specialty_behavior: {},
  behavior_patterns: {
    price_sensitive: false,
    quality_over_speed: false,
    trusted_agents: [],
    blocked_agents: [],
  },
  agent_ratings: {},
  first_time_user: true,
  wallet_funded: false,
};

let cachedPreferences: UserPreferences | null = null;

/**
 * Get the path to the preferences file
 */
function getPreferencesPath(): string {
  const configDir = join(homedir(), ".agentmarket");
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }
  return join(configDir, "preferences.json");
}

/**
 * Load user preferences from disk
 */
export function loadPreferences(): UserPreferences {
  if (cachedPreferences) {
    return cachedPreferences;
  }

  const prefsPath = getPreferencesPath();
  
  if (!existsSync(prefsPath)) {
    // First time - create default preferences
    savePreferences(DEFAULT_PREFERENCES);
    cachedPreferences = DEFAULT_PREFERENCES;
    return DEFAULT_PREFERENCES;
  }

  try {
    const data = readFileSync(prefsPath, "utf-8");
    const prefs = JSON.parse(data) as UserPreferences;
    
    // Merge with defaults to ensure all fields exist
    cachedPreferences = { ...DEFAULT_PREFERENCES, ...prefs };
    return cachedPreferences;
  } catch (error) {
    console.error("Error loading preferences:", error);
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Save user preferences to disk
 */
export function savePreferences(prefs: UserPreferences): void {
  const prefsPath = getPreferencesPath();
  
  try {
    writeFileSync(prefsPath, JSON.stringify(prefs, null, 2), "utf-8");
    cachedPreferences = prefs;
  } catch (error) {
    console.error("Error saving preferences:", error);
  }
}

/**
 * Update a specific preference
 */
export function updatePreference<K extends keyof UserPreferences>(
  key: K,
  value: UserPreferences[K]
): void {
  const prefs = loadPreferences();
  prefs[key] = value;
  savePreferences(prefs);
}

/**
 * Check if auto-delegation is enabled for a specialty
 */
export function shouldAutoDelegateForSpecialty(specialty: string): boolean {
  const prefs = loadPreferences();
  
  // Check specialty-specific override first
  if (specialty in prefs.auto_delegate_by_specialty) {
    return prefs.auto_delegate_by_specialty[specialty];
  }
  
  // Fall back to global setting
  return prefs.auto_delegate;
}

/**
 * Get max price for a specialty
 */
export function getMaxPriceForSpecialty(specialty: string): number {
  const prefs = loadPreferences();
  
  // Check specialty-specific override first
  if (specialty in prefs.max_price_by_specialty) {
    return prefs.max_price_by_specialty[specialty];
  }
  
  // Fall back to global max
  return prefs.max_price_per_task;
}

/**
 * Get favorite agent for a specialty
 */
export function getFavoriteAgent(specialty: string): string | null {
  const prefs = loadPreferences();
  return prefs.favorite_agents[specialty] || null;
}

/**
 * Set favorite agent for a specialty
 */
export function setFavoriteAgent(specialty: string, agentId: string): void {
  const prefs = loadPreferences();
  prefs.favorite_agents[specialty] = agentId;
  savePreferences(prefs);
}

/**
 * Record a completed task
 */
export function recordCompletedTask(cost: number): void {
  const prefs = loadPreferences();
  prefs.total_delegated_tasks += 1;
  prefs.total_spent += cost;
  prefs.first_time_user = false;
  savePreferences(prefs);
}

/**
 * Mark wallet as funded
 */
export function markWalletFunded(): void {
  const prefs = loadPreferences();
  prefs.wallet_funded = true;
  savePreferences(prefs);
}

/**
 * Check if user should be prompted (first time or special conditions)
 */
export function shouldPromptUser(specialty: string, estimatedCost: number): boolean {
  const prefs = loadPreferences();
  
  // Always prompt first-time users
  if (prefs.first_time_user) {
    return true;
  }
  
  // Prompt if wallet not funded
  if (!prefs.wallet_funded) {
    return true;
  }
  
  // Prompt if cost exceeds limits
  const maxPrice = getMaxPriceForSpecialty(specialty);
  if (estimatedCost > maxPrice) {
    return true;
  }
  
  // Check if auto-delegation disabled for this specialty
  if (!shouldAutoDelegateForSpecialty(specialty)) {
    return true;
  }
  
  return false;
}

/**
 * Phase 2: Record user cancellation of auto-delegation
 * Learn from patterns and adjust behavior
 */
export function recordCancellation(specialty: string, reason?: string): void {
  const prefs = loadPreferences();
  
  // Initialize specialty behavior if not exists
  if (!prefs.specialty_behavior[specialty]) {
    prefs.specialty_behavior[specialty] = {
      auto_cancelled_count: 0,
      auto_delegate: true,
    };
  }
  
  const behavior = prefs.specialty_behavior[specialty];
  behavior.auto_cancelled_count += 1;
  behavior.last_cancelled_at = new Date().toISOString();
  if (reason) {
    behavior.reason = reason;
  }
  
  // After 3 cancellations, disable auto for this specialty
  if (behavior.auto_cancelled_count >= 3) {
    behavior.auto_delegate = false;
    prefs.auto_delegate_by_specialty[specialty] = false;
    console.log(`ℹ️  Auto-delegation disabled for ${specialty} after ${behavior.auto_cancelled_count} cancellations`);
  }
  
  savePreferences(prefs);
}

/**
 * Phase 2: Record user rating of an agent
 * Track trusted agents for future prioritization
 */
export function recordAgentRating(agentId: string, rating: number): void {
  const prefs = loadPreferences();
  prefs.agent_ratings[agentId] = rating;
  
  // If rating ≥ 4, add to trusted agents
  if (rating >= 4.0 && !prefs.behavior_patterns.trusted_agents.includes(agentId)) {
    prefs.behavior_patterns.trusted_agents.push(agentId);
  }
  
  // If rating ≤ 2, add to blocked agents
  if (rating <= 2.0 && !prefs.behavior_patterns.blocked_agents.includes(agentId)) {
    prefs.behavior_patterns.blocked_agents.push(agentId);
  }
  
  savePreferences(prefs);
}

/**
 * Phase 2: Get user's previous rating for an agent
 */
export function getUserRatingForAgent(agentId: string): number | undefined {
  const prefs = loadPreferences();
  return prefs.agent_ratings[agentId];
}

/**
 * Phase 2: Check if agent is trusted by user
 */
export function isAgentTrusted(agentId: string): boolean {
  const prefs = loadPreferences();
  return prefs.behavior_patterns.trusted_agents.includes(agentId);
}

/**
 * Phase 2: Check if agent is blocked by user
 */
export function isAgentBlocked(agentId: string): boolean {
  const prefs = loadPreferences();
  return prefs.behavior_patterns.blocked_agents.includes(agentId);
}

/**
 * Phase 2: Detect user behavior patterns
 * Analyze past choices to personalize future decisions
 */
export function detectBehaviorPatterns(): void {
  const prefs = loadPreferences();
  
  // Analyze price sensitivity
  // TODO: Track agent selection history to detect if user consistently picks cheaper options
  
  // Analyze quality preference
  // TODO: Track if user prefers high-rated over fast/cheap
  
  // For now, just basic detection based on cancellations and ratings
  const totalCancellations = Object.values(prefs.specialty_behavior)
    .reduce((sum, b) => sum + b.auto_cancelled_count, 0);
  
  // If user cancels frequently, they're price-sensitive or want control
  if (totalCancellations > 5 && prefs.total_delegated_tasks > 0) {
    const cancellationRate = totalCancellations / (prefs.total_delegated_tasks + totalCancellations);
    prefs.behavior_patterns.price_sensitive = cancellationRate > 0.3;
  }
  
  savePreferences(prefs);
}

/**
 * Phase 2: Enable auto-delegation for a specialty (after user confirms)
 */
export function enableAutoForSpecialty(specialty: string): void {
  const prefs = loadPreferences();
  
  // Reset cancellation count
  if (prefs.specialty_behavior[specialty]) {
    prefs.specialty_behavior[specialty].auto_cancelled_count = 0;
    prefs.specialty_behavior[specialty].auto_delegate = true;
  }
  
  prefs.auto_delegate_by_specialty[specialty] = true;
  savePreferences(prefs);
}

/**
 * Phase 2: Disable auto-delegation for a specialty
 */
export function disableAutoForSpecialty(specialty: string): void {
  const prefs = loadPreferences();
  prefs.auto_delegate_by_specialty[specialty] = false;
  
  if (!prefs.specialty_behavior[specialty]) {
    prefs.specialty_behavior[specialty] = {
      auto_cancelled_count: 0,
      auto_delegate: false,
    };
  } else {
    prefs.specialty_behavior[specialty].auto_delegate = false;
  }
  
  savePreferences(prefs);
}

/**
 * Reset preferences to defaults
 */
export function resetPreferences(): void {
  savePreferences(DEFAULT_PREFERENCES);
}
