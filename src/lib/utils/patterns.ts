/**
 * 1-Bit CSS Pattern Generators
 * Generate inline styles for dithering patterns
 */

/**
 * Generate CSS for a stipple pattern with given density
 */
export function stipplePattern(density: number): React.CSSProperties {
  const size = Math.max(2, Math.round(4 / density));
  return {
    backgroundImage: 'radial-gradient(#000 1px, transparent 1px)',
    backgroundSize: `${size}px ${size}px`,
  };
}

/**
 * Generate CSS for diagonal lines
 */
export function diagonalLines(spacing: number = 4): React.CSSProperties {
  return {
    backgroundImage: `repeating-linear-gradient(
      45deg,
      #000,
      #000 1px,
      transparent 1px,
      transparent ${spacing}px
    )`,
  };
}

/**
 * Generate CSS for a checker pattern
 */
export function checkerPattern(size: number = 4): React.CSSProperties {
  return {
    backgroundImage: `
      linear-gradient(45deg, #000 25%, transparent 25%),
      linear-gradient(-45deg, #000 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #000 75%),
      linear-gradient(-45deg, transparent 75%, #000 75%)
    `,
    backgroundSize: `${size}px ${size}px`,
    backgroundPosition: `0 0, 0 ${size / 2}px, ${size / 2}px -${size / 2}px, -${size / 2}px 0px`,
  };
}

/**
 * Generate CSS for horizontal scanlines
 */
export function scanlines(spacing: number = 2, opacity: number = 0.03): React.CSSProperties {
  return {
    backgroundImage: `repeating-linear-gradient(
      0deg,
      transparent,
      transparent 1px,
      rgba(0, 0, 0, ${opacity}) 1px,
      rgba(0, 0, 0, ${opacity}) ${spacing}px
    )`,
  };
}

/**
 * Generate CSS for crosshatch pattern
 */
export function crosshatch(spacing: number = 4): React.CSSProperties {
  return {
    backgroundImage: `
      repeating-linear-gradient(0deg, #000, #000 1px, transparent 1px, transparent ${spacing}px),
      repeating-linear-gradient(90deg, #000, #000 1px, transparent 1px, transparent ${spacing}px)
    `,
  };
}

/**
 * Get appropriate pattern based on value (0-1)
 * Returns inline style object
 */
export function getPatternForValue(value: number): React.CSSProperties {
  if (value < 0.1) {
    return { backgroundColor: '#FFFFFF' };
  }
  if (value < 0.2) {
    return {
      backgroundColor: '#FFFFFF',
      ...stipplePattern(0.25),
    };
  }
  if (value < 0.4) {
    return {
      backgroundColor: '#FFFFFF',
      ...diagonalLines(8),
    };
  }
  if (value < 0.6) {
    return {
      backgroundColor: '#FFFFFF',
      ...checkerPattern(4),
    };
  }
  if (value < 0.8) {
    return {
      backgroundColor: '#000000',
      backgroundImage: 'radial-gradient(#FFF 1px, transparent 1px)',
      backgroundSize: '4px 4px',
    };
  }
  if (value < 0.95) {
    return {
      backgroundColor: '#000000',
      backgroundImage: 'radial-gradient(#FFF 1px, transparent 1px)',
      backgroundSize: '8px 8px',
    };
  }
  return { backgroundColor: '#000000' };
}

/**
 * Generate a dithered gradient (for legends)
 */
export function ditherGradient(steps: number = 10): React.CSSProperties[] {
  const patterns: React.CSSProperties[] = [];
  for (let i = 0; i < steps; i++) {
    patterns.push(getPatternForValue(i / (steps - 1)));
  }
  return patterns;
}

/**
 * Get pattern class name for a value (0-1)
 * Uses CSS classes defined in globals.css
 */
export function getPatternClass(value: number): string {
  if (value < 0.1) return 'bg-bit-white';
  if (value < 0.25) return 'bg-bit-white pattern-stipple-light';
  if (value < 0.5) return 'bg-bit-white pattern-diagonal';
  if (value < 0.75) return 'bg-bit-white pattern-checker';
  if (value < 0.9) return 'pattern-stipple-dense';
  return 'bg-bit-black';
}

/**
 * Generate data URL for a small dithered pattern image
 * Useful for backgrounds that need to tile
 */
export function generatePatternDataUrl(
  pattern: 'stipple' | 'checker' | 'diagonal' | 'crosshatch',
  size: number = 8,
  density: number = 0.5
): string {
  if (typeof document === 'undefined') return '';

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Fill white
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = '#000000';

  switch (pattern) {
    case 'stipple':
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          if (Math.random() < density) {
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
      break;

    case 'checker':
      for (let y = 0; y < size; y += 2) {
        for (let x = 0; x < size; x += 2) {
          if ((x + y) % 4 === 0) {
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
      break;

    case 'diagonal':
      for (let i = 0; i < size * 2; i += 4) {
        for (let j = 0; j < size; j++) {
          const x = i - j;
          if (x >= 0 && x < size) {
            ctx.fillRect(x, j, 1, 1);
          }
        }
      }
      break;

    case 'crosshatch':
      for (let i = 0; i < size; i += 4) {
        for (let j = 0; j < size; j++) {
          ctx.fillRect(i, j, 1, 1);
          ctx.fillRect(j, i, 1, 1);
        }
      }
      break;
  }

  return canvas.toDataURL();
}
