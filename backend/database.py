import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv


load_dotenv()
MONGO_URI = os.getenv("Mongo")

client = AsyncIOMotorClient(MONGO_URI)
db = client.moviebuddy_db       
users_collection = db.users     
watchlists_collection = db.watchlists