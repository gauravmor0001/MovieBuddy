from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from bson import ObjectId #will help in creating new objectId , convert id from string to objectid

from database import playlists_collection, watchlist_entries_collection
from auth import get_current_user

router = APIRouter()

class PlaylistCreate(BaseModel):
    name: str

@router.get("/")
async def get_playlists(current_user: dict = Depends(get_current_user)):
    cursor = playlists_collection.find({"user_id": str(current_user["_id"])})
    playlists = await cursor.to_list(length=100)
    
    # Convert MongoDB ObjectIds to strings so the frontend can read them
    for pl in playlists:
        pl["_id"] = str(pl["_id"])
        
    return {"playlists": playlists}

@router.post("/create")
async def create_playlist(playlist: PlaylistCreate, current_user: dict = Depends(get_current_user)):
    existing = await playlists_collection.find_one({
        "user_id": str(current_user["_id"]),
        "name": playlist.name
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="A playlist with this name already exists.")
        
    new_playlist = {
        "user_id": str(current_user["_id"]),
        "name": playlist.name,
        "type": "custom" 
    }
    
    result = await playlists_collection.insert_one(new_playlist)
    new_playlist["_id"] = str(result.inserted_id)
    
    return {"message": f"Playlist '{playlist.name}' created!", "playlist": new_playlist}


@router.delete("/{playlist_id}")
async def delete_playlist(playlist_id: str, current_user: dict = Depends(get_current_user)):
    try:
        obj_id = ObjectId(playlist_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid playlist ID.")

    playlist = await playlists_collection.find_one({
        "_id": obj_id, 
        "user_id": str(current_user["_id"])
    })
    
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found.")
        
    if playlist.get("type") == "default":
        raise HTTPException(status_code=403, detail="You cannot delete default playlists like 'Liked' or 'Watch Later'.")
        
    # 1. Delete the folder itself
    await playlists_collection.delete_one({"_id": obj_id})
    
    # 2. Delete all the movies that were sitting inside this folder!
    await watchlist_entries_collection.delete_many({"playlist_id": playlist_id})
    
    return {"message": "Playlist deleted successfully."}