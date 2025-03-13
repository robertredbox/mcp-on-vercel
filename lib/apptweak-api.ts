/**
 * AppTweak API integration
 * 
 * This module handles all interactions with the AppTweak API, including:
 * - Authentication
 * - Request formatting
 * - Response parsing
 * - Caching
 * - Error handling
 */

// Import Redis client for caching
import { createClient } from "redis";

// Define the AppTweak API base URL
const APPTWEAK_API_BASE_URL = "https://api.apptweak.com/";

// Define the cache TTL (Time To Live) in seconds
const CACHE_TTL = 60 * 60; // 1 hour

// Initialize Redis client for caching if available
let redisClient: any = null;
async function getRedisClient() {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL || process.env.KV_URL;
    if (redisUrl) {
      redisClient = createClient({
        url: redisUrl,
      });
      await redisClient.connect();
    }
  }
  return redisClient;
}

/**
 * Makes a request to the AppTweak API
 * 
 * @param endpoint - The API endpoint to call
 * @param params - The parameters to pass to the API
 * @returns The API response data
 */
async function makeAppTweakRequest(endpoint: string, params: Record<string, any>) {
  const apiKey = process.env.APPTWEAK_API_KEY;
  if (!apiKey) {
    throw new Error("APPTWEAK_API_KEY environment variable is not set");
  }

  // Construct the URL
  const url = new URL(endpoint, APPTWEAK_API_BASE_URL);
  
  // Add query parameters
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        // Handle array parameters
        value.forEach(item => url.searchParams.append(`${key}[]`, item.toString()));
      } else {
        url.searchParams.append(key, value.toString());
      }
    }
  });

  // Make the request
  const response = await fetch(url.toString(), {
    headers: {
      "X-Apptweak-Key": apiKey,
      "Accept": "application/json"
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AppTweak API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Function to fetch data from AppTweak API with caching
 * 
 * @param action - The AppTweak API endpoint/action to call
 * @param params - The parameters to pass to the API
 * @returns The API response data
 */
export async function fetchAppTweakData(action: string, params: Record<string, any>) {
  try {
    // Generate a cache key based on the action and params
    const cacheKey = `apptweak:${action}:${JSON.stringify(params)}`;
    
    // Try to get from cache first
    const redis = await getRedisClient();
    if (redis) {
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        return JSON.parse(cachedData);
      }
    }

    // Define endpoint mapping
    const endpoints: Record<string, string> = {
      // App Details
      "search_app": "ios/applications/search.json",
      "get_app_details": "ios/applications/lookup.json",
      
      // Reviews
      "get_reviews": "ios/applications/reviews.json",
      "get_top_displayed_reviews": "ios/applications/featured_reviews.json",
      "search_reviews": "ios/applications/reviews/search.json",
      "get_review_stats": "ios/applications/reviews/stats.json",
      "analyze_ratings": "ios/applications/ratings.json",
      
      // Keywords
      "discover_keywords": "ios/keywords/suggestions.json",
      "track_keyword_rankings": "ios/keywords/rankings.json",
      "get_keyword_stats": "ios/keywords/stats.json",
      "get_keyword_volume_history": "ios/keywords/volume/history.json",
      "analyze_top_keywords": "ios/keywords/top.json",
      "get_category_top_keywords": "ios/categories/keywords.json",
      "get_trending_keywords": "ios/categories/trending_searches.json",
      
      // Competitors
      "get_competitors": "ios/applications/competitors.json",
      "analyze_competitive_position": "ios/applications/power.json",
      
      // Downloads
      "get_downloads": "ios/applications/downloads.json",
    };
    
    // Select the appropriate endpoint based on the platform parameter
    let endpoint = endpoints[action] || "";
    if (params.platform === "android") {
      endpoint = endpoint.replace("ios/", "android/");
    }
    
    if (!endpoint) {
      throw new Error(`Unknown AppTweak API action: ${action}`);
    }

    // Make the API request
    const data = await makeAppTweakRequest(endpoint, params);

    // Cache the result
    if (redis) {
      await redis.set(cacheKey, JSON.stringify(data), { EX: CACHE_TTL });
    }

    // Add validation and processing if needed
    return data;
  } catch (error) {
    console.error(`Error fetching AppTweak data for ${action}:`, error);
    return {
      error: true,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}