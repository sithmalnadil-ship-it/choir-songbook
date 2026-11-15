import { describe, it, expect } from 'vitest';
import { transposeSingleChord, getSemitoneDistance, normalizeNote } from './transposer';

describe('Chord Transposition Engine', () => {
  it('normalizes flat notes correctly', () => {
    expect(normalizeNote('Bb')).toBe('A#');
    expect(normalizeNote('Db')).toBe('C#');
    expect(normalizeNote('C')).toBe('C');
  });

  it('calculates semitone distance correctly', () => {
    expect(getSemitoneDistance('C', 'G')).toBe(7);
    expect(getSemitoneDistance('A', 'C')).toBe(3);
    expect(getSemitoneDistance('C', 'C')).toBe(0);
  });

  it('transposes basic major and minor chords', () => {
    expect(transposeSingleChord('C', 2)).toBe('D');
    expect(transposeSingleChord('Am', 2)).toBe('Bm');
    expect(transposeSingleChord('F#m7', 3)).toBe('Am7');
  });

  it('transposes complex slash chords and extensions', () => {
    expect(transposeSingleChord('D/F#', 2)).toBe('E/G#');
    expect(transposeSingleChord('Bbmaj7', 2)).toBe('Cmaj7');
    expect(transposeSingleChord('Dsus4', 5)).toBe('Gsus4');
    expect(transposeSingleChord('Cadd9', 7)).toBe('Gadd9');
  });
});