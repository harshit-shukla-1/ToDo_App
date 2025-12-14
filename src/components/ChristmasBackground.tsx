"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from './ThemeProvider';
import { Star, Snowflake, Gift, TreePine } from 'lucide-react';

const ChristmasBackground = () => {
  const { theme } = useTheme();

  if (theme !== 'christmas') return null;

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
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Twinkling Stars */}
      {stars.map((star) => (
        <motion.div
          key={`star-${star.id}`}
          className="absolute text-yellow-200/40"
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
          className="absolute text-white/20"
          initial={{ y: -20, x: `${flake.left}%`, rotate: 0 }}
          animate={{ y: '100vh', rotate: 360 }}
          transition={{ duration: flake.duration, repeat: Infinity, ease: "linear", delay: flake.delay }}
        >
          <Snowflake size={16} />
        </motion.div>
      ))}

      {/* Floating Elements (Bottom) */}
      <div className="absolute bottom-0 w-full flex justify-between px-10 opacity-20 text-white">
        <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
            <TreePine size={120} className="text-green-800" fill="currentColor" />
        </motion.div>

        <motion.div
            className="hidden md:block"
            animate={{ y: [0, -15, 0], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        >
            {/* Simple representation of Santa's sleigh or just a gift box flying */}
            <Gift size={64} className="text-red-700 mb-20" />
        </motion.div>

        <motion.div
             animate={{ y: [0, -8, 0] }}
             transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        >
            <TreePine size={90} className="text-green-900" fill="currentColor" />
        </motion.div>
      </div>
      
      {/* Santa / Reindeer Silhouette flying across */}
      <motion.div 
        className="absolute top-20 text-red-500/10"
        initial={{ x: '-10%', opacity: 0 }}
        animate={{ x: '110vw', opacity: 1 }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear", delay: 5 }}
      >
         <div className="flex gap-2">
             <div className="w-4 h-2 bg-current rounded-full"></div> {/* Abstract deer */}
             <div className="w-4 h-2 bg-current rounded-full"></div>
             <div className="w-8 h-4 bg-current rounded-lg"></div> {/* Sleigh */}
         </div>
      </motion.div>

      {/* Background Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/50 z-[-1]" />
    </div>
  );
};

export default ChristmasBackground;