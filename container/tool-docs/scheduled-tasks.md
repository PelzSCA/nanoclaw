## Scheduled Tasks

You have access to task scheduling tools via MCP. You can create recurring or one-time tasks that run as full agent invocations.

Available MCP tools:
- `schedule_task` — Create a new scheduled task (cron, interval, or one-time)
- `update_task` — Modify an existing task's prompt, schedule type, or schedule value
- `list_tasks` — List all scheduled tasks for this group
- `pause_task` / `resume_task` — Temporarily pause or resume a task
- `cancel_task` — Delete a scheduled task

### Context modes

- **group**: Task runs with access to the group's conversation history and memory. Use for tasks that need context about ongoing discussions.
- **isolated**: Task runs in a fresh session with no prior history. Include all necessary context in the prompt. Use for independent, self-contained tasks.

### Schedule formats

All times are **local timezone**:
- **cron**: Standard cron expression (e.g., `0 9 * * *` for daily at 9am, `*/5 * * * *` for every 5 minutes)
- **interval**: Milliseconds between runs (e.g., `300000` for 5 minutes, `3600000` for 1 hour)
- **once**: Local timestamp without timezone suffix (e.g., `2026-02-01T15:30:00`)
