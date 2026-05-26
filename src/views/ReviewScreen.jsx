import React, { useState, useEffect, useRef } from 'react';

import './ReviewScreen.css';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

const FILTERS = {
  None: 'none',
  Retro: 'sepia(60%) contrast(110%)',
  Disposable: 'saturate(130%) hue-rotate(10deg)',
  Vinyl: 'grayscale(30%) contrast(120%)',
  Crisp: 'contrast(130%) brightness(105%)',
  Mellow: 'brightness(110%) saturate(80%)',
  Cassette: 'sepia(30%) contrast(90%)',
  Insta: 'saturate(150%) brightness(105%)',
  Autumn: 'sepia(40%) hue-rotate(330deg)'
};

const EFFECTS = ['None', 'Fish Eye', 'Chroma', 'Smear', 'Slow Zoom', 'Fast Zoom', 'Film Frame', 'Film Grain'];

const FILM_GRAIN_FREQUENCIES = [
  '0.63 0.63', '0.64 0.64', '0.65 0.65', '0.66 0.66', '0.67 0.67',
  '0.64 0.64', '0.65 0.65', '0.66 0.66', '0.65 0.65', '0.66 0.66'
];

function FilmFrameOverlay({ frameIndex }) {
  const renderPerforations = () => (
    Array.from({ length: 3 }).map((_, i) => (
      <div
        key={i}
        style={{
          width: '12px',
          height: '6px',
          backgroundColor: '#2a1f0e',
          borderRadius: '2px',
          margin: '0 auto 20px auto'
        }}
      />
    ))
  );

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      pointerEvents: 'none',
      zIndex: 2,
      display: 'flex',
      justifyContent: 'space-between',
      width: '100%',
      height: '100%',
      boxSizing: 'border-box'
    }}>
      {/* Left strip */}
      <div style={{
        position: 'relative',
        width: '22px',
        height: '100%',
        backgroundColor: '#1a1008',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '10px 0'
      }}>
        {/* Top Perforations */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {renderPerforations()}
        </div>

        {/* Golden text & number */}
        <span style={{
          position: 'absolute',
          top: '40%',
          left: '50%',
          transform: 'translate(-50%, -50%) rotate(180deg)',
          color: '#c8a96e',
          fontSize: '9px',
          letterSpacing: '2px',
          fontFamily: '"Courier New", monospace',
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          whiteSpace: 'nowrap'
        }}>
          KODAK PORTRA 400
        </span>

        <span style={{
          position: 'absolute',
          bottom: '75px',
          left: '50%',
          transform: 'translateX(-50%) rotate(180deg)',
          color: '#c8a96e',
          fontSize: '9px',
          fontFamily: '"Courier New", monospace',
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          whiteSpace: 'nowrap'
        }}>
          43
        </span>

        {/* Bottom Perforations */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {renderPerforations()}
        </div>
      </div>

      {/* Right strip */}
      <div style={{
        position: 'relative',
        width: '22px',
        height: '100%',
        backgroundColor: '#1a1008',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '10px 0'
      }}>
        {/* Top Perforations */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {renderPerforations()}
        </div>

        {/* Golden text & number */}
        <span style={{
          position: 'absolute',
          top: '40%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#c8a96e',
          fontSize: '9px',
          letterSpacing: '2px',
          fontFamily: '"Courier New", monospace',
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          whiteSpace: 'nowrap'
        }}>
          KODAK PORTRA 400
        </span>

        <span style={{
          position: 'absolute',
          bottom: '75px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#c8a96e',
          fontSize: '9px',
          fontFamily: '"Courier New", monospace',
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          whiteSpace: 'nowrap'
        }}>
          2
        </span>

        {/* Bottom Perforations */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {renderPerforations()}
        </div>
      </div>
    </div>
  );
}

function FilmGrainOverlay() {
  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      pointerEvents: 'none',
      zIndex: 3,
      overflow: 'hidden',
      width: '100%',
      height: '100%'
    }}>
      <svg style={{ width: '100%', height: '100%', opacity: 0.35 }}>
        <rect width="100%" height="100%" filter="url(#global-film-grain-filter)" />
      </svg>
    </div>
  );
}

