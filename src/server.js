import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerTools } from './tools.js';
import { registerPrompts } from './prompts.js';
import { INSTRUCTIONS } from './instructions.js';

export function buildServer() {
    const server = new McpServer(
        { name: 'panopticon-mcp', version: '2.0.0' },
        {
            // Sent to the client during `initialize` and placed in the model's
            // context before any tool runs. See instructions.js for why this
            // carries more weight here than usual.
            instructions: INSTRUCTIONS
        }
    );
    registerTools(server);
    registerPrompts(server);
    return server;
}
