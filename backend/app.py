from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

from auth import router as auth_router, get_current_user
from watchlist import router as watchlist_router
import playlist
from chatbot import router as chat_router 
from recommend import router as recommend_router 
from room import router as room_router
import os
app = FastAPI(title="MovieBuddy API")

origins = [
    "http://localhost:5500", 
    "http://127.0.0.1:5500",
    "https://gauravmor0001.github.io",
    "http://127.0.0.1:5501"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api", tags=["Authentication"])
app.include_router(
    watchlist_router, 
    prefix="/api/watchlist", 
    tags=["Watchlist"],
    # This dependencies list acts as a global bouncer for every route inside watchlist.py
    dependencies=[Depends(get_current_user)] 
)
app.include_router(recommend_router, tags=["Recommendations"])
app.include_router(playlist.router, prefix="/api/playlists", tags=["Playlists"])
app.include_router(chat_router,prefix="/api", tags=["chatbot"])
app.include_router(room_router, prefix="/api/room", tags=["Room"])


@app.get("/")
async def home():
    return {"message": "MovieBuddy Backend is running!"}

@app.get("/api/vip-lounge")
async def vip_lounge(current_user: dict = Depends(get_current_user)):
    return {
        "message": f"Welcome to the VIP area, {current_user['username']}!",
        "your_database_id": str(current_user['_id'])
    }

@app.get("/api/config")
async def get_config():
    """Securely passes the TMDB key from Render to the frontend"""
    tmdb_key = os.getenv("API_KEY")
    
    if not tmdb_key:
        return {"error": "API key not found on server"}
        
    return {"TMDB_API_KEY": tmdb_key}