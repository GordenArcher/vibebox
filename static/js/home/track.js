import { showErrorToast, showInfoToast } from '../toast.js'

let currentlyPlaying = null;
let isPlaying = false;
let progressInterval = null;
let tracksData = [];
let currentProgressMs = 0;
let currentDurationMs = 0;

// API functions
async function play_track(trackUri) {
    try {
        const res = await fetch(`/play-track/?track_uri=spotify:track:${encodeURIComponent(trackUri)}`, {
            method: "GET",
            credentials: "include"
        });

        const text = await res.text();
        let data;

        try {
            data = text ? JSON.parse(text) : {};
        } catch (err) {
            console.error("Failed to parse JSON:", err);
            data = {};
        }

        if (res.ok) {
            console.log("Track is playing!", data);
            return true;
        } else {
            if (data.reason) {
                showErrorToast(data.message, data.reason);
                return false
            }

            
            
            return false;
        }

    } catch (err) {
        console.error("Network error:", err);
        return false;
    }
}

async function pause_track(trackUri) {
    try {
        const res = await fetch(`/pause-track/?track_uri=spotify:track:${encodeURIComponent(trackUri)}`, {
            method: "GET",
            credentials: "include"
        });

        const data = await res.json();
        if (res.ok) {
            console.log("Track paused!", data);
            return true;
        } else {
            console.error("Error pausing track:", data);
            return false;
        }
    } catch (err) {
        console.error("Network error:", err);
        return false;
    }
}

async function get_currently_playing() {
    try {
        const res = await fetch(`/get-track-playing/`, {
            method: "GET",
            credentials: "include"
        });

        if (res.status === 204) {
            // No content - no track is playing
            return { isPlaying: false, trackId: null, progressMs: 0, durationMs: 0 };
        }

        const data = await res.json();
        console.log("Currently playing data:", data);

        if (res.ok && data.data && data.data.item) {
            return {
                isPlaying: data.data.is_playing,
                trackId: data.data.item.id,
                progressMs: data.data.progress_ms || 0,
                durationMs: data.data.item.duration_ms || 0,
                trackData: data.data.item
            };
        } else {
            console.error("Error getting current track:", data);
            return { isPlaying: false, trackId: null, progressMs: 0, durationMs: 0 };
        }
    } catch (err) {
        console.error("Network error:", err);
        return { isPlaying: false, trackId: null, progressMs: 0, durationMs: 0 };
    }
}


async function seek_track(duration) {
    try {
        const response = await fetch("/seek-track/", {
        method: "PUT", 
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCookie("csrftoken") 
        },
        body: JSON.stringify({"position_ms" : duration})
        });

        const text = await res.text();
        let data;

        try {
            data = text ? JSON.parse(text) : {};
        } catch (err) {
            console.error("Failed to parse JSON:", err);
            data = {};
        }

        if (response.ok) {
            console.log(data);
            return true;
        } else {
            if (data.reason) {
                showErrorToast(data.message, data.reason);
                return false
            }
            
            return false;
        }

    } catch (err) {
        console.error("Network error:", err);
        return false;
    }
}

// ---------------------------------------------------------- 

