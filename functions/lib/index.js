"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUserByAdmin = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
const auth = admin.auth();
exports.deleteUserByAdmin = functions.https.onCall(async (data, context) => {
    // Require authenticated admin
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
    }
    const requesterUid = context.auth.uid;
    const requesterDoc = await db.collection('users').doc(requesterUid).get();
    const requester = requesterDoc.exists ? requesterDoc.data() : null;
    if (!requester || !['Admin', 'HOD'].includes(requester.role)) {
        throw new functions.https.HttpsError('permission-denied', 'Only Admin/HOD can delete users.');
    }
    const { email, userId } = data || {};
    if (!email && !userId) {
        throw new functions.https.HttpsError('invalid-argument', 'email or userId is required');
    }
    try {
        let targetUid = userId;
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
        }
        else {
            // Some projects store different id; fallback to query by email
            if (email) {
                const q = await db.collection('users').where('email', '==', email).get();
                const batch = db.batch();
                q.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
            }
        }
        return { success: true };
    }
    catch (err) {
        console.error('deleteUserByAdmin error', err);
        throw new functions.https.HttpsError('internal', err?.message || 'Failed to delete user');
    }
});
//# sourceMappingURL=index.js.map