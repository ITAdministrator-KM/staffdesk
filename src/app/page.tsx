'use client';

import React from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StaffDashboard } from '@/components/dashboards/staff-dashboard';
import { DivisionHeadDashboard } from '@/components/dashboards/division-head-dashboard';
import { HodAdminDashboard } from '@/components/dashboards/hod-admin-dashboard';
import { DivisionCCDashboard } from '@/components/dashboards/division-cc-dashboard';

// Enhanced user fetch with Firestore integration and optimized loading
const useCurrentUser = () => {
  const [user, loading] = useAuthState(auth);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (user?.email) {
          const q = query(collection(db, 'users'), where('email', '==', user.email));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            setCurrentUser({ ...userData, id: querySnapshot.docs[0].id });
          } else {
            // User not found in Firestore, this should be handled by the system
            setError('User profile not found. Please contact administrator.');
          }
        } else {
          setCurrentUser(null);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setError('Failed to load user data. Please try refreshing.');
      } finally {
        setUserLoading(false);
      }
    };
    
    // Only fetch when authentication loading is complete and we have a user
    if (!loading) {
      if (user?.email) {
        fetchUserData();
      } else {
        setCurrentUser(null);
        setUserLoading(false);
      }
    }
  }, [user, loading]);

  return { currentUser, loading: loading || userLoading, error };;
};

const RoleBasedDashboard = ({ user }: { user: any }) => {
  switch (user.role) {
    case 'Staff':
      return <StaffDashboard />;
    case 'Division CC':
      return <DivisionCCDashboard />;
    case 'Divisional Head':
      return <DivisionHeadDashboard />;
    case 'HOD':
    case 'Admin':
      return <HodAdminDashboard />;
    default:
      return (
        <Card>
          <CardHeader>
            <CardTitle>Unknown Role</CardTitle>
            <CardDescription>No dashboard configured for role: {user.role}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Please contact your administrator to configure access for your role.
            </p>
          </CardContent>
        </Card>
      );
  }
};

export default function DashboardPage() {
  const { currentUser, loading, error } = useCurrentUser();

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="mt-2 h-4 w-1/2" />
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Refresh Page</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold">Please log in to view your dashboard</h1>
          <p className="text-muted-foreground mt-2">
            You need to be logged in to access your personalized dashboard.
          </p>
          <Button asChild className="mt-4">
            <a href="/login">Go to Login</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <RoleBasedDashboard user={currentUser} />
    </div>
  );
}
