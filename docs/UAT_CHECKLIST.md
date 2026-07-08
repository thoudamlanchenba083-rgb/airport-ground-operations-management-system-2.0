# User Acceptance Testing (UAT) Checklist

**Purpose:** Verify the system behaves correctly from the perspective of
each real user role, covering the main day-to-day workflows an airport
ground-ops team would actually perform — as distinct from automated unit/
integration/security/performance tests, which verify code correctness
rather than real-world usability.

**How to use this document:** Each row is a manual test case. Tester walks
through the "Steps" column against a running instance of the app, confirms
the "Expected Result", and marks Pass/Fail with the date and tester's name.

**Roles referenced:** Admin, Operations Manager, Gate Manager, HR, Ground
Staff, Viewer (read-only).

---

## 1. Authentication & Accounts

| # | Scenario | Steps | Expected Result | Pass/Fail | Tester | Date |
|---|---|---|---|---|---|---|
| 1.1 | New user registration | Go to Sign Up, fill in username/email/password (matching, 8+ chars), submit | Account created, redirected to Login after success message | | | |
| 1.2 | Registration with weak password | Sign Up with a 4-character password | Error shown: "Password must be at least 8 characters." No account created | | | |
| 1.3 | Registration with mismatched passwords | Sign Up with Password ≠ Confirm Password | Error shown: "Passwords do not match." No account created | | | |
| 1.4 | Successful login | Log in with valid credentials | Redirected to Dashboard, username shown in greeting | | | |
| 1.5 | Failed login (wrong password) | Log in with valid username, wrong password | Error shown, stays on Login page | | | |
| 1.6 | Login rate limiting | Attempt login with wrong password 6+ times within a minute | 6th+ attempt blocked (403), regardless of correct/incorrect credentials | | | |
| 1.7 | Logout | Click logout from any authenticated page | Session cleared, redirected to Login, protected pages no longer accessible | | | |
## 2. Flight Ground-Ops Workflow

| # | Scenario | Steps | Expected Result | Pass/Fail | Tester | Date |
|---|---|---|---|---|---|---|
| 2.1 | Create a flight | As Admin/Ops Manager, create a new flight with airline, aircraft, origin/destination, times | Flight appears in Flights list with status "Scheduled" | | | |
| 2.2 | Advance flight step-by-step | Click "Advance" repeatedly on a flight from Scheduled through Arrived | Status updates one step at a time; cannot skip steps | | | |
| 2.3 | Block skipping a step | Attempt to advance a flight to a non-adjacent step (e.g. via API) | Request rejected with a clear error message | | | |
| 2.4 | Gate conflict blocks assignment | Try to assign a flight to a gate already holding another active flight | Assignment rejected with a clear conflict message | | | |
| 2.5 | Maintenance blocks progress | Attempt to pass "Maintenance Check" on an aircraft with an open maintenance request | Blocked with a message referencing the open request | | | |
| 2.6 | Baggage blocks boarding | Attempt to start "Boarding" while a bag isn't marked Loaded/In Transit | Blocked with a message naming the specific baggage tag | | | |
| 2.7 | Overdue flight flagged | View a flight whose arrival time has passed but hasn't reached "Arrived" | Dashboard/Flights list shows an "Overdue" badge | | | |
| 2.8 | View flight details | Click into a specific flight from the list | Full flight detail view loads correctly | | | |

## 3. Gate Management

| # | Scenario | Steps | Expected Result | Pass/Fail | Tester | Date |
|---|---|---|---|---|---|---|
| 3.1 | Manually assign a gate | Select an available gate, assign to a flight | Gate becomes unavailable, assignment shown | | | |
| 3.2 | Auto-assign a gate | Use "Auto-Assign" for a flight with no gate | System picks a compatible, conflict-free gate automatically | | | |
| 3.3 | Auto-assign with no fit | Auto-assign when no compatible gate is free | Clear error listing why each candidate gate was rejected | | | |
| 3.4 | Release a gate | Remove/delete a gate assignment | Gate becomes available again for new assignments | | | |

