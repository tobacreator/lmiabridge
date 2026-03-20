import { IWorker } from './models/Worker';
import { IJobPosting } from './models/JobPosting';
import { IEmployer } from './models/Employer';

export function matchScoringPrompt(worker: IWorker, job: IJobPosting, medianWage: number): string {
  return `
You are a Canadian immigration compliance expert and LMIA specialist.
Score the suitability of the following worker for the specified job posting.

Worker Profile:
- Name: ${worker.name}
- NOC: ${worker.nocCode || 'N/A'}
- Target NOC: ${worker.targetNOC || 'N/A'}
- Language Score: ${worker.languageScore || 'N/A'}
- Education: ${worker.educationLevel || 'N/A'}
- Desired Province: ${worker.desiredProvince || 'N/A'}
- Worker Experience: ${(worker as any).yearsExperience || 'N/A'} years
- Worker Current Role: ${(worker as any).currentJobTitle || 'N/A'} at ${(worker as any).currentEmployer || 'N/A'}
- Worker Technical Skills: ${(worker as any).technicalSkills?.join(', ') || 'not specified'}
- Worker Institution: ${(worker as any).institutionName || 'not specified'}
- Worker Summary: ${(worker as any).professionalSummary || 'not provided'}

Job Posting:
- Title: ${job.jobTitle}
- NOC: ${job.nocCode}
- Wage: ${job.wage}
- Province: ${job.province}

Market Data:
- ESDC Median Wage: ${medianWage}

Instructions:
Score the match on 5 dimensions (0-100 each):
1. nocAlignment: How well worker's NOC/Target NOC matches job NOC (exact=100, adjacent=50-70, unrelated=0).
2. wageCompliance: Is job wage above ESDC median? (above=80-100, at median=60-79, below=0-40).
3. regionMatch: Worker's desired province vs job province.
4. languageScore: Worker's language score vs typical job requirements.
5. educationMatch: Worker's education vs typical NOC requirements.

In the summary field, write 2-3 sentences that specifically reference the worker's actual job title, employer, years of experience, and top skills. Reference the specific job and company they are matched with. Do not use generic language.

Output must be ONLY valid JSON in this format:
{
  "nocAlignment": number,
  "wageCompliance": number,
  "regionMatch": number,
  "languageScore": number,
  "educationMatch": number,
  "totalScore": number,
  "summary": "string",
  "lmiaViable": boolean
}
`;
}

export function compliancePackPrompt(employer: IEmployer, job: IJobPosting, worker: IWorker, advertisingStartDate: Date): string {
  const startDate = new Date(advertisingStartDate);
  const today = new Date();
  
  return `
You are a Canadian immigration lawyer specializing in LMIA applications.
Generate a complete LMIA compliance package for this hiring scenario.

Employer: ${employer.companyName}
Job: ${job.jobTitle} (NOC ${job.nocCode})
Worker: ${worker.name}
ADVERTISING_START_DATE: ${startDate.toISOString().split('T')[0]}
TODAY_DATE: ${today.toISOString().split('T')[0]}

IMPORTANT: Generate the 4-week advertising schedule using ADVERTISING_START_DATE as the Week 1 start date.
Calculate actual calendar dates for each week deadline:
- Week 1 deadline = ADVERTISING_START_DATE + 7 days
- Week 2 deadline = ADVERTISING_START_DATE + 14 days
- Week 3 deadline = ADVERTISING_START_DATE + 21 days
- Week 4 deadline = ADVERTISING_START_DATE + 28 days

Compare each deadline to TODAY_DATE:
- If the deadline has already passed (deadline < TODAY_DATE), set status to 'complete'
- If the deadline is today or in the future (deadline >= TODAY_DATE), set status to 'pending'

Include the actual date string in each schedule entry as 'deadlineDate' in YYYY-MM-DD format.

Output Case-specific details as JSON:
{
  "advertisingSchedule": [
    { "week": 1, "platform": "Job Bank", "actionRequired": "string", "deadline": "string", "deadlineDate": "YYYY-MM-DD", "status": "complete" | "pending" },
    { "week": 2, "platform": "Job Bank & LinkedIn Jobs Canada", "actionRequired": "string", "deadline": "string", "deadlineDate": "YYYY-MM-DD", "status": "complete" | "pending" },
    { "week": 3, "platform": "Job Bank & Indeed Canada", "actionRequired": "string", "deadline": "string", "deadlineDate": "YYYY-MM-DD", "status": "complete" | "pending" },
    { "week": 4, "platform": "Job Bank", "actionRequired": "string", "deadline": "string", "deadlineDate": "YYYY-MM-DD", "status": "complete" | "pending" }
  ],
  "wageJustification": "string",
  "transitionPlan": {
    "year1": "string",
    "year2": "string",
    "year3": "string",
    "canadianHiringGoals": "string"
  },
  "evidenceRequirements": ["string"],
  "estimatedProcessingTime": "string",
  "gtsEligible": boolean,
  "gtsCategory": "A" | "B" | "not_eligible",
  "warningsAndRisks": ["string"]
}
`;
}

export function gtsScreenerPrompt(nocCode: string, jobTitle: string, wage: number): string {
  return `
Determine Global Talent Stream (GTS) eligibility for the following:
NOC: ${nocCode}
Job Title: ${jobTitle}
Wage: ${wage}

Output JSON:
{
  "eligible": boolean,
  "category": "A" | "B" | "not_eligible",
  "reason": "string",
  "processingTime": "string",
  "requirements": ["string"]
}
`;
}

export function fraudRiskPrompt(employer: IEmployer, agentResults: any): string {
  return `
Assess LMIA fraud risk (0-100) based on employer profile and automation agent results.

Employer: ${employer.companyName}
Agent Verification Status: ${employer.verificationStatus}
Details: ${JSON.stringify(agentResults)}

Output JSON:
{
  "riskScore": number,
  "riskLevel": "low" | "medium" | "high",
  "redFlags": ["string"],
  "recommendation": "string"
}
`;
}
