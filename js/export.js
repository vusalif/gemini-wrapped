/**
 * Image export module — generates a high-fidelity 1080x1920 summary card.
 * @module export
 */

import { formatDateForDisplay } from './utils.js';

/**
 * Generates and downloads the summary image.
 * @param {Map<string, number>} dateCounts - ISO date -> count.
 */
export async function exportToImage(dateCounts) {
    if (!dateCounts || dateCounts.size === 0) return;

    // Use a higher internal scale for "retina" quality sharpness
    const scale = 2;
    const baseW = 1080;
    const baseH = 1920;
    const width = baseW * scale;
    const height = baseH * scale;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    // Wait for fonts to be ready
    await document.fonts.ready;

    // Stats calculation
    let total = 0;
    let maxVal = 0;
    let maxKey = '';
    for (const [k, v] of dateCounts) {
        total += v;
        if (v > maxVal) { maxVal = v; maxKey = k; }
    }
    const activeDays = dateCounts.size;
    const busiestDay = maxKey ? formatDateForDisplay(maxKey) : 'N/A';

    // Styling constants
    const bg = '#f5f5ed';
    const secondary = '#2b2b2b';
    const accent = '#a1b9ed';

    // 1. Draw solid background
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, baseW, baseH);

    // 2. Subtle background noise texture for "human-made" warmth
    ctx.globalAlpha = 0.03;
    for (let i = 0; i < 10000; i++) {
        const x = Math.random() * baseW;
        const y = Math.random() * baseH;
        ctx.fillStyle = secondary;
        ctx.fillRect(x, y, 1.5, 1.5);
    }
    ctx.globalAlpha = 1.0;

    // 3. Artistic Background Elements (Glows)
    const drawGlow = (x, y, radius, color) => {
        const grd = ctx.createRadialGradient(x, y, 0, x, y, radius);
        grd.addColorStop(0, color);
        grd.addColorStop(1, 'transparent');
        ctx.fillStyle = grd;
        ctx.globalAlpha = 0.15;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    };
    drawGlow(baseW * 0.8, 200, 600, accent);
    drawGlow(baseW * 0.2, baseH * 0.8, 800, accent);

    // 4. Header Section
    ctx.textAlign = 'center';
    ctx.fillStyle = secondary;
    
    // Badge
    const badgeY = 180;
    ctx.font = '600 24px "Inter", sans-serif';
    const badgeText = `GEMINI WRAPPED ${new Date().getFullYear()}`;
    const badgeW = ctx.measureText(badgeText).width + 40;
    ctx.fillStyle = secondary;
    ctx.beginPath();
    ctx.roundRect(baseW / 2 - badgeW / 2, badgeY - 26, badgeW, 44, 22);
    ctx.fill();
    ctx.fillStyle = bg;
    ctx.fillText(badgeText, baseW / 2, badgeY + 4);

    // Title
    ctx.fillStyle = secondary;
    ctx.font = '700 96px "Inter", sans-serif';
    ctx.fillText('My Activity', baseW / 2, 360);

    // 5. Stat Cards Helper
    const drawStatCard = (label, value, y) => {
        const cardW = 860;
        const cardH = 240;
        const cardX = (baseW - cardW) / 2;
        
        // Card Body
        ctx.fillStyle = 'white';
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.roundRect(cardX, y, cardW, cardH, 24);
        ctx.fill();
        
        // Subtle Border
        ctx.strokeStyle = secondary;
        ctx.globalAlpha = 0.06;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.globalAlpha = 1.0;

        // Content
        ctx.textAlign = 'center';
        ctx.fillStyle = secondary;
        ctx.globalAlpha = 0.5;
        ctx.font = '600 28px "Inter", sans-serif';
        ctx.fillText(label.toUpperCase(), baseW / 2, y + 70);
        
        ctx.globalAlpha = 1.0;
        ctx.font = '700 84px "Inter", sans-serif';
        // Handle long dates
        let displayVal = value;
        if (value.length > 15) {
            ctx.font = '700 64px "Inter", sans-serif';
        }
        ctx.fillText(displayVal, baseW / 2, y + 170);
    };

    const startY = 520;
    const gap = 280;

    drawStatCard('Total Prompts Shared', total.toLocaleString(), startY);
    drawStatCard('Days with Gemini', activeDays.toLocaleString(), startY + gap);
    drawStatCard('Peak Daily Activity', maxVal.toLocaleString(), startY + gap * 2);
    drawStatCard('Most Active On', busiestDay, startY + gap * 3);

    // 6. Footer
    ctx.textAlign = 'center';
    ctx.fillStyle = secondary;
    ctx.globalAlpha = 0.4;
    ctx.font = '600 32px "Inter", sans-serif';
    ctx.fillText('gemini.rot.bio', baseW / 2, baseH - 120);
    
    // Aesthetic dot detail
    ctx.globalAlpha = 0.1;
    ctx.beginPath();
    ctx.arc(baseW / 2, baseH - 180, 4, 0, Math.PI * 2);
    ctx.fill();

    // Trigger high-quality download
    const link = document.createElement('a');
    link.download = `gemini-wrapped-${new Date().getFullYear()}.png`;
    // Use maximum quality (1.0) for PNG
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
}
