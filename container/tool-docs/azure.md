## Azure CLI (`az`)

You have access to the Azure CLI, authenticated via service principal with Reader + Monitoring Reader access at subscription scope.

**Important:** Always use `--query` (JMESPath) for server-side filtering and `-o table`/`-o tsv` for readable output. Do NOT pipe `az` JSON through `head` or `grep` — the output is large and you will miss results or break JSON parsing.

Usage examples:
```bash
# Search for resources by name (case-insensitive via contains + to_lower)
az resource list --query "[?contains(to_lower(name), 'searchterm')].[name,type,resourceGroup]" -o table

# List specific resource types
az functionapp list -o table
az webapp list -o table
az vm list -o table
az aks list -o table

# Get details for a specific resource
az functionapp show --name MyApp --resource-group my-rg -o table
az webapp show --name MyApp --resource-group my-rg -o table

# Query metrics
az monitor metrics list --resource <resource-id> --metric "Requests" --interval PT1H -o table

# Filter by resource group
az resource list --resource-group my-rg -o table

# Combine filters
az resource list --query "[?contains(name, 'search') && type=='Microsoft.Web/sites']" -o table
```
