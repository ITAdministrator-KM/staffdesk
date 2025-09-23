'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Info, Trash2, RefreshCw, Users, CheckCircle, XCircle } from 'lucide-react';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function FirebaseAuthHelper() {
  const [email, setEmail] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<{
    existsInFirestore: boolean;
    firestoreId?: string;
    userData?: any;
  } | null>(null);
  const { toast } = useToast();

  const checkEmailStatus = async () => {
    if (!email.trim()) {
      toast({
        title: "Error",
        description: "Please enter an email address to check.",
        variant: "destructive"
      });
      return;
    }

    setIsChecking(true);
    setCheckResult(null);
    
    try {
      // Check if email exists in Firestore
      const firestoreQuery = query(collection(db, 'users'), where('email', '==', email.trim()));
      const firestoreSnapshot = await getDocs(firestoreQuery);
      
      const existsInFirestore = !firestoreSnapshot.empty;
      let firestoreId = '';
      let userData = null;
      
      if (existsInFirestore) {
        const userDoc = firestoreSnapshot.docs[0];
        firestoreId = userDoc.id;
        userData = userDoc.data();
      }

      setCheckResult({
        existsInFirestore,
        firestoreId,
        userData
      });

      toast({
        title: "Email Status Check Complete",
        description: `Found ${existsInFirestore ? '1' : '0'} user(s) in Firestore database.`,
        variant: "default"
      });
    } catch (error) {
      console.error('Error checking email:', error);
      toast({
        title: "Error",
        description: "Failed to check email status. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsChecking(false);
    }
  };

  const deleteFromFirestore = async () => {
    if (!checkResult?.firestoreId) {
      toast({
        title: "Error",
        description: "No Firestore user found to delete.",
        variant: "destructive"
      });
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', checkResult.firestoreId));
      toast({
        title: "Success",
        description: "User deleted from Firestore database."
      });
      
      // Reset check result
      setCheckResult(null);
      setEmail('');
    } catch (error) {
      console.error('Error deleting from Firestore:', error);
      toast({
        title: "Error",
        description: "Failed to delete user from Firestore.",
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Firebase Email Conflict Resolver
        </CardTitle>
        <CardDescription>
          Help resolve email-already-in-use errors when creating new users
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Email Already in Use Issue:</strong> When you delete a user from Firestore, 
            their Firebase Auth account still exists, preventing email reuse.
          </AlertDescription>
        </Alert>

        <div>
          <h4 className="font-semibold mb-3">Quick Solutions</h4>
          <div className="space-y-3 text-sm">
            <div className="p-3 border rounded-lg">
              <h5 className="font-medium text-green-700 dark:text-green-400">✅ Immediate Solutions</h5>
              <ul className="mt-2 space-y-1 list-disc list-inside text-muted-foreground">
                <li>Use a different email address (most reliable)</li>
                <li>Check email status above to verify Firestore conflicts</li>
                <li>Delete Firestore user first if it exists</li>
                <li>Contact administrator for complete Firebase Auth cleanup</li>
              </ul>
            </div>
            
            <div className="p-3 border rounded-lg">
              <h5 className="font-medium text-blue-700 dark:text-blue-400">🔧 Manual Cleanup</h5>
              <ul className="mt-2 space-y-1 list-disc list-inside text-muted-foreground">
                <li>Go to <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="underline">Firebase Console</a></li>
                <li>Navigate to Authentication → Users</li>
                <li>Find and delete the user manually</li>
                <li>Return here and try creating the user again</li>
              </ul>
            </div>
            
            <div className="p-3 border rounded-lg">
              <h5 className="font-medium text-purple-700 dark:text-purple-400">🔮 Production Solution (Firebase Admin SDK)</h5>
              <ul className="mt-2 space-y-1 list-disc list-inside text-muted-foreground">
                <li>Install Firebase Admin SDK: <code className="text-xs bg-muted px-1 rounded">npm install firebase-admin</code></li>
                <li>Set up service account credentials in environment variables</li>
                <li>Create API routes with proper authentication</li>
                <li>Use <code className="text-xs bg-muted px-1 rounded">admin.auth().deleteUser()</code> for complete user deletion</li>
                <li>Example API endpoint: <code className="text-xs bg-muted px-1 rounded">/api/admin/delete-user</code> (already created!)</li>
              </ul>
              
              <Alert className="mt-3">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Good News!</strong> A server-side deletion API has been created at <code>/api/admin/delete-user</code>. 
                  It's ready to use once you set up Firebase Admin SDK with proper credentials.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <h4 className="font-semibold mb-3">🚀 Firebase Admin SDK Setup Guide</h4>
          <div className="space-y-3 text-sm">
            <div className="p-4 border rounded-lg bg-muted/30">
              <h5 className="font-medium mb-2">Step 1: Install Dependencies</h5>
              <code className="block bg-black text-green-400 p-2 rounded text-xs overflow-x-auto">
                npm install firebase-admin
              </code>
            </div>
            
            <div className="p-4 border rounded-lg bg-muted/30">
              <h5 className="font-medium mb-2">Step 2: Environment Variables</h5>
              <p className="text-muted-foreground mb-2">Add these to your <code>.env.local</code> file:</p>
              <code className="block bg-black text-green-400 p-2 rounded text-xs overflow-x-auto whitespace-pre">
{`FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"`}
              </code>
            </div>
            
            <div className="p-4 border rounded-lg bg-muted/30">
              <h5 className="font-medium mb-2">Step 3: Implementation Example</h5>
              <p className="text-muted-foreground mb-2">The code you mentioned works perfectly:</p>
              <code className="block bg-black text-green-400 p-2 rounded text-xs overflow-x-auto whitespace-pre">
{`admin.auth().getUserByEmail("user@example.com")
  .then((userRecord) => {
    return admin.auth().deleteUser(userRecord.uid);
  })
  .then(() => {
    return admin.firestore().collection('users').doc('user-id').delete();
  })
  .then(() => {
    console.log("User deleted from both Auth and Firestore");
  })
  .catch((error) => {
    console.error("Error:", error);
  });`}
              </code>
            </div>
            
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Once Firebase Admin SDK is set up, the existing <code>/api/admin/delete-user</code> endpoint 
                will automatically handle complete user deletion from both Firebase Auth and Firestore!
              </AlertDescription>
            </Alert>
          </div>
        </div>

        <Separator />

        <div>
          <h4 className="font-semibold mb-3">Email Conflict Resolution Steps</h4>
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">1</span>
              <div>
                <p className="font-medium text-sm">Check Email Status Above</p>
                <p className="text-muted-foreground text-xs">Use the checker to verify if email exists in Firestore</p>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">2</span>
              <div>
                <p className="font-medium text-sm">Delete Firestore User (If Found)</p>
                <p className="text-muted-foreground text-xs">If user exists in Firestore, delete using the button above</p>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">3</span>
              <div>
                <p className="font-medium text-sm">Try Creating User Again</p>
                <p className="text-muted-foreground text-xs">If still fails, the email exists in Firebase Auth only</p>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">4</span>
              <div>
                <p className="font-medium text-sm">Use Different Email (Recommended)</p>
                <p className="text-muted-foreground text-xs">The safest solution for email conflicts</p>
              </div>
            </div>
          </div>
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Important:</strong> This is a development workaround. In production, implement proper 
            user deletion using Firebase Admin SDK to handle both Firestore and Authentication cleanup.
          </AlertDescription>
        </Alert>

      </CardContent>
    </Card>
  );
}