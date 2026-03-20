# LMIABridge — Functional Confirmation \& Demo Recording Prompt

## CRITICAL INSTRUCTION FOR ANTIGRAVITY

Do NOT begin recording anything until every functional test in Part 1 passes.
If any test fails, fix it before proceeding.
Only when the final confirmation table shows all PASS results should you begin Part 2.

This is the sequence:

1. Run all functional tests → confirm PASS
2. Fix any failures → re-test until PASS
3. Only then: begin demo recording

\---

# PART 1 — FUNCTIONAL CONFIRMATION

## What a real employer must be able to do

\---

### EMPLOYER ACTION 1 — Land on homepage and understand the product immediately

**Test:**

* Open https://lmiabridge.vercel.app in a fresh browser window
* Do not scroll — look only at what is visible above the fold

**The user must be able to:**

* Read a headline that clearly states what LMIABridge does in one sentence
* See two distinct CTAs: one for employers, one for workers
* See a "Powered by TinyFish" badge visible without scrolling
* Understand without any explanation that this is an immigration compliance tool

**Confirmation check:**

* \[ ] Headline is present and specific (not generic like "Welcome to LMIABridge")
* \[ ] Two CTAs exist and are visually distinct
* \[ ] TinyFish badge is above the fold
* \[ ] A first-time visitor would know what to click within 5 seconds

**Result:** PASS / FAIL

\---

### EMPLOYER ACTION 2 — Complete the onboarding form with real company data

**Test:**
Fill the employer form with Clio's details:

* Company Name: Clio (Themis Solutions Inc.)
* CRA Business Number: 898765432RT0001
* Province: Ontario
* Industry: Legal Technology / SaaS
* Job Title: Software Developer
* NOC Code: 21231
* Offered Annual Wage: 110000
* Number of Employees: 900

**The user must be able to:**

* Enter all fields without the form crashing or resetting
* See a live ESDC wage indicator appear after entering NOC 21231

  * It must show a number close to $52.88/hr or $109,990/yr
  * It must show a green indicator confirming the wage is at or above median
* See a clear error message if they try to submit with a field empty
* See the form accept the CRA Business Number format (9 digits + RT + 4 digits)

**Confirmation check:**

* \[ ] All 8 fields accept input without errors
* \[ ] ESDC wage indicator appears after NOC code is entered (within 5 seconds)
* \[ ] Wage indicator shows a number (not "undefined", "NaN", or "$0")
* \[ ] Wage indicator shows green/compliant state for $110,000 vs ESDC median
* \[ ] Empty form submission shows validation errors, does not proceed
* \[ ] Form state is not lost if the user tabs between fields

**Result:** PASS / FAIL

\---

### EMPLOYER ACTION 3 — Watch TinyFish verify their company on the Canada Business Registry

**Test:**
Click "VERIFY \& CONTINUE" on the completed Clio employer form.

**The user must be able to:**

* See the AgentStatusPanel appear immediately — not a blank screen
* See live status text that references TinyFish and the Canada Business Registry
* See a pulsing animation indicating the agent is working
* Wait for the agent to complete (maximum 60 seconds — if it takes longer, something is wrong)
* See a clear VERIFIED result with a green checkmark
* See the TinyFish Verified badge confirmed

**Confirmation check:**

* \[ ] AgentStatusPanel renders within 1 second of clicking VERIFY
* \[ ] Status text mentions "TinyFish" and "Canada Business Registry"
* \[ ] Animation is visible during the agent run
* \[ ] Agent completes within 60 seconds
* \[ ] Result shows verified: true with company name confirmed
* \[ ] TinyFish runId is present in the response (not null or undefined)
* \[ ] If TinyFish fails: a graceful fallback message appears, NOT a crash or blank screen

**Result:** PASS / FAIL

\---

### EMPLOYER ACTION 4 — Land on the compliance dashboard and navigate all 4 tabs

**Test:**
After verification completes, the employer is redirected to the dashboard.

**The user must be able to:**

* Land on the dashboard automatically — no manual navigation needed
* See their company name and TinyFish Verified badge in the sidebar
* Click each of the 4 tabs and see real content in each one

Tab by tab confirmation:

**Tab 1 — Matched Workers:**

* \[ ] At least 1 worker card is visible (may be from seed data initially)
* \[ ] Each card shows a name, NOC code, match score, and country of origin
* \[ ] Cards are not blank or showing "undefined"

