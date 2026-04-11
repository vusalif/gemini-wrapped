/**
 * 3D heatmap visualization as a cityscape using Three.js.
 * @module heatmap3d
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { toISODate, addDays, getWeekStart, formatDateForDisplay } from './utils.js';
import { getLevel } from './heatmap.js';
import { getCurrentColors } from './settings.js';

/** @type {number} Bar width/depth. */
const BAR_SIZE = 0.8;

/** @type {number} Spacing between bars. */
const SPACING = 1.1;

/** @type {number} Maximum bar height. */
const MAX_HEIGHT = 18;

/** @type {number} Minimum bar height (empty days). */
const MIN_HEIGHT = 0.12;

/** @type {THREE.Scene|null} */
let scene = null;

/** @type {THREE.WebGLRenderer|null} */
let renderer = null;

/** @type {THREE.PerspectiveCamera|null} */
let camera = null;

/** @type {OrbitControls|null} */
let controls = null;

/** @type {number|null} */
let animationId = null;

/** @type {THREE.Mesh[]} */
let bars = [];

/** @type {ResizeObserver|null} */
let resizeObserver = null;

/** @type {THREE.Raycaster|null} */
let raycaster = null;

/** @type {THREE.Vector2|null} */
let mouse = null;

/** @type {HTMLElement|null} */
let tooltip = null;

/* ===================== Public API ===================== */

/**
 * Initializes the 3D scene and renders bars.
 * @param {HTMLElement} container - Canvas container element.
 * @param {Map<string, number>} dateCounts - ISO date -> count.
 * @param {number} maxDays - Max lookback days.
 */
export function init3D(container, dateCounts, maxDays) {
    dispose3D();
    const { width, height } = container.getBoundingClientRect();
    if (width === 0 || height === 0) return;

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    tooltip = document.getElementById('three-tooltip');

    scene = buildScene();
    camera = buildCamera(width, height);
    renderer = buildRenderer(width, height);
    container.appendChild(renderer.domElement);

    controls = buildControls(camera, renderer.domElement);
    addLighting(scene);
    addGround(scene, dateCounts, maxDays);
    generateBars(scene, dateCounts, maxDays);
    animate();
    observeResize(container);

    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseleave', onMouseLeave);
}

/**
 * Disposes all 3D resources.
 */
export function dispose3D() {
    if (animationId) cancelAnimationFrame(animationId);
    disposeBars();
    if (renderer) {
        renderer.domElement?.removeEventListener('mousemove', onMouseMove);
        renderer.domElement?.removeEventListener('mouseleave', onMouseLeave);
        renderer.dispose();
        renderer.domElement?.remove();
    }
    if (resizeObserver) resizeObserver.disconnect();
    scene = camera = renderer = controls = animationId = resizeObserver = raycaster = mouse = tooltip = null;
}

/**
 * Updates bar colors when color theme changes.
 * @param {string[]} colors - New color levels array.
 */
export function updateColors(colors) {
    bars.forEach(mesh => {
        mesh.material.color.set(colors[mesh.userData.level]);
    });
}

/* ===================== Scene Setup ===================== */

/**
 * Creates and configures the scene.
 * @returns {THREE.Scene} The scene.
 */
function buildScene() {
    const s = new THREE.Scene();
    s.background = new THREE.Color('#f5f5ed');
    s.fog = new THREE.Fog('#f5f5ed', 80, 120);
    return s;
}

/**
 * Creates a perspective camera.
 * @param {number} w - Viewport width.
 * @param {number} h - Viewport height.
 * @returns {THREE.PerspectiveCamera} Camera.
 */
function buildCamera(w, h) {
    const cam = new THREE.PerspectiveCamera(45, w / h, 0.1, 200);
    cam.position.set(58, 28, 22);
    return cam;
}

/**
 * Creates the WebGL renderer.
 * @param {number} w - Width.
 * @param {number} h - Height.
 * @returns {THREE.WebGLRenderer} Renderer.
 */
