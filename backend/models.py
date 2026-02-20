from pydantic import BaseModel
from typing import List, Optional

class Meal(BaseModel):
    idMeal: str
    strMeal: str
    strCategory: str
    strArea: str
    strInstructions: str
    strMealThumb: str
    strTags: Optional[str] = None
    strYoutube: Optional[str] = None
    ingredients: List[str]
    # For internal use/RAG
    description: Optional[str] = None 

class SearchRequest(BaseModel):
    query: str
    preferences: Optional[str] = None # e.g., "spicy", "vegan"

class AskRequest(BaseModel):
    query: str
    meal_context: Optional[str] = None # Or list of meal IDs to focus on

class AskResponse(BaseModel):
    answer: str
