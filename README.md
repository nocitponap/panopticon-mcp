# panopticon-mcp

An [MCP](https://modelcontextprotocol.io) server over the archive of a design
and creative community: 3,916,116 replies across 567,665 topics, 2,972,803
notes and 42,796 front-page snapshots, refreshed every five minutes. The record
starts in 2001; the replies start in 2002. It answers questions like *"which
user has been most active in the past week?"*, which is the question the whole
thing was built around.

This repository is published so the code can be read. Reading it is not a
prerequisite for using the server: the deployed instance takes one address
pasted into a settings screen, and that comes first below. Everything after
"The code" is for auditing or running your own copy.

Counts measured 2026-08-25. They move as posts are deleted; `qbn_overview`
returns live figures.

---

## The address

```
https://mcp.nocitponap.com/mcp
```

You install nothing and you do not need to be a programmer. Open that address
in a browser and the server returns an install page with the address filled in
and a button to copy it. The `/mcp` path itself answers `Method not allowed` to
a browser, because it is written for an assistant rather than for a person. The
page says so. Nothing is broken.

An assistant can already read the live site by browsing it, but it sees what a
web page shows: the latest few pages, no reliable dates, nothing it can count.
Connected to this, it reads the archive directly, which is how it answers who
has been most active this week, how a thread developed over ten years, and how
busy the community is now compared with 2005.

## Claude Desktop, or Claude in a browser

1. Open **Settings**. Desktop: `Ctrl+,` on Windows, `⌘,` on Mac. Browser:
   `⌘⇧,` on Mac, or click your profile icon and choose **Settings**.
2. Click **Connectors** in the sidebar, then **Add** in the top right, then
   **Add custom connector**.
3. Paste the address above and click **Add**. There is no login step; the
   archive is public and read-only.
4. Start a new chat and ask *"Catch me up on the archive"*. Allow the
   permission prompt the first time a tool runs.

If it does not appear to be working, click the `/` or paperclip icon at the
bottom left of the message box and look under **Connectors**. "Panopticon"
should be listed with a set of suggested questions. If it is not, open
Settings → Connectors and check that it shows as connected.

Any assistant that supports MCP connectors takes the same address. The menu is
named differently from one to the next; look for connectors, or for custom
integrations.

## Claude Code

One command:

```bash
claude mcp add --transport http panopticon https://mcp.nocitponap.com/mcp
```

Then `/mcp` inside Claude Code to confirm it connected.

## Questions to ask

Five starter questions ship with the server. Click `/` in the message box, then
**Connectors**.

| Prompt | What it does |
|---|---|
| Catch me up on the archive | Activity, who is posting, the busy threads, the front page |
| Who is most active? | Ranked, over any period you name |
| Tell me about a user | Their history and what they post about |
| Summarise a thread | What it is about and how it developed |
| How has the community changed? | The whole arc since 2001 |

Or ask in your own words:

- *Who posted the most in the past week?*
- *What are the biggest threads in the archive?*
- *When did [username] join, and what do they post about?*
- *How busy is the community now compared with 2005?*
- *What was on the front page this morning?*
- *Show me the new profiles from the last few days.* Useful for spotting spam.
- *How long did that reply stay on the front page?*

## Privacy

The archive holds what was already public on the live site. It is read-only:
nothing you or an assistant does through it can post, edit or delete anything.
No account is needed and nothing about you is stored.

---

## The code

Read this part to audit the server or to run your own copy.

### Where the SQL lives

**Not here.** Every query is in `panopticon-core`, shared with
`panopticon-api`. Tools in `src/tools.js` shape arguments and delegate.
Validation, clamping and SQL all live in core, so the MCP server and the HTTP
API cannot answer the same question differently.

The previous version kept the same queries in three places: a Node API, a PHP
port, and the MCP tools. They drifted, and every fix had to be applied three
times. The PHP port has been retired.

### The core dependency

`package.json` declares `panopticon-core` as `file:../panopticon-core`, which
npm resolves as a symlink rather than a copy. It assumes the repositories sit
as siblings under one parent directory, which is how they are laid out on the
machine this runs on. Editing core takes effect here immediately, with no
reinstall, and that is the property the arrangement exists to preserve.

Core is published at
[nocitponap/panopticon-core](https://github.com/nocitponap/panopticon-core), so
the SQL is readable alongside this. A clone of this repository on its own has
nothing to link and `npm install` fails on that path. Reading the code needs no
install; running the server needs core cloned beside it.

### Server instructions and prompts

Two things exist for the audience rather than for the protocol.

- **`src/instructions.js`** is sent during `initialize` and lands in the
  model's context before any tool runs. It explains the archive, its vocabulary
  (reply versus note versus newsthread), and which numbers here are real
  measurements and which are not, so the model reports a limit rather than
  working around it.
- **`src/prompts.js`** registers the five starter questions listed above.
  Clients surface these in a menu, which is the difference between someone
  seeing 18 tools and seeing four things they might want to ask.

### Tools

Eighteen, named after questions rather than tables. The previous version
exposed seventeen tools mirroring the REST endpoints one for one
(`list_replies`, `get_reply`, `topics_by_post_count`), and choosing between
those required knowing the schema.

**Start here**

- `qbn_overview` — the state of the archive in one call: today, 7-day and
  30-day activity, the most active users this week, the busiest threads, and
  the current front page.

**People**

- `most_active_users` — rank by replies, threads started, notes or score over
  any window. This is the design brief.
- `user_profile` — one user: profile, lifetime totals, recent activity.
- `find_user` — search by handle or name. They differ: `defineipr` is
  "Define IPR".
- `user_activity_over_time` — one user's history by day, month or year.
- `user_replies`, `user_notes`.

**Content**

- `search_replies`, `get_reply` — replies with their notes attached.
- `busiest_topics`, `search_topics`, `read_thread`.
- `list_notes`, `list_profiles`, `list_newsthread`.

**The front page**

- `front_page` — now, or as it stood on a past date.
- `front_page_history` — snapshots over a window, or one reply's full
  front-page career: when it appeared, its best position, how long it lasted.

**The site**

- `site_activity_over_time` — replies, active users, new threads and profiles,
  by day, month or year across the whole archive.

`qbn_overview` keeps its name because it is protocol surface that clients have
already been configured against. Renaming it would break them.

### Project layout

```
src/
  index.js            entry point; picks transport
  server.js           builds the McpServer
  tools.js            every tool definition
  instructions.js     the initialize-time briefing
  prompts.js          five starter questions
  landing.js          the install page, generated from the live registries
  guard.js            Host allowlist
  lib.js              result helpers and shared zod fragments
  transports/
    stdio.js          stdio transport
    http.js           Express and Streamable HTTP transport
```

The install page counts its own commands and tools by handing the registries a
stub that records instead of registering, so it cannot advertise a tool the
server does not expose. A hand-maintained table did exactly that, claiming 22
tools against 18 real ones, and was deleted on 2026-08-22 rather than fixed.

---

## Requirements

- Node.js 20 or later
- [`panopticon-core`](https://github.com/nocitponap/panopticon-core) cloned as a sibling directory
- Access to a local mirror of the archive, never the remote source of truth

## Configuration

```bash
cp .env.example .env
```

| Variable | Purpose | Default |
|---|---|---|
| `DB_HOST` | MySQL host | none |
| `DB_USER` | MySQL user | none |
| `DB_PASSWORD` | MySQL password | none |
| `DB_DATABASE` | MySQL database name | none |
| `MCP_TRANSPORT` | `stdio` or `http` | `stdio` |
| `PORT` | HTTP port, HTTP transport only | `3002` |
| `PUBLIC_ORIGIN` | Address the install page hands out, and an accepted Host | none |

## Transports

### stdio, the default

```bash
npm start
```

Speaks MCP over stdin and stdout. This is what local MCP clients spawn
directly.

### HTTP

```bash
npm run start:http        # or MCP_TRANSPORT=http npm start
```

Listens on `http://127.0.0.1:3002/mcp` for POST. Each request is stateless: the
server builds a fresh MCP instance per request, which is sound for the
read-only tools exposed here. It binds loopback, and public access is expected
to arrive through a tunnel or reverse proxy rather than by this process
listening on every interface.

The Host header is what the server validates, so `PUBLIC_ORIGIN` and
`ALLOWED_HOSTS` must name every address clients actually use.

```bash
npm run dev               # node --watch
```

## Smoke test

```bash
curl -s -X POST http://127.0.0.1:3002/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

```
event: message
data: {"result":{"tools":[{"name":"qbn_overview","title":"Archive overview",
"description":"The current state of the community in one call: reply/user/topic
counts for today, the last 7 days and the last 30 days, ...
```

## A local client over stdio

```json
{
  "mcpServers": {
    "panopticon": {
      "command": "node",
      "args": ["/absolute/path/to/panopticon-mcp/src/index.js"],
      "env": {
        "DB_HOST": "127.0.0.1",
        "DB_USER": "your_database_user",
        "DB_PASSWORD": "your_database_password",
        "DB_DATABASE": "your_database_name"
      }
    }
  }
}
```

With `.env` populated the `env` block can be omitted; the server loads `.env`
on startup. `npm link` installs the `panopticon-mcp` bin, after which the
client entry becomes `"command": "panopticon-mcp", "args": []`.

---

## What this cannot tell you

The server refuses questions the archive cannot honestly answer rather than
returning a plausible number. The refusals are correct, not errors to retry
differently. An assistant will say so, and that can read as a malfunction.

- **Notes have no timestamp of their own.** The source never exposed when a
  note was written. The only time a note carries is `observed_at`, when the
  scraper saw it, and 2,809,581 of 2,972,803 notes have none: they were
  recovered from an old column that recorded the note without recording when it
  was read. So note *coverage* runs the whole archive and note *activity* over
  time does not. A count of notes on a thread or a user is sound for all of
  history. A count of notes per day is real only from the notes epoch of
  2024-04-24, counts the 163,344 notes watched arriving, and 83,958 of those
  share one bulk-import instant of 2024-04-23. Windowed note rankings before
  the epoch are rejected. There is no route around this; the timestamps were
  never recorded.

  *Revised 2026-08-25.* Previously stated as "note timestamps are scrape times,
  covering 163,268 notes from 2024 onward". The blob backfill of 2026-08-22
  carried note coverage back to 2002, which splits the old single claim into
  the coverage half and the activity half above.

- **Note markup was not captured for the back catalogue.** 2,874,005 notes
  carry text and no HTML, and `html_comment` reports `null` for them. The
  markup exists only on the live site.

- **Note position is where a note stood when it was first seen**, not where it
  stands now. Notes deleted from the live site are kept, because they exist
  nowhere else, so a reply's stored notes can outnumber what the live site
  shows.

- **Deleted content is invisible.** 251,122 replies and 145,414 topics are
  tombstones: the ID exists, the body is empty, the content is gone. They are
  excluded everywhere. IDs therefore have gaps. A missing ID means deleted, not
  missing data. The bodies were never captured, so there is no route around
  this.

- **Pre-2024 topic times may be up to an hour late.** The source stamped every
  topic `-0800` regardless of daylight saving until 2024. Reply times in the
  same thread are unaffected and are the finer signal; use them.

- **Reply bodies are not searchable.** Thread titles are. `search_replies`
  filters by user, topic, date and score, not by the text of a post.

- **Score is one net number.** Up and down votes are not stored separately, so
  a reply at zero and a reply at plus-forty-minus-forty are the same row.

Everything else is complete from 2001 onward: replies, threads, notes,
profiles, and front-page history.

---

## Licence

MIT. Copyright (c) 2026 Anthony Lazaro. See [`LICENSE`](./LICENSE).

The licence covers this code and not the archive. Those posts were written by
the members of a community that never chose a licence for them, and this
repository claims nothing over them.

The reason for MIT rather than something with teeth: this is published to be
read, copied and argued with. If it moves you to build your own instrument over
your own corner of the web, take whatever is useful here and do that. No
permission needed.
