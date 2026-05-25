import React, { useState, useEffect, useRef } from 'react';
import './ReviewScreen.css';

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

const EFFECTS = ['None', 'Fish Eye', 'Chroma', 'Smear'];

function CanvasEffectPreview({ src, effect, className }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    img.onload = () => {
      const maxDim = 320;
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

      if (effect === 'None') {
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
  }, [src, effect]);

  return <canvas ref={canvasRef} className={className} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
}

// Props: frames (array of object URLs), onBack (function to return to Camera)
export default function ReviewScreen({ frames = [], onBack }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [orderedFrames, setOrderedFrames] = useState(frames);
  const [speed, setSpeed] = useState(1); // seconds per frame
  const [showSpeedSheet, setShowSpeedSheet] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('None');
  const [selectedEffect, setSelectedEffect] = useState('None');
  const [showEffectsFiltersSheet, setShowEffectsFiltersSheet] = useState(false);
  const [effectsFiltersTab, setEffectsFiltersTab] = useState('Effect'); // 'Effect' or 'Filter'
  const [tempFilter, setTempFilter] = useState('None');
  const [tempEffect, setTempEffect] = useState('None');
  const playIntervalRef = useRef(null);
  const fileInputRef = useRef(null);

  // Sync orderedFrames when frames prop changes
  useEffect(() => {
    setOrderedFrames(frames);
  }, [frames]);

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

  // Ensure speed state resets when frames length changes (optional)
  useEffect(() => {
    if (orderedFrames.length === 0) setSpeed(1);
  }, [orderedFrames.length]);

  const animationRef = useRef(null);
  const startTimeRef = useRef(null);
  const [scrubberProgress, setScrubberProgress] = useState(0);

  const togglePlay = () => {
    setIsPlaying(p => !p);
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
        }
      };
      animationRef.current = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(animationRef.current);
    }
    // Cleanup on unmount or when dependencies change
    return () => cancelAnimationFrame(animationRef.current);
  }, [isPlaying, orderedFrames.length, speed]);

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
      startIdx: idx,
    };
  };

  const handleTouchMove = e => {
    const touch = e.touches[0];
    const { startX, startIdx } = touchDataRef.current;
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
        // reset to avoid multiple swaps in one gesture
        touchDataRef.current.startX = touch.clientX;
        touchDataRef.current.startIdx = newIdx;
      }
    }
  };

  const handleTouchEnd = () => {
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
  const exportVideo = () => console.log('Export flow placeholder – frames:', orderedFrames);

  return (
    <div className="review-screen">
      {/* Top Bar */}
      <div className="top-bar">
                  <button className="back-btn" onClick={onBack}>←</button>
      </div>

      {/* Large Preview Card */}
      <div className="preview-card">
        {orderedFrames.length > 0 && (
          <img 
            src={orderedFrames[currentIndex]} 
            alt="preview" 
            className="preview-img" 
            style={{ filter: FILTERS[selectedFilter] }} 
          />
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
            className={`timeline-cell ${idx === currentIndex ? 'selected' : ''}`}
            style={idx === currentIndex ? { border: '2px solid white' } : {}}
            onClick={() => setCurrentIndex(idx)}
            onTouchStart={e => handleTouchStart(e, idx)}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <img src={url} alt={`thumb-${idx}`} className="thumb-img" />
            <button className="add-after-btn" onClick={e => { e.stopPropagation(); alert('Add after – placeholder'); }}>+</button>
            <button className="delete-btn" onClick={e => { e.stopPropagation(); handleDelete(idx); }}>✕</button>
            <div className="drag-handle">⋮⋮⋮</div>
          </div>
        ))}
      </div>

      {/* Action Buttons Row */}
      <div className="action-bar">
        <button className="action-btn" onClick={() => {
          setTempFilter(selectedFilter);
          setTempEffect(selectedEffect);
          setEffectsFiltersTab('Effect');
          setShowEffectsFiltersSheet(true);
        }}>⭐<span>Effects</span></button>
        <button className="action-btn" onClick={() => {
          setTempFilter(selectedFilter);
          setTempEffect(selectedEffect);
          setEffectsFiltersTab('Filter');
          setShowEffectsFiltersSheet(true);
        }}>🌸<span>Filter</span></button>
         <button className="action-btn" onClick={() => setShowSpeedSheet(true)}>
           ⏳<span>Speed</span>
         </button>
        <button className="action-btn" onClick={placeholderAction('Music')}>🎵<span>Music</span></button>
        <button className="action-btn export-btn" onClick={exportVideo}>⬆<span>Export</span></button>
      </div>

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
                EFFECTS.map(effectName => (
                  <div 
                    key={effectName}
                    className={`option-card ${tempEffect === effectName ? 'selected' : ''}`}
                    onClick={() => setTempEffect(effectName)}
                  >
                    {orderedFrames.length > 0 && (
                      <CanvasEffectPreview 
                        src={orderedFrames[currentIndex]} 
                        effect={effectName} 
                        className="option-preview-img" 
                      />
                    )}
                    <div className="option-card-overlay" />
                    <span className="option-name">{effectName}</span>
                  </div>
                ))
              )}
            </div>

            {/* Done Button */}
            <button className="effects-filters-done-btn" onClick={() => {
              setSelectedFilter(tempFilter);
              setSelectedEffect(tempEffect);
              setShowEffectsFiltersSheet(false);
            }}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
