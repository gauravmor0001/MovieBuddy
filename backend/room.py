import random
import string
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from database import db, watchlist_entries_collection
from auth import verify_token, get_current_user
from recommend import get_taste_vector
import numpy as np

router = APIRouter()

# { "room_id": [websocket_A, websocket_B] }
active_rooms: dict[str, list[WebSocket]] = {}


class ConnectionManager:
    def connect(self, room_id: str, websocket: WebSocket):
        if room_id not in active_rooms:
            active_rooms[room_id] = []
        active_rooms[room_id].append(websocket)

    def disconnect(self, room_id: str, websocket: WebSocket):
        if room_id in active_rooms:
            active_rooms[room_id].remove(websocket)
            if not active_rooms[room_id]:
                del active_rooms[room_id]

    async def broadcast(self, room_id: str, message: dict):
        for ws in active_rooms.get(room_id, []):
            await ws.send_json(message)


manager = ConnectionManager()


def generate_room_id(length=8):
    chars = string.ascii_lowercase + string.digits
    return ''.join(random.choices(chars, k=length))


async def calculate_midpoint_recommendations(room: dict):
    user_a_id = room["created_by"]
    user_b_id = room["guest"]

    vector_a = await get_taste_vector(user_a_id)
    vector_b = await get_taste_vector(user_b_id)

    # Handle cases where one/both users have empty Liked playlists
    if vector_a is None and vector_b is None:
        return []
    elif vector_a is None:
        midpoint = vector_b
    elif vector_b is None:
        midpoint = vector_a
    else:
        midpoint = (vector_a + vector_b) / 2 

    # Exclusion list — union of both users' saved movies
    # .find() does not return the results it returns us let say pointer, to convert that into data we need to_lsit that is provided by Motor
    entries_a = await watchlist_entries_collection.find(
        {"user_id": user_a_id}
    ).to_list(length=None)
    entries_b = await watchlist_entries_collection.find(
        {"user_id": user_b_id}
    ).to_list(length=None)

    excluded_ids = list(set(
        [int(e["movie_id"]) for e in entries_a] +
        [int(e["movie_id"]) for e in entries_b]
    ))

    all_movies = await db.movie_corpus.find(
        {"movie_id": {"$nin": excluded_ids}},
        {
            "embedding": 1, "movie_id": 1, "title": 1,
            "poster_path": 1, "overview": 1, "genres": 1,
            "release_date": 1, "vote_average": 1, "_id": 0
        }
    ).to_list(length=None)

    if not all_movies:
        return []

    corpus_vectors = np.array([m["embedding"] for m in all_movies])

    midpoint_norm = midpoint / (np.linalg.norm(midpoint) + 1e-10) #Divides vector by its magnitude → makes it unit vector
    corpus_norms = corpus_vectors / (
        np.linalg.norm(corpus_vectors, axis=1, keepdims=True) + 1e-10
    )

    similarities = corpus_norms @ midpoint_norm #@=matrix multiplication (dot product)
    top_indices = np.argsort(similarities)[::-1][:10]

    recommendations = []
    for idx in top_indices:
        movie = all_movies[idx]
        movie.pop("embedding", None)
        recommendations.append(movie)

    return recommendations


@router.post("/create")
async def create_room(current_user=Depends(get_current_user)):
    user_id = str(current_user["_id"])

    existing = await db.rooms.find_one({
        "created_by": user_id,
        "status": "waiting",
        "expires_at": {"$gt": datetime.utcnow()}
    })
    if existing:
        return {"room_id": existing["room_id"]}

    room_id = generate_room_id()

    await db.rooms.insert_one({
        "room_id": room_id,
        "created_by": user_id,
        "guest": None,
        "status": "waiting",
        "expires_at": datetime.utcnow() + timedelta(minutes=30),
        "created_at": datetime.utcnow()
    })

    return {"room_id": room_id}


@router.websocket("/ws/{room_id}")
async def room_websocket(room_id: str, websocket: WebSocket, token: str):

    user_data = verify_token(token)
    if not user_data:
        await websocket.close(code=4001)
        return

    user_id = str(user_data["_id"])

    room = await db.rooms.find_one({
        "room_id": room_id,
        "expires_at": {"$gt": datetime.utcnow()}
    })
    if not room or room["status"] == "done":
        await websocket.close(code=4004)
        return

    if room["created_by"] != user_id and room["guest"] is None:
        await db.rooms.update_one(
            {"room_id": room_id},
            {"$set": {"guest": user_id, "status": "active"}}
        )
        # Refresh room doc so guest field is populated below
        room = await db.rooms.find_one({"room_id": room_id})

    # 4. Accept connection
    await websocket.accept()
    manager.connect(room_id, websocket)

    current_count = len(active_rooms.get(room_id, []))

    await websocket.send_json({
        "event": "connected",
        "users_in_room": current_count
    })

    try:
        if current_count == 2:
            await manager.broadcast(room_id, {
                "event": "both_connected",
                "message": "Both connected! Finding your perfect match..."
            })

            recommendations = await calculate_midpoint_recommendations(room)

            await manager.broadcast(room_id, {
                "event": "recommendations_ready",
                "recommendations": recommendations
            })

            await db.rooms.update_one(
                {"room_id": room_id},
                {"$set": {"status": "done"}}
            )

        while True:
            await websocket.receive_text()

    except WebSocketDisconnect:
        manager.disconnect(room_id, websocket)
        await manager.broadcast(room_id, {
            "event": "user_left",
            "message": "Your partner disconnected."
        })
        await db.rooms.update_one(
            {"room_id": room_id},
            {"$set": {"status": "done"}}
        )