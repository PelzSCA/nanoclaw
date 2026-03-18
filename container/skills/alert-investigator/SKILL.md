# Alert Investigator

You may receive alert investigation tasks. When you do:

## Tools at Your Disposal

### Azure CLI (`az`)

Query resource health, metrics, activity logs, and diagnose issues.

```bash
# Check resource metrics (CPU, memory, disk, network)
az monitor metrics list --resource <resource-id> --metric "Percentage CPU" --interval PT5M --start-time 2026-03-17T00:00:00Z
az monitor metrics list --resource <resource-id> --metric "MemoryPercentage" --interval PT1M

# Recent operations on a resource group (deployments, config changes, restarts)
az monitor activity-log list --resource-group <rg> --offset 1h --output table

# Resource status and properties
az resource show --ids <resource-id>

# App Service / Web App diagnostics
az webapp log tail --name <app> --resource-group <rg>
az webapp show --name <app> --resource-group <rg> --query "state"

# VM diagnostics
az vm get-instance-view --name <vm> --resource-group <rg>
az vm list --resource-group <rg> --show-details --output table

# SQL Database
az sql db show --name <db> --server <server> --resource-group <rg>

# List resources in a group
az resource list --resource-group <rg> --output table
```

### Atlassian API (`atlassian-api`)

Search Confluence and Jira via REST API using service account Bearer auth. This tool wraps curl with the correct authentication against the `api.atlassian.com` gateway.

**Quick reference:**
```bash
atlassian-api --help                                    # Full usage
atlassian-api jira-search "<JQL>"                       # Search Jira issues
atlassian-api confluence-search "<text>"                # Search Confluence pages
atlassian-api jira GET <endpoint>                       # Raw Jira REST API
atlassian-api confluence GET <endpoint>                 # Raw Confluence REST API
atlassian-api jira POST <endpoint> '<json-body>'        # Create/update Jira resources
```

#### Jira — Searching Issues

Use JQL (Jira Query Language) for structured searches:

```bash
# Open incidents by priority
atlassian-api jira-search "project = OPS AND status = Open AND priority in (Highest, High)"

# Recent issues mentioning a resource
atlassian-api jira-search "text ~ 'vm-prod-01' AND created >= -7d"

# Unresolved issues in a project
atlassian-api jira-search "project = INFRA AND resolution = Unresolved ORDER BY priority ASC"

# Issues by component or label
atlassian-api jira-search "labels = 'database' AND status != Done"

# Service desk tickets
atlassian-api jira-search "project = SD AND 'Request Type' = 'Infrastructure Issue' AND status != Closed"
```

JQL tips:
- `text ~ "search term"` — full-text search across summary and description
- `summary ~ "exact phrase"` — search summary only
- `created >= -24h` / `created >= -7d` — relative time filters
- `priority in (Highest, High)` — match multiple values
- `ORDER BY priority ASC, created DESC` — sort results
- `AND`, `OR`, `NOT` — combine conditions

#### Jira — Getting Issue Details

```bash
# Get a specific issue with all fields
atlassian-api jira GET /rest/api/3/issue/OPS-123

# Get issue with specific fields only (faster)
atlassian-api jira GET "/rest/api/3/issue/OPS-123?fields=summary,status,priority,description,comment"

# Get issue comments
atlassian-api jira GET /rest/api/3/issue/OPS-123/comment

# List projects
atlassian-api jira GET /rest/api/3/project
```

#### Confluence — Searching Pages

```bash
# Search for runbooks or documentation
atlassian-api confluence-search "runbook CPU high"
atlassian-api confluence-search "deployment procedure database"
atlassian-api confluence-search "troubleshooting vm-prod-01"

# Search for known issues
atlassian-api confluence-search "known issue disk space"
```

#### Confluence — Getting Page Content

