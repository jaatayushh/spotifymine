import React, { useEffect, useRef } from 'react';

interface RealtimeAudioVisualizerProps {
  isPlaying: boolean;
  currentTime?: number;
  color?: string;
  height?: number;
  barCount?: number;
  className?: string;
}

export const RealtimeAudioVisualizer: React.FC<RealtimeAudioVisualizerProps> = ({
  isPlaying,
  currentTime = 0,
  color = '#1DB954',
  height = 36,
  barCount = 36,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 300);
    canvas.height = height;

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      canvas.height = height;
    };

    window.addEventListener('resize', handleResize);

    const smoothHeights = new Float32Array(barCount);
    let phase = currentTime * 8;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      phase += isPlaying ? 0.08 : 0.005;

      const gap = 3;
      const barWidth = Math.max(2, (width - gap * (barCount - 1)) / barCount);
      const halfHeight = height / 2;

      for (let i = 0; i < barCount; i++) {
        let targetVal = 0.08;

        if (isPlaying) {
          const f1 = Math.sin(phase + i * 0.28);
          const f2 = Math.cos(phase * 1.7 + i * 0.15);
          const f3 = Math.sin(phase * 2.3 + i * 0.4);

          targetVal = 0.15 + Math.abs(f1 * 0.45 + f2 * 0.3 + f3 * 0.25);
          targetVal = Math.min(1.0, Math.max(0.08, targetVal));
        }

        smoothHeights[i] += (targetVal - smoothHeights[i]) * 0.3;
        const currentVal = smoothHeights[i];

        const barH = Math.max(4, currentVal * (height * 0.9));
        const x = i * (barWidth + gap);
        const y = halfHeight - barH / 2;

        const grad = ctx.createLinearGradient(0, y, 0, y + barH);
        grad.addColorStop(0, color);
        grad.addColorStop(0.5, '#ffffff');
        grad.addColorStop(1, color);

        ctx.fillStyle = grad;
        ctx.shadowColor = color;
        ctx.shadowBlur = isPlaying ? 8 : 0;

        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barH, barWidth / 2);
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [isPlaying, currentTime, color, height, barCount]);

  return (
    <div className={`w-full flex items-center justify-center overflow-hidden ${className}`}>
      <canvas ref={canvasRef} className="w-full block" style={{ height: `${height}px` }} />
    </div>
  );
};
