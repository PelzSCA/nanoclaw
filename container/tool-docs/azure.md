## Azure CLI (`az`)

You have access to the Azure CLI, authenticated via service principal with Reader + Monitoring Reader access at subscription scope.

Usage examples:
```bash
az vm list -o table                              # list VMs
az monitor metrics list --resource <id>          # query metrics
az resource list -o table                        # list all resources
az aks list -o table                             # list AKS clusters
az webapp list -o table                          # list web apps
```
