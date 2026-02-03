# Chandler Family Blog - Project Guide

## Overview

This is a static site generator for a family blog that pulls blog post content from a Notion database and generates a fast, optimized website. It's built with **11ty** (Eleventy), styled with **Tailwind CSS**, and deploys as a static site.

Think of it as a bridge between Notion (your content management system) and a published website. You write and organize posts in Notion, and this tool automatically transforms them into a beautiful, fast website.

## Architecture

### The Big Picture

```
Notion Database (source of truth)
         ↓
Notion API (fetch posts & blocks)
         ↓
11ty Build Process (generate HTML)
         ↓
Static Site (public/ folder)
         ↓
Deployed Website
```

### Key Components

#### 1. **Data Layer** (`src/_data/`)
- `notion.js`: Fetches blog posts and their content from Notion via the API
- `posts.js`: Legacy data source (attempts to fetch from external API, now returns empty)
- `helpers.js`: Utility functions

**How it works:**
1. `notion.js` queries your Notion database for posts with Status = "Published"
2. It extracts text content, images, metadata from Notion's response
3. It fetches the page blocks (the actual content) from each post
4. Converts Notion blocks (paragraphs, headings, images) to markdown format
5. Returns structured post objects that 11ty can render

#### 2. **Templates Layer** (`src/_templates/`)
- `default.liquid`: Main layout template for all pages
- `_metadata.liquid`: (inlined in default.liquid) OpenGraph/Twitter meta tags
- `_footer.liquid`: (inlined in default.liquid) Footer with copyright year

**Important Note:** Liquid templates in this project use a modified syntax - inline template includes are used instead of separate includes to avoid context passing issues with the Eleventy/LiquidJS combo.

#### 3. **Content Layer** (`src/`)
- `index.md`: Homepage - displays all Notion posts in a grid
- `about.md`: About page - static markdown
- `post.md`: Post detail template - pagination pulls individual posts from Notion data

#### 4. **Styles** (`src/styles/`)
- `tailwind.css`: Tailwind CSS configuration and custom styles
- Compiled to `src/_tmp/style.css` during build, then copied to `public/css/style.css`

### Build Pipeline

```
npm run build/start
    ↓
Load .env (NOTION_TOKEN, DATABASE_ID)
    ↓
11ty processes data files (src/_data/*.js)
    ↓
notion.js queries Notion API v2025-09-03
    ↓
Extract posts → Fetch blocks → Convert to markdown
    ↓
Render Liquid templates with post data
    ↓
Generate HTML files in public/
    ↓
PostCSS processes Tailwind CSS
    ↓
Output optimized CSS to public/css/style.css
    ↓
Complete static site ready to deploy
```

## Technologies & Why We Use Them

### **11ty (Eleventy)**
A lightweight, zero-config static site generator. We chose it because:
- Fast build times
- Simple data file system (11ty loads files in `_data/` as global data)
- Works great with Liquid templates (our choice for simplicity)
- No client-side JS bloat

### **Notion API**
Provides structured access to your Notion database as JSON. Instead of manually updating the site, you just update Notion and redeploy.

### **Tailwind CSS**
Utility-first CSS framework for rapid styling. We chose it because:
- Fast development - just add class names
- Small output when using purge/content configuration
- Responsive design built-in
- No unused CSS in production

### **Liquid Templates**
Template language used by 11ty. Similar to Jinja2/Jekyll templates. Familiar if you've used Shopify or Jekyll.

## Recent Major Changes: Notion API Migration (Feb 2025)

### The Problem
Notion depreciated the old database-centric API. They moved to a **data source architecture** where databases can contain multiple linked data sources, requiring API changes.

### What Changed
**Before (2021-08-16 API):**
```
POST /databases/{database_id}/query
```

**After (2025-09-03 API):**
```
PATCH /data_sources/{data_source_id}/query
```

### How We Fixed It
1. Added `getDataSourceId()` function that fetches the database and extracts the data source ID
2. Updated all API calls to use `/data_sources/` endpoints
3. Updated API version header from `2021-08-16` to `2025-09-03`
4. Added defensive null-checking with optional chaining (`?.`) throughout to handle API response variations

### Lessons Learned
- Third-party APIs change. Always handle responses defensively
- Use optional chaining (`?.`) for nested object access - it prevents crashes when properties are missing
- Cache API responses when possible (we use `@11ty/eleventy-cache-assets` to cache for 1 day)
- Version headers matter - always update them when APIs are deprecated

