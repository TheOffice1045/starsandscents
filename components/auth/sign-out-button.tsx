"use client";

import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function SignOutButton() {
  const { signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/signin');
  };

  return (
    <Button variant="outline" onClick={handleSignOut}>
      Sign Out
    </Button>
  );
}