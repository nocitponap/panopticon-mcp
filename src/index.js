#!/usr/bin/env node
import 'dotenv/config';
import { startStdio } from './transports/stdio.js';
import { startHttp } from './transports/http.js';

const transport =
    process.argv.includes('--http') || process.env.MCP_TRANSPORT === 'http'
        ? 'http'
        : 'stdio';

if (transport === 'http') {
    await startHttp();
} else {
    await startStdio();
}
