from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from bson import ObjectId

from database import watchlist_entries_collection, playlists_collection,db
from auth import get_current_user
import numpy as np

router = APIRouter() 

async def get_taste_vector(user_id: str):
    """
    Builds a single taste vector for a user from their Liked playlist.
    Returns a numpy array of shape (384,) or None if no liked movies found.
    """
    liked_playlist = await playlists_collection.find_one(
        {"user_id": user_id, "name": "Liked"}
    )
    if not liked_playlist:
        return None

    liked_entries = await watchlist_entries_collection.find(
        {"playlist_id": str(liked_playlist["_id"])}
    ).to_list(length=None)
    liked_movie_ids = [int(e["movie_id"]) for e in liked_entries]

    if not liked_movie_ids:
        return None

    liked_corpus = await db.movie_corpus.find(
        {"movie_id": {"$in": liked_movie_ids}},
        {"embedding": 1}
    ).to_list(length=None)

    if not liked_corpus:
        return None

    vectors = [doc["embedding"] for doc in liked_corpus if "embedding" in doc]
    return np.mean(vectors, axis=0)  # shape: (384,)



@router.get("/api/recommend")
async def get_for_you_recommendations(current_user=Depends(get_current_user)):
    user_id = str(current_user["_id"])

    all_saved_entries = await watchlist_entries_collection.find(
        {"user_id": user_id}
    ).to_list(length=None)
    all_saved_movie_ids = [int(entry["movie_id"]) for entry in all_saved_entries]

    liked_playlist = await playlists_collection.find_one(
        {"user_id": user_id, "name": "Liked"}
    )
    if not liked_playlist:
        return {"status": "empty", "recommendations": []}

    # 3. DNA LIST: Get only the movies in the Liked playlist
    liked_entries = await watchlist_entries_collection.find(
        {"playlist_id": str(liked_playlist["_id"])}
    ).to_list(length=None)
    liked_movie_ids = [int(entry["movie_id"]) for entry in liked_entries]

    if not liked_movie_ids:
        return {"status": "empty", "recommendations": []}

    # 4. Fetch embeddings for liked movies to build taste vector
    liked_corpus = await db.movie_corpus.find(
        {"movie_id": {"$in": liked_movie_ids}},
        {"embedding": 1}
    ).to_list(length=None)

    if not liked_corpus:
        return {"status": "empty", "recommendations": []}

    vectors = [doc["embedding"] for doc in liked_corpus if "embedding" in doc]
    
    # Calculate Taste DNA, but make sure to convert it back to a standard Python list!
    # MongoDB cannot read NumPy arrays.
    taste_vector = np.mean(vectors, axis=0).tolist() 

    # 5. THE MAGIC: Ask MongoDB's AI engine to do the math and sorting for us!
    pipeline = [
        {
            "$vectorSearch": {
                "index": "vector_index",      # Your Atlas Search index
                "path": "embedding",          # The field to search
                "queryVector": taste_vector,  # The Taste DNA 
                "numCandidates": 200,         # Look at the 200 closest matches,this only compare with closest 200 movie vector(save money and time)
                "limit": 50                   # Return the top 20
            }
        },
        {
            # Filter out movies the user has already saved
            "$match": {
                "movie_id": {"$nin": all_saved_movie_ids}
            }
        },
        {
            # Format the output so we don't send massive arrays to the frontend
            "$project": {
                "_id": 0,
                "embedding": 0 ,
                "raw_score": {"$meta": "vectorSearchScore"}
            }
        }
    ]

    raw_recommendations = await db.movie_corpus.aggregate(pipeline).to_list(length=None)
    final_recommendations = []
    for movie in raw_recommendations:
        score_decimal = movie.get("raw_score", 0) 
        match_percentage = int(round(score_decimal * 100))
        
        if match_percentage > 98:
            match_percentage = 98
            
        movie["match_score"] = match_percentage
        movie.pop("raw_score", None) 
        
        final_recommendations.append(movie)

    return {"status": "success", "recommendations": final_recommendations}