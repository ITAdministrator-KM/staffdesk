
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
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
import { auth } from '@/lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address.'),
});

export default function ForgotPasswordPage() {
    const { toast } = useToast();
    const form = useForm<z.infer<typeof forgotPasswordSchema>>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: { email: '' },
    });

    async function onSubmit(values: z.infer<typeof forgotPasswordSchema>) {
        try {
            await sendPasswordResetEmail(auth, values.email);
            toast({
                title: "Password Reset Email Sent",
                description: "Check your inbox for instructions to reset your password.",
              });
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: 'destructive',
            });
        }
    }

    return (
        <Card className="w-full max-w-sm">
            <CardHeader>
                <CardTitle>Forgot Password</CardTitle>
                <CardDescription>Enter your email to receive a password reset link.</CardDescription>
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
                        <Button type="submit" className="w-full">Send Reset Link</Button>
                    </form>
                </Form>
            </CardContent>
            <CardFooter>
                 <div className="text-sm text-muted-foreground w-full text-center">
                    Remember your password?{' '}
                    <Link href="/login" className="underline hover:text-primary">
                        Login
                    </Link>
                </div>
            </CardFooter>
        </Card>
    );
}
