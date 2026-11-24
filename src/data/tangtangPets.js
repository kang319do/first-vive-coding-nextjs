export const PET_RARITIES = {
  common: {
    id: 'common',
    label: '일반',
    rate: 45,
    color: '#94a3b8',
    bg: 'rgba(148, 163, 184, 0.14)',
    powerMult: 1.0,
    refund: 15,
  },
  rare: {
    id: 'rare',
    label: '희귀',
    rate: 30,
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.16)',
    powerMult: 1.32,
    refund: 25,
  },
  epic: {
    id: 'epic',
    label: '영웅',
    rate: 16,
    color: '#c084fc',
    bg: 'rgba(192, 132, 252, 0.18)',
    powerMult: 1.78,
    refund: 55,
  },
  legend: {
    id: 'legend',
    label: '전설',
    rate: 7,
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.2)',
    powerMult: 2.4,
    refund: 120,
  },
  mythic: {
    id: 'mythic',
    label: '신화',
    rate: 2,
    color: '#fb7185',
    bg: 'rgba(244, 63, 94, 0.24)',
    powerMult: 3.35,
    refund: 260,
  },
};

export const PET_RARITY_ORDER = ['mythic', 'legend', 'epic', 'rare', 'common'];

const PET_STYLE_DESC = {
  lunge: { role: '근접 돌진', description: '적에게 고속 돌진해 강한 타격과 경직을 입힙니다.' },
  bolt: { role: '관통 사격', description: '적을 꿰뚫는 빠른 에너지 탄환을 연사합니다.' },
  poison: { role: '장판 제어', description: '적 위치에 지속 피해와 감속을 거는 장판을 생성합니다.' },
  healFire: { role: '3연사 · 치유', description: '부채꼴 3발 사격과 함께 6초마다 플레이어 HP를 회복합니다.' },
  breath: { role: '폭발 브레스', description: '주변 적들을 한꺼번에 날리는 광역 폭발 브레스를 뿜습니다.' },
  lightning: { role: '자동 낙뢰', description: '하늘에서 적에게 연쇄 번개를 떨어뜨려 강타합니다.' },
};

