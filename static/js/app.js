// Global State
let allNotes = [];
let filteredNotes = [];
let activeFilter = 'all';
let searchQuery = '';

// DOM Elements
const notesGrid = document.getElementById('notes-grid');
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const emptyState = document.getElementById('empty-state');
const errorMessage = document.getElementById('error-message');
const refreshBtn = document.getElementById('refresh-btn');
const refreshIcon = document.getElementById('refresh-icon');
const lastUpdatedText = document.getElementById('last-updated-text');
const statusIndicator = document.querySelector('.status-indicator');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');
const filterContainer = document.getElementById('filter-container');
const retryBtn = document.getElementById('retry-btn');
const resetFiltersBtn = document.getElementById('reset-filters-btn');

// Stats Elements
const statTotal = document.getElementById('stat-total');
const statFeatures = document.getElementById('stat-features');
const statIssues = document.getElementById('stat-issues');
const statDeprecations = document.getElementById('stat-deprecations');
const statCards = document.querySelectorAll('.stat-card');

// Modal Elements
const tweetModal = document.getElementById('tweet-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCounter = document.getElementById('char-counter');
const progressRingBar = document.getElementById('progress-ring-bar');
const modalSnippetText = document.getElementById('modal-snippet-text');
const copyTweetBtn = document.getElementById('copy-tweet-btn');
const copyBtnText = document.getElementById('copy-btn-text');
const submitTweetBtn = document.getElementById('submit-tweet-btn');
const toast = document.getElementById('toast');

// Theme Toggle Elements
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const themeSunIcon = document.getElementById('theme-sun-icon');
const themeMoonIcon = document.getElementById('theme-moon-icon');

// Scroll to Top Element
const scrollTopBtn = document.getElementById('scroll-top-btn');

// Twitter Progress Ring Setup
let circumference = 0;
if (progressRingBar) {
    const radius = progressRingBar.r.baseVal.value;
    circumference = radius * 2 * Math.PI;
    progressRingBar.style.strokeDasharray = `${circumference} ${circumference}`;
    progressRingBar.style.strokeDashoffset = circumference;
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    fetchNotes();
    setupEventListeners();
});

// Event Listeners Setup
function setupEventListeners() {
    // Refresh feed
    refreshBtn.addEventListener('click', () => refreshNotes(true));
    retryBtn.addEventListener('click', () => fetchNotes());

    // Search input
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        clearSearchBtn.style.display = searchQuery.length > 0 ? 'block' : 'none';
        applyFiltersAndSearch();
    });

    // Clear search
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        applyFiltersAndSearch();
        searchInput.focus();
    });

    // Filter chips
    filterContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('chip')) {
            // Update active class
            document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
            
            activeFilter = e.target.getAttribute('data-filter');
            applyFiltersAndSearch();
        }
    });

    // Stat cards trigger filtering
    statCards.forEach(card => {
        card.addEventListener('click', () => {
            const filter = card.getAttribute('data-filter');
            
            // Activate corresponding chip
            document.querySelectorAll('.chip').forEach(c => {
                c.classList.remove('active');
                if (c.getAttribute('data-filter') === filter) {
                    c.classList.add('active');
                }
            });

            activeFilter = filter;
            applyFiltersAndSearch();
        });
    });

    // Reset filters from empty state
    resetFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        document.querySelector('.chip[data-filter="all"]').classList.add('active');
        activeFilter = 'all';
        
        applyFiltersAndSearch();
    });

    // Modal Events
    closeModalBtn.addEventListener('click', hideTweetModal);
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) hideTweetModal();
    });

    // Esc key close modal
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && tweetModal.classList.contains('open')) {
            hideTweetModal();
        }
    });

    // Tweet text change events
    tweetTextarea.addEventListener('input', updateTweetCharCount);

    // Modal action buttons
    copyTweetBtn.addEventListener('click', copyTweetToClipboard);
    submitTweetBtn.addEventListener('click', postTweetToTwitter);

    // Export CSV Button
    const exportCsvBtn = document.getElementById('export-csv-btn');
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', exportToCSV);
    }

    // Theme Toggle Button
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }

    // Scroll to Top Events
    if (scrollTopBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                scrollTopBtn.classList.add('show');
            } else {
                scrollTopBtn.classList.remove('show');
            }
        });
        scrollTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
}

