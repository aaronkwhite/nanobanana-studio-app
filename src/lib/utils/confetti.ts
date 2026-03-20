// src/lib/utils/confetti.ts
import confetti from 'canvas-confetti';

export function celebrateBatchComplete() {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#FCD34D', '#FBBF24', '#F59E0B', '#F1F5F9', '#94A3B8'],
  });
}
