#!/usr/bin/env node

/**
 * CLI entry point for @osp/mcp-server.
 *
 * Starts the OSP MCP server with either stdio (default) or HTTP transport.
 *
 * Usage:
 *   npx @osp/mcp-server                    # stdio transport (default)
 *   npx @osp/mcp-server --port 3001        # HTTP transport on port 3001
 *   npx @osp/mcp-server --help             # show help
 */

import { createOSPServer } from "./server.js";

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

function getFlag(name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  return args[index + 1];
}

function hasFlag(name: string): boolean {
  return args.includes(name);
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

if (hasFlag("--help") || hasFlag("-h")) {
  console.error(`
@osp/mcp-server v0.1.0
MCP server for the Open Service Protocol.

Usage:
  osp-mcp-server                          Start with stdio transport (default)
  osp-mcp-server --port <port>            Start with HTTP transport on <port>
  osp-mcp-server --registry <url>         Use custom OSP registry URL
  osp-mcp-server --help                   Show this help message

Options:
  --port <port>         Use HTTP/SSE transport instead of stdio
  --registry <url>      Custom OSP registry URL (default: https://registry.osp.dev)
  --auth-token <token>  Bearer token for provider authentication

Environment Variables:
  OSP_REGISTRY_URL      Custom OSP registry URL
  OSP_AUTH_TOKEN        Bearer token for provider authentication

Tools Exposed:
  osp_discover      Search for and discover OSP service providers
  osp_provision     Provision a new service resource
  osp_status        Check the status of a provisioned resource
  osp_deprovision   Deprovision (delete) a resource
  osp_rotate        Rotate credentials for a resource
`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const port = getFlag("--port");
const registryUrl = getFlag("--registry") ?? process.env["OSP_REGISTRY_URL"];
const authToken = getFlag("--auth-token") ?? process.env["OSP_AUTH_TOKEN"];

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const server = createOSPServer({
    registryUrl,
    authToken,
  });

  if (port) {
    // HTTP transport mode
    const portNum = parseInt(port, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      console.error(`Error: Invalid port number: ${port}`);
      process.exit(1);
    }

    const { createServer } = await import("node:http");
    const { StreamableHTTPServerTransport } = await import(
      "@modelcontextprotocol/sdk/server/streamableHttp.js"
    );

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless
    });

    await server.connect(transport);

    const httpServer = createServer(async (req, res) => {
      if (req.method === "POST" && req.url === "/mcp") {
        // Read body
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(chunk as Buffer);
        }
        const body = JSON.parse(Buffer.concat(chunks).toString());
        await transport.handleRequest(req, res, body);
      } else if (req.method === "GET" && req.url === "/mcp") {
        await transport.handleRequest(req, res);
      } else if (req.method === "GET" && req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "healthy", server: "@osp/mcp-server", version: "0.1.0" }));
      } else {
        res.writeHead(404);
        res.end("Not Found");
      }
    });

    httpServer.listen(portNum, "127.0.0.1", () => {
      console.error(`@osp/mcp-server running on http://127.0.0.1:${portNum}/mcp`);
    });
  } else {
    // Stdio transport mode (default)
    const { StdioServerTransport } = await import(
      "@modelcontextprotocol/sdk/server/stdio.js"
    );

    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("@osp/mcp-server running on stdio");
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
