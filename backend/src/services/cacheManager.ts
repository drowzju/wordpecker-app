import fs from 'fs';
import path from 'path';
import cron from 'node-cron';

const CACHE_DIR = path.join(process.cwd(), 'audio-cache');
const MAX_AGE_DAYS = 7; // 7 days

/**
 * Deletes cached audio files older than MAX_AGE_DAYS.
 */
const cleanupOldCacheFiles = async () => {
  console.log('Running scheduled cache cleanup...');
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      console.log('Cache directory does not exist. Nothing to clean.');
      return;
    }

    const files = await fs.promises.readdir(CACHE_DIR);
    const now = Date.now();
    const maxAgeMs = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
    let deletedCount = 0;

    for (const file of files) {
      const filePath = path.join(CACHE_DIR, file);
      try {
        const stats = await fs.promises.stat(filePath);
        const fileAgeMs = now - stats.mtime.getTime();

        if (fileAgeMs > maxAgeMs) {
          await fs.promises.unlink(filePath);
          console.log(`Deleted old cache file: ${file}`);
          deletedCount++;
        }
      } catch (err) {
        console.error(`Error processing file ${file}:`, err);
      }
    }

    console.log(`Cache cleanup finished. Deleted ${deletedCount} files.`);
  } catch (error) {
    console.error('An error occurred during cache cleanup:', error);
  }
};

/**
 * Starts the cron job to clean up the cache directory periodically.
 * The job runs at 11:00 and 19:00 every day.
 */
export const startCacheCleanupJob = () => {
  // Cron schedule: at minute 0 past hour 11 and 19 every day.
  cron.schedule('0 11,19 * * *', cleanupOldCacheFiles, {
    scheduled: true,
    timezone: 'Asia/Shanghai', // You can adjust the timezone if needed
  });

  console.log('Cache cleanup job scheduled to run at 11:00 and 19:00 daily.');
  
  // Optional: run once on startup as well.
  cleanupOldCacheFiles();
};
