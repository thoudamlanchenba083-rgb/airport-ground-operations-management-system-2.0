# Airport Ground Operations Management System — ER Diagram

```mermaid
erDiagram
  User { int id PK; string username; string email; string role; string phone }
  Airline { int id PK; string name; string code }
  Aircraft { int id PK; string registration_number; string aircraft_type; int capacity }
  Flight { int id PK; string flight_number; int airline_id FK; int aircraft_id FK; string origin; string destination; datetime departure_time; datetime arrival_time; string status; datetime created_at; datetime updated_at }
  Gate { int id PK; string gate_number; string terminal; bool is_available }
  GateAssignment { int id PK; int flight_id FK; int gate_id FK; datetime assigned_at }
  Baggage { int id PK; string baggage_tag; string passenger_name; decimal weight; int flight_id FK }
  BaggageTracking { int id PK; int baggage_id FK; string status; string location; int updated_by_id FK; datetime updated_at; text notes }
  MaintenanceRequest { int id PK; int aircraft_id FK; text issue_description; string priority; string status; int reported_by_id FK; int assigned_to_id FK; datetime created_at; datetime updated_at }
  MaintenanceLog { int id PK; int request_id FK; text action_taken; int performed_by_id FK; datetime completed_at }
  Staff { int id PK; int user_id FK; string name; string employee_id; string staff_type; string phone; string email; bool is_active }
  Shift { int id PK; string shift_name; time start_time; time end_time }
  Schedule { int id PK; int staff_id FK; int shift_id FK; date date }
  Notification { int id PK; int user_id FK; string type; text message; bool is_read; datetime created_at }
  Report { int id PK; string title; string report_type; int generated_by_id FK; text content; datetime created_at }
  AuditLog { int id PK; int user_id FK; string action; string model_name; int object_id; text description; datetime timestamp; string ip_address }

  ULD { int id PK; string uld_code; string uld_type; decimal weight_kg; decimal max_weight_kg }
  CargoManifest { int id PK; int flight_id FK; decimal total_weight_kg; bool is_finalized }
  CargoItem { int id PK; int manifest_id FK; int uld_id FK; decimal weight_kg; bool is_dangerous_goods; string dangerous_goods_class }

  CateringCompany { int id PK; string name; string contact_phone; string contact_email }
  CateringOrder { int id PK; int flight_id FK; int company_id FK; int meal_count; string status; datetime loaded_at }

  Incident { int id PK; int flight_id FK; string incident_type; string severity; string status; text description; int reported_by_id FK; text corrective_action; datetime resolved_at }
  IncidentUpdate { int id PK; int incident_id FK; int updated_by_id FK; text note; datetime created_at }

  RampInspection { int id PK; int flight_id FK; bool cone_placement_ok; bool safety_zone_clear; bool fod_check_clear; string status; int inspected_by_id FK; datetime inspected_at }
  PushbackOperation { int id PK; int flight_id FK; string status; int requested_by_id FK; int approved_by_id FK; datetime requested_at; datetime approved_at; datetime started_at; datetime completed_at }

  BoardingSession { int id PK; int flight_id FK; string status; int passenger_count; int passengers_boarded; datetime boarding_started_at; datetime final_call_at; datetime boarding_completed_at }
  BoardingGroup { int id PK; int session_id FK; string group_label; int group_order; bool called }

  FuelCompany { int id PK; string name; string contact_phone; string contact_email }
  FuelTruck { int id PK; string truck_code; int company_id FK; decimal capacity_liters; string status }
  FuelOperation { int id PK; int flight_id FK; int fuel_truck_id FK; decimal quantity_liters; time fuel_start_time; time fuel_end_time }

  CleaningTask { int id PK; int flight_id FK; bool interior_cleaned; bool exterior_wash; bool waste_removed; string status; datetime started_at; datetime completed_at }
  WaterLavatoryService { int id PK; int flight_id FK; bool potable_water_refilled; bool lavatory_serviced; bool waste_disposed; string status; datetime started_at; datetime completed_at }

  TurnaroundTask { int id PK; int flight_id FK; string task_type; string status; int assigned_equipment_id FK; datetime actual_start_time; datetime actual_end_time; int completed_by_id FK }

  Department { int id PK; string name; text description }
  Designation { int id PK; string name; int department_id FK }
  HRProfile { int id PK; int staff_id FK; int department_id FK; int designation_id FK; date date_of_joining; string aadhar_number; string pan_number }
  LeaveType { int id PK; string name; int max_days_per_year }
  LeaveRequest { int id PK; int staff_id FK; int leave_type_id FK; date start_date; date end_date; string status; int approved_by_id FK; datetime approval_date }
  Attendance { int id PK; int staff_id FK; date date; string status; time check_in_time; time check_out_time }
  Payroll { int id PK; int staff_id FK; date month; decimal base_salary; string status; datetime payment_date }

  ApprovalRequest { int id PK; string request_type; string status; text request_description; int flight_id FK; int requested_by_id FK; datetime due_date; string priority }
  ApprovalStep { int id PK; int approval_request_id FK; int approver_id FK; int step_order; string status; datetime approved_at }

  Airline ||--o{ Flight : operates
  Aircraft ||--o{ Flight : assigned-to
  Flight ||--o{ GateAssignment : has
  Gate ||--o{ GateAssignment : used-in
  Flight ||--o{ Baggage : carries
  Baggage ||--o{ BaggageTracking : tracked-by
  User ||--o{ BaggageTracking : updated-by
  Aircraft ||--o{ MaintenanceRequest : reported-for
  User ||--o{ MaintenanceRequest : reported-by
  User ||--o{ MaintenanceRequest : assigned-to
  MaintenanceRequest ||--o{ MaintenanceLog : logged-in
  User ||--o{ MaintenanceLog : performed-by
  User ||--o| Staff : linked-to
  Staff ||--o{ Schedule : scheduled-in
  Shift ||--o{ Schedule : defines
  User ||--o{ Notification : receives
  User ||--o{ Report : generates
  User ||--o{ AuditLog : recorded-in

  Flight ||--o{ CargoManifest : has
  CargoManifest ||--o{ CargoItem : contains
  ULD ||--o{ CargoItem : packed-in

  Flight ||--o{ CateringOrder : has
  CateringCompany ||--o{ CateringOrder : supplies

  Flight ||--o{ Incident : involves
  User ||--o{ Incident : reported-by
  Incident ||--o{ IncidentUpdate : updated-by
  User ||--o{ IncidentUpdate : written-by

  Flight ||--o{ RampInspection : has
  User ||--o{ RampInspection : inspected-by
  Flight ||--o{ PushbackOperation : has
  User ||--o{ PushbackOperation : requested-by
  User ||--o{ PushbackOperation : approved-by

  Flight ||--o{ BoardingSession : has
  BoardingSession ||--o{ BoardingGroup : contains

  FuelCompany ||--o{ FuelTruck : owns
  Flight ||--o{ FuelOperation : has
  FuelTruck ||--o{ FuelOperation : used-in

  Flight ||--o{ CleaningTask : has
  Flight ||--o{ WaterLavatoryService : has

  Flight ||--o{ TurnaroundTask : has

  Department ||--o{ Designation : contains
  Staff ||--o| HRProfile : has
  Department ||--o{ HRProfile : assigned-to
  Designation ||--o{ HRProfile : assigned-to
  Staff ||--o{ LeaveRequest : requests
  LeaveType ||--o{ LeaveRequest : categorizes
  Staff ||--o{ LeaveRequest : approves
  Staff ||--o{ Attendance : logs
  Staff ||--o{ Payroll : paid-via

  Flight ||--o{ ApprovalRequest : concerns
  User ||--o{ ApprovalRequest : requested-by
  ApprovalRequest ||--o{ ApprovalStep : has
  User ||--o{ ApprovalStep : approved-by
```
