/**
 * The human-facing page.
 *
 * An MCP endpoint speaks POST and JSON-RPC, so the first thing anyone does with
 * a shared URL — paste it into a browser — produces
 * `{"error":{"code":-32000,"message":"Method not allowed."}}`, which reads as
 * broken. For a server whose audience is people who are not programmers, that
 * is the single most likely first impression, so it is worth handling.
 *
 * The URL shown is `PUBLIC_ORIGIN` — configured, not derived from the request.
 * See publicUrl() for why that matters more here than on an ordinary page.
 *
 * Styling is the Panopticon design system — deep plum ground, bone text,
 * orchid identity, iris signal, Space Grotesk + Space Mono. The tokens are
 * inlined rather than linked because this process serves no static assets: the
 * page has to survive being the only thing the server hands back.
 */

import { registerTools } from './tools.js';
import { registerPrompts } from './prompts.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/**
 * The address this server tells people to use.
 *
 * Canonical and configured, not derived from the request. The previous version
 * preferred `X-Forwarded-Host`, which any client can set — so a forged header
 * put someone else's address in the copy button and in the `claude mcp add`
 * snippet. Handing a visitor a URL to trust is this page's entire job, and
 * escaping the value stops the XSS but not that.
 *
 * The request-derived fallback is for local development only. It reads `Host`
 * (which hostGuard has already validated) rather than any X-Forwarded-*, and
 * `req.protocol`, which honours the `trust proxy` setting — so believing the
 * proxy becomes a deployment decision instead of something a client asserts.
 */
export function publicUrl(req) {
    const origin = process.env.PUBLIC_ORIGIN;
    if (origin) return `${origin.replace(/\/+$/, '')}/mcp`;
    return `${req.protocol}://${req.get('host') || 'localhost'}/mcp`;
}

/**
 * The eye/lens geometry, with no colour of its own — the two marks below wrap
 * it. Kept in one place so the header logo and the tab icon cannot drift.
 */
const MARK = `<ellipse transform="matrix(5.391855e-03 -1 1 5.391855e-03 13.2299 40.9005)" cx="27.18" cy="13.8" rx="2.46" ry="4.27"/>
  <path d="M40,12.52v8.15c0-1.42-0.71-2.84-2.12-4.08C39.29,15.36,40,13.94,40,12.52z"/>
  <path d="M14.35,20.59c0.01,1.89,1.27,3.78,3.78,5.23c5.02,2.89,13.14,2.91,18.14,0.03c4.36-2.51,4.89-6.4,1.6-9.27c-0.46,0.4-0.99,0.77-1.6,1.13c-4.99,2.87-13.11,2.86-18.14-0.03c-2.51-1.45-3.77-3.34-3.78-5.23"/>
  <line x1="14.35" y1="20.59" x2="14.35" y2="12.45"/>
  <path d="M18.08,10.29L0,20.7v-8.15L18.08,2.15l0,0c4.99-2.87,13.11-2.86,18.14,0.03c4.41,2.54,4.97,6.45,1.66,9.32c-0.47-0.41-1.03-0.81-1.66-1.17C31.19,7.43,23.07,7.42,18.08,10.29"/>`;

/** The eye/lens mark. Single colour, fill: currentColor, so it takes any token. */
const LOGO = `<svg width="34" height="24" viewBox="0 0 40 28" aria-hidden="true" focusable="false">
  ${MARK}
</svg>`;

/**
 * The tab icon, as a data URI.
 *
 * A linked `/favicon.ico` is not an option here for the same reason the style
 * tokens are inlined: this process serves no static assets, so anything the
 * page references by path would 404. Encoded rather than base64 so the mark
 * stays legible in source and in view-source.
 *
 * Colours are literal because a data URI carries no cascade — `currentColor`
 * and `var(--brand)` both resolve to nothing here. They restate --brand on
 * --bg; the internal stylesheet mirrors the .bar__logo rules below, so the
 * icon and the header logo render the same shape. The plum tile is deliberate:
 * the mark alone would disappear into a dark browser theme.
 */
const FAVICON = 'data:image/svg+xml,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">`
    + `<style>path,ellipse{fill:#E685D5;stroke:none}line{stroke:#E685D5;stroke-width:1.4}</style>`
    + `<rect width="40" height="40" fill="#241F26"/>`
    + `<g transform="translate(0,6)">${MARK}</g>`
    + `</svg>`
);

const STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap');

:root {
  --font-display:'Space Grotesk','Helvetica Neue',Arial,sans-serif;
  --font-mono:'Space Mono','SFMono-Regular',ui-monospace,monospace;

  --bg:#241F26; --bg-raised:#2E2833; --bg-sunken:#1D191F;
  --fg:#DCD8CF; --fg-2:#9C968C; --fg-3:#6E6A63;
  --rule:#3D3640; --rule-strong:#DCD8CF;

  --brand:#E685D5;    /* orchid  — identity */
  --accent:#9B8CF2;   /* iris    — signal   */
  --peak:var(--accent); /* alias since 2026-08-22 */
  --accent-on:#241F26;

  --shadow-hard:3px 3px 0 0 #120F13;
  --shadow-hard-accent:3px 3px 0 0 #9B8CF2;
  --ease:cubic-bezier(0.2,0,0,1);
  --dur-1:90ms; --dur-2:160ms;
  --bw:1.5px; --bw-rule:3px;
}

*{box-sizing:border-box;}
html{background:var(--bg);}
body{margin:0;background:var(--bg);color:var(--fg);font-family:var(--font-display);
  font-size:17px;line-height:1.55;-webkit-font-smoothing:antialiased;
  background-image:radial-gradient(rgba(255,255,255,.02) .5px,transparent .6px);
  background-size:5px 5px;}

/* ---- micro-type ---- */
.label{font-family:var(--font-mono);font-size:11px;font-weight:700;letter-spacing:.14em;
  text-transform:uppercase;line-height:1.1;color:var(--fg-3);}
.mono{font-family:var(--font-mono);font-variant-numeric:tabular-nums;}
.caption{font-family:var(--font-mono);font-size:11px;letter-spacing:.04em;color:var(--fg-3);line-height:1.35;}

a{color:var(--brand);text-decoration:none;}
a:hover{text-decoration:underline;text-underline-offset:3px;}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px;}

/* ---- manifest bar ---- */
.bar{position:sticky;top:0;z-index:30;display:flex;align-items:center;gap:20px;
  padding:13px 30px;background:var(--bg);border-bottom:var(--bw-rule) solid var(--rule-strong);}
.bar__logo{color:var(--brand);display:inline-flex;}
.bar__logo svg path,.bar__logo svg ellipse{fill:currentColor;stroke:none;}
.bar__logo svg line{stroke:currentColor;stroke-width:1.4;}
.bar__word{font-family:var(--font-mono);font-weight:700;font-size:16px;letter-spacing:-.01em;}
.bar__word b{color:var(--brand);}
.bar__readout{margin-left:auto;font-family:var(--font-mono);font-size:10.5px;letter-spacing:.12em;
  text-transform:uppercase;color:var(--fg-3);}

/* ---- corner stamps ---- */
.stamps{display:flex;justify-content:flex-end;gap:16px;padding:11px 30px;
  border-bottom:1px solid var(--rule);font-family:var(--font-mono);font-size:10px;
  letter-spacing:.14em;text-transform:uppercase;color:var(--fg-3);}

/* Matches .pn-wrap on the apex and the API page: 1120px, 30px gutters. */
.wrap{max-width:1120px;margin:0 auto;padding:0 30px 88px;}

/* ---- notice (wrong method) ---- */
.notice{border:var(--bw) solid var(--accent);border-left-width:var(--bw-rule);
  padding:14px 16px;margin:28px 0 0;background:var(--bg-raised);}
.notice__k{font-family:var(--font-mono);font-size:10px;font-weight:700;letter-spacing:.16em;
  text-transform:uppercase;color:var(--accent);display:block;margin-bottom:6px;}
.notice p{margin:0;font-size:15px;color:var(--fg-2);}

/* ---- hero ---- */
.hero{padding:56px 0 40px;}
.hero h1{font-family:var(--font-display);font-weight:700;font-size:clamp(34px,4.4vw,56px);
  letter-spacing:-.02em;line-height:1.0;margin:16px 0 14px;}
