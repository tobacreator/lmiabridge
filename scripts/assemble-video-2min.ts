import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'

let ffmpegPath: string
try {
  ffmpegPath = require('ffmpeg-static') as string
} catch {
  ffmpegPath = 'ffmpeg'
}

const OUTPUT_DIR = path.join(process.cwd(), 'demo-assets')
const FRAMES_DIR = path.join(OUTPUT_DIR, 'frames')
const VIDEO_OUTPUT = path.join(process.cwd(), 'lmiabridge-demo-2min.mp4')

// ALIGNED 2-MINUTE TIMELINE WITH PRECISE NARRATION MAPPING
// Total target: ~120 seconds
// Cumulative timing ensures each screen appears exactly when narration mentions it
const TIMELINE = [
  // ═══ PART 1: THE PROBLEM (0:00-0:25) ═══
  // Cumulative: 0:00-0:25
  { file: 'employer/01_homepage.png', duration: 25, narration: 'Full problem statement section' },
  
  // ═══ PART 2: EMPLOYER JOURNEY (0:25-1:10) ═══
  // Screen 2: Form empty → 0:25-0:27
  { file: 'employer/02_employer_form_empty.png', duration: 2 },
  
  // Screen 3: Form filled → 0:27-0:30
  { file: 'employer/04_employer_form_filled.png', duration: 3 },
  
  // WAGE CHECK BLOCK (0:30-0:42) — CRITICAL: all wage screens must be visible
  // Screen 4: Wage loading → 0:30-0:32
  { file: 'employer/05_wage_check_loading.png', duration: 2 },
  
  // Wage loading animation → 0:32-0:35
  { frames: 'wage_loading', frameDuration: 0.6, frameCount: 5 }, // ~3s
  
  // Screen 5: WAGE COMPLIANT RESULT → 0:35-0:42 (7s - CRITICAL for narration)
  // Narration: "and pulled the ESDC median wage... forty-eight dollars... Clio is offering fifty-two dollars... Above median. Wage compliant."
  { file: 'employer/06_wage_compliant.png', duration: 7 },
  
  // VERIFICATION BLOCK (0:42-0:55)
  // Screen 6: (combine with 07_tinyfish_verify_start)
  // Screen 7: TinyFish running → 0:42-0:50 (8s for agent animation)
  { file: 'employer/07_tinyfish_verify_start.png', duration: 2 },
  { frames: 'verify_agent', frameDuration: 0.75, frameCount: 8 }, // ~6s agent running
  
  // Screen 8: Verify complete → 0:50-0:53
  { file: 'employer/08_tinyfish_verify_complete.png', duration: 3 },
  
  // Screen 9: Dashboard → 0:53-0:56
  { file: 'employer/09_dashboard_overview.png', duration: 3 },
  
  // LMIA TABS BLOCK (0:56-1:10)
  // Screen 10: LMIA Compliance tab → 0:56-0:58
  { file: 'employer/10_lmia_compliance_tab.png', duration: 2 },
  
  // Screen 11: Advertising calendar → 0:58-1:01
  { file: 'employer/12_advertising_calendar.png', duration: 3 },
  
  // Screen 12: Transition plan → 1:01-1:04
  { file: 'employer/13_transition_plan.png', duration: 3 },
  
  // Screen 13: Matched workers → 1:04-1:06
  { file: 'employer/15_matched_workers.png', duration: 2 },
  
  // ANALYSIS MODAL (1:06-1:10)
  // Screen 14: Modal open → 1:06-1:07
  { file: 'employer/16_analysis_modal_open.png', duration: 1 },
  
  // Score bars animation → 1:07-1:08
  { frames: 'score_bars', frameDuration: 0.1, frameCount: 10 }, // ~1s fast animation
  
  // Screen 15: Modal complete with full context → 1:08-1:10
  { file: 'employer/17_analysis_modal_complete.png', duration: 2 },
  
  // ═══ PART 3: WORKER JOURNEY (1:10-1:45) ═══
  // Screen 17: Worker landing → 1:10-1:12
  { file: 'worker/01_worker_landing.png', duration: 2 },
  
  // Screen 18: Worker form step 1 → 1:12-1:14
  { file: 'worker/03_worker_form_step1_filled.png', duration: 2 },
  
  // Screen 19: Worker form step 2 → 1:14-1:16
  { file: 'worker/05_worker_form_step2_filled.png', duration: 2 },
  
  // JOB BANK SCAN HERO MOMENT (1:16-1:26) - 10 seconds for this critical feature
  // Screen 20: Scan started → 1:16-1:17
  { file: 'worker/07_job_scan_started.png', duration: 1 },
  
  // Job scan animation running → 1:17-1:24
  { frames: 'job_scan', frameDuration: 0.35, frameCount: 20 }, // ~7s agent running
  
  // Screen 21: Scan complete → 1:24-1:26
  { file: 'worker/07b_job_scan_complete.png', duration: 2 },
  
  // MATCH RESULTS (1:26-1:36)
  // Screen 22: Match results → 1:26-1:28
  { file: 'worker/08_matches_page.png', duration: 2 },
  
  // Score bars animation → 1:28-1:29
  { frames: 'score_anim', frameDuration: 0.1, frameCount: 10 }, // ~1s fast
  
  // Screen 24: Scores complete → 1:29-1:32
  { file: 'worker/09_match_scores_complete.png', duration: 3 },
  
  // ═══ PART 4: TRUST LAYER (1:32-1:45) ═══
  // Screen 25: Verify empty → 1:32-1:34
  { file: 'worker/14_verify_page.png', duration: 2 },
  
  // Screen 26: Verify filled → 1:34-1:35
  { file: 'worker/15_verify_input_filled.png', duration: 1 },
  
  // Verify agent running → 1:35-1:40
  { file: 'worker/16_verify_tinyfish_running.png', duration: 2 },
  { frames: 'verify_agent', frameDuration: 0.6, frameCount: 5 }, // ~3s
  
  // Screen 28: Verify result → 1:40-1:43
  { file: 'worker/17_verify_result_clean.png', duration: 3 },
  
  // ═══ PART 5: THE CLOSE (1:43-2:00) ═══
  // Screen 29-31: Homepage close sequence (17 seconds total)
  { file: 'employer/22_homepage_close.png', duration: 17, narration: 'Built in 7 days... I am Chidera... $1.2B market...' }
]

