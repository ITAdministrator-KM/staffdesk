'use client'

import { useState, useEffect } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, CheckCircle, XCircle, User, FileText, TrendingUp, Printer } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { Timestamp } from 'firebase/firestore'

interface StaffStats {
  totalLeaves: number
  pendingLeaves: number
  approvedLeaves: number
  rejectedLeaves: number
  thisMonthLeaves: number
  remainingLeaves: number
}

export function StaffDashboard() {
  const [user, loading] = useAuthState(auth)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [stats, setStats] = useState<StaffStats>({
    totalLeaves: 0,
    pendingLeaves: 0,
    approvedLeaves: 0,
    rejectedLeaves: 0,
    thisMonthLeaves: 0,
    remainingLeaves: 21, // Default annual leave allocation
  })
  const [isLoading, setIsLoading] = useState(true)
  const [recentLeaves, setRecentLeaves] = useState<any[]>([])
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
        <title>Staff Profile - ${currentUser?.name}</title>
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
              margin: 10px;
              color: #000;
              background: #fff;
              font-size: 11px;
              line-height: 1.2;
            }
            .print-header {
              text-align: center;
              margin-bottom: 15px;
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
            }
            .print-title {
              font-size: 20px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .print-subtitle {
              font-size: 14px;
              color: #666;
            }
            .profile-section {
              margin-bottom: 12px;
            }
            .section-title {
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 8px;
              border-bottom: 1px solid #333;
              padding-bottom: 3px;
            }
            .profile-grid {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 8px;
              margin-bottom: 10px;
            }
            .profile-item {
              margin-bottom: 5px;
              font-size: 10px;
            }
            .profile-label {
              font-weight: bold;
              display: block;
              width: auto;
              margin-bottom: 2px;
            }
            .profile-value {
              display: block;
            }
            .inventory-grid {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
              gap: 5px;
            }
            .inventory-item {
              padding: 4px;
              border: 1px solid #ddd;
              text-align: center;
              font-size: 9px;
            }
            .history-item {
              border: 1px solid #ddd;
              padding: 6px;
              margin-bottom: 6px;
              font-size: 10px;
            }
            .print-footer {
              margin-top: 15px;
              text-align: center;
              font-size: 9px;
              color: #666;
              border-top: 1px solid #333;
              padding-top: 6px;
            }
            .profile-header-with-image {
              display: flex;
              align-items: flex-start;
              gap: 15px;
              margin-bottom: 10px;
              padding: 8px;
              background: #f8f9fa;
              border-radius: 5px;
            }
            .profile-image-container {
              flex-shrink: 0;
            }
            .profile-basic-info {
              flex: 1;
            }
          }
        </style>
      </head>
      <body>
        <div class="no-print">
          <h3>🖨️ Print Preview</h3>
          <p>Review your profile document below. Click "Print" when ready or "Close" to return to dashboard.</p>
          <button class="print-btn" onclick="window.print()">🖨️ Print Document</button>
          <button class="close-btn" onclick="window.close()">✖ Close Preview</button>
        </div>
        <div class="print-header">
          <div class="print-title">STAFF PROFILE</div>
          <div class="print-subtitle">StaffDesk Management System</div>
        </div>
        
        <div class="profile-section">
          <div class="section-title">Profile Information</div>
          <div class="profile-header-with-image">
            <div class="profile-image-container">
              <img src="${currentUser?.avatarUrl || `https://picsum.photos/seed/${currentUser?.name || 'default'}/150/150`}" 
                   alt="Profile Picture" 
                   class="profile-image" 
                   style="width: 70px; height: 70px; border-radius: 50%; object-fit: cover; border: 2px solid #007bff;" />
            </div>
            <div class="profile-basic-info">
              <h2 style="margin: 0 0 5px 0; color: #2c3e50; font-size: 16px;">${currentUser?.name || 'N/A'}</h2>
              <p style="margin: 2px 0; font-size: 10px; color: #666;"><strong>Email:</strong> ${currentUser?.email || 'N/A'}</p>
              <p style="margin: 2px 0; font-size: 10px; color: #666;"><strong>Role:</strong> ${currentUser?.role || 'N/A'}</p>
              <p style="margin: 2px 0; font-size: 10px; color: #666;"><strong>Division:</strong> ${currentUser?.division || 'N/A'}</p>
            </div>
          </div>
        </div>
        
        <div class="profile-section">
          <div class="section-title">Personal Details</div>
          <div class="profile-grid">
            <div class="profile-item">
              <span class="profile-label">NIC:</span>
              <span class="profile-value">${currentUser?.nic || 'N/A'}</span>
            </div>
            <div class="profile-item">
              <span class="profile-label">Mobile:</span>
              <span class="profile-value">${currentUser?.mobile || 'N/A'}</span>
            </div>
            <div class="profile-item">
              <span class="profile-label">Date of Birth:</span>
              <span class="profile-value">${currentUser?.dob ? format(convertTimestampToDate(currentUser.dob)!, 'PPP') : 'N/A'}</span>
            </div>
          </div>
        </div>
        
        <div class="profile-section">
          <div class="section-title">Employment Details</div>
          <div class="profile-grid">
            <div class="profile-item">
              <span class="profile-label">Designation:</span>
              <span class="profile-value">${currentUser?.designation || 'N/A'}</span>
            </div>
            <div class="profile-item">
              <span class="profile-label">Grade:</span>
              <span class="profile-value">${currentUser?.grade || 'N/A'}</span>
            </div>
            <div class="profile-item">
              <span class="profile-label">Division:</span>
              <span class="profile-value">${currentUser?.division || 'N/A'}</span>
            </div>
            <div class="profile-item">
              <span class="profile-label">Role:</span>
              <span class="profile-value">${currentUser?.role || 'N/A'}</span>
            </div>
            <div class="profile-item">
              <span class="profile-label">Appointment Date:</span>
              <span class="profile-value">${currentUser?.appointmentDate ? format(convertTimestampToDate(currentUser.appointmentDate)!, 'PPP') : 'N/A'}</span>
            </div>
            <div class="profile-item">
              <span class="profile-label">Basic Salary:</span>
              <span class="profile-value">${currentUser?.basicSalary ? `Rs. ${currentUser.basicSalary.toLocaleString()}` : 'N/A'}</span>
            </div>
            <div class="profile-item">
              <span class="profile-label">Salary Code:</span>
              <span class="profile-value">${currentUser?.salaryCode || 'N/A'}</span>
            </div>
          </div>
        </div>
        
        ${currentUser?.workingHistory && currentUser.workingHistory.length > 0 ? `
          <div class="profile-section">
            <div class="section-title">Working History</div>
            ${currentUser.workingHistory.map((history: any, index: number) => `
              <div class="history-item">
                <strong>Position ${index + 1}:</strong> ${history.name}<br>
                <strong>Place:</strong> ${history.place}
              </div>
            `).join('')}
          </div>
        ` : ''}
        
        <div class="profile-section">
          <div class="section-title">Inventory Checklist</div>
          <div class="inventory-grid">
            <div class="inventory-item">
              <strong>PC/Laptop:</strong><br>
              ${currentUser?.inventory?.pcLaptop ? '✓ Yes' : '✗ No'}
            </div>
            <div class="inventory-item">
              <strong>LGN Account:</strong><br>
              ${currentUser?.inventory?.lgnAccount ? '✓ Yes' : '✗ No'}
            </div>
            <div class="inventory-item">
              <strong>Printer:</strong><br>
              ${currentUser?.inventory?.printer ? `✓ Yes${currentUser?.inventory?.printerName ? ` (${currentUser.inventory.printerName})` : ''}` : '✗ No'}
            </div>
            <div class="inventory-item">
              <strong>Router:</strong><br>
              ${currentUser?.inventory?.router ? '✓ Yes' : '✗ No'}
            </div>
            <div class="inventory-item">
              <strong>UPS:</strong><br>
              ${currentUser?.inventory?.ups ? '✓ Yes' : '✗ No'}
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
    
    const printWindow = window.open('', '_blank', 'width=1000,height=800,scrollbars=yes,resizable=yes');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      // Show preview first, let user control when to print
    } else {
      // Handle popup blocked scenario
      alert('Please allow popups for this site to view the print preview.');
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

  // Fetch staff personal stats
  useEffect(() => {
    const fetchStats = async () => {
      if (!currentUser?.id) return

      try {
        // Fetch user's leave applications
        const leavesQuery = query(
          collection(db, 'leaveApplications'),
          where('applicantId', '==', currentUser.id)
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
          }
        })

        // Calculate stats
        const totalLeaves = leaves.length
        const pendingLeaves = leaves.filter(leave => leave.status === 'pending').length
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

        // Calculate remaining leaves (assuming 21 days annual allocation)
        const approvedDays = leaves
          .filter(leave => leave.status === 'approved')
          .reduce((total, leave) => total + (leave.leaveDays || 1), 0)
        
        const remainingLeaves = Math.max(0, 21 - approvedDays)

        setStats({
          totalLeaves,
          pendingLeaves,
          approvedLeaves,
          rejectedLeaves,
          thisMonthLeaves,
          remainingLeaves,
        })

        // Set recent leaves for display
        setRecentLeaves(leaves.slice(0, 5))

      } catch (error) {
        console.error('Error fetching stats:', error)
        toast({
          title: 'Error',
          description: 'Failed to fetch leave statistics',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [currentUser, toast])

  // Check if user has Staff access
  if (!currentUser || currentUser.role !== 'Staff') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-center text-destructive">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              You need Staff access to view this page.
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
          <p className="mt-2 text-muted-foreground">Loading your dashboard...</p>
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
            <h1 className="text-3xl font-bold">Staff Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Welcome back, {currentUser?.name}! Here's your personal summary.
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            <User className="h-4 w-4 mr-1" />
            Staff Member
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Leaves</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingLeaves}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting recommendation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Leaves</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approvedLeaves}</div>
            <p className="text-xs text-muted-foreground">
              Successfully approved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining Leaves</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.remainingLeaves}</div>
            <p className="text-xs text-muted-foreground">
              Days left this year
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLeaves}</div>
            <p className="text-xs text-muted-foreground">
              All time applications
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.thisMonthLeaves}</div>
            <p className="text-xs text-muted-foreground">
              Leaves this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.rejectedLeaves}</div>
            <p className="text-xs text-muted-foreground">
              Not approved
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Leave Applications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Leave Applications</CardTitle>
            <CardDescription>
              Your latest leave application history
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentLeaves.length > 0 ? (
              <div className="space-y-4">
                {recentLeaves.map((leave) => (
                  <div key={leave.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium capitalize">
                        {leave.leaveType} Leave
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {leave.startDate?.toLocaleDateString()} - {leave.resumeDate?.toLocaleDateString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {leave.leaveDays} day(s)
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
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Leave Applications</h3>
                <p className="text-muted-foreground mb-4">
                  You haven't applied for any leaves yet.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks and shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                     onClick={() => window.location.href = '/leave'}>
                  <div className="font-medium">Apply for Leave</div>
                  <div className="text-sm text-muted-foreground">
                    Submit a new leave application
                  </div>
                </div>
                
                <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                     onClick={() => window.location.href = '/profile'}>
                  <div className="font-medium">Update Profile</div>
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
                     onClick={() => window.location.href = '/settings'}>
                  <div className="font-medium">Change Password</div>
                  <div className="text-sm text-muted-foreground">
                    Update your account security
                  </div>
                </div>
                
                <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                     onClick={() => window.location.href = '/leave'}>
                  <div className="font-medium">View Leave History</div>
                  <div className="text-sm text-muted-foreground">
                    See all your leave applications
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Personal Information Summary */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Personal Information Summary</CardTitle>
              <CardDescription>
                Your current account details
              </CardDescription>
            </div>
            <Button 
              onClick={handlePrintProfile}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Print Profile
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Name</div>
              <div className="text-sm">{currentUser?.name || 'N/A'}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Email</div>
              <div className="text-sm">{currentUser?.email || 'N/A'}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Role</div>
              <Badge variant="secondary">{currentUser?.role || 'N/A'}</Badge>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Division</div>
              <div className="text-sm">{currentUser?.division || 'N/A'}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}