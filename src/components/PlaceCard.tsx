import React from 'react';
import { Star, MapPin, Navigation } from 'lucide-react';
import { motion } from 'framer-motion';

interface PlaceCardProps {
  place: any;
  matchScore?: number;
}

export function PlaceCard({ place, matchScore }: PlaceCardProps) {
  const imageUrl = place.image || `https://images.unsplash.com/photo-1488085061387-422e29b40080?auto=format&fit=crop&w=800&q=80`;

  return (
    <motion.div 
      whileHover={{ y: -8 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="group relative bg-white/80 backdrop-blur-xl rounded-3xl overflow-hidden border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col h-full"
    >
      <div className="relative h-56 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 z-10" />
        <motion.img 
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.4 }}
          src={imageUrl} 
          alt={place.name} 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        
        {matchScore && (
          <div className="absolute top-4 right-4 z-20 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-teal-700 shadow-sm flex items-center gap-1">
            <Star className="w-3 h-3 fill-teal-700" />
            {Math.round(matchScore * 100)}% Match
          </div>
        )}
        
        <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2">
          <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium text-white border border-white/30">
            {place.category || 'Destination'}
          </div>
        </div>
      </div>
      
      <div className="p-6 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-xl font-bold text-slate-900 line-clamp-1 group-hover:text-teal-600 transition-colors">
            {place.name}
          </h3>
          <div className="flex items-center gap-1 text-amber-500 bg-amber-50 px-2 py-1 rounded-lg text-sm font-bold">
            <Star className="w-4 h-4 fill-current" />
            {place.average_rating ? place.average_rating.toFixed(1) : 'New'}
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 text-slate-500 text-sm mb-4 font-medium">
          <MapPin className="w-4 h-4 text-teal-500" />
          <span>{place.location?.city}, {place.location?.country}</span>
        </div>
        
        <p className="text-slate-600 text-sm line-clamp-2 mb-6 flex-1 leading-relaxed">
          {place.description}
        </p>
        
        <div className="flex flex-wrap gap-2 mt-auto">
          {place.tags?.slice(0, 3).map((tag: string) => (
            <span key={tag} className="px-3 py-1 bg-slate-100/80 text-slate-600 rounded-lg text-xs font-semibold border border-slate-200/50">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
