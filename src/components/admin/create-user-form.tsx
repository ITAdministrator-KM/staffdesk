'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { User, UserRole, StaffType } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const userRoles: UserRole[] = ['Admin', 'HOD', 'Divisional Head', 'Division CC', 'Staff'];

const createUserSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6, "Password must be at least 6 characters."),
    name: z.string().min(2, "Name is required."),
    role: z.enum(['Admin', 'Staff', 'Division CC', 'Divisional Head', 'HOD']),
    staffType: z.enum(['Office', 'Field']).optional(),
    division: z.string().optional(),
    designation: z.string().optional(),
}).refine(data => {
    if(data.role === 'Divisional Head' || data.role === 'Division CC' || data.role === 'Staff') {
        return !!data.division;
    }
    return true;
}, {
    message: 'Division is required for this role',
    path: ['division'],
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;

type CreateUserFormProps = { 
    divisions: string[];
    onAddUser: (user: Omit<User, 'id' | 'avatarUrl'>) => void;
    isLoading?: boolean;
};

export function CreateUserForm({ divisions, onAddUser, isLoading = false }: CreateUserFormProps) {
  const { toast } = useToast();
  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
        email: '',
        password: '',
        name: '',
        role: undefined,
        staffType: 'Office', // Default to Office staff
        division: '',
        designation: '',
    }
  });

  const selectedRole = form.watch('role');

  const onSubmit = async (values: CreateUserFormValues) => {
    try {
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      
      // Prepare user data for Firestore (without password)
      const { password, ...userData } = values;
      const newUser = {
        ...userData,
        uid: userCredential.user.uid, // Add Firebase UID
        designation: userData.designation || 'N/A', // Default value if not provided
        avatarUrl: `https://picsum.photos/seed/user-${Date.now()}/100/100`, // Default avatar
      };
      
      // Call the parent function to add to Firestore
      onAddUser(newUser);
      
      toast({
        title: "User Created",
        description: `An account for ${values.name} has been created with email ${values.email}.`,
      });
      form.reset();
    } catch (error: any) {
      console.error('Error creating user:', error);
      
      let errorMessage = "Failed to create user account.";
      let suggestions = "";
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "This email address is already registered in Firebase Authentication.";
        suggestions = "Possible solutions:\n• Use a different email address\n• Contact administrator to check if user exists in database\n• If recreating user, ensure previous account is completely deleted from both Firebase Auth and Firestore\n• Check the Firebase Auth Helper in admin panel for more options";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Password is too weak. Please use at least 6 characters.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Please enter a valid email address.";
      }
      
      toast({
        title: "Error Creating User",
        description: errorMessage + (suggestions ? "\n\n" + suggestions : ""),
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="user@example.com" {...field} />
              </FormControl>
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
              <FormControl>
                <Input type="password" placeholder="Enter password (min 6 characters)" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Role</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    {userRoles.map((role) => (
                        <SelectItem key={role} value={role}>
                        {role}
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
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
                <Select onValueChange={field.onChange} value={field.value || 'Office'}>
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
        {(selectedRole === 'Divisional Head' || selectedRole === 'Division CC' || selectedRole === 'Staff') && (
            <FormField
                control={form.control}
                name="division"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Division</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a division" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {divisions.map((division) => (
                            <SelectItem key={division} value={division}>
                            {division}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
        )}
        <FormField
          control={form.control}
          name="designation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Designation (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Senior Developer, Manager" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isLoading || form.formState.isSubmitting}>
          {isLoading || form.formState.isSubmitting ? 'Creating User...' : 'Create User'}
        </Button>
      </form>
    </Form>
  );
}