from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from bson import ObjectId

from database import watchlist_entries_collection, playlists_collection,db
from auth import get_current_user
import numpy as np

router = APIRouter() 
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
                "numCandidates": 100,         # Look at the 100 closest matches
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
                "embedding": 0 
            }
        }
    ]

    # Execute the pipeline asynchronously
    recommendations = await db.movie_corpus.aggregate(pipeline).to_list(length=None)

    return {"status": "success", "recommendations": recommendations}