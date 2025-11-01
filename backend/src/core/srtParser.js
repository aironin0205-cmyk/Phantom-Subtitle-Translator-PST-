// ===== PRODUCTION-READY SRT PARSER UTILITY =====
// This module contains pure, reusable functions for handling SRT subtitle format.

// ===== IMPORTS & DEPENDENCIES =====
import SrtParser from 'srt-parser-2';

// ===== CONFIGURATION & CONSTANTS =====
const parser = new SrtParser();

// ===== CUSTOM ERROR =====
/**
 * Custom error for failures during SRT parsing.
 */
class SrtParsingError extends Error {
  constructor(message, originalError) {
    super(message);
    this.name = 'SrtParsingError';
    this.cause = originalError;
  }
}

// ===== TYPES & INTERFACES (JSDoc) =====

/**
 * Represents a standardized, parsed subtitle line.
 * @typedef {object} SrtLine
 * @property {number} sequence - The sequence number of the subtitle line (e.g., 1).
 * @property {string} startTime - The start timestamp string (e.g., "00:00:20,490").
 * @property {string} endTime - The end timestamp string (e.g., "00:00:22,490").
 * @property {number} duration - The calculated duration of the line in seconds.
 * @property {string} text - The sanitized (HTML-stripped) text of the subtitle.
 */

// ===== UTILITY FUNCTIONS =====

/**
 * Parses a raw SRT string into a structured array of subtitle lines.
 * It sanitizes the data, strips HTML, and calculates the duration for each line.
 * @param {string} srtContent - The full content of an SRT file.
 * @returns {SrtLine[]} An array of structured line objects.
 * @throws {SrtParsingError} If the SRT content is malformed and cannot be parsed.
 */
export function parseSrt(srtContent) {
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
    // Instead of logging and returning [], we throw a specific error.
    // This gives the calling service (Orchestrator) control over how to handle the failure.
    throw new SrtParsingError('Failed to parse SRT content.', error);
  }
}

/**
 * Converts an array of SrtLine objects back into a valid SRT formatted string.
 * @param {SrtLine[]} srtLines - An array of SrtLine objects.
 * @returns {string} A valid SRT string.
 */
export function toSrtString(srtLines) {
  // Map our internal format back to the format the library expects.
  const srtArrayForLibrary = srtLines.map(line => ({
      id: line.sequence.toString(),
      startTime: line.startTime,
      endTime: line.endTime,
      text: line.text, // This function is now generic and uses the standard 'text' property.
  }));
  return parser.toSrt(srtArrayForLibrary);
}

/**
 * Formats a batch of SrtLine objects into a simple, clean format for an AI prompt.
 * @param {SrtLine[]} batch - An array of parsed SRT line objects.
 * @returns {string} A string where each line is formatted as "sequence | text".
 */
export function toSrtPromptFormat(batch) {
  return batch.map(line => `${line.sequence} | ${line.text}`).join('\n');
}
