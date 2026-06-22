import { Request, Response } from 'express';
import OpenAI from 'openai';
import { config, modelRegistry } from '../config/index.js';
import { MissingFieldError, InternalError } from '../middleware/error.js';
import { transformMessages } from '../transforms/message.js';

const openai = new OpenAI({
  apiKey: config.nvidia.apiKey,
  baseURL: config.nvidia.baseUrl,
});

export async function chatCompletionsHandler(req: Request, res: Response) {
  const { messages, model: githubModel, stream = false } = req.body;

  // Validate required fields
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    throw new MissingFieldError('messages');
  }

  if (!githubModel) {
    throw new MissingFieldError('model');
  }

  // Get NVIDIA model
  const nvidiaModel = modelRegistry.getNvidiaModel(githubModel);

  // Transform messages
  const transformedMessages = transformMessages(messages);

  try {
    if (stream) {
      // Streaming response
      const completion = await openai.chat.completions.create({
        model: nvidiaModel,
        messages: transformedMessages,
        temperature: 1,
        top_p: 1,
        max_tokens: 16384,
        stream: true,
      });

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      for await (const chunk of completion) {
        const content = chunk.choices[0]?.delta?.content || '';
        const finishReason = chunk.choices[0]?.finish_reason;
        
        if (content || finishReason) {
          res.write(`data: ${JSON.stringify({
            id: chunk.id,
            object: 'chat.completion.chunk',
            created: chunk.created,
            model: githubModel,
            choices: [{
              index: 0,
              delta: content ? { content } : {},
              finish_reason: finishReason || null,
            }],
          })}\n\n`);
        }
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      // Non-streaming response
      const completion = await openai.chat.completions.create({
        model: nvidiaModel,
        messages: transformedMessages,
        temperature: 1,
        top_p: 1,
        max_tokens: 16384,
        stream: false,
      });

      // Transform response to OpenAI format expected by GitHub Copilot
      res.json({
        ...completion,
        model: githubModel, // Return original model name
      });
    }
  } catch (error) {
    console.error('NVIDIA API error:', error);
    throw new InternalError('Failed to process request');
  }
}
