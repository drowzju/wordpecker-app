import { Router } from 'express';
import { getLanguageValidation } from '../../agents';
import { LanguageValidationResultType } from '../../agents/language-validation-agent/schemas';

const router = Router();

router.post('/validate', async (req, res) => {
  try {
    const { language } = req.body;

    if (!language || typeof language !== 'string') {
      return res.status(400).json({ 
        error: 'Language name is required and must be a string' 
      });
    }

    const validationResult = await getLanguageValidation(language.trim());

    res.json(validationResult);
  } catch (error) {
    console.error('Error validating language:', error);
    res.status(500).json({ 
      error: 'Failed to validate language' 
    });
  }
});

export default router;