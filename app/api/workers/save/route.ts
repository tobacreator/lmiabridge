import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Worker from '@/lib/models/Worker';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { email, name, nocCode, country, languageScore, educationLevel, desiredProvince,
            salaryExpectation, currentJobTitle, currentEmployer, yearsExperience,
            technicalSkills, institutionName, professionalSummary } = body;

    if (!email || !name || !country) {
      return NextResponse.json({ error: 'name, email, and country are required' }, { status: 400 });
    }

    const worker = await Worker.findOneAndUpdate(
      { email },
      {
        name, nocCode, country, languageScore, educationLevel, desiredProvince,
        salaryExpectation, currentJobTitle, currentEmployer, yearsExperience,
        technicalSkills: technicalSkills || [], institutionName, professionalSummary,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Set workerPageUrl
    const profileUrl = `/worker/profile/${worker._id}`;
    if (worker.workerPageUrl !== profileUrl) {
      worker.workerPageUrl = profileUrl;
      await worker.save();
    }

    return NextResponse.json({ workerId: worker._id, profileUrl });
  } catch (error: any) {
    console.error('[Workers Save] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
