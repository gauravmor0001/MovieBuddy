from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from database import watchlists_collection
from auth import get_current_user

router = APIRouter()

class MovieItem(BaseModel):
    movie_id: int
    title: str
    poster_path: Optional[str] = None
    media_type: str = "movie"

@router.post("/add")
async def add_to_watchlist(movie: MovieItem, current_user: dict = Depends(get_current_user)):
    
    existing_item = await watchlists_collection.find_one({
        "user_id": current_user["_id"],
        "movie_id": movie.movie_id
    })
    
    if existing_item:
        raise HTTPException(status_code=400, detail="This movie is already in your watchlist!")

    watchlist_entry = {
        "user_id": current_user["_id"],
        "movie_id": movie.movie_id,
        "title": movie.title,
        "poster_path": movie.poster_path,
        "media_type": movie.media_type
    }
    await watchlists_collection.insert_one(watchlist_entry)
    return {"message": f"Successfully added '{movie.title}' to your watchlist!"}

# user's entire watchlist
@router.get("/")
async def get_watchlist(current_user: dict = Depends(get_current_user)):
    
    cursor = watchlists_collection.find({"user_id": current_user["_id"]})
    
    # Convert the database cursor into a Python list
    saved_movies = await cursor.to_list(length=100)
    
    # MongoDB IDs are weird objects. We have to convert them to strings before sending to the frontend.
    for movie in saved_movies:
        movie["_id"] = str(movie["_id"])
        movie["user_id"] = str(movie["user_id"])
        
    return {"watchlist": saved_movies}