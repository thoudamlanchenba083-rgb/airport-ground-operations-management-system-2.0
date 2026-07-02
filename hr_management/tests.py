from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from datetime import date, timedelta
from staff.models import Staff
from .models import (
    Department, Designation, HRProfile, LeaveType,
    LeaveRequest, Attendance, Payroll
)

User = get_user_model()


class HRManagementBaseTest(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.admin = User.objects.create_superuser(
            username='admin', password='admin123', email='admin@test.com'
        )
        self.hr_user = User.objects.create_user(
            username='hruser', password='hr123', role='HR'
        )
        self.viewer_user = User.objects.create_user(
            username='vieweruser', password='view123', role='VIEWER'
        )

        self.staff = Staff.objects.create(
            name='John Doe', employee_id='EMP001',
            staff_type='GROUND', phone='1234567890', email='john@test.com'
        )
        self.staff.user = self.viewer_user
        self.staff.save()

        self.hr_staff = Staff.objects.create(
            name='HR Person', employee_id='EMP002',
            staff_type='SUPERVISOR', phone='1112223333', email='hrperson@test.com'
        )
        self.hr_staff.user = self.hr_user
        self.hr_staff.save()

        self.department = Department.objects.create(
            name='Operations', description='Ground Ops'
        )
        self.designation = Designation.objects.create(
            name='Ground Handler', department=self.department,
            description='Handles ground ops'
        )
        self.leave_type = LeaveType.objects.create(
            name='sick', max_days_per_year=10, description='Sick leave'
        )

    def get_token(self, username, password):
        response = self.client.post(
            '/api/token/', {'username': username, 'password': password}
        )
        return response.data['access']

    def authenticate(self, username, password):
        token = self.get_token(username, password)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


class DepartmentAPITest(HRManagementBaseTest):
    def test_admin_can_create_department(self):
        self.authenticate('admin', 'admin123')
        response = self.client.post('/api/hr/departments/', {
            'name': 'Security', 'description': 'Security dept'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_can_list_departments(self):
        self.authenticate('admin', 'admin123')
        response = self.client.get('/api/hr/departments/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_unauthenticated_cannot_access_departments(self):
        response = self.client.get('/api/hr/departments/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_duplicate_department_name_rejected(self):
        self.authenticate('admin', 'admin123')
        response = self.client.post('/api/hr/departments/', {
            'name': 'Operations', 'description': 'Duplicate'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class DesignationAPITest(HRManagementBaseTest):
    def test_admin_can_create_designation(self):
        self.authenticate('admin', 'admin123')
        response = self.client.post('/api/hr/designations/', {
            'name': 'Security Officer', 'department': self.department.id,
            'description': 'Handles security'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_filter_designations_by_department(self):
        self.authenticate('admin', 'admin123')
        response = self.client.get(
            f'/api/hr/designations/?department={self.department.id}'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)

class HRProfileAPITest(HRManagementBaseTest):
    def test_admin_can_create_hr_profile(self):
        self.authenticate('admin', 'admin123')
        response = self.client.post('/api/hr/hr-profiles/', {
            'staff': self.staff.id,
            'department': self.department.id,
            'designation': self.designation.id,
            'date_of_joining': '2024-01-15',
            'date_of_birth': '1995-05-20',
            'aadhar_number': '123456789012',
            'pan_number': 'ABCDE1234F',
            'emergency_contact_name': 'Jane Doe',
            'emergency_contact_phone': '9998887777',
            'emergency_contact_relation': 'Spouse',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_duplicate_aadhar_rejected(self):
        self.authenticate('admin', 'admin123')
        HRProfile.objects.create(
            staff=self.staff, department=self.department,
            designation=self.designation,
            date_of_joining=date(2024, 1, 15), date_of_birth=date(1995, 5, 20),
            aadhar_number='123456789012', pan_number='ABCDE1234F',
            emergency_contact_name='Jane Doe',
            emergency_contact_phone='9998887777',
            emergency_contact_relation='Spouse',
        )
        response = self.client.post('/api/hr/hr-profiles/', {
            'staff': self.hr_staff.id,
            'department': self.department.id,
            'designation': self.designation.id,
            'date_of_joining': '2024-02-01',
            'date_of_birth': '1990-01-01',
            'aadhar_number': '123456789012',
            'pan_number': 'ZZZZZ9999Z',
            'emergency_contact_name': 'Someone',
            'emergency_contact_phone': '9999999999',
            'emergency_contact_relation': 'Friend',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unauthenticated_cannot_access_hr_profiles(self):
        response = self.client.get('/api/hr/hr-profiles/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class LeaveTypeAPITest(HRManagementBaseTest):
    def test_can_list_leave_types(self):
        self.authenticate('admin', 'admin123')
        response = self.client.get('/api/hr/leave-types/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_leave_type_is_read_only(self):
        self.authenticate('admin', 'admin123')
        response = self.client.post('/api/hr/leave-types/', {
            'name': 'casual', 'max_days_per_year': 5
        })
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
class LeaveRequestAPITest(HRManagementBaseTest):
    def test_staff_can_create_leave_request(self):
        self.authenticate('vieweruser', 'view123')
        response = self.client.post('/api/hr/leave-requests/', {
            'staff': self.staff.id,
            'leave_type': self.leave_type.id,
            'start_date': str(date.today()),
            'end_date': str(date.today() + timedelta(days=2)),
            'reason': 'Not feeling well',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_staff_only_sees_own_leave_requests(self):
        LeaveRequest.objects.create(
            staff=self.staff, leave_type=self.leave_type,
            start_date=date.today(), end_date=date.today() + timedelta(days=1),
            reason='Personal',
        )
        LeaveRequest.objects.create(
            staff=self.hr_staff, leave_type=self.leave_type,
            start_date=date.today(), end_date=date.today() + timedelta(days=1),
            reason='Personal',
        )
        self.authenticate('vieweruser', 'view123')
        response = self.client.get('/api/hr/leave-requests/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)

    def test_hr_can_approve_leave_request(self):
        leave = LeaveRequest.objects.create(
            staff=self.staff, leave_type=self.leave_type,
            start_date=date.today(), end_date=date.today() + timedelta(days=1),
            reason='Personal',
        )
        self.authenticate('hruser', 'hr123')
        response = self.client.post(f'/api/hr/leave-requests/{leave.id}/approve/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        leave.refresh_from_db()
        self.assertEqual(leave.status, 'approved')

    def test_hr_can_reject_leave_request(self):
        leave = LeaveRequest.objects.create(
            staff=self.staff, leave_type=self.leave_type,
            start_date=date.today(), end_date=date.today() + timedelta(days=1),
            reason='Personal',
        )
        self.authenticate('hruser', 'hr123')
        response = self.client.post(
            f'/api/hr/leave-requests/{leave.id}/reject/',
            {'reason': 'Insufficient balance'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        leave.refresh_from_db()
        self.assertEqual(leave.status, 'rejected')

    def test_cannot_approve_already_approved_leave(self):
        leave = LeaveRequest.objects.create(
            staff=self.staff, leave_type=self.leave_type,
            start_date=date.today(), end_date=date.today() + timedelta(days=1),
            reason='Personal', status='approved',
        )
        self.authenticate('hruser', 'hr123')
        response = self.client.post(f'/api/hr/leave-requests/{leave.id}/approve/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
class AttendanceAPITest(HRManagementBaseTest):
    def test_check_in_creates_attendance(self):
        self.authenticate('vieweruser', 'view123')
        response = self.client.post('/api/hr/attendance/check_in/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(
            Attendance.objects.filter(staff=self.staff, date=date.today()).exists()
        )

    def test_check_out_without_checkin_returns_404(self):
        self.authenticate('vieweruser', 'view123')
        response = self.client.post('/api/hr/attendance/check_out/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_check_out_after_checkin(self):
        self.authenticate('vieweruser', 'view123')
        self.client.post('/api/hr/attendance/check_in/')
        response = self.client.post('/api/hr/attendance/check_out/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_hr_sees_all_attendance_staff_sees_only_own(self):
        Attendance.objects.create(staff=self.staff, date=date.today(), status='present')
        Attendance.objects.create(staff=self.hr_staff, date=date.today(), status='present')

        self.authenticate('hruser', 'hr123')
        response = self.client.get('/api/hr/attendance/')
        self.assertEqual(response.data['count'], 2)

        self.authenticate('vieweruser', 'view123')
        response = self.client.get('/api/hr/attendance/')
        self.assertEqual(response.data['count'], 1)


class PayrollAPITest(HRManagementBaseTest):
    def test_generate_payroll_requires_month(self):
        self.authenticate('admin', 'admin123')
        response = self.client.post('/api/hr/payroll/generate_payroll/', {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_generate_payroll_invalid_date_format(self):
        self.authenticate('admin', 'admin123')
        response = self.client.post('/api/hr/payroll/generate_payroll/', {
            'month': 'not-a-date'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_generate_payroll_creates_records_for_all_staff(self):
        self.authenticate('admin', 'admin123')
        response = self.client.post('/api/hr/payroll/generate_payroll/', {
            'month': '2026-07-01'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(Payroll.objects.filter(month='2026-07-01').exists())

    def test_hr_sees_all_payroll_staff_sees_only_own(self):
        Payroll.objects.create(staff=self.staff, month=date(2026, 6, 1), base_salary=30000)
        Payroll.objects.create(staff=self.hr_staff, month=date(2026, 6, 1), base_salary=40000)

        self.authenticate('hruser', 'hr123')
        response = self.client.get('/api/hr/payroll/')
        self.assertEqual(response.data['count'], 2)

        self.authenticate('vieweruser', 'view123')
        response = self.client.get('/api/hr/payroll/')
        self.assertEqual(response.data['count'], 1)
