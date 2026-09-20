/**
 * Interactive Blueprint & Architectural Drafter Studio
 * Handles touch & pointer sketching with realistic pencil audio FX (sketch.mp3)
 * Inspired by Inventiko Hearthstone Real Estate architectural demo
 */

interface Point {
  x: number;
  y: number;
}

export function initBlueprintDrafter(): void {
  const container = document.getElementById('blueprint-studio-stage');
  const canvas = document.getElementById('blueprint-drafter-canvas') as HTMLCanvasElement | null;
  if (!container || !canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Audio setup for realistic graphite sketching FX
  let sketchAudio: HTMLAudioElement | null = null;
  let isAudioPlaying = false;
  let soundMuted = false;

  function initAudio() {
    if (sketchAudio) return;
    try {
      sketchAudio = new Audio('/audio/sketch.mp3');
      sketchAudio.loop = true;
      sketchAudio.volume = 0.55;
    } catch {
      sketchAudio = null;
    }
  }

  function startSketchSound() {
    if (soundMuted) return;
    initAudio();
    if (!sketchAudio) return;

    if (!isAudioPlaying) {
      isAudioPlaying = true;
      sketchAudio.play().catch(() => {
        isAudioPlaying = false;
      });
    }
  }

  function stopSketchSound() {
    if (sketchAudio && isAudioPlaying) {
      sketchAudio.pause();
      sketchAudio.currentTime = 0;
      isAudioPlaying = false;
    }
  }

  // Canvas drawing state
  let isDrawing = false;
  let currentColor = '#2b2823'; // Graphite Charcoal
  let currentWidth = 2.5;
  let points: Point[] = [];

  // High DPI sizing
  function resizeCanvas() {
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Save existing drawings
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx && canvas.width > 0 && canvas.height > 0) {
      tempCtx.drawImage(canvas, 0, 0);
    }

    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    ctx!.scale(dpr, dpr);
    ctx!.lineCap = 'round';
    ctx!.lineJoin = 'round';

    // Restore drawings
    if (tempCtx && tempCanvas.width > 0 && tempCanvas.height > 0) {
      ctx!.drawImage(tempCanvas, 0, 0, rect.width, rect.height);
    }
  }

  // Initial sizing
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas, { passive: true });

  function getCanvasCoords(e: PointerEvent | MouseEvent | Touch): Point {
    const rect = canvas!.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  function startDrawing(x: number, y: number) {
    isDrawing = true;
    points = [{ x, y }];
    startSketchSound();

    ctx!.beginPath();
    ctx!.strokeStyle = currentColor;
    ctx!.lineWidth = currentWidth;
    ctx!.moveTo(x, y);
  }

  function draw(x: number, y: number) {
    if (!isDrawing) return;
    points.push({ x, y });

    // Smooth quadratic curve rendering
    if (points.length >= 3) {
      const p0 = points[points.length - 3];
      const p1 = points[points.length - 2];
      const p2 = points[points.length - 1];

      if (p0 && p1 && p2) {
        const mid1 = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
        const mid2 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

        ctx!.beginPath();
        ctx!.strokeStyle = currentColor;
        ctx!.lineWidth = currentWidth;
        ctx!.moveTo(mid1.x, mid1.y);
        ctx!.quadraticCurveTo(p1.x, p1.y, mid2.x, mid2.y);
        ctx!.stroke();
      }
    } else {
      ctx!.lineTo(x, y);
      ctx!.stroke();
    }
  }

  function endDrawing() {
    if (!isDrawing) return;
    isDrawing = false;
    points = [];
    stopSketchSound();
  }

  // Pointer & Touch events with passive: false to prevent mobile scrolling during sketch
  canvas.addEventListener('pointerdown', (e: PointerEvent) => {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    const coords = getCanvasCoords(e);
    startDrawing(coords.x, coords.y);
  });

  canvas.addEventListener('pointermove', (e: PointerEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const coords = getCanvasCoords(e);
    draw(coords.x, coords.y);
  });

  canvas.addEventListener('pointerup', (e: PointerEvent) => {
    e.preventDefault();
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {}
    endDrawing();
  });

  canvas.addEventListener('pointercancel', () => {
    endDrawing();
  });

  // Touch fallback & explicit scroll cancellation
  canvas.addEventListener('touchstart', (e: TouchEvent) => {
    if (e.touches.length === 1 && e.touches[0]) {
      e.preventDefault();
      const t = e.touches[0];
      const coords = getCanvasCoords(t);
      startDrawing(coords.x, coords.y);
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e: TouchEvent) => {
    if (isDrawing && e.touches.length === 1 && e.touches[0]) {
      e.preventDefault();
      const t = e.touches[0];
      const coords = getCanvasCoords(t);
      draw(coords.x, coords.y);
    }
  }, { passive: false });

  canvas.addEventListener('touchend', (e: TouchEvent) => {
    e.preventDefault();
    endDrawing();
  }, { passive: false });

  // Toolbar controls
  const toolButtons = document.querySelectorAll<HTMLButtonElement>('[data-drafter-tool]');
  toolButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      toolButtons.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');

      const tool = btn.getAttribute('data-drafter-tool');
      if (tool === 'graphite') {
        currentColor = '#2b2823';
        currentWidth = 2.5;
      } else if (tool === 'blueprint') {
        currentColor = '#0284c7';
        currentWidth = 2.5;
      } else if (tool === 'terracotta') {
        currentColor = '#b45309';
        currentWidth = 3;
      } else if (tool === 'highlighter') {
        currentColor = 'rgba(234, 179, 8, 0.45)';
        currentWidth = 14;
      }
    });
  });

  // Clear button
  const clearBtn = document.getElementById('blueprint-clear-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      const rect = container.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
    });
  }

  // Local Sound toggle
  const soundBtn = document.getElementById('blueprint-sound-btn');
  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      soundMuted = !soundMuted;
      soundBtn.classList.toggle('is-muted', soundMuted);
      soundBtn.setAttribute('aria-label', soundMuted ? 'Unmute pencil sketching sound' : 'Mute pencil sketching sound');
      const soundText = soundBtn.querySelector('.sound-btn-text');
      if (soundText) {
        soundText.textContent = soundMuted ? 'Audio: Muted' : 'Pencil FX: ON';
      }
      if (soundMuted) {
        stopSketchSound();
      }
    });
  }
}

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBlueprintDrafter);
  } else {
    initBlueprintDrafter();
  }
}
