import { useEffect, useRef, useState } from 'react';
import bmStyles from '@/styles/TangtangBlackMarket.module.css';
import { PETS, PET_RARITIES, PET_RARITY_ORDER, rollSinglePet } from '@/data/tangtangPets';

const world = { width: 2600, height: 1700 };
const stageSeconds = 70;
const SECRET_CODE = '123456789';
const BLACK_MARKET_KEY = 'tangtang-black-market-v1';
const LOBBY_META_KEY = 'tangtang-lobby-meta-v1';

const DEFAULT_LOBBY_META = {
  coins: 120,
  ownedPets: { corgi: true },
  petLevels: { corgi: 1 },
  equippedPet: 'corgi',
  upgrades: { atk: 0, hp: 0, armor: 0, speed: 0, haste: 0, greed: 0 },
};

const GACHA_SINGLE_COST = 40;
const GACHA_TEN_COST = 360;

const META_UPGRADES = [
  {
    id: 'atk',
    icon: '⚔️',
    name: '영구 공격력',
    maxLv: 10,
    baseCost: 30,
    stepCost: 25,
    effectText: (lv) => `기본 공격력 +${lv * 8}% (다음 +8%)`,
  },
  {
    id: 'hp',
    icon: '❤️',
    name: '영구 최대 체력',
    maxLv: 10,
    baseCost: 25,
    stepCost: 20,
    effectText: (lv) => `기본 최대 HP +${lv * 15} (다음 +15)`,
  },
  {
    id: 'armor',
    icon: '🛡️',
    name: '영구 방어력',
    maxLv: 10,
    baseCost: 35,
    stepCost: 30,
    effectText: (lv) => `기본 방어력 +${lv} (다음 +1)`,
  },
  {
    id: 'speed',
    icon: '👟',
    name: '영구 이동 속도',
    maxLv: 10,
    baseCost: 30,
    stepCost: 25,
    effectText: (lv) => `기본 이동속도 +${lv * 4}% (다음 +4%)`,
  },
  {
    id: 'haste',
    icon: '⚡',
    name: '영구 연사 속도',
    maxLv: 10,
    baseCost: 40,
    stepCost: 35,
    effectText: (lv) => `기본 연사력 +${lv * 5}% (다음 +5%)`,
  },
  {
    id: 'greed',
    icon: '💰',
    name: '코인 · XP 보너스',
    maxLv: 10,
    baseCost: 35,
    stepCost: 30,
    effectText: (lv) => `코인·경험치 +${lv * 10}% (다음 +10%)`,
  },
];

function getMetaUpgradeCost(spec, level) {
  return spec.baseCost + level * spec.stepCost;
}

function getPetUpgradeCost(level) {
  return 40 + level * 35;
}

const DEFAULT_BLACK_MARKET = {
  gold: 5,
  owned: {},
  equipped: {},
};

const BLACK_MARKET_ITEMS = [
  {
    id: 'instantAwaken',
    name: '즉시 무기 각성',
    icon: '⚡',
    price: 1,
    tag: '시작 패시브',
    description: '전투 시작과 동시에 선택한 무기가 5강 각성 상태로 출발합니다.',
  },
  {
    id: 'hyperFire',
    name: '광폭 연사 · 화력 2.5배',
    icon: '🔥',
    price: 2,
    tag: '공격 패시브',
    description: '모든 공격 피해 2.5배, 연사 속도 2배, 치명타 확률 +35%로 폭주합니다.',
  },
  {
    id: 'megaMagnet',
    name: '전장 자석 · XP 3배',
    icon: '🧲',
    price: 2,
    tag: '성장 패시브',
    description: '전장 전체의 경험치 보석을 끌어당기며 경험치 획득량이 3배가 됩니다.',
  },
  {
    id: 'omegaDrone',
    name: '암시장 오메가 드론',
    icon: '🛸',
    price: 3,
    tag: '자동 보조 무기',
    description: '주위를 도는 금지된 위성 드론이 가장 가까운 적에게 초고속 관통 플라즈마를 연사합니다.',
  },
  {
    id: 'timeSlow',
    name: '시간 왜곡장',
    icon: '❄️',
    price: 4,
    tag: '제어 패시브',
    description: '모든 적의 이동 속도가 55% 느려지고 플레이어 이동 속도가 45% 빨라집니다.',
  },
  {
    id: 'immortal',
    name: '불사신 실드',
    icon: '👑',
    price: 5,
    tag: '무적 패시브',
    description: '적과 부딪혀도 HP가 전혀 줄지 않는 완전 무적 오라를 두릅니다.',
  },
  {
    id: 'unlockGaster',
    name: '가스터 블래스터 (비밀 무기)',
    icon: '💀',
    price: 500,
    tag: '비밀 무기 해금',
    description: '금지된 샌즈의 무기 [가스터 블래스터]를 해금합니다. 각성 시 샌즈 패턴 & MISS 회피 · KR 업보 발동!',
    isWeaponUnlock: true,
    unlockWeaponId: 'gaster',
  },
  {
    id: 'unlockTrident',
    name: '삼지창 (비밀 무기)',
    icon: '🔱',
    price: 500,
    tag: '비밀 무기 해금',
    description: '포세이돈의 금지된 무기 [삼지창]을 해금합니다. 관통 투척 후 고속 회수 + 파도 번개 충격 & 해일 번개 필살기!',
    isWeaponUnlock: true,
    unlockWeaponId: 'trident',
  },
  {
    id: 'unlockSans',
    name: '샌즈 (비밀 캐릭터)',
    icon: '💀',
    price: 400,
    tag: '비밀 캐릭터 해금',
    description: '언더테일의 금지된 캐릭터 [샌즈]를 해금합니다. HP 1 고정 · 99.5% 절대 회피 MISS · 가스터 블래스터 전용 + ⚡ 시너지 콤보 추가 기술 발동!',
    isHeroUnlock: true,
    unlockHeroId: 'sans',
  },
  {
    id: 'unlockForsaken',
    name: '포세이큰 (비밀 캐릭터)',
    icon: '👁️',
    price: 450,
    tag: '비밀 캐릭터 해금',
    description: '어둠에 잠식된 비밀 캐릭터 [포세이큰]을 해금합니다. HP 220 · 공격력 +35% · 방어 +4 · 2.6초마다 부패 가시 & 침식 파동 자동 발사!',
    isHeroUnlock: true,
    unlockHeroId: 'forsaken',
  },
];

const HEROES = [
  {
    id: 'commando',
    name: '특공대원',
    icon: '🎖️',
    role: '밸런스',
    ultIcon: '🚀',
    ultName: '융단 폭격',
    ultSub: 'CARPET BOMBARDMENT',
    ultQuote: '전 화력 집중 — 궤도 융단 폭격 개시!',
    ultColor: '#facc15',
    ultBg: '#172554',
    perk: 'HP 110 · 공격력 +5% · 방어 +1 (올라운더 밸런스)',
    body: '#3b82f6',
    stroke: '#eff6ff',
    accent: '#facc15',
    stats: { maxHp: 110, speed: 245, damage: 1.05, fireRate: 1, armor: 1 },
  },
  {
    id: 'ninja',
    name: '그림자 닌자',
    icon: '🥷',
    role: '고속·치명',
    ultIcon: '⚔️',
    ultName: '일섬 난무',
    ultSub: 'PHANTOM BLADE STORM',
    ultQuote: '눈 깜짝할 사이에... 전부 베어주지.',
    ultColor: '#f43f5e',
    ultBg: '#3b0764',
    perk: '이동속도 +20% · 치명타 +18% · 연사 +10%',
    body: '#1e293b',
    stroke: '#f43f5e',
    accent: '#ef4444',
    stats: { maxHp: 85, speed: 295, fireRate: 1.1, critChance: 0.23 },
  },
  {
    id: 'titan',
    name: '강철 타이탄',
    icon: '🛡️',
    role: '초탱커',
    ultIcon: '🌋',
    ultName: '대지 분쇄',
    ultSub: 'TITAN EARTHSHAKER',
    ultQuote: '이 대지째로 산산조각 내주마!!',
    ultColor: '#34d399',
    ultBg: '#022c22',
    perk: 'HP 165 · 방어 +5 · 체력 재생 +1.4/s · 범위 +12%',
    body: '#0f766e',
    stroke: '#99f6e4',
    accent: '#34d399',
    stats: { maxHp: 165, speed: 215, armor: 5, regen: 1.4, area: 1.12 },
  },
  {
    id: 'pyro',
    name: '화염 마도사',
    icon: '🔥',
    role: '폭딜·광역',
    ultIcon: '☄️',
    ultName: '메테오 스톰',
    ultSub: 'METEOR APOCALYPSE',
    ultQuote: '하늘을 가르는 종말의 불꽃이여, 떨어져라!',
    ultColor: '#fb923c',
    ultBg: '#450a0a',
    perk: '공격력 +22% · 공격 범위 +22% · 탄환 크기 +15%',
    body: '#dc2626',
    stroke: '#fde68a',
    accent: '#f97316',
    stats: { maxHp: 95, speed: 240, damage: 1.22, area: 1.22, bulletSize: 1.15 },
  },
  {
    id: 'cyber',
    name: '사이버 거너',
    icon: '🤖',
    role: '속사·관통',
    ultIcon: '⚡',
    ultName: '오비탈 레이저',
    ultSub: 'ORBITAL ANNIHILATION',
    ultQuote: '전 타겟 락온 완료 — 궤도 주포 발사!',
    ultColor: '#38bdf8',
    ultBg: '#082f49',
    perk: '연사력 +24% · 기본 관통 +1 · 자석 범위 +150',
    body: '#06b6d4',
    stroke: '#ecfeff',
    accent: '#38bdf8',
    stats: { maxHp: 100, speed: 250, fireRate: 1.24, pierce: 2, magnet: 150 },
  },
  {
    id: 'vampire',
    name: '블러드 헌터',
    icon: '🧛',
    role: '흡혈·성장',
    ultIcon: '🩸',
    ultName: '블러드 노바',
    ultSub: 'CRIMSON ECLIPSE',
    ultQuote: '붉은 달 아래, 모든 생명을 내게 바쳐라!',
    ultColor: '#fb7185',
    ultBg: '#4c0519',
    perk: '치명 피해 +50% · XP +25% · 8처치마다 HP +4 흡혈',
    body: '#6b21a8',
    stroke: '#fda4af',
    accent: '#f43f5e',
    stats: { maxHp: 105, speed: 260, critDamage: 2.5, xpGain: 1.25, lifestealKills: 8 },
  },
  {
    id: 'sans',
    name: '샌즈',
    icon: '💀',
    role: '회피·업보(KR)',
    ultIcon: '💀',
    ultName: '배드 타임',
    ultSub: 'MEGALOVANIA',
    ultQuote: '* 끔찍한 시간을 보내고 싶나?',
    ultColor: '#38bdf8',
    ultBg: '#020617',
    perk: 'HP 1 고정 · 99.5% 절대 회피 MISS (0.5% 피격) · 가스터 블래스터 전용 · ⚡ 시너지 콤보(추가 기술 2종 + 필살기 초강화)!',
    body: '#f8fafc',
    stroke: '#38bdf8',
    accent: '#2563eb',
    stats: { maxHp: 1, speed: 285, damage: 1.15, fireRate: 1.25, critChance: 0.25, sansHero: true },
    blackMarketUnlockId: 'unlockSans',
  },
  {
    id: 'forsaken',
    name: '포세이큰',
    icon: '👁️',
    role: '부패·폭주',
    ultIcon: '👁️',
    ultName: '어둠의 침식',
    ultSub: 'FORSAKEN CORRUPTION',
    ultQuote: '모든 빛은 결국 어둠에 잠식된다...',
    ultColor: '#ef4444',
    ultBg: '#180207',
    perk: 'HP 220 · 공격력 +35% · 방어 +4 · 치명 피해 +80% · 2.6초마다 [부패 가시 & 침식 파동] 발사 · 10처치마다 흡혈!',
    body: '#09090b',
    stroke: '#ef4444',
    accent: '#ef4444',
    stats: {
      maxHp: 220,
      speed: 278,
      damage: 1.35,
      fireRate: 1.2,
      armor: 4,
      critChance: 0.25,
      critDamage: 2.8,
      area: 1.18,
      lifestealKills: 10,
      forsakenHero: true,
    },
    blackMarketUnlockId: 'unlockForsaken',
  },
];

const CHAPTER_BOSSES = [
  {
    id: 'neon-overlord',
    name: '네온 오버로드',
    title: 'CH.1 보스',
    hp: 9500,
    radius: 58,
    damage: 48,
    speed: 118,
    damageReduction: 0.15,
    color: '#0ea5e9',
    glow: '#38bdf8',
    bulletColor: '#38bdf8',
    pattern: 'neonRing',
    score: 2500,
    gold: 18,
  },
  {
    id: 'sand-titan',
    name: '샌드 타이탄',
    title: 'CH.2 보스',
    hp: 19000,
    radius: 64,
    damage: 60,
    speed: 115,
    damageReduction: 0.22,
    color: '#d97706',
    glow: '#facc15',
    bulletColor: '#fb923c',
    pattern: 'boulderBurst',
    score: 4200,
    gold: 24,
  },
  {
    id: 'frost-lich',
    name: '프로스트 리치',
    title: 'CH.3 보스',
    hp: 34000,
    radius: 62,
    damage: 74,
    speed: 126,
    damageReduction: 0.25,
    color: '#2563eb',
    glow: '#7dd3fc',
    bulletColor: '#7dd3fc',
    pattern: 'frostSpiral',
    score: 6500,
    gold: 30,
  },
  {
    id: 'inferno-lord',
    name: '인페르노 군주',
    title: 'FINAL BOSS',
    hp: 65000,
    radius: 72,
    damage: 92,
    speed: 136,
    damageReduction: 0.3,
    color: '#b91c1c',
    glow: '#fb7185',
    bulletColor: '#ef4444',
    pattern: 'hellfire',
    score: 12000,
    gold: 45,
  },
];

const stages = [
  {
    id: 'neon-park',
    name: '네온 공원',
    level: 1,
    text: '가볍게 몸을 푸는 첫 전장',
    background: '#101827',
    grid: 'rgba(148, 163, 184, 0.12)',
    decor: 'rgba(20, 184, 166, 0.12)',
    enemyColors: ['#fb923c', '#22c55e', '#ef4444'],
    hpFactor: 1,
    speedFactor: 1,
    spawnFactor: 1,
  },
  {
    id: 'dust-town',
    name: '먼지 도시',
    level: 2,
    text: '빠른 적이 늘어나는 좁은 거리',
    background: '#241a13',
    grid: 'rgba(251, 191, 36, 0.14)',
    decor: 'rgba(245, 158, 11, 0.14)',
    enemyColors: ['#f97316', '#eab308', '#dc2626'],
    hpFactor: 1.28,
    speedFactor: 1.1,
    spawnFactor: 1.18,
  },
  {
    id: 'ice-lab',
    name: '빙결 연구소',
    level: 3,
    text: '체력이 높은 적이 압박하는 구역',
    background: '#0d2534',
    grid: 'rgba(125, 211, 252, 0.16)',
    decor: 'rgba(56, 189, 248, 0.14)',
    enemyColors: ['#38bdf8', '#818cf8', '#14b8a6'],
    hpFactor: 1.6,
    speedFactor: 1.18,
    spawnFactor: 1.34,
  },
  {
    id: 'ember-core',
    name: '화염 코어',
    level: 4,
    text: '엘리트와 물량이 동시에 몰려오는 최종 구역',
    background: '#240f16',
    grid: 'rgba(248, 113, 113, 0.15)',
    decor: 'rgba(239, 68, 68, 0.15)',
    enemyColors: ['#ef4444', '#f97316', '#a855f7'],
    hpFactor: 2.05,
    speedFactor: 1.28,
    spawnFactor: 1.58,
  },
];

const weapons = [
  {
    id: 'blaster',
    displayName: '블래스터',
    displayDetail: '가장 가까운 적을 빠르게 추적',
    name: '블래스터',
    detail: '가장 가까운 적을 빠르게 추적',
    color: '#38bdf8',
    cooldown: 0.31,
    damage: 30,
    speed: 720,
    radius: 8,
    life: 0.98,
    pierce: 3,
  },
  {
    id: 'shotgun',
    displayName: '산탄총',
    displayDetail: '부채꼴로 여러 발을 발사',
    name: '산탄총',
    detail: '부채꼴로 여러 발을 발사',
    color: '#fb7185',
    cooldown: 0.64,
    damage: 17,
    speed: 640,
    radius: 7,
    life: 0.64,
    pierce: 2,
    count: 6,
    spread: 0.5,
  },
  {
    id: 'railgun',
    displayName: '레일건',
    displayDetail: '느리지만 강한 관통 한 방',
    name: '레일건',
    detail: '느리지만 강한 관통 한 방',
    color: '#f8fafc',
    cooldown: 0.78,
    damage: 74,
    speed: 960,
    radius: 6,
    life: 0.9,
    pierce: 7,
  },
  {
    id: 'boomer',
    displayName: '부메랑',
    displayDetail: '넓게 회전하며 관통 피해',
    name: '부메랑',
    detail: '넓게 회전하며 관통 피해',
    color: '#facc15',
    cooldown: 0.56,
    damage: 42,
    speed: 480,
    radius: 14,
    life: 1.22,
    pierce: 5,
  },
  {
    id: 'shockwave',
    displayName: '광역 충격파',
    displayDetail: '주변 전체를 터뜨리는 광역기',
    name: '광역 충격파',
    detail: '주변 전체를 터뜨리는 광역기',
    color: '#a78bfa',
    cooldown: 0.94,
    damage: 62,
    radius: 48,
    life: 0.36,
    blast: 148,
  },
  {
    id: 'flame',
    displayName: '화염방사기',
    displayDetail: '짧은 사거리의 지속 화염',
    name: '화염방사기',
    detail: '짧은 사거리의 지속 화염',
    color: '#f97316',
    cooldown: 0.12,
    damage: 11,
    speed: 360,
    radius: 18,
    life: 0.42,
    pierce: 3,
  },
  {
    id: 'frost',
    displayName: '냉동탄',
    displayDetail: '피해를 주고 적을 느리게 만듦',
    name: '냉동탄',
    detail: '피해를 주고 적을 느리게 만듦',
    color: '#7dd3fc',
    cooldown: 0.42,
    damage: 29,
    speed: 580,
    radius: 10,
    life: 1.0,
    pierce: 3,
    slow: 1.5,
  },
  {
    id: 'mine',
    displayName: '지뢰',
    displayDetail: '발밑에 폭발 함정을 설치',
    name: '지뢰',
    detail: '발밑에 폭발 함정을 설치',
    color: '#86efac',
    cooldown: 0.8,
    damage: 82,
    radius: 11,
    life: 4.5,
    blast: 108,
  },
  {
    id: 'bat',
    displayName: '배트',
    displayDetail: '1.2초마다 초강력 근접 강타 (큰 적 2방)',
    name: '배트',
    detail: '1.2초마다 초강력 근접 강타 (큰 적 2방)',
    color: '#f59e0b',
    cooldown: 1.2,
    damage: 225,
    radius: 132,
    life: 0.28,
    arc: Math.PI * 1.02,
    knockback: 185,
  },
  {
    id: 'kunai',
    displayName: '쿠나이',
    displayDetail: '가까운 적을 끝까지 유도 추적하는 고속 표창',
    name: '쿠나이',
    detail: '가까운 적을 끝까지 유도 추적하는 고속 표창',
    color: '#38bdf8',
    cooldown: 0.28,
    damage: 28,
    speed: 820,
    radius: 7,
    life: 1.05,
    pierce: 2,
    homing: true,
  },
  {
    id: 'katana',
    displayName: '카타나',
    displayDetail: '앞뒤 양방향으로 날카로운 검기를 동시에 베어냄',
    name: '카타나',
    detail: '앞뒤 양방향으로 날카로운 검기를 동시에 베어냄',
    color: '#f43f5e',
    cooldown: 0.72,
    damage: 66,
    radius: 112,
    life: 0.22,
    arc: Math.PI * 0.58,
    knockback: 45,
  },
  {
    id: 'lightchaser',
    displayName: '빛의 창',
    displayDetail: '거대한 황금 초승달 검기를 날려 적을 썰어버림',
    name: '빛의 창',
    detail: '거대한 황금 초승달 검기를 날려 적을 썰어버림',
    color: '#fde047',
    cooldown: 0.58,
    damage: 58,
    speed: 690,
    radius: 22,
    life: 0.85,
    pierce: 6,
    count: 2,
    spread: 0.34,
  },
  {
    id: 'gaster',
    displayName: '가스터 블래스터',
    displayDetail: '쌍둥이 초거대 해골 레이저 & KR 업보! 각성 시 8연 샌즈 서클·14연 뼈다귀·6연 푸른 영혼 폭격!',
    name: '가스터 블래스터',
    detail: '쌍둥이 초거대 해골 레이저 & KR 업보! 각성 시 8연 샌즈 서클·14연 뼈다귀·6연 푸른 영혼 폭격!',
    color: '#38bdf8',
    cooldown: 0.62,
    damage: 220,
    radius: 44,
    life: 0.78,
    chargeTime: 0.18,
    beamLength: 920,
    blackMarketUnlockId: 'unlockGaster',
  },
  {
    id: 'trident',
    displayName: '삼지창',
    displayDetail: '초고속 3연 관통 투척·회수 + 낙뢰 해일 폭파! 각성 시 7연 황금 포세이돈 폭풍!',
    name: '삼지창',
    detail: '초고속 3연 관통 투척·회수 + 낙뢰 해일 폭파! 각성 시 7연 황금 포세이돈 폭풍!',
    color: '#2dd4bf',
    cooldown: 0.38,
    damage: 195,
    speed: 960,
    radius: 28,
    life: 1.35,
    pierce: 999,
    slow: 1.2,
    blackMarketUnlockId: 'unlockTrident',
  },
];

// 14종 무기별 전용 필살기 (컷씬 + 고유 궁극기 패턴!)
const WEAPON_ULTIMATES = {
  blaster: {
    icon: '🔫',
    name: '하이퍼 플라즈마 난사',
    sub: 'HYPER PLASMA BARRAGE',
    quote: '전방위 플라즈마 폭풍 — 전원 소탕 개시!',
    detail: '360° + 전방 집중 유도 플라즈마 24연발 초고속 난사',
    accent: '#38bdf8',
    bg: '#0c2748',
  },
  shotgun: {
    icon: '💥',
    name: '지옥의 산탄 폭풍',
    sub: 'HELLFIRE BUCKSHOT',
    quote: '한 발도 피할 곳은 없다! 전탄 일제 발사!',
    detail: '조준 방향 24연 초대형 관통 산탄 + 근접 폭발 충격파',
    accent: '#fb7185',
    bg: '#4c0519',
  },
  railgun: {
    icon: '⚡',
    name: '궤도 초전자포',
    sub: 'ORBITAL HYPER RAILGUN',
    quote: '최대 출력 충전 완료 — 일직선 증발!',
    detail: '조준 방향 초고속 관통 레일 빔 9연사 + 직선 초폭발',
    accent: '#e2e8f0',
    bg: '#0f172a',
  },
  boomer: {
    icon: '🪃',
    name: '황금 차크람 회오리',
    sub: 'GOLDEN CYCLONE STORM',
    quote: '끝없이 돌아오는 황금 칼날의 폭풍!',
    detail: '초대형 황금 각성 차크람 12개 360° 왕복 회전 폭풍',
    accent: '#facc15',
    bg: '#422006',
  },
  shockwave: {
    icon: '🟣',
    name: '슈퍼노바 대폭발',
    sub: 'SUPER NOVA COLLAPSE',
    quote: '공간째로 무너져라! 슈퍼노바!',
    detail: '4중 연속 초대형 보라 충격파(최대 440px) + 전원 둔화',
    accent: '#c084fc',
    bg: '#2e1065',
  },
  flame: {
    icon: '🔥',
    name: '인페르노 메테오',
    sub: 'INFERNO METEOR STORM',
    quote: '모든 것을 재로 태워버릴 지옥의 불바다!',
    detail: '초대형 푸른 화염 지대 8개 + 광역 메테오 연쇄 폭발',
    accent: '#fb923c',
    bg: '#450a0a',
  },
  frost: {
    icon: '❄️',
    name: '절대영도 빙결폭풍',
    sub: 'ABSOLUTE ZERO BLIZZARD',
    quote: '시간마저 얼어붙어라 — 절대영도!',
    detail: '전장 전체 3.2초 극강 빙결 + 20연 관통 빙결창 폭풍',
    accent: '#7dd3fc',
    bg: '#082f49',
  },
  mine: {
    icon: '💣',
    name: '융단 지뢰 폭격',
    sub: 'CARPET MINE ANNIHILATION',
    quote: '발 디딜 틈 없는 완벽한 폭파 지대!',
    detail: '유도 상어 미사일 10발 + 주변 12개 즉폭 지뢰 링 투하',
    accent: '#4ade80',
    bg: '#052e16',
  },
  bat: {
    icon: '🏏',
    name: '그랜드 슬램 홈런',
    sub: 'GRAND SLAM ANNIHILATION',
    quote: '저 하늘 끝까지 날려주마! 만루 홈런!!',
    detail: '360° 초대형 황금 풀스윙(340px) + 극대 넉백 & 충격파',
    accent: '#f59e0b',
    bg: '#451a03',
  },
  kunai: {
    icon: '🗡️',
    name: '천본 앵화 수리검',
    sub: 'THOUSAND KUNAI STORM',
    quote: '그림자 속에서 쏟아지는 무한의 칼날!',
    detail: '초고속 자동 유도 관통 쿠나이 24연발 일제 투척',
    accent: '#93c5fd',
    bg: '#1e1b4b',
  },
  katana: {
    icon: '⚔️',
    name: '천지 양단 일섬',
    sub: 'HEAVEN & EARTH SLASH',
    quote: '일섬... 이 세계의 모든 것을 베어 가른다.',
    detail: '360° 홍련 대참격 + 12방향 검기 파동 + 체력 대량 흡혈',
    accent: '#f43f5e',
    bg: '#3b0764',
  },
  lightchaser: {
    icon: '✨',
    name: '성광의 심판 검무',
    sub: 'DIVINE LIGHT JUDGEMENT',
    quote: '찬란한 황금빛이 어둠을 심판한다!',
    detail: '거대 황금 초승달 검기 14연사 + 최대 HP 25% 회복',
    accent: '#fde047',
    bg: '#3f2c06',
  },
  gaster: {
    icon: '💀',
    name: '메갈로바니아 · 배드 타임',
    sub: 'MEGALOVANIA · BAD TIME',
    quote: '* 끔찍한 시간을 보내고 싶나?',
    detail: '8기 회전 가스터 블래스터 서클 + 16연 뼈다귀 탄막 & KR 업보',
    accent: '#38bdf8',
    bg: '#020617',
  },
  trident: {
    icon: '🔱',
    name: '포세이돈의 해일 번개',
    sub: 'POSEIDON TSUNAMI WRATH',
    quote: '거친 파도와 천둥이 너희를 삼키리라!',
    detail: '16방향 초대형 황금 삼지창 왕복 폭풍 + 20연 천둥 낙뢰 & 초대형 해일 폭발',
    accent: '#2dd4bf',
    bg: '#042f2e',
  },
};

// 5종 강화 (패시브 스탯 업그레이드, 각 1~5레벨)
const PASSIVES = [
  {
    id: 'damage',
    icon: '⚔️',
    name: '공격력 강화',
    text: '모든 무기·능력 피해 +18% (치명타 +3%)',
  },
  {
    id: 'firerate',
    icon: '⚡',
    name: '연사 · 쿨타임 감소',
    text: '무기·능력 발사 속도 +14%',
  },
  {
    id: 'speed',
    icon: '👟',
    name: '이동 속도 강화',
    text: '이동 속도 +11% · 회피 무적 +0.06초',
  },
  {
    id: 'vitality',
    icon: '❤️',
    name: '체력 · 방어 강화',
    text: '최대 HP +24 · 회복 +32 · 방어 +2 · 재생 +0.4',
  },
  {
    id: 'utility',
    icon: '🧲',
    name: '자석 · 범위 강화',
    text: '자석 +60 · 공격 범위 +12% · 경험치 +12%',
  },
];

// 7종 능력 (로켓 발사기 같은 자동 발동 전투 능력, 각 1~5레벨 · 5레벨 시 각성!)
const ACTIVE_SKILLS = [
  {
    id: 'rocket',
    icon: '🚀',
    name: '로켓 발사기',
    text: '강력한 폭발 로켓을 발사해 주변 적을 광역 폭파',
    awakenName: '샤크 바주카',
    awakenText: '5LV 각성! 초대형 상어 미사일 2연사 + 거대 폭발!',
  },
  {
    id: 'guardian',
    icon: '⚙️',
    name: '수호자 칼날',
    text: '주변을 도는 회전 톱날로 접근하는 적을 베고 밀어냄',
    awakenName: '수호의 방어막',
    awakenText: '5LV 각성! 황금 톱날 6개가 고속 영구 회전 + 강력 넉백!',
  },
  {
    id: 'lightning',
    icon: '🌩️',
    name: '번개 발사기',
    text: '하늘에서 적에게 자동 번개를 떨어뜨려 강타',
    awakenName: '천둥 배터리',
    awakenText: '5LV 각성! 1.15초마다 적 5마리 황금 낙뢰 + 감속!',
  },
  {
    id: 'molotov',
    icon: '🔥',
    name: '화염병',
    text: '적 위치에 불타는 화염 지대를 던져 지속 화상 피해',
    awakenName: '지옥 불바다',
    awakenText: '5LV 각성! 초대형 푸른 화염 지대 4개 투척 + 극딜!',
  },
  {
    id: 'drone',
    icon: '🛸',
    name: '공격 드론',
    text: '따라다니는 드론이 가장 가까운 적에게 유도 미사일 연사',
    awakenName: '디스트로이어',
    awakenText: '5LV 각성! 쌍둥이 황금 드론의 초고속 유도 미사일 폭격!',
  },
  {
    id: 'soccer',
    icon: '⚽',
    name: '반사 축구공',
    text: '적과 벽에 계속 튕기며 타격하는 고속 축구공 발사',
    awakenName: '양자 볼',
    awakenText: '5LV 각성! 4개의 네온 양자 볼이 튕길 때마다 충격파 폭발!',
  },
  {
    id: 'boomerang',
    icon: '🪃',
    name: '톱니 차크람',
    text: '날아갔다가 되돌아오며 적을 왕복 관통 절단',
    awakenName: '자석 휠',
    awakenText: '5LV 각성! 초대형 황금 톱니 3개가 넓게 왕복하며 전부 절단!',
  },
];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const randomBetween = (min, max) => min + Math.random() * (max - min);

function getStage(game) {
  return stages[clamp(game.stageIndex, 0, stages.length - 1)];
}

function createGame(startStage = 0, bmEquipped = {}, heroIndex = 0, lobbyMeta = DEFAULT_LOBBY_META) {
  const bm = bmEquipped && typeof bmEquipped === 'object' ? { ...bmEquipped } : {};
  const meta = lobbyMeta && typeof lobbyMeta === 'object' ? lobbyMeta : DEFAULT_LOBBY_META;
  const up = meta.upgrades ?? {};
  const hero = HEROES[clamp(heroIndex, 0, HEROES.length - 1)] ?? HEROES[0];
  const hs = hero.stats ?? {};
  const baseMaxHp = hs.sansHero ? 1 : (hs.maxHp ?? 100) + (up.hp ?? 0) * 15;
  const maxHp = hs.sansHero ? 1 : bm.immortal ? 999 : baseMaxHp;
  const baseSpeed = Math.round((hs.speed ?? 245) * (1 + (up.speed ?? 0) * 0.04));
  const baseDamage = (hs.damage ?? 1) * (1 + (up.atk ?? 0) * 0.08);
  const baseFireRate = (hs.fireRate ?? 1) * (1 + (up.haste ?? 0) * 0.05);
  const baseMagnet = hs.magnet ?? 110;
  const baseCritChance = hs.critChance ?? 0.05;
  const baseXpGain = (hs.xpGain ?? 1) * (1 + (up.greed ?? 0) * 0.1);
  const coinBonus = 1 + (up.greed ?? 0) * 0.1;

  const equippedPetId = meta.equippedPet && meta.ownedPets?.[meta.equippedPet] ? meta.equippedPet : null;
  const petSpec = equippedPetId ? PETS.find((p) => p.id === equippedPetId) : null;
  const petLevel = equippedPetId ? clamp(Number(meta.petLevels?.[equippedPetId]) || 1, 1, 5) : 1;

  return {
    running: false,
    pausedForUpgrade: false,
    over: false,
    time: 0,
    chapterTime: 0,
    bossCycle: 0,
    bossActive: false,
    bossFlash: 0,
    bossClearFlash: 0,
    bossBannerName: '',
    bossClearText: '',
    score: 0,
    runCoins: 0,
    kills: 0,
    level: 1,
    xp: 0,
    nextXp: 40,
    shake: 0,
    stageIndex: startStage,
    startStage,
    stageFlash: 0,
    awakenFlash: 0,
    awakenBannerCustom: '',
    abilityAwakenFlash: 0,
    abilityAwakenName: '',
    ultFlash: 0,
    ultImpactFlash: 0,
    ultBannerName: '',
    ultCutscene: null,
    sansPatternIndex: 0,
    aimMode: 'manual',
    bm,
    heroIndex: clamp(heroIndex, 0, HEROES.length - 1),
    pet: petSpec
      ? {
          id: petSpec.id,
          name: petSpec.name,
          icon: petSpec.icon,
          rarity: petSpec.rarity,
          rarityColor: petSpec.rarityColor,
          powerMult: petSpec.powerMult ?? 1,
          style: petSpec.style ?? 'lunge',
          color: petSpec.color,
          accent: petSpec.accent,
          level: petLevel,
          x: world.width / 2 - 44,
          y: world.height / 2 + 24,
          cooldown: 0.7,
          healTimer: 5.5,
          lungeTimer: 0,
          lungeVx: 0,
          lungeVy: 0,
        }
      : null,
    droneCooldown: 0,
    skillTimers: {
      rocket: 1.2,
      lightning: 1.5,
      molotov: 1.8,
      drone: 0.45,
      soccer: 1.4,
      boomerang: 1.6,
    },
    goldKillCounter: 0,
    vampireKillCounter: 0,
    player: {
      x: world.width / 2,
      y: world.height / 2,
      radius: 18,
      hp: maxHp,
      maxHp,
      speed: bm.timeSlow ? Math.round(baseSpeed * 1.45) : baseSpeed,
      damage: bm.hyperFire ? baseDamage * 2.5 : baseDamage,
      fireRate: bm.hyperFire ? baseFireRate * 2 : baseFireRate,
      magnet: bm.megaMagnet ? 2400 : baseMagnet,
      pierce: hs.pierce ?? 1,
      critChance: bm.hyperFire ? Math.min(0.9, baseCritChance + 0.35) : baseCritChance,
      critDamage: hs.critDamage ?? 2,
      armor: (hs.armor ?? 0) + (up.armor ?? 0),
      regen: hs.regen ?? 0,
      area: hs.area ?? 1,
      bulletSize: hs.bulletSize ?? 1,
      xpGain: bm.megaMagnet ? baseXpGain * 3 : baseXpGain,
      coinBonus,
      invincibleBonus: 0,
      weaponIndex: 0,
      cooldown: 0,
      invincible: 0,
      slowTimer: 0,
      aimAngle: 0,
      ultCharge: 100,
      sansHero: Boolean(hs.sansHero),
      sansMode: Boolean(hs.sansHero),
      sansDodgeCd: 0,
      sansBoneTimer: 2.0,
      sansSynergyTimer: 2.6,
      sansSynergyStep: 0,
      forsakenHero: Boolean(hs.forsakenHero),
      forsakenTimer: 2.2,
      forsakenStep: 0,
    },
    enemies: [],
    bullets: [],
    enemyBullets: [],
    skillProjectiles: [],
    fireZones: [],
    lightningEffects: [],
    floatingTexts: [],
    gems: [],
    particles: [],
    spawnTimer: 0,
    eliteTimer: Math.max(13, 24 - startStage * 3),
    upgrades: [],
    weaponLevels: weapons.reduce((result, weapon) => ({ ...result, [weapon.id]: 0 }), {}),
    awakenedWeapons: {},
    passiveLevels: PASSIVES.reduce((result, p) => ({ ...result, [p.id]: 0 }), {}),
    skillLevels: ACTIVE_SKILLS.reduce((result, sk) => ({ ...result, [sk.id]: 0 }), {}),
    awakenedSkills: {},
    sounds: [],
  };
}

function spawnChapterBoss(game, camera) {
  const stageIdx = clamp(game.stageIndex, 0, CHAPTER_BOSSES.length - 1);
  const spec = CHAPTER_BOSSES[stageIdx];
  const cycleScale = 1 + (game.bossCycle ?? 0);
  const hp = Math.round(spec.hp * cycleScale);
  const angle = Math.random() * Math.PI * 2;
  const spawnDist = Math.min(camera.width, camera.height) * 0.42 + 120;
  const x = clamp(game.player.x + Math.cos(angle) * spawnDist, 100, world.width - 100);
  const y = clamp(game.player.y + Math.sin(angle) * spawnDist, 100, world.height - 100);

  game.enemies.push({
    x,
    y,
    radius: spec.radius,
    hp,
    maxHp: hp,
    damage: Math.round(spec.damage * (1 + (game.bossCycle ?? 0) * 0.35)),
    speed: spec.speed,
    damageReduction: spec.damageReduction ?? 0.2,
    color: spec.color,
    glow: spec.glow,
    bulletColor: spec.bulletColor,
    pattern: spec.pattern,
    worth: 95,
    boss: true,
    bossName: game.bossCycle > 0 ? `${spec.name} Mk.${game.bossCycle + 1}` : spec.name,
    bossTitle: spec.title,
    bossScore: Math.round(spec.score * cycleScale),
    bossGold: spec.gold,
    slow: 0,
    shootTimer: 1.15,
    dashTimer: 3.1,
    novaTimer: 4.8,
    dashWindup: 0,
    dashActive: 0,
    dashChain: 0,
    dashAngle: 0,
    spiralOffset: 0,
  });

  game.bossActive = true;
  game.bossFlash = 2.8;
  game.bossBannerName = `${spec.title} · ${spec.name}`;
  game.shake = 18;
  addParticles(game, x, y, spec.glow, 48);
  queueSound(game, 'boss');
}

function getWeaponUpgrade(game) {
  const weapon = weapons[game.player.weaponIndex];
  const level = game.weaponLevels[weapon.id] ?? 0;
  const isAwakened = Boolean(game.awakenedWeapons[weapon.id]);
  const nextLv = Math.min(level + 1, 5);

  return {
    id: `weapon:${weapon.id}`,
    badge: isAwakened ? '무기 각성 강화' : nextLv === 5 ? '★ 무기 LV 5 각성!' : `무기 LV ${nextLv}/5`,
    isAwakenPick: !isAwakened && nextLv === 5,
    name: isAwakened
      ? `${weapon.displayName ?? weapon.name} 각성 강화`
      : `${weapon.displayName ?? weapon.name} 강화`,
    text: isAwakened ? '각성 무기의 화력과 범위를 추가로 강화' : '5레벨 달성 시 무기 각성 발동!',
  };
}

