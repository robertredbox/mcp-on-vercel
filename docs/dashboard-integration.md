# Integrating with App Optimizer Dashboard

This guide explains how to integrate the AppTweak MCP server with your existing app-optimizer-dashboard React application.

## Overview

The integration consists of three main parts:

1. Adding the MCP client to your dashboard
2. Creating a context provider for MCP communication
3. Replacing direct AppTweak API calls with MCP tool invocations

## Step 1: Install Dependencies

Add the MCP client library to your dashboard project:

```bash
npm install @modelcontextprotocol/sdk
```

## Step 2: Create an MCP Client Context

Create a new file `src/contexts/McpContext.tsx`:

```tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { useRouting } from './RoutingContext';

// Define types for our context
interface McpContextType {
  client: Client | null;
  isConnected: boolean;
  invoke: <T = any>(tool: string, params: Record<string, any>) => Promise<T>;
  error: Error | null;
}

// Create the context with default values
const McpContext = createContext<McpContextType>({
  client: null,
  isConnected: false,
  invoke: async () => {
    throw new Error('MCP client not initialized');
  },
  error: null,
});

// Create a provider component
export const McpProvider: React.FC<{ 
  children: React.ReactNode;
  serverUrl: string;
}> = ({ children, serverUrl }) => {
  const [client, setClient] = useState<Client | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { 
    setActiveTab, 
    setActiveSection, 
    setHighlightSection, 
    setActiveDataPoint 
  } = useRouting();

  // Connect to the MCP server on component mount
  useEffect(() => {
    let transport: SSEClientTransport | null = null;
    
    const connectToMcp = async () => {
      try {
        transport = new SSEClientTransport(new URL(`${serverUrl}/sse`));
        
        const mcpClient = new Client(
          {
            name: 'app-optimizer-dashboard',
            version: '1.0.0',
          },
          {
            capabilities: {
              prompts: {},
              resources: {},
              tools: {},
            },
          }
        );

        await mcpClient.connect(transport);
        setClient(mcpClient);
        setIsConnected(true);
        setError(null);
        
        console.log('Connected to MCP server', mcpClient.getServerCapabilities());
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to connect to MCP server'));
        setIsConnected(false);
        console.error('Error connecting to MCP server:', err);
      }
    };

    connectToMcp();

    // Cleanup function
    return () => {
      if (transport) {
        transport.close();
        setIsConnected(false);
        setClient(null);
      }
    };
  }, [serverUrl]);

  // Wrapper function to invoke MCP tools and handle routing
  const invoke = async <T = any>(tool: string, params: Record<string, any>): Promise<T> => {
    if (!client || !isConnected) {
      throw new Error('MCP client not connected');
    }

    try {
      const result = await client.invoke(tool, params);
      
      // Handle routing if metadata is present
      if (result.metadata?.routingInfo) {
        const { tabId, sectionId, highlightEffect, dataPoint } = result.metadata.routingInfo;
        
        // Update routing state to navigate to the appropriate section
        setActiveTab(tabId);
        setActiveSection(sectionId);
        
        if (highlightEffect) {
          setHighlightSection(true);
        }
        
        if (dataPoint) {
          setActiveDataPoint(dataPoint);
        }
      }
      
      // Return the actual data content
      return result.content[0].json as T;
    } catch (err) {
      console.error(`Error invoking MCP tool ${tool}:`, err);
      throw err;
    }
  };

  return (
    <McpContext.Provider value={{ client, isConnected, invoke, error }}>
      {children}
    </McpContext.Provider>
  );
};

// Custom hook to use the MCP context
export const useMcp = () => {
  const context = useContext(McpContext);
  if (context === undefined) {
    throw new Error('useMcp must be used within a McpProvider');
  }
  return context;
};
```

## Step 3: Update App.tsx to Include the MCP Provider

Update your `src/App.tsx` file:

```tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RoutingProvider } from "@/contexts/RoutingContext";
import { McpProvider } from "@/contexts/McpContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// The URL of your deployed MCP server
const MCP_SERVER_URL = process.env.REACT_APP_MCP_SERVER_URL || 'https://your-vercel-deployment.vercel.app';

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <RoutingProvider>
        <McpProvider serverUrl={MCP_SERVER_URL}>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </McpProvider>
      </RoutingProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
```

