// Static content shown in the FAQ / Help / Privacy Policy / Terms modal
// surfaced from the Login and Signup screens. Kept as plain data so the
// modal component itself stays purely presentational.

export const FAQ_ITEMS = [
  {
    q: 'What is AeroGround Ops?',
    a: "AeroGround Ops is a ground-operations management system for airports — it coordinates flights, gates, staff, baggage, maintenance, equipment, fueling, catering and more from a single dashboard, backed by an AI module for predictions and a digital-twin what-if simulator.",
  },
  {
    q: 'Who can create an account?',
    a: 'Accounts are intended for airport ground-operations staff, supervisors and administrators. New sign-ups start with the default access assigned by your organization; an administrator can adjust your role afterward.',
  },
  {
    q: 'I forgot my password. What do I do?',
    a: 'Use the "Forgot password" flow on the login screen if available, or contact your system administrator to reset your credentials — accounts are not self-service for password resets by design, to keep operational access tightly controlled.',
  },
  {
    q: 'Why do I need to accept the Terms & Privacy Policy to sign up?',
    a: "Because the platform stores operational and account data (including audit logs of who did what and when), we ask every new user to confirm they've read and agree to how that data is handled before an account is created.",
  },
  {
    q: 'Is my login secure?',
    a: 'Yes. Authentication uses JWTs issued as httpOnly cookies (never exposed to frontend JavaScript) with CSRF protection, and login attempts are rate-limited to guard against brute-force attempts.',
  },
  {
    q: 'Who do I contact for support?',
    a: 'See the Help tab in this window for support contact details, or reach out to your organization\'s system administrator.',
  },
]

export const HELP_SECTIONS = [
  {
    title: 'Getting started',
    body: 'Create an account from the Sign Up page, then log in with your username and password. Once signed in you\'ll land on the Dashboard, which summarizes flights, gates, staffing and alerts for the day.',
  },
  {
    title: 'Navigating the app',
    body: 'Use the sidebar to move between modules — Flights, Gates, Baggage, Maintenance, Staff, Reports, the AI chatbot, and more. Each module supports search, filtering, and role-based actions.',
  },
  {
    title: 'Account & access issues',
    body: 'If a page or action looks unavailable, it may be restricted to your role. Contact an administrator if you believe you should have access.',
  },
  {
    title: 'Reporting a problem',
    body: "Found a bug or something that doesn't look right? Note the page, what you were doing, and any error message shown, then report it to your system administrator or the project maintainers.",
  },
  {
    title: 'Contact',
    body: 'For further assistance, reach out to your organization\'s AeroGround Ops administrator.',
  },
]

export const PRIVACY_POLICY_SECTIONS = [
  {
    title: '1. Information we collect',
    body: 'When you create an account we collect your username, email address, and optional phone number. As you use the platform, we record the operational data you create or update (e.g. flight, gate, baggage, and maintenance records) along with an audit trail of who performed each action and when.',
  },
  {
    title: '2. How we use your information',
    body: 'Account information is used to authenticate you and enforce role-based access control. Operational data and audit logs are used to run the platform\'s core features — dashboards, reports, notifications, and the AI/ML predictions — and to maintain accountability for actions taken in the system.',
  },
  {
    title: '3. Data storage & security',
    body: 'Passwords are stored hashed, never in plain text. Session authentication uses httpOnly cookies with CSRF protection so tokens are not exposed to page scripts. Data is stored in a PostgreSQL database on our hosting provider\'s infrastructure.',
  },
  {
    title: '4. Data sharing',
    body: 'We do not sell your data. Information is only shared with third-party services where necessary for the platform to function (for example, optional AI chatbot providers or weather data providers used by the predictive models), and only to the extent needed for that feature.',
  },
  {
    title: '5. Your rights',
    body: 'You may request access to, correction of, or deletion of your account data by contacting your system administrator, subject to any operational record-keeping requirements (e.g. audit logs required for accountability).',
  },
  {
    title: '6. Changes to this policy',
    body: 'This policy may be updated as the platform evolves. Continued use of the platform after changes constitutes acceptance of the updated policy.',
  },
]

export const TERMS_SECTIONS = [
  {
    title: '1. Acceptance of terms',
    body: 'By creating an account or logging in, you agree to use AeroGround Ops in accordance with these Terms & Conditions and your organization\'s policies.',
  },
  {
    title: '2. Acceptable use',
    body: 'You agree to use the platform only for legitimate ground-operations purposes, to keep your login credentials confidential, and not to attempt to bypass access controls, rate limits, or role-based permissions.',
  },
  {
    title: '3. Accuracy of data',
    body: 'Operational data you enter (flight status, gate assignments, maintenance logs, etc.) should be accurate to the best of your knowledge, since other users and automated systems (AI predictions, reports) rely on it.',
  },
  {
    title: '4. Accountability',
    body: 'Every create/update/delete action is written to an audit log. You are responsible for actions performed under your account.',
  },
  {
    title: '5. Availability',
    body: 'The platform is provided on an "as-is" basis. While we aim for high availability, scheduled maintenance or unforeseen issues may cause temporary downtime.',
  },
  {
    title: '6. Termination',
    body: "Access may be suspended or revoked by an administrator if these terms are violated or if an account is no longer needed for operational purposes.",
  },
  {
    title: '7. Changes to these terms',
    body: 'These terms may be updated from time to time. Continued use of the platform after changes constitutes acceptance of the updated terms.',
  },
]
