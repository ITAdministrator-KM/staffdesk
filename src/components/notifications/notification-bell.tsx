'use client';

import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NotificationService, Notification } from '@/components/notifications/notification-service';
import { format } from 'date-fns';

export function NotificationBell() {
  const [user] = useAuthState(auth);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch current user
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
          console.error('Error fetching user:', error);
        }
      }
    };
    fetchCurrentUser();
  }, [user]);

  // Listen for notifications
  useEffect(() => {
    if (!currentUser?.id) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUser.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notificationData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Notification));

      // Sort by creation date, newest first
      notificationData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      setNotifications(notificationData.slice(0, 10)); // Show latest 10
      setUnreadCount(notificationData.filter(n => !n.read).length);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleMarkAllAsRead = async () => {
    if (currentUser?.id) {
      await NotificationService.markAllAsRead(currentUser.id);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'leave_application':
        return '📋';
      case 'leave_recommendation':
        return '👍';
      case 'leave_approval':
        return '✅';
      case 'leave_rejection':
        return '❌';
      default:
        return '📢';
    }
  };

  if (!currentUser) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel className="flex items-center justify-between">
          Notifications
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleMarkAllAsRead}
              className="h-auto p-0 text-xs"
            >
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {notifications.length === 0 ? (
          <DropdownMenuItem disabled>
            No notifications
          </DropdownMenuItem>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem 
              key={notification.id} 
              className={`flex-col items-start space-y-1 ${!notification.read ? 'bg-blue-50' : ''}`}
            >
              <div className="flex items-center w-full">
                <span className="mr-2">{getNotificationIcon(notification.type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{notification.title}</p>
                  <p className="text-xs text-muted-foreground">{notification.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(notification.createdAt, 'MMM dd, HH:mm')}
                  </p>
                </div>
                {!notification.read && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full ml-2"></div>
                )}
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}