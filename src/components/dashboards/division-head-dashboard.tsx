'use client'

import { useState, useEffect } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, CheckCircle, XCircle, Users, FileCheck, Shield, TrendingUp, Printer } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { Timestamp } from 'firebase/firestore'

interface DivisionHeadStats {
  totalStaff: number
  pendingApprovals: number
  approvedLeaves: number
  rejectedLeaves: number
  thisMonthLeaves: number
  personalPendingLeaves: number
}

export function DivisionHeadDashboard() {
  const [user, loading] = useAuthState(auth)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [stats, setStats] = useState<DivisionHeadStats>({
    totalStaff: 0,
    pendingApprovals: 0,
    approvedLeaves: 0,
    rejectedLeaves: 0,
    thisMonthLeaves: 0,
    personalPendingLeaves: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [recentApprovals, setRecentApprovals] = useState<any[]>([])
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
          const q = query(collection(db, 'users'), where('email', '==', user.email))
          const querySnapshot = await getDocs(q)
          if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data()
            setCurrentUser({ ...userData, id: querySnapshot.docs[0].id })
          }
        } catch (error) {
          console.error('Error fetching user data:', error)
        }
      }
    }
    fetchCurrentUser()
  }, [user])

  // Fetch division head stats
  useEffect(() => {
    const fetchStats = async () => {
      if (!currentUser?.division) return

      try {
        // Fetch division staff
        const staffQuery = query(
          collection(db, 'users'),
          where('division', '==', currentUser.division)
        )
        const staffSnapshot = await getDocs(staffQuery)
        const totalStaff = staffSnapshot.docs.length

        // Fetch division leave applications
        const leavesQuery = query(
          collection(db, 'leaveApplications'),
          where('division', '==', currentUser.division)
        )
        const leavesSnapshot = await getDocs(leavesQuery)
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
            applicantId: data.applicantId,
            applicantName: data.applicantName || 'Unknown'
          }
        })

        // Calculate stats
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

        // Personal pending leaves
        const personalLeaves = leaves.filter(leave => leave.applicantId === currentUser.id)
        const personalPendingLeaves = personalLeaves.filter(leave => leave.status === 'pending').length

        setStats({
          totalStaff,
          pendingApprovals,
          approvedLeaves,
          rejectedLeaves,
          thisMonthLeaves,
          personalPendingLeaves,
        })

        // Set recent approvals (recommended leaves needing approval)
        const recommendedLeaves = leaves.filter(leave => leave.status === 'recommended').slice(0, 5)
        setRecentApprovals(recommendedLeaves)

      } catch (error) {
        console.error('Error fetching stats:', error)
        toast({
          title: 'Error',
          description: 'Failed to fetch division statistics',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [currentUser, toast])

  // Check if user has Division Head access
  if (!currentUser || currentUser.role !== 'Divisional Head') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-center text-destructive">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              You need Divisional Head access to view this page.
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
          <p className="mt-2 text-muted-foreground">Loading division dashboard...</p>
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
            <h1 className="text-3xl font-bold">Division Head Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              {currentUser?.division} Division • Manage approvals and staff oversight
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            <Shield className="h-4 w-4 mr-1" />
            Divisional Head
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <FileCheck className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingApprovals}</div>
            <p className="text-xs text-muted-foreground">
              Requires your approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Division Staff</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStaff}</div>
            <p className="text-xs text-muted-foreground">
              Total team members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved This Month</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approvedLeaves}</div>
            <p className="text-xs text-muted-foreground">
              Leave approvals given
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Leave Requests</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.thisMonthLeaves}</div>
            <p className="text-xs text-muted-foreground">
              This month's applications
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Pending Leaves</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.personalPendingLeaves}</div>
            <p className="text-xs text-muted-foreground">
              Your applications pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejections</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.rejectedLeaves}</div>
            <p className="text-xs text-muted-foreground">
              Leave rejections
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Approvals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              Pending Approvals
            </CardTitle>
            <CardDescription>
              Leave applications requiring your approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentApprovals.length > 0 ? (
              <div className="space-y-4">
                {recentApprovals.map((leave) => (
                  <div key={leave.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">
                        {leave.applicantName}
                      </div>
                      <div className="text-sm text-muted-foreground capitalize">
                        {leave.leaveType} Leave • {leave.leaveDays} day(s)
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {leave.startDate?.toLocaleDateString()} - {leave.resumeDate?.toLocaleDateString()}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-orange-600">
                      Recommended
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <FileCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Pending Approvals</h3>
                <p className="text-muted-foreground">
                  All leave applications have been processed.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Division Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Division Management
            </CardTitle>
            <CardDescription>
              Quick management tools and insights
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="font-medium">Approve Leave Applications</div>
                  <div className="text-sm text-muted-foreground">
                    Review and approve pending leave requests
                  </div>
                </div>
                
                <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="font-medium">Staff Directory</div>
                  <div className="text-sm text-muted-foreground">
                    View and manage division staff
                  </div>
                </div>
                
                <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="font-medium">Leave Recommendations</div>
                  <div className="text-sm text-muted-foreground">
                    Review recommendations from Division CC
                  </div>
                </div>
                
                <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                     onClick={() => window.location.href = '/profile'}>
                  <div className="font-medium">Update My Profile</div>
                  <div className="text-sm text-muted-foreground">
                    Manage your personal information
                  </div>
                </div>
                
                <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                     onClick={handlePrintProfile}>
                  <div className="font-medium flex items-center gap-2">
                    <Printer className="h-4 w-4" />
                    Print My Profile
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Print your complete profile information
                  </div>
                </div>
                
                <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                     onClick={() => window.location.href = '/leave'}>
                  <div className="font-medium">Apply for Personal Leave</div>
                  <div className="text-sm text-muted-foreground">
                    Submit your own leave application
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Division Summary */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Division Summary</CardTitle>
          <CardDescription>
            Overview of {currentUser?.division} division performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Division</div>
              <div className="text-sm font-semibold">{currentUser?.division}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Total Staff</div>
              <div className="text-sm font-semibold">{stats.totalStaff} members</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Leave Approval Rate</div>
              <div className="text-sm font-semibold">
                {stats.approvedLeaves + stats.rejectedLeaves > 0 
                  ? Math.round((stats.approvedLeaves / (stats.approvedLeaves + stats.rejectedLeaves)) * 100)
                  : 0}%
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Pending Actions</div>
              <div className="text-sm font-semibold">{stats.pendingApprovals} approvals</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}