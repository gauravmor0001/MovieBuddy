// Wrap everything so it waits for the HTML to load!
document.addEventListener('DOMContentLoaded', () => {
    const TMDB_IMG = "https://image.tmdb.org/t/p/w500";

    function showScreen(id) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const screen = document.getElementById(id);
        if (screen) screen.classList.add('active');
    }
 
    function showError(title, msg) {
        const titleEl = document.getElementById('error-title');
        const msgEl = document.getElementById('error-msg');
        if (titleEl) titleEl.textContent = title;
        if (msgEl) msgEl.textContent = msg;
        showScreen('error-screen');
    }

    // Attach event listener safely to the copy button
    const copyBtn = document.getElementById('copy-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const linkText = document.getElementById('room-link-text');
            if (!linkText) return;
            
            navigator.clipboard.writeText(linkText.textContent).then(() => {
                copyBtn.textContent = 'Copied!';
                copyBtn.classList.add('copied');
                setTimeout(() => {
                    copyBtn.textContent = 'Copy';
                    copyBtn.classList.remove('copied');
                }, 2000);
            });
        });
    }

    let secondsLeft = 30 * 60;
    const timerEl = document.getElementById('countdown-timer');

    function startCountdown() {
        if (!timerEl) return;
        const interval = setInterval(() => {
            secondsLeft--;
            const m = String(Math.floor(secondsLeft / 60)).padStart(2, '0');  // minutes
            const s = String(secondsLeft % 60).padStart(2, '0');
            timerEl.textContent = `${m}:${s}`;
            
            if (secondsLeft <= 0) {
                clearInterval(interval);
                showError('Link Expired', 'This room has expired. Create a new one to try again.');
            }
        }, 1000);
    }

    function animateCalcSteps() {
        const steps = ['step-1', 'step-2', 'step-3', 'step-4'];
        steps.forEach((id, i) => {
            setTimeout(() => {
                const stepEl = document.getElementById(id);
                if (stepEl) stepEl.classList.add('done');
            }, i * 700);
        });
    }

    function renderMovies(movies) {
        const grid = document.getElementById('movies-grid');
        if (!grid) return;
        grid.innerHTML = '';
 
        movies.forEach(movie => {
            const year = movie.release_date ? movie.release_date.split('-')[0] : '';
            const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
            const genres = (movie.genres || []).slice(0, 2);

            const card = document.createElement('div');
            card.className = 'movie-card';
 
            const poster = movie.poster_path
              ? `<img src="${TMDB_IMG}${movie.poster_path}" alt="${movie.title}" loading="lazy"/>`
              : `<div class="no-poster">🎬</div>`;
 
            const genreTags = genres.map(g =>
              `<span class="genre-tag">${g}</span>`
            ).join('');
 
            card.innerHTML = `
              ${poster}
              <div class="card-info">
                <div class="card-title" title="${movie.title}">${movie.title}</div>
                <div class="card-meta">
                  <span class="rating">★ ${rating}</span>
                  <span class="year">${year}</span>
                </div>
                <div class="genre-tags">${genreTags}</div>
              </div>
            `;
 
            grid.appendChild(card);
        });
 
        showScreen('results-screen');
    }

    async function initRoom() {
        const token = localStorage.getItem('moviebuddy_token');

        if (!token) {
            window.location.href = '/MovieBuddy/frontend/login_page/auth.html';
            return;
        }

        const username = localStorage.getItem('moviebuddy_username') || '?';
        const avatarYou = document.getElementById('avatar-you');
        if (avatarYou && username !== '?') {
            avatarYou.textContent = username[0].toUpperCase();
        }

        // 1. Check if room_id already exists in URL (friend opening shared link)
        const urlParams = new URLSearchParams(window.location.search);
        let roomId = urlParams.get('room');

        if (!roomId) {
            try {
                const res = await fetch('https://moviebuddy-whxl.onrender.com/api/room/create', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!res.ok) {
                    showError('Server Error', 'Could not create room. Please try again.');
                    return;
                }

                const data = await res.json();
                roomId = data.room_id;

                // Update the URL so the back button and sharing works correctly
                window.history.replaceState({}, '', `?room=${roomId}`);

            } catch (e) {
                showError('Connection Error', 'Could not reach the server. Is it running?');
                return;
            }
        }

        const roomLink = `${window.location.href.split('?')[0]}?room=${roomId}`;
        const roomLinkText = document.getElementById('room-link-text');
        if (roomLinkText) roomLinkText.textContent = roomLink;

        startCountdown();

        // 4. Open WebSocket connection with the real room_id
        const wsUrl = `wss://moviebuddy-whxl.onrender.com/api/room/ws/${roomId}?token=${token}`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('WebSocket connected to room:', roomId);
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            const avatarThem = document.getElementById('avatar-them');
            const statusText = document.getElementById('status-text');
            const statusSub = document.getElementById('status-sub');

            switch (data.event) {
                case 'connected':
                    // If users_in_room is 2, we are the second person (guest)
                    if (data.users_in_room === 2 && avatarThem) {
                        avatarThem.classList.add('connected');
                        avatarThem.textContent = '✓';
                    }
                    break;

                case 'both_connected':
                    // Both users are in — update UI and switch to calculating screen
                    if (avatarThem) {
                        avatarThem.classList.add('connected');
                        avatarThem.textContent = '✓';
                    }
                    if (statusText) statusText.textContent = 'Friend connected!';
                    if (statusSub) statusSub.textContent = 'Analyzing taste profiles...';

                    setTimeout(() => {
                        showScreen('calculating-screen');
                        animateCalcSteps();
                    }, 1000);
                    break;

                case 'recommendations_ready':
                    // Wait for calc animation to finish (4 steps × 700ms = 2800ms)
                    setTimeout(() => {
                        renderMovies(data.recommendations);
                    }, 3200);
                    break;

                case 'user_left':
                    showError('Friend Disconnected', 'Your partner disconnected from the room.');
                    break;
            }
        };

        ws.onclose = (event) => {
            if (event.code === 4001) {
                showError('Unauthorized', 'Your session expired. Please log in again.');
            } else if (event.code === 4004) {
                showError('Room Not Found', 'This room has expired or does not exist.');
            }
            // code 1000 = normal close, ignore it
        };

        ws.onerror = () => {
            showError('Connection Error', 'Could not connect to the server. Please try again.');
        };
    }

    // Fire it up!
    initRoom();
});