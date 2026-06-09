import { useMemo, useRef, useState } from 'react';

const PRACTICE_LENGTH = 20;

const practiceModes = [
  { id: 'seat', label: '자리연습' },
  { id: 'word', label: '단어 만들기' },
];

const stages = [
  {
    id: 'home',
    name: '1단계',
    title: '기본자리',
    description: '왼손 ㅁ ㄴ ㅇ ㄹ · 오른손 ㅗ ㅓ ㅏ ㅣ',
    leftKeys: ['ㅁ', 'ㄴ', 'ㅇ', 'ㄹ'],
    rightKeys: ['ㅗ', 'ㅓ', 'ㅏ', 'ㅣ'],
  },
  {
    id: 'top',
    name: '2단계',
    title: '윗자리',
    description: '왼손 ㅂ ㅈ ㄷ ㄱ · 오른손 ㅛ ㅕ ㅑ ㅐ',
    leftKeys: ['ㅂ', 'ㅈ', 'ㄷ', 'ㄱ'],
    rightKeys: ['ㅛ', 'ㅕ', 'ㅑ', 'ㅐ'],
  },
  {
    id: 'bottom',
    name: '3단계',
    title: '아랫자리',
    description: '왼손 ㅋ ㅌ ㅊ ㅍ · 오른손 ㅠ ㅜ ㅡ',
    leftKeys: ['ㅋ', 'ㅌ', 'ㅊ', 'ㅍ'],
    rightKeys: ['ㅠ', 'ㅜ', 'ㅡ'],
  },
];

const codeToJamo = {
  KeyA: 'ㅁ',
  KeyS: 'ㄴ',
  KeyD: 'ㅇ',
  KeyF: 'ㄹ',
  KeyH: 'ㅗ',
  KeyJ: 'ㅓ',
  KeyK: 'ㅏ',
  KeyL: 'ㅣ',
  KeyQ: 'ㅂ',
  KeyW: 'ㅈ',
  KeyE: 'ㄷ',
  KeyR: 'ㄱ',
  KeyY: 'ㅛ',
  KeyU: 'ㅕ',
  KeyI: 'ㅑ',
  KeyO: 'ㅐ',
  KeyZ: 'ㅋ',
  KeyX: 'ㅌ',
  KeyC: 'ㅊ',
  KeyV: 'ㅍ',
  KeyB: 'ㅠ',
  KeyN: 'ㅜ',
  KeyM: 'ㅡ',
};

const keyToJamo = Object.fromEntries(
  Object.entries(codeToJamo).map(([code, jamo]) => [code.replace('Key', '').toLowerCase(), jamo]),
);

const handLabels = {
  left: '왼손',
  right: '오른손',
};

const wordLessons = [
  [
    { word: '아리', keys: 'ㅇㅏㄹㅣ' },
    { word: '나라', keys: 'ㄴㅏㄹㅏ' },
    { word: '오리', keys: 'ㅇㅗㄹㅣ' },
    { word: '엄마', keys: 'ㅇㅓㅁㅁㅏ' },
    { word: '미나', keys: 'ㅁㅣㄴㅏ' },
    { word: '머리', keys: 'ㅁㅓㄹㅣ' },
  ],
  [
    { word: '개나리', keys: 'ㄱㅐㄴㅏㄹㅣ' },
    { word: '고기', keys: 'ㄱㅗㄱㅣ' },
    { word: '바다', keys: 'ㅂㅏㄷㅏ' },
    { word: '여기', keys: 'ㅇㅕㄱㅣ' },
    { word: '기러기', keys: 'ㄱㅣㄹㅓㄱㅣ' },
    { word: '아기', keys: 'ㅇㅏㄱㅣ' },
  ],
  [
    { word: '나무', keys: 'ㄴㅏㅁㅜ' },
    { word: '구름', keys: 'ㄱㅜㄹㅡㅁ' },
    { word: '기차', keys: 'ㄱㅣㅊㅏ' },
    { word: '도토리', keys: 'ㄷㅗㅌㅗㄹㅣ' },
    { word: '바나나', keys: 'ㅂㅏㄴㅏㄴㅏ' },
    { word: '추억', keys: 'ㅊㅜㅇㅓㄱ' },
  ],
];

function getStage(index) {
  return stages[index] ?? stages[0];
}

