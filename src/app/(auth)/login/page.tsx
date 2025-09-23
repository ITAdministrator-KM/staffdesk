
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useState, lazy, Suspense, useEffect } from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
  } from '@/components/ui/card';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

// Lazy load Google Icon to reduce initial bundle
const GoogleIcon = lazy(() => 
  Promise.resolve({
    default: (props: React.SVGProps<SVGSVGElement>) => (
      <svg viewBox="0 0 48 48" {...props}>
        <path
          fill="#FFC107"
          d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039L38.802 8.92C34.52 4.794 29.636 2.5 24 2.5C11.438 2.5 1.5 12.438 1.5 25s9.938 22.5 22.5 22.5S46.5 37.562 46.5 25c0-2.885-.35-5.66-1-8.288l-1.889-3.629z"
        />
        <path
          fill="#FF3D00"
          d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 13 24 13c3.059 0 5.842 1.154 7.961 3.039l5.841-5.841C34.52 4.794 29.636 2.5 24 2.5C16.318 2.5 9.656 6.312 6.306 14.691z"
        />
        <path
          fill="#4CAF50"
          d="M24 47.5c5.934 0 11.238-2.031 15.176-5.33l-6.388-4.943C30.583 39.205 27.481 40 24 40c-5.223 0-9.651-3.657-11.303-8H6.389C9.688 39.444 16.298 47.5 24 47.5z"
        />
        <path
          fill="#1976D2"
          d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.16-4.087 5.571l6.388 4.943C39.927 34.331 44.058 28.336 44.058 20l.001-.001c-.001.001 0 0 0 0z"
        />
      </svg>
    )
  })
);

const loginSchema = z.object({
  email: z.string().email('Invalid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

export default function LoginPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [showGoogleButton, setShowGoogleButton] = useState(false);
    
    const form = useForm<z.infer<typeof loginSchema>>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: '', password: '' },
    });

    async function onSubmit(values: z.infer<typeof loginSchema>) {
        setIsLoading(true);
        try {
            await signInWithEmailAndPassword(auth, values.email, values.password);
            toast({ title: "Login Successful", description: "Welcome back!" });
            router.push('/');
        } catch (error: any) {
            toast({
                title: "Login Failed",
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    }

    async function handleGoogleSignIn() {
        setIsLoading(true);
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
            toast({ title: "Login Successful", description: "Welcome back!" });
            router.push('/');
        } catch (error: any) {
            toast({
                title: "Login Failed",
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Card className="w-full max-w-sm">
            <CardHeader>
                <CardTitle>Login</CardTitle>
                <CardDescription>Enter your credentials to access your account.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl><Input type="email" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Password</FormLabel>
                                    <FormControl><Input type="password" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? 'Logging in...' : 'Login'}
                        </Button>
                    </form>
                </Form>
                <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                    </div>
                </div>
                <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => {
                        setShowGoogleButton(true);
                        handleGoogleSignIn();
                    }}
                    disabled={isLoading}
                >
                    <Suspense fallback={<div className="mr-2 h-5 w-5" />}>
                        <GoogleIcon className="mr-2 h-5 w-5" />
                    </Suspense>
                    {isLoading ? 'Signing in...' : 'Sign in with Google'}
                </Button>
            </CardContent>
            <CardFooter className="flex-col gap-4">
                <div className="text-sm text-muted-foreground">
                    <Link href="/forgot-password" className="underline hover:text-primary">
                        Forgot your password?
                    </Link>
                </div>
                <div className="text-sm text-muted-foreground">
                    Don&apos;t have an account?{' '}
                    <Link href="/signup" className="underline hover:text-primary">
                        Sign up
                    </Link>
                </div>
            </CardFooter>
        </Card>
    );
}
