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
        const response = await fetch('http://localhost:8000/api/recommend', {
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
                // Pointing to your details page layout!
                link.href = `/frontend/Movie_details/details.html?type=movie&id=${movie.movie_id}`;
                link.style.textDecoration = 'none';

                const card = document.createElement('div');
                card.classList.add('search-card'); 

                if (movie.poster_path) {
                    // 1. Setup the card to hold the overlay
                    card.style.position = "relative";
                    card.style.overflow = "hidden"; // Keeps the gradient inside the rounded corners
                    card.style.borderRadius = "8px";
                    
                    // 2. Create the image
                    const img = document.createElement('img');
                    // Note: If you want horizontal images like your home page, you can change movie.poster_path to movie.backdrop_path here!
                    img.src = `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
                    img.alt = movie.title;
                    img.style.width = "100%";
                    img.style.height = "100%";
                    img.style.objectFit = "cover"; // Prevents stretching
                    img.style.display = "block";
                    card.appendChild(img);

                    // 3. Create the dark gradient overlay wrapper
                    const textOverlay = document.createElement('div');
                    textOverlay.style.position = "absolute";
                    textOverlay.style.bottom = "0";
                    textOverlay.style.left = "0";
                    textOverlay.style.width = "100%";
                    // This creates the fade-to-black effect behind the text
                    textOverlay.style.background = "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 100%)";
                    textOverlay.style.padding = "30px 10px 10px 10px"; 
                    textOverlay.style.boxSizing = "border-box";

                    // 4. Create the title text
                    const titleElement = document.createElement('h3');
                    titleElement.innerText = movie.title;
                    titleElement.style.color = "white";
                    titleElement.style.textAlign = "center";
                    titleElement.style.margin = "0";
                    titleElement.style.fontSize = "1.1rem";
                    titleElement.style.fontWeight = "bold";
                    
                    // 5. Attach everything together
                    textOverlay.appendChild(titleElement);
                    card.appendChild(textOverlay); 
                    
                    // Add the hover effect
                    card.style.transition = "transform 0.2s";
                    card.onmouseover = () => card.style.transform = "scale(1.05)";
                    card.onmouseout = () => card.style.transform = "scale(1)";

                } else {
                    const infoDiv = document.createElement('div');
                    infoDiv.classList.add('search-card-fallback');
                    infoDiv.innerHTML = `<h3>${movie.title}</h3>`;
                    card.appendChild(infoDiv);
                }

                link.appendChild(card);
                recommendationsContainer.appendChild(link);
            });
        }
    } catch (error) {
        console.error("Error loading recommendations:", error);
        recommendationsContainer.innerHTML = "<p class='loading-text'>Something went wrong while fetching your recommendations.</p>";
    }
}

// Fire the engine when the page loads!
loadRecommendations();