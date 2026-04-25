const token = localStorage.getItem('moviebuddy_token');
const recommendationsContainer = document.getElementById('recommendations-container');
const statusMessage = document.getElementById('status-message');

// Ensure navbar auth button works
const authBtn = document.getElementById('nav-auth-btn');
if (token) {
    authBtn.innerText = "Logout";
    authBtn.href = "#"; 
    authBtn.addEventListener('click', (e) => {
        e.preventDefault(); 
        localStorage.removeItem('moviebuddy_token');
        window.location.href = '../login_page/auth.html'; 
    });
}

async function loadRecommendations() {
    if (!token) {
        recommendationsContainer.innerHTML = "<p class='loading-text'>Please log in to see your personalized recommendations.</p>";
        return;
    }

    try {
        const response = await fetch('https://moviebuddy-whxl.onrender.com/api/recommend', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        // Handle the case where they haven't liked anything yet
        if (data.status === "empty") {
            recommendationsContainer.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; color: #aaa;">
                    <h3>We need more data! 🕵️‍♂️</h3>
                    <p>Go search for a few movies you love and save them to your <b>"Liked"</b> playlist. Come back here when you're done!</p>
                </div>
            `;
            return;
        }

        if (data.status === "success") {
            recommendationsContainer.innerHTML = ""; // Clear the loading text

            data.recommendations.forEach(movie => {
                const link = document.createElement('a');
                link.href = `/MovieBuddy/frontend/Movie_details/details.html?type=movie&id=${movie.movie_id}`;
                link.style.textDecoration = 'none';

                const card = document.createElement('div');
                card.classList.add('search-card');
                card.style.position = 'relative';
                card.style.overflow = 'hidden';
                card.style.borderRadius = '8px';
                card.style.aspectRatio = '2/3';        // ← key fix: natural poster ratio
                card.style.transition = 'transform 0.2s';
                card.onmouseover = () => card.style.transform = 'scale(1.05)';
                card.onmouseout = () => card.style.transform = 'scale(1)';

                if (movie.poster_path) {
                    const img = document.createElement('img');
                    img.src = `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
                    img.alt = movie.title;
                    img.style.cssText = 'width:100%; height:100%; object-fit:cover; display:block;';
                    card.appendChild(img);
                } else {
                    card.style.background = '#2a2a2a';
                }
                if (movie.match_score) {
                    const badge = document.createElement('div');
                    badge.innerText = `${movie.match_score}% Match`;
                    badge.style.cssText = `
                        position: absolute; 
                        top: 10px; 
                        right: 10px; 
                        background-color: rgba(0, 0, 0, 0.8); /* Dark semi-transparent pill */
                        color: #46d369; /* The classic 'High Confidence' Green */
                        padding: 5px 10px; 
                        border-radius: 6px; 
                        font-size: 0.85rem; 
                        font-weight: bold;
                        z-index: 2; /* Keeps it above the image */
                        box-shadow: 0 4px 6px rgba(0,0,0,0.5);
                        border: 1px solid rgba(70, 211, 105, 0.2); /* Slight green glow border */
                    `;
                    card.appendChild(badge);
                }

                // Title overlay at bottom
                const overlay = document.createElement('div');
                overlay.style.cssText = `
                    position: absolute; bottom: 0; left: 0; width: 100%;
                    background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 100%);
                    padding: 30px 10px 10px 10px; box-sizing: border-box;
                `;

                const title = document.createElement('h3');
                title.innerText = movie.title;
                title.style.cssText = 'color:white; text-align:center; margin:0; font-size:1rem; font-weight:bold;';

                overlay.appendChild(title);
                card.appendChild(overlay);
                link.appendChild(card);
                recommendationsContainer.appendChild(link);
            });
        }
    } catch (error) {
        console.error("Error loading recommendations:", error);
        recommendationsContainer.innerHTML = "<p class='loading-text'>Something went wrong while fetching your recommendations.</p>";
    }
}

loadRecommendations();