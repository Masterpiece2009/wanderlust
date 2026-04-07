import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Map, Navigation, Calendar, Clock, Compass } from 'lucide-react';
import { travelApi } from '../services/api';
import { motion } from 'framer-motion';

export function Roadmap() {
  const USER_ID = "demo_user_123";

  const { data, isLoading, error } = useQuery({
    queryKey: ['roadmap', USER_ID],
    queryFn: () => travelApi.getRoadmap(USER_ID)
  });

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const item = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  if (isLoading) {
    return (
      <div className="space-y-12 max-w-4xl">
        <div className="h-12 w-80 bg-slate-200/50 rounded-xl animate-pulse"></div>
        <div className="space-y-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-slate-200/50 rounded-3xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-red-50/50 text-red-700 rounded-3xl border border-red-100 flex flex-col items-center justify-center text-center max-w-4xl">
        <Compass className="w-12 h-12 text-red-300 mb-4" />
        <h3 className="text-xl font-bold mb-2">Roadmap Unavailable</h3>
        <p>Failed to load your travel roadmap. Please ensure the Python backend is running.</p>
      </div>
    );
  }

  const stops = data?.data || [];

  return (
    <div className="space-y-12 max-w-4xl">
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative"
      >
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-teal-400/20 rounded-full blur-3xl -z-10" />
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 flex items-center gap-4">
          Your Travel Roadmap
          <div className="p-2 bg-teal-100 rounded-2xl">
            <Map className="w-6 h-6 text-teal-600" />
          </div>
        </h1>
        <p className="text-slate-500 mt-3 text-lg leading-relaxed">
          A perfectly sequenced journey based on your preferences, optimized for distance and experience.
        </p>
      </motion.header>

      {stops.length > 0 ? (
        <div className="relative">
          {/* Vertical Line */}
          <div className="absolute left-[47px] top-10 bottom-10 w-1 bg-gradient-to-b from-teal-200 via-teal-400 to-teal-200 rounded-full opacity-50"></div>

          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-10"
          >
            {stops.map((stop: any, idx: number) => {
              const place = stop.place;
              const isLast = idx === stops.length - 1;
              const imageUrl = place.image || `https://images.unsplash.com/photo-1488085061387-422e29b40080?auto=format&fit=crop&w=800&q=80`;

              return (
                <motion.div key={place._id || idx} variants={item} className="relative flex gap-8 group">
                  {/* Timeline Node */}
                  <div className="relative z-10 flex flex-col items-center mt-2">
                    <motion.div 
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      className="w-24 h-24 rounded-full border-4 border-white shadow-lg overflow-hidden bg-teal-100 flex-shrink-0 relative"
                    >
                      <img 
                        src={imageUrl} 
                        alt={place.name} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                    </motion.div>
                    <div className="absolute -bottom-4 bg-teal-600 text-white text-sm font-bold px-3 py-1 rounded-full border-2 border-white shadow-sm">
                      Stop {idx + 1}
                    </div>
                  </div>

                  {/* Content Card */}
                  <motion.div 
                    whileHover={{ x: 8 }}
                    transition={{ type: "spring", stiffness: 300, damping: 24 }}
                    className="flex-1 bg-white/80 backdrop-blur-xl rounded-3xl border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 group-hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-2xl font-bold text-slate-900 group-hover:text-teal-600 transition-colors">{place.name}</h3>
                        <p className="text-slate-500 flex items-center gap-1.5 mt-2 font-medium">
                          <Navigation className="w-4 h-4 text-teal-500" />
                          {place.location?.city}, {place.location?.country}
                        </p>
                      </div>
                      <span className="px-4 py-1.5 bg-teal-50 text-teal-700 rounded-xl text-sm font-bold border border-teal-100">
                        {place.category || 'Destination'}
                      </span>
                    </div>

                    <p className="text-slate-600 mb-8 leading-relaxed text-lg">
                      {place.description}
                    </p>

                    <div className="flex items-center gap-6 text-sm text-slate-500 border-t border-slate-100 pt-5">
                      {place.appropriate_time && place.appropriate_time.length > 0 && (
                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg font-medium">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span>Best in: {place.appropriate_time.slice(0, 2).join(', ')}</span>
                        </div>
                      )}
                      {stop.next_destination && !isLast && (
                        <div className="flex items-center gap-2 text-teal-600 font-bold ml-auto bg-teal-50 px-4 py-1.5 rounded-lg">
                          <Clock className="w-4 h-4" />
                          <span>Next: {stop.next_destination}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      ) : (
        <div className="p-12 text-center bg-white/50 backdrop-blur-sm rounded-3xl border border-slate-200 text-slate-500">
          No roadmap available. Try generating recommendations first.
        </div>
      )}
    </div>
  );
}
