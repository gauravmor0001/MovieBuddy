const TMDB_IMG = "https://image.tmdb.org/t/p/w500";

 function showScreen(id) {
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.getElementById(id).classList.add('active');
    }
 
function showError(title, msg) {
    document.getElementById('error-title').textContent = title;
    document.getElementById('error-msg').textContent = msg;
    showScreen('error-screen');
}

function copyLink() {
    const link = document.getElementById('room-link-text').textContent;
    navigator.clipboard.writeText(link).then(() => {
    const btn = document.getElementById('copy-btn');
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => {
        btn.textContent = 'Copy';
        btn.classList.remove('copied');
    }, 2000);
    });
}

let secondsLeft = 30 * 60;
const timerEl = document.getElementById('countdown-timer');

function startCountdown() {
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
          document.getElementById(id).classList.add('done');
        }, i * 700);
    });
}

function renderMovies(movies) {
    const grid = document.getElementById('movies-grid');
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
        showError('Not Logged In', 'Please log in to use this feature.');
        return;
    }

    const username = localStorage.getItem('moviebuddy_username');
    //  || '?';
    // document.getElementById('avatar-you').textContent = username[0].toUpperCase();

    // 1. Check if room_id already exists in URL (friend opening shared link)
    const urlParams = new URLSearchParams(window.location.search);
    let roomId = urlParams.get('room');

    if (!roomId) {
        try {
            const res = await fetch('http://127.0.0.1:8000/api/room/create', {
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
    document.getElementById('room-link-text').textContent = roomLink;

    startCountdown();

    // 4. Open WebSocket connection with the real room_id
    const wsUrl = `ws://127.0.0.1:8000/api/room/ws/${roomId}?token=${token}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('WebSocket connected to room:', roomId);
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        switch (data.event) {

            case 'connected':
                // If users_in_room is 2, we are the second person (guest)
                // Update avatar to show friend is already here
                if (data.users_in_room === 2) {
                    document.getElementById('avatar-them').classList.add('connected');
                    document.getElementById('avatar-them').textContent = '✓';
                }
                break;

            case 'both_connected':
                // Both users are in — update UI and switch to calculating screen
                document.getElementById('avatar-them').classList.add('connected');
                document.getElementById('avatar-them').textContent = '✓';
                document.getElementById('status-text').textContent = 'Friend connected!';
                document.getElementById('status-sub').textContent = 'Analyzing taste profiles...';

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

initRoom();