**Tab 2 — LMIA Compliance:**

* \[ ] A calendar or timeline is visible with at least 4 week entries
* \[ ] Job Bank Canada appears as Week 1
* \[ ] LinkedIn Jobs Canada appears as Week 2
* \[ ] Indeed Canada appears as Week 3
* \[ ] Each week shows: platform name, action required, deadline, status
* \[ ] The regulatory note is visible: "LMIA regulations require advertising on at least 3 platforms over 4 weeks"
* \[ ] "Generate Evidence Pack" button is present

**Tab 3 — Transition Plan:**

* \[ ] A generated transition plan document is visible
* \[ ] It contains at least Year 1, Year 2, Year 3 content
* \[ ] It references the company (Clio) and the role (Software Developer)
* \[ ] Text is not lorem ipsum or placeholder

**Tab 4 — Agent Activity:**

* \[ ] At least 1 TinyFish run entry is visible
* \[ ] Each entry shows a runId (not "seed-run-001" from hardcoded data — must be a real TinyFish runId from the verification just completed)
* \[ ] Timestamp is accurate (within the last 5 minutes)
* \[ ] Agent name is readable (e.g., "verify-employer")

**Result:** PASS / FAIL (report per tab)

\---

### EMPLOYER ACTION 5 — Generate an Evidence Pack

**Test:**
In the LMIA Compliance tab, click "Generate Evidence Pack"

**The user must be able to:**

* Click the button and see a loading state (not a frozen screen)
* Receive a generated compliance package within 15 seconds
* See the following sections in the output:

  * Advertising schedule (3 platforms, 4 weeks)
  * Wage justification (comparing offered wage to ESDC median)
  * Transition plan summary
  * GTS eligibility determination
  * List of evidence requirements
  * Warnings and risks if any

**Confirmation check:**

* \[ ] Button click triggers a visible loading state
* \[ ] Response arrives within 15 seconds
* \[ ] advertisingSchedule array contains at least 4 items
* \[ ] wageJustification is a non-empty string
* \[ ] transitionPlan object has year1, year2, year3 fields
* \[ ] gtsEligible is true for NOC 21231
* \[ ] gtsCategory is "B" for NOC 21231
* \[ ] warningsAndRisks is an array (may be empty but must exist)
* \[ ] The data is saved to MongoDB (verify by refreshing the page — data should persist)

**Result:** PASS / FAIL

\---

## What a real worker must be able to do

\---

### WORKER ACTION 1 — Complete Step 1 of the profile form

**Test:**
From the homepage, click "For Workers". Fill Step 1 with Chidera's details:

* Full Name: Chidera Obi
* Email: chidera.obi@email.com
* Target NOC Code: 21231
* Country of Origin: Nigeria
* Target Province: Ontario
* Education Level: Bachelor's Degree
* Language Proficiency (CLB Slider): drag to 11

**The user must be able to:**

* See all 7 fields rendered and interactive
* Use the CLB slider and see the value update live as they drag it
* Search or select NOC 21231 from the NOC code field
* Click Next and proceed to Step 2

**Confirmation check:**

* \[ ] All 7 fields are visible and accepting input
* \[ ] CLB slider moves and shows the number 11 when dragged to maximum
* \[ ] NOC code field accepts "21231" — either free text or searchable dropdown
* \[ ] Clicking Next with all fields filled advances to Step 2
* \[ ] Clicking Next with empty required fields shows validation errors and does NOT advance

**Result:** PASS / FAIL

\---

### WORKER ACTION 2 — Complete Step 2 of the profile form

**Test:**
Fill Step 2 with Chidera's goals:

* Desired Job Title: Software Developer
* Salary Expectation: 105000
* Start Date: \[4 weeks from today]
* "Are you currently in Canada?": Toggle OFF

**The user must be able to:**

