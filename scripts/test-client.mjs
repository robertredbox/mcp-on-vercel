import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const origin = process.argv[2] || "https://mcp-on-vercel.vercel.app";
const appId = process.argv[3] || "389801252"; // Default appId (e.g., Spotify iOS app)
const platform = process.argv[4] || "ios"; // Default platform

async function main() {
  console.log(`Connecting to MCP server at ${origin}`);
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

  await client.connect(transport);

  console.log("Connected to MCP server");
  console.log("\nServer capabilities:", client.getServerCapabilities());

  // List available tools
  console.log("\nAvailable tools:");
  const tools = await client.listTools();
  console.log(tools);

  // Test echo tool (basic functionality test)
  console.log("\nTesting echo tool:");
  const echoResult = await client.invoke("echo", { message: "Hello, AppTweak MCP!" });
  console.log("Echo result:", echoResult);

  // Test app details tool
  try {
    console.log(`\nTesting get_app_details for app ID ${appId} on ${platform}:`);
    const appDetailsResult = await client.invoke("get_app_details", { 
      appId, 
      platform,
    });
    console.log("App details result:", JSON.stringify(appDetailsResult, null, 2));
    
    // Log the routing metadata
    console.log("\nRouting metadata:", appDetailsResult.metadata?.routingInfo);
  } catch (error) {
    console.error("Error testing get_app_details:", error);
  }

  // Test review tool
  try {
    console.log(`\nTesting get_reviews for app ID ${appId} on ${platform}:`);
    const reviewsResult = await client.invoke("get_reviews", { 
      appId, 
      platform,
      country: "US"
    });
    console.log("Reviews result summary:");
    if (reviewsResult.content && reviewsResult.content[0] && reviewsResult.content[0].json) {
      const reviewsJson = reviewsResult.content[0].json;
      console.log(`- Retrieved ${reviewsJson.reviews?.length || 0} reviews`);
      if (reviewsJson.reviews && reviewsJson.reviews.length > 0) {
        console.log("- First review sample:", reviewsJson.reviews[0]);
      }
    }
    console.log("\nRouting metadata:", reviewsResult.metadata?.routingInfo);
  } catch (error) {
    console.error("Error testing get_reviews:", error);
  }

  // Disconnect from the server
  transport.close();
  console.log("\nDisconnected from MCP server");
}

main().catch(console.error);