.hero h1 b{color:var(--brand);font-weight:700;}
/* Was the h1 until 2026-08-22. The heading names the thing, semantically; this
   carries the line that says what it does. */
.hero__tag{font-family:var(--font-display);font-weight:600;font-size:clamp(19px,2.2vw,24px);
  letter-spacing:-.01em;line-height:1.25;color:var(--fg);margin:0 0 20px;max-width:26ch;}
.hero__lede{max-width:56ch;color:var(--fg-2);margin:0 0 8px;}

.figures{display:grid;grid-template-columns:repeat(3,1fr);gap:0;margin-top:36px;
  border-top:var(--bw-rule) solid var(--rule-strong);border-bottom:1px solid var(--rule);}
.fig{padding:16px 18px 18px;border-left:1px solid var(--rule);}
.fig:first-child{border-left:none;padding-left:0;}
.fig__v{font-family:var(--font-display);font-weight:700;font-size:clamp(30px,4.6vw,46px);
  letter-spacing:-.03em;line-height:.92;font-variant-numeric:tabular-nums;}
.fig__u{font-family:var(--font-mono);font-size:.3em;font-weight:400;color:var(--fg-3);
  letter-spacing:.04em;margin-left:.24em;}
.fig__k{font-family:var(--font-mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;
  color:var(--fg-3);margin-top:10px;}
@media (max-width:620px){
  .figures{grid-template-columns:1fr;}
  .fig{border-left:none;border-top:1px solid var(--rule);padding-left:0;}
  .fig:first-child{border-top:none;}
}

/* ---- sections ---- */
section{padding:44px 0 0;}
.sec__head{display:flex;align-items:baseline;gap:14px;border-bottom:1px solid var(--rule);
  padding-bottom:12px;margin-bottom:24px;}
.sec__num{font-family:var(--font-mono);font-size:11px;font-weight:700;letter-spacing:.14em;
  color:var(--accent);}
.sec__head h2{font-family:var(--font-display);font-weight:600;font-size:clamp(22px,2.6vw,30px);
  letter-spacing:-.015em;line-height:1.1;margin:0;}
.sec__note{margin-left:auto;font-family:var(--font-mono);font-size:10px;letter-spacing:.12em;
  text-transform:uppercase;color:var(--fg-3);}
@media (max-width:620px){ .sec__note{display:none;} }

p{margin:0 0 14px;color:var(--fg-2);}
p.tight{margin-bottom:18px;}

/* ---- the address ---- */
.addr{border:var(--bw) solid var(--rule-strong);background:var(--bg-sunken);}
.addr__tab{display:flex;justify-content:space-between;align-items:center;gap:12px;
  background:var(--fg);color:var(--bg);font-family:var(--font-mono);font-size:10px;font-weight:700;
  letter-spacing:.16em;text-transform:uppercase;padding:6px 11px;}
.addr__v{display:block;padding:20px 16px;font-family:var(--font-mono);font-size:clamp(13px,2.4vw,18px);
  letter-spacing:.01em;color:var(--fg);word-break:break-all;}
.addr__act{display:flex;align-items:center;gap:14px;padding:0 16px 16px;flex-wrap:wrap;}

.btn{font-family:var(--font-mono);font-size:12px;font-weight:700;letter-spacing:.14em;
  text-transform:uppercase;padding:12px 20px;border:var(--bw) solid var(--accent);
  background:var(--accent);color:var(--accent-on);cursor:pointer;display:inline-flex;
  align-items:center;gap:10px;border-radius:0;
  transition:box-shadow var(--dur-1) var(--ease),transform var(--dur-1) var(--ease);}
.btn:hover{box-shadow:var(--shadow-hard);transform:translate(-2px,-2px);}
.btn:active{transform:translate(0,0);box-shadow:none;}
.btn--ghost{background:none;border-color:var(--rule);color:var(--fg-2);}
.btn--ghost:hover{border-color:var(--rule-strong);color:var(--fg);box-shadow:none;transform:none;}

/* ---- steps ---- */
.steps{border-top:var(--bw) solid var(--rule-strong);}
.step{display:grid;grid-template-columns:52px 1fr;gap:18px;padding:16px 0;
  border-bottom:1px solid var(--rule);}
.step__n{font-family:var(--font-mono);font-size:12px;font-weight:700;letter-spacing:.1em;
  color:var(--accent);padding-top:3px;}
.step__b{font-size:15.5px;color:var(--fg-2);}
.step__b b{color:var(--fg);font-weight:600;}
.step__b em{font-style:normal;color:var(--brand);}
kbd{font-family:var(--font-mono);font-size:.85em;color:var(--fg);border:1px solid var(--rule);
  background:var(--bg-sunken);padding:1px 6px;}

/* ---- code ---- */
.code{border:var(--bw) solid var(--rule);background:var(--bg-sunken);}
.code__cap{display:flex;justify-content:space-between;align-items:center;padding:7px 12px;
  border-bottom:1px solid var(--rule);background:var(--bg-raised);font-family:var(--font-mono);
  font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--fg-3);}
