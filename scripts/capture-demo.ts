import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

// ── Config ──────────────────────────────────────────────────────
const BASE_URL = 'https://lmiabridge.vercel.app';
const OUTPUT_DIR = path.join(process.cwd(), 'demo-assets');
const VIEWPORT = { width: 1440, height: 900 };

// Demo data — matches actual seed data
const EMPLOYER = {
  companyName: 'Themis Solutions Inc.',
  craBN: '898765432RT0001',
  province: 'ON',
  industry: 'Legal Technology / SaaS',
  jobTitle: 'Software Developer',
  nocCode: '21232',
  offeredWage: '110000',
  employees: '900',
};

const WORKER = {
  name: 'Chidera Obi',
  email: 'chidera.obi@email.com',
  nocCode: '21232',
  country: 'Nigeria',
  province: 'ON',
  education: "Bachelor's",
  institution: 'University of Lagos',
  jobTitle: 'Senior Software Engineer',
  employer: 'Interswitch Group',
  experience: '5',
  clb: 11,
  salary: '105000',
  skills: ['Ruby on Rails', 'React', 'PostgreSQL', 'Node.js', 'REST APIs'],
  summary:
    'Senior software engineer with 5 years building fintech payment infrastructure in West Africa.',
};

// ── Helpers ─────────────────────────────────────────────────────

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function capture(page: Page, name: string, description: string) {
  const filePath = path.join(OUTPUT_DIR, `${name}.png`);
  ensureDir(path.dirname(filePath));
  await page.screenshot({ path: filePath, fullPage: false, animations: 'allow' });
  console.log(`  ✓ Captured: ${name} — ${description}`);
  return filePath;
}

async function captureFullPage(page: Page, name: string, description: string) {
  const filePath = path.join(OUTPUT_DIR, `${name}.png`);
  ensureDir(path.dirname(filePath));
  await page.screenshot({ path: filePath, fullPage: true, animations: 'allow' });
  console.log(`  ✓ Captured (full): ${name} — ${description}`);
  return filePath;
}

async function captureSequence(
  page: Page,
  baseName: string,
  frameCount: number,
  intervalMs: number,
  description: string
): Promise<string[]> {
  const frames: string[] = [];
  const framesDir = path.join(OUTPUT_DIR, 'frames');
  ensureDir(framesDir);
  for (let i = 0; i < frameCount; i++) {
    const framePath = path.join(framesDir, `${baseName}_frame_${String(i).padStart(3, '0')}.png`);
    await page.screenshot({ path: framePath, fullPage: false });
    frames.push(framePath);
    if (i < frameCount - 1) await page.waitForTimeout(intervalMs);
  }
  console.log(`  ✓ Captured sequence: ${description} (${frameCount} frames)`);
  return frames;
}

async function waitForText(page: Page, text: string, timeout = 120000) {
  await page.waitForFunction((t: string) => document.body.innerText.includes(t), text, { timeout });
}

// ── Main capture flow ────────────────────────────────────────────

