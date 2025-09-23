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
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { collection, query, where, getDocs, updateDoc, doc, addDoc, Timestamp } from 'firebase/firestore';

// Helper function to convert Firestore timestamps
const convertToDate = (value: any): Date => {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return new Date(value);
};

export default function LeaveRecommendationPage() {
  const [user, loading] = useAuthState(auth);
  const { toast } = useToast();
  const [leaveApplications, setLeaveApplications] = useState<LeaveApplication[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<LeaveApplication | null>(null);
  const [recommendation, setRecommendation] = useState<'recommended' | 'not_recommended'>('recommended');
  const [recommendationComment, setRecommendationComment] = useState('');
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
          } else {
            // Auto-create basic user profile as per memory specification
            const newUserData = {
              name: user.displayName || 'New User',
              email: user.email,
              role: 'Staff', // Default role
              division: '', // Will need to be set by admin
              designation: '',
              avatarUrl: user.photoURL || `https://picsum.photos/seed/user-${Date.now()}/100/100`,
              createdAt: new Date(),
              updatedAt: new Date()
            };
            
            const docRef = await addDoc(collection(db, 'users'), newUserData);
            setCurrentUser({ ...newUserData, id: docRef.id });
            
            toast({
              title: "Profile Created",
              description: "A basic profile has been created. Please contact your administrator to assign proper role and division.",
              variant: "default"
            });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          toast({ title: "Error", description: "Failed to load user data", variant: "destructive" });
        }
      }
    };
    fetchCurrentUser();
  }, [user, toast]);

  // Fetch leave applications assigned to this user for recommendation
  useEffect(() => {
    const fetchLeaveApplications = async () => {
      if (!currentUser) return;

      try {
        let q;
        if (currentUser.role === 'Division CC') {
          // Division CC can see pending leaves from their division
          q = query(
            collection(db, 'leaveApplications'),
            where('division', '==', currentUser.division),
            where('status', '==', 'pending')
          );
        } else {
          // Other roles can see leaves assigned to them specifically
          q = query(
            collection(db, 'leaveApplications'),
            where('recommenderId', '==', currentUser.id),
            where('status', '==', 'pending')
          );
        }

        const querySnapshot = await getDocs(q);
        const applications = querySnapshot.docs.map(doc => {
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

  const handleRecommendation = (application: LeaveApplication) => {
    setSelectedApplication(application);
  };

  const submitRecommendation = async () => {
    if (!selectedApplication || !currentUser) return;

    // Validate required fields
    if (recommendation === 'not_recommended' && !recommendationComment.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide a reason for not recommending this application.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      const updateData: any = {
        status: recommendation === 'recommended' ? 'recommended' : 'rejected',
        recommendationBy: currentUser.id,
        recommendationDate: new Date(),
        updatedAt: new Date()
      };

      // Only add fields if they have values
      if (recommendation === 'recommended' && recommendationComment.trim()) {
        updateData.recommendationRemarks = recommendationComment.trim();
      }
      
      if (recommendation === 'not_recommended' && recommendationComment.trim()) {
        updateData.rejectionReason = recommendationComment.trim();
      }

      await updateDoc(doc(db, 'leaveApplications', selectedApplication.id), updateData);

      // Update local state - only include fields that have values
      const updatedApplications = leaveApplications.map(app => {
        if (app.id === selectedApplication.id) {
          const updatedApp = {
            ...app,
            status: (recommendation === 'recommended' ? 'recommended' : 'rejected') as 'recommended' | 'rejected',
            recommendationBy: currentUser.id,
            recommendationDate: new Date(),
            updatedAt: new Date()
          };
          
          // Only add fields with actual values
          if (recommendation === 'recommended' && recommendationComment.trim()) {
            (updatedApp as any).recommendationRemarks = recommendationComment.trim();
          }
          
          if (recommendation === 'not_recommended' && recommendationComment.trim()) {
            (updatedApp as any).rejectionReason = recommendationComment.trim();
          }
          
          return updatedApp;
        }
        return app;
      });

      setLeaveApplications(updatedApplications);
      setSelectedApplication(null);
      setRecommendation('recommended');
      setRecommendationComment('');

      toast({
        title: "Recommendation Submitted",
        description: `Leave application ${recommendation === 'recommended' ? 'recommended' : 'not recommended'} successfully.`
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

  if (loading) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  if (!currentUser) {
    return <div className="container mx-auto p-4">User not found</div>;
  }

  if (currentUser.role !== 'Division CC') {
    return <div className="container mx-auto p-4">Access denied. This page is only for Division CC.</div>;
  }

  return (
    <div className="container mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Leave Recommendation</h1>
        <p className="text-muted-foreground">
          Review and recommend leave applications from staff in your division ({currentUser.division})
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Leave Applications</CardTitle>
          <CardDescription>
            {divisionApplications.length} application(s) pending your recommendation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {divisionApplications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No pending leave applications in your division.
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
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleRecommendation(application)}
                      >
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recommendation Modal */}
      {selectedApplication && (
        <Card>
          <CardHeader>
            <CardTitle>Review Leave Application</CardTitle>
            <CardDescription>
              Provide your recommendation for {selectedApplication.applicantName}'s leave request
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

            <div>
              <Label htmlFor="recommendation-select" className="text-sm font-medium">Recommendation</Label>
              <Select value={recommendation} onValueChange={(value: 'recommended' | 'not_recommended') => setRecommendation(value)}>
                <SelectTrigger id="recommendation-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recommended">Recommended</SelectItem>
                  <SelectItem value="not_recommended">Not Recommended</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {recommendation === 'not_recommended' && (
              <div>
                <Label htmlFor="rejection-reason" className="text-sm font-medium">Reason for Not Recommending *</Label>
                <Textarea
                  id="rejection-reason"
                  placeholder="Please provide a reason for not recommending this leave application..."
                  value={recommendationComment}
                  onChange={(e) => setRecommendationComment(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedApplication(null)} disabled={isProcessing}>
                Cancel
              </Button>
              <Button 
                onClick={submitRecommendation} 
                disabled={isProcessing || (recommendation === 'not_recommended' && !recommendationComment.trim())}
              >
                {isProcessing ? 'Processing...' : 'Submit Recommendation'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
