import os
import urllib.parse
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ConnectionFailure
import logging

logger = logging.getLogger(__name__)

# Securely Connect to MongoDB
password = os.environ.get("MONGO_PASSWORD", "cmCqBjtQCQDWbvlo")
encoded_password = urllib.parse.quote_plus(password)
MONGO_URI = f"mongodb+srv://shehabwww153:{encoded_password}@userauth.rvtb5.mongodb.net/travel_app?retryWrites=true&w=majority&appName=userAuth"

class Database:
    client: AsyncIOMotorClient = None
    db = None

    @classmethod
    async def connect_db(cls):
        """Connect to MongoDB using Motor (Async)"""
        try:
            cls.client = AsyncIOMotorClient(MONGO_URI)
            # Verify connection
            await cls.client.admin.command('ping')
            cls.db = cls.client["travel_app"]
            logger.info("✅ Async MongoDB connection successful")
            
            # Initialize collections
            cls.users = cls.db["users"]
            cls.places = cls.db["places"]
            cls.interactions = cls.db["interactions"]
            cls.search_queries = cls.db["search_queries"]
            cls.travel_preferences = cls.db["user_travel_preferences"]
            cls.recommendations_cache = cls.db["recommendations_cache"]
            cls.shown_places = cls.db["shown_places"]
            cls.roadmaps = cls.db["roadmaps"]
            
            await cls.setup_indexes()
        except ConnectionFailure as e:
            logger.error(f"❌ Async MongoDB connection failed: {e}")
            raise e

    @classmethod
    async def close_db(cls):
        if cls.client:
            cls.client.close()
            logger.info("MongoDB connection closed")

    @classmethod
    async def setup_indexes(cls):
        """Setup TTL and standard indexes asynchronously"""
        try:
            await cls.roadmaps.create_index("created_at", expireAfterSeconds=86400)
            await cls.recommendations_cache.create_index("timestamp", expireAfterSeconds=21600)
            await cls.shown_places.create_index("last_updated", expireAfterSeconds=21600)
            
            # Standard indexes
            for collection in [cls.recommendations_cache, cls.shown_places, cls.roadmaps]:
                await collection.create_index("user_id")
                
            logger.info("✅ Database indexes verified/created")
        except Exception as e:
            logger.error(f"❌ Error creating indexes: {e}")

db = Database()
