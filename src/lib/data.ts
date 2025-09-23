import placeholderImagesData from '@/lib/placeholder-images.json';
import { Timestamp } from 'firebase/firestore';

const { placeholderImages } = placeholderImagesData;

export type UserRole = 'Admin' | 'Staff' | 'Division CC' | 'Divisional Head' | 'HOD';
export type StaffType = 'Office' | 'Field';

export type User = {
  id: string;
  uid?: string; // Firebase Auth UID
  name: string;
  email: string;
  avatarUrl: string;
  role: UserRole;
  staffType?: StaffType; // Add this new field
  division?: string;
  designation?: string;
  nic?: string;
  grade?: string;
  dob?: Timestamp | Date; // Allow both for data from firestore and form state
  mobile?: string;
  appointmentDate?: Timestamp | Date; // Allow both for data from firestore and form state
  basicSalary?: number;
  salaryCode?: string;
  workingHistory?: {
    place: string;
    name: string;
  }[];
  inventory?: {
    pcLaptop: boolean;
    lgnAccount: boolean;
    printer: boolean;
    printerName?: string;
    router: boolean;
    ups: boolean;
  };
};

export type Task = {
  id: string;
  title: string;
  description?: string;
  status: 'To Do' | 'In Progress' | 'Done' | 'Canceled';
  priority: 'Low' | 'Medium' | 'High';
  assignee?: User;
  deadline?: Date;
  storyPoints?: number;
  subtasks?: { id: string; title: string; completed: boolean }[];
};

export type Project = {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  imageHint: string;
  tasks: Task[];
};

export type LeaveApplication = {
  id: string;
  applicantId: string;
  applicantName: string;
  designation: string;
  division: string;
  leaveType: 'annual' | 'casual' | 'sick' | 'maternity';
  leaveDays: number;
  startDate: Date;
  resumeDate: Date;
  reason: string;
  actingOfficerId: string;
  actingOfficerName: string;
  recommenderId?: string; // Division CC ID who will recommend
  approverId?: string; // Division Head/HOD ID who will approve
  status: 'pending' | 'recommended' | 'approved' | 'rejected';
  recommendationBy?: string; // Division CC ID who recommended
  recommendationDate?: Date;
  recommendationRemarks?: string;
  approvalBy?: string; // Division Head/HOD ID who approved
  approvalDate?: Date;
  approvalRemarks?: string;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type AdvancedProgramEntry = {
  id: string;
  userId: string;
  userName: string;
  division: string;
  date: Date;
  programName: string;
  place: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
};

// Mock data, will be replaced by Firestore data in most components.
export const users: User[] = [
  { id: 'user-1', name: 'Alice Johnson', email: 'alice.j@example.com', avatarUrl: 'https://picsum.photos/seed/user-1/100/100', designation: 'Lead Developer', role: 'Divisional Head', division: 'IT' },
  { id: 'user-2', name: 'Bob Williams', email: 'bob.w@example.com', avatarUrl: 'https://picsum.photos/seed/user-2/100/100', designation: 'UI/UX Designer', role: 'Staff', division: 'IT' },
  { id: 'user-3', name: 'Charlie Brown', email: 'charlie.b@example.com', avatarUrl: 'https://picsum.photos/seed/user-3/100/100', designation: 'QA Engineer', role: 'Division CC', division: 'IT' },
  { id: 'user-4', name: 'Diana Prince', email: 'diana.p@example.com', avatarUrl: 'https://picsum.photos/seed/user-4/100/100', designation: 'Project Manager', role: 'HOD' },
  { id: 'user-5', name: 'Admin User', email: 'itdskalmunai@gmail.com', avatarUrl: 'https://picsum.photos/seed/user-5/100/100', designation: 'System Admin', role: 'Admin' },
  { id: 'user-6', name: 'Regular Staff', email: 'staff@example.com', avatarUrl: 'https://picsum.photos/seed/user-6/100/100', designation: 'Software Engineer', role: 'Staff', division: 'Engineering' },
  { id: 'user-7', name: 'Eva Green', email: 'eva.g@example.com', avatarUrl: 'https://picsum.photos/seed/user-7/100/100', designation: 'HR Manager', role: 'Divisional Head', division: 'HR' },
  { id: 'user-8', name: 'Frank White', email: 'frank.w@example.com', avatarUrl: 'https://picsum.photos/seed/user-8/100/100', designation: 'HR Specialist', role: 'Staff', division: 'HR' },
];

export const projects: Project[] = [
  {
    id: 'proj-1',
    name: 'E-Commerce Platform Relaunch',
    description: 'Complete overhaul of the existing e-commerce website to improve user experience and performance.',
    imageUrl: placeholderImages.find(p => p.id === 'project-1')?.imageUrl || '',
    imageHint: placeholderImages.find(p => p.id === 'project-1')?.imageHint || '',
    tasks: [
      { id: 'task-1-1', title: 'Design new homepage UI', description: 'Create mockups and prototypes for the new homepage design.', status: 'Done', priority: 'High', assignee: users[1], deadline: new Date('2024-08-10'), storyPoints: 5 },
      { id: 'task-1-2', title: 'Develop user authentication flow', description: 'Implement registration, login, and password reset functionality.', status: 'In Progress', priority: 'High', assignee: users[0], deadline: new Date('2024-08-15'), storyPoints: 8 },
      { id: 'task-1-3', title: 'Set up testing environment', description: 'Configure staging and testing servers for the new platform.', status: 'To Do', priority: 'Medium', assignee: users[2], deadline: new Date('2024-08-12'), storyPoints: 3 },
    ],
  },
  {
    id: 'proj-2',
    name: 'Mobile App for In-Store Navigation',
    description: 'A native mobile application to help customers navigate our physical stores and find products easily.',
    imageUrl: placeholderImages.find(p => p.id === 'project-2')?.imageUrl || '',
    imageHint: placeholderImages.find(p => p.id === 'project-2')?.imageHint || '',
    tasks: [
      { id: 'task-2-1', title: 'Research indoor positioning systems', description: 'Evaluate different technologies like beacons and Wi-Fi RTT.', status: 'In Progress', priority: 'High', assignee: users[0], storyPoints: 8 },
      { id: 'task-2-2', title: 'Create wireframes for main screens', description: 'Design the basic layout for map, search, and product details.', status: 'To Do', priority: 'Medium', assignee: users[1], storyPoints: 5 },
    ],
  },
  {
    id: 'proj-3',
    name: 'Internal HR Management System',
    description: 'A web-based system for managing employee records, payroll, and leave requests.',
    imageUrl: placeholderImages.find(p => p.id === 'project-3')?.imageUrl || '',
    imageHint: placeholderImages.find(p => p.id === 'project-3')?.imageHint || '',
    tasks: [],
  },
];