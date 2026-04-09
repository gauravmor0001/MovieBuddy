async function findCompromise() {
    const vibeA = document.getElementById('vibe-a').value.trim();
    const vibeB = document.getElementById('vibe-b').value.trim();

    // 1. Validation
    if (!vibeA || !vibeB) {
        alert("Both people need to enter a vibe!");
        return;
    }

    // 2. UI Setup: Hide old results, show loading
    document.getElementById('result-area').classList.add('hidden');
    document.getElementById('loading').classList.remove('hidden');

    try {
        // 3. Call your FastAPI Backend
        // Make sure this URL matches exactly what is in your room.py!
        const response = await fetch('http://localhost:8000/api/room/matchmaker', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                vibe_a: vibeA, 
                vibe_b: vibeB 
            })
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();

        // Expected backend response format:
        // {
        //    "explanation": "Here is why this movie works for both of you...",
        //    "movie": { title: "...", poster_path: "...", movie_id: 123 }
        // }

        // 4. Update the UI with the result
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('result-area').classList.remove('hidden');

        document.getElementById('result-title').innerText = data.movie.title;
        document.getElementById('result-explanation').innerText = data.explanation;
        
        // Render the image
        if (data.movie.poster_path) {
            document.getElementById('result-poster').src = `https://image.tmdb.org/t/p/w500${data.movie.poster_path}`;
        } else {
            document.getElementById('result-poster').src = 'https://via.placeholder.com/300x450?text=No+Poster'; // Fallback
        }

        // Setup the details link
        document.getElementById('result-link').href = `/frontend/Movie_details/details.html?type=movie&id=${data.movie.movie_id}`;

    } catch (error) {
        console.error("Matchmaker error:", error);
        document.getElementById('loading').classList.add('hidden');
        alert("Oops! The AI couldn't calculate a compromise. Is the server running?");
    }
}