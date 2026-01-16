import { ClerkProvider, useAuth } from '@clerk/tanstack-react-start'
import { ConvexProvider } from 'convex/react'
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { useMemo } from 'react'
import { ConvexReactClient } from 'convex/react'

import Header from '../components/Header'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'BHIMS - Barangay Health Information Management System',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),

  shellComponent: RootDocument,
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-gray-600">Page not found</p>
      </div>
    </div>
  ),
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <ConvexProviderWithAuth>
        <html lang="en">
          <head>
            <HeadContent />
          </head>
          <body>
            <Header />
            {children}
            <TanStackDevtools
              config={{
                position: 'bottom-right',
              }}
              plugins={[
                {
                  name: 'Tanstack Router',
                  render: <TanStackRouterDevtoolsPanel />,
                },
              ]}
            />
            <Scripts />
          </body>
        </html>
      </ConvexProviderWithAuth>
    </ClerkProvider>
  )
}

// ConvexProvider with Clerk auth token integration
// This passes the Clerk JWT token to Convex with each request
function ConvexProviderWithAuth({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded: authLoaded } = useAuth()
  
  // Create Convex client with Clerk token for authenticated requests
  const convexClient = useMemo(() => {
    const client = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL)
    
    // Set auth function to get Clerk JWT token
    // This is called by Convex before each request
    // ✅ SAFETY: Only set auth if getToken is available
    if (typeof (client as any).setAuth === 'function' && getToken) {
      ;(client as any).setAuth(async () => {
        try {
          // ✅ SAFETY: Wait for auth to be loaded before getting token
          if (!authLoaded) {
            return undefined
          }
          
          // Get Clerk JWT token with "convex" template
          // This token is verified by Convex using auth.config.js
          const token = await getToken({ template: 'convex' })
          
          // ✅ SAFETY: Return undefined (not null) if no token
          // Convex expects undefined for "no auth", null might cause issues
          return token || undefined
        } catch (error) {
          // ✅ SAFETY: Don't log expected errors (user not signed in)
          // Only log unexpected errors
          if (error instanceof Error && !error.message.includes('not authenticated')) {
            console.error('Error getting Clerk token for Convex:', error)
          }
          return undefined
        }
      })
    }
    
    return client
  }, [getToken, authLoaded])

  return <ConvexProvider client={convexClient}>{children}</ConvexProvider>
}
