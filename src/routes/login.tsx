import { SignIn, useAuth } from '@clerk/tanstack-react-start'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const { isLoaded, isSignedIn } = useAuth()
  const navigate = useNavigate()

  // Redirect if already signed in (root page will handle role-based redirect)
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate({ to: '/' })
    }
  }, [isLoaded, isSignedIn, navigate])

  // Show loading while Clerk is initializing
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Show redirecting message if already signed in
  if (isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-md">
        <SignIn routing="virtual" />
      </div>
    </div>
  )
}
