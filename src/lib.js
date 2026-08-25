import { z } from 'zod';
import { WINDOW_NAMES, QueryError } from 'panopticon-core';

/** A tool's payload. */
export function ok(data) {
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

/**
 * A tool failure.
 *
 * The previous implementation returned errors via jsonResult(), i.e. a
 * *successful* result whose body happened to contain an `error` key — so a
 * model could not tell a failure from data. This sets isError, which is what
 * the protocol has for the purpose.
 */
export function fail(message) {
    return { isError: true, content: [{ type: 'text', text: message }] };
}

/**
 * Wrap a query call as a tool handler.
 *
 * Tools do exactly what the HTTP routes do: shape arguments and delegate to
 * panopticon-core. Validation, clamping and SQL live there, so the MCP server
 * and the API cannot answer the same question differently.
 */
export function tool(fn) {
    return async (args) => {
        try {
            return ok(await fn(args ?? {}));
        } catch (error) {
            if (error instanceof QueryError) return fail(error.message);
            console.error('[mcp] tool failed:', error);
            return fail('Internal error querying the archive.');
        }
    };
}

// Usernames are not pattern-validated: real handles include '#1', '.....' and
// '&hearts;'. See panopticon-core/src/params.js.
export const username = z.string().min(1).max(30).describe('A user handle');

export const window = z.enum(WINDOW_NAMES)
    .describe(`Time window: ${WINDOW_NAMES.join(', ')}`);

export const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Date as YYYY-MM-DD');

export function pagination(def = 20, max = 100) {
    return {
        limit: z.number().int().min(1).max(max).optional().describe(`Max rows (default ${def})`),
        offset: z.number().int().min(0).optional().describe('Pagination offset')
    };
}
