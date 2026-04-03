# from fastapi import APIRouter, Depends, HTTPException
# from pydantic import BaseModel
# from typing import Optional
# from bson import ObjectId
# from database import watchlist_entries_collection, playlists_collection
# from auth import get_current_user

# router = APIRouter()

# class MovieItem(BaseModel):
#     movie_id: int
#     title: str
#     poster_path: Optional[str] = None
#     media_type: str = "movie"

# @router.post("/add")
# async def add_to_watchlist(movie: MovieItem, current_user: dict = Depends(get_current_user)):
    
#     existing_item = await watchlists_collection.find_one({
#         "user_id": current_user["_id"],
#         "movie_id": movie.movie_id
#     })
    
#     if existing_item:
#         raise HTTPException(status_code=400, detail="This movie is already in your watchlist!")

#     watchlist_entry = {
#         "user_id": current_user["_id"],
#         "movie_id": movie.movie_id,
#         "title": movie.title,
#         "poster_path": movie.poster_path,
#         "media_type": movie.media_type
#     }
#     await watchlists_collection.insert_one(watchlist_entry)
#     return {"message": f"Successfully added '{movie.title}' to your watchlist!"}

# # user's entire watchlist
# @router.get("/")
# async def get_watchlist(current_user: dict = Depends(get_current_user)):
    
#     cursor = watchlists_collection.find({"user_id": current_user["_id"]})
    
#     # Convert the database cursor into a Python list
#     saved_movies = await cursor.to_list(length=100)
    
#     # MongoDB IDs are weird objects. We have to convert them to strings before sending to the frontend.
#     for movie in saved_movies:
#         movie["_id"] = str(movie["_id"])
#         movie["user_id"] = str(movie["user_id"])
        
#     return {"watchlist": saved_movies}


from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from bson import ObjectId

# --- 1. IMPORT THE NEW COLLECTIONS ---
from database import watchlist_entries_collection, playlists_collection
from auth import get_current_user

router = APIRouter()

# --- 2. UPDATE THE SCHEMA ---
class MovieItem(BaseModel):
    movie_id: int
    title: str
    poster_path: Optional[str] = None
    media_type: str = "movie"
    playlist_id: str  # <-- NEW: The frontend MUST tell us which folder to put it in!

# --- 3. THE UPDATED 'ADD' ROUTE ---
@router.post("/add")
async def add_to_watchlist(movie: MovieItem, current_user: dict = Depends(get_current_user)):
    
    # First, verify the playlist actually belongs to this user
    try:
        obj_id = ObjectId(movie.playlist_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid playlist ID format.")

    playlist = await playlists_collection.find_one({
        "_id": obj_id,
        "user_id": str(current_user["_id"])
    })
    
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found.")

    # Check if the movie is already inside THIS SPECIFIC folder
    existing_item = await watchlist_entries_collection.find_one({
        "playlist_id": movie.playlist_id,
        "movie_id": movie.movie_id
    })
    
    if existing_item:
        raise HTTPException(status_code=400, detail=f"This is already in your '{playlist['name']}' list!")

    # Save the movie into the new entries collection
    watchlist_entry = {
        "user_id": str(current_user["_id"]), # Keeping this for backup/safety
        "playlist_id": movie.playlist_id,
        "movie_id": movie.movie_id,
        "title": movie.title,
        "poster_path": movie.poster_path,
        "media_type": movie.media_type
    }
    
    await watchlist_entries_collection.insert_one(watchlist_entry)
    return {"message": f"Successfully added '{movie.title}' to '{playlist['name']}'!"}

# --- 4. THE UPDATED 'GET' ROUTE ---
# Notice we added {playlist_id} to the URL!
@router.get("/{playlist_id}")
async def get_watchlist(playlist_id: str, current_user: dict = Depends(get_current_user)):
    
    # Verify playlist ownership
    try:
        obj_id = ObjectId(playlist_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid playlist ID format.")

    playlist = await playlists_collection.find_one({
        "_id": obj_id,
        "user_id": str(current_user["_id"])
    })
    
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found.")

    # Fetch ONLY the movies that belong to this specific playlist_id
    cursor = watchlist_entries_collection.find({"playlist_id": playlist_id})
    saved_movies = await cursor.to_list(length=100)
    
    for movie in saved_movies:
        movie["_id"] = str(movie["_id"])
        
    # Return both the name of the folder and the movies inside it
    return {
        "playlist_name": playlist["name"], 
        "movies": saved_movies
    }