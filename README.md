# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.
Step 1: Scaffold the App Structure
Create a fully functional web app called StaffDeskDSK for internal staff management. It should support multiple user roles and include modules for Personal Biodata, Leave Management, Document Management, and Account Settings. Use Firebase for authentication and Firestore for data storage. Scaffold the folder structure with components, pages, services, and Firebase config.

👥 Step 2: Define User Roles and Access

> Implement role-based access for the following user types:
> 1. Admin  
> 2. Staff  
> 3. Division CC  
> 4. Divisional Head  
> 5. HOD  
> Each role should have access only to the features assigned to them. Use Firebase Authentication and Firestore to manage roles and permissions.


🧾 Step 3: Build Staff Profile Form

> Create a Staff Profile Form with the following fields:
> - Name  
> - NIC  
> - Designation  with Grade
> - Division
> - Date of Birth  
> - Mobile Number  
> - Appointment Date  
> - Email  
> - Basic Salary  
> - Salary Code
> - Working History (add entries one by one with name and place)  
> - Profile Image Upload (with "Borrow Image" feature)  
> Also include an Inventory Checklist:
> - PC/Laptop  
> - LGN Account  
> - Printer (with name)  
> - Router  
> - UPS  

 🗓️ Step 4: Build Leave Application Form

> Create a Leave Application Form with the following fields:
> - Name  
> - Leave Type  
> - Designation  
> - Number of leave days  
> - Leave start date  
> - Leave resume date  
> - Reason for leave  
> - Acting Officer (select from own division only)  
> - Recommend => dropdown menu within their own Division CC / Division Head  
> - Approve => dropdown menu with Division Head / HOD  
> After submission, the leave should be routed to the selected officers for recommendation and approval. Officers should see pending requests in their dashboard.

📦 Step 5: Build Apply Leave Modal Form

> Create a modal form for applying leave with the same fields as the Leave Application Form. After submission, forward the leave to the selected Recommend and Approve officers. The submitted leave should be visible to those officers in their accounts with status updates.

🔐 Step 6: Build Account Settings

> Implement an Account Settings page where users can reset or recover their password using Firebase Authentication.

📊 Step 7: Build Role-Based Dashboards

> Create dashboards for each user type with the following access:

 Staff
- Stats (personal account summary only)
- Personal Details (with update and image upload)
- Leave (apply, view status by date/type)
- Account Settings

 Division CC
- Stats (their Division summary only)
- Personal Details (with update and image upload)
- Leave (apply, view status by date/type)
- Recommend Leave (view and recommend for assigned division only)
- Staff Directory (view/search/print staff details in assigned division)

 Division Head
- Stats (their Division summary only)
- Personal Details (with update and image upload)
- Leave (apply, view status by date/type)
- Approve Leave (approve recommended leaves for assigned division only)

 HOD / Admin
- Stats (entire system)
- Personal Details (with update and image upload)
- Leave (apply, view status by date/type)
- Approve Leave (all divisions)
- Staff Directory (all divisions)
- Admin Panel (create divisions and users)
- Account Settings

📥 Step 8: Leave Download Feature

> Implement a Leave Download feature that allows authorized users to download/print approved leave applications with all relevant details:
> - Applicant information
> - Leave details (type, duration, dates, reason)
> - Acting officer information
> - Recommending officer information with date
> - Approving officer information with date
> - Application status
> Access is role-based:
> - Admin and HOD: Can download leaves from all divisions
> - Divisional Head: Can download leaves from their division only
> - Division CC: Can download leaves from their division only
> - Staff: Can download their own approved leaves

1.Users Type
1.Admin.
2.Staff
3.Division CC
4.Divisional Head
5.HOD [Head of the Department]

2.Staff Profile Form for personal Details
- Name
- NIC
- Designation
- Date of Birth
- Mobile Number
- Appointment Date
- Email
- Working History (add entries one by one with name and place)
- Profile Image Upload (with "Borrow Image" feature)
🖥️ Inventory Checklist
- PC/Laptop
- LGN Account
- Printer (with name)
- Router
- UPS

