const trackElements = document.querySelectorAll(".track-item");

let tracks = Array.from(trackElements).map(el => {
    const title = el.querySelector(".track-name")?.textContent.trim();
    const artist = el.querySelector(".track-artist")?.textContent.trim();
    const duration = el.querySelector(".track-duration")?.textContent.trim();
    const addedDate = new Date(el.getAttribute("data-added-date"));
    return { el, title, artist, duration, addedDate };
});

let filteredTracks = [...tracks];

function updateStats() {
    // document.getElementById('totalTracks').textContent = filteredTracks.length;

    const totalMinutes = filteredTracks.reduce((total, track) => {
        const [min, sec] = track.duration.split(":").map(Number);
        return total + min + sec / 60;
    }, 0);

    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    document.getElementById('s-totalTime').textContent = `${hours}h ${minutes}m`;

    const uniqueArtists = new Set(filteredTracks.map(track => track.artist)).size;
    document.getElementById('totalArtists').textContent = uniqueArtists;
}

function renderFilteredTracks() {
    const container = document.getElementById("tracksList");
    container.innerHTML = "";
    filteredTracks.forEach(track => {
        container.appendChild(track.el);
    });
}

function filterTracks() {
    const searchTerm = document.getElementById("searchInput").value.toLowerCase();

    filteredTracks = tracks.filter(track => 
        track.title.toLowerCase().includes(searchTerm) ||
        track.artist.toLowerCase().includes(searchTerm)
    );

    sortTracks();
    renderFilteredTracks();
    updateStats();
}

function sortTracks() {
    const sortBy = document.getElementById("sortSelect").value;

    switch (sortBy) {
        case "title":
            filteredTracks.sort((a, b) => a.title.localeCompare(b.title));
            break;
        case "artist":
            filteredTracks.sort((a, b) => a.artist.localeCompare(b.artist));
            break;
        case "duration":
            filteredTracks.sort((a, b) => {
                const [aMin, aSec] = a.duration.split(":").map(Number);
                const [bMin, bSec] = b.duration.split(":").map(Number);
                return (aMin * 60 + aSec) - (bMin * 60 + bSec);
            });
            break;
        default:
            filteredTracks.sort((a, b) => b.addedDate - a.addedDate);
    }
}


// ---------- Infinite scroll for user saved tracks ----------------
let offset = 50; 
const limit = 50;
let loading = false;
let noMoreTracks = false;

const observerTarget = document.createElement("div");
observerTarget.id = "scrollEndMarker";
document.body.appendChild(observerTarget);

const tracksList = document.getElementById("tracksList");
const loadingIndicator = document.getElementById("loadingIndicator");

const observer = new IntersectionObserver(async (entries) => {
    const entry = entries[0];

    if (entry.isIntersecting && !loading && !noMoreTracks) {
        loading = true;
        loadingIndicator.style.display = "block";

        try {
            const res = await fetch(`/me/saved-track/?offset=${offset}&limit=${limit}`, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            const data = await res.json();

            if (!data.items || data.items.length === 0) {
                noMoreTracks = true;
                observer.unobserve(observerTarget);
                loadingIndicator.innerText = "No more tracks!";
                return;
            }

            data.items.forEach(item => {
                const trackHtml = `
                    <div class="track-item" data-track-id="${item.track.id}">
                        <div class="track-number">
                            <span class="number">•</span>
                            <button title="play" class="play-button" data-track-id="${item.track.id}">
                                <svg viewBox="0 0 24 24" width="18" height="18">
                                    <path fill="currentColor" d="M8 5v14l11-7z"></path>
                                </svg>
                            </button>
                        </div>
                        <div class="track-info">
                            <div class="track-image">
                                <img src="${item.track.album.images[0]?.url || ''}" alt="${item.track.album.name}">
                            </div>
                            <div class="track-details">
                                <div class="track-name">
                                    ${item.track.name}
                                    ${item.track.explicit ? '<span class="explicit-badge">E</span>' : ''}
                                </div>
                                <div class="track-artist clamp">
                                    ${item.track.artists.map(a => a.name).join(", ")}
                                </div>
                            </div>
                        </div>
                        <div class="track-album clamp">${item.track.album.name}</div>
                        <div class="track-duration" data-duration-ms="${item.track.duration_ms}">
                            ${msToMinutes(item.track.duration_ms)}
                        </div>
                    </div>
                `;

                tracksList.insertAdjacentHTML("beforeend", trackHtml);
            });

            offset += limit;
        } catch (err) {
            console.error("Error loading more tracks:", err);
        } finally {
            loading = false;
            loadingIndicator.style.display = "none";
        }
    }
}, {
    rootMargin: "300px"
});

observer.observe(observerTarget);

function msToMinutes(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}



document.getElementById("searchInput").addEventListener("input", filterTracks);
document.getElementById("sortSelect").addEventListener("change", () => {
    sortTracks();
    renderFilteredTracks();
    updateStats();
});

updateStats();
