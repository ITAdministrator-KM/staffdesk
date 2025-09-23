'use client'

import { useState, useEffect } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '@/lib/firebase'
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Lock, Shield, User, Mail, AlertTriangle, CheckCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'

const passwordResetSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type PasswordResetForm = z.infer<typeof passwordResetSchema>

export default function AccountSettings() {
  const [user, loading] = useAuthState(auth)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const { toast } = useToast()

  const form = useForm<PasswordResetForm>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  // Fetch current user data
  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (user?.email) {
        try {
          const q = query(collection(db, 'users'), where('email', '==', user.email))
          const querySnapshot = await getDocs(q)
          if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data()
            setCurrentUser({ ...userData, id: querySnapshot.docs[0].id })
          }
        } catch (error) {
          console.error('Error fetching user data:', error)
        }
      }
    }
    fetchCurrentUser()
  }, [user])

  // Check if user has Division CC access
  if (!currentUser || currentUser.role !== 'Division CC') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-center text-destructive">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              You need Division CC access to view this page.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const onSubmit = async (data: PasswordResetForm) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'No user found. Please log in again.',
        variant: 'destructive',
      })
      return
    }

    setIsChangingPassword(true)

    try {
      // Re-authenticate user with current password
      const credential = EmailAuthProvider.credential(user.email!, data.currentPassword)
      await reauthenticateWithCredential(user, credential)

      // Update password
      await updatePassword(user, data.newPassword)

      toast({
        title: 'Password Updated',
        description: 'Your password has been successfully changed.',
      })

      // Reset form
      form.reset()
    } catch (error: any) {
      console.error('Error changing password:', error)
      
      let errorMessage = 'Failed to change password. Please try again.'
      
      if (error.code === 'auth/wrong-password') {
        errorMessage = 'Current password is incorrect.'
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'New password is too weak.'
      } else if (error.code === 'auth/requires-recent-login') {
        errorMessage = 'Please log out and log in again before changing your password.'
      }

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsChangingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading account settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Account Settings</h1>
            <p className="text-muted-foreground mt-1">
              Manage your account security and preferences
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            <Shield className="h-4 w-4 mr-1" />
            Division CC
          </Badge>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account Information
            </CardTitle>
            <CardDescription>
              View your account details and current role
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Full Name</Label>
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm">{currentUser?.name || 'N/A'}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Email Address</Label>
                <div className="p-3 bg-muted rounded-md flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm">{currentUser?.email || 'N/A'}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Role</Label>
                <div className="p-3 bg-muted rounded-md">
                  <Badge variant="secondary">{currentUser?.role || 'N/A'}</Badge>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Division</Label>
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm">{currentUser?.division || 'N/A'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Security Settings
            </CardTitle>
            <CardDescription>
              Update your password to keep your account secure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                For security reasons, you'll need to enter your current password to set a new one.
              </AlertDescription>
            </Alert>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter your current password"
                          {...field}
                          disabled={isChangingPassword}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter your new password"
                          {...field}
                          disabled={isChangingPassword}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Confirm your new password"
                          {...field}
                          disabled={isChangingPassword}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-4 pt-4">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        type="button" 
                        disabled={isChangingPassword || !form.formState.isValid}
                        className="flex items-center gap-2"
                      >
                        <Lock className="h-4 w-4" />
                        Update Password
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Password Change</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to change your password? You will remain logged in, 
                          but you'll need to use the new password for future logins.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={form.handleSubmit(onSubmit)}
                          disabled={isChangingPassword}
                        >
                          {isChangingPassword ? 'Updating...' : 'Update Password'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => form.reset()}
                    disabled={isChangingPassword}
                  >
                    Clear Form
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Security Tips */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Security Best Practices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                <p>Use a strong password with at least 8 characters</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                <p>Include uppercase letters, lowercase letters, numbers, and symbols</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                <p>Don't reuse passwords from other accounts</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                <p>Log out from shared or public computers</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                <p>Contact IT support if you notice any suspicious activity</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}