/**
 * Settings module — manages heatmap color themes.
 * @module settings
 */

/** @type {Object<string, {name: string, levels: string[]}>} */
const PRESETS = {
    green:  { name: 'Green',  levels: ['#e2e2da', '#9be9a8', '#40c463', '#30a14e', '#216e39'] },
    blue:   { name: 'Blue',   levels: ['#e2e2da', '#a1c4e9', '#5b9bd5', '#2e75b6', '#1b4f72'] },
    purple: { name: 'Purple', levels: ['#e2e2da', '#c9b1d9', '#9b6dbd', '#7b3fa0', '#541d80'] },
    orange: { name: 'Orange', levels: ['#e2e2da', '#fdc68a', '#fd8d3c', '#e6550d', '#a63603'] },
    pink:   { name: 'Pink',   levels: ['#e2e2da', '#f5b7c4', '#e8637a', '#c2294e', '#7a0132'] },
};

/** @type {string} Current preset key. */
let activePreset = 'green';

/** @type {Function|null} */
let changeCallback = null;

/** @type {Function|null} */
let timelineCallback = null;

/** @type {number} */
let currentTimeline = 365;

/**
 * Returns the current color levels array.
 * @returns {string[]} Five color strings [level0..level4].
 */
export function getCurrentColors() {
    return PRESETS[activePreset].levels;
}

/**
 * Returns current timeline in days.
 * @returns {number} Days count.
 */
export function getTimeline() {
    return currentTimeline;
}

/**
 * Returns all available presets.
 * @returns {Object} Preset definitions.
 */
export function getPresets() {
    return PRESETS;
}
/**
 * Registers a callback fired when timeline changes.
 * @param {Function} cb - Receives timeline value.
 */
export function onTimelineChange(cb) {
    timelineCallback = cb;
}
/**
 * Registers a callback fired when colors change.
 * @param {Function} cb - Receives the new levels array.
 */
export function onColorChange(cb) {
    changeCallback = cb;
}

/**
 * Applies a color preset to CSS custom properties.
 * @param {string} key - Preset key (e.g., 'green').
 */
export function applyPreset(key) {
    if (!PRESETS[key]) return;
    activePreset = key;
    setCSSVariables(PRESETS[key].levels);
    highlightActiveSwatch(key);
    if (changeCallback) changeCallback(PRESETS[key].levels);
}

/**
 * Sets CSS custom properties for level colors.
 * @param {string[]} levels - Five color hex strings.
 */
function setCSSVariables(levels) {
    const root = document.documentElement;
    levels.forEach((color, i) => {
        root.style.setProperty(`--level-${i}`, color);
    });
}

/**
 * Highlights the active swatch button.
 * @param {string} activeKey - Currently active preset key.
 */
function highlightActiveSwatch(activeKey) {
    document.querySelectorAll('.color-swatch').forEach(el => {
        el.classList.toggle('active', el.dataset.preset === activeKey);
    });
}

/**
 * Opens the settings modal.
 */
export function openModal() {
    document.getElementById('settings-modal')?.classList.remove('hidden');
}

/**
 * Closes the settings modal.
 */
export function closeModal() {
    document.getElementById('settings-modal')?.classList.add('hidden');
}

/**
 * Builds swatch buttons inside the container.
 * @param {HTMLElement} container - Target container.
 */
function buildSwatches(container) {
    Object.entries(PRESETS).forEach(([key, preset]) => {
        const item = createSwatchItem(key, preset);
        container.appendChild(item);
    });
}

/**
 * Creates a single swatch item (button + label).
 * @param {string} key - Preset key.
 * @param {{name: string, levels: string[]}} preset - Preset data.
 * @returns {HTMLElement} Swatch wrapper element.
 */
function createSwatchItem(key, preset) {
    const wrapper = document.createElement('div');
    wrapper.className = 'swatch-item';

    const btn = document.createElement('button');
    btn.className = 'color-swatch';
    btn.dataset.preset = key;
    btn.title = preset.name;
    btn.style.background = buildSwatchGradient(preset.levels);
    btn.addEventListener('click', () => applyPreset(key));

    const label = document.createElement('span');
    label.className = 'swatch-label';
    label.textContent = preset.name;

    wrapper.appendChild(btn);
    wrapper.appendChild(label);
    return wrapper;
}

/**
 * Builds a linear gradient string from level colors.
 * @param {string[]} levels - Color array.
 * @returns {string} CSS gradient value.
 */
function buildSwatchGradient(levels) {
    return `linear-gradient(135deg, ${levels[1]}, ${levels[3]})`;
}

/**
 * Initializes the settings UI and binds events.
 */
export function initSettings() {
    const container = document.getElementById('swatches-container');
    if (!container) return;
    buildSwatches(container);
    applyPreset('green');
    bindModalEvents();
}

/**
 * Binds open/close events for the settings modal and timeline select.
 */
function bindModalEvents() {
    document.getElementById('settings-btn')
        ?.addEventListener('click', openModal);
    document.getElementById('settings-close')
        ?.addEventListener('click', closeModal);
    document.getElementById('settings-overlay')
        ?.addEventListener('click', closeModal);

    const select = document.getElementById('timeline-select');
    if (select) {
        select.addEventListener('change', (e) => {
            currentTimeline = parseInt(e.target.value, 10);
            if (timelineCallback) timelineCallback(currentTimeline);
        });
    }
}
