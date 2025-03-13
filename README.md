# Run an MCP Server on Vercel

## Modified MCP Server

This repository contains a modified version of the MCP (Model Context Protocol) server that can be deployed on Vercel. It includes:

- Echo tool: Returns the input message
- Calculator tool: Evaluates mathematical expressions or performs basic operations
- Weather tool: Returns mock weather data for a location

## Setup Requirements

1. **Redis**: Required for message passing between serverless functions
   - Use Upstash Redis (compatible with Vercel)
   - Set `REDIS_URL` environment variable: `redis://default:AXK-AAIjcDEwZmNlNDQ1YTY3Yzg0NjcwODYxZWVjYWNiYWNkY2U2Y3AxMA@alive-buck-29374.upstash.io:6379`

2. **Vercel Configuration**:
   - Enable Fluid compute (on Pro or Enterprise plans)
   - Adjust max duration in `vercel.json` (currently set to 300 seconds)

## Testing the Server

Use the included test client:

```sh
node scripts/test-client.mjs https://your-deployment-url.vercel.app
```

## Adding New Tools

To add new tools, update `api/server.ts` following the MCP TypeScript SDK conventions.
