import { z } from "zod";
import { initializeMcpApiHandler } from "../lib/mcp-api-handler";

const handler = initializeMcpApiHandler(
  (server) => {
    // Echo tool (original)
    server.tool("echo", { message: z.string() }, async ({ message }) => ({
      content: [{ type: "text", text: `Tool echo: ${message}` }],
    }));
    
    // Calculator tool
    server.tool(
      "calculator", 
      { 
        expression: z.string(),
        operation: z.enum(["add", "subtract", "multiply", "divide"]).optional()
      }, 
      async ({ expression, operation }) => {
        let result;
        
        try {
          if (operation) {
            const parts = expression.split(',').map(part => part.trim());
            if (parts.length !== 2) {
              throw new Error("For operation mode, provide exactly two numbers separated by comma");
            }
            
            const a = parseFloat(parts[0]);
            const b = parseFloat(parts[1]);
            
            if (isNaN(a) || isNaN(b)) {
              throw new Error("Invalid numbers provided");
            }
            
            switch (operation) {
              case "add": result = a + b; break;
              case "subtract": result = a - b; break;
              case "multiply": result = a * b; break;
              case "divide": 
                if (b === 0) throw new Error("Cannot divide by zero");
                result = a / b; 
                break;
            }
          } else {
            // Use eval for simple expressions (normally would use a safer method in production)
            result = eval(expression);
          }
          
          return {
            content: [{ 
              type: "text", 
              text: `Result: ${result}` 
            }],
          };
        } catch (error) {
          return {
            content: [{ 
              type: "text", 
              text: `Error: ${error instanceof Error ? error.message : String(error)}` 
            }],
          };
        }
      }
    );
    
    // Weather tool (mock)
    server.tool(
      "weather",
      { location: z.string() },
      async ({ location }) => {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Mock data
        const conditions = ["Sunny", "Cloudy", "Rainy", "Partly Cloudy", "Stormy"];
        const randomTemp = Math.floor(Math.random() * 35) + 5; // 5-40°C
        const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
        
        return {
          content: [{ 
            type: "text", 
            text: `Weather for ${location}: ${randomTemp}°C, ${randomCondition}` 
          }],
        };
      }
    );
  },
  {
    capabilities: {
      tools: {
        echo: {
          description: "Echo a message",
        },
        calculator: {
          description: "Calculate a mathematical expression or perform basic operations",
        },
        weather: {
          description: "Get weather for a location (mock data for demonstration)",
        },
      },
    },
  }
);

export default handler;
