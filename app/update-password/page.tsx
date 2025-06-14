"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

export default function UpdatePassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated via recovery token
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push('/signin');
      }
    };
    
    checkSession();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    if (password !== confirmPassword) {
      setMessage({ text: "Passwords don't match", type: 'error' });
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setMessage({ text: error.message, type: 'error' });
      } else {
        setMessage({ text: 'Password updated successfully!', type: 'success' });
        setTimeout(() => {
          router.push('/signin');
        }, 2000);
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
          <CardTitle className="text-2xl text-center">Update Password</CardTitle>
          <CardDescription className="text-center">
            Create a new password for your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="password">
                New Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="confirmPassword">
                Confirm New Password
              </label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              {isLoading ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}