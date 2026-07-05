import { api } from './api';
import { handleApiError } from '../utils/apiError';

export const generateListingDescription = async (game: string, itemType: string, keyFeatures: string): Promise<string> => {
  try {
    const text = await api.generateDescription(game, itemType, keyFeatures);
    return text || "Description indisponible.";
  } catch (error) {
    handleApiError({
      error,
      fallbackMessage: 'La génération IA a échoué.',
      logContext: 'AI Generation Error'
    });
    return "Erreur lors de la génération. Veuillez écrire manuellement.";
  }
};

export const generateBlogDraft = async (topic: string): Promise<{ title: string; excerpt: string; content: string }> => {
  try {
    return await api.generateBlogDraft(topic);
  } catch (error) {
    handleApiError({
      error,
      fallbackMessage: 'La génération IA du brouillon a échoué.',
      logContext: 'AI Blog Draft Error'
    });
    return {
      title: topic,
      excerpt: `Brouillon IA sur ${topic}`.slice(0, 160),
      content: `## ${topic}\n\nLe brouillon IA n'a pas pu etre genere. Redigez ici votre article avant publication.`
    };
  }
};
