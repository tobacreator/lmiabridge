import { groq, MODEL } from './lib/groq';
import { compliancePackPrompt } from './lib/groq-prompts';

const mockEmployer = { companyName: 'Test Tech Corp' };
const mockJob = { jobTitle: 'Senior Developer', nocCode: '21232' };
const mockWorker = { name: 'John Doe' };

async function testGroq() {
  const prompt = compliancePackPrompt(mockEmployer as any, mockJob as any, mockWorker as any);
  
  const completion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: MODEL,
    temperature: 0.2,
  });

  const rawResponse = completion.choices[0]?.message?.content || '';
  const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
  const cleanJson = jsonMatch ? jsonMatch[0] : rawResponse;
  
  console.log(JSON.stringify(JSON.parse(cleanJson), null, 2));
}

testGroq().catch(console.error);
