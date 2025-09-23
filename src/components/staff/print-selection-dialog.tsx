'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Printer, Eye, Table, FileText, Search, Filter, Users, UserCheck } from 'lucide-react'
import { User } from '@/lib/data'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface PrintSelectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  users: User[]
  currentUserRole: string
}

interface PrintFields {
  name: boolean
  nic: boolean
  designation: boolean
  dob: boolean
  mobile: boolean
  appointmentDate: boolean
  basicSalary: boolean
  salaryCode: boolean
  email: boolean
  workingHistory: boolean
  profileImage: boolean
  inventoryChecklist: boolean
}

interface StaffFilters {
  selectedUsers: string[] // Array of user IDs
  roleFilter: string
  divisionFilter: string
  searchQuery: string
}

const formatDate = (date: any): string => {
  if (!date) return 'N/A'
  try {
    if (date.toDate && typeof date.toDate === 'function') {
      return date.toDate().toLocaleDateString()
    }
    if (date instanceof Date) {
      return date.toLocaleDateString()
    }
    return String(date)
  } catch {
    return 'N/A'
  }
}

export default function PrintSelectionDialog({ 
  open, 
  onOpenChange, 
  users, 
  currentUserRole 
}: PrintSelectionDialogProps) {
  const [selectedFields, setSelectedFields] = useState<PrintFields>({
    name: true,
    nic: true,
    designation: true,
    dob: false,
    mobile: false,
    appointmentDate: false,
    basicSalary: false,
    salaryCode: false,
    email: true,
    workingHistory: false,
    profileImage: false,
    inventoryChecklist: false,
  })
  const [printLayout, setPrintLayout] = useState<'detailed' | 'table'>('table')
  const [staffFilters, setStaffFilters] = useState<StaffFilters>({
    selectedUsers: [], // Start with no users selected
    roleFilter: 'all',
    divisionFilter: 'all',
    searchQuery: ''
  })
  const [filteredUsers, setFilteredUsers] = useState<User[]>(users)

  // Get unique roles and divisions for filters
  const availableRoles = Array.from(new Set(users.map(u => u.role).filter(Boolean))) as string[]
  const availableDivisions = Array.from(new Set(users.map(u => u.division).filter(Boolean))) as string[]

  // Apply filters to users
  useEffect(() => {
    let filtered = users

    // Apply search filter
    if (staffFilters.searchQuery.trim()) {
      filtered = filtered.filter(user =>
        user.name?.toLowerCase().includes(staffFilters.searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(staffFilters.searchQuery.toLowerCase()) ||
        user.designation?.toLowerCase().includes(staffFilters.searchQuery.toLowerCase()) ||
        user.nic?.toLowerCase().includes(staffFilters.searchQuery.toLowerCase())
      )
    }

    // Apply role filter
    if (staffFilters.roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === staffFilters.roleFilter)
    }

    // Apply division filter
    if (staffFilters.divisionFilter !== 'all') {
      filtered = filtered.filter(user => user.division === staffFilters.divisionFilter)
    }

    setFilteredUsers(filtered)
  }, [users, staffFilters])

  // Get selected users for printing
  const selectedUsersForPrint = staffFilters.selectedUsers.length > 0
    ? filteredUsers.filter(user => staffFilters.selectedUsers.includes(user.id))
    : filteredUsers

  const handleFieldChange = (field: keyof PrintFields, checked: boolean) => {
    setSelectedFields(prev => ({ ...prev, [field]: checked }))
  }

  const handleStaffSelection = (userId: string, checked: boolean) => {
    setStaffFilters(prev => ({
      ...prev,
      selectedUsers: checked
        ? [...prev.selectedUsers, userId]
        : prev.selectedUsers.filter(id => id !== userId)
    }))
  }

  const handleSelectAllStaff = () => {
    const allSelected = staffFilters.selectedUsers.length === filteredUsers.length
    setStaffFilters(prev => ({
      ...prev,
      selectedUsers: allSelected ? [] : filteredUsers.map(u => u.id)
    }))
  }

  const handleFilterChange = (filterType: keyof StaffFilters, value: string) => {
    setStaffFilters(prev => ({ ...prev, [filterType]: value }))
  }

  const handleSelectAll = () => {
    const allSelected = Object.values(selectedFields).every(v => v)
    const newState = Object.keys(selectedFields).reduce((acc, key) => {
      acc[key as keyof PrintFields] = !allSelected
      return acc
    }, {} as PrintFields)
    setSelectedFields(newState)
  }

  const handlePreview = () => {
    generatePrintContent(true)
  }

  const handlePrint = () => {
    generatePrintContent(false)
  }

  const generatePrintContent = (preview: boolean = false) => {
    const activeFields = Object.entries(selectedFields)
      .filter(([_, selected]) => selected)
      .map(([field, _]) => field)

    if (activeFields.length === 0) {
      alert('Please select at least one field to print.')
      return
    }

    if (selectedUsersForPrint.length === 0) {
      alert('Please select at least one staff member to print.')
      return
    }

    const printContent = printLayout === 'table' ? generateTableView(activeFields) : generateDetailedView(activeFields)

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      
      if (preview) {
        printWindow.focus()
      } else {
        setTimeout(() => {
          printWindow.print()
        }, 500)
      }
    }
  }

  const generateTableView = (activeFields: string[]) => {
    const getFieldLabel = (field: string) => {
      const labels: Record<string, string> = {
        name: 'Name',
        nic: 'NIC',
        designation: 'Designation',
        dob: 'Date of Birth',
        mobile: 'Mobile',
        appointmentDate: 'Appointment Date',
        basicSalary: 'Basic Salary',
        salaryCode: 'Salary Code',
        email: 'Email',
        workingHistory: 'Working History',
        profileImage: 'Profile Image',
        inventoryChecklist: 'Inventory'
      }
      return labels[field] || field
    }

    const getFieldValue = (user: User, field: string) => {
      switch (field) {
        case 'name': return user.name || 'N/A'
        case 'nic': return user.nic || 'N/A'
        case 'designation': return user.designation || user.role || 'N/A'
        case 'dob': return formatDate(user.dob)
        case 'mobile': return user.mobile || 'N/A'
        case 'appointmentDate': return formatDate(user.appointmentDate)
        case 'basicSalary': return user.basicSalary ? 'Rs. ' + user.basicSalary.toLocaleString() : 'N/A'
        case 'salaryCode': return user.salaryCode || 'N/A'
        case 'email': return user.email || 'N/A'
        case 'workingHistory': 
          return user.workingHistory?.length 
            ? user.workingHistory.map(h => `${h.name} at ${h.place}`).join('; ') 
            : 'N/A'
        case 'profileImage': return user.avatarUrl ? 'Yes' : 'No'
        case 'inventoryChecklist':
          if (!user.inventory) return 'N/A'
          const items = []
          if (user.inventory.pcLaptop) items.push('PC/Laptop')
          if (user.inventory.lgnAccount) items.push('LGN Account')
          if (user.inventory.printer) items.push(`Printer${user.inventory.printerName ? ' (' + user.inventory.printerName + ')' : ''}`)
          if (user.inventory.router) items.push('Router')
          if (user.inventory.ups) items.push('UPS')
          return items.length ? items.join(', ') : 'None'
        default: return 'N/A'
      }
    }

    return `<!DOCTYPE html>
<html>
<head>
  <title>Staff Directory - Table View</title>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      margin: 15px; 
      color: #000 !important;
      font-size: 12px;
    }
    .header { 
      text-align: center; 
      margin-bottom: 20px; 
      border-bottom: 2px solid #333;
      padding-bottom: 15px;
    }
    .header h1 { 
      color: #333; 
      margin-bottom: 5px;
      font-size: 18px;
    }
    .header p { 
      color: #666; 
      margin: 2px 0;
      font-size: 11px;
    }
    .staff-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
      font-size: 10px;
    }
    .staff-table th {
      background-color: #f0f0f0 !important;
      border: 1px solid #333 !important;
      padding: 6px 4px;
      text-align: left;
      font-weight: bold;
      color: #000 !important;
      font-size: 9px;
      vertical-align: top;
    }
    .staff-table td {
      border: 1px solid #666 !important;
      padding: 4px 3px;
      text-align: left;
      color: #000 !important;
      vertical-align: top;
      word-wrap: break-word;
      max-width: 120px;
    }
    .staff-table tr:nth-child(even) {
      background-color: #f9f9f9 !important;
    }
    .summary {
      margin-top: 15px;
      text-align: center;
      font-size: 11px;
      color: #666;
      border-top: 1px solid #ccc;
      padding-top: 10px;
    }
    @media print {
      body { 
        margin: 10px;
        font-size: 11px;
        color: #000 !important;
      }
      .staff-table {
        font-size: 9px;
      }
      .staff-table th {
        background-color: #f0f0f0 !important;
        font-size: 8px;
        padding: 4px 2px;
      }
      .staff-table td {
        padding: 3px 2px;
        font-size: 8px;
      }
      .header h1 {
        font-size: 16px;
      }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Staff Directory - Compact Table View</h1>
    <p>Divisional Secretariat Kalmunai</p>
    <p>Generated on: ${new Date().toLocaleDateString()} | Generated by: ${currentUserRole}</p>
    <p>Total Staff: ${selectedUsersForPrint.length} | Selected Fields: ${activeFields.length}</p>
  </div>

  <table class="staff-table">
    <thead>
      <tr>
        <th style="width: 30px;">#</th>
        ${activeFields.map(field => `<th>${getFieldLabel(field)}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${selectedUsersForPrint.map((user, index) => `
        <tr>
          <td style="text-align: center; font-weight: bold;">${index + 1}</td>
          ${activeFields.map(field => `<td>${getFieldValue(user, field)}</td>`).join('')}
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="summary">
    <strong>Summary:</strong> ${selectedUsersForPrint.length} staff members | 
    Fields: ${activeFields.map(f => getFieldLabel(f)).join(', ')}
  </div>
</body>
</html>`
  }

  const generateDetailedView = (activeFields: string[]) => {
    return `<!DOCTYPE html>
<html>
<head>
  <title>Staff Directory - Detailed View</title>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      margin: 20px; 
      color: #000 !important; 
    }
    .header { 
      text-align: center; 
      margin-bottom: 30px; 
      border-bottom: 2px solid #333;
      padding-bottom: 20px;
    }
    .header h1 { 
      color: #333; 
      margin-bottom: 5px;
      font-size: 24px;
    }
    .header p { 
      color: #666; 
      margin: 5px 0;
    }
    .staff-section {
      margin-bottom: 40px;
      page-break-inside: avoid;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 20px;
    }
    .staff-header {
      display: flex;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 1px solid #eee;
    }
    .profile-image {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      margin-right: 20px;
      object-fit: cover;
      border: 2px solid #ddd;
    }
    .profile-placeholder {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background-color: #f0f0f0;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 20px;
      font-size: 24px;
      font-weight: bold;
      color: #666;
      border: 2px solid #ddd;
    }
    .staff-basic-info {
      flex: 1;
    }
    .staff-basic-info h2 {
      margin: 0 0 5px 0;
      color: #333;
      font-size: 20px;
    }
    .staff-basic-info .role {
      color: #666;
      font-size: 14px;
      margin-bottom: 10px;
    }
    .details-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-top: 15px;
    }
    .detail-item {
      display: flex;
      margin-bottom: 12px;
    }
    .detail-label {
      font-weight: bold;
      color: #333;
      min-width: 150px;
      margin-right: 10px;
    }
    .detail-value {
      color: #555;
      flex: 1;
    }
    .working-history {
      margin-top: 15px;
    }
    .working-history h4 {
      color: #333;
      margin-bottom: 10px;
      font-size: 16px;
    }
    .history-item {
      background: #f9f9f9;
      padding: 10px;
      margin-bottom: 8px;
      border-radius: 4px;
      border-left: 3px solid #007bff;
    }
    .inventory-checklist {
      margin-top: 15px;
    }
    .inventory-checklist h4 {
      color: #333;
      margin-bottom: 10px;
      font-size: 16px;
    }
    .inventory-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 10px;
    }
    .inventory-item {
      display: flex;
      align-items: center;
      padding: 8px;
      background: #f9f9f9;
      border-radius: 4px;
    }
    .inventory-item .checkbox {
      margin-right: 10px;
      width: 16px;
      height: 16px;
    }
    @media print {
      body { 
        margin: 0;
        padding: 20px;
        color: #000 !important;
      }
      .staff-section {
        break-inside: avoid;
        margin-bottom: 30px;
      }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Staff Directory - Detailed Profile View</h1>
    <p>Divisional Secretariat Kalmunai</p>
    <p>Generated on: ${new Date().toLocaleDateString()}</p>
    <p>Generated by: ${currentUserRole}</p>
    <p>Total Staff: ${selectedUsersForPrint.length}</p>
  </div>

  ${selectedUsersForPrint.map(user => `
    <div class="staff-section">
      <div class="staff-header">
        ${selectedFields.profileImage ? `
          ${user.avatarUrl ? `
            <img src="${user.avatarUrl}" alt="${user.name}" class="profile-image" />
          ` : `
            <div class="profile-placeholder">
              ${user.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'N/A'}
            </div>
          `}
        ` : ''}
        <div class="staff-basic-info">
          ${selectedFields.name ? `<h2>${user.name || 'N/A'}</h2>` : ''}
          ${selectedFields.designation ? `<div class="role">${user.designation || user.role || 'N/A'}</div>` : ''}
        </div>
      </div>

      <div class="details-grid">
        <div>
          ${selectedFields.email ? `
            <div class="detail-item">
              <span class="detail-label">Email:</span>
              <span class="detail-value">${user.email || 'N/A'}</span>
            </div>
          ` : ''}
          ${selectedFields.nic ? `
            <div class="detail-item">
              <span class="detail-label">NIC:</span>
              <span class="detail-value">${user.nic || 'N/A'}</span>
            </div>
          ` : ''}
          ${selectedFields.mobile ? `
            <div class="detail-item">
              <span class="detail-label">Mobile Number:</span>
              <span class="detail-value">${user.mobile || 'N/A'}</span>
            </div>
          ` : ''}
          ${selectedFields.dob ? `
            <div class="detail-item">
              <span class="detail-label">Date of Birth:</span>
              <span class="detail-value">${formatDate(user.dob)}</span>
            </div>
          ` : ''}
        </div>
        <div>
          ${selectedFields.appointmentDate ? `
            <div class="detail-item">
              <span class="detail-label">Appointment Date:</span>
              <span class="detail-value">${formatDate(user.appointmentDate)}</span>
            </div>
          ` : ''}
          ${selectedFields.basicSalary ? `
            <div class="detail-item">
              <span class="detail-label">Basic Salary:</span>
              <span class="detail-value">${user.basicSalary ? 'Rs. ' + user.basicSalary.toLocaleString() : 'N/A'}</span>
            </div>
          ` : ''}
          ${selectedFields.salaryCode ? `
            <div class="detail-item">
              <span class="detail-label">Salary Code:</span>
              <span class="detail-value">${user.salaryCode || 'N/A'}</span>
            </div>
          ` : ''}
        </div>
      </div>

      ${selectedFields.workingHistory && user.workingHistory?.length ? `
        <div class="working-history">
          <h4>Working History</h4>
          ${user.workingHistory.map(history => `
            <div class="history-item">
              <strong>Position:</strong> ${history.name || 'N/A'}<br>
              <strong>Place:</strong> ${history.place || 'N/A'}
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${selectedFields.inventoryChecklist && user.inventory ? `
        <div class="inventory-checklist">
          <h4>🖥️ Inventory Checklist</h4>
          <div class="inventory-grid">
            <div class="inventory-item">
              <input type="checkbox" class="checkbox" ${user.inventory.pcLaptop ? 'checked' : ''} disabled>
              <span>PC/Laptop</span>
            </div>
            <div class="inventory-item">
              <input type="checkbox" class="checkbox" ${user.inventory.lgnAccount ? 'checked' : ''} disabled>
              <span>LGN Account</span>
            </div>
            <div class="inventory-item">
              <input type="checkbox" class="checkbox" ${user.inventory.printer ? 'checked' : ''} disabled>
              <span>Printer ${user.inventory.printerName ? '(' + user.inventory.printerName + ')' : ''}</span>
            </div>
            <div class="inventory-item">
              <input type="checkbox" class="checkbox" ${user.inventory.router ? 'checked' : ''} disabled>
              <span>Router</span>
            </div>
            <div class="inventory-item">
              <input type="checkbox" class="checkbox" ${user.inventory.ups ? 'checked' : ''} disabled>
              <span>UPS</span>
            </div>
          </div>
        </div>
      ` : ''}
    </div>
  `).join('')}
</body>
</html>`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Print Staff Directory - Select Fields & Layout
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Select staff and fields for printing ({selectedUsersForPrint.length} of {users.length} staff selected)
            </p>
            <Button variant="outline" size="sm" onClick={handleSelectAll}>
              {Object.values(selectedFields).every(v => v) ? 'Deselect All Fields' : 'Select All Fields'}
            </Button>
          </div>

          {/* Staff Selection Section */}
          <div className="space-y-4 border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />
                Staff Selection
              </h4>
              <Button variant="outline" size="sm" onClick={handleSelectAllStaff}>
                {staffFilters.selectedUsers.length === filteredUsers.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search staff..."
                  value={staffFilters.searchQuery}
                  onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={staffFilters.roleFilter} onValueChange={(value) => handleFilterChange('roleFilter', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {availableRoles.map(role => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={staffFilters.divisionFilter} onValueChange={(value) => handleFilterChange('divisionFilter', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by division" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Divisions</SelectItem>
                  {availableDivisions.map(division => (
                    <SelectItem key={division} value={division}>{division}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Staff List */}
            <ScrollArea className="h-48 border rounded-md p-3">
              <div className="space-y-2">
                {filteredUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No staff members match the current filters.
                  </p>
                ) : (
                  filteredUsers.map((user) => (
                    <div key={user.id} className="flex items-center space-x-2 p-2 hover:bg-muted rounded">
                      <Checkbox
                        id={`staff-${user.id}`}
                        checked={staffFilters.selectedUsers.includes(user.id)}
                        onCheckedChange={(checked) => handleStaffSelection(user.id, !!checked)}
                      />
                      <Label htmlFor={`staff-${user.id}`} className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium">{user.name}</span>
                            <span className="text-sm text-muted-foreground ml-2">({user.role})</span>
                          </div>
                          <div className="flex gap-1">
                            <Badge variant="outline" className="text-xs">{user.division}</Badge>
                            {user.designation && (
                              <Badge variant="secondary" className="text-xs">{user.designation}</Badge>
                            )}
                          </div>
                        </div>
                      </Label>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <UserCheck className="h-4 w-4" />
              <span>{staffFilters.selectedUsers.length} of {filteredUsers.length} staff selected for printing</span>
            </div>
          </div>

          <Separator />

          {/* Layout Selection */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Print Layout</h4>
            <RadioGroup value={printLayout} onValueChange={(value: 'detailed' | 'table') => setPrintLayout(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="table" id="table" />
                <Label htmlFor="table" className="flex items-center gap-2">
                  <Table className="h-4 w-4" />
                  Table View (Compact - saves paper)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="detailed" id="detailed" />
                <Label htmlFor="detailed" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Detailed View (Full profiles with images)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Basic Information</h4>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="name" 
                  checked={selectedFields.name}
                  onCheckedChange={(checked) => handleFieldChange('name', !!checked)}
                />
                <Label htmlFor="name" className="text-sm">Name</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="nic" 
                  checked={selectedFields.nic}
                  onCheckedChange={(checked) => handleFieldChange('nic', !!checked)}
                />
                <Label htmlFor="nic" className="text-sm">NIC</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="designation" 
                  checked={selectedFields.designation}
                  onCheckedChange={(checked) => handleFieldChange('designation', !!checked)}
                />
                <Label htmlFor="designation" className="text-sm">Designation</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="dob" 
                  checked={selectedFields.dob}
                  onCheckedChange={(checked) => handleFieldChange('dob', !!checked)}
                />
                <Label htmlFor="dob" className="text-sm">Date of Birth</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="mobile" 
                  checked={selectedFields.mobile}
                  onCheckedChange={(checked) => handleFieldChange('mobile', !!checked)}
                />
                <Label htmlFor="mobile" className="text-sm">Mobile Number</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="email" 
                  checked={selectedFields.email}
                  onCheckedChange={(checked) => handleFieldChange('email', !!checked)}
                />
                <Label htmlFor="email" className="text-sm">Email</Label>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Employment Details</h4>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="appointmentDate" 
                  checked={selectedFields.appointmentDate}
                  onCheckedChange={(checked) => handleFieldChange('appointmentDate', !!checked)}
                />
                <Label htmlFor="appointmentDate" className="text-sm">Appointment Date</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="basicSalary" 
                  checked={selectedFields.basicSalary}
                  onCheckedChange={(checked) => handleFieldChange('basicSalary', !!checked)}
                />
                <Label htmlFor="basicSalary" className="text-sm">Basic Salary</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="salaryCode" 
                  checked={selectedFields.salaryCode}
                  onCheckedChange={(checked) => handleFieldChange('salaryCode', !!checked)}
                />
                <Label htmlFor="salaryCode" className="text-sm">Salary Code</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="workingHistory" 
                  checked={selectedFields.workingHistory}
                  onCheckedChange={(checked) => handleFieldChange('workingHistory', !!checked)}
                />
                <Label htmlFor="workingHistory" className="text-sm">Working History</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="profileImage" 
                  checked={selectedFields.profileImage}
                  onCheckedChange={(checked) => handleFieldChange('profileImage', !!checked)}
                />
                <Label htmlFor="profileImage" className="text-sm">Profile Image</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="inventoryChecklist" 
                  checked={selectedFields.inventoryChecklist}
                  onCheckedChange={(checked) => handleFieldChange('inventoryChecklist', !!checked)}
                />
                <Label htmlFor="inventoryChecklist" className="text-sm">🖥️ Inventory Checklist</Label>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handlePreview} className="flex-1">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button onClick={handlePrint} className="flex-1">
              <Printer className="h-4 w-4 mr-2" />
              Print Selected
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}