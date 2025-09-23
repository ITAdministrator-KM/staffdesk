'use client'

import { useState, useEffect } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '@/lib/firebase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Search, Printer, User, Phone, Mail, MapPin, Calendar, Users } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import PrintSelectionDialog from './print-selection-dialog'
import { User as UserType } from '@/lib/data'

interface Staff extends UserType {
  phone?: string
  department?: string
  address?: string
  joinDate?: string
  employeeId?: string
  position?: string
}

export default function StaffDirectoryDivision() {
  const [user, authLoading] = useAuthState(auth)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const { toast } = useToast()
  const [staff, setStaff] = useState<Staff[]>([])
  const [filteredStaff, setFilteredStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [printDialogOpen, setPrintDialogOpen] = useState(false)

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

  // Fetch staff from assigned division
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        if (!currentUser?.division) {
          toast({
            title: 'Error',
            description: 'Division information not found',
            variant: 'destructive'
          })
          return
        }

        const staffQuery = query(
          collection(db, 'users'),
          where('division', '==', currentUser.division)
        )

        const querySnapshot = await getDocs(staffQuery)
        const staffData: Staff[] = []

        querySnapshot.forEach((doc) => {
          const data = doc.data()
          staffData.push({
            id: doc.id,
            name: data.name || 'N/A',
            email: data.email || 'N/A',
            phone: data.phone,
            role: data.role || 'N/A',
            department: data.department || 'N/A',
            division: data.division || 'N/A',
            address: data.address,
            joinDate: data.joinDate?.toDate?.()?.toLocaleDateString() || data.joinDate,
            avatarUrl: data.avatarUrl,
            employeeId: data.employeeId,
            position: data.position
          })
        })

        setStaff(staffData)
        setFilteredStaff(staffData)
      } catch (error) {
        console.error('Error fetching staff:', error)
        toast({
          title: 'Error',
          description: 'Failed to fetch staff directory',
          variant: 'destructive'
        })
      } finally {
        setLoading(false)
      }
    }

    fetchStaff()
  }, [currentUser])

  // Filter staff based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredStaff(staff)
      return
    }

    const filtered = staff.filter((member) =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.department && member.department.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (member.employeeId && member.employeeId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (member.phone && member.phone.includes(searchQuery))
    )

    setFilteredStaff(filtered)
  }, [searchQuery, staff])

  const handlePrint = () => {
    setPrintDialogOpen(true)
  }

  const openStaffModal = (staffMember: Staff) => {
    setSelectedStaff(staffMember)
    setModalOpen(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading staff directory...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Staff Directory</h1>
            <p className="text-muted-foreground mt-1">
              {currentUser?.division} Division • {filteredStaff.length} staff members
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            <Users className="h-4 w-4 mr-1" />
            Division CC View
          </Badge>
        </div>
      </div>

      {/* Search and Actions */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, role, department, employee ID, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={handlePrint} variant="outline">
              <Printer className="h-4 w-4 mr-2" />
              Print Selected Fields
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStaff.map((member) => (
          <Card key={member.id} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6" onClick={() => openStaffModal(member)}>
              <div className="flex items-start space-x-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={member.avatarUrl} alt={member.name} />
                  <AvatarFallback>
                    {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg leading-tight">{member.name}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{member.role}</p>
                  <div className="space-y-1">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Mail className="h-3 w-3 mr-2" />
                      <span className="truncate">{member.email}</span>
                    </div>
                    {member.phone && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Phone className="h-3 w-3 mr-2" />
                        <span>{member.phone}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-3">
                    <Badge variant="secondary" className="text-xs">
                      {member.department}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredStaff.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Staff Found</h3>
            <p className="text-muted-foreground">
              {searchQuery ? 
                'No staff members match your search criteria.' : 
                'No staff members found in your division.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Staff Detail Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Staff Details</DialogTitle>
          </DialogHeader>
          {selectedStaff && (
            <div className="flex gap-6">
              {/* Profile Picture Section */}
              <div className="flex-shrink-0">
                <Avatar className="h-32 w-32">
                  <AvatarImage src={selectedStaff.avatarUrl} alt={selectedStaff.name} />
                  <AvatarFallback className="text-2xl">
                    {selectedStaff.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              
              {/* Details Section */}
              <div className="flex-1 space-y-4">
                <div>
                  <h2 className="text-2xl font-bold">{selectedStaff.name}</h2>
                  <p className="text-lg text-muted-foreground">{selectedStaff.role}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-3 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Email</p>
                        <p className="text-sm text-muted-foreground">{selectedStaff.email}</p>
                      </div>
                    </div>

                    {selectedStaff.phone && (
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-3 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Phone</p>
                          <p className="text-sm text-muted-foreground">{selectedStaff.phone}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-3 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Department</p>
                        <p className="text-sm text-muted-foreground">{selectedStaff.department}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {selectedStaff.employeeId && (
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-3 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Employee ID</p>
                          <p className="text-sm text-muted-foreground">{selectedStaff.employeeId}</p>
                        </div>
                      </div>
                    )}

                    {selectedStaff.joinDate && (
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-3 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Join Date</p>
                          <p className="text-sm text-muted-foreground">{selectedStaff.joinDate}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-3 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Division</p>
                        <p className="text-sm text-muted-foreground">{selectedStaff.division}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedStaff.address && (
                  <div className="pt-4 border-t">
                    <div className="flex items-start">
                      <MapPin className="h-4 w-4 mr-3 text-muted-foreground mt-1" />
                      <div>
                        <p className="text-sm font-medium">Address</p>
                        <p className="text-sm text-muted-foreground">{selectedStaff.address}</p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedStaff.position && (
                  <div className="pt-2">
                    <Badge variant="outline" className="text-sm">
                      {selectedStaff.position}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Print Selection Dialog */}
      <PrintSelectionDialog
        open={printDialogOpen}
        onOpenChange={setPrintDialogOpen}
        users={filteredStaff}
        currentUserRole={currentUser?.role || 'Division CC'}
      />
    </div>
  )
}