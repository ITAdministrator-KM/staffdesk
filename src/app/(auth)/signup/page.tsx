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
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const signupSchema = z.object({
  email: z.string().email('Invalid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  confirmPassword: z.string(),
  staffType: z.enum(['Office', 'Field'], {
    required_error: "Please select a staff type.",
  }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export default function SignupPage() {
    const { toast } = useToast();
    const router = useRouter();
    const form = useForm<z.infer<typeof signupSchema>>({
        resolver: zodResolver(signupSchema),
        defaultValues: { 
          email: '', 
          password: '', 
          confirmPassword: '',
          staffType: undefined,
        },
    });

    async function onSubmit(values: z.infer<typeof signupSchema>) {
        try {
            // Create Firebase Auth user
            const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
            
            // Create user profile in Firestore
            const userProfile = {
              uid: userCredential.user.uid,
              email: values.email,
              name: values.email.split('@')[0], // Default name from email
              role: 'Staff',
              staffType: values.staffType,
              avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(values.email.split('@')[0])}&background=0ea5e9&color=fff`,
              createdAt: new Date(),
              updatedAt: new Date()
            };
            
            await addDoc(collection(db, 'users'), userProfile);
            
            toast({ title: "Account Created", description: "You can now log in." });
            router.push('/login');
        } catch (error: any) {
            toast({
                title: "Sign Up Failed",
                description: error.message,
                variant: 'destructive',
            });
        }
    }

    return (
        <Card className="w-full max-w-sm">
            <CardHeader>
                <CardTitle>Sign Up</CardTitle>
                <CardDescription>Create a new staff account.</CardDescription>
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
                         <FormField
                            control={form.control}
                            name="confirmPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Confirm Password</FormLabel>
                                    <FormControl><Input type="password" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="staffType"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Staff Type</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select staff type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Office">Office Staff</SelectItem>
                                            <SelectItem value="Field">Field Staff</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full">Create Account</Button>
                    </form>
                </Form>
            </CardContent>
            <CardFooter>
                <div className="text-sm text-muted-foreground w-full text-center">
                    Already have an account?{' '}
                    <Link href="/login" className="underline hover:text-primary">
                        Login
                    </Link>
                </div>
            </CardFooter>
        </Card>
    );
}