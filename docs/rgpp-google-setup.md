# RGPP Google Setup

## 1. Create the spreadsheet
Create a new Google Sheet named `RGPP Sign Ups`.

Create a tab named `Submissions` with these columns:

- `Submitted At`
- `Submission ID`
- `First Name`
- `Last Name`
- `Email`
- `Phone`
- `Address`
- `City`
- `Province / State`
- `Country`
- `Postal Code`
- `Reservation Count`
- `Reservations JSON`
- `Status`

Create a second tab named `Expanded Reservations` with these columns:

- `Submission ID`
- `Submitted At`
- `Guest Name`
- `Email`
- `Phone`
- `Site`
- `From Date`
- `To Date`

If you already created the `Submissions` tab before this update, insert the
new `Province / State` and `Country` columns before `Postal Code`.

Recommended formatting:

- Freeze the header row on both tabs.
- Turn on filters.
- Add alternating row colors.
- Format `Submitted At` as date/time.
- In `Submissions`, use a dropdown in `Status` with:
  - `New`
  - `In Review`
  - `Approved`
  - `Declined`
  - `Contacted`

## 2. Create the Apps Script
In the Google Sheet, open `Extensions` -> `Apps Script`.

Replace the default script contents with the code in:

- [docs/rgpp-google-apps-script.js](/Users/nzant/Projects/bradsdadsland/docs/rgpp-google-apps-script.js)

Then update these constants:

- `SPREADSHEET_ID`
- `SPREADSHEET_URL`

## 3. Deploy the web app
In Apps Script:

1. Click `Deploy`
2. Click `New deployment`
3. Choose `Web app`
4. Execute as: `Me`
5. Who has access: `Anyone`
6. Deploy

Copy the web app URL.

## 4. Wire the frontend
Create a local `.env` file from [.env.example](/Users/nzant/Projects/bradsdadsland/.env.example) and set:

```bash
VITE_RGPP_INTAKE_ENDPOINT="YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL"
```

Restart the dev server after changing env vars.

## 5. Test the flow
Submit a test sign-up and confirm:

- a row appears in `Submissions`
- rows appear in `Expanded Reservations`
- `contact@bradsdadsland.com` receives the internal notification
- the internal email includes the direct Google Sheet link
- the guest email receives the branded confirmation
- the site shows the thank-you state
