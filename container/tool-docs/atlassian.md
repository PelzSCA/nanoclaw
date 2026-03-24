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

### Reading Confluence pages

When a user asks to read a Confluence page, they may provide:
- **A URL** like `https://site.atlassian.net/wiki/spaces/TS/pages/123456/Page+Title` — extract the **page ID** (numeric) from the URL and fetch directly
- **A browser tab title** like `"Page Title - Space Name - Confluence"` — the format is always `{Page Title} - {Space Name} - Confluence`. Parse out the page title and space name separately
- **Just a page title** — search for it

**Strategy for finding a page:**

1. If you have a **page ID** (from a URL), fetch directly:
   ```bash
   atlassian-api confluence GET "/wiki/rest/api/content/{PAGE_ID}?expand=body.view"
   ```

2. If you have a **space name** (from a URL or tab title), first find the space key, then search within it:
   ```bash
   # Find the space key (use limit=100 to get all spaces, not just the first 20)
   atlassian-api confluence GET "/wiki/rest/api/space?limit=100"
   # Then search by title within that space
   atlassian-api confluence GET "/wiki/rest/api/content/search?cql=space=SPACEKEY and title='Exact Page Title'&expand=body.view"
   ```

3. For **text search** (no space/title known), use the shortcut:
   ```bash
   atlassian-api confluence-search "search terms"
   ```

**Important:** Use `expand=body.view` (rendered HTML) instead of `body.storage` (raw XML with macros) — it's much smaller and more readable. Pipe through `python3 -c "import sys,json,html,re; d=json.load(sys.stdin); print(d['title']); print(re.sub(r'<[^>]+>','',html.unescape(d['body']['view']['value'])))"` to extract clean text.