function CanvasEffectPreview({ src, effect, filter = 'None', maxDim = 320, className, style }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    img.onload = () => {
      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      canvas.width = w;
      canvas.height = h;
      ctx.clearRect(0, 0, w, h);

      if (effect === 'None' || effect === 'Slow Zoom' || effect === 'Fast Zoom' || effect === 'Film Frame' || effect === 'Film Grain') {
        ctx.drawImage(img, 0, 0, w, h);
      } else if (effect === 'Fish Eye') {
        ctx.drawImage(img, 0, 0, w, h);
        try {
          const imgData = ctx.getImageData(0, 0, w, h);
          const srcPix = imgData.data;
          const outData = ctx.createImageData(w, h);
          const outPix = outData.data;
          const centerX = w / 2;
          const centerY = h / 2;
          const maxRadius = Math.min(centerX, centerY);

          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              const dx = x - centerX;
              const dy = y - centerY;
              const r = Math.sqrt(dx * dx + dy * dy);
              if (r < maxRadius) {
                const normR = r / maxRadius;
                const distortR = Math.sin(normR * Math.PI / 2) * maxRadius;
                const theta = Math.atan2(dy, dx);
                const sx = Math.round(centerX + distortR * Math.cos(theta));
                const sy = Math.round(centerY + distortR * Math.sin(theta));
                if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
                  const destIdx = (y * w + x) * 4;
                  const srcIdx = (sy * w + sx) * 4;
                  outPix[destIdx] = srcPix[srcIdx];
                  outPix[destIdx + 1] = srcPix[srcIdx + 1];
                  outPix[destIdx + 2] = srcPix[srcIdx + 2];
                  outPix[destIdx + 3] = srcPix[srcIdx + 3];
                }
              } else {
                const idx = (y * w + x) * 4;
                outPix[idx] = srcPix[idx];
                outPix[idx + 1] = srcPix[idx + 1];
                outPix[idx + 2] = srcPix[idx + 2];
                outPix[idx + 3] = srcPix[idx + 3];
              }
            }
          }
          ctx.putImageData(outData, 0, 0);
        } catch (e) {
          console.error(e);
        }
      } else if (effect === 'Chroma') {
        ctx.drawImage(img, 0, 0, w, h);
        try {
          const imgData = ctx.getImageData(0, 0, w, h);
          const srcPix = imgData.data;
          const outData = ctx.createImageData(w, h);
          const outPix = outData.data;
          const offset = Math.round(w * 0.02);

          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              const idx = (y * w + x) * 4;
              const rx = Math.max(0, x - offset);
              const rIdx = (y * w + rx) * 4;
              const gIdx = idx;
              const bx = Math.min(w - 1, x + offset);
              const bIdx = (y * w + bx) * 4;

              outPix[idx] = srcPix[rIdx];
              outPix[idx + 1] = srcPix[gIdx + 1];
              outPix[idx + 2] = srcPix[bIdx + 2];
              outPix[idx + 3] = srcPix[idx + 3];
            }
          }
          ctx.putImageData(outData, 0, 0);
        } catch (e) {
          console.error(e);
        }
      } else if (effect === 'Smear') {
        ctx.clearRect(0, 0, w, h);
        const steps = 6;
        const maxOffset = Math.round(w * 0.05);
        ctx.globalAlpha = 1.0 / steps;
        for (let i = 0; i < steps; i++) {
          const offset = (i - (steps - 1) / 2) * (maxOffset / steps);
          ctx.drawImage(img, offset, 0, w, h);
        }
        ctx.globalAlpha = 1.0;
      }
    };
  }, [src, effect, maxDim]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        filter: FILTERS[filter] || 'none',
        ...style
      }}
    />
  );
}

  const ReviewScreen = ({ frames = [], onBack }) => {

  const [showSpeedSheet, setShowSpeedSheet] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('None');
  const [selectedEffect, setSelectedEffect] = useState('None');
  const [showEffectsFiltersSheet, setShowEffectsFiltersSheet] = useState(false);
  const [effectsFiltersTab, setEffectsFiltersTab] = useState('Effect'); // 'Effect' or 'Filter'
  const [tempFilter, setTempFilter] = useState('None');
  const [tempEffect, setTempEffect] = useState('None');
  const [reorderingIndex, setReorderingIndex] = useState(null);
  const [grainSeed, setGrainSeed] = useState(0);
  const playIntervalRef = useRef(null);
  const fileInputRef = useRef(null);
  const longPressTimeoutRef = useRef(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioURL, setAudioURL] = useState('');

  // Music sheet state
  const [selectedAudio, setSelectedAudio] = useState(null);
  const [audioStartTime, setAudioStartTime] = useState(0);
  const [audioEndTime, setAudioEndTime] = useState(0);
  const [showMusicSheet, setShowMusicSheet] = useState(false);
  const audioInputRef = useRef(null);
  const audioRef = useRef(null);
  // New persistent Audio instance
  const audioInstanceRef = useRef(null);
  // Store object URL for cleanup
  const audioObjectURLRef = useRef(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioError, setAudioError] = useState('');
const [orderedFrames, setOrderedFrames] = useState(frames);
const [currentIndex, setCurrentIndex] = useState(0);
const [isPlaying, setIsPlaying] = useState(false);
const [speed, setSpeed] = useState(1);
const [isExporting, setIsExporting] = useState(false);
const [exportProgress, setExportProgress] = useState(0);
const [showToast, setShowToast] = useState(false);
const [toastMessage, setToastMessage] = useState('');




  // Sync orderedFrames when frames prop changes
  useEffect(() => {
    setOrderedFrames(frames);
  }, [frames]);

  // Animate Film Grain base frequency seed
  useEffect(() => {
    const isGrainActive = selectedEffect === 'Film Grain' || (showEffectsFiltersSheet && tempEffect === 'Film Grain');
    if (isGrainActive) {
      const interval = setInterval(() => {
        setGrainSeed(prev => (prev + 1) % 10);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [selectedEffect, showEffectsFiltersSheet, tempEffect]);

  const handleFileChange = e => {
  const files = Array.from(e.target.files);
  setOrderedFrames(prev => {
    const space = 10 - prev.length;
    if (space <= 0) return prev;
    const newUrls = files.slice(0, space).map(f => URL.createObjectURL(f));
    return [...prev, ...newUrls];
  });
  // Reset input value so same file can be selected again
  e.target.value = '';
};

// Audio file selection handler
const handleAudioSelect = e => {
  try {
    const file = e.target.files[0];
    if (!file) return;
    // Validate file type for audio
    const allowedExt = ['mp3', 'm4a', 'aac', 'wav', 'ogg'];
    const mimeValid = file.type && file.type.startsWith('audio/');
    const ext = file.name.split('.').pop().toLowerCase();
    const extValid = allowedExt.includes(ext);
    if (!mimeValid && !extValid) {
      setAudioError('Please select an audio file (MP3, M4A, AAC, WAV)');
      e.target.value = '';
      return;
    }
    setAudioError('');
    setSelectedAudio(file);
    const url = URL.createObjectURL(file);
    setAudioURL(url);
    // Create persistent Audio instance
    audioInstanceRef.current = new Audio(url);
    // Store object URL for later revocation
    audioObjectURLRef.current = url;
    // Reset trim times
    setAudioStartTime(0);
    setAudioEndTime(0);
    // Load duration using the new instance
    audioInstanceRef.current.addEventListener('loadedmetadata', () => {
      setAudioDuration(audioInstanceRef.current.duration);
      setAudioEndTime(audioInstanceRef.current.duration);
    });
  } catch (err) {
    console.error(err);
    setAudioError('Error loading audio file');
    e.target.value = '';
  }
};

// Helper to format seconds to m:ss
const formatTime = secs => {
  const minutes = Math.floor(secs / 60);
  const seconds = Math.round(secs % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// Trim range handlers
const handleTrimStartChange = e => {
  const val = parseFloat(e.target.value);
  if (val <= audioEndTime) setAudioStartTime(val);
};

const handleTrimEndChange = e => {
  const val = parseFloat(e.target.value);
  if (val >= audioStartTime) setAudioEndTime(val);
};

// Playback control for audio preview
useEffect(() => {
  if (!audioInstanceRef.current) return;
  if (isAudioPlaying) {
    // Seek to trim start and play
    audioInstanceRef.current.currentTime = audioStartTime;
    audioInstanceRef.current.play();
    const handleTimeUpdate = () => {
      if (audioInstanceRef.current.currentTime >= audioEndTime) {
        audioInstanceRef.current.pause();
        audioInstanceRef.current.currentTime = audioStartTime;
        setIsAudioPlaying(false);
      }
    };
    audioInstanceRef.current.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      audioInstanceRef.current && audioInstanceRef.current.removeEventListener('timeupdate', handleTimeUpdate);
      audioInstanceRef.current && audioInstanceRef.current.pause();
    };
  } else {
    audioInstanceRef.current && audioInstanceRef.current.pause();
  }
}, [isAudioPlaying, audioStartTime, audioEndTime]);

const toggleAudioPlay = () => {
  setIsAudioPlaying(p => !p);
};

// Remove selected audio
const removeAudio = () => {
  setSelectedAudio(null);
  setAudioURL('');
  // Revoke object URL and clear instance
  if (audioObjectURLRef.current) {
    URL.revokeObjectURL(audioObjectURLRef.current);
    audioObjectURLRef.current = null;
  }
  if (audioInstanceRef.current) {
    audioInstanceRef.current.pause();
    audioInstanceRef.current = null;
  }
  setAudioDuration(0);
  setAudioStartTime(0);
  setAudioEndTime(0);
  setIsAudioPlaying(false);
};

// Ensure playback stops when sheet is closed
useEffect(() => {
  if (!showMusicSheet && audioRef.current) {
    audioRef.current.pause();
    setIsAudioPlaying(false);
  }
}, [showMusicSheet]);

  // Ensure speed state resets when frames length changes (optional)
  useEffect(() => {
    if (orderedFrames.length === 0) setSpeed(1);
  }, [orderedFrames.length]);

  const animationRef = useRef(null);
  const startTimeRef = useRef(null);
  const [scrubberProgress, setScrubberProgress] = useState(0);

  const togglePlay = () => {
    setIsPlaying(prev => {
      const newVal = !prev;
      setIsAudioPlaying(newVal);
      return newVal;
    });
  };

  // Effect to handle playback start/stop with variable speed per frame
  useEffect(() => {
    if (isPlaying && orderedFrames.length > 0) {
      const existingProgress = scrubberProgress;
      const totalDurationMs = orderedFrames.length * speed * 1000;
      const start = performance.now() - existingProgress * totalDurationMs;
      startTimeRef.current = start;

      const animate = (timestamp) => {
        const elapsed = timestamp - startTimeRef.current;
        const progress = Math.min(elapsed / totalDurationMs, 1);
        setScrubberProgress(progress);
        const frameDuration = speed * 1000; // ms per frame
        const idx = Math.min(Math.floor(elapsed / frameDuration), orderedFrames.length - 1);
        setCurrentIndex(idx);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          // Playback finished – reset to start state
          setIsPlaying(false);
          setCurrentIndex(0);
          setScrubberProgress(0);
          // Ensure audio stops and resets
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = audioStartTime;
            setIsAudioPlaying(false);
          }
        }
      };
      animationRef.current = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(animationRef.current);
    }
    // Cleanup on unmount or when dependencies change
    return () => cancelAnimationFrame(animationRef.current);
  }, [isPlaying, orderedFrames.length, speed, audioStartTime]);

  const handleScrubberChange = e => {
    const newVal = Number(e.target.value); // seconds (0 - totalDurationSec)
    const totalDurationSec = orderedFrames.length * speed;
    const newProgress = totalDurationSec ? newVal / totalDurationSec : 0;
    setScrubberProgress(newProgress);
    // Adjust start time so animation continues correctly
    const elapsed = newProgress * totalDurationSec * 1000;
    startTimeRef.current = performance.now() - elapsed;
    // Update current index based on new progress
    if (orderedFrames.length > 0) {
      const frameDuration = speed * 1000;
      const idx = Math.min(Math.floor(elapsed / frameDuration), orderedFrames.length - 1);
      setCurrentIndex(idx);
    }
  };


  // Ensure currentIndex stays within bounds when frames are deleted
  useEffect(() => {
    if (currentIndex >= orderedFrames.length && orderedFrames.length > 0) {
      setCurrentIndex(orderedFrames.length - 1);
    }
  }, [orderedFrames.length, currentIndex]);

  // Touch‑drag reorder handlers
  const touchDataRef = useRef({});
  const handleTouchStart = (e, idx) => {
    const touch = e.touches[0];
    touchDataRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startIdx: idx,
      activated: false,
    };

    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
    }

    longPressTimeoutRef.current = setTimeout(() => {
      touchDataRef.current.activated = true;
      setReorderingIndex(idx);
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 500);
  };

  const handleTouchMove = e => {
    const touch = e.touches[0];
    const { startX, startIdx, activated } = touchDataRef.current;

    if (!activated) {
      const drift = Math.abs(touch.clientX - startX);
      if (drift >= 10) {
        if (longPressTimeoutRef.current) {
          clearTimeout(longPressTimeoutRef.current);
          longPressTimeoutRef.current = null;
        }
      }
      return;
    }

    // Prevent default scrolling on mobile when actively dragging
    if (e.cancelable) {
      e.preventDefault();
    }

    const deltaX = touch.clientX - startX;
    const threshold = 40; // pixels to trigger reorder
    if (Math.abs(deltaX) > threshold) {
      const newIdx = startIdx + (deltaX > 0 ? 1 : -1);
      if (newIdx >= 0 && newIdx < orderedFrames.length) {
        const newOrder = [...orderedFrames];
        const [moved] = newOrder.splice(startIdx, 1);
        newOrder.splice(newIdx, 0, moved);
        setOrderedFrames(newOrder);
        setCurrentIndex(newIdx);
        setReorderingIndex(newIdx);

        // Reset starting point
        touchDataRef.current.startX = touch.clientX;
        touchDataRef.current.startIdx = newIdx;
      }
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
    setReorderingIndex(null);
    touchDataRef.current = {};
  };

  const handleDelete = idx => {
    setOrderedFrames(prev => {
      const newFrames = prev.filter((_, i) => i !== idx);
      setCurrentIndex(oldIdx => {
        if (newFrames.length === 0) {
          onBack();
          return 0;
        }
        if (idx === oldIdx) {
          return Math.max(0, oldIdx - 1);
        }
        if (idx < oldIdx) {
          return oldIdx - 1;
        }
        return oldIdx;
      });
      return newFrames;
    });
  };

  // UI action placeholders
  const placeholderAction = label => () => alert(`${label} – Coming soon`);
const exportVideo = async () => {
  if (orderedFrames.length === 0) return;
  // Reset export state
  setIsExporting(true);
  setExportProgress(0);
  try {
    // Step 1: Process frames to JPEG blobs
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    const frameFiles = [];
    const totalFrames = orderedFrames.length;
    let processedCount = 0;
    const applyEffect = (effect) => {
      // Reuse same logic as CanvasEffectPreview for effects
      if (effect === 'Fish Eye') {
        // Fish Eye effect
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const srcPix = imgData.data;
        const outData = ctx.createImageData(canvas.width, canvas.height);
        const outPix = outData.data;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const maxRadius = Math.min(centerX, centerY);
        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const dx = x - centerX;
            const dy = y - centerY;
            const r = Math.sqrt(dx * dx + dy * dy);
            let sx = x, sy = y;
            if (r < maxRadius) {
              const normR = r / maxRadius;
              const distortR = Math.sin(normR * Math.PI / 2) * maxRadius;
              const theta = Math.atan2(dy, dx);
              sx = Math.round(centerX + distortR * Math.cos(theta));
              sy = Math.round(centerY + distortR * Math.sin(theta));
            }
            const destIdx = (y * canvas.width + x) * 4;
            const srcIdx = (sy * canvas.width + sx) * 4;
            outPix[destIdx] = srcPix[srcIdx];
            outPix[destIdx + 1] = srcPix[srcIdx + 1];
            outPix[destIdx + 2] = srcPix[srcIdx + 2];
            outPix[destIdx + 3] = srcPix[srcIdx + 3];
          }
        }
        ctx.putImageData(outData, 0, 0);
      } else if (effect === 'Chroma') {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const srcPix = imgData.data;
        const outData = ctx.createImageData(canvas.width, canvas.height);
        const outPix = outData.data;
        const offset = Math.round(canvas.width * 0.02);
        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const idx = (y * canvas.width + x) * 4;
            const rx = Math.max(0, x - offset);
            const rIdx = (y * canvas.width + rx) * 4;
            const bx = Math.min(canvas.width - 1, x + offset);
            const bIdx = (y * canvas.width + bx) * 4;
            outPix[idx] = srcPix[rIdx];
            outPix[idx + 1] = srcPix[idx + 1];
            outPix[idx + 2] = srcPix[bIdx + 2];
            outPix[idx + 3] = srcPix[idx + 3];
          }
        }
        ctx.putImageData(outData, 0, 0);
      } else if (effect === 'Smear') {
        const steps = 6;
        const maxOffset = Math.round(canvas.width * 0.05);
        ctx.globalAlpha = 1.0 / steps;
        for (let i = 0; i < steps; i++) {
          const offset = (i - (steps - 1) / 2) * (maxOffset / steps);
          ctx.drawImage(canvas, offset, 0, canvas.width, canvas.height);
        }
        ctx.globalAlpha = 1.0;
      }
      // other effects use simple drawImage
    };
    for (let i = 0; i < orderedFrames.length; i++) {
      const src = orderedFrames[i];
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise(res => { img.onload = res; img.src = src; });
      // Resize image to canvas while preserving aspect ratio
      const aspect = img.naturalWidth / img.naturalHeight;
      let drawW = canvas.width;
      let drawH = canvas.height;
      if (aspect > 1) {
        drawH = Math.round(canvas.width / aspect);
      } else {
        drawW = Math.round(canvas.height * aspect);
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.filter = FILTERS[selectedFilter] || 'none';
      ctx.drawImage(img, (canvas.width - drawW) / 2, (canvas.height - drawH) / 2, drawW, drawH);
      // Apply effect if needed
      if (['Fish Eye', 'Chroma', 'Smear', 'Slow Zoom', 'Fast Zoom'].includes(selectedEffect)) {
        if (selectedEffect === 'Slow Zoom' || selectedEffect === 'Fast Zoom') {
          const framesPerPhoto = 24;
          for (let f = 0; f < framesPerPhoto; f++) {
            // Simple zoom animation: scale from 0.8 to 1.0
            const scale = selectedEffect === 'Slow Zoom' ? 0.8 + (0.2 * f) / (framesPerPhoto - 1) : 0.8 + (0.2 * f) / (framesPerPhoto - 1);
            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.scale(scale, scale);
            ctx.translate(-canvas.width / 2, -canvas.height / 2);
            ctx.drawImage(img, (canvas.width - drawW) / 2, (canvas.height - drawH) / 2, drawW, drawH);
            ctx.restore();
            applyEffect(selectedEffect);
            const dataURL = canvas.toDataURL('image/jpeg', 0.92);
            const blob = await fetch(dataURL).then(r => r.blob());
            const bytes = new Uint8Array(await blob.arrayBuffer());
            const fname = `frame${String(frameFiles.length + 1).padStart(3, '0')}.jpg`;
            frameFiles.push(fname);
            // Write to ffmpeg FS later
            // Store blob temporarily in map
            window.__ffmpegTempFiles = window.__ffmpegTempFiles || {};
            window.__ffmpegTempFiles[fname] = bytes;
          }
        } else {
          applyEffect(selectedEffect);
          const dataURL = canvas.toDataURL('image/jpeg', 0.92);
          const blob = await fetch(dataURL).then(r => r.blob());
          const bytes = new Uint8Array(await blob.arrayBuffer());
          const fname = `frame${String(frameFiles.length + 1).padStart(3, '0')}.jpg`;
          frameFiles.push(fname);
          window.__ffmpegTempFiles = window.__ffmpegTempFiles || {};
          window.__ffmpegTempFiles[fname] = bytes;
        }
      } else {
        const dataURL = canvas.toDataURL('image/jpeg', 0.92);
        const blob = await fetch(dataURL).then(r => r.blob());
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const fname = `frame${String(frameFiles.length + 1).padStart(3, '0')}.jpg`;
        frameFiles.push(fname);
        window.__ffmpegTempFiles = window.__ffmpegTempFiles || {};
        window.__ffmpegTempFiles[fname] = bytes;
      }
      processedCount++;
      setExportProgress(Math.min(40, Math.round((processedCount / totalFrames) * 40)));
    }
    // Step 2: Load ffmpeg and write frames
    const ffmpeg = new FFmpeg({ log: true });
    await ffmpeg.load();
    for (const name of frameFiles) {
      ffmpeg.FS('writeFile', name, window.__ffmpegTempFiles[name]);
    }
    setExportProgress(40);
    // Step 3: Encode video
    await ffmpeg.run('-framerate', '24', '-i', 'frame%03d.jpg', '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', 'output.mp4');
    setExportProgress(90);
    const data = ffmpeg.FS('readFile', 'output.mp4');
    const videoBlob = new Blob([data.buffer], { type: 'video/mp4' });
    // Step 4: Thumbnail
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = 400;
    thumbCanvas.height = 711;
    const tctx = thumbCanvas.getContext('2d');
    const firstImg = new Image();
    firstImg.crossOrigin = 'anonymous';
    await new Promise(res => { firstImg.onload = res; firstImg.src = orderedFrames[0]; });
    const aspectT = firstImg.naturalWidth / firstImg.naturalHeight;
    let tw = thumbCanvas.width, th = thumbCanvas.height;
    if (aspectT > thumbCanvas.width / thumbCanvas.height) {
      th = Math.round(tw / aspectT);
    } else {
      tw = Math.round(th * aspectT);
    }
    tctx.drawImage(firstImg, (thumbCanvas.width - tw) / 2, (thumbCanvas.height - th) / 2, tw, th);
    const thumbBlob = await new Promise(res => thumbCanvas.toBlob(res, 'image/jpeg', 0.92));
    // Step 5: Save to IndexedDB
    const dbReq = indexedDB.open('LifeOnFillmDB', 1);
    dbReq.onupgradeneeded = function(event) {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id' });
      }
    };
    dbReq.onsuccess = function(event) {
      const db = event.target.result;
      const tx = db.transaction('projects', 'readwrite');
      const store = tx.objectStore('projects');
      const now = Date.now();
      const record = {
        id: now,
        name: 'Film ' + new Date(now).toLocaleDateString(),
        videoBlob,
        thumbnailBlob: thumbBlob,
        createdAt: now,
        frameCount: frameFiles.length,
        duration: orderedFrames.length * speed,
        filter: selectedFilter,
        effect: selectedEffect
      };
      store.put(record);
      tx.oncomplete = () => {
        setExportProgress(100);
        setTimeout(() => {
          setIsExporting(false);
          setToastMessage('Film saved to your projects');
          setShowToast(true);
          setTimeout(() => setShowToast(false), 3000);
        }, 1000);
      };
    };
    dbReq.onerror = (e) => {
      console.error('IndexedDB error', e);
      throw new Error('IndexedDB error');
    };
  } catch (err) {
    console.error('Export failed', err);
    setIsExporting(false);
    setToastMessage('Export failed. Please try again.');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  }
};

  const activeFilter = showEffectsFiltersSheet ? tempFilter : selectedFilter;
  const activeEffect = showEffectsFiltersSheet ? tempEffect : selectedEffect;
  const isCanvasRequired = ['Fish Eye', 'Chroma', 'Smear'].includes(activeEffect);

