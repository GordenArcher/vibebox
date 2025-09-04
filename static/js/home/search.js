import { showInfoToast } from "../toast.js";

const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearch');
const searchSuggestions = document.getElementById('searchSuggestions');
const quickSearch = document.getElementById('quickSearch');
const searchResults = document.getElementById('searchResults');
const noResults = document.getElementById('noResults');
const resultsTitle = document.getElementById('resultsTitle');
const resultsCount = document.getElementById('resultsCount');
const filterTabs = document.querySelectorAll('.filter-tab');
const chips = document.querySelectorAll('.chip');

let currentSearchType = 'track';
let searchTimeout;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    updateClearButton();
    setSearchType('track');
});

function setupEventListeners() {
    searchInput.addEventListener('input', handleSearch);
    searchInput.addEventListener('focus', showSuggestions);
    searchInput.addEventListener('blur', () => setTimeout(hideSuggestions, 200));
    clearSearchBtn.addEventListener('click', clearSearch);

    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const type = tab.dataset.type || (tab.dataset.filter === 'tracks' ? 'track' : tab.dataset.filter);
            if (type) {
                setSearchType(type);
            }
        });
    });

    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            searchInput.value = chip.textContent;
            handleSearch();
        });
    });

    document.querySelector('.voice-search').addEventListener('click', () => {
        showInfoToast('Voice search feature coming soon!');
    });
}

function setSearchType(type) {
    currentSearchType = type;
    
    // Update active tab
    filterTabs.forEach(tab => {
        const tabType = tab.dataset.type || (tab.dataset.filter === 'tracks' ? 'track' : tab.dataset.filter);
        tab.classList.toggle('active', tabType === type);
    });
    
    // Re-run search if there's a query
    const query = searchInput.value.trim();
    if (query.length >= 2) {
        performSearch(query, type);
    }
}

function handleSearch() {
    const query = searchInput.value.trim();
    updateClearButton();

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        if (query.length === 0) {
            showQuickSearch();
            return;
        }
        if (query.length < 2) return;

        performSearch(query, currentSearchType);
    }, 300);
}

async function performSearch(query, type = 'track') {
    hideSuggestions();
    hideQuickSearch();

    try {
        const results = await searchSpotify(query, type);
        
        if (!results || (results.items && results.items.length === 0)) {
            showNoResults();
            return;
        }

        showResults(query, results, type);
    } catch (error) {
        console.error("Search error:", error);
        showNoResults();
    }
}

