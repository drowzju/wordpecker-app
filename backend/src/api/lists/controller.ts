import { Request, Response } from 'express';
import { audioService } from '../../services/audioService';

export const generatePronunciationAudio = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { listName } = req.query;
    // This will call the new service method, passing the listName
    audioService.generatePronunciationAudioForList(id, listName as string || `list_${id}`, res);
};