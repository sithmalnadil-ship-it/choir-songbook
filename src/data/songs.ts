import { Song } from '../types/song';

const meta = {
  createdAt: '2026-11-05T00:00:00.000Z',
  updatedAt: '2026-11-05T00:00:00.000Z',
  isPublished: true,
};

export const starterSongs: Song[] = [
  {
    id: 'H-01', number: 'H-01', title: 'ජේසුනී ඔබ ඉස්සරවෙලා', titleEnglish: 'Jesuni Oba Issarawela',
    language: 'Sinhala', category: 'HYMNS', originalKey: 'D', ...meta,
    sections: [
      { id: 'chorus', type: 'CHORUS', lines: [
        { chords: 'D               A', text: 'ජේසුනී ඔබ ඉස්සරවෙලා' },
        { chords: 'A               Em', text: 'කුරුසියක් ගෙන ගමන් කළා' },
        { chords: 'A       A7      D', text: 'පසුපසින් එන මා දෙස බලා' },
        { chords: 'D               A', text: 'සිනහසී මා සවිමත් කළා' },
      ] },
      { id: 'verse-1', type: 'VERSE 1', lines: [
        { chords: 'D               A', text: 'වේදනා තුළ සිරවෙන්නෙපා' },
        { chords: 'A       G       D', text: 'කඳුළින් අන්ධව ලතැවෙන්නෙපා' },
        { chords: 'B   Em  G       D', text: 'සුසුමන් මැද මඳ සිනහා පපා' },
        { chords: 'D   Em  A       G', text: 'සැනසෙන්න සනසන්න' },
      ] },
      { id: 'verse-2', type: 'VERSE 2', lines: [
        { chords: 'D               A', text: 'වේදනා සිත පුරවන්නෙපා' },
        { chords: 'A       G       D', text: 'මැසිවිලි මුව මත තවරන්නෙපා' },
        { chords: 'B   Em  G       D', text: 'කොඳුරන සිත මැද සිනහා පපා' },
        { chords: 'D   Em  A       G', text: 'සැනසෙන්න සනසන්න' },
      ] },
    ],
  },
  {
    id: 'H-02', number: 'H-02', title: 'කුරුසියෙදී දිවි පිදුවා', titleEnglish: 'Kurusiyedi Diwi Piduwa',
    language: 'Sinhala', category: 'HYMNS', originalKey: 'G', ...meta,
    sections: [
      { id: 'chorus', type: 'CHORUS', lines: [
        { chords: 'G               D', text: 'කුරුසියෙදී දිවි පිදුවා, මා ගලවන්නට' },
        { chords: 'C               G', text: 'ලේ දහරා ගළා ගියා, මා මුදවන්නට' },
        { chords: 'G               D', text: 'මා ආදරෙයි යේසු' },
      ] },
      { id: 'verse-1', type: 'VERSE 1', lines: [
        { chords: 'G               C', text: 'දෑත් සිදුරු වුණේ මා නිසයි' },
        { chords: 'D               G', text: 'දෙපා සිදුරු වුණේ මා නිසයි' },
        { chords: 'G               C', text: 'මා ගළවා ගත්තා මගෙ යේසු මා ගළවා ගත්තා' },
        { chords: 'D               G', text: 'මා මුදවා ගත්තා මගෙ යේසු මා මුදවා ගත්තා' },
      ] },
      { id: 'verse-2', type: 'VERSE 2', lines: [
        { chords: 'G               C', text: 'සිරස සිදුරු වුණේ මා නිසයි' },
        { chords: 'D               G', text: 'ඇලය සිදුරු වුණේ මා නිසයි' },
        { chords: 'G               C', text: 'මා ගළවා ගත්තා මගෙ යේසු මා ගළවා ගත්තා' },
        { chords: 'D               G', text: 'මා මුදවා ගත්තා මගෙ යේසු මා මුදවා ගත්තා' },
      ] },
    ],
  },  {
    id: 'H-03', number: 'H-03', title: 'රෑයක අඳුර දුරු වෙලා', titleEnglish: 'Rayaka Andura Duru Wela',
    language: 'Sinhala', category: 'HYMNS', originalKey: 'E', ...meta,
    sections: [{ id: 'v1', type: 'VERSE 1', label: 'VERSE 1', lines: [
      { chords: 'E               A         E', text: 'රෑයක අඳුර දුරු වෙලා' },
      { chords: 'B                         E', text: 'තරුවක් අහසේ බැබළෙනවා' },
      { chords: 'E               A         E', text: 'ජේසු උපන්නා බෙත්ලෙහෙමේ' },
      { chords: 'B                         E', text: 'අප හට නිදහස ලැබදෙන්නා' },
    ] }],
  },
  {
    id: 'H-04', number: 'H-04', title: 'ගින්නක් විලසින් මා සිරසේ', titleEnglish: 'Ginnak Wilasin Ma Sirase',
    language: 'Sinhala', category: 'HYMNS', originalKey: 'Dm', ...meta,
    sections: [{ id: 'v1', type: 'VERSE 1', label: 'VERSE 1', lines: [
      { chords: 'Dm              Gm        Dm', text: 'ගින්නක් විලසින් මා සිරසේ' },
      { chords: 'A                         Dm', text: 'වැඩ සිටිනා මගේ ශුද්ධාත්මෙනි' },
      { chords: 'Dm              Gm        Dm', text: 'මාගේ දිවියම පවිත්‍ර කරලා' },
      { chords: 'A                         Dm', text: 'ඔබගේ බලයෙන් පුරවනු මැන' },
    ] }],
  },
];
