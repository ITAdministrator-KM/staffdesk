import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const auth = admin.auth();

export const deleteUserByAdmin = functions.https.onCall(async (data, context) => {
  // Require authenticated admin
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
  }

  const requesterUid = context.auth.uid;
  const requesterDoc = await db.collection('users').doc(requesterUid).get();
  const requester = requesterDoc.exists ? requesterDoc.data() as any : null;
  if (!requester || !['Admin', 'HOD'].includes(requester.role)) {
    throw new functions.https.HttpsError('permission-denied', 'Only Admin/HOD can delete users.');
  }

  const { email, userId } = data || {};
  if (!email && !userId) {
    throw new functions.https.HttpsError('invalid-argument', 'email or userId is required');
  }

  try {
    let targetUid = userId as string | undefined;
    if (!targetUid && email) {
      const userRecord = await auth.getUserByEmail(email);
      targetUid = userRecord.uid;
    }

    if (!targetUid) {
      throw new functions.https.HttpsError('not-found', 'Target user not found');
    }

    // Delete from Auth
    await auth.deleteUser(targetUid);

    // Delete Firestore user document(s)
    const byIdDoc = db.collection('users').doc(targetUid);
    const byIdSnap = await byIdDoc.get();
    if (byIdSnap.exists) {
      await byIdDoc.delete();
    } else {
      // Some projects store different id; fallback to query by email
      if (email) {
        const q = await db.collection('users').where('email', '==', email).get();
        const batch = db.batch();
        q.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('deleteUserByAdmin error', err);
    throw new functions.https.HttpsError('internal', err?.message || 'Failed to delete user');
  }
});


