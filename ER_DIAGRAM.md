# Airport Ground Operations Management System — ER Diagram

\\mermaid
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
\