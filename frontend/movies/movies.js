const TMDB_API_KEY = CONFIG.API_KEY; 
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';

const grid = document.getElementById('movie-grid');
const loader = document.getElementById('loader');
const endMessage = document.getElementById('end-message');
const genreFilter = document.getElementById('genre-filter');
const sortFilter = document.getElementById('sort-filter');

let currentPage = 1;
let totalPages = 1;
let isLoading = false;
let currentGenre = '';
let currentSort = 'popularity.desc';
let currentType = 'movie';

// ── Navbar auth ──────────────────────────────────────────────
const token = localStorage.getItem('moviebuddy_token');
const authBtn = document.getElementById('nav-auth-btn');
if (token && authBtn) {
    authBtn.innerText = 'Logout';
    authBtn.href = '#';
    authBtn.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('moviebuddy_token');
        localStorage.removeItem('moviebuddy_username');
        window.location.href = '/frontend/login_page/auth.html';
    });
}

// ── Fetch movies from TMDB ────────────────────────────────────
async function fetchMovies() {
    if (isLoading || currentPage > totalPages) return;

    isLoading = true;
    loader.style.display = 'block';

    try {
        let results = [];

        if (currentType === 'both') {
            // Fetch movies and TV in parallel, then interleave them
            const [movieRes, tvRes] = await Promise.all([
                fetch(`${TMDB_BASE}/discover/movie?api_key=${TMDB_API_KEY}&language=en-US&page=${currentPage}&sort_by=${currentSort}${currentGenre ? `&with_genres=${currentGenre}` : ''}`),
                fetch(`${TMDB_BASE}/discover/tv?api_key=${TMDB_API_KEY}&language=en-US&page=${currentPage}&sort_by=${currentSort}${currentGenre ? `&with_genres=${currentGenre}` : ''}`)
            ]);
            const movieData = await movieRes.json();
            const tvData = await tvRes.json();

            totalPages = Math.min(Math.max(movieData.total_pages, tvData.total_pages), 500);

            // Tag each result so renderMovies knows which details page to link to
            const taggedMovies = (movieData.results || []).map(m => ({ ...m, media_type: 'movie' }));
            const taggedTV = (tvData.results || []).map(t => ({ ...t, media_type: 'tv', title: t.name, poster_path: t.poster_path }));

            // Interleave: movie, tv, movie, tv...
            results = taggedMovies.flatMap((m, i) => taggedTV[i] ? [m, taggedTV[i]] : [m]);

        } else {
            const endpoint = currentType === 'tv' ? 'tv' : 'movie';
            const res = await fetch(`${TMDB_BASE}/discover/${endpoint}?api_key=${TMDB_API_KEY}&language=en-US&page=${currentPage}&sort_by=${currentSort}${currentGenre ? `&with_genres=${currentGenre}` : ''}`);
            const data = await res.json();
            totalPages = Math.min(data.total_pages, 500);
            results = (data.results || []).map(m => ({
                ...m,
                media_type: currentType,
                title: m.title || m.name  // TV uses 'name' not 'title'
            }));
        }

        renderMovies(results);
        currentPage++;

    } catch (err) {
        console.error('Failed to fetch:', err);
    } finally {
        isLoading = false;
        loader.style.display = 'none';
        if (currentPage > totalPages) endMessage.style.display = 'block';
    }
}

// ── Render movie cards ────────────────────────────────────────
function renderMovies(movies) {
    movies.forEach(movie => {
        if (!movie.poster_path) return; // skip movies without poster

        const link = document.createElement('a');
        link.href = `/frontend/Movie_details/details.html?type=${movie.media_type}&id=${movie.id}`;
        link.style.textDecoration = 'none';

        const card = document.createElement('div');
        card.className = 'movie-card';

        const img = document.createElement('img');
        img.src = `${TMDB_IMG}${movie.poster_path}`;
        img.alt = movie.title;
        img.loading = 'lazy';

        const overlay = document.createElement('div');
        overlay.className = 'overlay';

        const title = document.createElement('h3');
        title.textContent = movie.title;

        overlay.appendChild(title);
        card.appendChild(img);
        card.appendChild(overlay);
        link.appendChild(card);
        grid.appendChild(link);
    });
}

// ── Infinite scroll via IntersectionObserver ──────────────────
// This is cleaner than a scroll event listener — fires when the
// loader div enters the viewport, triggering the next page fetch
const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
        fetchMovies();
    }
}, { rootMargin: '200px' }); // start loading 200px before user hits bottom

observer.observe(loader);

// ── Filter change handlers ────────────────────────────────────
function resetAndReload() {
    currentPage = 1;
    totalPages = 1;
    isLoading = false;
    grid.innerHTML = '';
    endMessage.style.display = 'none';
    fetchMovies();
}

genreFilter.addEventListener('change', () => {
    currentGenre = genreFilter.value;
    resetAndReload();
});

sortFilter.addEventListener('change', () => {
    currentSort = sortFilter.value;
    resetAndReload();
});
document.getElementById('type-filter').addEventListener('change', (e) => {
    currentType = e.target.value;
    resetAndReload();
});

// ── Initial load ──────────────────────────────────────────────
fetchMovies();