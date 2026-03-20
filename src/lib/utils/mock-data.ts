// src/lib/utils/mock-data.ts
import type { Job, JobItem } from '$lib/types';

export function createMockJobs(): Job[] {
  const now = new Date().toISOString();

  return [
    // Pending job
    {
      id: 'mock-pending-1',
      status: 'pending',
      mode: 'text-to-image',
      prompt: 'A serene Japanese garden with cherry blossoms at sunset, watercolor style',
      output_size: '2K',
      temperature: 1,
      aspect_ratio: '16:9',
      batch_job_name: null,
      total_items: 3,
      completed_items: 0,
      failed_items: 0,
      created_at: now,
      updated_at: now,
    },
    // Processing job with progress
    {
      id: 'mock-processing-1',
      status: 'processing',
      mode: 'text-to-image',
      prompt: 'Cyberpunk cityscape at night with neon signs reflecting in rain puddles, cinematic lighting',
      output_size: '4K',
      temperature: 1.5,
      aspect_ratio: '16:9',
      batch_job_name: 'batches/mock-batch-1',
      total_items: 5,
      completed_items: 3,
      failed_items: 0,
      created_at: new Date(Date.now() - 120000).toISOString(),
      updated_at: now,
    },
    // Completed job
    {
      id: 'mock-completed-1',
      status: 'completed',
      mode: 'text-to-image',
      prompt: 'Abstract geometric patterns with golden hour lighting, minimalist composition',
      output_size: '1K',
      temperature: 0.5,
      aspect_ratio: '1:1',
      batch_job_name: 'batches/mock-batch-2',
      total_items: 2,
      completed_items: 2,
      failed_items: 0,
      created_at: new Date(Date.now() - 300000).toISOString(),
      updated_at: new Date(Date.now() - 240000).toISOString(),
    },
    // Another completed job (I2I)
    {
      id: 'mock-completed-2',
      status: 'completed',
      mode: 'image-to-image',
      prompt: 'Transform into Studio Ghibli anime style with soft pastel colors',
      output_size: '2K',
      temperature: 1,
      aspect_ratio: '4:3',
      batch_job_name: 'batches/mock-batch-3',
      total_items: 3,
      completed_items: 3,
      failed_items: 0,
      created_at: new Date(Date.now() - 600000).toISOString(),
      updated_at: new Date(Date.now() - 500000).toISOString(),
    },
    // Failed job
    {
      id: 'mock-failed-1',
      status: 'failed',
      mode: 'text-to-image',
      prompt: 'Photorealistic portrait of a fantasy dragon perched on a mountain peak',
      output_size: '4K',
      temperature: 2,
      aspect_ratio: '3:4',
      batch_job_name: 'batches/mock-batch-4',
      total_items: 4,
      completed_items: 1,
      failed_items: 3,
      created_at: new Date(Date.now() - 900000).toISOString(),
      updated_at: new Date(Date.now() - 800000).toISOString(),
    },
    // Cancelled job
    {
      id: 'mock-cancelled-1',
      status: 'cancelled',
      mode: 'text-to-image',
      prompt: 'Underwater coral reef scene with bioluminescent creatures',
      output_size: '2K',
      temperature: 1,
      aspect_ratio: '16:9',
      batch_job_name: 'batches/mock-batch-5',
      total_items: 6,
      completed_items: 2,
      failed_items: 0,
      created_at: new Date(Date.now() - 1200000).toISOString(),
      updated_at: new Date(Date.now() - 1100000).toISOString(),
    },
  ];
}

// Mock items for completed and failed jobs (with placeholder image data)
export function createMockJobItems(jobId: string): JobItem[] {
  const now = new Date().toISOString();

  if (jobId === 'mock-completed-1') {
    return [
      {
        id: 'mock-item-1a',
        job_id: jobId,
        input_prompt: 'Abstract geometric patterns with golden hour lighting, minimalist composition',
        input_image_path: null,
        output_image_path: 'mock://placeholder',
        status: 'completed',
        error: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'mock-item-1b',
        job_id: jobId,
        input_prompt: 'Abstract geometric patterns with golden hour lighting, minimalist composition',
        input_image_path: null,
        output_image_path: 'mock://placeholder',
        status: 'completed',
        error: null,
        created_at: now,
        updated_at: now,
      },
    ];
  }

  if (jobId === 'mock-completed-2') {
    return [
      {
        id: 'mock-item-2a',
        job_id: jobId,
        input_prompt: 'Transform into Studio Ghibli anime style',
        input_image_path: null,
        output_image_path: 'mock://placeholder',
        status: 'completed',
        error: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'mock-item-2b',
        job_id: jobId,
        input_prompt: 'Transform into Studio Ghibli anime style',
        input_image_path: null,
        output_image_path: 'mock://placeholder',
        status: 'completed',
        error: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'mock-item-2c',
        job_id: jobId,
        input_prompt: 'Transform into Studio Ghibli anime style',
        input_image_path: null,
        output_image_path: 'mock://placeholder',
        status: 'completed',
        error: null,
        created_at: now,
        updated_at: now,
      },
    ];
  }

  if (jobId === 'mock-failed-1') {
    return [
      {
        id: 'mock-item-3a',
        job_id: jobId,
        input_prompt: 'Photorealistic portrait of a fantasy dragon',
        input_image_path: null,
        output_image_path: 'mock://placeholder',
        status: 'completed',
        error: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'mock-item-3b',
        job_id: jobId,
        input_prompt: 'Photorealistic portrait of a fantasy dragon',
        input_image_path: null,
        output_image_path: null,
        status: 'failed',
        error: 'Content policy violation: image generation blocked',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'mock-item-3c',
        job_id: jobId,
        input_prompt: 'Photorealistic portrait of a fantasy dragon',
        input_image_path: null,
        output_image_path: null,
        status: 'failed',
        error: 'Rate limit exceeded',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'mock-item-3d',
        job_id: jobId,
        input_prompt: 'Photorealistic portrait of a fantasy dragon',
        input_image_path: null,
        output_image_path: null,
        status: 'failed',
        error: 'Internal server error',
        created_at: now,
        updated_at: now,
      },
    ];
  }

  return [];
}

// Generate a placeholder image as a data URL (colored rectangle with text)
export function generatePlaceholderImage(label: string, hue: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Gradient background
  const gradient = ctx.createLinearGradient(0, 0, 512, 512);
  gradient.addColorStop(0, `hsl(${hue}, 40%, 25%)`);
  gradient.addColorStop(1, `hsl(${hue + 40}, 50%, 35%)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);

  // Grid pattern
  ctx.strokeStyle = `hsla(${hue}, 30%, 50%, 0.15)`;
  ctx.lineWidth = 1;
  for (let i = 0; i < 512; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  // Label text
  ctx.fillStyle = `hsla(${hue}, 20%, 80%, 0.8)`;
  ctx.font = '16px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, 256, 256);
  ctx.font = '12px -apple-system, sans-serif';
  ctx.fillStyle = `hsla(${hue}, 20%, 70%, 0.5)`;
  ctx.fillText('Mock Preview', 256, 280);

  return canvas.toDataURL('image/png');
}
