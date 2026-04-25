import os
from groq import Groq
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
# from sentence_transformers import SentenceTransformer
import httpx
from database import db
from typing import List

load_dotenv() 

router = APIRouter()

TMDB_API_KEY = os.getenv("API_KEY")
MONGO_URI = os.getenv("Mongo")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
HF_TOKEN = os.getenv("HF_TOKEN")
groq_client = Groq(api_key=GROQ_API_KEY)

# embed_model = SentenceTransformer('all-MiniLM-L6-v2')
HF_API_URL = "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2"

async def get_embedding(text: str):
    """Fetches the 384-dimensional vector from Hugging Face's free API instead of local RAM."""
    headers = {"Authorization": f"Bearer {HF_TOKEN}"}
    
    async with httpx.AsyncClient() as client:
        response = await client.post(HF_API_URL, headers=headers, json={"inputs": [text]})
        
        if response.status_code != 200:
            print(f"Hugging Face API Error: {response.text}")
            return []
            
        data = response.json()
        
        # Hugging Face returns a nested list (e.g., [[0.12, 0.54, ...]]), so we grab the first item
        if isinstance(data, list) and len(data) > 0 and isinstance(data[0], list):
            return data[0]
        return data

async def classify_intent(user_message: str, chat_history: str = "") -> str:
    """
    Acts as the Traffic Cop. Reads the user's message and categorizes the intent.
    """
    classifier_prompt = f"""
    You are an intent classification engine for a movie chatbot.
    Recent context (if any): {chat_history}
    
    User's new message: "{user_message}"
    
    Classify the user's message into exactly ONE of these three categories:
    1. "discuss": The user is asking a specific question about a specific movie, lore, plot, or asking "why should I watch this?"
    2. "recommend": The user is expressing a mood (e.g., "I feel sad"), a genre (e.g., "action movies"), or directly asking for recommendations.
    3. "chat": The user is just saying hello, asking who you are, or making general conversation.
    
    Respond with ONLY the exact category word in lowercase. Do not add punctuation. Do not add explanations.
    """

    try:
        completion = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": classifier_prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0.0 
        )
        
        intent = completion.choices[0].message.content.strip().lower()
        

        if intent not in ["discuss", "recommend", "chat"]:
            return "recommend" 
            
        return intent

    except Exception as e:
        print(f"Classification Error: {e}")
        return "recommend"

class MessageItem(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[MessageItem]


@router.post("/chat")
async def chat_with_bot(request: ChatRequest):
    latest_user_msg = request.messages[-1].content

    try: 
        history_context = "\n".join([f"{m.role}: {m.content}" for m in request.messages[:-1][-4:]])
        intent = await classify_intent(latest_user_msg, history_context)
        print(f"--- Traffic Cop detected intent: {intent.upper()} ---")

        if intent == "chat":
            sys_prompt = "You are MovieBuddy, a friendly movie AI. Chat casually with the user. Keep it brief, friendly, and ask what they want to watch."
            
            final_messages = [{"role": "system", "content": sys_prompt}]
            for msg in request.messages[-4:]:
                final_messages.append({"role": msg.role, "content": msg.content})
                
            chat_completion = groq_client.chat.completions.create(
                messages=final_messages,
                model="llama-3.3-70b-versatile",
                temperature=0.7
            )
            # CRITICAL: We return an empty movies array [] so your JavaScript doesn't crash!
            return {"reply": chat_completion.choices[0].message.content, "movies": []}

        elif intent == "discuss":
            sys_prompt = (
                "You are MovieBuddy, an expert film critic and movie historian. "
                "The user is asking a specific question about a movie, lore, plot, or why they should watch it. "
                "Answer them passionately. Do NOT give major spoilers unless asked. "
                "If they ask 'Why should I watch this?', give them a highly engaging pitch."
            )
            
            final_messages = [{"role": "system", "content": sys_prompt}]
            for msg in request.messages:
                final_messages.append({"role": msg.role, "content": msg.content})
                
            chat_completion = groq_client.chat.completions.create(
                messages=final_messages,
                model="llama-3.3-70b-versatile",
                temperature=0.7
            )
            return {"reply": chat_completion.choices[0].message.content, "movies": []}

        else:
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
            print(f"Optimized Vector Query: {optimized_query}")

            user_vector = await get_embedding(optimized_query)

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
                {"$project": {"_id": 0, "embedding": 0}}
            ]
            
            db_results = await db.movie_corpus.aggregate(pipeline).to_list(length=None)

            if not db_results:
                return {"reply": "I couldn't find any movies matching that vibe in my database!", "movies": []}

            context_text = ""
            for i, movie in enumerate(db_results):
                year = movie.get('release_date', '')[:4] if movie.get('release_date') else "Unknown Year"
                genres = ", ".join(movie.get('genres', []))
                context_text += f"{i+1}. {movie['title']} ({year})\n   Genres: {genres}\n   Synopsis: {movie.get('overview', '')}\n\n"

            system_prompt = (
                "You are MovieBuddy, a friendly and expert movie recommendation AI. "
                "I have searched our vector database and found the closest mathematical matches. "
                "Here are the database matches:\n\n"
                f"{context_text}\n"
                "YOUR INSTRUCTIONS:\n"
                "1. Answer the user conversationally and enthusiastically.\n"
                "2. Recommend ONLY movies from the provided list above.\n"
                "3. Explain WHY these movies fit their specific request.\n"
                "4. Keep it concise."
            )

            final_messages = [{"role": "system", "content": system_prompt}]
            for msg in request.messages:
                final_messages.append({"role": msg.role, "content": msg.content})

            chat_completion = groq_client.chat.completions.create(
                messages=final_messages,
                model="llama-3.3-70b-versatile", 
                temperature=0.7 
            )

            return {
                "reply": chat_completion.choices[0].message.content,
                "movies": db_results
            }

    except Exception as e:
        print(f"Chatbot Error: {e}")
        raise HTTPException(status_code=500, detail="The AI brain had a hiccup.")