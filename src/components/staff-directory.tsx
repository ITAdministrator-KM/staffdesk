'use client';

import { useState } from 'react';
import { User, UserRole } from '@/lib/data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, User as UserIcon, MoreHorizontal, Filter } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';

const UserProfileModal = ({ user }: { user: User }) => {
  return (
    <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Staff Details</DialogTitle>
      </DialogHeader>
      <div className="space-y-6">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
          <Avatar className="h-24 w-24">
            <AvatarImage src={user.avatarUrl} alt={user.name} />
            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <h3 className="text-2xl font-semibold">{user.name}</h3>
            <p className="text-lg text-muted-foreground">{user.designation}</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{user.division || 'N/A'}</Badge>
              <Badge variant="outline">{user.role}</Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold mb-2">Personal Information</h4>
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">Email:</span> {user.email}</div>
              <div><span className="font-medium">NIC:</span> {user.nic || 'N/A'}</div>
              <div><span className="font-medium">Mobile:</span> {user.mobile || 'N/A'}</div>
              <div><span className="font-medium">Date of Birth:</span> {user.dob ? format(user.dob instanceof Date ? user.dob : user.dob.toDate(), 'PPP') : 'N/A'}</div>
              <div><span className="font-medium">Appointment Date:</span> {user.appointmentDate ? format(user.appointmentDate instanceof Date ? user.appointmentDate : user.appointmentDate.toDate(), 'PPP') : 'N/A'}</div>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-2">Employment Details</h4>
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">Designation:</span> {user.designation || 'N/A'}</div>
              <div><span className="font-medium">Grade:</span> {user.grade || 'N/A'}</div>
              <div><span className="font-medium">Division:</span> {user.division || 'N/A'}</div>
              <div><span className="font-medium">Basic Salary:</span> {user.basicSalary ? `Rs. ${user.basicSalary.toLocaleString()}` : 'N/A'}</div>
              <div><span className="font-medium">Salary Code:</span> {user.salaryCode || 'N/A'}</div>
            </div>
          </div>
        </div>

        {user.workingHistory && user.workingHistory.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2">Working History</h4>
            <div className="space-y-2">
              {user.workingHistory.map((history, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="font-medium">{history.name}</div>
                  <div className="text-sm text-muted-foreground">{history.place}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {user.inventory && (
          <div>
            <h4 className="font-semibold mb-2">Inventory Checklist</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className={`p-2 rounded ${user.inventory.pcLaptop ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                PC/Laptop: {user.inventory.pcLaptop ? '✓' : '✗'}
              </div>
              <div className={`p-2 rounded ${user.inventory.lgnAccount ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                LGN Account: {user.inventory.lgnAccount ? '✓' : '✗'}
              </div>
              <div className={`p-2 rounded ${user.inventory.printer ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                Printer: {user.inventory.printer ? '✓' : '✗'} {user.inventory.printerName && `(${user.inventory.printerName})`}
              </div>
              <div className={`p-2 rounded ${user.inventory.router ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                Router: {user.inventory.router ? '✓' : '✗'}
              </div>
              <div className={`p-2 rounded ${user.inventory.ups ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                UPS: {user.inventory.ups ? '✓' : '✗'}
              </div>
            </div>
          </div>
        )}
      </div>
    </DialogContent>
  );
};

export function StaffDirectory({ users }: { users: User[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'All'>('All');
  const [divisionFilter, setDivisionFilter] = useState<string>('All');

  const roles: UserRole[] = ['Admin', 'HOD', 'Divisional Head', 'Division CC', 'Staff'];
  const divisions = Array.from(new Set(users.map(user => user.division).filter(Boolean))) as string[];

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.designation && user.designation.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = roleFilter === 'All' || user.role === roleFilter;
    const matchesDivision = divisionFilter === 'All' || user.division === divisionFilter;
    
    return matchesSearch && matchesRole && matchesDivision;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Staff Directory</CardTitle>
            <CardDescription>
              Browse and manage staff members across the organization.
            </CardDescription>
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or designation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={roleFilter} onValueChange={(value: UserRole | 'All') => setRoleFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Roles</SelectItem>
                {roles.map(role => (
                  <SelectItem key={role} value={role}>{role}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={divisionFilter} onValueChange={setDivisionFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by division" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Divisions</SelectItem>
                {divisions.map(division => (
                  <SelectItem key={division} value={division}>{division}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Division</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatarUrl} alt={user.name} />
                          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.role}</Badge>
                    </TableCell>
                    <TableCell>{user.division || 'N/A'}</TableCell>
                    <TableCell>{user.designation || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DialogTrigger asChild>
                              <DropdownMenuItem>
                                <UserIcon className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                            </DialogTrigger>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <UserProfileModal user={user} />
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No matching staff found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}