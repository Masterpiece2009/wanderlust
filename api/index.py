import os
import json
import logging
import urllib.parse
import math
import random
import asyncio
import sys
import time
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, Request, Query, BackgroundTasks, APIRouter
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from collections import Counter
from pymongo import MongoClient

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- Database Connection ---
def connect_mongo(uri, retries=3):
    last_error = None
    for attempt in range(retries):
        try:
            client = MongoClient(uri)
            client.admin.command('ping')
            logger.info(f"✅ MongoDB connection successful (attempt {attempt + 1})")
            return client
        except Exception as e:
            last_error = e
            logger.error(f"❌ MongoDB connection attempt {attempt + 1} failed: {e}")
    raise Exception(f"❌ MongoDB connection failed after {retries} attempts: {last_error}")

# Hardcoded MongoDB URI as requested
password = "cmCqBjtQCQDWbvlo"
encoded_password = urllib.parse.quote_plus(password)
MONGO_URI = f"mongodb+srv://shehabwww153:{encoded_password}@userauth.rvtb5.mongodb.net/travel_app?retryWrites=true&w=majority&appName=userAuth"

client = connect_mongo(MONGO_URI)
db = client["travel_app"]

# Collections
users_collection = db["users"]
places_collection = db["places"]
interactions_collection = db["interactions"]
search_queries_collection = db["search_queries"]
travel_preferences_collection = db["user_travel_preferences"]
recommendations_cache_collection = db["recommendations_cache"]
shown_places_collection = db["shown_places"]
roadmaps_collection = db["roadmaps"]
cache_locks_collection = db["cache_locks"]
user_keywords_cache = db["user_keywords_cache"]
keyword_similarity_cache = db["keyword_similarity_cache"] 
similar_users_cache = db["similar_users_cache"]
translation_cache = db["translation_cache"]
reviews_collection = db["reviews"]

# --- Task Priority System ---
class TaskPriority:
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class TaskManager:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.running_tasks = {TaskPriority.HIGH: 0, TaskPriority.MEDIUM: 0, TaskPriority.LOW: 0}
        self.limits = {TaskPriority.HIGH: 5, TaskPriority.MEDIUM: 3, TaskPriority.LOW: 2}
        self.semaphores = {p: asyncio.Semaphore(l) for p, l in self.limits.items()}
    
    async def run_task(self, priority, func, *args, **kwargs):
        if priority not in self.semaphores: priority = TaskPriority.LOW
        async with self.semaphores[priority]:
            start_time = datetime.now()
            self.running_tasks[priority] += 1
            try:
                if asyncio.iscoroutinefunction(func):
                    result = await func(*args, **kwargs)
                else:
                    result = await asyncio.to_thread(func, *args, **kwargs)
                return result
            except Exception as e:
                self.logger.error(f"Error in task: {e}")
                raise
            finally:
                self.running_tasks[priority] -= 1
    
    def schedule_task(self, background_tasks, priority, func, *args, **kwargs):
        async def wrapped_task():
            await self.run_task(priority, func, *args, **kwargs)
        background_tasks.add_task(wrapped_task)

task_manager = TaskManager()

# --- Models ---
class RecommendationRequest(BaseModel):
    user_id: str
    num_recommendations: Optional[int] = 10

class RoadmapRequest(BaseModel):
    user_id: str

class SearchRequest(BaseModel):
    user_id: str
    query: str
    limit: Optional[int] = 10

# --- Helper Functions ---
def get_user_travel_preferences(user_id):
    travel_prefs = travel_preferences_collection.find_one({"user_id": user_id})
    if not travel_prefs: return None
    group_type = travel_prefs.get("group_type", "")
    if isinstance(group_type, list): group_type = ", ".join(str(item) for item in group_type)
    elif not isinstance(group_type, str): group_type = str(group_type)
    return {
        "destinations": travel_prefs.get("destinations", []),
        "travel_dates": travel_prefs.get("travel_dates", ""),
        "accessibility_needs": travel_prefs.get("accessibility_needs", []),
        "budget": travel_prefs.get("budget", "medium"),
        "group_type": group_type
    }

