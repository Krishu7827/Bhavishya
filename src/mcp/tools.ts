/**
 * MCP Tools - Tool definitions for agentmarket with Phase 2 auto-selection
 * Confidence-based delegation with smart decision rules
 */

import { z } from "zod";
import { smartClassify } from "../core/classifier.js";
import { 
  fetchAgents, 
  getDelegationDecision, 
  ConfidenceLevel,
  type Agent 
} from "../core/registry.js";
import { formatChoices } from "../core/display.js";
import {
  loadPreferences,
  getMaxPriceForSpecialty,
  recordCompletedTask,
  recordCancellation,
  recordAgentRating,
  getUserRatingForAgent,
  isAgentTrusted,
  isAgentBlocked,
} from "../core/preferences.js";
import { estimateTaskCostRange } from "../core/cost-estimator.js";

/**
 * Tool definition for agentmarket_scan
 */
export const agentmarketScanTool = {
  name: "agentmarket_scan",
  description:
    "Scans user query for specialist agents. Automatically delegates to the best specialist unless manual selection is needed. Call this at the start of every task.",
  inputSchema: {
    type: "object" as const,
    properties: {
      query: {
        type: "string" as const,
        description: "The user's full task query or request",
      },
      context: {
        type: "string" as const,
        description: "Additional context about the task (optional)",
      },
    },
    required: ["query"],
  },
};

/**
 * Schema for tool arguments
 */
const AgentmarketScanArgsSchema = z.object({
  query: z.string(),
  context: z.string().optional(),
});

/**
 * Phase 2: Format high-confidence auto-delegation with cost transparency
 */
function formatHighConfidenceDelegation(
  agent: Agent,
  specialty: string,
  costRange: any,
  reason: string
): string {
  return `🤖 **Auto-delegating to specialist**

**Agent:** ${agent.name} (⭐${agent.rating.toFixed(1)})  
**Specialty:** ${specialty}  
**Estimated cost:** ${costRange.formattedRange}  
**Reason:** ${reason}

${costRange.breakdown}

_Delegating now... [Cancel within 3s](agentmarket://cancel)_`;
}

/**
 * Phase 2: Format medium-confidence quick choice
 */
function formatMediumConfidenceChoice(
  agents: Agent[],
  specialty: string,
  costRange: any,
  reason: string
): string {
  const topAgent = agents[0];
  
  return `🤔 **Quick choice recommended**

**Best option:** ${topAgent.name} (⭐${topAgent.rating.toFixed(1)}) - ${costRange.formattedRange}  
**Reason:** ${reason}

[1] ✅ Use ${topAgent.name}  
[2] 📋 See all ${agents.length} options  
[3] ⏭️ Skip and continue

${costRange.breakdown}`;
}

/**
 * Phase 2: Format low-confidence manual selection
 */
function formatLowConfidenceManual(
  agents: Agent[],
  specialty: string,
  reason: string
): string {
  return `⚠️  **Manual selection needed**

**Reason:** ${reason}

${formatChoices(specialty, agents)}

[1-${agents.length}] Select agent  
[S] Skip and continue`;
}

/**
 * Execute agentmarket_scan tool with Phase 2 confidence-based auto-selection
 */
export async function callAgentmarketScan(args: unknown) {
  const { query, context } = AgentmarketScanArgsSchema.parse(args);

  try {
    // Load user preferences
    const prefs = loadPreferences();

    // Classify the task using smart classification (LLM if available, else keywords)
    const specialty = await smartClassify(query);

    // If general task, no specialists needed
    if (specialty === "general") {
      return {
        content: [
          {
            type: "text",
            text: "No specialist agents needed for this general task.",
          },
        ],
      };
    }

    // Get max budget for this specialty
    const maxBudget = getMaxPriceForSpecialty(specialty);

    // Get delegation decision with confidence level
    const decision = await getDelegationDecision(
      specialty,
      maxBudget * 0.8, // Estimate cost at 80% of budget for initial check
      maxBudget,
      prefs.min_rating_threshold,
      prefs.min_tasks_threshold
    );

    // If no qualified agents found
    if (!decision) {
      return {
        content: [
          {
            type: "text",
            text: `No qualified specialist agents found for ${specialty} tasks (minimum rating: ${prefs.min_rating_threshold}⭐, minimum tasks: ${prefs.min_tasks_threshold}).`,
          },
        ],
      };
    }

    // Get cost range for transparency
    const costRange = estimateTaskCostRange(query, decision.agent, 2000);

    // Check if agent is blocked
    if (isAgentBlocked(decision.agent.id)) {
      // Skip this agent, get alternatives
      const agents = await fetchAgents(specialty, { limit: 3, sortByScore: true });
      const alternativeAgents = agents.filter(a => !isAgentBlocked(a.id));
      
      if (alternativeAgents.length === 0) {
        return {
          content: [{ type: "text", text: `No unblocked agents available for ${specialty}.` }],
        };
      }
      
      return {
        content: [{
          type: "text",
          text: formatChoices(specialty, alternativeAgents),
        }],
      };
    }

    // Handle based on confidence level
    switch (decision.confidence) {
      case ConfidenceLevel.HIGH:
        // Auto-delegate immediately with 3-second cancel window
        const highConfidenceMessage = formatHighConfidenceDelegation(
          decision.agent,
          specialty,
          costRange,
          decision.reason
        );

        // TODO: Actual delegation with cancel countdown
        // await delegateWithCountdown(decision.agent, query, context, 3000);

        return {
          content: [{
            type: "text",
            text: highConfidenceMessage + "\n\n_[Phase 2 implementation in progress]_",
          }],
        };

      case ConfidenceLevel.MEDIUM:
        // Show quick inline choice
        const agents = await fetchAgents(specialty, { limit: 3, sortByScore: true });
        const mediumConfidenceMessage = formatMediumConfidenceChoice(
          agents,
          specialty,
          costRange,
          decision.reason
        );

        return {
          content: [{
            type: "text",
            text: mediumConfidenceMessage,
          }],
        };

      case ConfidenceLevel.LOW:
      case ConfidenceLevel.NONE:
      default:
        // Force manual selection
        const allAgents = await fetchAgents(specialty, { limit: 5, sortByScore: true });
        const lowConfidenceMessage = formatLowConfidenceManual(
          allAgents,
          specialty,
          decision.reason
        );

        return {
          content: [{
            type: "text",
            text: lowConfidenceMessage,
          }],
        };
    }
  } catch (error) {
    console.error("Error in agentmarket_scan:", error);
    return {
      content: [
        {
          type: "text",
          text: `Error scanning for specialists: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
    };
  }
}
