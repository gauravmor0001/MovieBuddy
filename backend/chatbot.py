import os
from groq import Groq
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from database import db
from typing import List

load_dotenv() 

router = APIRouter()

TMDB_API_KEY = os.getenv("API_KEY")
MONGO_URI = os.getenv("Mongo")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
groq_client = Groq(api_key=GROQ_API_KEY)

embed_model = SentenceTransformer('all-MiniLM-L6-v2')

class MessageItem(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[MessageItem]

@router.post("/api/chat")
async def chat_with_bot(request: ChatRequest):
    # Grab the latest message
    latest_user_msg = request.messages[-1].content

    try:
        history_context = "\n".join([f"{m.role}: {m.content}" for m in request.messages[:-1][-4:]]) # Last 4 messages
        
        reformulation_prompt = f"""
        You are an AI search query optimizer for a vector database of movies.
        Recent chat context:
        {history_context}
        
        User's latest request: "{latest_user_msg}"
        
        Based on the context, rewrite the user's latest request into a highly descriptive search query optimized for semantic vector search. 
        Focus on movie genres, plot elements, themes, and "vibes". 
        Do NOT reply to the user. Do NOT include conversational filler. Return ONLY the optimized search string.
        """

        opt_completion = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": reformulation_prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0.2 
        )
        optimized_query = opt_completion.choices[0].message.content.strip()
        print(f"Original Query: {latest_user_msg}")
        print(f"Optimized Vector Query: {optimized_query}")

        user_vector = embed_model.encode(optimized_query).tolist()

        pipeline = [
            {
                "$vectorSearch": {
                    "index": "vector_index",
                    "path": "embedding",
                    "queryVector": user_vector,
                    "numCandidates": 50,
                    "limit": 5
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "embedding": 0 
                }
            }
        ]
        
        db_results = await db.movie_corpus.aggregate(pipeline).to_list(length=None)

        if not db_results:
            return {"reply": "I couldn't find any movies matching that vibe in my database!", "movies": []}

        context_text = ""
        for i, movie in enumerate(db_results):
            year = movie.get('release_date', '')[:4] if movie.get('release_date') else "Unknown Year"
            genres = ", ".join(movie.get('genres', []))
            
            context_text += f"{i+1}. {movie['title']} ({year})\n"
            context_text += f"   Genres: {genres}\n"
            context_text += f"   Synopsis: {movie.get('overview', '')}\n\n"

        system_prompt = (
            "You are MovieBuddy, a friendly and expert movie recommendation AI. "
            "I have searched our vector database and found the closest mathematical matches. "
            "Here are the database matches:\n\n"
            f"{context_text}\n"
            "YOUR INSTRUCTIONS:\n"
            "1. Answer the user conversationally and enthusiastically.\n"
            "2. Recommend ONLY movies from the provided list above. Do not invent movies outside this list.\n"
            "3. Explain WHY these movies fit their specific request.\n"
            "4. Keep it concise, engaging, and format it nicely."
        )

        # Build the final message list: System Prompt + Full History
        final_messages = [{"role": "system", "content": system_prompt}]
        for msg in request.messages:
            final_messages.append({"role": msg.role, "content": msg.content})

        chat_completion = groq_client.chat.completions.create(
            messages=final_messages,
            model="llama-3.3-70b-versatile", 
            temperature=0.7 
        )

        llm_reply = chat_completion.choices[0].message.content
        
        return {
            "reply": llm_reply,
            "movies": db_results
        }

    except Exception as e:
        print(f"Chatbot Error: {e}")
        raise HTTPException(status_code=500, detail="The AI brain had a hiccup.")