document.addEventListener('DOMContentLoaded', () => {
    const BACKEND_URL = 'http://localhost:8000/api'; 
    const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
    const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
    const API_KEY = CONFIG.API_KEY;

    const token = localStorage.getItem('moviebuddy_token');

    const authBtn = document.getElementById('nav-auth-btn');
    
    if (token) {
        authBtn.innerText = "Logout";
        // 2. Stop it from going to auth.html
        authBtn.href = "#"; 
        

        authBtn.addEventListener('click', (e) => {
            e.preventDefault(); // Stop the link from jumping the page
            
            // Delete the VIP wristbands from memory
            localStorage.removeItem('moviebuddy_token');
            localStorage.removeItem('moviebuddy_username');
            
            // Kick them back to the home page (or login page)
            window.location.href = '/frontend/login_page/auth.html'; 
        });
    }
    
    // If they aren't logged in, kick them out!
    if (!token) {
        window.location.href = '/frontend/login_page/auth.html';
        return;
    }

    const searchinput = document.getElementById('searchinput');
    const searchbutton = document.getElementById('searchbutton');
    const searchSection = document.getElementById('search-section');
    const searchResultsContainer = document.getElementById('search-results');
    const searchHeading = document.getElementById('search-heading');

    async function searchMedia(query) {
        try {
            const url = `${TMDB_BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}`;
            
            const response = await fetch(url);
            const data = await response.json();

            searchSection.style.display = 'block'; // Unhide the search section!
            searchHeading.innerText = `Search Results for "${query}"`;
            searchResultsContainer.innerHTML = '';
            
            data.results.forEach(item => {
                if (item.media_type === 'person') return;

                const title = item.title || item.name;
                const releaseDate = item.release_date || item.first_air_date;
                const year = releaseDate ? releaseDate.split('-')[0] : 'Unknown';

                const link = document.createElement('a');
                link.href = `/frontend/Movie_details/details.html?type=${encodeURIComponent(item.media_type)}&id=${encodeURIComponent(item.id)}`;
                link.style.textDecoration = 'none'; 

                const card = document.createElement('div');
                card.classList.add('search-card');

                if (item.poster_path || item.backdrop_path) {
                    const imagePath = item.backdrop_path ? item.backdrop_path : item.poster_path;
                    const img = document.createElement('img');
                    img.src = `${TMDB_IMAGE_BASE_URL}${imagePath}`;
                    img.alt = title;
                    card.appendChild(img);
                } else {
                    const infoDiv = document.createElement('div');
                    infoDiv.classList.add('search-card-fallback');
                    infoDiv.innerHTML = `
                        <h3>${title}</h3>
                        <p>${year}</p>
                    `;
                    card.appendChild(infoDiv);
                }

                link.appendChild(card);
                searchResultsContainer.appendChild(link);
            });
            
        } catch (error) {
            console.error('Error searching:', error);
        }
    }

    searchbutton.addEventListener('click', () => {
        const searchTerm = searchinput.value.trim();
        if (searchTerm) {
            searchMedia(searchTerm);
            searchinput.value = "";
        }
    });

    searchinput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            const searchTerm = searchinput.value.trim();
            if (searchTerm) {
                searchMedia(searchTerm);
                searchinput.value = "";
            }
        }
    });

    // ==========================================
    // 3. PLAYLIST FETCHING & UI LOGIC
    // ==========================================
    const container = document.getElementById('playlists-container');
    const modal = document.getElementById('create-modal');
    const cancelBtn = document.getElementById('cancel-btn');
    const confirmBtn = document.getElementById('confirm-create-btn');
    const nameInput = document.getElementById('new-playlist-name');

    // Fetch folders from FastAPI
    async function loadPlaylists() {
        try {
            const response = await fetch(`${BACKEND_URL}/playlists/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                renderGrid(data.playlists);
            } else {
                console.error("Failed to load playlists");
            }
        } catch (error) {
            console.error("Error:", error);
        }
    }

    // Draw the YouTube-style grid
    function renderGrid(playlists) {
        container.innerHTML = ''; 

        // 1. Draw the "+ New Playlist" card first
        const createCard = document.createElement('div');
        createCard.classList.add('playlist-card', 'create-card');
        createCard.innerHTML = `<h3>+ New Playlist</h3>`;
        createCard.addEventListener('click', () => {
            modal.classList.remove('hidden'); 
            nameInput.focus();
        });
        container.appendChild(createCard);

        // 2. Loop through backend data and draw the rest
        playlists.forEach(pl => {
            const card = document.createElement('a');
            // This is crucial: when clicked, we pass type=playlist to the details page!
            card.href = `../Movie_details/details.html?type=playlist&id=${pl._id}`;
            card.classList.add('playlist-card');
            
            card.innerHTML = `
                <h3>${pl.name}</h3>
                <p>${pl.type === 'default' ? 'Default' : 'Custom'} Playlist</p>
            `;
            
            container.appendChild(card);
        });
    }

    // ==========================================
    // 4. MODAL EVENT LISTENERS
    // ==========================================
    cancelBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        nameInput.value = ''; 
    });

    confirmBtn.addEventListener('click', async () => {
        const newName = nameInput.value.trim();
        if (!newName) return;

        try {
            const response = await fetch(`${BACKEND_URL}/playlists/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: newName })
            });

            if (response.ok) {
                modal.classList.add('hidden');
                nameInput.value = '';
                loadPlaylists(); // Refresh grid to show the new folder!
            } else {
                const errorData = await response.json();
                alert(errorData.detail || "Failed to create playlist.");
            }
        } catch (error) {
            console.error("Error:", error);
        }
    });

    // Boot up the page!
    loadPlaylists();
});