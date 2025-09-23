# Leave Download Feature

## Overview
This feature allows users with appropriate roles to download/print approved leave applications with all relevant details, including information about recommending and approving officers.

## Access Rights
The Leave Download feature is available to the following user roles:
- **Admin**
- **HOD (Head of Department)**
- **Divisional Head**
- **Division CC** (only for their division)

## How to Access

### 1. Through Navigation Menu
Users with appropriate roles can access the feature through the sidebar navigation:
- Navigate to "Download Leaves" in the sidebar menu

### 2. Through Existing Leave Pages
Direct links to the download feature are also available on:
- Leave Application page
- Leave Recommendation page
- Leave Approval page

## Features

### Filtering Options
Users can filter approved leave applications by:
- **Division**: Filter by specific division (Admin and HOD can see all divisions)
- **Leave Type**: Filter by annual, casual, sick, or maternity leave

### Detailed Information Included
Each downloaded leave application includes:
- Applicant information (name, designation, division)
- Leave details (type, duration, start/resume dates, reason)
- Acting officer information
- Recommending officer information with date
- Approving officer information with date
- Application status (approved)
- Date of application

### Download/Print Functionality
- Click the "Download/Print" button to generate a printable version
- The system opens a print dialog where users can:
  - Print directly to a printer
  - Save as PDF
  - Preview before printing

## Implementation Details

### Component Structure
- **LeaveDownloadSystem**: Main component handling the download functionality
- **AppShell Integration**: Added to sidebar navigation for appropriate roles
- **Direct Links**: Added to existing leave management pages

### Data Access
- Uses Firebase Firestore to retrieve approved leave applications
- Implements role-based access control
- Fetches user details for all involved officers

### Security
- Only authorized users can access approved leave applications
- Users can only see leaves from their division (except Admin and HOD)
- All data is retrieved securely through Firebase authentication

## Usage Instructions

1. Navigate to the "Download Leaves" section
2. Use filters to narrow down the list of approved leaves
3. Click "Download/Print" on any leave application
4. Use the browser's print dialog to either:
   - Print directly
   - Save as PDF
   - Preview before printing

## Technical Notes

### File Locations
- Component: `src/components/leave/leave-download.tsx`
- Page: `src/app/leave-download/page.tsx`
- Navigation updates: `src/components/app-shell.tsx`

### Dependencies
- Uses existing Firebase authentication and database connections
- Integrates with existing UI components
- Follows the same styling conventions as the rest of the application

### Data Flow
1. Component loads current user data
2. Fetches all users for reference
3. Retrieves approved leave applications based on user role
4. Applies filters as needed
5. Generates printable HTML when requested
6. Opens browser print dialog