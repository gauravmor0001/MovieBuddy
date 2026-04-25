***

# 🍿 MovieBuddy

**MovieBuddy** is a full-stack, AI-powered movie recommendation and social streaming platform. It goes beyond simple search by offering personalized AI recommendations and a real-time "Matchmaker" feature that allows two friends to sync their taste profiles and find the perfect movie to watch together.

### 🌐 Live Links
* **Live Application:** [MovieBuddy on GitHub Pages](https://gauravmor0001.github.io/MovieBuddy/frontend/home/index.html)
* **Backend API Docs (Swagger):** [MovieBuddy API](https://moviebuddy-whxl.onrender.com/docs) 

---

## ✨ Key Features

* **🎬 Comprehensive Media Library:** Browse Trending, Latest Releases, Popular TV Shows, and Top Rated movies using the TMDB API.
* **🤖 AI "For You" Recommendations:** A custom recommendation engine that analyzes your "Liked" playlist and generates highly accurate matches (with Netflix-style percentage scores).
* **🤝 Watch With Friend (Matchmaker):** Generate a unique, expiring room link to share with a friend. Uses real-time **WebSockets** to connect both users and calculate a "midpoint" movie that satisfies both taste profiles.
* **🔐 Secure User Authentication:** Full JWT-based registration and login system. Passwords are securely hashed using bcrypt.
* **🗂️ Custom Playlists & Watchlists:** Users can save movies to default playlists (Liked, Watched, Watch Later) or create their own custom folders.
* **💬 AI Chatbot Assistant:** A built-in "MovieBuddy AI" widget that can answer questions like, *"Why should I watch this?"* directly from the movie details page.
* **📊 Deep Movie Details:** View trailers, streaming providers, cast information, and community ratings.

---

## 🛠️ Tech Stack

**Frontend**
* HTML5, CSS3, Vanilla JavaScript (ES6+)
* Dynamic DOM manipulation and modular UI components
* Hosted on **GitHub Pages**

**Backend & Database**
* **Python (FastAPI):** High-performance asynchronous API.
* **WebSockets:** For real-time room syncing in the Matchmaker feature.
* **MongoDB:** NoSQL database for storing users, playlists, and recommendation vectors.
* **JWT & Passlib:** Secure session management and password hashing.
* Hosted securely on **Render**.

**External APIs**
* **TMDB API:** For rich movie metadata, posters, and cast info.
* **YouTube Embed API:** For seamless trailer playback.

---

## 🏗️ Architecture & Security Highlights

* **Secure API Key Management:** The TMDB API key is completely hidden from the public repository. The frontend dynamically fetches the key from the FastAPI backend and caches it in `sessionStorage` for high performance and security.
* **CORS & Token Security:** Cross-Origin Resource Sharing is strictly configured to only allow requests from the official GitHub Pages domain. JWT tokens are stored securely and verified on every protected API route.
* **Infinite Scrolling:** Implemented using modern `IntersectionObserver` APIs for highly performant, jank-free browsing on the "Mood" and discovery pages.

---

## 🚀 Local Setup & Installation

If you want to run this project locally, follow these steps:

### 1. Clone the repository
```bash
git clone https://github.com/gauravmor0001/MovieBuddy.git
cd MovieBuddy
```

### 2. Backend Setup
Navigate to your backend directory and set up a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in the backend directory and add your secret keys:
```env
JWT_SECRET_KEY=your_super_secret_jwt_key
API_KEY=your_tmdb_v3_api_key
MONGO_URI=your_mongodb_connection_string
```

Run the FastAPI server:
```bash
uvicorn app:app --reload --port 8000
```

### 3. Frontend Setup
Because the frontend uses ES6 modules and fetch requests, you must serve it via a local web server (do not just double-click the HTML files). 
* If using **VS Code**, install the **Live Server** extension.
* Right-click `frontend/home/index.html` and select **Open with Live Server**.

*(Note: If testing locally, ensure your backend `app.py` has `http://127.0.0.1:5500` in the CORS origins list).*

---

## 👨‍💻 Author

**Gaurav**
* **GitHub:** [@gauravmor0001](https://github.com/gauravmor0001)

***

