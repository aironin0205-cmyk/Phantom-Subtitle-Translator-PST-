// ===== IMPORTS & DEPENDENCIES =====
import SrtParser from 'srt-parser-2';

// ===== CONFIGURATION & CONSTANTS =====
const parser = new SrtParser();

// ===== TYPES & INTERFACES (JSDoc) =====

/**
 * @typedef {object} SrtLine
 * @property {number} sequence - The sequence number of the subtitle line (e.g., 1).
 * @property {string} startTime - The start timestamp string (e.g., "00:00:20,490").
 * @property {string} endTime - The end timestamp string (e.g., "00:00:22,490").
 * @property {number} duration - The calculated duration of the line in seconds.
 * @property {string} text - The sanitized (HTML-stripped) text of the subtitle.
 */

/**
 * @typedef {SrtLine & {translatedText: string}} TranslatedSrtLine
 * Represents a subtitle line after it has been translated.
 */

// ===== UTILITY FUNCTIONS =====

/**
 * Parses a raw SRT string into a structured array of subtitle lines.
 * Sanitizes the data and calculates the duration for each line.
 * @param {string} srtContent - The full content of an SRT file.
 * @param {import('fastify').FastifyLoggerInstance} [logger=console] - A logger for structured error logging.
 * @returns {SrtLine[]} An array of structured line objects. Returns an empty array on failure.
 */
export function parseSrt(srtContent, logger = console) {
  try {
    const srtArray = parser.fromSrt(srtContent);
    // Map over the library's output to create our own standardized object format.
    return srtArray.map(line => {
        const duration = (line.endTimeSeconds - line.startTimeSeconds);
        return {
            sequence: parseInt(line.id, 10),
            startTime: line.startTime,
            endTime: line.endTime,
            duration: isNaN(duration) ? 0 : duration, // Defensively handle potential NaN
            text: line.text.replace(/<[^>]*>/g, '').trim(), // Strip HTML tags and trim whitespace
        };
    });
  } catch (error) {
    logger.error({ err: error }, "SRT Parsing Error: Failed to parse SRT content. Returning empty array.");
    // Return an empty array on failure to prevent downstream crashes.
    return [];
  }
}

/**
 * Converts an array of translated line objects back into a valid SRT formatted string.
 * @param {TranslatedSrtLine[]} translatedLines - Array of lines with a `translatedText` property.
 * @returns {string} A valid SRT string.
 */
export function toSrtString(translatedLines) {
  // Map our internal format back to the format the library expects.
  const srtArray = translatedLines.map(line => ({
      id: line.sequence.toString(),
      startTime: line.startTime,
      endTime: line.endTime,
      text: line.translatedText, // Use the translated text for the output
  }));
  return parser.toSrt(srtArray);
}

/**
 * Formats a batch of SRT lines into a simple, clean format for an AI prompt.
 * @param {SrtLine[]} batch - An array of parsed SRT line objects.
 * @returns {string} A string where each line is formatted as "sequence | text".
 */
export function toSrtPromptFormat(batch) {
  return batch.map(line => `${line.sequence} | ${line.text}`).join('\n');
}
