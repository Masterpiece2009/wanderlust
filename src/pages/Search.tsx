import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon, Loader2, Compass } from 'lucide-react';
import { travelApi } from '../services/api';
import { PlaceCard } from '../components/PlaceCard';
import { motion } from 'framer-motion';

export function Search() {
  const USER_ID = "demo_user_123";
  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['search', USER_ID, activeQuery],
    queryFn: () => travelApi.searchPlaces(USER_ID, activeQuery),
    enabled: activeQuery.length > 0,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setActiveQuery(query.trim());
    }
  };

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

  return (
    <div className="space-y-10">
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-3xl relative"
      >
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-teal-400/20 rounded-full blur-3xl -z-10" />
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
          Explore Destinations
        </h1>
        <p className="text-slate-500 mt-3 text-lg leading-relaxed">
          Powered by semantic search. Find specific places, landmarks, or explore by keywords like "romantic beaches" or "historic museums".
        </p>
      </motion.header>

      <motion.form 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        onSubmit={handleSearch} 
        className="relative max-w-3xl"
      >
        <div className="relative flex items-center group">
          <SearchIcon className="absolute left-5 w-6 h-6 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Where do you want to go?"
            className="w-full pl-14 pr-32 py-5 bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 text-lg transition-all"
          />
          <button 
            type="submit"
            className="absolute right-3 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl transition-colors shadow-md hover:shadow-lg"
          >
            Search
          </button>
        </div>
      </motion.form>

      {error ? (
        <div className="p-8 bg-red-50/50 text-red-700 rounded-3xl border border-red-100 flex flex-col items-center justify-center text-center max-w-3xl">
          <Compass className="w-12 h-12 text-red-300 mb-4" />
          <h3 className="text-xl font-bold mb-2">Search Failed</h3>
          <p>Could not connect to the backend search API.</p>
        </div>
      ) : isFetching ? (
        <div className="flex flex-col items-center justify-center py-32 text-slate-500">
          <Loader2 className="w-10 h-10 animate-spin mb-6 text-teal-600" />
          <p className="text-lg font-medium">Analyzing semantic matches...</p>
        </div>
      ) : activeQuery && data?.data ? (
        <div className="space-y-8">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            Results for <span className="text-teal-600">"{activeQuery}"</span>
          </h2>
          {data.data.length > 0 ? (
            <motion.div 
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {data.data.map((item: any, idx: number) => (
                <motion.div key={item.place._id || idx} variants={item} className="h-full">
                  <PlaceCard place={item.place} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="p-12 text-center bg-white/50 backdrop-blur-sm rounded-3xl border border-slate-200 text-slate-500 max-w-3xl">
              No places found matching your search. Try different keywords.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