// Function to format duration from milliseconds to minutes:seconds
function formatDuration(ms) {
    if (!ms || isNaN(ms)) return "0:00";
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

// Global function to update player UI from Spotify data
async function updatePlayerFromSpotify() {
    const playingState = await get_currently_playing();
    
    // Update global progress variables
    currentProgressMs = playingState.progressMs;
    currentDurationMs = playingState.durationMs;
    
    if (playingState.trackId) {
        // Update global state
        currentlyPlaying = playingState.trackId;
        isPlaying = playingState.isPlaying;
        
        // Update player controls with the actual track data from Spotify
        updatePlayerControls(
            playingState.trackId, 
            playingState.isPlaying, 
            playingState.progressMs, 
            playingState.durationMs,
            playingState.trackData
        );
        
        // Update track list UI if this track exists on the current page
        updateTrackListUI(playingState.trackId, playingState.isPlaying);
        
    } else {
        // No track is playing
        currentlyPlaying = null;
        isPlaying = false;
        stopProgressTimer();
        resetPlayerControls();
    }
    
    return playingState;
}

function updateTrackListUI(trackId, isPlaying) {
    // Remove playing class from all tracks first
    document.querySelectorAll('.track-item.playing').forEach(item => {
        item.classList.remove('playing');
        const playButton = item.querySelector('.play-button');
        if (playButton) {
            const playSvg = playButton.querySelector('svg');
            if (playSvg) {
                playSvg.innerHTML = '<path fill="currentColor" d="M8 5v14l11-7z"></path>';
            }
            playButton.classList.remove('paused');
        }
    });

    // Add playing class to the current track if it exists on this page
    const trackElement = document.querySelector(`.track-item[data-track-id="${trackId}"]`);
    if (trackElement) {
        trackElement.classList.add('playing');
        
        const playButton = trackElement.querySelector('.play-button');
        if (playButton) {
            const playSvg = playButton.querySelector('svg');
            if (playSvg) {
                playSvg.innerHTML = isPlaying ? 
                    '<path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path>' : 
                    '<path fill="currentColor" d="M8 5v14l11-7z"></path>';
            }
            if (isPlaying) {
                playButton.classList.add('paused');
            } else {
                playButton.classList.remove('paused');
            }
        }
    }
}

// Function to update player controls with Spotify data
function updatePlayerControls(trackId, playing, progressMs = 0, durationMs = null, trackData = null) {
    let track;
    
    if (trackData) {
        // Use the actual data from Spotify API
        track = {
            id: trackData.id,
            name: trackData.name,
            artists: trackData.artists,
            album: trackData.album,
            duration_ms: trackData.duration_ms
        };
    } else {
        // Fallback to local data
        track = findTrackById(trackId);
    }
    
    if (!track) {
        console.warn(`Track ${trackId} not found in local data`);
        return;
    }
    
    // Update now playing info
    if (track.album && track.album.images && track.album.images.length > 0) {
        document.getElementById('nowPlayingImage').src = track.album.images[0].url;
        document.getElementById('nowPlayingImage').style.display = 'block';
    }
    document.getElementById('nowPlayingName').textContent = track.name;
    document.getElementById('nowPlayingArtist').textContent = track.artists.map(artist => artist.name).join(', ');
    
    // Update duration
    const totalDuration = durationMs || track.duration_ms;
    document.getElementById('totalTime').textContent = formatDuration(totalDuration);
    document.getElementById('currentTime').textContent = formatDuration(progressMs);
    
    // Update progress bar
    const progressPercent = totalDuration > 0 ? (progressMs / totalDuration) * 100 : 0;
    document.getElementById('progress').style.width = `${progressPercent}%`;
    
    // Update play/pause button
    const playPauseIcon = document.getElementById('playPauseIcon');
    if (playing) {
        playPauseIcon.innerHTML = '⏸';
        if (totalDuration > 0) {
            startProgressTimer(totalDuration, progressMs);
        }
    } else {
        playPauseIcon.innerHTML = '▶';
        stopProgressTimer();
    }
    
    // Make player visible
    document.getElementById('playerControls').style.display = 'flex';
    
    isPlaying = playing;
    currentlyPlaying = trackId;
}

function resetPlayerControls() {
    document.getElementById('nowPlayingImage').src = '';
    document.getElementById('nowPlayingImage').style.display = 'none';
    document.getElementById('nowPlayingName').textContent = 'Not playing';
    document.getElementById('nowPlayingArtist').textContent = '';
    document.getElementById('totalTime').textContent = '0:00';
    document.getElementById('currentTime').textContent = '0:00';
    document.getElementById('progress').style.width = '0%';
    document.getElementById('playPauseIcon').innerHTML = '▶';
}

// Function to find track by ID
function findTrackById(trackId) {
    for (const item of tracksData) {
        const track = item.track || item;
        if (track.id === trackId) {
            return track;
        }
    }
    return null;
}

// Function to play a track
async function playTrack(trackId, buttonElement) {
    const trackItem = buttonElement ? buttonElement.closest('.track-item') : 
        document.querySelector(`.track-item[data-track-id="${trackId}"]`);
    
    // If clicking the same track that's currently playing
    if (currentlyPlaying === trackId) {
        if (isPlaying) {
            await pauseTrack();
        } else {
            await resumeTrack();
        }
        return;
    }
    
    // If a different track is playing, stop it first
    if (currentlyPlaying && currentlyPlaying !== trackId) {
        const previousPlaying = document.querySelector('.track-item.playing');
        if (previousPlaying) {
            previousPlaying.classList.remove('playing');
            const prevPlayButton = previousPlaying.querySelector('.play-button');
            if (prevPlayButton) {
                const prevPlaySvg = prevPlayButton.querySelector('svg');
                if (prevPlaySvg) {
                    prevPlaySvg.innerHTML = '<path fill="currentColor" d="M8 5v14l11-7z"></path>';
                }
                prevPlayButton.classList.remove('paused');
            }
        }
    }
    
    try {
        // Call API to play track
        const success = await play_track(trackId);
        if (success) {
            console.log(`Playing track with ID: ${trackId}`);
            
            // Update UI immediately
            if (trackItem) {
                trackItem.classList.add('playing');
                
                const playButton = trackItem.querySelector('.play-button');
                if (playButton) {
                    const playSvg = playButton.querySelector('svg');
                    if (playSvg) {
                        playSvg.innerHTML = '<path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path>';
                    }
                    playButton.classList.add('paused');
                }
            }
            
            // Update global state
            currentlyPlaying = trackId;
            isPlaying = true;
            
            // Refresh state from Spotify after a short delay to ensure sync
            setTimeout(updatePlayerFromSpotify, 1000);
        }
    } catch (error) {
        console.error('Error playing track:', error);
        if (trackItem) {
            trackItem.classList.remove('playing');
            const playButton = trackItem.querySelector('.play-button');
            if (playButton) {
                playButton.classList.remove('paused');
            }
        }
    }
}

async function resumeTrack() {
    if (!currentlyPlaying) return;
    
    try {
        const success = await play_track(currentlyPlaying);
        if (success) {
            isPlaying = true;
            
            // Update UI immediately
            const trackElement = document.querySelector(`.track-item[data-track-id="${currentlyPlaying}"]`);
            if (trackElement) {
                trackElement.classList.add('playing');
                const playButton = trackElement.querySelector('.play-button');
                if (playButton) {
                    const playSvg = playButton.querySelector('svg');
                    if (playSvg) {
                        playSvg.innerHTML = '<path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path>';
                    }
                    playButton.classList.add('paused');
                }
            }
            
            // Refresh state from Spotify
            setTimeout(updatePlayerFromSpotify, 1000);
        }
    } catch (error) {
        console.error('Error resuming track:', error);
    }
}

// Function to pause the currently playing track
async function pauseTrack(track_uri) {
    if (!currentlyPlaying) return;
    
    try {
        const success = await pause_track(currentlyPlaying);
        if (success) {
            isPlaying = false;
            
            // Update UI immediately
            const playingElement = document.querySelector('.track-item.playing');
            if (playingElement) {
                const playButton = playingElement.querySelector('.play-button');
                if (playButton) {
                    const playSvg = playButton.querySelector('svg');
                    if (playSvg) {
                        playSvg.innerHTML = '<path fill="currentColor" d="M8 5v14l11-7z"></path>';
                    }
                    playButton.classList.remove('paused');
                }
            }
            
            // Refresh state from Spotify
            setTimeout(updatePlayerFromSpotify, 1000);
        }
    } catch (error) {
        console.error('Error pausing track:', error);
    }
}

// Function to toggle play/pause
async function togglePlayPause() {
    if (isPlaying) {
        await pauseTrack(currentlyPlaying);
    } else if (currentlyPlaying) {
        await resumeTrack();
    } else if (tracksData.length > 0) {
        const firstTrack = tracksData[0].track || tracksData[0];
        await playTrack(firstTrack.id);
    }
}

// Function to play next track
async function nextTrack() {
    if (!currentlyPlaying || !tracksData.length) return;
    
    let currentIndex = -1;
    for (let i = 0; i < tracksData.length; i++) {
        const track = tracksData[i].track || tracksData[i];
        if (track.id === currentlyPlaying) {
            currentIndex = i;
            break;
        }
    }
    
    if (currentIndex === -1) return;
    
    const nextIndex = (currentIndex + 1) % tracksData.length;
    const nextTrack = tracksData[nextIndex].track || tracksData[nextIndex];
    await playTrack(nextTrack.id);
}

// Function to play previous track
async function previousTrack() {
    if (!currentlyPlaying || !tracksData.length) return;
    
    let currentIndex = -1;
    for (let i = 0; i < tracksData.length; i++) {
        const track = tracksData[i].track || tracksData[i];
        if (track.id === currentlyPlaying) {
            currentIndex = i;
            break;
        }
    }
    
    if (currentIndex === -1) return;
    
    const prevIndex = (currentIndex - 1 + tracksData.length) % tracksData.length;
    const prevTrack = tracksData[prevIndex].track || tracksData[prevIndex];
    await playTrack(prevTrack.id);
}

// Function to start progress timer
function startProgressTimer(duration, startTime = 0) {
    stopProgressTimer();
    
    let currentTime = startTime;
    const progressElement = document.getElementById('progress');
    const currentTimeElement = document.getElementById('currentTime');
    
    progressInterval = setInterval(() => {
        if (currentTime >= duration) {
            nextTrack();
            return;
        }
        
        currentTime += 1000;
        const progressPercent = (currentTime / duration) * 100;
        progressElement.style.width = `${progressPercent}%`;
        currentTimeElement.textContent = formatDuration(currentTime);
        
        // Update global progress
        currentProgressMs = currentTime;
    }, 1000);
}

function stopProgressTimer() {
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
}

async function seek(event) {
    if (!currentlyPlaying) return;
    
    const progressBar = event.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percent = clickX / rect.width;
    
    const newTime = percent * currentDurationMs;
    document.getElementById('currentTime').textContent = formatDuration(newTime);
    document.getElementById('progress').style.width = `${percent * 100}%`;
    
    // Update global progress
    currentProgressMs = newTime;
    
    console.log(`Seeking to ${formatDuration(newTime)}`);

    await seek_track(newTime)
    // You might want to implement actual seeking API call here
}

async function init() {
    // Check if we're on a page that has tracks
    const trackElements = document.querySelectorAll('.track-item');
    
    // Only initialize tracks data if we're on a tracks page
    if (trackElements.length > 0) {
        tracksData = Array.from(trackElements).map(element => {
            // Add null checks for all DOM elements
            const trackNameEl = element.querySelector('.track-name');
            const trackArtistEls = element.querySelectorAll('.track-artist a');
            const trackAlbumEl = element.querySelector('.track-album');
            const trackImageEl = element.querySelector('.track-image img');
            const trackDurationEl = element.querySelector('.track-duration');
            
            return {
                track: {
                    id: element.getAttribute('data-track-id'),
                    name: trackNameEl ? trackNameEl.textContent.trim() : '',
                    artists: Array.from(trackArtistEls).map(artistEl => ({
                        name: artistEl.textContent
                    })),
                    album: {
                        name: trackAlbumEl ? trackAlbumEl.textContent : '',
                        images: [{
                            url: trackImageEl ? trackImageEl.src : '/static/assets/images/spotify-icon.webp'
                        }]
                    },
                    duration_ms: trackDurationEl ? (
                        trackDurationEl.getAttribute('data-duration-ms') || 
                        (parseFloat(trackDurationEl.textContent.split(':')[0]) * 60000 + 
                         parseFloat(trackDurationEl.textContent.split(':')[1]) * 1000)
                    ) : 0
                }
            };
        });
    } else {
        // We're not on a tracks page, so clear tracksData
        tracksData = [];
    }
    
    // Initialize player with current Spotify state (this should work on any page)
    await updatePlayerFromSpotify();
    
    // Set up periodic state checking (every 3 seconds)
    setInterval(updatePlayerFromSpotify, 3000);
}

const goback_btn = document.getElementById("gobackbtn");
if (goback_btn) {
    goback_btn.addEventListener("click", goBack);
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

function goBack(){
    history.back();
}

document.addEventListener('DOMContentLoaded', async function() {
    await init();
    
    document.addEventListener('click', function(event) {
        const playButton = event.target.closest('.play-button');
        if (playButton) {
            event.preventDefault();
            const trackId = playButton.getAttribute('data-track-id');
            playTrack(trackId, playButton);
        }
    });
});

// Add event listeners for player controls
const playPauseBtn = document.getElementById('playPauseBtn');
if (playPauseBtn) {
    playPauseBtn.addEventListener('click', togglePlayPause);
}

const nextBtn = document.getElementById('nextBtn');
if (nextBtn) {
    nextBtn.addEventListener('click', nextTrack);
}

const prevBtn = document.getElementById('prevBtn');
if (prevBtn) {
    prevBtn.addEventListener('click', previousTrack);
}

const progressBar = document.querySelector('.progress-bar');
if (progressBar) {
    progressBar.addEventListener('click', seek);
}

window.updatePlayerFromSpotify = updatePlayerFromSpotify;
window.playTrack = playTrack;
window.togglePlayPause = togglePlayPause;
window.previousTrack = previousTrack;
window.nextTrack = nextTrack;
window.seek = seek;
window.goBack = goBack;