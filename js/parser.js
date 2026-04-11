/**
 * ZIP file parsing and date extraction from Gemini Takeout data.
 * @module parser
 */

import { parseShortDate, toISODate } from './utils.js';

/**
 * Regex matching Gemini Takeout datetime format.
 * Example: "Apr 11, 2026, 1:39:15 AM CEST"
 * @type {RegExp}
 */
const DATE_PATTERN =
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4},\s+\d{1,2}:\d{2}:\d{2}\s+[AP]M(?:\s+[A-Za-z\/+\-\d]+)?\b/gi;

/**
 * Finds the MyActivity.html file path inside a ZIP.
 * @param {JSZip} zip - Loaded JSZip instance.
 * @returns {string|null} File path within ZIP or null.
 */
export function findActivityFile(zip) {
    const paths = Object.keys(zip.files);
    return paths.find(p => {
        const lower = p.toLowerCase();
        return lower.endsWith('myactivity.html') ||
               lower.endsWith('my activity.html');
    }) || null;
}

/**
 * Extracts all raw datetime strings from HTML content.
 * @param {string} html - Raw HTML string.
 * @returns {string[]} Array of matched datetime strings.
 */
export function extractRawDates(html) {
    return html.match(DATE_PATTERN) || [];
}

/**
 * Extracts the date portion ("Apr 11, 2026") from a full datetime.
 * @param {string} dateTimeStr - e.g., "Apr 11, 2026, 1:39:15 AM CEST".
 * @returns {string} Date-only portion.
 */
export function extractDatePortion(dateTimeStr) {
    const parts = dateTimeStr.split(',');
    return `${parts[0].trim()}, ${parts[1].trim()}`;
}

/**
 * Counts messages per calendar date from raw datetime strings.
 * @param {string[]} rawDates - Array of raw datetime strings.
 * @returns {Map<string, number>} ISO date -> message count.
 */
export function countByDate(rawDates) {
    /** @type {Map<string, number>} */
    const counts = new Map();
    for (const raw of rawDates) {
        const iso = rawDateToISO(raw);
        if (iso) counts.set(iso, (counts.get(iso) || 0) + 1);
    }
    return counts;
}

/**
 * Converts a raw datetime string to ISO date.
 * @param {string} raw - Raw datetime string.
 * @returns {string|null} ISO date or null.
 */
function rawDateToISO(raw) {
    const portion = extractDatePortion(raw);
    const parsed = parseShortDate(portion);
    return parsed ? toISODate(parsed) : null;
}

/**
 * Processes either a ZIP or HTML file uniformly.
 * @param {File} file - The uploaded file.
 * @returns {Promise<{dateCounts: Map<string, number>, prompts: string[]}>}
 */
export async function processFile(file) {
    if (file.name.endsWith('.zip')) {
        return await processZipFile(file);
    } else if (file.name.endsWith('.html')) {
        return await processHtmlFile(file);
    }
    throw new Error('Unsupported file format.');
}

/**
 * Processes a ZIP file.
 * @param {File} file - The uploaded ZIP file.
 * @returns {Promise<{dateCounts: Map<string, number>, prompts: string[]}>}
 */
async function processZipFile(file) {
    const zip = await JSZip.loadAsync(file);
    const activityPath = findActivityFile(zip);
    if (!activityPath) {
        throw new Error('Could not find MyActivity.html in the ZIP. Make sure you selected "My Activity → Gemini Apps" in Google Takeout.');
    }
    const html = await zip.file(activityPath).async('string');
    return extractDataFromHtml(html);
}

/**
 * Processes a raw HTML document.
 * @param {File} file - The uploaded HTML file.
 * @returns {Promise<{dateCounts: Map<string, number>, prompts: string[]}>}
 */
async function processHtmlFile(file) {
    const html = await file.text();
    return extractDataFromHtml(html);
}

/**
 * Reads the HTML string and returns date counts and prompts.
 * @param {string} html - HTML string.
 * @returns {{dateCounts: Map<string, number>, prompts: string[]}}
 * @throws {Error} If no dates are found.
 */
function extractDataFromHtml(html) {
    const rawDates = extractRawDates(html);
    if (rawDates.length === 0) {
        throw new Error('No chat dates found in this file. The file might be empty or in an unexpected format.');
    }
    
    const dateCounts = countByDate(rawDates);
    const prompts = [];
    
    // Parse prompts safely skipping DOMParser directly
    const blocks = html.split(/class="content-cell[^>]*>/);
    for (let i = 1; i < blocks.length; i++) {
        // limit block to reasonable size
        const block = blocks[i].substring(0, 1500);
        const trimmed = block.trim();
        
        if (trimmed.startsWith('Prompted') || trimmed.startsWith('Said')) {
            // Often Google Takeout surrounds the actual prompt in an anchor tag
            const aMatch = block.match(/<a[^>]*>(.*?)<\/a>/);
            if (aMatch) {
                let text = aMatch[1].replace(/<[^>]+>/g, '').trim();
                // Just in case it contains dates or other trailing metadata
                text = text.replace(DATE_PATTERN, '').trim();
                if (text) prompts.push(text);
            } else {
                // Process plain text fallback
                const endDiv = block.indexOf('</div>');
                let content = endDiv !== -1 ? block.substring(0, endDiv) : block;
                
                // Unify newlines by replacing <br> with \n
                content = content.replace(/<br\s*\/?>/gi, '\n');
                
                // Strip all other HTML tags
                content = content.replace(/<[^>]+>/g, '');
                
                // Parse line by line to isolate the actual prompt
                let lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                
                let extracted = '';
                for (let line of lines) {
                    // Ignore the introductory wording
                    if (line.match(/^(Prompted|Said|Sent)\s*(?:>|&gt;)?$/i)) continue;
                    // Ignore lines containing the Date string
                    if (line.match(DATE_PATTERN)) continue;
                    // Note: If you ever see Gemini's responses in this block, skip them
                    if (line.toLowerCase().includes("gemini's response")) break; 
                    
                    extracted += line + ' ';
                }
                
                extracted = extracted.trim();
                // Clean any rogue prefix in the exact line
                extracted = extracted.replace(/^(?:Prompted|Said|Sent)\s*(?:>|&gt;)?/i, '').trim();
                
                if (extracted && extracted.length > 0) {
                    prompts.push(extracted);
                }
            }
        }
    }
    
    return { dateCounts, prompts };
}


