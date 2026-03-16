/**
 * Azure Key Vault Secret Provider
 *
 * Uses DefaultAzureCredential which automatically picks up:
 * - az CLI session (development)
 * - Managed Identity (production/Azure VMs)
 * - Environment variables (CI/CD)
 */
import { DefaultAzureCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';

import { logger } from '../logger.js';
import { SecretProvider } from '../secret-provider.js';

export function createAzureKeyVaultProvider(config: {
  vaultUrl: string;
}): SecretProvider {
  const credential = new DefaultAzureCredential();
  const client = new SecretClient(config.vaultUrl, credential);

  // Process-lifetime cache — secrets don't change during a run
  const cache = new Map<string, string>();

  return {
    name: 'azure-keyvault',
    async getSecret(secretName: string): Promise<string> {
      if (cache.has(secretName)) return cache.get(secretName)!;

      logger.debug(
        { secretName, vault: config.vaultUrl },
        'Fetching secret from Azure Key Vault',
      );
      const secret = await client.getSecret(secretName);
      if (!secret.value) {
        throw new Error(
          `Secret "${secretName}" has no value in vault ${config.vaultUrl}`,
        );
      }

      cache.set(secretName, secret.value);
      return secret.value;
    },
  };
}
