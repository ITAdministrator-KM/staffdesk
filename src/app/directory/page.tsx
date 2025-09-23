
'use client';

import { StaffDirectory } from '@/components/staff-directory';
import { User } from '@/lib/data';
import { db } from '@/lib/firebase';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

export default function StaffDirectoryPage() {
  const [usersCollection, loading, error] = useCollection(collection(db, 'users'));

  const users = usersCollection?.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)) || [];

  if (loading) {
    return (
        <div className="container mx-auto">
            <div className="mb-8">
                <h1 className="text-4xl font-bold tracking-tight">Staff Directory</h1>
                <p className="mt-2 text-muted-foreground">
                Browse and search for staff members across the organization.
                </p>
            </div>
            <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
      </div>
    )
  }

  if (error) {
    return <div className="container mx-auto text-destructive">Error: {error.message}</div>
  }

  return (
    <div className="container mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">Staff Directory</h1>
        <p className="mt-2 text-muted-foreground">
          Browse and search for staff members across the organization.
        </p>
      </div>
      <StaffDirectory users={users} />
    </div>
  );
}
