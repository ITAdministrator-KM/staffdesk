"use client";

import {
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Settings,
  User,
  Users,
  Shield,
  LogIn,
  CheckCircle,
  FileCheck,
  Calendar,
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { lazy, Suspense } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/toaster';
import { users } from '@/lib/data';
import React, { useEffect } from 'react';
import { AppLogo } from './app-logo';
import { auth, db } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';

// Lazy load heavy components
const NotificationBell = lazy(() => 
  import('@/components/notifications/notification-bell').then(module => ({
    default: module.NotificationBell
  }))
);

// Enhanced user fetch with Firestore integration and optimized loading
const useCurrentUser = () => {
    const [user, loading] = useAuthState(auth);
    const [currentUser, setCurrentUser] = React.useState<any>(null);
    const [userLoading, setUserLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchUserData = async () => {
            if (user?.email) {
                try {
                    const q = query(collection(db, 'users'), where('email', '==', user.email));
                    const querySnapshot = await getDocs(q);
                    if (!querySnapshot.empty) {
                        const userData = querySnapshot.docs[0].data();
                        setCurrentUser({ ...userData, id: querySnapshot.docs[0].id });
                    } else {
                        // Auto-create user profile if it doesn't exist
                        console.warn('User not found in Firestore, creating new profile:', user.email);
                        try {
                            const newUserData = {
                                name: user.displayName || 'New User',
                                email: user.email,
                                role: 'Staff',
                                staffType: 'Office', // Default to Office staff
                                division: 'General',
                                designation: 'Staff Member',
                                avatarUrl: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=0ea5e9&color=fff`,
                                createdAt: new Date(),
                                updatedAt: new Date()
                            };
                            
                            const docRef = await addDoc(collection(db, 'users'), newUserData);
                            const createdUser = { ...newUserData, id: docRef.id };
                            setCurrentUser(createdUser);
                        } catch (createError) {
                            console.error('Error creating user profile:', createError);
                            // Fallback to static data or basic profile
                            const fallbackUser = users.find(u => u.email === user.email);
                            setCurrentUser(fallbackUser || {
                                id: user.uid,
                                name: user.displayName || "New User",
                                email: user.email,
                                avatarUrl: user.photoURL || `https://picsum.photos/seed/${user.uid}/100/100`,
                                designation: 'Staff',
                                role: 'Staff',
                                staffType: 'Office'
                            });
                        }
                    }
                } catch (error) {
                    console.error('Error fetching user data:', error);
                }
            } else {
                setCurrentUser(null);
            }
            setUserLoading(false);
        };
        
        // Only fetch when authentication loading is complete
        if (!loading) {
            if (user?.email) {
                fetchUserData();
            } else {
                setCurrentUser(null);
                setUserLoading(false);
            }
        }
    }, [user, loading]);

    return { currentUser, loading: loading || userLoading };
};

// Role-based navigation items
const getNavItemsForRole = (role: string, staffType: string) => {
  const baseNavItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/profile', label: 'My Profile', icon: User },
    { href: '/leave', label: 'Leave', icon: CalendarDays },
  ];

  // Add Advanced Program menu for Field staff
  const fieldStaffItems = staffType === 'Field' ? [
    { href: '/advanced-program', label: 'Advanced Program', icon: Calendar },
  ] : [];

  // Add Advanced Program Approval menu for approvers
  const approvalItems = (role === 'Division CC' || role === 'Divisional Head' || role === 'HOD' || role === 'Admin') ? [
    { href: '/advanced-program-approval', label: 'Approve Programs', icon: FileCheck },
  ] : [];

  const roleSpecificItems = {
    'Staff': [
      ...fieldStaffItems,
      { href: '/settings', label: 'Account Settings', icon: Settings },
    ],
    'Division CC': [
      ...approvalItems,
      { href: '/leave-recommendation', label: 'Recommend Leave', icon: CheckCircle },
      { href: '/staff-directory', label: 'Staff Directory', icon: Users },
      { href: '/settings', label: 'Account Settings', icon: Settings },
    ],
    'Divisional Head': [
      ...approvalItems,
      { href: '/leave-recommendation', label: 'Recommend Leave', icon: CheckCircle },
      { href: '/leave-approval', label: 'Approve Leave', icon: FileCheck },
      { href: '/leave-download', label: 'Download Leaves', icon: FileCheck },
      { href: '/staff-directory', label: 'Staff Directory', icon: Users },
      { href: '/settings', label: 'Account Settings', icon: Settings },
    ],
    'HOD': [
      ...approvalItems,
      { href: '/leave-approval', label: 'Approve Leave', icon: FileCheck },
      { href: '/leave-download', label: 'Download Leaves', icon: FileCheck },
      { href: '/staff-directory', label: 'Staff Directory', icon: Users },
      { href: '/admin', label: 'Admin Panel', icon: Shield },
      { href: '/settings', label: 'Account Settings', icon: Settings },
    ],
    'Admin': [
      ...approvalItems,
      { href: '/leave-approval', label: 'Approve Leave', icon: FileCheck },
      { href: '/leave-download', label: 'Download Leaves', icon: FileCheck },
      { href: '/staff-directory', label: 'Staff Directory', icon: Users },
      { href: '/admin', label: 'Admin Panel', icon: Shield },
      { href: '/settings', label: 'Account Settings', icon: Settings },
    ],
  };

  return [...baseNavItems, ...(roleSpecificItems[role as keyof typeof roleSpecificItems] || [])];
};

