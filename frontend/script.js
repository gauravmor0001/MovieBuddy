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
                link.href = `details.html?type=${mediaType}&id=${movie.id}`;
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



async function searchMovies(query) {
    try {
        const url = `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${query}`;
        
        const response = await fetch(url);
        const data = await response.json();

        searchSection.style.display = 'block';
        searchHeading.innerText = `Search Results for "${query}"`;
        searchResultsContainer.innerHTML = '';
        
        data.results.forEach(movie => {
            if (movie.poster_path) {
                const link = document.createElement('a');
                link.href = `details.html?type=movie&id=${movie.id}`;

                const img = document.createElement('img');
                img.src = `${IMAGE_BASE_URL}${movie.poster_path}`;
                img.classList.add('movie-poster');
                link.appendChild(img);
                searchResultsContainer.appendChild(img);
            }
        });
        
    } catch (error) {
        console.error('Error searching for movies:', error);
    }
}
searchbutton.addEventListener('click', () => {
    const searchTerm = searchinput.value;
    if (searchTerm) {
        searchMovies(searchTerm);
    }
});

searchinput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        const searchTerm = searchinput.value;
        if (searchTerm) {
            searchMovies(searchTerm);
        }
    }
});

const searchSection = document.getElementById('search-section');
const searchResultsContainer = document.getElementById('search-results');
const searchHeading = document.getElementById('search-heading');


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