/**
 * 1-Bit Dithering Utilities
 * Canvas-based dithering functions for creating retro bitmap effects
 */

// 4x4 Bayer matrix for ordered dithering
const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

// 8x8 Bayer matrix for smoother gradients
const BAYER_8X8 = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
];

/**
 * Apply 4x4 Bayer ordered dithering to a canvas
 * Best for smooth gradients and heatmaps
 */
export function bayerDither4x4(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      // Get grayscale value (luminance)
      const gray = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;

      // Get threshold from Bayer matrix (normalized to 0-255)
      const threshold = (BAYER_4X4[y % 4][x % 4] / 16) * 255;

      // Apply threshold
      const value = gray > threshold ? 255 : 0;

      data[idx] = value;     // R
      data[idx + 1] = value; // G
      data[idx + 2] = value; // B
      // Alpha stays the same
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Apply 8x8 Bayer ordered dithering for smoother results
 */
export function bayerDither8x8(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const gray = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
      const threshold = (BAYER_8X8[y % 8][x % 8] / 64) * 255;
      const value = gray > threshold ? 255 : 0;

      data[idx] = value;
      data[idx + 1] = value;
      data[idx + 2] = value;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Floyd-Steinberg error diffusion dithering
 * Produces organic-looking results with no visible patterns
 */
export function floydSteinberg(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Create grayscale buffer
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    gray[i] = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const oldPixel = gray[idx];
      const newPixel = oldPixel > 127 ? 255 : 0;
      const error = oldPixel - newPixel;

      gray[idx] = newPixel;

      // Distribute error to neighboring pixels
      if (x + 1 < width) {
        gray[idx + 1] += error * (7 / 16);
      }
      if (y + 1 < height) {
        if (x > 0) {
          gray[idx + width - 1] += error * (3 / 16);
        }
        gray[idx + width] += error * (5 / 16);
        if (x + 1 < width) {
          gray[idx + width + 1] += error * (1 / 16);
        }
      }
    }
  }

  // Write back to image data
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    const value = Math.max(0, Math.min(255, Math.round(gray[i])));
    data[idx] = value;
    data[idx + 1] = value;
    data[idx + 2] = value;
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Halftone dot pattern
 * Creates classic print-style dots based on value
 */
export function halftone(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  dotSize: number = 4
): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Create output buffer (start white)
  const output = new Uint8ClampedArray(data.length);
  for (let i = 0; i < output.length; i += 4) {
    output[i] = 255;
    output[i + 1] = 255;
    output[i + 2] = 255;
    output[i + 3] = 255;
  }

  const cellSize = dotSize * 2;

  for (let cellY = 0; cellY < height; cellY += cellSize) {
    for (let cellX = 0; cellX < width; cellX += cellSize) {
      // Calculate average brightness of cell
      let total = 0;
      let count = 0;

      for (let dy = 0; dy < cellSize && cellY + dy < height; dy++) {
        for (let dx = 0; dx < cellSize && cellX + dx < width; dx++) {
          const idx = ((cellY + dy) * width + (cellX + dx)) * 4;
          total += data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
          count++;
        }
      }

      const avgBrightness = total / count;
      // Invert: darker areas get larger dots
      const radius = ((255 - avgBrightness) / 255) * dotSize;

      // Draw dot in center of cell
      const centerX = cellX + cellSize / 2;
      const centerY = cellY + cellSize / 2;

      for (let dy = -dotSize; dy <= dotSize; dy++) {
        for (let dx = -dotSize; dx <= dotSize; dx++) {
          const px = Math.floor(centerX + dx);
          const py = Math.floor(centerY + dy);

          if (px >= 0 && px < width && py >= 0 && py < height) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= radius) {
              const idx = (py * width + px) * 4;
              output[idx] = 0;
              output[idx + 1] = 0;
              output[idx + 2] = 0;
            }
          }
        }
      }
    }
  }

  for (let i = 0; i < data.length; i++) {
    data[i] = output[i];
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Random stipple pattern
 * Creates organic dot patterns based on density
 */
export function stipple(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  density: number = 0.5
): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const gray = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;

      // Probability of black pixel based on darkness
      const probability = (255 - gray) / 255 * density;
      const value = Math.random() < probability ? 0 : 255;

      data[idx] = value;
      data[idx + 1] = value;
      data[idx + 2] = value;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Get dither pattern for a value (0-1)
 * Returns CSS class name for the appropriate pattern
 */
export function getDitherPatternClass(value: number): string {
  if (value < 0.1) return '';
  if (value < 0.25) return 'pattern-stipple-light';
  if (value < 0.5) return 'pattern-diagonal';
  if (value < 0.75) return 'pattern-checker';
  if (value < 0.9) return 'pattern-stipple-dense';
  return 'bg-bit-black';
}

/**
 * Draw a 1-bit dithered rectangle on canvas based on value
 */
export function drawDitheredRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  value: number // 0-1, where 0 is white and 1 is black
): void {
  // Create a temporary canvas for the cell
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d')!;

  // Fill with grayscale value (inverted: value 1 = dark = gray 0)
  const grayValue = Math.round((1 - value) * 255);
  tempCtx.fillStyle = `rgb(${grayValue}, ${grayValue}, ${grayValue})`;
  tempCtx.fillRect(0, 0, width, height);

  // Apply Bayer dithering
  bayerDither4x4(tempCtx, width, height);

  // Draw to main canvas
  ctx.drawImage(tempCanvas, x, y);
}

/**
 * Draw aliased (pixelated) line - no anti-aliasing
 */
export function drawPixelLine(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string = '#000000'
): void {
  // Bresenham's line algorithm
  x0 = Math.round(x0);
  y0 = Math.round(y0);
  x1 = Math.round(x1);
  y1 = Math.round(y1);

  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  ctx.fillStyle = color;

  while (true) {
    ctx.fillRect(x0, y0, 1, 1);

    if (x0 === x1 && y0 === y1) break;

    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }
}

/**
 * Draw pixel-perfect rectangle outline
 */
export function drawPixelRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string = '#000000',
  lineWidth: number = 1
): void {
  ctx.fillStyle = color;

  // Top edge
  ctx.fillRect(x, y, width, lineWidth);
  // Bottom edge
  ctx.fillRect(x, y + height - lineWidth, width, lineWidth);
  // Left edge
  ctx.fillRect(x, y, lineWidth, height);
  // Right edge
  ctx.fillRect(x + width - lineWidth, y, lineWidth, height);
}
