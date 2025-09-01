
let currentlyPlaying = null;
let isPlaying = false;
let progressInterval = null;
let tracksData = []; // This should be populated with your actual track data

// API functions
async function play_track(trackUri) {
    try {
        const res = await fetch(`/play-track/?track_uri=spotify:track:${encodeURIComponent(trackUri)}`, {
            method: "GET",
            credentials: "include"
        });

        const data = await res.json();
        if (res.ok) {
            console.log("Track is playing!", data);
            return true;
        } else {
            console.error("Error playing track:", data);
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

        const data = await res.json();
        if (res.ok && data.data && data.data.item) {
            console.log("Track is playing!", data.data.item.id);
            return data.data.item.id;
        } else {
            console.error("Error getting current track:", data);
            return null;
        }
    } catch (err) {
        console.error("Network error:", err);
        return null;
    }
}

// Function to format duration from milliseconds to minutes:seconds
function formatDuration(ms) {
    if (!ms || isNaN(ms)) return "0:00";
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

async function checkPlayingState() {
    const playingTrackId = await get_currently_playing();
    if (playingTrackId) {
        play_track(playingTrackId)
        const trackElement = document.querySelector(`.track-item[data-track-id="${playingTrackId}"]`);
        if (trackElement) {
            // Remove playing class from all tracks
            document.querySelectorAll('.track-item.playing').forEach(item => {
                item.classList.remove('playing');
            });
            
            // Add playing class to current track
            trackElement.classList.add('playing');
            
            const playButton = trackElement.querySelector('.play-button');
            if (playButton) {
                const playSvg = playButton.querySelector('svg');
                if (playSvg) {
                    playSvg.innerHTML = '<path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path>';
                }
                playButton.classList.add('paused');
            }
            
            updatePlayerControls(playingTrackId, true);
            
            // Update global state
            currentlyPlaying = playingTrackId;
            isPlaying = true;
        }
    }
}

// Function to update player controls
function updatePlayerControls(trackId, playing) {
    const track = findTrackById(trackId);
    if (!track) return;
    
    // Update now playing info
    if (track.album && track.album.images && track.album.images.length > 0) {
        document.getElementById('nowPlayingImage').src = track.album.images[0].url;
    }
    document.getElementById('nowPlayingName').textContent = track.name;
    document.getElementById('nowPlayingArtist').textContent = track.artists.map(artist => artist.name).join(', ');
    
    // Update duration
    document.getElementById('totalTime').textContent = formatDuration(track.duration_ms);
    
    // Update play/pause button
    const playPauseIcon = document.getElementById('playPauseIcon');
    if (playing) {
        playPauseIcon.innerHTML = '⏸';
        startProgressTimer(track.duration_ms);
    } else {
        playPauseIcon.innerHTML = '▶';
        stopProgressTimer();
    }
    
    isPlaying = playing;
    currentlyPlaying = trackId;
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
    if (currentlyPlaying === trackId && isPlaying) {
        await pauseTrack();
        return;
    }
    
    if (currentlyPlaying && currentlyPlaying !== trackId) {
        const previousPlaying = document.querySelector('.track-item.playing');
        if (previousPlaying) {
            previousPlaying.classList.remove('playing');
        }
    }
    
    const trackItem = buttonElement ? buttonElement.closest('.track-item') : 
        document.querySelector(`.track-item[data-track-id="${trackId}"]`);
    
    // Add playing class to highlight the track
    if (trackItem) {
        trackItem.classList.add('playing');
        
        // Update the button to show pause icon
        const playButton = trackItem.querySelector('.play-button');
        if (playButton) {
            const playSvg = playButton.querySelector('svg');
            if (playSvg) {
                playSvg.innerHTML = '<path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path>';
            }
            playButton.classList.add('paused');
        }
    }
    
    // Update player controls
    updatePlayerControls(trackId, true);
    
    // Call API to play track
    const success = await play_track(trackId);
    if (success) {
        console.log(`Playing track with ID: ${trackId}`);
        
        // Update global state
        currentlyPlaying = trackId;
        isPlaying = true;
    } else {
        // Revert UI if API call failed
        if (trackItem) {
            trackItem.classList.remove('playing');
            const playButton = trackItem.querySelector('.play-button');
            if (playButton) {
                playButton.classList.remove('paused');
            }
        }
        updatePlayerControls(trackId, false);
    }
}

// Function to pause the currently playing track
async function pauseTrack() {
    if (currentlyPlaying) {
        const playingElement = document.querySelector('.track-item.playing');
        if (playingElement) {
            // Change back to play icon
            const playButton = playingElement.querySelector('.play-button');
            if (playButton) {
                const playSvg = playButton.querySelector('svg');
                if (playSvg) {
                    playSvg.innerHTML = '<path fill="currentColor" d="M8 5v14l11-7z"></path>';
                }
                playButton.classList.remove('paused');
            }
        }
        
        // Update player controls
        const playPauseIcon = document.getElementById('playPauseIcon');
        playPauseIcon.innerHTML = '▶';
        
        stopProgressTimer();
        
        // Call API to pause track
        const success = await pause_track(currentlyPlaying);
        if (success) {
            console.log(`Paused track with ID: ${currentlyPlaying}`);
            
            // Update global state
            isPlaying = false;
        }
    }
}

// Function to toggle play/pause
async function togglePlayPause() {
    if (isPlaying) {
        await pauseTrack();
    } else if (currentlyPlaying) {
        await playTrack(currentlyPlaying);
    } else if (tracksData.length > 0) {
        // If nothing is playing, start with the first track
        const firstTrack = tracksData[0].track || tracksData[0];
        await playTrack(firstTrack.id);
    }
}

// Function to play next track
async function nextTrack() {
    if (!currentlyPlaying || !tracksData.length) return;
    
    // Find current track index
    let currentIndex = -1;
    for (let i = 0; i < tracksData.length; i++) {
        const track = tracksData[i].track || tracksData[i];
        if (track.id === currentlyPlaying) {
            currentIndex = i;
            break;
        }
    }
    
    if (currentIndex === -1) return;
    
    // Determine next track index
    const nextIndex = (currentIndex + 1) % tracksData.length;
    const nextTrack = tracksData[nextIndex].track || tracksData[nextIndex];
    
    // Play next track
    await playTrack(nextTrack.id);
}

// Function to play previous track
async function previousTrack() {
    if (!currentlyPlaying || !tracksData.length) return;
    
    // Find current track index
    let currentIndex = -1;
    for (let i = 0; i < tracksData.length; i++) {
        const track = tracksData[i].track || tracksData[i];
        if (track.id === currentlyPlaying) {
            currentIndex = i;
            break;
        }
    }
    
    if (currentIndex === -1) return;
    
    // Determine previous track index
    const prevIndex = (currentIndex - 1 + tracksData.length) % tracksData.length;
    const prevTrack = tracksData[prevIndex].track || tracksData[prevIndex];
    
    // Play previous track
    await playTrack(prevTrack.id);
}

// Function to start progress timer
function startProgressTimer(duration) {
    stopProgressTimer();
    
    let currentTime = 0;
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
    }, 1000);
}

// Function to stop progress timer
function stopProgressTimer() {
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
}

// Function to seek in track
function seek(event) {
    if (!currentlyPlaying) return;
    
    const progressBar = event.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percent = clickX / rect.width;
    
    const track = findTrackById(currentlyPlaying);
    if (track) {
        const newTime = percent * track.duration_ms;
        document.getElementById('currentTime').textContent = formatDuration(newTime);
        document.getElementById('progress').style.width = `${percent * 100}%`;
        
        console.log(`Seeking to ${formatDuration(newTime)}`);
        // In a real implementation, you would send a seek command to the player
    }
}

// Initialize the page
async function init() {
    
    await checkPlayingState();
}

// Start the application
init();

function goBack(){
    history.back()
}