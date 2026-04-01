import prisma from '../prisma.js';
import bcrypt from 'bcryptjs';

export const seedDatabase = async () => {
  try {
    const hashedPwd = await bcrypt.hash("123456", 10);

    // 1. Users (Admin & Agent)
    const userEmail = "johnson67377@gmail.com";
    if (!await prisma.user.findUnique({ where: { email: userEmail } })) {
        console.log(`🛠️ Création Admin (${userEmail})...`);
        await prisma.user.create({ data: { email: userEmail, username: "UserAdmin", password: hashedPwd, role: "ADMIN", subscriptionTier: "Elite", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=User" }});
    }
    if (!await prisma.user.findUnique({ where: { email: "admin@tunidex.tn" } })) {
        console.log("🛠️ Création Admin...");
        await prisma.user.create({ data: { email: "admin@tunidex.tn", username: "SuperAdmin", password: hashedPwd, role: "ADMIN", subscriptionTier: "Elite", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" }});
    }
    if (!await prisma.user.findUnique({ where: { email: "agent@tunidex.tn" } })) {
        console.log("🛠️ Création Agent...");
        await prisma.user.create({ data: { email: "agent@tunidex.tn", username: "SupportAgent", password: hashedPwd, role: "AGENT", subscriptionTier: "Pro", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Agent" }});
    }

    // 2. Categories & SubCategories
    if (await prisma.category.count() === 0) {
        console.log("📦 Création Catégories & Sous-catégories...");
        const categoriesData = [
            { name: 'Monnaie Jeu', slug: 'game-coins', icon: 'Coins', gradient: 'bg-gradient-to-r from-yellow-500 to-amber-600', imageUrl: 'https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?auto=format&fit=crop&q=80', description: 'Gold, Credits, Coins & Tokens' },
            { name: 'Comptes', slug: 'accounts', icon: 'User', gradient: 'bg-gradient-to-r from-blue-600 to-indigo-700', imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80', description: 'Comptes Haut Niveau & Smurfs' },
            { name: 'Software & Apps', slug: 'software', icon: 'MonitorPlay', gradient: 'bg-gradient-to-r from-cyan-600 to-blue-700', imageUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80', description: 'Windows, Office, Adobe, VPNs' },
            { name: 'IA & Tools', slug: 'ai-tools', icon: 'Bot', gradient: 'bg-gradient-to-r from-violet-600 to-purple-700', imageUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80', description: 'ChatGPT, Gemini, Midjourney' },
            { name: 'Streaming', slug: 'streaming', icon: 'PlayCircle', gradient: 'bg-gradient-to-r from-red-600 to-rose-700', imageUrl: 'https://images.unsplash.com/photo-1522869635100-1f4d0684d91f?auto=format&fit=crop&q=80', description: 'Netflix, Spotify, IPTV' }
        ];
        
        for (const cat of categoriesData) { await prisma.category.create({ data: cat }); }
        
        // --- SEEDING SUB-CATEGORIES ---
        
        // 1. Software
        const softCat = await prisma.category.findUnique({ where: { slug: 'software' } });
        if(softCat) {
            await prisma.subCategory.createMany({ 
                data: [
                    {name:'Comptes & Sécurité', slug:'comptes', categoryId:softCat.id, icon: 'Shield', description: 'VPN, Antivirus et Comptes sécurisés', order: 1}, 
                    {name:'Licences Officielles', slug:'licences', categoryId:softCat.id, icon: 'Key', description: 'Clés Windows, Office, IDM', order: 2}, 
                    {name:'Boost Réseaux Sociaux', slug:'platforme', categoryId:softCat.id, icon: 'Globe', description: 'Followers, Likes, Vues', order: 3}
                ] 
            });
        }

        // 2. AI & Tools
        const aiCat = await prisma.category.findUnique({ where: { slug: 'ai-tools' } });
        if(aiCat) {
            await prisma.subCategory.createMany({ 
                data: [
                    {name:'Chatbots & Assistants', slug:'chatbots', categoryId:aiCat.id, icon: 'Bot', description: 'ChatGPT Plus, Gemini Advanced, Claude', order: 1}, 
                    {name:'Génération d\'Images', slug:'image-gen', categoryId:aiCat.id, icon: 'Sparkles', description: 'Midjourney, DALL-E, Leonardo AI', order: 2}, 
                    {name:'Outils Développeurs', slug:'dev-tools', categoryId:aiCat.id, icon: 'Code', description: 'GitHub Copilot, JetBrains AI', order: 3}, 
                    {name:'Productivité', slug:'productivity', categoryId:aiCat.id, icon: 'BrainCircuit', description: 'Notion AI, Jasper, Copy.ai', order: 4}
                ] 
            });
        }
    }

    // 3. Listings (Produits) - Removed for clean state
    console.log("🚀 Catalogue prêt pour nouveaux produits.");

    // 4. Analytics - Removed for clean state
    console.log('✅ Base de données prête !');
  } catch (e) { console.error("❌ Erreur seeding:", e); }
};
