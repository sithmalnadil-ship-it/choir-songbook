export type ChordLineSegment = { chord: string | null; text: string };
export type SongChordLine = { chords: string; text: string };
export type SongLine = SongChordLine | ChordLineSegment[];
export type SongSectionType = 'verse' | 'chorus' | 'bridge' | 'intro' | 'outro' | 'pre-chorus';
export type SongSection = { id: string; type: SongSectionType | string; label?: string; lines: SongLine[] };
export type Song = { id: string; number: string; title: string; titleEnglish?: string; alternateTitle?: string; language: 'English' | 'Sinhala' | 'Tamil' | 'Latin'; category: string; originalKey: string; author?: string; sections: SongSection[]; notes?: string; isPublished: boolean; createdAt: string; updatedAt: string };
export type SetlistItem = { id: string; songId: string; keyOverride?: string };
export type Setlist = { id: string; title: string; date: string; description?: string; items: SetlistItem[]; createdAt: string; updatedAt: string };
export type Preferences = {
  favorites: string[];
  readerFontSize: number;
  useFlats: boolean;
  theme: 'pitch-black' | 'light';
  showChords: boolean;
  autoScroll: boolean;
  autoScrollSpeed: number;
};
