/**
 * Host and Origin validation.
 *
 * The SDK can do this (`allowedHosts` / `enableDnsRebindingProtection`) but all
 * three options are marked deprecated in 1.30.0 in favour of external
 * middleware, and the SDK's own check compares Host as an exact string — so
 * `example.com` and `example.com:443` are two different values, and a client
 * that spells the port out is refused for no reason. This compares after
 * normalising away a *default* port, and covers whatever routes it is mounted
 * on rather than only the transport's.
 *
 * What it actually defends against: a DNS-rebinding attacker resolving a name
 * they control to this address so a victim's browser posts here as a
 * same-origin request, and anyone pointing their own hostname at this tunnel.
 * It is not a substitute for the endpoint being read-only — it is the reason
 * `publicUrl()` can trust `Host` as its development fallback.
 */

/** Strip the port only when it is the default for the scheme. */
const stripDefaultPort = (host, proto) =>
    host.replace(proto === 'https' ? /:443$/ : /:80$/, '');

/**
 * Accepts `https://mcp.example.com`, a bare `mcp.example.com`, or `host:port`.
 *
 * The scheme test is load-bearing, not a shortcut: `new URL()` does not throw on
 * `example.com:10000` — it reads it as scheme `example.com:` with path `10000`
 * and returns an empty host. Only parse what actually looks like an origin.
 */
const hostOf = (value) => {
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) return value;
    try {
        return new URL(value).host;
    } catch {
        return value;
    }
};

/**
 * The Host values this server will answer on: the canonical origin, any extras
 * (the Tailscale Funnel fallback during a cutover — remember its port is part
 * of the Host header), and the loopback forms the README's smoke-test curls and
 * `scripts/check-url.sh` use.
 */
export function buildAllowlist() {
    const origin = process.env.PUBLIC_ORIGIN;
    const extra = (process.env.ALLOWED_HOSTS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    const port = process.env.PORT || '3002';

    return new Set([
        ...(origin ? [hostOf(origin)] : []),
        ...extra.map(hostOf),
        `127.0.0.1:${port}`,
        `localhost:${port}`,
        `[::1]:${port}`
    ]);
}

export function hostGuard(allowed) {
    // Nothing configured means someone is running this straight from a clone.
    // Fail open rather than make a plain `npm start` answer 403.
    if (allowed.size === 0) return (_req, _res, next) => next();

    const isLocal = (h) =>
        h.startsWith('127.') || h.startsWith('localhost') || h.startsWith('[');
    const allowedOrigins = new Set(
        [...allowed].map((h) => `${isLocal(h) ? 'http' : 'https'}://${h}`)
    );

    const deny = (res, what) => res.status(403).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: `Forbidden: unrecognised ${what}.` },
        id: null
    });

    return (req, res, next) => {
        const host = req.get('host');
        // A missing Host is HTTP/1.0 or a hand-rolled client. Every real client
        // sends one, and it is the value this whole check rests on.
        if (!host || !allowed.has(stripDefaultPort(host, req.protocol))) {
            return deny(res, 'Host');
        }

        // Absent on server-to-server requests (Claude's connector sends none)
        // and on top-level browser navigation. Only present-and-wrong is a lie.
        const origin = req.get('origin');
        if (origin && !allowedOrigins.has(origin)) return deny(res, 'Origin');

        next();
    };
}