.code pre{margin:0;padding:16px 14px;overflow-x:auto;}
.code code{font-family:var(--font-mono);font-size:13px;line-height:1.65;color:var(--fg);white-space:pre;}
.tok-a{color:var(--accent);}
.tok-s{color:var(--fg);}

/* ---- ask list ---- */
.ask{border-top:var(--bw) solid var(--rule-strong);}
.ask li{list-style:none;display:grid;grid-template-columns:24px 1fr;gap:12px;align-items:baseline;
  padding:12px 0;border-bottom:1px solid var(--rule);font-family:var(--font-mono);font-size:14px;
  color:var(--fg);line-height:1.45;}
.ask ul{margin:0;padding:0;}
.ask li span{color:var(--accent);}

/* ---- limits ---- */
.limits{list-style:none;margin:0;padding:0;}
.limits li{padding:13px 0;border-top:1px solid var(--rule);font-size:15px;color:var(--fg-2);}
.limits li:first-child{border-top:none;}
.limits b{display:block;font-family:var(--font-mono);font-size:11.5px;font-weight:700;
  letter-spacing:.06em;text-transform:uppercase;color:var(--peak);margin-bottom:4px;}

/* ---- footer ---- */
footer{border-top:var(--bw-rule) solid var(--rule-strong);margin-top:56px;padding:22px 30px;}
.foot__row{display:flex;justify-content:space-between;
  align-items:center;gap:16px;flex-wrap:wrap;}
.foot__stamp{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.14em;
  text-transform:uppercase;color:var(--fg-2);}
.foot__stamp b{color:var(--accent);}
.foot__cap{font-size:13px;color:var(--fg-2);}
.foot__rule{margin:14px 0;border-top:1px solid var(--rule);}
.bar__home{display:inline-flex;align-items:center;gap:12px;color:var(--fg);}
.bar__home:hover{text-decoration:none;}
.bar__home:hover .bar__word{text-decoration:underline;text-underline-offset:3px;}
.bar__readout b{color:var(--brand);font-weight:700;}
.note-alt{margin:16px 0 0;font-size:13.5px;color:var(--fg-3);}
.tools{display:grid;grid-template-columns:repeat(auto-fill,minmax(215px,1fr));gap:0 20px;
  margin-top:20px;border-top:var(--bw) solid var(--rule-strong);}
.tool{padding:10px 0;border-top:1px solid var(--rule);font-size:13px;color:var(--fg-3);}
.tool b{display:block;font-family:var(--font-mono);font-size:11px;font-weight:700;
  letter-spacing:.05em;color:var(--fg-2);margin-bottom:2px;}

@media (prefers-reduced-motion:reduce){
  *{transition:none !important;}
}
`;

/**
 * The commands and tools listed on this page are collected from the same
 * registries the server registers, by handing them a stub that records instead
 * of registering. The page therefore cannot claim a tool the server does not
 * expose. A hand-maintained table did exactly that: docs/index.html advertised
 * 22 tools against 18 real ones, and was deleted 2026-08-22 rather than fixed.
 *
 * Computed once at module load. A failure here renders the section empty rather
 * than taking the page down.
 */
const CATALOGUE = (() => {
    const tools = [];
    const prompts = [];
    try {
        registerTools({ registerTool: (name, config) => tools.push({ name, ...config }) });
        registerPrompts({ registerPrompt: (name, config) => prompts.push({ name, ...config }) });
    } catch (error) {
        console.error('[mcp] landing catalogue failed:', error);
    }
    return { tools, prompts };
})();

const COMMANDS_HTML = !CATALOGUE.tools.length ? '' : `
  <section>
    <div class="sec__head">
      <span class="sec__num">05</span>
      <h2>Commands and tools</h2>
      <span class="sec__note">${CATALOGUE.prompts.length} commands · ${CATALOGUE.tools.length} tools</span>
    </div>
    <p class="tight">Commands appear in a menu once the connector is added, so you can pick one
      instead of phrasing the question yourself. The tools underneath are what the assistant
      reaches for on its own; you never name them.</p>
    <div class="ask">
      <ul>
