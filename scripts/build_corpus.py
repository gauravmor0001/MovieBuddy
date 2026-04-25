import requests
from pymongo import MongoClient
from sentence_transformers import SentenceTransformer
import os
import time
from dotenv import load_dotenv
load_dotenv()

TMDB_API_KEY = os.getenv("API_KEY")
MONGO_URI = os.getenv("MONGO")

GENRE_MAP = {
    28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy",
    80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family",
    14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music",
    9648: "Mystery", 10749: "Romance", 878: "Science Fiction",
    10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western"
}

print("Connecting to database...")
client = MongoClient(MONGO_URI)
db = client.moviebuddy_db
corpus_collection = db.movie_corpus

print("Loading AI Model...")
model = SentenceTransformer('all-MiniLM-L6-v2')
seen_movie_ids = set()
TOTAL_PAGES = 300
movies_to_insert = []

print("\nStarting to fetch and vectorize movies. This will take a few minutes...\n")
for page in range(1, TOTAL_PAGES + 1):
    print(f"Processing Page {page}/{TOTAL_PAGES}...")
    url = f"https://api.themoviedb.org/3/movie/popular?api_key={TMDB_API_KEY}&language=en-US&page={page}"
    
    # THE BULLETPROOF RETRY LOOP
    max_retries = 5
    response = None
    
    for attempt in range(max_retries):
        try:
            time.sleep(5) # Wait 1 full second between requests to be extra safe
            response = requests.get(url).json()
            break # If it works, break out of the retry loop!
            
        except Exception as e:
            print(f"⚠️ Connection dropped! Retrying in 5 seconds... (Attempt {attempt + 1} of {max_retries})")
            time.sleep(20)
            
    # If we tried 5 times and it STILL failed, skip this page and don't crash.
    if response is None or 'results' not in response:
        print(f"❌ Page {page} completely failed. Skipping to the next page.")
        continue 

    # --- The rest of your code stays exactly the same ---
    for movie in response.get('results', []):
        if not movie.get('overview'):
            continue
        
        movie_id = movie['id']
        if movie_id in seen_movie_ids:
            continue 
        seen_movie_ids.add(movie_id)

        genres = [GENRE_MAP.get(gid, "") for gid in movie.get('genre_ids', [])]
        genres = [g for g in genres if g]  # remove empty strings
        genre_text = ", ".join(genres) if genres else "Unknown"

        text_to_embed = f"Title: {movie['title']}. Genres: {genre_text}. Synopsis: {movie['overview']}"

        vector = model.encode(text_to_embed).tolist()

        movie_doc = {
            "movie_id": movie['id'],
            "title": movie['title'],
            "poster_path": movie.get('poster_path'),
            "overview": movie['overview'],
            "genres": genres,
            "release_date": movie.get('release_date', ''),
            "vote_average": movie.get('vote_average', 0),
            "embedding": vector
        }

        movies_to_insert.append(movie_doc)


print(f"\nFinished vectorizing {len(movies_to_insert)} movies!")
print("Clearing old corpus data (if any)...")
corpus_collection.delete_many({})

print("Saving new AI brain to MongoDB...")
corpus_collection.insert_many(movies_to_insert)

print("Creating index on movie_id for fast lookups...")
corpus_collection.create_index("movie_id", unique=True)

print("\nSUCCESS! Your AI Movie Brain is fully loaded and saved to the database.")
print(f"Total movies in corpus: {corpus_collection.count_documents({})}")

client.close()