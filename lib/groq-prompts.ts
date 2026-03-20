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

export function compliancePackPrompt(employer: IEmployer, job: IJobPosting, worker: IWorker): string {
  return `
You are a Canadian immigration lawyer specializing in LMIA applications.
Generate a complete LMIA compliance package for this hiring scenario.

Employer: ${employer.companyName}
Job: ${job.jobTitle} (NOC ${job.nocCode})
Worker: ${worker.name}

Output Case-specific details as JSON:
{
  "advertisingSchedule": [
    { "week": 1, "platform": "Job Bank", "actionRequired": "string", "deadline": "string" },
    { "week": 2, "platform": "Job Bank & LinkedIn Jobs Canada", "actionRequired": "string", "deadline": "string" },
    { "week": 3, "platform": "Job Bank & Indeed Canada", "actionRequired": "string", "deadline": "string" },
    { "week": 4, "platform": "Job Bank", "actionRequired": "string", "deadline": "string" }
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