${CATALOGUE.prompts.map((p) => `        <li><span aria-hidden="true">→</span>${esc(p.title || p.name)}</li>`).join('\n')}
      </ul>
    </div>
    <div class="tools">
${CATALOGUE.tools.map((t) => `      <div class="tool"><b>${esc(t.name)}</b>${esc(t.title || '')}</div>`).join('\n')}
    </div>
  </section>
`;

export function landingPage(req, { wrongMethod = false } = {}) {
    const url = esc(publicUrl(req));
    return `<!doctype html>
<html lang="en" data-surface="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Panopticon MCP</title>
<meta name="description" content="Connect Claude to a complete archive of a design and creative community. Every public post since 2001, refreshed every five minutes. One address, no install, no account.">
<link rel="icon" href="${FAVICON}" type="image/svg+xml">
<style>${STYLE}</style>
</head>
<body>

<header class="bar">
  <a class="bar__home" href="https://nocitponap.com/">
    <span class="bar__logo">${LOGO}</span>
    <span class="bar__word">PANOPTICON</span>
  </a>
  <span class="bar__readout"><b>MCP</b></span>
</header>

<div class="stamps">
  <span>NO ACCOUNT · NOTHING STORED ABOUT YOU</span>
</div>

<main class="wrap">
${wrongMethod ? `  <div class="notice">
    <span class="notice__k">Status · nothing is broken</span>
    <p>This address is written for Claude, not for a browser, so opening it directly
      returns an error. Copy it into Claude instead. Here is how.</p>
  </div>
` : ''}
  <section class="hero">
    <span class="label">Observation feed / 001</span>
    <h1>Panopticon<br><b>MCP</b></h1>
    <p class="hero__tag">The archive, inside your assistant.</p>
    <p class="hero__lede">Every public post from a design and creative community since 2001,
      refreshed every five minutes. You do not install anything and you do not need to be a
      programmer. You paste one address into your assistant's settings.</p>
    <p class="hero__lede">An assistant can already read the live site by browsing it, but it sees
      only what a web page shows: the latest few pages, no reliable dates, nothing it can count.
      Connected to this, it reads the archive directly: who has been most active this week, how a
      thread developed over ten years, how busy the community is now compared with 2005.</p>

    <div class="figures">
      <div class="fig">
        <div class="fig__v">3.9<span class="fig__u">M</span></div>
        <div class="fig__k">Replies catalogued</div>
      </div>
      <div class="fig">
        <div class="fig__v">568<span class="fig__u">K</span></div>
        <div class="fig__k">Threads</div>
      </div>
      <div class="fig">
        <div class="fig__v">5<span class="fig__u">min</span></div>
        <div class="fig__k">Refresh interval</div>
      </div>
    </div>
  </section>

  <section>
    <div class="sec__head">
      <span class="sec__num">01</span>
      <h2>The address</h2>
      <span class="sec__note">Copy it</span>
    </div>
    <div class="addr">
      <div class="addr__tab"><span>Connector endpoint</span><span>HTTP · MCP</span></div>
      <span class="addr__v" id="u">${url}</span>
      <div class="addr__act">
        <button class="btn" id="copy" type="button">Copy address <span aria-hidden="true">→</span></button>
        <span class="caption">No login. The archive is public and read-only.</span>
      </div>
    </div>
  </section>

  <section>
    <div class="sec__head">
      <span class="sec__num">02</span>
      <h2>Claude Desktop, or Claude in a browser</h2>
      <span class="sec__note">4 steps</span>
    </div>
    <div class="steps">
      <div class="step">
        <span class="step__n">01</span>
        <div class="step__b">Open <b>Settings</b>: <kbd>Ctrl+,</kbd> on Windows, <kbd>⌘,</kbd> on Mac.
          In a browser, click your profile icon and choose <b>Settings</b>.</div>
      </div>
      <div class="step">
        <span class="step__n">02</span>
        <div class="step__b">Click <b>Connectors</b> in the sidebar, then <b>Add</b>, then
          <b>Add custom connector</b>.</div>
      </div>
      <div class="step">
        <span class="step__n">03</span>
        <div class="step__b">Paste the address above and click <b>Add</b>. There is no login step.</div>
      </div>
      <div class="step">
        <span class="step__n">04</span>
        <div class="step__b">Start a new chat and ask <em>“Catch me up on the archive”</em>.
          Allow the permission prompt the first time.</div>
      </div>
    </div>
    <p class="note-alt">Any assistant that supports MCP connectors takes the same address. The
      menu is named differently from one to the next; look for connectors, or custom
      integrations.</p>
  </section>

  <section>
    <div class="sec__head">
      <span class="sec__num">03</span>
      <h2>Claude Code</h2>
      <span class="sec__note">One command</span>
    </div>
    <div class="code">
      <div class="code__cap"><span>bash</span><span>terminal</span></div>
