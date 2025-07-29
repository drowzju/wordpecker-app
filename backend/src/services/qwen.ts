import https from 'https';
import { URL } from 'url';
import { environment } from '../config/environment';
import { Readable } from 'stream';

const QWEN_TTS_API_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';

/**
 * Generates speech from text using the Qwen (DashScope) TTS API with native https module.
 * @param text The text to synthesize.
 * @param voice The voice to use for the synthesis. Defaults to 'xiaoyun'.
 * @returns A Promise resolving to a Readable stream containing the MP3 audio data.
 */
export const textToSpeechQwen = (text: string, voice: string = 'xiaoyun'): Promise<Readable> => {
  return new Promise((resolve, reject) => {
    const apiKey = environment.dashscopeApiKey;
    if (!apiKey) {
      return reject(new Error('Qwen (DashScope) API key is not configured in environment variables.'));
    }

    const postData = JSON.stringify({
      model: 'qwen-tts',
      input: {
        text: text,
        voice: voice
      },
      parameters: {
        format: 'mp3',
        rate: 48000,
      },
    });

    const url = new URL(QWEN_TTS_API_URL);

    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        // Using a generic Node.js User-Agent
        'User-Agent': `Node.js/${process.version}`,
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const responseJson = JSON.parse(body);
            if (responseJson.output && responseJson.output.audio && responseJson.output.audio.url) {
              const audioUrl = responseJson.output.audio.url.replace(/^http:/, 'https:');
              // Fetch the audio from the URL
              https.get(audioUrl, (audioRes) => {
                if (audioRes.statusCode === 200) {
                  resolve(audioRes);
                } else {
                  let errorBody = '';
                  audioRes.on('data', (chunk) => (errorBody += chunk));
                  audioRes.on('end', () => {
                    reject(new Error(`Failed to fetch audio from URL: ${audioUrl}. Status: ${audioRes.statusCode}. Body: ${errorBody}`));
                  });
                }
              }).on('error', (e) => {
                reject(new Error(`Error fetching audio from URL: ${e.message}`));
              });
            } else {
              reject(new Error(`Qwen TTS task failed or audio URL not found. Response: ${body}`));
            }
          } catch (e: any) {
            reject(new Error(`Failed to parse Qwen TTS API response: ${e.message}`));
          }
        } else {
          console.error(`Error calling Qwen TTS API. Status: ${res.statusCode}`);
          console.error('Response headers:', res.headers);
          console.error('Error response body:', body);
          reject(new Error(`Qwen TTS API request failed with status ${res.statusCode}. Body: ${body}`));
        }
      });
    });

    req.on('error', (e) => {
      console.error('An unexpected error occurred while calling Qwen TTS API:', e);
      reject(new Error('Failed to generate audio from Qwen TTS service due to a request error.'));
    });

    // Write the request body and end the request.
    req.write(postData);
    req.end();
  });
};