## Step 4: Replace Direct API Calls with MCP Tool Invocations

Now you can replace direct AppTweak API calls with MCP tool invocations. For example, in your `OverviewTab.tsx` component:

### Before:

```tsx
import { useState, useEffect } from 'react';
import { fetchAppDetails } from '@/utils/apptweak-api';

const OverviewTab = () => {
  const [appDetails, setAppDetails] = useState(null);
  
  useEffect(() => {
    const loadAppDetails = async () => {
      const data = await fetchAppDetails('123456789', 'ios');
      setAppDetails(data);
    };
    
    loadAppDetails();
  }, []);
  
  // ...render component with appDetails
};
```

### After:

```tsx
import { useState, useEffect } from 'react';
import { useMcp } from '@/contexts/McpContext';

const OverviewTab = () => {
  const [appDetails, setAppDetails] = useState(null);
  const { invoke } = useMcp();
  
  useEffect(() => {
    const loadAppDetails = async () => {
      const data = await invoke('get_app_details', {
        appId: '123456789',
        platform: 'ios'
      });
      setAppDetails(data);
    };
    
    loadAppDetails();
  }, [invoke]);
  
  // ...render component with appDetails
};
```

## Step 5: Use MCP with Hooks and React Query

For a more modern approach, you can create custom hooks that use both MCP and React Query:

```tsx
import { useQuery } from '@tanstack/react-query';
import { useMcp } from '@/contexts/McpContext';

// Custom hook for fetching app details
export function useAppDetails(appId: string, platform: 'ios' | 'android') {
  const { invoke } = useMcp();
  
  return useQuery({
    queryKey: ['app-details', appId, platform],
    queryFn: async () => {
      return invoke('get_app_details', { appId, platform });
    },
    enabled: !!appId && !!platform,
  });
}

// Custom hook for fetching reviews
export function useAppReviews(appId: string, platform: 'ios' | 'android') {
  const { invoke } = useMcp();
  
  return useQuery({
    queryKey: ['app-reviews', appId, platform],
    queryFn: async () => {
      return invoke('get_reviews', { appId, platform });
    },
    enabled: !!appId && !!platform,
  });
}
```

Then use these hooks in your components:

```tsx
import { useAppDetails, useAppReviews } from '@/hooks/app-data';

const AppDetailsSection = ({ appId, platform }) => {
  const { data, isLoading, error } = useAppDetails(appId, platform);
  
  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;
  
  return (
    <div>
      <h2>{data.name}</h2>
      <p>{data.description}</p>
      {/* ...more details */}
    </div>
  );
};
```

## Benefits of This Approach

1. **Centralized API Communication**: All API calls go through the MCP server, simplifying your frontend code
2. **Automatic Routing**: The routing happens automatically based on the metadata returned from the server
3. **Improved Performance**: The MCP server handles caching to reduce API calls
4. **Better Error Handling**: Errors are handled consistently across all API calls

## Step 6: Create Custom Data Hooks

Create a new file `src/hooks/app-data.ts` to centralize all your data fetching hooks:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMcp } from '@/contexts/McpContext';

// App Details
export function useAppDetails(appId: string, platform: 'ios' | 'android') {
  const { invoke } = useMcp();
  
  return useQuery({
    queryKey: ['app-details', appId, platform],
    queryFn: async () => invoke('get_app_details', { appId, platform }),
    enabled: !!appId && !!platform,
  });
}

// Reviews
export function useAppReviews(appId: string, platform: 'ios' | 'android', country = 'US') {
  const { invoke } = useMcp();
  
  return useQuery({
    queryKey: ['app-reviews', appId, platform, country],
    queryFn: async () => invoke('get_reviews', { appId, platform, country }),
    enabled: !!appId && !!platform,
  });
}

