'use client';

import { User, UserRole, StaffType } from '@/lib/data';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '../ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '../ui/button';
import { MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '../ui/sheet';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
  
type UserListProps = { 
    users: User[];
    divisions: string[];
    onUpdateUser: (user: User) => void;
    onDeleteUser: (userId: string) => void;
};

const userRoles: UserRole[] = ['Admin', 'HOD', 'Divisional Head', 'Division CC', 'Staff'];
const staffTypes: StaffType[] = ['Office', 'Field'];

const editUserSchema = z.object({
    name: z.string().min(2, "Name is required."),
    email: z.string().email(),
    password: z.string().min(6, "Password must be at least 6 characters.").optional().or(z.literal('')),
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

type EditUserFormValues = z.infer<typeof editUserSchema>;

const EditUserSheet = ({ user, divisions, onSave, onOpenChange, open }: { user: User; divisions: string[]; onSave: (user: User) => void; open: boolean; onOpenChange: (open: boolean) => void; }) => {
    const form = useForm<EditUserFormValues>({
        resolver: zodResolver(editUserSchema),
        defaultValues: {
            name: user.name || '',
            email: user.email || '',
            password: '',
            role: user.role,
            staffType: user.staffType || 'Office',
            division: user.division || '',
            designation: user.designation || '',
        }
    });

    const selectedRole = form.watch('role');

    const handleSave = (values: EditUserFormValues) => {
        onSave({ ...user, ...values });
        onOpenChange(false);
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-lg w-full overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>Edit User</SheetTitle>
                    <SheetDescription>Update the details for {user.name}.</SheetDescription>
                </SheetHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6 py-6">
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
                                <Input type="password" placeholder="Leave empty to keep current password" {...field} />
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
                                <FormLabel>Designation</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g. Lead Developer" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <SheetFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button type="submit">Save Changes</Button>
                        </SheetFooter>
                    </form>
                </Form>
            </SheetContent>
        </Sheet>
    )
}


export function UserList({ users, divisions, onUpdateUser, onDeleteUser }: UserListProps) {
    const [editingUser, setEditingUser] = useState<User | null>(null);

    if (users.length === 0) {
        return (
            <div className="rounded-lg border p-8 text-center">
                <p className="text-muted-foreground">No users found. Create your first user above.</p>
            </div>
        );
    }

    return (
        <div className="rounded-lg border">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Staff Type</TableHead>
                    <TableHead>Division</TableHead>
                    <TableHead>
                    <span className="sr-only">Actions</span>
                    </TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {users.map((user) => (
                    <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>
                            <Badge variant="outline">{user.role}</Badge>
                        </TableCell>
                        <TableCell>
                            {user.staffType ? <Badge variant="secondary">{user.staffType}</Badge> : 'N/A'}
                        </TableCell>
                        <TableCell>
                            {user.division ? <Badge variant="secondary">{user.division}</Badge> : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                            <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button aria-haspopup="true" size="icon" variant="ghost">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Toggle menu</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onSelect={() => setEditingUser(user)}>Edit</DropdownMenuItem>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">Delete</DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete the user account for {user.email}.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => onDeleteUser(user.id)} className="bg-destructive hover:bg-destructive/90">Delete from App</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
            {editingUser && (
                <EditUserSheet 
                    user={editingUser}
                    divisions={divisions}
                    onSave={onUpdateUser}
                    open={!!editingUser}
                    onOpenChange={(open) => !open && setEditingUser(null)}
                />
            )}
        </div>
    );
}