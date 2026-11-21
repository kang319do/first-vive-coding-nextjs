export const CHO_LIST = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ',
  'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
];

export const JUNG_LIST = [
  'ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ',
  'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ',
];

export const JONG_LIST = [
  '', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ',
  'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ',
  'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
];

const COMPOUND_VOWEL_SPLIT = {
  ㅘ: ['ㅗ', 'ㅏ'],
  ㅙ: ['ㅗ', 'ㅐ'],
  ㅚ: ['ㅗ', 'ㅣ'],
  ㅝ: ['ㅜ', 'ㅓ'],
  ㅞ: ['ㅜ', 'ㅔ'],
  ㅟ: ['ㅜ', 'ㅣ'],
  ㅢ: ['ㅡ', 'ㅣ'],
};

const COMPOUND_VOWEL_JOIN = {
  'ㅗㅏ': 'ㅘ',
  'ㅗㅐ': 'ㅙ',
  'ㅗㅣ': 'ㅚ',
  'ㅜㅓ': 'ㅝ',
  'ㅜㅔ': 'ㅞ',
  'ㅜㅣ': 'ㅟ',
  'ㅡㅣ': 'ㅢ',
};

const COMPOUND_JONG_SPLIT = {
  ㄳ: ['ㄱ', 'ㅅ'],
  ㄵ: ['ㄴ', 'ㅈ'],
  ㄶ: ['ㄴ', 'ㅎ'],
  ㄺ: ['ㄹ', 'ㄱ'],
  ㄻ: ['ㄹ', 'ㅁ'],
  ㄼ: ['ㄹ', 'ㅂ'],
  ㄽ: ['ㄹ', 'ㅅ'],
  ㄾ: ['ㄹ', 'ㅌ'],
  ㄿ: ['ㄹ', 'ㅍ'],
  ㅀ: ['ㄹ', 'ㅎ'],
  ㅄ: ['ㅂ', 'ㅅ'],
};

const COMPOUND_JONG_JOIN = {
  'ㄱㅅ': 'ㄳ',
  'ㄴㅈ': 'ㄵ',
  'ㄴㅎ': 'ㄶ',
  'ㄹㄱ': 'ㄺ',
  'ㄹㅁ': 'ㄻ',
  'ㄹㅂ': 'ㄼ',
  'ㄹㅅ': 'ㄽ',
  'ㄹㅌ': 'ㄾ',
  'ㄹㅍ': 'ㄿ',
  'ㄹㅎ': 'ㅀ',
  'ㅂㅅ': 'ㅄ',
};

const CONSONANT_SET = new Set(CHO_LIST);
const VOWEL_SET = new Set(JUNG_LIST);

export const FINGER_INFO = {
  'left-pinky': { label: '왼손 새끼손가락', short: '왼새끼', color: '#f43f5e' },
  'left-ring': { label: '왼손 약지', short: '왼약지', color: '#f59e0b' },
  'left-middle': { label: '왼손 중지', short: '왼중지', color: '#10b981' },
  'left-index': { label: '왼손 검지', short: '왼검지', color: '#0ea5e9' },
  'right-index': { label: '오른손 검지', short: '오검지', color: '#6366f1' },
  'right-middle': { label: '오른손 중지', short: '오중지', color: '#10b981' },
  'right-ring': { label: '오른손 약지', short: '오약지', color: '#f59e0b' },
  'right-pinky': { label: '오른손 새끼손가락', short: '오새끼', color: '#f43f5e' },
  thumb: { label: '엄지손가락', short: '엄지', color: '#64748b' },
};

