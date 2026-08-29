import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Play, Pause, Video, Radio, Package, Sparkles, CheckCircle2, Box, Truck } from 'lucide-react';

interface FulfillmentWarehouseBackgroundProps {
  opacity?: number;
}

export const FulfillmentWarehouseBackground: React.FC<FulfillmentWarehouseBackgroundProps> = ({
  opacity = 0.85
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // List of high-definition realistic warehouse fulfillment and moving package video loops
  const videoSources = [
    'https://assets.mixkit.co/videos/preview/mixkit-conveyor-belt-at-a-distribution-warehouse-42525-large.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-cardboard-boxes-on-a-conveyor-belt-in-a-warehouse-42524-large.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-automated-assembly-line-in-a-modern-factory-42526-large.mp4',
  ];

  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay may be restricted on some devices until user interaction
        setIsPlaying(false);
      });
    }
  }, [currentSourceIndex]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleVideoError = () => {
    if (currentSourceIndex < videoSources.length - 1) {
      setCurrentSourceIndex((prev) => prev + 1);
    } else {
      setVideoError(true);
    }
  };

  return (
    <div 
      className="absolute inset-0 overflow-hidden pointer-events-none select-none -z-0"
      style={{ opacity }}
      aria-hidden="true"
    >
      {/* 1. REALISTIC WAREHOUSE FULFILLMENT VIDEO LOOP */}
      <div className="absolute inset-0 bg-slate-950">
        
        {/* Poster image fallback while loading or on failure */}
        <img
          src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1920"
          alt="Almacén de Fulfillment Sanpi"
          className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-1000 ${
            videoLoaded ? 'opacity-20' : 'opacity-70'
          }`}
          referrerPolicy="no-referrer"
        />

        {!videoError && (
          <video
            ref={videoRef}
            key={videoSources[currentSourceIndex]}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            crossOrigin="anonymous"
            poster="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1920"
            onLoadedData={() => setVideoLoaded(true)}
            onError={handleVideoError}
            className={`absolute inset-0 w-full h-full object-cover object-center scale-105 transition-opacity duration-1000 filter contrast-110 brightness-90 ${
              videoLoaded ? 'opacity-70' : 'opacity-0'
            }`}
          >
            <source src={videoSources[currentSourceIndex]} type="video/mp4" />
          </video>
        )}
      </div>

      {/* 2. INDUSTRIAL VIGNETTE & PURPLE NEON MESH OVERLAYS (Guarantees 100% text readability) */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/80 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-purple-950/60 via-transparent to-indigo-950/60 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(2,6,23,0.85)_100%)] pointer-events-none" />

      {/* 3. SUBTLE CONVEYOR HUD TELEMETRY OVERLAYS */}
      <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-8 pointer-events-auto flex items-center gap-2 z-20">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-purple-800/60 backdrop-blur-md text-[11px] font-mono text-purple-200 shadow-xl">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <Radio className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden sm:inline">ALMACÉN EN VIVO:</span>
          <span className="font-bold text-white">LÍNEA DE DESPACHO AUTOMATIZADA</span>
        </div>

        {/* Video Control Play/Pause Button */}
        <button
          type="button"
          onClick={togglePlay}
          className="p-1.5 rounded-xl bg-slate-900/80 hover:bg-purple-900/60 border border-purple-800/60 text-purple-300 hover:text-white transition-all backdrop-blur-md cursor-pointer active:scale-95 shadow-lg"
          title={isPlaying ? 'Pausar video' : 'Reproducir video'}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Floating logistics node points representing fast national dispatch */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[18%] left-[12%] hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 border border-purple-700/50 text-[9px] font-mono text-purple-200 backdrop-blur-md shadow-lg">
          <Box className="w-3 h-3 text-emerald-400" />
          <span>HUB CENTRAL SD • CLASIFICACIÓN</span>
        </div>

        <div className="absolute top-[28%] right-[14%] hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 border border-indigo-700/50 text-[9px] font-mono text-indigo-200 backdrop-blur-md shadow-lg">
          <Truck className="w-3 h-3 text-purple-400" />
          <span>RUTA NORTE / CIBAO • SACHA PACK</span>
        </div>
      </div>
    </div>
  );
};
