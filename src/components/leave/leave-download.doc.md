# LeaveDownloadSystem Component

## Overview
The LeaveDownloadSystem component allows authorized users to download/print approved leave applications with all relevant details including recommending and approving officers.

## Props
This component does not accept any props.

## Functionality
- Displays a list of approved leave applications
- Provides filtering by division and leave type
- Allows downloading/printing of leave details with all officer information
- Implements role-based access control

## Access Control
- **Admin**: Can view and download leaves from all divisions
- **HOD**: Can view and download leaves from all divisions
- **Divisional Head**: Can view and download leaves from their division only
- **Division CC**: Can view and download leaves from their division only
- **Staff**: No access to this component

## Data Displayed
Each leave application shows:
- Applicant name and details
- Leave type and duration
- Start and resume dates
- Reason for leave
- Acting officer information
- Recommending officer information
- Approving officer information
- Application status
- Date of application

## Actions
- **Filter**: By division and leave type
- **Download/Print**: Generates a printable version with all details

## Dependencies
- Firebase Authentication
- Firebase Firestore
- React Firebase Hooks
- Date-fns for date formatting
- Lucide React icons
- Custom UI components (Card, Button, Badge, etc.)

## File Location
`src/components/leave/leave-download.tsx`

## Related Files
- `src/app/leave-download/page.tsx` - Page implementation
- `src/components/app-shell.tsx` - Navigation integration