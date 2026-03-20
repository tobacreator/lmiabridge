require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

// Mocking models to match Next.js environment
const EmployerSchema = new mongoose.Schema({ companyName: String });
const Employer = mongoose.models.Employer || mongoose.model('Employer', EmployerSchema);

const JobPostingSchema = new mongoose.Schema({ jobTitle: String, wage: Number, province: String, employer: { type: mongoose.Schema.Types.ObjectId, ref: 'Employer' } });
const JobPosting = mongoose.models.JobPosting || mongoose.model('JobPosting', JobPostingSchema);

const LMIAApplicationSchema = new mongoose.Schema({
  employer: { type: mongoose.Schema.Types.ObjectId, ref: 'Employer' },
  jobPosting: { type: mongoose.Schema.Types.ObjectId, ref: 'JobPosting' },
  matchDetails: mongoose.Schema.Types.Mixed,
  gtsEligible: Boolean
});
const LMIAApplication = mongoose.models.LMIAApplication || mongoose.model('LMIAApplication', LMIAApplicationSchema);

async function run() {
  await mongoose.connect(process.env.MONGODB_URI, { tlsAllowInvalidCertificates: true, family: 4 });
  console.log('Connected');

  try {
    const apps = await LMIAApplication.find({})
      .populate('employer')
      .populate('jobPosting')
      .lean();
    
    console.log(`Found ${apps.length} apps`);
    
    const matches = apps.map((app) => {
      console.log('Mapping app:', app._id);
      return {
        _id: app._id.toString(),
        jobTitle: app.jobPosting?.jobTitle || 'Unknown',
        employerName: app.employer?.companyName || 'Unknown'
      };
    });
    console.log('Success:', matches);
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
