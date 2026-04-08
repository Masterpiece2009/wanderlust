import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { travelApi } from '../services/api';
import { PlaceCard } from '../components/PlaceCard';
import { Sparkles, Compass } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../components/AuthProvider';

export function Dashboard() {
  const { user } = useAuth();
  const USER_ID = user?.uid || "demo_user_123";

  const { data, isLoading, error } = useQuery({
    queryKey: ['recommendations', USER_ID],
    queryFn: () => travelApi.getRecommendations(USER_ID)
  });

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  if (isLoading) {
    return (
      <div className="space-y-12">
        <div className="h-12 w-80 bg-slate-200/50 rounded-xl animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-96 bg-slate-200/50 rounded-3xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-red-50/50 text-red-700 rounded-3xl border border-red-100 backdrop-blur-sm flex flex-col items-center justify-center text-center">
        <Compass className="w-12 h-12 text-red-300 mb-4" />
        <h3 className="text-xl font-bold mb-2">Connection Error</h3>
        <p>Failed to load recommendations. Please ensure the Python backend is running.</p>
      </div>
    );
  }

  const places = data?.data || [];

  return (
    <div className="space-y-10">
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative"
      >
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-teal-400/20 rounded-full blur-3xl -z-10" />
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 flex items-center gap-4">
          Discover Your Next Adventure
          <div className="p-2 bg-amber-100 rounded-2xl">
            <Sparkles className="w-6 h-6 text-amber-500" />
          </div>
        </h1>
        <p className="text-slate-500 mt-3 text-lg max-w-2xl leading-relaxed">
          We've analyzed your preferences to curate these personalized destinations. 
          Powered by advanced semantic search and collaborative filtering.
        </p>
      </motion.header>

      {places.length > 0 ? (
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {places.map((placeItem: any, idx: number) => (
            <motion.div key={placeItem.place._id || idx} variants={item} className="h-full">
              <PlaceCard 
                place={placeItem.place} 
                matchScore={placeItem.place.match_scores?.overall || 0.85 + (Math.random() * 0.1)} 
              />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="p-12 text-center bg-white/50 backdrop-blur-sm rounded-3xl border border-slate-200 text-slate-500">
          No recommendations found. Try updating your preferences.
        </div>
      )}
    </div>
  );
}
