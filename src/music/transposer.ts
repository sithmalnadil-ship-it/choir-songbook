// Chromatic scales for sharps and flats
const CHROMATIC_SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const CHROMATIC_FLATS  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

/** Returns a sharp spelling for a valid chromatic note. */
export function normalizeNote(note: string): string {
  const index = CHROMATIC_SHARPS.indexOf(note) !== -1 ? CHROMATIC_SHARPS.indexOf(note) : CHROMATIC_FLATS.indexOf(note);
  return index === -1 ? note : CHROMATIC_SHARPS[index];
}

/** Clockwise distance on the chromatic scale, useful for a key change. */
export function getSemitoneDistance(from: string, to: string): number {
  const fromIndex = CHROMATIC_SHARPS.indexOf(normalizeNote(from));
  const toIndex = CHROMATIC_SHARPS.indexOf(normalizeNote(to));
  return fromIndex === -1 || toIndex === -1 ? 0 : (toIndex - fromIndex + 12) % 12;
}

/**
 * Transposes a single chord string (e.g., "G", "Am", "C#/F#", "Fmaj7") by a given semitone offset.
 */
export function transposeSingleChord(chord: string, semitones: number, useFlats = false): string {
  if (!chord || chord.trim() === '') return '';

  // Handle slash chords like C/G or F#/Bb
  if (chord.includes('/')) {
    const parts = chord.split('/');
    return parts.map(part => transposeSingleChord(part, semitones, useFlats)).join('/');
  }

  // Regex to separate root note (e.g., C#, Bb, G) from quality/extensions (e.g., m7, maj7, sus4, add9)
  const regex = /^([A-G][#b]?)(.*)$/;
  const match = chord.match(regex);

  if (!match) return chord; // Return original if not a recognized chord format

  const rootNote = match[1];
  const extension = match[2] || '';

  // Find index in chromatic scale
  let index = CHROMATIC_SHARPS.indexOf(rootNote);
  if (index === -1) {
    index = CHROMATIC_FLATS.indexOf(rootNote);
  }

  if (index === -1) return chord; // Unknown root note

  // Calculate new index wrapping around 12 semitones
  const scale = useFlats ? CHROMATIC_FLATS : CHROMATIC_SHARPS;
  const newIndex = (index + semitones + 12) % 12;

  return scale[newIndex] + extension;
}
