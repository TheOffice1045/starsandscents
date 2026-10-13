"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Button } from '@/components/ui/button';
import {
  AuthDivider,
  AuthLayout,
  AuthMessage,
  authButtonClass,
  authFieldClass,
  authLabelClass,
} from '@/components/auth/AuthLayout';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { signUp } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await signUp(email, password);
      if (error) {
        setError(error.message);
      } else {
        setSuccessMessage('Registration successful! Please check your email to confirm your account.');
        setTimeout(() => {
          router.push('/signin');
        }, 3000);
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Join us"
      title="Create an account"
      description="It only takes a minute. You'll get an email to confirm your address."
    >
      {successMessage ? (
        <div className="mt-10">
          <AuthMessage type="success">{successMessage}</AuthMessage>
        </div>
      ) : (
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
          <div className="space-y-2">
            <label className={authLabelClass} htmlFor="password">
              Password
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
              Confirm password
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
          {error && <AuthMessage type="error">{error}</AuthMessage>}
          <Button type="submit" className={authButtonClass} disabled={isLoading}>
            {isLoading ? 'Creating account…' : 'Create account'}
          </Button>
        </form>
      )}

      <AuthDivider>Already have an account?</AuthDivider>

      <Button asChild variant="secondary" className={authButtonClass}>
        <Link href="/signin">Sign in</Link>
      </Button>
    </AuthLayout>
  );
}
