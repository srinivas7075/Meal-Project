import os
import requests
from fastapi import APIRouter, HTTPException
from chromadb import PersistentClient
from sentence_transformers import SentenceTransformer
from models import Meal, SearchRequest, AskRequest, AskResponse
from dotenv import load_dotenv
from groq import Groq

# Explicitly load .env
load_dotenv()

router = APIRouter()

# Global variables
chroma_client = None
collection = None
embedding_model = None

# API Keys
THEMEALDB_API_KEY = os.getenv("THEMEALDB_API_KEY", "1")

# Local ChromaDB path
CHROMA_PATH = "./chroma_db"

def initialize_rag():
    global chroma_client, collection, embedding_model
    try:
        print("Loading Sentence Transformer model...")
        embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

        print("Initializing ChromaDB...")
        chroma_client = PersistentClient(path=CHROMA_PATH)
        collection = chroma_client.get_or_create_collection(name="meals")
        print("RAG System Initialized.")
    except Exception as e:
        print(f"Error initializing RAG: {e}")

def get_ingredients(meal_data):
    ingredients = []
    for i in range(1, 21):
        ingredient = meal_data.get(f"strIngredient{i}")
        measure = meal_data.get(f"strMeasure{i}")
        if ingredient and ingredient.strip():
            ingredients.append(f"{measure} {ingredient}".strip())
    return ingredients

@router.post("/ingest/{char}")
async def ingest_meals(char: str):
    """Ingest meals starting with a specific letter from TheMealDB"""
    if len(char) != 1:
        raise HTTPException(status_code=400, detail="Please provide a single character")

    url = f"https://www.themealdb.com/api/json/v1/{THEMEALDB_API_KEY}/search.php?f={char}"
    response = requests.get(url)
    data = response.json()

    if not data['meals']:
        return {"message": "No meals found"}

    ids = []
    metadatas = []
    documents = []

    print(f"Processing {len(data['meals'])} meals...")

    for meal in data['meals']:
        ingredients = get_ingredients(meal)
        content = f"Name: {meal['strMeal']}. Category: {meal['strCategory']}. Area: {meal['strArea']}. \n"
        content += f"Ingredients: {', '.join(ingredients)}. \n"
        content += f"Instructions: {meal['strInstructions']}"

        documents.append(content)
        ids.append(meal['idMeal'])
        metadatas.append({
            "idMeal": meal['idMeal'],
            "strMeal": meal['strMeal'],
            "strCategory": meal['strCategory'],
            "strArea": meal['strArea'],
            "strMealThumb": meal['strMealThumb']
        })

    embeddings = embedding_model.encode(documents).tolist()
    collection.upsert(
        ids=ids,
        embeddings=embeddings,
        documents=documents,
        metadatas=metadatas
    )

    return {"message": f"Successfully ingested {len(documents)} meals"}

@router.post("/search")
async def search_meals(request: SearchRequest):
    """Hybrid search: TheMealDB name search + RAG semantic search"""
    query = request.query.strip()
    seen_ids = set()
    meals = []

    # ── 1. Direct TheMealDB name search (always works for any meal) ──
    try:
        mealdb_url = f"https://www.themealdb.com/api/json/v1/{THEMEALDB_API_KEY}/search.php?s={query}"
        mealdb_resp = requests.get(mealdb_url, timeout=5)
        mealdb_data = mealdb_resp.json()
        if mealdb_data.get("meals"):
            for m in mealdb_data["meals"]:
                if m["idMeal"] not in seen_ids:
                    seen_ids.add(m["idMeal"])
                    meals.append({
                        "idMeal": m["idMeal"],
                        "strMeal": m["strMeal"],
                        "strCategory": m["strCategory"],
                        "strArea": m["strArea"],
                        "strMealThumb": m["strMealThumb"],
                        "score": 0,
                    })
    except Exception as e:
        print(f"TheMealDB search error: {e}")

    # ── 2. RAG semantic search (supplements with flavour/ingredient matches) ──
    if collection and embedding_model:
        try:
            rag_query = query
            if request.preferences:
                rag_query += f" {request.preferences}"

            query_embedding = embedding_model.encode([rag_query]).tolist()
            results = collection.query(query_embeddings=query_embedding, n_results=5)

            if results["ids"]:
                for i, rid in enumerate(results["ids"][0]):
                    meta = results["metadatas"][0][i]
                    if meta["idMeal"] not in seen_ids:
                        seen_ids.add(meta["idMeal"])
                        meals.append({
                            "idMeal": meta["idMeal"],
                            "strMeal": meta["strMeal"],
                            "strCategory": meta["strCategory"],
                            "strArea": meta["strArea"],
                            "strMealThumb": meta["strMealThumb"],
                            "score": results["distances"][0][i] if results.get("distances") is not None else 0,
                        })
        except Exception as e:
            print(f"RAG search error: {e}")

    return {"meals": meals}


@router.post("/ask", response_model=AskResponse)
async def ask_question(request: AskRequest):
    """RAG-based Q&A using Groq"""

    # Re-read key fresh each request
    load_dotenv()
    api_key = os.getenv("GROQ_API_KEY")

    print(f"DEBUG: Checking Groq Key: {api_key[:8] if api_key else 'None'}...")

    if not api_key or len(api_key) < 5:
        return {"answer": "Configuration Error: GROQ_API_KEY is missing or invalid in backend/.env. Get a free key at console.groq.com"}

    try:
        # 1. Try to retrieve context from ChromaDB (may not be available)
        context = ""
        if embedding_model and collection:
            try:
                query_embedding = embedding_model.encode([request.query]).tolist()
                results = collection.query(query_embeddings=query_embedding, n_results=3)
                if results['documents']:
                    context = "\n\n".join(results['documents'][0])
            except Exception as ctx_err:
                print(f"Context retrieval error (non-fatal): {ctx_err}")


        # 2. Call Groq (free, fast!)
        client = Groq(api_key=api_key)

        system_prompt = (
            "You are a world-class chef AI assistant. "
            "Answer the user's cooking question based on the provided recipe context. "
            "If the context doesn't cover the topic, use your general culinary knowledge. "
            "Be concise, helpful and enthusiastic about food!"
        )

        user_prompt = f"""Recipe Context:
---------------------
{context}
---------------------

Question: {request.query}
Answer:"""

        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",   # Groq supported model
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=512,
            temperature=0.7,
        )

        return {"answer": completion.choices[0].message.content}

    except Exception as e:
        err = str(e)
        print(f"Error calling Groq: {err}")
        if "invalid_api_key" in err or "authentication" in err.lower():
            return {"answer": "Error: Invalid Groq API key. Please check your GROQ_API_KEY in backend/.env"}
        if "rate_limit" in err.lower():
            return {"answer": "Error: Groq rate limit hit. Please wait a moment and try again."}
        return {"answer": f"Error: {err}"}
