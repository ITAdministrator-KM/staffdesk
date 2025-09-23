'use client';

import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { LeaveApplication } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Clock, Eye, Printer } from 'lucide-react';
import { collection, query, where, getDocs, updateDoc, doc, Timestamp } from 'firebase/firestore';

// Helper function to convert Firestore timestamps
const convertToDate = (value: any): Date => {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return new Date(value);
};

export default function LeaveApprovalPage() {
  const [user, loading] = useAuthState(auth);
  const { toast } = useToast();
  const [leaveApplications, setLeaveApplications] = useState<LeaveApplication[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<LeaveApplication | null>(null);
  const [approval, setApproval] = useState<'approved' | 'not_approved'>('approved');
  const [approvalComment, setApprovalComment] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch current user data
  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (user?.email) {
        try {
          const q = query(collection(db, 'users'), where('email', '==', user.email));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
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

  // Fetch leave applications assigned to this user for approval
  useEffect(() => {
    const fetchLeaveApplications = async () => {
      if (!currentUser) return;

      try {
        let q;
        if (currentUser.role === 'HOD' || currentUser.role === 'Admin') {
          // HOD/Admin can see all recommended leaves system-wide
          q = query(
            collection(db, 'leaveApplications'),
            where('status', '==', 'recommended')
          );
        } else if (currentUser.role === 'Divisional Head') {
          // Division Head can see recommended leaves from their division OR assigned to them
          q = query(
            collection(db, 'leaveApplications'),
            where('status', '==', 'recommended')
          );
        } else {
          // Other roles can see leaves assigned to them specifically
          q = query(
            collection(db, 'leaveApplications'),
            where('approverId', '==', currentUser.id),
            where('status', '==', 'recommended')
          );
        }

        const querySnapshot = await getDocs(q);
        let applications = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            startDate: convertToDate(data.startDate),
            resumeDate: convertToDate(data.resumeDate),
            createdAt: convertToDate(data.createdAt),
            updatedAt: convertToDate(data.updatedAt),
            recommendationDate: data.recommendationDate ? convertToDate(data.recommendationDate) : undefined,
            approvalDate: data.approvalDate ? convertToDate(data.approvalDate) : undefined,
          } as LeaveApplication;
        });

        // Additional filtering for Division Head
        if (currentUser.role === 'Divisional Head') {
          applications = applications.filter(app => 
            app.division === currentUser.division || app.approverId === currentUser.id
          );
        }

        setLeaveApplications(applications);
      } catch (error) {
        console.error('Error fetching leave applications:', error);
        toast({ title: "Error", description: "Failed to load leave applications", variant: "destructive" });
      }
    };

    fetchLeaveApplications();
  }, [currentUser, toast]);

  // Filter applications for current user
  const divisionApplications = leaveApplications;

  const handleApproval = (application: LeaveApplication) => {
    setSelectedApplication(application);
  };

  const submitApproval = async () => {
    if (!selectedApplication || !currentUser) return;

    // Validate required fields
    if (approval === 'not_approved' && !approvalComment.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide a reason for rejecting this application.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      const updateData: any = {
        status: approval === 'approved' ? 'approved' : 'rejected',
        approvalBy: currentUser.id,
        approvalDate: new Date(),
        updatedAt: new Date()
      };

      // Only add fields if they have values
      if (approval === 'approved' && approvalComment.trim()) {
        updateData.approvalRemarks = approvalComment.trim();
      }
      
      if (approval === 'not_approved' && approvalComment.trim()) {
        updateData.rejectionReason = approvalComment.trim();
      }

      await updateDoc(doc(db, 'leaveApplications', selectedApplication.id), updateData);

      // Update local state - only include fields that have values
      const updatedApplications = leaveApplications.map(app => {
        if (app.id === selectedApplication.id) {
          const updatedApp: LeaveApplication = {
            ...app,
            status: approval === 'approved' ? 'approved' : 'rejected',
            approvalBy: currentUser.id,
            approvalDate: new Date(),
            updatedAt: new Date()
          };
          
          // Only add fields with actual values
          if (approval === 'approved' && approvalComment.trim()) {
            updatedApp.approvalRemarks = approvalComment.trim();
          }
          
          if (approval === 'not_approved' && approvalComment.trim()) {
            updatedApp.rejectionReason = approvalComment.trim();
          }
          
          return updatedApp;
        }
        return app;
      });

      setLeaveApplications(updatedApplications);
      setSelectedApplication(null);
      setApproval('approved');
      setApprovalComment('');

      toast({
        title: "Decision Submitted",
        description: `Leave application ${approval === 'approved' ? 'approved' : 'rejected'} successfully.`
      });

    } catch (error) {
      console.error('Error updating leave application:', error);
      toast({
        title: "Error",
        description: "Failed to update leave application. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="flex items-center gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
      case 'recommended':
        return <Badge variant="default" className="flex items-center gap-1"><CheckCircle className="h-3 w-3" />Recommended</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-600">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="h-3 w-3" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getLeaveTypeColor = (type: string) => {
    switch (type) {
      case 'annual': return 'bg-blue-100 text-blue-800';
      case 'casual': return 'bg-green-100 text-green-800';
      case 'sick': return 'bg-red-100 text-red-800';
      case 'maternity': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handlePrint = (application: LeaveApplication) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Leave Application - ${application.applicantName}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { color: #2563eb; margin-bottom: 10px; }
            .header p { color: #666; }
            .section { margin-bottom: 20px; }
            .section h3 { color: #333; border-bottom: 2px solid #2563eb; padding-bottom: 5px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px; }
            .info-item { margin-bottom: 10px; }
            .info-label { font-weight: bold; color: #555; }
            .info-value { margin-top: 5px; }
            .reason-box { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0; }
            .approval-section { background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .rejection-section { background: #ffe8e8; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .signature-section { margin-top: 40px; display: flex; justify-content: space-between; }
            .signature-box { text-align: center; width: 200px; }
            .signature-line { border-bottom: 1px solid #333; height: 40px; margin-bottom: 5px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Divisional Secretariat Kalmunai</h1>
            <p>Leave Application</p>
          </div>

          <div class="section">
            <h3>Applicant Information</h3>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Name:</div>
                <div class="info-value">${application.applicantName}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Designation:</div>
                <div class="info-value">${application.designation}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Division:</div>
                <div class="info-value">${application.division}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Leave Type:</div>
                <div class="info-value">${application.leaveType.charAt(0).toUpperCase() + application.leaveType.slice(1)}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <h3>Leave Details</h3>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Number of Days:</div>
                <div class="info-value">${application.leaveDays} day(s)</div>
              </div>
              <div class="info-item">
                <div class="info-label">Start Date:</div>
                <div class="info-value">${format(application.startDate, 'MMMM dd, yyyy')}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Resume Date:</div>
                <div class="info-value">${format(application.resumeDate, 'MMMM dd, yyyy')}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Acting Officer:</div>
                <div class="info-value">${application.actingOfficerName}</div>
              </div>
            </div>
            <div class="info-item">
              <div class="info-label">Reason for Leave:</div>
              <div class="reason-box">${application.reason}</div>
            </div>
          </div>

          ${application.status === 'approved' ? `
            <div class="approval-section">
              <h3>Approval Details</h3>
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">Status:</div>
                  <div class="info-value">APPROVED</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Approved Date:</div>
                  <div class="info-value">${application.approvalDate ? format(application.approvalDate, 'MMMM dd, yyyy') : 'N/A'}</div>
                </div>
              </div>
              ${application.approvalRemarks ? `
                <div class="info-item">
                  <div class="info-label">Approval Remarks:</div>
                  <div class="reason-box">${application.approvalRemarks}</div>
                </div>
              ` : ''}
            </div>
          ` : ''}

          ${application.status === 'rejected' ? `
            <div class="rejection-section">
              <h3>Rejection Details</h3>
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">Status:</div>
                  <div class="info-value">REJECTED</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Rejected Date:</div>
                  <div class="info-value">${application.approvalDate ? format(application.approvalDate, 'MMMM dd, yyyy') : 'N/A'}</div>
                </div>
              </div>
              ${application.rejectionReason ? `
                <div class="info-item">
                  <div class="info-label">Reason for Rejection:</div>
                  <div class="reason-box">${application.rejectionReason}</div>
                </div>
              ` : ''}
            </div>
          ` : ''}

          <div class="signature-section">
            <div class="signature-box">
              <div class="signature-line"></div>
              <div>Applicant Signature</div>
              <div>Date: ${format(application.createdAt, 'MMM dd, yyyy')}</div>
            </div>
            <div class="signature-box">
              <div class="signature-line"></div>
              <div>Approving Officer Signature</div>
              <div>Date: ${application.approvalDate ? format(application.approvalDate, 'MMM dd, yyyy') : '________'}</div>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  if (loading) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  if (!currentUser) {
    return <div className="container mx-auto p-4">User not found</div>;
  }

  if (currentUser.role !== 'Divisional Head' && currentUser.role !== 'HOD' && currentUser.role !== 'Admin') {
    return <div className="container mx-auto p-4">Access denied. This page is only for Division Head/HOD/Admin.</div>;
  }

  return (
    <div className="container mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Leave Approval</h1>
        <p className="text-muted-foreground">
          Review and approve leave applications from staff in your division ({currentUser.division})
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leave Applications</CardTitle>
          <CardDescription>
            {divisionApplications.length} application(s) in your division
          </CardDescription>
        </CardHeader>
        <CardContent>
          {divisionApplications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No leave applications in your division.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Acting Officer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {divisionApplications.map((application) => (
                  <TableRow key={application.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{application.applicantName}</div>
                        <div className="text-sm text-muted-foreground">{application.designation}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getLeaveTypeColor(application.leaveType)}>
                        {application.leaveType.charAt(0).toUpperCase() + application.leaveType.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>{application.leaveDays} day(s)</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{format(application.startDate, 'MMM dd, yyyy')}</div>
                        <div className="text-muted-foreground">to {format(application.resumeDate, 'MMM dd, yyyy')}</div>
                      </div>
                    </TableCell>
                    <TableCell>{application.actingOfficerName}</TableCell>
                    <TableCell>{getStatusBadge(application.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {application.status === 'recommended' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleApproval(application)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                        )}
                        {(application.status === 'approved' || application.status === 'rejected') && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handlePrint(application)}
                          >
                            <Printer className="h-4 w-4 mr-1" />
                            Print
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Approval Modal */}
      {selectedApplication && (
        <Card>
          <CardHeader>
            <CardTitle>Review Leave Application</CardTitle>
            <CardDescription>
              Provide your approval decision for {selectedApplication.applicantName}'s leave request
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Applicant</Label>
                <p className="text-sm">{selectedApplication.applicantName} - {selectedApplication.designation}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Leave Type</Label>
                <p className="text-sm">{selectedApplication.leaveType.charAt(0).toUpperCase() + selectedApplication.leaveType.slice(1)}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Duration</Label>
                <p className="text-sm">{selectedApplication.leaveDays} day(s)</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Acting Officer</Label>
                <p className="text-sm">{selectedApplication.actingOfficerName}</p>
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Reason for Leave</Label>
              <p className="text-sm bg-muted p-3 rounded-md">{selectedApplication.reason}</p>
            </div>

            {selectedApplication.status === 'recommended' && (
              <div className="bg-green-50 p-3 rounded-md">
                <Label className="text-sm font-medium text-green-800">Division CC Recommendation</Label>
                <p className="text-sm text-green-700">Recommended by Division CC on {format(selectedApplication.recommendationDate!, 'MMM dd, yyyy')}</p>
              </div>
            )}

            <div>
              <Label className="text-sm font-medium">Approval Decision</Label>
              <Select value={approval} onValueChange={(value: 'approved' | 'not_approved') => setApproval(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Approve</SelectItem>
                  <SelectItem value="not_approved">Reject</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {approval === 'not_approved' && (
              <div>
                <Label className="text-sm font-medium">Reason for Rejection</Label>
                <Textarea
                  placeholder="Please provide a reason for rejecting this leave application..."
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedApplication(null)} disabled={isProcessing}>
                Cancel
              </Button>
              <Button onClick={submitApproval} disabled={isProcessing}>
                {isProcessing ? 'Processing...' : 'Submit Decision'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