function buildRenderer(w, h) {
    const r = new THREE.WebGLRenderer({ antialias: true });
    r.setSize(w, h);
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    return r;
}

/**
 * Creates orbit controls for camera interaction.
 * @param {THREE.Camera} cam - Camera.
 * @param {HTMLElement} el - Dom element.
 * @returns {OrbitControls} Controls.
 */
function buildControls(cam, el) {
    const c = new OrbitControls(cam, el);
    c.enableDamping = true;
    c.dampingFactor = 0.06;
    c.target.set(27, 0, 3.5);
    c.maxPolarAngle = Math.PI / 2.1;
    c.minDistance = 10;
    c.maxDistance = 100;
    c.update();
    return c;
}

/**
 * Adds ambient and directional lights to the scene.
 * @param {THREE.Scene} s - Scene.
 */
function addLighting(s) {
    s.add(new THREE.AmbientLight(0xffffff, 0.65));
    const dir = createDirectionalLight();
    s.add(dir);
}

/**
 * Creates a directional light with shadows.
 * @returns {THREE.DirectionalLight} Light.
 */
function createDirectionalLight() {
    const light = new THREE.DirectionalLight(0xffffff, 0.7);
    light.position.set(40, 50, 25);
    light.castShadow = true;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
    light.shadow.camera.near = 1;
    light.shadow.camera.far = 120;
    light.shadow.camera.left = -60;
    light.shadow.camera.right = 60;
    light.shadow.camera.top = 30;
    light.shadow.camera.bottom = -30;
    return light;
}

/* ===================== Ground ===================== */

/**
 * Adds a ground plane beneath the bars.
 * @param {THREE.Scene} s - Scene.
 * @param {Map<string, number>} dateCounts - Date counts.
 * @param {number} maxDays - Lookback days.
 */