## Build Errors We Fixed

### 1. **Liquid Template Syntax Error** (Line 13, default.liquid)
**Problem:** Used `+` operator for string concatenation
```liquid
{{ metadata.url + page.url }}  ❌
```
**Solution:** Use Liquid's `append` filter
```liquid
{{ metadata.url | append: page.url }}  ✅
```
**Why:** Liquid doesn't support `+` for concatenation; you must use filters.

### 2. **Undefined Page Date in Footer** (Line 4, _footer.liquid)
**Problem:** Not all pages have a `page.date` property, causing crashes
```liquid
{{ page.date | date: "%Y" }}  ❌ Fails if page.date is undefined
```
**Solution:** Add conditional check with fallback
```liquid
{% if page.date %}{{ page.date | date: "%Y" }}{% else %}{{ "now" | date: "%Y" }}{% endif %}  ✅
```

### 3. **Posts Data Source Error Handling** (posts.js)
**Problem:** External API endpoint returns 404, crashing the build
**Solution:** Added try-catch with empty array fallback
```javascript
} catch (error) {
    console.error(error);
    return [];  // Return empty array on failure
}
```
**Why:** Graceful degradation - the site builds successfully even if external data isn't available.

### 4. **Notion API Response Structure Changes** (notion.js)
**Problem:** New API returns different response structure, causing "Cannot read properties of undefined" errors
**Solution:**
- Added defensive checks before accessing nested properties
- Used optional chaining (`?.`) and null coalescing (`||`)
- Added try-catch in property mapping functions
- Filter out empty/invalid blocks from output

```javascript
mdText = blockContent?.text?.[0]?.text?.content || '';  // Safe access
```

## Key Code Patterns

### Pattern 1: Caching API Responses
```javascript
const data = await Cache(url, {
    duration: "1d",  // Cache for 1 day
    type: "json",
    fetchOptions: { /* axios options */ }
});
```
This prevents hammering the Notion API on every build.

### Pattern 2: Defensive Object Access
```javascript
// Instead of:
const name = response.data.user.name  // Crashes if any property is undefined

// Use:
const name = response?.data?.user?.name || 'Unknown'  // Safe, with fallback
```

### Pattern 3: Array Mapping with Filtering
```javascript
const validItems = items
    .map(transformItem)
    .filter(item => item != null)  // Remove nulls/undefined
    .join('\n');
```

## Common Tasks

### Adding a New Blog Post
1. Create a page in your Notion database
2. Set Status = "Published"
3. Run `npm run build` or wait for automated deploy
4. Post appears on the site

### Updating Styles
1. Edit `src/styles/tailwind.css`
2. Run `npm run start` (auto-recompiles)
3. Changes appear in browser instantly

### Debugging Notion Integration
1. Check `.env` file has valid `NOTION_TOKEN` and `DATABASE_ID`
2. Run `npm run build` and look for "Fetching:" log messages
3. Check if Notion integration has database access in https://www.notion.so/my-integrations

## Deployment

Currently deploys to Netlify. The build command is:
```bash
npm run build
```

This generates the static site in the `public/` folder which is then deployed.

## Performance Notes

- **Static site:** No server-side rendering, pure HTML/CSS/JS
- **Caching:** Notion API responses cached for 1 day (set in `notion.js`)
- **CSS:** Tailwind purges unused styles, keeping bundle small
- **Images:** Hosted externally (via Notion), not bundled

## Potential Improvements

1. **Image optimization**: Currently hotlinks from Notion. Could download and optimize images locally
2. **Search**: Could add client-side search using a library like Lunr.js
3. **Comments**: Could add Disqus or similar for post comments
4. **Analytics**: Could add Google Analytics or Plausible
5. **RSS Feed**: Could generate RSS feed for subscribers
6. **Incremental builds**: Could use 11ty's incremental build feature for faster rebuilds

## When Things Break

### Build fails with "Cannot read properties of undefined"
→ Notion API response format changed. Check `notion.js` property mapping logic.

### Posts not appearing
→ Check Notion: Status must = "Published" and integration must have access.

### Styles not updating
→ Run `npm run start` again, Tailwind needs to recompile.

### Git push permission denied
→ SSH key issue. Check `~/.ssh/config` - need separate keys for personal vs enterprise accounts.

---

**Last Updated:** February 2025
**Current API Version:** Notion API 2025-09-03
**Framework:** 11ty 3.1.2
**Styling:** Tailwind CSS 3.4.19
