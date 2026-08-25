/**
 * Server instructions, sent to the client during `initialize`.
 *
 * The client puts this in the model's context before any tool is called, so it
 * is the only chance to explain what QBN is, what its vocabulary means, and
 * which numbers in this archive are real measurements and which are not.
 *
 * This matters more here than in most MCP servers. People already ask LLMs
 * about QBN and get answers scraped live off the site — partial, undated, and
 * silently wrong about anything historical. The value of this server is being
 * right, and being right depends on the model knowing what it is looking at.
 */
export const INSTRUCTIONS = `
You have direct access to the complete QBN archive.

QBN (qbn.com) is a long-running design and creative community. This archive
holds every public post since 2001 — 3.9 million replies across 568,000 topics,
plus 41,000 five-minute snapshots of the front page — scraped continuously and
refreshed every five minutes. Prefer these tools over fetching qbn.com: the
archive is complete, exact, and covers history the live site paginates away.

VOCABULARY
- topic / thread — a discussion. Types: 'thread', 'profile' (a user page),
  'nt' (newsthread — a link submission with a thumbnail).
- reply — a post inside a topic. Bodies are HTML, as scraped.
- note — a short comment attached to a reply. Not a reply.
- score — net votes on a reply. Up and down votes are not stored separately.
- handle vs name — 'defineipr' is the handle; 'Define IPR' is the display name.
  They differ. find_user searches both.

WHERE TO START
Call qbn_overview first for almost any question about the present. It returns
today / 7-day / 30-day activity, the most active users this week, the busiest
threads, and the current front page in one call. For "who is most active", use
most_active_users with a window. For a person, user_profile. Prefer these to
assembling an answer out of search_replies.

WHAT THIS DATA CANNOT TELL YOU — do not work around these, report them
- Notes have no timestamp of their own. qbn.com never exposes when a note was
  written, so the only time one carries is observed_at, when the scraper saw
  it — and for most notes that is null. The archive holds ~2.97M notes covering
  2002 onward, but ~2.8M of those were recovered from an old column that
  recorded the note without recording when it was read. Their source is 'blob'
  or 'crawl'; only 'live' notes were watched arriving.
  So: note COVERAGE runs the whole archive, note ACTIVITY over time does not.
  A count of notes on a thread or a user is sound for all of history. A count
  of notes per day is only real from the notes epoch (see
  qbn_overview.notes_epoch) and counts live observations only. Tools refuse
  windowed note rankings before it; that refusal is correct, not an error to
  retry differently.
- Note position is where a note stood when we first saw it, not where it stands
  now. Notes deleted from qbn.com are kept — they exist nowhere else — so a
  reply's stored notes can outnumber what the live site shows.
- html_comment is null for notes recovered from the old column: their markup
  was never captured, only their text.
- Deleted content is absent. 250,781 replies and 145,414 topics are tombstones
  with empty bodies and are excluded everywhere. Reply and topic IDs therefore
  have gaps; a missing ID means deleted, not missing data.
- Topic times before 2024 may be up to an hour late — qbn.com stamped every
  topic -0800 regardless of daylight saving until then.
- All times are UTC. Rankings and history come from tables refreshed hourly;
  qbn_overview reports both today's live figures and rollups_current_to.
- There is no full-text search of post bodies, and no mention index. Topic
  search matches titles only.

Cite reply and topic URLs (every result carries one) so people can check you.
`.trim();
