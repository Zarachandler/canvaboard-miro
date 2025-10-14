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
// import { FcGoogle } from 'react-icons/fc'
// import { FaFacebook } from 'react-icons/fa'

export default function AuthPage() {
  const [mode, setMode] = useState<'signup' | 'login'>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Email/password login or signup
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        })

        if (error) throw error

        toast.success('✅ Account created! Please confirm your email before logging in.')
        setMode('login')
        setEmail('')
        setPassword('')
        setName('')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          toast.error('❌ Invalid email or password')
          return
        }

        const { data: sessionData } = await supabase.auth.getSession()
        if (!sessionData.session) {
          toast.error('❌ You must confirm your email before logging in.')
          return
        }

        toast.success('🎉 Logged in successfully!')
        router.push('/dashboard')
      }
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  // OAuth login
  const handleOAuthLogin = async (provider: 'google' | 'facebook') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    })
    if (error) toast.error(error.message)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-xl rounded-2xl border border-border bg-white">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight text-black">
            {mode === 'signup' ? 'Create your Miro account' : 'Welcome back to Miro'}
          </CardTitle>
          <CardDescription className="text-gray-800">
            {mode === 'signup'
              ? 'Sign up to start collaborating on boards'
              : 'Login to continue'}
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-black">Full Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="bg-white text-black"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-black">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white text-black"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-black">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-white text-black"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full text-base font-medium bg-black text-yellow-400 hover:bg-gray-900"
            >
              {loading ? 'Processing...' : mode === 'signup' ? 'Sign Up' : 'Login'}
            </Button>

            <div className="flex items-center space-x-2 py-2">
              <Separator className="flex-1 bg-black/30" />
              {/* <span className="text-xs text-gray-800">or continue with</span> */}
              <Separator className="flex-1 bg-black/30" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* <Button
                type="button"
                variant="outline"
                onClick={() => handleOAuthLogin('google')}
                className="flex items-center justify-center space-x-2 bg-white text-black"
              >
                <FcGoogle size={18} />
                <span>Google</span>
              </Button> */}

              {/* <Button
                type="button"
                variant="outline"
                onClick={() => handleOAuthLogin('facebook')}
                className="flex items-center justify-center space-x-2 bg-white text-black"
              >
                <FaFacebook size={18} className="text-blue-600" />
                <span>Facebook</span>
              </Button> */}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <p className="text-gray-800 text-sm text-center">
              {/* {mode === 'signup' ? 'Already have an account?' : "Don’t have an account?"}{' '} */}
              <button
                type="button"
                className="text-black font-medium hover:underline"
                onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
              >
                {mode === 'signup' ? 'Login' : 'Sign Up'}
              </button>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