const AuthWrapper = ({ children }: { children: React.ReactNode }) => {
    const router = useRouter();
    const pathname = usePathname();
    const [isRedirecting, setIsRedirecting] = React.useState(false);
    const [hasInitialized, setHasInitialized] = React.useState(false);

    const authRoutes = ['/login', '/signup', '/forgot-password'];
    const isAuthRoute = authRoutes.includes(pathname);

    // For auth routes, don't check authentication at all
    if (isAuthRoute) {
        return <>{children}</>;
    }

    // Only check authentication for protected routes
    const { currentUser, loading } = useCurrentUser();

    useEffect(() => {
        if (!loading && !hasInitialized) {
            setHasInitialized(true);
            
            if (!currentUser) {
                setIsRedirecting(true);
                router.replace('/login');
                return;
            }
            setIsRedirecting(false);
        }
    }, [currentUser, loading, router, hasInitialized]);

    if (loading || (isRedirecting && !hasInitialized)) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
               <div className="flex items-center gap-2">
                <AppLogo className="h-8 w-8 animate-spin" />
                <span className="text-lg font-semibold">Loading...</span>
               </div>
            </div>
        )
    }

    return <>{children}</>;
}


export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const authRoutes = ['/login', '/signup', '/forgot-password'];
  const isAuthRoute = authRoutes.includes(pathname);

  // Early return for auth routes - no heavy components needed
  if (isAuthRoute) {
    return (
      <>
        {children}
        <Toaster />
      </>
    );
  }

  // Only load the full shell for authenticated routes
  return <AuthenticatedAppShell>{children}</AuthenticatedAppShell>;
}

// Separate component for authenticated routes
function AuthenticatedAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser, loading } = useCurrentUser();
  const [isRedirecting, setIsRedirecting] = React.useState(false);
  const [hasInitialized, setHasInitialized] = React.useState(false);

  // Handle authentication redirects
  React.useEffect(() => {
    if (!loading && !hasInitialized) {
      setHasInitialized(true);
      
      if (!currentUser) {
        setIsRedirecting(true);
        router.replace('/login');
        return;
      }
      setIsRedirecting(false);
    }
  }, [currentUser, loading, router, hasInitialized]);

  const handleLogout = async () => {
    try {
        await signOut(auth);
        toast({ title: "Logged out successfully" });
        router.push('/login');
    } catch (error: any) {
        toast({ title: "Logout failed", description: error.message, variant: 'destructive' });
    }
  }

  const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'HOD';
  const navItemsForCurrentUser = currentUser ? getNavItemsForRole(currentUser.role, currentUser.staffType || 'Office') : [];

  // Show loading while checking authentication
  if (loading || (isRedirecting && !hasInitialized)) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex items-center gap-2">
          <AppLogo className="h-8 w-8 animate-spin" />
          <span className="text-lg font-semibold">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
        <Sidebar>
            <SidebarHeader className="p-4">
            <Link href="/" className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <AppLogo />
                </div>
                <span className="text-lg font-semibold text-sidebar-foreground">
                StaffDesk
                </span>
            </Link>
            </SidebarHeader>
            <SidebarContent>
            <SidebarMenu>
                {navItemsForCurrentUser.map((item) => (
                <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={{ children: item.label }}
                    >
                    <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                    </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                ))}
            </SidebarMenu>
            </SidebarContent>
            <SidebarFooter className="p-4">
            <SidebarMenu>
                <SidebarMenuItem>
                    {currentUser ? (
                        <SidebarMenuButton onClick={handleLogout} tooltip={{ children: 'Log out' }}>
                            <LogOut />
                            <span>Log out</span>
                        </SidebarMenuButton>
                    ) : (
                        <SidebarMenuButton tooltip={{ children: 'Log in' }} asChild>
                            <Link href="/login">
                                <LogIn />
                                <span>Log in</span>
                            </Link>
                        </SidebarMenuButton>
                    )}
                </SidebarMenuItem>
            </SidebarMenu>
            {loading ? (
                 <div className="mt-4 flex items-center gap-3 border-t border-sidebar-border pt-4">
                    <Skeleton className="size-10 rounded-full" />
                    <div className="flex flex-col gap-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-32" />
                    </div>
                </div>
            ) : currentUser && (
                <div className="mt-4 flex items-center gap-3 border-t border-sidebar-border pt-4">
                    <Avatar className="size-10">
                    <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                    <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col overflow-hidden">
                    <span className="truncate font-semibold text-sidebar-foreground">
                        {currentUser.name}
                    </span>
                    <span className="truncate text-xs text-sidebar-foreground/70">
                        {currentUser.email}
                    </span>
                    </div>
                </div>
            )}
            </SidebarFooter>
        </Sidebar>
        <SidebarInset>
            <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:h-16 md:px-6">
            <SidebarTrigger className="md:hidden" />
            <div className="flex-1">
                {/* Header content like breadcrumbs or page title can go here */}
            </div>
            <div className="flex items-center gap-2">
                <Suspense fallback={<div className="h-8 w-8" />}>
                  <NotificationBell />
                </Suspense>
                {currentUser && (
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                        <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                )}
            </div>
            </header>
            <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
        </SidebarInset>
        <Toaster />
        </SidebarProvider>
  );
}