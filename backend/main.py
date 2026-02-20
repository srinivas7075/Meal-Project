from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from contextlib import asynccontextmanager
from rag import initialize_rag

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load RAG models on startup
    print("Initializing RAG system...")
    initialize_rag()
    yield
    print("Shutting down...")

app = FastAPI(title="Meals App API", lifespan=lifespan)

# CORS Middleware
origins = [
    "http://localhost:5173",  # Vite default port
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to Meals App API"}

# Import and include routers here later
from auth import router as auth_router
app.include_router(auth_router, prefix="/auth", tags=["Auth"])

from rag import router as rag_router
app.include_router(rag_router, prefix="/meals", tags=["Meals"])
