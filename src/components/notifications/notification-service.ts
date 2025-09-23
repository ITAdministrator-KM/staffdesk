import { collection, addDoc, query, where, getDocs, updateDoc, doc, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type NotificationType = 'leave_application' | 'leave_recommendation' | 'leave_approval' | 'leave_rejection';

export interface Notification {
  id?: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: Date;
}

export class NotificationService {
  static async createNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) {
    try {
      await addDoc(collection(db, 'notifications'), {
        ...notification,
        read: false,
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }

  static async getUserNotifications(userId: string, limitCount = 20) {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Notification));
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  static async markAsRead(notificationId: string) {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  static async markAllAsRead(userId: string) {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('read', '==', false)
      );
      const querySnapshot = await getDocs(q);
      
      const updatePromises = querySnapshot.docs.map(doc => 
        updateDoc(doc.ref, { read: true })
      );
      
      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

  // Leave-specific notification helpers
  static async notifyLeaveApplication(
    applicantName: string,
    leaveId: string,
    recommenderId: string,
    approverId: string
  ) {
    // Notify recommender (Division CC)
    await this.createNotification({
      userId: recommenderId,
      type: 'leave_application',
      title: 'New Leave Application',
      message: `${applicantName} has submitted a leave application for your recommendation.`,
      data: { leaveId, applicantName }
    });

    // Notify approver (Division Head/HOD)
    await this.createNotification({
      userId: approverId,
      type: 'leave_application',
      title: 'New Leave Application',
      message: `${applicantName} has submitted a leave application that may require your approval.`,
      data: { leaveId, applicantName }
    });
  }

  static async notifyLeaveRecommendation(
    applicantName: string,
    leaveId: string,
    approverId: string,
    isRecommended: boolean
  ) {
    await this.createNotification({
      userId: approverId,
      type: 'leave_recommendation',
      title: `Leave ${isRecommended ? 'Recommended' : 'Not Recommended'}`,
      message: `${applicantName}'s leave application has been ${isRecommended ? 'recommended' : 'rejected'} and is now ${isRecommended ? 'awaiting your approval' : 'closed'}.`,
      data: { leaveId, applicantName, isRecommended }
    });
  }

  static async notifyLeaveDecision(
    applicantId: string,
    applicantName: string,
    leaveId: string,
    isApproved: boolean
  ) {
    await this.createNotification({
      userId: applicantId,
      type: isApproved ? 'leave_approval' : 'leave_rejection',
      title: `Leave ${isApproved ? 'Approved' : 'Rejected'}`,
      message: `Your leave application has been ${isApproved ? 'approved' : 'rejected'}.`,
      data: { leaveId, applicantName }
    });
  }
}