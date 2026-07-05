
import { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import env from '../config/env.js';
import logger from '../logger.js';

/**
 * @swagger
 * tags:
 *   name: AI
 *   description: Artificial Intelligence tools
 */

/**
 * @swagger
 * /api/ai/generate-description:
 *   post:
 *     summary: Generate product description
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               game:
 *                 type: string
 *               itemType:
 *                 type: string
 *               keyFeatures:
 *                 type: string
 *     responses:
 *       200:
 *         description: Generated text
 */
export const generateDescription = async (req: Request, res: Response) => {
  try {
    const ai = new GoogleGenAI({ apiKey: env.apiKey || '' });
    const response = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: `Sales desc for ${req.body.game} ${req.body.itemType}. Features: ${req.body.keyFeatures}. 100 words max.` 
    });
    res.json({ text: response.text });
  } catch (e) { 
      logger.error({ err: e }, 'ai_generate_description_failed');
      res.json({ text: "Description générée par IA (Simulation): Produit exceptionnel avec livraison rapide." }); 
  }
};

export const generateBlogDraft = async (req: Request, res: Response) => {
  try {
    const ai = new GoogleGenAI({ apiKey: env.apiKey || '' });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: [
                'Rédige un brouillon d article de blog en markdown pour un store digital tunisien.',
                `Sujet: ${req.body.topic}.`,
                'Contraintes:',
                '- markdown propre avec H2/H3, listes et conclusion',
                '- style pro, clair, orienté confiance et conversion',
                '- 700 à 1200 mots',
                '- aucune fausse promesse',
                '- ne publie rien automatiquement',
                '- terminer par une courte section "Produits lies" avec 2 a 4 idees generiques'
              ].join('\n')
            }
          ]
        }
      ]
    });

    res.json({
      title: String(req.body.topic || '').trim(),
      excerpt: `Brouillon IA sur: ${String(req.body.topic || '').trim()}`.slice(0, 160),
      content: response.text || `## ${req.body.topic}\n\nBrouillon indisponible.`
    });
  } catch (e) {
    logger.error({ err: e }, 'ai_generate_blog_draft_failed');
    res.json({
      title: String(req.body.topic || '').trim(),
      excerpt: `Brouillon IA sur: ${String(req.body.topic || '').trim()}`.slice(0, 160),
      content: `## ${req.body.topic}\n\n### Introduction\nUn brouillon n'a pas pu etre genere automatiquement. Vous pouvez commencer ici.\n\n### Points cles\n- Benefices du produit\n- Conseils d achat\n- Questions frequentes\n\n### Conclusion\nAjoutez une conclusion et relisez avant publication.`
    });
  }
};
