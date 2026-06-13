/* 7-segment patterns — bit order A B C D E F G DP, HIGH=ON (Common Cathode)
   Source: 강의 슬라이드 p.48 숫자표 + 교수 출제예고 문자표 (§14) */
window.SEG_ORDER = ["a","b","c","d","e","f","g","dp"];
window.SEG_PATTERNS = [
  // digits
  { ch:"0", segs:"abcdef",   hex:"0xFC" },
  { ch:"1", segs:"bc",       hex:"0x60" },
  { ch:"2", segs:"abdeg",    hex:"0xDA" },
  { ch:"3", segs:"abcdg",    hex:"0xF2" },
  { ch:"4", segs:"bcfg",     hex:"0x66" },
  { ch:"5", segs:"acdfg",    hex:"0xB6" },
  { ch:"6", segs:"acdefg",   hex:"0xBE" },
  { ch:"7", segs:"abc",      hex:"0xE0" },
  { ch:"8", segs:"abcdefg",  hex:"0xFE" },
  { ch:"9", segs:"abcdfg",   hex:"0xF6" },
  // letters (교수님 출제 예고: A, b, C, d, E, F)
  { ch:"A", segs:"abcefg",   hex:"0xEE" },
  { ch:"b", segs:"cdefg",    hex:"0x3E" },
  { ch:"C", segs:"adef",     hex:"0x9C" },
  { ch:"d", segs:"bcdeg",    hex:"0x7A" },
  { ch:"E", segs:"adefg",    hex:"0x9E" },
  { ch:"F", segs:"aefg",     hex:"0x8E" },
];
// quick lookup by char
window.SEG_BY_CHAR = window.SEG_PATTERNS.reduce(function(m,p){m[p.ch]=p;return m;},{});
