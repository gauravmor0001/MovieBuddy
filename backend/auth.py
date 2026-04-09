import os
import jwt
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from bson import ObjectId

from database import users_collection, playlists_collection

router = APIRouter()

JWT_SECRET = os.getenv("JWT_SECRET_KEY")
ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=7) 
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)

def verify_token(token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if not user_id:
            return None
        return {"_id": ObjectId(user_id)}
    except Exception:
        return None

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except Exception:
        raise credentials_exception

    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if user is None:
        raise credentials_exception
    return user

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str 

class UserLogin(BaseModel):
    email: EmailStr
    password: str


@router.post("/register")
async def register_user(user: UserCreate):
    existing_user = await users_collection.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_dict = {
        "username": user.username,
        "email": user.email,
        "password": get_password_hash(user.password) 
    }
    new_user = await users_collection.insert_one(user_dict)

    default_playlists = [
        {"user_id": str(new_user.inserted_id), "name": "Watch Later", "type": "default"},
        {"user_id": str(new_user.inserted_id), "name": "Liked", "type": "default"},
        {"user_id": str(new_user.inserted_id), "name": "Watched", "type": "default"}
    ]
    
    await playlists_collection.insert_many(default_playlists)

    return {"message": "User registered!", "user_id": str(new_user.inserted_id)}

@router.post("/login")
async def login_user(user: UserLogin):
    db_user = await users_collection.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    access_token = create_access_token(data={"sub": str(db_user["_id"])})
    return {
        "message": "Login successful!",
        "access_token": access_token,
        "token_type": "bearer",
        "username": db_user["username"]
    }