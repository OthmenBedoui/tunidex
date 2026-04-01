import React from 'react';
import { Bot, Sparkles, Code, BrainCircuit, Star, Zap } from 'lucide-react';
import { Listing } from '../types';

interface AiToolsProps {
  listings: Listing[];
  onViewProduct: (listing: Listing) => void;
  navigateTo: (page: string) => void;
}

const AiTools: React.FC<AiToolsProps> = ({ listings, onViewProduct }) => {
  // Filter only AI Tools
  const aiListings = listings.filter(l => l.category?.slug === 'ai-tools');

  // Sub-categories for display
  const subCategories = [
    { name: 'Chatbots & Assistants', icon: <Bot className="text-indigo-500" />, desc: 'ChatGPT, Gemini, Claude' },
    { name: 'Génération d\'Images', icon: <Sparkles className="text-purple-500" />, desc: 'Midjourney, DALL-E' },
    { name: 'Outils Développeurs', icon: <Code className="text-green-500" />, desc: 'GitHub Copilot, Tabnine' },
    { name: 'Productivité', icon: <BrainCircuit className="text-orange-500" />, desc: 'Notion AI, Jasper' },
  ];

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      {/* AI Hero Section */}
      <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-2xl relative border border-slate-800">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-30"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/90 to-transparent"></div>
        
        <div className="relative px-8 py-16 md:px-12 md:py-20 text-white max-w-4xl">
          <div className="inline-flex items-center space-x-2 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-6">
            <Sparkles size={14} />
            <span>Futur de la Technologie</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6">
            Intelligence <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">Artificielle</span> & Outils
          </h1>
          <p className="text-lg text-slate-300 mb-8 max-w-2xl leading-relaxed">
            Accédez aux outils les plus puissants du marché à prix réduit. ChatGPT Plus, Midjourney, GitHub Copilot et bien plus pour booster votre productivité.
          </p>
          <div className="flex space-x-4">
            <button 
              onClick={() => document.getElementById('ai-products')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-900/50"
            >
              Voir les Offres
            </button>
          </div>
        </div>
      </div>

      {/* Sub Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {subCategories.map((cat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all flex items-start space-x-4">
            <div className="p-3 bg-slate-50 rounded-xl">
              {cat.icon}
            </div>
            <div>
              <h3 className="font-bold text-slate-900">{cat.name}</h3>
              <p className="text-sm text-slate-500 mt-1">{cat.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Products Grid */}
      <section id="ai-products">
        <div className="flex justify-between items-center mb-8">
           <h2 className="text-2xl font-bold text-slate-900 flex items-center">
             <Bot className="mr-2 text-indigo-600" />
             Catalogue IA & Logiciels
           </h2>
        </div>
        
        {aiListings.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
             <Bot size={48} className="mx-auto text-slate-300 mb-4" />
             <p className="text-slate-500 font-medium">Aucun produit IA disponible pour le moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {aiListings.map((listing) => (
              <div key={listing.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-xl hover:border-indigo-200 transition-all duration-300 flex flex-col h-full group">
                <div className="relative h-56 overflow-hidden bg-slate-100">
                  <img src={listing.imageUrl} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-md text-white text-xs px-3 py-1 rounded-full font-bold flex items-center">
                    <Zap size={12} className="mr-1 text-yellow-400" />
                    Livraison Instantanée
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2 py-1 rounded">{listing.game}</span>
                    <div className="flex items-center space-x-1 text-yellow-400">
                       <Star size={14} fill="currentColor" />
                       <span className="text-xs text-slate-400 font-medium ml-1">5.0</span>
                    </div>
                  </div>
                  
                  <h3 
                    className="font-bold text-slate-900 text-lg mb-3 line-clamp-2 cursor-pointer hover:text-indigo-600 transition-colors"
                    onClick={() => onViewProduct(listing)}
                  >
                    {listing.title}
                  </h3>
                  
                  <p className="text-sm text-slate-500 mb-4 line-clamp-2">{listing.description}</p>
                  
                  <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-2xl font-extrabold text-slate-900">{listing.price.toFixed(2)} TND</span>
                    </div>
                    <button 
                      onClick={() => onViewProduct(listing)}
                      className="bg-slate-900 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-indigo-600 transition-colors shadow-lg shadow-slate-200"
                    >
                      Acheter
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default AiTools;