// Fetch release notes (using cache initially)
async function fetchNotes() {
    setLoadingState(true);
    setErrorState(false);
    
    try {
        const response = await fetch('/api/notes');
        if (!response.ok) throw new Error('Network response error');
        
        const data = await response.json();
        if (data.status === 'success') {
            allNotes = data.updates;
            updateStats();
            applyFiltersAndSearch();
            updateLastUpdated(data.cached_at);
        } else {
            throw new Error(data.message || 'Server returned failure status');
        }
    } catch (err) {
        console.error('Fetch error:', err);
        setErrorState(true, err.message);
    } finally {
        setLoadingState(false);
    }
}

// Refresh notes (force refresh from Google feed)
async function refreshNotes() {
    setSyncingState(true);
    
    try {
        const response = await fetch('/api/refresh', {
            method: 'POST'
        });
        if (!response.ok) throw new Error('Error triggering refresh');
        
        const data = await response.json();
        if (data.status === 'success') {
            allNotes = data.updates;
            updateStats();
            applyFiltersAndSearch();
            updateLastUpdated(data.cached_at);
            showToast('Feed refreshed successfully!');
        } else {
            throw new Error(data.message || 'Refresh failed');
        }
    } catch (err) {
        console.error('Refresh error:', err);
        showToast('Refresh failed. Showing offline data.');
        statusIndicator.classList.add('error');
    } finally {
        setSyncingState(false);
    }
}

// Update UI States
function setLoadingState(isLoading) {
    if (isLoading) {
        loadingState.classList.remove('hidden');
        notesGrid.classList.add('hidden');
    } else {
        loadingState.classList.add('hidden');
        notesGrid.classList.remove('hidden');
    }
}

function setErrorState(isError, msg = '') {
    if (isError) {
        errorState.classList.remove('hidden');
        notesGrid.classList.add('hidden');
        errorMessage.textContent = msg || 'Could not load release notes.';
        statusIndicator.classList.add('error');
    } else {
        errorState.classList.add('hidden');
        statusIndicator.classList.remove('error');
    }
}

function setSyncingState(isSyncing) {
    if (isSyncing) {
        refreshBtn.disabled = true;
        refreshIcon.classList.add('spin-animation');
        statusIndicator.classList.add('syncing');
        lastUpdatedText.textContent = 'Syncing feed details...';
    } else {
        refreshBtn.disabled = false;
        refreshIcon.classList.remove('spin-animation');
        statusIndicator.classList.remove('syncing');
    }
}

// Format Unix Timestamp
function updateLastUpdated(timestamp) {
    if (!timestamp) {
        lastUpdatedText.textContent = 'Offline';
        return;
    }
    const date = new Date(timestamp * 1000);
    const formatted = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    lastUpdatedText.textContent = `Synced today at ${formatted}`;
}

// Update statistics panels
function updateStats() {
    statTotal.textContent = allNotes.length;
    
    const featuresCount = allNotes.filter(n => n.type.toLowerCase().includes('feature')).length;
    const issuesCount = allNotes.filter(n => n.type.toLowerCase().includes('issue') || n.type.toLowerCase().includes('security')).length;
    const deprecationsCount = allNotes.filter(n => n.type.toLowerCase().includes('deprecation') || n.type.toLowerCase().includes('breaking')).length;
    
    statFeatures.textContent = featuresCount;
    statIssues.textContent = issuesCount;
    statDeprecations.textContent = deprecationsCount;
}

