import { Request, Response } from 'express';
import { audioService } from '../../services/audioService';

export const generatePronunciationAudio = async (req: Request, res: Response) => {
    const { id } = req.params;
    // This will call the new service method
    audioService.generatePronunciationAudioForList(id, res);
};