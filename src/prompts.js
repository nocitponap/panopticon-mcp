import { z } from 'zod';

/**
 * Starter prompts.
 *
 * Clients surface these in a menu, which is the difference between a non-coder
 * seeing "18 tools" and seeing four things they might actually want to ask.
 * They are phrased as questions, not as tool invocations, because the model
 * picks the tools.
 */
export function registerPrompts(server) {
    const text = (s) => ({ messages: [{ role: 'user', content: { type: 'text', text: s } }] });

    server.registerPrompt('catch_me_up', {
        title: 'Catch me up on the archive',
        description: 'What has been happening lately: activity, who is posting, what the busy threads are, and what is on the front page.'
    }, () => text(
        'Catch me up on the archive. Start with qbn_overview, then summarise: how busy it has been '
        + 'versus normal, who is driving the activity, what the busiest threads are about, '
        + 'and anything notable on the front page. Link the threads you mention.'
    ));

    server.registerPrompt('most_active', {
        title: 'Who is most active?',
        description: 'Rank the most active users over a period, and say what they have been posting about.',
        argsSchema: {
            period: z.string().optional()
                .describe('e.g. "the past week", "this month", "2024", "all time". Defaults to the past week.')
        }
    }, ({ period }) => text(
        `Who has been the most active over ${period || 'the past week'}? `
        + 'Rank them, then for the top few say what they have actually been posting about '
        + 'rather than only giving numbers.'
    ));

    server.registerPrompt('about_user', {
        title: 'Tell me about a user',
        description: 'A profile of one user: who they are, how long they have been around, how active, and what they post about.',
        argsSchema: { username: z.string().describe('A handle, or a name to search for') }
    }, ({ username }) => text(
        `Tell me about the user "${username}". If that is not an exact handle, use find_user first. `
        + 'Cover: who they are from their profile, when they joined and how long they have been active, '
        + 'how their activity has changed over time, which threads they post in most, and a few '
        + 'representative recent posts. Link them.'
    ));

    server.registerPrompt('thread_history', {
        title: 'Summarise a thread',
        description: 'Read a thread and summarise what it is about and how it developed.',
        argsSchema: { topic: z.string().describe('A topic ID, or words from the thread title') }
    }, ({ topic }) => text(
        `Summarise the thread "${topic}". If that is not a numeric topic ID, find it with `
        + 'search_topics first. Cover what it is about, who the main participants are, how it '
        + 'developed over time, and quote a few posts that capture it. Note if it is still active.'
    ));

    server.registerPrompt('how_qbn_changed', {
        title: 'How has the community changed?',
        description: 'The long view: activity and community size across the whole archive since 2001.'
    }, () => text(
        'How has the community changed over its lifetime? Use site_activity_over_time with '
        + 'granularity=year for the whole archive, and describe the arc: when it peaked, how '
        + 'the active population has changed, and where it stands now compared with its peak. '
        + 'Be precise with the numbers.'
    ));
}
