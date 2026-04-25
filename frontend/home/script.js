let CONFIG={}
try {
        const response = await fetch('https://your-render-url-here.onrender.com/api/config');
        const data = await response.json();
        CONFIG.API_KEY = data.TMDB_API_KEY;
        
    } catch (error) {
        console.error("Failed to load secure config:", error);
    }

const API_KEY=CONFIG.API_KEY
const BASE_URL='https://api.themoviedb.org/3';
const IMAGE_BASE_URL='https://image.tmdb.org/t/p/w500';

async function fetchAndDisplayMovies(endpoint,containerId){
    try{
        const url=`${BASE_URL}${endpoint}?api_key=${API_KEY}`;

        const response=await fetch(url); //raw data
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
                // TMDB uses "title" for movies, but "name" for TV shows!
                info.innerText = movie.title || movie.name;

                card.appendChild(img);
                card.appendChild(info);
                link.appendChild(card);  // this is wraping the whole card into <a> to make it clickable
                slider.appendChild(link);
            }
        });
    }catch (error) {
        console.error(`Error fetching data for ${containerId}:`, error);
    }
}

const heroBanner=document.getElementById('hero-banner');
const heroTitle=document.getElementById('hero-title');
const heroDesc=document.getElementById('hero-description');
const heroVideoContainer = document.getElementById('hero-video-container'); 
let infomediatype;
let infomovieid;
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
fetchHeroBanner();

fetchAndDisplayMovies('/trending/all/week', 'trending-slider');
fetchAndDisplayMovies('/movie/now_playing', 'cinemas-slider');
fetchAndDisplayMovies('/tv/popular', 'Popular-slider');
fetchAndDisplayMovies('/movie/top_rated', 'top-rated-slider');
fetchAndDisplayMovies('/movie/upcoming', 'latest-slider');

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
            link.href = `/MovieBuddy/frontend/Movie_details/details.html?type=${encodeURIComponent(item.media_type)}&id=${encodeURIComponent(item.id)}`;
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
            window.location.href = '/MovieBuddy/frontend/login_page/auth.html'; 
        });
    }

const info_button=document.getElementById('info-button');
info_button.addEventListener('click', () => {
    window.location.href=`/MovieBuddy/frontend/Movie_details/details.html?type=${encodeURIComponent(infomediatype)}&id=${encodeURIComponent(infomovieid)}`;
});



    
// what we get in json from api call:
// {
//   "page": 1,
//   "results": [
//     {
//       "title": "Inception",
//       "backdrop_path": "/xyz.jpg"
//     },
//     {
//       "title": "Interstellar",
//       "backdrop_path": "/abc.jpg"
//     }
//   ]
// }