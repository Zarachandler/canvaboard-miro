'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
// import { ensureUserInDatabase} from '@/lib/board'

export default function AuthPage() {
  const [mode, setMode] = useState<'signup' | 'login'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Add user to users table after successful signup/login
  const addUserToDatabase = async (userEmail: string, userName: string) => {
    try {
      // await ensureUserInDatabase(userEmail, userName);
      console.log('User added to database:', userEmail);
    } catch (error) {
      console.error('Error adding user to database:', error);
    }
  }

  // Email/password login or signup
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (mode === 'signup') {
        // For signup: Create user in Supabase Auth
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { 
            data: { full_name: name },
            emailRedirectTo: `${window.location.origin}/dashboard`
          },
        })

        if (error) throw error

        if (data.user) {
          // Add user to your users table immediately after signup
          await addUserToDatabase(email, name || email.split('@')[0]);
        }

        toast.success('✅ Account created! Please check your email to confirm your account.')
        setMode('login')
        setEmail('')
        setPassword('')
        setName('')
      } else {
        // For login: Check if user exists in your users table first
        // const userExists = await verifyUserInDatabase(email);
        
        // if (!userExists) {
        //   toast.error('❌ User not found in system. Please contact administrator.')
        //   return;
        // }

        // Then authenticate with Supabase
        const { data, error } = await supabase.auth.signInWithPassword({ 
          email, 
          password 
        })

        if (error) {
          toast.error('❌ Invalid email or password')
          return
        }

        if (!data.session) {
          toast.error('❌ You must confirm your email before logging in.')
          return
        }

        // Ensure user is in your users table (in case they signed up via OAuth)
        await addUserToDatabase(email, data.user.user_metadata?.full_name || email.split('@')[0]);

        // Store user data in localStorage for dashboard
        localStorage.setItem('userEmail', email);
        localStorage.setItem('userName', data.user.user_metadata?.full_name || email.split('@')[0]);
        localStorage.setItem('userId', data.user.id);

        toast.success('🎉 Logged in successfully!')
        router.push('/dashboard')
      }
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <Card className="w-full max-w-md shadow-xl rounded-2xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="space-y-2 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <div className="w-6 h-6 bg-white rounded-lg opacity-90"></div>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-gray-900">
            {mode === 'signup' ? 'Create your Miro account' : 'Welcome to Miro'}
          </CardTitle>
          <CardDescription className="text-gray-600">
            {mode === 'signup'
              ? 'Sign up to start collaborating on boards'
              : 'Sign in to your collaborative workspace'}
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-700">Full Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Enter your full name"
                  className="bg-white border-gray-200 focus:border-blue-400 focus:ring-blue-400/20"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
                className="bg-white border-gray-200 focus:border-blue-400 focus:ring-blue-400/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                className="bg-white border-gray-200 focus:border-blue-400 focus:ring-blue-400/20"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full text-base font-medium bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{mode === 'signup' ? 'Creating Account...' : 'Signing In...'}</span>
                </div>
              ) : mode === 'signup' ? 'Sign Up' : 'Sign In'}
            </Button>

            <div className="flex items-center space-x-2 py-2">
              <Separator className="flex-1 bg-gray-300" />
              <span className="text-xs text-gray-600">or continue with</span>
              <Separator className="flex-1 bg-gray-300" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {/* Add Google OAuth here */}}
                className="flex items-center justify-center space-x-2 bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              >
                <span>Google</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => {/* Add Facebook OAuth here */}}
                className="flex items-center justify-center space-x-2 bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              >
                <span>Facebook</span>
              </Button>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <p className="text-gray-600 text-sm text-center">
              {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                className="text-blue-600 font-medium hover:text-blue-700 hover:underline"
                onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
              >
                {mode === 'signup' ? 'Sign In' : 'Sign Up'}
              </button>
            </p>

            {/* Demo Instructions */}
            {mode === 'login' && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-800 text-center">
                  <strong>Demo:</strong> Use any email that exists in your users table
                </p>
              </div>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}