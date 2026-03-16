/**
 * Secret Provider Abstraction
 *
 * Resolves `vault:secret-name` references in token files to actual secret values
 * from an external provider (Azure Key Vault, AWS Secrets Manager, etc.).
 *
 * Config: ~/.config/nanoclaw/secrets.json
 * If absent, vault references are unsupported and plaintext values work as before.
 */
import fs from 'fs';

import { SECRETS_CONFIG_PATH } from './config.js';
import { logger } from './logger.js';

export interface SecretProvider {
  name: string;
  getSecret(secretName: string): Promise<string>;
}

export interface SecretsConfig {
  provider: string;
  [key: string]: unknown;
}

const VAULT_PREFIX = 'vault:';

export function isVaultReference(value: string): boolean {
  return value.startsWith(VAULT_PREFIX);
}

export function parseVaultReference(value: string): string {
  return value.slice(VAULT_PREFIX.length);
}

/**
 * Deep-walk an object and resolve all `vault:*` string values via the provider.
 * Returns a new object — the original is not mutated.
 * All vault references are collected first and resolved in parallel.
 */
export async function resolveSecrets<T>(
  obj: T,
  provider: SecretProvider,
): Promise<T> {
  // Collect all vault references with their paths
  const refs: Array<{ path: (string | number)[]; secretName: string }> = [];

  function walk(value: unknown, path: (string | number)[]): void {
    if (typeof value === 'string' && isVaultReference(value)) {
      refs.push({ path, secretName: parseVaultReference(value) });
    } else if (Array.isArray(value)) {
      value.forEach((item, i) => walk(item, [...path, i]));
    } else if (value !== null && typeof value === 'object') {
      for (const [key, val] of Object.entries(value)) {
        walk(val, [...path, key]);
      }
    }
  }

  walk(obj, []);

  if (refs.length === 0) return obj;

  // Resolve all secrets in parallel
  const resolved = await Promise.all(
    refs.map(async (ref) => {
      const value = await provider.getSecret(ref.secretName);
      return { path: ref.path, value };
    }),
  );

  // Deep-clone and inject resolved values
  const result = JSON.parse(JSON.stringify(obj));
  for (const { path, value } of resolved) {
    let target = result;
    for (let i = 0; i < path.length - 1; i++) {
      target = target[path[i]];
    }
    target[path[path.length - 1]] = value;
  }

  return result as T;
}

/**
 * Initialize the secret provider from ~/.config/nanoclaw/secrets.json.
 * Returns null if the file doesn't exist (plaintext-only mode).
 */
export async function initSecretProvider(): Promise<SecretProvider | null> {
  if (!fs.existsSync(SECRETS_CONFIG_PATH)) {
    logger.debug('No secrets.json found — vault references disabled');
    return null;
  }

  let config: SecretsConfig;
  try {
    config = JSON.parse(fs.readFileSync(SECRETS_CONFIG_PATH, 'utf-8'));
  } catch (err) {
    logger.error(
      { path: SECRETS_CONFIG_PATH, error: err },
      'Failed to parse secrets.json',
    );
    throw new Error(`Invalid secrets config at ${SECRETS_CONFIG_PATH}`);
  }

  switch (config.provider) {
    case 'azure-keyvault': {
      const { createAzureKeyVaultProvider } =
        await import('./secret-providers/azure-keyvault.js');
      const providerConfig = config['azure-keyvault'] as
        | { vaultUrl: string }
        | undefined;
      if (!providerConfig?.vaultUrl) {
        throw new Error(
          'secrets.json: azure-keyvault provider requires "azure-keyvault.vaultUrl"',
        );
      }
      return createAzureKeyVaultProvider(providerConfig);
    }
    default:
      throw new Error(
        `secrets.json: unknown provider "${config.provider}". Supported: azure-keyvault`,
      );
  }
}