function getStageKeys(stageIndex) {
  const stage = getStage(stageIndex);
  return [...stage.leftKeys, ...stage.rightKeys];
}

function getLearnedHandKeys(stageIndex, side) {
  return stages.slice(0, stageIndex + 1).flatMap((stage) => stage[`${side}Keys`]);
}

function getAllowedKeys(stageIndex, mode) {
  if (mode === 'word') {
    return [...getLearnedHandKeys(stageIndex, 'left'), ...getLearnedHandKeys(stageIndex, 'right')];
  }

  return getStageKeys(stageIndex);
}

function shuffleItems(items, randomize = true) {
  const shuffled = [...items];

  if (randomize) {
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
  }

  return shuffled;
}

function createPracticeText(stageIndex, randomize = true) {
  const keys = getStageKeys(stageIndex);
  const chars = Array.from({ length: PRACTICE_LENGTH }, (_, index) => keys[index % keys.length]);

  return shuffleItems(chars, randomize).join('');
}

function createWordLesson(stageIndex, randomize = true) {
  let cursor = 0;
  const words = shuffleItems(wordLessons[stageIndex] ?? wordLessons[0], randomize).map((item) => {
    const start = cursor;
    cursor += item.keys.length;
    return { ...item, start, end: cursor };
  });

  return {
    target: words.map((item) => item.keys).join(''),
    words,
  };
}

function createLesson(stageIndex, mode, randomize = true) {
  if (mode === 'word') {
    return createWordLesson(stageIndex, randomize);
  }

  return {
    target: createPracticeText(stageIndex, randomize),
    words: [],
  };
}

function getStats(target, value, startedAt, finishedAt) {
  const now = finishedAt ?? Date.now();
  const elapsedMs = startedAt ? Math.max(1, now - startedAt) : 0;
  const elapsedSeconds = elapsedMs / 1000;
  let correct = 0;

  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === target[index]) correct += 1;
  }

  const accuracy = value.length ? Math.round((correct / value.length) * 100) : 100;
  const charsPerMinute = elapsedSeconds ? Math.round((correct / elapsedSeconds) * 60) : 0;
  const progress = Math.min(100, Math.round((value.length / target.length) * 100));

  return {
    accuracy,
    charsPerMinute,
    progress,
    correct,
    mistakes: Math.max(0, value.length - correct),
    elapsedSeconds,
  };
}

