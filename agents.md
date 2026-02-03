# Claude Agents Guide - Chandler Family Blog

This document describes how to use Claude and specialized agents to work on this project efficiently.

## Project Context

- **Framework:** 11ty static site generator with Notion API integration
- **Build Command:** `npm run build` (for production) or `npm run start` (development)
- **Key Files:**
  - `src/_data/notion.js` - Notion API integration
  - `src/_templates/default.liquid` - Main template
  - `src/styles/tailwind.css` - Styling
  - `.eleventy.js` - 11ty configuration

## When to Use Which Agent

### General Purpose Agent (`subagent_type: general-purpose`)
Use for:
- Researching Notion API changes
- Understanding existing code
- Answering questions about the codebase
- Multi-step troubleshooting

**Example:**
```
I'm getting an error in the build. Can you search the codebase for where this error comes from?
```

### Explore Agent (`subagent_type: Explore`)
Use for:
- Finding all instances of a pattern across the codebase
- Understanding codebase structure and architecture
- Discovering how different components interact
- Mapping out the data flow

**Example:**
```
How does the Notion data flow through the build process?
```

Command pattern for thorough exploration:
```bash
# Use the Explore agent for open-ended questions about code structure
Task(subagent_type: Explore, description: "Explore Notion data flow")
```

### Bash Agent (Direct Commands)
Use for:
- Running build commands (`npm run build`, `npm run start`)
- Git operations
- File operations with CLI tools
- Quick diagnostics

**Example:**
```bash
npm run build 2>&1 | grep -i "error"
```

## Common Workflows

### Debugging Build Errors
1. Run build to see error: `npm run build`
2. Use **Bash** to capture full error output
3. Use **general-purpose agent** to research what might cause it
4. Use **Explore agent** if you need to find related code
5. Fix the issue and re-run build

### Adding New Features
1. Use **Explore agent** to understand current implementation
2. Ask Claude to draft code changes
3. Use **Bash** to test and verify

### Understanding Complex Code
1. Use **Explore agent** with pattern matching: "Find all async functions in src/_data/"
2. Ask **Claude directly** to explain the pattern/flow
3. Create documentation based on findings

### Notion API Issues
1. Check `.env` file for valid token and database ID
2. Use **general-purpose agent** to research Notion API docs
3. Update code based on findings
4. Test with `npm run build`

## Key Files to Know About

| File | Purpose | Modify When |
|------|---------|-------------|
| `src/_data/notion.js` | Fetches posts from Notion | API changes, new fields needed, error handling |
| `.eleventy.js` | 11ty configuration | Build process changes, adding plugins |
| `src/_templates/default.liquid` | Main page layout | Design changes, new sections |
| `src/styles/tailwind.css` | Tailwind config | Styling changes, color schemes |
| `.env` | Environment variables | Changing Notion token or database ID |
| `package.json` | Dependencies | Adding packages, updating versions |

## Testing Changes

After making changes:

```bash
# Development - auto-recompiles, serves on localhost:8080
npm run start

# Production - one-time build
npm run build

# Check build output
ls -la public/
```

## Common Prompts for Claude

### "Explore the codebase to understand..."
```
Use the Explore agent to get thorough analysis
```

### "Why is the build failing?"
```
Run `npm run build`, then ask Claude to analyze error output
```

### "How do I...?"
```
Direct question - Claude will search for relevant code
```

### "Refactor this code"
```
Show the code or file path, ask for improvements
```

### "What are best practices for...?"
```
Direct question about patterns or approaches
```

## Performance Tips

- **Cache Notion responses:** Already configured for 1 day in `notion.js`
- **Fast builds:** 11ty is fast; most time is Notion API calls
- **Development:** Use `npm run start` to avoid full rebuilds
- **Git operations:** Use local git config for SSH key switching

## Git Workflow Notes

Since this is on personal GitHub but with enterprise SSH keys configured:
- Local config at `.git/config` switches which keys are used
- `.gitconfig` stores global user settings
- SSH config at `~/.ssh/config` routes different hosts to different keys

## Environment Variables

Must be set in `.env`:
- `NOTION_TOKEN` - API key from https://www.notion.so/my-integrations
- `DATABASE_ID` - Database ID from your Notion database URL

Format:
```
NOTION_TOKEN=ntn_XXXXX...
DATABASE_ID=xxxxx...
```

## Documentation Files

- `FOR_alchandler.md` - Complete project guide with architecture and lessons learned
- `agents.md` - This file - how to use Claude/agents on the project
- `.eleventy.js` - Inline comments explain build configuration

## Useful Commands

```bash
# See what dependencies are outdated
npm outdated

# Check current git user
git config user.name
git config user.email

# Check Notion API integration access
# Visit: https://www.notion.so/my-integrations

# View build output
npm run build 2>&1 | tail -50

# Test specific data file
node -e "require('./src/_data/notion.js')()"
```

## Quick Problem-Solving Flowchart

```
Build fails?
├─ Check error message
├─ Is it a Notion API error?
│  └─ Check NOTION_TOKEN and DATABASE_ID in .env
├─ Is it a template syntax error?
│  └─ Check for Liquid syntax issues (+ vs |append)
├─ Is it a Node error?
│  └─ Check node version: node --version (should be >=22.0.0)
└─ Something else?
   └─ Ask Claude to analyze the error
```

---

**Last Updated:** February 2025
