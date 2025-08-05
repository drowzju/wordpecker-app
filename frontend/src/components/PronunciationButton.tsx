import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  IconButton,
  Tooltip,
  Spinner,
  useToast,
  useColorModeValue,
} from '@chakra-ui/react';
import { FaVolumeUp, FaPause } from 'react-icons/fa';
import { apiService } from '../services/api';
import AudioPlayer from './AudioPlayer';

export interface PronunciationButtonProps {
  /** Text to pronounce */
  text: string;
  /** Direct URL for the audio file */
  audioUrl?: string;
  /** Type of content being pronounced */
  type?: 'word' | 'sentence' | 'general';
  /** Language code (e.g., 'en', 'tr', 'es') - if not provided, uses user's target language */
  language?: string;
  /** Additional context for word pronunciation */
  context?: string;
  /** Size of the button */
  size?: 'sm' | 'md' | 'lg';
  /** Show as minimal button only */
  minimal?: boolean;
  /** Custom tooltip text */
  tooltipText?: string;
  /** Playback speed (0.5 - 2.0) */
  speed?: number;
  /** Button variant */
  variant?: 'ghost' | 'outline' | 'solid';
  /** Color scheme */
  colorScheme?: string;
  /** Disable the button */
  disabled?: boolean;
  /** Callback when pronunciation starts */
  onPlay?: () => void;
  /** Callback when pronunciation ends */
  onEnd?: () => void;
  /** Custom icon */
  icon?: React.ReactElement;
}

export const PronunciationButton: React.FC<PronunciationButtonProps> = ({
  text,
  audioUrl: initialAudioUrl,
  type = 'general',
  language, // Will use user's target language if not provided
  context,
  size = 'md',
  minimal = true,
  tooltipText,
  speed = 1.0,
  variant = 'ghost',
  colorScheme = 'blue',
  disabled = false,
  onPlay,
  onEnd,
  icon,
}) => {
  const [audioUrl, setAudioUrl] = useState<string | null>(initialAudioUrl || null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const toast = useToast();
  
  // Theme colors
  const iconColor = useColorModeValue('gray.600', 'gray.400');
  const accentColor = useColorModeValue('blue.500', 'blue.400');

  // Reset audio state when text or initialAudioUrl changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setAudioUrl(initialAudioUrl || null);
    setIsPlaying(false);
    setError(null);
  }, [text, initialAudioUrl]);

  const defaultTooltip = `Listen to pronunciation${type === 'word' ? ` of "${text}"` : ''}${language ? ` in ${language.toUpperCase()}` : ''}`;

  const generateAudio = useCallback(async () => {
    if (!text.trim() || isLoading || disabled) return;

    setIsLoading(true);
    setError(null);

    try {
      let response;
      switch (type) {
        case 'word':
          response = await apiService.generateWordPronunciation(text, language, context);
          break;
        case 'sentence':
          response = await apiService.generateSentencePronunciation(text, language, speed);
          break;
        default:
          response = await apiService.generateAudio(text, language, undefined, speed);
          break;
      }

      if (response.data?.audioUrl) {
        setAudioUrl(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${response.data.audioUrl}`);
      } else {
        throw new Error('No audio URL received');
      }
    } catch (err) {
      console.error('Pronunciation generation error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate pronunciation';
      setError(errorMessage);
      
      toast({
        title: 'Pronunciation Error',
        description: errorMessage,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  }, [text, type, language, context, speed, isLoading, disabled, toast]);

  const handleClick = async () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    if (!audioUrl) {
      await generateAudio();
      return;
    }

    if (audioRef.current) {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
        onPlay?.();
      } catch (err) {
        console.error('Audio play error:', err);
        setError('Failed to play audio');
      }
    }
  };

  const handleAudioEnd = () => {
    setIsPlaying(false);
    onEnd?.();
  };

  const handleAudioError = () => {
    setIsPlaying(false);
    setError('Audio playback failed');
  };

  useEffect(() => {
    if (audioUrl && !isPlaying && audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.load();
    }
}, [audioUrl]);


  // Auto-play audio after generation or URL change
  useEffect(() => {
    if (audioUrl && !isPlaying && audioRef.current) {
      const playAudio = async () => {
        try {
          await audioRef.current.play();
          setIsPlaying(true);
          onPlay?.();
        } catch (err) {
          console.error('Auto-play failed:', err);
        }
      };
      // This logic is tricky. We only want to auto-play if we just generated the audio.
      // A simple way is to check if we were loading just before.
      if(isLoading) {
        setTimeout(playAudio, 100);
      }
    }
  }, [audioUrl, isLoading]); // Simplified dependencies

  if (audioUrl && !minimal) {
    return (
      <AudioPlayer
        audioUrl={audioUrl}
        text={text}
        size={size}
        minimal={false}
        onPlay={() => {
          setIsPlaying(true);
          onPlay?.();
        }}
        onPause={() => {
          setIsPlaying(false);
        }}
        onEnd={handleAudioEnd}
        onError={handleAudioError}
      />
    );
  }

  return (
    <>
      <Tooltip label={tooltipText || defaultTooltip} hasArrow placement="top">
        <IconButton
          aria-label={`Play pronunciation of ${text}`}
          icon={
            isLoading ? (
              <Spinner size="sm" color={accentColor} />
            ) : error ? (
              icon || <FaVolumeUp />
            ) : isPlaying ? (
              <FaPause />
            ) : (
              icon || <FaVolumeUp />
            )
          }
          size={size}
          variant={variant}
          colorScheme={colorScheme}
          color={error ? 'red.500' : iconColor}
          onClick={handleClick}
          isDisabled={disabled || isLoading}
          _hover={{
            bg: useColorModeValue(`${colorScheme}.50`, `${colorScheme}.900`),
            color: accentColor,
            transform: 'scale(1.05)',
          }}
          _active={{
            transform: 'scale(0.95)',
          }}
          transition="all 0.2s"
        />
      </Tooltip>
      <audio
        ref={audioRef}
        src={audioUrl || ''}
        onEnded={handleAudioEnd}
        onError={handleAudioError}
        preload="metadata"
        style={{ display: 'none' }}
      />
    </>
  );
};

export default PronunciationButton;