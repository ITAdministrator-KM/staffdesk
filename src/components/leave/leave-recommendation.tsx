'use client';

import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, where, getDocs, updateDoc, doc, addDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from '@/components/ui/dialog';
import { CheckCircle, XCircle, Clock, User, Calendar, FileText } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { User as UserType, LeaveApplication } from '@/lib/data';
import { NotificationService } from '@/components/notifications/notification-service';

// Helper function to safely convert dates
const convertToDate = (value: Date | Timestamp): Date => {
  if (value instanceof Timestamp) return value.toDate();
  return value;
};

export function LeaveRecommendationSystem() {
  const [user, loading] = useAuthState(auth);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [pendingLeaves, setPendingLeaves] = useState<LeaveApplication[]>([]);
  const [selectedLeave, setSelectedLeave] = useState<LeaveApplication | null>(null);
  const [recommendation, setRecommendation] = useState<'recommended' | 'not_recommended' | null>(null);
  const [remarks, setRemarks] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  // Fetch current user data
  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (user?.email) {
        try {
          const q = query(collection(db, 'users'), where('email', '==', user.email));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data() as UserType;
            setCurrentUser({ ...userData, id: querySnapshot.docs[0].id });
          } else {
            // Auto-create basic user profile as per memory specification
            const newUserData = {
              name: user.displayName || 'New User',
              email: user.email,
              role: 'Staff' as const, // Default role
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

  // Fetch pending leave applications assigned to this Division CC
  useEffect(() => {
    const fetchPendingLeaves = async () => {
      if (!currentUser?.id) return;

      try {
        // Fetch leave applications where this user is assigned as recommender
        const q = query(
          collection(db, 'leaveApplications'),
          where('recommenderId', '==', currentUser.id),
          where('status', '==', 'pending')
        );
        const querySnapshot = await getDocs(q);
        const leaveData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as LeaveApplication));

        setPendingLeaves(leaveData);
      } catch (error) {
        console.error('Error fetching pending leaves:', error);
        toast({ title: "Error", description: "Failed to load pending applications", variant: "destructive" });
      }
    };

    fetchPendingLeaves();
  }, [currentUser, toast]);

  const handleRecommendation = async () => {
    if (!selectedLeave || !recommendation) return;

    // Validate required fields
    if (recommendation === 'not_recommended' && !remarks.trim()) {
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
        recommendationBy: currentUser?.id,
        recommendationDate: new Date(),
        updatedAt: new Date()
      };

      // Only add fields if they have values
      if (recommendation === 'recommended' && remarks.trim()) {
        updateData.recommendationRemarks = remarks.trim();
      }
      
      if (recommendation === 'not_recommended' && remarks.trim()) {
        updateData.rejectionReason = remarks.trim();
      }

      await updateDoc(doc(db, 'leaveApplications', selectedLeave.id), updateData);

      // Send notification to approver if recommended
      if (recommendation === 'recommended' && selectedLeave.approverId) {
        await NotificationService.notifyLeaveRecommendation(
          selectedLeave.applicantName,
          selectedLeave.id,
          selectedLeave.approverId,
          true
        );
      }

      // Send notification to applicant if rejected
      if (recommendation === 'not_recommended') {
        await NotificationService.notifyLeaveDecision(
          selectedLeave.applicantId,
          selectedLeave.applicantName,
          selectedLeave.id,
          false
        );
      }

      toast({
        title: "Recommendation Submitted",
        description: `Leave application has been ${recommendation === 'recommended' ? 'recommended' : 'rejected'} successfully.`,
      });

      // Remove from pending list
      setPendingLeaves(prev => prev.filter(leave => leave.id !== selectedLeave.id));
      
      // Reset form
      setSelectedLeave(null);
      setRecommendation(null);
      setRemarks('');

    } catch (error) {
      console.error('Error processing recommendation:', error);
      toast({
        title: "Error",
        description: "Failed to process recommendation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
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

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
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
              This module is only accessible to Division CC users.
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leave Recommendations</h1>
          <p className="text-muted-foreground">
            Review and recommend leave applications for <strong>{currentUser?.division}</strong> Division
          </p>
        </div>
        {(currentUser?.role === 'Division CC') && (
          <Link href="/leave-download">
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-1" />
              Download Approved Leaves
            </Button>
          </Link>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Applications</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingLeaves.length}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting your recommendation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Division</CardTitle>
            <User className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{currentUser.division}</div>
            <p className="text-xs text-muted-foreground">
              Your assigned division
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Role</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">CC</div>
            <p className="text-xs text-muted-foreground">
              Division Coordinating Council
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Applications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Pending Leave Applications
          </CardTitle>
          <CardDescription>
            Review and provide recommendations for leave applications in your division
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingLeaves.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">No Pending Applications</h3>
              <p className="text-muted-foreground">
                All leave applications for your division have been processed.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingLeaves.map((leave) => (
                <Card key={leave.id} className="border-l-4 border-l-orange-500">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{leave.applicantName}</h3>
                          <Badge variant="outline">{leave.designation}</Badge>
                          <Badge variant="secondary">{getLeaveTypeLabel(leave.leaveType)}</Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p><strong>Duration:</strong> {leave.leaveDays} days</p>
                            <p><strong>Start Date:</strong> {format(convertToDate(leave.startDate), "PPP")}</p>
                            <p><strong>Resume Date:</strong> {format(convertToDate(leave.resumeDate), "PPP")}</p>
                          </div>
                          <div>
                            <p><strong>Acting Officer:</strong> {leave.actingOfficerName}</p>
                            <p><strong>Applied:</strong> {format(convertToDate(leave.createdAt), "PPP")}</p>
                          </div>
                        </div>
                        
                        <div className="mt-3 p-3 bg-muted rounded-lg">
                          <p className="text-sm"><strong>Reason:</strong></p>
                          <p className="text-sm text-muted-foreground mt-1">{leave.reason}</p>
                        </div>
                      </div>
                      
                      <div className="ml-4">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              onClick={() => setSelectedLeave(leave)}
                              size="sm"
                            >
                              Review
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[600px]">
                            <DialogHeader>
                              <DialogTitle>Review Leave Application</DialogTitle>
                              <DialogDescription>
                                Provide your recommendation for {leave.applicantName}'s leave application
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="space-y-4 py-4">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p><strong>Applicant:</strong> {leave.applicantName}</p>
                                  <p><strong>Designation:</strong> {leave.designation}</p>
                                  <p><strong>Leave Type:</strong> {getLeaveTypeLabel(leave.leaveType)}</p>
                                </div>
                                <div>
                                  <p><strong>Duration:</strong> {leave.leaveDays} days</p>
                                  <p><strong>Start:</strong> {format(convertToDate(leave.startDate), "PPP")}</p>
                                  <p><strong>Resume:</strong> {format(convertToDate(leave.resumeDate), "PPP")}</p>
                                </div>
                              </div>
                              
                              <div>
                                <Label htmlFor="recommendation-radio">Recommendation</Label>
                                <div className="flex gap-4 mt-2" role="radiogroup" aria-labelledby="recommendation-radio">
                                  <Button
                                    type="button"
                                    variant={recommendation === 'recommended' ? 'default' : 'outline'}
                                    onClick={() => setRecommendation('recommended')}
                                    className="flex items-center gap-2"
                                    role="radio"
                                    aria-checked={recommendation === 'recommended'}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                    Recommend
                                  </Button>
                                  <Button
                                    type="button"
                                    variant={recommendation === 'not_recommended' ? 'destructive' : 'outline'}
                                    onClick={() => setRecommendation('not_recommended')}
                                    className="flex items-center gap-2"
                                    role="radio"
                                    aria-checked={recommendation === 'not_recommended'}
                                  >
                                    <XCircle className="h-4 w-4" />
                                    Not Recommend
                                  </Button>
                                </div>
                              </div>
                              
                              {recommendation === 'not_recommended' && (
                                <div>
                                  <Label htmlFor="remarks">Reason for Not Recommending *</Label>
                                  <Textarea
                                    id="remarks"
                                    value={remarks}
                                    onChange={(e) => setRemarks(e.target.value)}
                                    placeholder="Please provide reason for not recommending this application..."
                                    rows={3}
                                    className="mt-2"
                                    required
                                  />
                                </div>
                              )}
                            </div>
                            
                            <DialogFooter>
                              <Button 
                                variant="outline" 
                                onClick={() => {
                                  setSelectedLeave(null);
                                  setRecommendation(null);
                                  setRemarks('');
                                }}
                              >
                                Cancel
                              </Button>
                              <Button 
                                onClick={handleRecommendation}
                                disabled={!recommendation || isProcessing || (recommendation === 'not_recommended' && !remarks.trim())}
                              >
                                {isProcessing ? "Processing..." : "Submit Recommendation"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}