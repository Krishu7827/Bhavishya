import { Command } from 'commander';
import inquirer from 'inquirer';
import { API_BASE_URL } from '../core/config';

export const askCommand = new Command('ask')
  .description('Ask Future to suggest models for a query')
  .argument('<query>', 'The query to match models against')
  .action(async (query: string) => {
    console.log(`🔍 Finding models for: "${query}"\n`);

    // Call suggest endpoint
    const response = await fetch(`${API_BASE_URL}/suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.log(`❌ Failed to get suggestions: ${error}`);
      return;
    }

    const data = await response.json();

    if (data.suggestions.length === 0) {
      console.log('❌ No matching models found. Try a different query.');
      return;
    }

    console.log('📋 Top matches:\n');

    // Display suggestions
    data.suggestions.forEach((model: any, index: number) => {
      console.log(`   ${index + 1}. ${model.modelName}`);
      console.log(`      Publisher: ${model.publisherName}`);
      console.log(`      Tags: ${model.tags.join(', ')}`);
      console.log(`      Match: ${(model.matchScore * 100).toFixed(0)}% - ${model.whyMatched}`);
      console.log('');
    });

    // Ask user to pick one
    const choices = [
      ...data.suggestions.map((model: any, index: number) => ({
        name: `${index + 1}. ${model.modelName} (${model.publisherName})`,
        value: model.modelId,
      })),
      { name: 'None - use default Claude', value: 'none' },
    ];

    const { selectedModel } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedModel',
        message: 'Select a model to use:',
        choices,
      },
    ]);

    if (selectedModel === 'none') {
      console.log('\nℹ️  Using default Claude model.\n');
      console.log('Run: claude <your-prompt>');
      return;
    }

    console.log(`\n✅ Selected: ${selectedModel}`);
    console.log('\nTo use this model, run:');
    console.log(`   future use ${selectedModel}`);
  });
