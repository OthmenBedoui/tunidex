
import { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';

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
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    const response = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: `Sales desc for ${req.body.game} ${req.body.itemType}. Features: ${req.body.keyFeatures}. 100 words max.` 
    });
    res.json({ text: response.text });
  } catch (e) { 
      console.error(e);
      res.json({ text: "Description générée par IA (Simulation): Produit exceptionnel avec livraison rapide." }); 
  }
};
