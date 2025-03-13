import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const origin = process.argv[2] || "https://mcp-on-vercel.vercel.app";
const appId = process.argv[3] || "284882215"; // Default: Facebook iOS app ID
const platform = process.argv[4] || "ios";

/**
 * Test the AppTweak MCP server with various API calls
 */
async function main() {
  console.log(`Connecting to MCP server at ${origin}...`);
  const transport = new SSEClientTransport(new URL(`${origin}/sse`));

  const client = new Client(
    {
      name: "apptweak-test-client",
      version: "1.0.0",
    },
    {
      capabilities: {
        prompts: {},
        resources: {},
        tools: {},
      },
    }
  );

  try {
    await client.connect(transport);
    console.log("✅ Connected to MCP server");

    // List available tools
    console.log("\n📋 Available tools:");
    const tools = await client.listTools();
    console.log(tools);

    // Get app details
    console.log(`\n📱 Getting app details for app ID ${appId} on ${platform}...`);
    const appDetails = await client.invoke("get_app_details", {
      appId,
      platform,
    });
    console.log("App Details Response:");
    console.log("Content:", appDetails.content[0].json);
    console.log("Routing Information:", appDetails.metadata?.routingInfo);

    // Get app reviews
    console.log(`\n⭐ Getting reviews for app ID ${appId} on ${platform}...`);
    const reviews = await client.invoke("get_reviews", {
      appId,
      platform,
    });
    console.log("Reviews Response:");
    console.log(`Found ${reviews.content[0].json.reviews?.length || 0} reviews`);
    // Show just the first review
    if (reviews.content[0].json.reviews?.[0]) {
      console.log("First review:", reviews.content[0].json.reviews[0]);
    }
    console.log("Routing Information:", reviews.metadata?.routingInfo);

    // Discover keywords
    console.log(`\n🔍 Discovering keywords for "${appDetails.content[0].json.name || 'social media'}"...`);
    const keywords = await client.invoke("discover_keywords", {
      query: appDetails.content[0].json.name || "social media",
      platform,
      limit: 5,
    });
    console.log("Keywords Response:");
    console.log("Found keywords:", keywords.content[0].json);
    console.log("Routing Information:", keywords.metadata?.routingInfo);

    // Get competitors
    console.log(`\n🏆 Getting competitors for app ID ${appId} on ${platform}...`);
    const competitors = await client.invoke("get_competitors", {
      appId,
      platform,
    });
    console.log("Competitors Response:");
    console.log("Found competitors:", competitors.content[0].json);
    console.log("Routing Information:", competitors.metadata?.routingInfo);

    console.log("\n✅ All tests completed successfully!");
  } catch (error) {
    console.error("❌ Error during testing:", error);
  } finally {
    transport.close();
  }
}

main();
