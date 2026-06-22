/**
 * Task classification - determines specialty from user query
 * Supports dynamic specialties with common ones having keyword hints
 * Phase 1: Keyword-based detection for known specialties
 * Phase 2: LLM-based classification (supports any specialty)
 */

// Specialty is now just a string - no longer limited to fixed set
export type Specialty = string;

// Common specialties with keyword hints for classification
// These are suggestions, not limitations - any specialty is valid
export const KNOWN_SPECIALTIES = [
  "accounting",
  "legal",
  "design",
  "devops",
  "content",
  "general",
] as const;

export type KnownSpecialty = typeof KNOWN_SPECIALTIES[number];

// Keyword hints for known specialties (used for fallback classification)
const SPECIALTY_KEYWORDS: Record<KnownSpecialty, string[]> = {
  accounting: [
    "invoice", "tax", "ledger", "balance sheet", "expense", 
    "payroll", "bookkeeping", "audit", "reconcile", "revenue",
    "profit", "loss", "financial", "accounting"
  ],
  legal: [
    "contract", "agreement", "terms", "liability", "compliance",
    "GDPR", "clause", "NDA", "legal", "law", "regulation",
    "policy", "privacy"
  ],
  design: [
    "logo", "figma", "ui", "ux", "mockup", "wireframe",
    "brand", "color palette", "design", "graphic", "visual",
    "prototype", "sketch"
  ],
  devops: [
    "docker", "kubernetes", "CI/CD", "pipeline", "deployment",
    "AWS", "terraform", "infrastructure", "cloud", "container",
    "kubernetes", "k8s", "helm"
  ],
  content: [
    "blog", "copywriting", "SEO", "social media", "newsletter",
    "article", "content", "writing", "copy", "marketing",
    "post", "tweet"
  ],
  general: []
};

/**
 * Classifies a query into a specialty category using keyword matching
 * Returns one of the known specialties or "general" as fallback
 */
export async function classify(query: string): Promise<Specialty> {
  const lowerQuery = query.toLowerCase();
  
  // Count matches for each known specialty
  const matches: Record<string, number> = {};
  
  for (const specialty of KNOWN_SPECIALTIES) {
    matches[specialty] = 0;
  }

  for (const [specialty, keywords] of Object.entries(SPECIALTY_KEYWORDS)) {
    if (specialty === "general") continue;
    
    for (const keyword of keywords) {
      if (lowerQuery.includes(keyword)) {
        matches[specialty]++;
      }
    }
  }

  // Find specialty with most matches
  let maxMatches = 0;
  let bestSpecialty: Specialty = "general";

  for (const [specialty, count] of Object.entries(matches)) {
    if (count > maxMatches) {
      maxMatches = count;
      bestSpecialty = specialty;
    }
  }

  return bestSpecialty;
}

/**
 * Phase 2 - LLM-based classification
 * Uses Claude Haiku for accurate classification with fallback to keyword matching
 */
export async function classifyWithLLM(query: string): Promise<Specialty> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  // Fallback to keyword matching if no API key
  if (!apiKey) {
    console.warn("ANTHROPIC_API_KEY not set. Falling back to keyword classification.");
    return classify(query);
  }

  try {
    // Dynamic import to avoid errors if SDK not installed
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    
    const anthropic = new Anthropic({
      apiKey,
    });

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 20,
      messages: [
        {
          role: "user",
          content: `Classify this task with a specific specialty keyword.

Common specialties: accounting, legal, design, devops, content, data-science, security, marketing, hr, education, healthcare, real-estate, finance, sales, customer-support

Emerging tech: blockchain-dev, ai-training, smart-contract-auditing, quantum-computing, ar-vr-development

Creative: video-editing, podcast-editing, music-production, 3d-modeling, game-design, voice-acting

Business: project-management, customer-success, sales-enablement, supply-chain

Or use ANY other specific specialty that best describes this task.

Task: "${query}"

Reply with ONLY ONE specialty keyword (lowercase, use hyphens for multi-word, e.g., "blockchain-dev").`,
        },
      ],
    });

    const result = response.content[0];
    if (result.type === "text") {
      // Return any specialty string (cleaned up)
      const specialty = result.text.trim().toLowerCase().replace(/\s+/g, '-');
      
      // Validate format (alphanumeric with hyphens only)
      if (specialty && /^[a-z0-9-]+$/.test(specialty)) {
        return specialty;
      }
    }
    
    // Fallback if LLM returns invalid result
    console.warn("LLM returned invalid specialty. Falling back to keyword classification.");
    return classify(query);
  } catch (error) {
    console.error("LLM classification failed:", error);
    // Fallback to keyword matching on error
    return classify(query);
  }
}

/**
 * Smart classify - uses LLM if available, otherwise keywords
 * Automatically uses LLM when ANTHROPIC_API_KEY is set
 */
export async function smartClassify(query: string): Promise<Specialty> {
  // Use LLM if API key is available (simpler check)
  if (process.env.ANTHROPIC_API_KEY) {
    return classifyWithLLM(query);
  }
  
  return classify(query);
}
