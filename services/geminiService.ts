import { api } from './api';

export const generateListingDescription = async (game: string, itemType: string, keyFeatures: string): Promise<string> => {
  try {
    const text = await api.generateDescription(game, itemType, keyFeatures);
    return text || "Description indisponible.";
  } catch (error) {
    console.error("AI Generation Error:", error);
    return "Erreur lors de la génération. Veuillez écrire manuellement.";
  }
};