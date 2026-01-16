import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, CheckCircle2, FileText } from 'lucide-react'

export const Route = createFileRoute('/queue-display')({
  component: QueueDisplayPage,
})

/**
 * Public Queue Display Screen (TV Screen)
 * 
 * Features:
 * - Real-time queue updates via Convex subscriptions
 * - Three-column table layout: Queue | Processing | Claim
 * - Large, readable format for TV screens
 * - Support for custom backgrounds/ads via CSS
 * - Optimized single query using by_status_createdAt index
 */
function QueueDisplayPage() {
  // ✅ OPTIMIZED: Single query that fetches all three statuses at once
  // Reduces from 3 separate queries to 1 query
  // Uses by_status_createdAt index for efficient ordering
  // Real-time updates via Convex subscriptions (no polling needed)
  const queueData = useQuery(api.queue.getDisplayData, { doneLimit: 10 })

  // Show loading state
  if (queueData === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-20 h-20 mx-auto mb-4 text-gray-400 animate-spin" />
          <p className="text-3xl text-gray-600 font-semibold">Loading queue...</p>
        </div>
      </div>
    )
  }

  // Custom Background/Ad Area - Easy to customize
  // To add background: className="bg-[url('/path/to/image.jpg')] bg-cover bg-center"
  // For ads: Add your ad content in the designated areas below

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-gray-800">
            Barangay Handumanan
          </h1>
          <p className="text-xl md:text-2xl font-semibold mb-3 text-gray-700">
            Queue Display
          </p>
          <p className="text-base md:text-lg text-gray-600">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>

        {/* Three-Column Table Layout: Queue | Processing | Claim */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Column 1: Queue (Waiting) */}
          <Card className="bg-blue-50 border-2 border-blue-300">
            <CardHeader className="pb-3">
              <CardTitle className="text-2xl md:text-3xl font-bold text-center text-blue-700">
                QUEUE
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {queueData.waiting.length > 0 ? (
                <>
                  {queueData.waiting.slice(0, 15).map((item) => (
                    <Card
                      key={item._id}
                      className="border-2 border-blue-300 hover:bg-blue-100 transition-all"
                    >
                      <CardContent className="p-3 text-center">
                        <p className="text-3xl md:text-4xl font-bold text-blue-600">
                          {item.queueNumber}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                  {queueData.waiting.length > 15 && (
                    <div className="text-center pt-2">
                      <p className="text-sm md:text-base text-blue-600 font-semibold">
                        +{queueData.waiting.length - 15} more
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 mx-auto mb-3 text-blue-300" />
                  <p className="text-sm text-blue-400 font-medium">Waiting for requests</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Column 2: Processing (Serving) */}
          <Card className="bg-yellow-50 border-2 border-yellow-400">
            <CardHeader className="pb-3">
              <CardTitle className="text-2xl md:text-3xl font-bold text-center text-yellow-700">
                PROCESSING
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {queueData.serving.length > 0 ? (
                queueData.serving.map((item) => (
                  <Card
                    key={item._id}
                    className="bg-yellow-100 border-2 border-yellow-400 hover:bg-yellow-200 transition-all"
                  >
                    <CardContent className="p-3 text-center">
                      <p className="text-3xl md:text-4xl font-bold text-yellow-700">
                        {item.queueNumber}
                      </p>
                      {item.counterNumber && (
                        <p className="text-sm md:text-base text-yellow-800 mt-1 font-semibold">
                          Counter {item.counterNumber}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-yellow-300" />
                  <p className="text-sm text-yellow-400 font-medium">No active processing</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Column 3: Claim (Done) */}
          <Card className="bg-green-50 border-2 border-green-400">
            <CardHeader className="pb-3">
              <CardTitle className="text-2xl md:text-3xl font-bold text-center text-green-700">
                CLAIM
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {queueData.done.length > 0 ? (
                queueData.done.map((item) => (
                  <Card
                    key={item._id}
                    className="border-2 border-green-300 hover:bg-green-100 transition-all"
                  >
                    <CardContent className="p-3 text-center">
                      <p className="text-3xl md:text-4xl font-bold text-green-600">
                        {item.queueNumber}
                      </p>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-green-300" />
                  <p className="text-sm text-green-400 font-medium">No documents ready</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Ad/Background Area - Customize here */}
        {/* 
          Example 1: Large Image Ad Banner
          <div className="mt-8 text-center">
            <img 
              src="/ads/banner.jpg" 
              alt="Advertisement" 
              className="max-w-full h-auto rounded-lg shadow-xl" 
            />
          </div>
          
          Example 2: Multiple Image Cards (Side by Side)
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <img src="/ads/ad1.jpg" alt="Ad 1" className="w-full h-auto rounded-lg shadow-md" />
            <img src="/ads/ad2.jpg" alt="Ad 2" className="w-full h-auto rounded-lg shadow-md" />
            <img src="/ads/ad3.jpg" alt="Ad 3" className="w-full h-auto rounded-lg shadow-md" />
          </div>
          
          Example 3: Wide Image Strip
          <div className="mt-8">
            <img 
              src="/ads/wide-banner.jpg" 
              alt="Wide Banner" 
              className="w-full h-auto rounded-lg shadow-xl" 
            />
          </div>
        */}
      </div>
    </div>
  )
}
