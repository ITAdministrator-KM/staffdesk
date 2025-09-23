'use client';

import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Calendar, FileText, Printer, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { User, LeaveApplication } from '@/lib/data';

// Helper function to safely convert dates
const convertToDate = (value: Date | Timestamp): Date => {
  if (value instanceof Timestamp) return value.toDate();
  return value;
};

const getLeaveTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    annual: 'Annual Leave',
    casual: 'Casual Leave',
    sick: 'Sick Leave',
    maternity: 'Maternity Leave'
  };
  return labels[type] || type;
};

export function LeaveDownloadSystem() {
  const [user, loading] = useAuthState(auth);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [approvedLeaves, setApprovedLeaves] = useState<LeaveApplication[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filterDivision, setFilterDivision] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [userMap, setUserMap] = useState<{[key: string]: User}>({});
  const [selectedLeaves, setSelectedLeaves] = useState<string[]>([]);
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
        }
      }
    };

    fetchCurrentUser();
  }, [user]);

  // Fetch all users for reference
  useEffect(() => {
    const fetchAllUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const allUsers = querySnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        } as User));
        
        setUsers(allUsers);
        
        // Create user map for lookups
        const userMapping = allUsers.reduce((acc, user) => {
          acc[user.id] = user;
          return acc;
        }, {} as {[key: string]: User});
        setUserMap(userMapping);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    fetchAllUsers();
  }, []);

  // Fetch approved leave applications
  useEffect(() => {
    const fetchApprovedLeaves = async () => {
      if (!currentUser) return;

      try {
        let leavesQuery;
        
        // Different access levels
        if (currentUser.role === 'Admin' || currentUser.role === 'HOD') {
          // Admin and HOD can see all approved leaves
          leavesQuery = query(
            collection(db, 'leaveApplications'),
            where('status', '==', 'approved')
          );
        } else if (currentUser.role === 'Divisional Head') {
          // Divisional Head can see approved leaves from their division
          leavesQuery = query(
            collection(db, 'leaveApplications'),
            where('status', '==', 'approved'),
            where('division', '==', currentUser.division)
          );
        } else {
          // Others don't have access
          return;
        }

        const querySnapshot = await getDocs(leavesQuery);
        const leaveData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as LeaveApplication));

        setApprovedLeaves(leaveData);
      } catch (error) {
        console.error('Error fetching approved leaves:', error);
        toast({
          title: "Error",
          description: "Failed to load approved leave applications",
          variant: "destructive"
        });
      }
    };

    fetchApprovedLeaves();
  }, [currentUser, toast]);

  const handlePrintLeave = (leave: LeaveApplication) => {
    const actingOfficer = userMap[leave.actingOfficerId || ''];
    const recommendingOfficer = userMap[leave.recommenderId || ''];
    const approvingOfficer = userMap[leave.approvalBy || ''];
    
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
                  <div class="info-value">${getLeaveTypeLabel(leave.leaveType)}</div>
                </div>
                <div class="info-item compact-info">
                  <div class="info-label">Number of days:</div>
                  <div class="info-value">${leave.leaveDays} days</div>
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
                <div class="info-value" style="margin-top: 5px; font-style: italic;">${leave.reason}</div>
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
    
    const printWindow = window.open('', '_blank', 'width=900,height=600');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      // Don't automatically print - let user decide
    }
  };

  const handleBulkPrint = () => {
    if (selectedLeaves.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select at least one leave application to print",
        variant: "destructive"
      });
      return;
    }

    // Create a single window with all selected leaves
    let bulkPrintContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bulk Leave Applications</title>
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
            .page-break {
              page-break-after: always;
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
    `;

    // Add each selected leave to the print content
    selectedLeaves.forEach((leaveId, index) => {
      const leave = approvedLeaves.find(l => l.id === leaveId);
      if (leave) {
        const actingOfficer = userMap[leave.actingOfficerId || ''];
        const recommendingOfficer = userMap[leave.recommenderId || ''];
        const approvingOfficer = userMap[leave.approvalBy || ''];
        
        bulkPrintContent += `
          <div class="print-container${index < selectedLeaves.length - 1 ? ' page-break' : ''}">
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
                    <div class="info-value">${getLeaveTypeLabel(leave.leaveType)}</div>
                  </div>
                  <div class="info-item compact-info">
                    <div class="info-label">Number of days:</div>
                    <div class="info-value">${leave.leaveDays} days</div>
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
                  <div class="info-value" style="margin-top: 5px; font-style: italic;">${leave.reason}</div>
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
        `;
      }
    });

    bulkPrintContent += `
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=900,height=600');
    if (printWindow) {
      printWindow.document.write(bulkPrintContent);
      printWindow.document.close();
      printWindow.focus();
      // Don't automatically print - let user decide
    }
  };

  const toggleLeaveSelection = (leaveId: string) => {
    setSelectedLeaves(prev => {
      if (prev.includes(leaveId)) {
        return prev.filter(id => id !== leaveId);
      } else {
        return [...prev, leaveId];
      }
    });
  };

  const selectAllLeaves = () => {
    if (selectedLeaves.length === filteredLeaves.length) {
      // Deselect all
      setSelectedLeaves([]);
    } else {
      // Select all
      setSelectedLeaves(filteredLeaves.map(leave => leave.id));
    }
  };

  // Filter leaves based on division and type
  const filteredLeaves = approvedLeaves.filter(leave => {
    if (filterDivision !== 'all' && leave.division !== filterDivision) return false;
    if (filterType !== 'all' && leave.leaveType !== filterType) return false;
    return true;
  });

  // Get unique divisions for filter
  const divisions = Array.from(new Set(approvedLeaves.map(leave => leave.division)));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading download system...</p>
        </div>
      </div>
    );
  }

  // Check if user has access
  if (!currentUser || (
    currentUser.role !== 'Admin' && 
    currentUser.role !== 'HOD' && 
    currentUser.role !== 'Divisional Head'
  )) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-center text-destructive">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              You need Admin, HOD, or Divisional Head access to download approved leaves.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Leave Download System</h1>
            <p className="text-muted-foreground mt-1">
              Download approved leave applications with all details
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              <FileText className="h-4 w-4 mr-1" />
              {currentUser?.role}
            </Badge>
            {selectedLeaves.length > 0 && (
              <Button onClick={handleBulkPrint} variant="default" size="sm">
                <Printer className="h-4 w-4 mr-1" />
                Print Selected ({selectedLeaves.length})
              </Button>
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
              <Label>Division Filter</Label>
              <Select value={filterDivision} onValueChange={setFilterDivision}>
                <SelectTrigger>
                  <SelectValue placeholder="Select division" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Divisions</SelectItem>
                  {divisions.map(division => (
                    <SelectItem key={division} value={division}>{division}</SelectItem>
                  ))}
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
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="sick">Medical</SelectItem>
                  <SelectItem value="maternity">Maternity</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Approved Leave Applications List */}
      <div className="space-y-4">
        {filteredLeaves.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">
                Showing {filteredLeaves.length} approved leave application(s)
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={selectAllLeaves}
              >
                {selectedLeaves.length === filteredLeaves.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            {filteredLeaves.map((leave) => {
              const applicant = userMap[leave.applicantId];
              const recommendingOfficer = userMap[leave.recommenderId || ''];
              const approvingOfficer = userMap[leave.approvalBy || ''];
              
              return (
                <Card key={leave.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-4">
                          <input
                            type="checkbox"
                            checked={selectedLeaves.includes(leave.id)}
                            onChange={() => toggleLeaveSelection(leave.id)}
                            className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <div>
                            <h3 className="text-lg font-semibold">{leave.applicantName}</h3>
                            <p className="text-sm text-muted-foreground">
                              {leave.division} • N/A
                            </p>
                          </div>
                          <Badge variant="default" className="capitalize">
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
                            <Calendar className="h-4 w-4 text-muted-foreground" />
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
                                {format(convertToDate(leave.startDate), 'MMM dd, yyyy')}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Resume Date</p>
                              <p className="text-sm font-medium">
                                {format(convertToDate(leave.resumeDate), 'MMM dd, yyyy')}
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Recommended by</p>
                            <p className="text-sm">
                              {recommendingOfficer?.name || 'N/A'}
                              {recommendingOfficer?.designation && (
                                <span className="text-muted-foreground"> - {recommendingOfficer.designation}</span>
                              )}
                            </p>
                          </div>
                          
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Approved by</p>
                            <p className="text-sm">
                              {approvingOfficer?.name || 'N/A'}
                              {approvingOfficer?.designation && (
                                <span className="text-muted-foreground"> - {approvingOfficer.designation}</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handlePrintLeave(leave)}
                          className="flex items-center gap-1"
                        >
                          <Printer className="h-4 w-4" />
                          Print
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Approved Leave Applications</h3>
              <p className="text-muted-foreground">
                No approved leave applications found matching your filters.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
