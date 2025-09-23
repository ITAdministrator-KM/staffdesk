'use client';

import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Calendar, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { User, LeaveApplication } from '@/lib/data';

interface DivisionStats {
  totalStaff: number;
  pendingLeaves: number;
  approvedLeaves: number;
  rejectedLeaves: number;
  thisMonthLeaves: number;
}

export function DivisionCCDashboard() {
  const [user, loading] = useAuthState(auth);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DivisionStats>({
    totalStaff: 0,
    pendingLeaves: 0,
    approvedLeaves: 0,
    rejectedLeaves: 0,
    thisMonthLeaves: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Fetch current user data
  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (user?.email) {
        try {
          const q = query(collection(db, 'users'), where('email', '==', user.email));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data() as User;
            setCurrentUser({ ...userData, id: querySnapshot.docs[0].id });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          toast({ title: "Error", description: "Failed to load user data", variant: "destructive" });
        }
      }
    };

    fetchCurrentUser();
  }, [user, toast]);

  // Fetch division stats
  useEffect(() => {
    const fetchStats = async () => {
      if (!currentUser?.division) return;

      setIsLoading(true);
      try {
        // Fetch staff in division
        const staffQuery = query(
          collection(db, 'users'), 
          where('division', '==', currentUser.division)
        );
        const staffSnapshot = await getDocs(staffQuery);
        const totalStaff = staffSnapshot.size;

        // Fetch leave applications for division
        const leaveQuery = query(
          collection(db, 'leaveApplications'),
          where('division', '==', currentUser.division)
        );
        const leaveSnapshot = await getDocs(leaveQuery);
        const leaves = leaveSnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        } as LeaveApplication));

        // Calculate stats
        const pendingLeaves = leaves.filter(leave => leave.status === 'pending').length;
        const approvedLeaves = leaves.filter(leave => leave.status === 'approved').length;
        const rejectedLeaves = leaves.filter(leave => leave.status === 'rejected').length;

        // This month's leaves
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const thisMonthLeaves = leaves.filter(leave => {
          const leaveDate = leave.startDate instanceof Date ? leave.startDate : leave.startDate.toDate();
          return leaveDate.getMonth() === currentMonth && leaveDate.getFullYear() === currentYear;
        }).length;

        setStats({
          totalStaff,
          pendingLeaves,
          approvedLeaves,
          rejectedLeaves,
          thisMonthLeaves
        });

      } catch (error) {
        console.error('Error fetching stats:', error);
        toast({ title: "Error", description: "Failed to load dashboard statistics", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [currentUser, toast]);

  if (loading || isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Division CC Dashboard</h1>
          <p className="text-muted-foreground">Loading your division overview...</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                <div className="h-4 w-4 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted animate-pulse rounded mb-1" />
                <div className="h-3 w-24 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!currentUser || currentUser.role !== 'Division CC') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-center text-destructive">Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              This dashboard is only accessible to Division CC users.
            </p>
            {currentUser && (
              <Badge variant="outline" className="mt-2">
                Current Role: {currentUser.role}
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Division CC Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of <strong>{currentUser.division}</strong> Division
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStaff}</div>
            <p className="text-xs text-muted-foreground">
              Active staff in your division
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Leaves</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pendingLeaves}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting your recommendation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Leaves</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approvedLeaves}</div>
            <p className="text-xs text-muted-foreground">
              Successfully processed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.thisMonthLeaves}</div>
            <p className="text-xs text-muted-foreground">
              Leave applications this month
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest actions in your division</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.pendingLeaves > 0 && (
                <div className="flex items-center space-x-4">
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Pending Leave Recommendations</p>
                    <p className="text-xs text-muted-foreground">
                      {stats.pendingLeaves} applications need your attention
                    </p>
                  </div>
                </div>
              )}
              
              <div className="flex items-center space-x-4">
                <Users className="h-5 w-5 text-blue-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Division Staff Count</p>
                  <p className="text-xs text-muted-foreground">
                    {stats.totalStaff} active staff members
                  </p>
                </div>
              </div>

              {stats.approvedLeaves > 0 && (
                <div className="flex items-center space-x-4">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Processed Applications</p>
                    <p className="text-xs text-muted-foreground">
                      {stats.approvedLeaves} leaves approved
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks for Division CC</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Review Leave Applications</p>
                  <p className="text-xs text-muted-foreground">Process pending requests</p>
                </div>
                <Badge variant={stats.pendingLeaves > 0 ? "destructive" : "secondary"}>
                  {stats.pendingLeaves}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">View Staff Directory</p>
                  <p className="text-xs text-muted-foreground">Manage division staff</p>
                </div>
                <Badge variant="outline">{stats.totalStaff}</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Apply for Leave</p>
                  <p className="text-xs text-muted-foreground">Submit your own application</p>
                </div>
                <Badge variant="outline">Apply</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}