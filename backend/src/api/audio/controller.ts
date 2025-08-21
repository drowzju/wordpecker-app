import { Request, Response } from 'express';
import { audioService } from '../../services/audioService';
import fs from 'fs';

export const combineAudio = async (req: Request, res: Response) => {
  try {
    const { urls } = req.body;
    if (!urls || !Array.isArray(urls)) {
      return res.status(400).json({ message: 'An array of audio URLs is required.' });
    }
    const filePath = await audioService.generateCombinedAudioFromUrls(urls);
    
    res.setHeader('Content-Type', 'audio/mpeg');
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        if (!res.headersSent) {
          res.status(500).send('Error sending file');
        }
      }
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) console.error('Error deleting temp audio file:', unlinkErr);
      });
    });
  } catch (error: any) {
    console.error('Failed to generate combined audio:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: error.message || 'Failed to generate combined audio.' });
    }
  }
};