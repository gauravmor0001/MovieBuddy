// 1. Declare variables globally so all functions can use them
let API_KEY = ""; 
const BASE_URL='https://api.themoviedb.org/3';
const IMAGE_BASE_URL='https://image.tmdb.org/t/p/w500';

// DOM Elements
const heroBanner = document.getElementById('hero-banner');
const heroTitle = document.getElementById('hero-title');
const heroDesc = document.getElementById('hero-description');
const heroVideoContainer = document.getElementById('hero-video-container'); 
const searchInput = document.getElementById('searchinput');
const searchBtn = document.getElementById('searchbutton');
const searchSection = document.getElementById('search-section');
const searchResultsContainer = document.getElementById('search-results');
const searchHeading = document.getElementById('search-heading');
const info_button = document.getElementById('info-button');

let infomediatype;
let infomovieid;

// 2. Wrap your startup execution in this async function!
async function initializeApp() {
    try {
        // Wait safely for the key from your Render backend
        API_KEY = await getTMDBKey();
        
        // NOW that we have the key, load the homepage content
        fetchHeroBanner();
        fetchAndDisplayMovies('/trending/all/week', 'trending-slider');
        fetchAndDisplayMovies('/movie/now_playing', 'cinemas-slider');
        fetchAndDisplayMovies('/tv/popular', 'Popular-slider');
        fetchAndDisplayMovies('/movie/top_rated', 'top-rated-slider');
        fetchAndDisplayMovies('/movie/upcoming', 'latest-slider');
        
    } catch (error) {
        console.error("Failed to load TMDB key:", error);
    }
}

// Kick off the application
initializeApp();

// --- ALL YOUR FUNCTIONS AND EVENT LISTENERS GO BELOW ---

async function fetchAndDisplayMovies(endpoint,containerId){
    try{
        const url=`${BASE_URL}${endpoint}?api_key=${API_KEY}`;
        const response=await fetch(url);
        const data=await response.json();
        const slider=document.getElementById(containerId);

        data.results.forEach(movie => {
            if (movie.backdrop_path) {
                const mediaType = movie.media_type || (endpoint.startsWith('/tv') ? 'tv' : 'movie');
                const link = document.createElement('a');
                link.href = '/MovieBuddy/frontend/Movie_details/details.html?type=' + encodeURIComponent(mediaType) + '&id=' + encodeURIComponent(movie.id);
                link.classList.add('movie-card-link');

                const card = document.createElement('div');
                card.classList.add('movie-card');

                const img = document.createElement('img');
                img.src = `${IMAGE_BASE_URL}${movie.backdrop_path}`;
                img.classList.add('movie-poster');

                const info = document.createElement('div');
                info.classList.add('movie-info');
                info.innerText = movie.title || movie.name;

                card.appendChild(img);
                card.appendChild(info);
                link.appendChild(card); 
                slider.appendChild(link);
            }
        });
    }catch (error) {
        console.error(`Error fetching data for ${containerId}:`, error);
    }
}

async function fetchHeroBanner(){
    try{
        const url = `${BASE_URL}/trending/all/week?api_key=${API_KEY}`;
        const response=await fetch(url);
        const data=await response.json();

        const randomIndex=Math.floor(Math.random()* data.results.length);
        const randomMovie = data.results[randomIndex];

        heroTitle.innerText = randomMovie.title || randomMovie.name;
        heroDesc.innerText = randomMovie.overview;
        heroBanner.style.backgroundImage = `url('https://image.tmdb.org/t/p/original${randomMovie.backdrop_path}')`;

        const mediaType = randomMovie.media_type || 'movie'; 
        infomediatype=mediaType;
        infomovieid=randomMovie.id;
        
        const videoUrl = `${BASE_URL}/${mediaType}/${randomMovie.id}/videos?api_key=${API_KEY}`;
        const videoResponse = await fetch(videoUrl);
        const videoData = await videoResponse.json();

        const trailer = videoData.results.find(vid => vid.type === 'Trailer' && vid.site === 'YouTube');
        if (trailer) {
            heroVideoContainer.innerHTML = `
                <iframe 
                    src="https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=1&controls=0&showinfo=0&rel=0&loop=1&playlist=${trailer.key}&modestbranding=1" 
                    frameborder="0" 
                    allow="autoplay; encrypted-media" 
                    allowfullscreen>
                </iframe>
            `;
        } else {
            heroVideoContainer.innerHTML = '';
        }

    }catch (error) {
        console.error('Error fetching hero banner:', error);
    }
}

async function searchMedia(query) {
    try{
        const url = `${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}`;
        const response = await fetch(url);
        const data = await response.json();

        searchSection.style.display = 'block';
        searchHeading.innerText = `Search Results for "${query}"`;
        searchResultsContainer.innerHTML = '';
        
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
                img.src = `${IMAGE_BASE_URL}${imagePath}`;
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

// Event Listeners
searchBtn.addEventListener('click', () => {
    const searchTerm = searchInput.value;
    if (searchTerm) {
        searchMedia(searchTerm);
        searchInput.value="";
    }
});

searchInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        const searchTerm = searchInput.value;
        if (searchTerm) {
            searchMedia(searchTerm);
            searchInput.value="";
        }
    }
});

info_button.addEventListener('click', () => {
    window.location.href=`/MovieBuddy/frontend/Movie_details/details.html?type=${encodeURIComponent(infomediatype)}&id=${encodeURIComponent(infomovieid)}`;
});

// Authentication Status
const token = localStorage.getItem('moviebuddy_token');
const authBtn = document.getElementById('nav-auth-btn');
    
if (token) {
    authBtn.innerText = "Logout";
    authBtn.href = "#"; 
    
    authBtn.addEventListener('click', (e) => {
        e.preventDefault(); 
        localStorage.removeItem('moviebuddy_token');
        localStorage.removeItem('moviebuddy_username');
        window.location.href = '/MovieBuddy/frontend/login_page/auth.html'; 
    });
}