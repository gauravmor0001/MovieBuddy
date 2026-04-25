async function getTMDBKey() {
    const cached = sessionStorage.getItem('tmdb_key');
    if (cached) return cached;

    const response = await fetch('https://moviebuddy-whxl.onrender.com/api/config');
    const data = await response.json();
    sessionStorage.setItem('tmdb_key', data.TMDB_API_KEY);
    return data.TMDB_API_KEY;
}