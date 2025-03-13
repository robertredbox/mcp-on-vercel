import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const origin = process.argv[2] || "https://mcp-on-vercel.vercel.app";

async function main() {
  const transport = new SSEClientTransport(new URL(`${origin}/sse`));

  const client = new Client(
    {
      name: "example-client",
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
  console.log("Server Capabilities:", client.getServerCapabilities());

  // List available tools
  const tools = await client.listTools();
  console.log("\nAvailable Tools:", tools);

  // Test echo tool
  try {
    console.log("\n--- Testing Echo Tool ---");
    const echoResult = await client.invokeTool("echo", { message: "Hello from MCP client" });
    console.log("Echo Result:", echoResult);
  } catch (error) {
    console.error("Echo Tool Error:", error);
  }

  // Test calculator tool
  try {
    console.log("\n--- Testing Calculator Tool (expression) ---");
    const calcResult1 = await client.invokeTool("calculator", { expression: "2 + 3 * 4" });
    console.log("Calculator Result:", calcResult1);
    
    console.log("\n--- Testing Calculator Tool (operation) ---");
    const calcResult2 = await client.invokeTool("calculator", { 
      expression: "10, 5", 
      operation: "divide" 
    });
    console.log("Calculator Operation Result:", calcResult2);
  } catch (error) {
    console.error("Calculator Tool Error:", error);
  }

  // Test weather tool
  try {
    console.log("\n--- Testing Weather Tool ---");
    const weatherResult = await client.invokeTool("weather", { location: "New York" });
    console.log("Weather Result:", weatherResult);
  } catch (error) {
    console.error("Weather Tool Error:", error);
  }
  
  // Test AppTweak Analysis Tool - Reviews
  try {
    console.log("\n--- Testing AppTweak Analysis Tool (Reviews) ---");
    const appTweakReviews = await client.invokeTool("appTweakAnalysis", { 
      appId: "com.facebook.katana", 
      platform: "ios",
      analysisType: "reviews",
      country: "US"
    });
    console.log("AppTweak Reviews Analysis:", appTweakReviews);
  } catch (error) {
    console.error("AppTweak Tool Error (Reviews):", error);
  }
  
  // Test AppTweak Analysis Tool - Keywords
  try {
    console.log("\n--- Testing AppTweak Analysis Tool (Keywords) ---");
    const appTweakKeywords = await client.invokeTool("appTweakAnalysis", { 
      appId: "com.spotify.music", 
      platform: "android",
      analysisType: "keywords",
      country: "GB"
    });
    console.log("AppTweak Keywords Analysis:", appTweakKeywords);
  } catch (error) {
    console.error("AppTweak Tool Error (Keywords):", error);
  }
  
  // Test AppTweak Analysis Tool - Competitors
  try {
    console.log("\n--- Testing AppTweak Analysis Tool (Competitors) ---");
    const appTweakCompetitors = await client.invokeTool("appTweakAnalysis", { 
      appId: "com.duolingo", 
      platform: "ios",
      analysisType: "competitors",
      country: "FR"
    });
    console.log("AppTweak Competitors Analysis:", appTweakCompetitors);
  } catch (error) {
    console.error("AppTweak Tool Error (Competitors):", error);
  }
  
  // Test AppTweak Analysis Tool - Ratings
  try {
    console.log("\n--- Testing AppTweak Analysis Tool (Ratings) ---");
    const appTweakRatings = await client.invokeTool("appTweakAnalysis", { 
      appId: "com.tinder", 
      platform: "android",
      analysisType: "ratings",
      country: "JP"
    });
    console.log("AppTweak Ratings Analysis:", appTweakRatings);
  } catch (error) {
    console.error("AppTweak Tool Error (Ratings):", error);
  }
}

main().catch(console.error);