async function createConcatFile(timeline: typeof TIMELINE): Promise<string> {
  let concat = 'ffconcat version 1.0\n'
  
  for (const item of timeline) {
    if ('file' in item) {
      const filePath = path.join(OUTPUT_DIR, item.file)
      if (fs.existsSync(filePath)) {
        concat += `file '${filePath}'\nduration ${item.duration}\n`
      } else {
        console.warn(`⚠️  Missing: ${item.file}`)
      }
    } else if ('frames' in item) {
      for (let i = 0; i < item.frameCount; i++) {
        const frameNum = String(i).padStart(3, '0')
        const framePath = path.join(FRAMES_DIR, `${item.frames}_frame_${frameNum}.png`)
        if (fs.existsSync(framePath)) {
          concat += `file '${framePath}'\nduration ${item.frameDuration}\n`
        }
      }
    }
  }
  
  const concatFile = path.join(OUTPUT_DIR, 'concat-2min.txt')
  fs.writeFileSync(concatFile, concat)
  console.log(`✓ Created concat file: ${concatFile}`)
  return concatFile
}

async function assembleVideo(concatFile: string) {
  console.log('\n🎬 ASSEMBLING 2-MINUTE COMPRESSED VIDEO')
  console.log(`📁 Input: ${concatFile}`)
  console.log(`📽️  Output: ${VIDEO_OUTPUT}`)
  
  try {
    try {
      execSync(`"${ffmpegPath}" -version`, { stdio: 'ignore' })
    } catch {
      console.error('❌ FFmpeg not found')
      process.exit(1)
    }
    
    const cmd = [
      `"${ffmpegPath}"`,
      '-f concat',
      '-safe 0',
      `-i "${concatFile}"`,
      '-c:v libx264',
      '-pix_fmt yuv420p',
      '-crf 18',
      '-preset fast',
      '-y',
      `"${VIDEO_OUTPUT}"`
    ].join(' ')
    
    console.log('\n⏳ Encoding...')
    execSync(cmd, { stdio: 'inherit' })
    
    console.log('\n✅ 2-MINUTE VIDEO CREATED')
    const stats = fs.statSync(VIDEO_OUTPUT)
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2)
    console.log(`📽️  ${VIDEO_OUTPUT}`)
    console.log(`📊 Size: ${sizeMB} MB`)
    
  } catch (error) {
    console.error('❌ Video assembly failed:', error)
    process.exit(1)
  }
}

async function main() {
  console.log('════════════════════════════════════════════════════')
  console.log('🎬 2-MINUTE COMPRESSED DEMO VIDEO')
  console.log('════════════════════════════════════════════════════\n')
  
  let totalDuration = 0
  for (const item of TIMELINE) {
    if ('duration' in item) {
      totalDuration += item.duration
    } else if ('frames' in item) {
      totalDuration += item.frameCount * item.frameDuration
    }
  }
  console.log(`⏱️  Total video duration: ${(totalDuration / 60).toFixed(1)} minutes (${Math.round(totalDuration)}s)\n`)
  
  const concatFile = await createConcatFile(TIMELINE)
  await assembleVideo(concatFile)
  
  console.log('\n💬 Now record your voiceover and merge it!')
  console.log('📝 Narration guide: See NARRATION_GUIDE.md')
}

main().catch(console.error)
