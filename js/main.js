/**
 * Main application module — orchestrates upload, parsing, and rendering.
 * @module main
 */

import { processFile } from './parser.js';
import { generateHeatmap } from './heatmap.js';
import { initSettings, onColorChange, getTimeline, onTimelineChange } from './settings.js';
import { init3D, dispose3D, updateColors } from './heatmap3d.js';
import { generateGraph, updateGraphType, updateGraphColors, disposeGraph, updateGraphSpeed } from './graph.js';
import { renderPromptsTab, disposePromptsTab } from './prompts.js';
import { exportToImage } from './export.js';

/* ---------- DOM References ---------- */

const header = document.getElementById('header');
const uploadSection = document.getElementById('upload-section');
const loadingSection = document.getElementById('loading-section');
const errorSection = document.getElementById('error-section');
const resultSection = document.getElementById('result-section');
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const errorMessage = document.getElementById('error-message');
const retryBtn = document.getElementById('retry-btn');
const heatmapContainer = document.getElementById('heatmap-container');
const legendContainer = document.getElementById('legend-container');
const statsContainer = document.getElementById('stats-container');
const threeContainer = document.getElementById('three-container');
const tabHeatmap = document.getElementById('tab-heatmap');
const tab3d = document.getElementById('tab-3d');
const tabGraph = document.getElementById('tab-graph');
const tabPrompts = document.getElementById('tab-prompts');
const faqSection = document.getElementById('faq-section');

const graphTypeSelect = document.getElementById('graph-type-select');
const graphSpeedSelect = document.getElementById('graph-speed-select');
const graphCanvas = document.getElementById('graph-canvas');

const promptsCanvas = document.getElementById('prompts-canvas');
const promptsList = document.getElementById('prompts-list');

/** @type {Map<string, number>|null} Stored date counts for 3D. */
let currentDateCounts = null;

/** @type {string[]|null} Stored parsed prompts. */
let currentPrompts = null;

/** @type {string} Currently active tab. */
let activeTab = 'heatmap';

/** @type {boolean} Whether 3D scene has been initialized. */
let is3DInitialized = false;

/* ---------- Section Visibility ---------- */

/**
 * Shows a section and hides all others.
 * @param {'upload' | 'loading' | 'error' | 'result'} name - Section name.
 */
function showSection(name) {
    const map = {
        upload: uploadSection,
        loading: loadingSection,
        error: errorSection,
        result: resultSection
    };
    Object.values(map).forEach(el => el.classList.add('hidden'));
    map[name]?.classList.remove('hidden');

    if (faqSection) {
        faqSection.classList.toggle('hidden', name === 'result' || name === 'loading');
    }
}

/* ---------- File Handling ---------- */

/**
 * Handles a file selection (from input or drop).
 * @param {File} file - The selected ZIP file.
 */
async function handleFile(file) {
    if (!file || (!file.name.endsWith('.zip') && !file.name.endsWith('.html'))) {
        showError('Please upload a .zip or .html file.');
        return;
    }
    showSection('loading');
    try {
        const data = await processFile(file);
        displayResults(data.dateCounts, data.prompts);
    } catch (err) {
        showError(err.message);
    }
}

/**
 * Displays the heatmap results.
 * @param {Map<string, number>} dateCounts - ISO date -> count.
 * @param {string[]} prompts - User prompts array.
 */
function displayResults(dateCounts, prompts) {
    currentDateCounts = dateCounts;
    currentPrompts = prompts;
    is3DInitialized = false;
    header.classList.add('hidden');
    generateHeatmap(dateCounts, heatmapContainer, legendContainer, statsContainer, getTimeline());
    switchTab('heatmap');
    showSection('result');
}

/**
 * Shows an error message to the user.
 * @param {string} message - Error description.
 */
function showError(message) {
    errorMessage.textContent = message;
    showSection('error');
}

/* ---------- Tab Switching ---------- */

/**
 * Switches between heatmap and 3D tabs.
 * @param {string} tab - Tab name ('heatmap' or '3d').
 */
function switchTab(tab) {
    activeTab = tab;
    updateTabButtons(tab);
    toggleTabPanels(tab);
    if (tab === '3d') initialize3DIfNeeded();
}

/**
 * Updates the active state on tab buttons.
 * @param {string} activeTabName - Active tab name.
 */
function updateTabButtons(activeTabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === activeTabName);
    });
}

/**
 * Shows the panel for the active tab and hides others.
 * @param {string} tab - Tab name.
 */
function toggleTabPanels(tab) {
    tabHeatmap.classList.toggle('hidden', tab !== 'heatmap');
    tab3d.classList.toggle('hidden', tab !== '3d');
    tabGraph.classList.toggle('hidden', tab !== 'graph');
    tabPrompts.classList.toggle('hidden', tab !== 'prompts');
}

/**
 * Initializes the 3D scene if not already done.
 */
function initialize3DIfNeeded() {
    if (is3DInitialized || !currentDateCounts) return;
    init3D(threeContainer, currentDateCounts, getTimeline());
    is3DInitialized = true;
}

/**
 * Initializes Graph scene if needed.
 */
function initializeGraphIfNeeded() {
    if (!currentDateCounts) return;
    generateGraph(currentDateCounts, getTimeline(), graphCanvas);
}

/**
 * Initializes Prompts visualization if needed.
 */