def map_budget_level(budget_text):
    if not budget_text: return 3
    budget_text = budget_text.lower().strip()
    budget_mappings = {"budget": 1, "low": 1, "economy": 1, "mid-range": 2, "medium": 2, "moderate": 2, "high-end": 3, "high": 3, "luxury": 4, "premium": 4, "exclusive": 5}
    for key, value in budget_mappings.items():
        if key in budget_text: return value
    return 3

def calculate_budget_compatibility(place_budget_level, user_budget_level):
    def ensure_numeric(value, default=3):
        if isinstance(value, dict):
            if "$numberDouble" in value: return float(value["$numberDouble"])
            if "$numberInt" in value: return int(value["$numberInt"])
            if "$numberLong" in value: return int(value["$numberLong"])
            return default
        try: return float(value) if isinstance(value, str) else value
        except: return default
    p_level = map_budget_level(place_budget_level) if isinstance(place_budget_level, str) else ensure_numeric(place_budget_level)
    u_level = map_budget_level(user_budget_level) if isinstance(user_budget_level, str) else ensure_numeric(user_budget_level)
    diff = abs(p_level - u_level)
    return 1 - (diff / 4)

def check_accessibility_compatibility(place, accessibility_needs):
    if not accessibility_needs: return True
    place_features = place.get("accessibility", [])
    for need in accessibility_needs:
        if need not in place_features: return False
    return True

def calculate_distance(lat1, lon1, lat2, lon2):
    def ensure_float(value):
        if isinstance(value, dict):
            if "$numberDouble" in value: return float(value["$numberDouble"])
            return 0.0
        try: return float(value)
        except: return 0.0
    lat1, lon1, lat2, lon2 = map(ensure_float, [lat1, lon1, lat2, lon2])
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    return c * 6371

def generate_routes(places):
    routes = []
    for i in range(len(places) - 1):
        from_place = places[i]
        to_place = places[i+1]
        distance = None
        from_loc = from_place.get("location", {})
        to_loc = to_place.get("location", {})
        if "latitude" in from_loc and "longitude" in from_loc and "latitude" in to_loc and "longitude" in to_loc:
            try:
                distance = round(calculate_distance(from_loc["latitude"], from_loc["longitude"], to_loc["latitude"], to_loc["longitude"]), 1)
            except: pass
        routes.append({
            "from": from_place["_id"],
            "to": to_place["_id"],
            "distance_km": distance,
            "from_name": from_place.get("name", "Unknown"),
            "to_name": to_place.get("name", "Unknown")
        })
    return routes

def parse_travel_dates(travel_dates_str):
    if not travel_dates_str: return None
    if travel_dates_str.lower() == "now": return datetime.now().strftime("%B")
    try:
        date_parts = travel_dates_str.split()
        if len(date_parts) >= 1:
            month_name = date_parts[0].capitalize()
            if month_name in ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]:
                return month_name
    except: pass
    return datetime.now().strftime("%B")