function pickUpgrades(game) {
  const availableSkills = ACTIVE_SKILLS.filter((sk) => (game.skillLevels?.[sk.id] ?? 0) < 5);
  const ownedSkills = availableSkills
    .filter((sk) => (game.skillLevels?.[sk.id] ?? 0) > 0)
    .sort(() => Math.random() - 0.5);
  const freshSkills = availableSkills
    .filter((sk) => (game.skillLevels?.[sk.id] ?? 0) === 0)
    .sort(() => Math.random() - 0.5);

  const skillOrder =
    ownedSkills.length > 0 && Math.random() < 0.65
      ? [ownedSkills[0], ...[...ownedSkills.slice(1), ...freshSkills].sort(() => Math.random() - 0.5)]
      : [...availableSkills].sort(() => Math.random() - 0.5);

  const availablePassives = PASSIVES.filter((p) => (game.passiveLevels?.[p.id] ?? 0) < 5).sort(
    () => Math.random() - 0.5,
  );

  const formatSkillCard = (sk) => {
    const nextLv = (game.skillLevels?.[sk.id] ?? 0) + 1;
    const willAwaken = nextLv >= 5;
    return {
      id: `skill:${sk.id}`,
      badge: willAwaken ? `★ 능력 5LV 각성 · ${sk.awakenName}` : `능력 LV ${nextLv}/5`,
      isAwakenPick: willAwaken,
      name: `${sk.icon} ${sk.name}`,
      text: willAwaken ? sk.awakenText : sk.text,
    };
  };

  const formatPassiveCard = (p) => {
    const nextLv = (game.passiveLevels?.[p.id] ?? 0) + 1;
    return {
      id: `passive:${p.id}`,
      badge: `강화 LV ${nextLv}/5`,
      isAwakenPick: false,
      name: `${p.icon} ${p.name}`,
      text: p.text,
    };
  };

  const picks = [];
  const mainWeapon = weapons[game.player.weaponIndex];
  const weaponAlreadyAwakened = Boolean(game.awakenedWeapons[mainWeapon.id]);

  // Card 1: Main weapon upgrade (or a 2nd Active Skill once main weapon is already awakened 60% of the time)
  if (!weaponAlreadyAwakened || Math.random() < 0.4 || skillOrder.length < 2) {
    picks.push(getWeaponUpgrade(game));
  } else {
    picks.push(formatSkillCard(skillOrder.shift()));
  }

  // Card 2: Active Skill (능력 7종)
  if (skillOrder.length > 0) {
    picks.push(formatSkillCard(skillOrder.shift()));
  }

  // Card 3: Passive Upgrade (강화 5종), fallback to another skill
  if (availablePassives.length > 0) {
    picks.push(formatPassiveCard(availablePassives.shift()));
  } else if (skillOrder.length > 0) {
    picks.push(formatSkillCard(skillOrder.shift()));
  }

  while (picks.length < 3) {
    if (skillOrder.length > 0) {
      picks.push(formatSkillCard(skillOrder.shift()));
    } else if (availablePassives.length > 0) {
      picks.push(formatPassiveCard(availablePassives.shift()));
    } else {
      picks.push({
        id: 'bonus:heal',
        badge: '보너스 효과',
        isAwakenPick: false,
        name: '✨ 초월 회복 & 화력',
        text: '모든 능력·강화 완료! HP 완전 회복 & 화력 +12%',
      });
    }
  }

  return picks;
}

function applyDamageToEnemy(enemy, rawDamage) {
  const reduction = enemy.damageReduction ?? 0;
  enemy.hp -= rawDamage * (1 - reduction);
}

function spawnEnemy(game, camera) {
  const stage = getStage(game);
  const edge = Math.floor(Math.random() * 4);
  const margin = 120;
  let x = camera.x + randomBetween(-margin, camera.width + margin);
  let y = camera.y + randomBetween(-margin, camera.height + margin);

  if (edge === 0) y = camera.y - margin;
  if (edge === 1) x = camera.x + camera.width + margin;
  if (edge === 2) y = camera.y + camera.height + margin;
  if (edge === 3) x = camera.x - margin;

  const minute = Math.floor(game.time / 60);
  const stageBonus = stage.level - 1;
  const palette = stage.enemyColors;
  const roll = Math.random();
  const latePool = game.time >= 14 || stage.level >= 2;

  let kind = 'normal';
  if (latePool && roll < 0.085) kind = 'bomber';
  else if (latePool && roll < 0.165) kind = 'shielder';
  else if (latePool && roll < 0.24) kind = 'ghost';
  else if (roll < 0.34) kind = 'shooter';
  else if (roll < 0.44) kind = 'splitter';
  else if (roll < 0.52 + minute * 0.012 + stageBonus * 0.02) kind = 'brute';
  else if (roll < 0.74 + minute * 0.015) kind = 'runner';

  const specs = {
    normal: {
      radius: 18,
      baseHp: 32,
      damage: 11,
      speed: 78,
      color: palette[0],
      worth: 5,
    },
    runner: {
      radius: 14,
      baseHp: 20,
      damage: 10,
      speed: 116,
      color: palette[1],
      worth: 4,
    },
    brute: {
      radius: 27,
      baseHp: 64,
      damage: 19,
      speed: 68,
      color: palette[2],
      worth: 9,
    },
    shooter: {
      radius: 17,
      baseHp: 28,
      damage: 12,
      speed: 72,
      color: '#c084fc',
      worth: 8,
      shootTimer: randomBetween(1.4, 2.5),
    },
    bomber: {
      radius: 16,
      baseHp: 24,
      damage: 24,
      speed: 112,
      color: '#ef4444',
      worth: 8,
      blastRadius: 76,
    },
    splitter: {
      radius: 22,
      baseHp: 44,
      damage: 13,
      speed: 72,
      color: '#10b981',
      worth: 7,
    },
    shielder: {
      radius: 24,
      baseHp: 72,
      damage: 16,
      speed: 64,
      color: '#64748b',
      worth: 11,
      damageReduction: 0.35,
    },
    ghost: {
      radius: 16,
      baseHp: 26,
      damage: 14,
      speed: 84,
      color: '#818cf8',
      worth: 8,
      phaseTimer: randomBetween(1.6, 2.6),
      phaseDash: 0,
    },
  };

  const s = specs[kind];
  const hp = Math.round((s.baseHp + minute * 8 + stageBonus * 9) * stage.hpFactor);

  game.enemies.push({
    x: clamp(x, 30, world.width - 30),
    y: clamp(y, 30, world.height - 30),
    kind,
    radius: s.radius,
    hp,
    maxHp: hp,
    damage: Math.round(s.damage + stageBonus * 3),
    speed: (s.speed + minute * 5 + stageBonus * 5) * stage.speedFactor,
    color: s.color,
    worth: s.worth + stageBonus,
    slow: 0,
    damageReduction: s.damageReduction ?? 0,
    shootTimer: s.shootTimer ?? 0,
    blastRadius: s.blastRadius ?? 0,
    phaseTimer: s.phaseTimer ?? 0,
    phaseDash: s.phaseDash ?? 0,
  });
}

function spawnElite(game, camera) {
  const stage = getStage(game);
  const x = clamp(camera.x + randomBetween(80, camera.width - 80), 60, world.width - 60);
  const y = camera.y - 100;
  const hp = Math.round((220 + game.time * 4 + stage.level * 30) * stage.hpFactor);

  game.enemies.push({
    x,
    y: clamp(y, 60, world.height - 60),
    radius: 34,
    hp,
    maxHp: hp,
    damage: 26 + stage.level * 4,
    speed: (62 + stage.level * 4) * stage.speedFactor,
    color: '#8b5cf6',
    worth: 26 + stage.level * 4,
    elite: true,
    slow: 0,
  });
}

function applyUpgrade(game, id) {
  const player = game.player;

  if (id.startsWith('weapon:')) {
    const weaponId = id.slice('weapon:'.length);
    const nextLevel = (game.weaponLevels[weaponId] ?? 0) + 1;
    game.weaponLevels[weaponId] = nextLevel;

    if (nextLevel >= 5 && !game.awakenedWeapons[weaponId]) {
      game.awakenedWeapons[weaponId] = true;
      game.awakenFlash = 2.4;
      game.awakenBannerCustom = '';
      game.shake = 16;
      queueSound(game, 'awake');
      addParticles(game, player.x, player.y, weapons.find((weapon) => weapon.id === weaponId)?.color ?? '#facc15', 42);
      if (weaponId === 'gaster') {
        applySansAwakening(game);
      }
    } else {
      queueSound(game, 'upgrade');
    }
  } else if (id.startsWith('passive:')) {
    const pId = id.slice('passive:'.length);
    const prevLv = game.passiveLevels?.[pId] ?? 0;
    const nextLv = Math.min(5, prevLv + 1);
    game.passiveLevels = { ...(game.passiveLevels ?? {}), [pId]: nextLv };

    if (pId === 'damage') {
      player.damage *= 1.18;
      player.critChance = Math.min(0.85, player.critChance + 0.03);
    }
    if (pId === 'firerate') {
      player.fireRate *= 1.14;
    }
    if (pId === 'speed') {
      player.speed *= 1.11;
      player.invincibleBonus += 0.06;
    }
    if (pId === 'vitality') {
      if (player.sansHero) {
        player.maxHp = 1;
        player.hp = 1;
        player.invincibleBonus += 0.08;
        player.damage *= 1.08;
      } else {
        player.maxHp += 24;
        player.hp = Math.min(player.maxHp, player.hp + 32);
        player.armor += 2;
        player.regen += 0.4;
      }
    }
    if (pId === 'utility') {
      player.magnet += 60;
      player.area *= 1.12;
      player.xpGain *= 1.12;
    }
    queueSound(game, 'upgrade');
  } else if (id.startsWith('skill:')) {
    const skId = id.slice('skill:'.length);
    const skill = ACTIVE_SKILLS.find((item) => item.id === skId);
    const prevLv = game.skillLevels?.[skId] ?? 0;
    const nextLv = Math.min(5, prevLv + 1);
    game.skillLevels = { ...(game.skillLevels ?? {}), [skId]: nextLv };

    if (game.skillTimers && skId in game.skillTimers) {
      game.skillTimers[skId] = Math.min(game.skillTimers[skId], 0.15);
    }

    if (nextLv >= 5 && !game.awakenedSkills?.[skId]) {
      game.awakenedSkills = { ...(game.awakenedSkills ?? {}), [skId]: true };
      game.abilityAwakenFlash = 2.4;
      game.abilityAwakenName = skill ? `${skill.icon} ${skill.name} → ${skill.awakenName}` : skId;
      game.shake = 16;
      queueSound(game, 'awake');
      addParticles(game, player.x, player.y, '#facc15', 44);
    } else {
      queueSound(game, 'upgrade');
    }
  } else if (id === 'bonus:heal') {
    player.hp = player.maxHp;
    player.damage *= 1.12;
    queueSound(game, 'upgrade');
  }

  game.pausedForUpgrade = false;
  game.upgrades = [];
}

function addParticles(game, x, y, color, amount = 8) {
  for (let i = 0; i < amount; i += 1) {
    game.particles.push({
      x,
      y,
      vx: randomBetween(-120, 120),
      vy: randomBetween(-120, 120),
      life: randomBetween(0.28, 0.58),
      color,
      size: randomBetween(2, 5),
    });
  }
}

function addFloatingText(game, x, y, text, color = '#ffffff', size = 18) {
  if (!game.floatingTexts) game.floatingTexts = [];
  if (game.floatingTexts.length > 28) game.floatingTexts.shift();
  game.floatingTexts.push({
    x,
    y,
    vy: -56,
    text,
    color,
    size,
    life: 0.92,
    maxLife: 0.92,
  });
}

function applySansAwakening(game) {
  const player = game.player;
  if (!player || player.sansMode) return;
  player.sansMode = true;
  player.sansDodgeCd = 0;
  player.speed = Math.round(player.speed * 1.22);
  player.fireRate *= 1.3;
  player.critChance = Math.min(0.95, (player.critChance ?? 0.08) + 0.2);
  game.awakenBannerCustom = '💀 BAD TIME · 샌즈 모드 각성! (MISS 회피 · KR 업보 · 샌즈 패턴)';
  addFloatingText(game, player.x, player.y - 36, '* BAD TIME...', '#38bdf8', 22);
  addParticles(game, player.x, player.y, '#38bdf8', 36);
}