export function useTopDisplayedReviews(
  appId: string, 
  platform: 'ios' | 'android', 
  sort: 'most_useful' | 'most_recent' | 'most_positive' = 'most_useful'
) {
  const { invoke } = useMcp();
  
  return useQuery({
    queryKey: ['top-reviews', appId, platform, sort],
    queryFn: async () => invoke('get_top_displayed_reviews', { 
      appId, 
      platform, 
      sort,
      size: 50,
    }),
    enabled: !!appId && !!platform,
  });
}

export function useRatingsAnalysis(
  appId: string, 
  platform: 'ios' | 'android',
  startDate?: string,
  endDate?: string
) {
  const { invoke } = useMcp();
  
  return useQuery({
    queryKey: ['ratings-analysis', appId, platform, startDate, endDate],
    queryFn: async () => invoke('analyze_ratings', { 
      appId, 
      platform,
      startDate,
      endDate, 
    }),
    enabled: !!appId && !!platform,
  });
}

// Keywords
export function useKeywordDiscovery(query: string, platform: 'ios' | 'android') {
  const { invoke } = useMcp();
  
  return useQuery({
    queryKey: ['keyword-discovery', query, platform],
    queryFn: async () => invoke('discover_keywords', { query, platform }),
    enabled: !!query && !!platform,
  });
}

export function useTopKeywords(appIds: string[], platform: 'ios' | 'android') {
  const { invoke } = useMcp();
  
  return useQuery({
    queryKey: ['top-keywords', appIds.join(','), platform],
    queryFn: async () => invoke('analyze_top_keywords', { appIds, platform }),
    enabled: appIds.length > 0 && !!platform,
  });
}

// Competitors
export function useCompetitors(appId: string, platform: 'ios' | 'android') {
  const { invoke } = useMcp();
  
  return useQuery({
    queryKey: ['competitors', appId, platform],
    queryFn: async () => invoke('get_competitors', { appId, platform }),
    enabled: !!appId && !!platform,
  });
}

export function useCompetitivePosition(
  appId: string, 
  platform: 'ios' | 'android',
  competitors?: string[]
) {
  const { invoke } = useMcp();
  
  return useQuery({
    queryKey: ['competitive-position', appId, platform, competitors?.join(',')],
    queryFn: async () => invoke('analyze_competitive_position', { 
      appId, 
      platform,
      competitors, 
    }),
    enabled: !!appId && !!platform,
  });
}

// Downloads
export function useDownloads(
  appId: string, 
  platform: 'ios' | 'android',
  country: string,
  startDate: string,
  endDate: string
) {
  const { invoke } = useMcp();
  
  return useQuery({
    queryKey: ['downloads', appId, platform, country, startDate, endDate],
    queryFn: async () => invoke('get_downloads', { 
      appId, 
      platform,
      country,
      startDate,
      endDate, 
    }),
    enabled: !!appId && !!platform && !!country && !!startDate && !!endDate,
  });
}
```

## Step 7: Update Components to Use the New Hooks

Now update your components to use these new hooks. For example, updating the Overview tab:

```tsx
import React, { useRef } from 'react';
import { useRouting } from '@/contexts/RoutingContext';
import MetricCard from '../ui/MetricCard';
import ChartContainer from '../ui/ChartContainer';
import DataTable from '../ui/DataTable';
import InsightsPanel from '../ui/InsightsPanel';
import { useAppDetails, useDownloads, useTopKeywords } from '@/hooks/app-data';
import { formatDownloadData, formatKeywordData } from '@/utils/data-formatters';

