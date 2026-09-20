# PeopleFlow HRIS

Responsive HRIS starter built with React + Vite + Supabase.

## Included modules

- Dashboard
- Employee master data
- Recruitment / ATS
- Attendance
- Leave & Permission
- Overtime
- Payroll
- Contracts
- Employee Movement
- Performance
- Training & Development
- Offboarding
- Reports & Analytics
- Settings / roles / audit-log foundation

## UI

The interface follows the supplied reference: green top navigation, compact left HR workspace navigation, white cards, dense data tables, badges, KPI cards, and mobile drawer navigation.

## Run locally

```bash
npm install
cp .env.example .env
npm run dev
```

Set these values in `.env`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Then run the SQL in `supabase/schema.sql` in Supabase SQL Editor.

## Deploy to Vercel

Push the project to GitHub, import it into Vercel, then add the same two Vite environment variables in the Vercel project settings.

## Important

This starter intentionally uses Demo mode when Supabase credentials are missing. It does not include a service-role key. Never expose a Supabase service-role key in a browser app.

Before production use, finish:
- Supabase Auth
- role-aware RLS policies
- audit logging triggers
- payroll business rules
- BPJS / tax configuration
- file storage for resumes and employee documents
- approval workflows
- validation and server-side authorization
