import { useEffect, useMemo, useRef, useState } from 'react';
import TypingKeyboard from './TypingKeyboard';
import styles from './TypingPractice.module.css';
import {
  FINGER_INFO,
  JAMO_TO_KEY_META,
  SHORT_SENTENCE_SETS,
  TYPING_STAGES,
  composeHangul,
  decomposeHangul,
  getCumulativeStageKeys,
  getJamoFromKeyEvent,
  getWordRequiredStageIndex,
  shuffleArray,
} from '@/data/typingData';

const STORAGE_KEY = 'study-lab-typing-v2';
const SEAT_LENGTH = 24;
const WORD_SESSION_COUNT = 12;

const DEFAULT_PROGRESS = {
  bestCpm: 0,
  totalSessions: 0,
  accuracySum: 0,
  completedStages: [],
  bestRainScore: 0,
  weakKeys: {},
  customWords: [],
};

function buildSeatSequence(stageIndex, seed) {
  const stage = TYPING_STAGES[stageIndex] ?? TYPING_STAGES[0];
  let pool = [...stage.keys];

  // For short key sets like Stage 2 (ㅎ, ㅅ, ㅔ), blend a few home-row anchor keys so fingers return naturally
  if (stage.keys.length <= 4) {
    pool = [...stage.keys, ...stage.keys, ...stage.keys, 'ㄹ', 'ㅓ', 'ㅏ', 'ㄴ'];
  }

  const chars = Array.from({ length: SEAT_LENGTH }, (_, idx) => pool[idx % pool.length]);
  return shuffleArray(chars, seed);
}

function buildWordSession(stageIndex, scope, customWords, seed) {
  const stage = TYPING_STAGES[stageIndex] ?? TYPING_STAGES[0];
  let baseList = [];

  if (scope === 'custom') {
    const stageCustom = customWords.filter((item) => item.stageIndex <= stageIndex).map((item) => item.word);
    baseList = stageCustom.length > 0 ? stageCustom : customWords.map((item) => item.word);
  } else if (scope === 'cumulative') {
    const cumulativeBuiltIn = TYPING_STAGES.slice(0, stageIndex + 1).flatMap((item) => item.words);
    const stageCustom = customWords.filter((item) => item.stageIndex <= stageIndex).map((item) => item.word);
    baseList = [...stageCustom, ...cumulativeBuiltIn];
  } else {
    const exactCustom = customWords.filter((item) => item.stageIndex === stageIndex).map((item) => item.word);
    baseList = [...exactCustom, ...stage.words];
  }

  const unique = Array.from(new Set(baseList)).filter((word) => decomposeHangul(word).length > 0);
  if (unique.length === 0) {
    return [];
  }

  const shuffled = shuffleArray(unique, seed);
  return shuffled.slice(0, Math.min(WORD_SESSION_COUNT, shuffled.length));
}

function calcCpm(strokeCount, startedAt, nowMs) {
  if (!startedAt || strokeCount <= 0) return 0;
  const elapsedSec = Math.max(0.5, (nowMs - startedAt) / 1000);
  return Math.round((strokeCount / elapsedSec) * 60);
}

