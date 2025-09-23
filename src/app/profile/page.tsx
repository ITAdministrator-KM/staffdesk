'use client';

import { useState } from 'react';
import Image from 'next/image';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarIcon, Upload, PlusCircle, Trash2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { users, User } from '@/lib/data';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCollection, useDocument } from 'react-firebase-hooks/firestore';
import { collection, doc, updateDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Printer } from 'lucide-react';
import React from 'react';

const profileFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  nic: z.string().optional(),
  designation: z.string().optional(),
  grade: z.string().optional(),
  division: z.string().optional(),
  dob: z.date().optional(),
  mobile: z.string().optional(),
  appointmentDate: z.date().optional(),
  email: z.string().email('Invalid email address.'),
  basicSalary: z.coerce.number().optional(),
  salaryCode: z.string().optional(),
  workingHistory: z.array(z.object({
    place: z.string().min(1, "Place is required."),
    name: z.string().min(1, "Name is required."),
  })).optional(),
  inventory: z.object({
    pcLaptop: z.boolean().default(false),
    lgnAccount: z.boolean().default(false),
    printer: z.boolean().default(false),
    printerName: z.string().optional(),
    router: z.boolean().default(false),
    ups: z.boolean().default(false),
  }).optional(),
});

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters.'),
  confirmPassword: z.string().min(6, 'Please confirm your new password.'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Helper function to safely convert dates
const convertTimestampToDate = (value: Date | Timestamp | undefined): Date | undefined => {
  if (!value) return undefined;
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return undefined;
};

export default function ProfilePage() {
  const [user, loading, error] = useAuthState(auth);
  const [profileImage, setProfileImage] = useState('');
  const [imageHint, setImageHint] = useState('person portrait');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userDocId, setUserDocId] = useState<string | null>(null);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const { toast } = useToast();
  
  // Fetch divisions from database
  const [divisionsCollection, divisionsLoading] = useCollection(collection(db, 'divisions'));
  const divisions = divisionsCollection?.docs.map(d => ({ id: d.id, name: d.data().name })) || [];

  // Fetch current user data from Firestore
  React.useEffect(() => {
    const fetchCurrentUser = async () => {
      if (user?.email) {
        try {
          const q = query(collection(db, 'users'), where('email', '==', user.email));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            setUserDocId(userDoc.id);
            const userData = userDoc.data();
            const userWithId = { id: userDoc.id, ...userData } as User;
            setCurrentUser(userWithId);
            setProfileImage(userData.avatarUrl || `https://picsum.photos/seed/${user.uid}/100/100`);
          } else {
            // Fallback to static data if not found in Firestore
            const fallbackUser = users.find(u => u.email === user.email);
            if (fallbackUser) {
              setCurrentUser(fallbackUser);
              setProfileImage(fallbackUser.avatarUrl);
            }
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          toast({ title: "Error", description: "Failed to load user data", variant: "destructive" });
        }
      }
    };

    fetchCurrentUser();
  }, [user, toast]);

  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: '',
      email: '',
      nic: '',
      designation: '',
      grade: '',
      division: '',
      dob: undefined,
      mobile: '',
      appointmentDate: undefined,
      basicSalary: undefined,
      salaryCode: '',
      workingHistory: [],
      inventory: {
        pcLaptop: false,
        lgnAccount: false,
        printer: false,
        printerName: '',
        router: false,
        ups: false,
      }
    },
  });

  // Update form when currentUser data is loaded
  React.useEffect(() => {
    if (currentUser) {
      form.reset({
        name: currentUser.name || '',
        email: currentUser.email || '',
        nic: currentUser.nic || '',
        designation: currentUser.designation || '',
        grade: currentUser.grade || '',
        division: currentUser.division || '',
        dob: convertTimestampToDate(currentUser.dob),
        mobile: currentUser.mobile || '',
        appointmentDate: convertTimestampToDate(currentUser.appointmentDate),
        basicSalary: currentUser.basicSalary || undefined,
        salaryCode: currentUser.salaryCode || '',
        workingHistory: currentUser.workingHistory || [],
        inventory: {
          pcLaptop: currentUser.inventory?.pcLaptop || false,
          lgnAccount: currentUser.inventory?.lgnAccount || false,
          printer: currentUser.inventory?.printer || false,
          printerName: currentUser.inventory?.printerName || '',
          router: currentUser.inventory?.router || false,
          ups: currentUser.inventory?.ups || false,
        }
      });
    }
  }, [currentUser, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "workingHistory",
  });

  const passwordForm = useForm<z.infer<typeof passwordChangeSchema>>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });


  const onSubmit = async (values: z.infer<typeof profileFormSchema>) => {
    if (!userDocId) {
      toast({ title: "Error", description: "User document not found", variant: "destructive" });
      return;
    }

    try {
      // Prepare data for Firestore (convert dates to Timestamps)
      const updateData = {
        ...values,
        dob: values.dob ? new Date(values.dob) : undefined,
        appointmentDate: values.appointmentDate ? new Date(values.appointmentDate) : undefined,
        updatedAt: new Date(),
      };

      // Update user document in Firestore
      await updateDoc(doc(db, 'users', userDocId), updateData);
      
      // Update local state with proper User type
      setCurrentUser(prev => {
        if (!prev) return null;
        return {
          ...prev,
          ...values,
          dob: values.dob ? new Date(values.dob) : undefined,
          appointmentDate: values.appointmentDate ? new Date(values.appointmentDate) : undefined
        };
      });
      
      toast({ 
        title: "Profile Updated", 
        description: "Your profile has been successfully updated." 
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({ 
        title: "Error", 
        description: "Failed to update profile. Please try again.", 
        variant: "destructive" 
      });
    }
  };

  const onPasswordChange = async (values: z.infer<typeof passwordChangeSchema>) => {
    if (!user) {
      toast({ title: "Error", description: "User not authenticated", variant: "destructive" });
      return;
    }

    try {
      // Re-authenticate user with current password
      const credential = EmailAuthProvider.credential(user.email!, values.currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, values.newPassword);

      // Reset form
      passwordForm.reset();
      setShowPasswordChange(false);

      toast({ 
        title: "Password Updated", 
        description: "Your password has been successfully changed." 
      });
    } catch (error: any) {
      console.error('Error changing password:', error);
      let errorMessage = "Failed to change password. Please try again.";
      
      if (error.code === 'auth/wrong-password') {
        errorMessage = "Current password is incorrect.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "New password is too weak. Please choose a stronger password.";
      } else if (error.code === 'auth/requires-recent-login') {
        errorMessage = "Please log out and log back in before changing your password.";
      }

      toast({ 
        title: "Error", 
        description: errorMessage, 
        variant: "destructive" 
      });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({ 
          title: "File Too Large", 
          description: "Please select an image smaller than 5MB.", 
          variant: "destructive" 
        });
        return;
      }
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({ 
          title: "Invalid File Type", 
          description: "Please select a valid image file.", 
          variant: "destructive" 
        });
        return;
      }
      
      try {
        // Convert to base64 for storage in Firestore
        const reader = new FileReader();
        reader.onload = async (event) => {
          const base64String = event.target?.result as string;
          setProfileImage(base64String);
          setImageHint('custom uploaded image');
          
          // Save image to database
          if (userDocId) {
            try {
              await updateDoc(doc(db, 'users', userDocId), { 
                avatarUrl: base64String,
                updatedAt: new Date()
              });
              
              // Update local state
              setCurrentUser(prev => prev ? { ...prev, avatarUrl: base64String } : null);
              
              toast({ 
                title: "Profile Image Updated", 
                description: "Your profile image has been successfully uploaded and saved." 
              });
            } catch (error) {
              console.error('Error saving profile image:', error);
              toast({ 
                title: "Error", 
                description: "Failed to save profile image. Please try again.", 
                variant: "destructive" 
              });
            }
          }
        };
        
        reader.onerror = () => {
          toast({ 
            title: "Error", 
            description: "Failed to process the image file.", 
            variant: "destructive" 
          });
        };
        
        reader.readAsDataURL(file);
      } catch (error) {
        console.error('Error processing image:', error);
        toast({ 
          title: "Error", 
          description: "Failed to process the image. Please try again.", 
          variant: "destructive" 
        });
      }
    }
  };

  const borrowImage = async () => {
    const seed = `user-${Date.now()}`;
    const imageUrl = `https://picsum.photos/seed/${seed}/400/400`;
    setProfileImage(imageUrl);
    setImageHint('portrait person');
    
    // Save image URL to database
    if (userDocId) {
      try {
        await updateDoc(doc(db, 'users', userDocId), { 
          avatarUrl: imageUrl,
          updatedAt: new Date()
        });
        
        // Update local state
        setCurrentUser(prev => prev ? { ...prev, avatarUrl: imageUrl } : null);
        
        toast({ 
          title: "Profile Image Updated", 
          description: "Your profile image has been successfully updated." 
        });
      } catch (error) {
        console.error('Error updating profile image:', error);
        toast({ 
          title: "Error", 
          description: "Failed to update profile image. Please try again.", 
          variant: "destructive" 
        });
      }
    }
  };

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
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 12px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
          }
          .no-print h3 {
            margin: 0 0 15px 0;
            font-size: 24px;
            font-weight: 600;
          }
          .no-print p {
            margin: 0 0 20px 0;
            font-size: 16px;
            opacity: 0.9;
          }
          .print-btn {
            background: linear-gradient(135deg, #28a745, #20c997);
            color: white;
            border: none;
            padding: 15px 30px;
            cursor: pointer;
            border-radius: 8px;
            margin-right: 15px;
            font-size: 16px;
            font-weight: 600;
            box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
            transition: all 0.3s ease;
          }
          .print-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(40, 167, 69, 0.4);
          }
          .close-btn {
            background: linear-gradient(135deg, #6c757d, #495057);
            color: white;
            border: none;
            padding: 15px 30px;
            cursor: pointer;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            box-shadow: 0 4px 15px rgba(108, 117, 125, 0.3);
            transition: all 0.3s ease;
          }
          .close-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(108, 117, 125, 0.4);
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
          
          /* Screen-only styles for better preview */
          @media screen {
            body {
              background: #f8f9fa;
              margin: 0;
              padding: 20px;
            }
            .profile-section {
              background: white;
              padding: 25px;
              margin-bottom: 20px;
              border-radius: 12px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .section-title {
              color: #495057;
              border-bottom: 2px solid #007bff;
              display: inline-block;
              font-size: 20px;
            }
            .profile-item {
              background: #f8f9fa;
              padding: 12px;
              border-radius: 8px;
              margin-bottom: 8px;
            }
            .inventory-item {
              background: white;
              border: 2px solid #e9ecef;
              border-radius: 10px;
              padding: 15px;
              text-align: center;
              transition: all 0.3s ease;
            }
            .inventory-title {
              font-weight: 600;
              margin-bottom: 8px;
              color: #495057;
            }
            .inventory-status {
              font-size: 16px;
              font-weight: 600;
            }
            .history-item {
              background: white;
              border-left: 4px solid #007bff;
              border-radius: 8px;
              padding: 15px;
              margin-bottom: 10px;
            }
            .history-position {
              font-weight: 600;
              color: #007bff;
              margin-bottom: 5px;
            }
            .history-place {
              color: #6c757d;
            }
            .profile-header-with-image {
              display: flex;
              align-items: center;
              gap: 30px;
              margin-bottom: 25px;
              padding: 25px;
              background: linear-gradient(135deg, #f8f9fa, #e9ecef);
              border-radius: 15px;
              border: 2px solid #007bff;
            }
            .profile-image-container {
              flex-shrink: 0;
            }
            .profile-basic-info {
              flex: 1;
            }
            .profile-basic-info h2 {
              color: #2c3e50 !important;
              font-size: 28px !important;
              margin-bottom: 15px !important;
            }
            .profile-basic-info p {
              font-size: 16px !important;
              margin: 8px 0 !important;
              padding: 5px 10px;
              background: rgba(255, 255, 255, 0.7);
              border-radius: 5px;
              border-left: 3px solid #007bff;
            }
          }
        </style>
      </head>
      <body>
        <div class="no-print">
          <h3>🖨️ Print Preview</h3>
          <p>Review your profile document below. Click "Print" when ready or "Close" to return to your profile.</p>
          <button class="print-btn" onclick="window.print()">🖨️ Print Document</button>
          <button class="close-btn" onclick="window.close()">✖ Close Preview</button>
        </div>
        
        <div class="print-content">
            <div class="print-header">
              <div class="print-title">USER PROFILE</div>
              <div class="print-subtitle">StaffDesk Management System</div>
            </div>
            
            <div class="profile-section">
              <div class="section-title">Profile Information</div>
              <div class="profile-header-with-image">
                <div class="profile-image-container">
                  <img src="${profileImage || currentUser?.avatarUrl || `https://picsum.photos/seed/${currentUser?.name || 'default'}/150/150`}" 
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
              <span class="profile-label">Role:</span>
              <span class="profile-value">${currentUser?.role || 'N/A'}</span>
            </div>
            <div class="profile-item">
              <span class="profile-label">Division:</span>
              <span class="profile-value">${currentUser?.division || 'N/A'}</span>
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
            ${currentUser.workingHistory.map((history, index) => `
              <div class="history-item">
                <div class="history-position">Position ${index + 1}: ${history.name}</div>
                <div class="history-place">Place: ${history.place}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}
        
        <div class="profile-section">
          <div class="section-title">Inventory Checklist</div>
            <div class="inventory-grid">
              <div class="inventory-item">
                <div class="inventory-title">PC/Laptop</div>
                <div class="inventory-status">${currentUser?.inventory?.pcLaptop ? '✅ Available' : '❌ Not Available'}</div>
              </div>
              <div class="inventory-item">
                <div class="inventory-title">LGN Account</div>
                <div class="inventory-status">${currentUser?.inventory?.lgnAccount ? '✅ Active' : '❌ Not Active'}</div>
              </div>
              <div class="inventory-item">
                <div class="inventory-title">Printer</div>
                <div class="inventory-status">${currentUser?.inventory?.printer ? `✅ Available${currentUser?.inventory?.printerName ? ` (${currentUser.inventory.printerName})` : ''}` : '❌ Not Available'}</div>
              </div>
              <div class="inventory-item">
                <div class="inventory-title">Router</div>
                <div class="inventory-status">${currentUser?.inventory?.router ? '✅ Available' : '❌ Not Available'}</div>
              </div>
              <div class="inventory-item">
                <div class="inventory-title">UPS</div>
                <div class="inventory-status">${currentUser?.inventory?.ups ? '✅ Available' : '❌ Not Available'}</div>
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
      toast({
        title: "Print Preview Blocked",
        description: "Please allow popups for this site to view the print preview. Check your browser's popup blocker settings.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  if (!user) {
    return <div className="container mx-auto p-4">Please log in to view your profile.</div>;
  }

  if (!currentUser) {
    return <div className="container mx-auto p-4">Loading profile data...</div>;
  }

  return (
    <div className="container mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>My Profile</CardTitle>
              <CardDescription>
                Manage your personal details and professional information.
              </CardDescription>
            </div>
            <Button 
              onClick={handlePrintProfile}
              variant="outline"
              className="flex items-center gap-2"
              type="button"
            >
              <Printer className="h-4 w-4" />
              Print Profile
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
                <div className="relative flex flex-col items-center gap-4">
                  <Image
                    src={profileImage}
                    alt="Profile"
                    width={150}
                    height={150}
                    className="rounded-full object-cover"
                    style={{ width: 150, height: 150 }}
                    data-ai-hint={imageHint}
                    key={profileImage}
                  />
                  <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm">
                      <label htmlFor="profile-image-upload" className="cursor-pointer">
                        <Upload className="mr-2 h-4 w-4" /> Upload
                        <input
                          id="profile-image-upload"
                          type="file"
                          className="sr-only"
                          onChange={handleImageUpload}
                          accept="image/*"
                        />
                      </label>
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={borrowImage}
                      type="button"
                    >
                      Borrow Image
                    </Button>
                  </div>
                </div>
                <div className="grid flex-1 gap-6 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="your.email@example.com" {...field} readOnly className="bg-muted/50" />
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-muted-foreground">Email is automatically set from your login account</p>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nic"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>NIC</FormLabel>
                        <FormControl>
                          <Input placeholder="National ID Card number" {...field} value={field.value || ''} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="designation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Designation</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Software Engineer" {...field} value={field.value || ''} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="grade"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Grade</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Grade I" {...field} value={field.value || ''} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                   <FormField
                      control={form.control}
                      name="division"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Division</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || undefined}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a division" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {divisions.map((division) => (
                                <SelectItem key={division.id} value={division.name}>
                                  {division.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                   <FormField
                    control={form.control}
                    name="dob"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date of Birth</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  'w-full justify-start pl-3 text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? (
                                  format(field.value, 'PPP')
                                ) : (
                                  <span>Pick a date</span>
                                )}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date > new Date() || date < new Date('1900-01-01')
                              }
                              initialFocus
                              captionLayout="dropdown-buttons"
                              fromYear={1900}
                              toYear={new Date().getFullYear()}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="mobile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile Number</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 234 567 890" {...field} value={field.value || ''} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="appointmentDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Appointment Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  'w-full justify-start pl-3 text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? (
                                  format(field.value, 'PPP')
                                ) : (
                                  <span>Pick a date</span>
                                )}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date > new Date()
                              }
                              initialFocus
                              captionLayout="dropdown-buttons"
                              fromYear={1950}
                              toYear={new Date().getFullYear()}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                      control={form.control}
                      name="basicSalary"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Basic Salary</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="e.g., 50000" {...field} value={field.value || ''} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="salaryCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Salary Code</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., SC123" {...field} value={field.value || ''} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                </div>
              </div>
              
              <Separator />

              <div>
                <h3 className="text-lg font-medium mb-4">Working History</h3>
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex items-end gap-4 p-4 border rounded-lg">
                      <FormField
                        control={form.control}
                        name={`workingHistory.${index}.name`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>Name of Post</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Junior Developer" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`workingHistory.${index}.place`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>Place of Post</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Tech Solutions Inc." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Remove</span>
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => append({ name: '', place: '' })}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Working History
                </Button>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-medium mb-4">Inventory Checklist</h3>
                 <div className="space-y-4 rounded-lg border p-6">
                  <FormField
                    control={form.control}
                    name="inventory.pcLaptop"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl>
                           <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <Label>PC/Laptop</Label>
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="inventory.lgnAccount"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl>
                           <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <Label>LGN Account</Label>
                      </FormItem>
                    )}
                  />
                  <div className="flex items-center gap-4">
                    <FormField
                      control={form.control}
                      name="inventory.printer"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <Label>Printer</Label>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="inventory.printerName"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input placeholder="Printer Name" {...field} value={field.value || ''} disabled={!form.watch('inventory.printer')} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                   <FormField
                    control={form.control}
                    name="inventory.router"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl>
                           <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <Label>Router</Label>
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="inventory.ups"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl>
                           <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <Label>UPS</Label>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-medium mb-4">Password Settings</h3>
                <div className="space-y-4">
                  {!showPasswordChange ? (
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">Password</p>
                        <p className="text-sm text-muted-foreground">Last updated when account was created</p>
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={() => setShowPasswordChange(true)}
                      >
                        Change Password
                      </Button>
                    </div>
                  ) : (
                    <Card>
                      <CardHeader>
                        <CardTitle>Change Password</CardTitle>
                        <CardDescription>
                          Enter your current password and choose a new password.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Form {...passwordForm}>
                          <form onSubmit={passwordForm.handleSubmit(onPasswordChange)} className="space-y-4">
                            <FormField
                              control={passwordForm.control}
                              name="currentPassword"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Current Password</FormLabel>
                                  <FormControl>
                                    <Input type="password" placeholder="Enter current password" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={passwordForm.control}
                              name="newPassword"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>New Password</FormLabel>
                                  <FormControl>
                                    <Input type="password" placeholder="Enter new password (min 6 characters)" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={passwordForm.control}
                              name="confirmPassword"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Confirm New Password</FormLabel>
                                  <FormControl>
                                    <Input type="password" placeholder="Confirm new password" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="flex justify-end gap-2">
                              <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => {
                                  setShowPasswordChange(false);
                                  passwordForm.reset();
                                }}
                              >
                                Cancel
                              </Button>
                              <Button type="submit">Update Password</Button>
                            </div>
                          </form>
                        </Form>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handlePrintProfile}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print Profile
                </Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
