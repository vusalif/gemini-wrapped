/**
 * Prompts Tab Logic - Word frequency and prompt lists.
 * @module prompts
 */

let promptsChart = null;

// Stop words to filter out common insignificant words
const STOP_WORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for', 'if', 'in', 'into', 'is', 'it',
    'no', 'not', 'of', 'on', 'or', 'such', 'that', 'the', 'their', 'then', 'there', 'these',
    'they', 'this', 'to', 'was', 'will', 'with', 'what', 'how', 'why', 'who', 'where', 'when',
    'can', 'do', 'does', 'did', 'have', 'has', 'had', 'i', 'my', 'me', 'we', 'us', 'you', 'your',
    'he', 'she', 'him', 'her', 'which', 'from', 'about', 'just', 'like', 'so', 'out', 'all', 'any',
    'write', 'can', 'please', 'help', 'some', 'than', 'could', 'would', 'should', 'too'
]);

/**
 * Renders the Prompts visualization and list.
 * @param {string[]} prompts - Extracted prompt strings.
 * @param {HTMLCanvasElement} canvas - Canvas element for the chart.
 * @param {HTMLElement} listContainer - Container for the list of prompts.
 */
export function renderPromptsTab(prompts, canvas, listContainer) {
    if (!prompts || prompts.length === 0) {
        updatePromptsList([], listContainer, 'No Prompts Found');
        return;
    }

    const wordCounts = {};
    const wordPrompts = {};

    // Calculate word frequencies
    prompts.forEach(p => {
        const words = p.toLowerCase().split(/[^a-z0-9]+/);
        words.forEach(w => {
            if (w.length > 2 && !STOP_WORDS.has(w)) {
                wordCounts[w] = (wordCounts[w] || 0) + 1;
                if (!wordPrompts[w]) wordPrompts[w] = [];
                // Push reference to the original prompt
                wordPrompts[w].push(p);
            }
        });
    });

    const topWords = Object.entries(wordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15);

    const labels = topWords.map(t => t[0]);
    const data = topWords.map(t => t[1]);

    if (promptsChart) {
        promptsChart.destroy();
    }

    const rootStyle = getComputedStyle(document.documentElement);
    const accent = rootStyle.getPropertyValue('--accent').trim() || '#a1b9ed';
    const secondary = rootStyle.getPropertyValue('--secondary').trim() || '#2b2b2b';

    promptsChart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Occurrences',
                data,
                backgroundColor: accent,
                borderRadius: 4,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => `Used ${context.raw} times`
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: { display: false },
                    ticks: { precision: 0 }
                },
                y: {
                    grid: { display: false },
                    ticks: {
                        color: secondary,
                        font: { family: 'Inter', size: 12 }
                    }
                }
            },
            onClick: (e, elements) => {
                 if (elements.length > 0) {
                     const index = elements[0].index;
                     const word = labels[index];
                     updatePromptsList(wordPrompts[word], listContainer, `Prompts containing "${word}"`);
                 } else {
                     // Clicked outside bars, reset list
                     updatePromptsList(prompts, listContainer, 'All Prompts');
                 }
            }
        }
    });

    // Render initially with all prompts
    updatePromptsList(prompts, listContainer, 'All Prompts');
}

/**
 * Updates the prompts list DOM.
 * @param {string[]} promptsArray - Array of prompt strings.
 * @param {HTMLElement} listContainer - Container for the list.
 * @param {string} titleText - Title for this list.
 */
export function updatePromptsList(promptsArray, listContainer, titleText) {
    const titleEl = listContainer.parentElement.querySelector('.prompts-title');
    if (titleEl) {
         titleEl.textContent = titleText;
    }

    listContainer.innerHTML = '';
    
    const fragment = document.createDocumentFragment();
    const maxItems = Math.min(promptsArray.length, 200);

    for (let i = 0; i < maxItems; i++) {
        const item = document.createElement('div');
        item.className = 'prompt-item';
        // Add text safely without risk of cross-scripting
        item.textContent = promptsArray[i];
        fragment.appendChild(item);
    }
    
    if (promptsArray.length > 200) {
        const ext = document.createElement('div');
        ext.className = 'prompt-item';
        ext.style.opacity = '0.5';
        ext.style.textAlign = 'center';
        ext.textContent = `+ ${promptsArray.length - 200} more...`;
        fragment.appendChild(ext);
    }

    if (promptsArray.length === 0) {
        const item = document.createElement('div');
        item.className = 'prompt-item';
        item.style.opacity = '0.5';
        item.textContent = 'No prompts found.';
        fragment.appendChild(item);
    }

    listContainer.appendChild(fragment);
    listContainer.scrollTop = 0;
}

/**
 * Disposes the Chart logic and frees up resources.
 */
export function disposePromptsTab() {
    if (promptsChart) {
        promptsChart.destroy();
        promptsChart = null;
    }
}