function addGround(s, dateCounts, maxDays) {
    const weeks = computeWeekCount(dateCounts, maxDays);
    const w = weeks * SPACING + 2;
    const d = 7 * SPACING + 2;
    const geo = new THREE.PlaneGeometry(w, d);
    const mat = new THREE.MeshStandardMaterial({
        color: '#ddddd5', roughness: 0.95
    });
    const plane = new THREE.Mesh(geo, mat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(w / 2 - 1, -0.02, d / 2 - 1);
    plane.receiveShadow = true;
    s.add(plane);
}

/**
 * Computes number of weeks for 365-day range.
 * @param {Map<string, number>} dateCounts - Date counts.
 * @param {number} maxDays - Lookback days.
 * @returns {number} Week count.
 */
function computeWeekCount(dateCounts, maxDays) {
    const { start, end } = getTimelineRange(dateCounts, maxDays);
    const diff = end.getTime() - start.getTime();
    return Math.ceil(diff / (7 * 864e5)) + 1;
}

/* ===================== Bars ===================== */

/**
 * Generates all 3D bars for the heatmap.
 * @param {THREE.Scene} s - Scene.
 * @param {Map<string, number>} dateCounts - Date counts.
 * @param {number} maxDays - Lookback days.
 */
function generateBars(s, dateCounts, maxDays) {
    bars = [];
    const { start, end } = getTimelineRange(dateCounts, maxDays);
    const maxCount = Math.max(...dateCounts.values(), 1);
    const colors = getCurrentColors();
    const totalDays = dayCount(start, end);

    for (let i = 0; i < totalDays; i++) {
        const bar = createBar(i, start, dateCounts, maxCount, colors);
        bars.push(bar);
        s.add(bar);
    }
}

/**
 * Creates a single bar mesh for day index i.
 * @param {number} i - Day offset from start.
 * @param {Date} start - Grid start date.
 * @param {Map<string, number>} dateCounts - Date counts.
 * @param {number} maxCount - Max daily count.
 * @param {string[]} colors - Color levels.
 * @returns {THREE.Mesh} Bar mesh.
 */
function createBar(i, start, dateCounts, maxCount, colors) {
    const date = addDays(start, i);
    const iso = toISODate(date);
    const count = dateCounts.get(iso) || 0;
    const level = getLevel(count, maxCount);
    const h = count === 0 ? MIN_HEIGHT : (count / maxCount) * MAX_HEIGHT;

    const geo = new THREE.BoxGeometry(BAR_SIZE, h, BAR_SIZE);
    const mat = new THREE.MeshStandardMaterial({
        color: colors[level], roughness: 0.6, metalness: 0.05
    });
    const mesh = new THREE.Mesh(geo, mat);
    positionBar(mesh, i, h);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { iso, count, level };
    return mesh;
}

/**
 * Positions a bar in the grid layout.
 * @param {THREE.Mesh} mesh - Bar mesh.
 * @param {number} i - Day offset.
 * @param {number} h - Bar height.
 */
function positionBar(mesh, i, h) {
    const week = Math.floor(i / 7);
    const day = i % 7;
    mesh.position.set(week * SPACING, h / 2, day * SPACING);
}

/* ===================== Date Helpers ===================== */

/**
 * Gets start/end dates capped to 365 days.
 * @param {Map<string, number>} dateCounts - Date counts.
 * @param {number} maxDays - Max days.
 * @returns {{ start: Date, end: Date }} Aligned date range.
 */
function getTimelineRange(dateCounts, maxDays) {
    const sorted = Array.from(dateCounts.keys()).sort();
    const last = new Date(sorted[sorted.length - 1] + 'T00:00:00');
    const first = addDays(last, -(maxDays - 1));
    return {
        start: getWeekStart(first),
        end: addDays(getWeekStart(last), 6)
    };
}

/**
 * Counts days between two dates (inclusive).
 * @param {Date} a - Start.
 * @param {Date} b - End.
 * @returns {number} Day count.
 */
function dayCount(a, b) {
    return Math.round((b - a) / 864e5) + 1;
}

/* ===================== Animation ===================== */

/**
 * Starts the render loop.
 */
function animate() {
    animationId = requestAnimationFrame(animate);
    controls?.update();
    renderer?.render(scene, camera);
}

/**
 * Sets up resize observer for the container.
 * @param {HTMLElement} container - Canvas container.
 */
function observeResize(container) {
    resizeObserver = new ResizeObserver(entries => {
        const { width, height } = entries[0].contentRect;
        if (width === 0 || height === 0) return;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    });
    resizeObserver.observe(container);
}

/**
 * Handles mouse movement for raycasting.
 * @param {MouseEvent} event 
 */
function onMouseMove(event) {
    if (!camera || !scene || !raycaster) return;
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(bars);

    bars.forEach(b => b.material.emissive.setHex(0x000000));

    if (intersects.length > 0) {
        const mesh = intersects[0].object;
        mesh.material.emissive.setHex(0x2a2a2a); 
        
        if (tooltip) {
            const data = mesh.userData;
            const display = formatDateForDisplay(data.iso);
            const noun = data.count === 1 ? 'prompt' : 'prompts';
            tooltip.textContent = data.count === 0 ? `${display} — no prompts` : `${display} — ${data.count} ${noun}`;
            tooltip.style.left = (event.clientX + 10) + 'px';
            tooltip.style.top = (event.clientY + 10) + 'px';
            tooltip.style.opacity = '1';
        }
    } else {
        if (tooltip) tooltip.style.opacity = '0';
    }
}

/**
 * Handles mouse leave.
 */
function onMouseLeave() {
    if (tooltip) tooltip.style.opacity = '0';
    bars.forEach(b => b.material.emissive.setHex(0x000000));
}

/**
 * Disposes bar geometries and materials.
 */
function disposeBars() {
    bars.forEach(m => { m.geometry.dispose(); m.material.dispose(); });
    bars = [];
}
