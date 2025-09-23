'use client'

import { useState, useEffect } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { collection, getDocs } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, CheckCircle, XCircle, Users, Building, Shield, TrendingUp, Activity, Server, Printer } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { Timestamp } from 'firebase/firestore'

interface SystemStats {
  totalUsers: number
  totalDivisions: number
  totalLeaves: number
  pendingApprovals: number
  approvedLeaves: number
  rejectedLeaves: number
  thisMonthLeaves: number
  activeUsers: number
  systemHealth: string
}

export function HodAdminDashboard() {
  const [user, loading] = useAuthState(auth)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    totalDivisions: 0,
    totalLeaves: 0,
    pendingApprovals: 0,
    approvedLeaves: 0,
    rejectedLeaves: 0,
    thisMonthLeaves: 0,
    activeUsers: 0,
    systemHealth: 'Healthy',
  })
  const [isLoading, setIsLoading] = useState(true)
  const [recentLeaves, setRecentLeaves] = useState<any[]>([])
  const [divisionStats, setDivisionStats] = useState<any[]>([])
  const { toast } = useToast()

  // Helper function to safely convert dates
  const convertTimestampToDate = (value: Date | Timestamp | undefined): Date | undefined => {
    if (!value) return undefined;
    if (value instanceof Timestamp) return value.toDate();
    if (value instanceof Date) return value;
    return undefined;
  };

  // Print profile function
  const handlePrintProfile = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Profile - ${currentUser?.name}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 20px;
            color: #000;
            background: #fff;
          }
          .no-print {
            display: block;
            text-align: center;
            margin-bottom: 20px;
            padding: 15px;
            background: #f8f9fa;
            border: 2px solid #dee2e6;
            border-radius: 8px;
          }
          .print-btn {
            background: #007bff;
            color: white;
            border: none;
            padding: 12px 24px;
            cursor: pointer;
            border-radius: 4px;
            margin-right: 10px;
            font-size: 14px;
            font-weight: bold;
          }
          .print-btn:hover {
            background: #0056b3;
          }
          .close-btn {
            background: #6c757d;
            color: white;
            border: none;
            padding: 12px 24px;
            cursor: pointer;
            border-radius: 4px;
            font-size: 14px;
          }
          .close-btn:hover {
            background: #545b62;
          }
          @media print {
            .no-print {
              display: none !important;
            }
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px;
              color: #000;
              background: #fff;
            }
            .print-header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #000;
              padding-bottom: 20px;
            }
            .print-title {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .print-subtitle {
              font-size: 16px;
              color: #666;
            }
            .profile-section {
              margin-bottom: 25px;
            }
            .section-title {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 15px;
              border-bottom: 1px solid #333;
              padding-bottom: 5px;
            }
            .profile-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              margin-bottom: 20px;
            }
            .profile-item {
              margin-bottom: 10px;
            }
            .profile-label {
              font-weight: bold;
              display: inline-block;
              width: 150px;
            }
            .profile-value {
              display: inline-block;
            }
            .print-footer {
              margin-top: 40px;
              text-align: center;
              font-size: 12px;
              color: #666;
              border-top: 1px solid #333;
              padding-top: 10px;
            }
          }
        </style>
      </head>
      <body>
        <div class="no-print">
          <h3>🖨️ Print Preview - Profile Document</h3>
          <p>Review the document below, then click "Print" to print or "Close" to return.</p>
          <button class="print-btn" onclick="window.print()">🖨️ Print Document</button>
          <button class="close-btn" onclick="window.close()">✖ Close Preview</button>
        </div>
        <div class="print-header">
          <div class="print-title">USER PROFILE</div>
          <div class="print-subtitle">StaffDesk Management System</div>
        </div>
        
        <div class="profile-section">
          <div class="section-title">Personal Information</div>
          <div class="profile-grid">
            <div class="profile-item">
              <span class="profile-label">Full Name:</span>
              <span class="profile-value">${currentUser?.name || 'N/A'}</span>
            </div>
            <div class="profile-item">
              <span class="profile-label">Email:</span>
              <span class="profile-value">${currentUser?.email || 'N/A'}</span>
            </div>
            <div class="profile-item">
              <span class="profile-label">Role:</span>
              <span class="profile-value">${currentUser?.role || 'N/A'}</span>
            </div>
            <div class="profile-item">
              <span class="profile-label">Division:</span>
              <span class="profile-value">${currentUser?.division || 'N/A'}</span>
            </div>
          </div>
        </div>
        
        <div class="print-footer">
          <div>Printed on: ${format(new Date(), 'PPP p')}</div>
          <div>StaffDesk Management System</div>
        </div>
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '', 'width=900,height=700,scrollbars=yes,resizable=yes');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      // Remove automatic print trigger - let user control when to print
    }
  };

  // Fetch current user data
  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (user?.email) {
        try {
          const usersSnapshot = await getDocs(collection(db, 'users'))
          const userData = usersSnapshot.docs.find(doc => doc.data().email === user.email)?.data()
          if (userData) {
            setCurrentUser({ ...userData, id: usersSnapshot.docs.find(doc => doc.data().email === user.email)?.id })
          }
        } catch (error) {
          console.error('Error fetching user data:', error)
        }
      }
    }
    fetchCurrentUser()
  }, [user])

  // Fetch system-wide stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch all users
        const usersSnapshot = await getDocs(collection(db, 'users'))
        const users = usersSnapshot.docs.map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            ...data,
            role: data.role || 'Staff',
            division: data.division || 'N/A',
            name: data.name || 'Unknown'
          }
        })

        // Fetch all divisions
        const divisionsSnapshot = await getDocs(collection(db, 'divisions'))
        const divisions = divisionsSnapshot.docs.map(doc => doc.data().name)
        const uniqueDivisions = [...new Set(divisions)]

        // Fetch all leave applications
        const leavesSnapshot = await getDocs(collection(db, 'leaveApplications'))
        const leaves = leavesSnapshot.docs.map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            ...data,
            startDate: data.startDate?.toDate(),
            resumeDate: data.resumeDate?.toDate(),
            createdAt: data.createdAt?.toDate(),
            status: data.status || 'pending',
            leaveDays: data.leaveDays || 1,
            leaveType: data.leaveType || 'casual',
            applicantName: data.applicantName || 'Unknown',
            division: data.division || 'N/A'
          }
        })

        // Calculate system stats
        const totalUsers = users.length
        const totalDivisions = uniqueDivisions.length
        const totalLeaves = leaves.length
        const pendingApprovals = leaves.filter(leave => leave.status === 'recommended').length
        const approvedLeaves = leaves.filter(leave => leave.status === 'approved').length
        const rejectedLeaves = leaves.filter(leave => leave.status === 'rejected').length
        
        // This month's leaves
        const currentMonth = new Date().getMonth()
        const currentYear = new Date().getFullYear()
        const thisMonthLeaves = leaves.filter(leave => {
          const leaveDate = leave.startDate
          return leaveDate && 
                 leaveDate.getMonth() === currentMonth && 
                 leaveDate.getFullYear() === currentYear
        }).length

        // Active users (users with roles other than Staff)
        const activeUsers = users.filter(u => u.role && u.role !== 'Staff').length

        setStats({
          totalUsers,
          totalDivisions,
          totalLeaves,
          pendingApprovals,
          approvedLeaves,
          rejectedLeaves,
          thisMonthLeaves,
          activeUsers,
          systemHealth: 'Healthy', // Could be calculated based on system metrics
        })

        // Set recent leaves for display
        const sortedLeaves = leaves.sort((a, b) => 
          (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
        )
        setRecentLeaves(sortedLeaves.slice(0, 10))

        // Calculate division statistics
        const divisionStatistics = uniqueDivisions.map(divisionName => {
          const divisionUsers = users.filter(u => u.division === divisionName)
          const divisionLeaves = leaves.filter(l => l.division === divisionName)
          const divisionPending = divisionLeaves.filter(l => l.status === 'recommended').length
          
          return {
            name: divisionName,
            staff: divisionUsers.length,
            leaves: divisionLeaves.length,
            pending: divisionPending,
            approved: divisionLeaves.filter(l => l.status === 'approved').length
          }
        })
        setDivisionStats(divisionStatistics)

      } catch (error) {
        console.error('Error fetching stats:', error)
        toast({
          title: 'Error',
          description: 'Failed to fetch system statistics',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [toast])

  // Check if user has HOD/Admin access
  if (!currentUser || (currentUser.role !== 'HOD' && currentUser.role !== 'Admin')) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-center text-destructive">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              You need HOD or Admin access to view this page.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading system dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{currentUser?.role} Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              System-wide overview and management controls
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            <Shield className="h-4 w-4 mr-1" />
            {currentUser?.role}
          </Badge>
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Across all divisions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Divisions</CardTitle>
            <Building className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDivisions}</div>
            <p className="text-xs text-muted-foreground">
              Active divisions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingApprovals}</div>
            <p className="text-xs text-muted-foreground">
              Requires final approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leave Applications</CardTitle>
            <Calendar className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLeaves}</div>
            <p className="text-xs text-muted-foreground">
              All time applications
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Leaves</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approvedLeaves}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalLeaves > 0 ? Math.round((stats.approvedLeaves / stats.totalLeaves) * 100) : 0}% approval rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Server className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.systemHealth}</div>
            <p className="text-xs text-muted-foreground">
              All systems operational
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Managers</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              Management staff
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Recent Leave Applications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recent Leave Applications
            </CardTitle>
            <CardDescription>
              Latest leave applications across all divisions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentLeaves.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {recentLeaves.map((leave) => (
                  <div key={leave.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">
                        {leave.applicantName}
                      </div>
                      <div className="text-sm text-muted-foreground capitalize">
                        {leave.leaveType} Leave • {leave.division}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {leave.startDate?.toLocaleDateString()} • {leave.leaveDays} day(s)
                      </div>
                    </div>
                    <Badge 
                      variant={
                        leave.status === 'approved' ? 'default' :
                        leave.status === 'pending' ? 'secondary' :
                        leave.status === 'recommended' ? 'outline' :
                        'destructive'
                      }
                    >
                      {leave.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Leave Applications</h3>
                <p className="text-muted-foreground">
                  No leave applications found in the system.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Division Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Division Overview
            </CardTitle>
            <CardDescription>
              Staff and leave statistics by division
            </CardDescription>
          </CardHeader>
          <CardContent>
            {divisionStats.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {divisionStats.map((division) => (
                  <div key={division.name} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">{division.name}</div>
                      {division.pending > 0 && (
                        <Badge variant="outline" className="text-orange-600">
                          {division.pending} pending
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm text-muted-foreground">
                      <div>Staff: {division.staff}</div>
                      <div>Leaves: {division.leaves}</div>
                      <div>Approved: {division.approved}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Divisions</h3>
                <p className="text-muted-foreground">
                  No divisions found in the system.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* System Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            System Management
          </CardTitle>
          <CardDescription>
            Administrative tools and quick actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                 onClick={() => window.location.href = '/admin'}>
              <div className="font-medium">Manage Users</div>
              <div className="text-sm text-muted-foreground mt-1">
                Create and manage user accounts
              </div>
            </div>
            
            <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                 onClick={() => window.location.href = '/admin'}>
              <div className="font-medium">Manage Divisions</div>
              <div className="text-sm text-muted-foreground mt-1">
                Create and organize divisions
              </div>
            </div>
            
            <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                 onClick={() => window.location.href = '/leave-approval'}>
              <div className="font-medium">Approve Leaves</div>
              <div className="text-sm text-muted-foreground mt-1">
                Final approval for all leave applications
              </div>
            </div>
            
            <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                 onClick={() => window.location.href = '/staff-directory'}>
              <div className="font-medium">System Reports</div>
              <div className="text-sm text-muted-foreground mt-1">
                Generate comprehensive reports
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Management */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Personal Management
          </CardTitle>
          <CardDescription>
            Personal account management and tools
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                 onClick={() => window.location.href = '/profile'}>
              <div className="font-medium">Update My Profile</div>
              <div className="text-sm text-muted-foreground mt-1">
                Manage your personal information
              </div>
            </div>
            
            <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                 onClick={handlePrintProfile}>
              <div className="font-medium flex items-center gap-2">
                <Printer className="h-4 w-4" />
                Print My Profile
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Print your complete profile information
              </div>
            </div>
            
            <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                 onClick={() => window.location.href = '/leave'}>
              <div className="font-medium">Apply for Leave</div>
              <div className="text-sm text-muted-foreground mt-1">
                Submit your own leave application
              </div>
            </div>
            
            <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                 onClick={() => window.location.href = '/settings'}>
              <div className="font-medium">Account Settings</div>
              <div className="text-sm text-muted-foreground mt-1">
                Update password and security settings
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}