const OverviewTab = () => {
  const { activeSection, highlightSection, resetRouting } = useRouting();
  
  // Create refs for each section
  const appInfoRef = useRef<HTMLDivElement>(null);
  const downloadStatsRef = useRef<HTMLDivElement>(null);
  const performanceTrendsRef = useRef<HTMLDivElement>(null);
  // ...other refs
  
  // Map section IDs to refs
  const sectionRefs = {
    'app-info': appInfoRef,
    'download-statistics': downloadStatsRef,
    'performance-trends': performanceTrendsRef,
    // ...other mappings
  };
  
  // Fetch data using our new hooks
  const { data: appDetails, isLoading: isLoadingApp } = useAppDetails('123456789', 'ios');
  const { data: downloadData, isLoading: isLoadingDownloads } = useDownloads(
    '123456789', 
    'ios', 
    'US', 
    '2023-01-01', 
    '2023-06-30'
  );
  const { data: keywordData, isLoading: isLoadingKeywords } = useTopKeywords(['123456789'], 'ios');
  
  // Handle section highlighting
  React.useEffect(() => {
    if (activeSection && sectionRefs[activeSection]?.current) {
      // Scroll to the section
      sectionRefs[activeSection].current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
      
      // Add a highlight effect if requested
      if (highlightSection) {
        const element = sectionRefs[activeSection].current;
        
        // Add highlight class
        element?.classList.add('highlight-section');
        
        // Remove highlight after animation completes
        setTimeout(() => {
          element?.classList.remove('highlight-section');
          resetRouting();
        }, 2000);
      }
    }
  }, [activeSection, highlightSection, resetRouting]);
  
  // Render loading state
  if (isLoadingApp || isLoadingDownloads || isLoadingKeywords) {
    return <div>Loading dashboard data...</div>;
  }
  
  // Format the data
  const formattedDownloadData = formatDownloadData(downloadData);
  const formattedKeywordData = formatKeywordData(keywordData);
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* App Info Section */}
      <div ref={appInfoRef} id="app-info" className="section-container">
        {/* App info content */}
      </div>
      
      {/* Download Statistics Section */}
      <div ref={downloadStatsRef} id="download-statistics" className="section-container">
        {/* Download statistics content using formattedDownloadData */}
      </div>
      
      {/* Performance Trends Section */}
      <div ref={performanceTrendsRef} id="performance-trends" className="section-container">
        {/* Performance trends content */}
      </div>
      
      {/* ...other sections */}
    </div>
  );
};

export default OverviewTab;
```

## Step 8: Create a Test Component

To verify the integration is working correctly, you can create a simple test component:

```tsx
import React from 'react';
import { useMcp } from '@/contexts/McpContext';

const McpTestComponent = () => {
  const { isConnected, error, invoke } = useMcp();
  const [result, setResult] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  
  const testConnection = async () => {
    if (!isConnected) return;
    
    setIsLoading(true);
    try {
      // Simple echo test
      const echoResult = await invoke('echo', { message: 'Hello from the dashboard!' });
      setResult(echoResult);
    } catch (err) {
      console.error('Test failed:', err);
      setResult({ error: String(err) });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="p-4 border rounded-lg">
      <h2 className="text-lg font-medium mb-2">MCP Connection Test</h2>
      <div className="mb-4">
        <p>Connection status: {isConnected ? '✅ Connected' : '❌ Disconnected'}</p>
        {error && <p className="text-red-500">Error: {error.message}</p>}
      </div>
      
      <button 
        onClick={testConnection}
        disabled={!isConnected || isLoading}
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
      >
        {isLoading ? 'Testing...' : 'Test Connection'}
      </button>
      
      {result && (
        <div className="mt-4 p-3 bg-gray-100 rounded overflow-auto">
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default McpTestComponent;
```

You can add this component temporarily to your Index page to verify that everything is working correctly.

## Step 9: Deploy to Production

Once everything is working correctly:

1. Deploy your MCP server to Vercel
2. Set the `REACT_APP_MCP_SERVER_URL` environment variable in your dashboard deployment
3. Deploy the updated dashboard

## Troubleshooting

### Connection Issues

If you're having trouble connecting to the MCP server:

1. Check that the server is deployed and running correctly
2. Verify that the URL is correct and accessible
3. Check browser console for CORS errors (the MCP server may need CORS headers)
4. Try running locally with a local MCP server first

### Data Not Showing Up

If the data is not appearing:

1. Check the browser console for errors
2. Verify that the AppTweak API key is set correctly in the MCP server
3. Test the API directly to ensure it's returning data
4. Add more logging to the MCP server to see if requests are being received

### Routing Not Working

If automatic routing is not working:

1. Check that the metadata is correctly included in the MCP server responses
2. Verify that the routing context is properly connected
3. Add console logs to trace the flow of routing information