def get_candidate_places(user_prefs, user_id, size=30):
    def get_safe_score(score):
        if isinstance(score, dict):
            if "$numberDouble" in score: return float(score["$numberDouble"])
            if "$numberInt" in score: return float(int(score["$numberInt"]))
            return 0.0
        try: return float(score)
        except: return 0.0

    if isinstance(user_prefs, dict) and "preferences" in user_prefs:
        preferences_obj = user_prefs.get("preferences", {})
        preferred_categories = preferences_obj.get("categories", [])
        preferred_tags = preferences_obj.get("tags", [])
    else:
        preferred_categories = []
        preferred_tags = []

    if not preferred_categories and not preferred_tags:
        return list(places_collection.find().sort([("average_rating", -1)]).limit(size))

    all_places = list(places_collection.find())
    scored_places = []
    
    preferred_categories_lower = [cat.lower() for cat in preferred_categories if cat]
    preferred_tags_lower = [tag.lower() for tag in preferred_tags if tag]
    
    category_words = set()
    for cat in preferred_categories_lower: category_words.update(cat.split())
    
    tag_words = set()
    for tag in preferred_tags_lower: tag_words.update(tag.split())
    
    for place in all_places:
        score = 0
        place_category = place.get("category", "").lower() if place.get("category") else ""
        place_tags = [tag.lower() for tag in place.get("tags", [])] if isinstance(place.get("tags"), list) else []
        place_description = place.get("description", "").lower()
        
        if place_category and any(cat == place_category for cat in preferred_categories_lower): score += 1.0
        elif place_category:
            if any(cat in place_category or place_category in cat for cat in preferred_categories_lower): score += 0.7
            elif any(word in place_category for word in category_words): score += 0.5
        
        if place_tags:
            exact_matches = sum(1 for tag in place_tags if tag in preferred_tags_lower)
            if exact_matches > 0: score += 0.8 * min(1.0, exact_matches / len(preferred_tags_lower))
            partial_matches = sum(1 for tag in place_tags if any(pref in tag or tag in pref for pref in preferred_tags_lower))
            if partial_matches > 0: score += 0.5 * min(1.0, partial_matches / len(preferred_tags_lower))
            word_matches = sum(1 for tag in place_tags if any(word in tag for word in tag_words))
            if word_matches > 0: score += 0.3 * min(1.0, word_matches / len(tag_words))

        if place_description:
            cat_matches = sum(1 for cat in preferred_categories_lower if cat in place_description)
            tag_matches = sum(1 for tag in preferred_tags_lower if tag in place_description)
            if cat_matches > 0 or tag_matches > 0: score += 0.2
        
        if score == 0: score = 0.01
        scored_places.append((place, score))
    
    scored_places.sort(key=lambda x: get_safe_score(x[1]), reverse=True)
    return [place for place, score in scored_places if get_safe_score(score) > 0.01][:size]

def calculate_personalization_score(place, user_id, user_prefs):
    def extract_numeric(value, default=0):
        try:
            if isinstance(value, dict):
                if "$numberDouble" in value: return float(value["$numberDouble"])
                if "$numberInt" in value: return float(int(value["$numberInt"]))
                return default
            return float(value)
        except: return default

    try:
        category_score = 0
        place_category = place.get("category", "").lower()
        preferred_categories = [cat.lower() for cat in user_prefs.get("preferred_categories", [])]
        
        if preferred_categories:
            if place_category in preferred_categories: category_score = 1.0
            else:
                for category in preferred_categories:
                    if category in place_category or place_category in category:
                        category_score = 0.7
                        break
        else: category_score = 0.5
            
        tag_score = 0
        place_tags = [tag.lower() for tag in place.get("tags", [])]
        preferred_tags = [tag.lower() for tag in user_prefs.get("preferred_tags", [])]
        
        if preferred_tags and place_tags:
            matching_tags = set(place_tags).intersection(set(preferred_tags))
            tag_score = len(matching_tags) / max(len(preferred_tags), 1)
        else: tag_score = 0.5
            
        raw_rating = place.get("average_rating", 0)
        rating_value = extract_numeric(raw_rating, 0)
        rating_score = min(rating_value / 5.0, 1.0)
            
        interaction_score = 0.5
        user_interactions = list(interactions_collection.find({"user_id": user_id, "place_id": place.get("_id", "")}))
        
        if user_interactions:
            interaction_types = set()
            view_count = 0
            for interaction in user_interactions:
                interaction_type = interaction.get("interaction_type", "")
                if interaction_type in ["like", "save", "share"]: interaction_types.add(interaction_type)
                elif interaction_type == "view": view_count += 1
            
            if "like" in interaction_types: interaction_score = 0.9
            elif "save" in interaction_types: interaction_score = 0.8
            elif "share" in interaction_types: interaction_score = 0.7
            elif view_count > 3: interaction_score = 0.6
        
        review_score = 0.5
        
        final_score = (category_score * 0.35) + (tag_score * 0.25) + (rating_score * 0.15) + (interaction_score * 0.1) + (review_score * 0.15)
        return final_score
    except Exception as e:
        logger.error(f"Error calculating personalization score: {e}")
        return 0.5