export const KEYBOARD_ROWS = [
  [
    { code: 'KeyQ', base: 'ㅂ', shift: 'ㅃ', eng: 'Q', finger: 'left-pinky', stage: 2 },
    { code: 'KeyW', base: 'ㅈ', shift: 'ㅉ', eng: 'W', finger: 'left-ring', stage: 2 },
    { code: 'KeyE', base: 'ㄷ', shift: 'ㄸ', eng: 'E', finger: 'left-middle', stage: 2 },
    { code: 'KeyR', base: 'ㄱ', shift: 'ㄲ', eng: 'R', finger: 'left-index', stage: 2 },
    { code: 'KeyT', base: 'ㅅ', shift: 'ㅆ', eng: 'T', finger: 'left-index', stage: 1 },
    { code: 'KeyY', base: 'ㅛ', shift: '', eng: 'Y', finger: 'right-index', stage: 2 },
    { code: 'KeyU', base: 'ㅕ', shift: '', eng: 'U', finger: 'right-index', stage: 2 },
    { code: 'KeyI', base: 'ㅑ', shift: '', eng: 'I', finger: 'right-middle', stage: 2 },
    { code: 'KeyO', base: 'ㅐ', shift: 'ㅒ', eng: 'O', finger: 'right-ring', stage: 2 },
    { code: 'KeyP', base: 'ㅔ', shift: 'ㅖ', eng: 'P', finger: 'right-pinky', stage: 1 },
  ],
  [
    { code: 'KeyA', base: 'ㅁ', shift: '', eng: 'A', finger: 'left-pinky', stage: 0 },
    { code: 'KeyS', base: 'ㄴ', shift: '', eng: 'S', finger: 'left-ring', stage: 0 },
    { code: 'KeyD', base: 'ㅇ', shift: '', eng: 'D', finger: 'left-middle', stage: 0 },
    { code: 'KeyF', base: 'ㄹ', shift: '', eng: 'F', finger: 'left-index', stage: 0, home: true },
    { code: 'KeyG', base: 'ㅎ', shift: '', eng: 'G', finger: 'left-index', stage: 1 },
    { code: 'KeyH', base: 'ㅗ', shift: '', eng: 'H', finger: 'right-index', stage: 0 },
    { code: 'KeyJ', base: 'ㅓ', shift: '', eng: 'J', finger: 'right-index', stage: 0, home: true },
    { code: 'KeyK', base: 'ㅏ', shift: '', eng: 'K', finger: 'right-middle', stage: 0 },
    { code: 'KeyL', base: 'ㅣ', shift: '', eng: 'L', finger: 'right-ring', stage: 0 },
  ],
  [
    { code: 'ShiftLeft', base: 'Shift', shift: '', eng: '⇧', finger: 'left-pinky', modifier: 'left', wide: true },
    { code: 'KeyZ', base: 'ㅋ', shift: '', eng: 'Z', finger: 'left-pinky', stage: 3 },
    { code: 'KeyX', base: 'ㅌ', shift: '', eng: 'X', finger: 'left-ring', stage: 3 },
    { code: 'KeyC', base: 'ㅊ', shift: '', eng: 'C', finger: 'left-middle', stage: 3 },
    { code: 'KeyV', base: 'ㅍ', shift: '', eng: 'V', finger: 'left-index', stage: 3 },
    { code: 'KeyB', base: 'ㅠ', shift: '', eng: 'B', finger: 'right-index', stage: 3 },
    { code: 'KeyN', base: 'ㅜ', shift: '', eng: 'N', finger: 'right-index', stage: 3 },
    { code: 'KeyM', base: 'ㅡ', shift: '', eng: 'M', finger: 'right-middle', stage: 3 },
    { code: 'ShiftRight', base: 'Shift', shift: '', eng: '⇧', finger: 'right-pinky', modifier: 'right', wide: true },
  ],
];

export const ALL_KEYS = KEYBOARD_ROWS.flat().filter((item) => !item.modifier);

export const CODE_TO_KEY = Object.fromEntries(ALL_KEYS.map((item) => [item.code, item]));

export const JAMO_TO_KEY_META = (() => {
  const map = {};
  for (const key of ALL_KEYS) {
    map[key.base] = {
      code: key.code,
      jamo: key.base,
      needsShift: false,
      finger: key.finger,
      shiftSide: null,
      eng: key.eng,
    };
    if (key.shift) {
      map[key.shift] = {
        code: key.code,
        jamo: key.shift,
        needsShift: true,
        finger: key.finger,
        shiftSide: key.finger.startsWith('left') ? 'right' : 'left',
        eng: key.eng,
      };
    }
  }
  return map;
})();

