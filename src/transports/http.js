import express from 'express';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { buildServer } from '../server.js';
import { closePool } from 'panopticon-core';
import { landingPage } from '../landing.js';
import { buildAllowlist, hostGuard } from '../guard.js';

export async function startHttp() {
    // 3002, not 3001: the API owns 3001, and guard.js builds its loopback
    // allowlist from the same default. Until 2026-08-22 this said 3001, so a
    // clone with PORT unset bound the API's port and then rejected its own
    // requests, because the Host it received was not the one guard.js allowed.
    const port = parseInt(process.env.PORT) || 3002;
    // Bind to loopback by default. Public access should arrive through a tunnel
    // or reverse proxy, not by this process listening on every interface.
    const host = process.env.HOST || '127.0.0.1';

    const app = express();

    // Must be a NUMBER of proxy hops, not `true`. `true` trusts the whole
    // X-Forwarded-For chain, letting a client spoof its IP past the limiter.
    app.set('trust proxy', Number(process.env.TRUST_PROXY || 0));
    app.disable('x-powered-by');

    // Bounded: an MCP request body is small, and this endpoint may be exposed.
    app.use(express.json({ limit: '256kb' }));

    // Which Host values this server answers /mcp on. Built once: the allowlist
    // is configuration, not per-request state.
    const guard = hostGuard(buildAllowlist());

    app.get('/healthz', (_req, res) => res.type('text').send('ok'));

    // A crude backstop, not real protection — and deliberately generous.
    //
    // Claude Desktop and claude.ai connect to a remote MCP server from
    // Anthropic's infrastructure rather than from each user's machine, so every
    // user's traffic arrives from a small set of shared egress IPs. A per-IP
    // limit therefore does not isolate users from each other: it pools them. A
    // tight limit would mean a handful of active people locking everyone else
    // out, which is worse than the abuse it guards against.
    //
    // What actually protects the Pi is that no query is expensive any more —
    // every tool reads a rollup or a bounded indexed range. If this ever needs
    // real per-user fairness it has to come from a token or a session, not an
    // IP address.
    const limiter = rateLimit({
        windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
        limit: Number(process.env.RATE_LIMIT_MAX || 600),
        // `CF-Connecting-IP` is set — and overwritten — by Cloudflare's edge on
        // every proxied request, so it is the one value cloudflared's
        // X-Forwarded-For handling cannot mangle. `req.ip` (which honours
        // `trust proxy`) is the fallback for the Tailscale Funnel path and for
        // local requests. ipKeyGenerator normalises IPv6 to a /56 so a client
        // cannot walk its own prefix past the limit.
        //
        // Forgeable by anything reaching this process without going through
        // Cloudflare — during a cutover, the funnel. That only bypasses the
        // crude backstop described above, and stops mattering once the funnel
        // is retired.
        keyGenerator: (req) => ipKeyGenerator(req.get('cf-connecting-ip') || req.ip),
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        message: {
            jsonrpc: '2.0',
            error: { code: -32000, message: 'Too many requests' },
            id: null
        }
    });

    // guard before limiter: a request for a Host we do not serve should not
    // spend anyone's rate-limit budget.
    app.post('/mcp', guard, limiter, async (req, res) => {
        // Stateless mode: each request gets its own server + transport pair.
        // This is the simplest correct pattern for read-only tools and avoids
        // session bookkeeping. Tool registration is cheap.
        const server = buildServer();
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined
        });

        res.on('close', () => {
            transport.close();
            server.close();
        });

        try {
            await server.connect(transport);
            await transport.handleRequest(req, res, req.body);
        } catch (err) {
            console.error('MCP request error:', err);
            if (!res.headersSent) {
                res.status(500).json({
                    jsonrpc: '2.0',
                    error: { code: -32603, message: 'Internal server error' },
                    id: null
                });
            }
        }
    });

    // A stateless server has no SSE stream to open, so the Streamable HTTP spec
    // requires 405 on GET. That is correct for an MCP client and useless to a
    // person — and pasting the URL into a browser is the first thing anyone does
    // with an address someone sent them. So the status stays 405 and only the
    // body is negotiated: JSON-RPC for a client, an explanation for a human.
    const wantsHtml = (req) =>
        !req.accepts('text/event-stream') && Boolean(req.accepts('html'));

    const methodNotAllowed = (req, res) => {
        if (wantsHtml(req)) {
            return res.status(405).type('html').send(landingPage(req, { wrongMethod: true }));
        }
        res.status(405).json({
            jsonrpc: '2.0',
            error: { code: -32000, message: 'Method not allowed.' },
            id: null
        });
    };
    app.get('/mcp', guard, methodNotAllowed);
    app.delete('/mcp', guard, methodNotAllowed);

    // The root exists because a tunnel usually maps `/` here, so it is the other
    // address people will arrive on. Same page, without the apology.
    app.get('/', (req, res) => res.type('html').send(landingPage(req)));

    const httpServer = app.listen(port, host, () => {
        console.log(`Panopticon MCP (HTTP) listening on http://${host}:${port}/mcp`);
    });

    const shutdown = async () => {
        httpServer.close();
        try {
            await closePool();
        } finally {
            process.exit(0);
        }
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
}
