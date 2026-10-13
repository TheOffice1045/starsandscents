"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  AuthDivider,
  AuthLayout,
  AuthMessage,
  authButtonClass,
  authFieldClass,
  authLabelClass,
} from '@/components/auth/AuthLayout';

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
        redirectTo: `${window.location.origin}/update-password`,
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
    <AuthLayout
      eyebrow="Forgot your password?"
      title="Reset password"
      description="Enter the email you signed up with and we'll send you a link to choose a new password."
    >
      <form onSubmit={handleSubmit} className="mt-10 space-y-6">
        <div className="space-y-2">
          <label className={authLabelClass} htmlFor="email">
            Email
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={authFieldClass}
            required
          />
        </div>
        {message && <AuthMessage type={message.type}>{message.text}</AuthMessage>}
        <Button type="submit" className={authButtonClass} disabled={isLoading}>
          {isLoading ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>

      <AuthDivider>Remember it?</AuthDivider>

      <Button asChild variant="secondary" className={authButtonClass}>
        <Link href="/signin">Back to sign in</Link>
      </Button>
    </AuthLayout>
  );
}
