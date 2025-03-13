import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

// Get the server URL from command line arguments or use default
const origin = process.argv[2] || "https://mcp-on-vercel.vercel.app";

// Get the command from command line arguments
const command = process.argv[3] || "list";

// Get the parameters from command line arguments
const params = process.argv.slice(4);

async function main() {
  console.log(`Connecting to MCP server: ${origin}`);
  const transport = new SSEClientTransport(new URL(`${origin}/sse`));

  const client = new Client(
    {
      name: "app-optimizer-client",
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
    console.log("Connected to MCP server");
    
    // Get server capabilities to see available tools
    const capabilities = client.getServerCapabilities();
    console.log("Server capabilities:", capabilities);
    
    // Process the command
    if (command === "list") {
      // List all available tools
      const tools = await client.listTools();
      console.log("Available tools:");
      for (const [name, description] of Object.entries(tools)) {
        console.log(`- ${name}: ${description.description}`);
      }
    } else if (command === "echo") {
      // Test the echo tool
      const message = params[0] || "Hello, MCP!";
      const result = await client.invoke("echo", { message });
      console.log("Echo result:", result);
    } else if (command === "search") {
      // Search for an app
      if (params.length < 2) {
        console.error("Usage: node test-client.mjs <server-url> search <query> <platform>");
        process.exit(1);
      }
      
      const [query, platform] = params;
      console.log(`Searching for "${query}" on ${platform}...`);
      
      const result = await client.invoke("search_app", { 
        query, 
        platform,
        country: "US"
      });
      
      console.log("Search result:");
      console.log(JSON.stringify(result, null, 2));
      
      // Check if the result contains routing information
      if (result.metadata?.routingInfo) {
        console.log("Routing information:");
        console.log(result.metadata.routingInfo);
      }
    } else if (command === "reviews") {
      // Get reviews for an app
      if (params.length < 2) {
        console.error("Usage: node test-client.mjs <server-url> reviews <appId> <platform>");
        process.exit(1);
      }
      
      const [appId, platform] = params;
      console.log(`Getting reviews for app ${appId} on ${platform}...`);
      
      const result = await client.invoke("get_reviews", { 
        appId, 
        platform,
        country: "US"
      });
      
      console.log("Reviews result:");
      console.log(JSON.stringify(result, null, 2));
    } else if (command === "keywords") {
      // Analyze top keywords for an app
      if (params.length < 2) {
        console.error("Usage: node test-client.mjs <server-url> keywords <appId> <platform>");
        process.exit(1);
      }
      
      const [appId, platform] = params;
      console.log(`Analyzing top keywords for app ${appId} on ${platform}...`);
      
      const result = await client.invoke("analyze_top_keywords", { 
        appIds: [appId], 
        platform,
        country: "US",
        limit: 5
      });
      
      console.log("Top keywords result:");
      console.log(JSON.stringify(result, null, 2));
    } else if (command === "competitors") {
      // Get competitors for an app
      if (params.length < 2) {
        console.error("Usage: node test-client.mjs <server-url> competitors <appId> <platform>");
        process.exit(1);
      }
      
      const [appId, platform] = params;
      console.log(`Getting competitors for app ${appId} on ${platform}...`);
      
      const result = await client.invoke("get_competitors", { 
        appId, 
        platform,
        country: "US"
      });
      
      console.log("Competitors result:");
      console.log(JSON.stringify(result, null, 2));
    } else {
      // For any other command, try to invoke it as a tool
      console.log(`Invoking tool "${command}" with params:`, params);
      
      // Parse params as key=value pairs
      const toolParams = {};
      for (const param of params) {
        const [key, value] = param.split('=');
        if (key && value) {
          toolParams[key] = value;
        }
      }
      
      try {
        const result = await client.invoke(command, toolParams);
        console.log(`${command} result:`, result);
      } catch (error) {
        console.error(`Error invoking tool "${command}":`, error.message);
      }
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    transport.close();
  }
}

main();
