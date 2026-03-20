import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Employer from '@/lib/models/Employer';
import Worker from '@/lib/models/Worker';
import JobPosting from '@/lib/models/JobPosting';
import LMIAApplication from '@/lib/models/LMIAApplication';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectToDatabase();

    // Check if seed data already exists
    const existingEmployer = await Employer.findOne({ companyName: 'Clio (Themis Solutions Inc.)' });
    
    if (existingEmployer) {
      // Return existing IDs
      const job = await JobPosting.findOne({ employer: existingEmployer._id });
      const worker = await Worker.findOne({ email: 'chidera.obi@email.com' });
      const app = await LMIAApplication.findOne({ employer: existingEmployer._id });

      return NextResponse.json({
        message: 'Seed data already exists',
        employerId: existingEmployer._id,
        jobPostingId: job?._id,
        workerId: worker?._id,
        applicationId: app?._id,
      });
    }

    // Create Clio employer
    const employer = await Employer.create({
      companyName: 'Clio (Themis Solutions Inc.)',
      email: 'hiring@clio.com',
      cra_bn: '898765432RT0001',
      province: 'ON',
      industry: 'Legal Technology / SaaS',
      jobTitle: 'Software Developer',
      nocCode: '21231',
      offeredWage: 110000,
      employeeCount: 900,
      verificationStatus: 'verified',
    });

    // Create Software Developer job posting
    const jobPosting = await JobPosting.create({
      jobTitle: 'Software Developer',
      nocCode: '21231',
      wage: 52.88, // hourly
      province: 'ON',
      employer: employer._id,
      sourceUrl: 'https://www.jobbank.gc.ca',
    });

    // Create Chidera Obi worker
    const worker = await Worker.create({
      name: 'Chidera Obi',
      email: 'chidera.obi@email.com',
      nocCode: '21231',
      targetNOC: '21231',
      country: 'Nigeria',
      languageScore: '11',
      educationLevel: "Bachelor's",
      desiredProvince: 'ON',
      salaryExpectation: 105000,
    });

    // Create LMIA Application with pre-scored match
    const application = await LMIAApplication.create({
      employer: employer._id,
      worker: worker._id,
      jobPosting: jobPosting._id,
      matchScore: 96,
      matchDetails: {
        nocAlignment: 100,
        wageCompliance: 90,
        regionMatch: 100,
        languageScore: 95,
        educationMatch: 95,
        totalScore: 96,
        summary: 'Exceptional match. Chidera Obi is a senior software engineer with 5 years of Ruby on Rails and React experience, an exact NOC 21231 match for Clio\'s Software Developer position in Toronto. Wage offered ($110,000) exceeds candidate expectation ($105,000). Both targeting Ontario. CLB 11 native English proficiency. Bachelor\'s in Computer Science from University of Lagos. GTS Category B eligible for 14-day processing.',
        lmiaViable: true,
      },
      complianceStatus: 'viable',
      gtsEligible: true,
      advertisingSchedule: [
        { week: 1, platform: 'Job Bank Canada', action: 'Post Software Developer listing', deadline: 'Day 7', status: 'complete' },
        { week: 2, platform: 'LinkedIn Jobs Canada', action: 'Post identical listing', deadline: 'Day 14', status: 'pending' },
        { week: 3, platform: 'Indeed Canada', action: 'Post listing, log all responses', deadline: 'Day 21', status: 'pending' },
        { week: 4, platform: 'All Platforms', action: 'Close postings, compile evidence', deadline: 'Day 28', status: 'pending' },
      ],
      transitionPlan: {
        year1: 'Implement internal mentorship program pairing foreign worker with Canadian junior developers at Clio. Launch targeted hackathons to identify local talent.',
        year2: 'Increase Clio recruitment budget by 15% for Canadian university campus tours. Standardize training protocols for rapid knowledge transfer.',
        year3: 'Achieve 2:1 Canadian-to-foreign-worker ratio for senior Software Developer roles. Establish Clio as a top employer for new CS graduates.',
        canadianHiringGoals: 'Commitment to hiring 2 local junior developers for every 1 LMIA-approved senior role within 24 months.',
      },
    });

    return NextResponse.json({
      message: 'Seed data created successfully',
      employerId: employer._id,
      jobPostingId: jobPosting._id,
      workerId: worker._id,
      applicationId: application._id,
    });

  } catch (error: any) {
    console.error('[Seed] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
