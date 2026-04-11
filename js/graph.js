/**
 * Graph rendering module using Chart.js.
 * @module graph
 */

import { getDateRange } from './heatmap.js';
import { addDays, toISODate, formatDateForDisplay } from './utils.js';
import { getCurrentColors } from './settings.js';

/** @type {Chart|null} */
let chartInstance = null;

/** @type {string} Current configuration type */
let currentType = 'cumulative';

/** @type {number} Playback speed */
let animationDuration = 1200;

/**
 * Initializes or updates the graph for the active timeline.
 * @param {Map<string, number>} dateCounts - Date counts.
 * @param {number} maxDays - Max timeline days.
 * @param {HTMLElement} canvas - Canvas element.
 */
export function generateGraph(dateCounts, maxDays, canvas) {
    const { start, end } = getDateRange(dateCounts, maxDays);
    const labels = [];
    const dataVals = [];
    let current = new Date(start);
    let cumulative = 0;

    // Build timeline arrays
    while (current <= end) {
        const iso = toISODate(current);
        const rawCount = dateCounts.get(iso) || 0;
        cumulative += rawCount;
        
        labels.push(formatDateForDisplay(iso));
        dataVals.push(currentType === 'cumulative' ? cumulative : rawCount);
        current = addDays(current, 1);
    }

    renderChart(canvas, labels, dataVals);
}

/**
 * Renders the Chart.js instance.
 * @param {HTMLElement} canvas - Target canvas.
 * @param {string[]} labels - X-axis labels.
 * @param {number[]} data - Y-axis data.
 */
function renderChart(canvas, labels, data) {
    if (chartInstance) {
        chartInstance.destroy();
    }

    const colors = getCurrentColors();
    const mainColor = colors[3] || '#4A90E2';
    const bgColor = mainColor + '33'; // 20% opacity hex
    
    const isArea = true; // Always show filled area for richness
    const isCumulative = currentType === 'cumulative';

    // Build progressive animation configuration
    const delayBetween = Math.max(1, animationDuration / Math.max(1, data.length));
    const animationConfig = {
        x: {
            type: 'number',
            easing: 'linear',
            duration: delayBetween,
            from: NaN,
            delay(ctx) {
                if (ctx.type !== 'data' || ctx.xStarted) { return 0; }
                ctx.xStarted = true;
                return ctx.index * delayBetween;
            }
        },
        y: {
            type: 'number',
            easing: 'linear',
            duration: delayBetween,
            from: (ctx) => {
                return ctx.index === 0 ? ctx.chart.scales.y.getPixelForValue(0) : ctx.chart.getDatasetMeta(ctx.datasetIndex).data[ctx.index - 1].getProps(['y'], true).y;
            },
            delay(ctx) {
                if (ctx.type !== 'data' || ctx.yStarted) { return 0; }
                ctx.yStarted = true;
                return ctx.index * delayBetween;
            }
        }
    };

    chartInstance = new window.Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Prompts',
                data: data,
                borderColor: mainColor,
                backgroundColor: isArea ? bgColor : 'transparent',
                fill: isArea,
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 5,
                pointBackgroundColor: mainColor,
                tension: 0.2 // Smooth curves
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: animationConfig,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#2b2b2b',
                    titleFont: { family: 'Inter', size: 13 },
                    bodyFont: { family: 'Inter', size: 14, weight: 'bold' },
                    padding: 10,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return isCumulative ? `${context.parsed.y} total prompts` : `${context.parsed.y} prompts`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false, drawBorder: false },
                    ticks: {
                        font: { family: 'Inter' },
                        maxTicksLimit: 12,
                        color: 'rgba(43,43,43,0.5)'
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: { 
                        color: 'rgba(43,43,43,0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        font: { family: 'Inter' },
                        color: 'rgba(43,43,43,0.5)',
                        precision: 0
                    }
                }
            }
        }
    });

}

/**
 * Changes graph display mode.
 * @param {string} type - 'line-animated', 'line', 'area'
 * @param {Map<string, number>} dateCounts 
 * @param {number} maxDays 
 * @param {HTMLElement} canvas 
 */
export function updateGraphType(type, dateCounts, maxDays, canvas) {
    currentType = type;
    if (dateCounts) {
        generateGraph(dateCounts, maxDays, canvas);
    }
}

/**
 * Updates colors.
 * @param {Map<string, number>} dateCounts 
 * @param {number} maxDays 
 * @param {HTMLElement} canvas 
 */
export function updateGraphColors(dateCounts, maxDays, canvas) {
    if (dateCounts) {
        generateGraph(dateCounts, maxDays, canvas);
    }
}

/**
 * Updates the graph animation speed.
 * @param {number} speedMs
 * @param {Map<string, number>} dateCounts 
 * @param {number} maxDays 
 * @param {HTMLElement} canvas 
 */
export function updateGraphSpeed(speedMs, dateCounts, maxDays, canvas) {
    animationDuration = speedMs;
    // Re-draw immediately to show off new speed
    if (dateCounts) {
        generateGraph(dateCounts, maxDays, canvas);
    }
}

/**
 * Clears current graph.
 */
export function disposeGraph() {
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }
}
