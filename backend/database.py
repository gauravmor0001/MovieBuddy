import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv


load_dotenv()
MONGO_URI = os.getenv("Mongo")

client = AsyncIOMotorClient(MONGO_URI)
db = client.moviebuddy_db        #the main database
users_collection = db.users     
playlists_collection = db.playlists #store user playlists
watchlist_entries_collection = db.watchlists_entries