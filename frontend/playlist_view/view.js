// ✅ Added 'async' right here!
document.addEventListener('DOMContentLoaded', async () => {
    const BACKEND_URL = 'https://moviebuddy-whxl.onrender.com/api';
    const TMDB_BACKDROP_URL = 'https://image.tmdb.org/t/p/w780';
    const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
    const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
    
    // 1. Fetch the key safely and quickly
    let API_KEY = "";
    try {
        API_KEY = await getTMDBKey();
    } catch (error) {
        console.error("Failed to load TMDB key:", error);
    }

    // 2. Auth Logic
    const token = localStorage.getItem('moviebuddy_token');
    
    // If they aren't logged in, kick them out!
    if (!token) {
        window.location.href = '/MovieBuddy/frontend/login_page/auth.html';
        return;
    }

    const authBtn = document.getElementById('nav-auth-btn');
    if (authBtn) {
        authBtn.innerText = "Logout";
        authBtn.href = "#"; 
        
        authBtn.addEventListener('click', (e) => {
            e.preventDefault(); 
            localStorage.removeItem('moviebuddy_token');
            localStorage.removeItem('moviebuddy_username');
            window.location.href = '/MovieBuddy/frontend/login_page/auth.html'; 
        });
    }

    // ==========================================
    // 3. SEARCH UI LOGIC
    // ==========================================
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

            if(searchSection) searchSection.style.display = 'block'; 
            if(searchHeading) searchHeading.innerText = `Search Results for "${query}"`;
            if(searchResultsContainer) searchResultsContainer.innerHTML = '';
            
            data.results.forEach(item => {
                if (item.media_type === 'person') return;

                const title = item.title || item.name;
                const releaseDate = item.release_date || item.first_air_date;
                const year = releaseDate ? releaseDate.split('-')[0] : 'Unknown';

                const link = document.createElement('a');
                link.href = `/MovieBuddy/frontend/Movie_details/details.html?type=${encodeURIComponent(item.media_type)}&id=${encodeURIComponent(item.id)}`;
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
                if(searchResultsContainer) searchResultsContainer.appendChild(link);
            });
            
        } catch (error) {
            console.error('Error searching:', error);
        }
    }

    // ✅ Safety checks for search buttons
    if (searchbutton && searchinput) {
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
    }

    // ==========================================
    // 4. PLAYLIST FETCHING & RENDER LOGIC
    // ==========================================
    const urlParams = new URLSearchParams(window.location.search);
    const playlistId = urlParams.get('id');

    if (!playlistId) {
        const titleElement = document.getElementById('playlist-title');
        if(titleElement) titleElement.innerText = "Playlist not found.";
        return;
    }

    async function loadPlaylistData() {
        try {
            const response = await fetch(`${BACKEND_URL}/watchlist/${playlistId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                
                document.getElementById('playlist-title').innerText = data.playlist_name;
                document.getElementById('playlist-count').innerText = `${data.movies.length} titles`;

                const container = document.getElementById('cinematic-container');
                if(!container) return;
                
                container.innerHTML = '';

                if (data.movies.length === 0) {
                    container.innerHTML = '<p style="color: gray; font-size: 1.2rem;">This playlist is empty.</p>';
                    return;
                }

                // Draw the widescreen cards!
                data.movies.forEach(movie => {
                    const cardLink = document.createElement('a');
                    cardLink.href = `/MovieBuddy/frontend/Movie_details/details.html?type=${movie.media_type}&id=${movie.movie_id}`;
                    cardLink.classList.add('cinematic-card');

                    const imagePath = movie.backdrop_path ? `${TMDB_BACKDROP_URL}${movie.backdrop_path}` : `${TMDB_IMAGE_BASE_URL}${movie.poster_path}`;

                    cardLink.innerHTML = `
                        <img src="${imagePath}" alt="${movie.title}" onerror="this.src='https://via.placeholder.com/600x337/222222/cccccc?text=No+Image'">
                        <div class="cinematic-info">
                            <h3>${movie.title}</h3>
                        </div>
                    `;
                    
                    container.appendChild(cardLink);
                });

            } else {
                const titleElement = document.getElementById('playlist-title');
                if(titleElement) titleElement.innerText = "Failed to load playlist.";
            }
        } catch (error) {
            console.error("Error:", error);
        }
    }

    // Boot up the playlist fetch
    loadPlaylistData();
});