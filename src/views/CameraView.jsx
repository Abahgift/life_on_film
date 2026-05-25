import React, { useEffect, useRef, useState } from 'react';
// Helper functions for CSS filter strings
const filterCss = name => {
  switch (name) {
    case 'Retro': return 'sepia(0.6) contrast(1.2)';
    case 'Disposable': return 'contrast(1.5) saturate(1.2)';
    case 'Vinyl': return 'hue-rotate(90deg) saturate(1.5)';
    case 'Crisp': return 'brightness(1.2) contrast(1.3)';
    case 'Mellow': return 'opacity(0.9) saturate(0.8)';
    case 'Cassette': return 'sepia(0.4) hue-rotate(30deg)';
    case 'Insta': return 'contrast(1.4) saturate(1.4)';
    case 'Autumn': return 'sepia(0.5) hue-rotate(20deg) saturate(1.3)';
    default: return 'none';
  }
};
const effectCss = name => {
  switch (name) {
    case 'Fish Eye': return 'blur(2px)'; // placeholder
    case 'Chroma': return 'hue-rotate(180deg)';
    case 'Smear': return 'contrast(2)';
    default: return 'none';
  }
};
import './CameraView.css';

const MAX_PHOTOS = 10;

export default function CameraView() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // rear default
  const [zoom, setZoom] = useState(1);
  const [flashOn, setFlashOn] = useState(false);
  const [photos, setPhotos] = useState([]); // store object URLs
  const [showSheet, setShowSheet] = useState(false);
  const [category, setCategory] = useState('filter'); // filter|overlay|effect
  const [selectedFilter, setSelectedFilter] = useState('None');
  const [selectedEffect, setSelectedEffect] = useState('None');
  const galleryInputRef = useRef(null);

  // Init camera stream
  useEffect(() => {
    async function startCamera() {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
      try {
        const constraints = {
          video: {
            facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
            zoom: { ideal: zoom }
          }
        };
        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        setStream(newStream);
        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
          videoRef.current.play();
          // srcObject set above
        }
      } catch (e) {
        console.error('Camera error:', e);
      }
    }
    startCamera();
    // cleanup on unmount
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  // Apply zoom when changed
  useEffect(() => {
    if (!stream) return;
    const videoTrack = stream.getVideoTracks()[0];
    const capabilities = videoTrack.getCapabilities ? videoTrack.getCapabilities() : {};
    if (capabilities.zoom) {
      videoTrack.applyConstraints({ advanced: [{ zoom }] }).catch(console.warn);
    } else {
      // fallback via CSS scale on video element
      if (videoRef.current) videoRef.current.style.transform = `scale(${zoom})`;
    }
  }, [zoom, stream]);

  // Flash toggle (torch)
  const toggleFlash = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    const capabilities = track.getCapabilities ? track.getCapabilities() : {};
    if (capabilities.torch) {
      try {
        await track.applyConstraints({ torch: !flashOn });
        setFlashOn(!flashOn);
      } catch (e) {
        console.warn('Torch not supported', e);
      }
    } else {
      // visual toggle only
      setFlashOn(!flashOn);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    // Apply CSS filter to canvas
    const filterStr = `${filterCss(selectedFilter)} ${effectCss(selectedEffect)}`.trim();
    ctx.filter = filterStr || 'none';
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.filter = 'none';
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      setPhotos(prev => {
        const updated = [url, ...prev].slice(0, MAX_PHOTOS);
        return updated;
      });
    }, 'image/jpeg');
  };

  const openGallery = () => {
    if (galleryInputRef.current) galleryInputRef.current.click();
  };

  const handleGalleryChange = e => {
    const files = Array.from(e.target.files);
    const newUrls = files.slice(0, MAX_PHOTOS).map(f => URL.createObjectURL(f));
    setPhotos(prev => {
      const combined = [...newUrls, ...prev].slice(0, MAX_PHOTOS);
      return combined;
    });
    // Reset input value so same file can be selected again
    e.target.value = '';
  };

  // Toggle camera function retained for future use but not bound to UI currently.
  const toggleCamera = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Open bottom sheet for effects/filters
  const openBottomSheet = () => {
    setShowSheet(true);
  };

  // Close bottom sheet
  const closeBottomSheet = () => {
    setShowSheet(false);
  };

  return (
    <div className="camera-screen">
      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Viewfinder card */}
      <div className="viewfinder-card">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="video-stream"
        />
        {/* Flash button top‑right */}
        <button className="flash-btn" onClick={toggleFlash} title="Flash">
          {flashOn ? '⚡️' : '✖⚡'}
        </button>
        {/* Bottom‑left import from gallery */}
        <button className="import-btn" onClick={openGallery} title="Import from gallery">
          +
        </button>
        {/* Bottom‑center zoom selector */}
        <div className="zoom-selector">
          {[0.5, 1, 2].map(z => (
            <button
              key={z}
              className={z === zoom ? 'zoom-option selected' : 'zoom-option'}
              onClick={() => setZoom(z)}
            >
              {z}x
            </button>
          ))}
        </div>
        {/* Bottom‑right flip camera */}
          <button className="flip-btn" onClick={toggleCamera} title="Flip camera" style={{ position: 'relative' }}>
            ↺
            {(selectedFilter !== 'None' || selectedEffect !== 'None') && (
              <span className="active-indicator" />
            )}
          </button>
      </div>

      {/* Bottom Sheet */}
      {showSheet && (
        <div className="sheet-backdrop" onClick={closeBottomSheet}>
          <div className="bottom-sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            {/* Carousel */}
            <div className="carousel">
              {category === 'filter' && [
                'None', 'Retro', 'Disposable', 'Vinyl', 'Crisp', 'Mellow', 'Cassette', 'Insta', 'Autumn'
              ].map(name => (
                <div
                  key={name}
                  className={`card ${selectedFilter === name ? 'selected' : ''}`}
                  onClick={() => setSelectedFilter(name)}
                >
                  <div className="card-image" style={{ background: 'linear-gradient(to right, #4caf50, #2196f3)', filter: filterCss(name) }} />
                  <div className="card-label">{name}</div>
                  <div className="card-icon">📷</div>
                </div>
              ))}
              {category === 'overlay' && [
                'None'
              ].map(name => (
                <div
                  key={name}
                  className="card"
                  onClick={() => {}}
                >
                  <div className="card-image" style={{ background: 'linear-gradient(to right, #4caf50, #2196f3)' }} />
                  <div className="card-label">{name}</div>
                  <div className="card-icon">🟦</div>
                </div>
              ))}
              {category === 'effect' && [
                'None', 'Fish Eye', 'Chroma', 'Smear'
              ].map(name => (
                <div
                  key={name}
                  className={`card ${selectedEffect === name ? 'selected' : ''}`}
                  onClick={() => setSelectedEffect(name)}
                >
                  <div className="card-image" style={{ background: 'linear-gradient(to right, #4caf50, #2196f3)', filter: effectCss(name) }} />
                  <div className="card-label">{name}</div>
                  <div className="card-icon">✨</div>
                </div>
              ))}
            </div>
            {/* Category tabs */}
            <div className="category-tabs">
              {['filter', 'overlay', 'effect'].map(cat => (
                <button
                  key={cat}
                  className={`tab-btn ${category === cat ? 'active' : ''}`}
                  onClick={() => setCategory(cat)}
                >
                  {cat === 'filter' && <span>🌸</span>}
                  {cat === 'overlay' && <span>🔲</span>}
                  {cat === 'effect' && <span>✴️</span>}
                  <div className="tab-label">{cat.charAt(0).toUpperCase() + cat.slice(1)}</div>
                </button>
              ))}
            </div>
            <div className="helper-text">Options are applied after photo is taken.</div>
            <button className="done-btn" onClick={closeBottomSheet}>Done</button>
          </div>
        </div>
      )}

      {/* Bottom row controls */}
      <div className="bottom-controls">
        {/* Left thumbnail */}
        <div className="thumb-holder">
          {photos.length > 0 ? (
            <img src={photos[0]} alt="latest" className="thumb-img" />
          ) : (
            <div className="thumb-placeholder" />
          )}
        </div>
        {/* Shutter button */}
        <button className="shutter-btn" onClick={capturePhoto} aria-label="Capture">
          <div className="shutter-ring" />
        </button>
        {/* Vintage gallery button */}
        <button className="vintage-btn" onClick={openBottomSheet} title="Filters & Effects">📷</button>
      </div>

      {/* Hidden file input for gallery */}
      <input
        type="file"
        accept="image/*"
        multiple
        ref={galleryInputRef}
        onChange={handleGalleryChange}
        style={{ display: 'none' }}
      />

      {/* Bottom navigation – Camera active */}
      <nav className="bottom-nav">
        <button className="nav-item active">Camera</button>
        <button className="nav-item">Home</button>
        <button className="nav-item">Projects</button>
      </nav>
    </div>
  );
}
