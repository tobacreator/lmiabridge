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
const VIDEO_OUTPUT = path.join(process.cwd(), 'lmiabridge-demo.mp4')

// Screenshot timing in seconds
const TIMELINE = [
  // ── HOMEPAGE & EMPLOYER FLOW ──
  { file: 'employer/01_homepage.png', duration: 8 },
  { file: 'employer/02_employer_form_empty.png', duration: 3 },
  { file: 'employer/03_employer_form_partial.png', duration: 3 },
  { file: 'employer/04_employer_form_filled.png', duration: 3 },
  
  // ── WAGE CHECK ANIMATION ──
  { frames: 'wage_loading', frameDuration: 0.8, frameCount: 8 }, // ~6.4s with speed
  { file: 'employer/06_wage_compliant.png', duration: 5 },
  
  // ── TINYFISH VERIFICATION ANIMATION ──
  { file: 'employer/07_tinyfish_verify_start.png', duration: 2 },
  { frames: 'verify_agent', frameDuration: 0.8, frameCount: 15 }, // Speed up from 1.5s to 0.8s = ~12s
  { file: 'employer/08_tinyfish_verify_complete.png', duration: 3 },
  
  // ── EMPLOYER DASHBOARD ──
  { frames: 'dashboard_entrance', frameDuration: 0.15, frameCount: 8 }, // Fast entrance
  { file: 'employer/09_dashboard_overview.png', duration: 4 },
  { file: 'employer/10_lmia_compliance_tab.png', duration: 4 },
  { file: 'employer/12_advertising_calendar.png', duration: 4 },
  { file: 'employer/13_transition_plan.png', duration: 4 },
  { file: 'employer/14_agent_activity.png', duration: 3 },
  { file: 'employer/15_matched_workers.png', duration: 4 },
  
  // ── ANALYSIS MODAL WITH ANIMATION ──
  { file: 'employer/16_analysis_modal_open.png', duration: 2 },
  { frames: 'score_bars', frameDuration: 0.2, frameCount: 10 }, // ~2s
  { file: 'employer/17_analysis_modal_complete.png', duration: 5 },
  
  // ── LMIA PACKAGE ──
  { file: 'employer/19_lmia_package_complete.png', duration: 6 },
  { file: 'employer/20_what_happens_next.png', duration: 8 },
  
  // ── WORKER LANDING & FORMS ──
  { file: 'worker/01_worker_landing.png', duration: 4 },
  { file: 'worker/02_worker_form_step1.png', duration: 3 },
  { file: 'worker/03_worker_form_step1_filled.png', duration: 3 },
  { file: 'worker/04_worker_form_step2.png', duration: 3 },
  { file: 'worker/05_worker_form_step2_filled.png', duration: 3 },
  { file: 'worker/06_worker_form_step3.png', duration: 3 },
  
  // ── JOB BANK SCAN (HERO ANIMATION) ──
  { file: 'worker/07_job_scan_started.png', duration: 2 },
  { frames: 'job_scan', frameDuration: 0.3, frameCount: 40 }, // Speed up 40 frames 3s each → 0.3s each = ~12s
  { file: 'worker/07b_job_scan_complete.png', duration: 3 },
  
  // ── MATCH RESULTS WITH ANIMATION ──
  { file: 'worker/08_matches_page.png', duration: 3 },
  { frames: 'score_anim', frameDuration: 0.15, frameCount: 15 }, // Fast score reveal ~2.25s
  { file: 'worker/09_match_scores_complete.png', duration: 6 },
  { file: 'worker/10_gts_badge.png', duration: 4 },
  
  // ── WORKER LMIA PACKAGE ──
  { file: 'worker/11_lmia_generating.png', duration: 2 },
  { file: 'worker/12_lmia_package.png', duration: 6 },
  { file: 'worker/13_what_happens_next.png', duration: 8 },
  
  // ── VERIFICATION / ANTI-FRAUD ──
  { file: 'worker/14_verify_page.png', duration: 3 },
  { file: 'worker/15_verify_input_filled.png', duration: 3 },
  { file: 'worker/16_verify_tinyfish_running.png', duration: 3 },
  { file: 'worker/17_verify_result_clean.png', duration: 4 },
  
  // ── CLOSING ──
  { file: 'employer/22_homepage_close.png', duration: 6 }
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
      // Add each frame in sequence
      for (let i = 0; i < item.frameCount; i++) {
        const frameNum = String(i).padStart(3, '0')
        const framePath = path.join(FRAMES_DIR, `${item.frames}_frame_${frameNum}.png`)
        if (fs.existsSync(framePath)) {
          concat += `file '${framePath}'\nduration ${item.frameDuration}\n`
        }
      }
    }
  }
  
  const concatFile = path.join(OUTPUT_DIR, 'concat.txt')
  fs.writeFileSync(concatFile, concat)
  console.log(`✓ Created concat file: ${concatFile}`)
  return concatFile
}

async function assembleVideo(concatFile: string) {
  console.log('\n🎬 Assembling video from screenshots...')
  console.log(`📁 Input: ${concatFile}`)
  console.log(`📽️  Output: ${VIDEO_OUTPUT}`)
  
  try {
    // Check if ffmpeg is available
    try {
      execSync(`"${ffmpegPath}" -version`, { stdio: 'ignore' })
    } catch {
      console.error('❌ FFmpeg not found')
      process.exit(1)
    }
    
    // Build FFmpeg command
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
    
    console.log('\n⏳ Encoding... (this may take 1-3 minutes)')
    console.log(`   Command: ${cmd}\n`)
    
    execSync(cmd, { stdio: 'inherit' })
    
    console.log('\n✅ VIDEO CREATED SUCCESSFULLY')
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
  console.log('🎬 LMIABRIDGE DEMO VIDEO ASSEMBLY')
  console.log('════════════════════════════════════════════════════\n')
  
  console.log(`📁 Demo assets: ${OUTPUT_DIR}`)
  console.log(`📸 Total timeline items: ${TIMELINE.length}`)
  
  // Calculate total duration
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
  
  console.log('\n✨ Ready for VC pitch!')
  console.log('💡 Tip: Combine with voiceover using:')
  console.log('   ffmpeg -i lmiabridge-demo.mp4 -i voiceover.mp3 -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 lmiabridge-demo-with-audio.mp4')
}

main().catch(console.error)
