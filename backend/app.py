from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

from auth import router as auth_router, get_current_user

app = FastAPI(title="MovieBuddy API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],  
)

app.include_router(auth_router, prefix="/api", tags=["Authentication"])

@app.get("/")
async def home():
    return {"message": "MovieBuddy Backend is running!"}

@app.get("/api/vip-lounge")
async def vip_lounge(current_user: dict = Depends(get_current_user)):
    return {
        "message": f"Welcome to the VIP area, {current_user['username']}!",
        "your_database_id": str(current_user['_id'])
    }