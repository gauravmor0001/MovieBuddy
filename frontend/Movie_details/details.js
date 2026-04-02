const API_KEY = CONFIG.API_KEY; 
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/original'; 
const POSTER_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// This built-in JS tool reads the web address (e.g., ?type=movie&id=27205)
const urlParams = new URLSearchParams(window.location.search);
const mediaType = urlParams.get('type'); // Grabs "movie" or "tv"
const mediaId = urlParams.get('id');

async function buildDetailsPage() {
    try {
        const url = `${BASE_URL}/${mediaType}/${mediaId}?api_key=${API_KEY}&append_to_response=videos,watch/providers,credits`;
        const response = await fetch(url);
        const data = await response.json();

        document.getElementById('page-title').innerText = data.title || data.name;

        const posterImg = document.getElementById('details-poster');
        if (data.poster_path) {
            posterImg.src = `${POSTER_BASE_URL}${data.poster_path}`;
        } else {
            posterImg.alt = "No poster available";
        }

        const trailerContainer = document.getElementById('trailer-container');
        if (data.videos && data.videos.results) {
            const trailer = data.videos.results.find(vid => vid.type === 'Trailer' && vid.site === 'YouTube');
            
            if (trailer) {
                trailerContainer.innerHTML = `
                    <iframe 
                        width="100%" 
                        height="100%" 
                        src="https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=0&controls=1" 
                        frameborder="0" 
                        allow="autoplay; encrypted-media" 
                        allowfullscreen
                        style="border-radius: 12px;">
                    </iframe>
                `;
            } else {
                trailerContainer.innerHTML = '<p style="color: gray;">No official trailer available.</p>';
            }
        }

        document.getElementById('movie-description').innerText = data.overview || "No description available for this title.";
        const watchlistBtn = document.getElementById('watchlist-btn');
        watchlistBtn.addEventListener('click', () => {
            // For now, we just show a popup. 
            // Later, this will open your "Select a Playlist" menu!
            alert(`Opening playlist menu to save: ${data.title || data.name}`);
        });

        const fullDate = data.release_date || data.first_air_date;
        const releaseYear = fullDate ? fullDate.substring(0, 4) : "N/A";

       
        let genreText = "Unknown Genre";
        if (data.genres && data.genres.length > 0) {
            genreText = data.genres.map(g => g.name).join(', ');
        }
        document.getElementById('detail-info').innerText = `${releaseYear} • ${genreText}`;

        const tmdbScore = data.vote_average ? data.vote_average.toFixed(1) : "--";
        document.getElementById('tmdb-score').innerText = tmdbScore;

        let voteCount = data.vote_count || 0;
        let formattedCount = voteCount;
        if (voteCount >= 1000 && voteCount < 1000000) {
            formattedCount = (voteCount / 1000).toFixed(1) + 'K';
        } else if (voteCount >= 1000000) {
            formattedCount = (voteCount / 1000000).toFixed(1) + 'M';
        }
        document.getElementById('tmdb-count').innerText = `${formattedCount} votes`;

        const providersContainer = document.getElementById('watch-providers');
        if (data.id) {
            const fakeRTScore = (data.id % 40) + 60; 
            document.getElementById('rt-score').innerText = `${fakeRTScore}%`;
        } else {
            document.getElementById('rt-score').innerText = "N/A";
        }
        
        // 'US' to 'IN' 
        const providersData = data['watch/providers']?.results?.US;

        if (providersData && providersData.flatrate) {
            providersContainer.innerHTML = ''; 
            

            providersData.flatrate.forEach(provider => {
                const img = document.createElement('img');
                // We use POSTER_BASE_URL to get a nicely sized image
                img.src = `${POSTER_BASE_URL}${provider.logo_path}`; 
                img.alt = provider.provider_name;
                img.title = provider.provider_name; // Shows the name when the user hovers over it
                img.classList.add('provider-logo');
                
                providersContainer.appendChild(img);
            });
        } else {
            providersContainer.innerHTML = '<p style="color: gray;">Not available to stream right now.</p>';
        }


        const castContainer = document.getElementById('cast-container');
        
        if (data.credits && data.credits.cast && data.credits.cast.length > 0) {
            castContainer.innerHTML = ''; 

            const topCast = data.credits.cast.slice(0, 9);

            topCast.forEach(actor => {
                // If the actor doesn't have a photo in the TMDB database, we use a placeholder image
                const photoUrl = actor.profile_path 
                    ? `${POSTER_BASE_URL}${actor.profile_path}` 
                    : 'https://via.placeholder.com/80x80/222222/cccccc?text=No+Photo';

                const castCard = document.createElement('div');
                castCard.classList.add('cast-card');

                castCard.innerHTML = `
                    <img src="${photoUrl}" alt="${actor.name}" class="cast-photo">
                    <div class="cast-info">
                        <span class="actor-name">${actor.name}</span>
                        <span class="character-name">${actor.character}</span>
                    </div>
                `;
                
                castContainer.appendChild(castCard);
            });
        } else {
            castContainer.innerHTML = '<p style="color: gray;">Cast information not available.</p>';
        }

    } catch (error) {
        console.error("Error loading details:", error);
        document.getElementById('details-title').innerText = "Error loading movie.";
    }
}

if (mediaId && mediaType) {
    buildDetailsPage();
} else {
    document.getElementById('details-title').innerText = "Movie not found!";
}

// search code:

const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');


async function searchMedia(query) {
    try{
        const url = `${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}`;
        
        const response = await fetch(url);
        const data = await response.json();

        searchSection.style.display = 'block';
        searchHeading.innerText = `Search Results for "${query}"`;
        searchResultsContainer.innerHTML = '';
        
        data.results.forEach(item => {
            // Multi-search also returns actors. Let's skip people for now.
            if (item.media_type === 'person') return;

            // 2. Handle TMDB's naming quirks (Movies use title, TV uses name)
            const title = item.title || item.name;
            const releaseDate = item.release_date || item.first_air_date;
            // Extract just the year (e.g., "2015-04-10" becomes "2015")
            const year = releaseDate ? releaseDate.split('-')[0] : 'Unknown';

            const link = document.createElement('a');
            link.href = `/frontend/Movie_details/details.html?type=${encodeURIComponent(item.media_type)}&id=${encodeURIComponent(item.id)}`;
            link.style.textDecoration = 'none'; // Prevent links from turning text blue

            const card = document.createElement('div');
            card.classList.add('search-card');

            // 3. The Visual Logic: Poster vs. Text Fallback
            if (item.poster_path || item.backdrop_path) {
                // If they have an image, show the image
                const imagePath = item.backdrop_path ? item.backdrop_path : item.poster_path;
                const img = document.createElement('img');
                img.src = `${IMAGE_BASE_URL}${imagePath}`;
                img.alt = title;
                card.appendChild(img);
            } else {
                // If NO image, create the dark box with text like your screenshot
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
    const searchTerm = searchinput.value;
    if (searchTerm) {
        searchMedia(searchTerm);
        searchinput.value="";
    }
});

searchinput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        const searchTerm = searchinput.value;
        if (searchTerm) {
            searchMedia(searchTerm);
            searchinput.value="";
        }
    }
});

const searchSection = document.getElementById('search-section');
const searchResultsContainer = document.getElementById('search-results');
const searchHeading = document.getElementById('search-heading');
