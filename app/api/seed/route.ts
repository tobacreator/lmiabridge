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

    // Calculate advertising dates (3 weeks ago)
    const threeWeeksAgo = new Date();
    threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);
    threeWeeksAgo.setHours(9, 0, 0, 0);

    const week1End = new Date(threeWeeksAgo);
    week1End.setDate(week1End.getDate() + 7);
    const week2End = new Date(threeWeeksAgo);
    week2End.setDate(week2End.getDate() + 14);
    const week3End = new Date(threeWeeksAgo);
    week3End.setDate(week3End.getDate() + 21);
    const week4End = new Date(threeWeeksAgo);
    week4End.setDate(week4End.getDate() + 28);

    const today = new Date();

    // Check if seed data already exists
    const existingEmployer = await Employer.findOne({ companyName: 'Themis Solutions Inc.' });
    
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
      companyName: 'Themis Solutions Inc.',
      tradingName: 'Clio',
      email: 'hiring@clio.com',
      cra_bn: '898765432RT0001',
      province: 'ON',
      industry: 'Legal Technology / SaaS',
      jobTitle: 'Software Developer',
      nocCode: '21232',
      offeredWage: 110000,
      employeeCount: 900,
      advertisingStartDate: threeWeeksAgo,
      verificationStatus: 'verified',
      verificationNote: 'Company amalgamated — common for restructured corporations. Verified as legitimate Canadian business entity.',
    });

    // Create Software Developer job posting
    const jobPosting = await JobPosting.create({
      jobTitle: 'Software Developer',
      nocCode: '21232',
      wage: 52.88, // hourly
      province: 'ON',
      employer: employer._id,
      sourceUrl: 'https://www.jobbank.gc.ca',
    });

    // Create Chidera Obi worker
    const worker = await Worker.create({
      name: 'Chidera Obi',
      email: 'chidera.obi@email.com',
      nocCode: '21232',
      targetNOC: '21232',
      country: 'Nigeria',
      languageScore: '11',
      educationLevel: "Bachelor's Degree",
      desiredProvince: 'ON',
      salaryExpectation: 105000,
      currentJobTitle: 'Senior Software Engineer',
      currentEmployer: 'Interswitch Group',
      yearsExperience: 5,
      technicalSkills: ['Ruby on Rails', 'React', 'PostgreSQL', 'Node.js', 'REST APIs'],
      institutionName: 'University of Lagos',
      professionalSummary: 'Senior software engineer with 5 years building fintech payment infrastructure in West Africa. Specializing in Ruby on Rails and React. Targeting Canadian tech sector.',
    });

    // Create Priya Sharma worker
    const worker2 = await Worker.create({
      name: 'Priya Sharma',
      email: 'priya.sharma@email.com',
      nocCode: '21232',
      targetNOC: '21232',
      country: 'India',
      languageScore: '10',
      educationLevel: "Master's Degree",
      desiredProvince: 'ON',
      salaryExpectation: 98000,
      currentJobTitle: 'Software Engineer',
      currentEmployer: 'Infosys',
      yearsExperience: 4,
      technicalSkills: ['Java', 'Spring Boot', 'React', 'MySQL', 'Docker'],
      institutionName: 'IIT Delhi',
      professionalSummary: 'Full-stack engineer with 4 years enterprise software experience. Targeting Canadian tech sector with strong Java and React background.',
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
        summary: 'Exceptional match. Chidera Obi is a senior software engineer with 5 years of Ruby on Rails and React experience, an exact NOC 21232 match for Clio\'s Software Developer position in Toronto. Wage offered ($110,000) exceeds candidate expectation ($105,000). Both targeting Ontario. CLB 11 native English proficiency. Bachelor\'s in Computer Science from University of Lagos. GTS Category B eligible for 14-day processing.',
        lmiaViable: true,
      },
      complianceStatus: 'viable',
      gtsEligible: true,
      advertisingSchedule: [
        {
          week: 1,
          platform: 'Job Bank Canada',
          actionRequired: 'Post Software Developer (NOC 21232) listing',
          deadline: 'Week 1',
          deadlineDate: week1End.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }),
          status: week1End < today ? 'complete' : 'pending',
        },
        {
          week: 2,
          platform: 'LinkedIn Jobs Canada',
          actionRequired: 'Post identical listing on LinkedIn Jobs',
          deadline: 'Week 2',
          deadlineDate: week2End.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }),
          status: week2End < today ? 'complete' : 'pending',
        },
        {
          week: 3,
          platform: 'Indeed Canada',
          actionRequired: 'Post listing and log all applicant responses',
          deadline: 'Week 3',
          deadlineDate: week3End.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }),
          status: week3End < today ? 'complete' : 'pending',
        },
        {
          week: 4,
          platform: 'All Platforms',
          actionRequired: 'Close all postings and compile evidence package',
          deadline: 'Week 4',
          deadlineDate: week4End.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }),
          status: week4End < today ? 'complete' : 'pending',
        },
      ],
      transitionPlan: {
        year1: 'Implement internal mentorship program pairing foreign worker with Canadian junior developers at Clio. Launch targeted hackathons to identify local talent.',
        year2: 'Increase Clio recruitment budget by 15% for Canadian university campus tours. Standardize training protocols for rapid knowledge transfer.',
        year3: 'Achieve 2:1 Canadian-to-foreign-worker ratio for senior Software Developer roles. Establish Clio as a top employer for new CS graduates.',
        canadianHiringGoals: 'Commitment to hiring 2 local junior developers for every 1 LMIA-approved senior role within 24 months.',
      },
    });

    // Create second LMIA Application for Priya Sharma
    const application2 = await LMIAApplication.create({
      employer: employer._id,
      worker: worker2._id,
      jobPosting: jobPosting._id,
      matchScore: 78,
      matchDetails: {
        nocAlignment: 100,
        wageCompliance: 85,
        regionMatch: 100,
        languageScore: 80,
        educationMatch: 100,
        totalScore: 78,
        summary: 'Strong match. Priya Sharma holds a Master\'s in Computer Science from IIT Delhi with 3 years of full-stack development experience. Exact NOC 21232 match for Clio\'s Software Developer position. Wage offered ($110,000) exceeds expectation ($98,000). CLB 10 English proficiency. GTS Category B eligible.',
        lmiaViable: true,
      },
      complianceStatus: 'in_progress',
      gtsEligible: true,
      advertisingSchedule: [],
    });

    return NextResponse.json({
      message: 'Seed data created successfully',
      employerId: employer._id,
      jobPostingId: jobPosting._id,
      workers: [worker._id, worker2._id],
      applications: [application._id, application2._id],
    });

  } catch (error: any) {
    console.error('[Seed] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
