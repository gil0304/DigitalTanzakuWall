export const WISH_MAX_LENGTH = 40;
export const NAME_MAX_LENGTH = 12;

// 会場に合わせて自由に追加・削除してください(ひらがな・カタカナ・漢字の揺れも登録推奨)
const NG_WORDS = [
  '死ね', 'しね', '殺す', 'ころす', '消えろ', 'きえろ',
  'バカ', 'ばか', '馬鹿', 'アホ', 'あほ',
  'ブス', 'ぶす', 'デブ', 'でぶ',
  'キモい', 'きもい', 'ウザい', 'うざい',
  'クソ', 'くそ',
  'セックス', 'えっち', 'エッチ', 'エロ', 'ちんこ', 'ちんちん', 'まんこ', 'おっぱい',
  'うんこ', 'うんち',
  'fuck', 'shit', 'sex', 'porn',
];

const URL_PATTERN = /https?:\/\/|www\./i;

function normalize(text: string): string {
  return text.normalize('NFKC').toLowerCase();
}

function containsNgWord(text: string): boolean {
  const normalized = normalize(text);
  return NG_WORDS.some((word) => normalized.includes(normalize(word)));
}

/** 改行・連続空白を1つのスペースにまとめる */
export function sanitizeText(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

export type ValidationResult = { ok: true; value: string } | { ok: false; message: string };

export function validateWish(raw: string): ValidationResult {
  const value = sanitizeText(raw);
  if (value.length === 0) {
    return { ok: false, message: '願いごとを入力してください' };
  }
  if ([...value].length > WISH_MAX_LENGTH) {
    return { ok: false, message: `願いごとは${WISH_MAX_LENGTH}文字以内で入力してください` };
  }
  if (URL_PATTERN.test(value)) {
    return { ok: false, message: 'URLは投稿できません' };
  }
  if (containsNgWord(value)) {
    return { ok: false, message: '使用できない言葉が含まれています' };
  }
  return { ok: true, value };
}

export function validateName(raw: string): ValidationResult {
  const value = sanitizeText(raw);
  if ([...value].length > NAME_MAX_LENGTH) {
    return { ok: false, message: `名前は${NAME_MAX_LENGTH}文字以内で入力してください` };
  }
  if (URL_PATTERN.test(value) || containsNgWord(value)) {
    return { ok: false, message: '名前に使用できない言葉が含まれています' };
  }
  return { ok: true, value };
}
