import React, { useState, useEffect, useRef } from 'react';
import './ReviewScreen.css';

// Props: frames (array of object URLs), goBack (function to return to Camera)
export default function ReviewScreen({ frames = [], goBack }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [orderedFrames, setOrderedFrames] = useState(frames);
  const playIntervalRef = useRef(null);

  // Sync orderedFrames when frames prop changes
  useEffect(() => {
    setOrderedFrames(frames);
  }, [frames]);

  // Playback logic (simple timer cycling through frames)
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % orderedFrames.length);
      }, 60000 / orderedFrames.length); // 60s total timeline
    } else {
      clearInterval(playIntervalRef.current);
    }
    return () => clearInterval(playIntervalRef.current);
  }, [isPlaying, orderedFrames]);

  const togglePlay = () => setIsPlaying(p => !p);

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

  // UI action placeholders
  const placeholderAction = label => () => alert(`${label} – Coming soon`);
  const exportVideo = () => console.log('Export flow placeholder – frames:', orderedFrames);

  return (
    <div className="review-screen">
      {/* Top Bar */}
      <div className="top-bar">
        <button className="back-btn" onClick={goBack}>←</button>
      </div>

      {/* Large Preview Card */}
      <div className="preview-card">
        {orderedFrames.length > 0 && (
          <img src={orderedFrames[currentIndex]} alt="preview" className="preview-img" />
        )}
        {/* Delete & Edit icons over the preview (bottom‑right) */}
        <div className="preview-actions">
          <button className="icon-btn delete-btn" title="Delete">✕</button>
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
          max={orderedFrames.length - 1}
          value={currentIndex}
          onChange={e => setCurrentIndex(Number(e.target.value))}
        />
      </div>

      {/* Timeline Strip */}
      <div className="timeline-strip">
        {/* Add‑at‑start cell */}
        <div className="timeline-cell add-start" onClick={() => alert('Add at start – placeholder')}>+</div>
        {orderedFrames.map((url, idx) => (
          <div
            key={idx}
            className={`timeline-cell ${idx === currentIndex ? 'selected' : ''}`}
            onClick={() => setCurrentIndex(idx)}
            onTouchStart={e => handleTouchStart(e, idx)}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <img src={url} alt={`thumb-${idx}`} className="thumb-img" />
            <button className="add-after-btn" onClick={e => { e.stopPropagation(); alert('Add after – placeholder'); }}>+</button>
            <div className="drag-handle">⋮⋮⋮</div>
          </div>
        ))}
      </div>

      {/* Action Buttons Row */}
      <div className="action-bar">
        <button className="action-btn" onClick={placeholderAction('Effects')}>⭐<span>Effects</span></button>
        <button className="action-btn" onClick={placeholderAction('Filter')}>🌸<span>Filter</span></button>
        <button className="action-btn" onClick={placeholderAction('Speed')}>⏳<span>Speed</span></button>
        <button className="action-btn" onClick={placeholderAction('Music')}>🎵<span>Music</span></button>
        <button className="action-btn export-btn" onClick={exportVideo}>⬆<span>Export</span></button>
      </div>
    </div>
  );
}
