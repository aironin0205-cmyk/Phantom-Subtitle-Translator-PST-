import SrtParser from 'srt-parser-2';

const parser = new SrtParser();

/**
 * Parses a raw SRT string into a structured array of subtitle lines.
 * @param {string} srtContent The full content of an SRT file.
 * @returns {Array<object>} An array of structured line objects.
 */
export function parseSrt(srtContent) {
  try {
    const srtArray = parser.fromSrt(srtContent);
    // We map over the library's output to create our own standardized object format.
    return srtArray.map(line => {
        const duration = (line.endTimeSeconds - line.startTimeSeconds);
        return {
            sequence: parseInt(line.id, 10),
            startTime: line.startTime,
            endTime: line.endTime,
            duration: isNaN(duration) ? 0 : duration, // Handle potential NaN
            text: line.text.replace(/<[^>]*>/g, '').trim(), // Strip HTML tags
        };
    });
  } catch (error) {
    console.error("SRT Parsing Error:", error);
    return []; // Return an empty array on failure to prevent crashes.
  }
}

/**
 * Converts an array of translated line objects back into a valid SRT formatted string.
 * @param {Array<object>} translatedLines Array of lines with a `translatedText` property.
 * @returns {string} A valid SRT string.
 */
export function toSrtString(translatedLines) {
  const srtArray = translatedLines.map(line => ({
      id: line.sequence.toString(),
      startTime: line.startTime,
      endTime: line.endTime,
      text: line.translatedText,
  }));
  return parser.toSrt(srtArray);
}

/**
 * Formats a batch of SRT lines into a simple, clean format for the AI prompt.
 * @param {Array<object>} batch An array of parsed SRT line objects.
 * @returns {string} A string where each line is prefixed with its sequence number.
 */
export function toSrtPromptFormat(batch) {
  return batch.map(line => `${line.sequence} | ${line.text}`).join('\n');
}