// Filters and Searches combined logic
function applyFiltersAndSearch() {
    let filtered = allNotes;
    
    // 1. Apply category filter
    if (activeFilter !== 'all') {
        filtered = filtered.filter(note => {
            const typeLower = note.type.toLowerCase();
            const filterLower = activeFilter.toLowerCase();
            
            if (filterLower === 'general') {
                // Return items that are not features, issues, deprecations
                return !typeLower.includes('feature') && 
                       !typeLower.includes('issue') && 
                       !typeLower.includes('deprecation') && 
                       !typeLower.includes('security') &&
                       !typeLower.includes('breaking');
            }
            
            // Map types broad matches
            if (filterLower === 'issue') {
                return typeLower.includes('issue') || typeLower.includes('security');
            }
            if (filterLower === 'deprecation') {
                return typeLower.includes('deprecation') || typeLower.includes('breaking');
            }
            return typeLower.includes(filterLower);
        });
    }
    
    // 2. Apply search query
    if (searchQuery) {
        filtered = filtered.filter(note => {
            return note.date.toLowerCase().includes(searchQuery) ||
                   note.type.toLowerCase().includes(searchQuery) ||
                   note.content_text.toLowerCase().includes(searchQuery);
        });
    }
    
    filteredNotes = filtered;
    renderCards(filtered);

    // Dynamic Page Title
    const filterText = activeFilter === 'all' ? 'All Updates' : activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1);
    document.title = `BigQuery Release Notes Hub - ${filterText}`;
}