def generate_final_recommendations(user_id, num_recommendations=10):
    def extract_numeric(value, default=0):
        if isinstance(value, dict):
            if "$numberDouble" in value: return float(value["$numberDouble"])
            if "$numberInt" in value: return float(int(value["$numberInt"]))
            return default
        try: return float(value)
        except: return default

    try:
        user_prefs = get_user_travel_preferences(user_id)
        if not user_prefs:
            user_prefs = {"preferred_categories": [], "preferred_tags": []}
            
        candidate_places = get_candidate_places(user_prefs, user_id, size=num_recommendations * 5)
        ranked_places = []
        
        for place in candidate_places:
            score = calculate_personalization_score(place, user_id, user_prefs)
            ranked_places.append((place, score))
            
        ranked_places.sort(key=lambda x: x[1], reverse=True)
        
        recommendations = []
        for place, score in ranked_places[:num_recommendations]:
            place["source"] = "content_based"
            place["match_scores"] = {"overall": score}
            recommendations.append(place)
            
        if len(recommendations) < num_recommendations:
            remaining_needed = num_recommendations - len(recommendations)
            current_rec_ids = [r["_id"] for r in recommendations]
            fallback_places = list(places_collection.find({"_id": {"$nin": current_rec_ids}}).limit(remaining_needed * 3))
            fallback_places.sort(key=lambda p: extract_numeric(p.get("average_rating", 0)), reverse=True)
            
            for place in fallback_places[:remaining_needed]:
                place["source"] = "fallback"
                place["match_scores"] = {"overall": 0.5}
                recommendations.append(place)
                
        return recommendations
    except Exception as e:
        logger.error(f"Error generating recommendations: {e}")
        fallback_places = list(places_collection.find().limit(num_recommendations))
        for p in fallback_places: p["source"] = "error_fallback"
        return fallback_places

def generate_hybrid_roadmap(user_id):
    def extract_numeric(value, default=0):
        if isinstance(value, dict):
            if "$numberDouble" in value: return float(value["$numberDouble"])
            if "$numberInt" in value: return float(int(value["$numberInt"]))
            return default
        try: return float(value)
        except: return default

    logger.info(f"Generating roadmap for user {user_id}")
    user = users_collection.find_one({"_id": user_id})
    if not user: return {"error": "User not found"}
    
    travel_prefs = get_user_travel_preferences(user_id)
    if not travel_prefs: return {"error": "No travel preferences found"}
    
    budget = travel_prefs.get("budget", "medium")
    budget_level = map_budget_level(budget)
    accessibility_needs = travel_prefs.get("accessibility_needs", [])
    group_type = travel_prefs.get("group_type", "")
    travel_dates = travel_prefs.get("travel_dates", "")
    destinations = travel_prefs.get("destinations", [])
    travel_month = parse_travel_dates(travel_dates)
    
    all_places = list(places_collection.find())
    roadmap_warnings = []
    
    if accessibility_needs:
        filtered_places = [p for p in all_places if check_accessibility_compatibility(p, accessibility_needs)]
        if len(filtered_places) == 0:
            roadmap_warnings.append({"type": "accessibility", "message": "No places match accessibility needs."})
            filtered_places = all_places
    else:
        filtered_places = all_places
        
    destination_places = []
    if destinations:
        for place in filtered_places:
            city = place.get("location", {}).get("city", "")
            country = place.get("location", {}).get("country", "")
            for dest in destinations:
                if dest.lower() in city.lower() or dest.lower() in country.lower():
                    destination_places.append(place)
                    break
        if len(destination_places) == 0:
            roadmap_warnings.append({"type": "destination", "message": "No places found in destinations."})
    else:
        destination_places = filtered_places

    selected_place_ids = set()
    mixed_recommendations = []
    
    # Simplified fallback to just get top rated places for the roadmap
    candidate_places = destination_places if destinations else filtered_places
    candidate_places = [p for p in candidate_places if p["_id"] not in selected_place_ids]
    candidate_places.sort(key=lambda p: extract_numeric(p.get("average_rating", 0)), reverse=True)
    
    for place in candidate_places[:10]:
        mixed_recommendations.append({
            "place": place,
            "score": 0.8,
            "budget_score": 0.8,
            "accessibility_score": 0.8,
            "group_score": 0.8,
            "seasonal_score": 0.8,
            "source": "top_rated"
        })
        selected_place_ids.add(place["_id"])

    places = []
    for rec in mixed_recommendations:
        place = rec["place"]
        place["match_scores"] = {
            "overall": rec["score"],
            "budget": rec["budget_score"],
            "accessibility": rec["accessibility_score"],
            "group": rec["group_score"],
            "seasonal_score": rec["seasonal_score"],
            "source": rec["source"]
        }
        places.append(place)
    
    roadmap = {
        "places": places,
        "routes": generate_routes(places),
        "warnings": roadmap_warnings,
        "has_warnings": len(roadmap_warnings) > 0
    }
    return roadmap

