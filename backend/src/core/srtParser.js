// ===== DEVELOPMENT/DEBUG SRT PARSER UTILITY =====
// This module contains pure, reusable functions for handling the SRT subtitle format.
// Refinements focus on robust input validation and integration with our application's error system.

// ===== IMPORTS & DEPENDENCIES =====
import SrtParser from 'srt-parser-2';
import { BadRequestError } from '../utils/errors.js'; // Import our standard API error

// ===== CONFIGURATION & CONSTANTS =====
const parser = new SrtParser();

// ===== CUSTOM ERROR =====
/**
 * Custom error for failures during SRT parsing.
 * By extending BadRequestError, any time this error is thrown and not caught,
 * our global error handler in app.js will automatically respond with a 400 HTTP status.
 */
class SrtParsingError extends BadRequestError {
  constructor(message, originalError) {
    super(message); // Pass the user-friendly message to the parent
    this.name = 'SrtParsingError';
    this.cause = originalError; // Retain the original error for logging purposes
  }
}

// ===== TYPES & INTERFACES (JSDoc) =====

/**
 * Represents a standardized, parsed subtitle line. This is our internal representation.
 * @typedef {object} SrtLine
 * @property {number} sequence - The sequence number of the subtitle line (e.g., 1).
 * @property {string} startTime - The start timestamp string in SRT format (e.g., "00:00:20,490").
 * @property {string} endTime - The end timestamp string in SRT format (e.g., "00:00:22,490").
 * @property {number} duration - The calculated duration of the line in seconds.
 * @property {string} text - The sanitized (HTML-stripped and trimmed) text of the subtitle.
 */

// ===== PRIVATE HELPER FUNCTIONS =====

/**
 * Maps a line object from the srt-parser-2 library to our internal SrtLine format.
 * This centralizes the transformation logic.
 * @private
 * @param {object} libLine - The line object from the srt-parser-2 library.
 * @returns {SrtLine} Our standardized SrtLine object.
 */
function _mapToSrtLine(libLine) {
  const duration = libLine.endTimeSeconds - libLine.startTimeSeconds;
  return {
    sequence: parseInt(libLine.id, 10),
    startTime: libLine.startTime,
    endTime: libLine.endTime,
    duration: isNaN(duration) ? 0 : parseFloat(duration.toFixed(3)),
    text: libLine.text.replace(/<[^>]*>/g, '').trim(),
  };
}

/**
 * Maps our internal SrtLine object back to the format expected by the srt-parser-2 library.
 * @private
 * @param {SrtLine} srtLine - Our standardized SrtLine object.
 * @returns {object} The line object for the srt-parser-2 library.
 */
function _mapFromSrtLine(srtLine) {
  return {
    id: srtLine.sequence.toString(),
    startTime: srtLine.startTime,
    endTime: srtLine.endTime,
    text: srtLine.text,
  };
}

// ===== PUBLIC API FUNCTIONS =====

/**
 * Parses a raw SRT string into a structured array of subtitle lines.
 * It sanitizes the data, strips HTML, and calculates the duration for each line.
 * @param {string} srtContent - The full content of an SRT file.
 * @returns {SrtLine[]} An array of structured SrtLine objects.
 * @throws {BadRequestError} If the SRT content is not a string or is empty.
 * @throws {SrtParsingError} If the SRT content is malformed and cannot be parsed.
 */
export function parseSrt(srtContent) {
  // Guard Clause: Validate input to fail fast with a clear, user-friendly error.
  if (typeof srtContent !== 'string' || !srtContent.trim()) {
    throw new BadRequestError('SRT content must be a non-empty string.');
  }

  try {
    const srtArray = parser.fromSrt(srtContent);
    // Use the private mapping helper for cleaner, more declarative code.
    return srtArray.map(_mapToSrtLine);
  } catch (error) {
    // Wrap the library's generic error in our specific, actionable error type.
    throw new SrtParsingError('Failed to parse malformed SRT content.', error);
  }
}

/**
 * Converts an array of SrtLine objects back into a valid SRT formatted string.
 * @param {SrtLine[]} srtLines - An array of SrtLine objects.
 * @returns {string} A valid SRT string.
 */
export function toSrtString(srtLines) {
  // Guard Clause: Ensure we're working with an array.
  if (!Array.isArray(srtLines)) {
    // This would likely be a programmer error, but it's good to be defensive.
    return '';
  }
  const srtArrayForLibrary = srtLines.map(_mapFromSrtLine);
  return parser.toSrt(srtArrayForLibrary);
}

/**
 * Formats a batch of SrtLine objects into a simple, clean format for an AI prompt.
 * @param {SrtLine[]} batch - An array of parsed SRT line objects.
 * @returns {string} A string where each line is formatted as "sequence | text".
 */
export function toSrtPromptFormat(batch) {
  if (!Array.isArray(batch)) {
    return '';
  }
  return batch.map(line => `${line.sequence} | ${line.text}`).join('\n');
}
