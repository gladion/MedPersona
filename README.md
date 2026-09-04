# MedSim — Doctor Review System

MedSim is a local-first Node.js web application for reviewing virtual-patient sessions from the Technion medical-education research dataset.

## What is included

- Doctor login and administrator login.
- Fixed default password: `1234` (stored server-side as a salted password hash).
- Administrator username: `admin`.
- Doctor management: add, enable, disable and update doctor accounts.
- Patient cases grouped by `case_uuid`.
- Session list for every case.
- Full student ↔ virtual-patient transcript.
- Student identity is anonymized in the application. Student email addresses are discarded during CSV import and are never exposed in the UI or research export.
- Per-doctor review isolation: a doctor can only read and edit their own questionnaire responses.
- Continuous auto-save while reviewing.
- Status indicators: green ✓ Completed, yellow ✓ In review, black ✓ Not reviewed.
- Questionnaire 1: Virtual Patient, 7 items, 1–5 scale + open-ended question.
- Questionnaire 2: Student performance, 5 categories, 1–10 scale.
- Questionnaire 3: AI Feedback, 6 items, 1–5 scale; unlocked after Questionnaires 1 and 2 are complete.
- Administrator statistics and anonymized research export.
- Administrator CSV upload: no manual file editing is required.
- Local JSON persistence, with a storage layer that can later be replaced by persistent Firebase/Firestore/Storage infrastructure.

## Run locally — no manual file edits

Requirements: Node.js 20+.

```bash
npm install
npm start
```

Then open:

`http://localhost:3000`

Default administrator login:

- Username: `admin`
- Password: `1234`

The project already contains an anonymized, email-free normalized copy of the supplied research session data so it can be run immediately. The original CSV is **not** packaged into the project because it contains student email addresses.

## Importing the research CSV

Log in as `admin` → **Administration** → **Import research CSV**.

The importer accepts the structure used by the supplied `historyMedPersona2.csv`, including:

- `id`
- `user_id`
- `messages`
- `diagnosis`
- `timestamp`
- `title`
- `review`
- `score`
- `chat_duration`
- `tests_asked`
- `requested_tests`
- `hints_used`
- `case_uuid`
- `email`

The `email` field is intentionally discarded. It is never returned by the API.

## Data files

The application uses JSON files under `data/`:

- `users.json` — admin and doctor accounts.
- `imported-sessions.json` — normalized session data with email/user identity fields removed.
- `cases.json` — case index.
- `reviews.json` — doctor-specific questionnaire responses.
- `session-status.json` — doctor-specific review status.

The research data and user/review files are ignored by Git by default. This prevents accidental publication of research data and doctor responses.

## GitHub

Create a private repository for research use, then:

```bash
git init
git add .
git commit -m "Initial MedSim doctor review system"
git branch -M main
git remote add origin <YOUR-GITHUB-REPOSITORY>
git push -u origin main
```

Do not remove the `.gitignore` rules for research data.

## Firebase deployment

The frontend is static and the backend is a conventional Node/Express server. Local JSON files are appropriate for local development and a controlled server, but a Firebase serverless runtime should **not** be treated as a durable local-file datastore. For production Firebase, replace the file storage adapter with Firestore and/or Cloud Storage, while keeping the same API and frontend workflow.

A practical production architecture is:

`Firebase Hosting → authenticated API service → Firestore/Cloud Storage`

The current project deliberately keeps this storage boundary simple so the research UI can be tested locally first without requiring Firebase configuration.

## Security note

The fixed `1234` password was implemented because it is a project requirement. It is suitable only for a controlled prototype/research environment. Before exposing the application to the public internet, use unique credentials, proper authentication, HTTPS, access controls, audit logging and a persistent protected datastore.

## Educational disclaimer

These sessions are simulations and do not constitute clinical records or medical advice.
