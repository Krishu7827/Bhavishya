-- agentmarket Supabase Schema
-- Run this in your Supabase SQL Editor to create the agents table

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create agents table
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  specialty TEXT[] NOT NULL,
  price_per_million_input_tokens DECIMAL(10, 4) NOT NULL,
  price_per_million_output_tokens DECIMAL(10, 4) NOT NULL,
  wallet_address TEXT NOT NULL,
  mcp_endpoint TEXT NOT NULL,
  rating DECIMAL(3, 2) DEFAULT 0,
  total_tasks INTEGER DEFAULT 0,
  response_time_avg DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_agents_specialty ON agents USING GIN (specialty);
CREATE INDEX IF NOT EXISTS idx_agents_rating ON agents (rating DESC);
CREATE INDEX IF NOT EXISTS idx_agents_created_at ON agents (created_at DESC);

-- Add RLS (Row Level Security) policies
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read agents (for discovery)
CREATE POLICY "Anyone can read agents"
  ON agents
  FOR SELECT
  USING (true);

-- Only authenticated users can insert agents
CREATE POLICY "Authenticated users can insert agents"
  ON agents
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Agents can only update their own records
-- Note: You'll need to add a user_id column if you want user-specific updates
-- For now, allowing authenticated users to update any agent
CREATE POLICY "Authenticated users can update agents"
  ON agents
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function
CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing (optional)
-- Uncomment the lines below to add test agents

-- INSERT INTO agents (name, specialty, price_per_million_input_tokens, price_per_million_output_tokens, wallet_address, mcp_endpoint, rating, total_tasks, response_time_avg)
-- VALUES 
--   ('TaxBot Pro', ARRAY['accounting'], 0.30, 1.50, '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1', 'https://taxbot.example.com/mcp', 4.9, 156, 45.2),
--   ('LedgerAgent', ARRAY['accounting'], 0.25, 1.25, '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199', 'https://ledger.example.com/mcp', 4.7, 89, 32.5),
--   ('InvoiceSpecialist', ARRAY['accounting'], 0.20, 1.00, '0xdD2FD4581271e230360230F9337D5c0430Bf44C0', 'https://invoice.example.com/mcp', 4.8, 203, 28.1),
--   ('ContractReviewer', ARRAY['legal'], 0.50, 2.00, '0xbDA5747bFD65F08deb54cb465eB87D40e51B197E', 'https://contract.example.com/mcp', 4.6, 67, 120.5),
--   ('UIDesignBot', ARRAY['design'], 0.40, 1.75, '0x2546BcD3c84621e976D8185a91A922aE77ECEc30', 'https://uidesign.example.com/mcp', 4.8, 142, 85.3);

-- Grant necessary permissions
-- This allows the anon key to access the table
GRANT SELECT ON agents TO anon;
GRANT INSERT, UPDATE ON agents TO authenticated;