async function searchSpotify(query, type) {
    try {
        const data = { q: query, type: type, limit: type === 'track' ? 10 : 12 };
        const response = await fetch("/search-track/", {
            method: "POST", 
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": getCookie("csrftoken") 
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log("Search result:", result);
        
        // Return the appropriate data based on type
        if (result.data && result.data[type + 's']) {
            return result.data[type + 's'];
        }
        return result.data || result;

    } catch (error) {
        console.error("Search error:", error);
        throw error;
    }
}

function showResults(query, results, type) {
    resultsTitle.textContent = `Results for "${query}" in ${type}s`;
    
    let items = [];
    let totalResults = 0;

    // Extract items based on response structure
    if (results.items) {
        items = results.items;
        totalResults = items.length;
    } else if (results.tracks && results.tracks.items) {
        items = results.tracks.items;
        totalResults = items.length;
    } else if (Array.isArray(results)) {
        items = results;
        totalResults = items.length;
    }

    resultsCount.textContent = `${totalResults} result${totalResults !== 1 ? 's' : ''}`;

    // Hide all sections first
    document.querySelectorAll('.songs-section, .artists-section, .albums-section').forEach(section => {
        section.style.display = 'none';
    });

    switch (type) {
        case 'track':
            showTrackResults(items);
            document.querySelector('.songs-section').style.display = 'block';
            break;
        case 'album':
            showAlbumResults(items);
            document.querySelector('.albums-section').style.display = 'block';
            break;
        case 'artist':
            showArtistResults(items);
            document.querySelector('.artists-section').style.display = 'block';
            break;
        case 'playlist':
            showPlaylistResults(items);
            document.querySelector('.playlist-section').style.display = 'block';
            break;
    }

    searchResults.style.display = 'block';
    noResults.style.display = 'none';
}

function showTrackResults(tracks) {
    const songsList = document.querySelector('.songs-list');
    if (!songsList) return;

    songsList.innerHTML = tracks.slice(0, 10).map((track, index) => `
        <div class="track-item" data-track-id="${track.id}">
            <div class="track-number">
                <span class="number">${index + 1}</span>
                <button title="play" class="play-button" data-track-id="${track.id}">
                    <svg viewBox="0 0 24 24" width="18" height="18">
                        <path fill="currentColor" d="M8 5v14l11-7z"></path>
                    </svg>
                </button>
            </div>

            <div class="track-info">
                <div class="track-image">
                    ${track.album?.images?.[0]?.url ? 
                        `<img src="${track.album.images[0].url}" alt="${track.album.name}" onerror="this.style.display='none'">` : 
                        `<div class="gradient-${(index % 9) + 1}"></div>`
                    }
                </div>
                <div class="track-details">
                    <div class="track-name">
                        ${track.name || 'Unknown Track'}
                        ${track.explicit ? '<span class="explicit-badge">E</span>' : ''}
                    </div>
                    <div class="track-artist clamp">
                        ${track.artists?.map(artist => artist.name).join(', ') || 'Unknown Artist'}
                    </div>
                </div>
            </div>

            <div class="track-album clamp">${track.album?.name || 'Unknown Album'}</div>
            <div class="track-duration" data-duration-ms="${track.duration_ms}">${formatDuration(track.duration_ms)}</div>
        </div>
    `).join('');
}

function showArtistResults(artists) {
    const artistsGrid = document.querySelector('.artists-grid');
    if (!artistsGrid) return;

    artistsGrid.innerHTML = artists.slice(0, 12).map((artist, index) => `
        <div class="artist-card">
            <div class="artist-image">
                ${artist.images?.[0]?.url ? 
                    `<img src="${artist.images[0].url}" alt="${artist.name}" onerror="this.style.display='none'">` : 
                    `<div class="gradient-${(index % 9) + 1}">
                        <div class="artist-initial">${(artist.name || 'Unknown').split(' ').map(n => n[0]).join('')}</div>
                    </div>`
                }
            </div>
            <h4>${artist.name || 'Unknown Artist'}</h4>
            <p>${artist.followers?.total?.toLocaleString() || '0'} followers</p>
            <button class="follow-btn">Follow</button>
        </div>
    `).join('');
}

function showAlbumResults(albums) {
    const albumsGrid = document.querySelector('.albums-grid');
    if (!albumsGrid) return;

    albumsGrid.innerHTML = albums.slice(0, 12).map((album, index) => `
        <a href="/album/${album.id}/tracks" class="album-card">
            <div class="album-art">
                ${album.images?.[0]?.url ? 
                    `<img src="${album.images[0].url}" alt="${album.name}" onerror="this.style.display='none'">` : 
                    `<div class="gradient-${(index % 9) + 1}"></div>`
                }
                <div class="album-play">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                </div>
            </div>
            <h4>${album.name || 'Unknown Album'}</h4>
            <p>${album.artists?.map(artist => artist.name).join(', ') || 'Unknown Artist'} • ${album.release_date ? new Date(album.release_date).getFullYear() : 'Unknown'}</p>
        </a>
    `).join('');
}

function showPlaylistResults(playlists) {
    const songsList = document.querySelector('.playlists-grid');
    console.log(songsList)
    if (!songsList) return;

    const validPlaylists = playlists.filter(playlist => playlist !== null);
    console.log(validPlaylists)
    
    songsList.innerHTML = validPlaylists.slice(0, 10).map((playlist, index) => `
        <a href="/playlist/${playlist.id}/tracks/" "data-playlist-id="${playlist.id || ''}" class="playlist-card">
            <div class="playlist-image">
                ${playlist.images && playlist.images[0] && playlist.images[0].url ? 
                    `<img src="${playlist.images[0].url}" alt="${playlist.name || 'Playlist'}" onerror="this.style.display='none'">` : 
                    `<div class="gradient-${(index % 9) + 1}"></div>`
                }
            </div>

            <div class="playlist-info">
                <h3 class="playlist-name">${playlist.name || 'Unknown Playlist'}</h3>
                <p class="playlist-owner">By ${playlist?.owner?.display_name || 'Unknown'}</p>
                <div class="playlist-stats">
                    <div class="tracks-count">
                        <span>${playlist.tracks?.total || 0} tracks</span>
                    </div>

                    <span class="public-badge">
                        ${playlist.public ? 'Public' : 'Private'}
                    </span>
                </div>
            </div>
        </a>
    `).join('');
}

function formatDuration(ms) {
    if (!ms || isNaN(ms)) return "0:00";
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

function showNoResults() {
    searchResults.style.display = 'none';
    noResults.style.display = 'block';
}

function showQuickSearch() {
    quickSearch.style.display = 'block';
    searchResults.style.display = 'none';
    noResults.style.display = 'none';
}

function hideQuickSearch() {
    quickSearch.style.display = 'none';
}

function showSuggestions() {
    if (searchInput.value.length === 0) {
        searchSuggestions.style.display = 'block';
    }
}

function hideSuggestions() {
    searchSuggestions.style.display = 'none';
}

function clearSearch() {
    searchInput.value = '';
    searchInput.focus();
    updateClearButton();
    showQuickSearch();
}

function updateClearButton() {
    clearSearchBtn.style.display = searchInput.value.length > 0 ? 'flex' : 'none';
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== "") {
        const cookies = document.cookie.split(";");
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + "=")) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

document.addEventListener('click', function(event) {
    const playButton = event.target.closest('.play-button');
    if (playButton) {
        event.preventDefault();
        const trackId = playButton.getAttribute('data-track-id');
        if (window.playTrack) {
            window.playTrack(trackId, playButton);
        }
    }
});