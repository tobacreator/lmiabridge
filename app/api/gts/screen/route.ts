import { NextRequest, NextResponse } from 'next/server';
import { groq, MODEL } from '@/lib/groq';
import { gtsScreenerPrompt } from '@/lib/groq-prompts';

export async function POST(req: NextRequest) {
  try {
    const { nocCode, jobTitle, wage } = await req.json();

    if (!nocCode || !jobTitle || !wage) {
      return NextResponse.json({ error: 'nocCode, jobTitle, and wage are required' }, { status: 400 });
    }

    const prompt = gtsScreenerPrompt(nocCode, jobTitle, wage);
    
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: MODEL,
      temperature: 0.1,
    });

    const rawResponse = completion.choices[0]?.message?.content || '';
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    const cleanJson = jsonMatch ? jsonMatch[0] : rawResponse;

    try {
      const result = JSON.parse(cleanJson);
      return NextResponse.json(result);
    } catch (e) {
      return NextResponse.json({ error: 'parsing_failed', raw: rawResponse }, { status: 500 });
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
