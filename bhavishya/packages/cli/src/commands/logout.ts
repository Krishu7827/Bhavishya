import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';

const FUTURE_DIR = path.join(homedir(), '.future');
const CREDENTIALS_FILE = path.join(FUTURE_DIR, 'credentials.json');

export const logoutCommand = new Command('logout')
  .description('Logout from Future')
  .action(async () => {
    console.log('👋 Logging out...\n');

    if (fs.existsSync(CREDENTIALS_FILE)) {
      fs.unlinkSync(CREDENTIALS_FILE);
      console.log('✅ Credentials removed.\n');
    } else {
      console.log('ℹ️  No credentials found.\n');
    }

    console.log('You have been logged out. Run `future login` to authenticate again.');
  });
