'use client'

import { useState, useEffect } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Users, 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  UserCheck,
  FileText,
  Settings,
  PlusCircle,
  Printer
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { Timestamp } from 'firebase/firestore'
import Link from 'next/link'

interface DivisionStats {
  totalStaff: number
  pendingLeaves: number
  recommendedLeaves: number
  approvedLeaves: number
  rejectedLeaves: number
  thisMonthLeaves: number
  personalPendingLeaves: number
  personalApprovedLeaves: number
}

interface User {
  id: string
  name: string
  email: string
  role: string
  division: string
  department?: string
}

export function DivisionCCDashboard() {
  const [user, loading] = useAuthState(auth)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [stats, setStats] = useState<DivisionStats>({
    totalStaff: 0,
    pendingLeaves: 0,
    recommendedLeaves: 0,
    approvedLeaves: 0,
    rejectedLeaves: 0,
    thisMonthLeaves: 0,
    personalPendingLeaves: 0,
    personalApprovedLeaves: 0
  })
  const [isLoading, setIsLoading] = useState(true)
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

  // Convert Firebase Timestamp to Date
  const convertToDate = (timestamp: any): Date => {
    if (!timestamp) return new Date()
    if (timestamp.toDate) {
      return timestamp.toDate()
    }
    if (timestamp instanceof Date) {
      return timestamp
    }
    return new Date(timestamp)
  }

  // Fetch current user data
  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (user?.email) {
        try {
          const q = query(collection(db, 'users'), where('email', '==', user.email))
          const querySnapshot = await getDocs(q)
          if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data()
            setCurrentUser({ 
              ...userData,
              id: querySnapshot.docs[0].id,
              name: userData.name || '',
              email: userData.email || '',
              role: userData.role || '',
              division: userData.division || '',
              department: userData.department || ''
            } as User)
          }
        } catch (error) {
          console.error('Error fetching user data:', error)
          toast({ 
            title: "Error", 
            description: "Failed to load user data", 
            variant: "destructive" 
          })
        }
      }
    }

    fetchCurrentUser()
  }, [user, toast])

  // Fetch division stats
  useEffect(() => {
    const fetchStats = async () => {
      if (!currentUser?.division) return

      setIsLoading(true)
      try {
        // Fetch staff in division
        const staffQuery = query(
          collection(db, 'users'), 
          where('division', '==', currentUser.division)
        )
        const staffSnapshot = await getDocs(staffQuery)
        const totalStaff = staffSnapshot.size

        // Fetch all leave applications for division
        const leaveQuery = query(
          collection(db, 'leaveApplications'),
          where('division', '==', currentUser.division)
        )
        const leaveSnapshot = await getDocs(leaveQuery)
        const leaves = leaveSnapshot.docs.map(doc => {
          const data = doc.data()
          return { 
            id: doc.id, 
            ...data,
            startDate: convertToDate(data.startDate),
            resumeDate: convertToDate(data.resumeDate),
            createdAt: convertToDate(data.createdAt),
            status: data.status || 'pending',
            leaveType: data.leaveType || 'casual',
            applicantEmail: data.applicantEmail || ''
          }
        })

        // Calculate division-wide stats
        const pendingLeaves = leaves.filter(leave => leave.status === 'pending').length
        const recommendedLeaves = leaves.filter(leave => leave.status === 'recommended').length
        const approvedLeaves = leaves.filter(leave => leave.status === 'approved').length
        const rejectedLeaves = leaves.filter(leave => leave.status === 'rejected').length

        // This month's leaves for division
        const currentMonth = new Date().getMonth()
        const currentYear = new Date().getFullYear()
        const thisMonthLeaves = leaves.filter(leave => {
          const leaveDate = convertToDate(leave.startDate)
          return leaveDate.getMonth() === currentMonth && leaveDate.getFullYear() === currentYear
        }).length

        // Personal leave stats
        const personalLeaves = leaves.filter(leave => leave.applicantEmail === currentUser.email)
        const personalPendingLeaves = personalLeaves.filter(leave => 
          leave.status === 'pending' || leave.status === 'recommended'
        ).length
        const personalApprovedLeaves = personalLeaves.filter(leave => leave.status === 'approved').length

        setStats({
          totalStaff,
          pendingLeaves,
          recommendedLeaves,
          approvedLeaves,
          rejectedLeaves,
          thisMonthLeaves,
          personalPendingLeaves,
          personalApprovedLeaves
        })

      } catch (error) {
        console.error('Error fetching stats:', error)
        toast({ 
          title: "Error", 
          description: "Failed to load dashboard statistics", 
          variant: "destructive" 
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [currentUser, toast])

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
    )
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
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Division CC Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, <strong>{currentUser.name}</strong> • {currentUser.division} Division
        </p>
      </div>

      {/* Personal Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Pending Leaves</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.personalPendingLeaves}</div>
            <p className="text-xs text-muted-foreground">
              Your applications in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Approved Leaves</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.personalApprovedLeaves}</div>
            <p className="text-xs text-muted-foreground">
              Your approved applications
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Division Staff</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.totalStaff}</div>
            <p className="text-xs text-muted-foreground">
              Active staff in your division
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Recommendations</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingLeaves}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting your recommendation
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Division Management Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Division Leave Management Overview</CardTitle>
          <CardDescription>Leave applications status for {currentUser.division} Division</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.pendingLeaves}</div>
              <p className="text-sm text-muted-foreground">Pending Recommendation</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.recommendedLeaves}</div>
              <p className="text-sm text-muted-foreground">Recommended</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.approvedLeaves}</div>
              <p className="text-sm text-muted-foreground">Approved</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.rejectedLeaves}</div>
              <p className="text-sm text-muted-foreground">Rejected</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>My Actions</CardTitle>
            <CardDescription>Personal leave management</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/leave-application">
              <Button className="w-full justify-start" variant="outline">
                <PlusCircle className="h-4 w-4 mr-2" />
                Apply for Leave
              </Button>
            </Link>
            <Link href="/leave-application">
              <Button className="w-full justify-start" variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                View My Leave History
              </Button>
            </Link>
            <Link href="/profile">
              <Button className="w-full justify-start" variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Update My Profile
              </Button>
            </Link>
            <Button onClick={handlePrintProfile} className="w-full justify-start" variant="outline">
              <Printer className="h-4 w-4 mr-2" />
              Print My Profile
            </Button>
            <Link href="/account-settings">
              <Button className="w-full justify-start" variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Account Settings
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Division Management</CardTitle>
            <CardDescription>Manage your division's leave processes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/leave-recommendation">
              <Button className="w-full justify-start" variant="outline">
                <UserCheck className="h-4 w-4 mr-2" />
                Recommend Leaves
                {stats.pendingLeaves > 0 && (
                  <Badge variant="destructive" className="ml-auto">
                    {stats.pendingLeaves}
                  </Badge>
                )}
              </Button>
            </Link>
            <Link href="/staff-directory">
              <Button className="w-full justify-start" variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Staff Directory
                <Badge variant="outline" className="ml-auto">
                  {stats.totalStaff}
                </Badge>
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest actions in your division</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.pendingLeaves > 0 && (
              <div className="flex items-center space-x-4 p-3 border rounded-lg">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Pending Leave Recommendations</p>
                  <p className="text-xs text-muted-foreground">
                    {stats.pendingLeaves} applications need your recommendation
                  </p>
                </div>
                <Link href="/leave-recommendation">
                  <Button size="sm">Review</Button>
                </Link>
              </div>
            )}
            
            <div className="flex items-center space-x-4 p-3 border rounded-lg">
              <Calendar className="h-5 w-5 text-blue-500" />
              <div className="flex-1">
                <p className="text-sm font-medium">This Month's Applications</p>
                <p className="text-xs text-muted-foreground">
                  {stats.thisMonthLeaves} leave applications submitted this month
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4 p-3 border rounded-lg">
              <Users className="h-5 w-5 text-green-500" />
              <div className="flex-1">
                <p className="text-sm font-medium">Division Staff Management</p>
                <p className="text-xs text-muted-foreground">
                  Manage {stats.totalStaff} staff members in {currentUser.division} Division
                </p>
              </div>
              <Link href="/staff-directory">
                <Button size="sm" variant="outline">View</Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}