<pre><code><span class="tok-a">claude</span> mcp add --transport http panopticon <span class="tok-s">${url}</span></code></pre>
    </div>
    <p class="note-alt">That command is Claude Code's. Other assistants with MCP support take the
      same address through their own connector settings rather than a terminal.</p>
  </section>

  <section>
    <div class="sec__head">
      <span class="sec__num">04</span>
      <h2>Things to ask</h2>
      <span class="sec__note">In your own words</span>
    </div>
    <div class="ask">
      <ul>
        <li><span aria-hidden="true">→</span>Who posted the most in the past week?</li>
        <li><span aria-hidden="true">→</span>What are the biggest threads in the archive?</li>
        <li><span aria-hidden="true">→</span>When did [username] join, and what do they post about?</li>
        <li><span aria-hidden="true">→</span>How busy is the community now compared to 2005?</li>
        <li><span aria-hidden="true">→</span>What was on the front page this morning?</li>
        <li><span aria-hidden="true">→</span>Show me the new profiles from the last few days.</li>
      </ul>
    </div>
  </section>

${COMMANDS_HTML}
  <section>
    <div class="sec__head">
      <span class="sec__num">06</span>
      <h2>What this cannot tell you</h2>
      <span class="sec__note">Limits, stated</span>
    </div>
    <p class="tight">Worth knowing, because Claude will say so and it can look like a malfunction.</p>
    <ul class="limits">
      <li><b>Deleted posts are gone</b>250,781 deleted replies survive only as empty shells
        and are excluded everywhere. A missing post means deleted, not missing data.</li>
      <li><b>Note dates start 2024-04-24</b>The source never recorded when a note was written, only
        when this archive first saw it, and everything older arrived in one import. Claude will
        refuse to rank note activity before that date rather than invent an answer.</li>
      <li><b>Old thread times can be an hour off</b>Thread timestamps ignored daylight saving
        until 2024.</li>
      <li><b>No searching inside posts</b>Thread titles are searchable; the text of posts is not.</li>
      <li><b>Score is one net number</b>Up and down votes are not stored separately.</li>
    </ul>
  </section>
</main>

<footer>
  <div class="foot__row">
    <span class="foot__stamp"><b>PANOPTICON</b></span>
  </div>
  <div class="foot__rule"></div>
  <div class="foot__row">
    <span class="foot__cap">Panopticon is for the people. The people are not for Panopticon.</span>
  </div>
</footer>

<script>
(function () {
  var btn = document.getElementById('copy');
  var val = document.getElementById('u');
  if (!btn || !val) return;
  btn.addEventListener('click', function () {
    var text = val.textContent.trim();
    var done = function () {
      btn.innerHTML = 'Copied <span aria-hidden="true">\\u2713</span>';
      setTimeout(function () {
        btn.innerHTML = 'Copy address <span aria-hidden="true">\\u2192</span>';
      }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () {});
    }
  });
})();
</script>
</body>
</html>`;
}
