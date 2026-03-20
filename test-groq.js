require('dotenv').config({ path: '.env.local' });
const Groq = require('groq-sdk');

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

const prompt = `
You are a Canadian immigration lawyer specializing in LMIA applications.
Generate a complete LMIA compliance package for this hiring scenario.

Employer: Test Tech Corp
Job: Senior Developer (NOC 21232)
Worker: John Doe

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
  "gtsEligible": true,
  "gtsCategory": "A",
  "warningsAndRisks": ["string"]
}
`;

async function run() {
    const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.2,
    });

    const rawResponse = completion.choices[0]?.message?.content || '';
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    const cleanJson = jsonMatch ? jsonMatch[0] : rawResponse;
    
    console.log(cleanJson);
}

run().catch(console.error);
