let currentView = 'grid';
let currentFilter = 'all';

// const recentlyPlayed = [
//     { id: 1, title: "Chill Vibes Mix", type: "playlist", subtitle: "By Spotify", meta: "50 songs", icon: "🎵" },
//     { id: 2, title: "After Hours", type: "album", subtitle: "The Weeknd", meta: "14 songs • 2020", icon: "🌙" },
//     { id: 3, title: "Rock Classics", type: "playlist", subtitle: "Your favorites", meta: "127 songs", icon: "🎸" },
//     { id: 4, title: "Dua Lipa", type: "artist", subtitle: "Artist", meta: "Monthly listeners: 75M", icon: "🎤" },
//     { id: 5, title: "Lo-Fi Study", type: "playlist", subtitle: "Focus music", meta: "3h 24m", icon: "📚" }
// ];

const madeForYou = [
    { id: 6, title: "Discover Weekly", type: "playlist", subtitle: "Your weekly mixtape", meta: "30 songs", icon: "🔍" },
    { id: 7, title: "Release Radar", type: "playlist", subtitle: "New releases for you", meta: "28 songs", icon: "📡" },
    { id: 8, title: "Daily Mix 1", type: "playlist", subtitle: "The Weeknd, Dua Lipa and more", meta: "50 songs", icon: "🎯" },
    { id: 9, title: "Your Time Capsule", type: "playlist", subtitle: "Your throwback songs", meta: "100 songs", icon: "⏰" }
];

// const playlists = [
//     { id: 10, title: "Workout Pump", type: "playlist", subtitle: "45 songs • Created by you", meta: "2h 47m", icon: "💪" },
//     { id: 11, title: "Road Trip", type: "playlist", subtitle: "78 songs • Created by you", meta: "4h 12m", icon: "🚗" },
//     { id: 12, title: "Chill Evening", type: "playlist", subtitle: "32 songs • Created by you", meta: "2h 8m", icon: "🌅" },
//     { id: 13, title: "Party Mix", type: "playlist", subtitle: "65 songs • Created by you", meta: "3h 45m", icon: "🎉" }
// ];

// const albums = [
//     { id: 14, title: "Future Nostalgia", type: "album", subtitle: "Dua Lipa", meta: "11 songs • 2020", icon: "✨" },
//     { id: 15, title: "Folklore", type: "album", subtitle: "Taylor Swift", meta: "17 songs • 2020", icon: "🍃" },
//     { id: 16, title: "Positions", type: "album", subtitle: "Ariana Grande", meta: "14 songs • 2020", icon: "💫" },
//     { id: 17, title: "Shoot for the Stars", type: "album", subtitle: "Pop Smoke", meta: "19 songs • 2020", icon: "⭐" }
// ];

function renderSection(sectionId, data) {
    const section = document.getElementById(sectionId);
    section.innerHTML = '';

    data.slice(0, currentView === 'grid' ? 8 : 5).forEach(item => {
        const card = document.createElement('div');
        card.className = currentView === 'grid' ? 'card' : 'card list-card';
        
        if (currentView === 'grid') {
            card.innerHTML = `
                <div class="card-cover">${item.icon}</div>
                <div class="card-info">
                    <div class="card-title">${item.title}</div>
                    <div class="card-subtitle">${item.subtitle}</div>
                    <div class="card-meta">${item.meta}</div>
                </div>
                <div class="play-overlay">
                    <button class="play-btn" onclick="playItem(${item.id})">▶️</button>
                </div>
            `;
        } else {
            card.innerHTML = `
                <div class="card-cover">${item.icon}</div>
                <div class="card-info">
                    <div class="card-title">${item.title}</div>
                    <div class="card-subtitle">${item.subtitle}</div>
                    <div class="card-meta">${item.meta}</div>
                </div>
                <div class="play-overlay">
                    <button class="play-btn" onclick="playItem(${item.id})">▶️</button>
                </div>
            `;
        }

        card.addEventListener('click', (e) => {
            if (!e.target.closest('.play-btn')) {
                openItem(item.id);
            }
        });

        section.appendChild(card);
    });
}

function toggleView(view) {
    currentView = view;
    
    // Update button states
    document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    // Update grid classes
    document.querySelectorAll('.grid').forEach(grid => {
        grid.className = `grid ${view}-view${grid.classList.contains('recently-played') ? ' recently-played' : ''}`;
    });

    // Re-render all sections
    renderAllSections();
}

function renderAllSections() {
    renderSection('recentlyPlayed', recentlyPlayed);
    renderSection('madeForYou', madeForYou);
    renderSection('playlists', playlists);
    renderSection('albums', albums);
}

function playItem(id) {
    console.log(`Playing item ${id}`);
    // Add play logic here
}

function openItem(id) {
    console.log(`Opening item ${id}`);
    // Add navigation logic here
}

function createPlaylist() {
    alert('Create new playlist - This would open a playlist creation modal!');
}

function focusSearch() {
    document.getElementById('searchInput').focus();
}

// Filter functionality
document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentFilter = chip.dataset.filter;
        // Add filter logic here
    });
});

// Search functionality
document.getElementById('searchInput').addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    // Add search logic here
    console.log(`Searching for: ${searchTerm}`);
});

// Initialize
renderAllSections();