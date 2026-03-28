// Build video from CORRECTED spec
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Load CORRECTED spec
const spec = JSON.parse(fs.readFileSync('VIDEO_SPEC_CORRECTED.json', 'utf-8'));

function createConcatFileFromCorrectedSpec() {
  let concat = '';
  let currentTime = 0;

  spec.timeline.forEach((segment, idx) => {
    const duration = segment.duration;
    const keywords = segment.keywords ? segment.keywords.substring(0, 50) : segment.narration || '';
    
    if (segment.screen_file) {
      // Single static screen
      const filepath = path.join(__dirname, '..', 'demo-assets', segment.screen_file);
      if (!fs.existsSync(filepath)) {
        console.warn(`⚠️  WARNING: File not found: ${segment.screen_file}`);
        return; // Skip missing files
      }
      console.log(`[${currentTime.toFixed(1)}s] Screen: ${segment.screen_file} (${duration}s) - ${keywords}...`);
      concat += `file '${filepath}'\n`;
      concat += `duration ${duration}\n`;
      currentTime += duration;
      
    } else if (segment.animation_set) {
      // Animation frames
      const framesDir = path.join(__dirname, '..', 'demo-assets', 'frames');
      if (!fs.existsSync(framesDir)) {
        console.warn(`⚠️  Frames directory not found: ${framesDir}`);
        return;
      }

      const files = fs.readdirSync(framesDir)
        .filter(f => f.startsWith(segment.animation_set) && f.endsWith('.png'))
        .sort((a, b) => {
          const numA = parseInt(a.match(/\d+/) ? a.match(/\d+/)[0] : 0);
          const numB = parseInt(b.match(/\d+/) ? b.match(/\d+/)[0] : 0);
          return numA - numB;
        })
        .slice(0, segment.frame_count);

      const totalAnimTime = (files.length * segment.frame_duration).toFixed(2);
      console.log(`[${currentTime.toFixed(1)}s] ANIMATION: ${segment.animation_set} (${files.length} frames @ ${segment.frame_duration}s ea = ${totalAnimTime}s) - ${keywords}...`);
      
      files.forEach(file => {
        const filepath = path.join(framesDir, file);
        concat += `file '${filepath}'\n`;
        concat += `duration ${segment.frame_duration}\n`;
      });
      currentTime += parseFloat(totalAnimTime);
      
    } else if (segment.multi_screen) {
      // Multiple screens in one segment
      console.log(`[${currentTime.toFixed(1)}s] MULTI-SCREEN SEQUENCE: ${keywords}...`);
      segment.multi_screen.forEach((screen, idx) => {
        if (screen.file) {
          const filepath = path.join(__dirname, '..', 'demo-assets', screen.file);
          if (!fs.existsSync(filepath)) {
            console.warn(`⚠️  WARNING: File not found: ${screen.file}`);
            return;
          }
          console.log(`  └─ [${currentTime.toFixed(1)}s] ${screen.file} (${screen.hold}s)`);
          concat += `file '${filepath}'\n`;
          concat += `duration ${screen.hold}\n`;
          currentTime += screen.hold;
        }
      });
    }
  });

  fs.writeFileSync('concat.txt', concat);
  console.log(`\n✓ concat.txt created (${currentTime.toFixed(1)}s total)\n`);
}

function assembleVideo() {
  const ffmpegPath = path.join(__dirname, '..', 'node_modules', 'ffmpeg-static', 'ffmpeg.exe');
  
  console.log('🎬 Building CORRECTED video from specification...\n');
  try {
    execSync(`"${ffmpegPath}" -f concat -safe 0 -i concat.txt -c:v libx264 -crf 18 -vf "fps=25,format=yuv420p,scale=2880:1800" -y lmiabridge-demo-corrected.mp4`, {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    console.log('\n✓ Video built: lmiabridge-demo-corrected.mp4');
  } catch (err) {
    console.error('FFmpeg error:', err.message);
  }
}

async function run() {
  console.log('=== BUILDING CORRECTED VIDEO ===\n');
  console.log('Using: VIDEO_SPEC_CORRECTED.json');
  console.log('Match: Keyword-to-screen mapping\n');
  
  createConcatFileFromCorrectedSpec();
  assembleVideo();
  
  console.log('\n✅ Corrected video ready!');
}

run();
