'use client'

import { useState, useEffect } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { collection, query, where, getDocs, updateDoc, doc, Timestamp } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from '@/components/ui/dialog'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { CheckCircle, XCircle, Clock, User, Calendar, FileText, Shield, Filter, Printer } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { NotificationService } from '@/components/notifications/notification-service'

// Helper function to safely convert dates
const convertToDate = (value: Date | Timestamp): Date => {
  if (value instanceof Timestamp) return value.toDate()
  return value
}

export function LeaveApprovalSystem() {
  const [user, loading] = useAuthState(auth)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([])
  const [selectedLeave, setSelectedLeave] = useState<any>(null)
  const [approval, setApproval] = useState<'approved' | 'rejected' | null>(null)
  const [remarks, setRemarks] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [filterStatus, setFilterStatus] = useState('recommended')
  const [filterType, setFilterType] = useState('all')
  const [userMap, setUserMap] = useState<{[key: string]: any}>({})
  const { toast } = useToast()

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

  // Fetch all users for reference
  useEffect(() => {
    const fetchAllUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'users'))
        const allUsers = querySnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        }))
        
        // Create user map for lookups
        const userMapping = allUsers.reduce((acc, user) => {
          acc[user.id] = user
          return acc
        }, {} as {[key: string]: any})
        setUserMap(userMapping)
      } catch (error) {
        console.error('Error fetching users:', error)
      }
    }

    fetchAllUsers()
  }, [])

  // Fetch pending leave applications assigned to this user for approval
  useEffect(() => {
    const fetchPendingLeaves = async () => {
      if (!currentUser) return

      try {
        let leavesQuery

        if (currentUser.role === 'HOD' || currentUser.role === 'Admin') {
          // HOD/Admin can see all leaves assigned to them system-wide
          leavesQuery = query(
            collection(db, 'leaveApplications'),
            where('approverId', '==', currentUser.id),
            where('status', '==', filterStatus)
          )
        } else if (currentUser.role === 'Divisional Head') {
          // Divisional Head can only see leaves assigned to them from their division
          leavesQuery = query(
            collection(db, 'leaveApplications'),
            where('approverId', '==', currentUser.id),
            where('status', '==', filterStatus)
          )
        } else {
          // Other roles don't have approval access
          return
        }

        const querySnapshot = await getDocs(leavesQuery)
        const leaves = querySnapshot.docs.map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            ...data,
            startDate: convertToDate(data.startDate),
            resumeDate: convertToDate(data.resumeDate),
            createdAt: convertToDate(data.createdAt),
            updatedAt: convertToDate(data.updatedAt),
            leaveType: data.leaveType || 'casual',
            status: data.status || 'pending',
            leaveDays: data.leaveDays || 1,
          }
        })

        // Filter by leave type if specified
        const filteredLeaves = filterType === 'all' 
          ? leaves 
          : leaves.filter(leave => leave.leaveType === filterType)

        setPendingLeaves(filteredLeaves)
      } catch (error) {
        console.error('Error fetching pending leaves:', error)
        toast({
          title: 'Error',
          description: 'Failed to fetch leave applications',
          variant: 'destructive',
        })
      }
    }

    fetchPendingLeaves()
  }, [currentUser, filterStatus, filterType, toast])

  // Check if user has approval access
  if (!currentUser || (
    currentUser.role !== 'Divisional Head' && 
    currentUser.role !== 'HOD' && 
    currentUser.role !== 'Admin'
  )) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-center text-destructive">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              You need Divisional Head, HOD, or Admin access to approve leaves.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleApproval = async () => {
    if (!selectedLeave || !approval) {
      toast({
        title: 'Error',
        description: 'Please select an approval decision',
        variant: 'destructive',
      })
      return
    }

    setIsProcessing(true)

    try {
      // Update leave application status
      await updateDoc(doc(db, 'leaveApplications', selectedLeave.id), {
        status: approval,
        approvalRemarks: remarks,
        approvalBy: currentUser.id,
        approvalDate: new Date(),
        updatedAt: new Date(),
      })

      // Send notification to applicant
      await NotificationService.notifyLeaveDecision(
        selectedLeave.applicantId,
        selectedLeave.applicantName,
        selectedLeave.id,
        approval === 'approved'
      )

      toast({
        title: 'Success',
        description: `Leave application ${approval} successfully`,
      })

      // Reset form and close dialog
      setSelectedLeave(null)
      setApproval(null)
      setRemarks('')
      
      // Refresh the list
      const updatedLeaves = pendingLeaves.filter(leave => leave.id !== selectedLeave.id)
      setPendingLeaves(updatedLeaves)

    } catch (error) {
      console.error('Error processing approval:', error)
      toast({
        title: 'Error',
        description: 'Failed to process approval',
        variant: 'destructive',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePrintLeave = (leave: any) => {
    const actingOfficer = userMap[leave.actingOfficerId || '']
    const recommendingOfficer = userMap[leave.recommenderId || '']
    const approvingOfficer = userMap[leave.approvalBy || '']
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Leave Application - ${leave.applicantName}</title>
        <style>
          @media print {
            body { 
              font-family: Arial, sans-serif; 
              margin: 0;
              padding: 20px;
              color: #000;
              background: #fff;
              font-size: 12px;
            }
            .print-container {
              max-width: 100%;
              margin: 0 auto;
            }
            .print-header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 2px solid #000;
              padding-bottom: 15px;
            }
            .print-title {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .print-subtitle {
              font-size: 14px;
              color: #666;
            }
            .two-column {
              display: table;
              width: 100%;
              table-layout: fixed;
            }
            .column {
              display: table-cell;
              width: 50%;
              padding: 0 10px;
              vertical-align: top;
            }
            .column:first-child {
              border-right: 1px solid #ccc;
              padding-right: 20px;
            }
            .column:last-child {
              padding-left: 20px;
            }
            .section {
              margin-bottom: 20px;
            }
            .section-title {
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 10px;
              border-bottom: 1px solid #333;
              padding-bottom: 3px;
            }
            .info-item {
              margin-bottom: 8px;
              display: flex;
            }
            .info-label {
              font-weight: bold;
              width: 160px;
              flex-shrink: 0;
            }
            .info-value {
              flex: 1;
            }
            .reason-section {
              margin: 15px 0;
              padding: 10px;
              border: 1px solid #ddd;
              background-color: #f9f9f9;
            }
            .officer-box {
              border: 1px solid #333;
              padding: 10px;
              margin-bottom: 15px;
              min-height: 60px;
            }
            .officer-title {
              font-weight: bold;
              margin-bottom: 5px;
              text-decoration: underline;
              font-size: 13px;
            }
            .officer-details {
              font-size: 11px;
            }
            .print-footer {
              margin-top: 30px;
              text-align: center;
              font-size: 10px;
              color: #666;
              border-top: 1px solid #333;
              padding-top: 10px;
            }
            .status-approved {
              color: #059669;
              font-weight: bold;
            }
            /* Improve spacing and readability */
            .compact-info {
              margin-bottom: 5px;
            }
            .compact-info .info-label {
              width: 140px;
            }
          }
        </style>
      </head>
      <body>
        <div class="print-container">
          <div class="print-header">
            <div class="print-title">LEAVE APPLICATION</div>
            <div class="print-subtitle">StaffDesk Management System</div>
          </div>
          
          <div class="two-column">
            <div class="column">
              <div class="section">
                <div class="section-title">Applicant Information</div>
                <div class="info-item compact-info">
                  <div class="info-label">Name:</div>
                  <div class="info-value">${leave.applicantName}</div>
                </div>
                <div class="info-item compact-info">
                  <div class="info-label">Designation:</div>
                  <div class="info-value">${leave.designation}</div>
                </div>
                <div class="info-item compact-info">
                  <div class="info-label">Division:</div>
                  <div class="info-value">${leave.division}</div>
                </div>
                <div class="info-item compact-info">
                  <div class="info-label">Application Status:</div>
                  <div class="info-value status-approved">${leave.status.toUpperCase()}</div>
                </div>
              </div>
              
              <div class="section">
                <div class="section-title">Leave Details</div>
                <div class="info-item compact-info">
                  <div class="info-label">Leave Type:</div>
                  <div class="info-value">${leave.leaveType || 'casual'}</div>
                </div>
                <div class="info-item compact-info">
                  <div class="info-label">Number of days:</div>
                  <div class="info-value">${leave.leaveDays || 1} days</div>
                </div>
                <div class="info-item compact-info">
                  <div class="info-label">Date of Application:</div>
                  <div class="info-value">${format(convertToDate(leave.createdAt), 'PPP')}</div>
                </div>
                <div class="info-item compact-info">
                  <div class="info-label">Commencing Leave:</div>
                  <div class="info-value">${format(convertToDate(leave.startDate), 'PPP')}</div>
                </div>
                <div class="info-item compact-info">
                  <div class="info-label">Resuming Duties:</div>
                  <div class="info-value">${format(convertToDate(leave.resumeDate), 'PPP')}</div>
                </div>
              </div>
              
              <div class="section reason-section">
                <div class="info-label">Reasons for leave:</div>
                <div class="info-value" style="margin-top: 5px; font-style: italic;">${leave.reason || 'N/A'}</div>
              </div>
            </div>
            
            <div class="column">
              <div class="section">
                <div class="section-title">Officers</div>
                <div class="officer-box">
                  <div class="officer-title">Officer Acting</div>
                  <div class="officer-details">
                    <div>${leave.actingOfficerName || actingOfficer?.name || 'N/A'}</div>
                    ${actingOfficer?.designation ? `<div style="margin-top: 3px;">${actingOfficer.designation}</div>` : ''}
                  </div>
                </div>
                
                <div class="officer-box">
                  <div class="officer-title">Recommended by</div>
                  <div class="officer-details">
                    <div>${recommendingOfficer?.name || 'N/A'}</div>
                    ${recommendingOfficer?.designation ? `<div style="margin-top: 3px;">${recommendingOfficer.designation}</div>` : ''}
                    ${recommendingOfficer?.role ? `<div style="margin-top: 2px;">(${recommendingOfficer.role})</div>` : ''}
                    ${leave.recommendationDate ? `<div style="margin-top: 3px;">${format(convertToDate(leave.recommendationDate), 'PPP')}</div>` : ''}
                  </div>
                </div>
                
                <div class="officer-box">
                  <div class="officer-title">Approved by</div>
                  <div class="officer-details">
                    <div>${approvingOfficer?.name || 'N/A'}</div>
                    ${approvingOfficer?.designation ? `<div style="margin-top: 3px;">${approvingOfficer.designation}</div>` : ''}
                    ${approvingOfficer?.role ? `<div style="margin-top: 2px;">(${approvingOfficer.role})</div>` : ''}
                    ${leave.approvalDate ? `<div style="margin-top: 3px;">${format(convertToDate(leave.approvalDate), 'PPP')}</div>` : ''}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="print-footer">
            <div>Printed on: ${format(new Date(), 'PPP p')}</div>
            <div>StaffDesk Management System</div>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank', 'width=900,height=600')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.focus()
      // Don't automatically print - let user decide
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading approval system...</p>
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
            <h1 className="text-3xl font-bold">Leave Approval System</h1>
            <p className="text-muted-foreground mt-1">
              {currentUser?.role === 'HOD' || currentUser?.role === 'Admin' 
                ? 'System-wide leave approvals' 
                : `${currentUser?.division} Division leave approvals`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              <Shield className="h-4 w-4 mr-1" />
              {currentUser?.role}
            </Badge>
            {(currentUser?.role === 'HOD' || currentUser?.role === 'Admin' || currentUser?.role === 'Divisional Head') && (
              <Link href="/leave-download">
                <Button variant="outline" size="sm">
                  <FileText className="h-4 w-4 mr-1" />
                  Download Approved Leaves
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status Filter</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recommended">Recommended</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Leave Type Filter</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="sick">Medical</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leave Applications List */}
      <div className="space-y-4">
        {pendingLeaves.length > 0 ? (
          pendingLeaves.map((leave) => (
            <Card key={leave.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{leave.applicantName}</h3>
                        <p className="text-sm text-muted-foreground">
                          {leave.division} • N/A
                        </p>
                      </div>
                      <Badge 
                        variant={
                          leave.status === 'recommended' ? 'outline' :
                          leave.status === 'approved' ? 'default' :
                          'destructive'
                        }
                        className="capitalize"
                      >
                        {leave.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Leave Type</p>
                          <p className="text-sm font-medium capitalize">{leave.leaveType}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Duration</p>
                          <p className="text-sm font-medium">{leave.leaveDays} days</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Start Date</p>
                          <p className="text-sm font-medium">
                            {format(leave.startDate, 'MMM dd, yyyy')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Resume Date</p>
                          <p className="text-sm font-medium">
                            {format(leave.resumeDate, 'MMM dd, yyyy')}
                          </p>
                        </div>
                      </div>
                    </div>

                    {leave.reason && (
                      <div className="mb-4">
                        <p className="text-xs text-muted-foreground mb-1">Reason</p>
                        <p className="text-sm bg-muted p-2 rounded">{leave.reason}</p>
                      </div>
                    )}

                    {leave.recommendationRemarks && (
                      <div className="mb-4">
                        <p className="text-xs text-muted-foreground mb-1">Recommendation Remarks</p>
                        <p className="text-sm bg-blue-50 p-2 rounded border border-blue-200">
                          {leave.recommendationRemarks}
                        </p>
                      </div>
                    )}

                    {leave.approvalRemarks && (
                      <div className="mb-4">
                        <p className="text-xs text-muted-foreground mb-1">Approval Remarks</p>
                        <p className="text-sm bg-green-50 p-2 rounded border border-green-200">
                          {leave.approvalRemarks}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4">
                    {leave.status === 'recommended' ? (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedLeave(leave)}
                          >
                            Review
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Review Leave Application</DialogTitle>
                            <DialogDescription>
                              Make a final decision on {leave.applicantName}'s leave application
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-4">
                            <div>
                              <Label>Decision</Label>
                              <Select value={approval || ''} onValueChange={(value) => setApproval(value as "approved" | "rejected")}>
                                <SelectTrigger className="mt-1">
                                  <SelectValue placeholder="Select your decision" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="approved">Approve</SelectItem>
                                  <SelectItem value="rejected">Reject</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <Label>Remarks (Optional)</Label>
                              <Textarea
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                placeholder="Add any comments or conditions..."
                                className="mt-1"
                                rows={3}
                              />
                            </div>
                          </div>

                          <DialogFooter>
                            <Button variant="outline" onClick={() => {
                              setSelectedLeave(null)
                              setApproval(null)
                              setRemarks('')
                            }}>
                              Cancel
                            </Button>
                            <Button 
                              onClick={handleApproval}
                              disabled={!approval || isProcessing}
                            >
                              {isProcessing ? 'Processing...' : `${approval === 'approved' ? 'Approve' : 'Reject'} Application`}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    ) : leave.status === 'approved' ? (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handlePrintLeave(leave)}
                        className="flex items-center gap-1"
                      >
                        <Printer className="h-4 w-4" />
                        Print
                      </Button>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Leave Applications</h3>
              <p className="text-muted-foreground">
                {filterStatus === 'recommended' 
                  ? 'No leave applications are pending your approval at this time.' 
                  : `No ${filterStatus} leave applications found.`}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}