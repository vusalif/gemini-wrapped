/**
 * Heatmap rendering module — builds a GitHub-style contribution grid.
 * @module heatmap
 */

import { toISODate, addDays, getMonthName, getWeekStart, formatDateForDisplay } from './utils.js';

/** @type {number} Cell dimensions in pixels. */
const CELL_SIZE = 13;

/** @type {number} Gap between cells in pixels. */
const CELL_GAP = 3;

/**
 * Determines intensity level (0–4) for a given count.
 * @param {number} count - Message count for the day.
 * @param {number} max - Maximum count across all days.
 * @returns {number} Level from 0 to 4.
 */
export function getLevel(count, max) {
    if (count === 0 || max === 0) return 0;
    const ratio = count / max;
    if (ratio <= 0.25) return 1;
    if (ratio <= 0.50) return 2;
    if (ratio <= 0.75) return 3;
    return 4;
}

/**
 * Calculates grid date range capped to the last maxDays days.
 * @param {Map<string, number>} dateCounts - ISO date -> count.
 * @param {number} maxDays - Max lookback days.
 * @returns {{ start: Date, end: Date }} Aligned date range.
 */
export function getDateRange(dateCounts, maxDays) {
    const sorted = Array.from(dateCounts.keys()).sort();
    const last = new Date(sorted[sorted.length - 1] + 'T00:00:00');
    const earliest = addDays(last, -(maxDays - 1));
    return {
        start: getWeekStart(earliest),
        end: addDays(getWeekStart(last), 6)
    };
}

/**
 * Finds month boundaries for label positioning.
 * @param {Date} start - Grid start date (Sunday).
 * @param {Date} end - Grid end date.
 * @returns {Array<{month: number, weekIndex: number}>} Boundaries.
 */
function getMonthBoundaries(start, end) {
    const boundaries = [];
    let current = new Date(start);
    let lastMonth = -1;
    let weekIndex = 0;

    while (current <= end) {
        const month = current.getMonth();
        if (month !== lastMonth) {
            boundaries.push({ month, weekIndex });
            lastMonth = month;
        }
        current = addDays(current, 7);
        weekIndex++;
    }
    return boundaries;
}

/**
 * Builds tooltip text for a cell.
 * @param {string} isoDate - ISO date string.
 * @param {number} count - Message count.
 * @returns {string} Tooltip text.
 */
function buildTooltip(isoDate, count) {
    const display = formatDateForDisplay(isoDate);
    if (count === 0) return `${display} — no prompts`;
    const noun = count === 1 ? 'prompt' : 'prompts';
    return `${display} — ${count} ${noun}`;
}

/**
 * Creates a single day cell element.
 * @param {string} isoDate - ISO date string.
 * @param {number} count - Message count.
 * @param {number} level - Intensity level (0–4).
 * @returns {HTMLElement} Cell div element.
 */
function createCell(isoDate, count, level) {
    const cell = document.createElement('div');
    cell.className = `cell level-${level}`;
    cell.dataset.tooltip = buildTooltip(isoDate, count);
    return cell;
}

/**
 * Renders the grid of day cells.
 * @param {Map<string, number>} dateCounts - ISO date -> count.
 * @param {Date} start - Grid start date.
 * @param {Date} end - Grid end date.
 * @param {number} maxCount - Maximum daily count.
 * @returns {HTMLElement} Grid element.
 */
function renderGrid(dateCounts, start, end, maxCount) {
    const grid = document.createElement('div');
    grid.className = 'heatmap-grid';
    const totalDays = daysBetween(start, end) + 1;

    for (let i = 0; i < totalDays; i++) {
        const date = addDays(start, i);
        const iso = toISODate(date);
        const count = dateCounts.get(iso) || 0;
        grid.appendChild(createCell(iso, count, getLevel(count, maxCount)));
    }
    return grid;
}

/**
 * Calculates whole days between two dates.
 * @param {Date} a - Start date.
 * @param {Date} b - End date.
 * @returns {number} Number of days.
 */