export default function TypingPage() {
  const [stageIndex, setStageIndex] = useState(0);
  const [practiceMode, setPracticeMode] = useState('seat');
  const [lesson, setLesson] = useState(() => createLesson(0, 'seat', false));
  const [value, setValue] = useState('');
  const [startedAt, setStartedAt] = useState(null);
  const [finishedAt, setFinishedAt] = useState(null);
  const [blockedKey, setBlockedKey] = useState('');
  const inputRef = useRef(null);
  const audioRef = useRef(null);

  const currentStage = getStage(stageIndex);
  const target = lesson.target;
  const wordItems = lesson.words;
  const stats = useMemo(() => getStats(target, value, startedAt, finishedAt), [target, value, startedAt, finishedAt]);
  const isFinished = value === target;
  const currentIndex = Math.min(value.length, target.length);
  const nextChar = target[currentIndex] ?? '완료';
  const visibleLeftKeys = practiceMode === 'word' ? getLearnedHandKeys(stageIndex, 'left') : currentStage.leftKeys;
  const visibleRightKeys = practiceMode === 'word' ? getLearnedHandKeys(stageIndex, 'right') : currentStage.rightKeys;
  const nextLeftIndex = visibleLeftKeys.indexOf(nextChar);
  const nextRightIndex = visibleRightKeys.indexOf(nextChar);
  const nextSide = nextLeftIndex >= 0 ? 'left' : nextRightIndex >= 0 ? 'right' : '';
  const nextKeyPosition = nextLeftIndex >= 0 ? nextLeftIndex + 1 : nextRightIndex >= 0 ? nextRightIndex + 1 : 0;
  const nextKeyGuide = nextSide ? `${handLabels[nextSide]} ${nextKeyPosition}번 자리` : '연습 완료';
  const currentWord = wordItems.find((item) => currentIndex < item.end) ?? wordItems[wordItems.length - 1];
  const previousChar = value[currentIndex - 1] ?? '';
  const lastWasWrong = value.length > 0 && value[value.length - 1] !== target[value.length - 1];

  function focusInput() {
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }

  function reset(nextStageIndex = stageIndex, nextMode = practiceMode) {
    setStageIndex(nextStageIndex);
    setPracticeMode(nextMode);
    setLesson(createLesson(nextStageIndex, nextMode, true));
    setValue('');
    setStartedAt(null);
    setFinishedAt(null);
    setBlockedKey('');
    focusInput();
  }

  function goNextStage() {
    reset(Math.min(stages.length - 1, stageIndex + 1), practiceMode);
  }

  function playSuccessSound(done = false) {
    if (typeof window === 'undefined') return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const context = audioRef.current ?? new AudioContext();
    audioRef.current = context;
    if (context.state === 'suspended') context.resume();

    const now = context.currentTime;
    const gain = context.createGain();
    gain.connect(context.destination);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(done ? 0.46 : 0.34, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (done ? 0.34 : 0.12));

    const oscillator = context.createOscillator();
    oscillator.type = done ? 'triangle' : 'sine';
    oscillator.frequency.setValueAtTime(done ? 660 : 520, now);
    if (done) oscillator.frequency.exponentialRampToValueAtTime(990, now + 0.16);
    oscillator.connect(gain);
    oscillator.start(now);
    oscillator.stop(now + (done ? 0.36 : 0.13));
  }

  function commitValue(nextValue) {
    const limitedValue = nextValue.slice(0, target.length);
    if (!startedAt && limitedValue.length > 0) setStartedAt(Date.now());
    const typedForward = limitedValue.length > value.length;
    const typedIndex = limitedValue.length - 1;
    const typedCorrectly = typedForward && limitedValue[typedIndex] === target[typedIndex];
    setValue(limitedValue);
    setBlockedKey('');
    if (typedCorrectly) playSuccessSound(limitedValue === target);
    if (limitedValue === target && !finishedAt) setFinishedAt(Date.now());
    if (limitedValue !== target && finishedAt) setFinishedAt(null);
  }

  function getTypedJamo(event) {
    const directKey = getAllowedKeys(stageIndex, practiceMode).includes(event.key) ? event.key : '';
    return codeToJamo[event.code] ?? keyToJamo[event.key.toLowerCase()] ?? directKey;
  }

  function handleKeyDown(event) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    if (event.key === 'Backspace') {
      event.preventDefault();
      commitValue(value.slice(0, -1));
      return;
    }

    const typedJamo = getTypedJamo(event);
    if (!typedJamo) return;

    event.preventDefault();
    if (!getAllowedKeys(stageIndex, practiceMode).includes(typedJamo)) {
      setBlockedKey(`${typedJamo}는 이번 단계 자리가 아닙니다`);
      return;
    }

    commitValue(value + typedJamo);
  }

  function renderKey(key, side) {
    const keyList = side === 'left' ? visibleLeftKeys : visibleRightKeys;
    const keyIndex = keyList.indexOf(key) + 1;
    const isActive = nextChar === key;

    return (
      <span key={`${side}-${key}`} className={isActive ? 'active' : ''}>
        <b>{key}</b>
        <em>{handLabels[side]} {keyIndex}</em>
        {isActive && <i>여기</i>}
      </span>
    );
  }

  return (
    <section className="typingPage">
      <div className="typingShell">
        <header className="typingHeader">
          <div>
            <span>Study Zone</span>
            <h1>타자 공부</h1>
            <p>자리연습과 단어 만들기를 단계별로 연습합니다.</p>
          </div>
          <div className="headerActions">
            <button type="button" onClick={() => reset()}>
              새 연습
            </button>
            <button type="button" onClick={goNextStage} disabled={stageIndex >= stages.length - 1}>
              다음 단계
            </button>
          </div>
        </header>

        <div className="stageTabs">
          {stages.map((stage, index) => (
            <button key={stage.id} type="button" className={stageIndex === index ? 'active' : ''} onClick={() => reset(index)}>
              <span>{stage.name}</span>
              <strong>{stage.title}</strong>
              <em>{stage.description}</em>
            </button>
          ))}
        </div>

        <div className="modeTabs" aria-label="연습 종류">
          {practiceModes.map((mode) => (
            <button
              key={mode.id}
              type="button"
              className={practiceMode === mode.id ? 'active' : ''}
              onClick={() => reset(stageIndex, mode.id)}
            >
              {mode.label}
            </button>
          ))}
        </div>

        <main className="practicePanel">
          <div className="lessonTitle">
            <span>{currentStage.name} · {currentStage.title} · {practiceMode === 'word' ? '단어 만들기' : '20개 랜덤'}</span>
            <strong>{currentIndex + (isFinished ? 0 : 1)} / {target.length}</strong>
          </div>

          <div className="seatBoard" aria-label="자리표">
            <div className="handBlock left">
              <strong>왼손</strong>
              <div>{visibleLeftKeys.map((key) => renderKey(key, 'left'))}</div>
            </div>
            <div className={lastWasWrong ? 'nextKey wrong' : 'nextKey'}>
              <span>{isFinished ? '연습 완료' : '이번 글쇠'}</span>
              <strong>{nextChar}</strong>
              <small>{nextKeyGuide}</small>
              <em>{blockedKey || (lastWasWrong ? '방금 글자가 틀렸습니다' : previousChar ? `방금 입력: ${previousChar}` : '천천히 정확하게')}</em>
            </div>
            <div className="handBlock right">
              <strong>오른손</strong>
              <div>{visibleRightKeys.map((key) => renderKey(key, 'right'))}</div>
            </div>
          </div>

          <div className="singlePractice" aria-label="현재 연습 글자">
            <span>{practiceMode === 'word' ? '현재 단어' : '미리보기 없음'}</span>
            <strong>{practiceMode === 'word' ? currentWord?.word ?? nextChar : nextChar}</strong>
            <em>{isFinished ? '완료했습니다' : practiceMode === 'word' ? `다음 글쇠: ${nextChar}` : `${currentIndex + 1}번째 글쇠를 입력하세요`}</em>
          </div>

          {practiceMode === 'word' && (
            <div className="wordStrip" aria-label="단어 목록">
              {wordItems.map((item) => {
                const className =
                  currentIndex >= item.end ? 'done' :
                  currentIndex >= item.start ? 'current' :
                  '';
                return <span key={`${item.word}-${item.start}`} className={className}>{item.word}</span>;
              })}
            </div>
          )}

          <textarea
            ref={inputRef}
            value={value}
            onKeyDown={handleKeyDown}
            placeholder="여기에 한 글자씩 입력하세요"
            readOnly
            spellCheck="false"
            autoFocus
          />

          <div className="progressDots" style={{ gridTemplateColumns: `repeat(${Math.min(target.length, 20)}, minmax(0, 1fr))` }} aria-label="진행 상황">
            {Array.from({ length: target.length }, (_, index) => {
              const typed = value[index];
              const className =
                typed == null ? (index === currentIndex ? 'current' : '') :
                typed === target[index] ? 'correct' :
                'wrong';
              return <span key={index} className={className}>{index + 1}</span>;
            })}
          </div>

          <div className="progressTrack">
            <span style={{ width: `${stats.progress}%` }} />
          </div>

          {isFinished && (
            <div className="finishBox">
              <span>완료! 정확도 {stats.accuracy}% · 속도 {stats.charsPerMinute}타/분</span>
              {stageIndex < stages.length - 1 && (
                <button type="button" onClick={goNextStage}>
                  다음 단계로
                </button>
              )}
            </div>
          )}
        </main>

        <aside className="statsGrid">
          <div>
            <span>타수</span>
            <strong>{stats.charsPerMinute}</strong>
            <em>타/분</em>
          </div>
          <div>
            <span>정확도</span>
            <strong>{stats.accuracy}</strong>
            <em>%</em>
          </div>
          <div>
            <span>오타</span>
            <strong>{stats.mistakes}</strong>
            <em>개</em>
          </div>
          <div>
            <span>진행</span>
            <strong>{currentIndex}</strong>
            <em>/ {target.length}</em>
          </div>
        </aside>
      </div>

      <style jsx>{`
        .typingPage {
          min-height: calc(100vh - var(--site-nav-height));
          padding: 22px;
          background:
            linear-gradient(rgba(30, 64, 175, 0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(30, 64, 175, 0.06) 1px, transparent 1px),
            #eef4fb;
          background-size: 32px 32px, 32px 32px, auto;
          color: #111827;
        }

        .typingShell {
          width: min(1120px, 100%);
          margin: 0 auto;
          display: grid;
          gap: 14px;
        }

        .typingHeader,
        .practicePanel,
        .statsGrid div,
        .stageTabs button,
        .modeTabs {
          border: 1px solid rgba(30, 64, 175, 0.18);
          border-radius: 8px;
          background: #ffffff;
          box-shadow: 0 18px 36px rgba(15, 23, 42, 0.08);
        }

        .typingHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 22px;
          border-top: 6px solid #2563eb;
        }

        .typingHeader span,
        .lessonTitle span,
        .statsGrid span {
          color: #2563eb;
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .typingHeader h1 {
          margin: 4px 0 0;
          color: #0f172a;
          font-size: 42px;
          line-height: 1;
        }

        .typingHeader p {
          margin: 10px 0 0;
          color: #64748b;
          font-size: 14px;
          font-weight: 800;
        }

        .headerActions {
          display: flex;
          gap: 8px;
        }

        .typingHeader button,
        .stageTabs button,
        .finishBox button {
          min-height: 42px;
          border: 0;
          border-radius: 8px;
          font-weight: 900;
          cursor: pointer;
        }

        .typingHeader button,
        .finishBox button {
          padding: 0 18px;
          background: #111827;
          color: #ffffff;
        }

        .typingHeader button:disabled {
          opacity: 0.42;
          cursor: not-allowed;
        }

        .stageTabs {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .modeTabs {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          padding: 8px;
        }

        .stageTabs button {
          min-height: 112px;
          padding: 14px;
          color: #334155;
          text-align: left;
        }

        .modeTabs button {
          min-height: 46px;
          border: 0;
          border-radius: 8px;
          background: #eef2ff;
          color: #334155;
          font-size: 15px;
          font-weight: 900;
          cursor: pointer;
        }

        .stageTabs button.active,
        .modeTabs button.active {
          border-color: #2563eb;
          background: #dbeafe;
          color: #1e3a8a;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        }

        .stageTabs span,
        .stageTabs strong,
        .stageTabs em {
          display: block;
        }

        .stageTabs span {
          font-size: 12px;
          font-weight: 900;
        }

        .stageTabs strong {
          margin-top: 5px;
          font-size: 22px;
        }

        .stageTabs em {
          margin-top: 8px;
          color: #64748b;
          font-size: 12px;
          font-style: normal;
          font-weight: 800;
          line-height: 1.35;
        }

        .practicePanel {
          padding: 22px;
          display: grid;
          gap: 16px;
          border-top: 6px solid #0f172a;
        }

        .lessonTitle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .lessonTitle strong {
          padding: 8px 12px;
          border-radius: 8px;
          background: #fef3c7;
          color: #92400e;
          font-size: 14px;
        }

        .seatBoard {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 156px minmax(0, 1fr);
          gap: 12px;
          align-items: stretch;
        }

        .handBlock,
        .nextKey,
        .singlePractice {
          border: 1px solid rgba(15, 23, 42, 0.12);
          border-radius: 8px;
          background: #f8fafc;
          padding: 14px;
        }

        .handBlock > strong,
        .nextKey span,
        .singlePractice span {
          display: block;
          color: #475569;
          font-size: 12px;
          font-weight: 900;
          text-align: center;
        }

        .handBlock div {
          margin-top: 10px;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
        }

        .handBlock span {
          min-height: 68px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(15, 23, 42, 0.14);
          border-radius: 8px;
          background: #ffffff;
          box-shadow: inset 0 -4px 0 rgba(15, 23, 42, 0.08);
          position: relative;
        }

        .handBlock span.active {
          border-color: #f97316;
          background: #ffedd5;
          box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.24), inset 0 -5px 0 rgba(154, 52, 18, 0.22);
          transform: translateY(-2px);
        }

        .handBlock b {
          color: #0f172a;
          font-size: 30px;
          line-height: 1;
        }

        .handBlock em {
          color: #94a3b8;
          font-size: 10px;
          font-style: normal;
          font-weight: 900;
        }

        .handBlock i {
          position: absolute;
          top: -11px;
          right: -8px;
          padding: 3px 7px;
          border-radius: 999px;
          background: #ef4444;
          color: #ffffff;
          font-size: 11px;
          font-style: normal;
          font-weight: 900;
          box-shadow: 0 5px 12px rgba(239, 68, 68, 0.3);
        }

        .nextKey,
        .singlePractice {
          display: grid;
          place-items: center;
          background: #111827;
          text-align: center;
        }

        .nextKey.wrong {
          background: #7f1d1d;
        }

        .nextKey span,
        .singlePractice span {
          color: #93c5fd;
        }

        .nextKey strong,
        .singlePractice strong {
          color: #facc15;
          font-size: 52px;
          line-height: 1;
        }

        .nextKey small {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 28px;
          padding: 4px 10px;
          border-radius: 999px;
          background: #f97316;
          color: #ffffff;
          font-size: 13px;
          font-weight: 900;
        }

        .nextKey em,
        .singlePractice em {
          color: #cbd5e1;
          font-size: 12px;
          font-style: normal;
          font-weight: 900;
        }

        .singlePractice {
          min-height: 178px;
        }

        .singlePractice strong {
          font-size: 88px;
        }

        .wordStrip {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding: 12px;
          border: 1px solid rgba(15, 23, 42, 0.12);
          border-radius: 8px;
          background: #f8fafc;
        }

        .wordStrip span {
          min-height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 12px;
          border-radius: 8px;
          background: #e2e8f0;
          color: #475569;
          font-weight: 900;
        }

        .wordStrip span.current {
          background: #fef3c7;
          color: #92400e;
          box-shadow: 0 0 0 3px rgba(250, 204, 21, 0.22);
        }

        .wordStrip span.done {
          background: #dcfce7;
          color: #166534;
        }

        textarea {
          width: 100%;
          min-height: 104px;
          resize: vertical;
          padding: 16px;
          border: 2px solid rgba(37, 99, 235, 0.26);
          border-radius: 8px;
          outline: 0;
          color: #111827;
          font: inherit;
          font-size: 24px;
          font-weight: 800;
          line-height: 1.55;
        }

        textarea:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.14);
        }

        .progressDots {
          display: grid;
          grid-template-columns: repeat(20, minmax(0, 1fr));
          gap: 5px;
        }

        .progressDots span {
          min-height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          background: #e2e8f0;
          color: #64748b;
          font-size: 11px;
          font-weight: 900;
        }

        .progressDots .current {
          background: #fef3c7;
          color: #92400e;
          box-shadow: 0 0 0 2px rgba(250, 204, 21, 0.24);
        }

        .progressDots .correct {
          background: #dcfce7;
          color: #166534;
        }

        .progressDots .wrong {
          background: #dc2626;
          color: #ffffff;
        }

        .progressTrack {
          height: 14px;
          overflow: hidden;
          border-radius: 999px;
          background: #e2e8f0;
        }

        .progressTrack span {
          height: 100%;
          display: block;
          border-radius: inherit;
          background: linear-gradient(90deg, #22c55e, #2563eb);
          transition: width 120ms ease;
        }

        .finishBox {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px;
          border-radius: 8px;
          background: #dcfce7;
          color: #166534;
          font-weight: 900;
        }

        .statsGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .statsGrid div {
          min-height: 120px;
          padding: 18px;
        }

        .statsGrid strong {
          display: block;
          margin-top: 8px;
          color: #0f172a;
          font-size: 38px;
          line-height: 1;
        }

        .statsGrid em {
          color: #64748b;
          font-size: 12px;
          font-style: normal;
          font-weight: 900;
        }

        @media (max-width: 900px) {
          .seatBoard {
            grid-template-columns: 1fr;
          }

          .nextKey {
            min-height: 132px;
          }
        }

        @media (max-width: 760px) {
          .typingPage {
            padding: 14px;
          }

          .typingHeader,
          .lessonTitle,
          .finishBox {
            display: grid;
          }

          .typingHeader h1 {
            font-size: 32px;
          }

          .headerActions,
          .stageTabs,
          .statsGrid {
            grid-template-columns: 1fr;
            display: grid;
          }

          .progressDots {
            grid-template-columns: repeat(10, minmax(0, 1fr));
          }
        }
      `}</style>
    </section>
  );
}
