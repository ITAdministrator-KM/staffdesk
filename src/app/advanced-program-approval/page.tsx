'use client';

import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, where, getDocs, updateDoc, doc, Timestamp, orderBy } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, subMonths, addMonths } from 'date-fns';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { AdvancedProgramEntry } from '@/lib/data';
import { Check, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function AdvancedProgramApprovalPage() {
  const [user, loading] = useAuthState(auth);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [programEntries, setProgramEntries] = useState<AdvancedProgramEntry[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

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
        }
      }
    };
    fetchCurrentUser();
  }, [user]);

  // Fetch program entries for the current month that need approval
  useEffect(() => {
    const fetchProgramEntries = async () => {
      if (!currentUser?.division) return;

      setIsLoading(true);
      try {
        const startDate = startOfMonth(currentMonth);
        const endDate = endOfMonth(currentMonth);
        
        // Simplified query to avoid composite index issues
        const q = query(
          collection(db, 'advancedPrograms'),
          where('division', '==', currentUser.division),
          orderBy('date')
        );
        
        const querySnapshot = await getDocs(q);
        const entries: AdvancedProgramEntry[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const entryDate = data.date.toDate();
          const status = data.status;
          
          // Filter client-side for the current month and submitted status
          if (entryDate >= startDate && entryDate <= endDate && status === 'submitted') {
            entries.push({
              id: doc.id,
              userId: data.userId,
              userName: data.userName,
              division: data.division,
              date: entryDate,
              programName: data.programName,
              place: data.place,
              status: data.status,
              createdAt: data.createdAt.toDate(),
              updatedAt: data.updatedAt.toDate(),
            });
          }
        });
        
        setProgramEntries(entries);
      } catch (error) {
        console.error('Error fetching program entries:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch program entries. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProgramEntries();
  }, [currentUser, currentMonth, toast]);

  // Handle month navigation
  const goToPreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleMonthChange = (monthString: string) => {
    const [year, month] = monthString.split('-').map(Number);
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  // Generate month options for the previous and next few months
  const generateMonthOptions = () => {
    const options = [];
    const today = new Date();
    
    // Add previous 3 months
    for (let i = 3; i >= 1; i--) {
      const prevMonth = subMonths(today, i);
      options.push({
        value: format(prevMonth, 'yyyy-MM'),
        label: format(prevMonth, 'MMMM yyyy')
      });
    }
    
    // Add current month
    options.push({
      value: format(today, 'yyyy-MM'),
      label: format(today, 'MMMM yyyy')
    });
    
    // Add next 3 months
    for (let i = 1; i <= 3; i++) {
      const nextMonth = addMonths(today, i);
      options.push({
        value: format(nextMonth, 'yyyy-MM'),
        label: format(nextMonth, 'MMMM yyyy')
      });
    }
    
    return options;
  };

  // Handle approving an entry
  const handleApproveEntry = async (entryId: string) => {
    if (!currentUser) return;

    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'advancedPrograms', entryId), {
        status: 'approved',
        updatedAt: new Date(),
      });

      // Update local state
      setProgramEntries(prev => 
        prev.map(entry => 
          entry.id === entryId 
            ? { ...entry, status: 'approved', updatedAt: new Date() } 
            : entry
        )
      );

      toast({
        title: 'Approved',
        description: 'Program entry approved successfully',
      });
    } catch (error) {
      console.error('Error approving entry:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve entry',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle rejecting an entry
  const handleRejectEntry = async (entryId: string) => {
    if (!currentUser) return;

    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'advancedPrograms', entryId), {
        status: 'rejected',
        updatedAt: new Date(),
      });

      // Update local state
      setProgramEntries(prev => 
        prev.map(entry => 
          entry.id === entryId 
            ? { ...entry, status: 'rejected', updatedAt: new Date() } 
            : entry
        )
      );

      toast({
        title: 'Rejected',
        description: 'Program entry rejected',
      });
    } catch (error) {
      console.error('Error rejecting entry:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject entry',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Check if user has approval access
  if (currentUser && currentUser.role !== 'Division CC' && currentUser.role !== 'Divisional Head' && currentUser.role !== 'HOD' && currentUser.role !== 'Admin') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-center text-destructive">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              You don't have permission to approve advanced programs.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading approval dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Advanced Program Approval</h1>
            <p className="text-muted-foreground mt-1">
              Review and approve submitted advanced programs
            </p>
          </div>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
          <CardDescription>
            Select a month and review submitted program entries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={goToPreviousMonth}
                disabled={isLoading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <Select 
                value={format(currentMonth, 'yyyy-MM')} 
                onValueChange={handleMonthChange}
                disabled={isLoading}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {generateMonthOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button 
                variant="outline" 
                size="icon" 
                onClick={goToNextMonth}
                disabled={isLoading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="text-sm text-muted-foreground">
              Viewing: {format(currentMonth, 'MMMM yyyy')}
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Loading program entries...</span>
            </div>
          ) : programEntries.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No pending approvals for {format(currentMonth, 'MMMM yyyy')}.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Program Name</TableHead>
                    <TableHead>Place</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {programEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">
                        {format(entry.date, 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        {entry.userName}
                      </TableCell>
                      <TableCell>
                        {entry.programName}
                      </TableCell>
                      <TableCell>
                        {entry.place}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => handleApproveEntry(entry.id)}
                            disabled={isUpdating || isLoading}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleRejectEntry(entry.id)}
                            disabled={isUpdating || isLoading}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Approval Guidelines</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>• Review each program entry carefully</li>
              <li>• Ensure program names and places are appropriate</li>
              <li>• Contact staff member if clarification is needed</li>
              <li>• Approve only when satisfied with the entry</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">Submitted</span>
                <span className="text-sm">Awaiting your review</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">Approved</span>
                <span className="text-sm">Entry approved</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">Rejected</span>
                <span className="text-sm">Entry rejected</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}