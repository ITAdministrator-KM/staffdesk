
'use client';

import { useState, useEffect } from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
  } from '@/components/ui/tabs';
import { CreateUserForm } from '@/components/admin/create-user-form';
import { UserList } from '@/components/admin/user-list';
import { CreateDivisionForm } from '@/components/admin/create-division-form';
import { DivisionList } from '@/components/admin/division-list';
import { FirebaseAuthHelper } from '@/components/admin/firebase-auth-helper';
import { User } from '@/lib/data';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
// Note: On Firebase free plan we cannot deploy callable functions.
  
  export default function AdminPage() {
    const { toast } = useToast();
    const [divisionsCollection, divisionsLoading, divisionsError] = useCollection(collection(db, 'divisions'));
    const [usersCollection, usersLoading, usersError] = useCollection(collection(db, 'users'));
    const [isOperationLoading, setIsOperationLoading] = useState(false);

    const divisions = divisionsCollection?.docs.map(d => ({ id: d.id, name: d.data().name })) || [];
    const users = usersCollection?.docs.map(d => ({ id: d.id, ...d.data() } as User)) || [];

    // Show error messages for collection loading errors
    useEffect(() => {
        if (divisionsError) {
            console.error('Divisions loading error:', divisionsError);
            toast({
                title: 'Error Loading Divisions',
                description: 'Failed to load divisions. Please check your connection and Firestore permissions.',
                variant: 'destructive'
            });
        }
        if (usersError) {
            console.error('Users loading error:', usersError);
            toast({
                title: 'Error Loading Users',
                description: 'Failed to load users. Please check your connection and Firestore permissions.',
                variant: 'destructive'
            });
        }
    }, [divisionsError, usersError, toast]);

    const handleAddDivision = async (divisionName: string) => {
        if (isOperationLoading) return;
        setIsOperationLoading(true);
        try {
            // Validate division name
            if (!divisionName || divisionName.trim().length < 2) {
                toast({ 
                    title: 'Validation Error', 
                    description: 'Division name must be at least 2 characters long.', 
                    variant: 'destructive' 
                });
                return;
            }

            const trimmedName = divisionName.trim();
            
            // Check if division already exists (case-insensitive)
            if (divisions.some(d => d.name.toLowerCase() === trimmedName.toLowerCase())) {
                toast({ 
                    title: 'Error', 
                    description: `Division "${trimmedName}" already exists.`, 
                    variant: 'destructive' 
                });
                return;
            }
            
            const newDivision = {
                name: trimmedName,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            
            await addDoc(collection(db, 'divisions'), newDivision);
            toast({ 
                title: 'Success', 
                description: `Division "${trimmedName}" created successfully.`,
                variant: 'default'
            });
        } catch (error: any) {
            console.error('Error adding division:', error);
            toast({ 
                title: 'Error', 
                description: `Failed to create division: ${error.message || 'Unknown error occurred'}`, 
                variant: 'destructive' 
            });
        } finally {
            setIsOperationLoading(false);
        }
    }

    const handleDeleteDivision = async (divisionId: string) => {
        try {
            const divisionToDelete = divisions.find(d => d.id === divisionId);
            if (!divisionToDelete) {
                toast({ 
                    title: 'Error', 
                    description: 'Division not found.', 
                    variant: 'destructive' 
                });
                return;
            }

            // Check if any users are assigned to this division
            const usersInDivision = users.filter(u => u.division === divisionToDelete.name);
            if (usersInDivision.length > 0) {
                toast({ 
                    title: 'Cannot Delete Division', 
                    description: `Cannot delete "${divisionToDelete.name}" because ${usersInDivision.length} user(s) are assigned to this division. Please reassign or remove these users first.`,
                    variant: 'destructive' 
                });
                return;
            }

            await deleteDoc(doc(db, 'divisions', divisionId));
            toast({ 
                title: 'Success', 
                description: `Division "${divisionToDelete.name}" deleted successfully.`,
                variant: 'default'
            });
        } catch (error: any) {
            console.error('Error deleting division:', error);
            toast({ 
                title: 'Error', 
                description: `Failed to delete division: ${error.message || 'Unknown error occurred'}`, 
                variant: 'destructive' 
            });
        }
    }

    const handleUpdateDivision = async (divisionId: string, newName: string) => {
        try {
            // Validate new division name
            if (!newName || newName.trim().length < 2) {
                toast({ 
                    title: 'Validation Error', 
                    description: 'Division name must be at least 2 characters long.', 
                    variant: 'destructive' 
                });
                return;
            }

            const trimmedName = newName.trim();
            const currentDivision = divisions.find(d => d.id === divisionId);
            
            if (!currentDivision) {
                toast({ 
                    title: 'Error', 
                    description: 'Division not found.', 
                    variant: 'destructive' 
                });
                return;
            }

            // Check if another division with this name already exists
            if (divisions.some(d => d.id !== divisionId && d.name.toLowerCase() === trimmedName.toLowerCase())) {
                toast({ 
                    title: 'Error', 
                    description: `A division named "${trimmedName}" already exists.`, 
                    variant: 'destructive' 
                });
                return;
            }

            const updateData = {
                name: trimmedName,
                updatedAt: new Date().toISOString(),
            };

            await updateDoc(doc(db, 'divisions', divisionId), updateData);
            
            // Update all users who belong to this division with the new name
            const usersToUpdate = users.filter(u => u.division === currentDivision.name);
            const updatePromises = usersToUpdate.map(user => 
                updateDoc(doc(db, 'users', user.id), { 
                    division: trimmedName,
                    updatedAt: new Date().toISOString() 
                })
            );
            
            await Promise.all(updatePromises);
            
            toast({ 
                title: 'Success', 
                description: `Division updated to "${trimmedName}"${usersToUpdate.length > 0 ? ` and ${usersToUpdate.length} user(s) updated` : ''}.`,
                variant: 'default'
            });
        } catch (error: any) {
            console.error('Error updating division:', error);
            toast({ 
                title: 'Error', 
                description: `Failed to update division: ${error.message || 'Unknown error occurred'}`, 
                variant: 'destructive' 
            });
        }
    }

    const handleAddUser = async (user: Omit<User, 'id' | 'avatarUrl'>) => {
        try {
            // Check if user with this email already exists in Firestore
            const existingUser = users.find(u => u.email === user.email);
            if (existingUser) {
                toast({ 
                    title: 'Error', 
                    description: `User with email ${user.email} already exists in the system.`, 
                    variant: 'destructive' 
                });
                return;
            }

            const newUser = {
                ...user,
                designation: user.designation || 'N/A', // Use provided designation or default
                avatarUrl: `https://picsum.photos/seed/user-${Date.now()}/100/100`, // Default avatar
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            
            await addDoc(collection(db, 'users'), newUser);
            toast({ 
                title: 'Success', 
                description: `User account for ${user.name} (${user.email}) created successfully.`,
                variant: 'default'
            });
        } catch (error: any) {
            console.error('Error adding user to Firestore:', error);
            toast({ 
                title: 'Error', 
                description: `Failed to create user: ${error.message || 'Unknown error occurred'}`, 
                variant: 'destructive' 
            });
        }
    }

    const handleUpdateUser = async (updatedUser: User & { password?: string }) => {
        try {
            const { id, password, ...userData } = updatedUser;
            
            // Validate email uniqueness (exclude current user)
            const existingUser = users.find(u => u.email === userData.email && u.id !== id);
            if (existingUser) {
                toast({ 
                    title: 'Error', 
                    description: `Another user with email ${userData.email} already exists.`, 
                    variant: 'destructive' 
                });
                return;
            }
            
            // Update Firestore document with timestamp
            const updateData = {
                ...userData,
                updatedAt: new Date().toISOString(),
            };
            
            await updateDoc(doc(db, 'users', id), updateData);
            
            // Handle password update notification
            if (password && password.trim() !== '') {
                toast({ 
                    title: 'User Updated', 
                    description: `User details updated successfully. Note: Password updates require Firebase Admin SDK for production use.`, 
                    variant: 'default' 
                });
            } else {
                toast({ 
                    title: 'Success', 
                    description: `User ${userData.name} updated successfully.`,
                    variant: 'default'
                });
            }
        } catch (error: any) {
            console.error('Error updating user:', error);
            toast({ 
                title: 'Error', 
                description: `Failed to update user: ${error.message || 'Unknown error occurred'}`, 
                variant: 'destructive' 
            });
        }
    }

    const handleDeleteUser = async (userId: string) => {
        try {
            const userToDelete = users.find(u => u.id === userId);
            if (!userToDelete) {
                toast({ 
                    title: 'Error', 
                    description: 'User not found in the system.', 
                    variant: 'destructive' 
                });
                return;
            }

            // Check if user is currently logged in admin
            if (auth.currentUser && userToDelete.email === auth.currentUser.email) {
                toast({ 
                    title: 'Error', 
                    description: 'You cannot delete your own account while logged in.', 
                    variant: 'destructive' 
                });
                return;
            }

            // Remove from Firestore
            await deleteDoc(doc(db, 'users', userId));

            toast({ 
                title: 'User Deleted', 
                description: `Successfully removed ${userToDelete.name} (${userToDelete.email}) from the system. If this user exists in Firebase Authentication, please remove them from the Firebase Console as well.`,
                variant: 'default' 
            });
        } catch (error: any) {
            console.error('Error deleting user:', error);
            toast({ 
                title: 'Error', 
                description: `Failed to delete user: ${error.message || 'Unknown error occurred'}`, 
                variant: 'destructive' 
            });
        }
    }

    const isLoading = divisionsLoading || usersLoading;

    if (divisionsError || usersError) {
        return (
            <div className="container mx-auto">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold tracking-tight">Admin Panel</h1>
                    <p className="mt-2 text-muted-foreground">
                        Error loading data. Please check your connection and try refreshing the page.
                    </p>
                </div>
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
                    <h3 className="font-semibold text-destructive mb-2">Connection Error</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Unable to load admin data. This might be due to:
                    </p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                        <li>Internet connection issues</li>
                        <li>Firebase permissions not configured</li>
                        <li>Firestore security rules blocking access</li>
                    </ul>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-10 w-1/3" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    return (
      <div className="container mx-auto">
        <div className="mb-8">
            <h1 className="text-4xl font-bold tracking-tight">Admin Panel</h1>
            <p className="mt-2 text-muted-foreground">
                Manage divisions and users. Note: On free plan, deleting a user here removes them from app (Firestore). Remove from Firebase Authentication in Console if needed.
            </p>
        </div>
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users">Manage Users</TabsTrigger>
            <TabsTrigger value="divisions">Manage Divisions</TabsTrigger>
            <TabsTrigger value="tools">Admin Tools</TabsTrigger>
          </TabsList>
          <TabsContent value="users">
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Create New User</CardTitle>
                        <CardDescription>Create accounts for HODs, Division Heads, and Division CCs.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-48" /> : (
                            <CreateUserForm 
                                divisions={divisions.map(d => d.name)} 
                                onAddUser={handleAddUser}
                            />
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Existing Users</CardTitle>
                        <CardDescription>View and manage administrative users.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-48" /> : (
                            <UserList 
                                users={users} 
                                divisions={divisions.map(d => d.name)}
                                onUpdateUser={handleUpdateUser} 
                                onDeleteUser={handleDeleteUser} 
                            />
                        )}
                    </CardContent>
                </Card>
            </div>
          </TabsContent>
          <TabsContent value="divisions">
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Create New Division</CardTitle>
                        <CardDescription>Add a new division to the organization.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <CreateDivisionForm onAddDivision={handleAddDivision} />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Existing Divisions</CardTitle>
                        <CardDescription>View and manage existing divisions.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-48" /> : (
                            <DivisionList 
                                divisions={divisions} 
                                onUpdateDivision={handleUpdateDivision}
                                onDeleteDivision={handleDeleteDivision}
                            />
                        )}
                    </CardContent>
                </Card>
            </div>
          </TabsContent>
          <TabsContent value="tools">
            <div className="space-y-6">
              <FirebaseAuthHelper />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    );
  }
  
