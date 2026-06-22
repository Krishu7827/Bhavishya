interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Transform messages from GitHub Copilot format to NVIDIA API format
 * Handles any necessary adaptations (e.g., system message handling)
 */
export function transformMessages(messages: Message[]): Message[] {
  return messages.map(msg => ({
    role: msg.role,
    content: msg.content,
  }));
}

/**
 * Sanitize message content
 */
export function sanitizeContent(content: string): string {
  return content.trim();
}