* Enter a salary as a number (not a slider that won't go high enough)
* Pick a date in the future using a date picker
* Toggle the "In Canada" switch and see its state change visually
* Click Next to advance to Step 3

**Confirmation check:**

* \[ ] Salary field accepts 105000 without formatting errors
* \[ ] Date picker opens and allows future date selection
* \[ ] Toggle switches between ON and OFF states visually
* \[ ] Clicking Next with all fields filled advances to Step 3
* \[ ] Step 2 data is preserved if user clicks Back to Step 1 and returns

**Result:** PASS / FAIL

\---

### WORKER ACTION 3 — Trigger the TinyFish Job Bank scan and watch it run live

**Test:**
On Step 3, click "SCAN JOB BANK"

**The user must be able to:**

* See the AgentStatusPanel appear immediately
* See live streaming progress messages appear one by one — not all at once
* Read meaningful status messages that describe what the agent is doing
* See the TinyFish branding on the status panel
* Wait for completion without the page freezing or crashing
* NOT see a timeout error within the first 90 seconds

**Confirmation check:**

* \[ ] AgentStatusPanel appears within 1 second of clicking SCAN
* \[ ] At least 3 distinct progress messages stream in sequence
* \[ ] Messages are meaningful (e.g., "Navigating jobbank.gc.ca", "Found X listings", "Running Groq analysis") — not generic ("Loading...", "Please wait")
* \[ ] TinyFish branding is visible on the panel
* \[ ] Agent completes without error within 90 seconds
* \[ ] On completion: a success message appears before redirect
* \[ ] If TinyFish fails: error message is shown, NOT a blank screen or crash
* \[ ] After completion: user is redirected to /worker/matches automatically

**Result:** PASS / FAIL

\---

### WORKER ACTION 4 — View match results and read their scores

**Test:**
The matches page loads after the Job Bank scan completes.

**The user must be able to:**

* See at least 1 match card (the Clio role)
* Read the job title, company name, location, and wage on the card
* See 5 score bars with labels: NOC Alignment, Wage Compliance, Region Match, Language Score, Education Match
* Watch the score bars animate from 0 to their values on page load
* Read a total score as a large number in green (for scores above 70)
* See the GTS Fast Track badge on the Clio card

**Confirmation check:**

* \[ ] At least 1 match card is visible
* \[ ] Card shows: job title, company name, location, wage — none showing "undefined"
* \[ ] All 5 score bars are present with correct labels
* \[ ] Score bars animate on mount — they do not appear at full width instantly
* \[ ] Total score is a number between 0 and 100
* \[ ] Total score is green for scores above 70
* \[ ] Clio match shows total score of 85 or higher (given the exact match profile)
* \[ ] GTS Fast Track badge is visible on the Clio card
* \[ ] Badge shows "14 Days" or "2 Weeks" processing time

**Result:** PASS / FAIL

\---

### WORKER ACTION 5 — Generate the LMIA compliance package from their match

**Test:**
On the Clio match card, click "Generate LMIA Package"

**The user must be able to:**

* Click the button and see a loading state — button text changes or spinner appears
* Wait no more than 15 seconds for the package to generate
* See the compliance package appear on screen with readable content
* Read: advertising schedule, wage justification, transition plan, GTS category, evidence list
* See GTS Category B confirmed with 14-day processing time

**Confirmation check:**

* \[ ] Button click shows loading state (not frozen)
* \[ ] Package appears within 15 seconds
* \[ ] advertisingSchedule shows at least 4 weeks
* \[ ] All 3 platforms visible: Job Bank, LinkedIn Jobs Canada, Indeed Canada
* \[ ] wageJustification mentions $110,000 and ESDC median
* \[ ] gtsCategory shows "B"
* \[ ] processingTime shows "14 days" or "2 weeks"
* \[ ] Content references Chidera Obi or NOC 21231 — not generic placeholder text
* \[ ] The button does NOT use setTimeout — it calls the real /api/compliance/generate endpoint

**Verify the API call is real:**
Run: `grep -n "setTimeout" app/worker/matches/page.tsx`
Expected result: no matches found

* \[ ] grep returns zero results

**Result:** PASS / FAIL

\---

### WORKER ACTION 6 — See GTS Fast Track details

**Test:**
Click the GTS Fast Track badge on the Clio match card

**The user must be able to:**

* See a modal or page explaining GTS Category B
* Read the 3-4 requirements for Category B eligibility
* See confirmation that Chidera meets all requirements
* See the 14-day processing timeline prominently displayed
* Understand the difference between standard LMIA (3-6 months) and GTS (14 days)

**Confirmation check:**

* \[ ] GTS badge is clickable and triggers a modal or navigation
* \[ ] Category B is explicitly labeled
* \[ ] At least 3 eligibility requirements are listed
* \[ ] 14-day processing time is prominently shown
* \[ ] Standard LMIA processing time is mentioned for comparison
* \[ ] A clear CTA exists: "Start GTS Application" or equivalent

**Result:** PASS / FAIL

\---

## What the system must do behind the scenes

\---

### SYSTEM CHECK 1 — All 4 TinyFish agents return real data

**Test — run all 4 curl commands and confirm real responses:**

Agent 1 — Job Bank Scanner:

```
curl -X POST https://lmiabridge.vercel.app/api/agents/job-scan \\
  -H "Content-Type: application/json" \\
  -d '{"nocCode": "21231", "province": "ON"}'
```

* \[ ] Response contains jobs array
* \[ ] At least 1 job in the array
* \[ ] runId is present and not null
* \[ ] jobTitle, employer, location fields are populated strings

Agent 2 — Employer Verification:

```
curl -X POST https://lmiabridge.vercel.app/api/agents/verify-employer \\
  -H "Content-Type: application/json" \\
  -d '{"companyName": "Clio", "province": "ON", "craBN": "898765432RT0001"}'
```

* \[ ] Response contains found: true or false (not an error)
* \[ ] verificationStatus is "verified" or "failed" — not "pending" or undefined
* \[ ] timestamp is present

Agent 3 — Wage Lookup:

```
curl -X POST https://lmiabridge.vercel.app/api/agents/wage-lookup \\
  -H "Content-Type: application/json" \\
  -d '{"nocCode": "21231", "province": "ON"}'
```

* \[ ] Response contains medianWage as a number greater than 0
* \[ ] currency is "CAD"
* \[ ] cached field is present (true or false)

Run the same command twice:

* \[ ] First response: cached: false
* \[ ] Second response: cached: true (confirms MongoDB cache is working)

Agent 4 — Compliance Check:

```
curl -X POST https://lmiabridge.vercel.app/api/agents/compliance-check \\
  -H "Content-Type: application/json" \\
  -d '{"companyName": "Clio", "craBN": "898765432RT0001"}'
```

* \[ ] Response contains isCompliant field (boolean)
* \[ ] Response contains onBlacklist field (boolean)
* \[ ] Response contains violations array
* \[ ] No 500 error

**Result:** PASS / FAIL per agent

\---

### SYSTEM CHECK 2 — Groq match scoring returns all 5 dimensions

**Test:**
After the worker journey completes (or using seed data IDs), call the match endpoint:

```
curl -X POST https://lmiabridge.vercel.app/api/match \\
  -H "Content-Type: application/json" \\
  -d '{"workerId": "SEED\_WORKER\_ID", "jobPostingId": "SEED\_JOB\_ID"}'
```

(Get the IDs from: curl https://lmiabridge.vercel.app/api/seed)

* \[ ] Response contains nocAlignment (number 0-100)
* \[ ] Response contains wageCompliance (number 0-100)
* \[ ] Response contains regionMatch (number 0-100)
* \[ ] Response contains languageScore (number 0-100)
* \[ ] Response contains educationMatch (number 0-100)
* \[ ] Response contains totalScore (number 0-100)
* \[ ] Response contains summary (non-empty string)
* \[ ] Response contains lmiaViable (boolean)
* \[ ] No field is null, undefined, or NaN
* \[ ] totalScore for Chidera + Clio is 85 or higher

**Result:** PASS / FAIL

\---

### SYSTEM CHECK 3 — Health check confirms all agents are ready

**Test:**

```
curl https://lmiabridge.vercel.app/api/health
```

* \[ ] Status is "healthy"
* \[ ] agents.jobScan is "ready"
* \[ ] agents.employerVerify is "ready"
* \[ ] agents.wageLookup is "ready"
* \[ ] agents.complianceCheck is "ready"
* \[ ] models.groq is "llama-3.3-70b-versatile"
* \[ ] HTTP status code is 200

**Result:** PASS / FAIL

\---

### SYSTEM CHECK 4 — Data persists across page refresh

**Test:**

* Complete the full employer journey with Clio
* Note the employer dashboard URL and any IDs in the URL
* Hard refresh the page (Ctrl+Shift+R)
* Check that all dashboard data is still present
* \[ ] Employer name still shows after refresh
* \[ ] TinyFish Verified badge still shows after refresh
* \[ ] LMIA Compliance calendar data persists after refresh
* \[ ] Transition plan content persists after refresh
* \[ ] Agent Activity runs persist after refresh

**Result:** PASS / FAIL

\---

### SYSTEM CHECK 5 — AgentOps is recording real traces

**Test:**

* Open app.agentops.ai in a separate browser tab
* Run the full employer verification once via the UI
* Refresh the AgentOps dashboard
* \[ ] A new session appears within 30 seconds of completing the verification
* \[ ] Session shows at least 1 named action (not just a session blob)
* \[ ] The action is named "tinyfish\_web\_agent" or similar — not unnamed
* \[ ] Action shows latency in milliseconds
* \[ ] Action shows status: success

**Result:** PASS / FAIL

\---

## CONFIRMATION SUMMARY TABLE

After running all tests above, produce this table:

|#|User Action / System Check|Result|Blocking?|
|-|-|-|-|
|EA1|Employer sees homepage and understands product||YES|
|EA2|Employer completes onboarding form with live wage indicator||YES|
|EA3|TinyFish verifies employer on Business Registry||YES|
|EA4-T1|Dashboard Tab 1 — Matched Workers shows real data||YES|
|EA4-T2|Dashboard Tab 2 — LMIA calendar with 3 platforms||YES|
|EA4-T3|Dashboard Tab 3 — Transition Plan with real content||YES|
|EA4-T4|Dashboard Tab 4 — Agent Activity with real runIds||YES|
|EA5|Generate Evidence Pack returns complete package||YES|
|WA1|Worker completes Step 1 with CLB slider||YES|
|WA2|Worker completes Step 2 with date picker and toggle||YES|
|WA3|TinyFish Job Bank scan runs with live streaming messages||YES|
|WA4|Match results show animated scores and GTS badge||YES|
|WA5|Generate LMIA Package calls real API (not setTimeout)||YES|
|WA6|GTS Fast Track details are accessible and informative||NO|
|SC1-A1|TinyFish Agent #1 Job Bank returns jobs array||YES|
|SC1-A2|TinyFish Agent #2 Employer verify returns result||YES|
|SC1-A3|TinyFish Agent #3 Wage lookup returns median + cache||YES|
|SC1-A4|TinyFish Agent #4 Compliance check returns status||YES|
|SC2|Groq match scoring returns all 5 dimensions||YES|
|SC3|Health check shows all agents ready||YES|
|SC4|Data persists after page refresh||YES|
|SC5|AgentOps records real named traces||NO|

**Rule:** Any item marked Blocking? YES must be PASS before recording begins.
Items marked NO are important but will not stop the recording if they fail.

\---

## ONLY AFTER ALL BLOCKING ITEMS ARE PASS:

Proceed to Part 2 — Demo Recording.

Use the exact profiles, narration script, and screen sequence from:
demo-recording-prompt.md

Do not improvise. Do not use different data. Do not skip screens.

\---

# PART 2 — DEMO RECORDING

LMIABridge — Demo Recording Prompt
Instructions for Antigravity
You are recording the final demo video for the TinyFish Accelerator submission.
This is not a test run. Every screen you record will be seen by judges and investors.
Use the exact profiles below — these are based on a real Canadian employer actively
hiring software developers, and a precisely matched candidate profile built from real
ESDC wage data and GTS eligibility requirements.
Record every screen in the journey. Do not skip any step. Do not use placeholder data.

THE REAL EMPLOYER
Company: Clio (also known as Themis Solutions Inc.)
What they do: World's leading cloud-based legal technology company. 150,000+ law firms
globally use Clio for practice management, payments, and client intake.
Headquarters: 110 Cumberland Street, Suite 700, Toronto, Ontario, M5R 3V5
CRA Business Number: Use: 898765432RT0001 (demo-safe CRA BN format)
Province: Ontario (ON)
Industry: Legal Technology / SaaS
Employee count: 900+
Why they need foreign workers: Clio is in hypergrowth. They are publicly seeking
Software Developers (NOC 21231) for their Toronto engineering hub. The Canadian tech talent
shortage means they cannot fill all positions locally — making them a textbook GTS candidate.
Job Bank URL: https://www.jobbank.gc.ca (NOC 21231, Toronto ON)
The role Clio is posting:

Job Title: Software Developer
NOC Code: 21231
Location: Toronto, Ontario
Offered Wage: $110,000/year ($52.88/hr)
Work Type: Full-time, permanent
Required Experience: 3+ years
Tech Stack: Ruby on Rails, React, MySQL, Redis, ElasticSearch
GTS Eligible: YES — NOC 21231 is explicitly on the Global Talent Stream Category B list

Why the wage is correct:
The ESDC median wage for NOC 21231 (Software Developer) in Toronto is $52.88/hr
($110,000/year). Clio's offer matches exactly at median — making this a High-Wage LMIA
position. The wage compliance indicator should show: "At ESDC Median — $52.88/hr ✓"

THE MATCHED CANDIDATE
Full Name: Chidera Obi
Country of Origin: Nigeria
Current Location: Lagos, Nigeria (outside Canada)
Target Province: Ontario
Target NOC: 21231 (Software Developer)
Education: Bachelor of Science, Computer Science — University of Lagos (2018)
Years of Experience: 5 years
Current Role: Senior Software Engineer at Interswitch Group, Lagos
Tech Stack: Ruby on Rails, React.js, PostgreSQL, Node.js, REST APIs
Language: English (native) — CLB Score: 11
Salary Expectation: $105,000/year
GTS Category B Eligible: YES

NOC 21231 is on the GTS Category B occupations list
Wage offered ($110,000) exceeds the $80,000 minimum for GTS
5 years specialized experience meets the requirement
English is native language — no CLB barrier
PR Pathway: Express Entry (Canadian Experience Class after 12 months of work)

Why Chidera is the perfect match:

NOC alignment: EXACT match (21231 = 21231) → 100/100
Wage compliance: Offered $110K vs expected $105K → above expectation ✓ → 90/100
Region match: Both Ontario → 100/100
Language score: CLB 11 (near-perfect) → 95/100
Education match: BSc Computer Science + 5 years experience → 95/100
Total match score: 96/100
LMIA viable: TRUE
GTS eligible: TRUE, Category B



RECORDING SEQUENCE — FOLLOW EXACTLY
Record every screen transition. Narrate as you go using the script below each step.
Do not rush. Pause 2 seconds on each key result so viewers can read it.

SCREEN 1: Landing Page
URL: https://lmiabridge.vercel.app
Action: Load the homepage. Let it fully render.
Record for: 4 seconds
Narration:

"This is LMIABridge — Canada's first AI-powered LMIA compliance platform.
Today I'll show you a real hiring scenario: Clio, one of Canada's fastest-growing
tech companies, needs a Software Developer. And Chidera Obi, a senior engineer
from Nigeria, is a near-perfect match. Watch how LMIABridge handles the entire
compliance journey — powered by TinyFish web agents."



SCREEN 2: Employer Journey — Click "For Employers"
Action: Click the Employers CTA button on the homepage
Record for: 2 seconds transition

SCREEN 3: Employer Onboarding Form — Fill In Clio's Details
Action: Fill the form with these exact values:

Company Name: Clio (Themis Solutions Inc.)
CRA Business Number: 898765432RT0001
Province: Ontario
Industry: Legal Technology / SaaS
Job Title: Software Developer
NOC Code: 21231
Offered Annual Wage: 110000

As you type the NOC code 21231, pause on the live wage indicator appearing.
It should show: "ESDC Median: $52.88/hr ($109,990/yr) — Your offer is at median ✓"
Record for: 20 seconds (slow, deliberate typing)
Narration (as you fill the form):

"Clio posts a Software Developer role — NOC code 21231. They're offering $110,000
a year. Watch what happens the moment we enter that NOC code."

Narration (when wage indicator appears):

"LMIABridge instantly pulls the live ESDC median wage from the government database
via a TinyFish web agent — $52.88 per hour. Clio's offer meets the median exactly.
This is wage compliance, verified in real time."



SCREEN 4: Employer Verification — TinyFish Agent Launches
Action: Click "VERIFY \& CONTINUE"
The AgentStatusPanel should appear showing:
"TinyFish agent navigating Canada Business Registry..."
with pulsing green dot and live status messages
Record for: 30-45 seconds (let the full agent run)
Narration:

"The moment an employer submits, our TinyFish agent navigates the Canada Business
Registry in real time — not a database lookup, an actual AI agent working the
government website. This is the fraud prevention layer. No fake employers. No
fraudulent LMIAs."

When verification completes — green checkmark appears:

"Clio is verified. Legitimate Canadian employer. TinyFish confirmed it in under
40 seconds. The employer gets a TinyFish Verified badge that follows them
through the entire platform."



SCREEN 5: Employer Dashboard — LMIA Compliance Tab (show this FIRST)
Action: Auto-redirect lands on employer dashboard. Click "LMIA Compliance" tab immediately.
Record for: 15 seconds — scroll slowly through the calendar
The calendar should show:
WeekPlatformActionDeadlineStatusWeek 1Job Bank CanadaPost Software Developer listingDay 7✓ CompleteWeek 2LinkedIn Jobs CanadaPost identical listingDay 14⏳ PendingWeek 3Indeed CanadaPost listing, log all responsesDay 21⏳ PendingWeek 4All PlatformsClose postings, compile evidenceDay 28⏳ Pending
Note at bottom: "LMIA regulations require advertising on at least 3 platforms over 4 weeks."
Narration:

"The compliance dashboard auto-generates a 4-week advertising schedule across
Job Bank, LinkedIn, and Indeed — the three platforms required by ESDC regulations.
Every deadline is tracked. Every platform is documented. This is the evidence
package that takes a lawyer 10 hours to build."



SCREEN 6: Transition Plan Tab
Action: Click "Transition Plan" tab
Record for: 8 seconds
Narration:

"Groq AI generates a customized transition plan — Clio's commitment to growing
Canadian talent while the foreign worker fills the immediate gap."



SCREEN 7: Agent Activity Tab
Action: Click "Agent Activity" tab
Record for: 8 seconds — show the TinyFish run entries with runIds
Narration:

"Every TinyFish agent call is logged with a run ID and timestamp.
This is the audit trail. If ESDC audits Clio, every verification step
is documented and traceable."



SCREEN 8: Worker Journey — Homepage → "For Workers"
Action: Navigate back to homepage. Click "For Workers" CTA.
Record for: 3 seconds transition
Narration:

"Now let's see the worker side. Chidera Obi is a senior software engineer
in Lagos, Nigeria. Five years of experience. Ruby on Rails. React.
He's been trying to get to Canada for two years."



SCREEN 9: Worker Step 1 — Profile
Action: Fill Step 1 with Chidera's details:

Full Name: Chidera Obi
Email: chidera.obi@email.com
Target NOC Code: 21231 (Software Developer)
Country of Origin: Nigeria
Target Province: Ontario
Education Level: Bachelor's Degree
Language Proficiency (CLB Slider): drag to 11

Record for: 20 seconds
Narration:

"Chidera enters his profile. NOC 21231 — exact match for the Clio role.
CLB 11 — near-native English. Five years of specialized experience.
He clicks Next."



SCREEN 10: Worker Step 2 — Goals
Action: Fill Step 2:

Desired Job Title: Software Developer
Salary Expectation: $105,000/year
Start Date: \[4 weeks from today's date]
"Are you currently in Canada?": Toggle OFF (he is in Nigeria)

Record for: 12 seconds
Narration:

"His salary expectation is $105,000. Clio is offering $110,000.
The platform will flag this as an above-expectation match."



SCREEN 11: Worker Step 3 — TinyFish Job Scan Agent
Action: Click "SCAN JOB BANK"
The AgentStatusPanel appears with live streaming progress messages:
Progress messages should stream in sequence (record all of them):

"TinyFish agent initializing..."
"Navigating jobbank.gc.ca..."
"Searching NOC 21231 in Ontario..."
"Found 8 active listings..."
"Extracting job details..."
"Fetching ESDC wage data for NOC 21231..."
"Running Groq match analysis..."
"Scoring 5 dimensions..."
"Analysis complete. 1 high-confidence match found."

Record for: 60 seconds (record the ENTIRE agent run — this is the money shot)
Narration (as messages stream):

"Watch this. Our TinyFish agent is live on the Canadian Job Bank right now —
navigating the actual government website, extracting real job postings for
NOC 21231 in Ontario. This is not a database. This is a live web agent."

When "Analysis complete" appears:

"In under 60 seconds, LMIABridge has scanned the live Job Bank, pulled
the ESDC wage data, and run Groq AI scoring across five dimensions.
Chidera has a match."



SCREEN 12: Match Results — Chidera's Match with Clio
Action: Matches page loads. The Clio job card appears at the top.
Record for: 15 seconds — let the score bars animate to their values
The match card should show:

Job: Software Developer — Clio (Themis Solutions Inc.)
Location: Toronto, ON
Wage: $110,000/yr ✓ (above expected)
NOC Alignment: 100 ████████████
Wage Compliance: 90 ███████████░
Region Match: 100 ████████████
Language Score: 95 ████████████
Education Match: 95 ████████████
Total Score: 96/100 (shown in large GREEN)
GTS Fast Track badge: ⭐ GTS Fast Track — 14 Days

Narration (as bars animate):

"96 out of 100. NOC code — perfect match. Wage — above Chidera's expectation.
Region — both Ontario. Language — CLB 11. Education — matched."

Pause on the GTS badge:

"And here is the game-changer. NOC 21231 is on the Global Talent Stream
Category B list. Instead of a 3 to 6 month standard LMIA — Clio gets a
2-week processing time. Chidera could be in Toronto in under 6 weeks total."



SCREEN 13: Generate LMIA Package
Action: Click "Generate LMIA Package" on the Clio match card
Loading state appears — Groq is generating
Record for: 15 seconds including the loading state
Narration:

"One click. Groq AI generates the complete LMIA compliance package."

When compliance package appears:
Record for: 12 seconds — scroll through it slowly
Narration:

"Advertising schedule. Wage justification. Transition plan. GTS Category B
confirmation. Evidence requirements. This document — an immigration lawyer
charges $2,500 to prepare. LMIABridge generates it in seconds."



SCREEN 14: Close — Founder Line
Action: Stay on the compliance package screen
Record for: 8 seconds
Narration:

"I'm not just building LMIABridge. I'm living it. This platform is my own
immigration pathway to Canada — and a $1.2 billion compliance market waiting
to be transformed. Powered by TinyFish. Built in 7 days."



TOTAL RUNTIME TARGET: 2 minutes 45 seconds to 3 minutes 15 seconds

TECHNICAL RECORDING REQUIREMENTS

Resolution: 1920×1080 minimum
Browser: Chrome, zoom at 90% so full dashboard is visible
Window: Maximized — no taskbar visible
Before recording: Run seed endpoint to ensure Clio data is pre-populated
curl https://lmiabridge.vercel.app/api/seed
Before recording: Clear browser cache so TinyFish agents run fresh (not cached)
AgentOps dashboard: Have it open in a second browser tab — do NOT show it during
main recording, but screenshot it after for the X post
Recording tool: OBS Studio or Loom (Loom preferred for instant sharing)



PRE-RECORDING CHECKLIST
Run through this before hitting record:

Production URL loads: https://lmiabridge.vercel.app
Seed data confirmed: curl https://lmiabridge.vercel.app/api/seed returns existing Clio employer
TinyFish API key has sufficient credits (check agent.tinyfish.ai dashboard)
Groq API key is active (check console.groq.com)
NOC 21231 wage lookup returns $52.88/hr for Ontario (test it once before recording)
AgentStatusPanel animations are smooth (no lag on the streaming messages)
Match score bars animate cleanly on first load (clear browser cache before demo)
"Generate LMIA Package" button calls real API — NOT setTimeout mock
GTS badge appears on the Clio match card
All 4 dashboard tabs visible in employer view
Compliance calendar shows 3 platforms (Job Bank, LinkedIn, Indeed)
Microphone tested — narration audio clear
Screen recording software running at 1080p before navigating to the app



POST-RECORDING
After the recording is complete:

Open AgentOps dashboard — screenshot showing all agent traces from the recording session
Trim the video to remove dead time before "Scan Job Bank" completes
Add captions if available — makes the X post more accessible
Upload to X with this post copy:

"We built an AI agent that navigates Canada's immigration system in real time.
Watch Clio (@Clio\_legal) post a Software Developer role → TinyFish agent verifies them on the Canada Business Registry → Groq AI matches the perfect candidate from Nigeria → full LMIA compliance package generated in seconds.
Built in 7 days for @Tiny\_Fish accelerator.
NOC 21231 × GTS Category B × 14-day processing.
\[VIDEO]
\[PRODUCTION URL]
#TinyFishAccelerator #BuildInPublic #ImmigTech #LMIABridge"

Email submission to \[email protected] immediately after posting



LMIABridge Demo Recording Prompt — Real employer. Real candidate. Real agents.
Clio data sourced from public job postings. ESDC median wage $52.88/hr for NOC 21231 Toronto verified March 2026.\*

