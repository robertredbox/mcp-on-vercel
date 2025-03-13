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
5. **Reduced API Key Exposure**: Your AppTweak API key stays on the server, not in the frontend code

## Step 6: Update Tab Components to Support MCP Integration

To fully leverage the MCP server's routing capabilities, you'll need to ensure your tab components correctly handle the routing information. Here's how to update the `OverviewTab.tsx` component to work with the MCP integration:

```tsx
import React, { useRef, useEffect } from "react";
import { useRouting } from "@/contexts/RoutingContext";
import { useAppDetails, useDownloadStats } from "@/hooks/app-data";
import MetricCard from "../ui/MetricCard";
import ChartContainer from "../ui/ChartContainer";
// ...other imports

const OverviewTab = () => {
  const { activeSection, highlightSection, resetRouting } = useRouting();
  const { data: appDetails } = useAppDetails('123456789', 'ios');
  const { data: downloadStats } = useDownloadStats('123456789', 'ios');
  
  // Create refs for each section
  const appInfoRef = useRef<HTMLDivElement>(null);
  const downloadStatsRef = useRef<HTMLDivElement>(null);
  // ...other refs
  
  // Map section IDs to refs
  const sectionRefs: Record<string, React.RefObject<HTMLDivElement>> = {
    "app-info": appInfoRef,
    "download-statistics": downloadStatsRef,
    // ...other section mappings
  };
  
  // Scroll to active section when it changes
  useEffect(() => {
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* App Info Section */}
      <div ref={appInfoRef} id="app-info" className="section-container">
        {appDetails && (
          <div>
            <h2>{appDetails.name}</h2>
            <p>{appDetails.description}</p>
            {/* ...more app info */}
          </div>
        )}
      </div>
      
      {/* Download Statistics Section */}
      <div ref={downloadStatsRef} id="download-statistics" className="section-container">
        {downloadStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <MetricCard 
              title="Total Downloads" 
              value={downloadStats.totalDownloads} 
              change={downloadStats.change} 
              trend={downloadStats.trend as 'up' | 'down'} 
            />
            {/* ...other metrics */}
          </div>
        )}
      </div>
      
      {/* ...other sections */}
    </div>
  );
};

export default OverviewTab;
```

## Step 7: Create Data Hooks

Create a hooks directory with files for each data type. For example, `src/hooks/app-data.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { useMcp } from '@/contexts/McpContext';

// App Details
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

// Download Statistics
export function useDownloadStats(
  appId: string, 
  platform: 'ios' | 'android', 
  startDate = '2023-01-01', 
  endDate = '2023-12-31'
) {
  const { invoke } = useMcp();
  
  return useQuery({
    queryKey: ['downloads', appId, platform, startDate, endDate],
    queryFn: async () => {
      return invoke('get_downloads', { 
        appId, 
        platform, 
        country: 'US',
        startDate,
        endDate
      });
    },
    enabled: !!appId && !!platform,
  });
}

// ... similar hooks for other data types

// Reviews
export function useReviews(appId: string, platform: 'ios' | 'android') {
  const { invoke } = useMcp();
  
  return useQuery({
    queryKey: ['reviews', appId, platform],
    queryFn: async () => {
      return invoke('get_reviews', { appId, platform });
    },
    enabled: !!appId && !!platform,
  });
}

// Keywords
export function useTopKeywords(appId: string, platform: 'ios' | 'android') {
  const { invoke } = useMcp();
  
  return useQuery({
    queryKey: ['top-keywords', appId, platform],
    queryFn: async () => {
      return invoke('analyze_top_keywords', { 
        appIds: [appId], 
        platform,
        limit: 20
      });
    },
    enabled: !!appId && !!platform,
  });
}

// Competitors
export function useCompetitors(appId: string, platform: 'ios' | 'android') {
  const { invoke } = useMcp();
  
  return useQuery({
    queryKey: ['competitors', appId, platform],
    queryFn: async () => {
      return invoke('get_competitors', { appId, platform });
    },
    enabled: !!appId && !!platform,
  });
}
```

## Step 8: Add Connection Status Indicator

Add a status indicator to show when the MCP client is connected:

```tsx
// src/components/ui/McpConnectionStatus.tsx
import { useMcp } from '@/contexts/McpContext';

export const McpConnectionStatus = () => {
  const { isConnected, error } = useMcp();
  
  if (error) {
    return (
      <div className="bg-red-100 text-red-700 px-3 py-1 rounded-md text-sm">
        MCP Error: {error.message}
      </div>
    );
  }
  
  if (!isConnected) {
    return (
      <div className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-md text-sm">
        Connecting to server...
      </div>
    );
  }
  
  return (
    <div className="bg-green-100 text-green-700 px-3 py-1 rounded-md text-sm">
      Connected to MCP server
    </div>
  );
};
```

Then add this component to your header in `Index.tsx`:

```tsx
import { McpConnectionStatus } from '@/components/ui/McpConnectionStatus';

// Inside your header JSX
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

## Deployment Checklist

Before deploying:

1. Make sure your AppTweak MCP server is deployed to Vercel and running
2. Add the `REACT_APP_MCP_SERVER_URL` environment variable to your app-optimizer-dashboard environment
3. Test the connection locally before deploying
4. Remove any direct AppTweak API calls from your dashboard code
5. Ensure all components correctly use the MCP hooks

After these changes, your app-optimizer-dashboard will automatically navigate to the right tab and section whenever it receives data from the AppTweak MCP server!
