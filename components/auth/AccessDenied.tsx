import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Lock, Shield } from 'lucide-react';
import Link from 'next/link';

export function AccessDenied() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const redirect = searchParams.get('redirect');

  const getErrorContent = () => {
    switch (error) {
      case 'access_denied':
        return {
          title: 'Access Denied',
          description: 'You do not have permission to access this resource.',
          icon: <Shield className="h-8 w-8 text-red-500" />,
          message: 'Please contact your administrator if you believe this is an error.'
        };
      case 'insufficient_permissions':
        return {
          title: 'Insufficient Permissions',
          description: 'You need admin privileges to access this section.',
          icon: <Lock className="h-8 w-8 text-orange-500" />,
          message: 'Only users with Owner, Admin, or Manager roles can access the admin panel.'
        };
      default:
        return {
          title: 'Authentication Required',
          description: 'Please sign in to access this resource.',
          icon: <AlertTriangle className="h-8 w-8 text-yellow-500" />,
          message: 'You must be logged in to view this page.'
        };
    }
  };

  const errorContent = getErrorContent();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {errorContent.icon}
          </div>
          <CardTitle className="text-xl">{errorContent.title}</CardTitle>
          <CardDescription>{errorContent.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600 text-center">
            {errorContent.message}
          </p>
          
          <div className="flex flex-col space-y-2">
            {error === 'insufficient_permissions' ? (
              <>
                <Button asChild>
                  <Link href="/">
                    Return to Home
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/signin">
                    Sign In with Different Account
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild>
                  <Link href="/signin">
                    Sign In
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/">
                    Return to Home
                  </Link>
                </Button>
              </>
            )}
          </div>
          
          {redirect && (
            <p className="text-xs text-gray-500 text-center">
              Redirected from: {redirect}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 