function trySansDodge(game) {
  const player = game.player;
  const activeWeapon = weapons[player.weaponIndex];
  const hasGasterSans = Boolean(player.sansMode && activeWeapon?.id === 'gaster');
  const hasHeroSans = Boolean(player.sansHero);
  if (!hasHeroSans && !hasGasterSans) return false;
  if (player.invincible > 0) return false;

  // Sans Hero: exact 0.5% hit chance (99.5% MISS dodge)!
  const canDodge = hasHeroSans
    ? Math.random() < 0.995
    : (player.sansDodgeCd ?? 0) <= 0 || Math.random() < 0.72;
  if (!canDodge) return false;

  if (!hasHeroSans) {
    player.sansDodgeCd = 1.5;
  }
  player.invincible = 0.44;
  // Classic Sans crisp sidestep!
  const dodgeDir = (player.aimAngle ?? 0) + (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
  addParticles(game, player.x, player.y, '#38bdf8', 10);
  player.x = clamp(player.x + Math.cos(dodgeDir) * 32, 24, world.width - 24);
  player.y = clamp(player.y + Math.sin(dodgeDir) * 32, 24, world.height - 24);
  addFloatingText(game, player.x, player.y - 26, 'MISS', '#38bdf8', 24);
  queueSound(game, 'switch');
  return true;
}

function getPlayerDamage(player, baseDamage) {
  const isCritical = Math.random() < player.critChance;
  return baseDamage * player.damage * (isCritical ? player.critDamage : 1);
}

function getWeaponBoost(game, weapon) {
  const level = game.weaponLevels[weapon.id] ?? 0;
  const awakened = Boolean(game.awakenedWeapons[weapon.id]);
  return 1 + level * 0.12 + (awakened ? 0.35 : 0);
}

function queueSound(game, type) {
  if (game.sounds.length < 8) {
    game.sounds.push(type);
  }
}

function executeUltimatePayload(game) {
  const player = game.player;
  const weapon = weapons[player.weaponIndex] ?? weapons[0];
  const aim = player.aimAngle ?? 0;
  const wId = weapon.id;

  // Clear nearby enemy bullets as a clutch lifesaver!
  game.enemyBullets = (game.enemyBullets ?? []).filter((eb) => distance(player, eb) > 460);

  if (wId === 'gaster') {
    // 💀 메갈로바니아 · 배드 타임 (⚡ 샌즈 시너지 시 12블래스터 + 24뼈다귀 + 440px 푸른 영혼 대격돌!)
    const isSynergy = Boolean(player.sansHero);
    const blasterN = isSynergy ? 12 : 8;
    const boneN = isSynergy ? 24 : 16;
    const ringRadius = isSynergy ? 290 : 260;
    for (let i = 0; i < blasterN; i += 1) {
      const a = aim + (Math.PI * 2 * i) / blasterN;
      const sx = clamp(player.x + Math.cos(a) * ringRadius, 40, world.width - 40);
      const sy = clamp(player.y + Math.sin(a) * ringRadius, 40, world.height - 40);
      const inward = Math.atan2(player.y - sy, player.x - sx);
      game.bullets.push({
        x: sx,
        y: sy,
        vx: 0,
        vy: 0,
        angle: inward,
        radius: (isSynergy ? 52 : 44) * player.area,
        beamLength: isSynergy ? 920 : 820,
        charge: 0.12 + i * 0.045,
        maxCharge: 0.12 + i * 0.045,
        fired: false,
        damage: getPlayerDamage(player, isSynergy ? 320 : 240),
        life: 1.15 + i * 0.045,
        maxLife: 1.15 + i * 0.045,
        pierce: 9999,
        color: i % 2 === 0 ? '#38bdf8' : '#facc15',
        spin: 0,
        type: 'gaster',
        awakened: true,
        hitCooldowns: new Map(),
      });
    }
    for (let b = 0; b < boneN; b += 1) {
      const ba = aim + (Math.PI * 2 * b) / boneN;
      const isBlue = b % 2 === 1;
      game.bullets.push({
        x: player.x + Math.cos(ba) * 28,
        y: player.y + Math.sin(ba) * 28,
        vx: Math.cos(ba) * (isSynergy ? 840 : 760),
        vy: Math.sin(ba) * (isSynergy ? 840 : 760),
        radius: (isSynergy ? 19 : 16) * player.area,
        damage: getPlayerDamage(player, isSynergy ? 220 : 165),
        life: 1.25,
        pierce: 99,
        slow: isBlue ? 2.2 : 0.7,
        color: isBlue ? '#38bdf8' : '#f8fafc',
        blueBone: isBlue,
        spin: 0,
        type: 'sansBone',
        awakened: true,
        hitIds: new Set(),
      });
    }
    if (isSynergy) {
      game.bullets.push({
        x: player.x,
        y: player.y,
        vx: 0,
        vy: 0,
        radius: 80,
        damage: getPlayerDamage(player, 340),
        life: 0.5,
        maxLife: 0.5,
        pierce: 999,
        color: '#38bdf8',
        spin: 0,
        type: 'shockwave',
        blast: 440 * player.area,
        hitIds: new Set(),
      });
    }
    addFloatingText(game, player.x, player.y - 34, isSynergy ? '⚡ 심판의 회랑 · BAD TIME!!' : '💀 BAD TIME!!', '#38bdf8', 26);
  } else if (wId === 'trident') {
    // 🔱 GOD-TIER 포세이돈의 해일 번개: 16 Gigantic Golden Tridents 360° + 20 Sky Lightning Strikes + Giant Tidal Wave!
    if (!player.sansHero) {
      player.hp = Math.min(player.maxHp, player.hp + Math.round(player.maxHp * 0.5));
    }
    for (let i = 0; i < 16; i += 1) {
      const a = aim + (Math.PI * 2 * i) / 16;
      game.bullets.push({
        x: player.x + Math.cos(a) * 26,
        y: player.y + Math.sin(a) * 26,
        vx: Math.cos(a) * 1020,
        vy: Math.sin(a) * 1020,
        speed: 1020,
        radius: 36 * player.area,
        damage: getPlayerDamage(player, 420),
        life: 1.55,
        maxLife: 1.55,
        outboundTime: 0.56,
        returning: false,
        hitOut: new Set(),
        hitBack: new Set(),
        pierce: 999,
        slow: 2.0,
        color: '#facc15',
        spin: 0,
        type: 'trident',
        awakened: true,
      });
    }
    const targets = [...game.enemies]
      .sort((a, b) => distance(player, a) - distance(player, b))
      .slice(0, 20);
    targets.forEach((enemy) => {
      applyDamageToEnemy(enemy, getPlayerDamage(player, 480));
      enemy.slow = Math.max(enemy.slow ?? 0, 2.4);
      game.lightningEffects.push({ x: enemy.x, y: enemy.y, color: '#facc15', life: 0.42, maxLife: 0.42 });
      addParticles(game, enemy.x, enemy.y, '#5eead4', 18);
    });
    game.bullets.push({
      x: player.x,
      y: player.y,
      vx: 0,
      vy: 0,
      radius: 80,
      damage: getPlayerDamage(player, 380),
      life: 0.5,
      maxLife: 0.5,
      pierce: 999,
      color: '#2dd4bf',
      spin: 0,
      type: 'shockwave',
      blast: 480 * player.area,
      hitIds: new Set(),
    });
    addFloatingText(game, player.x, player.y - 34, '🔱 POSEIDON WRATH!!', '#2dd4bf', 28);
  } else if (wId === 'blaster') {
    // 🔫 하이퍼 플라즈마 난사: 24 homing plasma bolts (16 radial + 8 aimed)
    for (let i = 0; i < 24; i += 1) {
      const a = i < 16 ? aim + (Math.PI * 2 * i) / 16 : aim + ((i - 16) / 7 - 0.5) * 0.65;
      game.bullets.push({
        x: player.x,
        y: player.y,
        vx: Math.cos(a) * 920,
        vy: Math.sin(a) * 920,
        radius: 11 * player.bulletSize,
        damage: getPlayerDamage(player, 155),
        life: 1.15,
        pierce: 10,
        color: '#38bdf8',
        spin: 0,
        type: 'blaster',
        homing: true,
        awakened: true,
      });
    }
  } else if (wId === 'shotgun') {
    // 💥 지옥의 산탄 폭풍: 24 massive aimed piercing buckshot + close shockwave!
    for (let i = 0; i < 24; i += 1) {
      const a = aim + (i / 23 - 0.5) * 1.45;
      const spd = 760 + (i % 3) * 90;
      game.bullets.push({
        x: player.x,
        y: player.y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        radius: 11 * player.bulletSize,
        damage: getPlayerDamage(player, 130),
        life: 0.85,
        pierce: 8,
        color: '#fb7185',
        spin: 0,
        type: 'shotgun',
        awakened: true,
      });
    }
    game.bullets.push({
      x: player.x,
      y: player.y,
      vx: 0,
      vy: 0,
      radius: 50,
      damage: getPlayerDamage(player, 240),
      life: 0.36,
      maxLife: 0.36,
      pierce: 999,
      color: '#fb7185',
      spin: 0,
      type: 'shockwave',
      blast: 260 * player.area,
      hitIds: new Set(),
    });
  } else if (wId === 'railgun') {
    // ⚡ 궤도 초전자포: 9 ultra-piercing hyper rail beams along aim!
    for (let i = -4; i <= 4; i += 1) {
      const a = aim + i * 0.085;
      game.bullets.push({
        x: player.x,
        y: player.y,
        vx: Math.cos(a) * 1240,
        vy: Math.sin(a) * 1240,
        radius: 16 * player.bulletSize,
        damage: getPlayerDamage(player, 310),
        life: 1.05,
        pierce: 30,
        color: '#f8fafc',
        spin: 0,
        type: 'railgun',
        awakened: true,
      });
    }
  } else if (wId === 'boomer') {
    // 🪃 황금 차크람 회오리: 12 huge golden returning chakrams 360°!
    for (let i = 0; i < 12; i += 1) {
      const a = aim + (Math.PI * 2 * i) / 12;
      game.skillProjectiles.push({
        kind: 'chakram',
        x: player.x,
        y: player.y,
        vx: Math.cos(a) * 620,
        vy: Math.sin(a) * 620,
        radius: 22 * player.area,
        damage: getPlayerDamage(player, 195),
        life: 1.9,
        maxLife: 1.9,
        returning: false,
        spin: 0,
        awakened: true,
        hitCooldowns: new Map(),
      });
    }
  } else if (wId === 'shockwave') {
    // 🟣 슈퍼노바 대폭발: 4 massive staggered purple shockwaves!
    for (let r = 0; r < 4; r += 1) {
      game.bullets.push({
        x: player.x,
        y: player.y,
        vx: 0,
        vy: 0,
        radius: 60,
        damage: getPlayerDamage(player, 260 - r * 28),
        life: 0.42 + r * 0.14,
        maxLife: 0.42 + r * 0.14,
        pierce: 999,
        color: r % 2 === 0 ? '#c084fc' : '#facc15',
        spin: 0,
        type: 'shockwave',
        blast: (260 + r * 60) * player.area,
        hitIds: new Set(),
      });
    }
  } else if (wId === 'flame') {
    // 🔥 인페르노 메테오: 8 huge blue fire zones + instant meteor blasts!
    for (let i = 0; i < 8; i += 1) {
      const a = aim + (Math.PI * 2 * i) / 8;
      const dist = 135 + (i % 2) * 85;
      const mx = clamp(player.x + Math.cos(a) * dist, 60, world.width - 60);
      const my = clamp(player.y + Math.sin(a) * dist, 60, world.height - 60);
      game.fireZones.push({
        x: mx,
        y: my,
        radius: 112 * player.area,
        damage: getPlayerDamage(player, 82),
        life: 5.8,
        tick: 0,
        awakened: true,
      });
      game.enemies.forEach((enemy) => {
        if (distance({ x: mx, y: my }, enemy) < 135 * player.area + enemy.radius) {
          applyDamageToEnemy(enemy, getPlayerDamage(player, 250));
        }
      });
      addParticles(game, mx, my, '#f97316', 24);
    }
  } else if (wId === 'frost') {
    // ❄️ 절대영도 빙결폭풍: Arena-wide deep freeze + 20 piercing ice lances!
    game.enemies.forEach((enemy) => {
      if (distance(player, enemy) < 540 * player.area + enemy.radius) {
        applyDamageToEnemy(enemy, getPlayerDamage(player, 240));
        enemy.slow = Math.max(enemy.slow ?? 0, 3.4);
        addParticles(game, enemy.x, enemy.y, '#7dd3fc', 10);
      }
    });
    for (let i = 0; i < 20; i += 1) {
      const a = aim + (Math.PI * 2 * i) / 20;
      game.bullets.push({
        x: player.x,
        y: player.y,
        vx: Math.cos(a) * 780,
        vy: Math.sin(a) * 780,
        radius: 13 * player.bulletSize,
        damage: getPlayerDamage(player, 160),
        life: 1.15,
        pierce: 12,
        slow: 2.5,
        color: '#7dd3fc',
        spin: 0,
        type: 'frost',
        awakened: true,
      });
    }
    game.bullets.push({
      x: player.x,
      y: player.y,
      vx: 0,
      vy: 0,
      radius: 70,
      damage: getPlayerDamage(player, 120),
      life: 0.48,
      maxLife: 0.48,
      pierce: 999,
      color: '#7dd3fc',
      spin: 0,
      type: 'shockwave',
      blast: 420 * player.area,
      hitIds: new Set(),
    });
  } else if (wId === 'mine') {
    // 💣 융단 지뢰 폭격: 10 homing rockets + 12 ring mines around player!
    for (let i = 0; i < 10; i += 1) {
      const a = aim + (Math.PI * 2 * i) / 10;
      game.skillProjectiles.push({
        kind: 'rocket',
        x: player.x,
        y: player.y,
        vx: Math.cos(a) * 560,
        vy: Math.sin(a) * 560,
        radius: 15,
        blast: 150 * player.area,
        damage: getPlayerDamage(player, 260),
        life: 2.2,
        awakened: true,
      });
    }
    for (let m = 0; m < 12; m += 1) {
      const a = (Math.PI * 2 * m) / 12;
      game.bullets.push({
        x: clamp(player.x + Math.cos(a) * 125, 36, world.width - 36),
        y: clamp(player.y + Math.sin(a) * 125, 36, world.height - 36),
        vx: 0,
        vy: 0,
        radius: 14,
        damage: getPlayerDamage(player, 240),
        life: 6.5,
        pierce: 1,
        color: '#4ade80',
        spin: 0,
        type: 'mine',
        blast: 155 * player.area,
        armed: 0.1,
        awakened: true,
      });
    }
  } else if (wId === 'bat') {
    // 🏏 그랜드 슬램 홈런: 360° gigantic golden swing (340px) + 2 shockwaves!
    game.bullets.push({
      x: player.x,
      y: player.y,
      vx: 0,
      vy: 0,
      radius: 340 * player.area,
      damage: getPlayerDamage(player, 480),
      life: 0.42,
      maxLife: 0.42,
      pierce: 999,
      color: '#facc15',
      spin: 0,
      angle: aim,
      arc: Math.PI * 2,
      knockback: 260,
      type: 'bat',
      awakened: true,
      hitIds: new Set(),
    });
    for (let r = 0; r < 2; r += 1) {
      game.bullets.push({
        x: player.x,
        y: player.y,
        vx: 0,
        vy: 0,
        radius: 60,
        damage: getPlayerDamage(player, 220),
        life: 0.38 + r * 0.14,
        maxLife: 0.38 + r * 0.14,
        pierce: 999,
        color: r === 0 ? '#facc15' : '#f59e0b',
        spin: 0,
        type: 'shockwave',
        blast: (280 + r * 80) * player.area,
        hitIds: new Set(),
      });
    }
    addFloatingText(game, player.x, player.y - 36, '⚾ HOME RUN!!', '#facc15', 25);
  } else if (wId === 'kunai') {
    // 🗡️ 천본 앵화 수리검: 24 ultra-fast homing piercing kunai!
    for (let i = 0; i < 24; i += 1) {
      const a = aim + (Math.PI * 2 * i) / 24;
      game.bullets.push({
        x: player.x,
        y: player.y,
        vx: Math.cos(a) * 940,
        vy: Math.sin(a) * 940,
        radius: 13 * player.bulletSize,
        damage: getPlayerDamage(player, 185),
        life: 1.25,
        pierce: 12,
        color: '#93c5fd',
        spin: 0,
        type: 'kunai',
        homing: true,
        awakened: true,
      });
    }
  } else if (wId === 'katana') {
    // ⚔️ 천지 양단 일섬: 360° crimson slash + 12 sword waves + lifesteal!
    player.hp = Math.min(player.maxHp, player.hp + Math.round(player.maxHp * 0.25));
    game.bullets.push({
      x: player.x,
      y: player.y,
      vx: 0,
      vy: 0,
      radius: 290 * player.area,
      damage: getPlayerDamage(player, 390),
      life: 0.36,
      maxLife: 0.36,
      pierce: 999,
      color: '#f43f5e',
      spin: 0,
      angle: aim,
      arc: Math.PI * 2,
      knockback: 160,
      type: 'bat',
      awakened: true,
      hitIds: new Set(),
    });
    for (let i = 0; i < 12; i += 1) {
      const a = aim + (Math.PI * 2 * i) / 12;
      game.bullets.push({
        x: player.x,
        y: player.y,
        vx: Math.cos(a) * 860,
        vy: Math.sin(a) * 860,
        radius: 24 * player.area,
        damage: getPlayerDamage(player, 210),
        life: 0.95,
        pierce: 14,
        color: '#f43f5e',
        spin: 0,
        type: 'lightchaser',
        awakened: true,
      });
    }
  } else {
    // ✨ 성광의 심판 검무 (lightchaser & fallback): 14 golden crescent waves + 25% HP heal!
    player.hp = Math.min(player.maxHp, player.hp + Math.round(player.maxHp * 0.25));
    for (let i = 0; i < 14; i += 1) {
      const a = aim + (Math.PI * 2 * i) / 14;
      game.bullets.push({
        x: player.x,
        y: player.y,
        vx: Math.cos(a) * 840,
        vy: Math.sin(a) * 840,
        radius: 28 * player.area,
        damage: getPlayerDamage(player, 240),
        life: 1.05,
        pierce: 18,
        color: '#fde047',
        spin: 0,
        type: 'lightchaser',
        awakened: true,
      });
    }
  }

  game.ultImpactFlash = 0.38;
  game.shake = 26;
  addParticles(game, player.x, player.y, WEAPON_ULTIMATES[wId]?.accent || '#facc15', 52);
  queueSound(game, 'ultimate');
}

function triggerUltimate(game) {
  if (!game.running || game.pausedForUpgrade || game.over) return false;
  if (game.ultCutscene) return false;
  const player = game.player;
  if ((player.ultCharge ?? 0) < 100) return false;

  const weapon = weapons[player.weaponIndex] ?? weapons[0];
  const ultSpec = WEAPON_ULTIMATES[weapon.id] ?? WEAPON_ULTIMATES.blaster;
  const isSans = weapon.id === 'gaster';
  const isSansSynergy = Boolean(player.sansHero && isSans);

  player.ultCharge = 0;
  player.invincible = Math.max(player.invincible, 2.6);
  game.enemyBullets = (game.enemyBullets ?? []).filter((eb) => distance(player, eb) > 420);

  // Launch epic anime-style WEAPON Ultimate Cutscene!
  game.ultCutscene = {
    timer: 1.15,
    maxTimer: 1.15,
    impactAt: 0.42,
    executed: false,
    weaponId: weapon.id,
    weaponName: isSansSynergy ? '시너지 · 샌즈 × 가스터' : (weapon.displayName ?? weapon.name),
    ultIcon: ultSpec.icon,
    ultName: isSansSynergy ? '심판의 회랑 · 메갈로바니아' : ultSpec.name,
    ultSub: isSansSynergy ? 'SYNERGY OVERDRIVE · JUDGEMENT HALL' : ultSpec.sub,
    ultQuote: isSansSynergy ? '* 심판의 시간이다... 끔찍한 시간을 보내게 될 거야.' : ultSpec.quote,
    accent: ultSpec.accent,
    bg: ultSpec.bg,
    sansMode: isSans,
    synergyMode: isSansSynergy,
  };
  game.ultBannerName = `${ultSpec.icon} ${ultSpec.name}!`;
  game.shake = 10;
  queueSound(game, 'cutscene');
  return true;
}

function fireWeapon(game) {
  const player = game.player;
  const weapon = weapons[player.weaponIndex];
  const boost = getWeaponBoost(game, weapon);
  const awakened = Boolean(game.awakenedWeapons[weapon.id]);

  if (weapon.id === 'shockwave') {
    const ringCount = awakened ? 2 : 1;
    for (let ring = 0; ring < ringCount; ring += 1) {
      game.bullets.push({
        x: player.x,
        y: player.y,
        vx: 0,
        vy: 0,
        radius: weapon.radius * player.area,
        damage: getPlayerDamage(player, weapon.damage * boost * (ring === 0 ? 1 : 0.55)),
        life: weapon.life + ring * 0.1,
        maxLife: weapon.life + ring * 0.1,
        pierce: 99,
        color: ring === 0 ? '#fef3c7' : weapon.color,
        spin: 0,
        type: weapon.id,
        blast: weapon.blast * player.area * (awakened ? 1.25 + ring * 0.14 : 1),
        hitIds: new Set(),
      });
    }
    game.shake = awakened ? 10 : 7;
    addParticles(game, player.x, player.y, weapon.color, awakened ? 30 : 18);
    queueSound(game, 'boom');
    return;
  }

  if (weapon.id === 'mine') {
    const mineCount = awakened ? 3 : 1;
    for (let i = 0; i < mineCount; i += 1) {
      const angle = (Math.PI * 2 * i) / mineCount + game.time;
      const offset = awakened && i > 0 ? 58 : 0;
      game.bullets.push({
        x: player.x + Math.cos(angle) * offset,
        y: player.y + Math.sin(angle) * offset,
        vx: 0,
        vy: 0,
        radius: weapon.radius * player.bulletSize * (awakened ? 1.1 : 1),
        damage: getPlayerDamage(player, weapon.damage * boost),
        life: weapon.life + (awakened ? 0.8 : 0),
        pierce: 1,
        color: awakened ? '#bbf7d0' : weapon.color,
        spin: 0,
        type: weapon.id,
        blast: weapon.blast * player.area * (awakened ? 1.22 : 1),
        armed: 0.18,
      });
    }
    if (awakened) {
      addParticles(game, player.x, player.y, weapon.color, 16);
      queueSound(game, 'boom');
    }
    return;
  }

  if (weapon.id === 'bat') {
    let swingAngle = player.aimAngle ?? 0;
    if (game.aimMode !== 'manual') {
      const nearestForBat = game.enemies
        .map((enemy) => ({ enemy, dist: distance(player, enemy) }))
        .sort((a, b) => a.dist - b.dist)[0]?.enemy;
      swingAngle = nearestForBat
        ? Math.atan2(nearestForBat.y - player.y, nearestForBat.x - player.x)
        : game.time * 2;
    }
    const swingLife = awakened ? 0.29 : weapon.life;

    game.bullets.push({
      x: player.x,
      y: player.y,
      vx: 0,
      vy: 0,
      radius: weapon.radius * player.area * (awakened ? 1.18 : 1),
      damage: getPlayerDamage(player, weapon.damage * boost),
      life: swingLife,
      maxLife: swingLife,
      pierce: 999,
      color: awakened ? '#fb7185' : weapon.color,
      spin: 0,
      angle: swingAngle,
      arc: awakened ? Math.PI * 1.45 : weapon.arc,
      knockback: weapon.knockback * (awakened ? 1.2 : 1),
      type: 'bat',
      awakened,
      hitIds: new Set(),
    });
    game.shake = Math.max(game.shake, awakened ? 7 : 4);
    addParticles(
      game,
      player.x + Math.cos(swingAngle) * 42,
      player.y + Math.sin(swingAngle) * 42,
      awakened ? '#facc15' : weapon.color,
      awakened ? 16 : 10,
    );
    queueSound(game, 'bat');
    return;
  }

  if (weapon.id === 'katana') {
    let baseAngle = player.aimAngle ?? 0;
    if (game.aimMode !== 'manual') {
      const nearestForBlade = game.enemies
        .map((enemy) => ({ enemy, dist: distance(player, enemy) }))
        .sort((a, b) => a.dist - b.dist)[0]?.enemy;
      baseAngle = nearestForBlade
        ? Math.atan2(nearestForBlade.y - player.y, nearestForBlade.x - player.x)
        : 0;
    }
    const directions = [baseAngle, baseAngle + Math.PI];

    directions.forEach((dirAngle) => {
      game.bullets.push({
        x: player.x,
        y: player.y,
        vx: 0,
        vy: 0,
        radius: weapon.radius * player.area * (awakened ? 1.22 : 1),
        damage: getPlayerDamage(player, weapon.damage * boost),
        life: weapon.life,
        maxLife: weapon.life,
        pierce: 999,
        color: awakened ? '#facc15' : weapon.color,
        spin: 0,
        angle: dirAngle,
        arc: awakened ? Math.PI * 0.72 : weapon.arc,
        knockback: weapon.knockback,
        type: 'katana',
        awakened,
        hitIds: new Set(),
      });

      // Awakened Katana (요도 무라마사) also launches crimson sword waves!
      if (awakened) {
        game.bullets.push({
          x: player.x + Math.cos(dirAngle) * 26,
          y: player.y + Math.sin(dirAngle) * 26,
          vx: Math.cos(dirAngle) * 640,
          vy: Math.sin(dirAngle) * 640,
          radius: 20 * player.area,
          damage: getPlayerDamage(player, weapon.damage * boost * 0.65),
          life: 0.65,
          pierce: 6 + player.pierce,
          color: '#fb7185',
          spin: 0,
          type: 'lightchaser',
          awakened: true,
        });
      }
    });

    game.shake = Math.max(game.shake, awakened ? 6 : 3);
    queueSound(game, 'bat');
    return;
  }

  if (weapon.id === 'gaster') {
    let baseAngle = player.aimAngle ?? 0;
    const nearestForSkull = game.enemies
      .map((enemy) => ({ enemy, dist: distance(player, enemy) }))
      .sort((a, b) => a.dist - b.dist)[0]?.enemy;
    if (game.aimMode !== 'manual') {
      if (!nearestForSkull) return;
      baseAngle = Math.atan2(nearestForSkull.y - player.y, nearestForSkull.x - player.x);
    }

    if (awakened) {
      // 💀 AWAKENED GASTER BLASTER: SANS BOSS PATTERNS (Circle / Bone Zone / Blue Soul Slam)!
      if (!player.sansMode) applySansAwakening(game);
      const pattern = (game.sansPatternIndex ?? 0) % 3;
      game.sansPatternIndex = (game.sansPatternIndex ?? 0) + 1;
      const anchor =
        nearestForSkull && distance(player, nearestForSkull) < 380
          ? { x: nearestForSkull.x, y: nearestForSkull.y }
          : {
              x: clamp(player.x + Math.cos(baseAngle) * 180, 90, world.width - 90),
              y: clamp(player.y + Math.sin(baseAngle) * 180, 90, world.height - 90),
            };

      if (pattern === 0) {
        // Pattern 1: GOD-TIER Spinning Gaster Blaster Circle Ring (8 skulls firing staggered mega beams!)
        const count = 8;
        const ringR = 225;
        for (let i = 0; i < count; i += 1) {
          const a = baseAngle + (Math.PI * 2 * i) / count;
          const sx = clamp(anchor.x + Math.cos(a) * ringR, 40, world.width - 40);
          const sy = clamp(anchor.y + Math.sin(a) * ringR, 40, world.height - 40);
          const aimIn = Math.atan2(anchor.y - sy, anchor.x - sx);
          const stagger = 0.1 + i * 0.045;
          game.bullets.push({
            x: sx,
            y: sy,
            vx: 0,
            vy: 0,
            angle: aimIn,
            radius: weapon.radius * player.area * 1.3,
            beamLength: (weapon.beamLength ?? 920) * 1.15,
            charge: stagger,
            maxCharge: stagger,
            fired: false,
            damage: getPlayerDamage(player, weapon.damage * boost * 1.35),
            life: weapon.life + 0.16 + i * 0.045,
            maxLife: weapon.life + 0.16 + i * 0.045,
            pierce: 9999,
            color: i % 2 === 0 ? '#38bdf8' : '#facc15',
            spin: 0,
            type: 'gaster',
            awakened: true,
            hitCooldowns: new Map(),
          });
          addParticles(game, sx, sy, '#38bdf8', 8);
        }
        addFloatingText(game, anchor.x, anchor.y - 36, '💀 GASTER CIRCLE!', '#38bdf8', 20);
      } else if (pattern === 1) {
        // Pattern 2: GOD-TIER Undertale Bone Zone Barrage (14 Bones) + Triple Mega Gaster Blasters!
        for (let b = 0; b < 14; b += 1) {
          const spreadA = baseAngle + (b / 13 - 0.5) * 1.35;
          const isBlue = b % 2 === 1;
          game.bullets.push({
            x: player.x + Math.cos(spreadA) * 24,
            y: player.y + Math.sin(spreadA) * 24,
            vx: Math.cos(spreadA) * (isBlue ? 760 : 860),
            vy: Math.sin(spreadA) * (isBlue ? 760 : 860),
            radius: 18 * player.area,
            damage: getPlayerDamage(player, weapon.damage * boost * 1.1),
            life: 1.15,
            pierce: 99,
            slow: isBlue ? 2.0 : 0.65,
            color: isBlue ? '#38bdf8' : '#f8fafc',
            blueBone: isBlue,
            spin: 0,
            type: 'sansBone',
            awakened: true,
            hitIds: new Set(),
          });
        }
        [-1, 0, 1].forEach((side) => {
          const perp = baseAngle + Math.PI / 2;
          const sx = clamp(player.x + Math.cos(baseAngle) * 48 + Math.cos(perp) * side * 78, 40, world.width - 40);
          const sy = clamp(player.y + Math.sin(baseAngle) * 48 + Math.sin(perp) * side * 78, 40, world.height - 40);
          game.bullets.push({
            x: sx,
            y: sy,
            vx: 0,
            vy: 0,
            angle: baseAngle + side * 0.06,
            radius: weapon.radius * player.area * 1.26,
            beamLength: (weapon.beamLength ?? 920) * 1.15,
            charge: 0.15,
            maxCharge: 0.15,
            fired: false,
            damage: getPlayerDamage(player, weapon.damage * boost * 1.35),
            life: weapon.life + 0.16,
            maxLife: weapon.life + 0.16,
            pierce: 9999,
            color: side === 0 ? '#facc15' : '#38bdf8',
            spin: 0,
            type: 'gaster',
            awakened: true,
            hitCooldowns: new Map(),
          });
        });
        addFloatingText(game, player.x, player.y - 32, '🦴 BONE ZONE!', '#f8fafc', 20);
      } else {
        // Pattern 3: GOD-TIER Blue Soul Gravity Slam (320px) + 6 Star-Formation Converging Mega Blasters!
        const slamR = 320 * player.area;
        game.enemies.forEach((enemy) => {
          const d = distance(anchor, enemy);
          if (d < slamR + enemy.radius) {
            const pullA = Math.atan2(anchor.y - enemy.y, anchor.x - enemy.x);
            const pullDist = Math.min(d * 0.65, enemy.boss ? 28 : 130);
            enemy.x = clamp(enemy.x + Math.cos(pullA) * pullDist, 30, world.width - 30);
            enemy.y = clamp(enemy.y + Math.sin(pullA) * pullDist, 30, world.height - 30);
            enemy.slow = Math.max(enemy.slow ?? 0, 2.2);
            enemy.karmaTimer = Math.max(enemy.karmaTimer ?? 0, 4.0);
            enemy.karmaDps = Math.max(enemy.karmaDps ?? 0, getPlayerDamage(player, weapon.damage * boost * 0.95));
            applyDamageToEnemy(enemy, getPlayerDamage(player, weapon.damage * boost * 0.85));
            addParticles(game, enemy.x, enemy.y, '#38bdf8', 8);
          }
        });
        game.bullets.push({
          x: anchor.x,
          y: anchor.y,
          vx: 0,
          vy: 0,
          radius: 50,
          damage: getPlayerDamage(player, 90),
          life: 0.38,
          maxLife: 0.38,
          pierce: 999,
          color: '#38bdf8',
          spin: 0,
          type: 'shockwave',
          blast: slamR,
          hitIds: new Set(),
        });
        for (let k = 0; k < 6; k += 1) {
          const xa = baseAngle + (Math.PI * 2 * k) / 6;
          const sx = clamp(anchor.x + Math.cos(xa) * 215, 40, world.width - 40);
          const sy = clamp(anchor.y + Math.sin(xa) * 215, 40, world.height - 40);
          game.bullets.push({
            x: sx,
            y: sy,
            vx: 0,
            vy: 0,
            angle: Math.atan2(anchor.y - sy, anchor.x - sx),
            radius: weapon.radius * player.area * 1.32,
            beamLength: (weapon.beamLength ?? 920) * 1.15,
            charge: 0.16,
            maxCharge: 0.16,
            fired: false,
            damage: getPlayerDamage(player, weapon.damage * boost * 1.4),
            life: weapon.life + 0.18,
            maxLife: weapon.life + 0.18,
            pierce: 9999,
            color: k % 2 === 0 ? '#38bdf8' : '#e879f9',
            spin: 0,
            type: 'gaster',
            awakened: true,
            hitCooldowns: new Map(),
          });
        }
        addFloatingText(game, anchor.x, anchor.y - 34, '💙 BLUE SOUL SLAM!', '#38bdf8', 21);
        game.shake = Math.max(game.shake, 12);
      }

      queueSound(game, 'switch');
      return;
    }

    // Normal (Unawakened) GOD-TIER Twin Flanking Gaster Blasters!
    [-1, 1].forEach((side) => {
      const perp = baseAngle + Math.PI / 2;
      const spawnX = clamp(player.x + Math.cos(baseAngle) * 46 + Math.cos(perp) * side * 44, 40, world.width - 40);
      const spawnY = clamp(player.y + Math.sin(baseAngle) * 46 + Math.sin(perp) * side * 44, 40, world.height - 40);
      game.bullets.push({
        x: spawnX,
        y: spawnY,
        vx: 0,
        vy: 0,
        angle: baseAngle,
        radius: weapon.radius * player.area,
        beamLength: weapon.beamLength ?? 920,
        charge: weapon.chargeTime ?? 0.18,
        maxCharge: weapon.chargeTime ?? 0.18,
        fired: false,
        damage: getPlayerDamage(player, weapon.damage * boost),
        life: weapon.life,
        maxLife: weapon.life,
        pierce: 9999,
        color: '#38bdf8',
        spin: 0,
        type: 'gaster',
        awakened: false,
        hitCooldowns: new Map(),
      });
      addParticles(game, spawnX, spawnY, '#38bdf8', 10);
    });
    queueSound(game, 'switch');
    return;
  }

  if (weapon.id === 'trident') {
    let baseAngle = player.aimAngle ?? 0;
    if (game.aimMode !== 'manual') {
      const nearestForTrident = game.enemies
        .map((enemy) => ({ enemy, dist: distance(player, enemy) }))
        .sort((a, b) => a.dist - b.dist)[0]?.enemy;
      if (!nearestForTrident) return;
      baseAngle = Math.atan2(nearestForTrident.y - player.y, nearestForTrident.x - player.x);
    }

    // 🔱 GOD-TIER POSEIDON TRIDENT: 3 huge tridents normally, 7 (5 front storm + 2 rear guard) when awakened!
    const frontCount = awakened ? 5 : 3;
    const spread = awakened ? 0.88 : 0.38;
    const speed = weapon.speed * (awakened ? 1.2 : 1);
    const angles = [];
    for (let i = 0; i < frontCount; i += 1) {
      const offset = i / (frontCount - 1) - 0.5;
      angles.push(baseAngle + offset * spread);
    }
    if (awakened) {
      angles.push(baseAngle + Math.PI - 0.25, baseAngle + Math.PI + 0.25);
    }

    angles.forEach((angle) => {
      game.bullets.push({
        x: player.x + Math.cos(angle) * 24,
        y: player.y + Math.sin(angle) * 24,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        speed,
        radius: weapon.radius * player.area * (awakened ? 1.38 : 1.12),
        damage: getPlayerDamage(player, weapon.damage * boost * (awakened ? 1.35 : 1)),
        life: weapon.life + (awakened ? 0.22 : 0),
        maxLife: weapon.life + (awakened ? 0.22 : 0),
        outboundTime: awakened ? 0.52 : 0.45,
        returning: false,
        hitOut: new Set(),
        hitBack: new Set(),
        pierce: 999,
        slow: (weapon.slow ?? 1.2) * (awakened ? 1.5 : 1),
        color: awakened ? '#facc15' : '#2dd4bf',
        spin: 0,
        type: 'trident',
        awakened,
      });
    });

    addParticles(game, player.x + Math.cos(baseAngle) * 22, player.y + Math.sin(baseAngle) * 22, awakened ? '#facc15' : '#2dd4bf', awakened ? 18 : 10);
    game.shake = Math.max(game.shake, awakened ? 8 : 3);
    queueSound(game, 'trident');
    return;
  }

  let baseAngle = player.aimAngle ?? 0;
  if (game.aimMode !== 'manual') {
    const nearest = game.enemies
      .map((enemy) => ({ enemy, dist: distance(player, enemy) }))
      .sort((a, b) => a.dist - b.dist)[0]?.enemy;
    if (!nearest) return;
    baseAngle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
  }
  const count =
    awakened && weapon.id === 'shotgun' ? 8 :
    awakened && weapon.id === 'blaster' ? 3 :
    awakened && weapon.id === 'railgun' ? 2 :
    awakened && weapon.id === 'boomer' ? 3 :
    awakened && weapon.id === 'flame' ? 4 :
    awakened && weapon.id === 'frost' ? 4 :
    awakened && weapon.id === 'kunai' ? 2 :
    awakened && weapon.id === 'lightchaser' ? 3 :
    weapon.count ?? 1;
  const spread =
    awakened && weapon.id === 'shotgun' ? 1.05 :
    awakened && weapon.id === 'blaster' ? 0.24 :
    awakened && weapon.id === 'boomer' ? 0.55 :
    awakened && weapon.id === 'flame' ? 0.72 :
    awakened && weapon.id === 'frost' ? 0.85 :
    awakened && weapon.id === 'kunai' ? 0.14 :
    awakened && weapon.id === 'lightchaser' ? 0.56 :
    (weapon.spread ?? 0);

  for (let i = 0; i < count; i += 1) {
    const centerOffset = count === 1 ? 0 : i / (count - 1) - 0.5;
    const angle = baseAngle + centerOffset * spread;
    const sideOffset = awakened && weapon.id === 'railgun' ? (i - 0.5) * 16 : 0;
    const sideAngle = angle + Math.PI / 2;

    game.bullets.push({
      x: player.x + Math.cos(sideAngle) * sideOffset,
      y: player.y + Math.sin(sideAngle) * sideOffset,
      vx: Math.cos(angle) * weapon.speed * (awakened && weapon.id === 'railgun' ? 1.1 : 1),
      vy: Math.sin(angle) * weapon.speed * (awakened && weapon.id === 'railgun' ? 1.1 : 1),
      radius: weapon.radius * player.bulletSize * (weapon.id === 'flame' || weapon.id === 'lightchaser' ? player.area : 1) * (awakened ? 1.16 : 1),
      damage: getPlayerDamage(player, weapon.damage * boost),
      life: weapon.life * (awakened ? 1.1 : 1),
      pierce: weapon.pierce + player.pierce - 1 + (awakened ? 2 : 0),
      color: awakened ? '#fef3c7' : weapon.color,
      spin: 0,
      type: weapon.id,
      homing: Boolean(weapon.homing),
      slow: (weapon.slow ?? 0) * (awakened && weapon.id === 'frost' ? 1.35 : 1),
      awakened,
    });
  }

  if (awakened) {
    game.shake = Math.max(game.shake, weapon.id === 'railgun' ? 10 : 6);
    addParticles(game, player.x, player.y, weapon.color, weapon.id === 'shotgun' || weapon.id === 'flame' ? 20 : 12);
  }
  queueSound(game, weapon.id === 'flame' ? 'flame' : 'shoot');
}

function updateOrbit(game, delta) {
  const player = game.player;
  const weapon = weapons[player.weaponIndex];

  if (weapon.id !== 'orbit') return;

  const bladeCount = 3 + Math.floor(player.pierce / 2);
  for (let i = 0; i < game.enemies.length; i += 1) {
    const enemy = game.enemies[i];
    for (let blade = 0; blade < bladeCount; blade += 1) {
      const angle = game.time * 4 + (Math.PI * 2 * blade) / bladeCount;
      const bladePoint = {
        x: player.x + Math.cos(angle) * 72 * player.area,
        y: player.y + Math.sin(angle) * 72 * player.area,
      };
        if (distance(bladePoint, enemy) < enemy.radius + 15 * player.area) {
          enemy.hp -= getPlayerDamage(player, weapon.damage) * delta;
          addParticles(game, enemy.x, enemy.y, weapon.color, 1);
        }
    }
  }
}

function updateGame(game, input, canvas, rawDelta, onEarnGold, onEarnLobbyCoins) {
  if (!game.running || game.pausedForUpgrade || game.over) return;

  let delta = rawDelta;
  game.ultImpactFlash = Math.max(0, (game.ultImpactFlash ?? 0) - rawDelta);
  if (game.ultCutscene) {
    game.ultCutscene.timer -= rawDelta;
    if (!game.ultCutscene.executed && game.ultCutscene.timer <= game.ultCutscene.impactAt) {
      game.ultCutscene.executed = true;
      executeUltimatePayload(game);
    }
    if (game.ultCutscene.timer > game.ultCutscene.impactAt) {
      // Dramatic anime hit-stop slow-motion during cutscene climax!
      delta = rawDelta * 0.08;
    }
    if (game.ultCutscene.timer <= 0) {
      game.ultCutscene = null;
    }
  }

  game.time += delta;
  game.shake = Math.max(0, game.shake - rawDelta * 18);
  game.stageFlash = Math.max(0, game.stageFlash - delta);
  game.awakenFlash = Math.max(0, game.awakenFlash - delta);
  game.abilityAwakenFlash = Math.max(0, (game.abilityAwakenFlash ?? 0) - delta);
  game.ultFlash = Math.max(0, (game.ultFlash ?? 0) - delta);
  game.bossFlash = Math.max(0, (game.bossFlash ?? 0) - delta);
  game.bossClearFlash = Math.max(0, (game.bossClearFlash ?? 0) - delta);
  game.lightningEffects = (game.lightningEffects ?? [])
    .map((fx) => ({ ...fx, life: fx.life - delta }))
    .filter((fx) => fx.life > 0);
  game.floatingTexts = (game.floatingTexts ?? [])
    .map((ft) => ({ ...ft, y: ft.y + ft.vy * rawDelta, life: ft.life - rawDelta }))
    .filter((ft) => ft.life > 0);
  const stage = getStage(game);
  const player = game.player;
  player.slowTimer = Math.max(0, (player.slowTimer ?? 0) - delta);
  player.sansDodgeCd = Math.max(0, (player.sansDodgeCd ?? 0) - delta);
  if (player.sansHero && game.enemies.length > 0) {
    player.sansBoneTimer = (player.sansBoneTimer ?? 2.4) - delta;
    if (player.sansBoneTimer <= 0) {
      player.sansBoneTimer = 2.4;
      const nearestForBone = game.enemies
        .map((e) => ({ e, dist: distance(player, e) }))
        .sort((a, b) => a.dist - b.dist)[0]?.e;
      if (nearestForBone) {
        const boneAngle = Math.atan2(nearestForBone.y - player.y, nearestForBone.x - player.x);
        [-0.14, 0.14].forEach((off, idx) => {
          const a = boneAngle + off;
          const isBlue = idx === 1;
          game.bullets.push({
            x: player.x + Math.cos(a) * 20,
            y: player.y + Math.sin(a) * 20,
            vx: Math.cos(a) * 720,
            vy: Math.sin(a) * 720,
            radius: 14 * player.area,
            damage: getPlayerDamage(player, 48),
            life: 1.0,
            pierce: 99,
            slow: isBlue ? 1.2 : 0.4,
            color: isBlue ? '#38bdf8' : '#f8fafc',
            blueBone: isBlue,
            spin: 0,
            type: 'sansBone',
            awakened: true,
            hitIds: new Set(),
          });
        });
      }
    }

    // ⚡ SANS × GASTER BLASTER SYNERGY COMBO: 2 Extra Signature Techniques every 3.1s!
    if (weapons[player.weaponIndex]?.id === 'gaster') {
      player.sansSynergyTimer = (player.sansSynergyTimer ?? 2.6) - delta;
      if (player.sansSynergyTimer <= 0) {
        player.sansSynergyTimer = 3.1;
        const step = (player.sansSynergyStep ?? 0) % 2;
        player.sansSynergyStep = (player.sansSynergyStep ?? 0) + 1;
        const nearest = game.enemies
          .map((e) => ({ e, dist: distance(player, e) }))
          .sort((a, b) => a.dist - b.dist)[0]?.e;
        const target = nearest
          ? { x: nearest.x, y: nearest.y }
          : {
              x: clamp(player.x + Math.cos(player.aimAngle ?? 0) * 180, 80, world.width - 80),
              y: clamp(player.y + Math.sin(player.aimAngle ?? 0) * 180, 80, world.height - 80),
            };

        if (step === 0) {
          // Synergy Technique 1: ⚡ 뼈 감옥 + 십자 심판 (12 Converging Bones + 4 Cross Gaster Blasters!)
          for (let b = 0; b < 12; b += 1) {
            const ba = (Math.PI * 2 * b) / 12;
            const bx = clamp(target.x + Math.cos(ba) * 185, 36, world.width - 36);
            const by = clamp(target.y + Math.sin(ba) * 185, 36, world.height - 36);
            const inward = Math.atan2(target.y - by, target.x - bx);
            const isBlue = b % 2 === 1;
            game.bullets.push({
              x: bx,
              y: by,
              vx: Math.cos(inward) * 560,
              vy: Math.sin(inward) * 560,
              radius: 16 * player.area,
              damage: getPlayerDamage(player, 115),
              life: 0.72,
              pierce: 99,
              slow: isBlue ? 2.0 : 0.7,
              color: isBlue ? '#38bdf8' : '#f8fafc',
              blueBone: isBlue,
              spin: 0,
              type: 'sansBone',
              awakened: true,
              hitIds: new Set(),
            });
          }
          for (let k = 0; k < 4; k += 1) {
            const ka = Math.PI / 4 + (Math.PI / 2) * k;
            const sx = clamp(target.x + Math.cos(ka) * 210, 40, world.width - 40);
            const sy = clamp(target.y + Math.sin(ka) * 210, 40, world.height - 40);
            game.bullets.push({
              x: sx,
              y: sy,
              vx: 0,
              vy: 0,
              angle: Math.atan2(target.y - sy, target.x - sx),
              radius: 38 * player.area,
              beamLength: 820,
              charge: 0.2,
              maxCharge: 0.2,
              fired: false,
              damage: getPlayerDamage(player, 145),
              life: 0.86,
              maxLife: 0.86,
              pierce: 9999,
              color: k % 2 === 0 ? '#38bdf8' : '#facc15',
              spin: 0,
              type: 'gaster',
              awakened: true,
              hitCooldowns: new Map(),
            });
          }
          addFloatingText(game, target.x, target.y - 36, '⚡ 시너지 · 뼈 감옥 심판!', '#38bdf8', 20);
          queueSound(game, 'switch');
        } else {
          // Synergy Technique 2: 💙 심판의 회랑 · 푸른 영혼 대격돌 + 5연 회전 블래스터!
          const slamR = 340 * player.area;
          game.enemies.forEach((enemy) => {
            const d = distance(player, enemy);
            if (d < slamR + enemy.radius) {
              const pullA = Math.atan2(target.y - enemy.y, target.x - enemy.x);
              const pullDist = Math.min(d * 0.45, enemy.boss ? 28 : 110);
              enemy.x = clamp(enemy.x + Math.cos(pullA) * pullDist, 30, world.width - 30);
              enemy.y = clamp(enemy.y + Math.sin(pullA) * pullDist, 30, world.height - 30);
              enemy.slow = Math.max(enemy.slow ?? 0, 2.2);
              enemy.karmaTimer = Math.max(enemy.karmaTimer ?? 0, 3.6);
              enemy.karmaDps = Math.max(enemy.karmaDps ?? 0, getPlayerDamage(player, 95));
              applyDamageToEnemy(enemy, getPlayerDamage(player, 125));
              addParticles(game, enemy.x, enemy.y, '#38bdf8', 8);
            }
          });
          game.bullets.push({
            x: player.x,
            y: player.y,
            vx: 0,
            vy: 0,
            radius: 60,
            damage: getPlayerDamage(player, 80),
            life: 0.42,
            maxLife: 0.42,
            pierce: 999,
            color: '#38bdf8',
            spin: 0,
            type: 'shockwave',
            blast: slamR,
            hitIds: new Set(),
          });
          const aimA = Math.atan2(target.y - player.y, target.x - player.x);
          for (let i = -2; i <= 2; i += 1) {
            const arcA = aimA + i * 0.34;
            const sx = clamp(player.x + Math.cos(arcA) * 95, 40, world.width - 40);
            const sy = clamp(player.y + Math.sin(arcA) * 95, 40, world.height - 40);
            game.bullets.push({
              x: sx,
              y: sy,
              vx: 0,
              vy: 0,
              angle: arcA,
              radius: 36 * player.area,
              beamLength: 820,
              charge: 0.16 + Math.abs(i) * 0.06,
              maxCharge: 0.16 + Math.abs(i) * 0.06,
              fired: false,
              damage: getPlayerDamage(player, 135),
              life: 0.88 + Math.abs(i) * 0.06,
              maxLife: 0.88 + Math.abs(i) * 0.06,
              pierce: 9999,
              color: i === 0 ? '#facc15' : '#38bdf8',
              spin: 0,
              type: 'gaster',
              awakened: true,
              hitCooldowns: new Map(),
            });
          }
          addFloatingText(game, player.x, player.y - 36, '💙 시너지 · 심판의 회랑!', '#facc15', 20);
          game.shake = Math.max(game.shake, 11);
          queueSound(game, 'gaster');
        }
      }
    }
  }

  // 👁️ FORSAKEN PASSIVE CORRUPTION SKILLS (every 2.6s: Corruption Spikes / Forsaken Nova!)
  if (player.forsakenHero && game.enemies.length > 0) {
    player.forsakenTimer = (player.forsakenTimer ?? 2.6) - delta;
    if (player.forsakenTimer <= 0) {
      player.forsakenTimer = 2.6;
      const fStep = (player.forsakenStep ?? 0) % 2;
      player.forsakenStep = (player.forsakenStep ?? 0) + 1;
      const nearest = game.enemies
        .map((e) => ({ e, dist: distance(player, e) }))
        .sort((a, b) => a.dist - b.dist)[0]?.e;
      const aimA = nearest
        ? Math.atan2(nearest.y - player.y, nearest.x - player.x)
        : (player.aimAngle ?? 0);

      if (fStep === 0) {
        // Skill 1: 👁️ 부패의 사슬 가시 (6 piercing crimson shadow waves!)
        for (let i = 0; i < 6; i += 1) {
          const a = aimA + (i / 5 - 0.5) * 0.95;
          game.bullets.push({
            x: player.x + Math.cos(a) * 22,
            y: player.y + Math.sin(a) * 22,
            vx: Math.cos(a) * 820,
            vy: Math.sin(a) * 820,
            radius: 22 * player.area,
            damage: getPlayerDamage(player, 125),
            life: 0.9,
            pierce: 16,
            slow: 1.2,
            color: i % 2 === 0 ? '#ef4444' : '#22c55e',
            spin: 0,
            type: 'lightchaser',
            awakened: true,
          });
        }
        addFloatingText(game, player.x, player.y - 34, '👁️ 부패의 가시!', '#ef4444', 19);
        queueSound(game, 'bat');
      } else {
        // Skill 2: 🩸 침식의 파동 (250px dark-crimson corruption shockwave + lifesteal!)
        const novaR = 250 * player.area;
        game.bullets.push({
          x: player.x,
          y: player.y,
          vx: 0,
          vy: 0,
          radius: 50,
          damage: getPlayerDamage(player, 190),
          life: 0.4,
          maxLife: 0.4,
          pierce: 999,
          color: '#ef4444',
          spin: 0,
          type: 'shockwave',
          blast: novaR,
          hitIds: new Set(),
        });
        player.hp = Math.min(player.maxHp, player.hp + 8);
        addParticles(game, player.x, player.y, '#ef4444', 18);
        addParticles(game, player.x, player.y, '#22c55e', 10);
        addFloatingText(game, player.x, player.y - 34, '🩸 침식의 파동!', '#ef4444', 19);
        game.shake = Math.max(game.shake, 7);
        queueSound(game, 'boom');
      }
    }
  }
  const playerSpeedFactor = player.slowTimer > 0 ? 0.62 : 1;
  const moveX = (input.right ? 1 : 0) - (input.left ? 1 : 0) + input.touch.x;
  const moveY = (input.down ? 1 : 0) - (input.up ? 1 : 0) + input.touch.y;
  const mouseX = input.mouse.active ? input.mouse.x : 0;
  const mouseY = input.mouse.active ? input.mouse.y : 0;
  const totalMoveX = moveX + mouseX;
  const totalMoveY = moveY + mouseY;
  const moveLength = Math.hypot(totalMoveX, totalMoveY) || 1;

  player.x = clamp(player.x + (totalMoveX / moveLength) * player.speed * playerSpeedFactor * delta, 24, world.width - 24);
  player.y = clamp(player.y + (totalMoveY / moveLength) * player.speed * playerSpeedFactor * delta, 24, world.height - 24);
  player.invincible = Math.max(0, player.invincible - delta);
  player.ultCharge = Math.min(100, (player.ultCharge ?? 0) + delta * 3.8);
  if (player.regen > 0 && player.hp > 0) {
    player.hp = Math.min(player.maxHp, player.hp + player.regen * delta);
  }

  const camera = {
    width: canvas.width,
    height: canvas.height,
    x: clamp(player.x - canvas.width / 2, 0, world.width - canvas.width),
    y: clamp(player.y - canvas.height / 2, 0, world.height - canvas.height),
  };

  if (input.aim?.active) {
    const worldAimX = camera.x + input.aim.x;
    const worldAimY = camera.y + input.aim.y;
    player.aimAngle = Math.atan2(worldAimY - player.y, worldAimX - player.x);
  } else if (Math.hypot(totalMoveX, totalMoveY) > 0.12) {
    player.aimAngle = Math.atan2(totalMoveY, totalMoveX);
  }

  if (!game.bossActive) {
    game.chapterTime = (game.chapterTime ?? 0) + delta;
    if (game.chapterTime >= stageSeconds) {
      spawnChapterBoss(game, camera);
    }
  }

  game.spawnTimer -= delta;
  const baseSpawnDelay = Math.max(0.11, (0.72 - game.time * 0.0036) / stage.spawnFactor);
  const spawnDelay = game.bossActive ? baseSpawnDelay * 2.35 : baseSpawnDelay;
  while (game.spawnTimer <= 0) {
    spawnEnemy(game, camera);
    game.spawnTimer += spawnDelay;
  }

  if (!game.bossActive) {
    game.eliteTimer -= delta;
    if (game.eliteTimer <= 0) {
      spawnElite(game, camera);
      game.eliteTimer = Math.max(11, (30 - game.time * 0.05) / stage.spawnFactor);
    }
  }

  player.cooldown -= delta;
  const weapon = weapons[player.weaponIndex];
  if (player.cooldown <= 0) {
    fireWeapon(game);
    player.cooldown = (weapon.cooldown ?? 0.4) / player.fireRate;
  }

  if (game.bm?.omegaDrone) {
    game.droneCooldown = (game.droneCooldown ?? 0) - delta;
    if (game.droneCooldown <= 0 && game.enemies.length > 0) {
      const droneAngle = game.time * 3.2;
      const droneX = player.x + Math.cos(droneAngle) * 64;
      const droneY = player.y + Math.sin(droneAngle) * 64;
      const target = game.enemies
        .map((enemy) => ({ enemy, dist: distance({ x: droneX, y: droneY }, enemy) }))
        .sort((a, b) => a.dist - b.dist)[0]?.enemy;
      if (target) {
        const shotAngle = Math.atan2(target.y - droneY, target.x - droneX);
        game.bullets.push({
          x: droneX,
          y: droneY,
          vx: Math.cos(shotAngle) * 860,
          vy: Math.sin(shotAngle) * 860,
          radius: 8 * player.bulletSize,
          damage: getPlayerDamage(player, 36),
          life: 1.05,
          pierce: 4 + player.pierce,
          color: '#e879f9',
          spin: 0,
          type: 'blaster',
          slow: 0.4,
          awakened: true,
        });
        addParticles(game, droneX, droneY, '#e879f9', 4);
      }
      game.droneCooldown = 0.22 / Math.max(1, player.fireRate * 0.65);
    }
  }

  // === 7종 액티브 전투 능력 실행 (로켓 발사기, 수호자 칼날, 번개, 화염병, 드론, 축구공, 차크람) ===
  const skills = game.skillLevels ?? {};
  const skAwaken = game.awakenedSkills ?? {};
  const st = game.skillTimers ?? {};
  const cdRate = Math.max(0.65, player.fireRate);

  // 1. 🚀 로켓 발사기 (LV 5 각성: 샤크 바주카)
  if ((skills.rocket ?? 0) > 0 && game.enemies.length > 0) {
    st.rocket = (st.rocket ?? 1.5) - delta * cdRate;
    if (st.rocket <= 0) {
      const lv = skills.rocket;
      const aw = Boolean(skAwaken.rocket);
      const count = aw ? 2 : 1;
      const sorted = game.enemies
        .map((e) => ({ e, d: distance(player, e) }))
        .sort((a, b) => a.d - b.d);
      for (let i = 0; i < count; i += 1) {
        const target = sorted[i]?.e ?? sorted[0]?.e;
        if (!target) break;
        const a = Math.atan2(target.y - player.y, target.x - player.x) + (i === 1 ? 0.16 : 0);
        game.skillProjectiles.push({
          kind: 'rocket',
          x: player.x,
          y: player.y,
          vx: Math.cos(a) * (aw ? 540 : 450),
          vy: Math.sin(a) * (aw ? 540 : 450),
          radius: aw ? 15 : 10,
          blast: (aw ? 148 : 88 + lv * 10) * player.area,
          damage: getPlayerDamage(player, aw ? 210 : 68 + lv * 24),
          life: 2.2,
          awakened: aw,
        });
      }
      queueSound(game, 'shoot');
      st.rocket = aw ? 1.55 : Math.max(1.85, 2.8 - lv * 0.2);
    }
  }

  // 2. ⚙️ 수호자 칼날 (LV 5 각성: 수호의 방어막)
  if ((skills.guardian ?? 0) > 0) {
    const lv = skills.guardian;
    const aw = Boolean(skAwaken.guardian);
    const bladeCount = aw ? 6 : 1 + lv;
    const orbitRadius = (aw ? 104 : 78 + lv * 4) * player.area;
    const spinSpeed = aw ? 5.8 : 3.6 + lv * 0.3;
    const bladeDmg = getPlayerDamage(player, aw ? 48 : 20 + lv * 7);

    game.enemies.forEach((enemy) => {
      enemy.guardianHitCd = Math.max(0, (enemy.guardianHitCd ?? 0) - delta);
      if (enemy.guardianHitCd > 0) return;
      for (let b = 0; b < bladeCount; b += 1) {
        const ba = game.time * spinSpeed + (Math.PI * 2 * b) / bladeCount;
        const bx = player.x + Math.cos(ba) * orbitRadius;
        const by = player.y + Math.sin(ba) * orbitRadius;
        if (distance({ x: bx, y: by }, enemy) < enemy.radius + (aw ? 20 : 15)) {
          applyDamageToEnemy(enemy, bladeDmg);
          enemy.guardianHitCd = aw ? 0.18 : 0.28;
          const pushAngle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
          const pushDist = (aw ? 36 : 22) * (enemy.boss ? 0.1 : enemy.elite ? 0.35 : 1);
          enemy.x = clamp(enemy.x + Math.cos(pushAngle) * pushDist, 30, world.width - 30);
          enemy.y = clamp(enemy.y + Math.sin(pushAngle) * pushDist, 30, world.height - 30);
          addParticles(game, enemy.x, enemy.y, aw ? '#facc15' : '#38bdf8', 5);
          break;
        }
      }
    });
  }

  // 3. 🌩️ 번개 발사기 (LV 5 각성: 천둥 배터리)
  if ((skills.lightning ?? 0) > 0 && game.enemies.length > 0) {
    st.lightning = (st.lightning ?? 1.8) - delta * cdRate;
    if (st.lightning <= 0) {
      const lv = skills.lightning;
      const aw = Boolean(skAwaken.lightning);
      const strikes = aw ? 5 : lv;
      const targets = game.enemies
        .filter((e) => distance(player, e) < 540)
        .sort(() => Math.random() - 0.5)
        .slice(0, strikes);
      targets.forEach((enemy) => {
        applyDamageToEnemy(enemy, getPlayerDamage(player, aw ? 145 : 52 + lv * 20));
        if (aw) enemy.slow = Math.max(enemy.slow ?? 0, 1.4);
        addParticles(game, enemy.x, enemy.y, aw ? '#facc15' : '#38bdf8', aw ? 14 : 8);
        game.lightningEffects.push({
          x: enemy.x,
          y: enemy.y,
          color: aw ? '#facc15' : '#38bdf8',
          life: 0.22,
          maxLife: 0.22,
        });
      });
      if (targets.length > 0) queueSound(game, 'hit');
      st.lightning = aw ? 1.15 : Math.max(1.65, 2.5 - lv * 0.2);
    }
  }

  // 4. 🔥 화염병 (LV 5 각성: 지옥 불바다)
  if ((skills.molotov ?? 0) > 0 && game.enemies.length > 0) {
    st.molotov = (st.molotov ?? 2.0) - delta * cdRate;
    if (st.molotov <= 0) {
      const lv = skills.molotov;
      const aw = Boolean(skAwaken.molotov);
      const bottles = aw ? 4 : Math.min(3, Math.ceil(lv * 0.75));
      for (let i = 0; i < bottles; i += 1) {
        const pick = game.enemies[Math.floor(Math.random() * game.enemies.length)];
        const distCap = Math.min(260, distance(player, pick));
        const a = Math.atan2(pick.y - player.y, pick.x - player.x) + (i - (bottles - 1) / 2) * 0.65;
        game.fireZones.push({
          x: clamp(player.x + Math.cos(a) * distCap, 50, world.width - 50),
          y: clamp(player.y + Math.sin(a) * distCap, 50, world.height - 50),
          radius: (aw ? 86 : 52 + lv * 7) * player.area,
          damage: getPlayerDamage(player, aw ? 44 : 16 + lv * 6),
          life: aw ? 4.4 : 3.4,
          tick: 0,
          awakened: aw,
        });
      }
      queueSound(game, 'flame');
      st.molotov = aw ? 2.4 : Math.max(2.6, 3.6 - lv * 0.22);
    }
  }

  // 5. 🛸 공격 드론 (LV 5 각성: 디스트로이어)
  if ((skills.drone ?? 0) > 0 && game.enemies.length > 0) {
    st.drone = (st.drone ?? 0.5) - delta * cdRate;
    if (st.drone <= 0) {
      const lv = skills.drone;
      const aw = Boolean(skAwaken.drone);
      const droneCount = aw ? 2 : 1;
      for (let d = 0; d < droneCount; d += 1) {
        const da = game.time * 2.4 + d * Math.PI;
        const dx = player.x + Math.cos(da) * 48;
        const dy = player.y + Math.sin(da) * 48;
        const target = game.enemies
          .map((e) => ({ e, dist: distance({ x: dx, y: dy }, e) }))
          .sort((a, b) => a.dist - b.dist)[0]?.e;
        if (!target) continue;
        const sa = Math.atan2(target.y - dy, target.x - dx);
        game.skillProjectiles.push({
          kind: 'droneMissile',
          x: dx,
          y: dy,
          vx: Math.cos(sa) * (aw ? 760 : 620),
          vy: Math.sin(sa) * (aw ? 760 : 620),
          radius: aw ? 7 : 5,
          damage: getPlayerDamage(player, aw ? 56 : 22 + lv * 8),
          life: 1.15,
          pierce: aw ? 2 : 1,
          awakened: aw,
        });
      }
      st.drone = aw ? 0.22 : Math.max(0.32, 0.72 - lv * 0.09);
    }
  }

  // 6. ⚽ 반사 축구공 (LV 5 각성: 양자 볼)
  if ((skills.soccer ?? 0) > 0 && game.enemies.length > 0) {
    st.soccer = (st.soccer ?? 1.8) - delta * cdRate;
    if (st.soccer <= 0) {
      const lv = skills.soccer;
      const aw = Boolean(skAwaken.soccer);
      const balls = aw ? 4 : Math.min(3, Math.ceil(lv * 0.75));
      for (let i = 0; i < balls; i += 1) {
        const a = Math.random() * Math.PI * 2;
        const spd = aw ? 560 : 440 + lv * 20;
        game.skillProjectiles.push({
          kind: 'soccer',
          x: player.x,
          y: player.y,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          radius: aw ? 14 : 11,
          damage: getPlayerDamage(player, aw ? 92 : 38 + lv * 14),
          life: aw ? 4.2 : 3.2,
          bounces: aw ? 10 : 5 + lv,
          awakened: aw,
        });
      }
      queueSound(game, 'shoot');
      st.soccer = aw ? 2.1 : Math.max(2.3, 3.2 - lv * 0.2);
    }
  }

  // 7. 🪃 톱니 차크람 (LV 5 각성: 자석 휠)
  if ((skills.boomerang ?? 0) > 0 && game.enemies.length > 0) {
    st.boomerang = (st.boomerang ?? 1.7) - delta * cdRate;
    if (st.boomerang <= 0) {
      const lv = skills.boomerang;
      const aw = Boolean(skAwaken.boomerang);
      const count = aw ? 3 : Math.min(3, Math.ceil(lv * 0.7));
      const nearest = game.enemies
        .map((e) => ({ e, dist: distance(player, e) }))
        .sort((a, b) => a.dist - b.dist)[0]?.e;
      const baseA = nearest ? Math.atan2(nearest.y - player.y, nearest.x - player.x) : 0;
      for (let i = 0; i < count; i += 1) {
        const a = baseA + (count === 1 ? 0 : (i / (count - 1) - 0.5) * 0.75);
        game.skillProjectiles.push({
          kind: 'chakram',
          x: player.x,
          y: player.y,
          vx: Math.cos(a) * (aw ? 600 : 500),
          vy: Math.sin(a) * (aw ? 600 : 500),
          radius: aw ? 22 : 14 + lv,
          damage: getPlayerDamage(player, aw ? 105 : 44 + lv * 15),
          life: aw ? 2.4 : 1.9,
          maxLife: aw ? 2.4 : 1.9,
          spin: 0,
          awakened: aw,
          hitCooldowns: new Map(),
        });
      }
      queueSound(game, 'bat');
      st.boomerang = aw ? 1.8 : Math.max(2.0, 2.9 - lv * 0.2);
    }
  }

  // === Combat Pet AI (50종 펫 · 5등급 파워 스케일링 · 6종 전투 스타일) ===
  if (game.pet) {
    const pet = game.pet;
    const plv = pet.level ?? 1;
    const pMult = (pet.powerMult ?? 1) * (1 + (plv - 1) * 0.32);
    const followX = player.x - 44 + Math.cos(game.time * 2.2) * 14;
    const followY = player.y + 24 + Math.sin(game.time * 3.1) * 10;

    if (pet.lungeTimer > 0) {
      pet.lungeTimer -= delta;
      pet.x = clamp(pet.x + pet.lungeVx * delta, 24, world.width - 24);
      pet.y = clamp(pet.y + pet.lungeVy * delta, 24, world.height - 24);
    } else {
      pet.x += (followX - pet.x) * Math.min(1, delta * 5.2);
      pet.y += (followY - pet.y) * Math.min(1, delta * 5.2);
    }

    pet.cooldown -= delta;
    if (pet.style === 'healFire') {
      pet.healTimer = (pet.healTimer ?? 6) - delta;
      if (pet.healTimer <= 0 && player.hp > 0) {
        const healAmt = Math.round((4 + plv * 2) * Math.min(2.2, pet.powerMult ?? 1));
        player.hp = Math.min(player.maxHp, player.hp + healAmt);
        addParticles(game, player.x, player.y, '#4ade80', 10);
        pet.healTimer = 5.8;
      }
    }

    if (pet.cooldown <= 0 && game.enemies.length > 0) {
      const target = game.enemies
        .map((e) => ({ e, dist: distance(pet, e) }))
        .sort((a, b) => a.dist - b.dist)[0]?.e;
      if (target && distance(pet, target) < 500) {
        const a = Math.atan2(target.y - pet.y, target.x - pet.x);
        const isHighTier = pet.rarity === 'legend' || pet.rarity === 'mythic';

        if (pet.style === 'lunge') {
          pet.lungeTimer = 0.24;
          pet.lungeVx = Math.cos(a) * 650;
          pet.lungeVy = Math.sin(a) * 650;
          applyDamageToEnemy(target, getPlayerDamage(player, 46 * pMult));
          target.slow = Math.max(target.slow ?? 0, 0.75);
          addParticles(game, target.x, target.y, pet.color, isHighTier ? 14 : 9);
          queueSound(game, 'hit');
          pet.cooldown = Math.max(0.65, 1.3 - plv * 0.09);
        } else if (pet.style === 'bolt') {
          const shots = pet.rarity === 'mythic' ? 3 : pet.rarity === 'legend' ? 2 : 1;
          for (let i = 0; i < shots; i += 1) {
            const offset = shots === 1 ? 0 : (i / (shots - 1) - 0.5) * 0.22;
            const sa = a + offset;
            game.skillProjectiles.push({
              kind: 'droneMissile',
              x: pet.x,
              y: pet.y,
              vx: Math.cos(sa) * 780,
              vy: Math.sin(sa) * 780,
              radius: isHighTier ? 8 : 6,
              damage: getPlayerDamage(player, 34 * pMult),
              life: 1.2,
              pierce: 2 + Math.floor(plv / 2),
              awakened: isHighTier || plv >= 5,
            });
          }
          queueSound(game, 'shoot');
          pet.cooldown = Math.max(0.48, 0.98 - plv * 0.08);
        } else if (pet.style === 'poison') {
          game.fireZones.push({
            x: target.x,
            y: target.y,
            radius: (56 + plv * 7) * player.area * (isHighTier ? 1.25 : 1),
            damage: getPlayerDamage(player, 18 * pMult),
            life: 3.6,
            tick: 0,
            poison: true,
            awakened: isHighTier,
          });
          addParticles(game, target.x, target.y, '#22c55e', 10);
          pet.cooldown = Math.max(1.65, 2.7 - plv * 0.16);
        } else if (pet.style === 'healFire') {
          const fan = pet.rarity === 'mythic' ? 5 : 3;
          for (let i = 0; i < fan; i += 1) {
            const fa = a + (i / (fan - 1) - 0.5) * 0.5;
            game.skillProjectiles.push({
              kind: 'droneMissile',
              x: pet.x,
              y: pet.y,
              vx: Math.cos(fa) * 680,
              vy: Math.sin(fa) * 680,
              radius: isHighTier ? 8 : 6,
              damage: getPlayerDamage(player, 24 * pMult),
              life: 1.05,
              pierce: 2,
              awakened: isHighTier || plv >= 4,
            });
          }
          queueSound(game, 'flame');
          pet.cooldown = Math.max(0.75, 1.38 - plv * 0.09);
        } else if (pet.style === 'lightning') {
          const strikes = pet.rarity === 'mythic' ? 4 : pet.rarity === 'legend' ? 3 : 2;
          const targets = game.enemies
            .filter((e) => distance(pet, e) < 520)
            .sort(() => Math.random() - 0.5)
            .slice(0, strikes);
          targets.forEach((enemy) => {
            applyDamageToEnemy(enemy, getPlayerDamage(player, 44 * pMult));
            enemy.slow = Math.max(enemy.slow ?? 0, 0.7);
            addParticles(game, enemy.x, enemy.y, pet.rarityColor || '#facc15', 10);
            game.lightningEffects.push({
              x: enemy.x,
              y: enemy.y,
              color: pet.rarityColor || '#38bdf8',
              life: 0.22,
              maxLife: 0.22,
            });
          });
          if (targets.length > 0) queueSound(game, 'hit');
          pet.cooldown = Math.max(0.95, 1.7 - plv * 0.12);
        } else {
          // breath: explosive dragon/apex breath!
          game.skillProjectiles.push({
            kind: 'rocket',
            x: pet.x,
            y: pet.y,
            vx: Math.cos(a) * 580,
            vy: Math.sin(a) * 580,
            radius: isHighTier ? 14 : 11,
            blast: (92 + plv * 11) * player.area * (pet.rarity === 'mythic' ? 1.25 : 1),
            damage: getPlayerDamage(player, 58 * pMult),
            life: 1.85,
            awakened: isHighTier,
          });
          queueSound(game, 'flame');
          pet.cooldown = Math.max(1.0, 1.78 - plv * 0.13);
        }
      }
    }
  }

  // Update active fire zones (화염병 불장판 & 🐸 개굴 독 장판)
  game.fireZones = (game.fireZones ?? []).filter((zone) => {
    zone.life -= delta;
    zone.tick -= delta;
    if (zone.tick <= 0) {
      zone.tick = 0.26;
      game.enemies.forEach((enemy) => {
        if (distance(zone, enemy) < zone.radius + enemy.radius) {
          applyDamageToEnemy(enemy, zone.damage);
          if (zone.poison) enemy.slow = Math.max(enemy.slow ?? 0, 0.9);
          addParticles(
            game,
            enemy.x,
            enemy.y,
            zone.poison ? '#22c55e' : zone.awakened ? '#38bdf8' : '#f97316',
            2,
          );
        }
      });
    }
    return zone.life > 0;
  });

  // Update skill projectiles (로켓, 드론 미사일, 반사 축구공, 왕복 차크람)
  game.skillProjectiles = (game.skillProjectiles ?? []).filter((sp) => {
    sp.life -= delta;
    sp.spin = (sp.spin ?? 0) + delta * 18;

    if (sp.kind === 'chakram') {
      const elapsed = (sp.maxLife ?? 2) - sp.life;
      if (elapsed > 0.55) {
        const backA = Math.atan2(player.y - sp.y, player.x - sp.x);
        const speed = sp.awakened ? 640 : 540;
        sp.vx += (Math.cos(backA) * speed - sp.vx) * Math.min(1, delta * 5.2);
        sp.vy += (Math.sin(backA) * speed - sp.vy) * Math.min(1, delta * 5.2);
        if (elapsed > 0.9 && distance(player, sp) < 28) return false;
      }
      sp.x += sp.vx * delta;
      sp.y += sp.vy * delta;
      if (!sp.hitCooldowns) sp.hitCooldowns = new Map();
      game.enemies.forEach((enemy) => {
        const lastHit = sp.hitCooldowns.get(enemy) ?? -1;
        if (game.time - lastHit > 0.24 && distance(sp, enemy) < sp.radius + enemy.radius) {
          sp.hitCooldowns.set(enemy, game.time);
          applyDamageToEnemy(enemy, sp.damage);
          addParticles(game, enemy.x, enemy.y, sp.awakened ? '#facc15' : '#94a3b8', 5);
        }
      });
      return sp.life > 0;
    }

    if (sp.kind === 'rocket') {
      // Gentle homing toward nearest enemy
      const nearest = game.enemies
        .map((e) => ({ e, dist: distance(sp, e) }))
        .sort((a, b) => a.dist - b.dist)[0]?.e;
      if (nearest && distance(sp, nearest) < 340) {
        const desired = Math.atan2(nearest.y - sp.y, nearest.x - sp.x);
        const spd = Math.hypot(sp.vx, sp.vy);
        sp.vx += (Math.cos(desired) * spd - sp.vx) * Math.min(1, delta * 4);
        sp.vy += (Math.sin(desired) * spd - sp.vy) * Math.min(1, delta * 4);
      }
      sp.x += sp.vx * delta;
      sp.y += sp.vy * delta;
      if (Math.random() < 0.65) {
        addParticles(game, sp.x, sp.y, sp.awakened ? '#facc15' : '#fb923c', 1);
      }
      const hitEnemy = game.enemies.some((e) => distance(sp, e) < sp.radius + e.radius);
      if (hitEnemy || sp.life <= 0) {
        game.enemies.forEach((enemy) => {
          if (distance(sp, enemy) < sp.blast + enemy.radius) {
            applyDamageToEnemy(enemy, sp.damage);
            addParticles(game, enemy.x, enemy.y, '#fb923c', 5);
          }
        });
        addParticles(game, sp.x, sp.y, sp.awakened ? '#facc15' : '#ef4444', sp.awakened ? 34 : 22);
        game.shake = Math.max(game.shake, sp.awakened ? 11 : 7);
        queueSound(game, 'boom');
        return false;
      }
      return sp.x > 0 && sp.y > 0 && sp.x < world.width && sp.y < world.height;
    }

    if (sp.kind === 'soccer') {
      sp.x += sp.vx * delta;
      sp.y += sp.vy * delta;
      // Bounce off camera bounds
      if (sp.x < camera.x + sp.radius || sp.x > camera.x + camera.width - sp.radius) {
        sp.vx *= -1;
        sp.x = clamp(sp.x, camera.x + sp.radius, camera.x + camera.width - sp.radius);
      }
      if (sp.y < camera.y + sp.radius || sp.y > camera.y + camera.height - sp.radius) {
        sp.vy *= -1;
        sp.y = clamp(sp.y, camera.y + sp.radius, camera.y + camera.height - sp.radius);
      }
      for (let i = 0; i < game.enemies.length; i += 1) {
        const enemy = game.enemies[i];
        if (distance(sp, enemy) < sp.radius + enemy.radius) {
          applyDamageToEnemy(enemy, sp.damage);
          if (sp.awakened) {
            game.enemies.forEach((near) => {
              if (near !== enemy && distance(enemy, near) < 76) {
                applyDamageToEnemy(near, sp.damage * 0.45);
              }
            });
            addParticles(game, sp.x, sp.y, '#22d3ee', 10);
          } else {
            addParticles(game, sp.x, sp.y, '#ffffff', 6);
          }
          const bounceA = Math.atan2(sp.y - enemy.y, sp.x - enemy.x) + randomBetween(-0.4, 0.4);
          const spd = Math.hypot(sp.vx, sp.vy);
          sp.vx = Math.cos(bounceA) * spd;
          sp.vy = Math.sin(bounceA) * spd;
          sp.bounces -= 1;
          queueSound(game, 'hit');
          if (sp.bounces <= 0) return false;
          break;
        }
      }
      return sp.life > 0;
    }

    // droneMissile
    sp.x += sp.vx * delta;
    sp.y += sp.vy * delta;
    for (let i = 0; i < game.enemies.length; i += 1) {
      const enemy = game.enemies[i];
      if (distance(sp, enemy) < sp.radius + enemy.radius) {
        applyDamageToEnemy(enemy, sp.damage);
        sp.pierce -= 1;
        addParticles(game, enemy.x, enemy.y, sp.awakened ? '#facc15' : '#a855f7', 5);
        if (sp.pierce <= 0) return false;
      }
    }
    return sp.life > 0 && sp.x > 0 && sp.y > 0 && sp.x < world.width && sp.y < world.height;
  });

  updateOrbit(game, delta);

  game.bullets = game.bullets.filter((bullet) => {
    if (bullet.homing && game.enemies.length > 0) {
      const target = game.enemies
        .map((e) => ({ e, dist: distance(bullet, e) }))
        .sort((a, b) => a.dist - b.dist)[0]?.e;
      if (target && distance(bullet, target) < 420) {
        const desired = Math.atan2(target.y - bullet.y, target.x - bullet.x);
        const spd = Math.hypot(bullet.vx, bullet.vy) || 820;
        bullet.vx += (Math.cos(desired) * spd - bullet.vx) * Math.min(1, delta * 9);
        bullet.vy += (Math.sin(desired) * spd - bullet.vy) * Math.min(1, delta * 9);
      }
    }

    bullet.x += bullet.vx * delta;
    bullet.y += bullet.vy * delta;
    bullet.life -= delta;
    bullet.spin += delta * 14;
    bullet.armed = Math.max(0, (bullet.armed ?? 0) - delta);

    if (bullet.type === 'gaster') {
      if (bullet.charge > 0) {
        bullet.charge -= delta;
        if (bullet.charge <= 0 && !bullet.fired) {
          bullet.fired = true;
          game.shake = Math.max(game.shake, bullet.awakened ? 12 : 8);
          queueSound(game, 'gaster');
          addParticles(game, bullet.x, bullet.y, '#e0f2fe', 16);
        }
        return bullet.life > 0;
      }

      // Active mega laser beam collision (distance from enemy center to beam segment!)
      const bx1 = bullet.x;
      const by1 = bullet.y;
      const dx = Math.cos(bullet.angle);
      const dy = Math.sin(bullet.angle);
      const len = bullet.beamLength ?? 740;
      const halfWidth = bullet.radius * 0.68;

      if (!bullet.hitCooldowns) bullet.hitCooldowns = new Map();
      game.enemies.forEach((enemy) => {
        const lastHit = bullet.hitCooldowns.get(enemy) ?? -1;
        if (game.time - lastHit < 0.085) return;
        const ex = enemy.x - bx1;
        const ey = enemy.y - by1;
        const proj = clamp(ex * dx + ey * dy, 0, len);
        const cx = bx1 + dx * proj;
        const cy = by1 + dy * proj;
        if (Math.hypot(enemy.x - cx, enemy.y - cy) < halfWidth + enemy.radius) {
          bullet.hitCooldowns.set(enemy, game.time);
          applyDamageToEnemy(enemy, bullet.damage * 0.58);
          if (enemy.boss) {
            enemy.hp -= Math.min(220, enemy.maxHp * 0.006);
          }
          // 💀 Sans KR (KARMA): defense-piercing purple damage-over-time on every Gaster hit!
          enemy.karmaTimer = Math.max(enemy.karmaTimer ?? 0, bullet.awakened ? 4.0 : 2.8);
          enemy.karmaDps = Math.max(enemy.karmaDps ?? 0, bullet.damage * (bullet.awakened ? 1.15 : 0.65));
          addParticles(game, enemy.x, enemy.y, bullet.awakened ? '#e879f9' : '#38bdf8', 5);
        }
      });

      return bullet.life > 0;
    }

    if (bullet.type === 'sansBone') {
      game.enemies.forEach((enemy) => {
        if (bullet.hitIds.has(enemy)) return;
        if (distance(bullet, enemy) < bullet.radius + enemy.radius) {
          bullet.hitIds.add(enemy);
          applyDamageToEnemy(enemy, bullet.damage);
          enemy.slow = Math.max(enemy.slow ?? 0, bullet.slow ?? 0.5);
          enemy.karmaTimer = Math.max(enemy.karmaTimer ?? 0, 3.0);
          enemy.karmaDps = Math.max(enemy.karmaDps ?? 0, bullet.damage * 0.65);
          addParticles(game, enemy.x, enemy.y, bullet.blueBone ? '#38bdf8' : '#e879f9', 6);
          if (Math.random() < 0.25) queueSound(game, 'hit');
        }
      });
      return bullet.life > 0 && bullet.x > 0 && bullet.y > 0 && bullet.x < world.width && bullet.y < world.height;
    }

    if (bullet.type === 'trident') {
      bullet.outboundTime = Math.max(0, (bullet.outboundTime ?? 0) - delta);
      const hitWall =
        bullet.x <= 28 ||
        bullet.y <= 28 ||
        bullet.x >= world.width - 28 ||
        bullet.y >= world.height - 28;

      if (!bullet.returning && (bullet.outboundTime <= 0 || hitWall)) {
        bullet.returning = true;
        addParticles(game, bullet.x, bullet.y, bullet.awakened ? '#facc15' : '#5eead4', 8);
      }

      if (bullet.returning) {
        const backAngle = Math.atan2(player.y - bullet.y, player.x - bullet.x);
        const returnSpd = (bullet.speed ?? 960) * 1.35;
        bullet.vx = Math.cos(backAngle) * returnSpd;
        bullet.vy = Math.sin(backAngle) * returnSpd;
      }

      if (Math.random() < 0.65) {
        addParticles(game, bullet.x, bullet.y, bullet.awakened ? '#fef08a' : '#5eead4', 1);
      }

      const hitSet = bullet.returning ? bullet.hitBack : bullet.hitOut;
      const splashRadius = (bullet.awakened ? 165 : 115) * player.area;
      const strikeDmg = bullet.damage * (bullet.returning ? 1.25 : 1);

      game.enemies.forEach((enemy) => {
        if (hitSet.has(enemy)) return;
        if (distance(bullet, enemy) < bullet.radius + enemy.radius) {
          hitSet.add(enemy);
          // Main spear strike + bonus boss-melting sea true damage!
          applyDamageToEnemy(enemy, strikeDmg);
          if (enemy.boss) {
            enemy.hp -= Math.min(260, enemy.maxHp * 0.008);
          }
          enemy.slow = Math.max(enemy.slow ?? 0, bullet.slow ?? 1.2);
          addParticles(game, enemy.x, enemy.y, bullet.awakened ? '#facc15' : '#2dd4bf', bullet.awakened ? 12 : 8);

          // Sky Lightning Bolt on hit!
          if ((game.lightningEffects?.length ?? 0) < 18) {
            game.lightningEffects.push({
              x: enemy.x,
              y: enemy.y,
              color: bullet.awakened ? '#facc15' : '#2dd4bf',
              life: 0.22,
              maxLife: 0.22,
            });
          }

          // Massive Poseidon Ocean Wave & Chain Lightning Splash!
          game.enemies.forEach((nearby) => {
            if (nearby !== enemy && distance(enemy, nearby) < splashRadius) {
              applyDamageToEnemy(nearby, strikeDmg * (bullet.awakened ? 0.85 : 0.65));
              nearby.slow = Math.max(nearby.slow ?? 0, (bullet.slow ?? 1.2) * 0.85);
              addParticles(game, nearby.x, nearby.y, bullet.awakened ? '#fef08a' : '#38bdf8', 3);
            }
          });
          if (!player.sansHero && player.hp > 0 && Math.random() < 0.25) {
            player.hp = Math.min(player.maxHp, player.hp + 1);
          }
          if (Math.random() < 0.25) queueSound(game, 'hit');
        }
      });

      if (bullet.returning && distance(bullet, player) < 36) {
        addParticles(game, player.x, player.y, bullet.awakened ? '#facc15' : '#5eead4', 5);
        return false;
      }
      return bullet.life > 0;
    }

    if (bullet.type === 'katana') {
      bullet.x = player.x;
      bullet.y = player.y;

      game.enemies.forEach((enemy) => {
        if (bullet.hitIds.has(enemy)) return;
        const distToEnemy = distance(player, enemy);
        if (distToEnemy > bullet.radius + enemy.radius) return;
        const dirToEnemy = Math.atan2(enemy.y - player.y, enemy.x - player.x);
        const rawDiff = dirToEnemy - bullet.angle;
        const angleDiff = Math.abs(Math.atan2(Math.sin(rawDiff), Math.cos(rawDiff)));
        if (angleDiff > bullet.arc * 0.56) return;

        bullet.hitIds.add(enemy);
        applyDamageToEnemy(enemy, bullet.damage);
        if (bullet.awakened && player.hp > 0 && Math.random() < 0.35) {
          player.hp = Math.min(player.maxHp, player.hp + 1);
        }
        const push = (bullet.knockback ?? 45) * (enemy.boss ? 0.1 : enemy.elite ? 0.3 : 1);
        enemy.x = clamp(enemy.x + Math.cos(dirToEnemy) * push, 30, world.width - 30);
        enemy.y = clamp(enemy.y + Math.sin(dirToEnemy) * push, 30, world.height - 30);
        addParticles(game, enemy.x, enemy.y, bullet.color, 6);
      });

      return bullet.life > 0;
    }

    if (bullet.type === 'bat') {
      bullet.x = player.x;
      bullet.y = player.y;
      const isFullSpin = bullet.arc >= Math.PI * 1.99;

      game.enemies.forEach((enemy) => {
        if (bullet.hitIds.has(enemy)) return;
        const distToEnemy = distance(player, enemy);
        if (distToEnemy > bullet.radius + enemy.radius) return;

        const dirToEnemy = Math.atan2(enemy.y - player.y, enemy.x - player.x);
        if (!isFullSpin) {
          const rawDiff = dirToEnemy - bullet.angle;
          const angleDiff = Math.abs(Math.atan2(Math.sin(rawDiff), Math.cos(rawDiff)));
          if (angleDiff > bullet.arc * 0.54) return;
        }

        bullet.hitIds.add(enemy);
        const batHitDamage =
          enemy.elite && !enemy.boss
            ? Math.max(bullet.damage, Math.ceil(enemy.maxHp * 0.5))
            : bullet.damage;
        applyDamageToEnemy(enemy, batHitDamage);
        enemy.slow = Math.max(enemy.slow ?? 0, bullet.awakened ? 0.9 : 0.45);
        const push = bullet.knockback * (enemy.boss ? 0.14 : enemy.elite || enemy.kind === 'shielder' ? 0.35 : 1);
        enemy.x = clamp(enemy.x + Math.cos(dirToEnemy) * push, 30, world.width - 30);
        enemy.y = clamp(enemy.y + Math.sin(dirToEnemy) * push, 30, world.height - 30);
        game.shake = Math.max(game.shake, bullet.awakened ? 8 : 5);
        addParticles(game, enemy.x, enemy.y, bullet.awakened ? '#facc15' : bullet.color, bullet.awakened ? 12 : 7);
        if (Math.random() < 0.35) queueSound(game, 'hit');
      });

      return bullet.life > 0;
    }

    if (bullet.type === 'shockwave') {
      const progress = 1 - bullet.life / (bullet.maxLife ?? weapons.find((weapon) => weapon.id === 'shockwave')?.life ?? 0.34);
      bullet.radius = bullet.blast * clamp(progress, 0.18, 1);

      game.enemies.forEach((enemy) => {
        if (!bullet.hitIds.has(enemy) && distance(bullet, enemy) < bullet.radius + enemy.radius) {
          applyDamageToEnemy(enemy, bullet.damage);
          enemy.slow = Math.max(enemy.slow ?? 0, 0.55);
          bullet.hitIds.add(enemy);
          addParticles(game, enemy.x, enemy.y, bullet.color, 8);
        }
      });

      return bullet.life > 0;
    }

    if (bullet.type === 'mine') {
      const shouldExplode = bullet.armed <= 0 && game.enemies.some((enemy) => distance(bullet, enemy) < bullet.blast);
      if (!shouldExplode) return bullet.life > 0;

      game.enemies.forEach((enemy) => {
        if (distance(bullet, enemy) < bullet.blast + enemy.radius) {
          applyDamageToEnemy(enemy, bullet.damage);
          addParticles(game, enemy.x, enemy.y, bullet.color, 6);
        }
      });
      game.shake = 9;
      addParticles(game, bullet.x, bullet.y, bullet.color, 26);
      return false;
    }

    for (let i = 0; i < game.enemies.length; i += 1) {
      const enemy = game.enemies[i];
      if (distance(bullet, enemy) < bullet.radius + enemy.radius) {
        applyDamageToEnemy(enemy, bullet.damage);
        enemy.slow = Math.max(enemy.slow ?? 0, bullet.slow ?? 0);
        bullet.pierce -= 1;
        game.shake = 3;
        addParticles(game, enemy.x, enemy.y, bullet.color, bullet.awakened ? 12 : bullet.type === 'flame' ? 2 : 5);
        if (bullet.awakened && ['railgun', 'boomer'].includes(bullet.type)) {
          game.enemies.forEach((nearby) => {
            if (nearby !== enemy && distance(enemy, nearby) < 52) {
              applyDamageToEnemy(nearby, bullet.damage * 0.18);
              addParticles(game, nearby.x, nearby.y, bullet.color, 3);
            }
          });
        }
        if (bullet.awakened && bullet.type === 'frost') {
          game.enemies.forEach((nearby) => {
            if (distance(enemy, nearby) < 78) nearby.slow = Math.max(nearby.slow ?? 0, 1.1);
          });
        }
        if (Math.random() < 0.18) queueSound(game, 'hit');
        if (bullet.pierce <= 0) return false;
      }
    }

    return bullet.life > 0 && bullet.x > 0 && bullet.y > 0 && bullet.x < world.width && bullet.y < world.height;
  });

  const activeHero = HEROES[game.heroIndex ?? 0];
  const spawnedChildren = [];

  game.enemies = game.enemies.filter((enemy) => {
    const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    const baseSlow = enemy.slow > 0 ? (enemy.boss ? 0.88 : 0.45) : 1;
    const bmSlow = game.bm?.timeSlow ? (enemy.boss ? 0.65 : 0.45) : 1;
    const slowFactor = baseSlow * bmSlow;
    enemy.slow = Math.max(0, (enemy.slow ?? 0) - delta);

    // 💀 Sans KR (KARMA) poison tick — ignores boss damage reduction!
    if (player.sansHero && enemy._prevHp !== undefined && enemy.hp < enemy._prevHp) {
      enemy.karmaTimer = Math.max(enemy.karmaTimer ?? 0, 2.8);
      enemy.karmaDps = Math.max(enemy.karmaDps ?? 0, 26 + player.damage * 20);
    }
    if ((enemy.karmaTimer ?? 0) > 0) {
      enemy.karmaTimer = Math.max(0, enemy.karmaTimer - delta);
      enemy.hp -= (enemy.karmaDps ?? 35) * delta;
      if (Math.random() < 0.35) {
        addParticles(game, enemy.x, enemy.y, '#d946ef', 1);
      }
    }
    enemy._prevHp = enemy.hp;

    if (enemy.boss) {
      const hpPct = enemy.hp / enemy.maxHp;
      const enraged = hpPct < 0.6;
      const berserk = hpPct < 0.3;
      const rageMult = berserk ? 1.75 : enraged ? 1.38 : 1;
      enemy.dashTimer -= delta * rageMult;
      enemy.shootTimer -= delta * rageMult;
      enemy.novaTimer = (enemy.novaTimer ?? 4.8) - delta * rageMult;

      if (enemy.dashWindup > 0) {
        enemy.dashWindup -= delta;
        enemy.dashAngle = angle;
        if (enemy.dashWindup <= 0) {
          enemy.dashActive = 0.46;
          queueSound(game, 'boom');
          addParticles(game, enemy.x, enemy.y, enemy.glow || '#ef4444', 22);
        }
      } else if (enemy.dashActive > 0) {
        enemy.dashActive -= delta;
        const dashSpeed = (berserk ? 680 : enraged ? 590 : 510) * bmSlow;
        enemy.x = clamp(enemy.x + Math.cos(enemy.dashAngle) * dashSpeed * delta, 60, world.width - 60);
        enemy.y = clamp(enemy.y + Math.sin(enemy.dashAngle) * dashSpeed * delta, 60, world.height - 60);
        if (Math.random() < 0.75) {
          addParticles(game, enemy.x, enemy.y, berserk ? '#facc15' : enemy.glow || '#f97316', 3);
        }
        // End of dash -> emit radial shockwave bullets + optional 2nd chain dash!
        if (enemy.dashActive <= 0) {
          const burstN = berserk ? 12 : enraged ? 8 : 6;
          const burstSpd = 340 * bmSlow;
          for (let k = 0; k < burstN; k += 1) {
            const ba = (Math.PI * 2 * k) / burstN + game.time;
            game.enemyBullets.push({
              x: enemy.x,
              y: enemy.y,
              vx: Math.cos(ba) * burstSpd,
              vy: Math.sin(ba) * burstSpd,
              radius: 10,
              damage: Math.round(enemy.damage * 0.72),
              life: 3.1,
              color: '#facc15',
            });
          }
          if ((enemy.dashChain ?? 0) > 0) {
            enemy.dashChain -= 1;
            enemy.dashWindup = 0.28;
          }
        }
      } else {
        enemy.x = clamp(enemy.x + Math.cos(angle) * enemy.speed * rageMult * slowFactor * delta, 60, world.width - 60);
        enemy.y = clamp(enemy.y + Math.sin(angle) * enemy.speed * rageMult * slowFactor * delta, 60, world.height - 60);

        if (enemy.dashTimer <= 0) {
          enemy.dashAngle = angle;
          enemy.dashWindup = berserk ? 0.38 : enraged ? 0.48 : 0.62;
          enemy.dashChain = berserk ? 2 : enraged ? 1 : 0;
          enemy.dashTimer = berserk ? 2.6 : enraged ? 3.2 : 4.0;
        }
      }

      // Periodic Boss Shockwave Nova
      if (enemy.novaTimer <= 0) {
        const novaCount = berserk ? 24 : enraged ? 18 : 14;
        const novaSpd = (berserk ? 410 : 350) * bmSlow;
        for (let i = 0; i < novaCount; i += 1) {
          const a = (Math.PI * 2 * i) / novaCount + game.time * 1.1;
          game.enemyBullets.push({
            x: enemy.x,
            y: enemy.y,
            vx: Math.cos(a) * novaSpd,
            vy: Math.sin(a) * novaSpd,
            radius: 11,
            damage: Math.round(enemy.damage * 0.78),
            life: 3.8,
            color: berserk ? '#facc15' : '#ef4444',
          });
        }
        game.shake = Math.max(game.shake, 11);
        queueSound(game, 'boom');
        enemy.novaTimer = berserk ? 3.6 : 5.2;
      }

      if (enemy.shootTimer <= 0 && enemy.dashWindup <= 0) {
        const bSpeed = (berserk ? 430 : enraged ? 380 : 330) * bmSlow;
        const bDamage = Math.round(enemy.damage * 0.78);
        const bColor = enemy.bulletColor || '#ef4444';

        if (enemy.pattern === 'neonRing') {
          const count = berserk ? 20 : enraged ? 16 : 12;
          for (let i = 0; i < count; i += 1) {
            const a = (Math.PI * 2 * i) / count + game.time * 0.9;
            game.enemyBullets.push({
              x: enemy.x,
              y: enemy.y,
              vx: Math.cos(a) * bSpeed,
              vy: Math.sin(a) * bSpeed,
              radius: 10,
              damage: bDamage,
              life: 3.6,
              color: bColor,
            });
          }
          // Plus 3-way aimed sniper shot
          for (let s = -1; s <= 1; s += 1) {
            const sa = angle + s * 0.16;
            game.enemyBullets.push({
              x: enemy.x,
              y: enemy.y,
              vx: Math.cos(sa) * (bSpeed * 1.28),
              vy: Math.sin(sa) * (bSpeed * 1.28),
              radius: 11,
              damage: bDamage + 6,
              life: 3.2,
              color: '#facc15',
            });
          }
          enemy.shootTimer = 1.85;
        } else if (enemy.pattern === 'boulderBurst') {
          const count = berserk ? 13 : enraged ? 10 : 8;
          for (let i = 0; i < count; i += 1) {
            const spreadOffset = (i / (count - 1) - 0.5) * 1.35;
            const a = angle + spreadOffset;
            game.enemyBullets.push({
              x: enemy.x,
              y: enemy.y,
              vx: Math.cos(a) * (bSpeed * 1.12),
              vy: Math.sin(a) * (bSpeed * 1.12),
              radius: 13,
              damage: bDamage + 6,
              life: 3.4,
              color: bColor,
            });
          }
          if (game.enemies.length < 34) {
            spawnEnemy(game, camera);
            if (enraged) spawnEnemy(game, camera);
          }
          enemy.shootTimer = 1.65;
        } else if (enemy.pattern === 'frostSpiral') {
          enemy.spiralOffset = (enemy.spiralOffset ?? 0) + 0.52;
          const count = berserk ? 22 : enraged ? 18 : 14;
          for (let i = 0; i < count; i += 1) {
            const a = (Math.PI * 2 * i) / count + enemy.spiralOffset;
            game.enemyBullets.push({
              x: enemy.x,
              y: enemy.y,
              vx: Math.cos(a) * bSpeed,
              vy: Math.sin(a) * bSpeed,
              radius: 11,
              damage: bDamage,
              life: 4.0,
              color: bColor,
              chill: true,
            });
          }
          for (let s = -1; s <= 1; s += 1) {
            const sa = angle + s * 0.14;
            game.enemyBullets.push({
              x: enemy.x,
              y: enemy.y,
              vx: Math.cos(sa) * (bSpeed * 1.32),
              vy: Math.sin(sa) * (bSpeed * 1.32),
              radius: 12,
              damage: bDamage + 6,
              life: 3.4,
              color: '#e0f2fe',
              chill: true,
            });
          }
          enemy.shootTimer = 1.5;
        } else {
          // Final Boss: Inferno Lord — massive hellfire ring + 5-way meteor barrage + reinforcements!
          const ringCount = berserk ? 28 : enraged ? 22 : 16;
          for (let i = 0; i < ringCount; i += 1) {
            const a = (Math.PI * 2 * i) / ringCount + game.time * 1.2;
            game.enemyBullets.push({
              x: enemy.x,
              y: enemy.y,
              vx: Math.cos(a) * bSpeed,
              vy: Math.sin(a) * bSpeed,
              radius: 11,
              damage: bDamage,
              life: 4.0,
              color: bColor,
            });
          }
          for (let j = -2; j <= 2; j += 1) {
            const a = angle + j * 0.17;
            game.enemyBullets.push({
              x: enemy.x,
              y: enemy.y,
              vx: Math.cos(a) * (bSpeed * 1.38),
              vy: Math.sin(a) * (bSpeed * 1.38),
              radius: 14,
              damage: bDamage + 12,
              life: 3.5,
              color: '#facc15',
            });
          }
          if (game.enemies.length < 32) spawnEnemy(game, camera);
          enemy.shootTimer = 1.45;
        }
        queueSound(game, 'shoot');
      }
    } else if (enemy.kind === 'shooter') {
      const distToPlayer = distance(player, enemy);
      if (distToPlayer > 235) {
        enemy.x += Math.cos(angle) * enemy.speed * slowFactor * delta;
        enemy.y += Math.sin(angle) * enemy.speed * slowFactor * delta;
      } else if (distToPlayer < 155) {
        enemy.x = clamp(enemy.x - Math.cos(angle) * enemy.speed * 0.65 * slowFactor * delta, 30, world.width - 30);
        enemy.y = clamp(enemy.y - Math.sin(angle) * enemy.speed * 0.65 * slowFactor * delta, 30, world.height - 30);
      }
      enemy.shootTimer = (enemy.shootTimer ?? 2.4) - delta;
      if (enemy.shootTimer <= 0 && distToPlayer < 460) {
        const orbSpeed = 245 * bmSlow;
        game.enemyBullets.push({
          x: enemy.x,
          y: enemy.y,
          vx: Math.cos(angle) * orbSpeed,
          vy: Math.sin(angle) * orbSpeed,
          radius: 7,
          damage: enemy.damage,
          life: 2.8,
          color: '#e879f9',
        });
        enemy.shootTimer = 2.6;
      }
    } else if (enemy.kind === 'ghost') {
      enemy.phaseTimer = (enemy.phaseTimer ?? 2.2) - delta;
      if (enemy.phaseTimer <= 0 && (enemy.phaseDash ?? 0) <= 0) {
        enemy.phaseDash = 0.36;
        enemy.phaseTimer = 2.4;
      }
      let ghostBoost = 1;
      if ((enemy.phaseDash ?? 0) > 0) {
        enemy.phaseDash -= delta;
        ghostBoost = 2.5;
        if (Math.random() < 0.45) addParticles(game, enemy.x, enemy.y, '#818cf8', 1);
      }
      enemy.x = clamp(enemy.x + Math.cos(angle) * enemy.speed * ghostBoost * slowFactor * delta, 30, world.width - 30);
      enemy.y = clamp(enemy.y + Math.sin(angle) * enemy.speed * ghostBoost * slowFactor * delta, 30, world.height - 30);
    } else {
      enemy.x += Math.cos(angle) * enemy.speed * slowFactor * delta;
      enemy.y += Math.sin(angle) * enemy.speed * slowFactor * delta;
    }

    if (enemy.kind === 'bomber' && distance(player, enemy) < player.radius + enemy.radius + 18) {
      enemy.hp = 0;
    }

    if (distance(player, enemy) < player.radius + enemy.radius) {
      if (game.bm?.immortal) {
        if (player.invincible <= 0) {
          player.invincible = 0.25;
          addParticles(game, player.x, player.y, '#e879f9', 8);
        }
      } else if (trySansDodge(game)) {
        // Dodged with Sans MISS!
      } else if (player.invincible <= 0) {
        player.hp = Math.max(0, player.hp - Math.max(1, enemy.damage - player.armor));
        player.invincible = 0.55 + player.invincibleBonus;
        game.shake = 11;
        addParticles(game, player.x, player.y, '#f87171', 12);
        queueSound(game, 'hurt');
        if (player.hp <= 0) {
          game.over = true;
          game.running = false;
        }
      }
    }

    if (enemy.hp > 0) return true;

    game.kills += 1;
    player.ultCharge = Math.min(
      100,
      (player.ultCharge ?? 0) + (enemy.boss ? 50 : enemy.elite ? 25 : 6),
    );
    if (activeHero?.stats?.lifestealKills) {
      game.vampireKillCounter = (game.vampireKillCounter ?? 0) + 1;
      if (game.vampireKillCounter >= activeHero.stats.lifestealKills) {
        game.vampireKillCounter = 0;
        player.hp = Math.min(player.maxHp, player.hp + 4);
        addParticles(game, player.x, player.y, '#f43f5e', 6);
      }
    }

    if (enemy.boss) {
      game.bossActive = false;
      game.enemyBullets = [];
      game.score += enemy.bossScore ?? 2000;
      onEarnGold?.(enemy.bossGold ?? 15);
      const bossCoins = Math.round(120 * (player.coinBonus ?? 1));
      game.runCoins = (game.runCoins ?? 0) + bossCoins;
      onEarnLobbyCoins?.(bossCoins);
      player.hp = Math.min(player.maxHp, player.hp + Math.round(player.maxHp * 0.35));
      for (let g = 0; g < 12; g += 1) {
        const ga = (Math.PI * 2 * g) / 12;
        game.gems.push({
          x: clamp(enemy.x + Math.cos(ga) * 44, 30, world.width - 30),
          y: clamp(enemy.y + Math.sin(ga) * 44, 30, world.height - 30),
          radius: 10,
          value: 14 + game.stageIndex * 5,
          color: '#facc15',
        });
      }
      addParticles(game, enemy.x, enemy.y, '#facc15', 56);
      game.shake = 22;
      queueSound(game, 'bossClear');
      game.bossClearFlash = 2.8;
      game.chapterTime = 0;

      if (game.stageIndex < stages.length - 1) {
        game.stageIndex += 1;
        game.stageFlash = 2.6;
        game.bossClearText = `${enemy.bossName} 격파! 다음 챕터 돌입`;
      } else {
        game.bossCycle = (game.bossCycle ?? 0) + 1;
        game.bossClearText = `${enemy.bossName} 격파! 무한 모드 Lv.${game.bossCycle + 1}`;
      }
      return false;
    }

    if (enemy.kind === 'bomber') {
      const blast = enemy.blastRadius || 76;
      addParticles(game, enemy.x, enemy.y, '#f97316', 24);
      queueSound(game, 'boom');
      if (distance(player, enemy) < blast + player.radius) {
        if (game.bm?.immortal) {
          addParticles(game, player.x, player.y, '#e879f9', 8);
        } else if (trySansDodge(game)) {
          // Dodged with Sans MISS!
        } else if (player.invincible <= 0) {
          player.hp = Math.max(0, player.hp - Math.max(1, enemy.damage - player.armor));
          player.invincible = 0.55 + player.invincibleBonus;
          game.shake = 12;
          queueSound(game, 'hurt');
          if (player.hp <= 0) {
            game.over = true;
            game.running = false;
          }
        }
      }
    }

    if (enemy.kind === 'splitter' && spawnedChildren.length < 16) {
      for (let s = 0; s < 2; s += 1) {
        const offsetAngle = Math.random() * Math.PI * 2;
        spawnedChildren.push({
          x: clamp(enemy.x + Math.cos(offsetAngle) * 20, 30, world.width - 30),
          y: clamp(enemy.y + Math.sin(offsetAngle) * 20, 30, world.height - 30),
          kind: 'miniSlime',
          radius: 11,
          hp: Math.max(12, Math.round(enemy.maxHp * 0.36)),
          maxHp: Math.max(12, Math.round(enemy.maxHp * 0.36)),
          damage: Math.max(7, Math.round(enemy.damage * 0.65)),
          speed: enemy.speed * 1.48,
          color: '#34d399',
          worth: 3,
          slow: 0,
        });
      }
    }

    game.score += enemy.elite ? 120 : 35;
    const coinDrop = Math.max(1, Math.round((enemy.elite ? 15 : 2) * (player.coinBonus ?? 1)));
    game.runCoins = (game.runCoins ?? 0) + coinDrop;
    onEarnLobbyCoins?.(coinDrop);
    if (enemy.elite) {
      onEarnGold?.(3);
    } else {
      game.goldKillCounter = (game.goldKillCounter ?? 0) + 1;
      if (game.goldKillCounter >= 5) {
        game.goldKillCounter -= 5;
        onEarnGold?.(1);
      }
    }
    game.gems.push({
      x: enemy.x,
      y: enemy.y,
      radius: enemy.elite ? 9 : 6,
      value: enemy.worth,
      color: enemy.elite ? '#c4b5fd' : '#67e8f9',
    });
    addParticles(game, enemy.x, enemy.y, '#fde68a', enemy.elite ? 22 : 10);
    return false;
  });

  if (spawnedChildren.length > 0) {
    game.enemies.push(...spawnedChildren);
  }

  game.enemyBullets = (game.enemyBullets ?? []).filter((eb) => {
    eb.x += eb.vx * delta;
    eb.y += eb.vy * delta;
    eb.life -= delta;
    if (distance(player, eb) < player.radius + eb.radius) {
      if (game.bm?.immortal) {
        addParticles(game, eb.x, eb.y, '#e879f9', 6);
        return false;
      }
      if (trySansDodge(game)) {
        return false;
      }
      if (player.invincible <= 0) {
        player.hp = Math.max(0, player.hp - Math.max(1, eb.damage - player.armor));
        player.invincible = 0.5 + player.invincibleBonus;
        if (eb.chill) player.slowTimer = Math.max(player.slowTimer ?? 0, 1.5);
        game.shake = 10;
        addParticles(game, player.x, player.y, eb.color, 12);
        queueSound(game, 'hurt');
        if (player.hp <= 0) {
          game.over = true;
          game.running = false;
        }
      }
      return false;
    }
    return eb.life > 0 && eb.x > 0 && eb.y > 0 && eb.x < world.width && eb.y < world.height;
  });

  game.gems = game.gems.filter((gem) => {
    const gemDistance = distance(player, gem);
    if (gemDistance < player.magnet) {
      const angle = Math.atan2(player.y - gem.y, player.x - gem.x);
      const pull = 280 + (player.magnet - gemDistance) * 4;
      gem.x += Math.cos(angle) * pull * delta;
      gem.y += Math.sin(angle) * pull * delta;
    }

    if (gemDistance < player.radius + gem.radius + 4) {
      game.xp += Math.ceil(gem.value * player.xpGain);
      game.score += gem.value * 3;
      if (game.xp >= game.nextXp) {
        game.xp -= game.nextXp;
        game.level += 1;
        game.nextXp += 40;
        // Automatic Level-Up 효과업!
        if (!player.sansHero) {
          player.maxHp += 6;
          player.hp = Math.min(player.maxHp, player.hp + 12);
        } else {
          player.maxHp = 1;
          player.hp = 1;
        }
        player.damage *= 1.04;
        player.speed += 2;
        addParticles(game, player.x, player.y, '#facc15', 26);
        game.pausedForUpgrade = true;
        game.upgrades = pickUpgrades(game);
        queueSound(game, 'level');
      }
      return false;
    }

    return true;
  });

  game.particles = game.particles.filter((particle) => {
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.life -= delta;
    particle.vx *= 0.92;
    particle.vy *= 0.92;
    return particle.life > 0;
  });
}

function drawGame(context, game, canvas) {
  const player = game.player;
  const stage = stages[game.stageIndex];
  const cameraX = clamp(player.x - canvas.width / 2, 0, world.width - canvas.width);
  const cameraY = clamp(player.y - canvas.height / 2, 0, world.height - canvas.height);
  const shakeX = game.shake ? randomBetween(-game.shake, game.shake) : 0;
  const shakeY = game.shake ? randomBetween(-game.shake, game.shake) : 0;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.translate(-cameraX + shakeX, -cameraY + shakeY);

  context.fillStyle = stage.background;
  context.fillRect(0, 0, world.width, world.height);

  context.strokeStyle = stage.grid;
  context.lineWidth = 1;
  for (let x = 0; x <= world.width; x += 80) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, world.height);
    context.stroke();
  }
  for (let y = 0; y <= world.height; y += 80) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(world.width, y);
    context.stroke();
  }

  context.fillStyle = stage.decor;
  for (let i = 0; i < 42; i += 1) {
    const x = (i * 211 + stage.level * 43) % world.width;
    const y = (i * 137 + stage.level * 71) % world.height;
    context.fillRect(x, y, 54 + stage.level * 6, 16 + stage.level * 2);
  }

  (game.fireZones ?? []).forEach((zone) => {
    context.save();
    const flicker = 0.85 + Math.sin(game.time * 16 + zone.x) * 0.15;
    context.globalAlpha = clamp(zone.life * 0.5, 0.2, 0.55);
    context.fillStyle = zone.poison ? '#22c55e' : zone.awakened ? '#38bdf8' : '#f97316';
    context.beginPath();
    context.arc(zone.x, zone.y, zone.radius * flicker, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 0.72;
    context.strokeStyle = zone.poison ? '#bbf7d0' : zone.awakened ? '#facc15' : '#ef4444';
    context.lineWidth = 3;
    context.stroke();
    context.restore();
  });

  game.gems.forEach((gem) => {
    context.save();
    context.translate(gem.x, gem.y);
    context.rotate(game.time * 2);
    context.fillStyle = gem.color;
    context.shadowColor = gem.color;
    context.shadowBlur = 12;
    context.fillRect(-gem.radius, -gem.radius, gem.radius * 2, gem.radius * 2);
    context.restore();
  });

  game.bullets.forEach((bullet) => {
    context.save();
    context.translate(bullet.x, bullet.y);
    context.rotate(bullet.spin);
    context.fillStyle = bullet.color;
    context.shadowColor = bullet.color;
    context.shadowBlur = bullet.awakened ? 34 : 16;
    if (bullet.type === 'bat') {
      const progress = clamp(1 - bullet.life / (bullet.maxLife || 0.24), 0, 1);
      const isFullSpin = bullet.arc >= Math.PI * 1.99;
      const startAngle = isFullSpin ? bullet.angle : bullet.angle - bullet.arc / 2;
      const endAngle = startAngle + bullet.arc * progress;
      const alpha = clamp(bullet.life / (bullet.maxLife || 0.24) + 0.2, 0, 1);

      context.rotate(-bullet.spin);
      context.globalAlpha = alpha * 0.28;
      context.fillStyle = bullet.awakened ? '#f43f5e' : '#f59e0b';
      context.beginPath();
      context.moveTo(0, 0);
      context.arc(0, 0, bullet.radius, startAngle, endAngle);
      context.closePath();
      context.fill();

      context.globalAlpha = alpha * 0.92;
      context.strokeStyle = bullet.awakened ? '#fef08a' : '#fde68a';
      context.lineWidth = bullet.awakened ? 11 : 7;
      context.lineCap = 'round';
      context.beginPath();
      context.arc(0, 0, bullet.radius * 0.92, Math.max(startAngle, endAngle - 1.35), endAngle);
      context.stroke();

      // Baseball bat silhouette sweeping along endAngle
      context.save();
      context.rotate(endAngle);
      context.globalAlpha = 1;
      context.fillStyle = bullet.awakened ? '#7f1d1d' : '#78350f';
      context.fillRect(14, -4, bullet.radius * 0.34, 8);
      context.fillStyle = bullet.awakened ? '#facc15' : '#d97706';
      context.beginPath();
      context.roundRect(14 + bullet.radius * 0.3, -8, bullet.radius * 0.56, 16, 8);
      context.fill();
      context.strokeStyle = '#fef3c7';
      context.lineWidth = 2;
      context.stroke();
      context.restore();

      context.restore();
      return;
    }

    if (bullet.type === 'gaster') {
      context.rotate(-bullet.spin + bullet.angle);
      const isCharging = bullet.charge > 0;
      const beamLen = bullet.beamLength ?? 740;
      const beamColor = bullet.awakened ? '#facc15' : '#38bdf8';

      // Laser beam (thin warning line while charging, MASSIVE blinding beam when firing!)
      if (isCharging) {
        const chargeRatio = 1 - bullet.charge / (bullet.maxCharge || 0.26);
        context.save();
        context.strokeStyle = beamColor;
        context.globalAlpha = 0.35 + chargeRatio * 0.45;
        context.lineWidth = 2 + chargeRatio * 4;
        context.setLineDash([12, 8]);
        context.beginPath();
        context.moveTo(20, 0);
        context.lineTo(beamLen, 0);
        context.stroke();
        context.setLineDash([]);
        context.fillStyle = '#ffffff';
        context.beginPath();
        context.arc(16, 0, 4 + chargeRatio * 7, 0, Math.PI * 2);
        context.fill();
        context.restore();
      } else {
        const fade = clamp(bullet.life / Math.max(0.15, (bullet.maxLife || 0.72) - (bullet.maxCharge || 0.26)), 0, 1);
        const pulse = 0.88 + Math.sin(game.time * 48) * 0.14;
        const outerW = bullet.radius * 1.45 * pulse * (0.4 + fade * 0.6);
        const innerW = outerW * 0.56;

        context.save();
        context.globalAlpha = Math.min(1, fade + 0.15);
        context.shadowColor = beamColor;
        context.shadowBlur = 28;
        context.fillStyle = beamColor;
        context.beginPath();
        context.roundRect(14, -outerW / 2, beamLen, outerW, outerW / 2);
        context.fill();

        context.shadowBlur = 12;
        context.fillStyle = '#ffffff';
        context.beginPath();
        context.roundRect(14, -innerW / 2, beamLen, innerW, innerW / 2);
        context.fill();
        context.restore();
      }

      // Floating Sans-style Gaster Blaster Skull!
      const jawOpen = isCharging ? 2 : 7;
      context.save();
      context.shadowColor = beamColor;
      context.shadowBlur = 14;

      // Upper cranium
      context.fillStyle = '#f8fafc';
      context.strokeStyle = '#0f172a';
      context.lineWidth = 2.5;
      context.beginPath();
      context.moveTo(-22, -14);
      context.lineTo(4, -18);
      context.lineTo(22, -7 - jawOpen * 0.3);
      context.lineTo(14, -2 - jawOpen * 0.3);
      context.lineTo(-14, -2);
      context.closePath();
      context.fill();
      context.stroke();

      // Lower jaw (opens wide when firing!)
      context.beginPath();
      context.moveTo(-22, 14);
      context.lineTo(4, 18);
      context.lineTo(22, 7 + jawOpen * 0.3);
      context.lineTo(14, 2 + jawOpen * 0.3);
      context.lineTo(-14, 2);
      context.closePath();
      context.fill();
      context.stroke();

      // Skull center dome
      context.beginPath();
      context.arc(-8, 0, 14, 0, Math.PI * 2);
      context.fill();
      context.stroke();

      // Dark eye sockets + Glowing Sans Cyan Eye!
      context.shadowBlur = 0;
      context.fillStyle = '#0f172a';
      context.beginPath();
      context.ellipse(1, -6, 4.5, 3, -0.25, 0, Math.PI * 2);
      context.ellipse(1, 6, 4.5, 3, 0.25, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = beamColor;
      context.shadowColor = beamColor;
      context.shadowBlur = 10;
      context.beginPath();
      context.arc(2, -6, 2.3, 0, Math.PI * 2);
      context.arc(2, 6, 2.3, 0, Math.PI * 2);
      context.fill();
      context.restore();

      context.restore();
      return;
    }

    if (bullet.type === 'katana') {
      const progress = clamp(1 - bullet.life / (bullet.maxLife || 0.22), 0, 1);
      const startAngle = bullet.angle - bullet.arc / 2;
      const endAngle = startAngle + bullet.arc * progress;
      const alpha = clamp(bullet.life / (bullet.maxLife || 0.22) + 0.15, 0, 1);

      context.rotate(-bullet.spin);
      context.globalAlpha = alpha * 0.3;
      context.fillStyle = bullet.awakened ? '#facc15' : '#f43f5e';
      context.beginPath();
      context.moveTo(0, 0);
      context.arc(0, 0, bullet.radius, startAngle, endAngle);
      context.closePath();
      context.fill();

      context.globalAlpha = alpha;
      context.strokeStyle = bullet.awakened ? '#fef08a' : '#fecdd3';
      context.lineWidth = bullet.awakened ? 9 : 6;
      context.lineCap = 'round';
      context.beginPath();
      context.arc(0, 0, bullet.radius * 0.9, startAngle, endAngle);
      context.stroke();
      context.restore();
      return;
    }

    if (bullet.type === 'kunai') {
      context.rotate(-bullet.spin + Math.atan2(bullet.vy, bullet.vx));
      context.fillStyle = bullet.awakened ? '#fef08a' : '#e2e8f0';
      context.beginPath();
      context.moveTo(14, 0);
      context.lineTo(-4, -5);
      context.lineTo(-10, 0);
      context.lineTo(-4, 5);
      context.closePath();
      context.fill();
      context.strokeStyle = '#38bdf8';
      context.lineWidth = 1.5;
      context.stroke();
      context.restore();
      return;
    }

    if (bullet.type === 'lightchaser') {
      context.rotate(-bullet.spin + Math.atan2(bullet.vy, bullet.vx));
      context.strokeStyle = bullet.color;
      context.lineWidth = bullet.awakened ? 8 : 6;
      context.lineCap = 'round';
      context.beginPath();
      context.arc(-6, 0, bullet.radius, -1.05, 1.05);
      context.stroke();
      context.strokeStyle = '#ffffff';
      context.lineWidth = 2.5;
      context.beginPath();
      context.arc(-4, 0, bullet.radius * 0.85, -0.85, 0.85);
      context.stroke();
      context.restore();
      return;
    }

    if (bullet.type === 'trident') {
      const flightAngle = Math.atan2(bullet.vy, bullet.vx);
      const scale = bullet.awakened ? 1.24 : 1.0;
      context.rotate(-bullet.spin + flightAngle);
      context.scale(scale, scale);

      // Ocean / Poseidon lightning wake behind the trident
      context.globalAlpha = bullet.returning ? 0.55 : 0.38;
      context.strokeStyle = bullet.awakened ? '#facc15' : '#38bdf8';
      context.lineWidth = 10;
      context.lineCap = 'round';
      context.beginPath();
      context.moveTo(-42, 0);
      context.lineTo(14, 0);
      context.stroke();

      // Subtle glowing aura around the prongs
      context.globalAlpha = 0.25;
      context.fillStyle = bullet.awakened ? '#fef08a' : '#5eead4';
      context.beginPath();
      context.ellipse(16, 0, 20, 15, 0, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = 1;

      const shaftColor = bullet.awakened ? '#f59e0b' : '#0d9488';
      const bladeColor = bullet.awakened ? '#fef08a' : '#5eead4';
      const edgeColor = '#ffffff';

      // Main shaft
      context.strokeStyle = shaftColor;
      context.lineWidth = 4.5;
      context.lineCap = 'round';
      context.beginPath();
      context.moveTo(-34, 0);
      context.lineTo(12, 0);
      context.stroke();

      // Shaft highlight
      context.strokeStyle = edgeColor;
      context.lineWidth = 1.4;
      context.beginPath();
      context.moveTo(-30, -1);
      context.lineTo(10, -1);
      context.stroke();

      // Pommel gem at tail
      context.fillStyle = bullet.awakened ? '#ef4444' : '#38bdf8';
      context.beginPath();
      context.arc(-35, 0, 3.5, 0, Math.PI * 2);
      context.fill();

      // Crossbar guard
      context.strokeStyle = bladeColor;
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(10, -12);
      context.quadraticCurveTo(15, 0, 10, 12);
      context.stroke();

      // Center main prong (longest spear tip)
      context.fillStyle = bladeColor;
      context.beginPath();
      context.moveTo(32, 0);
      context.lineTo(18, -4.5);
      context.lineTo(20, 0);
      context.lineTo(18, 4.5);
      context.closePath();
      context.fill();
      context.strokeStyle = bladeColor;
      context.lineWidth = 3.2;
      context.beginPath();
      context.moveTo(10, 0);
      context.lineTo(25, 0);
      context.stroke();

      // Top & bottom curved outer prongs with barbs
      [-1, 1].forEach((dir) => {
        context.strokeStyle = bladeColor;
        context.lineWidth = 3;
        context.beginPath();
        context.moveTo(10, dir * 11);
        context.quadraticCurveTo(18, dir * 12, 26, dir * 8);
        context.stroke();

        context.fillStyle = edgeColor;
        context.beginPath();
        context.moveTo(28, dir * 7.5);
        context.lineTo(20, dir * 6);
        context.lineTo(21, dir * 11);
        context.closePath();
        context.fill();
      });

      // Center crest gem
      context.fillStyle = bullet.awakened ? '#38bdf8' : '#fef08a';
      context.beginPath();
      context.arc(12, 0, 2.8, 0, Math.PI * 2);
      context.fill();

      context.restore();
      return;
    }

    if (bullet.type === 'sansBone') {
      // Classic Undertale Sans White / Glowing Blue Bone!
      context.rotate(bullet.spin * 0.55);
      const boneColor = bullet.blueBone ? '#38bdf8' : '#f8fafc';
      const glowColor = bullet.blueBone ? '#0ea5e9' : '#e879f9';
      context.shadowColor = glowColor;
      context.shadowBlur = bullet.blueBone ? 16 : 9;
      context.fillStyle = boneColor;
      context.strokeStyle = '#0f172a';
      context.lineWidth = 2;

      // Bone shaft
      context.beginPath();
      context.roundRect(-18, -3.6, 36, 7.2, 3);
      context.fill();
      context.stroke();

      // Double-knob bone ends
      [-17, 17].forEach((bx) => {
        context.beginPath();
        context.arc(bx, -4.5, 4.8, 0, Math.PI * 2);
        context.arc(bx, 4.5, 4.8, 0, Math.PI * 2);
        context.fill();
        context.stroke();
      });

      context.shadowBlur = 0;
      context.restore();
      return;
    }

    if (bullet.awakened && bullet.type !== 'shockwave') {
      context.strokeStyle = '#facc15';
      context.lineWidth = 3;
      context.beginPath();
      context.arc(0, 0, bullet.radius + 8, 0, Math.PI * 2);
      context.stroke();
    }
    if (bullet.type === 'boomer') {
      context.fillRect(-bullet.radius, -4, bullet.radius * 2, 8);
      context.fillRect(-4, -bullet.radius, 8, bullet.radius * 2);
    } else if (bullet.type === 'railgun') {
      context.fillRect(-22, -3, 44, 6);
    } else if (bullet.type === 'flame') {
      context.globalAlpha = 0.78;
      context.beginPath();
      context.arc(0, 0, bullet.radius, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = 1;
    } else if (bullet.type === 'shockwave') {
      context.strokeStyle = bullet.color;
      context.lineWidth = bullet.blast > 220 ? 12 : 7;
      context.globalAlpha = Math.max(0.18, bullet.life * 2.3);
      context.beginPath();
      context.arc(0, 0, bullet.radius, 0, Math.PI * 2);
      context.stroke();
      context.strokeStyle = '#fef3c7';
      context.lineWidth = 3;
      context.beginPath();
      context.arc(0, 0, bullet.radius * 0.74, 0, Math.PI * 2);
      context.stroke();
      context.globalAlpha = 0.18;
      context.beginPath();
      context.arc(0, 0, bullet.radius * 0.72, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = 1;
    } else if (bullet.type === 'mine') {
      context.strokeStyle = bullet.color;
      context.lineWidth = 3;
      context.beginPath();
      context.arc(0, 0, bullet.blast, 0, Math.PI * 2);
      context.stroke();
      context.fillRect(-bullet.radius, -bullet.radius, bullet.radius * 2, bullet.radius * 2);
    } else {
      context.beginPath();
      context.arc(0, 0, bullet.radius, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  });

  (game.enemyBullets ?? []).forEach((eb) => {
    context.save();
    context.fillStyle = eb.color;
    context.shadowColor = eb.color;
    context.shadowBlur = 14;
    context.strokeStyle = '#ffffff';
    context.lineWidth = 2.5;
    context.beginPath();
    context.arc(eb.x, eb.y, eb.radius, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.restore();
  });

  game.enemies.forEach((enemy) => {
    const hpRatio = clamp(enemy.hp / enemy.maxHp, 0, 1);

    if (enemy.boss) {
      const enraged = enemy.hp < enemy.maxHp * 0.5;
      context.save();
      if (enemy.dashWindup > 0) {
        context.strokeStyle = 'rgba(239, 68, 68, 0.85)';
        context.lineWidth = 5;
        context.setLineDash([12, 8]);
        context.beginPath();
        context.moveTo(enemy.x, enemy.y);
        context.lineTo(enemy.x + Math.cos(enemy.dashAngle) * 320, enemy.y + Math.sin(enemy.dashAngle) * 320);
        context.stroke();
        context.setLineDash([]);
      }

      context.strokeStyle = enraged ? '#facc15' : enemy.glow || '#f87171';
      context.lineWidth = enraged ? 6 : 4;
      context.globalAlpha = 0.55 + Math.sin(game.time * 8) * 0.25;
      context.beginPath();
      context.arc(enemy.x, enemy.y, enemy.radius + 12 + Math.sin(game.time * 6) * 4, 0, Math.PI * 2);
      context.stroke();
      context.globalAlpha = 1;

      context.fillStyle = enemy.slow > 0 ? '#bae6fd' : enemy.color;
      context.strokeStyle = enraged ? '#fef08a' : '#ffffff';
      context.lineWidth = 5;
      context.shadowColor = enemy.glow || '#ef4444';
      context.shadowBlur = 24;
      context.beginPath();
      context.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.shadowBlur = 0;

      // Boss horns / crown
      context.fillStyle = enraged ? '#facc15' : '#fef3c7';
      context.beginPath();
      context.moveTo(enemy.x - enemy.radius * 0.65, enemy.y - enemy.radius * 0.65);
      context.lineTo(enemy.x - enemy.radius * 0.38, enemy.y - enemy.radius * 1.24);
      context.lineTo(enemy.x - enemy.radius * 0.14, enemy.y - enemy.radius * 0.88);
      context.lineTo(enemy.x, enemy.y - enemy.radius * 1.32);
      context.lineTo(enemy.x + enemy.radius * 0.14, enemy.y - enemy.radius * 0.88);
      context.lineTo(enemy.x + enemy.radius * 0.38, enemy.y - enemy.radius * 1.24);
      context.lineTo(enemy.x + enemy.radius * 0.65, enemy.y - enemy.radius * 0.65);
      context.closePath();
      context.fill();

      // Angry glowing eyes
      context.fillStyle = enraged ? '#fef08a' : '#ffffff';
      context.beginPath();
      context.arc(enemy.x - enemy.radius * 0.3, enemy.y - enemy.radius * 0.12, enemy.radius * 0.14, 0, Math.PI * 2);
      context.arc(enemy.x + enemy.radius * 0.3, enemy.y - enemy.radius * 0.12, enemy.radius * 0.14, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#dc2626';
      context.beginPath();
      context.arc(enemy.x - enemy.radius * 0.3, enemy.y - enemy.radius * 0.12, enemy.radius * 0.07, 0, Math.PI * 2);
      context.arc(enemy.x + enemy.radius * 0.3, enemy.y - enemy.radius * 0.12, enemy.radius * 0.07, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = '#111827';
      context.fillRect(enemy.x - enemy.radius, enemy.y + enemy.radius + 10, enemy.radius * 2, 8);
      context.fillStyle = enraged ? '#facc15' : '#ef4444';
      context.fillRect(enemy.x - enemy.radius, enemy.y + enemy.radius + 10, enemy.radius * 2 * hpRatio, 8);
      context.restore();
      return;
    }

    context.save();
    if (enemy.kind === 'shooter') {
      context.translate(enemy.x, enemy.y);
      context.rotate(game.time * 1.4);
      context.fillStyle = enemy.slow > 0 ? '#bae6fd' : enemy.color;
      context.strokeStyle = '#f5d0fe';
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(0, -enemy.radius);
      context.lineTo(enemy.radius, 0);
      context.lineTo(0, enemy.radius);
      context.lineTo(-enemy.radius, 0);
      context.closePath();
      context.fill();
      context.stroke();
      context.fillStyle = '#ffffff';
      context.beginPath();
      context.arc(0, 0, enemy.radius * 0.34, 0, Math.PI * 2);
      context.fill();
      context.restore();
    } else if (enemy.kind === 'bomber') {
      const pulse = 0.85 + Math.sin(game.time * 14) * 0.15;
      context.fillStyle = enemy.slow > 0 ? '#bae6fd' : '#1f2937';
      context.strokeStyle = '#ef4444';
      context.lineWidth = 3.5;
      context.beginPath();
      context.arc(enemy.x, enemy.y, enemy.radius * pulse, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      // Lit fuse & spark
      context.strokeStyle = '#fbbf24';
      context.lineWidth = 2.5;
      context.beginPath();
      context.moveTo(enemy.x, enemy.y - enemy.radius);
      context.lineTo(enemy.x + 6, enemy.y - enemy.radius - 9);
      context.stroke();
      context.fillStyle = '#fde047';
      context.beginPath();
      context.arc(enemy.x + 7, enemy.y - enemy.radius - 10, 4, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#ef4444';
      context.beginPath();
      context.arc(enemy.x, enemy.y, enemy.radius * 0.36, 0, Math.PI * 2);
      context.fill();
      context.restore();
    } else if (enemy.kind === 'splitter' || enemy.kind === 'miniSlime') {
      context.globalAlpha = 0.88;
      context.fillStyle = enemy.slow > 0 ? '#bae6fd' : enemy.color;
      context.strokeStyle = '#a7f3d0';
      context.lineWidth = 3;
      context.beginPath();
      context.ellipse(
        enemy.x,
        enemy.y,
        enemy.radius * (1 + Math.sin(game.time * 7) * 0.08),
        enemy.radius * (1 - Math.sin(game.time * 7) * 0.08),
        0,
        0,
        Math.PI * 2,
      );
      context.fill();
      context.stroke();
      context.fillStyle = '#ecfdf5';
      context.beginPath();
      context.arc(enemy.x - enemy.radius * 0.3, enemy.y - enemy.radius * 0.2, enemy.radius * 0.18, 0, Math.PI * 2);
      context.arc(enemy.x + enemy.radius * 0.25, enemy.y + enemy.radius * 0.15, enemy.radius * 0.14, 0, Math.PI * 2);
      context.fill();
      context.restore();
    } else if (enemy.kind === 'shielder') {
      context.fillStyle = enemy.slow > 0 ? '#bae6fd' : enemy.color;
      context.strokeStyle = '#e2e8f0';
      context.lineWidth = 4;
      context.beginPath();
      context.roundRect(enemy.x - enemy.radius, enemy.y - enemy.radius, enemy.radius * 2, enemy.radius * 2, 7);
      context.fill();
      context.stroke();
      // Glowing front shield arc
      const toPlayer = Math.atan2(player.y - enemy.y, player.x - enemy.x);
      context.strokeStyle = '#38bdf8';
      context.lineWidth = 5;
      context.beginPath();
      context.arc(enemy.x, enemy.y, enemy.radius + 5, toPlayer - 0.85, toPlayer + 0.85);
      context.stroke();
      context.fillStyle = '#38bdf8';
      context.fillRect(enemy.x - 8, enemy.y - 5, 16, 4);
      context.restore();
    } else if (enemy.kind === 'ghost') {
      context.globalAlpha = (enemy.phaseDash ?? 0) > 0 ? 0.48 : 0.78;
      context.fillStyle = enemy.slow > 0 ? '#bae6fd' : enemy.color;
      context.strokeStyle = '#e0e7ff';
      context.lineWidth = 2.5;
      context.beginPath();
      context.arc(enemy.x, enemy.y - 2, enemy.radius, Math.PI, 0);
      context.lineTo(enemy.x + enemy.radius, enemy.y + enemy.radius * 0.85);
      context.lineTo(enemy.x + enemy.radius * 0.35, enemy.y + enemy.radius * 0.45);
      context.lineTo(enemy.x, enemy.y + enemy.radius * 0.9);
      context.lineTo(enemy.x - enemy.radius * 0.35, enemy.y + enemy.radius * 0.45);
      context.lineTo(enemy.x - enemy.radius, enemy.y + enemy.radius * 0.85);
      context.closePath();
      context.fill();
      context.stroke();
      context.fillStyle = '#fef08a';
      context.beginPath();
      context.arc(enemy.x - 5, enemy.y - 4, 3, 0, Math.PI * 2);
      context.arc(enemy.x + 5, enemy.y - 4, 3, 0, Math.PI * 2);
      context.fill();
      context.restore();
    } else {
      context.fillStyle = enemy.slow > 0 ? '#bae6fd' : enemy.color;
      context.strokeStyle = enemy.elite ? '#f5d0fe' : '#111827';
      context.lineWidth = enemy.elite ? 5 : 3;
      context.beginPath();
      context.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.fillStyle = '#ffffff';
      context.beginPath();
      context.arc(enemy.x - enemy.radius * 0.28, enemy.y - enemy.radius * 0.16, enemy.radius * 0.13, 0, Math.PI * 2);
      context.arc(enemy.x + enemy.radius * 0.28, enemy.y - enemy.radius * 0.16, enemy.radius * 0.13, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }

    if ((enemy.karmaTimer ?? 0) > 0) {
      context.save();
      context.strokeStyle = '#d946ef';
      context.lineWidth = 2.5;
      context.shadowColor = '#c026d3';
      context.shadowBlur = 12;
      context.beginPath();
      context.arc(enemy.x, enemy.y, enemy.radius + 5, 0, Math.PI * 2);
      context.stroke();
      context.restore();
    }

    context.fillStyle = '#111827';
    context.fillRect(enemy.x - enemy.radius, enemy.y + enemy.radius + 8, enemy.radius * 2, 5);
    context.fillStyle = (enemy.karmaTimer ?? 0) > 0 ? '#d946ef' : '#22c55e';
    context.fillRect(enemy.x - enemy.radius, enemy.y + enemy.radius + 8, enemy.radius * 2 * hpRatio, 5);
  });

  const weapon = weapons[player.weaponIndex];
  if (weapon.id === 'orbit') {
    const bladeCount = 3 + Math.floor(player.pierce / 2);
    for (let i = 0; i < bladeCount; i += 1) {
      const angle = game.time * 4 + (Math.PI * 2 * i) / bladeCount;
      context.save();
      context.translate(player.x + Math.cos(angle) * 72 * player.area, player.y + Math.sin(angle) * 72 * player.area);
      context.rotate(angle);
      context.fillStyle = weapon.color;
      context.shadowColor = weapon.color;
      context.shadowBlur = 14;
      context.fillRect(-18, -5, 36, 10);
      context.restore();
    }
  }

  if (game.bm?.omegaDrone) {
    const droneAngle = game.time * 3.2;
    const droneX = player.x + Math.cos(droneAngle) * 64;
    const droneY = player.y + Math.sin(droneAngle) * 64;
    context.save();
    context.strokeStyle = 'rgba(232, 121, 249, 0.25)';
    context.lineWidth = 2;
    context.setLineDash([5, 6]);
    context.beginPath();
    context.arc(player.x, player.y, 64, 0, Math.PI * 2);
    context.stroke();
    context.setLineDash([]);
    context.fillStyle = '#e879f9';
    context.shadowColor = '#c026d3';
    context.shadowBlur = 18;
    context.beginPath();
    context.arc(droneX, droneY, 10, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.arc(droneX, droneY, 4, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  const hero = HEROES[game.heroIndex ?? 0] ?? HEROES[0];
  context.fillStyle = player.invincible > 0 ? '#fef08a' : hero.body;
  context.strokeStyle = hero.stroke;
  context.lineWidth = 4;
  if (game.bm?.immortal) {
    context.save();
    context.strokeStyle = '#ec4899';
    context.lineWidth = 3.5;
    context.shadowColor = '#a855f7';
    context.shadowBlur = 16;
    context.beginPath();
    context.arc(player.x, player.y, 28 + Math.sin(game.time * 6) * 3, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }
  if (game.awakenedWeapons[weapons[player.weaponIndex]?.id]) {
    context.strokeStyle = '#facc15';
    context.lineWidth = 3;
    context.globalAlpha = 0.72;
    context.beginPath();
    context.arc(player.x, player.y, 34 + Math.sin(game.time * 8) * 4, 0, Math.PI * 2);
    context.stroke();
    context.globalAlpha = 1;
    context.strokeStyle = hero.stroke;
    context.lineWidth = 4;
  }
  context.beginPath();
  context.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  // Distinct character accessories & eyes
  if (hero.id === 'commando') {
    context.fillStyle = hero.accent;
    context.fillRect(player.x - 16, player.y - 13, 32, 5);
  } else if (hero.id === 'ninja') {
    context.fillStyle = hero.accent;
    context.fillRect(player.x - 17, player.y - 11, 34, 6);
    context.beginPath();
    context.moveTo(player.x + 15, player.y - 9);
    context.lineTo(player.x + 28, player.y - 15 + Math.sin(game.time * 12) * 3);
    context.lineTo(player.x + 24, player.y - 4);
    context.closePath();
    context.fill();
  } else if (hero.id === 'titan') {
    context.fillStyle = '#0f172a';
    context.fillRect(player.x - 13, player.y - 9, 26, 7);
    context.fillStyle = hero.accent;
    context.fillRect(player.x - 10, player.y - 7, 20, 3);
  } else if (hero.id === 'pyro') {
    context.fillStyle = '#facc15';
    context.beginPath();
    context.moveTo(player.x - 12, player.y - 14);
    context.lineTo(player.x - 6, player.y - 25);
    context.lineTo(player.x, player.y - 17);
    context.lineTo(player.x + 6, player.y - 25);
    context.lineTo(player.x + 12, player.y - 14);
    context.closePath();
    context.fill();
  } else if (hero.id === 'cyber') {
    context.fillStyle = '#0f172a';
    context.fillRect(player.x - 13, player.y - 10, 26, 8);
    context.fillStyle = '#38bdf8';
    context.fillRect(player.x - 10, player.y - 8, 20, 4);
  } else if (hero.id === 'vampire') {
    context.fillStyle = '#9f1239';
    context.beginPath();
    context.moveTo(player.x - 17, player.y + 4);
    context.lineTo(player.x - 24, player.y - 10);
    context.lineTo(player.x - 10, player.y - 4);
    context.moveTo(player.x + 17, player.y + 4);
    context.lineTo(player.x + 24, player.y - 10);
    context.lineTo(player.x + 10, player.y - 4);
    context.fill();
  } else if (hero.id === 'sans') {
    // 💀 Iconic Undertale Sans Blue Hoodie + Fluffy White Collar + Skull Face!
    context.save();
    // Blue hoodie shoulders at bottom
    context.fillStyle = '#2563eb';
    context.beginPath();
    context.arc(player.x, player.y + 4, player.radius + 1, 0.25, Math.PI - 0.25);
    context.closePath();
    context.fill();
    // White hood fluff trim
    context.strokeStyle = '#cbd5e1';
    context.lineWidth = 3;
    context.beginPath();
    context.arc(player.x, player.y + 6, player.radius * 0.72, 0.35, Math.PI - 0.35);
    context.stroke();
    // Dark skull eye sockets
    context.fillStyle = '#020617';
    context.beginPath();
    context.ellipse(player.x - 6, player.y - 4, 4.2, 3.8, -0.1, 0, Math.PI * 2);
    context.ellipse(player.x + 6, player.y - 4, 4.4, 4.0, 0.1, 0, Math.PI * 2);
    context.fill();
    // Nose triangle
    context.beginPath();
    context.moveTo(player.x, player.y - 1);
    context.lineTo(player.x - 2, player.y + 2);
    context.lineTo(player.x + 2, player.y + 2);
    context.closePath();
    context.fill();
    // Classic wide toothy Sans grin!
    context.strokeStyle = '#020617';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(player.x - 8, player.y + 5);
    context.quadraticCurveTo(player.x, player.y + 9.5, player.x + 8, player.y + 5);
    context.stroke();
    [-4, 0, 4].forEach((tx) => {
      context.beginPath();
      context.moveTo(player.x + tx, player.y + 4.5);
      context.lineTo(player.x + tx, player.y + 8);
      context.stroke();
    });
    context.restore();
  } else if (hero.id === 'forsaken') {
    // 👁️ FORSAKEN: Corrupted Void Aura + Jagged Shadow Crown + Blazing Crimson Eye!
    context.save();
    // Pulsing corrupted crimson & toxic-green glitch aura
    context.strokeStyle = Math.sin(game.time * 16) > 0 ? '#ef4444' : '#22c55e';
    context.lineWidth = 2.5;
    context.shadowColor = '#ef4444';
    context.shadowBlur = 18;
    context.beginPath();
    context.arc(player.x, player.y, player.radius + 7 + Math.sin(game.time * 10) * 2, 0, Math.PI * 2);
    context.stroke();
    // Glitch pixel bars around body
    context.fillStyle = '#22c55e';
    context.fillRect(player.x - 22, player.y - 6 + Math.sin(game.time * 24) * 4, 6, 2.5);
    context.fillStyle = '#ef4444';
    context.fillRect(player.x + 16, player.y + 2 + Math.cos(game.time * 22) * 4, 7, 2.5);
    // Jagged dark shadow crown
    context.fillStyle = '#18181b';
    context.strokeStyle = '#ef4444';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(player.x - 13, player.y - 12);
    context.lineTo(player.x - 9, player.y - 25);
    context.lineTo(player.x - 2, player.y - 16);
    context.lineTo(player.x + 3, player.y - 27);
    context.lineTo(player.x + 8, player.y - 16);
    context.lineTo(player.x + 13, player.y - 23);
    context.lineTo(player.x + 13, player.y - 11);
    context.closePath();
    context.fill();
    context.stroke();
    // Single piercing glowing crimson eye in center!
    context.shadowColor = '#ef4444';
    context.shadowBlur = 16;
    context.fillStyle = '#ef4444';
    context.beginPath();
    context.ellipse(player.x, player.y - 2, 7.5, 4.5, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.ellipse(player.x, player.y - 2, 2.2, 4, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  if (hero.id !== 'titan' && hero.id !== 'cyber' && hero.id !== 'sans' && hero.id !== 'forsaken') {
    context.fillStyle = hero.id === 'vampire' ? '#fda4af' : hero.id === 'ninja' ? '#fef08a' : '#1e293b';
    context.fillRect(player.x - 6, player.y - 5, 4, 4);
    context.fillRect(player.x + 3, player.y - 5, 4, 4);
  }

  // 💀 Sans Glowing Cyan/Yellow Left Eye Flame (Sans Hero OR Awakened Gaster Blaster)!
  if (hero.id === 'sans' || (player.sansMode && weapon?.id === 'gaster')) {
    const eyeFlash = Math.sin(game.time * 24) > 0 ? '#38bdf8' : '#facc15';
    context.save();
    context.shadowColor = eyeFlash;
    context.shadowBlur = 18;
    context.fillStyle = eyeFlash;
    context.beginPath();
    context.arc(player.x + 5, player.y - 3, 4.2, 0, Math.PI * 2);
    context.fill();
    // Flowing cyan eye flame trail
    context.beginPath();
    context.moveTo(player.x + 5, player.y - 7);
    context.quadraticCurveTo(
      player.x + 16,
      player.y - 12 + Math.sin(game.time * 18) * 3,
      player.x + 25,
      player.y - 18 + Math.cos(game.time * 14) * 3,
    );
    context.quadraticCurveTo(player.x + 15, player.y - 2, player.x + 5, player.y + 1);
    context.closePath();
    context.fillStyle = 'rgba(56, 189, 248, 0.78)';
    context.fill();
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.arc(player.x + 5, player.y - 3, 1.8, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  // Manual Aim Direction Indicator (glowing dashed sightline + aiming chevron!)
  if (game.running && game.aimMode === 'manual') {
    const aim = player.aimAngle ?? 0;
    context.save();
    context.strokeStyle = 'rgba(56, 189, 248, 0.55)';
    context.lineWidth = 2;
    context.setLineDash([6, 6]);
    context.beginPath();
    context.moveTo(player.x + Math.cos(aim) * 26, player.y + Math.sin(aim) * 26);
    context.lineTo(player.x + Math.cos(aim) * 110, player.y + Math.sin(aim) * 110);
    context.stroke();
    context.setLineDash([]);

    context.translate(player.x + Math.cos(aim) * 40, player.y + Math.sin(aim) * 40);
    context.rotate(aim);
    context.fillStyle = '#38bdf8';
    context.strokeStyle = '#ffffff';
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(9, 0);
    context.lineTo(-4, -6);
    context.lineTo(-1, 0);
    context.lineTo(-4, 6);
    context.closePath();
    context.fill();
    context.stroke();
    context.restore();
  }

  // Draw Combat Pet following the player!
  if (game.pet) {
    const pet = game.pet;
    const bob = Math.sin(game.time * 7) * 3;
    context.save();
    context.translate(pet.x, pet.y + bob);
    if (pet.rarity === 'mythic' || pet.rarity === 'legend' || pet.rarity === 'epic') {
      context.strokeStyle = pet.rarityColor || '#facc15';
      context.lineWidth = pet.rarity === 'mythic' ? 3 : 2;
      context.globalAlpha = 0.65 + Math.sin(game.time * 9) * 0.25;
      context.beginPath();
      context.arc(0, 0, 19 + Math.sin(game.time * 6) * 2, 0, Math.PI * 2);
      context.stroke();
      context.globalAlpha = 1;
    }
    context.fillStyle = pet.color;
    context.strokeStyle = pet.rarityColor || pet.accent || '#ffffff';
    context.lineWidth = 3;
    context.shadowColor = pet.rarityColor || pet.color;
    context.shadowBlur = pet.rarity === 'mythic' ? 20 : 12;
    context.beginPath();
    context.arc(0, 0, 14, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.shadowBlur = 0;
    context.font = '15px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(pet.icon, 0, 1);
    context.fillStyle = pet.rarityColor || '#fef08a';
    context.font = '900 9px Arial';
    context.fillText(`LV.${pet.level}`, 0, 22);
    context.restore();
  }

  // Draw 7 Active Skills visuals: Guardian blades, Attack Drones, & Skill Projectiles!
  if ((game.skillLevels?.guardian ?? 0) > 0) {
    const lv = game.skillLevels.guardian;
    const aw = Boolean(game.awakenedSkills?.guardian);
    const bladeCount = aw ? 6 : 1 + lv;
    const orbitRadius = (aw ? 104 : 78 + lv * 4) * player.area;
    const spinSpeed = aw ? 5.8 : 3.6 + lv * 0.3;

    context.save();
    context.strokeStyle = aw ? 'rgba(250, 204, 21, 0.28)' : 'rgba(56, 189, 248, 0.22)';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(player.x, player.y, orbitRadius, 0, Math.PI * 2);
    context.stroke();

    for (let b = 0; b < bladeCount; b += 1) {
      const ba = game.time * spinSpeed + (Math.PI * 2 * b) / bladeCount;
      const bx = player.x + Math.cos(ba) * orbitRadius;
      const by = player.y + Math.sin(ba) * orbitRadius;
      context.save();
      context.translate(bx, by);
      context.rotate(game.time * 14);
      context.fillStyle = aw ? '#facc15' : '#38bdf8';
      context.shadowColor = aw ? '#f59e0b' : '#38bdf8';
      context.shadowBlur = 14;
      context.beginPath();
      context.arc(0, 0, aw ? 15 : 11, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#0f172a';
      context.beginPath();
      context.arc(0, 0, 4, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
    context.restore();
  }

  if ((game.skillLevels?.drone ?? 0) > 0) {
    const aw = Boolean(game.awakenedSkills?.drone);
    const droneCount = aw ? 2 : 1;
    for (let d = 0; d < droneCount; d += 1) {
      const da = game.time * 2.4 + d * Math.PI;
      const dx = player.x + Math.cos(da) * 48;
      const dy = player.y + Math.sin(da) * 48;
      context.save();
      context.fillStyle = aw ? '#facc15' : '#a855f7';
      context.strokeStyle = '#ffffff';
      context.lineWidth = 2;
      context.beginPath();
      context.roundRect(dx - 9, dy - 7, 18, 14, 5);
      context.fill();
      context.stroke();
      context.fillStyle = '#38bdf8';
      context.fillRect(dx - 4, dy - 2, 8, 4);
      context.restore();
    }
  }

  (game.skillProjectiles ?? []).forEach((sp) => {
    context.save();
    context.translate(sp.x, sp.y);
    if (sp.kind === 'rocket') {
      context.rotate(Math.atan2(sp.vy, sp.vx));
      context.fillStyle = sp.awakened ? '#facc15' : '#ef4444';
      context.shadowColor = '#f97316';
      context.shadowBlur = 16;
      context.beginPath();
      context.moveTo(sp.radius + 8, 0);
      context.lineTo(-sp.radius, -sp.radius * 0.7);
      context.lineTo(-sp.radius, sp.radius * 0.7);
      context.closePath();
      context.fill();
      context.fillStyle = '#fef08a';
      context.fillRect(-sp.radius - 6, -3, 7, 6);
    } else if (sp.kind === 'soccer') {
      context.rotate(sp.spin ?? 0);
      context.fillStyle = sp.awakened ? '#22d3ee' : '#ffffff';
      context.strokeStyle = sp.awakened ? '#facc15' : '#0f172a';
      context.lineWidth = 2.5;
      context.shadowColor = sp.awakened ? '#22d3ee' : '#ffffff';
      context.shadowBlur = sp.awakened ? 16 : 8;
      context.beginPath();
      context.arc(0, 0, sp.radius, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.fillStyle = sp.awakened ? '#facc15' : '#111827';
      context.fillRect(-4, -4, 8, 8);
    } else if (sp.kind === 'chakram') {
      context.rotate(sp.spin ?? 0);
      context.strokeStyle = sp.awakened ? '#facc15' : '#e2e8f0';
      context.lineWidth = sp.awakened ? 5 : 4;
      context.shadowColor = sp.awakened ? '#facc15' : '#38bdf8';
      context.shadowBlur = 14;
      context.beginPath();
      context.arc(0, 0, sp.radius, 0, Math.PI * 2);
      context.stroke();
      context.beginPath();
      context.moveTo(-sp.radius, 0);
      context.lineTo(sp.radius, 0);
      context.moveTo(0, -sp.radius);
      context.lineTo(0, sp.radius);
      context.stroke();
    } else {
      context.rotate(Math.atan2(sp.vy, sp.vx));
      context.fillStyle = sp.awakened ? '#facc15' : '#c084fc';
      context.fillRect(-7, -3, 14, 6);
    }
    context.restore();
  });

  (game.lightningEffects ?? []).forEach((fx) => {
    context.save();
    context.globalAlpha = clamp(fx.life / (fx.maxLife || 0.22), 0, 1);
    context.strokeStyle = fx.color;
    context.shadowColor = fx.color;
    context.shadowBlur = 18;
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(fx.x - 10, fx.y - 180);
    context.lineTo(fx.x + 12, fx.y - 120);
    context.lineTo(fx.x - 8, fx.y - 60);
    context.lineTo(fx.x, fx.y);
    context.stroke();
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.arc(fx.x, fx.y, 12, 0, Math.PI * 2);
    context.fill();
    context.restore();
  });

  game.particles.forEach((particle) => {
    context.globalAlpha = clamp(particle.life * 2, 0, 1);
    context.fillStyle = particle.color;
    context.beginPath();
    context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;
  });

  (game.floatingTexts ?? []).forEach((ft) => {
    context.save();
    context.globalAlpha = clamp(ft.life / (ft.maxLife || 0.9), 0, 1);
    context.font = `900 ${ft.size || 18}px Arial`;
    context.textAlign = 'center';
    context.strokeStyle = '#020617';
    context.lineWidth = 4;
    context.strokeText(ft.text, ft.x, ft.y);
    context.fillStyle = ft.color || '#ffffff';
    context.fillText(ft.text, ft.x, ft.y);
    context.restore();
  });

  context.restore();

  if (game.bossFlash > 0) {
    context.save();
    context.globalAlpha = Math.min(0.95, game.bossFlash / 1.4);
    context.fillStyle = 'rgba(127, 29, 29, 0.84)';
    context.fillRect(0, canvas.height / 2 - 74, canvas.width, 148);
    context.strokeStyle = '#facc15';
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(0, canvas.height / 2 - 74);
    context.lineTo(canvas.width, canvas.height / 2 - 74);
    context.moveTo(0, canvas.height / 2 + 74);
    context.lineTo(canvas.width, canvas.height / 2 + 74);
    context.stroke();
    context.fillStyle = '#facc15';
    context.textAlign = 'center';
    context.font = '900 38px Arial';
    context.fillText('⚠ CHAPTER BOSS WARNING ⚠', canvas.width / 2, canvas.height / 2 - 10);
    context.fillStyle = '#ffffff';
    context.font = '900 20px Arial';
    context.fillText(game.bossBannerName || 'CHAPTER BOSS', canvas.width / 2, canvas.height / 2 + 30);
    context.restore();
  } else if (game.bossClearFlash > 0) {
    context.save();
    context.globalAlpha = Math.min(0.95, game.bossClearFlash / 1.4);
    context.fillStyle = 'rgba(20, 83, 45, 0.84)';
    context.fillRect(0, canvas.height / 2 - 66, canvas.width, 132);
    context.fillStyle = '#fde047';
    context.textAlign = 'center';
    context.font = '900 36px Arial';
    context.fillText('🏆 BOSS DEFEATED!', canvas.width / 2, canvas.height / 2 - 8);
    context.fillStyle = '#ffffff';
    context.font = '900 18px Arial';
    context.fillText(game.bossClearText || '챕터 클리어!', canvas.width / 2, canvas.height / 2 + 28);
    context.restore();
  } else if (game.stageFlash > 0) {
    context.save();
    context.globalAlpha = Math.min(0.85, game.stageFlash / 2.4);
    context.fillStyle = 'rgba(15, 23, 42, 0.72)';
    context.fillRect(0, canvas.height / 2 - 58, canvas.width, 116);
    context.fillStyle = '#f8fafc';
    context.textAlign = 'center';
    context.font = '900 34px Arial';
    context.fillText(stage.name, canvas.width / 2, canvas.height / 2 - 8);
    context.font = '800 15px Arial';
    context.fillText(stage.text, canvas.width / 2, canvas.height / 2 + 24);
    context.restore();
  }

  if (game.ultCutscene) {
    const cs = game.ultCutscene;
    const elapsed = cs.maxTimer - cs.timer;
    const enterT = clamp(elapsed / 0.14, 0, 1);
    const exitT = cs.timer < 0.28 ? clamp(cs.timer / 0.28, 0, 1) : 1;
    const easeOut = 1 - Math.pow(1 - enterT, 3);
    const alpha = exitT;
    const w = canvas.width;
    const h = canvas.height;
    const cy = h * 0.5;

    context.save();
    context.globalAlpha = alpha;

    // 1. Dark anime dramatic backdrop vignette
    context.fillStyle = cs.sansMode ? 'rgba(2, 6, 23, 0.84)' : 'rgba(2, 6, 23, 0.72)';
    context.fillRect(0, 0, w, h);

    // 2. High-speed anime radial speed-lines!
    context.save();
    context.translate(w * 0.28, cy);
    for (let i = 0; i < 36; i += 1) {
      const a = (Math.PI * 2 * i) / 36 + elapsed * 1.4;
      const inner = 70 + ((i * 37) % 85);
      const outer = Math.max(w, h) * 1.1;
      context.strokeStyle = i % 3 === 0 ? '#ffffff' : cs.accent;
      context.globalAlpha = alpha * (i % 2 === 0 ? 0.26 : 0.14);
      context.lineWidth = i % 4 === 0 ? 3.5 : 1.6;
      context.beginPath();
      context.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
      context.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
      context.stroke();
    }
    context.restore();

    // 3. Diagonal glowing Cut-In Slash Band across screen
    const bandHalfH = (h * 0.24) * easeOut;
    const tilt = h * 0.08;
    context.save();
    const bandGrad = context.createLinearGradient(0, cy - bandHalfH, w, cy + bandHalfH);
    bandGrad.addColorStop(0, cs.bg);
    bandGrad.addColorStop(0.5, cs.sansMode ? '#0f172a' : cs.bg);
    bandGrad.addColorStop(1, '#020617');
    context.fillStyle = bandGrad;
    context.beginPath();
    context.moveTo(-20, cy - bandHalfH + tilt);
    context.lineTo(w + 20, cy - bandHalfH - tilt);
    context.lineTo(w + 20, cy + bandHalfH - tilt);
    context.lineTo(-20, cy + bandHalfH + tilt);
    context.closePath();
    context.fill();

    // Clip energy streaks inside slash band
    context.save();
    context.clip();
    for (let s = 0; s < 14; s += 1) {
      const sy = cy - bandHalfH + ((s + 0.5) / 14) * (bandHalfH * 2);
      const sx = ((elapsed * 2200 + s * 173) % (w + 360)) - 260;
      const slen = 110 + (s % 4) * 70;
      context.fillStyle = s % 2 === 0 ? cs.accent : '#ffffff';
      context.globalAlpha = alpha * 0.35;
      context.fillRect(sx, sy, slen, s % 3 === 0 ? 4 : 2);
    }

    // 4. Giant Stylized Hero (or SANS) Close-Up Portrait on the Left!
    const px = w * 0.22 - (1 - easeOut) * 180;
    const py = cy + 6;
    const pr = Math.min(w, h) * 0.145;
    context.save();
    context.translate(px, py);

    // Radiant portrait aura behind head
    context.globalAlpha = alpha * 0.45;
    const auraGrad = context.createRadialGradient(0, 0, pr * 0.2, 0, 0, pr * 1.65);
    auraGrad.addColorStop(0, cs.accent);
    auraGrad.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = auraGrad;
    context.beginPath();
    context.arc(0, 0, pr * 1.65, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = alpha;

    if (cs.weaponId === 'gaster') {
      // 💀 GIANT SANS SKULL CLOSE-UP + BLAZING CYAN EYE FLAME!
      context.fillStyle = '#f8fafc';
      context.strokeStyle = '#020617';
      context.lineWidth = 5;
      context.beginPath();
      context.ellipse(0, -pr * 0.12, pr * 0.92, pr * 0.78, 0, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.beginPath();
      context.roundRect(-pr * 0.66, pr * 0.2, pr * 1.32, pr * 0.52, 16);
      context.fill();
      context.stroke();
      context.strokeStyle = '#020617';
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(-pr * 0.5, pr * 0.44);
      context.quadraticCurveTo(0, pr * 0.62, pr * 0.5, pr * 0.44);
      context.stroke();
      for (let t = -3; t <= 3; t += 1) {
        context.beginPath();
        context.moveTo(t * pr * 0.14, pr * 0.36);
        context.lineTo(t * pr * 0.14, pr * 0.55);
        context.stroke();
      }
      context.fillStyle = '#020617';
      context.beginPath();
      context.ellipse(-pr * 0.34, -pr * 0.1, pr * 0.22, pr * 0.2, -0.1, 0, Math.PI * 2);
      context.ellipse(pr * 0.34, -pr * 0.1, pr * 0.24, pr * 0.22, 0.1, 0, Math.PI * 2);
      context.fill();
      context.beginPath();
      context.moveTo(0, pr * 0.08);
      context.lineTo(-pr * 0.1, pr * 0.24);
      context.lineTo(pr * 0.1, pr * 0.24);
      context.closePath();
      context.fill();
      const eyeClr = Math.sin(elapsed * 32) > 0 ? '#38bdf8' : '#facc15';
      context.shadowColor = eyeClr;
      context.shadowBlur = 28;
      context.fillStyle = eyeClr;
      context.beginPath();
      context.arc(pr * 0.34, -pr * 0.1, pr * 0.13, 0, Math.PI * 2);
      context.fill();
      context.beginPath();
      context.moveTo(pr * 0.34, -pr * 0.24);
      context.quadraticCurveTo(pr * 0.92, -pr * 0.44, pr * 1.4, -pr * 0.65);
      context.quadraticCurveTo(pr * 0.85, -pr * 0.02, pr * 0.34, pr * 0.04);
      context.closePath();
      context.fillStyle = 'rgba(56, 189, 248, 0.85)';
      context.fill();
      context.fillStyle = '#ffffff';
      context.beginPath();
      context.arc(pr * 0.34, -pr * 0.1, pr * 0.06, 0, Math.PI * 2);
      context.fill();
      context.shadowBlur = 0;
    } else if (cs.weaponId === 'trident') {
      // 🔱 GIANT GOLDEN POSEIDON TRIDENT + LIGHTNING!
      context.rotate(-0.42);
      context.shadowColor = '#2dd4bf';
      context.shadowBlur = 26;
      context.strokeStyle = '#f59e0b';
      context.lineWidth = 10;
      context.lineCap = 'round';
      context.beginPath();
      context.moveTo(-pr * 1.05, 0);
      context.lineTo(pr * 0.35, 0);
      context.stroke();
      context.strokeStyle = '#fef08a';
      context.lineWidth = 8;
      context.beginPath();
      context.moveTo(pr * 0.28, -pr * 0.48);
      context.quadraticCurveTo(pr * 0.52, 0, pr * 0.28, pr * 0.48);
      context.stroke();
      // 3 Prongs
      context.fillStyle = '#fef08a';
      context.beginPath();
      context.moveTo(pr * 1.18, 0);
      context.lineTo(pr * 0.55, -pr * 0.16);
      context.lineTo(pr * 0.65, 0);
      context.lineTo(pr * 0.55, pr * 0.16);
      context.closePath();
      context.fill();
      context.beginPath();
      context.moveTo(pr * 0.28, 0);
      context.lineTo(pr * 0.92, 0);
      context.stroke();
      [-1, 1].forEach((d) => {
        context.beginPath();
        context.moveTo(pr * 0.28, d * pr * 0.44);
        context.quadraticCurveTo(pr * 0.68, d * pr * 0.48, pr * 0.98, d * pr * 0.28);
        context.stroke();
      });
      context.fillStyle = '#2dd4bf';
      context.beginPath();
      context.arc(pr * 0.36, 0, pr * 0.13, 0, Math.PI * 2);
      context.fill();
      context.shadowBlur = 0;
    } else if (cs.weaponId === 'katana' || cs.weaponId === 'lightchaser') {
      // ⚔️ / ✨ GIANT BLAZING SWORD / CRESCENT WAVE!
      context.rotate(-0.52);
      context.shadowColor = cs.accent;
      context.shadowBlur = 28;
      context.fillStyle = '#ffffff';
      context.beginPath();
      context.moveTo(-pr * 0.85, 6);
      context.lineTo(pr * 1.15, -6);
      context.lineTo(pr * 0.92, 10);
      context.lineTo(-pr * 0.85, 14);
      context.closePath();
      context.fill();
      context.strokeStyle = cs.accent;
      context.lineWidth = 6;
      context.beginPath();
      context.arc(0, 0, pr * 0.92, -1.1, 1.1);
      context.stroke();
      context.fillStyle = '#facc15';
      context.fillRect(-pr * 0.62, -20, 10, 44);
      context.shadowBlur = 0;
    } else if (cs.weaponId === 'bat') {
      // 🏏 GIANT GOLDEN CHAMPIONSHIP BAT + HOMERUN RINGS!
      context.rotate(-0.6);
      context.shadowColor = '#facc15';
      context.shadowBlur = 28;
      context.fillStyle = '#f59e0b';
      context.strokeStyle = '#fef08a';
      context.lineWidth = 5;
      context.beginPath();
      context.moveTo(-pr * 0.95, -6);
      context.lineTo(pr * 0.85, -24);
      context.arc(pr * 0.85, 0, 24, -Math.PI / 2, Math.PI / 2);
      context.lineTo(-pr * 0.95, 6);
      context.closePath();
      context.fill();
      context.stroke();
      context.shadowBlur = 0;
    } else if (cs.weaponId === 'frost') {
      // ❄️ GIANT GLOWING ICE CRYSTAL SNOWFLAKE!
      context.rotate(elapsed * 1.8);
      context.shadowColor = '#7dd3fc';
      context.shadowBlur = 26;
      context.strokeStyle = '#e0f2fe';
      context.lineWidth = 7;
      for (let i = 0; i < 6; i += 1) {
        const a = (Math.PI / 3) * i;
        context.beginPath();
        context.moveTo(0, 0);
        context.lineTo(Math.cos(a) * pr * 0.95, Math.sin(a) * pr * 0.95);
        context.stroke();
      }
      context.fillStyle = '#38bdf8';
      context.beginPath();
      context.arc(0, 0, pr * 0.24, 0, Math.PI * 2);
      context.fill();
      context.shadowBlur = 0;
    } else if (cs.weaponId === 'kunai') {
      // 🗡️ TRIPLE FANNED GLOWING KUNAI!
      context.shadowColor = '#93c5fd';
      context.shadowBlur = 22;
      [-0.38, 0, 0.38].forEach((ang) => {
        context.save();
        context.rotate(ang);
        context.fillStyle = '#f8fafc';
        context.strokeStyle = '#38bdf8';
        context.lineWidth = 4;
        context.beginPath();
        context.moveTo(pr * 0.98, 0);
        context.lineTo(pr * 0.1, -pr * 0.22);
        context.lineTo(-pr * 0.35, 0);
        context.lineTo(pr * 0.1, pr * 0.22);
        context.closePath();
        context.fill();
        context.stroke();
        context.restore();
      });
      context.shadowBlur = 0;
    } else {
      // Glowing Weapon Emblem Crest for Blaster / Shotgun / Railgun / Boomer / Shockwave / Flame / Mine!
      context.shadowColor = cs.accent;
      context.shadowBlur = 30;
      context.strokeStyle = cs.accent;
      context.lineWidth = 7;
      context.beginPath();
      context.arc(0, 0, pr * 0.88, 0, Math.PI * 2);
      context.stroke();
      context.fillStyle = 'rgba(2, 6, 23, 0.72)';
      context.fill();
      context.strokeStyle = '#ffffff';
      context.lineWidth = 2.5;
      context.beginPath();
      context.arc(0, 0, pr * 0.7, 0, Math.PI * 2);
      context.stroke();
      context.font = `900 ${Math.round(pr * 0.95)}px Arial`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillStyle = '#ffffff';
      context.fillText(cs.ultIcon || '⚡', 0, 4);
      context.textBaseline = 'alphabetic';
      context.shadowBlur = 0;
    }
    context.restore();
    context.restore();

    // Glowing Metallic Borders for Slash Band
    context.strokeStyle = cs.accent;
    context.lineWidth = 6;
    context.shadowColor = cs.accent;
    context.shadowBlur = 20;
    context.beginPath();
    context.moveTo(-20, cy - bandHalfH + tilt);
    context.lineTo(w + 20, cy - bandHalfH - tilt);
    context.moveTo(-20, cy + bandHalfH + tilt);
    context.lineTo(w + 20, cy + bandHalfH - tilt);
    context.stroke();
    context.strokeStyle = '#ffffff';
    context.lineWidth = 2;
    context.stroke();
    context.shadowBlur = 0;
    context.restore();

    // 5. Dramatic Anime Typography Sliding in from Right!
    const textX = w * 0.61 + (1 - easeOut) * 220;
    context.save();
    context.textAlign = 'center';

    // Top badge
    context.font = '900 15px Arial';
    context.fillStyle = cs.accent;
    context.fillText(
      cs.synergyMode
        ? '★ SYNERGY OVERDRIVE · 심판의 회랑 ★'
        : cs.sansMode
          ? '★ MEGALOVANIA · 가스터 블래스터 ★'
          : `✦ WEAPON ULTIMATE · ${cs.weaponName} ✦`,
      textX,
      cy - 54,
    );

    // Giant Skill Name with heavy stroke + neon glow
    context.font = `900 ${Math.min(54, Math.max(32, Math.round(w * 0.056)))}px Arial`;
    context.lineWidth = 8;
    context.strokeStyle = '#020617';
    context.strokeText(`${cs.ultIcon} ${cs.ultName}`, textX, cy + 8);
    context.shadowColor = cs.accent;
    context.shadowBlur = 22;
    context.fillStyle = '#ffffff';
    context.fillText(`${cs.ultIcon} ${cs.ultName}`, textX, cy + 8);
    context.shadowBlur = 0;

    // English Subtext
    context.font = '900 13px Arial';
    context.fillStyle = 'rgba(255,255,255,0.75)';
    context.fillText(cs.ultSub, textX, cy + 34);

    // Anime Catchphrase Quote
    context.font = '800 19px Arial';
    context.strokeStyle = '#020617';
    context.lineWidth = 5;
    context.strokeText(`“${cs.ultQuote}”`, textX, cy + 68);
    context.fillStyle = '#fef08a';
    context.fillText(`“${cs.ultQuote}”`, textX, cy + 68);
    context.restore();

    // 6. Cinematic Top & Bottom Black Letterbox Bars
    const barH = Math.round(h * 0.115 * easeOut);
    context.fillStyle = '#000000';
    context.fillRect(0, 0, w, barH);
    context.fillRect(0, h - barH, w, barH);

    context.restore();
  }

  if ((game.ultImpactFlash ?? 0) > 0) {
    context.save();
    context.globalAlpha = clamp((game.ultImpactFlash / 0.38) * 0.85, 0, 0.85);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.restore();
  }

  if (game.ultFlash > 0) {
    context.save();
    context.globalAlpha = Math.min(0.95, game.ultFlash / 1.1);
    context.fillStyle = 'rgba(131, 24, 67, 0.8)';
    context.fillRect(0, canvas.height / 2 - 64, canvas.width, 128);
    context.fillStyle = '#fde047';
    context.textAlign = 'center';
    context.font = '900 38px Arial';
    context.fillText(game.ultBannerName || '⚡ ULTIMATE! ⚡', canvas.width / 2, canvas.height / 2 + 12);
    context.restore();
  }

  if (game.abilityAwakenFlash > 0) {
    context.save();
    context.globalAlpha = Math.min(1, game.abilityAwakenFlash / 1.5);
    context.fillStyle = 'rgba(126, 34, 206, 0.82)';
    context.fillRect(0, canvas.height / 2 - 70, canvas.width, 140);
    context.fillStyle = '#fde047';
    context.textAlign = 'center';
    context.font = '900 36px Arial';
    context.fillText('⚡ ABILITY AWAKENED! ⚡', canvas.width / 2, canvas.height / 2 - 8);
    context.fillStyle = '#ffffff';
    context.font = '900 18px Arial';
    context.fillText(game.abilityAwakenName || '능력 각성!', canvas.width / 2, canvas.height / 2 + 30);
    context.restore();
  }

  if (game.awakenFlash > 0) {
    const weapon = weapons[game.player.weaponIndex];
    context.save();
    context.globalAlpha = Math.min(1, game.awakenFlash / 1.6);
    context.fillStyle = 'rgba(88, 28, 135, 0.78)';
    context.fillRect(0, canvas.height / 2 - 70, canvas.width, 140);
    context.fillStyle = '#fef3c7';
    context.textAlign = 'center';
    context.font = '900 38px Arial';
    context.fillText(game.awakenBannerCustom ? '💀 SANS MODE AWAKENED 💀' : 'WEAPON AWAKENED', canvas.width / 2, canvas.height / 2 - 8);
    context.font = '900 18px Arial';
    context.fillText(game.awakenBannerCustom || (weapon.displayName ?? weapon.name), canvas.width / 2, canvas.height / 2 + 30);
    context.restore();
  }
}

export default function TangtangPage() {
  const canvasRef = useRef(null);
  const gameRef = useRef(createGame());
  const frameRef = useRef(null);
  const lastTimeRef = useRef(null);
  const inputRef = useRef({
    up: false,
    down: false,
    left: false,
    right: false,
    touch: { x: 0, y: 0 },
    mouse: { active: false, x: 0, y: 0 },
    aim: { active: false, x: 0, y: 0 },
  });
  const aimModeRef = useRef('manual');
  const [aimMode, setAimMode] = useState('manual');
  const audioRef = useRef(null);
  const bgmMutedRef = useRef(false);
  const [bgmMuted, setBgmMuted] = useState(false);
  const sansBgmRef = useRef({ active: false, intervalId: null, step: 0, audioEl: null, hasMp3: null });
  const arenaTouchRef = useRef({ pointerId: null, originX: 0, originY: 0 });
  const stickPointerRef = useRef(null);
  const [floatingStick, setFloatingStick] = useState(null);
  const [fixedStickOffset, setFixedStickOffset] = useState({ x: 0, y: 0 });
  const [selectedStage, setSelectedStage] = useState(0);
  const [selectedWeapon, setSelectedWeapon] = useState(0);
  const [selectedHero, setSelectedHero] = useState(0);
  const [lobbyTab, setLobbyTab] = useState('deploy');
  const [petFilter, setPetFilter] = useState('all');
  const [gachaResults, setGachaResults] = useState([]);
  const lobbyMetaRef = useRef(DEFAULT_LOBBY_META);
  const [lobbyMeta, setLobbyMeta] = useState(DEFAULT_LOBBY_META);
  const [hud, setHud] = useState(() => gameRef.current);
  const [version, setVersion] = useState(0);
  const bmStateRef = useRef(DEFAULT_BLACK_MARKET);
  const [bmState, setBmState] = useState(DEFAULT_BLACK_MARKET);
  const blackMarketOpenRef = useRef(false);
  const [blackMarketOpen, setBlackMarketOpen] = useState(false);
  const secretProgressRef = useRef(0);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(BLACK_MARKET_KEY) || '{}');
      const loaded = {
        gold: Number.isFinite(Number(saved.gold)) ? Math.max(0, Number(saved.gold)) : DEFAULT_BLACK_MARKET.gold,
        owned: saved.owned && typeof saved.owned === 'object' ? saved.owned : {},
        equipped: saved.equipped && typeof saved.equipped === 'object' ? saved.equipped : {},
      };
      bmStateRef.current = loaded;
      setBmState(loaded);
    } catch {
      bmStateRef.current = DEFAULT_BLACK_MARKET;
    }

    try {
      const savedMeta = JSON.parse(window.localStorage.getItem(LOBBY_META_KEY) || '{}');
      const loadedMeta = {
        coins: Number.isFinite(Number(savedMeta.coins)) ? Math.max(0, Number(savedMeta.coins)) : DEFAULT_LOBBY_META.coins,
        ownedPets: {
          corgi: true,
          ...(savedMeta.ownedPets && typeof savedMeta.ownedPets === 'object' ? savedMeta.ownedPets : {}),
        },
        petLevels: {
          corgi: 1,
          ...(savedMeta.petLevels && typeof savedMeta.petLevels === 'object' ? savedMeta.petLevels : {}),
        },
        equippedPet:
          typeof savedMeta.equippedPet === 'string' || savedMeta.equippedPet === null
            ? savedMeta.equippedPet
            : DEFAULT_LOBBY_META.equippedPet,
        upgrades: {
          ...DEFAULT_LOBBY_META.upgrades,
          ...(savedMeta.upgrades && typeof savedMeta.upgrades === 'object' ? savedMeta.upgrades : {}),
        },
      };
      lobbyMetaRef.current = loadedMeta;
      setLobbyMeta(loadedMeta);
      const preview = createGame(0, bmStateRef.current.equipped, 0, loadedMeta);
      gameRef.current = preview;
      setHud({ ...preview, player: { ...preview.player } });
    } catch {
      lobbyMetaRef.current = DEFAULT_LOBBY_META;
    }
  }, []);

  function syncLobbyPreview(nextMeta = lobbyMetaRef.current, stageIdx = selectedStage, weaponIdx = selectedWeapon, heroIdx = selectedHero) {
    if (gameRef.current.running) return;
    const preview = createGame(stageIdx, bmStateRef.current.equipped, heroIdx, nextMeta);
    preview.player.weaponIndex = weaponIdx;
    gameRef.current = preview;
    setHud({ ...preview, player: { ...preview.player } });
  }

  function updateLobbyMeta(updater) {
    setLobbyMeta((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      lobbyMetaRef.current = next;
      try {
        window.localStorage.setItem(LOBBY_META_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage write failure.
      }
      if (!gameRef.current.running) {
        const preview = createGame(selectedStage, bmStateRef.current.equipped, selectedHero, next);
        preview.player.weaponIndex = selectedWeapon;
        gameRef.current = preview;
        setHud({ ...preview, player: { ...preview.player } });
      }
      return next;
    });
  }

  function earnLobbyCoins(amount) {
    if (!amount || amount <= 0) return;
    const next = {
      ...lobbyMetaRef.current,
      coins: lobbyMetaRef.current.coins + amount,
    };
    lobbyMetaRef.current = next;
    setLobbyMeta(next);
    try {
      window.localStorage.setItem(LOBBY_META_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage write failure.
    }
  }

  function buyOrEquipPet(pet) {
    const meta = lobbyMetaRef.current;
    if (!meta.ownedPets?.[pet.id]) return;
    playSound('switch');
    updateLobbyMeta((prev) => ({
      ...prev,
      equippedPet: prev.equippedPet === pet.id ? null : pet.id,
    }));
  }

  function pullPetGacha(count = 1) {
    const cost = count === 10 ? GACHA_TEN_COST : GACHA_SINGLE_COST;
    const meta = lobbyMetaRef.current;
    if (meta.coins < cost) return;

    const nextOwned = { ...(meta.ownedPets ?? {}) };
    const nextLevels = { ...(meta.petLevels ?? {}) };
    let coinsAfter = meta.coins - cost;
    let bestHighTier = false;
    const pulls = [];

    for (let i = 0; i < count; i += 1) {
      const guaranteeEpic = count === 10 && i === count - 1;
      const pet = rollSinglePet(guaranteeEpic);
      const rarityInfo = PET_RARITIES[pet.rarity];
      if (pet.rarity === 'legend' || pet.rarity === 'mythic') {
        bestHighTier = true;
      }

      if (!nextOwned[pet.id]) {
        nextOwned[pet.id] = true;
        nextLevels[pet.id] = 1;
        pulls.push({ pet, status: 'NEW!' });
      } else {
        const curLv = clamp(Number(nextLevels[pet.id]) || 1, 1, 5);
        if (curLv < 5) {
          nextLevels[pet.id] = curLv + 1;
          pulls.push({ pet, status: `LV.${curLv + 1} UP!` });
        } else {
          const refund = rarityInfo.refund;
          coinsAfter += refund;
          pulls.push({ pet, status: `환급 +🪙${refund}` });
        }
      }
    }

    playSound(bestHighTier ? 'awake' : 'buy');
    setGachaResults(pulls);
    updateLobbyMeta((prev) => ({
      ...prev,
      coins: coinsAfter,
      ownedPets: nextOwned,
      petLevels: nextLevels,
    }));
  }

  function upgradePet(petId) {
    const meta = lobbyMetaRef.current;
    if (!meta.ownedPets?.[petId]) return;
    const curLv = clamp(Number(meta.petLevels?.[petId]) || 1, 1, 5);
    if (curLv >= 5) return;
    const cost = getPetUpgradeCost(curLv);
    if (meta.coins < cost) return;
    playSound('upgrade');
    updateLobbyMeta((prev) => ({
      ...prev,
      coins: prev.coins - cost,
      petLevels: { ...prev.petLevels, [petId]: curLv + 1 },
    }));
  }

  function buyMetaUpgrade(spec) {
    const meta = lobbyMetaRef.current;
    const curLv = Number(meta.upgrades?.[spec.id]) || 0;
    if (curLv >= spec.maxLv) return;
    const cost = getMetaUpgradeCost(spec, curLv);
    if (meta.coins < cost) return;
    playSound('upgrade');
    updateLobbyMeta((prev) => ({
      ...prev,
      coins: prev.coins - cost,
      upgrades: { ...prev.upgrades, [spec.id]: curLv + 1 },
    }));
  }

  function returnToLobby(tab = 'deploy') {
    stopSansBgm();
    setLobbyTab(tab);
    const preview = createGame(selectedStage, bmStateRef.current.equipped, selectedHero, lobbyMetaRef.current);
    preview.player.weaponIndex = selectedWeapon;
    gameRef.current = preview;
    setHud({ ...preview, player: { ...preview.player } });
  }

  function updateBlackMarket(updater) {
    setBmState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      bmStateRef.current = next;
      try {
        window.localStorage.setItem(BLACK_MARKET_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage write failure.
      }
      return next;
    });
  }

  function earnBlackMarketGold(amount) {
    if (!amount || amount <= 0) return;
    const next = {
      ...bmStateRef.current,
      gold: bmStateRef.current.gold + amount,
    };
    bmStateRef.current = next;
    setBmState(next);
    try {
      window.localStorage.setItem(BLACK_MARKET_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage write failure.
    }
  }

  function closeBlackMarket() {
    blackMarketOpenRef.current = false;
    setBlackMarketOpen(false);
  }

  function buyBlackMarketItem(item) {
    if (bmStateRef.current.owned[item.id] || bmStateRef.current.gold < item.price) return;
    playSound('buy');
    updateBlackMarket((prev) => ({
      ...prev,
      gold: prev.gold - item.price,
      owned: { ...prev.owned, [item.id]: true },
      equipped: { ...prev.equipped, [item.id]: true },
    }));
  }

  function toggleBlackMarketItem(itemId) {
    if (!bmStateRef.current.owned[itemId]) return;
    playSound('switch');
    updateBlackMarket((prev) => ({
      ...prev,
      equipped: { ...prev.equipped, [itemId]: !prev.equipped[itemId] },
    }));
  }

  function getAudioContext() {
    if (typeof window === 'undefined') return null;
    if (!audioRef.current) {
      audioRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioRef.current.state === 'suspended') {
      audioRef.current.resume();
    }
    return audioRef.current;
  }

  function playSound(type) {
    const context = getAudioContext();
    if (!context) return;

    const now = context.currentTime;
    const output = context.createGain();
    const oscillator = context.createOscillator();
    const settings = {
      shoot: [620, 260, 0.08, 'square', 0.035],
      flame: [180, 90, 0.08, 'sawtooth', 0.025],
      hit: [220, 120, 0.07, 'triangle', 0.03],
      hurt: [120, 54, 0.18, 'sawtooth', 0.08],
      level: [520, 960, 0.22, 'triangle', 0.08],
      upgrade: [440, 720, 0.12, 'sine', 0.055],
      awake: [180, 1100, 0.7, 'sawtooth', 0.12],
      boom: [80, 36, 0.34, 'sine', 0.11],
      bat: [310, 95, 0.14, 'triangle', 0.085],
      switch: [360, 540, 0.08, 'triangle', 0.045],
      buy: [760, 1320, 0.18, 'sine', 0.085],
      blackMarket: [190, 560, 0.42, 'sawtooth', 0.095],
      boss: [140, 62, 0.72, 'sawtooth', 0.13],
      bossClear: [440, 1180, 0.52, 'triangle', 0.12],
      gaster: [980, 110, 0.44, 'sawtooth', 0.12],
      trident: [680, 290, 0.16, 'triangle', 0.085],
      cutscene: [260, 880, 0.38, 'sawtooth', 0.13],
      ultimate: [180, 1240, 0.65, 'sawtooth', 0.14],
    }[type] ?? [300, 180, 0.1, 'sine', 0.04];
    const [start, end, duration, wave, volume] = settings;

    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(start, now);
    oscillator.frequency.exponentialRampToValueAtTime(end, now + duration);
    output.gain.setValueAtTime(0.0001, now);
    output.gain.exponentialRampToValueAtTime(volume, now + 0.01);
    output.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(output);
    output.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  function drainSounds(game) {
    if (!game.sounds.length) return;
    game.sounds.splice(0, 5).forEach(playSound);
  }

  function stopSansBgm() {
    const bgm = sansBgmRef.current;
    bgm.active = false;
    if (bgm.intervalId) {
      window.clearInterval(bgm.intervalId);
      bgm.intervalId = null;
    }
    if (bgm.audioEl) {
      try {
        bgm.audioEl.pause();
        bgm.audioEl.currentTime = 0;
      } catch {
        // Ignore audio pause errors.
      }
    }
  }

  function startSansChiptuneLoop() {
    const bgm = sansBgmRef.current;
    if (!bgm.active || bgmMutedRef.current) return;
    if (bgm.intervalId) {
      window.clearInterval(bgm.intervalId);
      bgm.intervalId = null;
    }

    // 120 BPM (125ms/16th) SNES / Undertale-style Overdriven Chiptune Boss Rock BGM (128-step 2-section loop)
    const N = {
      A1: 55.0, Bb1: 58.27, B1: 61.74, C2: 65.41, D2: 73.42, F2: 87.31, G2: 98.0,
      A2: 110.0, Bb2: 116.54, B2: 123.47, C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, Bb3: 233.08, B3: 246.94,
      C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, Ab4: 415.3, A4: 440.0, Bb4: 466.16, B4: 493.88,
      C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, Ab5: 830.61, A5: 880.0,
    };

    // Section A (0-63): Driving D -> C -> B -> Bb chiptune rock riff
    // Section B (64-127): High-energy Boss Climax / Overdriven Solo + Power Chords
    const leadSeq = [
      // Bar 1 (D)
      [N.D4, 0.9], [N.D4, 0.9], [N.D5, 1.7], null, [N.A4, 2.2], null, null, [N.Ab4, 1.4],
      null, [N.G4, 1.4], null, [N.F4, 1.7], null, [N.D4, 0.9], [N.F4, 0.9], [N.G4, 0.9],
      // Bar 2 (C)
      [N.C4, 0.9], [N.C4, 0.9], [N.D5, 1.7], null, [N.A4, 2.2], null, null, [N.Ab4, 1.4],
      null, [N.G4, 1.4], null, [N.F4, 1.7], null, [N.D4, 0.9], [N.F4, 0.9], [N.G4, 0.9],
      // Bar 3 (B)
      [N.B3, 0.9], [N.B3, 0.9], [N.D5, 1.7], null, [N.A4, 2.2], null, null, [N.Ab4, 1.4],
      null, [N.G4, 1.4], null, [N.F4, 1.7], null, [N.D4, 0.9], [N.F4, 0.9], [N.G4, 0.9],
      // Bar 4 (Bb)
      [N.Bb3, 0.9], [N.Bb3, 0.9], [N.D5, 1.7], null, [N.A4, 2.2], null, null, [N.Ab4, 1.4],
      null, [N.G4, 1.4], null, [N.F4, 1.7], null, [N.D4, 0.9], [N.F4, 0.9], [N.G4, 0.9],
      // Bar 5 (Climax High Riff - Dm)
      [N.F5, 1.8], null, [N.F5, 0.9], [N.F5, 0.9], [N.F5, 1.6], null, [N.D5, 1.6], null,
      [N.D5, 1.6], null, [N.F5, 1.6], null, [N.F5, 0.9], [N.G5, 0.9], [N.Ab5, 1.5], null,
      // Bar 6 (Climax - C)
      [N.G5, 1.5], null, [N.F5, 1.5], null, [N.D5, 1.5], null, [N.F5, 0.9], [N.G5, 0.9],
      [N.A5, 2.2], null, null, [N.G5, 1.4], null, [N.F5, 1.4], [N.D5, 1.2], null,
      // Bar 7 (Climax - Bb)
      [N.D5, 0.9], [N.F5, 0.9], [N.G5, 1.6], null, [N.A5, 1.8], null, [N.G5, 1.5], null,
      [N.F5, 1.5], null, [N.D5, 1.5], null, [N.C5, 1.4], null, [N.D5, 1.4], null,
      // Bar 8 (Turnaround - C -> A)
      [N.E5, 1.8], null, [N.F5, 1.6], null, [N.G5, 1.8], null, [N.A5, 2.4], null,
      null, [N.G5, 0.9], [N.F5, 0.9], [N.E5, 0.9], [N.D5, 1.4], null, [N.C5, 1.2], null,
    ];

    const bassSeq = [
      // Bar 1 (D)
      N.D2, 0, N.D3, 0, N.D2, 0, N.D3, N.D2, N.D2, 0, N.D3, 0, N.A1, 0, N.C2, 0,
      // Bar 2 (C)
      N.C2, 0, N.C3, 0, N.C2, 0, N.C3, N.C2, N.C2, 0, N.C3, 0, N.C2, 0, N.D2, 0,
      // Bar 3 (B)
      N.B1, 0, N.B2, 0, N.B1, 0, N.B2, N.B1, N.B1, 0, N.B2, 0, N.B1, 0, N.C2, 0,
      // Bar 4 (Bb)
      N.Bb1, 0, N.Bb2, 0, N.Bb1, 0, N.Bb2, N.Bb1, N.Bb1, 0, N.C2, 0, N.A1, 0, N.C2, 0,
      // Bar 5 (Dm)
      N.D2, N.D2, N.D3, 0, N.D2, 0, N.D3, N.D2, N.D2, N.D2, N.D3, 0, N.F2, 0, N.G2, 0,
      // Bar 6 (C)
      N.C2, N.C2, N.C3, 0, N.C2, 0, N.C3, N.C2, N.C2, N.C2, N.C3, 0, N.G2, 0, N.C2, 0,
      // Bar 7 (Bb)
      N.Bb1, N.Bb1, N.Bb2, 0, N.Bb1, 0, N.Bb2, N.Bb1, N.Bb1, N.Bb1, N.Bb2, 0, N.F2, 0, N.Bb1, 0,
      // Bar 8 (C -> A)
      N.C2, 0, N.C3, 0, N.C2, 0, N.C3, 0, N.A1, 0, N.A2, 0, N.A1, N.B1, N.C2, N.D2,
    ];

    const chordPads = {
      0: [N.D3, N.A3, N.F4],
      16: [N.C3, N.G3, N.E4],
      32: [N.B2, N.F3, N.D4],
      48: [N.Bb2, N.F3, N.D4],
      64: [N.D3, N.A3, N.D4],
      80: [N.C3, N.G3, N.C4],
      96: [N.Bb2, N.F3, N.Bb3],
      112: [N.C3, N.G3, N.C4],
      120: [N.A2, N.E3, N.A3],
    };

    let noiseBuf = null;
    function getNoiseBuffer(ctx) {
      if (noiseBuf && noiseBuf.sampleRate === ctx.sampleRate) return noiseBuf;
      const len = Math.floor(ctx.sampleRate * 0.14);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) {
        data[i] = Math.random() * 2 - 1;
      }
      noiseBuf = buf;
      return buf;
    }

    bgm.step = 0;
    bgm.intervalId = window.setInterval(() => {
      if (!bgm.active || bgmMutedRef.current) return;
      if (!gameRef.current.running || gameRef.current.over) {
        stopSansBgm();
        return;
      }
      const ctx = getAudioContext();
      if (!ctx) return;

      const step = bgm.step % 128;
      bgm.step += 1;
      const now = ctx.currentTime;
      const stepDur = 0.125;

      // 1. Overdriven SNES Chiptune Guitar Lead (Square + Detuned Saw through Dynamic Lowpass)
      const leadEntry = leadSeq[step];
      if (leadEntry) {
        const [leadFreq, mult] = leadEntry;
        const dur = stepDur * mult;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3400, now);
        filter.frequency.exponentialRampToValueAtTime(1100, now + dur);
        filter.Q.setValueAtTime(2.4, now);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.056, now + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

        const osc1 = ctx.createOscillator();
        osc1.type = 'square';
        osc1.frequency.setValueAtTime(leadFreq, now);

        const osc2 = ctx.createOscillator();
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(leadFreq * 1.0035, now);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + dur + 0.015);
        osc2.stop(now + dur + 0.015);
      }

      // 2. Punchy Rock Bassline (Sawtooth + Sub Sine)
      const bassFreq = bassSeq[step];
      if (bassFreq) {
        const bFilter = ctx.createBiquadFilter();
        bFilter.type = 'lowpass';
        bFilter.frequency.setValueAtTime(920, now);
        bFilter.frequency.exponentialRampToValueAtTime(280, now + 0.13);

        const bGain = ctx.createGain();
        bGain.gain.setValueAtTime(0.0001, now);
        bGain.gain.linearRampToValueAtTime(0.072, now + 0.007);
        bGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

        const bassOsc = ctx.createOscillator();
        bassOsc.type = 'sawtooth';
        bassOsc.frequency.setValueAtTime(bassFreq, now);

        bassOsc.connect(bFilter);
        bFilter.connect(bGain);
        bGain.connect(ctx.destination);
        bassOsc.start(now);
        bassOsc.stop(now + 0.15);
      }

      // 3. Crunch Power-Chord Guitar Stabs on bar changes & climax beats
      const chord = chordPads[step] || (step >= 64 && step % 4 === 0 ? chordPads[Math.floor(step / 16) * 16] : null);
      if (chord) {
        const isClimaxStab = step >= 64;
        const cDur = isClimaxStab ? 0.16 : 0.36;
        chord.forEach((freq) => {
          const cOsc = ctx.createOscillator();
          const cGain = ctx.createGain();
          cOsc.type = 'sawtooth';
          cOsc.frequency.setValueAtTime(freq, now);
          cGain.gain.setValueAtTime(0.0001, now);
          cGain.gain.linearRampToValueAtTime(isClimaxStab ? 0.016 : 0.012, now + 0.012);
          cGain.gain.exponentialRampToValueAtTime(0.0001, now + cDur);
          cOsc.connect(cGain);
          cGain.connect(ctx.destination);
          cOsc.start(now);
          cOsc.stop(now + cDur + 0.015);
        });
      }

      // 4. Arcade Rock Drum Kit (Punchy Kick + Crisp White-Noise Snare + 16th Hi-Hat!)
      const barStep = step % 16;
      if (barStep === 0 || barStep === 6 || barStep === 8 || barStep === 14) {
        const kick = ctx.createOscillator();
        const kGain = ctx.createGain();
        kick.type = 'sine';
        kick.frequency.setValueAtTime(155, now);
        kick.frequency.exponentialRampToValueAtTime(38, now + 0.09);
        kGain.gain.setValueAtTime(barStep === 0 || barStep === 8 ? 0.12 : 0.08, now);
        kGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
        kick.connect(kGain);
        kGain.connect(ctx.destination);
        kick.start(now);
        kick.stop(now + 0.11);
      }
      if (barStep === 4 || barStep === 12 || (step >= 120 && barStep % 2 === 0)) {
        // Real white-noise Snare + body snap!
        const src = ctx.createBufferSource();
        src.buffer = getNoiseBuffer(ctx);
        const sFilter = ctx.createBiquadFilter();
        sFilter.type = 'bandpass';
        sFilter.frequency.setValueAtTime(1900, now);
        const sGain = ctx.createGain();
        sGain.gain.setValueAtTime(0.085, now);
        sGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
        src.connect(sFilter);
        sFilter.connect(sGain);
        sGain.connect(ctx.destination);
        src.start(now);
        src.stop(now + 0.12);
      }
      if (step % 2 === 1 || step >= 64) {
        // Crisp Hi-Hat ticks
        const hSrc = ctx.createBufferSource();
        hSrc.buffer = getNoiseBuffer(ctx);
        const hFilter = ctx.createBiquadFilter();
        hFilter.type = 'highpass';
        hFilter.frequency.setValueAtTime(7500, now);
        const hGain = ctx.createGain();
        hGain.gain.setValueAtTime(step % 2 === 0 ? 0.028 : 0.018, now);
        hGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);
        hSrc.connect(hFilter);
        hFilter.connect(hGain);
        hGain.connect(ctx.destination);
        hSrc.start(now);
        hSrc.stop(now + 0.04);
      }
    }, 125);
  }

  function startSansBgm() {
    if (bgmMutedRef.current) return;
    stopSansBgm();
    const bgm = sansBgmRef.current;
    bgm.active = true;

    // Optional local user-supplied MP3 at public/audio/megalovania.mp3; falls back seamlessly to built-in 8-bit Chiptune Boss BGM!
    const playMp3 = () => {
      if (!bgm.active || bgmMutedRef.current) return;
      if (!bgm.audioEl) {
        const el = new Audio('/audio/megalovania.mp3');
        el.loop = true;
        el.volume = 0.45;
        bgm.audioEl = el;
      }
      bgm.audioEl.currentTime = 0;
      bgm.audioEl.play().catch(() => {
        bgm.hasMp3 = false;
        startSansChiptuneLoop();
      });
    };

    if (bgm.hasMp3 === true) {
      playMp3();
      return;
    }
    if (bgm.hasMp3 === false) {
      startSansChiptuneLoop();
      return;
    }

    fetch('/audio/megalovania.mp3', { method: 'HEAD' })
      .then((res) => {
        if (!bgm.active || bgmMutedRef.current) return;
        if (res.ok) {
          bgm.hasMp3 = true;
          playMp3();
        } else {
          bgm.hasMp3 = false;
          startSansChiptuneLoop();
        }
      })
      .catch(() => {
        bgm.hasMp3 = false;
        if (bgm.active && !bgmMutedRef.current) startSansChiptuneLoop();
      });
  }

  function toggleBgmMute() {
    setBgmMuted((prev) => {
      const next = !prev;
      bgmMutedRef.current = next;
      if (next) {
        stopSansBgm();
      } else if (gameRef.current.running && HEROES[gameRef.current.heroIndex]?.id === 'sans') {
        startSansBgm();
      }
      return next;
    });
  }

  function resetGame(stageIndex = selectedStage, weaponIndex = selectedWeapon, heroIndex = selectedHero) {
    getAudioContext();
    closeBlackMarket();
    const equippedBm = bmStateRef.current.equipped;
    const heroUnlockKey = HEROES[heroIndex]?.blackMarketUnlockId;
    const safeHeroIndex =
      heroUnlockKey && !bmStateRef.current.owned?.[heroUnlockKey]
        ? 0
        : heroIndex;
    const gasterIdx = weapons.findIndex((w) => w.id === 'gaster');
    const isSansHero = HEROES[safeHeroIndex]?.id === 'sans';
    const unlockKey = weapons[weaponIndex]?.blackMarketUnlockId;
    const safeWeaponIndex = isSansHero && gasterIdx >= 0
      ? gasterIdx
      : unlockKey && !bmStateRef.current.owned?.[unlockKey]
        ? 0
        : weaponIndex;
    const nextGame = createGame(stageIndex, equippedBm, safeHeroIndex, lobbyMetaRef.current);
    nextGame.aimMode = aimModeRef.current;
    nextGame.player.weaponIndex = safeWeaponIndex;
    if (equippedBm.instantAwaken) {
      const chosenWeapon = weapons[safeWeaponIndex];
      if (chosenWeapon) {
        nextGame.weaponLevels[chosenWeapon.id] = 5;
        nextGame.awakenedWeapons[chosenWeapon.id] = true;
        nextGame.awakenFlash = 1.6;
        if (chosenWeapon.id === 'gaster') {
          applySansAwakening(nextGame);
        }
      }
    }
    nextGame.running = true;
    gameRef.current = nextGame;
    if (isSansHero) {
      startSansBgm();
    } else {
      stopSansBgm();
    }
    queueSound(gameRef.current, 'level');
    setSelectedStage(stageIndex);
    setSelectedWeapon(safeWeaponIndex);
    setSelectedHero(safeHeroIndex);
    setHud({ ...gameRef.current, player: { ...gameRef.current.player } });
    setVersion((current) => current + 1);
  }

  function selectHero(index) {
    if (gameRef.current.running) return;
    const heroUnlockKey = HEROES[index]?.blackMarketUnlockId;
    if (heroUnlockKey && !bmStateRef.current.owned?.[heroUnlockKey]) return;
    getAudioContext();
    const gasterIdx = weapons.findIndex((w) => w.id === 'gaster');
    let nextWeaponIdx = selectedWeapon;
    if (HEROES[index]?.id === 'sans' && gasterIdx >= 0) {
      // 💀 Sans can ONLY wield Gaster Blaster -> auto-equip + activate Synergy Combo!
      nextWeaponIdx = gasterIdx;
    } else if (
      weapons[nextWeaponIdx]?.blackMarketUnlockId &&
      !bmStateRef.current.owned?.[weapons[nextWeaponIdx].blackMarketUnlockId]
    ) {
      nextWeaponIdx = 0;
    }
    setSelectedHero(index);
    setSelectedWeapon(nextWeaponIdx);
    const preview = createGame(selectedStage, bmStateRef.current.equipped, index, lobbyMetaRef.current);
    preview.player.weaponIndex = nextWeaponIdx;
    gameRef.current = preview;
    queueSound(gameRef.current, 'switch');
    setHud({ ...gameRef.current, player: { ...gameRef.current.player } });
  }

  function chooseUpgrade(id) {
    getAudioContext();
    applyUpgrade(gameRef.current, id);
    setHud({ ...gameRef.current });
  }

  function setWeapon(index, fromKeyboard = false) {
    if (gameRef.current.running) return;
    const activeHero = HEROES[gameRef.current.heroIndex ?? selectedHero];
    if (activeHero?.id === 'sans' && weapons[index]?.id !== 'gaster') return;
    const unlockKey = weapons[index]?.blackMarketUnlockId;
    if (activeHero?.id !== 'sans' && unlockKey && !bmStateRef.current.owned?.[unlockKey]) return;
    getAudioContext();
    setSelectedWeapon(index);
    gameRef.current.player.weaponIndex = index;
    gameRef.current.player.cooldown = 0;
    queueSound(gameRef.current, 'switch');
    setHud({ ...gameRef.current, player: { ...gameRef.current.player } });

    // Mobile & Click Secret Easter Egg: tap weapons 1→2→3→4→5→6→7→8→9 in order to open Black Market!
    if (!fromKeyboard && index >= 0 && index < SECRET_CODE.length) {
      const digit = String(index + 1);
      if (digit === SECRET_CODE[secretProgressRef.current]) {
        secretProgressRef.current += 1;
        if (secretProgressRef.current >= SECRET_CODE.length) {
          secretProgressRef.current = 0;
          blackMarketOpenRef.current = true;
          setBlackMarketOpen(true);
          playSound('blackMarket');
        }
      } else {
        secretProgressRef.current = digit === '1' ? 1 : 0;
      }
    }
  }

  function toggleAimMode() {
    setAimMode((prev) => {
      const next = prev === 'manual' ? 'auto' : 'manual';
      aimModeRef.current = next;
      gameRef.current.aimMode = next;
      playSound('switch');
      return next;
    });
  }

  function activateUltimate() {
    getAudioContext();
    if (triggerUltimate(gameRef.current)) {
      setHud({ ...gameRef.current, player: { ...gameRef.current.player } });
    }
  }

  function isGameUiPointer(event) {
    return Boolean(
      event.target.closest(
        'button, .startOverlay, .upgradeOverlay, .mobileGameHud, [data-ui="black-market"], [data-ui="lobby"]',
      ),
    );
  }

  function updateMouseMove(event) {
    if (event.pointerType && event.pointerType !== 'mouse') return;
    if (isGameUiPointer(event)) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    const length = Math.max(1, Math.hypot(x, y));
    inputRef.current.mouse = {
      active: true,
      x: x / length,
      y: y / length,
    };
  }

  function stopMouseMove(event) {
    if (event?.pointerType && event.pointerType !== 'mouse') return;
    inputRef.current.mouse = { active: false, x: 0, y: 0 };
  }

  function startArenaTouch(event) {
    if (isGameUiPointer(event) || !gameRef.current.running || gameRef.current.pausedForUpgrade) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ox = event.clientX - rect.left;
    const oy = event.clientY - rect.top;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    getAudioContext();
    arenaTouchRef.current = { pointerId: event.pointerId, originX: ox, originY: oy };
    setFloatingStick({ x: ox, y: oy, dx: 0, dy: 0 });
    inputRef.current.touch = { x: 0, y: 0 };
  }

  function moveArenaTouch(event) {
    if (arenaTouchRef.current.pointerId !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const rawDx = event.clientX - rect.left - arenaTouchRef.current.originX;
    const rawDy = event.clientY - rect.top - arenaTouchRef.current.originY;
    const maxRadius = 46;
    const dist = Math.hypot(rawDx, rawDy);
    const clamped = Math.min(dist, maxRadius);
    const nx = dist > 4 ? rawDx / dist : 0;
    const ny = dist > 4 ? rawDy / dist : 0;
    inputRef.current.touch = { x: nx, y: ny };
    setFloatingStick({
      x: arenaTouchRef.current.originX,
      y: arenaTouchRef.current.originY,
      dx: nx * clamped,
      dy: ny * clamped,
    });
  }

  function endArenaTouch(event) {
    if (arenaTouchRef.current.pointerId !== event.pointerId) return;
    arenaTouchRef.current.pointerId = null;
    inputRef.current.touch = { x: 0, y: 0 };
    setFloatingStick(null);
  }

  function updateFixedStick(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const rawX = event.clientX - rect.left - rect.width / 2;
    const rawY = event.clientY - rect.top - rect.height / 2;
    const maxRadius = rect.width / 2 - 20;
    const dist = Math.hypot(rawX, rawY);
    const nx = dist > 4 ? rawX / dist : 0;
    const ny = dist > 4 ? rawY / dist : 0;
    const clamped = Math.min(dist, maxRadius);
    inputRef.current.touch = { x: nx, y: ny };
    setFixedStickOffset({ x: nx * clamped, y: ny * clamped });
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width);
      canvas.height = Math.floor(rect.height);
    }

    function loop(timestamp) {
      if (lastTimeRef.current === null) lastTimeRef.current = timestamp;
      const delta = Math.min((timestamp - lastTimeRef.current) / 1000, 0.033);
      lastTimeRef.current = timestamp;
      updateGame(gameRef.current, inputRef.current, canvas, delta, earnBlackMarketGold, earnLobbyCoins);
      if (gameRef.current.over && sansBgmRef.current.active) {
        stopSansBgm();
      }
      drainSounds(gameRef.current);
      drawGame(context, gameRef.current, canvas);
      setHud({ ...gameRef.current, player: { ...gameRef.current.player } });
      frameRef.current = requestAnimationFrame(loop);
    }

    function handleKeyDown(event) {
      if (blackMarketOpenRef.current) {
        if (event.key === 'Escape') {
          closeBlackMarket();
        }
        return;
      }

      const key = event.key.toLowerCase();

      // Secret Lobby Easter Egg: press 123456789 in order while in lobby (!running)
      if (!gameRef.current.running && !event.repeat) {
        const digit =
          /^Digit[1-9]$/.test(event.code) ? event.code.slice(5) :
          /^Numpad[1-9]$/.test(event.code) ? event.code.slice(6) :
          /^[1-9]$/.test(key) ? key : '';
        if (digit) {
          if (digit === SECRET_CODE[secretProgressRef.current]) {
            secretProgressRef.current += 1;
            if (secretProgressRef.current >= SECRET_CODE.length) {
              secretProgressRef.current = 0;
              blackMarketOpenRef.current = true;
              setBlackMarketOpen(true);
              playSound('blackMarket');
              return;
            }
          } else {
            secretProgressRef.current = digit === '1' ? 1 : 0;
          }
        }
      }

      if (['arrowup', 'w'].includes(key)) inputRef.current.up = true;
      if (['arrowdown', 's'].includes(key)) inputRef.current.down = true;
      if (['arrowleft', 'a'].includes(key)) inputRef.current.left = true;
      if (['arrowright', 'd'].includes(key)) inputRef.current.right = true;
      if (gameRef.current.running && !event.repeat && [' ', 'e', 'q'].includes(key)) {
        event.preventDefault();
        activateUltimate();
      }
      if (!gameRef.current.running && Number(key) >= 1 && Number(key) <= Math.min(9, weapons.length)) {
        setWeapon(Number(key) - 1, true);
      }
    }

    function handleKeyUp(event) {
      const key = event.key.toLowerCase();
      if (['arrowup', 'w'].includes(key)) inputRef.current.up = false;
      if (['arrowdown', 's'].includes(key)) inputRef.current.down = false;
      if (['arrowleft', 'a'].includes(key)) inputRef.current.left = false;
      if (['arrowright', 'd'].includes(key)) inputRef.current.right = false;
    }

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    frameRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(frameRef.current);
    };
  }, [version]);

  useEffect(() => () => stopSansBgm(), []);

  const player = hud.player;
  const stage = stages[hud.stageIndex];
  const xpRatio = Math.min(100, (hud.xp / hud.nextXp) * 100);
  const hpRatio = Math.min(100, (player.hp / player.maxHp) * 100);
  const minutes = Math.floor(hud.time / 60).toString().padStart(2, '0');
  const seconds = Math.floor(hud.time % 60).toString().padStart(2, '0');
  const currentWeapon = weapons[player.weaponIndex];
  const currentWeaponLevel = hud.weaponLevels[currentWeapon.id] ?? 0;
  const currentWeaponAwakened = Boolean(hud.awakenedWeapons[currentWeapon.id]);
  const currentCooldown = (currentWeapon.cooldown ?? 0.4) / player.fireRate;
  const cooldownLeft = Math.max(0, player.cooldown ?? 0);
  const cooldownRatio = Math.max(0, Math.min(100, (1 - cooldownLeft / currentCooldown) * 100));
  const cooldownText = cooldownLeft > 0 ? `${cooldownLeft.toFixed(1)}s` : 'READY';
  const activeHeroObj = HEROES[hud.heroIndex ?? selectedHero] ?? HEROES[0];
  const equippedPetObj = lobbyMeta.equippedPet
    ? PETS.find((p) => p.id === lobbyMeta.equippedPet) ?? null
    : null;
  const activeBoss = (hud.enemies ?? []).find((enemy) => enemy.boss);
  const bossTimeLeft = Math.max(0, Math.ceil(stageSeconds - (hud.chapterTime ?? 0)));
  const bossCountdown = activeBoss
    ? '🔥 BOSS FIGHT!'
    : `보스까지 ${Math.floor(bossTimeLeft / 60)}:${String(bossTimeLeft % 60).padStart(2, '0')}`;

  const ultPct = Math.floor(clamp(player.ultCharge ?? 0, 0, 100));
  const ultReady = hud.running && ultPct >= 100;
  const isSansSelected = HEROES[selectedHero]?.id === 'sans';
  const isSansSynergyActive = Boolean(isSansSelected && weapons[selectedWeapon]?.id === 'gaster');
  const visibleHeroEntries = HEROES
    .map((hero, index) => ({ hero, index }))
    .filter(({ hero }) => !hero.blackMarketUnlockId || Boolean(bmState.owned?.[hero.blackMarketUnlockId]));
  const visibleWeaponEntries = weapons
    .map((weapon, index) => ({ weapon, index }))
    .filter(({ weapon }) =>
      isSansSelected
        ? weapon.id === 'gaster'
        : !weapon.blackMarketUnlockId || Boolean(bmState.owned?.[weapon.blackMarketUnlockId]),
    );
  const activeWeaponUlt = WEAPON_ULTIMATES[currentWeapon?.id] ?? WEAPON_ULTIMATES.blaster;
  const lobbySelectedWeapon = weapons[selectedWeapon] ?? weapons[0];
  const lobbyWeaponUlt = WEAPON_ULTIMATES[lobbySelectedWeapon?.id] ?? WEAPON_ULTIMATES.blaster;

  return (
    <section className="survivorPage">
      <div className="survivorTop">
        <div>
          <span>GANGYOON!LAB! · RPG Survival</span>
          <h1>탕탕 특공대</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {activeHeroObj.id === 'sans' && (
            <button
              type="button"
              className={
                !bgmMuted
                  ? bmStyles.aimToggleBtn
                  : `${bmStyles.aimToggleBtn} ${bmStyles.aimToggleBtnAuto}`
              }
              onClick={toggleBgmMute}
            >
              {bgmMuted ? '🔇 BGM OFF' : '🎵 MEGALOVANIA ON'}
            </button>
          )}
          <button
            type="button"
            className={
              aimMode === 'manual'
                ? bmStyles.aimToggleBtn
                : `${bmStyles.aimToggleBtn} ${bmStyles.aimToggleBtnAuto}`
            }
            onClick={toggleAimMode}
          >
            {aimMode === 'manual' ? '🎯 수동 조준 ON' : '🤖 자동 조준'}
          </button>
          <span className={bmStyles.lobbyCoinBadge}>🪙 {lobbyMeta.coins.toLocaleString()} 코인</span>
          {hud.running && (
            <button
              type="button"
              className={bmStyles.lobbySecondaryBtn}
              onClick={() => returnToLobby('deploy')}
            >
              🏕️ 로비로
            </button>
          )}
          <button type="button" onClick={() => resetGame()}>
            {hud.running ? '다시 시작' : '게임 시작'}
          </button>
        </div>
      </div>

      <div className="survivorLayout">
        <aside className="survivorPanel">
          <div className="statBox">
            <span>MAP · HERO · PET</span>
            <strong>{stage.name}</strong>
            <em>
              {activeHeroObj.icon} {activeHeroObj.name}
              {equippedPetObj ? ` · ${equippedPetObj.icon} ${equippedPetObj.name}` : ''} · {bossCountdown}
            </em>
          </div>

          <div className="mapList">
            {stages.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={selectedStage === index ? 'active' : ''}
                disabled={hud.running}
                onClick={() => {
                  setSelectedStage(index);
                  syncLobbyPreview(lobbyMetaRef.current, index, selectedWeapon, selectedHero);
                }}
              >
                <span>{item.level}</span>
                <strong>{item.name}</strong>
              </button>
            ))}
          </div>

          <div className="statBox">
            <span>TIME</span>
            <strong>{minutes}:{seconds}</strong>
          </div>

          <div className="statGrid">
            <div>
              <span>LEVEL</span>
              <strong>{hud.level}</strong>
            </div>
            <div>
              <span>KILL</span>
              <strong>{hud.kills}</strong>
            </div>
            <div>
              <span>SCORE</span>
              <strong>{hud.score}</strong>
            </div>
            <div>
              <span>ENEMY</span>
              <strong>{hud.enemies.length}</strong>
            </div>
          </div>

          <div className="barBlock">
            <div>
              <span>HP</span>
              <em>{Math.ceil(player.hp)} / {player.maxHp}</em>
            </div>
            <i className="hpTrack"><b style={{ width: `${hpRatio}%` }} /></i>
          </div>

          <div className="barBlock">
            <div>
              <span>XP</span>
              <em>{hud.xp} / {hud.nextXp}</em>
            </div>
            <i className="xpTrack"><b style={{ width: `${xpRatio}%` }} /></i>
          </div>

          <div className="barBlock cooldownBlock">
            <div>
              <span>WEAPON CD</span>
              <em>{cooldownText}</em>
            </div>
            <i className="cooldownTrack"><b style={{ width: `${cooldownRatio}%` }} /></i>
          </div>

          <button
            type="button"
            className={ultReady ? `${bmStyles.ultPanelBtn} ${bmStyles.ultPanelBtnReady}` : bmStyles.ultPanelBtn}
            disabled={!ultReady}
            onClick={activateUltimate}
          >
            <span>
              {activeWeaponUlt.icon} 필살기 · {isSansSynergyActive ? '심판의 회랑 · 메갈로바니아' : activeWeaponUlt.name} ({ultReady ? 'SPACE 발동!' : `${ultPct}%`})
            </span>
            <i className={bmStyles.ultTrack}>
              <b className={bmStyles.ultFill} style={{ width: `${ultPct}%` }} />
            </i>
          </button>

          <div className="buildStats">
            <div>
              <span>CRIT</span>
              <strong>{Math.round(player.critChance * 100)}%</strong>
            </div>
            <div>
              <span>ARMOR</span>
              <strong>{player.armor}</strong>
            </div>
            <div>
              <span>REGEN</span>
              <strong>{player.regen.toFixed(1)}</strong>
            </div>
            <div>
              <span>AREA</span>
              <strong>{Math.round(player.area * 100)}%</strong>
            </div>
          </div>

          <div className={bmStyles.abilitySection} aria-label="능력 7종 현황">
            <div className={bmStyles.abilityHead}>
              <span>🚀 능력 (7종 · 5LV 각성)</span>
              <span>
                {ACTIVE_SKILLS.filter((sk) => (hud.skillLevels?.[sk.id] ?? 0) > 0).length} / {ACTIVE_SKILLS.length}
              </span>
            </div>
            <div className={bmStyles.abilityGrid}>
              {ACTIVE_SKILLS.map((sk) => {
                const lv = hud.skillLevels?.[sk.id] ?? 0;
                const awakened = Boolean(hud.awakenedSkills?.[sk.id]);
                return (
                  <div
                    key={sk.id}
                    className={
                      awakened
                        ? `${bmStyles.abilityChip} ${bmStyles.abilityChipAwaken}`
                        : bmStyles.abilityChip
                    }
                    title={awakened ? `${sk.awakenName}: ${sk.awakenText}` : sk.text}
                  >
                    <span>{sk.icon} {awakened ? sk.awakenName : sk.name}</span>
                    <em>{awakened ? '★ 각성' : `${lv}/5`}</em>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={bmStyles.abilitySection} aria-label="강화 5종 현황">
            <div className={bmStyles.abilityHead}>
              <span>💪 강화 (5종)</span>
              <span>
                {PASSIVES.filter((p) => (hud.passiveLevels?.[p.id] ?? 0) > 0).length} / {PASSIVES.length}
              </span>
            </div>
            <div className={bmStyles.abilityGrid}>
              {PASSIVES.map((p) => {
                const lv = hud.passiveLevels?.[p.id] ?? 0;
                return (
                  <div
                    key={p.id}
                    className={
                      lv >= 5
                        ? `${bmStyles.abilityChip} ${bmStyles.abilityChipAwaken}`
                        : bmStyles.abilityChip
                    }
                    title={p.text}
                  >
                    <span>{p.icon} {p.name}</span>
                    <em>{lv >= 5 ? 'MAX' : `${lv}/5`}</em>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="weaponList">
            {visibleWeaponEntries.map(({ weapon, index }, displayIdx) => (
              <button
                key={weapon.id}
                type="button"
                className={`${player.weaponIndex === index ? 'active' : ''} ${hud.awakenedWeapons[weapon.id] ? 'awakened' : ''} ${hud.running && player.weaponIndex !== index ? 'lockedWeapon' : ''}`}
                disabled={hud.running && player.weaponIndex !== index}
                onClick={() => setWeapon(index)}
              >
                <span style={{ background: weapon.color }}>{displayIdx + 1}</span>
                <strong>{weapon.displayName ?? weapon.name}</strong>
                <em>
                  {hud.running && player.weaponIndex !== index
                    ? '전투 중 변경 불가'
                    : `${hud.awakenedWeapons[weapon.id] ? 'AWAKEN' : `LV ${hud.weaponLevels[weapon.id] ?? 0}/5`} · ${weapon.displayDetail ?? weapon.detail}`}
                </em>
              </button>
            ))}
          </div>
        </aside>

        <div
          className="arenaWrap"
          onPointerDown={(event) => {
            if (event.pointerType === 'mouse') {
              if (!isGameUiPointer(event)) {
                event.currentTarget.setPointerCapture(event.pointerId);
                getAudioContext();
                updateMouseMove(event);
              }
            } else {
              startArenaTouch(event);
            }
          }}
          onPointerMove={(event) => {
            if (event.pointerType === 'mouse') {
              const rect = event.currentTarget.getBoundingClientRect();
              inputRef.current.aim = {
                active: true,
                x: event.clientX - rect.left,
                y: event.clientY - rect.top,
              };
              if (inputRef.current.mouse.active) {
                updateMouseMove(event);
              }
            } else {
              moveArenaTouch(event);
            }
          }}
          onPointerUp={(event) => {
            stopMouseMove(event);
            endArenaTouch(event);
          }}
          onPointerCancel={(event) => {
            stopMouseMove(event);
            endArenaTouch(event);
          }}
          onPointerLeave={(event) => {
            inputRef.current.aim.active = false;
            stopMouseMove(event);
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <canvas ref={canvasRef} className="arenaCanvas" />
          {hud.running && (
            <div className={bmStyles.arenaActionDock} data-ui="lobby">
              <button
                type="button"
                className={
                  aimMode === 'manual'
                    ? bmStyles.aimToggleBtn
                    : `${bmStyles.aimToggleBtn} ${bmStyles.aimToggleBtnAuto}`
                }
                onClick={toggleAimMode}
              >
                {aimMode === 'manual' ? '🎯 조준' : '🤖 자동'}
              </button>
              <button
                type="button"
                className={ultReady ? `${bmStyles.arenaUltBtn} ${bmStyles.arenaUltBtnReady}` : bmStyles.arenaUltBtn}
                disabled={!ultReady}
                onClick={activateUltimate}
              >
                {ultReady ? `${activeWeaponUlt.icon} 필살기!` : `⚡ ${ultPct}%`}
              </button>
            </div>
          )}
          {floatingStick && (
            <div
              className="floatingStick"
              style={{ left: `${floatingStick.x}px`, top: `${floatingStick.y}px` }}
              aria-hidden="true"
            >
              <span
                style={{
                  transform: `translate(${floatingStick.dx}px, ${floatingStick.dy}px)`,
                }}
              />
            </div>
          )}
          <div className="mobileGameHud">
            <span>{stage.name} · {activeBoss ? '🔥 BOSS' : `LV ${hud.level}`}</span>
            <strong>{minutes}:{seconds}</strong>
            <em>HP {Math.ceil(player.hp)}</em>
          </div>
          {activeBoss && (
            <div className={bmStyles.bossBarWrap} role="status" aria-label="챕터 보스 체력">
              <div className={bmStyles.bossBarHead}>
                <span className={bmStyles.bossBarName}>
                  💀 {activeBoss.bossTitle} · {activeBoss.bossName}
                  {activeBoss.hp < activeBoss.maxHp * 0.3
                    ? ' (🔥 극광폭화!!)'
                    : activeBoss.hp < activeBoss.maxHp * 0.6
                      ? ' (광폭화!)'
                      : ''}
                </span>
                <span className={bmStyles.bossBarHp}>
                  {Math.max(0, Math.ceil(activeBoss.hp)).toLocaleString()} / {activeBoss.maxHp.toLocaleString()}
                </span>
              </div>
              <i className={bmStyles.bossTrack}>
                <b
                  className={bmStyles.bossFill}
                  style={{ width: `${clamp((activeBoss.hp / activeBoss.maxHp) * 100, 0, 100)}%` }}
                />
              </i>
            </div>
          )}
          {!hud.running && !hud.over && (
            <div className={bmStyles.lobbyOverlay} data-ui="lobby" role="dialog" aria-label="작전 준비 로비">
              <div className={bmStyles.lobbyWindow}>
                <div className={bmStyles.lobbyTopBar}>
                  <div className={bmStyles.lobbyTitleWrap}>
                    <h2>🏕️ 탕탕 작전 준비 로비</h2>
                    <p>출격 전 캐릭터·무기·전투 펫·영구 업그레이드를 세팅하세요!</p>
                  </div>
                  <span className={bmStyles.lobbyCoinBadge}>🪙 {lobbyMeta.coins.toLocaleString()} 코인</span>
                </div>

                <div className={bmStyles.lobbyTabs} role="tablist" aria-label="로비 메뉴">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={lobbyTab === 'deploy'}
                    className={
                      lobbyTab === 'deploy'
                        ? `${bmStyles.lobbyTab} ${bmStyles.lobbyTabActive}`
                        : bmStyles.lobbyTab
                    }
                    onClick={() => setLobbyTab('deploy')}
                  >
                    🎯 출격 준비
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={lobbyTab === 'pets'}
                    className={
                      lobbyTab === 'pets'
                        ? `${bmStyles.lobbyTab} ${bmStyles.lobbyTabActive}`
                        : bmStyles.lobbyTab
                    }
                    onClick={() => setLobbyTab('pets')}
                  >
                    🐾 펫 ({Object.values(lobbyMeta.ownedPets ?? {}).filter(Boolean).length}/{PETS.length})
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={lobbyTab === 'upgrades'}
                    className={
                      lobbyTab === 'upgrades'
                        ? `${bmStyles.lobbyTab} ${bmStyles.lobbyTabActive}`
                        : bmStyles.lobbyTab
                    }
                    onClick={() => setLobbyTab('upgrades')}
                  >
                    ⬆️ 영구 업그레이드
                  </button>
                </div>

                <div className={bmStyles.lobbyBody}>
                  {lobbyTab === 'deploy' && (
                    <>
                      <div className={bmStyles.lobbySectionTitle}>
                        <span>챕터 선택</span>
                        <span>각 챕터 끝에 초강력 보스 등장!</span>
                      </div>
                      <div className={bmStyles.lobbyStageRow} aria-label="스테이지 선택">
                        {stages.map((item, index) => (
                          <button
                            key={item.id}
                            type="button"
                            className={
                              selectedStage === index
                                ? `${bmStyles.lobbyStageBtn} ${bmStyles.lobbyStageBtnActive}`
                                : bmStyles.lobbyStageBtn
                            }
                            onClick={() => {
                              setSelectedStage(index);
                              syncLobbyPreview(lobbyMetaRef.current, index, selectedWeapon, selectedHero);
                            }}
                          >
                            {item.level}. {item.name}
                          </button>
                        ))}
                      </div>

                      <div className={bmStyles.lobbySectionTitle}>
                        <span>캐릭터 선택 ({visibleHeroEntries.length}명)</span>
                        <span>{HEROES[selectedHero].icon} {HEROES[selectedHero].name}</span>
                      </div>
                      <div className={bmStyles.heroPicker} aria-label="캐릭터 선택">
                        {visibleHeroEntries.map(({ hero: heroItem, index }) => (
                          <button
                            key={heroItem.id}
                            type="button"
                            className={
                              selectedHero === index
                                ? `${bmStyles.heroBtn} ${bmStyles.heroBtnActive}`
                                : bmStyles.heroBtn
                            }
                            onClick={() => selectHero(index)}
                          >
                            <span className={bmStyles.heroIcon} style={{ background: heroItem.body }}>
                              {heroItem.icon}
                            </span>
                            <span className={bmStyles.heroName}>{heroItem.name}</span>
                            <span className={bmStyles.heroRole}>{heroItem.role}</span>
                          </button>
                        ))}
                      </div>
                      <div className={bmStyles.heroPerkNote}>
                        {HEROES[selectedHero].icon} {HEROES[selectedHero].name}: {HEROES[selectedHero].perk}
                      </div>

                      <div className={bmStyles.lobbySectionTitle}>
                        <span>
                          {isSansSelected
                            ? '💀 샌즈 전용 무기 고정 (가스터 블래스터 전용!)'
                            : `시작 무기 선택 (${visibleWeaponEntries.length}종 · 전투 중 변경 불가)`}
                        </span>
                        <span>{lobbySelectedWeapon.name}</span>
                      </div>
                      <div className="startWeaponPicker" aria-label="시작 무기 선택" style={{ maxWidth: '100%' }}>
                        {visibleWeaponEntries.map(({ weapon, index }) => (
                          <button
                            key={weapon.id}
                            type="button"
                            className={selectedWeapon === index ? 'active' : ''}
                            onClick={() => setWeapon(index)}
                          >
                            <i style={{ background: weapon.color }} />
                            <span>{weapon.name}</span>
                          </button>
                        ))}
                      </div>
                      <div className={bmStyles.heroPerkNote}>
                        {lobbyWeaponUlt.icon} 무기 필살기 · <strong>{isSansSynergyActive ? '심판의 회랑 · 메갈로바니아' : lobbyWeaponUlt.name}</strong>:{' '}
                        {isSansSynergyActive
                          ? '⚡ 시너지 콤보 발동! 3.1초마다 [뼈 감옥 십자 심판] & [심판의 회랑 대격돌] 추가 기술 자동 발동 + 12블래스터·24뼈다귀 초강화 필살기!'
                          : lobbyWeaponUlt.detail}
                      </div>
                    </>
                  )}

                  {lobbyTab === 'pets' && (
                    <>
                      <div className={bmStyles.gachaBox}>
                        <div className={bmStyles.gachaHead}>
                          <strong>🎲 펫 뽑기 (총 {PETS.length}종 · 5등급)</strong>
                          <span className={bmStyles.gachaRates}>
                            일반 45% · 희귀 30% · 영웅 16% · 전설 7% · 신화 2%
                          </span>
                        </div>
                        <div className={bmStyles.gachaBtns}>
                          <button
                            type="button"
                            className={bmStyles.gachaBtnSingle}
                            disabled={lobbyMeta.coins < GACHA_SINGLE_COST}
                            onClick={() => pullPetGacha(1)}
                          >
                            🎲 1회 뽑기 (🪙 {GACHA_SINGLE_COST})
                          </button>
                          <button
                            type="button"
                            className={bmStyles.gachaBtnTen}
                            disabled={lobbyMeta.coins < GACHA_TEN_COST}
                            onClick={() => pullPetGacha(10)}
                          >
                            ✨ 10연차 (🪙 {GACHA_TEN_COST} · 영웅+ 확정)
                          </button>
                        </div>

                        {gachaResults.length > 0 && (
                          <div className={bmStyles.gachaResults} aria-label="최근 뽑기 결과">
                            {gachaResults.map((res, idx) => (
                              <div
                                key={`${res.pet.id}-${idx}`}
                                className={bmStyles.gachaChip}
                                style={{ borderColor: res.pet.rarityColor }}
                              >
                                <span className={bmStyles.gachaChipIcon}>{res.pet.icon}</span>
                                <span
                                  className={bmStyles.rarityPill}
                                  style={{ background: res.pet.rarityColor }}
                                >
                                  {res.pet.rarityLabel}
                                </span>
                                <span className={bmStyles.gachaChipName}>{res.pet.name}</span>
                                <span className={bmStyles.gachaChipTag}>{res.status}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className={bmStyles.petFilterRow} aria-label="펫 등급 필터">
                        {[
                          { id: 'all', label: `전체 (${PETS.length})` },
                          {
                            id: 'owned',
                            label: `보유 (${PETS.filter((p) => lobbyMeta.ownedPets?.[p.id]).length})`,
                          },
                          ...PET_RARITY_ORDER.map((rKey) => ({
                            id: rKey,
                            label: `${PET_RARITIES[rKey].label} (${PETS.filter((p) => p.rarity === rKey).length})`,
                          })),
                        ].map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            className={
                              petFilter === f.id
                                ? `${bmStyles.petFilterBtn} ${bmStyles.petFilterBtnActive}`
                                : bmStyles.petFilterBtn
                            }
                            onClick={() => setPetFilter(f.id)}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>

                      <div className={bmStyles.petGrid}>
                        {PETS.filter((pet) => {
                          if (petFilter === 'owned') return Boolean(lobbyMeta.ownedPets?.[pet.id]);
                          if (petFilter !== 'all') return pet.rarity === petFilter;
                          return true;
                        })
                          .sort((a, b) => {
                            const ownedDiff =
                              Number(Boolean(lobbyMeta.ownedPets?.[b.id])) -
                              Number(Boolean(lobbyMeta.ownedPets?.[a.id]));
                            if (ownedDiff !== 0) return ownedDiff;
                            return PET_RARITY_ORDER.indexOf(a.rarity) - PET_RARITY_ORDER.indexOf(b.rarity);
                          })
                          .map((pet) => {
                            const owned = Boolean(lobbyMeta.ownedPets?.[pet.id]);
                            const equipped = lobbyMeta.equippedPet === pet.id;
                            const lv = clamp(Number(lobbyMeta.petLevels?.[pet.id]) || 1, 1, 5);
                            const upCost = getPetUpgradeCost(lv);
                            const canUpgrade = owned && lv < 5 && lobbyMeta.coins >= upCost;

                            return (
                              <div
                                key={pet.id}
                                className={[
                                  bmStyles.petCard,
                                  equipped ? bmStyles.petCardEquipped : '',
                                  !owned ? bmStyles.petCardLocked : '',
                                ]
                                  .filter(Boolean)
                                  .join(' ')}
                                style={!equipped ? { borderColor: `${pet.rarityColor}66` } : undefined}
                              >
                                <div className={bmStyles.petHead}>
                                  <div className={bmStyles.petTitle}>
                                    <span className={bmStyles.petIcon} style={{ background: pet.color }}>
                                      {pet.icon}
                                    </span>
                                    <div>
                                      <strong>{pet.name}</strong>
                                      <span style={{ color: pet.rarityColor }}>{pet.role}</span>
                                    </div>
                                  </div>
                                  <span
                                    className={bmStyles.petLvTag}
                                    style={{ color: owned ? '#fde68a' : pet.rarityColor }}
                                  >
                                    {owned ? `LV.${lv}/5` : pet.rarityLabel}
                                  </span>
                                </div>
                                <p className={bmStyles.petDesc}>
                                  {pet.description} (위력 x{pet.powerMult.toFixed(2)})
                                </p>
                                <div className={bmStyles.petActions}>
                                  {owned ? (
                                    <>
                                      <button
                                        type="button"
                                        className={
                                          equipped
                                            ? `${bmStyles.petBtnEquip} ${bmStyles.petBtnEquipped}`
                                            : bmStyles.petBtnEquip
                                        }
                                        onClick={() => buyOrEquipPet(pet)}
                                      >
                                        {equipped ? '동행 중 ✓ (해제)' : '동행하기'}
                                      </button>
                                      <button
                                        type="button"
                                        className={bmStyles.petBtnLevelUp}
                                        disabled={!canUpgrade}
                                        onClick={() => upgradePet(pet.id)}
                                      >
                                        {lv >= 5 ? 'MAX' : `강화 🪙${upCost}`}
                                      </button>
                                    </>
                                  ) : (
                                    <button type="button" className={bmStyles.petBtnPrimary} disabled>
                                      🔒 뽑기로 획득
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </>
                  )}

                  {lobbyTab === 'upgrades' && (
                    <>
                      <div className={bmStyles.lobbySectionTitle}>
                        <span>영구 업그레이드 (매 판 자동 적용 · 자동 저장)</span>
                        <span>보유 🪙 {lobbyMeta.coins.toLocaleString()}</span>
                      </div>
                      <div className={bmStyles.metaGrid}>
                        {META_UPGRADES.map((spec) => {
                          const lv = Number(lobbyMeta.upgrades?.[spec.id]) || 0;
                          const isMax = lv >= spec.maxLv;
                          const cost = getMetaUpgradeCost(spec, lv);
                          const canAfford = !isMax && lobbyMeta.coins >= cost;

                          return (
                            <div key={spec.id} className={bmStyles.metaCard}>
                              <div className={bmStyles.petHead}>
                                <div className={bmStyles.petTitle}>
                                  <span className={bmStyles.petIcon} style={{ background: 'rgba(15, 23, 42, 0.85)' }}>
                                    {spec.icon}
                                  </span>
                                  <div>
                                    <strong>{spec.name}</strong>
                                    <span>{spec.effectText(lv)}</span>
                                  </div>
                                </div>
                                <span className={bmStyles.petLvTag}>
                                  LV.{lv}/{spec.maxLv}
                                </span>
                              </div>
                              <button
                                type="button"
                                className={bmStyles.petBtnPrimary}
                                disabled={!canAfford}
                                onClick={() => buyMetaUpgrade(spec)}
                              >
                                {isMax
                                  ? '최대 레벨 달성 ✓'
                                  : canAfford
                                    ? `⬆️ 업그레이드 (🪙 ${cost})`
                                    : `코인 부족 (${lobbyMeta.coins}/${cost})`}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                <div className={bmStyles.lobbyFooter}>
                  <div className={bmStyles.lobbySummary}>
                    <strong>
                      {stages[selectedStage].name} · {HEROES[selectedHero].icon} {HEROES[selectedHero].name}
                    </strong>
                    <span>
                      무기: {weapons[selectedWeapon].name} · 펫:{' '}
                      {equippedPetObj
                        ? `${equippedPetObj.icon} ${equippedPetObj.name} (LV.${lobbyMeta.petLevels?.[equippedPetObj.id] ?? 1})`
                        : '없음'}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={bmStyles.launchBtn}
                    onClick={() => resetGame(selectedStage, selectedWeapon, selectedHero)}
                  >
                    🚀 작전 출격!
                  </button>
                </div>
              </div>
            </div>
          )}
          {hud.pausedForUpgrade && (
            <div className="upgradeOverlay">
              <strong>LEVEL {hud.level} UP!</strong>
              <p className={bmStyles.upgradeSub}>
                ✨ 기본 효과 UP (최대HP +6 · 회복 +12 · 화력 +4% · 이속 +2) · 능력을 선택하세요!
              </p>
              <div>
                {hud.upgrades.map((upgrade) => (
                  <button key={upgrade.id} type="button" onClick={() => chooseUpgrade(upgrade.id)}>
                    {upgrade.badge && (
                      <i
                        className={
                          upgrade.isAwakenPick
                            ? `${bmStyles.upgradeBadge} ${bmStyles.upgradeBadgeAwaken}`
                            : bmStyles.upgradeBadge
                        }
                        style={{ fontStyle: 'normal' }}
                      >
                        {upgrade.badge}
                      </i>
                    )}
                    <span>{upgrade.name}</span>
                    <em>{upgrade.text}</em>
                  </button>
                ))}
              </div>
            </div>
          )}
          {hud.over && (
            <div className="startOverlay">
              <strong>작전 종료</strong>
              <p>
                {minutes}:{seconds} 생존 · {hud.kills} 처치 · 점수 {hud.score} ·{' '}
                <span style={{ color: '#fde047' }}>+🪙 {hud.runCoins ?? 0} 코인 획득!</span>
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className={bmStyles.lobbySecondaryBtn}
                  onClick={() => returnToLobby('upgrades')}
                >
                  ⬆️ 영구 업그레이드
                </button>
                <button
                  type="button"
                  className={bmStyles.lobbySecondaryBtn}
                  onClick={() => returnToLobby('pets')}
                >
                  🐾 펫 관리
                </button>
                <button
                  type="button"
                  className={bmStyles.lobbySecondaryBtn}
                  onClick={() => returnToLobby('deploy')}
                >
                  🏕️ 로비로
                </button>
              </div>
              <button type="button" onClick={() => resetGame(selectedStage, selectedWeapon, selectedHero)}>
                🚀 {HEROES[selectedHero].name} · {weapons[selectedWeapon].name}(으)로 바로 재도전
              </button>
            </div>
          )}
          {blackMarketOpen && (
            <div
              className={bmStyles.overlay}
              data-ui="black-market"
              role="dialog"
              aria-modal="true"
              aria-label="탕탕 서바이벌 비밀 블랙마켓"
            >
              <div className={bmStyles.modal}>
                <div className={bmStyles.header}>
                  <div>
                    <h2 className={bmStyles.title}>🕶️ BLACK MARKET · 비밀 암시장</h2>
                    <p className={bmStyles.subtitle}>
                      로비 비밀 코드를 해제했습니다! 금단의 능력을 1~5 골드로 구매하고 켜거나 끌 수 있습니다. (적 5처치마다 +1골드 · 엘리트 +3골드)
                    </p>
                  </div>
                  <div className={bmStyles.headerRight}>
                    <span className={bmStyles.goldBadge}>🪙 {bmState.gold} 골드</span>
                    <button type="button" className={bmStyles.closeBtn} onClick={closeBlackMarket}>
                      닫기 ✕
                    </button>
                  </div>
                </div>

                <div className={bmStyles.grid}>
                  {BLACK_MARKET_ITEMS.map((item) => {
                    const isOwned = Boolean(bmState.owned[item.id]);
                    const isEquipped = Boolean(bmState.equipped[item.id]);
                    const canAfford = bmState.gold >= item.price;

                    return (
                      <div
                        key={item.id}
                        className={isOwned ? `${bmStyles.card} ${bmStyles.cardOwned}` : bmStyles.card}
                      >
                        <div className={bmStyles.cardTop}>
                          <div className={bmStyles.cardTitle}>
                            <span className={bmStyles.cardIcon}>{item.icon}</span>
                            <div>
                              <strong>{item.name}</strong>
                              <span>{item.tag}</span>
                            </div>
                          </div>
                          <span className={bmStyles.priceTag}>
                            {isOwned ? '해금됨' : `🪙 ${item.price} 골드`}
                          </span>
                        </div>

                        <p className={bmStyles.cardDesc}>{item.description}</p>

                        <div>
                          {isOwned ? (
                            item.isWeaponUnlock ? (
                              <button
                                type="button"
                                className={`${bmStyles.toggleBtn} ${bmStyles.toggleBtnActive}`}
                                onClick={() => {
                                  const wIdx = weapons.findIndex((w) => w.id === item.unlockWeaponId);
                                  if (wIdx >= 0) setWeapon(wIdx, true);
                                  closeBlackMarket();
                                }}
                              >
                                {item.icon} 해금 완료! (클릭해 바로 장착)
                              </button>
                            ) : item.isHeroUnlock ? (
                              <button
                                type="button"
                                className={`${bmStyles.toggleBtn} ${bmStyles.toggleBtnActive}`}
                                onClick={() => {
                                  const hIdx = HEROES.findIndex((h) => h.id === item.unlockHeroId);
                                  if (hIdx >= 0) selectHero(hIdx);
                                  closeBlackMarket();
                                }}
                              >
                                {item.icon} 해금 완료! (클릭해 바로 장착)
                              </button>
                            ) : (
                              <button
                                type="button"
                                className={
                                  isEquipped
                                    ? `${bmStyles.toggleBtn} ${bmStyles.toggleBtnActive}`
                                    : bmStyles.toggleBtn
                                }
                                onClick={() => toggleBlackMarketItem(item.id)}
                              >
                                {isEquipped ? '활성화 중 ⚡ (클릭해 끄기)' : '꺼짐 (클릭해 켜기)'}
                              </button>
                            )
                          ) : (
                            <button
                              type="button"
                              className={bmStyles.buyBtn}
                              disabled={!canAfford}
                              onClick={() => buyBlackMarketItem(item)}
                            >
                              {canAfford ? `🪙 ${item.price} 암시장 구매` : `골드 부족 (${bmState.gold}/${item.price})`}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        className="touchStick"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          stickPointerRef.current = event.pointerId;
          getAudioContext();
          updateFixedStick(event);
        }}
        onPointerMove={(event) => {
          if (stickPointerRef.current !== event.pointerId) return;
          updateFixedStick(event);
        }}
        onPointerUp={(event) => {
          if (stickPointerRef.current !== event.pointerId) return;
          stickPointerRef.current = null;
          inputRef.current.touch = { x: 0, y: 0 };
          setFixedStickOffset({ x: 0, y: 0 });
        }}
        onPointerCancel={(event) => {
          if (stickPointerRef.current !== event.pointerId) return;
          stickPointerRef.current = null;
          inputRef.current.touch = { x: 0, y: 0 };
          setFixedStickOffset({ x: 0, y: 0 });
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <span
          style={{
            transform: `translate(${fixedStickOffset.x}px, ${fixedStickOffset.y}px)`,
          }}
        />
      </div>

      <div className="mobileWeaponPad" aria-label="장착 중인 무기">
        <div>
          <strong>🔒 {currentWeapon.displayName ?? currentWeapon.name}</strong>
          <span>{currentWeaponAwakened ? 'AWAKEN' : `LV ${currentWeaponLevel}/5`} · {cooldownText}</span>
          <i className="mobileCooldown"><b style={{ width: `${cooldownRatio}%` }} /></i>
        </div>
      </div>

      <style jsx>{`
        .survivorPage {
          min-height: calc(100vh - var(--site-nav-height));
          padding: 18px;
          background:
            linear-gradient(rgba(15, 23, 42, 0.62), rgba(15, 23, 42, 0.62)),
            radial-gradient(circle at 20% 10%, rgba(34, 197, 94, 0.18), transparent 34%),
            #111827;
          color: #f8fafc;
        }

        .survivorTop {
          width: min(1300px, 100%);
          margin: 0 auto 14px;
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 14px;
        }

        .survivorTop span,
        .survivorPanel span,
        .barBlock span {
          display: block;
          color: #93c5fd;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0;
        }

        .survivorTop h1 {
          margin: 4px 0 0;
          font-size: 36px;
          line-height: 1;
        }

        .survivorTop button,
        .startOverlay > button {
          min-height: 44px;
          padding: 0 18px;
          border: 0;
          border-radius: 8px;
          background: #facc15;
          color: #111827;
          font-weight: 900;
          cursor: pointer;
        }

        .survivorLayout {
          width: min(1300px, 100%);
          margin: 0 auto;
          display: grid;
          grid-template-columns: 320px minmax(0, 1fr);
          gap: 14px;
        }

        .survivorPanel {
          display: grid;
          align-content: start;
          gap: 12px;
          padding: 14px;
          border: 1px solid rgba(226, 232, 240, 0.16);
          border-radius: 8px;
          background: rgba(15, 23, 42, 0.88);
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.32);
        }

        .statBox,
        .statGrid > div,
        .barBlock {
          padding: 12px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 8px;
          background: rgba(30, 41, 59, 0.82);
        }

        .statBox strong {
          display: block;
          margin-top: 5px;
          font-size: 27px;
          line-height: 1.05;
        }

        .statBox em {
          display: block;
          margin-top: 5px;
          color: #cbd5e1;
          font-size: 12px;
          font-style: normal;
          font-weight: 900;
        }

        .statGrid,
        .buildStats,
        .mapList {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .buildStats > div {
          padding: 10px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 8px;
          background: rgba(30, 41, 59, 0.72);
        }

        .statGrid strong,
        .buildStats strong {
          display: block;
          margin-top: 4px;
          font-size: 22px;
        }

        .mapList button {
          min-height: 52px;
          display: grid;
          grid-template-columns: 26px minmax(0, 1fr);
          align-items: center;
          gap: 8px;
          padding: 8px;
          border: 1px solid rgba(148, 163, 184, 0.22);
          border-radius: 8px;
          background: rgba(15, 23, 42, 0.78);
          color: #f8fafc;
          font-weight: 900;
          cursor: pointer;
        }

        .mapList button.active {
          border-color: #38bdf8;
          box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.16);
        }

        .mapList button:disabled {
          cursor: not-allowed;
          opacity: 0.72;
        }

        .mapList button span {
          width: 26px;
          height: 26px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 7px;
          background: #facc15;
          color: #111827;
        }

        .mapList button strong {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .barBlock div {
          display: flex;
          justify-content: space-between;
          gap: 10px;
        }

        .barBlock em {
          color: #e2e8f0;
          font-size: 12px;
          font-style: normal;
          font-weight: 900;
        }

        .hpTrack,
        .xpTrack,
        .cooldownTrack {
          height: 10px;
          display: block;
          overflow: hidden;
          margin-top: 10px;
          border-radius: 999px;
          background: #0f172a;
        }

        .hpTrack b,
        .xpTrack b,
        .cooldownTrack b {
          height: 100%;
          display: block;
          border-radius: inherit;
        }

        .hpTrack b {
          background: linear-gradient(90deg, #ef4444, #fb7185);
        }

        .xpTrack b {
          background: linear-gradient(90deg, #38bdf8, #22c55e);
        }

        .cooldownTrack b {
          background: linear-gradient(90deg, #facc15, #fb923c);
          transition: width 80ms linear;
        }

        .weaponList {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .weaponList button {
          min-height: 74px;
          display: grid;
          grid-template-columns: 34px minmax(0, 1fr);
          gap: 4px 8px;
          align-items: center;
          padding: 9px;
          border: 1px solid rgba(148, 163, 184, 0.22);
          border-radius: 8px;
          background: rgba(15, 23, 42, 0.78);
          color: #f8fafc;
          text-align: left;
          cursor: pointer;
        }

        .weaponList button.active {
          border-color: #facc15;
          box-shadow: 0 0 0 3px rgba(250, 204, 21, 0.18);
        }

        .weaponList button.awakened {
          border-color: #c084fc;
          background: linear-gradient(135deg, rgba(88, 28, 135, 0.72), rgba(15, 23, 42, 0.86));
          box-shadow: 0 0 0 2px rgba(192, 132, 252, 0.22), 0 0 24px rgba(168, 85, 247, 0.2);
        }

        .weaponList button.lockedWeapon,
        .weaponList button:disabled {
          opacity: 0.36;
          cursor: not-allowed;
        }

        .startWeaponPicker {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 6px;
          max-width: 440px;
        }

        .startWeaponPicker button {
          min-height: 32px;
          padding: 0 10px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid rgba(226, 232, 240, 0.25);
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.8);
          color: #e2e8f0;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .startWeaponPicker button i {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          display: inline-block;
        }

        .startWeaponPicker button.active {
          border-color: #facc15;
          background: #facc15;
          color: #111827;
        }

        .weaponList button span {
          width: 30px;
          height: 30px;
          grid-row: span 2;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          color: #111827;
          font-size: 14px;
          font-weight: 900;
        }

        .weaponList strong {
          min-width: 0;
          overflow: hidden;
          font-size: 14px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .weaponList em {
          min-width: 0;
          overflow: hidden;
          color: #cbd5e1;
          font-size: 11px;
          font-style: normal;
          font-weight: 800;
          line-height: 1.25;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .arenaWrap {
          height: calc(100vh - var(--site-nav-height) - 104px);
          min-height: 560px;
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(226, 232, 240, 0.18);
          border-radius: 8px;
          background: #101827;
          box-shadow: 0 18px 46px rgba(0, 0, 0, 0.36);
          cursor: crosshair;
          user-select: none;
          touch-action: none;
        }

        .arenaCanvas {
          width: 100%;
          height: 100%;
          display: block;
          pointer-events: none;
        }

        .startOverlay,
        .upgradeOverlay {
          position: absolute;
          inset: 0;
          z-index: 5;
          display: grid;
          justify-items: center;
          align-content: safe center;
          overflow-y: auto;
          gap: 10px;
          padding: 20px;
          background: rgba(15, 23, 42, 0.78);
          text-align: center;
          backdrop-filter: blur(7px);
        }

        .startOverlay strong,
        .upgradeOverlay > strong {
          font-size: 34px;
          line-height: 1.1;
        }

        .startOverlay p {
          max-width: 480px;
          margin: 0;
          color: #cbd5e1;
          font-weight: 800;
          line-height: 1.5;
        }

        .upgradeOverlay > div {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 190px));
          gap: 12px;
        }

        .upgradeOverlay button {
          min-height: 142px;
          padding: 16px;
          border: 2px solid rgba(250, 204, 21, 0.68);
          border-radius: 8px;
          background: #f8fafc;
          color: #111827;
          cursor: pointer;
        }

        .upgradeOverlay button span {
          display: block;
          font-size: 20px;
          font-weight: 900;
        }

        .upgradeOverlay button em {
          display: block;
          margin-top: 10px;
          color: #475569;
          font-style: normal;
          font-weight: 800;
          line-height: 1.4;
        }

        .floatingStick {
          width: 108px;
          height: 108px;
          position: absolute;
          z-index: 6;
          transform: translate(-50%, -50%);
          display: grid;
          place-items: center;
          border: 2px solid rgba(250, 204, 21, 0.55);
          border-radius: 50%;
          background: rgba(15, 23, 42, 0.42);
          pointer-events: none;
        }

        .floatingStick span {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(250, 204, 21, 0.92);
          box-shadow: 0 0 16px rgba(250, 204, 21, 0.45);
        }

        .mobileStagePicker {
          display: none;
        }

        .touchStick {
          display: none;
        }

        .mobileWeaponPad,
        .mobileGameHud {
          display: none;
        }

        @media (max-width: 1040px) {
          .survivorLayout {
            grid-template-columns: 1fr;
          }

          .survivorPanel {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .weaponList,
          .mapList {
            grid-column: 1 / -1;
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }

          .arenaWrap {
            height: 62vh;
            min-height: 420px;
          }
        }

        @media (max-width: 900px), (hover: none) and (pointer: coarse) {
          .survivorPage {
            height: calc(100svh - var(--site-nav-height));
            min-height: 0;
            overflow: hidden;
            padding: 8px;
          }

          .survivorTop {
            display: none;
          }

          .survivorPanel {
            display: none;
          }

          .survivorLayout {
            width: 100%;
            height: 100%;
            display: block;
            margin: 0;
          }

          .arenaWrap {
            width: 100%;
            height: calc(100svh - var(--site-nav-height) - 16px);
            min-height: 0;
            border-radius: 8px;
          }

          .mobileStagePicker {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 6px;
            max-width: 340px;
          }

          .mobileStagePicker button {
            min-height: 32px;
            padding: 0 10px;
            border: 1px solid rgba(226, 232, 240, 0.25);
            border-radius: 999px;
            background: rgba(15, 23, 42, 0.78);
            color: #e2e8f0;
            font-size: 12px;
            font-weight: 800;
          }

          .mobileStagePicker button.active {
            border-color: #facc15;
            background: #facc15;
            color: #111827;
          }

          .mobileGameHud {
            min-height: 38px;
            position: absolute;
            top: 8px;
            right: 8px;
            left: 8px;
            z-index: 4;
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto auto;
            align-items: center;
            gap: 8px;
            padding: 7px 9px;
            border: 1px solid rgba(226, 232, 240, 0.18);
            border-radius: 8px;
            background: rgba(15, 23, 42, 0.68);
            backdrop-filter: blur(8px);
          }

          .mobileGameHud span,
          .mobileGameHud strong,
          .mobileGameHud em {
            min-width: 0;
            overflow: hidden;
            color: #f8fafc;
            font-size: 12px;
            font-style: normal;
            font-weight: 900;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .mobileGameHud em {
            color: #fecdd3;
          }

          .startOverlay,
          .upgradeOverlay {
            padding: 18px 14px 144px;
          }

          .startOverlay strong,
          .upgradeOverlay > strong {
            font-size: 25px;
          }

          .startOverlay p {
            max-width: 300px;
            font-size: 13px;
          }

          .upgradeOverlay > div {
            width: min(300px, 100%);
            max-height: 52vh;
            overflow-y: auto;
            grid-template-columns: 1fr;
          }

          .upgradeOverlay button {
            min-height: 94px;
            padding: 12px;
          }

          .upgradeOverlay button span {
            font-size: 17px;
          }

          .touchStick {
            width: 112px;
            height: 112px;
            position: fixed;
            right: 16px;
            bottom: max(16px, env(safe-area-inset-bottom));
            z-index: 20;
            display: grid;
            place-items: center;
            border: 1px solid rgba(226, 232, 240, 0.24);
            border-radius: 50%;
            background: rgba(15, 23, 42, 0.62);
            touch-action: none;
            user-select: none;
          }

          .touchStick span {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #facc15;
            box-shadow: 0 0 0 8px rgba(250, 204, 21, 0.16);
            pointer-events: none;
          }

          .mobileWeaponPad {
            width: min(176px, calc(100vw - 150px));
            min-height: 68px;
            position: fixed;
            left: 14px;
            bottom: max(16px, env(safe-area-inset-bottom));
            z-index: 20;
            display: grid;
            grid-template-columns: 1fr;
            align-items: center;
            padding: 8px 12px;
            border: 1px solid rgba(226, 232, 240, 0.24);
            border-radius: 10px;
            background: rgba(15, 23, 42, 0.78);
            backdrop-filter: blur(10px);
          }

          .mobileWeaponPad button {
            width: 36px;
            height: 54px;
            border: 0;
            border-radius: 8px;
            background: #facc15;
            color: #111827;
            font-size: 26px;
            font-weight: 900;
            line-height: 1;
          }

          .mobileWeaponPad div {
            min-width: 0;
            display: grid;
            gap: 5px;
            text-align: center;
          }

          .mobileWeaponPad strong,
          .mobileWeaponPad span {
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .mobileWeaponPad strong {
            color: #f8fafc;
            font-size: 12px;
            font-weight: 900;
          }

          .mobileWeaponPad span {
            color: #93c5fd;
            font-size: 11px;
            font-weight: 900;
          }

          .mobileCooldown {
            height: 7px;
            display: block;
            overflow: hidden;
            border-radius: 999px;
            background: rgba(15, 23, 42, 0.86);
          }

          .mobileCooldown b {
            height: 100%;
            display: block;
            border-radius: inherit;
            background: linear-gradient(90deg, #facc15, #fb923c);
            transition: width 80ms linear;
          }
        }
      `}</style>
    </section>
  );
}
