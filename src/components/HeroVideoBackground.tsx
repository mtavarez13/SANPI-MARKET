import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Video, Volume2, VolumeX } from 'lucide-react';
import { SiteThemeConfig } from '../types';

interface HeroVideoBackgroundProps {
  config: SiteThemeConfig;
  className?: string;
}

// Helper to detect if a URL is a YouTube link and extract video ID
function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

export const HeroVideoBackground: React.FC<HeroVideoBackgroundProps> = ({
  config,
  className = ''
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [videoLoaded, setVideoLoaded] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  const youtubeId = getYouTubeVideoId(config.heroVideoUrl);
  const isDirectVideo = !youtubeId && (
    config.heroVideoUrl?.endsWith('.mp4') ||
    config.heroVideoUrl?.endsWith('.webm') ||
    config.heroVideoUrl?.includes('assets.mixkit.co') ||
    config.heroVideoUrl?.includes('cloudinary') ||
    config.heroVideoUrl?.includes('.mp4?')
  );

  useEffect(() => {
    if (videoRef.current && isDirectVideo) {
      videoRef.current.play().catch(() => {
        setIsPlaying(false);
      });
    }
  }, [config.heroVideoUrl, isDirectVideo]);

  if (!config.heroVideoEnabled || !config.heroVideoUrl) {
    return null;
  }

  // Determine overlay classes based on config.heroVideoOverlayStyle
  const getOverlayGradient = () => {
    switch (config.heroVideoOverlayStyle) {
      case 'dark':
        return 'bg-gradient-to-b from-slate-950/80 via-slate-900/75 to-slate-950/90';
      case 'purple_gradient':
        return 'bg-gradient-to-br from-purple-950/80 via-indigo-950/70 to-slate-950/85';
      case 'minimal':
        return 'bg-white/40 backdrop-blur-[1px]';
      case 'light':
      default:
        return 'bg-gradient-to-b from-white/85 via-white/75 to-purple-50/90';
    }
  };

  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none select-none z-0 rounded-3xl ${className}`}
      aria-hidden="true"
    >
      {/* Video Container with custom opacity & blur */}
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          opacity: config.heroVideoOpacity ?? 0.35,
          filter: config.heroVideoBlur ? `blur(${config.heroVideoBlur}px)` : undefined,
        }}
      >
        {youtubeId ? (
          /* YouTube Embed Loop in Mute Mode */
          <div className="relative w-full h-full scale-125 overflow-hidden">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&mute=1&loop=1&playlist=${youtubeId}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&enablejsapi=1`}
              title="Video de Fondo Sanpi"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none border-0"
              allow="autoplay; encrypted-media"
            />
          </div>
        ) : (
          /* Direct HTML5 MP4/WebM Video Stream */
          <video
            ref={videoRef}
            key={config.heroVideoUrl}
            autoPlay
            muted={isMuted}
            loop
            playsInline
            preload="auto"
            crossOrigin="anonymous"
            onLoadedData={() => {
              setVideoLoaded(true);
              setHasError(false);
            }}
            onError={() => {
              setHasError(true);
            }}
            className={`w-full h-full object-cover object-center scale-105 transition-opacity duration-1000 ${
              videoLoaded && !hasError ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <source src={config.heroVideoUrl} type="video/mp4" />
          </video>
        )}

        {/* Fallback image if video is loading or has error */}
        {(!videoLoaded || hasError) && !youtubeId && (
          <img
            src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1920"
            alt="Fondo de Comercio Sanpi"
            className="absolute inset-0 w-full h-full object-cover object-center opacity-40 transition-opacity duration-700"
            referrerPolicy="no-referrer"
          />
        )}
      </div>

      {/* Contrast Overlay Mesh for Typography Legibility */}
      <div className={`absolute inset-0 ${getOverlayGradient()} pointer-events-none transition-colors duration-500`} />
      
      {/* Subtle radial vignette accent */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(255,255,255,0.4)_100%)] pointer-events-none" />
    </div>
  );
};
