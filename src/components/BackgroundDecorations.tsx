"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from './ThemeProvider';
import { Star, Snowflake, TreePine, Circle } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const BackgroundDecorations = () => {
  const { color, mode } = useTheme();
  const location = useLocation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Only show heavier animations on dashboard/home to avoid distraction
  const isDashboard = location.pathname === '/';
  
  if (color === 'christmas') {
    return <ChristmasDecorations />;
  }

  // Default / Other Themes: Subtle Stars and Balls
  // We reduce opacity in light mode so it's not too intrusive
  const opacity = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 0.15 : 0.08;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1]">
      {/* Floating Balls */}
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div
          key={`ball-${i}`}
          className="absolute rounded-full bg-primary/20 blur-xl"
          initial={{
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            scale: Math.random() * 0.5 + 0.5,
          }}
          animate={{
            x: [
              Math.random() * window.innerWidth,
              Math.random() * window.innerWidth,
              Math.random() * window.innerWidth
            ],
            y: [
              Math.random() * window.innerHeight,
              Math.random() * window.innerHeight,
              Math.random() * window.innerHeight
            ],
          }}
          transition={{
            duration: Math.random() * 20 + 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            width: Math.random() * 200 + 100,
            height: Math.random() * 200 + 100,
          }}
        />
      ))}

      {/* Subtle Stars / Dots */}
      {isDashboard && Array.from({ length: 15 }).map((_, i) => (
        <motion.div
          key={`dot-${i}`}
          className="absolute text-primary"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, opacity, 0], scale: [0, 1, 0] }}
          transition={{
            duration: Math.random() * 5 + 3,
            repeat: Infinity,
            delay: Math.random() * 5,
          }}
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
        >
          {i % 3 === 0 ? (
            <Star size={Math.random() * 10 + 4} fill="currentColor" className="opacity-50" />
          ) : (
            <Circle size={Math.random() * 8 + 2} fill="currentColor" className="opacity-50" />
          )}
        </motion.div>
      ))}
    </div>
  );
};

const ChristmasDecorations = () => {
   // Generate random positions for stars
   const stars = Array.from({ length: 20 }).map((_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 0.5 + 0.5,
    delay: Math.random() * 2,
  }));

  // Generate snowflakes
  const snowflakes = Array.from({ length: 15 }).map((_, i) => ({
    id: i,
    left: Math.random() * 100,
    duration: Math.random() * 10 + 10,
    delay: Math.random() * 5,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1] bg-[#0f172a] text-white">
      {/* 
        Using a more robust background implementation that forces the dark blue/slate color 
        and layers the patterns on top, ensuring it covers everything including light mode backgrounds
      */}
      
      {/* Wallpaper Pattern */}
      <div 
        className="absolute inset-0 z-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(45deg, #c0392b 25%, transparent 25%, transparent 50%, #c0392b 50%, #c0392b 75%, transparent 75%, transparent),
            linear-gradient(-45deg, #27ae60 25%, transparent 25%, transparent 50%, #27ae60 50%, #27ae60 75%, transparent 75%, transparent)
          `,
          backgroundSize: '60px 60px',
          backgroundPosition: '0 0, 30px 30px'
        }}
      />
      <div className="absolute inset-0 z-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-500/20 via-transparent to-transparent" />
      
      {/* Twinkling Stars */}
      {stars.map((star) => (
        <motion.div
          key={`star-${star.id}`}
          className="absolute text-yellow-200/60 z-10"
          initial={{ opacity: 0.2, scale: star.size }}
          animate={{ opacity: [0.2, 0.8, 0.2], scale: [star.size, star.size * 1.2, star.size] }}
          transition={{ duration: 3, repeat: Infinity, delay: star.delay }}
          style={{ left: `${star.x}%`, top: `${star.y}%` }}
        >
          <Star size={12} fill="currentColor" />
        </motion.div>
      ))}

      {/* Falling Snow */}
      {snowflakes.map((flake) => (
        <motion.div
          key={`snow-${flake.id}`}
          className="absolute text-white/40 z-10"
          initial={{ y: -20, x: `${flake.left}%`, rotate: 0 }}
          animate={{ y: '100vh', rotate: 360 }}
          transition={{ duration: flake.duration, repeat: Infinity, ease: "linear", delay: flake.delay }}
        >
          <Snowflake size={16} />
        </motion.div>
      ))}

      {/* Floating Elements (Bottom) */}
      <div className="absolute bottom-0 w-full flex justify-between px-10 opacity-40 text-white z-0">
        <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
            <TreePine size={160} className="text-green-800" fill="currentColor" />
        </motion.div>
        <motion.div
             animate={{ y: [0, -8, 0] }}
             transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        >
            <TreePine size={120} className="text-green-900" fill="currentColor" />
        </motion.div>
      </div>
    </div>
  );
};

export default BackgroundDecorations;