function initializePromptsIfNeeded() {
    if (!currentPrompts) return;
    renderPromptsTab(currentPrompts, promptsCanvas, promptsList);
}

/* ---------- Event: File Input ---------- */

/**
 * Handles file input change event.
 * @param {Event} event - The change event.
 */
function onFileInputChange(event) {
    const file = event.target.files?.[0];
    if (file) handleFile(file);
}

/* ---------- Event: Drop Zone ---------- */

/**
 * Opens the file picker when the drop zone is clicked.
 */
function onDropZoneClick() {
    fileInput.click();
}

/**
 * Opens the file picker on Enter/Space key.
 * @param {KeyboardEvent} event - The keyboard event.
 */
function onDropZoneKeydown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        fileInput.click();
    }
}

/**
 * Prevents default and adds visual feedback on drag over.
 * @param {DragEvent} event - The drag event.
 */
function onDragOver(event) {
    event.preventDefault();
    dropZone.classList.add('drag-over');
}

/**
 * Removes drag-over visual feedback.
 */
function onDragLeave() {
    dropZone.classList.remove('drag-over');
}

/**
 * Handles the file drop event.
 * @param {DragEvent} event - The drop event.
 */
function onDrop(event) {
    event.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = event.dataTransfer?.files?.[0];
    if (file) handleFile(file);
}

/* ---------- Event: Reset / Retry ---------- */

/**
 * Resets the app back to the upload state.
 */
function onReset() {
    fileInput.value = '';
    dispose3D();
    disposeGraph();
    disposePromptsTab();
    is3DInitialized = false;
    currentDateCounts = null;
    currentPrompts = null;
    header.classList.remove('hidden');
    showSection('upload');
}

/* ---------- Event: Tab Clicks ---------- */

/**
 * Handles tab button clicks.
 * @param {Event} event - Click event.
 */
function onTabClick(event) {
    const tab = event.currentTarget.dataset.tab;
    if (tab) {
        switchTab(tab);
        if (tab === 'graph') {
            initializeGraphIfNeeded();
        } else if (tab === 'prompts') {
            initializePromptsIfNeeded();
        }
    }
}

/* ---------- Color Change Handler ---------- */

/**
 * Handles color theme changes from settings.
 * @param {string[]} colors - New color levels.
 */
function onColorChanged(colors) {
    if (is3DInitialized) updateColors(colors);
    updateGraphColors(currentDateCounts, getTimeline(), graphCanvas);
}

/**
 * Handles timeline range updates.
 * @param {number} maxDays - New lookback days.
 */
function onTimelineChanged(maxDays) {
    if (!currentDateCounts) return;
    generateHeatmap(currentDateCounts, heatmapContainer, legendContainer, statsContainer, maxDays);
    if (activeTab === '3d') {
        init3D(threeContainer, currentDateCounts, maxDays);
        is3DInitialized = true;
    } else {
        is3DInitialized = false; // Forces re-init when switching to 3d
    }
    
    if (activeTab === 'graph') {
        generateGraph(currentDateCounts, maxDays, graphCanvas);
    }
}

/* ---------- Initialization ---------- */

/**
 * Binds all event listeners and initializes the app.
 */
function initApp() {
    fileInput.addEventListener('change', onFileInputChange);
    dropZone.addEventListener('click', onDropZoneClick);
    dropZone.addEventListener('keydown', onDropZoneKeydown);
    dropZone.addEventListener('dragover', onDragOver);
    dropZone.addEventListener('dragleave', onDragLeave);
    dropZone.addEventListener('drop', onDrop);
    retryBtn.addEventListener('click', onReset);
    bindTabEvents();
    initSettings();
    onColorChange(onColorChanged);
    onTimelineChange(onTimelineChanged);

    if (graphTypeSelect) {
        graphTypeSelect.addEventListener('change', (e) => {
            updateGraphType(e.target.value, currentDateCounts, getTimeline(), graphCanvas);
        });
    }

    if (graphSpeedSelect) {
        graphSpeedSelect.addEventListener('change', (e) => {
            updateGraphSpeed(parseInt(e.target.value, 10), currentDateCounts, getTimeline(), graphCanvas);
        });
    }

    const playGraphBtn = document.getElementById('play-graph-btn');
    if (playGraphBtn) {
        playGraphBtn.addEventListener('click', () => {
            if (currentDateCounts) {
                generateGraph(currentDateCounts, getTimeline(), graphCanvas);
            }
        });
    }

    // About modal logic
    const aboutBtn = document.getElementById('about-btn');
    const aboutModal = document.getElementById('about-modal');
    const aboutClose = document.getElementById('about-close');
    const aboutOverlay = document.getElementById('about-overlay');

    if (aboutBtn && aboutModal && aboutClose && aboutOverlay) {
        aboutBtn.addEventListener('click', () => aboutModal.classList.remove('hidden'));
        aboutClose.addEventListener('click', () => aboutModal.classList.add('hidden'));
        aboutOverlay.addEventListener('click', () => aboutModal.classList.add('hidden'));
    }

    // Export logic
    const downloadBtn = document.getElementById('download-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            if (currentDateCounts) {
                exportToImage(currentDateCounts);
            }
        });
    }

    // FAQ Accordion logic
    document.querySelectorAll('.faq-question').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.parentElement;
            item.classList.toggle('active');
        });
    });
}

/**
 * Binds click events to tab buttons.
 */
function bindTabEvents() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', onTabClick);
    });
}

initApp();
