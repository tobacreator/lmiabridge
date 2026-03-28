// Extended video assembly: 3 minutes (180 seconds)
// Synced to 3m 17s narration with 1.09x gentle speedup

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TIMELINE = [
  // PART 1: PROBLEM (0:00 — 0:25)
  { file: 'employer/01_homepage.png', duration: 25 },

  // PART 2: EMPLOYER JOURNEY (0:25 — 1:35)
  { file: 'employer/02_employer_form_empty.png', duration: 3 },
  { file: 'employer/04_employer_form_filled.png', duration: 4 },
  { file: 'employer/05_wage_check_loading.png', duration: 3 },
  { frames: 'wage_loading', frameDuration: 0.6, frameCount: 8 }, // Extended: 5 → 8 frames (4.8s)
  { file: 'employer/06_wage_compliant.png', duration: 10 }, // Extended: 7 → 10 seconds (critical moment)
  { file: 'employer/07_tinyfish_verify_start.png', duration: 3 },
  { frames: 'verify', frameDuration: 0.5, frameCount: 12 }, // Extended: 10 → 12 frames (6s)
  { file: 'employer/08_tinyfish_verify_complete.png', duration: 4 },
  { file: 'employer/09_dashboard_overview.png', duration: 4 },
  { file: 'employer/10_lmia_compliance_tab.png', duration: 3 },
  { file: 'employer/12_advertising_calendar.png', duration: 4 },
  { file: 'employer/13_transition_plan.png', duration: 4 },
  { file: 'employer/15_matched_workers.png', duration: 3 },
  { file: 'employer/16_analysis_modal_open.png', duration: 2 },
  { frames: 'score_bars_1', frameDuration: 1.0, frameCount: 5 }, // Score animation
  { file: 'employer/17_analysis_modal_complete.png', duration: 5 },

  // PART 3: WORKER JOURNEY (1:35 — 2:35)
  { file: 'worker/01_worker_landing.png', duration: 3 },
  { file: 'worker/03_worker_form_step1_filled.png', duration: 3 },
  { file: 'worker/05_worker_form_step2_filled.png', duration: 3 },
  { file: 'worker/07_job_scan_started.png', duration: 2 },
  { frames: 'job_scan', frameDuration: 0.4, frameCount: 25 }, // Extended hero moment: 20 → 25 frames (10s)
  { file: 'worker/07b_job_scan_complete.png', duration: 3 },
  { file: 'worker/08_matches_page.png', duration: 3 },
  { frames: 'score_bars_2', frameDuration: 1.0, frameCount: 5 }, // Score animation
  { file: 'worker/09_match_scores_complete.png', duration: 5 },

  // PART 4: TRUST LAYER (2:35 — 2:55)
  { file: 'worker/14_verify_page.png', duration: 2 },
  { file: 'worker/15_verify_input_filled.png', duration: 2 },
  { file: 'worker/16_verify_tinyfish_running.png', duration: 3 },
  { frames: 'verify_agent', frameDuration: 0.5, frameCount: 8 }, // 4s animation
  { file: 'worker/17_verify_result_clean.png', duration: 5 },

  // PART 5: THE CLOSE (2:55 — 3:00)
  { file: 'employer/22_homepage_close.png', duration: 5 },
];

function createConcatFile() {
  let concat = '';
  TIMELINE.forEach((item, idx) => {
    if (item.file) {
      const filepath = path.join(__dirname, '..', 'demo-assets', item.file);
      concat += `file '${filepath}'\n`;
      concat += `duration ${item.duration}\n`;
    } else if (item.frames) {
      const framesDir = path.join(__dirname, '..', 'demo-assets', 'frames');
      const files = fs.readdirSync(framesDir)
        .filter(f => f.startsWith(item.frames) && f.endsWith('.png'))
        .sort((a, b) => {
          const numA = parseInt(a.match(/\d+/)[0]);
          const numB = parseInt(b.match(/\d+/)[0]);
          return numA - numB;
        });
      
      files.forEach(file => {
        const filepath = path.join(framesDir, file);
        concat += `file '${filepath}'\n`;
        concat += `duration ${item.frameDuration}\n`;
      });
    }
  });
  
  fs.writeFileSync('concat.txt', concat);
  console.log('✓ concat.txt created');
}

function assembleVideo() {
  const ffmpegPath = path.join(__dirname, '..', 'node_modules', 'ffmpeg-static', 'ffmpeg.exe');
  
  try {
    execSync(`"${ffmpegPath}" -f concat -safe 0 -i concat.txt -c:v libx264 -crf 18 -vf "fps=25,format=yuv420p,scale=2880:1800" -y lmiabridge-demo-3min.mp4`, {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    console.log('✓ Video assembled: lmiabridge-demo-3min.mp4');
  } catch (err) {
    console.error('FFmpeg error:', err.message);
  }
}

async function runAssembly() {
  console.log('Building 3-minute demo video...\n');
  createConcatFile();
  assembleVideo();
  console.log('\n✅ Done! Created lmiabridge-demo-3min.mp4');
}

runAssembly();
