# Advanced Program Feature Implementation

This document summarizes the implementation of the Advanced Program feature for Field staff in the StaffDeskDSK system.

## Features Implemented

### 1. Staff Type Classification
- Added a new `staffType` field to the User data model with values "Office" or "Field"
- Updated user registration to capture staff type during signup
- Modified admin user management to include staff type selection

### 2. Role-Based Navigation
- Field staff now see an "Advanced Program" menu item in their dashboard
- Appropriate approvers (Division CC, Divisional Head, HOD, Admin) see an "Approve Programs" menu item

### 3. Advanced Program Submission
- Field staff can submit monthly program plans
- Each day of the month can have a program name and place
- Entries can be saved as drafts or submitted for approval
- Past dates cannot be modified
- Approved entries are locked from editing
- **Enhanced**: Users can select any month to view, edit, or submit programs
- **Enhanced**: Users can view previous months' records

### 4. Approval Workflow
- Division CC, Divisional Head, HOD, and Admin roles can approve/reject program entries
- Submitted entries appear in the approval dashboard
- Approvers can review and either approve or reject entries
- **Enhanced**: Approvers can select any month to view and approve submissions

### 5. Download Functionality
- Field staff can download their program entries as CSV
- Approvers can potentially download reports (future enhancement)

### 6. Database Structure
- Created a new collection `advancedPrograms` to store program entries
- Each entry contains:
  - userId, userName, division
  - date, programName, place
  - status (draft, submitted, approved, rejected)
  - createdAt, updatedAt timestamps

### 7. Performance Optimizations
- Optimized Firestore queries to avoid composite index requirements
- Added loading states for better user experience
- Implemented client-side filtering for date ranges
- Added proper error handling for database operations

## Files Modified/Added

1. `src/lib/data.ts` - Added StaffType and AdvancedProgramEntry types
2. `src/app/(auth)/signup/page.tsx` - Added staff type selection during registration
3. `src/components/admin/create-user-form.tsx` - Added staff type field to user creation
4. `src/components/admin/user-list.tsx` - Added staff type field to user editing
5. `src/components/app-shell.tsx` - Updated navigation based on staff type and role
6. `src/app/advanced-program/page.tsx` - Created Advanced Program submission page
7. `src/app/advanced-program-approval/page.tsx` - Created approval page for managers

## Usage Instructions

### For Field Staff:
1. Navigate to "Advanced Program" in the sidebar
2. Select the desired month using the dropdown or navigation buttons
3. Fill in program details for each day of the month
4. Save as draft to preserve work or submit for approval
5. Download entries as CSV if needed
6. View previous months' records for reference

### For Approvers:
1. Navigate to "Approve Programs" in the sidebar
2. Select the desired month to review submissions
3. Review submitted entries
4. Either approve or reject each entry
5. Approved entries are locked from further editing

## Database Indexes Required

To ensure optimal performance, the following Firestore indexes should be created:

1. **Collection**: advancedPrograms
   - **Field**: userId (Ascending)
   - **Field**: date (Ascending)

2. **Collection**: advancedPrograms
   - **Field**: division (Ascending)
   - **Field**: date (Ascending)

These indexes can be created automatically by Firebase when you first run the queries, or manually through the Firebase Console.

## Future Enhancements

1. Add comments/reasons for rejections
2. Implement notification system for approval status changes
3. Add reporting and analytics for program submissions
4. Enable bulk approval/rejection
5. Add search and filtering capabilities in approval dashboard
6. Add the ability to add notes or comments to entries
7. Implement a calendar view for better visualization