"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });

      if (error) {
        setMessage({ text: error.message, type: 'error' });
      } else {
        setMessage({ 
          text: 'Password reset link sent to your email. Please check your inbox.', 
          type: 'success' 
        });
      }
    } catch (err) {
      setMessage({ text: 'An unexpected error occurred', type: 'error' });
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Reset Password</CardTitle>
          <CardDescription className="text-center">
            Enter your email to receive a password reset link
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {message && (
              <div className={`p-3 rounded-md ${
                message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {message.text}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-gray-600">
            Remember your password?{' '}
            <Link href="/signin" className="text-blue-600 hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}