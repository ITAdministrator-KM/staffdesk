'use client'

import { useState, useEffect } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db, auth } from '@/lib/firebase'
import { useAuthState } from 'react-firebase-hooks/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  Search, 
  Printer, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Users,
  MoreHorizontal,
  Shield,
  Copy
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { User as UserType } from '@/lib/data'
import { copyToClipboard } from '@/lib/utils'
import PrintSelectionDialog from '@/components/staff/print-selection-dialog'

interface Staff extends UserType {
  // Additional properties specific to staff display
  phone?: string
  address?: string
  joinDate?: string
  department?: string
  employeeId?: string
}

interface User {
  id: string
  name: string
  email: string
  role: string
  division: string
  department?: string
}

export default function RoleBasedStaffDirectory() {
  const [user, authLoading] = useAuthState(auth)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const { toast } = useToast()
  const [staff, setStaff] = useState<Staff[]>([])
  const [filteredStaff, setFilteredStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [divisionFilter, setDivisionFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [printDialogOpen, setPrintDialogOpen] = useState(false)

  // Available roles
  const roles = ['Staff', 'Division CC', 'Divisional Head', 'HOD', 'Admin']

  // Fetch current user data
  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (user?.email) {
        try {
          const q = query(collection(db, 'users'), where('email', '==', user.email))
          const querySnapshot = await getDocs(q)
          if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data()
            setCurrentUser({ 
              ...userData,
              id: querySnapshot.docs[0].id,
              name: userData.name || '',
              email: userData.email || '',
              role: userData.role || '',
              division: userData.division || '',
              department: userData.department || ''
            } as User)
          }
        } catch (error) {
          console.error('Error fetching user data:', error)
        }
      }
    }
    fetchCurrentUser()
  }, [user])

  // Fetch staff based on user role
  useEffect(() => {
    const fetchStaff = async () => {
      if (!currentUser) return

      try {
        let staffQuery

        if (currentUser.role === 'HOD' || currentUser.role === 'Admin') {
          // HOD/Admin can see all staff
          staffQuery = query(collection(db, 'users'))
        } else if (currentUser.role === 'Division CC' || currentUser.role === 'Divisional Head') {
          // Division CC and Divisional Head can see their division only
          staffQuery = query(
            collection(db, 'users'),
            where('division', '==', currentUser.division)
          )
        } else {
          // Staff can only see limited info (for now, no access)
          setStaff([])
          setFilteredStaff([])
          setLoading(false)
          return
        }

        const querySnapshot = await getDocs(staffQuery)
        const staffData: Staff[] = []

        querySnapshot.forEach((doc) => {
          const data = doc.data()
          staffData.push({
            id: doc.id,
            uid: data.uid,
            name: data.name || 'N/A',
            email: data.email || 'N/A',
            avatarUrl: data.avatarUrl || '',
            role: data.role || 'N/A',
            division: data.division,
            designation: data.designation,
            nic: data.nic,
            grade: data.grade,
            dob: data.dob,
            mobile: data.mobile || data.phone,
            appointmentDate: data.appointmentDate,
            basicSalary: data.basicSalary,
            salaryCode: data.salaryCode,
            workingHistory: data.workingHistory,
            inventory: data.inventory,
            // Additional display properties
            phone: data.phone || data.mobile,
            department: data.department,
            address: data.address,
            joinDate: data.appointmentDate?.toDate?.()?.toLocaleDateString() || data.appointmentDate,
            employeeId: data.employeeId
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
  }, [currentUser, toast])

  // Get unique divisions for filter
  const divisions = Array.from(new Set(staff.map(member => member.division).filter(Boolean))).filter(div => div !== undefined) as string[]

  // Filter staff based on search query and filters
  useEffect(() => {
    let filtered = staff

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter((member) =>
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (member.department && member.department.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (member.employeeId && member.employeeId.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (member.phone && member.phone.includes(searchQuery)) ||
        (member.designation && member.designation.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    // Apply role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(member => member.role === roleFilter)
    }

    // Apply division filter
    if (divisionFilter !== 'all') {
      filtered = filtered.filter(member => member.division === divisionFilter)
    }

    setFilteredStaff(filtered)
  }, [searchQuery, staff, roleFilter, divisionFilter])

  const handlePrint = () => {
    setPrintDialogOpen(true)
  }

  const openStaffModal = (staffMember: Staff) => {
    setSelectedStaff(staffMember)
    setModalOpen(true)
  }

  const handleCopyToClipboard = async (text: string, label: string) => {
    const success = await copyToClipboard(text)
    if (success) {
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard.`,
      })
    } else {
      toast({
        title: "Copy Failed",
        description: "Unable to copy to clipboard. Please copy manually.",
        variant: "destructive",
      })
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading staff directory...</p>
        </div>
      </div>
    )
  }

  if (!currentUser || currentUser.role === 'Staff') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-center text-destructive">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              You need Division CC, Divisional Head, HOD, or Admin access to view the staff directory.
            </p>
            {currentUser && (
              <Badge variant="outline" className="mt-2 mx-auto block w-fit">
                Current Role: {currentUser.role}
              </Badge>
            )}
          </CardContent>
        </Card>
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
              {currentUser.role === 'HOD' || currentUser.role === 'Admin' 
                ? 'Organization Wide' 
                : `${currentUser.division} Division`} • {filteredStaff.length} staff members
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            <Shield className="h-4 w-4 mr-1" />
            {currentUser.role} View
          </Badge>
        </div>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-center flex-wrap">
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, role, department, employee ID, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roles.map(role => (
                  <SelectItem key={role} value={role}>{role}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(currentUser.role === 'HOD' || currentUser.role === 'Admin') && (
              <Select value={divisionFilter} onValueChange={setDivisionFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by division" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Divisions</SelectItem>
                  {divisions.map(division => (
                    <SelectItem key={division} value={division}>{division}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="flex gap-2 justify-between items-center">
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                Grid View
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                Table View
              </Button>
            </div>
            <Button onClick={handlePrint} variant="outline">
              <Printer className="h-4 w-4 mr-2" />
              Print Selected Fields
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Staff Display */}
      {filteredStaff.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Staff Found</h3>
            <p className="text-muted-foreground">
              {searchQuery || roleFilter !== 'all' || divisionFilter !== 'all'
                ? 'No staff members match your search criteria.' 
                : 'No staff members found.'}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        /* Grid View */
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
                    <p className="text-sm text-muted-foreground mb-2">{member.designation || member.role}</p>
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
                    <div className="mt-3 space-y-1">
                      <Badge variant="secondary" className="text-xs">
                        {member.division}
                      </Badge>
                      {member.department && (
                        <Badge variant="outline" className="text-xs ml-1">
                          {member.department}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Table View */
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Division</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={member.avatarUrl} alt={member.name} />
                            <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{member.name}</div>
                            <div className="text-sm text-muted-foreground">{member.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{member.role}</Badge>
                      </TableCell>
                      <TableCell>{member.division}</TableCell>
                      <TableCell>{member.department || 'N/A'}</TableCell>
                      <TableCell>{member.designation || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => openStaffModal(member)}>
                              <User className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Staff Detail Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
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
                  <p className="text-lg text-muted-foreground">{selectedStaff.designation || selectedStaff.role}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary">{selectedStaff.division}</Badge>
                    <Badge variant="outline">{selectedStaff.role}</Badge>
                    {selectedStaff.department && (
                      <Badge variant="outline">{selectedStaff.department}</Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold">Personal Information</h4>
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start">
                          <Mail className="h-4 w-4 mr-3 text-muted-foreground mt-1" />
                          <div>
                            <p className="text-sm font-medium">Email</p>
                            <p className="text-sm text-muted-foreground">{selectedStaff.email}</p>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleCopyToClipboard(selectedStaff.email, 'Email')}
                          className="h-6 w-6 p-0"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>

                      {selectedStaff.phone && (
                        <div className="flex items-start justify-between">
                          <div className="flex items-start">
                            <Phone className="h-4 w-4 mr-3 text-muted-foreground mt-1" />
                            <div>
                              <p className="text-sm font-medium">Phone</p>
                              <p className="text-sm text-muted-foreground">{selectedStaff.phone}</p>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleCopyToClipboard(selectedStaff.phone!, 'Phone number')}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      )}

                      {selectedStaff.nic && (
                        <div className="flex items-start">
                          <User className="h-4 w-4 mr-3 text-muted-foreground mt-1" />
                          <div>
                            <p className="text-sm font-medium">NIC</p>
                            <p className="text-sm text-muted-foreground">{selectedStaff.nic}</p>
                          </div>
                        </div>
                      )}

                      {selectedStaff.dob && (
                        <div className="flex items-start">
                          <Calendar className="h-4 w-4 mr-3 text-muted-foreground mt-1" />
                          <div>
                            <p className="text-sm font-medium">Date of Birth</p>
                            <p className="text-sm text-muted-foreground">
                              {selectedStaff.dob ? (selectedStaff.dob instanceof Date ? selectedStaff.dob.toLocaleDateString() : selectedStaff.dob.toDate().toLocaleDateString()) : 'N/A'}
                            </p>
                          </div>
                        </div>
                      )}

                      {selectedStaff.address && (
                        <div className="flex items-start">
                          <MapPin className="h-4 w-4 mr-3 text-muted-foreground mt-1" />
                          <div>
                            <p className="text-sm font-medium">Address</p>
                            <p className="text-sm text-muted-foreground">{selectedStaff.address}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold">Employment Details</h4>
                    <div className="space-y-3">
                      {selectedStaff.employeeId && (
                        <div className="flex items-start">
                          <User className="h-4 w-4 mr-3 text-muted-foreground mt-1" />
                          <div>
                            <p className="text-sm font-medium">Employee ID</p>
                            <p className="text-sm text-muted-foreground">{selectedStaff.employeeId}</p>
                          </div>
                        </div>
                      )}

                      {selectedStaff.appointmentDate && (
                        <div className="flex items-start">
                          <Calendar className="h-4 w-4 mr-3 text-muted-foreground mt-1" />
                          <div>
                            <p className="text-sm font-medium">Appointment Date</p>
                            <p className="text-sm text-muted-foreground">
                              {selectedStaff.appointmentDate ? (selectedStaff.appointmentDate instanceof Date ? selectedStaff.appointmentDate.toLocaleDateString() : selectedStaff.appointmentDate.toDate().toLocaleDateString()) : 'N/A'}
                            </p>
                          </div>
                        </div>
                      )}

                      {selectedStaff.grade && (
                        <div className="flex items-start">
                          <Users className="h-4 w-4 mr-3 text-muted-foreground mt-1" />
                          <div>
                            <p className="text-sm font-medium">Grade</p>
                            <p className="text-sm text-muted-foreground">{selectedStaff.grade}</p>
                          </div>
                        </div>
                      )}

                      {selectedStaff.basicSalary && (
                        <div className="flex items-start">
                          <Calendar className="h-4 w-4 mr-3 text-muted-foreground mt-1" />
                          <div>
                            <p className="text-sm font-medium">Basic Salary</p>
                            <p className="text-sm text-muted-foreground">Rs. {selectedStaff.basicSalary.toLocaleString()}</p>
                          </div>
                        </div>
                      )}

                      {selectedStaff.salaryCode && (
                        <div className="flex items-start">
                          <User className="h-4 w-4 mr-3 text-muted-foreground mt-1" />
                          <div>
                            <p className="text-sm font-medium">Salary Code</p>
                            <p className="text-sm text-muted-foreground">{selectedStaff.salaryCode}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
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
        currentUserRole={currentUser?.role || 'Unknown'}
      />
    </div>
  )
}