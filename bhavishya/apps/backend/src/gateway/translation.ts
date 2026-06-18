/**
 * Translation utilities between Anthropic Messages API and OpenAI Chat Completions API
 */

import {
  AnthropicRequest,
  AnthropicResponse,
  AnthropicMessage,
  AnthropicContentBlock,
  OpenAIRequest,
  OpenAIResponse,
  OpenAIMessage,
} from '@future/shared';

/**
 * Convert Anthropic Messages API request to OpenAI Chat Completions format
 */
export function anthropicToOpenAI(anthropic: AnthropicRequest): OpenAIRequest {
  const messages: OpenAIMessage[] = [];

  // Add system message if present
  if (anthropic.system) {
    messages.push({
      role: 'system',
      content: anthropic.system,
    });
  }

  // Convert messages
  for (const msg of anthropic.messages) {
    const converted = convertAnthropicMessage(msg);
    messages.push(...converted);
  }

  return {
    model: anthropic.model,
    messages,
    max_tokens: anthropic.max_tokens,
    temperature: anthropic.temperature,
    top_p: anthropic.top_p,
    stream: anthropic.stream,
    stop: anthropic.stop_sequences,
  };
}

/**
 * Convert a single Anthropic message to OpenAI format
 */
function convertAnthropicMessage(msg: AnthropicMessage): OpenAIMessage[] {
  const messages: OpenAIMessage[] = [];

  if (typeof msg.content === 'string') {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    });
  } else {
    // Handle content blocks
    const textBlocks = msg.content.filter((b) => b.type === 'text');
    const toolUseBlocks = msg.content.filter((b) => b.type === 'tool_use');
    const toolResultBlocks = msg.content.filter((b) => b.type === 'tool_result');
    const imageBlocks = msg.content.filter((b) => b.type === 'image');

    // Text content
    if (textBlocks.length > 0) {
      const text = textBlocks.map((b) => b.text || '').join('\n');
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: text,
      });
    }

    // Image blocks (for vision models)
    if (imageBlocks.length > 0 && msg.role === 'user') {
      const content: any[] = [];
      for (const block of imageBlocks) {
        if (block.source?.type === 'base64') {
          content.push({
            type: 'image_url',
            image_url: {
              url: `data:${block.source.media_type};base64,${block.source.data}`,
            },
          });
        }
      }
      if (content.length > 0) {
        messages.push({
          role: 'user',
          content,
        });
      }
    }

    // Tool use (assistant)
    if (toolUseBlocks.length > 0 && msg.role === 'assistant') {
      messages.push({
        role: 'assistant',
        content: textBlocks.length > 0 ? textBlocks[0].text || '' : '',
        tool_calls: toolUseBlocks.map((block) => ({
          id: block.id || `call_${Date.now()}`,
          type: 'function' as const,
          function: {
            name: block.name || '',
            arguments: JSON.stringify(block.input || {}),
          },
        })),
      });
    }

    // Tool results (user)
    if (toolResultBlocks.length > 0 && msg.role === 'user') {
      for (const block of toolResultBlocks) {
        messages.push({
          role: 'tool',
          tool_call_id: block.tool_use_id,
          content: block.content || '',
        });
      }
    }
  }

  return messages;
}

/**
 * Convert OpenAI Chat Completions response to Anthropic format
 */
export function openAIToAnthropic(
  openai: OpenAIResponse,
  model: string,
): AnthropicResponse {
  const choice = openai.choices[0];
  
  const content: AnthropicContentBlock[] = [];

  if (choice.message.content) {
    content.push({
      type: 'text',
      text: typeof choice.message.content === 'string' 
        ? choice.message.content 
        : JSON.stringify(choice.message.content),
    });
  }

  // Handle tool calls
  if (choice.message.tool_calls) {
    for (const toolCall of choice.message.tool_calls) {
      content.push({
        type: 'tool_use',
        id: toolCall.id,
        name: toolCall.function.name,
        input: JSON.parse(toolCall.function.arguments),
      });
    }
  }

  return {
    id: openai.id,
    type: 'message',
    role: 'assistant',
    content,
    model,
    stop_reason: mapFinishReason(choice.finish_reason),
    stop_sequence: null,
    usage: {
      input_tokens: openai.usage.prompt_tokens,
      output_tokens: openai.usage.completion_tokens,
    },
  };
}

/**
 * Map OpenAI finish_reason to Anthropic stop_reason
 */
function mapFinishReason(
  reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null,
): 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use' | null {
  switch (reason) {
    case 'stop':
      return 'end_turn';
    case 'length':
      return 'max_tokens';
    case 'tool_calls':
      return 'tool_use';
    case 'content_filter':
      return 'end_turn';
    default:
      return 'end_turn';
  }
}

/**
 * Convert Anthropic tools to OpenAI format
 */
export function anthropicToolsToOpenAI(
  anthropicTools: { name: string; description: string; input_schema: any }[],
): { type: 'function'; function: { name: string; description: string; parameters: any } }[] {
  return anthropicTools.map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema,
    },
  }));
}
