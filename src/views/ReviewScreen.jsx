import React, { useState, useEffect, useRef } from 'react';
import './ReviewScreen.css';

// Props: frames (array of object URLs), onBack (function to return to Camera)
export default function ReviewScreen({ frames = [], onBack }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [orderedFrames, setOrderedFrames] = useState(frames);
  const [speed, setSpeed] = useState(1); // seconds per frame
  const [showSpeedSheet, setShowSpeedSheet] = useState(false);
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
          <img src={orderedFrames[currentIndex]} alt="preview" className="preview-img" />
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
        <button className="action-btn" onClick={placeholderAction('Effects')}>⭐<span>Effects</span></button>
        <button className="action-btn" onClick={placeholderAction('Filter')}>🌸<span>Filter</span></button>
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
    </div>
  );
}
