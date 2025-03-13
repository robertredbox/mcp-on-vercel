import { z } from "zod";
import { initializeMcpApiHandler } from "../lib/mcp-api-handler";
import { fetchAppTweakData } from "../lib/apptweak-api";

const handler = initializeMcpApiHandler(
  (server) => {
    // App Details Tools
    server.tool("search_app", {
      query: z.string(),
      platform: z.enum(["ios", "android"]),
      country: z.string().default("US"),
      language: z.string().default("en")
    }, async ({ query, platform, country, language }) => {
      const result = await fetchAppTweakData("search_app", { query, platform, country, language });
      return {
        content: [{ type: "json", json: result }],
        metadata: {
          routingInfo: {
            tabId: "overview",
            sectionId: "app-info",
            highlightEffect: true
          }
        }
      };
    });

    server.tool("get_app_details", {
      appId: z.string(),
      platform: z.enum(["ios", "android"]),
      country: z.string().default("US"),
      language: z.string().default("en")
    }, async ({ appId, platform, country, language }) => {
      const result = await fetchAppTweakData("get_app_details", { appId, platform, country, language });
      return {
        content: [{ type: "json", json: result }],
        metadata: {
          routingInfo: {
            tabId: "overview",
            sectionId: "app-info",
            highlightEffect: true
          }
        }
      };
    });

    // Review Tools
    server.tool("get_reviews", {
      appId: z.string(),
      platform: z.enum(["ios", "android"]),
      country: z.string().default("US")
    }, async ({ appId, platform, country }) => {
      const result = await fetchAppTweakData("get_reviews", { appId, platform, country });
      return {
        content: [{ type: "json", json: result }],
        metadata: {
          routingInfo: {
            tabId: "reviews",
            sectionId: "recent-reviews",
            highlightEffect: true
          }
        }
      };
    });

    server.tool("get_top_displayed_reviews", {
      appId: z.string(),
      platform: z.enum(["ios", "android"]),
      country: z.string().default("US"),
      size: z.number().default(50),
      sort: z.enum(["most_useful", "most_recent", "most_positive"]).default("most_useful")
    }, async ({ appId, platform, country, size, sort }) => {
      const result = await fetchAppTweakData("get_top_displayed_reviews", { appId, platform, country, size, sort });
      return {
        content: [{ type: "json", json: result }],
        metadata: {
          routingInfo: {
            tabId: "reviews",
            sectionId: "featured-reviews",
            highlightEffect: true
          }
        }
      };
    });

    server.tool("analyze_ratings", {
      appId: z.string(),
      platform: z.enum(["ios", "android"]),
      country: z.string().default("US"),
      language: z.string().default("en"),
      startDate: z.string().optional(),
      endDate: z.string().optional()
    }, async ({ appId, platform, country, language, startDate, endDate }) => {
      const result = await fetchAppTweakData("analyze_ratings", { appId, platform, country, language, startDate, endDate });
      return {
        content: [{ type: "json", json: result }],
        metadata: {
          routingInfo: {
            tabId: "reviews",
            sectionId: "rating-analysis",
            highlightEffect: true
          }
        }
      };
    });

    // Keyword Tools
    server.tool("discover_keywords", {
      query: z.string(),
      platform: z.enum(["ios", "android"]),
      country: z.string().default("US"),
      language: z.string().default("en"),
      limit: z.number().default(20)
    }, async ({ query, platform, country, language, limit }) => {
      const result = await fetchAppTweakData("discover_keywords", { query, platform, country, language, limit });
      return {
        content: [{ type: "json", json: result }],
        metadata: {
          routingInfo: {
            tabId: "keywords",
            sectionId: "keyword-discovery",
            highlightEffect: true
          }
        }
      };
    });

    server.tool("analyze_top_keywords", {
      appIds: z.array(z.string()),
      platform: z.enum(["ios", "android"]),
      country: z.string().default("US"),
      limit: z.number().default(10),
      sortBy: z.enum(["score", "volume", "rank"]).default("score")
    }, async ({ appIds, platform, country, limit, sortBy }) => {
      const result = await fetchAppTweakData("analyze_top_keywords", { appIds, platform, country, limit, sortBy });
      return {
        content: [{ type: "json", json: result }],
        metadata: {
          routingInfo: {
            tabId: "keywords",
            sectionId: "top-keywords",
            highlightEffect: true
          }
        }
      };
    });

    // Competitor Tools
    server.tool("get_competitors", {
      appId: z.string(),
      platform: z.enum(["ios", "android"]),
      country: z.string().default("US"),
      language: z.string().default("en")
    }, async ({ appId, platform, country, language }) => {
      const result = await fetchAppTweakData("get_competitors", { appId, platform, country, language });
      return {
        content: [{ type: "json", json: result }],
        metadata: {
          routingInfo: {
            tabId: "competitors",
            sectionId: "competitor-discovery",
            highlightEffect: true
          }
        }
      };
    });

    server.tool("analyze_competitive_position", {
      appId: z.string(),
      platform: z.enum(["ios", "android"]),
      country: z.string().default("US"),
      competitors: z.array(z.string()).optional()
    }, async ({ appId, platform, country, competitors }) => {
      const result = await fetchAppTweakData("analyze_competitive_position", { appId, platform, country, competitors });
      return {
        content: [{ type: "json", json: result }],
        metadata: {
          routingInfo: {
            tabId: "competitors",
            sectionId: "competitive-analysis",
            highlightEffect: true
          }
        }
      };
    });

    // Downloads Tools
    server.tool("get_downloads", {
      appId: z.string(),
      platform: z.enum(["ios", "android"]),
      country: z.string(),
      startDate: z.string(),
      endDate: z.string()
    }, async ({ appId, platform, country, startDate, endDate }) => {
      const result = await fetchAppTweakData("get_downloads", { appId, platform, country, startDate, endDate });
      return {
        content: [{ type: "json", json: result }],
        metadata: {
          routingInfo: {
            tabId: "overview",
            sectionId: "download-statistics",
            highlightEffect: true
          }
        }
      };
    });

    // Original echo tool for testing
    server.tool("echo", { message: z.string() }, async ({ message }) => ({
      content: [{ type: "text", text: `Tool echo: ${message}` }],
    }));
  },
  {
    capabilities: {
      tools: {
        // App Details
        search_app: {
          description: "Search for an app by name and platform (ios/android)",
        },
        get_app_details: {
          description: "Get detailed information about an app by ID",
        },
        
        // Reviews
        get_reviews: {
          description: "Get top 100 reviews for an app",
        },
        get_top_displayed_reviews: {
          description: "Get top displayed reviews sorted by criteria",
        },
        analyze_ratings: {
          description: "Get detailed ratings and sentiment analysis",
        },
        
        // Keywords
        discover_keywords: {
          description: "Find relevant keywords based on a seed keyword or app",
        },
        analyze_top_keywords: {
          description: "Analyze top keywords for apps including brand analysis and estimated installs",
        },
        
        // Competitors
        get_competitors: {
          description: "Get list of competing apps based on keyword overlap",
        },
        analyze_competitive_position: {
          description: "Analyze app's competitive position including power scores and impressions",
        },
        
        // Downloads
        get_downloads: {
          description: "Get app download estimates for a specific time period",
        },
        
        // Original echo tool
        echo: {
          description: "Echo a message",
        },
      },
    },
  }
);

export default handler;