function ModeIcon({ type }) {
  if (type === 'seat') {
    return (
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="5" width="20" height="14" rx="3" />
        <path d="M6 9h2M11 9h2M16 9h2M6 13h2M11 13h2M16 13h2M8 16h8" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === 'word') {
    return (
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 6h16M4 12h10M4 18h7" strokeLinecap="round" />
        <circle cx="17.5" cy="15.5" r="3.5" />
        <path d="M17.5 14v3M16 15.5h3" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === 'sentence') {
    return (
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M5 4h11l3 3v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
        <path d="M8 10h8M8 14h8M8 18h5" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 16.5A4.5 4.5 0 0 1 6.2 7.6 5.5 5.5 0 0 1 17 8.5h.5a3.5 3.5 0 0 1 .5 7" strokeLinecap="round" />
      <path d="M8 19l-1 2M12 18l-1 3M16 19l-1 2" strokeLinecap="round" />
    </svg>
  );
}

export default function TypingPractice() {
  const [mode, setMode] = useState('lobby'); // 'lobby' | 'seat' | 'word' | 'sentence' | 'rain'
  const [stageIndex, setStageIndex] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [progress, setProgress] = useState(DEFAULT_PROGRESS);
  const [pressedFeedback, setPressedFeedback] = useState(null);
  const [captureFocused, setCaptureFocused] = useState(false);

  // Mode 1: Seat practice state
  const [seatSequence, setSeatSequence] = useState(() => buildSeatSequence(0, 101));
  const [seatIndex, setSeatIndex] = useState(0);
  const [seatMistakes, setSeatMistakes] = useState(0);
  const [seatWrongFlag, setSeatWrongFlag] = useState(false);
  const [seatStartedAt, setSeatStartedAt] = useState(null);
  const [seatFinishedAt, setSeatFinishedAt] = useState(null);
  const [seatLastTick, setSeatLastTick] = useState(0);

  // Mode 2: Word-by-stage practice state
  const [wordScope, setWordScope] = useState('stage'); // 'stage' | 'cumulative' | 'custom'
  const [wordList, setWordList] = useState(() => buildWordSession(0, 'stage', [], 202));
  const [wordIndex, setWordIndex] = useState(0);
  const [typedWordJamos, setTypedWordJamos] = useState([]);
  const [wordCompletedStrokes, setWordCompletedStrokes] = useState(0);
  const [wordMistakes, setWordMistakes] = useState(0);
  const [wordWrongFlag, setWordWrongFlag] = useState(false);
  const [wordStartedAt, setWordStartedAt] = useState(null);
  const [wordFinishedAt, setWordFinishedAt] = useState(null);
  const [wordLastTick, setWordLastTick] = useState(0);
  const [customWordDraft, setCustomWordDraft] = useState('');
  const [customWordNotice, setCustomWordNotice] = useState('');

  // Mode 3: Short sentence practice state
  const [sentenceSetId, setSentenceSetId] = useState(SHORT_SENTENCE_SETS[0].id);
  const [sentenceIdx, setSentenceIdx] = useState(0);
  const [sentenceInput, setSentenceInput] = useState('');
  const [sentenceStartedAt, setSentenceStartedAt] = useState(null);
  const [sentenceFinishedAt, setSentenceFinishedAt] = useState(null);
  const [sentenceLastTick, setSentenceLastTick] = useState(0);
  const [sentenceTotalChars, setSentenceTotalChars] = useState(0);
  const [sentenceCorrectChars, setSentenceCorrectChars] = useState(0);
  const [sentenceTotalStrokes, setSentenceTotalStrokes] = useState(0);

  // Mode 4: Acid Rain game state
  const [rainStageFilter, setRainStageFilter] = useState('all'); // 'all' | 0..4
  const [rainRunning, setRainRunning] = useState(false);
  const [rainGameOver, setRainGameOver] = useState(false);
  const [rainDrops, setRainDrops] = useState([]);
  const [rainInput, setRainInput] = useState('');
  const [rainScore, setRainScore] = useState(0);
  const [rainLives, setRainLives] = useState(5);
  const [rainCombo, setRainCombo] = useState(0);
  const [rainCleared, setRainCleared] = useState(0);

  const captureInputRef = useRef(null);
  const sentenceInputRef = useRef(null);
  const rainInputRef = useRef(null);
  const audioRef = useRef(null);
  const feedbackTimerRef = useRef(null);
  const rainIdRef = useRef(1);
  const rainLastSpawnRef = useRef(0);
  const rainScoreRef = useRef(0);
  const rainClearedRef = useRef(0);

  // Load persisted records on client only (hydration safe)
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setProgress({ ...DEFAULT_PROGRESS, ...parsed });
      }
    } catch {
      // Ignore storage read errors
    }
  }, []);

  function saveProgress(updater) {
    setProgress((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage write errors
      }
      return next;
    });
  }

  function playTone(kind) {
    if (!soundEnabled || typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = audioRef.current ?? new AudioCtx();
    audioRef.current = ctx;
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (kind === 'wrong') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(190, now);
      osc.frequency.exponentialRampToValueAtTime(130, now + 0.12);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.18, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (kind === 'done') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523, now);
      osc.frequency.setValueAtTime(659, now + 0.09);
      osc.frequency.setValueAtTime(784, now + 0.18);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.26, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);
      osc.start(now);
      osc.stop(now + 0.38);
    } else if (kind === 'word') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(840, now + 0.11);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.22, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.16);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.16, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.09);
    }
  }

  function flashKey(code, ok) {
    if (!code) return;
    setPressedFeedback({ code, ok });
    if (feedbackTimerRef.current) {
      window.clearTimeout(feedbackTimerRef.current);
    }
    feedbackTimerRef.current = window.setTimeout(() => {
      setPressedFeedback(null);
    }, 170);
  }

  function recordWeakKey(jamo) {
    if (!jamo) return;
    saveProgress((prev) => ({
      ...prev,
      weakKeys: {
        ...prev.weakKeys,
        [jamo]: (prev.weakKeys[jamo] ?? 0) + 1,
      },
    }));
  }

  function recordSessionStats(cpm, accuracy, completedStageIdx = null) {
    saveProgress((prev) => {
      const nextCompleted =
        completedStageIdx != null && !prev.completedStages.includes(completedStageIdx)
          ? [...prev.completedStages, completedStageIdx].sort((a, b) => a - b)
          : prev.completedStages;

      return {
        ...prev,
        bestCpm: Math.max(prev.bestCpm, cpm),
        totalSessions: prev.totalSessions + 1,
        accuracySum: prev.accuracySum + accuracy,
        completedStages: nextCompleted,
      };
    });
  }

  function focusCaptureSoon() {
    window.requestAnimationFrame(() => {
      captureInputRef.current?.focus();
    });
  }

  // ==================== SESSION STARTERS ====================
  function startSeatMode(nextStage = stageIndex) {
    setStageIndex(nextStage);
    setMode('seat');
    setSeatSequence(buildSeatSequence(nextStage));
    setSeatIndex(0);
    setSeatMistakes(0);
    setSeatWrongFlag(false);
    setSeatStartedAt(null);
    setSeatFinishedAt(null);
    setSeatLastTick(0);
    focusCaptureSoon();
  }

  function startWordMode(nextStage = stageIndex, nextScope = wordScope, customListOverride = null) {
    const customList = customListOverride ?? progress.customWords;
    setStageIndex(nextStage);
    setWordScope(nextScope);
    setMode('word');
    setWordList(buildWordSession(nextStage, nextScope, customList));
    setWordIndex(0);
    setTypedWordJamos([]);
    setWordCompletedStrokes(0);
    setWordMistakes(0);
    setWordWrongFlag(false);
    setWordStartedAt(null);
    setWordFinishedAt(null);
    setWordLastTick(0);
    focusCaptureSoon();
  }

  function startSentenceMode(nextSetId = sentenceSetId) {
    setSentenceSetId(nextSetId);
    setMode('sentence');
    setSentenceIdx(0);
    setSentenceInput('');
    setSentenceStartedAt(null);
    setSentenceFinishedAt(null);
    setSentenceLastTick(0);
    setSentenceTotalChars(0);
    setSentenceCorrectChars(0);
    setSentenceTotalStrokes(0);
    window.requestAnimationFrame(() => sentenceInputRef.current?.focus());
  }

  function openRainMode() {
    setMode('rain');
    setRainRunning(false);
    setRainGameOver(false);
    setRainDrops([]);
    setRainInput('');
    setRainScore(0);
    setRainLives(5);
    setRainCombo(0);
    setRainCleared(0);
    rainScoreRef.current = 0;
    rainClearedRef.current = 0;
  }

  function startRainGame() {
    setRainRunning(true);
    setRainGameOver(false);
    setRainDrops([]);
    setRainInput('');
    setRainScore(0);
    setRainLives(5);
    setRainCombo(0);
    setRainCleared(0);
    rainScoreRef.current = 0;
    rainClearedRef.current = 0;
    rainLastSpawnRef.current = 0;
    window.requestAnimationFrame(() => rainInputRef.current?.focus());
  }

  // ==================== SEAT MODE INPUT ====================
  const seatStage = TYPING_STAGES[stageIndex] ?? TYPING_STAGES[0];
  const seatIsDone = seatIndex >= seatSequence.length;
  const seatNextChar = seatIsDone ? '' : seatSequence[seatIndex];
  const seatAllowedKeys = useMemo(() => {
    if (seatStage.keys.length <= 4) {
      return Array.from(new Set([...seatStage.keys, 'ㄹ', 'ㅓ', 'ㅏ', 'ㄴ']));
    }
    return seatStage.keys;
  }, [seatStage]);

  const seatAccuracy =
    seatIndex + seatMistakes > 0 ? Math.round((seatIndex / (seatIndex + seatMistakes)) * 100) : 100;
  const seatCpm = calcCpm(seatIndex, seatStartedAt, seatFinishedAt ?? seatLastTick);

  function handleSeatKeyDown(event) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (seatIsDone) {
      if (event.key === 'Enter') {
        event.preventDefault();
        startSeatMode(stageIndex);
      }
      return;
    }

    const typed = getJamoFromKeyEvent(event);
    if (!typed) return;
    event.preventDefault();

    const now = Date.now();
    const startTs = seatStartedAt ?? now;
    if (!seatStartedAt) setSeatStartedAt(now);
    setSeatLastTick(now);

    if (typed === seatNextChar) {
      flashKey(event.code, true);
      const nextIdx = seatIndex + 1;
      setSeatIndex(nextIdx);
      setSeatWrongFlag(false);

      if (nextIdx >= seatSequence.length) {
        setSeatFinishedAt(now);
        playTone('done');
        const finalAcc = Math.round((nextIdx / (nextIdx + seatMistakes)) * 100);
        const finalCpm = calcCpm(nextIdx, startTs, now);
        recordSessionStats(finalCpm, finalAcc, stageIndex);
      } else {
        playTone('ok');
      }
    } else {
      flashKey(event.code, false);
      setSeatMistakes((prev) => prev + 1);
      setSeatWrongFlag(true);
      recordWeakKey(seatNextChar);
      playTone('wrong');
    }
  }

  // ==================== WORD-BY-STAGE MODE INPUT ====================
  const wordIsDone = wordList.length > 0 && wordIndex >= wordList.length;
  const currentTargetWord = wordIsDone ? '' : wordList[wordIndex] ?? '';
  const currentTargetJamos = useMemo(() => decomposeHangul(currentTargetWord), [currentTargetWord]);
  const nextWordJamo = currentTargetJamos[typedWordJamos.length] ?? '';
  const composedTypedWord = useMemo(() => composeHangul(typedWordJamos), [typedWordJamos]);
  const wordAllowedKeys = useMemo(() => {
    if (wordScope === 'custom') return null;
    return getCumulativeStageKeys(stageIndex);
  }, [stageIndex, wordScope]);

  const totalWordStrokesNow = wordCompletedStrokes + typedWordJamos.length;
  const wordAccuracy =
    totalWordStrokesNow + wordMistakes > 0
      ? Math.round((totalWordStrokesNow / (totalWordStrokesNow + wordMistakes)) * 100)
      : 100;
  const wordCpm = calcCpm(totalWordStrokesNow, wordStartedAt, wordFinishedAt ?? wordLastTick);

  function handleWordKeyDown(event) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (wordIsDone) {
      if (event.key === 'Enter') {
        event.preventDefault();
        startWordMode(stageIndex, wordScope);
      }
      return;
    }

    if (event.key === 'Backspace') {
      event.preventDefault();
      if (typedWordJamos.length > 0) {
        setTypedWordJamos((prev) => prev.slice(0, -1));
        setWordWrongFlag(false);
      }
      return;
    }

    const typed = getJamoFromKeyEvent(event);
    if (!typed) return;
    event.preventDefault();

    const now = Date.now();
    const startTs = wordStartedAt ?? now;
    if (!wordStartedAt) setWordStartedAt(now);
    setWordLastTick(now);

    if (typed === nextWordJamo) {
      flashKey(event.code, true);
      const nextTyped = [...typedWordJamos, typed];
      setWordWrongFlag(false);

      if (nextTyped.length >= currentTargetJamos.length) {
        const nextCompletedStrokes = wordCompletedStrokes + currentTargetJamos.length;
        const nextWordIdx = wordIndex + 1;
        setWordCompletedStrokes(nextCompletedStrokes);
        setTypedWordJamos([]);
        setWordIndex(nextWordIdx);

        if (nextWordIdx >= wordList.length) {
          setWordFinishedAt(now);
          playTone('done');
          const finalAcc = Math.round(
            (nextCompletedStrokes / (nextCompletedStrokes + wordMistakes)) * 100,
          );
          const finalCpm = calcCpm(nextCompletedStrokes, startTs, now);
          recordSessionStats(finalCpm, finalAcc, stageIndex);
        } else {
          playTone('word');
        }
      } else {
        setTypedWordJamos(nextTyped);
        playTone('ok');
      }
    } else {
      flashKey(event.code, false);
      setWordMistakes((prev) => prev + 1);
      setWordWrongFlag(true);
      recordWeakKey(nextWordJamo);
      playTone('wrong');
    }
  }

  function handleAddCustomWord(event) {
    event.preventDefault();
    const cleaned = customWordDraft.trim().replace(/\s+/g, '');
    if (!cleaned) return;

    const jamos = decomposeHangul(cleaned);
    if (jamos.length === 0) {
      setCustomWordNotice('한글 단어를 입력해 주세요.');
      return;
    }

    const requiredStageIdx = getWordRequiredStageIndex(cleaned);
    const requiredStage = TYPING_STAGES[requiredStageIdx];
    const alreadyExists = progress.customWords.some((item) => item.word === cleaned);
    const nextCustomWords = alreadyExists
      ? progress.customWords
      : [{ word: cleaned, stageIndex: requiredStageIdx }, ...progress.customWords];

    saveProgress((prev) => ({
      ...prev,
      customWords: nextCustomWords,
    }));

    setCustomWordDraft('');
    setCustomWordNotice(
      `"${cleaned}" 추가 완료 · ${requiredStage.name}(${requiredStage.title}) · ${jamos.join('')}`,
    );

    // Immediately include in current session if compatible, or jump to that stage
    const targetStage = requiredStageIdx > stageIndex && wordScope !== 'custom' ? requiredStageIdx : stageIndex;
    startWordMode(targetStage, wordScope, nextCustomWords);
  }

  function handleRemoveCustomWord(wordToRemove) {
    const nextCustomWords = progress.customWords.filter((item) => item.word !== wordToRemove);
    saveProgress((prev) => ({
      ...prev,
      customWords: nextCustomWords,
    }));
    startWordMode(stageIndex, wordScope, nextCustomWords);
  }

  // ==================== SHORT SENTENCE MODE ====================
  const currentSentenceSet =
    SHORT_SENTENCE_SETS.find((set) => set.id === sentenceSetId) ?? SHORT_SENTENCE_SETS[0];
  const sentenceIsDone = sentenceIdx >= currentSentenceSet.sentences.length;
  const activeSentence = sentenceIsDone ? '' : currentSentenceSet.sentences[sentenceIdx];
  const nextSentence = sentenceIsDone ? '' : currentSentenceSet.sentences[sentenceIdx + 1] ?? '';

  const liveSentenceCorrect = useMemo(() => {
    let ok = 0;
    for (let i = 0; i < sentenceInput.length; i += 1) {
      if (sentenceInput[i] === activeSentence[i]) ok += 1;
    }
    return ok;
  }, [sentenceInput, activeSentence]);

  const sentenceDisplayAcc =
    sentenceTotalChars + sentenceInput.length > 0
      ? Math.round(
          ((sentenceCorrectChars + liveSentenceCorrect) / (sentenceTotalChars + sentenceInput.length)) * 100,
        )
      : 100;

  const sentenceDisplayStrokes = sentenceTotalStrokes + decomposeHangul(sentenceInput).length;
  const sentenceCpm = calcCpm(
    sentenceDisplayStrokes,
    sentenceStartedAt,
    sentenceFinishedAt ?? sentenceLastTick,
  );

  const sentenceNextHintJamo = useMemo(() => {
    if (!activeSentence) return '';
    const cursorChar = activeSentence[sentenceInput.length];
    if (!cursorChar) return '';
    const decomposed = decomposeHangul(cursorChar);
    return decomposed[0] ?? '';
  }, [activeSentence, sentenceInput]);

  function submitCurrentSentence() {
    if (sentenceIsDone || !sentenceInput.trim()) return;
    const now = Date.now();
    const startTs = sentenceStartedAt ?? now;
    const nextTotalChars = sentenceTotalChars + activeSentence.length;
    const nextCorrectChars = sentenceCorrectChars + liveSentenceCorrect;
    const nextTotalStrokes = sentenceTotalStrokes + decomposeHangul(sentenceInput).length;
    const nextIdx = sentenceIdx + 1;

    setSentenceTotalChars(nextTotalChars);
    setSentenceCorrectChars(nextCorrectChars);
    setSentenceTotalStrokes(nextTotalStrokes);
    setSentenceInput('');
    setSentenceIdx(nextIdx);
    setSentenceLastTick(now);

    if (nextIdx >= currentSentenceSet.sentences.length) {
      setSentenceFinishedAt(now);
      playTone('done');
      const finalAcc = nextTotalChars > 0 ? Math.round((nextCorrectChars / nextTotalChars) * 100) : 100;
      const finalCpm = calcCpm(nextTotalStrokes, startTs, now);
      recordSessionStats(finalCpm, finalAcc);
    } else {
      playTone('word');
    }
  }

  function handleSentenceChange(event) {
    const val = event.target.value;
    const now = Date.now();
    if (!sentenceStartedAt && val.length > 0) setSentenceStartedAt(now);
    setSentenceLastTick(now);
    setSentenceInput(val);

    if (val === activeSentence) {
      window.setTimeout(() => {
        submitCurrentSentence();
      }, 60);
    }
  }

  // ==================== ACID RAIN GAME LOOP ====================
  const rainWordPool = useMemo(() => {
    if (rainStageFilter === 'all') {
      return TYPING_STAGES.flatMap((stage) => stage.words);
    }
    const idx = Number(rainStageFilter);
    return TYPING_STAGES.slice(0, idx + 1).flatMap((stage) => stage.words);
  }, [rainStageFilter]);

  useEffect(() => {
    if (mode !== 'rain' || !rainRunning || rainGameOver) return undefined;

    let rafId = 0;
    let lastTime = performance.now();

    const step = (now) => {
      const dt = Math.min(0.06, (now - lastTime) / 1000);
      lastTime = now;

      const level = 1 + Math.floor(rainClearedRef.current / 6);
      const spawnInterval = Math.max(950, 2300 - level * 140);
      const fallSpeed = 7.5 + level * 1.45; // % per second

      let shouldSpawn = false;
      if (!rainLastSpawnRef.current || now - rainLastSpawnRef.current >= spawnInterval) {
        rainLastSpawnRef.current = now;
        shouldSpawn = true;
      }

      let missedCount = 0;
      setRainDrops((prev) => {
        const moved = [];
        for (const drop of prev) {
          const nextY = drop.y + drop.speed * dt;
          if (nextY >= 88) {
            missedCount += 1;
          } else {
            moved.push({ ...drop, y: nextY });
          }
        }

        if (shouldSpawn && moved.length < 7) {
          const word = rainWordPool[Math.floor(Math.random() * rainWordPool.length)] ?? '하늘';
          moved.push({
            id: rainIdRef.current++,
            word,
            x: 14 + Math.random() * 72,
            y: 4,
            speed: fallSpeed * (0.85 + Math.random() * 0.3),
          });
        }

        return moved;
      });

      if (missedCount > 0) {
        playTone('wrong');
        setRainCombo(0);
        setRainLives((prev) => {
          const nextLives = Math.max(0, prev - missedCount);
          if (nextLives === 0) {
            setRainRunning(false);
            setRainGameOver(true);
            saveProgress((p) => ({
              ...p,
              bestRainScore: Math.max(p.bestRainScore, rainScoreRef.current),
            }));
          }
          return nextLives;
        });
      }

      rafId = window.requestAnimationFrame(step);
    };

    rafId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(rafId);
  }, [mode, rainRunning, rainGameOver, rainWordPool]);

  function handleRainSubmit(rawValue) {
    const guess = rawValue.trim();
    if (!guess || !rainRunning) return;

    const targetDrop = rainDrops
      .filter((drop) => drop.word === guess)
      .sort((a, b) => b.y - a.y)[0];

    if (targetDrop) {
      setRainDrops((prev) => prev.filter((drop) => drop.id !== targetDrop.id));
      const nextCombo = rainCombo + 1;
      const gained = 100 + Math.min(nextCombo, 10) * 15;
      const nextScore = rainScore + gained;
      rainScoreRef.current = nextScore;
      rainClearedRef.current += 1;

      setRainCombo(nextCombo);
      setRainScore(nextScore);
      setRainCleared((prev) => prev + 1);
      setRainInput('');
      playTone('word');
    } else {
      setRainCombo(0);
      setRainInput('');
      playTone('wrong');
    }
  }

  // Derived lobby summaries
  const avgAccuracy =
    progress.totalSessions > 0 ? Math.round(progress.accuracySum / progress.totalSessions) : 0;
  const topWeakKeys = useMemo(() => {
    return Object.entries(progress.weakKeys)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [progress.weakKeys]);

  // ==================== RENDER LOBBY ====================
  if (mode === 'lobby') {
    return (
      <section className={styles.page}>
        <div className={styles.shell}>
          {/* Classic + Modern Hero Banner */}
          <div className={styles.lobbyHero}>
            <div>
              <span className={styles.lobbyHeroBadge}>STUDY LAB · 두벌식 표준 한글 타자연습</span>
              <h1 className={styles.lobbyHeroTitle}>
                손끝으로 익히는
                <br />
                한글 타자 교실
              </h1>
              <p className={styles.lobbyHeroDesc}>
                한메타자·한컴타자연습처럼 <strong>자리연습 → 자리별 낱말연습 → 짧은 글 → 산성비 게임</strong>까지
                단계별로 익히고, 배운 자리 글쇠로 직접 단어를 만들어 연습할 수 있습니다.
              </p>

              <div className={styles.lobbyHeroActions}>
                <button
                  type="button"
                  className={styles.primaryCta}
                  onClick={() => startSeatMode(stageIndex)}
                >
                  자리연습 바로 시작 →
                </button>
                <button
                  type="button"
                  className={styles.ghostCta}
                  onClick={() => startWordMode(stageIndex, 'stage')}
                >
                  자리별 낱말연습
                </button>
                <button
                  type="button"
                  className={styles.ghostCta}
                  onClick={() => setSoundEnabled((prev) => !prev)}
                >
                  {soundEnabled ? '🔊 타건음 켜짐' : '🔇 타건음 꺼짐'}
                </button>
              </div>
            </div>

            <div className={styles.heroVisualCard}>
              <div className={styles.miniKeyboardArt} aria-hidden="true">
                <div className={styles.miniKeyRow}>
                  {['ㅂ', 'ㅈ', 'ㄷ', 'ㄱ', 'ㅅ', 'ㅛ', 'ㅕ'].map((ch) => (
                    <span key={ch} className={styles.miniKey}>
                      {ch}
                    </span>
                  ))}
                </div>
                <div className={styles.miniKeyRow}>
                  {['ㅁ', 'ㄴ', 'ㅇ', 'ㄹ', 'ㅎ', 'ㅗ', 'ㅓ'].map((ch) => (
                    <span
                      key={ch}
                      className={`${styles.miniKey}${ch === 'ㄹ' || ch === 'ㅓ' ? ` ${styles.miniKeyAccent}` : ''}`}
                    >
                      {ch}
                    </span>
                  ))}
                </div>
                <div className={styles.miniKeyRow}>
                  {['ㅋ', 'ㅌ', 'ㅊ', 'ㅍ', 'ㅠ', 'ㅜ', 'ㅡ'].map((ch) => (
                    <span key={ch} className={styles.miniKey}>
                      {ch}
                    </span>
                  ))}
                </div>
              </div>

              <div className={styles.heroMetrics}>
                <div className={styles.heroMetricBox}>
                  <span>최고 타수</span>
                  <strong>{progress.bestCpm}</strong>
                </div>
                <div className={styles.heroMetricBox}>
                  <span>평균 정확도</span>
                  <strong>{avgAccuracy > 0 ? `${avgAccuracy}%` : '-'}</strong>
                </div>
                <div className={styles.heroMetricBox}>
                  <span>완료 단계</span>
                  <strong>{progress.completedStages.length} / 5</strong>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Visual Mode Cards */}
          <div className={styles.sectionHead}>
            <h2>연습 메뉴 선택</h2>
            <p>원하는 연습 카드를 눌러 바로 시작하세요</p>
          </div>

          <div className={styles.modeCardGrid}>
            <button
              type="button"
              className={styles.modeCard}
              style={{ '--card-accent': '#2563eb', '--card-soft': '#eff6ff' }}
              onClick={() => startSeatMode(stageIndex)}
            >
              <div className={styles.modeCardTop}>
                <span className={styles.modeIcon}>
                  <ModeIcon type="seat" />
                </span>
                <span className={styles.modeTag}>1~5단계</span>
              </div>
              <h3>자리연습</h3>
              <p>3단 두벌식 키보드와 양손 손가락 가이드를 보며 기본자리부터 Shift 쌍자음까지 익힙니다.</p>
              <div className={styles.modeCardFooter}>
                <span>기초 다지기</span>
                <span>시작 →</span>
              </div>
            </button>

            <button
              type="button"
              className={styles.modeCard}
              style={{ '--card-accent': '#059669', '--card-soft': '#ecfdf5' }}
              onClick={() => startWordMode(stageIndex, 'stage')}
            >
              <div className={styles.modeCardTop}>
                <span className={styles.modeIcon}>
                  <ModeIcon type="word" />
                </span>
                <span className={styles.modeTag}>핵심 추천</span>
              </div>
              <h3>자리별 낱말연습</h3>
              <p>각 자리 단계 글쇠로 만든 낱말을 조합하며 치고, 내가 원하는 단어도 직접 추가해 연습합니다.</p>
              <div className={styles.modeCardFooter}>
                <span>직접 단어 만들기 포함</span>
                <span>시작 →</span>
              </div>
            </button>

            <button
              type="button"
              className={styles.modeCard}
              style={{ '--card-accent': '#7c3aed', '--card-soft': '#f5f3ff' }}
              onClick={() => startSentenceMode(sentenceSetId)}
            >
              <div className={styles.modeCardTop}>
                <span className={styles.modeIcon}>
                  <ModeIcon type="sentence" />
                </span>
                <span className={styles.modeTag}>속담 · 글귀</span>
              </div>
              <h3>짧은 글 연습</h3>
              <p>실제 한글 문장을 리듬감 있게 입력하며 실시간 타수와 오타 위치를 확인합니다.</p>
              <div className={styles.modeCardFooter}>
                <span>3개 주제 · 24문장</span>
                <span>시작 →</span>
              </div>
            </button>

            <button
              type="button"
              className={styles.modeCard}
              style={{ '--card-accent': '#ea580c', '--card-soft': '#fff7ed' }}
              onClick={openRainMode}
            >
              <div className={styles.modeCardTop}>
                <span className={styles.modeIcon}>
                  <ModeIcon type="rain" />
                </span>
                <span className={styles.modeTag}>
                  {progress.bestRainScore > 0 ? `최고 ${progress.bestRainScore}점` : '미니게임'}
                </span>
              </div>
              <h3>산성비 게임</h3>
              <p>하늘에서 떨어지는 자리별 단어를 빠르게 쳐서 없애는 베네치아 스타일 타자 게임입니다.</p>
              <div className={styles.modeCardFooter}>
                <span>단계별 단어 선택</span>
                <span>도전 →</span>
              </div>
            </button>
          </div>

          {/* 5-Stage Curriculum Roadmap */}
          <div className={styles.roadmapPanel}>
            <div className={styles.sectionHead}>
              <h2>단계별 자리 커리큘럼</h2>
              <p>원하는 단계의 자리연습 또는 자리별 낱말연습으로 바로 이동할 수 있습니다</p>
            </div>

            <div className={styles.stageRoadmapGrid}>
              {TYPING_STAGES.map((stage, idx) => {
                const isDone = progress.completedStages.includes(idx);

                return (
                  <div
                    key={stage.id}
                    className={`${styles.roadmapCard}${isDone ? ` ${styles.roadmapCardDone}` : ''}`}
                  >
                    <div className={styles.roadmapTop}>
                      <span className={styles.roadmapStep}>{stage.name}</span>
                      {isDone && <span className={styles.roadmapDoneBadge}>완료 ✓</span>}
                    </div>
                    <strong className={styles.roadmapTitle}>{stage.title}</strong>
                    <span className={styles.roadmapKeys}>{stage.badge}</span>
                    <div className={styles.roadmapActions}>
                      <button
                        type="button"
                        className={styles.roadmapBtn}
                        onClick={() => startSeatMode(idx)}
                      >
                        자리연습
                      </button>
                      <button
                        type="button"
                        className={`${styles.roadmapBtn} ${styles.roadmapBtnAccent}`}
                        onClick={() => startWordMode(idx, 'stage')}
                      >
                        낱말연습
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Weak Key Analysis */}
          {topWeakKeys.length > 0 && (
            <div className={styles.weakKeysStrip}>
              <div className={styles.weakKeysLeft}>
                <strong>자주 틀린 글쇠 (약점 키)</strong>
                {topWeakKeys.map(([jamo, count]) => (
                  <span key={jamo} className={styles.weakKeyPill}>
                    {jamo} <small>({count}회)</small>
                  </span>
                ))}
              </div>
              <button
                type="button"
                className={styles.weakKeyResetBtn}
                onClick={() => saveProgress((prev) => ({ ...prev, weakKeys: {} }))}
              >
                약점 기록 초기화
              </button>
            </div>
          )}
        </div>
      </section>
    );
  }

  // ==================== SHARED WORKSPACE HEADER ====================
  const modeTitles = {
    seat: { title: '자리연습', sub: '3단 두벌식 키보드와 손가락 위치를 보며 정확하게 익힙니다.' },
    word: { title: '자리별 낱말연습', sub: '단계별 자리 글쇠로 만든 단어와 직접 추가한 단어를 연습합니다.' },
    sentence: { title: '짧은 글 연습', sub: '문장 전체를 입력하고 Enter를 누르거나 끝까지 치면 다음 글로 넘어갑니다.' },
    rain: { title: '산성비 게임', sub: '단어가 바닥 물결에 닿기 전에 입력하고 Enter/Space로 없애세요.' },
  };

  return (
    <section className={styles.page}>
      <div className={styles.shell}>
        {/* Top Bar */}
        <header className={styles.topBar}>
          <div className={styles.topBarLeft}>
            <button type="button" className={styles.backBtn} onClick={() => setMode('lobby')}>
              ← 시작 메뉴
            </button>
            <div className={styles.topBarTitle}>
              <h1>{modeTitles[mode].title}</h1>
              <span>{modeTitles[mode].sub}</span>
            </div>
          </div>

          <div className={styles.topBarRight}>
            <div className={styles.modeSwitchPills} role="tablist" aria-label="연습 모드 전환">
              <button
                type="button"
                className={mode === 'seat' ? styles.activePill : ''}
                onClick={() => startSeatMode(stageIndex)}
              >
                자리
              </button>
              <button
                type="button"
                className={mode === 'word' ? styles.activePill : ''}
                onClick={() => startWordMode(stageIndex, wordScope)}
              >
                자리별 낱말
              </button>
              <button
                type="button"
                className={mode === 'sentence' ? styles.activePill : ''}
                onClick={() => startSentenceMode(sentenceSetId)}
              >
                짧은 글
              </button>
              <button
                type="button"
                className={mode === 'rain' ? styles.activePill : ''}
                onClick={openRainMode}
              >
                산성비
              </button>
            </div>

            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => setSoundEnabled((prev) => !prev)}
            >
              {soundEnabled ? '🔊 소리' : '🔇 음소거'}
            </button>
          </div>
        </header>

        {/* ==================== MODE 1: SEAT PRACTICE ==================== */}
        {mode === 'seat' && (
          <>
            <div className={styles.stageStrip}>
              {TYPING_STAGES.map((stage, idx) => (
                <button
                  key={stage.id}
                  type="button"
                  className={`${styles.stageChip}${stageIndex === idx ? ` ${styles.stageChipActive}` : ''}`}
                  onClick={() => startSeatMode(idx)}
                >
                  <span>
                    {stage.name}
                    {progress.completedStages.includes(idx) ? ' ✓' : ''}
                  </span>
                  <strong>{stage.title}</strong>
                  <em>{stage.badge}</em>
                </button>
              ))}
            </div>

            <div className={styles.statsRow}>
              <div className={styles.statCard}>
                <span>현재 타수</span>
                <div>
                  <strong>{seatCpm}</strong>
                  <em>타/분</em>
                </div>
              </div>
              <div className={styles.statCard}>
                <span>정확도</span>
                <div>
                  <strong>{seatAccuracy}</strong>
                  <em>%</em>
                </div>
              </div>
              <div className={styles.statCard}>
                <span>오타</span>
                <div>
                  <strong>{seatMistakes}</strong>
                  <em>회</em>
                </div>
              </div>
              <div className={styles.statCard}>
                <span>진행</span>
                <div>
                  <strong>{seatIndex}</strong>
                  <em>/ {seatSequence.length}</em>
                </div>
              </div>
            </div>

            <div className={styles.practiceCard}>
              <div
                className={`${styles.captureBox}${captureFocused ? ` ${styles.captureBoxFocused}` : ''}`}
                onClick={() => captureInputRef.current?.focus()}
              >
                <input
                  ref={captureInputRef}
                  className={styles.captureHiddenInput}
                  value=""
                  readOnly
                  onKeyDown={handleSeatKeyDown}
                  onFocus={() => setCaptureFocused(true)}
                  onBlur={() => setCaptureFocused(false)}
                  aria-label="자리연습 키 입력 영역"
                />
                <span className={styles.captureHint}>
                  {captureFocused
                    ? '입력 준비 완료! 키보드를 보고 치지 말고 손가락 감각으로 눌러보세요.'
                    : '여기를 클릭하면 키보드 입력이 활성화됩니다.'}
                </span>
                <span className={styles.captureKeyTip}>한/영 전환 없이 바로 입력 가능</span>
              </div>

              <div className={styles.seatDisplay}>
                <div
                  className={`${styles.currentBigKey}${
                    seatWrongFlag ? ` ${styles.currentBigKeyWrong}` : ''
                  }`}
                >
                  <span>{seatIsDone ? '단계 완료!' : `${seatStage.name} · ${seatStage.title}`}</span>
                  <strong>{seatIsDone ? '✓' : seatNextChar}</strong>
                  <small>
                    {seatIsDone
                      ? '수고하셨습니다'
                      : FINGER_INFO[JAMO_TO_KEY_META[seatNextChar]?.finger]?.label ?? ''}
                  </small>
                </div>

                <div className={styles.seatQueueBox}>
                  <div className={styles.seatQueueTop}>
                    <span>{seatStage.description}</span>
                    <span
                      className={`${styles.seatStatusPill}${
                        seatWrongFlag ? ` ${styles.seatStatusError}` : ''
                      }`}
                    >
                      {seatIsDone
                        ? '완료!'
                        : seatWrongFlag
                          ? '다시 정확히 눌러보세요'
                          : `${seatIndex + 1}번째 글쇠`}
                    </span>
                  </div>

                  <div className={styles.charTrack}>
                    {seatSequence.map((ch, idx) => {
                      const cls =
                        idx < seatIndex
                          ? styles.charCellCorrect
                          : idx === seatIndex
                            ? seatWrongFlag
                              ? styles.charCellWrong
                              : styles.charCellCurrent
                            : '';

                      return (
                        <span key={`${idx}-${ch}`} className={`${styles.charCell} ${cls}`}>
                          {ch}
                        </span>
                      );
                    })}
                  </div>

                  <div className={styles.progressTrack}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${Math.round((seatIndex / seatSequence.length) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {seatIsDone && (
                <div className={styles.finishBanner}>
                  <strong>
                    {seatStage.name}({seatStage.title}) 완료! · 속도 {seatCpm}타/분 · 정확도 {seatAccuracy}%
                  </strong>
                  <div className={styles.finishBannerActions}>
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={() => startSeatMode(stageIndex)}
                    >
                      다시 연습
                    </button>
                    <button
                      type="button"
                      className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                      onClick={() => startWordMode(stageIndex, 'stage')}
                    >
                      이 자리 낱말연습 →
                    </button>
                    {stageIndex < TYPING_STAGES.length - 1 && (
                      <button
                        type="button"
                        className={styles.actionBtn}
                        onClick={() => startSeatMode(stageIndex + 1)}
                      >
                        다음 단계
                      </button>
                    )}
                  </div>
                </div>
              )}

              <TypingKeyboard
                nextJamo={seatNextChar}
                allowedKeys={seatAllowedKeys}
                pressedFeedback={pressedFeedback}
              />
            </div>
          </>
        )}

        {/* ==================== MODE 2: WORD BY STAGE ==================== */}
        {mode === 'word' && (
          <>
            <div className={styles.stageStrip}>
              {TYPING_STAGES.map((stage, idx) => (
                <button
                  key={stage.id}
                  type="button"
                  className={`${styles.stageChip}${stageIndex === idx ? ` ${styles.stageChipActive}` : ''}`}
                  onClick={() => startWordMode(idx, wordScope)}
                >
                  <span>{stage.name}</span>
                  <strong>{stage.title} 단어</strong>
                  <em>{stage.badge}</em>
                </button>
              ))}
            </div>

            <div className={styles.statsRow}>
              <div className={styles.statCard}>
                <span>타수</span>
                <div>
                  <strong>{wordCpm}</strong>
                  <em>타/분</em>
                </div>
              </div>
              <div className={styles.statCard}>
                <span>정확도</span>
                <div>
                  <strong>{wordAccuracy}</strong>
                  <em>%</em>
                </div>
              </div>
              <div className={styles.statCard}>
                <span>오타</span>
                <div>
                  <strong>{wordMistakes}</strong>
                  <em>회</em>
                </div>
              </div>
              <div className={styles.statCard}>
                <span>완료 단어</span>
                <div>
                  <strong>{wordIndex}</strong>
                  <em>/ {wordList.length}</em>
                </div>
              </div>
            </div>

            <div className={styles.practiceCard}>
              {/* Scope filter + Custom word builder */}
              <div className={styles.wordControlsBar}>
                <div className={styles.wordFilterGroup}>
                  <button
                    type="button"
                    className={`${styles.filterChip}${wordScope === 'stage' ? ` ${styles.filterChipActive}` : ''}`}
                    onClick={() => startWordMode(stageIndex, 'stage')}
                  >
                    {seatStage.name} 집중 단어
                  </button>
                  <button
                    type="button"
                    className={`${styles.filterChip}${wordScope === 'cumulative' ? ` ${styles.filterChipActive}` : ''}`}
                    onClick={() => startWordMode(stageIndex, 'cumulative')}
                  >
                    1~{stageIndex + 1}단계 누적 단어
                  </button>
                  <button
                    type="button"
                    className={`${styles.filterChip}${wordScope === 'custom' ? ` ${styles.filterChipActive}` : ''}`}
                    onClick={() => startWordMode(stageIndex, 'custom')}
                  >
                    내가 만든 단어 ({progress.customWords.length})
                  </button>
                </div>

                <form className={styles.customWordForm} onSubmit={handleAddCustomWord}>
                  <input
                    type="text"
                    className={styles.customWordInput}
                    value={customWordDraft}
                    onChange={(e) => setCustomWordDraft(e.target.value)}
                    placeholder="직접 단어 추가 (예: 나비)"
                    maxLength={10}
                  />
                  <button type="submit" className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}>
                    + 단어 만들기
                  </button>
                </form>
              </div>

              {customWordNotice && <div className={styles.customWordNotice}>{customWordNotice}</div>}

              {wordList.length === 0 ? (
                <div className={styles.finishBanner}>
                  <strong>아직 만든 단어가 없습니다. 위 입력창에서 한글 단어를 추가해 보세요!</strong>
                  <button
                    type="button"
                    className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                    onClick={() => startWordMode(stageIndex, 'stage')}
                  >
                    기본 자리 단어로 연습
                  </button>
                </div>
              ) : (
                <>
                  <div
                    className={`${styles.captureBox}${captureFocused ? ` ${styles.captureBoxFocused}` : ''}`}
                    onClick={() => captureInputRef.current?.focus()}
                  >
                    <input
                      ref={captureInputRef}
                      className={styles.captureHiddenInput}
                      value=""
                      readOnly
                      onKeyDown={handleWordKeyDown}
                      onFocus={() => setCaptureFocused(true)}
                      onBlur={() => setCaptureFocused(false)}
                      aria-label="자리별 낱말연습 키 입력 영역"
                    />
                    <span className={styles.captureHint}>
                      {captureFocused
                        ? '입력 준비 완료! 자모를 순서대로 치면 한글 단어가 실시간으로 조합됩니다.'
                        : '여기를 클릭해서 단어 입력을 시작하세요.'}
                    </span>
                    <span className={styles.captureKeyTip}>Backspace로 수정 가능 · 한/영 자동 인식</span>
                  </div>

                  <div className={styles.wordStageArena}>
                    <div
                      className={`${styles.wordPromptBox}${
                        wordWrongFlag ? ` ${styles.wordPromptWrong}` : ''
                      }`}
                    >
                      <div className={styles.wordPromptMeta}>
                        <span>
                          {wordIsDone
                            ? '모든 낱말을 완료했습니다!'
                            : `${seatStage.name} · ${wordIndex + 1} / ${wordList.length}번째 단어`}
                        </span>
                      </div>

                      <div className={styles.wordPromptTarget}>
                        {wordIsDone ? '완료!' : currentTargetWord}
                      </div>

                      {!wordIsDone && (
                        <>
                          <div className={styles.wordTypedPreview} aria-live="polite">
                            {composedTypedWord || '...'}
                          </div>

                          <div className={styles.jamoChips} aria-label="글쇠 순서">
                            {currentTargetJamos.map((jamo, idx) => {
                              const cls =
                                idx < typedWordJamos.length
                                  ? styles.jamoChipDone
                                  : idx === typedWordJamos.length
                                    ? styles.jamoChipCurrent
                                    : '';

                              return (
                                <span key={`${idx}-${jamo}`} className={`${styles.jamoChip} ${cls}`}>
                                  {jamo}
                                </span>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>

                    <div className={styles.wordQueueSide}>
                      <h3>
                        <span>이번 연습 단어 목록</span>
                        <span>
                          {wordIndex}/{wordList.length}
                        </span>
                      </h3>
                      <div className={styles.wordChipList}>
                        {wordList.map((w, idx) => {
                          const isCustom = progress.customWords.some((item) => item.word === w);
                          const chipCls =
                            idx < wordIndex
                              ? styles.wordChipDone
                              : idx === wordIndex
                                ? styles.wordChipCurrent
                                : '';

                          return (
                            <span key={`${w}-${idx}`} className={`${styles.wordChip} ${chipCls}`}>
                              {w}
                              {isCustom && (
                                <button
                                  type="button"
                                  className={styles.wordChipDelete}
                                  title="내가 만든 단어 삭제"
                                  onClick={() => handleRemoveCustomWord(w)}
                                >
                                  ×
                                </button>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className={styles.progressTrack}>
                    <div
                      className={styles.progressFill}
                      style={{
                        width: `${Math.round((wordIndex / Math.max(1, wordList.length)) * 100)}%`,
                      }}
                    />
                  </div>

                  {wordIsDone && (
                    <div className={styles.finishBanner}>
                      <strong>
                        낱말연습 완료! · 속도 {wordCpm}타/분 · 정확도 {wordAccuracy}%
                      </strong>
                      <div className={styles.finishBannerActions}>
                        <button
                          type="button"
                          className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                          onClick={() => startWordMode(stageIndex, wordScope)}
                        >
                          새 낱말 세트
                        </button>
                        {stageIndex < TYPING_STAGES.length - 1 && (
                          <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={() => startWordMode(stageIndex + 1, wordScope)}
                          >
                            다음 단계 단어 →
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <TypingKeyboard
                    nextJamo={nextWordJamo}
                    allowedKeys={wordAllowedKeys}
                    pressedFeedback={pressedFeedback}
                  />
                </>
              )}
            </div>
          </>
        )}

        {/* ==================== MODE 3: SHORT SENTENCE ==================== */}
        {mode === 'sentence' && (
          <>
            <div className={styles.sentenceSetTabs}>
              {SHORT_SENTENCE_SETS.map((set) => (
                <button
                  key={set.id}
                  type="button"
                  className={`${styles.filterChip}${
                    sentenceSetId === set.id ? ` ${styles.filterChipActive}` : ''
                  }`}
                  onClick={() => startSentenceMode(set.id)}
                >
                  {set.title} ({set.sentences.length}문장)
                </button>
              ))}
            </div>

            <div className={styles.statsRow}>
              <div className={styles.statCard}>
                <span>현재 타수</span>
                <div>
                  <strong>{sentenceCpm}</strong>
                  <em>타/분</em>
                </div>
              </div>
              <div className={styles.statCard}>
                <span>정확도</span>
                <div>
                  <strong>{sentenceDisplayAcc}</strong>
                  <em>%</em>
                </div>
              </div>
              <div className={styles.statCard}>
                <span>입력 타수</span>
                <div>
                  <strong>{sentenceDisplayStrokes}</strong>
                  <em>타</em>
                </div>
              </div>
              <div className={styles.statCard}>
                <span>진행</span>
                <div>
                  <strong>{sentenceIdx}</strong>
                  <em>/ {currentSentenceSet.sentences.length}</em>
                </div>
              </div>
            </div>

            <div className={styles.practiceCard}>
              {sentenceIsDone ? (
                <div className={styles.finishBanner}>
                  <strong>
                    {currentSentenceSet.title} 완료! · 평균 {sentenceCpm}타/분 · 정확도 {sentenceDisplayAcc}%
                  </strong>
                  <div className={styles.finishBannerActions}>
                    <button
                      type="button"
                      className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                      onClick={() => startSentenceMode(sentenceSetId)}
                    >
                      다시 치기
                    </button>
                  </div>
                </div>
              ) : (
                <div className={styles.sentenceBoard}>
                  <div className={styles.sentenceTargetLine} aria-label="목표 문장">
                    {Array.from(activeSentence).map((ch, idx) => {
                      let cls = styles.sentenceCharPending;
                      if (idx < sentenceInput.length) {
                        cls =
                          sentenceInput[idx] === ch
                            ? styles.sentenceCharCorrect
                            : styles.sentenceCharWrong;
                      } else if (idx === sentenceInput.length) {
                        cls = styles.sentenceCharCursor;
                      }

                      return (
                        <span key={`${idx}-${ch}`} className={cls}>
                          {ch}
                        </span>
                      );
                    })}
                  </div>

                  <input
                    ref={sentenceInputRef}
                    type="text"
                    className={styles.sentenceInput}
                    value={sentenceInput}
                    onChange={handleSentenceChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        submitCurrentSentence();
                      }
                    }}
                    placeholder="위 문장을 한글로 그대로 입력하고 Enter를 누르세요"
                    autoFocus
                  />

                  {nextSentence && (
                    <div className={styles.sentenceNextPreview}>다음 문장: {nextSentence}</div>
                  )}
                </div>
              )}

              <div className={styles.progressTrack}>
                <div
                  className={styles.progressFill}
                  style={{
                    width: `${Math.round((sentenceIdx / currentSentenceSet.sentences.length) * 100)}%`,
                  }}
                />
              </div>

              <TypingKeyboard nextJamo={sentenceNextHintJamo} compact />
            </div>
          </>
        )}

        {/* ==================== MODE 4: ACID RAIN GAME ==================== */}
        {mode === 'rain' && (
          <>
            <div className={styles.statsRow}>
              <div className={styles.statCard}>
                <span>점수</span>
                <div>
                  <strong>{rainScore}</strong>
                  <em>점</em>
                </div>
              </div>
              <div className={styles.statCard}>
                <span>콤보</span>
                <div>
                  <strong>{rainCombo}</strong>
                  <em>연속</em>
                </div>
              </div>
              <div className={styles.statCard}>
                <span>격추 단어</span>
                <div>
                  <strong>{rainCleared}</strong>
                  <em>개</em>
                </div>
              </div>
              <div className={styles.statCard}>
                <span>남은 목숨</span>
                <div>
                  <strong>{'♥'.repeat(rainLives) || '0'}</strong>
                </div>
              </div>
            </div>

            <div className={styles.practiceCard}>
              <div className={styles.rainToolbar}>
                <div className={styles.wordFilterGroup}>
                  <button
                    type="button"
                    className={`${styles.filterChip}${
                      rainStageFilter === 'all' ? ` ${styles.filterChipActive}` : ''
                    }`}
                    onClick={() => setRainStageFilter('all')}
                    disabled={rainRunning}
                  >
                    전체 단어
                  </button>
                  {TYPING_STAGES.map((stage, idx) => (
                    <button
                      key={stage.id}
                      type="button"
                      className={`${styles.filterChip}${
                        rainStageFilter === idx ? ` ${styles.filterChipActive}` : ''
                      }`}
                      onClick={() => setRainStageFilter(idx)}
                      disabled={rainRunning}
                    >
                      1~{idx + 1}단계 ({stage.shortTitle})
                    </button>
                  ))}
                </div>

                {rainRunning && (
                  <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={() => setRainRunning(false)}
                  >
                    일시정지
                  </button>
                )}
              </div>

              <div className={styles.rainArena}>
                {rainDrops.map((drop) => {
                  const isDanger = drop.y > 68;
                  const isMatching =
                    rainInput.trim().length > 0 && drop.word.startsWith(rainInput.trim());

                  return (
                    <div
                      key={drop.id}
                      className={`${styles.rainDrop}${isDanger ? ` ${styles.rainDropDanger}` : ''}${
                        isMatching ? ` ${styles.rainDropMatch}` : ''
                      }`}
                      style={{ left: `${drop.x}%`, top: `${drop.y}%` }}
                    >
                      {drop.word}
                    </div>
                  );
                })}

                <div className={styles.rainWaterLine}>
                  <span>산성비 방어선 · 레벨 {1 + Math.floor(rainCleared / 6)}</span>
                  <span>최고 기록 {Math.max(progress.bestRainScore, rainScore)}점</span>
                </div>

                {!rainRunning && (
                  <div className={styles.rainOverlay}>
                    <div className={styles.rainOverlayCard}>
                      <h2>{rainGameOver ? '게임 종료!' : '산성비 타자 게임'}</h2>
                      <p>
                        {rainGameOver
                          ? `최종 점수 ${rainScore}점 · 총 ${rainCleared}개 단어를 막아냈습니다!`
                          : '위에서 떨어지는 단어를 입력하고 Enter 또는 Space를 눌러 격추하세요. 자리별 단계를 선택하면 초보자도 즐길 수 있습니다.'}
                      </p>
                      <button type="button" className={styles.primaryCta} onClick={startRainGame}>
                        {rainGameOver ? '다시 도전하기' : '게임 시작'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.rainInputBar}>
                <input
                  ref={rainInputRef}
                  type="text"
                  className={styles.rainInput}
                  value={rainInput}
                  disabled={!rainRunning}
                  onChange={(e) => setRainInput(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      handleRainSubmit(rainInput);
                    }
                  }}
                  placeholder={rainRunning ? '떨어지는 단어를 입력하고 Enter / Space!' : '게임 시작을 눌러주세요'}
                />
                <button
                  type="button"
                  className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                  disabled={!rainRunning}
                  onClick={() => handleRainSubmit(rainInput)}
                >
                  격추
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