## 4. Staff Management

| # | Scenario | Steps | Expected Result | Pass/Fail | Tester | Date |
|---|---|---|---|---|---|---|
| 4.1 | Create staff profile | As HR, add a new staff member with type/contact info | Staff appears in Staff list | | | |
| 4.2 | Manually assign staff to a flight | Assign a specific staff member to a flight | Assignment created, visible on flight and staff records | | | |
| 4.3 | Auto-assign staff | Use auto-assign for a flight, specifying staff type | System picks an available, conflict-free staff member | | | |
| 4.4 | Conflict prevents double-booking | Attempt to assign a staff member already committed to an overlapping flight | Assignment blocked with a scheduling-conflict message | | | |
| 4.5 | Shift scheduling | Create a shift and assign a staff member to a schedule/date | Schedule appears correctly, no duplicate for same staff+date | | | |
## 5. Role-Based Access Control

| # | Scenario | Steps | Expected Result | Pass/Fail | Tester | Date |
|---|---|---|---|---|---|---|
| 5.1 | Viewer role is read-only | Log in as a Viewer-role user, attempt to create/edit/delete any record | All write actions blocked or hidden from UI | | | |
| 5.2 | Ground staff cannot manage HR | Log in as Ground Staff, attempt to access HR management screens | Access denied or screen not shown | | | |
| 5.3 | Non-admin cannot manage airlines/aircraft | Log in as a non-admin role, attempt to create an airline | Request blocked (403) | | | |
| 5.4 | Admin has full access | Log in as Admin, perform a create/update/delete in each module | All actions succeed | | | |
| 5.5 | Unauthenticated access blocked | Log out, attempt to visit a protected page directly by URL | Redirected to Login | | | |

## 6. Dashboard & Reporting

| # | Scenario | Steps | Expected Result | Pass/Fail | Tester | Date |
|---|---|---|---|---|---|---|
| 6.1 | Dashboard loads live KPIs | Open Dashboard | Flight counts, delay/weather/maintenance panels populate correctly | | | |
| 6.2 | Dashboard handles no data gracefully | View Dashboard on a fresh/empty database | Empty states shown (e.g. "No flights available"), no crashes | | | |
| 6.3 | AI Insights refresh | Click "Refresh AI Insights" | Panels update, timestamp updates, no errors | | | |
| 6.4 | Generate a report | Navigate to Reports, generate an operational report | Report generated/exportable correctly | | | |
| 6.5 | Notifications appear | Trigger a notification-worthy event (e.g. flight status change) | Notification appears in Notifications list for relevant user(s) | | | |
| 6.6 | Search & filter | Use search/filter/sort on Flights, Gates, or Staff list | Results filter/sort correctly and match expectations | | | |

## 7. Cross-Cutting Checks

| # | Scenario | Steps | Expected Result | Pass/Fail | Tester | Date |
|---|---|---|---|---'|---|---|
| 7.1 | Mobile responsiveness | Open the app on a narrow viewport / mobile device | Layout adapts correctly, no horizontal scroll/broken UI | | | |
| 7.2 | Audit log records actions | Perform a create/update/delete as any role, check audit log (admin view) | Action recorded with correct user, action type, and timestamp | | | |
| 7.3 | Error messages are user-friendly | Trigger a validation error anywhere in the app | Message is clear and actionable, not a raw stack trace | | | |

---

## Sign-Off

| Role | Name | Date | Signature/Approval |
|---|---|---|---|
| Product Owner / Instructor | | | |
| Lead Tester | | | |
| Development Team Representative | | | |

**Overall UAT Result:** ☐ Approved for release ☐ Approved with minor issues ☐ Not approved (see notes below)

**Notes / Issues Found:**
_(List any failed scenarios above, their severity, and whether they block release.)_