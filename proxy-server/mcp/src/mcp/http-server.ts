/**
 * HTTP Server for MCP with Payment Support
 * Express-based server with payment middleware
 */

import express, { Request, Response } from 'express';
import { callAgentmarketScan } from './tools.js';
import { createPaymentMiddleware } from '../payments/payment-handler.js';

const PORT = process.env.PORT || 3000;

/**
 * Create Express app with payment middleware
 */
function createMCPServer() {
  const app = express();

  // Middleware
  app.use(express.json());

  // CORS
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Payment-Proof');
    
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'agentmarket-mcp',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      network: process.env.NODE_ENV === 'production' ? 'Base Mainnet' : 'Base Sepolia'
    });
  });

  // MCP endpoint with optional payment middleware
  // Payment can be enabled by setting PRICE_PER_REQUEST > 0
  const pricePerRequest = parseFloat(process.env.PRICE_PER_REQUEST || '0');
  
  if (pricePerRequest > 0) {
    app.use('/mcp', createPaymentMiddleware({
      platformWallet: process.env.PLATFORM_WALLET_ADDRESS,
      pricePerRequest
    }));
  }

  // MCP tool execution endpoint
  app.post('/mcp', async (req: Request, res: Response) => {
    try {
      const request = req.body;

      // Handle agentmarket_scan tool
      if (request.method === 'tools/call' && request.params?.name === 'agentmarket_scan') {
        const args = request.params.arguments || {};
        const result = await callAgentmarketScan(args);
        
        res.json(result);
      } else {
        res.status(400).json({
          error: 'Invalid request',
          message: 'Only agentmarket_scan tool is supported'
        });
      }
    } catch (error) {
      console.error('Error handling request:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not found',
      routes: {
        'GET /health': 'Health check',
        'POST /mcp': 'MCP tool execution'
      }
    });
  });

  return app;
}

/**
 * Start HTTP server
 */
export async function startHttpServer(): Promise<void> {
  const app = createMCPServer();

  app.listen(PORT, () => {
    console.log(`🚀 agentmarket MCP HTTP server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔧 MCP endpoint: http://localhost:${PORT}/mcp`);
    
    const pricePerRequest = parseFloat(process.env.PRICE_PER_REQUEST || '0');
    if (pricePerRequest > 0) {
      console.log(`💰 Payment required: ${pricePerRequest} USDC per request`);
    } else {
      console.log(`🆓 Running in free mode (set PRICE_PER_REQUEST to enable payments)`);
    }
  });
}

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startHttpServer().catch(console.error);
}
