# AppTweak MCP Server on Vercel

This repository contains a Model Context Protocol (MCP) server implementation for AppTweak API integration, designed to run on Vercel's serverless infrastructure.

## Overview

The AppTweak MCP server acts as a middleware between your app-optimizer-dashboard and the AppTweak API, providing:

- A unified interface for accessing AppTweak services
- Automatic routing to the relevant dashboard sections
- Performance improvements through caching
- Proper error handling and validation

## Setup

### Prerequisites

1. A Vercel account
2. An AppTweak API key
3. A Redis instance (Vercel KV or external Redis)

### Deployment Steps

1. Fork or clone this repository
2. Add environment variables in Vercel:
   - `APPTWEAK_API_KEY`: Your AppTweak API key
   - `REDIS_URL` or `KV_URL`: Your Redis connection string
3. Deploy to Vercel:
   ```
   vercel
   ```
4. Enable Fluid compute in your Vercel project settings
5. (Optional) For Vercel Pro/Enterprise: Adjust max duration to 800 seconds in vercel.json

## Usage

### Available Tools

This MCP server exposes the following AppTweak API endpoints as tools:

**App Details**
- `search_app`: Search for an app by name and platform
- `get_app_details`: Get detailed app information

**Reviews**
- `get_reviews`: Get top 100 reviews for an app
- `get_top_displayed_reviews`: Get featured reviews with sorting options
- `analyze_ratings`: Get detailed ratings analysis

**Keywords**
- `discover_keywords`: Find relevant keywords
- `analyze_top_keywords`: Analyze top keywords for apps

**Competitors**
- `get_competitors`: Find competing apps
- `analyze_competitive_position`: Analyze competitive positioning

**Downloads**
- `get_downloads`: Get app download estimates

### Example Client Usage

```javascript
// Connect to the MCP server
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const transport = new SSEClientTransport(new URL("https://your-vercel-deployment.vercel.app/sse"));
const client = new Client({ name: "app-optimizer-client", version: "1.0.0" });
await client.connect(transport);

// Get app reviews
const result = await client.invoke("get_reviews", {
  appId: "123456789",
  platform: "ios",
  country: "US"
});

// The result will include both the data and routing information
console.log(result.content[0].json); // The actual review data
console.log(result.metadata.routingInfo); // Routing information: { tabId: "reviews", sectionId: "recent-reviews", ... }
```

## Integration with App Optimizer Dashboard

To integrate this MCP server with your app-optimizer-dashboard:

1. Add an MCP client connection in your dashboard
2. Update your routing system to listen for routing instructions from the server
3. Replace direct API calls to AppTweak with MCP tool invocations

See the example dashboard integration in [`docs/dashboard-integration.md`](docs/dashboard-integration.md).

## Local Development

To run the server locally:

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file with:
   ```
   APPTWEAK_API_KEY=your_apptweak_api_key
   REDIS_URL=your_redis_url
   ```
4. Start the development server:
   ```
   vercel dev
   ```

## Testing

You can use the included test client to verify your deployment:

```sh
node scripts/test-client.mjs https://your-vercel-deployment.vercel.app
```

## License

ISC
