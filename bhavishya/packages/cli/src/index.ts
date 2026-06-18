#!/usr/bin/env node
import { Command } from 'commander';
import { loginCommand } from './commands/login';
import { publishCommand } from './commands/publish';
import { listCommand } from './commands/list';
import { infoCommand } from './commands/info';
import { unpublishCommand } from './commands/unpublish';
import { askCommand } from './commands/ask';
import { useCommand } from './commands/use';
import { logoutCommand } from './commands/logout';

const program = new Command();

program
  .name('future')
  .description('CLI tool for discovering and using published AI models')
  .version('1.0.0');

// Register commands
program.addCommand(loginCommand);
program.addCommand(publishCommand);
program.addCommand(listCommand);
program.addCommand(infoCommand);
program.addCommand(unpublishCommand);
program.addCommand(askCommand);
program.addCommand(useCommand);
program.addCommand(logoutCommand);

// Default help
program.parse();
