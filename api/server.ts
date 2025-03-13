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
    
    // AppTweak Integration Tool (mock)
    server.tool(
      "appTweakAnalysis",
      {
        appId: z.string(),
        platform: z.enum(["ios", "android"]),
        analysisType: z.enum(["reviews", "keywords", "competitors", "ratings"]),
        country: z.string().default("US")
      },
      async ({ appId, platform, analysisType, country }) => {
        // Validate input according to data validation requirements
        if (!appId || !platform || !analysisType) {
          return {
            content: [{ 
              type: "text", 
              text: "Error: Missing required parameters" 
            }],
          };
        }
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        let resultData;
        
        // Mock data generation with validation logic following the user preferences
        try {
          switch (analysisType) {
            case "reviews":
              resultData = {
                totalReviews: Math.floor(Math.random() * 10000) + 500,
                averageRating: (Math.random() * 2 + 3).toFixed(1),
                sentiment: {
                  positive: Math.floor(Math.random() * 70) + 30,
                  neutral: Math.floor(Math.random() * 30) + 10,
                  negative: Math.floor(Math.random() * 20) + 5
                },
                topKeywords: ["great", "useful", "buggy", "expensive", "helpful"]
              };
              break;
            
            case "keywords":
              resultData = {
                organicKeywords: Math.floor(Math.random() * 1000) + 200,
                paidKeywords: Math.floor(Math.random() * 100) + 10,
                topPerforming: [
                  { keyword: "fitness app", volume: 12500, position: 3 },
                  { keyword: "workout tracker", volume: 8400, position: 5 },
                  { keyword: "health tracker", volume: 6300, position: 8 },
                  { keyword: "diet planner", volume: 5100, position: 12 },
                  { keyword: "calorie counter", volume: 4700, position: 15 }
                ]
              };
              break;
              
            case "competitors":
              resultData = {
                directCompetitors: [
                  { name: "Fitness Pro", appId: "com.fitnesspro.app", overlapScore: 0.87 },
                  { name: "Health Tracker Plus", appId: "com.healthtracker.plus", overlapScore: 0.76 },
                  { name: "GymBuddy", appId: "com.gymbuddy.app", overlapScore: 0.68 },
                  { name: "FitLife", appId: "com.fitlife.app", overlapScore: 0.62 }
                ],
                keywordOverlap: {
                  organic: Math.floor(Math.random() * 40) + 10,
                  paid: Math.floor(Math.random() * 15) + 5
                }
              };
              break;
              
            case "ratings":
              resultData = {
                current: (Math.random() * 2 + 3).toFixed(1),
                history: [
                  { month: "Jan", rating: (Math.random() * 2 + 3).toFixed(1) },
                  { month: "Feb", rating: (Math.random() * 2 + 3).toFixed(1) },
                  { month: "Mar", rating: (Math.random() * 2 + 3).toFixed(1) },
                  { month: "Apr", rating: (Math.random() * 2 + 3).toFixed(1) },
                  { month: "May", rating: (Math.random() * 2 + 3).toFixed(1) }
                ],
                distribution: {
                  "5": Math.floor(Math.random() * 60) + 40,
                  "4": Math.floor(Math.random() * 20) + 20,
                  "3": Math.floor(Math.random() * 15) + 5,
                  "2": Math.floor(Math.random() * 10) + 2,
                  "1": Math.floor(Math.random() * 10) + 3
                }
              };
              break;
            
            default:
              throw new Error(`Unsupported analysis type: ${analysisType}`);
          }
          
          // Perform data validation according to user preferences
          // Verify data consistency
          const isDataConsistent = validateAppTweakData(resultData, analysisType);
          
          if (!isDataConsistent) {
            throw new Error("Data validation failed: inconsistent data detected");
          }
          
          return {
            content: [{ 
              type: "text", 
              text: `AppTweak ${analysisType} analysis for ${appId} (${platform}, ${country}):\n${JSON.stringify(resultData, null, 2)}` 
            }],
          };
        } catch (error) {
          return {
            content: [{ 
              type: "text", 
              text: `Error with AppTweak analysis: ${error instanceof Error ? error.message : String(error)}` 
            }],
          };
        }
      }
    )
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
        appTweakAnalysis: {
          description: "Analyze app data using AppTweak (mock implementation)",
        }
      },
    },
  }
);

// Data validation function following the validation requirements
function validateAppTweakData(data, analysisType) {
  if (!data) return false;
  
  try {
    switch (analysisType) {
      case "reviews":
        return (
          typeof data.totalReviews === 'number' && 
          typeof data.averageRating === 'string' &&
          parseFloat(data.averageRating) >= 1 && 
          parseFloat(data.averageRating) <= 5 &&
          data.sentiment && 
          typeof data.sentiment.positive === 'number'
        );
        
      case "keywords":
        return (
          typeof data.organicKeywords === 'number' &&
          typeof data.paidKeywords === 'number' &&
          Array.isArray(data.topPerforming) &&
          data.topPerforming.length > 0 &&
          data.topPerforming.every(k => 
            typeof k.keyword === 'string' && 
            typeof k.volume === 'number' && 
            typeof k.position === 'number'
          )
        );
        
      case "competitors":
        return (
          Array.isArray(data.directCompetitors) &&
          data.directCompetitors.length > 0 &&
          data.directCompetitors.every(c => 
            typeof c.name === 'string' && 
            typeof c.appId === 'string' && 
            typeof c.overlapScore === 'number' &&
            c.overlapScore >= 0 && 
            c.overlapScore <= 1
          )
        );
        
      case "ratings":
        return (
          typeof data.current === 'string' &&
          parseFloat(data.current) >= 1 && 
          parseFloat(data.current) <= 5 &&
          Array.isArray(data.history) &&
          data.history.length > 0 &&
          data.history.every(h => 
            typeof h.month === 'string' && 
            typeof h.rating === 'string' &&
            parseFloat(h.rating) >= 1 && 
            parseFloat(h.rating) <= 5
          )
        );
        
      default:
        return false;
    }
  } catch (e) {
    console.error("Validation error:", e);
    return false;
  }
}

export default handler;