// Cleanup on component unmount: pause audio and revoke object URL
useEffect(() => {
  return () => {
    // Cleanup persistent Audio instance
    if (audioInstanceRef.current) {
      audioInstanceRef.current.pause();
    }
    // Revoke object URL if any
    if (audioObjectURLRef.current) {
      URL.revokeObjectURL(audioObjectURLRef.current);
    }
  };
}, []);

  return (
    <div className="review-screen">
      {/* Global Film Grain Filter Definition */}
      <svg style={{ display: 'none' }}>
        <defs>
          <filter id="global-film-grain-filter">
            <feTurbulence type="fractalNoise" baseFrequency={FILM_GRAIN_FREQUENCIES[grainSeed]} numOctaves="3" stitchTiles="stitch" />
          </filter>
        </defs>
      </svg>

      {/* Global Zoom Styles */}
      <style>{`
        @keyframes slow-zoom-anim {
          from { transform: scale(0.8); }
          to { transform: scale(1.0); }
        }
        @keyframes fast-zoom-anim {
          from { transform: scale(0.8); }
          to { transform: scale(1.0); }
        }
        /* Music bottom sheet styles */
        .music-sheet-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 1000;
          display: flex;
          align-items: flex-end;
        }
        .music-sheet {
          background: #1c1c1e;
          width: 100%;
          border-top-left-radius: 20px;
          border-top-right-radius: 20px;
          padding: 16px 20px 32px 20px;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
        }
        .sheet-handle {
          width: 36px;
          height: 4px;
          background: #555;
          border-radius: 2px;
          margin: 8px auto;
        }

        .music-sheet .sheet-title {
          text-align: center;
          color: #fff;
          font-weight: bold;
          margin: 12px 0;
        }
        .music-upload-area {
          background: #1c1c1e;
          border-radius: 16px;
          height: 100px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #8e8e93;
          cursor: pointer;
        }
        .music-note-icon {font-size: 32px; margin-bottom: 8px;}
        .upload-text {font-size: 14px;}
        .music-selected .audio-file-name {display: flex; justify-content: space-between; color: #fff;}
        .remove-audio-btn {background: none; border: none; color: #fff; cursor: pointer;}
        .playback-preview {display: flex; align-items: center; gap: 8px; margin: 8px 0;}
        .trim-section {margin-top: 12px;}
        .trim-label {color: #8e8e93; font-size: 12px; margin-bottom: 4px;}
        .trim-handle {width: 100%;}
        .trim-duration {color: #8e8e93; font-size: 12px; margin-top: 4px;}
        .done-btn {width: 100%; background: #fff; color: #000; font-weight: bold; font-size: 16px; padding: 16px 0; border: none; border-radius: 24px; cursor: pointer; margin-top: 12px;}
        .music-indicator {display: block; width: 6px; height: 6px; background: #fff; border-radius: 50%; margin: 4px auto 0;}
        .error-message {color: #ff6b6b; margin-top: 8px; font-size: 12px;}
      `}</style>

      {/* Top Bar */}
      <button className="back-btn" onClick={onBack}>←</button>

      {/* Large Preview Card */}
      <div className="preview-card">
        {orderedFrames.length > 0 && (
          !isCanvasRequired ? (
            <img
              key={currentIndex}
              src={orderedFrames[currentIndex]}
              alt="preview"
              className="preview-img"
              style={{
                filter: FILTERS[activeFilter] || 'none',
                animation: activeEffect === 'Slow Zoom'
                  ? `slow-zoom-anim ${speed}s ease-out forwards`
                  : activeEffect === 'Fast Zoom'
                    ? `fast-zoom-anim 0.3s ease-out forwards`
                    : 'none'
              }}
            />
          ) : (
            <CanvasEffectPreview
              key={currentIndex}
              src={orderedFrames[currentIndex]}
              effect={activeEffect}
              filter={activeFilter}
              maxDim={720}
              className="preview-img"
              style={{
                animation: activeEffect === 'Slow Zoom'
                  ? `slow-zoom-anim ${speed}s ease-out forwards`
                  : activeEffect === 'Fast Zoom'
                    ? `fast-zoom-anim 0.3s ease-out forwards`
                    : 'none'
              }}
            />
          )
        )}
        
        {/* Render Film Frame Overlay if activeEffect is 'Film Frame' */}
        {activeEffect === 'Film Frame' && (
          <FilmFrameOverlay frameIndex={currentIndex} />
        )}

        {/* Render Film Grain Overlay if activeEffect is 'Film Grain' */}
        {activeEffect === 'Film Grain' && (
          <FilmGrainOverlay />
        )}

        {/* Delete & Edit icons over the preview (bottom‑right) */}
        <div className="preview-actions">
          <button className="icon-btn delete-btn" title="Delete" onClick={() => handleDelete(currentIndex)}>✕</button>
          <button className="icon-btn edit-btn" title="Edit">✎</button>
        </div>
      </div>

      {/* Playback Row */}
      <div className="playback-row">
        <button className="play-btn" onClick={togglePlay}>{isPlaying ? '⏸' : '▶'}</button>
        <input
          type="range"
          className="scrubber"
          min={0}
          max={orderedFrames.length * speed}
          step={0.1}
          value={scrubberProgress * orderedFrames.length * speed}
          onChange={handleScrubberChange}
        />
      </div>

      {/* Timeline Strip */}
      <div className="timeline-strip">
        {/* Add‑at‑start cell */}
        <div className="timeline-cell add-start" onClick={() => fileInputRef.current && fileInputRef.current.click()}>+</div>
        {orderedFrames.map((url, idx) => (
          <div
            key={idx}
            className={`timeline-cell ${idx === currentIndex ? 'selected' : ''} ${idx === reorderingIndex ? 'reordering' : ''}`}
            style={idx === currentIndex ? { border: '2px solid white' } : {}}
            onClick={() => setCurrentIndex(idx)}
            onTouchStart={e => handleTouchStart(e, idx)}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
          >
            <img src={url} alt={`thumb-${idx}`} className="thumb-img" />
            <button className="add-after-btn" onClick={e => { e.stopPropagation(); alert('Add after – placeholder'); }}>+</button>
            <button className="delete-btn" onClick={e => { e.stopPropagation(); handleDelete(idx); }}>✕</button>
            <div className="drag-handle">⋮⋮⋮</div>
          </div>
        ))}
      </div>

      {/* Action Area */}
      <div className="action-area">
        {/* Action Buttons Row */}
        <div className="action-bar">
          <button className="action-btn" onClick={() => {
            setTempFilter(selectedFilter);
            setTempEffect(selectedEffect);
            setEffectsFiltersTab('Effect');
            setShowEffectsFiltersSheet(true);
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path d="M9.15316 5.40838C10.4198 3.13613 11.0531 2 12 2C12.9469 2 13.5802 3.13612 14.8468 5.40837L15.1745 5.99623C15.5345 6.64193 15.7144 6.96479 15.9951 7.17781C16.2757 7.39083 16.6251 7.4699 17.3241 7.62805L17.9605 7.77203C20.4201 8.32856 21.65 8.60682 21.9426 9.54773C22.2352 10.4886 21.3968 11.4691 19.7199 13.4299L19.2861 13.9372C18.8096 14.4944 18.5713 14.773 18.4641 15.1177C18.357 15.4624 18.393 15.8341 18.465 16.5776L18.5306 17.2544C18.7841 19.8706 18.9109 21.1787 18.1449 21.7602C17.3788 22.3417 16.2273 21.8115 13.9243 20.7512L13.3285 20.4768C12.6741 20.1755 12.3469 20.0248 12 20.0248C11.6531 20.0248 11.3259 20.1755 10.6715 20.4768L10.0757 20.7512C7.77268 21.8115 6.62118 22.3417 5.85515 21.7602C5.08912 21.1787 5.21588 19.8706 5.4694 17.2544L5.53498 16.5776C5.60703 15.8341 5.64305 15.4624 5.53586 15.1177C5.42868 14.773 5.19043 14.4944 4.71392 13.9372L4.2801 13.4299C2.60325 11.4691 1.76482 10.4886 2.05742 9.54773C2.35002 8.60682 3.57986 8.32856 6.03954 7.77203L6.67589 7.62805C7.37485 7.4699 7.72433 7.39083 8.00494 7.17781C8.28555 6.96479 8.46553 6.64194 8.82547 5.99623L9.15316 5.40838Z" fill="white" /></svg>
            <span>Effects</span>
          </button>
          <button className="action-btn" onClick={() => {
            setTempEffect(selectedEffect);
            setEffectsFiltersTab('Filter');
            setShowEffectsFiltersSheet(true);
          }}>            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path d="M18 8C18 11.3137 15.3137 14 12 14C8.68629 14 6 11.3137 6 8C6 4.68629 8.68629 2 12 2C15.3137 2 18 4.68629 18 8Z" fill="white" /><path d="M5.03349 10.7834C3.22163 11.816 2 13.7653 2 16C2 19.3137 4.68629 22 8 22C11.3137 22 14 19.3137 14 16C14 15.7437 13.9839 15.4911 13.9527 15.2432C13.3301 15.4107 12.6755 15.5 12 15.5C8.84139 15.5 6.13882 13.5474 5.03349 10.7834Z" fill="white" /><path d="M15.3866 14.6936C15.4611 15.1179 15.5 15.5544 15.5 16C15.5 18.0906 14.6446 19.9815 13.2646 21.3416C14.0849 21.7625 15.0147 22 16 22C19.3137 22 22 19.3137 22 16C22 13.7653 20.7783 11.816 18.9665 10.7834C18.2876 12.4811 17.0062 13.8726 15.3866 14.6936Z" fill="white" /></svg>            <span>Filter</span>
          </button>
          <button className="action-btn" onClick={() => setShowSpeedSheet(true)}>
            ⏳<span>Speed</span>
          </button>
          <button className="action-btn" onClick={() => { setShowMusicSheet(true); }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path d="M10.0909 11.9629L19.3636 8.63087V14.1707C18.8126 13.8538 18.1574 13.67 17.4545 13.67C15.4964 13.67 13.9091 15.096 13.9091 16.855C13.9091 18.614 15.4964 20.04 17.4545 20.04C19.4126 20.04 21 18.614 21 16.855C21 16.8551 21 16.855L21 7.49236C21 6.37238 21 5.4331 20.9123 4.68472C20.8999 4.57895 20.8852 4.4738 20.869 4.37569C20.7845 3.86441 20.6352 3.38745 20.347 2.98917C20.2028 2.79002 20.024 2.61055 19.8012 2.45628C19.7594 2.42736 19.716 2.39932 19.6711 2.3722L19.6621 2.36679C18.8906 1.90553 18.0233 1.93852 17.1298 2.14305C16.2657 2.34086 15.1944 2.74368 13.8808 3.23763L11.5963 4.09656C10.9806 4.32806 10.4589 4.52419 10.0494 4.72734C9.61376 4.94348 9.23849 5.1984 8.95707 5.57828C8.67564 5.95817 8.55876 6.36756 8.50501 6.81203C8.4545 7.22978 8.45452 7.7378 8.45455 8.33743V16.1307C7.90347 15.8138 7.24835 15.63 6.54545 15.63C4.58735 15.63 3 17.056 3 18.815C3 20.574 4.58735 22 6.54545 22C8.50355 22 10.0909 20.574 10.0909 18.815C10.0909 18.8151 10.0909 18.815L10.0909 11.9629Z" fill="white" /></svg>
              <span>Music</span>
              {selectedAudio && <span className="music-indicator"></span>}
          </button>
        </div>

        {/* Export Button */}
        <button className="export-pill-btn" onClick={exportVideo}>Export</button>
        {/* Export Modal */}
        {isExporting && (
          <div className="export-modal-overlay" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}>
            <div className="export-modal-card" style={{
              backgroundColor: '#222',
              padding: '40px 60px',
              borderRadius: '12px',
              textAlign: 'center',
            }}>
              <div className="progress-percentage" style={{
                fontSize: '48px',
                fontWeight: 'bold',
                color: '#fff',
              }}>{exportProgress}%</div>
              <div className="subtitle" style={{ color: '#aaa', marginTop: '8px' }}>Exporting your film...</div>
              <div className="progress-bar" style={{
                marginTop: '16px',
                width: '100%',
                height: '8px',
                backgroundColor: '#444',
                borderRadius: '4px',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${exportProgress}%`,
                  height: '100%',
                  backgroundColor: '#0f0',
                }} />
              </div>
            </div>
          </div>
        )}
        {/* Toast */}
        {showToast && (
          <div className="export-toast" style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#333',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: '8px',
            zIndex: 2000,
          }}>{toastMessage}</div>
        )}
      </div>

      {/* Music Bottom Sheet */}
{showMusicSheet && (
  <div className="music-sheet-overlay" onClick={() => setShowMusicSheet(false)}>
    <div className="music-sheet" onClick={e => e.stopPropagation()}>
      <div className="sheet-handle" />
      <div className="sheet-title">Add Music</div>
      {!selectedAudio ? (
        <div className="music-upload-area" onClick={() => audioInputRef.current && audioInputRef.current.click()}>
          <div className="music-note-icon">🎵</div>
          <div className="upload-text">Tap to select audio</div>
        </div>
      ) : (
        <div className="music-selected">
          <div className="audio-file-name">
            <span>{selectedAudio.name.length > 20 ? selectedAudio.name.slice(0, 17) + '…' : selectedAudio.name}</span>
            <button className="remove-audio-btn" onClick={removeAudio}>✕</button>
          </div>
          <div className="playback-preview">
            <button onClick={toggleAudioPlay}>{isAudioPlaying ? '⏸' : '▶'}</button>
            <span>{formatTime(audioStartTime)} - {formatTime(audioEndTime)}</span>
          </div>
          <div className="trim-section">
            <div className="trim-label">Trim Start</div>
            <input type="range" min={0} max={audioDuration} step={0.1} value={audioStartTime} className="trim-handle" onChange={handleTrimStartChange} />
            <div className="trim-label">Trim End</div>
            <input type="range" min={0} max={audioDuration} step={0.1} value={audioEndTime} className="trim-handle" onChange={handleTrimEndChange} />
            <div className="trim-duration">{formatTime(audioEndTime - audioStartTime)} selected</div>
          </div>
        </div>
      )}
      {audioError && <div className="error-message">{audioError}</div>}
      <button className="done-btn" onClick={() => setShowMusicSheet(false)}>Done</button>
      <input type="file" accept="audio/mpeg,audio/mp3,audio/aac,audio/mp4,audio/x-m4a,audio/wav,audio/ogg,.mp3,.m4a,.aac,.wav,.ogg" ref={audioInputRef} style={{ display: 'none' }} onChange={handleAudioSelect} />
      <audio ref={audioRef} src={audioURL} style={{ display: 'none' }} />
    </div>
  </div>
)}
{/* Speed Bottom Sheet */}
      {showSpeedSheet && (
        <div className="speed-sheet-overlay" onClick={() => setShowSpeedSheet(false)}>
          <div className="speed-sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />

            <div className="speed-preview-container">
              {orderedFrames.length > 0 && (
                <img src={orderedFrames[currentIndex]} alt="speed-preview" className="speed-preview-img" />
              )}
            </div>

            <div className="speed-info-row">
              <span className="speed-label">Image speed</span>
              <span className="speed-value">{speed.toFixed(2)} seconds</span>
            </div>

            <input
              type="range"
              className="speed-slider"
              min={0.25}
              max={5}
              step={0.05}
              value={speed}
              onChange={e => setSpeed(parseFloat(e.target.value))}
            />

            <button className="speed-done-btn" onClick={() => setShowSpeedSheet(false)}>
              Done
            </button>
          </div>
        </div>
      )}

      {/* Hidden file input for adding photos */}
      <input
        type="file"
        accept="image/*"
        multiple
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* Effects and Filters Bottom Sheet */}
      {showEffectsFiltersSheet && (
        <div className="effects-filters-overlay" onClick={() => setShowEffectsFiltersSheet(false)}>
          <div className="effects-filters-sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />

            {/* Segmented Control */}
            <div className="segmented-control">
              <button
                className={`segment-btn ${effectsFiltersTab === 'Effect' ? 'active' : ''}`}
                onClick={() => setEffectsFiltersTab('Effect')}
              >
                Effect
              </button>
              <button
                className={`segment-btn ${effectsFiltersTab === 'Filter' ? 'active' : ''}`}
                onClick={() => setEffectsFiltersTab('Filter')}
              >
                Filter
              </button>
            </div>

            {/* Carousel */}
            <div className="effects-filters-carousel">
              {effectsFiltersTab === 'Filter' ? (
                Object.keys(FILTERS).map(filterName => (
                  <div
                    key={filterName}
                    className={`option-card ${tempFilter === filterName ? 'selected' : ''}`}
                    onClick={() => setTempFilter(filterName)}
                  >
                    {orderedFrames.length > 0 && (
                      <img
                        src={orderedFrames[currentIndex]}
                        alt={filterName}
                        className="option-preview-img"
                        style={{ filter: FILTERS[filterName] }}
                      />
                    )}
                    <div className="option-card-overlay" />
                    <span className="option-name">{filterName}</span>
                  </div>
                ))
              ) : (
                EFFECTS.map(effectName => {
                  const isCarouselCanvasRequired = ['Fish Eye', 'Chroma', 'Smear'].includes(effectName);
                  return (
                    <div
                      key={effectName}
                      className={`option-card ${tempEffect === effectName ? 'selected' : ''}`}
                      onClick={() => setTempEffect(effectName)}
                    >
                      {orderedFrames.length > 0 && (
                        <div style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}>
                          {!isCarouselCanvasRequired ? (
                            <img
                              src={orderedFrames[currentIndex]}
                              alt={effectName}
                              className="option-preview-img"
                              style={{
                                filter: FILTERS[tempFilter] || 'none',
                                animation: effectName === 'Slow Zoom'
                                  ? 'slow-zoom-anim 2s ease-out infinite'
                                  : effectName === 'Fast Zoom'
                                    ? 'fast-zoom-anim 0.3s ease-out infinite'
                                    : 'none'
                              }}
                            />
                          ) : (
                            <CanvasEffectPreview
                              src={orderedFrames[currentIndex]}
                              effect={effectName}
                              filter={tempFilter}
                              className="option-preview-img"
                            />
                          )}

                          {effectName === 'Film Frame' && (
                            <FilmFrameOverlay frameIndex={currentIndex} />
                          )}

                          {effectName === 'Film Grain' && (
                            <FilmGrainOverlay />
                          )}
                        </div>
                      )}
                      <div className="option-card-overlay" />
                      <span className="option-name">{effectName}</span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Done Button */}
            <button className="effects-filters-done-btn" onClick={() => {
                if (effectsFiltersTab === 'Filter') {
                  setSelectedFilter(tempFilter);
                } else {
                  setSelectedEffect(tempEffect);
                }
                setShowEffectsFiltersSheet(false);
              }}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewScreen;