export const TYPING_STAGES = [
  {
    id: 'home',
    number: 1,
    name: '1단계',
    title: '기본자리',
    shortTitle: '기본',
    badge: 'ㅁㄴㅇㄹ · ㅗㅓㅏㅣ',
    description: '양손이 가장 먼저 놓이는 기본 기준 자리입니다.',
    keys: ['ㅁ', 'ㄴ', 'ㅇ', 'ㄹ', 'ㅗ', 'ㅓ', 'ㅏ', 'ㅣ'],
    words: [
      '나라', '오리', '엄마', '머리', '이마',
      '어머니', '미나리', '모란', '만남', '얼마',
      '알림', '어린이', '언니', '난로', '이모',
      '안마', '알람', '밀림', '이론', '나리',
    ],
  },
  {
    id: 'extend',
    number: 2,
    name: '2단계',
    title: '검지·새끼 확장',
    shortTitle: '확장',
    badge: 'ㅎ ㅅ · ㅔ',
    description: '기본자리에서 ㅎ, ㅅ, ㅔ로 손가락을 뻗어 연습합니다.',
    keys: ['ㅎ', 'ㅅ', 'ㅔ'],
    words: [
      '사람', '사랑', '세상', '소리', '하나',
      '호랑이', '시선', '하마', '이사', '소망',
      '헤엄', '신호', '성함', '세모', '소설',
      '호미', '인사', '메아리', '네모', '메모',
    ],
  },
  {
    id: 'top',
    number: 3,
    name: '3단계',
    title: '윗자리',
    shortTitle: '윗자리',
    badge: 'ㅂㅈㄷㄱ · ㅛㅕㅑㅐ',
    description: '윗줄 자음과 모음을 자연스럽게 오가는 단계입니다.',
    keys: ['ㅂ', 'ㅈ', 'ㄷ', 'ㄱ', 'ㅛ', 'ㅕ', 'ㅑ', 'ㅐ'],
    words: [
      '바다', '개나리', '기러기', '바람', '고양이',
      '강아지', '병아리', '거미', '배달', '이야기',
      '요리사', '가방', '다리미', '자전거', '개미',
      '사다리', '도자기', '비행기', '교실', '선생님',
    ],
  },
  {
    id: 'bottom',
    number: 4,
    name: '4단계',
    title: '아랫자리',
    shortTitle: '아랫자리',
    badge: 'ㅋㅌㅊㅍ · ㅠㅜㅡ',
    description: '아랫줄 자음과 모음을 더해 모든 기본 글쇠를 익힙니다.',
    keys: ['ㅋ', 'ㅌ', 'ㅊ', 'ㅍ', 'ㅠ', 'ㅜ', 'ㅡ'],
    words: [
      '하늘', '구름', '나무', '기차', '도토리',
      '포도', '컴퓨터', '우유', '코알라', '치타',
      '토마토', '파도', '추억', '마음', '친구',
      '카메라', '피아노', '별빛', '타자', '유리창',
    ],
  },
  {
    id: 'shift',
    number: 5,
    name: '5단계',
    title: '쌍자음 · Shift',
    shortTitle: '쉬프트',
    badge: 'ㅃㅉㄸㄲㅆ · ㅒㅖ',
    description: '반대손 Shift와 함께 쌍자음과 이중모음을 정확히 칩니다.',
    keys: ['ㅃ', 'ㅉ', 'ㄸ', 'ㄲ', 'ㅆ', 'ㅒ', 'ㅖ'],
    words: [
      '토끼', '코끼리', '딸기', '빵집', '씨앗',
      '짜장면', '예절', '얘기', '까치', '빨래',
      '뜨개질', '쓰레기', '세계', '지혜', '꽃밭',
      '꿀벌', '쌀밥', '따뜻한', '뽀뽀', '시계',
    ],
  },
];

export const SHORT_SENTENCE_SETS = [
  {
    id: 'proverb',
    title: '속담 모음',
    description: '익숙한 우리 속담으로 리듬감 있게 연습합니다.',
    sentences: [
      '천 리 길도 한 걸음부터 시작한다.',
      '시작이 반이라는 말이 있다.',
      '백지장도 맞들면 훨씬 가볍다.',
      '고생 끝에 낙이 온다고 한다.',
      '티끌 모아 태산을 이룰 수 있다.',
      '가는 말이 고와야 오는 말이 곱다.',
      '세 살 버릇 여든까지 간다.',
      '우물 안 개구리가 되지 말자.',
    ],
  },
  {
    id: 'quote',
    title: '응원 글귀',
    description: '매일 연습할 때 힘이 되는 짧은 문장입니다.',
    sentences: [
      '천천히 정확하게 치는 습관이 속도를 만든다.',
      '오늘의 작은 연습이 내일의 큰 실력이 된다.',
      '키보드를 보지 않고 화면에 집중해 보자.',
      '오타가 나도 당황하지 말고 리듬을 되찾자.',
      '꾸준함은 어떤 재능보다 강력한 무기다.',
      '손가락의 자리를 기억하면 생각이 바로 글이 된다.',
      '어제보다 한 타 더 정확하게 입력해 보자.',
      '즐겁게 연습할 때 실력이 가장 빠르게 자란다.',
    ],
  },
  {
    id: 'nature',
    title: '계절과 자연',
    description: '다양한 받침과 모음이 고르게 섞인 문장입니다.',
    sentences: [
      '맑은 아침 햇살이 창문 너머로 스며든다.',
      '봄바람에 개나리와 벚꽃이 나란히 피어난다.',
      '여름 바다의 푸른 파도가 시원하게 부서진다.',
      '높고 파란 가을 하늘 아래 단풍이 물든다.',
      '하얀 눈꽃이 소나무 가지 위에 소복이 쌓인다.',
      '밤하늘의 반짝이는 별빛을 천천히 올려다본다.',
      '숲속 작은 오솔길에서 맑은 새소리가 들린다.',
      '비 온 뒤 무지개가 구름 사이로 선명하게 뜬다.',
    ],
  },
];

