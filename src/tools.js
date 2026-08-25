import { z } from 'zod';
import {
    replies, topics, users, notes, profiles, nt, homepage, stats, overview
} from 'panopticon-core';
import { tool, username, window, day, pagination } from './lib.js';

/**
 * Tools are named after questions, not after database tables.
 *
 * The previous server exposed seventeen tools that mirrored the REST endpoints
 * one for one — list_replies, get_reply, list_topics, topics_by_post_count and
 * so on. A model choosing between those has to know the schema to know which to
 * pick. These are named for what someone would actually ask.
 */
export function registerTools(server) {
    const t = (name, config, fn) => server.registerTool(name, config, tool(fn));

    t('qbn_overview', {
        title: 'Archive overview',
        description:
            'The current state of the community in one call: reply/user/topic counts for today, ' +
            'the last 7 days and the last 30 days, the most active users this week, ' +
            'the busiest threads this week, and the current front page. ' +
            'Start here for any "what is happening" question.',
        inputSchema: {}
    }, () => overview.get());

    t('most_active_users', {
        title: 'Most active users',
        description:
            'Rank users by activity over a time window. This answers questions like ' +
            '"who has been most active in the past week". `metric` picks what "active" ' +
            'means: replies posted, threads started, notes written, or total score received. ' +
            'Note: `notes` counts notes the scraper watched arrive, so it is only meaningful for ' +
            'recent windows — see qbn_overview.notes_epoch. Most notes in the archive have no ' +
            'known observation time and are excluded from every windowed note figure.',
        inputSchema: {
            window: window.optional(),
            from: day.optional(), to: day.optional(),
            metric: z.enum(['replies', 'topics', 'notes', 'score']).optional()
                .describe('What to rank by (default: replies)'),
            ...pagination(20, 200)
        }
    }, ({ metric, ...rest }) => users.ranking({ ...rest, sort: metric }));

    t('user_profile', {
        title: 'User profile',
        description:
            'Everything known about one user: their profile (display name, location, bio, ' +
            'avatar, endorsement status), lifetime totals, when they first and last posted, ' +
            'and how active they have been in the last 7/30/365 days.',
        inputSchema: { username }
    }, ({ username: u }) => users.get(u));

    t('find_user', {
        title: 'Find a user',
        description:
            'Search for users by handle or display name — these differ (the handle ' +
            '"defineipr" has the display name "Define IPR"), so both are searched. ' +
            'Use this when you have a partial or human-readable name rather than a handle.',
        inputSchema: { query: z.string().min(2).describe('Part of a handle or display name'),
            limit: z.number().int().min(1).max(100).optional() }
    }, ({ query, limit }) => users.find(query, { limit }));

    t('user_activity_over_time', {
        title: 'A user activity time series',
        description:
            'One user\'s activity bucketed by day, month or year — replies, threads ' +
            'started, notes and score. Use this for "when was X most active" or to chart ' +
            'someone\'s history.',
        inputSchema: {
            username,
            bucket: z.enum(['day', 'month', 'year']).optional().describe('Default: month'),
            window: window.optional(), from: day.optional(), to: day.optional()
        }
    }, ({ username: u, ...rest }) => users.timeline(u, rest));

    t('user_replies', {
        title: "A user's replies",
        description:
            'Replies posted by one user, newest first by default, with each reply\'s notes ' +
            '(comments) attached. Filter by date range.',
        inputSchema: {
            username,
            window: window.optional(), from: day.optional(), to: day.optional(),
            sort: z.enum(['recent', 'oldest']).optional(),
            notes: z.boolean().optional().describe('Attach each reply\'s notes (default: false)'),
            ...pagination(50, 200)
        }
    }, ({ username: u, ...rest }) => replies.list({ ...rest, user: u }));

    t('user_notes', {
        title: "A user's notes",
        description:
            'Notes (short comments attached to replies) written by one user, newest first. ' +
            'Each note carries the reply and topic it was left on.',
        inputSchema: { username, ...pagination(50, 200) }
    }, ({ username: u, ...rest }) => users.notes(u, rest));

    t('search_replies', {
        title: 'Search replies',
        description:
            'List replies across the archive, optionally filtered by user, topic and date ' +
            'range. Set `notes: true` to attach each reply\'s comments. For a single reply ' +
            'by id, use get_reply.',
        inputSchema: {
            user: username.optional(), topic_id: z.number().int().positive().optional(),
            window: window.optional(), from: day.optional(), to: day.optional(),
            sort: z.enum(['recent', 'oldest']).optional(),
            notes: z.boolean().optional(),
            ...pagination(50, 200)
        }
    }, (args) => replies.list(args));

    t('get_reply', {
        title: 'Get a reply',
        description: 'One reply by id, with its full text and all of its notes.',
        inputSchema: { id: z.number().int().positive() }
    }, ({ id }) => replies.get(id));

    t('busiest_topics', {
        title: 'Busiest topics',
        description:
            'Rank threads by activity. `sort=replies` works over any window; `sort=users` ' +
            '(unique participants) works for windows up to 90 days or all-time; ' +
            '`sort=notes` is all-time only, because notes have no timestamp of their own — but ' +
            'all-time now covers the whole archive back to 2002, not just recent years. ' +
            'Use window=all for the biggest threads in the archive.',
        inputSchema: {
            sort: z.enum(['replies', 'notes', 'users', 'active', 'recent']).optional()
                .describe('Default: replies'),
            window: window.optional(), from: day.optional(), to: day.optional(),
            type: z.enum(['thread', 'profile', 'nt']).optional(),
            ...pagination(20, 100)
        }
    }, (args) => topics.list({ sort: 'replies', ...args }));

    t('search_topics', {
        title: 'Search topics',
        description:
            'Find threads by title text, author, or type. Returns each topic with its ' +
            'lifetime reply/note/participant counts.',
        inputSchema: {
            search: z.string().min(2).optional().describe('Match against the thread title'),
            user: username.optional().describe('Who started the thread'),
            type: z.enum(['thread', 'profile', 'nt']).optional(),
            sort: z.enum(['recent', 'oldest', 'replies', 'notes', 'users', 'active']).optional(),
            window: window.optional(), from: day.optional(), to: day.optional(),
            ...pagination(20, 100)
        }
    }, (args) => topics.list(args));

    t('read_thread', {
        title: 'Read a thread',
        description:
            'A topic and a page of its replies in posting order, each with its notes ' +
            'attached. Use `offset` to page through long threads — check `replies_meta.has_more`.',
        inputSchema: {
            id: z.number().int().positive(),
            user: username.optional().describe('Only this user\'s replies in the thread'),
            ...pagination(50, 200)
        }
    }, ({ id, ...rest }) => topics.get(id, rest));

    t('front_page', {
        title: 'The front page',
        description:
            'The current front page, or the front page as it stood on a past date. Each ' +
            'slot carries its position, score, note count and the reply itself. Snapshots ' +
            'are taken every five minutes.',
        inputSchema: { at: day.optional().describe('Front page as of the end of this date') }
    }, (args) => homepage.latest(args));

    t('front_page_history', {
        title: 'Front page history',
        description:
            'Front-page snapshots over a window, or — with reply_id — the full front-page ' +
            'career of one reply: when it appeared, its best position and how long it stayed.',
        inputSchema: {
            reply_id: z.number().int().positive().optional(),
            window: window.optional(), from: day.optional(), to: day.optional(),
            ...pagination(50, 500)
        }
    }, ({ reply_id, ...rest }) => (
        reply_id ? homepage.forReply(reply_id, rest) : homepage.history(rest)
    ));

    t('site_activity_over_time', {
        title: 'Site activity over time',
        description:
            'Site-wide activity as a time series: replies, active users, new threads, new ' +
            'profiles and notes. `granularity=year` gives per-year totals for the whole ' +
            'archive (2001 onward). Use that for "how has the community changed over the years".',
        inputSchema: {
            granularity: z.enum(['day', 'month', 'year']).optional().describe('Default: day'),
            year: z.number().int().min(2001).max(2100).optional().describe('For granularity=month'),
            window: window.optional(), from: day.optional(), to: day.optional()
        }
    }, ({ granularity = 'day', year, ...rest }) => {
        if (granularity === 'year') return stats.years();
        if (granularity === 'month') return stats.monthly({ year });
        return stats.daily(rest);
    });

    t('list_notes', {
        title: 'List notes',
        description:
            'Notes across the archive, filtered by author, reply, topic or recency. ' +
            'Asked for one reply or topic, they come back in reading order; otherwise ' +
            'newest-seen first. Notes have no timestamp of their own, and most of the ' +
            'archive has no known observation time at all — those sort last and are ' +
            'excluded by `days` entirely. Coverage runs to 2002; per-day activity does not.',
        inputSchema: {
            user: username.optional(),
            reply_id: z.number().int().positive().optional(),
            topic_id: z.number().int().positive().optional(),
            days: z.number().int().min(1).max(365).optional(),
            ...pagination(50, 200)
        }
    }, (args) => notes.list(args));

    t('list_profiles', {
        title: 'List profiles',
        description:
            'Profiles, newest first. Useful for spotting new accounts and spam waves. ' +
            'Search matches handle or display name.',
        inputSchema: { search: z.string().min(2).optional(), ...pagination(20, 100) }
    }, (args) => profiles.list(args));

    t('list_newsthread', {
        title: 'List newsthread (NT) posts',
        description: 'Newsthread posts — link submissions with a thumbnail and target URL.',
        inputSchema: { ...pagination(20, 100) }
    }, (args) => nt.list(args));
}