```bash
# Get page content (body in storage format — HTML)
atlassian-api confluence GET "/wiki/rest/api/content/12345?expand=body.storage"

# Get page content in view format (cleaner HTML)
atlassian-api confluence GET "/wiki/rest/api/content/12345?expand=body.view"

# Search with CQL (Confluence Query Language) directly
atlassian-api confluence GET "/wiki/rest/api/content/search?cql=type=page+AND+space=OPS+AND+text~'runbook'&limit=10"

# List spaces
atlassian-api confluence GET /wiki/rest/api/space

# Get pages in a specific space
atlassian-api confluence GET "/wiki/rest/api/content?spaceKey=OPS&type=page&limit=25"

# Get page children (sub-pages)
atlassian-api confluence GET "/wiki/rest/api/content/12345/child/page"
```

CQL tips:
- `type=page AND text~"search terms"` — basic text search
- `space=KEY AND text~"term"` — search within a space
- `label="runbook"` — find labelled pages
- `ancestor=12345` — pages under a parent
- `lastModified >= "2026-03-01"` — recently updated

#### Confluence — Important Spaces to Check

When investigating alerts, search these types of Confluence content:
- **Runbooks**: Step-by-step remediation procedures (`text~"runbook" AND text~"<error or resource>"`)
- **Architecture docs**: System dependencies and topology (`text~"architecture" AND text~"<service name>"`)
- **Incident postmortems**: Past incidents with root cause analysis (`text~"postmortem" OR text~"incident report"`)
- **Change logs**: Recent changes that might have caused the issue (`text~"change log" OR text~"release notes"`)

### WebSearch / WebFetch

Use for researching error messages, checking vendor status pages, finding CVE details, or looking up documentation.

```
WebSearch: "Azure App Service 502 error high CPU"
WebFetch: https://status.azure.com/en-us/status
```

### NanoClaw MCP Tools

You have access to NanoClaw-specific tools via the `nanoclaw` MCP server:

- `send_message` — Send investigation progress or findings to the user immediately
- `alert_suppress` — Suppress a noisy alert fingerprint
- `alert_subscribe` — Subscribe a group to alert patterns
- `alert_history` — Query past alert history

## Sub-Agent Spin-Off

When investigating a batch of alerts and you determine some are unrelated:
1. Use the `Task` tool with `run_in_background: true`
2. Pass the unrelated alert details and any context discovered so far
3. The sub-agent inherits all your tools (az, atlassian-api, WebSearch)
4. Continue investigating the related alerts yourself

## IPC Protocol

When investigation is complete, write results via IPC file:
- Path: `/workspace/ipc/tasks/`
- Format: JSON with `type: "alert_investigation_complete"`
- Required fields: `contextId`, `assessedPriority` (1-5), `summary`, `alertIds`

Example:
```json
{
  "type": "alert_investigation_complete",
  "contextId": "abc-123",
  "assessedPriority": 2,
  "summary": "CPU spike on vm-prod-01 caused by runaway cron job. Killed process, CPU returned to normal. Related Jira: OPS-456.",
  "alertIds": ["alert-id-1", "alert-id-2"]
}
```

## Investigation Workflow

1. **Read the alert details** — understand what fired, severity, resource, environment
2. **Check for prior knowledge** — if `<prior_knowledge>` is included in your prompt, review past findings for this alert type
3. **Check Jira** — search for open incidents or recent changes related to the resource
4. **Check Confluence** — look for runbooks, architecture docs, or past postmortems
5. **Query Azure** — check resource health, recent metrics, activity logs
6. **Research externally** — if the error message is unfamiliar, use WebSearch
7. **Correlate** — connect findings across sources to identify root cause
8. **Assess priority** — considering impact, environment, blast radius
9. **Report findings** — use `send_message` to communicate to the user
10. **Write IPC** — persist the investigation outcome for the knowledge base

## Priority Assessment Guide

When assessing priority, consider:
- **P1 (Critical)**: Production down, data loss, security breach, revenue impact
- **P2 (High)**: Degraded production service, imminent failure, user-facing errors
- **P3 (Medium)**: Non-critical service issues, performance degradation, staging failures
- **P4 (Low)**: Development environment issues, cosmetic problems, known issues with workarounds
- **P5 (Info)**: Informational, expected behaviour, maintenance notifications

Factor in:
- Environment weight: production (x2), staging (x1), dev (x0.5)
- Whether this is a known recurring issue (lower priority if known and low impact)
- Blast radius: how many users/services affected
- Time sensitivity: is this worsening or stable?
