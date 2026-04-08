import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Settings, Heart, MapPin, Wallet, Users, Accessibility } from 'lucide-react';
import { useAuth } from '../components/AuthProvider';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export function Profile() {
  const { user } = useAuth();
  const [budget, setBudget] = useState('medium');
  const [groupType, setGroupType] = useState('couple');
  const [accessibility, setAccessibility] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>(['Nature', 'Culture']);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadPreferences() {
      if (!user) return;
      try {
        const docRef = doc(db, 'preferences', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.budget) setBudget(data.budget);
          if (data.groupType) setGroupType(data.groupType);
          if (data.accessibility) setAccessibility(data.accessibility);
          if (data.categories) setCategories(data.categories);
        }
      } catch (error) {
        console.error("Error loading preferences:", error);
      }
    }
    loadPreferences();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("Please sign in to save preferences.");
      return;
    }

    setIsSaving(true);
    try {
      await setDoc(doc(db, 'preferences', user.uid), {
        uid: user.uid,
        budget,
        groupType,
        accessibility,
        categories,
        updatedAt: new Date().toISOString()
      });
      alert('Preferences saved successfully! Your recommendations will now be updated.');
    } catch (error) {
      console.error("Error saving preferences:", error);
      alert("Failed to save preferences.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleArrayItem = (item: string, array: string[], setArray: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (array.includes(item)) {
      setArray(array.filter(i => i !== item));
    } else {
      setArray([...array, item]);
    }
  };

  if (!user) {
    return (
      <div className="p-12 text-center bg-white/50 backdrop-blur-sm rounded-3xl border border-slate-200 text-slate-500">
        Please sign in to view and edit your travel profile.
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-3xl">
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative"
      >
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-teal-400/20 rounded-full blur-3xl -z-10" />
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 flex items-center gap-4">
          Travel Profile
          <div className="p-2 bg-teal-100 rounded-2xl">
            <Settings className="w-6 h-6 text-teal-600" />
          </div>
        </h1>
        <p className="text-slate-500 mt-3 text-lg leading-relaxed">
          Customize your travel vibe. Our AI algorithm uses these settings to curate the perfect destinations and roadmaps for you.
        </p>
      </motion.header>

      <motion.form 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        onSubmit={handleSave}
        className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 space-y-10"
      >
        {/* Budget Section */}
        <section className="space-y-4">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-teal-500" />
            Travel Budget
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {['budget', 'medium', 'luxury'].map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBudget(b)}
                className={`p-4 rounded-2xl border-2 font-bold capitalize transition-all ${
                  budget === b 
                    ? 'border-teal-500 bg-teal-50 text-teal-700' 
                    : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50'
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </section>

        {/* Group Type Section */}
        <section className="space-y-4">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-500" />
            Who are you traveling with?
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {['solo', 'couple', 'family', 'friends'].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGroupType(g)}
                className={`p-4 rounded-2xl border-2 font-bold capitalize transition-all ${
                  groupType === g 
                    ? 'border-teal-500 bg-teal-50 text-teal-700' 
                    : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </section>

        {/* Favorite Categories */}
        <section className="space-y-4">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Heart className="w-5 h-5 text-teal-500" />
            Favorite Categories
          </h3>
          <div className="flex flex-wrap gap-3">
            {['Nature', 'Culture', 'History', 'Landmark', 'Food', 'Adventure', 'Relaxation'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => toggleArrayItem(cat, categories, setCategories)}
                className={`px-5 py-2.5 rounded-xl border-2 font-bold transition-all ${
                  categories.includes(cat)
                    ? 'border-teal-500 bg-teal-500 text-white' 
                    : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        {/* Accessibility Needs */}
        <section className="space-y-4">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Accessibility className="w-5 h-5 text-teal-500" />
            Accessibility Needs
          </h3>
          <div className="flex flex-wrap gap-3">
            {['Wheelchair Accessible', 'Elevator', 'Visual Aids', 'Hearing Aids', 'Quiet Spaces'].map((acc) => (
              <button
                key={acc}
                type="button"
                onClick={() => toggleArrayItem(acc, accessibility, setAccessibility)}
                className={`px-5 py-2.5 rounded-xl border-2 font-bold transition-all ${
                  accessibility.includes(acc)
                    ? 'border-teal-500 bg-teal-50 text-teal-700' 
                    : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50'
                }`}
              >
                {acc}
              </button>
            ))}
          </div>
        </section>

        <div className="pt-6 border-t border-slate-100">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isSaving}
            className="w-full py-4 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-bold rounded-2xl transition-colors shadow-md hover:shadow-lg text-lg"
          >
            {isSaving ? 'Saving...' : 'Save Preferences'}
          </motion.button>
        </div>
      </motion.form>
    </div>
  );
}
