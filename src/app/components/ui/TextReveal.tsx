'use client';

import { useState, useEffect } from 'react';

interface TextRevealProps {
  text: string;
  className?: string;
  speed?: number;
  delay?: number;
}

export default function TextReveal({ text, className = "", speed = 30, delay = 0 }: TextRevealProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isStarted, setIsStarted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsStarted(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!isStarted) return;
    
    let index = 0;
    const interval = setInterval(() => {
      if (index <= text.length) {
        setDisplayedText(text.slice(0, index));
        index++;
      } else {
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, isStarted]);

  return (
    <span className={className}>
      {displayedText}
      {displayedText.length < text.length && <span className="animate-pulse">_</span>}
    </span>
  );
}
