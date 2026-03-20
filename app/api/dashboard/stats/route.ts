import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import LMIAApplication from '@/lib/models/LMIAApplication';
import Employer from '@/lib/models/Employer';
import JobPosting from '@/lib/models/JobPosting';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectToDatabase();

    const totalMatched = await LMIAApplication.countDocuments({});
    const gtsEligible = await LMIAApplication.countDocuments({ gtsEligible: true });
    
    // Get employer verification status for the most recent employer
    const employer = await Employer.findOne({}).sort({ createdAt: -1 }).lean() as any;
    
    const verificationStatus = employer?.verificationStatus || 'pending';
    const tradingName = employer?.tradingName || null;
    const companyName = employer?.companyName || null;
    const employerId = employer?._id?.toString() || null;

    // Get job details for the most recent posting
    const latestJob = employer ? await JobPosting.findOne({ employer: employer._id }).sort({ createdAt: -1 }).lean() as any : null;
    const jobTitle = latestJob?.jobTitle || employer?.jobTitle || null;
    const nocCode = latestJob?.nocCode || employer?.nocCode || null;

    // Compute reputation score from real data
    let reputationScore = 0;
    if (verificationStatus === 'verified') reputationScore += 40;
    else if (verificationStatus === 'pending') reputationScore += 10;

    // Check compliance status across applications (viable = compliant in our system)
    const compliantApps = await LMIAApplication.countDocuments({ 
      complianceStatus: { $in: ['compliant', 'viable'] } 
    });
    if (compliantApps > 0) reputationScore += 30;
    else {
      const pendingApps = await LMIAApplication.countDocuments({ 
        complianceStatus: { $in: ['pending', 'in_progress'] } 
      });
      if (pendingApps > 0) reputationScore += 20;
    }

    // Application history contributes up to 30 points
    reputationScore += Math.min(totalMatched * 5, 30);

    let reputationLabel = 'New Account';
    if (reputationScore >= 80) reputationLabel = 'Trusted Partner';
    else if (reputationScore >= 50) reputationLabel = 'Verified';

    return NextResponse.json({
      totalMatched,
      gtsEligible,
      verificationStatus,
      companyName,
      tradingName,
      employerId,
      jobTitle,
      nocCode,
      reputationScore,
      reputationLabel,
    });
  } catch (error: any) {
    console.error('[Dashboard Stats] Error:', error);
    return NextResponse.json({
      totalMatched: 0,
      gtsEligible: 0,
      verificationStatus: 'pending',
      companyName: null,
      tradingName: null,
      employerId: null,
      reputationScore: 0,
      reputationLabel: 'New Account',
    }, { status: 500 });
  }
}
