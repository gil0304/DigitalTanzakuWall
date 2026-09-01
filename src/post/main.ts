import './post.css';
import { createBackend } from '../backend';
import { validateName, validateWish } from '../moderation';
import { randomColor, TANZAKU_COLORS, type TanzakuColor } from '../types';

// 連投防止(同一端末からの投稿間隔)
const POST_INTERVAL_MS = 20_000;
const LAST_POST_KEY = 'tanzaku-last-post-at';

const backend = createBackend();

function $<T extends HTMLElement>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`element not found: ${selector}`);
  return el;
}

const form = $<HTMLFormElement>('#wish-form');
const wishInput = $<HTMLTextAreaElement>('#wish');
const wishCount = $<HTMLSpanElement>('#wish-count');
const nameInput = $<HTMLInputElement>('#name');
const anonymousInput = $<HTMLInputElement>('#anonymous');
const errorEl = $<HTMLParagraphElement>('#form-error');
const submitBtn = $<HTMLButtonElement>('#submit-btn');
const donePanel = $<HTMLElement>('#done-panel');
const doneTanzaku = $<HTMLDivElement>('#done-tanzaku');
const doneWish = $<HTMLSpanElement>('#done-wish');
const againBtn = $<HTMLButtonElement>('#again-btn');
const modeNote = $<HTMLParagraphElement>('#mode-note');

if (backend.mode === 'local') {
  modeNote.hidden = false;
}

// 文字数カウンター
function updateCounter(): void {
  const len = [...wishInput.value].length;
  wishCount.textContent = String(len);
  wishCount.parentElement?.classList.toggle('is-full', len >= 40);
}
wishInput.addEventListener('input', updateCounter);

// 改行は入力させない(仕様: 改行不可)
wishInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') e.preventDefault();
});
wishInput.addEventListener('paste', () => {
  requestAnimationFrame(() => {
    wishInput.value = wishInput.value.replace(/[\r\n]+/g, ' ');
    updateCounter();
  });
});

// 匿名ONのときは名前入力を無効化
anonymousInput.addEventListener('change', () => {
  nameInput.disabled = anonymousInput.checked;
});

function showError(message: string): void {
  errorEl.textContent = message;
  errorEl.hidden = false;
}

function clearError(): void {
  errorEl.hidden = true;
}

function selectedColor(): TanzakuColor {
  const checked = form.querySelector<HTMLInputElement>('input[name="color"]:checked');
  const value = checked?.value ?? 'random';
  return value === 'random' ? randomColor() : (value as TanzakuColor);
}

function secondsUntilNextPost(): number {
  const last = Number(localStorage.getItem(LAST_POST_KEY) ?? 0);
  const elapsed = Date.now() - last;
  return elapsed >= POST_INTERVAL_MS ? 0 : Math.ceil((POST_INTERVAL_MS - elapsed) / 1000);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();

  const wish = validateWish(wishInput.value);
  if (!wish.ok) {
    showError(wish.message);
    return;
  }

  const isAnonymous = anonymousInput.checked;
  const name = validateName(isAnonymous ? '' : nameInput.value);
  if (!name.ok) {
    showError(name.message);
    return;
  }

  const wait = secondsUntilNextPost();
  if (wait > 0) {
    showError(`続けての投稿はできません。あと ${wait} 秒お待ちください。`);
    return;
  }

  const color = selectedColor();
  submitBtn.disabled = true;
  submitBtn.textContent = '飾っています…';

  try {
    await backend.submitPost({
      wishText: wish.value,
      displayName: name.value,
      isAnonymous,
      color,
    });
    localStorage.setItem(LAST_POST_KEY, String(Date.now()));
    showDone(wish.value, color);
  } catch (err) {
    console.error(err);
    showError('投稿に失敗しました。通信環境を確認して、もう一度お試しください。');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = '短冊を飾る';
  }
});

function showDone(wishText: string, color: TanzakuColor): void {
  doneTanzaku.classList.remove(...TANZAKU_COLORS.map((c) => `tz-${c}`));
  doneTanzaku.classList.add(`tz-${color}`);
  doneWish.textContent = wishText;
  form.hidden = true;
  donePanel.hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

againBtn.addEventListener('click', () => {
  wishInput.value = '';
  updateCounter();
  clearError();
  donePanel.hidden = true;
  form.hidden = false;
  wishInput.focus();
});