export function getCumulativeStageKeys(stageIndex) {
  return TYPING_STAGES.slice(0, stageIndex + 1).flatMap((stage) => stage.keys);
}

export function decomposeHangul(text) {
  const result = [];

  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) {
      const offset = code - 0xac00;
      const cho = CHO_LIST[Math.floor(offset / 588)];
      const jung = JUNG_LIST[Math.floor((offset % 588) / 28)];
      const jong = JONG_LIST[offset % 28];

      result.push(cho);

      if (COMPOUND_VOWEL_SPLIT[jung]) {
        result.push(...COMPOUND_VOWEL_SPLIT[jung]);
      } else {
        result.push(jung);
      }

      if (jong) {
        if (COMPOUND_JONG_SPLIT[jong]) {
          result.push(...COMPOUND_JONG_SPLIT[jong]);
        } else {
          result.push(jong);
        }
      }
    } else if (JAMO_TO_KEY_META[ch]) {
      result.push(ch);
    }
  }

  return result;
}

export function composeHangul(jamos) {
  let output = '';
  let cho = '';
  let jung = '';
  let jong = '';

  const flush = () => {
    if (cho && jung) {
      const choIndex = CHO_LIST.indexOf(cho);
      const jungIndex = JUNG_LIST.indexOf(jung);
      const jongIndex = jong ? JONG_LIST.indexOf(jong) : 0;
      if (choIndex >= 0 && jungIndex >= 0 && jongIndex >= 0) {
        output += String.fromCharCode(0xac00 + (choIndex * 21 + jungIndex) * 28 + jongIndex);
      } else {
        output += cho + jung + jong;
      }
    } else {
      output += cho + jung + jong;
    }
    cho = '';
    jung = '';
    jong = '';
  };

  for (const jamo of jamos) {
    const isConsonant = CONSONANT_SET.has(jamo);
    const isVowel = VOWEL_SET.has(jamo);

    if (!isConsonant && !isVowel) {
      flush();
      output += jamo;
      continue;
    }

    if (isConsonant) {
      if (!cho && !jung) {
        cho = jamo;
      } else if (cho && !jung) {
        flush();
        cho = jamo;
      } else if (cho && jung && !jong) {
        if (JONG_LIST.includes(jamo)) {
          jong = jamo;
        } else {
          flush();
          cho = jamo;
        }
      } else if (cho && jung && jong) {
        const combined = COMPOUND_JONG_JOIN[jong + jamo];
        if (combined) {
          jong = combined;
        } else {
          flush();
          cho = jamo;
        }
      }
    } else if (isVowel) {
      if (!cho && !jung) {
        output += jamo;
      } else if (cho && !jung) {
        jung = jamo;
      } else if (cho && jung && !jong) {
        const combined = COMPOUND_VOWEL_JOIN[jung + jamo];
        if (combined) {
          jung = combined;
        } else {
          flush();
          output += jamo;
        }
      } else if (cho && jung && jong) {
        if (COMPOUND_JONG_SPLIT[jong]) {
          const [first, second] = COMPOUND_JONG_SPLIT[jong];
          jong = first;
          flush();
          cho = second;
          jung = jamo;
        } else {
          const movedCho = jong;
          jong = '';
          flush();
          cho = movedCho;
          jung = jamo;
        }
      }
    }
  }

  flush();
  return output;
}

export function getWordRequiredStageIndex(word) {
  const jamos = decomposeHangul(word);
  let maxStage = 0;

  for (const jamo of jamos) {
    const stageIdx = TYPING_STAGES.findIndex((stage) => stage.keys.includes(jamo));
    if (stageIdx > maxStage) {
      maxStage = stageIdx;
    }
  }

  return maxStage;
}

export function getJamoFromKeyEvent(event) {
  const keyInfo = CODE_TO_KEY[event.code];
  if (keyInfo) {
    if (event.shiftKey && keyInfo.shift) {
      return keyInfo.shift;
    }
    return keyInfo.base;
  }

  if (JAMO_TO_KEY_META[event.key]) {
    return event.key;
  }

  return '';
}

export function shuffleArray(list, seed) {
  const copy = [...list];
  let state = seed ?? 1;

  for (let i = copy.length - 1; i > 0; i -= 1) {
    let rand;
    if (seed == null) {
      rand = Math.random();
    } else {
      state = (state * 1664525 + 1013904223) % 4294967296;
      rand = state / 4294967296;
    }
    const j = Math.floor(rand * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}
