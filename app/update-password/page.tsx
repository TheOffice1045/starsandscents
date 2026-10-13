"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { PasswordInput } from '@/components/ui/password-input';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import {
  AuthLayout,
  AuthMessage,
  authButtonClass,
  authFieldClass,
  authLabelClass,
} from '@/components/auth/AuthLayout';

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
    <AuthLayout
      eyebrow="Almost done"
      title="Choose a new password"
      description="Pick a password you'll remember. You'll use it to sign in from now on."
    >
      <form onSubmit={handleSubmit} className="mt-10 space-y-6">
        <div className="space-y-2">
          <label className={authLabelClass} htmlFor="password">
            New password
          </label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={authFieldClass}
            required
          />
        </div>
        <div className="space-y-2">
          <label className={authLabelClass} htmlFor="confirmPassword">
            Confirm new password
          </label>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={authFieldClass}
            required
          />
        </div>
        {message && <AuthMessage type={message.type}>{message.text}</AuthMessage>}
        <Button type="submit" className={authButtonClass} disabled={isLoading}>
          {isLoading ? 'Updating…' : 'Update password'}
        </Button>
      </form>
    </AuthLayout>
  );
}
