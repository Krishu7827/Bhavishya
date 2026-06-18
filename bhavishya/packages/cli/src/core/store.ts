import { StoredCredentials } from '@future/shared';
import { homedir } from 'os';
import { join } from 'path';

const CREDENTIALS_FILE = 'credentials.json';
const CLAIMS_DIRECTORY = '.future';

export function getClaimsDir(): string {
  return join(homedir(), CLAIMS_DIRECTORY);
}

export function getCredentialsPath(): string {
  return join(getClaimsDir(), CREDENTIALS_FILE);
}

export interface CredentialStore {
  load(): Promise<StoredCredentials | null>;
  save(credentials: StoredCredentials): Promise<void>;
  clear(): Promise<void>;
}
