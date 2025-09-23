'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, Timestamp, orderBy } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isBefore, isSameDay, subMonths, addMonths } from 'date-fns';
import { Calendar, Save, Download, Send, ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { AdvancedProgramEntry } from '@/lib/data';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function AdvancedProgramPage() {
  const [user, loading] = useAuthState(auth);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [programEntries, setProgramEntries] = useState<AdvancedProgramEntry[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRefs = useRef<{[key: string]: {programName: HTMLInputElement | null, place: HTMLInputElement | null}}>({});
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

  // Fetch program entries for the current month
  useEffect(() => {
    const fetchProgramEntries = async () => {
      if (!currentUser?.id) return;

      setIsLoading(true);
      try {
        const startDate = startOfMonth(currentMonth);
        const endDate = endOfMonth(currentMonth);
        
        // Simplified query to avoid composite index issues
        const q = query(
          collection(db, 'advancedPrograms'),
          where('userId', '==', currentUser.id),
          orderBy('date')
        );
        
        const querySnapshot = await getDocs(q);
        const entries: AdvancedProgramEntry[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const entryDate = data.date.toDate();
          
          // Filter client-side for the current month
          if (entryDate >= startDate && entryDate <= endDate) {
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

  // Get all days in the current month
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  // Get program entry for a specific date
  const getEntryForDate = (date: Date) => {
    return programEntries.find(entry => isSameDay(entry.date, date));
  };

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

  // Generate month options for the next 3 months
  const generateMonthOptions = () => {
    const options = [];
    const today = new Date();
    
    // Add previous month
    const prevMonth = subMonths(today, 1);
    options.push({
      value: format(prevMonth, 'yyyy-MM'),
      label: format(prevMonth, 'MMMM yyyy')
    });
    
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

  // Handle saving program entries (as draft)
  const handleSaveEntries = async () => {
    if (!currentUser) return;

    setIsSaving(true);
    try {
      // Process all entries
      const promises = daysInMonth.map(async (date) => {
        const existingEntry = getEntryForDate(date);
        const isPastDate = isBefore(date, new Date());
        
        // Skip past dates
        if (isPastDate) return;

        // Get values from refs
        const refs = inputRefs.current[date.toString()];
        if (!refs) return;
        
        const programName = refs.programName?.value || '';
        const place = refs.place?.value || '';
        
        // Skip if both fields are empty
        if (!programName.trim() && !place.trim()) return;

        const entryData = {
          userId: currentUser.id,
          userName: currentUser.name,
          division: currentUser.division || '',
          date: date,
          programName,
          place,
          status: 'draft' as const,
          createdAt: existingEntry?.createdAt || new Date(),
          updatedAt: new Date(),
        };

        if (existingEntry) {
          // Update existing entry
          await updateDoc(doc(db, 'advancedPrograms', existingEntry.id), {
            ...entryData,
            updatedAt: new Date(),
          });
        } else {
          // Create new entry
          await addDoc(collection(db, 'advancedPrograms'), {
            ...entryData,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      });

      await Promise.all(promises);

      // Refresh entries
      const startDate = startOfMonth(currentMonth);
      const endDate = endOfMonth(currentMonth);
      
      const q = query(
        collection(db, 'advancedPrograms'),
        where('userId', '==', currentUser.id),
        orderBy('date')
      );
      
      const querySnapshot = await getDocs(q);
      const entries: AdvancedProgramEntry[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const entryDate = data.date.toDate();
        
        // Filter client-side for the current month
        if (entryDate >= startDate && entryDate <= endDate) {
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

      toast({
        title: 'Success',
        description: 'Advanced program entries saved successfully',
      });
    } catch (error) {
      console.error('Error saving program entries:', error);
      toast({
        title: 'Error',
        description: 'Failed to save program entries',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle submitting program entries for approval
  const handleSubmitEntries = async () => {
    if (!currentUser) return;

    setIsSubmitting(true);
    try {
      // Process all entries
      const promises = daysInMonth.map(async (date) => {
        const existingEntry = getEntryForDate(date);
        const isPastDate = isBefore(date, new Date());
        
        // Skip past dates
        if (isPastDate) return;

        // Get values from refs
        const refs = inputRefs.current[date.toString()];
        if (!refs) return;
        
        const programName = refs.programName?.value || '';
        const place = refs.place?.value || '';
        
        // Skip if both fields are empty
        if (!programName.trim() && !place.trim()) return;

        const entryData = {
          userId: currentUser.id,
          userName: currentUser.name,
          division: currentUser.division || '',
          date: date,
          programName,
          place,
          status: 'submitted' as const, // Change status to submitted
          createdAt: existingEntry?.createdAt || new Date(),
          updatedAt: new Date(),
        };

        if (existingEntry) {
          // Update existing entry
          await updateDoc(doc(db, 'advancedPrograms', existingEntry.id), {
            ...entryData,
            updatedAt: new Date(),
          });
        } else {
          // Create new entry
          await addDoc(collection(db, 'advancedPrograms'), {
            ...entryData,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      });

      await Promise.all(promises);

      // Refresh entries
      const startDate = startOfMonth(currentMonth);
      const endDate = endOfMonth(currentMonth);
      
      const q = query(
        collection(db, 'advancedPrograms'),
        where('userId', '==', currentUser.id),
        orderBy('date')
      );
      
      const querySnapshot = await getDocs(q);
      const entries: AdvancedProgramEntry[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const entryDate = data.date.toDate();
        
        // Filter client-side for the current month
        if (entryDate >= startDate && entryDate <= endDate) {
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

      toast({
        title: 'Success',
        description: 'Advanced program entries submitted for approval',
      });
    } catch (error) {
      console.error('Error submitting program entries:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit program entries',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle downloading program entries
  const handleDownloadEntries = () => {
    // Create CSV content
    let csvContent = "Date,Day,Program Name,Place,Status\n";
    
    daysInMonth.forEach((date) => {
      const entry = getEntryForDate(date);
      const dateStr = format(date, 'MMM dd, yyyy');
      const dayStr = format(date, 'EEEE');
      const programName = entry?.programName || '';
      const place = entry?.place || '';
      const status = entry?.status || 'Not filled';
      
      csvContent += `"${dateStr}","${dayStr}","${programName}","${place}","${status}"\n`;
    });

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `advanced-program-${format(currentMonth, 'yyyy-MM')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Check if user has Field staff access
  if (currentUser && currentUser.staffType !== 'Field') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-center text-destructive">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              Advanced Program is only available for Field staff.
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
          <p className="mt-2 text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Advanced Program</h1>
            <p className="text-muted-foreground mt-1">
              Submit your advanced program for the upcoming month
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleDownloadEntries} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button onClick={handleSaveEntries} disabled={isSaving || isLoading} variant="outline">
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Draft'}
            </Button>
            <Button onClick={handleSubmitEntries} disabled={isSubmitting || isLoading}>
              <Send className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Submitting...' : 'Submit for Approval'}
            </Button>
          </div>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Monthly Program Submission</CardTitle>
          <CardDescription>
            Select a month and fill in your program details for each day
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
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Day</TableHead>
                    <TableHead>Program Name</TableHead>
                    <TableHead>Place</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {daysInMonth.map((date) => {
                    const entry = getEntryForDate(date);
                    const isPastDate = isBefore(date, new Date());
                    
                    return (
                      <TableRow key={date.toString()}>
                        <TableCell className="font-medium">
                          {format(date, 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          {format(date, 'EEEE')}
                        </TableCell>
                        <TableCell>
                          <Input
                            ref={(el) => {
                              if (!inputRefs.current[date.toString()]) {
                                inputRefs.current[date.toString()] = { programName: null, place: null };
                              }
                              if (inputRefs.current[date.toString()]) {
                                inputRefs.current[date.toString()].programName = el;
                              }
                            }}
                            placeholder="Program name"
                            defaultValue={entry?.programName || ''}
                            disabled={isPastDate || entry?.status === 'submitted' || entry?.status === 'approved' || isLoading}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            ref={(el) => {
                              if (!inputRefs.current[date.toString()]) {
                                inputRefs.current[date.toString()] = { programName: null, place: null };
                              }
                              if (inputRefs.current[date.toString()]) {
                                inputRefs.current[date.toString()].place = el;
                              }
                            }}
                            placeholder="Place"
                            defaultValue={entry?.place || ''}
                            disabled={isPastDate || entry?.status === 'submitted' || entry?.status === 'approved' || isLoading}
                          />
                        </TableCell>
                        <TableCell>
                          {entry ? (
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              entry.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
                              entry.status === 'approved' ? 'bg-green-100 text-green-800' :
                              entry.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {entry.status}
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                              Not filled
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>• Select a month to view or edit entries</li>
              <li>• Fill in your program details for each day</li>
              <li>• Save as draft to preserve your work</li>
              <li>• Submit for approval when complete</li>
              <li>• Approved entries cannot be edited</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">Not filled</span>
                <span className="text-sm">Entry not created</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">Draft</span>
                <span className="text-sm">Entry saved but not submitted</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">Submitted</span>
                <span className="text-sm">Awaiting approval</span>
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

        <Card>
          <CardHeader>
            <CardTitle>Important Dates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p><strong>Submission Deadline:</strong> Last day of previous month</p>
              <p><strong>Approval Period:</strong> 1-3 business days</p>
              <p><strong>Changes:</strong> Only allowed for draft entries</p>
              <p><strong>Viewing:</strong> Can view previous and future months</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}