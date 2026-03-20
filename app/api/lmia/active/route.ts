import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import LMIAApplication from '@/lib/models/LMIAApplication';
import Employer from '@/lib/models/Employer';
import Worker from '@/lib/models/Worker';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectToDatabase();

    // Get the most recent employer
    const employer = await Employer.findOne({}).sort({ createdAt: -1 }).lean() as any;
    if (!employer) {
      return NextResponse.json({ state: 'no_employer' });
    }

    // Get the most recent LMIA application for this employer, populated with worker
    const application = await LMIAApplication.findOne({ employer: employer._id })
      .sort({ matchScore: -1 })
      .populate('worker')
      .lean() as any;

    if (!application) {
      return NextResponse.json({ state: 'no_application', employer });
    }

    const worker = application.worker;

    return NextResponse.json({
      state: !application.lmiaPathway ? 'no_pathway' : application.lmiaPathway === 'gts' ? 'gts' : 'standard',
      application: {
        _id: application._id.toString(),
        lmiaPathway: application.lmiaPathway || null,
        complianceStatus: application.complianceStatus,
        complianceChecklist: application.complianceChecklist || [],
        canadianApplicantLog: application.canadianApplicantLog || [],
        advertisingSchedule: application.advertisingSchedule || [],
        gtsEligible: application.gtsEligible,
        matchScore: application.matchDetails?.totalScore || application.matchScore,
        lmiaSubmittedAt: application.lmiaSubmittedAt || null,
        lmiaReferenceNumber: application.lmiaReferenceNumber || null,
        lmiaDecision: application.lmiaDecision || null,
        lmiaDecisionDate: application.lmiaDecisionDate || null,
        createdAt: application.createdAt,
      },
      worker: worker ? {
        _id: worker._id.toString(),
        name: worker.name,
        country: worker.country,
        nocCode: worker.nocCode || worker.targetNOC,
        salaryExpectation: worker.salaryExpectation,
        educationLevel: worker.educationLevel,
        languageScore: worker.languageScore,
      } : null,
      employer: {
        _id: employer._id.toString(),
        companyName: employer.companyName,
        tradingName: employer.tradingName || null,
        province: employer.province,
        nocCode: employer.nocCode,
        offeredWage: employer.offeredWage,
        advertisingStartDate: employer.advertisingStartDate || null,
        verificationStatus: employer.verificationStatus,
      },
    });
  } catch (error: any) {
    console.error('[LMIA Active] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
