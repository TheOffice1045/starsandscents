"use client";

import { useAuth } from '@/contexts/auth-context';
import { SignOutButton } from '@/components/auth/sign-out-button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Profile() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/signin');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Your Profile</CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Email</h3>
            <p>{user.email}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">User ID</h3>
            <p className="text-sm truncate">{user.id}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Last Sign In</h3>
            <p>{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'N/A'}</p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <SignOutButton />
        </CardFooter>
      </Card>
    </div>
  );
}