3. Leave Application Form
- Name
-Leave Type ()
- Designation
- Number of leave days
- Leave start date
- Leave resume date
- Reason for leave
- Acting Officer name selected from own division only
- Recommend => dropdown menu with their Division CC / Division Head
- Approve=> dropdown menu with their Division head / HOD.

Apply Leave Modal Form
⦁Apply Leave Modal Form-  Name, - Designation, Number of days leave applied for, Date, Date of commencing leave, Date of resuming duties, Reasons for leave, - Officer Acting and agreement to act
*but after submit all required field and forward to recommend Officer with select option like dropdown menu with their Division CC /Division Head. and also for approve they staff can select option with Division head or HOD.
1.Recommend => dropdown menu with their Division CC / Division Head
2.Approve=> dropdown menu with their Division head / HOD.
after select officer an submit leave. the submitted leave can be viewed by the relevant officers in their accounts to recommend / approve

4.Account Setting
Forgot password or reset

you have to organize the user dashboard role wise , if the user have accessed as

1.Staff
-Stats => The stats must be shown of their account summary only not the entire system
-Personal Biodata => with Update option but still have some issue like if i am trying to upload my profile image , the system select the picture and after its loading not saved
-Leave => Can apply leave. view status of the leaves that have applied earlier by select date wise / categories wise like Casual/medical/vocation
-Account Setting => Can reset their password  like ....


2.Division CC
-Stats => The stats must be shown of their account summary only not the entire system
-Personal Biodata => with Update option but still have some issue like if i am trying to upload my profile image , the system select the picture and after its loading not saved
-Leave => Can apply leave. view status of the leaves that have applied earlier by select date wise / categories wise like Casual/medical/vocation
-Recommend Leave => View for the recommend leaves for the assigned division only, "give recommended / not recommended" after it will have to automatically view in the other approved officers account with the status of leave if they are recommended or not.
-Staff Directory => Can view with all the staff details of the assigned division only. can view their personal information from search option. also can print with filter option any keywords from that list. the personal details must be shown as modal with all the information about that particular staff along with their prefile picture in the left side corner.
-Account Setting => Can reset their password  like ....


2.Division Head
-Stats => The stats must be shown of their account summary only not the entire system
-Personal Biodata => with Update option but still have some issue like if i am trying to upload my profile image , the system select the picture and after its loading not saved
-Leave => Can apply leave. view status of the leaves that have applied earlier by select date wise / categories wise like Casual/medical/vocation
-Recommend Leave => View for the recommend leaves for the assigned division only, "give recommended / not recommended" after it will have to automatically view in the other approved officers account with the status of leave if they are recommended or not.
-Approve Leave => View All the staffs' recommended leaves for the assigned division only, "give Approved / not Approved" after it will have to automatically view with the status of leave if they are Approved or not.
-Staff Directory => Can view with all the staff details of the assigned division only. can view their personal information from search option. also can print with filter option any keywords from that list. the personal details must be shown as modal with all the information about that particular staff along with their prefile picture in the left side corner.
-Account Setting => Can reset their password  like ....

3.HOD/ Admin
-Stats => The stats must be shown of their entire system
-Personal Biodata => with Update option but still have some issue like if i am trying to upload my profile image , the system select the picture and after its loading not saved
-Leave => Can apply leave. view status of the leaves that have applied earlier by select date wise / categories wise like Casual/medical/vocation
-Approve Leave => View All the staffs' recommended leaves for the assigned division only, "give Approved / not Approved" after it will have to automatically view with the status of leave if they are Approved or not.
-Staff Directory => Can view with all of the staff details of the whole divisions in the organization. can view their personal information from search option. also can print with filter option any keywords from that list. the personal details must be shown as modal with all the information about that particular staff along with their prefile picture in the left side corner.
-Admin Panel => Can create Division and Users
=> create user accounts without staff accounts. the staff can login normally with their google account, but authorization officers like HOD, Divisional head, Divisional CC account can create by only admin to give access the related parts/area only .
-Account Setting => Can reset their password  like ....