function daysBetween(a, b) {
    return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

/**
 * Renders month labels positioned above the grid.
 * @param {Date} start - Grid start date.
 * @param {Date} end - Grid end date.
 * @returns {HTMLElement} Month labels container.
 */
function renderMonthLabels(start, end) {
    const container = document.createElement('div');
    container.className = 'month-labels';
    const cellWidth = CELL_SIZE + CELL_GAP;

    getMonthBoundaries(start, end).forEach(({ month, weekIndex }) => {
        const label = document.createElement('span');
        label.className = 'month-label';
        label.textContent = getMonthName(month);
        label.style.left = `${weekIndex * cellWidth}px`;
        container.appendChild(label);
    });
    return container;
}

/**
 * Renders weekday labels (Mon, Wed, Fri).
 * @returns {HTMLElement} Day labels container.
 */
function renderDayLabels() {
    const container = document.createElement('div');
    container.className = 'day-labels';
    const labels = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

    labels.forEach(text => {
        const span = document.createElement('span');
        span.className = 'day-label';
        span.textContent = text;
        container.appendChild(span);
    });
    return container;
}

/**
 * Renders the Less/More legend.
 * @returns {HTMLElement} Legend element.
 */
export function renderLegend() {
    const container = document.createElement('div');
    container.className = 'legend';
    container.appendChild(createLabel('Less'));

    for (let i = 0; i <= 4; i++) {
        const cell = document.createElement('div');
        cell.className = `cell level-${i}`;
        container.appendChild(cell);
    }
    container.appendChild(createLabel('More'));
    return container;
}

/**
 * Creates a text label span.
 * @param {string} text - Label text.
 * @returns {HTMLElement} Span element.
 */
function createLabel(text) {
    const span = document.createElement('span');
    span.className = 'legend-label';
    span.textContent = text;
    return span;
}

/**
 * Builds the inner HTML for stats.
 * @param {Map<string, number>} dateCounts - Date counts map.
 * @returns {string} HTML string.
 */
function buildStatsHTML(dateCounts) {
    const total = sumValues(dateCounts);
    const activeDays = dateCounts.size;
    const max = findMaxEntry(dateCounts);
    const busiestFormatted = formatDateForDisplay(max.key);
    return `
        <div class="stat">
            <span class="stat-value">${total.toLocaleString()}</span>
            <span class="stat-label">total prompts</span>
        </div>
        <div class="stat">
            <span class="stat-value">${activeDays}</span>
            <span class="stat-label">active days</span>
        </div>
        <div class="stat">
            <span class="stat-value">${max.value}</span>
            <span class="stat-label">most in a day</span>
        </div>
        <div class="stat">
            <span class="stat-value">${busiestFormatted}</span>
            <span class="stat-label">busiest day</span>
        </div>`;
}

/**
 * Sums all values in a Map.
 * @param {Map<string, number>} map - The map to sum.
 * @returns {number} Sum of all values.
 */
function sumValues(map) {
    let sum = 0;
    for (const v of map.values()) sum += v;
    return sum;
}

/**
 * Finds the entry with the highest value.
 * @param {Map<string, number>} map - Map to search.
 * @returns {{key: string, value: number}} Max entry.
 */
function findMaxEntry(map) {
    let maxKey = '';
    let maxVal = 0;
    for (const [k, v] of map) {
        if (v > maxVal) { maxKey = k; maxVal = v; }
    }
    return { key: maxKey, value: maxVal };
}

/**
 * Main entry: generates and renders the full heatmap.
 * @param {Map<string, number>} dateCounts - ISO date -> count.
 * @param {HTMLElement} heatmapEl - Container for the heatmap grid.
 * @param {HTMLElement} legendEl - Container for the legend.
 * @param {HTMLElement} statsEl - Container for the stats.
 * @param {number} maxDays - Max days to show.
 */
export function generateHeatmap(dateCounts, heatmapEl, legendEl, statsEl, maxDays) {
    const { start, end } = getDateRange(dateCounts, maxDays);
    const maxCount = Math.max(...dateCounts.values());

    renderIntoContainer(heatmapEl, dateCounts, start, end, maxCount);
    legendEl.innerHTML = '';
    legendEl.appendChild(renderLegend());
    statsEl.innerHTML = buildStatsHTML(dateCounts);
}

/**
 * Assembles the heatmap wrapper (months + grid) into a container.
 * @param {HTMLElement} container - Target container.
 * @param {Map<string, number>} dateCounts - Date counts.
 * @param {Date} start - Grid start.
 * @param {Date} end - Grid end.
 * @param {number} maxCount - Maximum daily count.
 */
function renderIntoContainer(container, dateCounts, start, end, maxCount) {
    container.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'heatmap-wrapper';

    const monthsRow = document.createElement('div');
    monthsRow.className = 'heatmap-months';
    const spacer = document.createElement('div');
    spacer.style.width = '36px';
    spacer.style.flexShrink = '0';
    monthsRow.appendChild(spacer);
    monthsRow.appendChild(renderMonthLabels(start, end));

    const body = document.createElement('div');
    body.className = 'heatmap-body';
    body.appendChild(renderDayLabels());
    body.appendChild(renderGrid(dateCounts, start, end, maxCount));

    wrapper.appendChild(monthsRow);
    wrapper.appendChild(body);
    container.appendChild(wrapper);
}
