# @osp/mcp-server

MCP (Model Context Protocol) server for the **Open Service Protocol (OSP)**. Enables any AI agent (Claude, GPT, etc.) to discover, provision, and manage developer services through a standardized tool interface.

## Quick Start

```bash
npx @osp/mcp-server
```

## Installation

```bash
npm install -g @osp/mcp-server
# or
npm install @osp/mcp-server
```

## Usage

### Stdio Transport (default)

```bash
osp-mcp-server
```

### HTTP Transport

```bash
osp-mcp-server --port 3001
```

The server will be available at `http://127.0.0.1:3001/mcp`.

### Environment Variables

| Variable | Description |
|---|---|
| `OSP_REGISTRY_URL` | Custom OSP registry URL (default: `https://registry.osp.dev`) |
| `OSP_AUTH_TOKEN` | Bearer token for provider authentication |

### CLI Options

```
osp-mcp-server                          Start with stdio transport (default)
osp-mcp-server --port <port>            Start with HTTP transport
osp-mcp-server --registry <url>         Use custom OSP registry URL
osp-mcp-server --auth-token <token>     Bearer token for provider authentication
osp-mcp-server --help                   Show help
```

## Claude Code Integration

Add to your `.claude/settings.json`:

```json
{
  "mcpServers": {
    "osp": {
      "command": "npx",
      "args": ["@osp/mcp-server"]
    }
  }
}
```

Or if installed globally:

```json
{
  "mcpServers": {
    "osp": {
      "command": "osp-mcp-server"
    }
  }
}
```

With a custom registry:

```json
{
  "mcpServers": {
    "osp": {
      "command": "npx",
      "args": ["@osp/mcp-server", "--registry", "https://my-registry.example.com"]
    }
  }
}
```

## Claude Desktop Integration

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "osp": {
      "command": "npx",
      "args": ["@osp/mcp-server"]
    }
  }
}
```

## Available Tools

### `osp_discover`

Search for and discover OSP service providers. Returns available providers and their service offerings with pricing, regions, and capabilities.

**Parameters:**
- `provider_url` (optional) — URL of a specific provider (e.g., `https://supabase.com`). If omitted, searches the registry.
- `category` (optional) — Filter by category: `database`, `hosting`, `auth`, `analytics`, `storage`, `compute`, `messaging`, `monitoring`, `search`, `ai`, `email`

### `osp_estimate`

Estimate provisioning cost and accepted payment methods before creating a resource.

**Parameters:**
- `provider_url` (required) — URL of the provider
- `offering_id` (required) — Service offering ID
- `tier_id` (required) — Tier ID
- `region` (optional) — Deployment region
- `configuration` (optional) — Estimate-specific configuration object
- `estimated_usage` (optional) — Usage dimensions for metered pricing
- `billing_periods` (optional) — Number of billing periods to estimate

### `osp_provision`

Provision a new service resource from an OSP provider. Creates databases, hosting instances, auth services, etc.

**Parameters:**
- `provider_url` (required) — URL of the provider
- `offering_id` (required) — Service offering ID (e.g., `supabase/postgres`)
- `tier_id` (required) — Tier ID (e.g., `free`, `pro`)
- `project_name` (required) — Name for the provisioned resource
- `region` (optional) — Deployment region (e.g., `us-east-1`)
- `config` (optional) — Offering-specific configuration object

### `osp_status`

Check the status of a provisioned resource, including health, usage, and cost.

**Parameters:**
- `provider_url` (required) — URL of the provider
- `resource_id` (required) — Resource ID to check
- `include_usage` (optional) — Include usage/metering data (default: `false`)

### `osp_deprovision`

Deprovision (delete) a previously provisioned resource. This is a destructive action.

**Parameters:**
- `provider_url` (required) — URL of the provider
- `resource_id` (required) — Resource ID to deprovision

### `osp_rotate`

Rotate credentials for a provisioned resource. Returns a new credential bundle.

**Parameters:**
- `provider_url` (required) — URL of the provider
- `resource_id` (required) — Resource ID to rotate credentials for

## Programmatic Usage

```typescript
import { createOSPServer } from "@osp/mcp-server";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = createOSPServer({
  registryUrl: "https://registry.osp.dev",
  authToken: "your-token",
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

## License

Apache-2.0
