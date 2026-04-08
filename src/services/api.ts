import axios from 'axios';

// Point to the /api route which will be proxied locally or handled by Vercel in production
const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Mock data for the preview environment (since Python doesn't run in this browser preview)
const MOCK_PLACES = [
  {
    _id: "1",
    name: "Eiffel Tower",
    category: "Landmark",
    description: "Iconic iron lattice tower on the Champ de Mars in Paris.",
    location: { city: "Paris", country: "France", latitude: 48.8584, longitude: 2.2945 },
    average_rating: 4.8,
    tags: ["romantic", "views", "history"],
    image: "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?auto=format&fit=crop&w=800&q=80"
  },
  {
    _id: "2",
    name: "Santorini Caldera",
    category: "Nature",
    description: "Stunning volcanic crater surrounded by white-washed villages.",
    location: { city: "Santorini", country: "Greece", latitude: 36.3932, longitude: 25.4615 },
    average_rating: 4.9,
    tags: ["beach", "sunset", "romantic"],
    image: "https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?auto=format&fit=crop&w=800&q=80"
  },
  {
    _id: "3",
    name: "Kyoto Temples",
    category: "Culture",
    description: "Historic wooden temples and beautiful zen gardens.",
    location: { city: "Kyoto", country: "Japan", latitude: 35.0116, longitude: 135.7681 },
    average_rating: 4.7,
    tags: ["culture", "peaceful", "history"],
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80"
  },
  {
    _id: "4",
    name: "Machu Picchu",
    category: "History",
    description: "Incan citadel set high in the Andes Mountains in Peru.",
    location: { city: "Cusco Region", country: "Peru", latitude: -13.1631, longitude: -72.5450 },
    average_rating: 4.9,
    tags: ["history", "hiking", "mountains"],
    image: "https://images.unsplash.com/photo-1587595431973-160d0d94add1?auto=format&fit=crop&w=800&q=80"
  },
  {
    _id: "5",
    name: "Banff National Park",
    category: "Nature",
    description: "Canada's oldest national park, known for its mountainous terrain and hot springs.",
    location: { city: "Alberta", country: "Canada", latitude: 51.1784, longitude: -115.5708 },
    average_rating: 4.8,
    tags: ["nature", "hiking", "lakes"],
    image: "https://images.unsplash.com/photo-1561134643-66c39f196126?auto=format&fit=crop&w=800&q=80"
  }
];

export const travelApi = {
  getRecommendations: async (userId: string) => {
    try {
      const response = await apiClient.get(`/recommendations/${userId}`);
      return response.data;
    } catch (error) {
      console.warn("Backend not reachable, using mock data for preview.");
      return { data: MOCK_PLACES.map(p => ({ place: p })) };
    }
  },
  
  searchPlaces: async (userId: string, query: string) => {
    try {
      const response = await apiClient.get(`/search/${userId}`, { params: { query } });
      return response.data;
    } catch (error) {
      console.warn("Backend not reachable, using mock data for preview.");
      const filtered = MOCK_PLACES.filter(p => 
        p.name.toLowerCase().includes(query.toLowerCase()) || 
        p.location.city.toLowerCase().includes(query.toLowerCase()) ||
        p.tags.some(t => t.toLowerCase().includes(query.toLowerCase()))
      );
      return { data: filtered.map(p => ({ place: p })) };
    }
  },

  getRoadmap: async (userId: string) => {
    try {
      const response = await apiClient.get(`/roadmap/${userId}`);
      return response.data;
    } catch (error) {
      console.warn("Backend not reachable, using mock data for preview.");
      return {
        data: MOCK_PLACES.map((p, i) => ({
          place: p,
          next_destination: i < MOCK_PLACES.length - 1 ? MOCK_PLACES[i+1].name : null
        }))
      };
    }
  }
};
