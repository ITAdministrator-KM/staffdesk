'use client';

import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Plus, Calendar as CalendarLucide, Printer, FileText } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { User, LeaveApplication } from '@/lib/data';

type LeaveType = 'annual' | 'casual' | 'sick' | 'maternity';
type LeaveStatus = 'pending' | 'recommended' | 'approved' | 'rejected';

// Helper function to safely convert dates
const convertToDate = (value: Date | Timestamp): Date => {
  if (value instanceof Timestamp) return value.toDate();
  return value;
};

export function LeaveApplicationModule() {
  const [user, loading] = useAuthState(auth);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [leaves, setLeaves] = useState<LeaveApplication[]>([]);
  const [startDate, setStartDate] = useState<Date>();
  const [resumeDate, setResumeDate] = useState<Date>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<Date>();
  const [filterDateTo, setFilterDateTo] = useState<Date>();
  const [divisionStaff, setDivisionStaff] = useState<User[]>([]);
  const [divisionCC, setDivisionCC] = useState<User[]>([]);
  const [divisionHead, setDivisionHead] = useState<User[]>([]);
  const [hodUsers, setHodUsers] = useState<User[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [userMap, setUserMap] = useState<{[key: string]: User}>({});
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    leaveType: 'annual' as LeaveType,
    reason: '',
    actingOfficerId: '',
    actingOfficerName: '',
    recommenderId: '',
    approverId: '',
    leaveDays: 0
  });

  // Fetch current user data and division staff
  useEffect(() => {
    let isMounted = true;
    
    const fetchCurrentUser = async () => {
      if (!user?.email || isInitialized) return;
      
      try {
        const q = query(collection(db, 'users'), where('email', '==', user.email));
        const querySnapshot = await getDocs(q);
        
        if (!isMounted) return;
        
        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data();
          const userWithId = { 
            ...userData, 
            id: querySnapshot.docs[0].id,
            name: userData.name || '',
            email: userData.email || '',
            role: userData.role || '',
            division: userData.division || '',
            designation: userData.designation || ''
          } as User;
          setCurrentUser(userWithId);
          
          // Fetch division personnel
          if (userData.division && isMounted) {
            await fetchDivisionPersonnel(userData.division, querySnapshot.docs[0].id);
          }
        } else {
          // Auto-create basic user profile
          const newUserData = {
            name: user.displayName || 'New User',
            email: user.email,
            role: 'Staff',
            division: 'General',
            designation: 'Staff Member',
            avatarUrl: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=0ea5e9&color=fff`,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          const docRef = await addDoc(collection(db, 'users'), newUserData);
          
          if (!isMounted) return;
          
          const createdUser = { ...newUserData, id: docRef.id } as User;
          setCurrentUser(createdUser);
          
          toast({ 
            title: "Welcome!", 
            description: "Your profile has been created. Please contact admin to update your role and division.", 
            variant: "default" 
          });
        }
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Error fetching user data:', error);
        if (isMounted) {
          toast({ title: "Error", description: "Failed to load user data", variant: "destructive" });
        }
      }
    };

    const fetchDivisionPersonnel = async (division: string, currentUserId: string) => {
      try {
        const divisionQuery = query(
          collection(db, 'users'),
          where('division', '==', division)
        );
        const divisionSnapshot = await getDocs(divisionQuery);
        const allDivisionUsers = divisionSnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        } as User));

        // Fetch HOD users from other divisions
        const hodQuery = query(
          collection(db, 'users'),
          where('role', '==', 'HOD')
        );
        const hodSnapshot = await getDocs(hodQuery);
        const allHodUsers = hodSnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        } as User));

        if (!isMounted) return;

        // Filter staff for acting officer (same division, excluding current user)
        const staff = allDivisionUsers.filter(u => 
          u.id !== currentUserId && u.role === 'Staff'
        );
        setDivisionStaff(staff);

        // Find Division CCs (same division)
        const ccs = allDivisionUsers.filter(u => u.role === 'Division CC');
        setDivisionCC(ccs);

        // Find Division Heads (same division and system-wide HODs)
        const heads = allDivisionUsers.filter(u => u.role === 'Divisional Head');
        setDivisionHead(heads);
        setHodUsers(allHodUsers);
        
        // Create user map for lookups
        const allUsers = [...allDivisionUsers, ...allHodUsers];
        const userMapping = allUsers.reduce((acc, user) => {
          acc[user.id] = user;
          return acc;
        }, {} as {[key: string]: User});
        setUserMap(userMapping);
        
      } catch (error) {
        console.error('Error fetching division personnel:', error);
      }
    };

    fetchCurrentUser();
    
    return () => {
      isMounted = false;
    };
  }, [user?.email, isInitialized, toast, formData.recommenderId, formData.approverId]);

  // Fetch user's leave applications
  useEffect(() => {
    const fetchLeaves = async () => {
      if (!currentUser?.id) return;

      try {
        const q = query(
          collection(db, 'leaveApplications'),
          where('applicantId', '==', currentUser.id)
        );
        const querySnapshot = await getDocs(q);
        const leaveData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as LeaveApplication));

        // Sort on client side
        const sortedLeaves = leaveData.sort((a, b) => {
          const aDate = convertToDate(a.createdAt);
          const bDate = convertToDate(b.createdAt);
          return bDate.getTime() - aDate.getTime();
        });

        setLeaves(sortedLeaves);
      } catch (error) {
        console.error('Error fetching leaves:', error);
        toast({ title: "Error", description: "Failed to load leave applications", variant: "destructive" });
      }
    };

    fetchLeaves();
  }, [currentUser, toast]);

  const calculateLeaveDays = () => {
    if (startDate && resumeDate) {
      const diffTime = Math.abs(resumeDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setFormData(prev => ({ ...prev, leaveDays: diffDays }));
    }
  };

  useEffect(() => {
    calculateLeaveDays();
  }, [startDate, resumeDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !startDate || !resumeDate) return;

    setIsSubmitting(true);
    try {
      const leaveApplication: Omit<LeaveApplication, 'id'> = {
        applicantId: currentUser.id,
        applicantName: currentUser.name,
        designation: currentUser.designation || 'N/A',
        division: currentUser.division || 'N/A',
        leaveType: formData.leaveType,
        leaveDays: formData.leaveDays,
        startDate: startDate,
        resumeDate: resumeDate,
        reason: formData.reason,
        actingOfficerId: formData.actingOfficerId,
        actingOfficerName: formData.actingOfficerName,
        recommenderId: formData.recommenderId,
        approverId: formData.approverId,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await addDoc(collection(db, 'leaveApplications'), leaveApplication);
      
      toast({
        title: "Leave Application Submitted",
        description: "Your leave application has been submitted successfully.",
      });

      // Reset form
      setFormData({
        leaveType: 'annual' as LeaveType,
        reason: '',
        actingOfficerId: '',
        actingOfficerName: '',
        recommenderId: '',
        approverId: '',
        leaveDays: 0
      });
      setStartDate(undefined);
      setResumeDate(undefined);

      // Refresh leave list
      const refreshQuery = query(
        collection(db, 'leaveApplications'),
        where('applicantId', '==', currentUser.id)
      );
      const refreshSnapshot = await getDocs(refreshQuery);
      const refreshedLeaves = refreshSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as LeaveApplication));
      
      const sortedRefreshedLeaves = refreshedLeaves.sort((a, b) => {
        const aDate = convertToDate(a.createdAt);
        const bDate = convertToDate(b.createdAt);
        return bDate.getTime() - aDate.getTime();
      });
      
      setLeaves(sortedRefreshedLeaves);

    } catch (error) {
      console.error('Error submitting leave application:', error);
      toast({
        title: "Error",
        description: "Failed to submit leave application. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: LeaveStatus) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, label: 'Pending' },
      recommended: { variant: 'default' as const, label: 'Recommended' },
      approved: { variant: 'default' as const, label: 'Approved' },
      rejected: { variant: 'destructive' as const, label: 'Rejected' }
    };

    const config = statusConfig[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getLeaveTypeLabel = (type: LeaveType) => {
    const labels = {
      annual: 'Annual Leave',
      casual: 'Casual Leave',
      sick: 'Sick Leave',
      maternity: 'Maternity Leave'
    };
    return labels[type];
  };

  const filteredLeaves = leaves.filter(leave => {
    if (filterType !== 'all' && leave.leaveType !== filterType) return false;
    if (filterStatus !== 'all' && leave.status !== filterStatus) return false;
    
    if (filterDateFrom && filterDateTo) {
      const leaveStart = convertToDate(leave.startDate);
      return leaveStart >= filterDateFrom && leaveStart <= filterDateTo;
    }
    
    return true;
  });

  const handlePrintLeave = (leave: LeaveApplication) => {
    const actingOfficer = userMap[leave.actingOfficerId || ''];
    const recommendingOfficer = userMap[leave.recommenderId || ''];
    const approvingOfficer = userMap[leave.approverId || ''];
    
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
            .page-break {
              page-break-after: always;
            }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading leave application...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive mb-2">Authentication Required</h2>
          <p className="text-muted-foreground">
            Please log in to access the leave application system.
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Setting up your profile...</h2>
          <p className="text-muted-foreground">
            Please wait while we configure your account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leave Management</h1>
          <p className="text-muted-foreground">Apply for leave and track your applications</p>
        </div>
        <Link href="/leave-download">
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-1" />
            Download Approved Leaves
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="apply" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="apply">Apply for Leave</TabsTrigger>
          <TabsTrigger value="history">Leave History</TabsTrigger>
        </TabsList>

        <TabsContent value="apply" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                New Leave Application
              </CardTitle>
              <CardDescription>
                Submit a new leave application for approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="leaveType">Leave Type</Label>
                    <Select
                      value={formData.leaveType}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, leaveType: value as LeaveType }))}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select leave type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="annual">Annual Leave</SelectItem>
                        <SelectItem value="casual">Casual Leave</SelectItem>
                        <SelectItem value="sick">Sick Leave</SelectItem>
                        <SelectItem value="maternity">Maternity Leave</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="actingOfficer">Acting Officer</Label>
                    <Select
                      value={formData.actingOfficerId}
                      onValueChange={(value) => {
                        const selectedStaff = divisionStaff.find(staff => staff.id === value);
                        setFormData(prev => ({ 
                          ...prev, 
                          actingOfficerId: value,
                          actingOfficerName: selectedStaff?.name || ''
                        }));
                      }}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select acting officer" />
                      </SelectTrigger>
                      <SelectContent>
                        {divisionStaff.length > 0 ? (
                          divisionStaff.map((staff) => (
                            <SelectItem key={staff.id} value={staff.id}>
                              {staff.name} - {staff.designation}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-staff" disabled>
                            No staff available in your division
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="recommendingOfficer">Recommending Officer</Label>
                    <Select
                      value={formData.recommenderId}
                      onValueChange={(value) => {
                        setFormData(prev => ({ ...prev, recommenderId: value }));
                      }}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select recommending officer" />
                      </SelectTrigger>
                      <SelectContent>
                        {divisionCC.map((cc) => (
                          <SelectItem key={cc.id} value={cc.id}>
                            {cc.name} - Division CC
                          </SelectItem>
                        ))}
                        {divisionHead.map((head) => (
                          <SelectItem key={head.id} value={head.id}>
                            {head.name} - Divisional Head
                          </SelectItem>
                        ))}
                        {(divisionCC.length === 0 && divisionHead.length === 0) && (
                          <SelectItem value="no-officers" disabled>
                            No recommending officers available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="approvingOfficer">Approving Officer</Label>
                    <Select
                      value={formData.approverId}
                      onValueChange={(value) => {
                        setFormData(prev => ({ ...prev, approverId: value }));
                      }}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select approving officer" />
                      </SelectTrigger>
                      <SelectContent>
                        {divisionHead.map((head) => (
                          <SelectItem key={head.id} value={head.id}>
                            {head.name} - Divisional Head
                          </SelectItem>
                        ))}
                        {hodUsers.map((hod) => (
                          <SelectItem key={hod.id} value={hod.id}>
                            {hod.name} - HOD
                          </SelectItem>
                        ))}
                        {(divisionHead.length === 0 && hodUsers.length === 0) && (
                          <SelectItem value="no-approvers" disabled>
                            No approving officers available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !startDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, "PPP") : "Select start date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Resume Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !resumeDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {resumeDate ? format(resumeDate, "PPP") : "Select resume date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={resumeDate}
                          onSelect={setResumeDate}
                          disabled={(date) => !startDate || date <= startDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {formData.leaveDays > 0 && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium">
                      Total Leave Days: <span className="text-primary">{formData.leaveDays}</span>
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason for Leave</Label>
                  <Textarea
                    id="reason"
                    value={formData.reason}
                    onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="Provide reason for your leave application..."
                    required
                    rows={4}
                  />
                </div>

                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? "Submitting..." : "Submit Leave Application"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarLucide className="h-5 w-5" />
                Leave History
              </CardTitle>
              <CardDescription>
                View and filter your previous leave applications
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="space-y-2">
                  <Label>Filter by Type</Label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="annual">Annual Leave</SelectItem>
                      <SelectItem value="casual">Casual Leave</SelectItem>
                      <SelectItem value="sick">Sick Leave</SelectItem>
                      <SelectItem value="maternity">Maternity Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Filter by Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="recommended">Recommended</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>From Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filterDateFrom ? format(filterDateFrom, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={filterDateFrom}
                        onSelect={setFilterDateFrom}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>To Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filterDateTo ? format(filterDateTo, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={filterDateTo}
                        onSelect={setFilterDateTo}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Leave Applications List */}
              <div className="space-y-4">
                {filteredLeaves.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No leave applications found.</p>
                  </div>
                ) : (
                  filteredLeaves.map((leave) => (
                    <Card key={leave.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{getLeaveTypeLabel(leave.leaveType)}</h3>
                              {getStatusBadge(leave.status)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {format(convertToDate(leave.startDate), "PPP")} - {format(convertToDate(leave.resumeDate), "PPP")}
                            </p>
                            <p className="text-sm">
                              <strong>Duration:</strong> {leave.leaveDays} days
                            </p>
                            <p className="text-sm">
                              <strong>Reason:</strong> {leave.reason}
                            </p>
                            {leave.actingOfficerName && (
                              <p className="text-sm">
                                <strong>Acting Officer:</strong> {leave.actingOfficerName}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <div className="text-right text-sm text-muted-foreground">
                              Applied: {format(convertToDate(leave.createdAt), "PPP")}
                            </div>
                            {leave.status === 'approved' && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handlePrintLeave(leave)}
                                className="flex items-center gap-1"
                              >
                                <Printer className="h-4 w-4" />
                                Print
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}