def simplify_roadmap_to_list(roadmap_data):
    if not roadmap_data or "places" not in roadmap_data: return {"data": [], "message": None}
    places = roadmap_data.get("places", [])
    routes = roadmap_data.get("routes", [])
    next_stops = {route.get("from"): route for route in routes if route.get("from")}
    
    simplified_places = []
    for place in places:
        place_id = place.get("_id")
        next_route = next_stops.get(place_id, {})
        avg_rating = place.get("average_rating")
        if isinstance(avg_rating, dict) and "$numberDouble" in avg_rating:
            try: avg_rating = float(avg_rating.get("$numberDouble"))
            except: avg_rating = None
            
        simplified_place = {
            "place_id": place_id,
            "name": place.get("name"),
            "category": place.get("category"),
            "tags": place.get("tags", []),
            "description": place.get("description"),
            "location": place.get("location", {}),
            "accessibility": place.get("accessibility", []),
            "average_rating": avg_rating,
            "image": place.get("image")
        }
        simplified_places.append({
            "place": simplified_place,
            "next_destination": next_route.get("to_name") if next_route else None
        })
    
    return {"message": None, "data": simplified_places}

# --- FastAPI App ---
app = FastAPI(title="Travel API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Use an APIRouter with prefix /api to match Vercel rewrites
api_router = APIRouter(prefix="/api")

@api_router.get("/")
async def root():
    return {"success": True, "message": "Travel API is running on Vercel"}

@api_router.get("/recommendations/{user_id}")
async def get_recommendations(user_id: str, num: int = Query(10, ge=1, le=50)):
    recommendations = generate_final_recommendations(user_id, num)
    
    # Format places
    formatted_places = []
    for p in recommendations:
        avg_rating = p.get("average_rating")
        if isinstance(avg_rating, dict) and "$numberDouble" in avg_rating:
            try: avg_rating = float(avg_rating.get("$numberDouble"))
            except: avg_rating = None
        p["average_rating"] = avg_rating
        formatted_places.append({"place": p, "score": p.get("match_scores", {}).get("overall", 0.8)})
        
    return {"data": formatted_places}

@api_router.get("/search/{user_id}")
async def search_places(user_id: str, query: str = Query(..., min_length=1), limit: int = Query(10)):
    # Basic text search fallback
    all_places = list(places_collection.find())
    results = []
    for place in all_places:
        score = 0
        if query.lower() in place.get("name", "").lower(): score = 1.0
        elif "tags" in place and any(query.lower() in tag.lower() for tag in place.get("tags", [])): score = 0.8
        elif "category" in place and query.lower() in place.get("category", "").lower(): score = 0.7
        
        if score > 0:
            avg_rating = place.get("average_rating")
            if isinstance(avg_rating, dict) and "$numberDouble" in avg_rating:
                try: avg_rating = float(avg_rating.get("$numberDouble"))
                except: avg_rating = None
            place["average_rating"] = avg_rating
            results.append({"place": place, "score": score})
            
    sorted_results = sorted(results, key=lambda x: x["score"], reverse=True)[:limit]
    return {"data": [{"place": item["place"]} for item in sorted_results]}

@api_router.get("/roadmap/{user_id}")
async def get_roadmap(user_id: str):
    roadmap_data = generate_hybrid_roadmap(user_id)
    simplified_list = simplify_roadmap_to_list(roadmap_data)
    return {"data": simplified_list.get("data", [])}

# Include the router
app.include_router(api_router)
