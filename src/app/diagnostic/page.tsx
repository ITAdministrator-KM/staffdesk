'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

export default function DiagnosticPage() {
  const [user, loading] = useAuthState(auth);
  const [firebaseStatus, setFirebaseStatus] = useState('Checking...');
  const [authStatus, setAuthStatus] = useState('Checking...');
  const [firestoreStatus, setFirestoreStatus] = useState('Checking...');

  useEffect(() => {
    // Check Firebase initialization
    try {
      if (auth && db) {
        setFirebaseStatus('✅ Firebase initialized successfully');
      } else {
        setFirebaseStatus('❌ Firebase initialization failed');
      }
    } catch (error) {
      setFirebaseStatus(`❌ Firebase error: ${error}`);
    }

    // Check Auth status
    if (loading) {
      setAuthStatus('⏳ Loading authentication...');
    } else if (user) {
      setAuthStatus(`✅ Authenticated as: ${user.email}`);
    } else {
      setAuthStatus('❌ Not authenticated');
    }

    // Check Firestore connection
    const testFirestore = async () => {
      try {
        const testQuery = await getDocs(collection(db, 'users'));
        setFirestoreStatus(`✅ Firestore connected (${testQuery.size} users found)`);
      } catch (error) {
        setFirestoreStatus(`❌ Firestore error: ${error}`);
      }
    };

    if (!loading && user) {
      testFirestore();
    }
  }, [user, loading]);

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>StaffDeskDSK Diagnostic</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold">System Status:</h3>
            <ul className="mt-2 space-y-1">
              <li>{firebaseStatus}</li>
              <li>{authStatus}</li>
              <li>{firestoreStatus}</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold">Environment Info:</h3>
            <ul className="mt-2 space-y-1 text-sm">
              <li>URL: {typeof window !== 'undefined' ? window.location.href : 'Server-side'}</li>
              <li>User Agent: {typeof window !== 'undefined' ? navigator.userAgent : 'Server-side'}</li>
              <li>Local Storage Available: {typeof window !== 'undefined' ? (localStorage ? '✅ Yes' : '❌ No') : 'Server-side'}</li>
            </ul>
          </div>

          {!user && (
            <div>
              <h3 className="font-semibold mb-2">Test Authentication:</h3>
              <Button onClick={handleGoogleSignIn}>
                Sign in with Google
              </Button>
            </div>
          )}

          {user && (
            <div>
              <h3 className="font-semibold">User Info:</h3>
              <pre className="mt-2 text-sm bg-muted p-2 rounded">
                {JSON.stringify({
                  uid: user.uid,
                  email: user.email,
                  displayName: user.displayName,
                  emailVerified: user.emailVerified
                }, null, 2)}
              </pre>
            </div>
          )}

          <div>
            <Button onClick={() => window.location.href = '/'}>
              Go to Main Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}