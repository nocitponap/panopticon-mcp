import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { buildServer } from '../server.js';
import { closePool } from 'panopticon-core';

export async function startStdio() {
    const server = buildServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);

    const shutdown = async () => {
        try {
            await closePool();
        } finally {
            process.exit(0);
        }
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
}