// Render release note cards to grid
function renderCards(notes) {
    notesGrid.innerHTML = '';
    
    if (notes.length === 0) {
        emptyState.classList.remove('hidden');
        notesGrid.classList.add('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    notesGrid.classList.remove('hidden');
    
    notes.forEach((note, index) => {
        const card = document.createElement('div');
        card.className = 'note-card';
        
        // Define accent theme based on update type
        const typeLower = note.type.toLowerCase();
        let badgeClass = 'general';
        let accentColor = '#8a99ad';
        
        if (typeLower.includes('feature')) {
            badgeClass = 'feature';
            accentColor = '#10b981';
        } else if (typeLower.includes('issue') || typeLower.includes('security')) {
            badgeClass = 'issue';
            accentColor = '#ef4444';
        } else if (typeLower.includes('deprecation') || typeLower.includes('breaking')) {
            badgeClass = 'deprecation';
            accentColor = '#f59e0b';
        }
        
        card.style.setProperty('--card-accent', accentColor);
        // Stagger card entrance animation slightly
        card.style.animationDelay = `${index * 0.04}s`;
        
        card.innerHTML = `
            <div>
                <div class="card-header">
                    <span class="badge ${badgeClass}">${note.type}</span>
                    <span class="card-date">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 0.95rem; height: 0.95rem;">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        ${note.date}${getRelativeDateString(note.timestamp)}
                    </span>
                </div>
                <div class="card-body">
                    ${note.content_html}
                </div>
            </div>
            <div class="card-actions">
                <a href="${note.link}" target="_blank" class="source-link-btn" title="View official GCP release notes page">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                        <polyline points="15 3 21 3 21 9"/>
                        <line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                    <span>Release Doc</span>
                </a>
                <div class="action-buttons-group" style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-secondary btn-copy-card" style="padding: 0.5rem 0.8rem; font-size: 0.8rem;" onclick="copyCardToClipboard(this, '${escapeHtml(note.date)}', '${escapeHtml(note.type)}', '${escapeHtml(note.content_text)}')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                        <span>Copy</span>
                    </button>
                    <button class="btn btn-tweet-action" style="padding: 0.5rem 0.8rem; font-size: 0.8rem;" onclick="openTweetComposer('${escapeHtml(note.date)}', '${escapeHtml(note.type)}', '${escapeHtml(note.content_text)}', '${escapeHtml(note.link)}')">
                        <svg class="btn-icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        <span>Tweet</span>
                    </button>
                </div>
            </div>
        `;
        
        notesGrid.appendChild(card);
    });
}

// Helper to escape HTML values placed in inline attributes
function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/'/g, "&#39;")
        .replace(/"/g, "&quot;")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\r?\n/g, '\\n'); // escape newlines for JS string call
}

// Open Tweet Composer
function openTweetComposer(date, type, cleanText, link) {
    // Unescape escaped newlines back to literal newlines
    cleanText = cleanText.replace(/\\n/g, '\n');
    
    // Construct Tweet Template
    // Max characters on X/Twitter is 280
    // Keep space for:
    // "📢 BigQuery Feature (June 15, 2026): " (approx 40 chars)
    // " [link] #BigQuery" (approx 35 chars)
    // Text needs to fit in the remaining ~205 chars.
    
    const header = `📢 BigQuery ${type} (${date}):\n`;
    const footer = `\n\nDetails: ${link}\n#BigQuery #GoogleCloud`;
    
    // Let's compute maximum characters available for description
    const totalAuxLength = header.length + footer.length;
    const maxDescLength = 280 - totalAuxLength;
    
    let descriptionText = cleanText;
    if (descriptionText.length > maxDescLength) {
        descriptionText = descriptionText.substring(0, maxDescLength - 3) + '...';
    }
    
    const defaultTweet = `${header}${descriptionText}${footer}`;
    
    tweetTextarea.value = defaultTweet;
    modalSnippetText.textContent = cleanText;
    
    updateTweetCharCount();
    
    // Show Modal
    tweetModal.classList.add('open');
    document.body.style.overflow = 'hidden'; // Prevent body scroll
    
    // Reset Copy Button
    copyBtnText.textContent = 'Copy Text';
    copyTweetBtn.classList.remove('btn-primary');
    copyTweetBtn.classList.add('btn-secondary');
}

function hideTweetModal() {
    tweetModal.classList.remove('open');
    document.body.style.overflow = '';
}

// Character Count logic
function updateTweetCharCount() {
    const text = tweetTextarea.value;
    
    // Calculate length (X treats https links as 23 characters regardless of length, but for simplicity
    // we will count standard characters first, and optionally refine if needed. Standard works fine.)
    // Let's implement X's link counting rules: any URL is 23 characters.
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = text.match(urlRegex) || [];
    let count = text.length;
    
    urls.forEach(url => {
        count = count - url.length + 23;
    });

    charCounter.textContent = `${count} / 280`;
    
    // Progress Ring offset
    const percentage = Math.min((count / 280) * 100, 100);
    const offset = circumference - (percentage / 100 * circumference);
    progressRingBar.style.strokeDashoffset = offset;
    
    // Colors & button state
    const countGroup = document.querySelector('.char-count-group');
    const textareaWrapper = document.querySelector('.tweet-textarea-wrapper');
    if (count > 280) {
        countGroup.classList.remove('warning');
        countGroup.classList.add('danger');
        progressRingBar.style.stroke = '#ef4444'; // Red
        submitTweetBtn.disabled = true;
        textareaWrapper.classList.add('limit-exceeded');
    } else if (count > 250) {
        countGroup.classList.remove('danger');
        countGroup.classList.add('warning');
        progressRingBar.style.stroke = '#f59e0b'; // Yellow
        submitTweetBtn.disabled = false;
        textareaWrapper.classList.remove('limit-exceeded');
    } else {
        countGroup.classList.remove('danger', 'warning');
        progressRingBar.style.stroke = '#38bdf8'; // Blue
        submitTweetBtn.disabled = false;
        textareaWrapper.classList.remove('limit-exceeded');
    }
}

// Copy Tweet text to clipboard
async function copyTweetToClipboard() {
    const text = tweetTextarea.value;
    try {
        await navigator.clipboard.writeText(text);
        copyBtnText.textContent = 'Copied!';
        copyTweetBtn.classList.remove('btn-secondary');
        copyTweetBtn.classList.add('btn-primary');
        showToast('Tweet copied to clipboard!');
        setTimeout(() => {
            copyBtnText.textContent = 'Copy Text';
            copyTweetBtn.classList.remove('btn-primary');
            copyTweetBtn.classList.add('btn-secondary');
        }, 3000);
    } catch (err) {
        console.error('Clipboard copy failed:', err);
        showToast('Failed to copy to clipboard.');
    }
}

// Open Tweet intent url
function postTweetToTwitter() {
    const text = tweetTextarea.value;
    const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(intentUrl, '_blank', 'noopener,noreferrer');
    hideTweetModal();
}

// Toast Notifications
function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Copy individual card text to clipboard
async function copyCardToClipboard(btn, date, type, text) {
    const cleanText = text.replace(/\\n/g, '\n');
    const fullMessage = `📢 BigQuery Release Note [${date}] (${type}):\n${cleanText}`;
    
    try {
        await navigator.clipboard.writeText(fullMessage);
        
        // Visual feedback on the button
        const span = btn.querySelector('span');
        const originalText = span.textContent;
        span.textContent = 'Copied!';
        btn.classList.remove('btn-secondary');
        btn.classList.add('btn-primary');
        
        showToast('Card copied to clipboard!');
        
        setTimeout(() => {
            span.textContent = originalText;
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-secondary');
        }, 2000);
    } catch (err) {
        console.error('Copy failed:', err);
        showToast('Failed to copy to clipboard.');
    }
}

// Export current filtered list to CSV
function exportToCSV() {
    if (!filteredNotes || filteredNotes.length === 0) {
        showToast('No notes to export.');
        return;
    }
    
    // CSV Header
    const headers = ["Date", "Type", "Content (HTML)", "Content (Text)", "Link"];
    
    // Map rows
    const rows = filteredNotes.map(note => [
        note.date,
        note.type,
        note.content_html,
        note.content_text,
        note.link
    ]);
    
    // Convert to CSV string (escape double quotes by doubling them)
    const csvContent = [
        headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
        ...rows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""').replace(/\r?\n/g, '\n')}"`).join(','))
    ].join('\n');
    
    // Download trigger
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `bigquery_release_notes_${activeFilter}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('CSV Exported successfully!');
}

// Theme Toggle Logic
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeUI(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeUI(newTheme);
}

function updateThemeUI(theme) {
    if (theme === 'light') {
        themeSunIcon.classList.add('hidden');
        themeMoonIcon.classList.remove('hidden');
    } else {
        themeSunIcon.classList.remove('hidden');
        themeMoonIcon.classList.add('hidden');
    }
}

// Calculate relative date tags (e.g. Yesterday, 2 days ago)
function getRelativeDateString(timestamp) {
    if (!timestamp) return '';
    
    try {
        const noteDate = new Date(timestamp);
        const nowDate = new Date();
        
        // Zero out times for date-only comparison
        noteDate.setHours(0, 0, 0, 0);
        const compareDate = new Date(nowDate);
        compareDate.setHours(0, 0, 0, 0);
        
        const diffTime = compareDate - noteDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return ' <span class="relative-tag" style="opacity: 0.6; font-size: 0.8em; font-weight: normal; margin-left: 0.35rem;">(Today)</span>';
        if (diffDays === 1) return ' <span class="relative-tag" style="opacity: 0.6; font-size: 0.8em; font-weight: normal; margin-left: 0.35rem;">(Yesterday)</span>';
        if (diffDays > 1 && diffDays <= 30) {
            return ` <span class="relative-tag" style="opacity: 0.6; font-size: 0.8em; font-weight: normal; margin-left: 0.35rem;">(${diffDays} days ago)</span>`;
        }
    } catch (e) {
        console.error('Relative date formatting error:', e);
    }
    return '';
}
