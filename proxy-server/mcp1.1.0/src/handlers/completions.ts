import { Request, Response } from 'express';
import OpenAI from 'openai';
import { config, modelRegistry } from '../config/index.js';
import { MissingFieldError, InternalError } from '../middleware/error.js';

const openai = new OpenAI({
  apiKey: config.nvidia.apiKey,
  baseURL: config.nvidia.baseUrl,
});

export async function completionsHandler(req: Request, res: Response) {
  const { model: githubModel, prompt, stream = false } = req.body;

  // Validate required fields
  if (!prompt) {
    throw new MissingFieldError('prompt');
  }

  if (!githubModel) {
    throw new MissingFieldError('model');
  }

  // Get NVIDIA model
  const nvidiaModel = modelRegistry.getNvidiaModel(githubModel);

  try {
    if (stream) {
      // Streaming response
      const completion = await openai.completions.create({
        model: nvidiaModel,
        prompt: prompt,
        temperature: 1,
        top_p: 1,
        max_tokens: 16384,
        stream: true,
      });

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      for await (const chunk of completion) {
        const content = chunk.choices[0]?.text || '';
        
        if (content) {
          res.write(`data: ${JSON.stringify({
            id: chunk.id,
            object: 'completion.chunk',
            created: chunk.created,
            model: githubModel,
            choices: [{
              index: 0,
              text: content,
              finish_reason: null,
            }],
          })}\n\n`);
        }
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      // Non-streaming response
      const completion = await openai.completions.create({
        model: nvidiaModel,
        prompt: prompt,
        temperature: 1,
        top_p: 1,
        max_tokens: 16384,
        stream: false,
      });

      // Only return the model requested by the client
      const response = {
        ...completion,
        model: githubModel,
      };

      res.json(response);
    }
  } catch (error) {
    console.error('NVIDIA API error:', error);
    throw new InternalError('Failed to process request');
  }
}
