/**
 * Image export module — generates a 1080x1920 summary card.
 * @module export
 */

import { formatDateForDisplay } from './utils.js';

/**
 * Generates and downloads the summary image.
 * @param {Map<string, number>} dateCounts - ISO date -> count.
 */
export async function exportToImage(dateCounts) {
    if (!dateCounts || dateCounts.size === 0) return;

    const width = 1080;
    const height = 1920;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Wait for fonts to be ready
    await document.fonts.ready;

    // Stats
    let total = 0;
    let maxVal = 0;
    let maxKey = '';
    for (const [k, v] of dateCounts) {
        total += v;
        if (v > maxVal) { maxVal = v; maxKey = k; }
    }
    const activeDays = dateCounts.size;
    const busiestDay = maxKey ? formatDateForDisplay(maxKey) : 'N/A';

    // Styling
    const bg = '#f5f5ed';
    const secondary = '#2b2b2b';
    const accent = '#a1b9ed';

    // Draw Background
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Accent Decorations
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.15;
    ctx.beginPath();
    ctx.arc(width, 0, 800, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, height, 600, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // Title
    ctx.fillStyle = secondary;
    ctx.textAlign = 'center';
    ctx.font = '700 80px "Inter", sans-serif';
    ctx.fillText('GEMINI', width / 2, 300);
    ctx.fillText('WRAPPED', width / 2, 410);

    // Separator
    ctx.strokeStyle = secondary;
    ctx.globalAlpha = 0.1;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(340, 480);
    ctx.lineTo(740, 480);
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    // Helper to draw a stat block
    const drawStatBlock = (label, value, y) => {
        ctx.textAlign = 'center';
        
        ctx.fillStyle = secondary;
        ctx.globalAlpha = 0.45;
        ctx.font = '500 32px "Inter", sans-serif';
        ctx.fillText(label.toUpperCase(), width / 2, y);
        
        ctx.globalAlpha = 1.0;
        ctx.font = '700 110px "Inter", sans-serif';
        // Adjust font size for long dates
        if (value.length > 12) ctx.font = '700 80px "Inter", sans-serif';
        ctx.fillText(value, width / 2, y + 130);
    };

    const statsY = 700;
    const spacing = 280;

    drawStatBlock('total prompts', total.toLocaleString(), statsY);
    drawStatBlock('active days', activeDays.toLocaleString(), statsY + spacing);
    drawStatBlock('most in a day', maxVal.toLocaleString(), statsY + spacing * 2);
    drawStatBlock('busiest day', busiestDay, statsY + spacing * 3);

    // Footer
    ctx.fillStyle = secondary;
    ctx.globalAlpha = 0.3;
    ctx.font = '500 28px "Inter", sans-serif';
    ctx.fillText('gemini-wrapped.com', width / 2, height - 120);

    // Trigger download
    const link = document.createElement('a');
    link.download = `gemini-stats-${new Date().getFullYear()}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
}
