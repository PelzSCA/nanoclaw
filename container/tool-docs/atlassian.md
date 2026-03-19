## Atlassian API (`atlassian-api`)

You have access to Jira and Confluence via the `atlassian-api` wrapper script.

Usage:
```bash
atlassian-api jira-search "project = OPS AND status = Open"    # search Jira issues
atlassian-api confluence-search "runbook CPU high"             # search Confluence
atlassian-api jira GET /rest/api/3/issue/OPS-123               # raw Jira API call
atlassian-api confluence GET "/wiki/rest/api/content/12345?expand=body.storage"  # raw Confluence call
atlassian-api --help                                           # full usage documentation
```