const RAW_PETS = [
  // 일반 (Common) — 16종
  ['corgi', '코기 독', '🐶', 'common', 'lunge', '#f59e0b', '#fef3c7'],
  ['cheese-cat', '치즈 냥이', '🐱', 'common', 'lunge', '#fb923c', '#ffedd5'],
  ['hamster', '햄찌 볼', '🐹', 'common', 'bolt', '#fcd34d', '#fef9c3'],
  ['bunny', '토끼 깡총', '🐰', 'common', 'bolt', '#f9a8d4', '#fce7f3'],
  ['chick', '병아리 삐약', '🐥', 'common', 'healFire', '#fde047', '#fefce8'],
  ['turtle', '꼬북 방패', '🐢', 'common', 'poison', '#34d399', '#d1fae5'],
  ['duck', '오리 꽥꽥', '🦆', 'common', 'bolt', '#38bdf8', '#e0f2fe'],
  ['frog', '개굴이', '🐸', 'common', 'poison', '#22c55e', '#bbf7d0'],
  ['piglet', '꿀꿀 돌진', '🐷', 'common', 'lunge', '#f472b6', '#fbcfe8'],
  ['sheep', '몽실 양', '🐑', 'common', 'healFire', '#e2e8f0', '#ffffff'],
  ['mouse-ninja', '생쥐 닌자', '🐭', 'common', 'bolt', '#94a3b8', '#f1f5f9'],
  ['raccoon', '너구리 도둑', '🦝', 'common', 'lunge', '#64748b', '#cbd5e1'],
  ['squirrel', '다람쥐 포수', '🐿️', 'common', 'bolt', '#d97706', '#fde68a'],
  ['hedgehog', '고슴도치', '🦔', 'common', 'lunge', '#a16207', '#fef08a'],
  ['rooster', '꼬꼬 파이터', '🐔', 'common', 'lunge', '#ef4444', '#fecaca'],
  ['snail', '달팽이 술사', '🐌', 'common', 'poison', '#84cc16', '#ecfccb'],

  // 희귀 (Rare) — 13종
  ['fox', '번개 여우', '🦊', 'rare', 'bolt', '#38bdf8', '#e0f2fe'],
  ['wolf', '은빛 늑대', '🐺', 'rare', 'lunge', '#94a3b8', '#e2e8f0'],
  ['owl', '밤부엉이', '🦉', 'rare', 'lightning', '#818cf8', '#e0e7ff'],
  ['bear', '불곰 탱커', '🐻', 'rare', 'lunge', '#92400e', '#fde68a'],
  ['panda', '대나무 판다', '🐼', 'rare', 'healFire', '#475569', '#f8fafc'],
  ['penguin', '빙하 펭귄', '🐧', 'rare', 'poison', '#0ea5e9', '#bae6fd'],
  ['hawk', '매의 눈', '🦅', 'rare', 'bolt', '#0284c7', '#e0f2fe'],
  ['cobra', '독사 코브라', '🐍', 'rare', 'poison', '#16a34a', '#bbf7d0'],
  ['croc', '강철 악어', '🐊', 'rare', 'lunge', '#15803d', '#86efac'],
  ['octopus', '문어 먹물', '🐙', 'rare', 'poison', '#7c3aed', '#ddd6fe'],
  ['bat-pet', '흡혈 박쥐', '🦇', 'rare', 'healFire', '#6b21a8', '#f5d0fe'],
  ['deer', '숲의 사슴', '🦌', 'rare', 'healFire', '#10b981', '#d1fae5'],
  ['dolphin', '파도 돌고래', '🐬', 'rare', 'bolt', '#06b6d4', '#cffafe'],

  // 영웅 (Epic) — 10종
  ['lion', '황금 사자', '🦁', 'epic', 'lunge', '#d97706', '#fef08a'],
  ['tiger', '백호 무사', '🐯', 'epic', 'lunge', '#f97316', '#ffedd5'],
  ['shark', '상어 포식자', '🦈', 'epic', 'breath', '#2563eb', '#bfdbfe'],
  ['scorpion', '사막 전갈', '🦂', 'epic', 'poison', '#b45309', '#fde68a'],
  ['peacock', '공작 마도사', '🦚', 'epic', 'lightning', '#0d9488', '#99f6e4'],
  ['rhino', '철갑 코뿔소', '🦏', 'epic', 'lunge', '#475569', '#e2e8f0'],
  ['flamingo', '화염 플라밍고', '🦩', 'epic', 'healFire', '#ec4899', '#fbcfe8'],
  ['kangaroo', '점프 캥거루', '🦘', 'epic', 'lunge', '#ca8a04', '#fef08a'],
  ['mammoth', '매머드 빙벽', '🦣', 'epic', 'breath', '#0284c7', '#bae6fd'],
  ['kraken', '크라켄 주니어', '🦑', 'epic', 'lightning', '#9333ea', '#e9d5ff'],

  // 전설 (Legend) — 7종
  ['phoenix', '불사조 치키', '🦅', 'legend', 'healFire', '#fb7185', '#fde047'],
  ['dragon', '미니 드래곤', '🐉', 'legend', 'breath', '#a855f7', '#facc15'],
  ['unicorn', '천상 유니콘', '🦄', 'legend', 'healFire', '#e879f9', '#fef9c3'],
  ['trex', '티라노 렉스', '🦖', 'legend', 'breath', '#15803d', '#fde047'],
  ['leviathan', '심해 레비아탄', '🐋', 'legend', 'lightning', '#1d4ed8', '#7dd3fc'],
  ['fenrir', '펜리르 울프', '🐺', 'legend', 'lightning', '#4f46e5', '#c7d2fe'],
  ['griffin', '그리핀 나이트', '🦅', 'legend', 'breath', '#d97706', '#fef08a'],

  // 신화 (Mythic) — 4종
  ['golden-dragon', '태초의 황금룡', '🐲', 'mythic', 'breath', '#f59e0b', '#fef08a'],
  ['eternal-phoenix', '영원의 피닉스', '🔥', 'mythic', 'healFire', '#ef4444', '#fde047'],
  ['void-guardian', '공허의 수호신', '👾', 'mythic', 'lightning', '#9333ea', '#f0abfc'],
  ['astral-star', '성좌 아스트랄', '🌟', 'mythic', 'lightning', '#ec4899', '#fef08a'],
];

export const PETS = RAW_PETS.map(([id, name, icon, rarity, style, color, accent]) => {
  const rarityInfo = PET_RARITIES[rarity];
  const styleInfo = PET_STYLE_DESC[style];
  return {
    id,
    name,
    icon,
    rarity,
    rarityLabel: rarityInfo.label,
    rarityColor: rarityInfo.color,
    powerMult: rarityInfo.powerMult,
    style,
    role: `${rarityInfo.label} · ${styleInfo.role}`,
    description: styleInfo.description,
    color,
    accent,
  };
});

const PETS_BY_RARITY = Object.keys(PET_RARITIES).reduce((acc, key) => {
  acc[key] = PETS.filter((p) => p.rarity === key);
  return acc;
}, {});

export function rollSinglePet(guaranteeEpicPlus = false) {
  const roll = Math.random() * 100;
  let rarity = 'common';
  if (guaranteeEpicPlus) {
    // 10-pull guarantee slot: Epic 64%, Legend 28%, Mythic 8%
    if (roll < 8) rarity = 'mythic';
    else if (roll < 36) rarity = 'legend';
    else rarity = 'epic';
  } else {
    if (roll < 2) rarity = 'mythic';
    else if (roll < 9) rarity = 'legend';
    else if (roll < 25) rarity = 'epic';
    else if (roll < 55) rarity = 'rare';
    else rarity = 'common';
  }
  const pool = PETS_BY_RARITY[rarity];
  return pool[Math.floor(Math.random() * pool.length)];
}
