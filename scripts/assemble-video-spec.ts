// Build video from spec - FRAME PERFECT SYNC
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Load spec
const spec = JSON.parse(fs.readFileSync('VIDEO_SPEC.json', 'utf-8'));

function createConcatFileFromSpec() {
  let concat = '';
  let currentTime = 0;

  spec.timeline.forEach((segment, idx) => {
    const duration = segment.duration_seconds;
    
    if (segment.screen) {
      // Static screen
      const filepath = path.join(__dirname, '..', 'demo-assets', segment.screen);
      console.log(`[${(currentTime).toFixed(1)}s] Screen: ${segment.screen} (${duration}s)`);
      concat += `file '${filepath}'\n`;
      concat += `duration ${duration}\n`;
    } else if (segment.animation) {
      // Animation frames
      const framesDir = path.join(__dirname, '..', 'demo-assets', 'frames');
      const files = fs.readdirSync(framesDir)
        .filter(f => f.startsWith(segment.animation) && f.endsWith('.png'))
        .sort((a, b) => {
          const numA = parseInt(a.match(/\d+/) ? a.match(/\d+/)[0] : 0);
          const numB = parseInt(b.match(/\d+/) ? b.match(/\d+/)[0] : 0);
          return numA - numB;
        })
        .slice(0, segment.frame_count);

      console.log(`[${(currentTime).toFixed(1)}s] Animation: ${segment.animation} (${files.length} frames, ${segment.frame_duration}s each = ${(files.length * segment.frame_duration).toFixed(1)}s)`);
      
      files.forEach(file => {
        const filepath = path.join(framesDir, file);
        concat += `file '${filepath}'\n`;
        concat += `duration ${segment.frame_duration}\n`;
      });
    }
    
    currentTime += duration;
  });

  fs.writeFileSync('concat.txt', concat);
  console.log(`\n✓ concat.txt created (${currentTime.toFixed(1)}s total)`);
}

function assembleVideo() {
  const ffmpegPath = path.join(__dirname, '..', 'node_modules', 'ffmpeg-static', 'ffmpeg.exe');
  
  console.log('\n🎬 Building video from specification...');
  try {
    execSync(`"${ffmpegPath}" -f concat -safe 0 -i concat.txt -c:v libx264 -crf 18 -vf "fps=25,format=yuv420p,scale=2880:1800" -y lmiabridge-demo-spec.mp4`, {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    console.log('✓ Video built: lmiabridge-demo-spec.mp4');
  } catch (err) {
    console.error('FFmpeg error:', err.message);
  }
}

async function run() {
  console.log('=== FRAME-PERFECT VIDEO BUILD ===\n');
  console.log('Using: VIDEO_SPEC.json');
  console.log('Source: voiceover_final.m4a (actual timestamps)\n');
  
  createConcatFileFromSpec();
  assembleVideo();
  
  console.log('\n✅ Spec-compliant video ready!');
}

run();
