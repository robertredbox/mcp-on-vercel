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
5. **Reduced Frontend Complexity**: The routing logic is moved to the server, making the frontend code cleaner

## Step 6: Create Data Hooks for Each AppTweak Feature

To fully leverage the MCP server, create a set of specialized hooks for each AppTweak feature area:

### src/hooks/useKeywords.ts

```tsx
import { useQuery } from '@tanstack/react-query';
import { useMcp } from '@/contexts/McpContext';

export function useKeywordDiscovery(query: string, platform: 'ios' | 'android', options = {}) {
  const { invoke } = useMcp();
  
  return useQuery({
    queryKey: ['keyword-discovery', query, platform],
    queryFn: async () => {
      return invoke('discover_keywords', { 
        query, 
        platform,
        country: options.country || 'US',
        limit: options.limit || 20
      });
    },
    enabled: !!query && !!platform,
  });
}

export function useTopKeywords(appIds: string[], platform: 'ios' | 'android', options = {}) {
  const { invoke } = useMcp();
  
  return useQuery({
    queryKey: ['top-keywords', appIds, platform],
    queryFn: async () => {
      return invoke('analyze_top_keywords', {
        appIds,
        platform,
        country: options.country || 'US',
        limit: options.limit || 10,
        sortBy: options.sortBy || 'score'
      });
    },
    enabled: appIds.length > 0 && !!platform,
  });
}
```

### src/hooks/useCompetitors.ts

```tsx
import { useQuery } from '@tanstack/react-query';
import { useMcp } from '@/contexts/McpContext';

export function useCompetitors(appId: string, platform: 'ios' | 'android', options = {}) {
  const { invoke } = useMcp();
  
  return useQuery({
    queryKey: ['competitors', appId, platform],
    queryFn: async () => {
      return invoke('get_competitors', { 
        appId, 
        platform,
        country: options.country || 'US'
      });
    },
    enabled: !!appId && !!platform,
  });
}

export function useCompetitivePosition(appId: string, platform: 'ios' | 'android', options = {}) {
  const { invoke } = useMcp();
  
  return useQuery({
    queryKey: ['competitive-position', appId, platform, options.competitors],
    queryFn: async () => {
      return invoke('analyze_competitive_position', {
        appId,
        platform,
        country: options.country || 'US',
        competitors: options.competitors
      });
    },
    enabled: !!appId && !!platform,
  });
}
```

## Step 7: Update Your Components

Now update your tab components to use these hooks:

### KeywordTab.tsx

```tsx
import { useState } from 'react';
import { useKeywordDiscovery, useTopKeywords } from '@/hooks/useKeywords';

const KeywordTab = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [appId, setAppId] = useState('');
  
  // Get keyword discoveries for the search query
  const { 
    data: keywordDiscoveries, 
    isLoading: isLoadingDiscoveries 
  } = useKeywordDiscovery(searchQuery, 'ios', { limit: 30 });
  
  // Get top keywords for the selected app
  const { 
    data: topKeywords, 
    isLoading: isLoadingTopKeywords 
  } = useTopKeywords(appId ? [appId] : [], 'ios');
  
  // Component rendering logic...
};
```

## Step 8: Handle Connection State

Add a connection status indicator to inform users when the MCP connection is established:

```tsx
// src/components/McpConnectionStatus.tsx
import { useMcp } from '@/contexts/McpContext';

export const McpConnectionStatus = () => {
  const { isConnected, error } = useMcp();
  
  if (error) {
    return (
      <div className="bg-destructive/20 text-destructive px-3 py-1 rounded-full text-xs font-medium">
        API Error: {error.message}
      </div>
    );
  }
  
  if (!isConnected) {
    return (
      <div className="bg-warning/20 text-warning px-3 py-1 rounded-full text-xs font-medium animate-pulse">
        Connecting to API...
      </div>
    );
  }
  
  return (
    <div className="bg-success/20 text-success px-3 py-1 rounded-full text-xs font-medium">
      API Connected
    </div>
  );
};
```

Then add this component to your header:

```tsx
import { McpConnectionStatus } from '@/components/McpConnectionStatus';

// In your header component
<header className="border-b bg-white py-4 px-6">
  <div className="flex justify-between items-center">
    <h1 className="text-xl font-medium">ASO Dashboard</h1>
    <div className="flex items-center gap-4">
      <McpConnectionStatus />
      <div className="text-sm text-muted-foreground">Last updated: June 10, 2023</div>
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
        JS
      </div>
    </div>
  </div>
</header>
```

## Step 9: Add Error Handling for Failed API Calls

Implement a toast notification system for handling API errors:

```tsx
// In your McpContext.tsx
import { useToast } from '@/components/ui/use-toast';

export const McpProvider = ({ children, serverUrl }) => {
  // Existing code...
  const { toast } = useToast();
  
  // Updated invoke function with error toasts
  const invoke = async <T = any>(tool: string, params: Record<string, any>): Promise<T> => {
    if (!client || !isConnected) {
      toast({
        title: 'Connection Error',
        description: 'Not connected to the API server. Please try again later.',
        variant: 'destructive',
      });
      throw new Error('MCP client not connected');
    }

    try {
      const result = await client.invoke(tool, params);
      
      // Handle routing...
      
      // Check for errors in the API response
      if (result.content[0].json?.error) {
        toast({
          title: 'API Error',
          description: result.content[0].json.message || 'An error occurred while fetching data',
          variant: 'destructive',
        });
      }
      
      return result.content[0].json as T;
    } catch (err) {
      toast({
        title: 'API Error',
        description: err instanceof Error ? err.message : 'An error occurred while fetching data',
        variant: 'destructive',
      });
      console.error(`Error invoking MCP tool ${tool}:`, err);
      throw err;
    }
  };
  
  // Remaining code...
};
```

## Conclusion

By following this integration guide, you've successfully:

1. Connected your app-optimizer-dashboard to the AppTweak MCP server
2. Created a clean, consistent interface for accessing AppTweak data
3. Implemented automatic routing based on API calls
4. Added proper error handling and connection status indicators
5. Organized your data access with custom hooks

This integrated architecture separates your data access concerns from your UI components, making your codebase more maintainable and scalable. The automatic routing through MCP enables a seamless user experience where the dashboard automatically navigates to the relevant section whenever data is requested.
