import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import LMIAApplication from '@/lib/models/LMIAApplication';
import { groq, MODEL } from '@/lib/groq';
import { compliancePackPrompt } from '@/lib/groq-prompts';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const { lmiaApplicationId } = await req.json();

    if (!lmiaApplicationId) {
      return NextResponse.json({ error: 'lmiaApplicationId is required' }, { status: 400 });
    }

    // 1. Fetch application with populated fields
    const application = await LMIAApplication.findById(lmiaApplicationId)
      .populate('employer')
      .populate('worker')
      .populate('jobPosting');

    if (!application) {
      return NextResponse.json({ error: 'LMIA Application not found' }, { status: 404 });
    }

    // 2. Run Groq Compliance Pack Generation
    const employer = application.employer as any;
    const advertisingStartDate = employer.advertisingStartDate || new Date();
    
    const prompt = compliancePackPrompt(
      employer,
      application.jobPosting as any,
      application.worker as any,
      advertisingStartDate
    );
    
    console.log(`[Compliance] Generating pack for application ${lmiaApplicationId}...`);
    
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: MODEL,
      temperature: 0.2,
    });

    const rawResponse = completion.choices[0]?.message?.content || '';
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    const cleanJson = jsonMatch ? jsonMatch[0] : rawResponse;

    let complianceData;
    try {
      complianceData = JSON.parse(cleanJson);
    } catch (e) {
      console.error('[Compliance] Groq Parse Error:', e, 'Raw:', rawResponse);
      return NextResponse.json({ error: 'parsing_failed', raw: rawResponse }, { status: 500 });
    }

    // 3. Update application
    application.advertisingSchedule = complianceData.advertisingSchedule || [];
    application.transitionPlan = complianceData.transitionPlan;
    application.compliancePack = complianceData;
    application.gtsEligible = complianceData.gtsEligible || application.gtsEligible;
    
    await application.save();

    return NextResponse.json({
      success: true,
      compliancePack: complianceData
    });

  } catch (error: any) {
    console.error('[Compliance] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