async function runCapture() {
  ensureDir(OUTPUT_DIR);
  ensureDir(path.join(OUTPUT_DIR, 'employer'));
  ensureDir(path.join(OUTPUT_DIR, 'worker'));
  ensureDir(path.join(OUTPUT_DIR, 'frames'));

  console.log('🚀 Starting LMIABridge Demo Capture');
  console.log(`   Output: ${OUTPUT_DIR}`);
  console.log(`   Target: ${BASE_URL}\n`);

  const browser: Browser = await chromium.launch({
    headless: false,
    slowMo: 60,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
  });

  const page: Page = await context.newPage();

  // ── SEED PRODUCTION DATABASE ──
  console.log('🌱 Seeding production database...');
  // Navigate to homepage first so we have a page context for fetch calls
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Clear via DELETE
  const clearResult = await page.evaluate(async (url: string) => {
    const res = await fetch(`${url}/api/seed/clear`, { method: 'DELETE' });
    return res.json();
  }, BASE_URL);
  console.log('  ✓ Database cleared:', JSON.stringify(clearResult));
  await page.waitForTimeout(1000);

  // Seed via GET
  const seedJson = await page.evaluate(async (url: string) => {
    const res = await fetch(`${url}/api/seed`);
    return res.json();
  }, BASE_URL);
  let seedEmployerId = seedJson.employerId || '';
  let seedApplicationId = seedJson.applications?.[0] || '';
  console.log(`  ✓ Seeded — Employer: ${seedEmployerId}, App: ${seedApplicationId}`);
  await page.waitForTimeout(1000);

  // Set standard pathway on first application
  if (seedApplicationId) {
    await page.evaluate(async (args: { url: string; appId: string }) => {
      await fetch(`${args.url}/api/lmia/${args.appId}/pathway`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pathway: 'standard' }),
      });
    }, { url: BASE_URL, appId: seedApplicationId });
    console.log('  ✓ Standard pathway set');
  }
  console.log('✓ Database seeded\n');

  // ════════════════════════════════════════════════════════════════
  // CAPTURE 1 — HOMEPAGE
  // ════════════════════════════════════════════════════════════════
  console.log('📸 CAPTURE 1 — Homepage');
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await capture(page, 'employer/01_homepage', 'Homepage hero — full view');

  // Capture animated sequence — hero entrance animation
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await captureSequence(page, 'homepage_anim', 12, 150, 'Homepage entrance animation');

  // ════════════════════════════════════════════════════════════════
  // CAPTURE 2 — EMPLOYER FORM
  // ════════════════════════════════════════════════════════════════
  console.log('\n📸 CAPTURE 2 — Employer Form');
  await page.goto(`${BASE_URL}/employer`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await capture(page, 'employer/02_employer_form_empty', 'Employer form — empty state');

  // Fill form fields using actual placeholder values from the codebase
  // Company Name — placeholder="ACME Corp Canada"
  await page.fill('input[placeholder="ACME Corp Canada"]', EMPLOYER.companyName);
  await page.waitForTimeout(400);

  // CRA Business Number — placeholder="898765432RT0001"
  await page.fill('input[placeholder="898765432RT0001"]', EMPLOYER.craBN);
  await page.waitForTimeout(400);

  // Province — select with value="ON" (already default)
  // Industry — select — choose "Legal Technology / SaaS"
  await page.selectOption('select >> nth=1', { label: 'Legal Technology / SaaS' });
  await page.waitForTimeout(400);

  await capture(page, 'employer/03_employer_form_partial', 'Employer form — company details filled');

  // Job Title — placeholder="Software Developer"
  await page.fill('input[placeholder="Software Developer"]', EMPLOYER.jobTitle);
  await page.waitForTimeout(300);

  // NOC Code — placeholder="21232"
  await page.fill('input[placeholder="21232"]', EMPLOYER.nocCode);
  await page.waitForTimeout(300);

  // Offered Wage — placeholder="110000"
  await page.fill('input[placeholder="110000"]', EMPLOYER.offeredWage);
  await page.waitForTimeout(300);

  // Employee Count — placeholder="900"
  await page.fill('input[placeholder="900"]', EMPLOYER.employees);
  await page.waitForTimeout(300);

  // Advertising start date — set to 21 days ago
  const advDate = new Date();
  advDate.setDate(advDate.getDate() - 21);
  const advDateStr = advDate.toISOString().split('T')[0];
  await page.fill('input[type="date"]', advDateStr);
  await page.waitForTimeout(500);

  await capture(page, 'employer/04_employer_form_filled', 'Employer form — fully filled');
  await captureFullPage(page, 'employer/04b_employer_form_filled_full', 'Employer form — full page');

  // ════════════════════════════════════════════════════════════════
  // CAPTURE 3 — WAGE COMPLIANCE CHECK
  // ════════════════════════════════════════════════════════════════
  console.log('\n📸 CAPTURE 3 — Wage Compliance Check');

  try {
    // The wage check section appears once all required fields are filled
    await page.waitForTimeout(1000);

    // Scroll down to make the wage check section visible
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(500);

    // Click the wage check checkbox — use click() not check() because
    // React re-renders the component after state change, removing the checkbox
    const wageCheckbox = page.locator('input[type="checkbox"]').first();
    await wageCheckbox.click({ timeout: 5000 });
    await page.waitForTimeout(1500);

    await capture(page, 'employer/05_wage_check_loading', 'Wage check — TinyFish loading state');

    // Capture animated loading sequence
    await captureSequence(page, 'wage_loading', 8, 800, 'Wage check loading animation');

    // Wait for TinyFish to return wage data (up to 60s)
    console.log('  ⏳ Waiting for TinyFish wage lookup (up to 60s)...');
    try {
      await waitForText(page, 'WAGE COMPLIANT', 60000);
    } catch {
      try {
        await waitForText(page, 'ESDC Wage Data Retrieved', 60000);
      } catch {
        console.log('  ⚠️ Wage result text not found — capturing current state');
      }
    }
    await page.waitForTimeout(1500);

    // Scroll to show full wage result
    await page.evaluate(() => {
      const el = document.querySelector('[class*="border-accent-green"]');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await page.waitForTimeout(800);

    await capture(page, 'employer/06_wage_compliant', 'Wage compliance — green COMPLIANT result');
    await captureSequence(page, 'wage_result', 6, 300, 'Wage compliance result reveal');
  } catch (e) {
    console.log('  ⚠️ Wage check section error:', (e as Error).message?.slice(0, 100));
    await capture(page, 'employer/06_wage_compliant', 'Wage check — current state');
  }

  // ════════════════════════════════════════════════════════════════
  // CAPTURE 4 — TINYFISH EMPLOYER VERIFICATION
  // ════════════════════════════════════════════════════════════════
  console.log('\n📸 CAPTURE 4 — TinyFish Employer Verification');

  try {
    // Scroll to the verify button and click it
    await page.evaluate(() => window.scrollTo(0, 99999));
    await page.waitForTimeout(500);

    // The submit button text changes based on wage status
    const verifyBtn = page.locator('button[type="submit"]');
    const isDisabled = await verifyBtn.isDisabled();
    if (isDisabled) {
      console.log('  ⚠️ Verify button is disabled — wage check may not have completed');
      await capture(page, 'employer/07_verify_btn_disabled', 'Verify button disabled state');
    }
    await verifyBtn.click({ force: true });
    await page.waitForTimeout(2000);

    await capture(page, 'employer/07_tinyfish_verify_start', 'TinyFish verification — agent started');

    // Capture animated sequence of agent running
    await captureSequence(page, 'verify_agent', 15, 1500, 'TinyFish verification in progress');

    // Wait for verification to complete and redirect to dashboard
    console.log('  ⏳ Waiting for employer verification + redirect (up to 120s)...');
    try {
      await page.waitForURL('**/employer/dashboard**', { timeout: 120000 });
    } catch {
      console.log('  ⚠️ Dashboard redirect not detected — capturing current state');
    }
    await page.waitForTimeout(2500);
    await capture(page, 'employer/08_tinyfish_verify_complete', 'TinyFish verification — VERIFIED');
  } catch (e) {
    console.log('  ⚠️ Verification error:', (e as Error).message?.slice(0, 100));
    await capture(page, 'employer/08_tinyfish_verify_complete', 'Verification — current state');
  }

  // ════════════════════════════════════════════════════════════════
  // CAPTURE 5 — EMPLOYER DASHBOARD
  // ════════════════════════════════════════════════════════════════
  console.log('\n📸 CAPTURE 5 — Employer Dashboard');

  // If we didn't redirect, navigate directly
  if (!page.url().includes('/employer/dashboard')) {
    const dashUrl = seedEmployerId
      ? `${BASE_URL}/employer/dashboard?id=${seedEmployerId}`
      : `${BASE_URL}/employer/dashboard`;
    await page.goto(dashUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
  }

  await capture(page, 'employer/09_dashboard_overview', 'Employer dashboard — Matched Workers tab');
  await captureSequence(page, 'dashboard_entrance', 8, 200, 'Dashboard entrance animation');

  // ── Matched Workers Tab (already active) ──
  console.log('  📸 Matched Workers tab');
  await page.waitForTimeout(500);
  await capture(page, 'employer/15_matched_workers', 'Matched Workers — Chidera Obi 96%');

  // ── VIEW COMPREHENSIVE ANALYSIS button ──
  console.log('  📸 Comprehensive Analysis modal');
  try {
    const analysisBtn = page.locator('button:has-text("VIEW COMPREHENSIVE ANALYSIS")').first();
    await analysisBtn.click();
    await page.waitForTimeout(2000);
    await capture(page, 'employer/16_analysis_modal_open', 'Analysis modal — score bars loading');
    await captureSequence(page, 'score_bars', 10, 200, 'Score bars animating to values');
    await page.waitForTimeout(1000);
    await capture(page, 'employer/17_analysis_modal_complete', 'Analysis modal — 96/100 complete');

    // Close modal by clicking the × close button, then fallback to backdrop click
    try {
      const closeBtn = page.locator('button:has-text("×")').first();
      await closeBtn.click({ timeout: 3000 });
    } catch {
      // Fallback: click the backdrop overlay directly via JS
      await page.evaluate(() => {
        const backdrop = document.querySelector('.fixed.inset-0.z-50') as HTMLElement;
        if (backdrop) backdrop.click();
      });
    }
    await page.waitForTimeout(800);
  } catch (e) {
    console.log('  ⚠️ Analysis modal error:', (e as Error).message?.slice(0, 80));
  }

  // ── LMIA Compliance Tab ──
  console.log('  📸 LMIA Compliance tab');
  try {
    // Ensure no modal is blocking — force remove any overlay
    await page.evaluate(() => {
      const overlays = document.querySelectorAll('.fixed.inset-0.z-50');
      overlays.forEach(el => el.remove());
    });
    await page.waitForTimeout(300);

    await page.click('text=LMIA Compliance');
    await page.waitForTimeout(2000);
    await capture(page, 'employer/10_lmia_compliance_tab', 'LMIA Compliance tab — standard pathway');

    // Scroll to show advertising calendar
    await page.evaluate(() => window.scrollTo(0, 300));
    await page.waitForTimeout(800);
    await capture(page, 'employer/12_advertising_calendar', 'Advertising calendar — real dates, week statuses');

    // Scroll down more for the full calendar
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(500);
    await capture(page, 'employer/12b_advertising_calendar_full', 'Advertising calendar — all 4 weeks');
  } catch (e) {
    console.log('  ⚠️ LMIA Compliance tab error:', (e as Error).message?.slice(0, 80));
  }

  // ── Transition Plan Tab ──
  console.log('  📸 Transition Plan tab');
  try {
    await page.click('text=Transition Plan');
    await page.waitForTimeout(1500);
    await capture(page, 'employer/13_transition_plan', 'Transition Plan — 3-year plan');
  } catch (e) {
    console.log('  ⚠️ Transition Plan tab error:', (e as Error).message?.slice(0, 80));
  }

  // ── Agent Activity Tab ──
  console.log('  📸 Agent Activity tab');
  try {
    await page.click('text=Agent Activity');
    await page.waitForTimeout(1500);
    await capture(page, 'employer/14_agent_activity', 'Agent Activity — TinyFish runIds visible');

    // Scroll to show all agent runs
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(500);
    await capture(page, 'employer/14b_agent_activity_full', 'Agent Activity — all runs');
  } catch (e) {
    console.log('  ⚠️ Agent Activity tab error:', (e as Error).message?.slice(0, 80));
  }

  // ════════════════════════════════════════════════════════════════
  // CAPTURE 6 — WORKER JOURNEY
  // ════════════════════════════════════════════════════════════════
  console.log('\n📸 CAPTURE 6 — Worker Journey');

  try {
    await page.goto(`${BASE_URL}/worker`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await capture(page, 'worker/01_worker_landing', 'Worker landing — lookup + registration');

    // ── Test returning worker lookup ──
    console.log('  📸 Returning worker lookup');
    const lookupBtn = page.locator('text=Already have a profile?');
    await lookupBtn.click();
    await page.waitForTimeout(800);
    await capture(page, 'worker/01b_worker_lookup_open', 'Worker lookup — expanded');

    await page.fill('input[placeholder="Enter your email address..."]', WORKER.email);
    await page.waitForTimeout(300);
    await page.click('button:has-text("FIND PROFILE")');
    await page.waitForTimeout(2000);
    await capture(page, 'worker/01c_worker_lookup_found', 'Worker lookup — Chidera Obi found, 1 match');

    // Click VIEW MATCHES to go to matches page
    await page.click('button:has-text("VIEW MATCHES")');
    await page.waitForTimeout(2000);
  } catch (e) {
    console.log('  ⚠️ Worker lookup error:', (e as Error).message?.slice(0, 80));
  }

  // ════════════════════════════════════════════════════════════════
  // CAPTURE 8 — MATCH RESULTS
  // ════════════════════════════════════════════════════════════════
  console.log('\n📸 CAPTURE 8 — Match Results');

  try {
    await page.waitForURL('**/worker/matches**', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);
    await capture(page, 'worker/08_matches_page', 'Match results — Clio card with 96%');

    // Capture score bar animation on reload
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await captureSequence(page, 'score_anim', 15, 150, 'Score bars animating from 0 to values');

    await page.waitForTimeout(1500);
    await capture(page, 'worker/09_match_scores_complete', 'Match scores — all 5 dimensions visible');

    // Capture GTS badge
    try {
      const gtsBadge = page.locator('text=GTS FAST TRACK').first();
      await gtsBadge.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await capture(page, 'worker/10_gts_badge', 'GTS Fast Track badge — Category B 14 days');
    } catch {
      console.log('  ⚠️ GTS badge not visible — capturing current state');
      await capture(page, 'worker/10_gts_badge', 'GTS badge — current state');
    }

    // ── Generate LMIA from Worker Side ──
    console.log('  📸 Generate LMIA from worker side');
    try {
      const lmiaBtn = page.locator('button:has-text("GENERATE LMIA PACKAGE")').first();
      await lmiaBtn.click();
      await page.waitForTimeout(1500);
      await capture(page, 'worker/11_lmia_generating', 'Worker side — LMIA package generating');

      try {
        await waitForText(page, 'Compliance Package Ready', 30000);
      } catch {
        try {
          await waitForText(page, 'Advertising', 30000);
        } catch {
          console.log('  ⚠️ LMIA package text not found');
        }
      }
      await page.waitForTimeout(1500);
      await capture(page, 'worker/12_lmia_package', 'Worker LMIA package — complete');
    } catch {
      console.log('  ⚠️ Generate LMIA button not found — skipping');
    }
  } catch (e) {
    console.log('  ⚠️ Match results error:', (e as Error).message?.slice(0, 80));
  }

  // ── Worker Profile Page ──
  console.log('  📸 Worker Profile');
  try {
    await page.goto(`${BASE_URL}/worker`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    await page.locator('text=Already have a profile?').click();
    await page.waitForTimeout(500);
    await page.fill('input[placeholder="Enter your email address..."]', WORKER.email);
    await page.click('button:has-text("FIND PROFILE")');
    await page.waitForTimeout(2000);

    await page.click('button:has-text("VIEW PROFILE")');
    await page.waitForTimeout(2000);

    await capture(page, 'worker/13_worker_profile', 'Worker profile — Chidera Obi summary');

    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(500);
    await capture(page, 'worker/13b_lmia_progress_tracker', 'LMIA progress tracker — 7 stages');
  } catch (e) {
    console.log('  ⚠️ Worker profile error:', (e as Error).message?.slice(0, 80));
  }

  // ════════════════════════════════════════════════════════════════
  // CAPTURE 7 — NEW WORKER ONBOARDING FLOW (form fill demo)
  // ════════════════════════════════════════════════════════════════
  console.log('\n📸 CAPTURE 7 — Worker Onboarding Form');

  try {
    await page.goto(`${BASE_URL}/worker`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Scroll past the lookup section to the registration form
    await page.evaluate(() => window.scrollTo(0, 300));
    await page.waitForTimeout(500);
    await capture(page, 'worker/02_worker_form_step1', 'Worker form — Step 1 empty');

    // Fill Step 1
    await page.fill('input[placeholder="John Doe"]', WORKER.name);
    await page.waitForTimeout(200);
    await page.fill('input[placeholder="john@example.com"]', WORKER.email);
    await page.waitForTimeout(200);

    // NOC search
    const nocInput = page.locator('input[placeholder="Search NOC (e.g. 21232)"]');
    await nocInput.fill('21232');
    await page.waitForTimeout(800);
    try {
      const nocItem = page.locator('.absolute.z-50 >> text=21232').first();
      await nocItem.click({ timeout: 3000 });
      await page.waitForTimeout(300);
    } catch {
      console.log('  ⚠️ NOC dropdown not clickable — continuing');
    }

    await page.fill('input[placeholder="Nigeria"]', WORKER.country);
    await page.waitForTimeout(200);
    await page.fill('input[placeholder="University of Lagos"]', WORKER.institution);
    await page.waitForTimeout(200);
    await page.fill('input[placeholder="Senior Software Engineer"]', WORKER.jobTitle);
    await page.waitForTimeout(200);
    await page.fill('input[placeholder="Andela"]', WORKER.employer);
    await page.waitForTimeout(200);
    await page.fill('input[placeholder="5"]', WORKER.experience);
    await page.waitForTimeout(200);

    // CLB Slider
    const clbSlider = page.locator('input[type="range"]').first();
    await clbSlider.evaluate((el: HTMLInputElement) => {
      el.value = '11';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForTimeout(500);
    await capture(page, 'worker/03_worker_form_step1_filled', 'Worker Step 1 — filled with CLB 11');

    // Advance to Step 2
    await page.click('button:has-text("NEXT_STEP")');
    await page.waitForTimeout(1500);
    await capture(page, 'worker/04_worker_form_step2', 'Worker form — Step 2');

    // Fill Step 2
    await page.fill('input[placeholder="Software Engineer"]', 'Software Developer');
    await page.waitForTimeout(200);
    await page.fill('input[placeholder="105000"]', WORKER.salary);
    await page.waitForTimeout(200);

    // Skills
    const skillsInput = page.locator('input[placeholder="Type a skill and press Enter"]');
    for (const skill of WORKER.skills) {
      await skillsInput.fill(skill);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(400);
    }
    await page.waitForTimeout(300);

    // Summary
    await page.locator('textarea').first().fill(WORKER.summary);
    await page.waitForTimeout(300);

    // Start date
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 28);
    const dateStr = startDate.toISOString().split('T')[0];
    await page.fill('input[type="date"]', dateStr);
    await page.waitForTimeout(200);

    await capture(page, 'worker/05_worker_form_step2_filled', 'Worker Step 2 — filled with skills');

    // Advance to Step 3
    await page.click('button:has-text("NEXT_STEP")');
    await page.waitForTimeout(1500);
    await capture(page, 'worker/06_worker_form_step3', 'Worker Step 3 — SCAN JOB BANK button');

    // ── TINYFISH JOB BANK SCAN ──
    console.log('\n📸 CAPTURE — TinyFish Job Bank Scan');
    await page.click('button:has-text("SCAN JOB BANK NOW")');
    await page.waitForTimeout(1500);
    await capture(page, 'worker/07_job_scan_started', 'Job Bank scan — TinyFish agent started');

    console.log('  ⏳ Capturing job scan animation (up to 3 minutes)...');
    await captureSequence(page, 'job_scan', 40, 3000, 'TinyFish Job Bank scan — live agent progress');

    try {
      await page.waitForURL('**/worker/matches**', { timeout: 180000 });
    } catch {
      try {
        await waitForText(page, 'complete', 30000);
      } catch {
        console.log('  ⚠️ Job scan completion not detected');
      }
    }
    await page.waitForTimeout(2000);
    await capture(page, 'worker/07b_job_scan_complete', 'Job Bank scan — COMPLETE');

    if (page.url().includes('/worker/matches')) {
      await page.waitForTimeout(1500);
      await capture(page, 'worker/08b_fresh_matches', 'Fresh match results after scan');
    }
  } catch (e) {
    console.log('  ⚠️ Worker onboarding form error:', (e as Error).message?.slice(0, 100));
  }

  // ════════════════════════════════════════════════════════════════
  // CAPTURE 9 — ANTI-FRAUD CHECKER
  // ════════════════════════════════════════════════════════════════
  console.log('\n📸 CAPTURE 9 — Anti-Fraud Checker');

  try {
    await page.goto(`${BASE_URL}/verify`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await capture(page, 'worker/14_verify_page', 'Anti-fraud checker — empty state');

    await page.fill(
      'input[placeholder="Enter employer name or CRA Business Number (e.g., 123456789)"]',
      'Themis Solutions Inc.'
    );
    await page.waitForTimeout(500);
    await capture(page, 'worker/15_verify_input_filled', 'Anti-fraud checker — input filled');

    await page.click('button:has-text("VERIFY LMIA LEGITIMACY")');
    await page.waitForTimeout(2000);
    await capture(page, 'worker/16_verify_tinyfish_running', 'Anti-fraud — TinyFish checking ESDC list');

    await captureSequence(page, 'verify_agent', 10, 2000, 'Anti-fraud TinyFish agent running');

    console.log('  ⏳ Waiting for compliance check (up to 120s)...');
    try {
      await waitForText(page, 'VERIFIED EMPLOYER', 120000);
    } catch {
      try {
        await waitForText(page, 'FLAGGED', 120000);
      } catch {
        console.log('  ⚠️ Verification result not found');
      }
    }
    await page.waitForTimeout(1500);
    await capture(page, 'worker/17_verify_result_clean', 'Anti-fraud result — VERIFIED clean');
  } catch (e) {
    console.log('  ⚠️ Anti-fraud checker error:', (e as Error).message?.slice(0, 100));
  }

  // ── FINAL HOMEPAGE ──
  console.log('\n📸 FINAL — Homepage Close');
  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await capture(page, 'employer/22_homepage_close', 'Homepage — final close shot');
  } catch (e) {
    console.log('  ⚠️ Final homepage error:', (e as Error).message?.slice(0, 80));
  }

  await browser.close();

  // ════════════════════════════════════════════════════════════════
  // GENERATE ASSET MANIFEST
  // ════════════════════════════════════════════════════════════════
  const countPngs = (dir: string): number => {
    if (!fs.existsSync(dir)) return 0;
    return fs.readdirSync(dir).filter((f) => f.endsWith('.png')).length;
  };

  const employerCount = countPngs(path.join(OUTPUT_DIR, 'employer'));
  const workerCount = countPngs(path.join(OUTPUT_DIR, 'worker'));
  const frameCount = countPngs(path.join(OUTPUT_DIR, 'frames'));
  const totalScreenshots = employerCount + workerCount + frameCount;

  const manifest = {
    capturedAt: new Date().toISOString(),
    totalScreenshots,
    assets: {
      employer: fs.existsSync(path.join(OUTPUT_DIR, 'employer'))
        ? fs.readdirSync(path.join(OUTPUT_DIR, 'employer')).filter((f) => f.endsWith('.png')).sort()
        : [],
      worker: fs.existsSync(path.join(OUTPUT_DIR, 'worker'))
        ? fs.readdirSync(path.join(OUTPUT_DIR, 'worker')).filter((f) => f.endsWith('.png')).sort()
        : [],
      frames: `${frameCount} animation frames`,
    },
  };

  fs.writeFileSync(path.join(OUTPUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

  console.log('\n✅ CAPTURE COMPLETE');
  console.log(`📁 Assets saved to: ${OUTPUT_DIR}`);
  console.log(`📊 Total screenshots: ${totalScreenshots}`);
  console.log(`   Employer: ${employerCount}`);
  console.log(`   Worker: ${workerCount}`);
  console.log(`   Frames: ${frameCount}`);
  console.log('\n📋 Asset manifest saved to: demo-assets/manifest.json');
}

runCapture().catch((error) => {
  console.error('❌ Capture failed:', error);
  process.exit(1);
});
