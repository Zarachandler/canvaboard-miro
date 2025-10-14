"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);

  const handleLogin = () => {
    // Simulate login flow
    // Replace with your actual auth logic
    if (email && password) {
      // Example: If email contains "unverified", show verification message
      if (email.includes("unverified")) {
        setNeedsVerification(true);
      } else {
        window.location.href = '/dashboard';
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        
        {/* Branding */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <div className="w-6 h-6 bg-white rounded-lg opacity-90"></div>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome to Miro</h1>
          <p className="text-gray-600 mt-2">Sign in to your collaborative workspace</p>
        </div>

        {/* If verification is required */}
        {needsVerification ? (
          <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm text-center p-6">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-green-600">Verify Your Email</CardTitle>
              <CardDescription>
                We&apos;ve sent a verification link to <span className="font-medium">{email}</span>.
                <br />Please check your inbox and verify your account before signing in.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="mt-4 w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
                onClick={() => setNeedsVerification(false)}
              >
                Back to Login
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Login Card */
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl font-semibold text-center">Sign In</CardTitle>
              <CardDescription className="text-center">
                Enter your credentials to access your boards
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 border-gray-200 focus:border-blue-400 focus:ring-blue-400/20"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 pr-12 border-gray-200 focus:border-blue-400 focus:ring-blue-400/20"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 text-sm">
                  <input type="checkbox" className="rounded border-gray-300" />
                  <span className="text-gray-600">Remember me</span>
                </label>
                <Link href="#" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  Forgot password?
                </Link>
              </div>

              <Button 
                className="w-full h-12 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                size="lg"
                onClick={handleLogin}
              >
                Sign In
              </Button>

              <div className="text-center text-sm text-gray-600">
                <p>
                  Don&apos;t have an account?{' '}
                  <Link href="#" className="text-blue-600 hover:text-blue-700 font-medium">
                    Sign up for free
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center text-xs text-gray-500">
          By signing in, you agree to our{' '}
          <Link href="#" className="text-blue-600 hover:text-blue-700">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="#" className="text-blue-600 hover:text-blue-700">
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
