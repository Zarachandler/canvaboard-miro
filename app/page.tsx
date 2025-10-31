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
import { motion } from 'framer-motion'

export default function AuthPage() {
  const [mode, setMode] = useState<'signup' | 'login'>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        })
        if (error) throw error

        if (data.user) {
          localStorage.setItem('userEmail', data.user.email!)
          localStorage.setItem('userName', name)
          localStorage.setItem('userId', data.user.id)
          toast.success('✅ Account created successfully! Welcome to Miro!')
          router.push('/dashboard')
        } else {
          toast.success('✅ Account created! Please check your email to confirm your account.')
          setMode('login')
        }

        setEmail('')
        setPassword('')
        setName('')
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error('❌ Invalid email or password')
          } else if (error.message.includes('Email not confirmed')) {
            toast.error('❌ Please confirm your email before logging in.')
          } else {
            toast.error(`❌ ${error.message}`)
          }
          return
        }

        if (data.user) {
          localStorage.setItem('userEmail', data.user.email!)
          localStorage.setItem(
            'userName',
            data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'User'
          )
          localStorage.setItem('userId', data.user.id)

          toast.success('🎉 Logged in successfully!')
          router.push('/dashboard')
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-100 via-yellow-300 to-black px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 100, damping: 15 }}
      >
        <Card className="w-full max-w-lg shadow-2xl rounded-3xl border-0 bg-black/90 backdrop-blur-md text-white transition-all duration-300 hover:shadow-yellow-400/30">
          <CardHeader className="space-y-3 text-center pb-4">
            <motion.div
              className="flex justify-center mb-2"
              whileHover={{ rotate: 10, scale: 1.1 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg">
                <div className="w-6 h-6 bg-black rounded-lg opacity-90"></div>
              </div>
            </motion.div>

            <CardTitle className="text-3xl font-extrabold bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">
              {mode === 'signup' ? 'MIRO — Create Your Account' : 'Welcome Back'}
            </CardTitle>
            <CardDescription className="text-gray-300 text-base">
              {mode === 'signup'
                ? 'Sign up to start creating collaborative boards'
                : 'Sign in to your account to continue'}
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-5">
              {mode === 'signup' && (
                <motion.div
                  className="space-y-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Label htmlFor="name" className="text-gray-200 font-medium">
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Enter your full name"
                    className="bg-gray-900 border-gray-700 focus:border-yellow-500 focus:ring-yellow-500 text-white placeholder-gray-500"
                    disabled={loading}
                  />
                </motion.div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-200 font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Enter your email"
                  className="bg-gray-900 border-gray-700 focus:border-yellow-500 focus:ring-yellow-500 text-white placeholder-gray-500"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-200 font-medium">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  minLength={6}
                  className="bg-gray-900 border-gray-700 focus:border-yellow-500 focus:ring-yellow-500 text-white placeholder-gray-500"
                  disabled={loading}
                />
                {mode === 'signup' && (
                  <p className="text-xs text-gray-400">
                    Password must be at least 6 characters long
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full text-base font-semibold bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black shadow-lg transition-all duration-200"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    <span>Processing...</span>
                  </div>
                ) : mode === 'signup' ? (
                  'Create Account'
                ) : (
                  'Sign In'
                )}
              </Button>

              <div className="flex items-center space-x-2 py-2">
                <Separator className="flex-1 bg-gray-700" />
                <Separator className="flex-1 bg-gray-700" />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4 pt-2">
              <p className="text-gray-300 text-sm text-center">
                {mode === 'signup'
                  ? 'Already have an account?'
                  : "Don’t have an account?"}{' '}
                <button
                  type="button"
                  className="text-yellow-400 font-semibold hover:text-yellow-300 hover:underline transition-colors"
                  onClick={() => {
                    setMode(mode === 'signup' ? 'login' : 'signup')
                    setEmail('')
                    setPassword('')
                    setName('')
                  }}
                  disabled={loading}
                >
                  {mode === 'signup' ? 'Sign in' : 'Sign up'}
                </button>
              </p>

              <div className="text-xs text-gray-500 text-center space-y-1">
                <p>By continuing, you agree to our Terms of Service</p>
                <p>and acknowledge our Privacy Policy</p>
              </div>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </motion.div>
  )
}
