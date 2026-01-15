import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: HomePage })

function HomePage() {
  // Root page - will show logo if not logged in, redirect if logged in
  // Implementation coming in Phase 5
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">BHIMS 2.0</h1>
        <p className="text-gray-600">Barangay Health Information Management System</p>
      </div>
    </div>
  )
}
