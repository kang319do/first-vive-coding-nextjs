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
  unlockStats: { totalKills: 0, bossClears: 0, eliteKills: 0, sansDeaths: 0, asrielClears: 0 },
};

function isHeroUnlocked(hero, bmOwned = {}, unlockStats = {}) {
  if (!hero) return false;
  if (hero.id === 'sans') {
    return Boolean(bmOwned?.unlockSans) || (unlockStats?.totalKills ?? 0) >= 300;
  }
  if (hero.id === 'forsaken') {
    return Boolean(bmOwned?.unlockForsaken) || (unlockStats?.bossClears ?? 0) >= 3;
  }
  if (hero.id === 'asriel') {
    return Boolean(bmOwned?.unlockAsriel) || (unlockStats?.sansDeaths ?? 0) >= 3;
  }
  if (hero.id === 'chara') {
    return Boolean(bmOwned?.unlockChara) || (unlockStats?.asrielClears ?? 0) >= 5;
  }
  if (hero.id === 'omegaFlowey') {
    return Boolean(bmOwned?.unlockFlowey) || (unlockStats?.eliteKills ?? 0) >= 15;
  }
  if (hero.blackMarketUnlockId) {
    return Boolean(bmOwned?.[hero.blackMarketUnlockId]);
  }
  return true;
}

function getHeroQuestLabel(hero, unlockStats = {}) {
  if (!hero) return '';
  if (hero.id === 'sans') return `🔒 누적 처치 ${Math.min(300, unlockStats?.totalKills ?? 0)}/300`;
  if (hero.id === 'forsaken') return `🔒 보스 격파 ${Math.min(3, unlockStats?.bossClears ?? 0)}/3`;
  if (hero.id === 'asriel') return `🔒 샌즈 사망 ${Math.min(3, unlockStats?.sansDeaths ?? 0)}/3`;
  if (hero.id === 'chara') return `🔒 드리무어 클리어 ${Math.min(5, unlockStats?.asrielClears ?? 0)}/5`;
  if (hero.id === 'omegaFlowey') return `🔒 엘리트 처치 ${Math.min(15, unlockStats?.eliteKills ?? 0)}/15`;
  return hero.role;
}

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
    name: '샌즈 (특별 캐릭터)',
    icon: '💀',
    price: 3000,
    tag: '특별 캐릭터 즉시 해금',
    description: '누적 몬스터 300마리 처치 퀘스트를 건너뛰고 [샌즈] & 전용 무기 [가스터 블래스터]를 즉시 해금합니다!',
    isHeroUnlock: true,
    unlockHeroId: 'sans',
  },
  {
    id: 'unlockForsaken',
    name: '포세이큰 (특별 캐릭터)',
    icon: '👁️',
    price: 3000,
    tag: '특별 캐릭터 즉시 해금',
    description: '챕터 보스 3회 격파 퀘스트를 건너뛰고 [포세이큰] & 전용 무기 [부패의 검]을 즉시 해금합니다!',
    isHeroUnlock: true,
    unlockHeroId: 'forsaken',
  },
  {
    id: 'unlockAsriel',
    name: '아스리엘 드리무어 (특별 캐릭터)',
    icon: '🌈',
    price: 3000,
    tag: '특별 캐릭터 즉시 해금',
    description: '샌즈로 3번 사망 퀘스트를 건너뛰고 [아스리엘 드리무어] & 전용 무기 [카오스 세이버]를 즉시 해금합니다!',
    isHeroUnlock: true,
    unlockHeroId: 'asriel',
  },
  {
    id: 'unlockChara',
    name: '차라 (특별 캐릭터)',
    icon: '🔪',
    price: 3000,
    tag: '특별 캐릭터 즉시 해금',
    description: '아스리엘 드리무어로 5챕터 클리어 퀘스트를 건너뛰고 [차라] & 전용 무기 [진정한 칼]을 즉시 해금합니다!',
    isHeroUnlock: true,
    unlockHeroId: 'chara',
  },
  {
    id: 'unlockFlowey',
    name: '오메가 플라위 (특별 캐릭터)',
    icon: '🌻',
    price: 3000,
    tag: '특별 캐릭터 즉시 해금',
    description: '엘리트 몬스터 15마리 처치 퀘스트를 건너뛰고 [오메가 플라위] & 전용 무기 [악몽의 덩굴포]를 즉시 해금합니다!',
    isHeroUnlock: true,
    unlockHeroId: 'omegaFlowey',
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
    role: 'HP 1 · 회피·업보(KR)',
    ultIcon: '💀',
    ultName: '배드 타임',
    ultSub: 'MEGALOVANIA',
    ultQuote: '* 참 아름다운 날이야. 새들은 지저귀고, 꽃들은 피어나고...\n* 이런 날엔 너 같은 녀석은... 지옥에서 불타야 해.',
    ultColor: '#38bdf8',
    ultBg: '#020617',
    perk: '[40% 너프] HP 1 · 99.5% 회피(MISS) · 공격력 35% · 공속 1.5초 · 2번 각성 · 가스터 블래스터 & 업보(KR)!',
    body: '#f8fafc',
    stroke: '#38bdf8',
    accent: '#2563eb',
    stats: { maxHp: 1, speed: 232, damage: 0.35, fireRate: 1, armor: 0, critChance: 0.05, sansHero: true },
    signatureWeaponId: 'gaster',
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
    perk: '[40% 너프] HP 85 · 공격력 44% · 공속 1.5초 · 1번 각성 · 부패의 검 전용 · 28처치마다 흡혈!',
    body: '#09090b',
    stroke: '#ef4444',
    accent: '#ef4444',
    stats: {
      maxHp: 85,
      speed: 226,
      damage: 0.44,
      fireRate: 1,
      armor: 0,
      critChance: 0.05,
      critDamage: 1.65,
      area: 0.96,
      lifestealKills: 28,
      forsakenHero: true,
    },
    signatureWeaponId: 'voidBlade',
  },
  {
    id: 'asriel',
    name: '아스리엘 드리무어',
    icon: '🌈',
    role: '하이퍼데스·부활',
    ultIcon: '🌈',
    ultName: '하이퍼 데스',
    ultSub: 'GOD OF HYPERDEATH',
    ultQuote: '* 드디어... 진짜 모습으로 싸울 때가 왔군.\n* 이제 이 타임라인을 영원히 끝장내주마!',
    ultColor: '#ec4899',
    ultBg: '#2e1065',
    perk: '[40% 너프] HP 105 · 공격력 44% · 공속 1.5초 · 2번 각성 · 카오스 세이버 전용 · ⚠️ 챕터 종료마다 10% 확률로 즉시 소멸(사망)!',
    body: '#f8fafc',
    stroke: '#a855f7',
    accent: '#ec4899',
    stats: {
      maxHp: 105,
      speed: 230,
      damage: 0.44,
      fireRate: 1,
      armor: 0,
      regen: 0.2,
      critChance: 0.06,
      critDamage: 1.65,
      area: 0.96,
      asrielHero: true,
    },
    signatureWeaponId: 'chaosSaber',
  },
  {
    id: 'chara',
    name: '차라',
    icon: '🔪',
    role: 'LV.20 · HP 99',
    ultIcon: '🔪',
    ultName: '세계 삭제 · ERASE',
    ultSub: 'DETERMINATION LV.20',
    ultQuote: '* 반가워. 나는 차라야.\n* 자, 함께 이 무의미한 세계를 지우고 다음으로 나아가자.',
    ultColor: '#ef4444',
    ultBg: '#2b040a',
    perk: '[40% 너프] LV.20 · HP 99 고정 · 방어 +1 · 공격력 48% · 공속 1.5초 · 치명타 9% · 2번 각성 · 진정한 칼 전용!',
    body: '#fef3c7',
    stroke: '#ef4444',
    accent: '#22c55e',
    stats: {
      maxHp: 99,
      speed: 238,
      damage: 0.48,
      fireRate: 1,
      armor: 1,
      critChance: 0.09,
      critDamage: 1.75,
      xpGain: 1.0,
      lifestealKills: 26,
      charaHero: true,
    },
    signatureWeaponId: 'realKnife',
  },
  {
    id: 'omegaFlowey',
    name: '오메가 플라위',
    icon: '🌻',
    role: 'HP 9,950 · SAVE',
    ultIcon: '🌻',
    ultName: '유어 베스트 나이트메어',
    ultSub: 'YOUR BEST NIGHTMARE',
    ultQuote: '* 이 바보야! 이 세상은 죽이거나, 죽임을 당하는 거야!\n* 하하하하하!! 넌 절대 날 이길 수 없어!',
    ultColor: '#facc15',
    ultBg: '#14532d',
    perk: '[40% 너프] HP 9,950(거대 피격 ×48) · 공격력 43% · 공속 1.5초 · 2번 각성 · 악몽의 덩굴포 전용!',
    body: '#166534',
    stroke: '#facc15',
    accent: '#ef4444',
    stats: {
      maxHp: 9950,
      speed: 215,
      damage: 0.43,
      fireRate: 1,
      armor: 1,
      regen: 1,
      critChance: 0.05,
      critDamage: 1.65,
      area: 0.96,
      floweyHero: true,
    },
    signatureWeaponId: 'floweyArsenal',
  },
  {
    id: 'undying',
    name: '불사의 언다인',
    icon: '🛡️',
    role: 'HP 23,000 · 영웅',
    ultIcon: '🛡️',
    ultName: '진정한 영웅 · 정의의 창',
    ultSub: 'BATTLE AGAINST A TRUE HERO',
    ultQuote: '* 안 돼... 난 여기서 쓰러질 수 없어!\n* 넌 지금... 진정한 영웅과 맞서고 있는 거야!',
    ultColor: '#38bdf8',
    ultBg: '#0c2748',
    perk: '[40% 너프] 자유 기동(이속 234) · HP 23,000(피격 ×130) · 공격력 46% · 공속 1.5초 · 정의의 창(피해 4,920) · 2번 각성!',
    body: '#0284c7',
    stroke: '#38bdf8',
    accent: '#dc2626',
    stats: {
      maxHp: 23000,
      speed: 234,
      damage: 0.46,
      fireRate: 1,
      armor: 1,
      critChance: 0.06,
      critDamage: 1.7,
      magnet: 700,
      area: 0.96,
      undyingHero: true,
    },
    signatureWeaponId: 'justiceSpear',
  },
  {
    id: 'mettatonNeo',
    name: '메타톤 NEO',
    icon: '🌟',
    role: 'HP 30,000 · 유리대포',
    ultIcon: '🌟',
    ultName: '파워 오브 NEO · 쇼타임',
    ultSub: 'POWER OF "NEO" · GLAMOUR OVERDRIVE',
    ultQuote: '* 나의 진정한 모습을 보고 싶었던 거지?\n* 자, 이제 쇼타임이다! 파워 오브 NEO를 보여주지! OH YES!!',
    ultColor: '#ec4899',
    ultBg: '#3b0764',
    perk: '[40% 너프] HP 30,000 · 유리대포(피격 ×250) · 공격력 46% · 공속 1.5초 · 1번 각성 · NEO 암 캐논 전용!',
    body: '#ec4899',
    stroke: '#f472b6',
    accent: '#facc15',
    stats: {
      maxHp: 30000,
      speed: 232,
      damage: 0.46,
      fireRate: 1,
      armor: 0,
      critChance: 0.07,
      critDamage: 1.7,
      area: 0.96,
      neoHero: true,
    },
    signatureWeaponId: 'neoCannon',
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
    displayDetail: '쌍둥이 해골 레이저 & KR 업보! 각성 시 샌즈 서클·뼈다귀·푸른 영혼 폭격!',
    name: '가스터 블래스터',
    detail: '쌍둥이 해골 레이저 & KR 업보! 각성 시 샌즈 서클·뼈다귀·푸른 영혼 폭격!',
    color: '#38bdf8',
    cooldown: 1.5,
    damage: 50,
    radius: 34,
    life: 0.64,
    chargeTime: 0.24,
    beamLength: 780,
    blackMarketUnlockId: 'unlockGaster',
  },
  {
    id: 'trident',
    displayName: '삼지창',
    displayDetail: '초고속 3연 관통 투척·회수 + 낙뢰 해일 폭파! 각성 시 7연 황금 포세이돈 폭풍!',
    name: '삼지창',
    detail: '초고속 3연 관통 투척·회수 + 낙뢰 해일 폭파! 각성 시 7연 황금 포세이돈 폭풍!',
    color: '#2dd4bf',
    cooldown: 1.5,
    damage: 58,
    speed: 850,
    radius: 22,
    life: 1.2,
    pierce: 999,
    slow: 0.7,
    blackMarketUnlockId: 'unlockTrident',
  },
  {
    id: 'chaosSaber',
    displayName: '카오스 세이버',
    displayDetail: '무지개 쌍검 참격 & 유도 별똥별! 각성 시 카오스 버스터·스타 블레이징·쇼커 브레이커 발동!',
    name: '카오스 세이버',
    detail: '무지개 쌍검 참격 & 유도 별똥별! 각성 시 카오스 버스터·스타 블레이징·쇼커 브레이커 발동!',
    color: '#e879f9',
    cooldown: 1.5,
    damage: 30,
    radius: 102,
    life: 0.21,
    arc: Math.PI * 0.74,
    knockback: 45,
    exclusiveHeroId: 'asriel',
  },
  {
    id: 'realKnife',
    displayName: '진정한 칼',
    displayDetail: '진홍 참격 & 결의의 칼날 발사! 각성 시 360° 999999 처형 일격!',
    name: '진정한 칼',
    detail: '진홍 참격 & 결의의 칼날 발사! 각성 시 360° 999999 처형 일격!',
    color: '#ef4444',
    cooldown: 1.5,
    damage: 34,
    radius: 105,
    life: 0.2,
    arc: Math.PI * 0.65,
    knockback: 42,
    exclusiveHeroId: 'chara',
  },
  {
    id: 'voidBlade',
    displayName: '부패의 검',
    displayDetail: '포세이큰 전용 어둠의 대검! 부패 검기 3연발 + 공허 충격파!',
    name: '부패의 검',
    detail: '포세이큰 전용 어둠의 대검! 부패 검기 3연발 + 공허 충격파!',
    color: '#22c55e',
    cooldown: 1.5,
    damage: 36,
    radius: 108,
    life: 0.21,
    arc: Math.PI * 0.74,
    knockback: 50,
    exclusiveHeroId: 'forsaken',
  },
  {
    id: 'floweyArsenal',
    displayName: '악몽의 덩굴포',
    displayDetail: '친절한 알갱이 5연발 + 유도 핵폭탄! 각성 시 포위 알갱이·핵폭격·TV 메가 레이저!',
    name: '악몽의 덩굴포',
    detail: '친절한 알갱이 5연발 + 유도 핵폭탄! 각성 시 포위 알갱이·핵폭격·TV 메가 레이저!',
    color: '#facc15',
    cooldown: 1.5,
    damage: 30,
    speed: 680,
    radius: 10,
    life: 1.0,
    pierce: 2,
    exclusiveHeroId: 'omegaFlowey',
  },
  {
    id: 'justiceSpear',
    displayName: '정의의 창',
    displayDetail: '불사의 언다인 전용! 기본 피해 4,920 · 5연장 정의의 창 + 넉백 결계! 각성 시 7연 창 & 8연 포위 창!',
    name: '정의의 창',
    detail: '불사의 언다인 전용! 기본 피해 4,920 · 5연장 정의의 창 + 넉백 결계! 각성 시 7연 창 & 8연 포위 창!',
    color: '#38bdf8',
    cooldown: 1.5,
    damage: 4920,
    speed: 880,
    radius: 13,
    life: 1.1,
    pierce: 4,
    exclusiveHeroId: 'undying',
  },
  {
    id: 'neoCannon',
    displayName: 'NEO 암 캐논',
    displayDetail: '메타톤 NEO 전용! 3연발 핫핑크 플라즈마 캐논! 각성 시 5연 스타버스트 & 유도 폭탄!',
    name: 'NEO 암 캐논',
    detail: '메타톤 NEO 전용! 3연발 핫핑크 플라즈마 캐논! 각성 시 5연 스타버스트 & 유도 폭탄!',
    color: '#ec4899',
    cooldown: 1.5,
    damage: 34,
    speed: 800,
    radius: 12,
    life: 1.05,
    pierce: 2,
    exclusiveHeroId: 'mettatonNeo',
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
  chaosSaber: {
    icon: '🌈',
    name: '하이퍼 데스 · 별빛 심판',
    sub: 'GOD OF HYPERDEATH · STAR BLAZING',
    quote: '* 이제... 나의 진짜 힘을 보여줄 시간이야!',
    detail: '460px 하이퍼 고너 무지개 소용돌이 + 18연 폭발 별똥별 + 12연 무지개 낙뢰 + 체력 40% 회복',
    accent: '#e879f9',
    bg: '#2e1065',
  },
  realKnife: {
    icon: '🔪',
    name: '진홍의 일격 · 999999',
    sub: 'THE REAL KNIFE · DETERMINATION LV.20',
    quote: '* 함께 이 무의미한 세계를 지워버리자.',
    detail: '540px 화면 전체 9999999 처형 참격 + 20연 유도 결의의 칼날 + 체력 40% 흡혈',
    accent: '#ef4444',
    bg: '#2b040a',
  },
  voidBlade: {
    icon: '👁️',
    name: '포세이큰 · 공허 침식',
    sub: 'FORSAKEN · CORRUPTED VOID SLASH',
    quote: '모든 빛은 결국 어둠과 부패에 잠식된다...',
    detail: '480px 공허 침식 대폭발 + 16방향 부패 검기 폭풍 + 체력 45% 흡혈',
    accent: '#22c55e',
    bg: '#09090b',
  },
  floweyArsenal: {
    icon: '🌻',
    name: '유어 베스트 나이트메어',
    sub: 'YOUR BEST NIGHTMARE · SAVE & LOAD',
    quote: '* 이 세상은 죽이거나, 죽임을 당하는 거야! 하하하하!',
    detail: 'SAVE & LOAD 체력 100% 완전 회복 + 6영혼 메가 레이저 + 10연 유도 핵폭탄 + 18연 알갱이 폭풍',
    accent: '#facc15',
    bg: '#14532d',
  },
  justiceSpear: {
    icon: '🛡️',
    name: '진정한 영웅 · 정의의 창',
    sub: 'BATTLE AGAINST A TRUE HERO',
    quote: '* 넌 지금... 진정한 영웅과 맞서고 있는 거야!',
    detail: '28연 360° 초대형 정의의 창 + 14연 포위 창 + 520px 초록 영혼 결계 폭발 + HP 240,000 결의 회복',
    accent: '#38bdf8',
    bg: '#0c2748',
  },
  neoCannon: {
    icon: '🌟',
    name: '파워 오브 NEO · 쇼타임',
    sub: 'POWER OF "NEO" · GLAMOUR OVERDRIVE',
    quote: '* 나의 진정한 모습... 파워 오브 NEO를 보여주지! OH YES!!',
    detail: '18연 360° 핫핑크·골드 NEO 플라즈마 포격 + 6연 유도 디스코 스타 폭탄 + 480px 스포트라이트 대폭발 + HP 35% 회복',
    accent: '#ec4899',
    bg: '#3b0764',
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

// 사망 시 각성 시스템: 기본 캐릭터 1번 각성 / 특별 캐릭터 7명 2번 각성 (1차 각성 -> 2차 초각성!)
const HERO_DEATH_AWAKENINGS = {
  sans: [
    {
      title: '💀 LAST BREATH · 1차 각성 (PHASE 2)',
      quote: '* 헉... 아직 한 번은 더 버틸 수 있어.',
      color: '#38bdf8',
      dmgMult: 1.1,
      fireMult: 1.05,
      speedAdd: 8,
    },
    {
      title: '💀 ENIGMATIC ENCOUNTER · 2차 초각성 (PHASE 3)',
      quote: '* 기억해 둬, 꼬맹이. 여기서 쓰러지는 건 게으른 짓이야.',
      color: '#facc15',
      dmgMult: 1.16,
      fireMult: 1.08,
      speedAdd: 10,
    },
  ],
  forsaken: [
    {
      title: '👁️ 완전 공허 침식 · 각성',
      quote: '어둠은 쓰러지지 않는다... 모든 빛을 삼키는 공허가 깨어났다!',
      color: '#ef4444',
      dmgMult: 1.12,
      fireMult: 1.06,
      speedAdd: 8,
    },
  ],
  asriel: [
    {
      title: '🌈 GOD OF HYPERDEATH · 1차 각성',
      quote: '* ♥ But it refused. — 아직 끝나지 않았어!',
      color: '#e879f9',
      dmgMult: 1.1,
      fireMult: 1.05,
      speedAdd: 8,
    },
    {
      title: '🌈 ANGEL OF DEATH · 2차 초각성 (FINAL FORM)',
      quote: '* 이제 나의 진정한 최종 형태를 보여주지!!',
      color: '#facc15',
      dmgMult: 1.16,
      fireMult: 1.08,
      speedAdd: 10,
    },
  ],
  chara: [
    {
      title: '🔪 DETERMINATION LV.20 · 1차 각성',
      quote: '* 아직 끝나지 않았어... 결의가 나를 일으켜 세운다.',
      color: '#ef4444',
      dmgMult: 1.12,
      fireMult: 1.06,
      speedAdd: 8,
    },
    {
      title: '🔪 ABSOLUTE ERASE · 2차 초각성 (9999999)',
      quote: '* 9999999... 이 세계째로 완전히 지워버리겠어!!',
      color: '#dc2626',
      dmgMult: 1.18,
      fireMult: 1.08,
      speedAdd: 10,
    },
  ],
  omegaFlowey: [
    {
      title: '🌻 FILE 2 LOADED · 1차 각성',
      quote: '* 하하하! 내가 세이브 파일을 불러왔지!!',
      color: '#facc15',
      dmgMult: 1.1,
      fireMult: 1.05,
      speedAdd: 8,
    },
    {
      title: '🌻 YOUR BEST NIGHTMARE · 2차 초각성',
      quote: '* 이 타임라인은 내 거야! 절대 끝내지 못해!!',
      color: '#ef4444',
      dmgMult: 1.16,
      fireMult: 1.08,
      speedAdd: 10,
    },
  ],
  undying: [
    {
      title: '🛡️ 결의의 영웅 · 1차 각성',
      quote: '* 안 돼... 난 여기서 쓰러질 수 없어!!',
      color: '#38bdf8',
      dmgMult: 1.1,
      fireMult: 1.05,
      speedAdd: 8,
    },
    {
      title: '🛡️ 진정한 불사의 영웅 · 2차 초각성',
      quote: '* 내 몸이 먼지가 되어도... 정의의 창은 멈추지 않는다!!',
      color: '#22c55e',
      dmgMult: 1.16,
      fireMult: 1.08,
      speedAdd: 10,
    },
  ],
  mettatonNeo: [
    {
      title: '🌟 HYPER NEO ENCORE · 각성',
      quote: '* 앙코르 요청인가? 쇼는 아직 안 끝났어! OH YES!!',
      color: '#ec4899',
      dmgMult: 1.12,
      fireMult: 1.06,
      speedAdd: 8,
    },
  ],
};

function getHeroAwakeningList(heroId) {
  return HERO_DEATH_AWAKENINGS[heroId] || [];
}

function tryHeroDeathAwakening(game) {
  const player = game.player;
  const hero = HEROES[game.heroIndex ?? 0] ?? HEROES[0];
  const stagesList = getHeroAwakeningList(hero.id);
  const currentStage = player.awakeningStage ?? 0;
  if (currentStage >= stagesList.length) return false;

  const nextStage = currentStage + 1;
  const spec = stagesList[currentStage];
  player.awakeningStage = nextStage;
  player.maxAwakenings = stagesList.length;
  player.hp = player.sansHero ? 1 : player.maxHp;
  player.invincible = nextStage >= 2 ? 2.8 : 2.3;
  player.damage *= spec.dmgMult ?? 1.32;
  player.fireRate *= spec.fireMult ?? 1.18;
  player.speed += spec.speedAdd ?? 20;
  player.critChance = Math.min(0.9, (player.critChance ?? 0.1) + (nextStage >= 2 ? 0.12 : 0.06));
  player.ultCharge = nextStage >= 2 ? 100 : Math.min(100, (player.ultCharge ?? 0) + 55);

  // Clear threatening enemy bullets around the player & unleash awakening shockwave!
  game.enemyBullets = (game.enemyBullets ?? []).filter((eb) => distance(player, eb) > 520);
  game.bullets.push({
    x: player.x,
    y: player.y,
    vx: 0,
    vy: 0,
    radius: 70,
    damage: getPlayerDamage(player, nextStage >= 2 ? 320 : 180),
    life: 0.46,
    maxLife: 0.46,
    pierce: 999,
    color: spec.color,
    spin: 0,
    type: 'shockwave',
    blast: (nextStage >= 2 ? 520 : 420) * player.area,
    hitIds: new Set(),
  });

  // On 2nd Super-Awakening, also immediately awaken the equipped weapon!
  if (nextStage >= 2) {
    const w = weapons[player.weaponIndex];
    if (w) {
      game.weaponLevels[w.id] = Math.max(game.weaponLevels[w.id] ?? 0, 5);
      game.awakenedWeapons[w.id] = true;
      if (w.id === 'gaster') applySansAwakening(game);
    }
  }

  game.deathAwakenFlash = 2.6;
  game.deathAwakenStage = nextStage;
  game.deathAwakenTitle = spec.title;
  game.deathAwakenQuote = spec.quote;
  game.deathAwakenColor = spec.color;
  game.shake = nextStage >= 2 ? 24 : 18;
  addParticles(game, player.x, player.y, spec.color, nextStage >= 2 ? 56 : 38);
  addFloatingText(
    game,
    player.x,
    player.y - 42,
    nextStage >= 2 ? '⚡ 2차 초각성!!' : '🔥 1차 각성!!',
    spec.color,
    24,
  );
  queueSound(game, 'bossClear');
  return true;
}

function createGame(startStage = 0, bmEquipped = {}, heroIndex = 0, lobbyMeta = DEFAULT_LOBBY_META) {
  const bm = bmEquipped && typeof bmEquipped === 'object' ? { ...bmEquipped } : {};
  const meta = lobbyMeta && typeof lobbyMeta === 'object' ? lobbyMeta : DEFAULT_LOBBY_META;
  const up = meta.upgrades ?? {};
  const hero = HEROES[clamp(heroIndex, 0, HEROES.length - 1)] ?? HEROES[0];
  const hs = hero.stats ?? {};
  const isCanonFixedHp = Boolean(
    hs.sansHero || hs.asrielHero || hs.charaHero || hs.floweyHero || hs.undyingHero || hs.neoHero,
  );
  const baseMaxHp = isCanonFixedHp
    ? hs.maxHp
    : (hs.maxHp ?? 100) + (up.hp ?? 0) * 15;
  const maxHp = isCanonFixedHp ? hs.maxHp : bm.immortal ? 999 : baseMaxHp;
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
    deathAwakenFlash: 0,
    deathAwakenStage: 0,
    deathAwakenTitle: '',
    deathAwakenQuote: '',
    deathAwakenColor: '#facc15',
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
      asrielHero: Boolean(hs.asrielHero),
      asrielStarTimer: 3.2,
      asrielSynergyTimer: 3.8,
      asrielRefuseCd: 0,
      charaHero: Boolean(hs.charaHero),
      charaSlashTimer: 3.2,
      charaSynergyTimer: 3.8,
      floweyHero: Boolean(hs.floweyHero),
      floweyPelletTimer: 3.4,
      floweySaveCd: 0,
      undyingHero: Boolean(hs.undyingHero),
      undyingSpearTimer: 3.2,
      neoHero: Boolean(hs.neoHero),
      neoShowTimer: 3.4,
      canonFixedHp: isCanonFixedHp,
      awakeningStage: 0,
      maxAwakenings: getHeroAwakeningList(hero.id).length,
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
    bossId: spec.id,
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
      } else if (player.canonFixedHp) {
        player.hp = Math.min(player.maxHp, player.hp + Math.round(player.maxHp * 0.18));
        player.armor += 2;
        player.regen += 1.2;
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
  } else if (wId === 'chaosSaber') {
    // 🌈 GOD OF HYPERDEATH · HYPER GONER + STAR BLAZING + SHOCKER BREAKER!
    const isAsrielSynergy = Boolean(player.asrielHero);
    const rainbowPalette = ['#f43f5e', '#fb923c', '#facc15', '#4ade80', '#38bdf8', '#a855f7', '#ec4899'];
    if (!player.sansHero) {
      player.hp = Math.min(player.maxHp, player.hp + Math.round(player.maxHp * (isAsrielSynergy ? 0.55 : 0.4)));
    }
    // 1. Hyper Goner pull vortex + rainbow shockwave
    const vortexR = (isAsrielSynergy ? 520 : 460) * player.area;
    game.enemies.forEach((enemy) => {
      const d = distance(player, enemy);
      if (d < vortexR + enemy.radius) {
        const pullA = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        const pullDist = Math.min(d * 0.48, enemy.boss ? 30 : 120);
        enemy.x = clamp(enemy.x + Math.cos(pullA) * pullDist, 30, world.width - 30);
        enemy.y = clamp(enemy.y + Math.sin(pullA) * pullDist, 30, world.height - 30);
        applyDamageToEnemy(enemy, getPlayerDamage(player, isAsrielSynergy ? 360 : 280));
        enemy.slow = Math.max(enemy.slow ?? 0, 2.2);
      }
    });
    for (let r = 0; r < 2; r += 1) {
      game.bullets.push({
        x: player.x,
        y: player.y,
        vx: 0,
        vy: 0,
        radius: 75,
        damage: getPlayerDamage(player, 260),
        life: 0.44 + r * 0.14,
        maxLife: 0.44 + r * 0.14,
        pierce: 999,
        color: r === 0 ? '#e879f9' : '#38bdf8',
        spin: 0,
        type: 'shockwave',
        blast: vortexR - r * 70,
        hitIds: new Set(),
      });
    }
    // 2. Twin 360° Rainbow Chaos Saber Slash
    game.bullets.push({
      x: player.x,
      y: player.y,
      vx: 0,
      vy: 0,
      radius: 300 * player.area,
      damage: getPlayerDamage(player, isAsrielSynergy ? 420 : 340),
      life: 0.38,
      maxLife: 0.38,
      pierce: 999,
      color: '#ec4899',
      spin: 0,
      angle: aim,
      arc: Math.PI * 2,
      knockback: 140,
      type: 'katana',
      awakened: true,
      rainbow: true,
      hitIds: new Set(),
    });
    // 3. Star Blazing — 18 (or 24 with Synergy) Homing Exploding Rainbow Stars!
    const starN = isAsrielSynergy ? 24 : 18;
    for (let s = 0; s < starN; s += 1) {
      const a = aim + (Math.PI * 2 * s) / starN;
      game.bullets.push({
        x: player.x + Math.cos(a) * 26,
        y: player.y + Math.sin(a) * 26,
        vx: Math.cos(a) * 760,
        vy: Math.sin(a) * 760,
        radius: 17 * player.area,
        damage: getPlayerDamage(player, isAsrielSynergy ? 240 : 190),
        life: 1.45,
        pierce: 8,
        slow: 1.0,
        color: rainbowPalette[s % rainbowPalette.length],
        spin: s * 0.4,
        homing: true,
        blast: 95 * player.area,
        type: 'asrielStar',
        awakened: true,
        hitIds: new Set(),
      });
    }
    // 4. Shocker Breaker — 12 (or 16 with Synergy) Rainbow Sky Lightning Strikes!
    const targets = [...game.enemies]
      .sort((a, b) => distance(player, a) - distance(player, b))
      .slice(0, isAsrielSynergy ? 16 : 12);
    targets.forEach((enemy, idx) => {
      const clr = rainbowPalette[idx % rainbowPalette.length];
      applyDamageToEnemy(enemy, getPlayerDamage(player, isAsrielSynergy ? 420 : 340));
      enemy.slow = Math.max(enemy.slow ?? 0, 2.0);
      game.lightningEffects.push({ x: enemy.x, y: enemy.y, color: clr, life: 0.4, maxLife: 0.4 });
      addParticles(game, enemy.x, enemy.y, clr, 14);
    });
    addFloatingText(
      game,
      player.x,
      player.y - 36,
      isAsrielSynergy ? '🌈 HOPES AND DREAMS!!' : '🌈 STAR BLAZING!!',
      '#facc15',
      28,
    );
  } else if (wId === 'realKnife') {
    // 🔪 THE REAL KNIFE ULTIMATE · ERASE (9999999 CRIMSON EXECUTION!)
    const isCharaSynergy = Boolean(player.charaHero);
    const execR = (isCharaSynergy ? 620 : 540) * player.area;
    if (!player.sansHero) {
      player.hp = Math.min(player.maxHp, player.hp + Math.round(player.maxHp * (isCharaSynergy ? 0.55 : 0.4)));
    }
    game.enemies.forEach((enemy) => {
      if (distance(player, enemy) < execR + enemy.radius) {
        const dmg = getPlayerDamage(player, isCharaSynergy ? 560 : 420);
        applyDamageToEnemy(enemy, dmg);
        if (enemy.boss) {
          enemy.hp -= Math.min(950, enemy.maxHp * 0.025);
        }
        enemy.slow = Math.max(enemy.slow ?? 0, 2.0);
        addParticles(game, enemy.x, enemy.y, '#ef4444', 12);
      }
    });
    // Giant 360° Crimson Slash + Shockwave
    game.bullets.push({
      x: player.x,
      y: player.y,
      vx: 0,
      vy: 0,
      radius: (isCharaSynergy ? 400 : 350) * player.area,
      damage: getPlayerDamage(player, isCharaSynergy ? 480 : 380),
      life: 0.4,
      maxLife: 0.4,
      pierce: 999,
      color: '#ef4444',
      spin: 0,
      angle: aim,
      arc: Math.PI * 2,
      knockback: 160,
      type: 'katana',
      awakened: true,
      crimson: true,
      hitIds: new Set(),
    });
    game.bullets.push({
      x: player.x,
      y: player.y,
      vx: 0,
      vy: 0,
      radius: 80,
      damage: getPlayerDamage(player, 260),
      life: 0.48,
      maxLife: 0.48,
      pierce: 999,
      color: '#ef4444',
      spin: 0,
      type: 'shockwave',
      blast: execR,
      hitIds: new Set(),
    });
    // 20 (or 28 with Synergy) Homing Red Determination Knives!
    const knifeN = isCharaSynergy ? 28 : 20;
    for (let i = 0; i < knifeN; i += 1) {
      const a = aim + (Math.PI * 2 * i) / knifeN;
      game.bullets.push({
        x: player.x + Math.cos(a) * 26,
        y: player.y + Math.sin(a) * 26,
        vx: Math.cos(a) * 980,
        vy: Math.sin(a) * 980,
        radius: 15 * player.area,
        damage: getPlayerDamage(player, isCharaSynergy ? 260 : 210),
        life: 1.25,
        pierce: 18,
        color: '#ef4444',
        spin: 0,
        homing: true,
        type: 'charaKnife',
        awakened: true,
      });
    }
    addFloatingText(
      game,
      player.x,
      player.y - 38,
      isCharaSynergy ? '🔪 9999999 · ERASE!!' : '🔪 999999!!',
      '#ef4444',
      30,
    );
  } else if (wId === 'voidBlade') {
    // 👁️ FORSAKEN VOID BLADE ULTIMATE: 480px Corruption Void Explosion + 16 Corrupted Waves + 45% Heal!
    const voidR = 480 * player.area;
    if (!player.sansHero) {
      player.hp = Math.min(player.maxHp, player.hp + Math.round(player.maxHp * 0.45));
    }
    game.enemies.forEach((enemy) => {
      if (distance(player, enemy) < voidR + enemy.radius) {
        applyDamageToEnemy(enemy, getPlayerDamage(player, 420));
        enemy.slow = Math.max(enemy.slow ?? 0, 2.4);
        enemy.karmaTimer = Math.max(enemy.karmaTimer ?? 0, 3.6);
        enemy.karmaDps = Math.max(enemy.karmaDps ?? 0, getPlayerDamage(player, 110));
        addParticles(game, enemy.x, enemy.y, '#22c55e', 10);
      }
    });
    for (let r = 0; r < 2; r += 1) {
      game.bullets.push({
        x: player.x,
        y: player.y,
        vx: 0,
        vy: 0,
        radius: 75,
        damage: getPlayerDamage(player, 280),
        life: 0.44 + r * 0.14,
        maxLife: 0.44 + r * 0.14,
        pierce: 999,
        color: r === 0 ? '#ef4444' : '#22c55e',
        spin: 0,
        type: 'shockwave',
        blast: voidR - r * 70,
        hitIds: new Set(),
      });
    }
    for (let i = 0; i < 16; i += 1) {
      const a = aim + (Math.PI * 2 * i) / 16;
      game.bullets.push({
        x: player.x + Math.cos(a) * 26,
        y: player.y + Math.sin(a) * 26,
        vx: Math.cos(a) * 900,
        vy: Math.sin(a) * 900,
        radius: 24 * player.area,
        damage: getPlayerDamage(player, 240),
        life: 1.05,
        pierce: 18,
        slow: 1.5,
        color: i % 2 === 0 ? '#ef4444' : '#22c55e',
        spin: 0,
        type: 'lightchaser',
        awakened: true,
      });
    }
    addFloatingText(game, player.x, player.y - 38, '👁️ FORSAKEN VOID!!', '#22c55e', 28);
  } else if (wId === 'floweyArsenal') {
    // 🌻 OMEGA FLOWEY ULTIMATE: SAVE & LOAD Full Heal + 6 Human Soul Mega Beams + 10 Nuke Bombs + 18 Friendliness Pellets!
    const soulColors = ['#ef4444', '#fb923c', '#facc15', '#22c55e', '#38bdf8', '#a855f7'];
    if (!player.sansHero) {
      player.hp = player.maxHp;
    }
    // 6 Human Soul Mega Lasers radiating from around Flowey!
    for (let i = 0; i < 6; i += 1) {
      const a = aim + (Math.PI * 2 * i) / 6;
      const sx = clamp(player.x + Math.cos(a) * 65, 40, world.width - 40);
      const sy = clamp(player.y + Math.sin(a) * 65, 40, world.height - 40);
      game.bullets.push({
        x: sx,
        y: sy,
        vx: 0,
        vy: 0,
        angle: a,
        radius: 46 * player.area,
        beamLength: 880,
        charge: 0.14 + i * 0.04,
        maxCharge: 0.14 + i * 0.04,
        fired: false,
        damage: getPlayerDamage(player, 260),
        life: 1.05 + i * 0.04,
        maxLife: 1.05 + i * 0.04,
        pierce: 9999,
        color: soulColors[i],
        spin: 0,
        type: 'gaster',
        awakened: true,
        hitCooldowns: new Map(),
      });
    }
    // 10 Homing Omega Flowey Nuke Bombs!
    for (let m = 0; m < 10; m += 1) {
      const ma = aim + (Math.PI * 2 * m) / 10;
      game.skillProjectiles.push({
        kind: 'rocket',
        x: player.x,
        y: player.y,
        vx: Math.cos(ma) * 580,
        vy: Math.sin(ma) * 580,
        radius: 17,
        blast: 170 * player.area,
        damage: getPlayerDamage(player, 320),
        life: 2.3,
        awakened: true,
      });
    }
    // 18 Friendliness Pellets!
    for (let p = 0; p < 18; p += 1) {
      const pa = aim + (Math.PI * 2 * p) / 18;
      game.bullets.push({
        x: player.x + Math.cos(pa) * 26,
        y: player.y + Math.sin(pa) * 26,
        vx: Math.cos(pa) * 760,
        vy: Math.sin(pa) * 760,
        radius: 12 * player.area,
        damage: getPlayerDamage(player, 185),
        life: 1.25,
        pierce: 10,
        color: '#fef08a',
        spin: p,
        homing: p % 2 === 0,
        type: 'floweyPellet',
        awakened: true,
      });
    }
    addFloatingText(game, player.x, player.y - 40, '🌻 SAVE & LOAD · FULL HP!!', '#facc15', 26);
  } else if (wId === 'justiceSpear') {
    // 🛡️ UNDYNE THE UNDYING ULTIMATE (BUFFED): 28 Mega Spears 360° + 14 Encircling Spears + 520px Green Soul Shield Nova + 240,000 HP Surge!
    if (player.undyingHero) {
      player.hp = Math.min(player.maxHp, player.hp + 4600);
    } else if (!player.sansHero) {
      player.hp = Math.min(player.maxHp, player.hp + Math.round(player.maxHp * 0.4));
    }
    for (let i = 0; i < 28; i += 1) {
      const a = aim + (Math.PI * 2 * i) / 28;
      game.bullets.push({
        x: player.x + Math.cos(a) * 26,
        y: player.y + Math.sin(a) * 26,
        vx: Math.cos(a) * 1160,
        vy: Math.sin(a) * 1160,
        radius: 22 * player.area,
        damage: getPlayerDamage(player, 4920),
        life: 1.4,
        pierce: 28,
        slow: 1.6,
        color: i % 2 === 0 ? '#38bdf8' : '#fef08a',
        spin: 0,
        type: 'justiceSpear',
        awakened: true,
      });
    }
    const anchor = [...game.enemies]
      .sort((a, b) => distance(player, a) - distance(player, b))[0] || {
      x: clamp(player.x + Math.cos(aim) * 200, 80, world.width - 80),
      y: clamp(player.y + Math.sin(aim) * 200, 80, world.height - 80),
    };
    for (let s = 0; s < 14; s += 1) {
      const sa = (Math.PI * 2 * s) / 14;
      const sx = clamp(anchor.x + Math.cos(sa) * 220, 36, world.width - 36);
      const sy = clamp(anchor.y + Math.sin(sa) * 220, 36, world.height - 36);
      const inA = Math.atan2(anchor.y - sy, anchor.x - sx);
      game.bullets.push({
        x: sx,
        y: sy,
        vx: Math.cos(inA) * 780,
        vy: Math.sin(inA) * 780,
        radius: 20 * player.area,
        damage: getPlayerDamage(player, 4920),
        life: 0.78,
        pierce: 20,
        color: '#22c55e',
        spin: 0,
        type: 'justiceSpear',
        awakened: true,
      });
    }
    game.bullets.push({
      x: player.x,
      y: player.y,
      vx: 0,
      vy: 0,
      radius: 90,
      damage: getPlayerDamage(player, 12300),
      life: 0.5,
      maxLife: 0.5,
      pierce: 999,
      color: '#22c55e',
      spin: 0,
      type: 'shockwave',
      blast: 520 * player.area,
      hitIds: new Set(),
    });
    addFloatingText(game, player.x, player.y - 40, '🛡️ TRUE HERO · SPEAR OF JUSTICE!!', '#38bdf8', 26);
  } else if (wId === 'neoCannon') {
    // 🌟 METTATON NEO ULTIMATE: 18-Way NEO Plasma Starburst + 6 Homing Disco Bombs + 480px Glamour Spotlight Nova!
    if (!player.sansHero) {
      player.hp = Math.min(player.maxHp, player.hp + Math.round(player.maxHp * 0.35));
    }
    for (let i = 0; i < 18; i += 1) {
      const a = aim + (Math.PI * 2 * i) / 18;
      game.bullets.push({
        x: player.x + Math.cos(a) * 28,
        y: player.y + Math.sin(a) * 28,
        vx: Math.cos(a) * 980,
        vy: Math.sin(a) * 980,
        radius: 18 * player.area,
        damage: getPlayerDamage(player, 260),
        life: 1.3,
        pierce: 16,
        color: i % 3 === 0 ? '#ec4899' : i % 3 === 1 ? '#facc15' : '#38bdf8',
        spin: i * 0.4,
        type: 'neoStar',
        awakened: true,
      });
    }
    for (let b = 0; b < 6; b += 1) {
      const ba = aim + (Math.PI * 2 * b) / 6;
      game.skillProjectiles.push({
        kind: 'rocket',
        x: player.x + Math.cos(ba) * 30,
        y: player.y + Math.sin(ba) * 30,
        vx: Math.cos(ba) * 520,
        vy: Math.sin(ba) * 520,
        radius: 15,
        blast: 170 * player.area,
        damage: getPlayerDamage(player, 240),
        life: 2.2,
        homing: true,
        color: b % 2 === 0 ? '#ec4899' : '#facc15',
        awakened: true,
      });
    }
    game.bullets.push({
      x: player.x,
      y: player.y,
      vx: 0,
      vy: 0,
      radius: 85,
      damage: getPlayerDamage(player, 310),
      life: 0.48,
      maxLife: 0.48,
      pierce: 999,
      color: '#ec4899',
      spin: 0,
      type: 'shockwave',
      blast: 480 * player.area,
      hitIds: new Set(),
    });
    addFloatingText(game, player.x, player.y - 40, '🌟 POWER OF "NEO" · OH YES!!', '#f472b6', 26);
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
  const isAsrielSynergy = Boolean(player.asrielHero && weapon.id === 'chaosSaber');
  const isCharaSynergy = Boolean(player.charaHero && weapon.id === 'realKnife');

  player.ultCharge = 0;
  player.invincible = Math.max(player.invincible, 2.6);
  game.enemyBullets = (game.enemyBullets ?? []).filter((eb) => distance(player, eb) > 420);

  const activeHero = HEROES[game.heroIndex ?? 0] ?? HEROES[0];
  const isForsakenSynergy = Boolean(player.forsakenHero && weapon.id === 'voidBlade');
  const isFloweySynergy = Boolean(player.floweyHero && weapon.id === 'floweyArsenal');
  const isUndyingSynergy = Boolean(player.undyingHero && weapon.id === 'justiceSpear');
  const isNeoSynergy = Boolean(player.neoHero && weapon.id === 'neoCannon');

  // Launch epic anime-style WEAPON Ultimate Cutscene!
  game.ultCutscene = {
    timer: 1.75,
    maxTimer: 1.75,
    impactAt: 0.48,
    executed: false,
    heroId: activeHero.id,
    heroName: activeHero.name,
    heroIcon: activeHero.icon,
    weaponId: weapon.id,
    weaponName: isSansSynergy
      ? '시너지 · 샌즈 × 가스터'
      : isAsrielSynergy
        ? '시너지 · 아스리엘 × 카오스 세이버'
        : isCharaSynergy
          ? '시너지 · 차라 × 진정한 칼'
          : isForsakenSynergy
            ? '시너지 · 포세이큰 × 부패의 검'
            : isFloweySynergy
              ? '시너지 · 오메가 플라위 × 악몽의 덩굴포'
              : isUndyingSynergy
                ? '시너지 · 불사의 언다인 × 정의의 창'
                : isNeoSynergy
                  ? '시너지 · 메타톤 NEO × NEO 암 캐논'
                  : (weapon.displayName ?? weapon.name),
    ultIcon: ultSpec.icon,
    ultName: isSansSynergy
      ? '심판의 회랑 · 메갈로바니아'
      : isAsrielSynergy
        ? '호프 앤 드림즈 · 하이퍼 고너'
        : isCharaSynergy
          ? '세계 삭제 · ERASE (9999999)'
          : ultSpec.name,
    ultSub: isSansSynergy
      ? 'SYNERGY OVERDRIVE · JUDGEMENT HALL'
      : isAsrielSynergy
        ? 'SYNERGY OVERDRIVE · HOPES AND DREAMS'
        : isCharaSynergy
          ? 'SYNERGY OVERDRIVE · DETERMINATION LV.20'
          : ultSpec.sub,
    ultQuote: activeHero.ultQuote || ultSpec.quote,
    accent: ultSpec.accent,
    bg: ultSpec.bg,
    sansMode: isSans,
    synergyMode:
      isSansSynergy ||
      isAsrielSynergy ||
      isCharaSynergy ||
      isForsakenSynergy ||
      isFloweySynergy ||
      isUndyingSynergy ||
      isNeoSynergy,
    rainbowMode: weapon.id === 'chaosSaber',
    charaMode: weapon.id === 'realKnife',
    forsakenMode: weapon.id === 'voidBlade',
    floweyMode: weapon.id === 'floweyArsenal',
    undyingMode: weapon.id === 'justiceSpear',
    neoMode: weapon.id === 'neoCannon',
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

  if (weapon.id === 'chaosSaber') {
    const rainbowPalette = ['#f43f5e', '#fb923c', '#facc15', '#4ade80', '#38bdf8', '#a855f7', '#ec4899'];
    let baseAngle = player.aimAngle ?? 0;
    const nearest = game.enemies
      .map((enemy) => ({ enemy, dist: distance(player, enemy) }))
      .sort((a, b) => a.dist - b.dist)[0]?.enemy;
    if (game.aimMode !== 'manual' && nearest) {
      baseAngle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
    }

    if (awakened) {
      const pattern = (game.asrielPatternIndex ?? 0) % 3;
      game.asrielPatternIndex = (game.asrielPatternIndex ?? 0) + 1;

      if (pattern === 0) {
        // ⚔️ CHAOS SABER & BUSTER: 360° Giant Rainbow Dual Saber + Twin Chaos Buster Beams!
        game.bullets.push({
          x: player.x,
          y: player.y,
          vx: 0,
          vy: 0,
          radius: weapon.radius * player.area * 1.48,
          damage: getPlayerDamage(player, weapon.damage * boost * 1.35),
          life: 0.34,
          maxLife: 0.34,
          pierce: 999,
          color: '#ec4899',
          spin: 0,
          angle: baseAngle,
          arc: Math.PI * 2,
          knockback: 110,
          type: 'katana',
          awakened: true,
          rainbow: true,
          hitIds: new Set(),
        });
        [-1, 1].forEach((side) => {
          const perp = baseAngle + Math.PI / 2;
          const sx = clamp(player.x + Math.cos(baseAngle) * 44 + Math.cos(perp) * side * 52, 40, world.width - 40);
          const sy = clamp(player.y + Math.sin(baseAngle) * 44 + Math.sin(perp) * side * 52, 40, world.height - 40);
          game.bullets.push({
            x: sx,
            y: sy,
            vx: 0,
            vy: 0,
            angle: baseAngle + side * 0.06,
            radius: 38 * player.area,
            beamLength: 820,
            charge: 0.14,
            maxCharge: 0.14,
            fired: false,
            damage: getPlayerDamage(player, weapon.damage * boost * 1.25),
            life: 0.72,
            maxLife: 0.72,
            pierce: 9999,
            color: side < 0 ? '#ec4899' : '#38bdf8',
            spin: 0,
            type: 'gaster',
            awakened: true,
            hitCooldowns: new Map(),
          });
        });
        addFloatingText(game, player.x, player.y - 34, '⚔️ CHAOS BUSTER!', '#ec4899', 19);
      } else if (pattern === 1) {
        // ⭐ STAR BLAZING: 12 Homing Exploding Rainbow Stars!
        for (let s = 0; s < 12; s += 1) {
          const a = baseAngle + (s / 11 - 0.5) * 1.5;
          game.bullets.push({
            x: player.x + Math.cos(a) * 24,
            y: player.y + Math.sin(a) * 24,
            vx: Math.cos(a) * 740,
            vy: Math.sin(a) * 740,
            radius: 16 * player.area,
            damage: getPlayerDamage(player, weapon.damage * boost * 1.1),
            life: 1.35,
            pierce: 6,
            slow: 0.9,
            color: rainbowPalette[s % rainbowPalette.length],
            spin: s * 0.5,
            homing: true,
            blast: 96 * player.area,
            type: 'asrielStar',
            awakened: true,
            hitIds: new Set(),
          });
        }
        addFloatingText(game, player.x, player.y - 34, '⭐ STAR BLAZING!', '#facc15', 19);
      } else {
        // ⚡ SHOCKER BREAKER: 8 Rainbow Sky Lightning Strikes + Rainbow Shockwave!
        const targets = [...game.enemies]
          .sort((a, b) => distance(player, a) - distance(player, b))
          .slice(0, 8);
        targets.forEach((enemy, idx) => {
          const clr = rainbowPalette[idx % rainbowPalette.length];
          applyDamageToEnemy(enemy, getPlayerDamage(player, weapon.damage * boost * 1.55));
          enemy.slow = Math.max(enemy.slow ?? 0, 1.8);
          game.lightningEffects.push({ x: enemy.x, y: enemy.y, color: clr, life: 0.34, maxLife: 0.34 });
          addParticles(game, enemy.x, enemy.y, clr, 10);
        });
        game.bullets.push({
          x: player.x,
          y: player.y,
          vx: 0,
          vy: 0,
          radius: 50,
          damage: getPlayerDamage(player, weapon.damage * boost),
          life: 0.38,
          maxLife: 0.38,
          pierce: 999,
          color: '#a855f7',
          spin: 0,
          type: 'shockwave',
          blast: 290 * player.area,
          hitIds: new Set(),
        });
        addFloatingText(game, player.x, player.y - 34, '⚡ SHOCKER BREAKER!', '#38bdf8', 19);
      }
      game.shake = Math.max(game.shake, 7);
      queueSound(game, 'bat');
      return;
    }

    // Normal Chaos Saber: Dual Front & Back Rainbow Saber Slashes + 3 Homing Rainbow Stars!
    [0, Math.PI].forEach((offset, idx) => {
      game.bullets.push({
        x: player.x,
        y: player.y,
        vx: 0,
        vy: 0,
        radius: weapon.radius * player.area,
        damage: getPlayerDamage(player, weapon.damage * boost),
        life: weapon.life,
        maxLife: weapon.life,
        pierce: 999,
        color: idx === 0 ? '#ec4899' : '#38bdf8',
        spin: 0,
        angle: baseAngle + offset,
        arc: weapon.arc,
        knockback: weapon.knockback,
        type: 'katana',
        awakened: false,
        rainbow: true,
        hitIds: new Set(),
      });
    });
    for (let s = -1; s <= 1; s += 1) {
      const a = baseAngle + s * 0.24;
      game.bullets.push({
        x: player.x + Math.cos(a) * 24,
        y: player.y + Math.sin(a) * 24,
        vx: Math.cos(a) * 680,
        vy: Math.sin(a) * 680,
        radius: 13 * player.area,
        damage: getPlayerDamage(player, weapon.damage * boost * 0.72),
        life: 1.15,
        pierce: 5,
        slow: 0.5,
        color: rainbowPalette[(Math.floor(game.time * 5) + s + 3) % rainbowPalette.length],
        spin: s,
        homing: true,
        blast: 64 * player.area,
        type: 'asrielStar',
        awakened: false,
        hitIds: new Set(),
      });
    }
    queueSound(game, 'bat');
    return;
  }

  if (weapon.id === 'realKnife') {
    let baseAngle = player.aimAngle ?? 0;
    const nearest = game.enemies
      .map((enemy) => ({ enemy, dist: distance(player, enemy) }))
      .sort((a, b) => a.dist - b.dist)[0]?.enemy;
    if (game.aimMode !== 'manual' && nearest) {
      baseAngle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
    }

    // Main Crimson Determination Knife Slash (360° when awakened!)
    game.bullets.push({
      x: player.x,
      y: player.y,
      vx: 0,
      vy: 0,
      radius: weapon.radius * player.area * (awakened ? 1.48 : 1.08),
      damage: getPlayerDamage(player, weapon.damage * boost * (awakened ? 1.45 : 1)),
      life: weapon.life + (awakened ? 0.08 : 0),
      maxLife: weapon.life + (awakened ? 0.08 : 0),
      pierce: 999,
      color: '#ef4444',
      spin: 0,
      angle: baseAngle,
      arc: awakened ? Math.PI * 2 : weapon.arc,
      knockback: weapon.knockback,
      type: 'katana',
      awakened,
      crimson: true,
      hitIds: new Set(),
    });

    // Red Determination Knife Waves (3 normally, 7 when awakened!)
    const knifeCount = awakened ? 7 : 3;
    const spread = awakened ? 1.05 : 0.34;
    for (let i = 0; i < knifeCount; i += 1) {
      const offset = knifeCount === 1 ? 0 : i / (knifeCount - 1) - 0.5;
      const a = baseAngle + offset * spread;
      game.bullets.push({
        x: player.x + Math.cos(a) * 24,
        y: player.y + Math.sin(a) * 24,
        vx: Math.cos(a) * (awakened ? 960 : 860),
        vy: Math.sin(a) * (awakened ? 960 : 860),
        radius: (awakened ? 15 : 12) * player.area,
        damage: getPlayerDamage(player, weapon.damage * boost * (awakened ? 1.15 : 0.85)),
        life: 1.05,
        pierce: awakened ? 16 : 8,
        color: '#ef4444',
        spin: 0,
        homing: awakened && i % 2 === 0,
        type: 'charaKnife',
        awakened,
      });
    }

    // Awakened 999999 Execution Strike on highest-HP nearby target!
    if (awakened && game.enemies.length > 0) {
      const execTarget = [...game.enemies]
        .filter((e) => distance(player, e) < 380)
        .sort((a, b) => b.hp - a.hp)[0];
      if (execTarget) {
        applyDamageToEnemy(execTarget, getPlayerDamage(player, weapon.damage * boost * 1.9));
        if (execTarget.boss) {
          execTarget.hp -= Math.min(360, execTarget.maxHp * 0.01);
        }
        addParticles(game, execTarget.x, execTarget.y, '#ef4444', 18);
        addFloatingText(game, execTarget.x, execTarget.y - 26, '999999', '#ef4444', 22);
      }
    }

    game.shake = Math.max(game.shake, awakened ? 8 : 3);
    queueSound(game, 'bat');
    return;
  }

  if (weapon.id === 'voidBlade') {
    let baseAngle = player.aimAngle ?? 0;
    const nearest = game.enemies
      .map((enemy) => ({ enemy, dist: distance(player, enemy) }))
      .sort((a, b) => a.dist - b.dist)[0]?.enemy;
    if (game.aimMode !== 'manual' && nearest) {
      baseAngle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
    }

    // Main Dark Corrupted Void Slash (360° when awakened!)
    game.bullets.push({
      x: player.x,
      y: player.y,
      vx: 0,
      vy: 0,
      radius: weapon.radius * player.area * (awakened ? 1.45 : 1.08),
      damage: getPlayerDamage(player, weapon.damage * boost * (awakened ? 1.4 : 1)),
      life: weapon.life + (awakened ? 0.08 : 0),
      maxLife: weapon.life + (awakened ? 0.08 : 0),
      pierce: 999,
      color: '#ef4444',
      spin: 0,
      angle: baseAngle,
      arc: awakened ? Math.PI * 2 : weapon.arc,
      knockback: weapon.knockback,
      type: 'katana',
      awakened,
      hitIds: new Set(),
    });

    // Corrupted Crimson & Toxic-Green Glitch Sword Waves (3 normally, 7 when awakened!)
    const waveCount = awakened ? 7 : 3;
    const spread = awakened ? 1.15 : 0.42;
    for (let i = 0; i < waveCount; i += 1) {
      const offset = waveCount === 1 ? 0 : i / (waveCount - 1) - 0.5;
      const a = baseAngle + offset * spread;
      game.bullets.push({
        x: player.x + Math.cos(a) * 24,
        y: player.y + Math.sin(a) * 24,
        vx: Math.cos(a) * (awakened ? 880 : 780),
        vy: Math.sin(a) * (awakened ? 880 : 780),
        radius: (awakened ? 24 : 19) * player.area,
        damage: getPlayerDamage(player, weapon.damage * boost * (awakened ? 1.1 : 0.85)),
        life: 0.95,
        pierce: awakened ? 16 : 8,
        slow: 1.2,
        color: i % 2 === 0 ? '#ef4444' : '#22c55e',
        spin: 0,
        type: 'lightchaser',
        awakened,
      });
    }

    if (awakened) {
      game.bullets.push({
        x: player.x,
        y: player.y,
        vx: 0,
        vy: 0,
        radius: 45,
        damage: getPlayerDamage(player, weapon.damage * boost * 0.9),
        life: 0.34,
        maxLife: 0.34,
        pierce: 999,
        color: '#22c55e',
        spin: 0,
        type: 'shockwave',
        blast: 220 * player.area,
        hitIds: new Set(),
      });
    }
    game.shake = Math.max(game.shake, awakened ? 8 : 3);
    queueSound(game, 'bat');
    return;
  }

  if (weapon.id === 'floweyArsenal') {
    let baseAngle = player.aimAngle ?? 0;
    const nearest = game.enemies
      .map((enemy) => ({ enemy, dist: distance(player, enemy) }))
      .sort((a, b) => a.dist - b.dist)[0]?.enemy;
    if (game.aimMode !== 'manual' && nearest) {
      baseAngle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
    }

    if (awakened) {
      const pattern = (game.floweyPatternIndex ?? 0) % 3;
      game.floweyPatternIndex = (game.floweyPatternIndex ?? 0) + 1;
      const anchor =
        nearest && distance(player, nearest) < 380
          ? { x: nearest.x, y: nearest.y }
          : {
              x: clamp(player.x + Math.cos(baseAngle) * 180, 90, world.width - 90),
              y: clamp(player.y + Math.sin(baseAngle) * 180, 90, world.height - 90),
            };

      if (pattern === 0) {
        // 🌻 Pattern 1: 14 Closing-In Friendliness Pellets Ring + 6 Vine Waves!
        for (let i = 0; i < 14; i += 1) {
          const a = (Math.PI * 2 * i) / 14;
          const px = clamp(anchor.x + Math.cos(a) * 195, 36, world.width - 36);
          const py = clamp(anchor.y + Math.sin(a) * 195, 36, world.height - 36);
          const inA = Math.atan2(anchor.y - py, anchor.x - px);
          game.bullets.push({
            x: px,
            y: py,
            vx: Math.cos(inA) * 520,
            vy: Math.sin(inA) * 520,
            radius: 13 * player.area,
            damage: getPlayerDamage(player, weapon.damage * boost * 1.15),
            life: 0.78,
            pierce: 12,
            color: '#fef08a',
            spin: i,
            type: 'floweyPellet',
            awakened: true,
          });
        }
        for (let v = 0; v < 6; v += 1) {
          const va = baseAngle + (v / 5 - 0.5) * 1.1;
          game.bullets.push({
            x: player.x + Math.cos(va) * 24,
            y: player.y + Math.sin(va) * 24,
            vx: Math.cos(va) * 820,
            vy: Math.sin(va) * 820,
            radius: 20 * player.area,
            damage: getPlayerDamage(player, weapon.damage * boost * 1.1),
            life: 0.9,
            pierce: 14,
            slow: 1.0,
            color: '#22c55e',
            spin: 0,
            type: 'lightchaser',
            awakened: true,
          });
        }
        addFloatingText(game, anchor.x, anchor.y - 34, '🌻 친절한 알갱이!', '#facc15', 19);
      } else if (pattern === 1) {
        // 💣 Pattern 2: 6 Homing Mega Flowey Nuke Bombs!
        for (let m = 0; m < 6; m += 1) {
          const ma = baseAngle + (m / 5 - 0.5) * 1.15;
          game.skillProjectiles.push({
            kind: 'rocket',
            x: player.x,
            y: player.y,
            vx: Math.cos(ma) * 590,
            vy: Math.sin(ma) * 590,
            radius: 16,
            blast: 165 * player.area,
            damage: getPlayerDamage(player, weapon.damage * boost * 1.55),
            life: 2.1,
            awakened: true,
          });
        }
        addFloatingText(game, player.x, player.y - 34, '💣 악몽의 핵폭격!', '#ef4444', 19);
      } else {
        // 📺 Pattern 3: Triple Omega TV Mega Beams!
        [-1, 0, 1].forEach((side) => {
          const perp = baseAngle + Math.PI / 2;
          const sx = clamp(player.x + Math.cos(baseAngle) * 48 + Math.cos(perp) * side * 66, 40, world.width - 40);
          const sy = clamp(player.y + Math.sin(baseAngle) * 48 + Math.sin(perp) * side * 66, 40, world.height - 40);
          game.bullets.push({
            x: sx,
            y: sy,
            vx: 0,
            vy: 0,
            angle: baseAngle + side * 0.08,
            radius: 42 * player.area,
            beamLength: 880,
            charge: 0.16,
            maxCharge: 0.16,
            fired: false,
            damage: getPlayerDamage(player, weapon.damage * boost * 1.45),
            life: 0.82,
            maxLife: 0.82,
            pierce: 9999,
            color: side === 0 ? '#ef4444' : '#facc15',
            spin: 0,
            type: 'gaster',
            awakened: true,
            hitCooldowns: new Map(),
          });
        });
        addFloatingText(game, player.x, player.y - 34, '📺 TV 메가 레이저!', '#ef4444', 19);
      }
      queueSound(game, 'boom');
      return;
    }

    // Normal Flowey Arsenal: 5-Way Friendliness Pellets + 2 Homing Nuke Bombs!
    for (let i = 0; i < 5; i += 1) {
      const a = baseAngle + (i / 4 - 0.5) * 0.62;
      game.bullets.push({
        x: player.x + Math.cos(a) * 22,
        y: player.y + Math.sin(a) * 22,
        vx: Math.cos(a) * weapon.speed,
        vy: Math.sin(a) * weapon.speed,
        radius: weapon.radius * player.area,
        damage: getPlayerDamage(player, weapon.damage * boost),
        life: weapon.life,
        pierce: weapon.pierce,
        color: '#fef08a',
        spin: i,
        type: 'floweyPellet',
        awakened: false,
      });
    }
    [-0.25, 0.25].forEach((off) => {
      const ma = baseAngle + off;
      game.skillProjectiles.push({
        kind: 'rocket',
        x: player.x,
        y: player.y,
        vx: Math.cos(ma) * 520,
        vy: Math.sin(ma) * 520,
        radius: 13,
        blast: 115 * player.area,
        damage: getPlayerDamage(player, weapon.damage * boost * 1.15),
        life: 1.9,
        awakened: false,
      });
    });
    queueSound(game, 'shoot');
    return;
  }

  if (weapon.id === 'justiceSpear') {
    let baseAngle = player.aimAngle ?? 0;
    const nearest = game.enemies
      .map((enemy) => ({ enemy, dist: distance(player, enemy) }))
      .sort((a, b) => a.dist - b.dist)[0]?.enemy;
    if (game.aimMode !== 'manual' && nearest) {
      baseAngle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
    }

    const spearCount = awakened ? 7 : 5;
    const spread = awakened ? 0.96 : 0.62;
    for (let i = 0; i < spearCount; i += 1) {
      const offset = i / (spearCount - 1) - 0.5;
      const a = baseAngle + offset * spread;
      game.bullets.push({
        x: player.x + Math.cos(a) * 24,
        y: player.y + Math.sin(a) * 24,
        vx: Math.cos(a) * (awakened ? 1080 : weapon.speed),
        vy: Math.sin(a) * (awakened ? 1080 : weapon.speed),
        radius: weapon.radius * player.area * (awakened ? 1.18 : 1),
        damage: getPlayerDamage(player, weapon.damage * boost * (awakened ? 1.25 : 1)),
        life: weapon.life,
        pierce: awakened ? 14 : weapon.pierce,
        slow: awakened ? 1.0 : 0.5,
        color: awakened && i % 2 === 1 ? '#fef08a' : '#38bdf8',
        spin: 0,
        type: 'justiceSpear',
        awakened,
      });
    }

    if (awakened) {
      // Awakened: 8 Encircling Spears around nearest enemy + Green Soul Knockback Ring!
      const anchor = nearest || {
        x: clamp(player.x + Math.cos(baseAngle) * 190, 80, world.width - 80),
        y: clamp(player.y + Math.sin(baseAngle) * 190, 80, world.height - 80),
      };
      for (let s = 0; s < 8; s += 1) {
        const sa = (Math.PI * 2 * s) / 8;
        const sx = clamp(anchor.x + Math.cos(sa) * 195, 36, world.width - 36);
        const sy = clamp(anchor.y + Math.sin(sa) * 195, 36, world.height - 36);
        const inA = Math.atan2(anchor.y - sy, anchor.x - sx);
        game.bullets.push({
          x: sx,
          y: sy,
          vx: Math.cos(inA) * 680,
          vy: Math.sin(inA) * 680,
          radius: 15 * player.area,
          damage: getPlayerDamage(player, weapon.damage * boost * 1.15),
          life: 0.68,
          pierce: 14,
          color: '#22c55e',
          spin: 0,
          type: 'justiceSpear',
          awakened: true,
        });
      }
      game.bullets.push({
        x: player.x,
        y: player.y,
        vx: 0,
        vy: 0,
        radius: 50,
        damage: getPlayerDamage(player, weapon.damage * boost),
        life: 0.34,
        maxLife: 0.34,
        pierce: 999,
        color: '#22c55e',
        spin: 0,
        type: 'shockwave',
        blast: 260 * player.area,
        hitIds: new Set(),
      });
    }
    queueSound(game, 'trident');
    return;
  }

  if (weapon.id === 'neoCannon') {
    let baseAngle = player.aimAngle ?? 0;
    const nearest = game.enemies
      .map((enemy) => ({ enemy, dist: distance(player, enemy) }))
      .sort((a, b) => a.dist - b.dist)[0]?.enemy;
    if (game.aimMode !== 'manual' && nearest) {
      baseAngle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
    }

    const boltCount = awakened ? 5 : 3;
    const spread = awakened ? 0.66 : 0.36;
    for (let i = 0; i < boltCount; i += 1) {
      const offset = i / (boltCount - 1) - 0.5;
      const a = baseAngle + offset * spread;
      game.bullets.push({
        x: player.x + Math.cos(a) * 24,
        y: player.y + Math.sin(a) * 24,
        vx: Math.cos(a) * (awakened ? 980 : weapon.speed),
        vy: Math.sin(a) * (awakened ? 980 : weapon.speed),
        radius: weapon.radius * player.area * (awakened ? 1.25 : 1),
        damage: getPlayerDamage(player, weapon.damage * boost * (awakened ? 1.32 : 1)),
        life: weapon.life,
        pierce: awakened ? 14 : weapon.pierce,
        color: i % 2 === 0 ? '#ec4899' : '#facc15',
        spin: i * 0.5,
        type: 'neoStar',
        awakened,
      });
    }
    if (awakened) {
      for (let b = 0; b < 2; b += 1) {
        const ba = baseAngle + (b === 0 ? -0.45 : 0.45);
        game.skillProjectiles.push({
          kind: 'rocket',
          x: player.x + Math.cos(ba) * 22,
          y: player.y + Math.sin(ba) * 22,
          vx: Math.cos(ba) * 460,
          vy: Math.sin(ba) * 460,
          radius: 12,
          blast: 120 * player.area,
          damage: getPlayerDamage(player, weapon.damage * boost * 1.1),
          life: 1.9,
          homing: true,
          color: '#ec4899',
          awakened: true,
        });
      }
    }
    queueSound(game, 'railgun');
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

function updateGame(game, input, canvas, rawDelta, onEarnGold, onEarnLobbyCoins, onChapterClear) {
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
  game.deathAwakenFlash = Math.max(0, (game.deathAwakenFlash ?? 0) - delta);
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
            damage: getPlayerDamage(player, 32),
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

  // 🌈 ASRIEL DREEMURR PASSIVE STAR BLAZING + CHAOS SABER SYNERGY (HYPER GONER!)
  if (player.asrielHero && game.enemies.length > 0) {
    const rainbowPalette = ['#f43f5e', '#fb923c', '#facc15', '#4ade80', '#38bdf8', '#a855f7', '#ec4899'];
    player.asrielStarTimer = (player.asrielStarTimer ?? 2.5) - delta;
    if (player.asrielStarTimer <= 0) {
      player.asrielStarTimer = 2.5;
      const nearest = game.enemies
        .map((e) => ({ e, dist: distance(player, e) }))
        .sort((a, b) => a.dist - b.dist)[0]?.e;
      const aimA = nearest
        ? Math.atan2(nearest.y - player.y, nearest.x - player.x)
        : (player.aimAngle ?? 0);
      for (let i = 0; i < 5; i += 1) {
        const a = aimA + (i / 4 - 0.5) * 0.9;
        game.bullets.push({
          x: player.x + Math.cos(a) * 22,
          y: player.y + Math.sin(a) * 22,
          vx: Math.cos(a) * 720,
          vy: Math.sin(a) * 720,
          radius: 14 * player.area,
          damage: getPlayerDamage(player, 92),
          life: 1.2,
          pierce: 6,
          slow: 0.7,
          color: rainbowPalette[i % rainbowPalette.length],
          spin: i * 0.6,
          homing: true,
          blast: 72 * player.area,
          type: 'asrielStar',
          awakened: true,
          hitIds: new Set(),
        });
      }
      addFloatingText(game, player.x, player.y - 32, '⭐ 스타 블레이징!', '#facc15', 18);
    }

    if (weapons[player.weaponIndex]?.id === 'chaosSaber') {
      player.asrielSynergyTimer = (player.asrielSynergyTimer ?? 3.2) - delta;
      if (player.asrielSynergyTimer <= 0) {
        player.asrielSynergyTimer = 3.2;
        const vortexR = 380 * player.area;
        game.enemies.forEach((enemy) => {
          const d = distance(player, enemy);
          if (d < vortexR + enemy.radius) {
            const pullA = Math.atan2(player.y - enemy.y, player.x - enemy.x);
            const pullDist = Math.min(d * 0.42, enemy.boss ? 24 : 115);
            enemy.x = clamp(enemy.x + Math.cos(pullA) * pullDist, 30, world.width - 30);
            enemy.y = clamp(enemy.y + Math.sin(pullA) * pullDist, 30, world.height - 30);
            applyDamageToEnemy(enemy, getPlayerDamage(player, 155));
            enemy.slow = Math.max(enemy.slow ?? 0, 1.8);
          }
        });
        game.bullets.push({
          x: player.x,
          y: player.y,
          vx: 0,
          vy: 0,
          radius: 65,
          damage: getPlayerDamage(player, 110),
          life: 0.42,
          maxLife: 0.42,
          pierce: 999,
          color: '#e879f9',
          spin: 0,
          type: 'shockwave',
          blast: vortexR,
          hitIds: new Set(),
        });
        const targets = [...game.enemies]
          .sort((a, b) => distance(player, a) - distance(player, b))
          .slice(0, 6);
        targets.forEach((enemy, idx) => {
          const clr = rainbowPalette[idx % rainbowPalette.length];
          applyDamageToEnemy(enemy, getPlayerDamage(player, 180));
          game.lightningEffects.push({ x: enemy.x, y: enemy.y, color: clr, life: 0.3, maxLife: 0.3 });
          addParticles(game, enemy.x, enemy.y, clr, 10);
        });
        player.hp = Math.min(player.maxHp, player.hp + 12);
        addFloatingText(game, player.x, player.y - 38, '🌈 시너지 · 하이퍼 고너!', '#e879f9', 21);
        game.shake = Math.max(game.shake, 10);
        queueSound(game, 'boom');
      }
    }
  }

  // 🔪 CHARA PASSIVE 999999 EXECUTION + REAL KNIFE SYNERGY (ERASE!)
  if (player.charaHero && game.enemies.length > 0) {
    player.charaSlashTimer = (player.charaSlashTimer ?? 2.4) - delta;
    if (player.charaSlashTimer <= 0) {
      player.charaSlashTimer = 2.4;
      const target = [...game.enemies]
        .filter((e) => distance(player, e) < 420)
        .sort((a, b) => b.hp - a.hp)[0];
      if (target) {
        const execR = 135 * player.area;
        game.enemies.forEach((enemy) => {
          if (distance(target, enemy) < execR + enemy.radius) {
            applyDamageToEnemy(enemy, getPlayerDamage(player, 210));
            addParticles(game, enemy.x, enemy.y, '#ef4444', 10);
          }
        });
        addFloatingText(game, target.x, target.y - 24, '999999', '#ef4444', 24);
        queueSound(game, 'bat');
      }
    }

    if (weapons[player.weaponIndex]?.id === 'realKnife') {
      player.charaSynergyTimer = (player.charaSynergyTimer ?? 3.0) - delta;
      if (player.charaSynergyTimer <= 0) {
        player.charaSynergyTimer = 3.0;
        const aimA = player.aimAngle ?? 0;
        // Triple giant crossing crimson slashes!
        [0, Math.PI / 3, -Math.PI / 3].forEach((off) => {
          game.bullets.push({
            x: player.x,
            y: player.y,
            vx: 0,
            vy: 0,
            radius: 265 * player.area,
            damage: getPlayerDamage(player, 220),
            life: 0.34,
            maxLife: 0.34,
            pierce: 999,
            color: '#ef4444',
            spin: 0,
            angle: aimA + off,
            arc: Math.PI * 0.9,
            knockback: 110,
            type: 'katana',
            awakened: true,
            crimson: true,
            hitIds: new Set(),
          });
        });
        // 10 homing Red Determination Knives!
        for (let k = 0; k < 10; k += 1) {
          const ka = aimA + (Math.PI * 2 * k) / 10;
          game.bullets.push({
            x: player.x + Math.cos(ka) * 24,
            y: player.y + Math.sin(ka) * 24,
            vx: Math.cos(ka) * 920,
            vy: Math.sin(ka) * 920,
            radius: 14 * player.area,
            damage: getPlayerDamage(player, 155),
            life: 1.15,
            pierce: 14,
            color: '#ef4444',
            spin: 0,
            homing: true,
            type: 'charaKnife',
            awakened: true,
          });
        }
        player.hp = Math.min(player.maxHp, player.hp + 12);
        addFloatingText(game, player.x, player.y - 38, '🔪 시너지 · ERASE (9999999)!', '#ef4444', 22);
        game.shake = Math.max(game.shake, 11);
        queueSound(game, 'bat');
      }
    }
  }

  // 🌻 OMEGA FLOWEY PASSIVE: 6-Soul Friendliness Pellet Ring + SAVE & LOAD Heal every 2.5s!
  if (player.floweyHero && game.enemies.length > 0) {
    player.floweyPelletTimer = (player.floweyPelletTimer ?? 2.5) - delta;
    if (player.floweyPelletTimer <= 0) {
      player.floweyPelletTimer = 2.5;
      const target = game.enemies
        .map((e) => ({ e, dist: distance(player, e) }))
        .sort((a, b) => a.dist - b.dist)[0]?.e;
      if (target) {
        for (let i = 0; i < 10; i += 1) {
          const a = (Math.PI * 2 * i) / 10;
          const px = clamp(target.x + Math.cos(a) * 165, 36, world.width - 36);
          const py = clamp(target.y + Math.sin(a) * 165, 36, world.height - 36);
          const inA = Math.atan2(target.y - py, target.x - px);
          game.bullets.push({
            x: px,
            y: py,
            vx: Math.cos(inA) * 480,
            vy: Math.sin(inA) * 480,
            radius: 12 * player.area,
            damage: getPlayerDamage(player, 115),
            life: 0.72,
            pierce: 8,
            color: '#fef08a',
            spin: i,
            type: 'floweyPellet',
            awakened: true,
          });
        }
        player.hp = Math.min(player.maxHp, player.hp + 8);
        addFloatingText(game, target.x, target.y - 30, '🌻 포위 알갱이!', '#facc15', 18);
      }
    }
  }

  // 🛡️ UNDYNE THE UNDYING PASSIVE (BALANCED): 6 Encircling Spears of Justice every 3.2s!
  if (player.undyingHero && game.enemies.length > 0) {
    player.undyingSpearTimer = (player.undyingSpearTimer ?? 3.2) - delta;
    if (player.undyingSpearTimer <= 0) {
      player.undyingSpearTimer = 3.2;
      const target = game.enemies
        .map((e) => ({ e, dist: distance(player, e) }))
        .sort((a, b) => a.dist - b.dist)[0]?.e;
      if (target) {
        for (let i = 0; i < 6; i += 1) {
          const a = (Math.PI * 2 * i) / 6;
          const sx = clamp(target.x + Math.cos(a) * 185, 36, world.width - 36);
          const sy = clamp(target.y + Math.sin(a) * 185, 36, world.height - 36);
          const inA = Math.atan2(target.y - sy, target.x - sx);
          game.bullets.push({
            x: sx,
            y: sy,
            vx: Math.cos(inA) * 700,
            vy: Math.sin(inA) * 700,
            radius: 15 * player.area,
            damage: getPlayerDamage(player, 4920),
            life: 0.72,
            pierce: 8,
            color: '#38bdf8',
            spin: 0,
            type: 'justiceSpear',
            awakened: true,
          });
        }
        addFloatingText(game, target.x, target.y - 30, '🛡️ 정의의 창 포위!', '#38bdf8', 18);
      }
    }
  }

  // 🌟 METTATON NEO PASSIVE (BALANCED): 6 Disco Starlight Bolts every 3.4s!
  if (player.neoHero && game.enemies.length > 0) {
    player.neoShowTimer = (player.neoShowTimer ?? 3.4) - delta;
    if (player.neoShowTimer <= 0) {
      player.neoShowTimer = 3.4;
      for (let i = 0; i < 6; i += 1) {
        const a = game.time * 1.6 + (Math.PI * 2 * i) / 6;
        game.bullets.push({
          x: player.x + Math.cos(a) * 24,
          y: player.y + Math.sin(a) * 24,
          vx: Math.cos(a) * 740,
          vy: Math.sin(a) * 740,
          radius: 13 * player.area,
          damage: getPlayerDamage(player, 32),
          life: 0.95,
          pierce: 5,
          color: i % 2 === 0 ? '#ec4899' : '#38bdf8',
          spin: i * 0.6,
          type: 'neoStar',
          awakened: true,
        });
      }
      addFloatingText(game, player.x, player.y - 34, '🌟 OH YES!! GLAMOUR!!', '#f472b6', 18);
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
  player.floweySaveCd = Math.max(0, (player.floweySaveCd ?? 0) - delta);
  player.asrielRefuseCd = Math.max(0, (player.asrielRefuseCd ?? 0) - delta);
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

    if (bullet.type === 'asrielStar') {
      if (Math.random() < 0.5) {
        addParticles(game, bullet.x, bullet.y, bullet.color || '#facc15', 1);
      }
      game.enemies.forEach((enemy) => {
        if (bullet.hitIds.has(enemy)) return;
        if (distance(bullet, enemy) < bullet.radius + enemy.radius) {
          bullet.hitIds.add(enemy);
          applyDamageToEnemy(enemy, bullet.damage);
          enemy.slow = Math.max(enemy.slow ?? 0, bullet.slow ?? 0.6);
          addParticles(game, enemy.x, enemy.y, bullet.color || '#facc15', 10);
          const blastR = bullet.blast ?? 70;
          game.enemies.forEach((near) => {
            if (near !== enemy && distance(enemy, near) < blastR) {
              applyDamageToEnemy(near, bullet.damage * 0.55);
              addParticles(game, near.x, near.y, bullet.color || '#ec4899', 3);
            }
          });
          bullet.pierce -= 1;
          if (Math.random() < 0.25) queueSound(game, 'hit');
        }
      });
      return bullet.pierce > 0 && bullet.life > 0 && bullet.x > 0 && bullet.y > 0 && bullet.x < world.width && bullet.y < world.height;
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
        const baseHit = Math.max(1, enemy.damage - player.armor);
        const dmgTaken = player.neoHero
          ? Math.round(Math.max(12, enemy.damage) * 250)
          : player.undyingHero
            ? Math.round(Math.max(10, enemy.damage) * 130)
            : player.floweyHero
              ? Math.round(Math.max(10, enemy.damage) * 48)
              : baseHit;
        player.hp = Math.max(0, player.hp - dmgTaken);
        if (player.neoHero) addFloatingText(game, player.x, player.y - 28, `-${dmgTaken.toLocaleString()} (NEO 약점!)`, '#f472b6', 17);
        player.invincible = 0.55 + player.invincibleBonus;
        game.shake = 11;
        addParticles(game, player.x, player.y, '#f87171', 12);
        queueSound(game, 'hurt');
        if (player.floweyHero && player.hp > 0 && player.hp <= player.maxHp * 0.25 && (player.floweySaveCd ?? 0) <= 0) {
          player.hp = Math.min(player.maxHp, player.hp + Math.round(player.maxHp * 0.35));
          player.floweySaveCd = 35;
          player.invincible = 1.4;
          addFloatingText(game, player.x, player.y - 42, '📁 LOAD FILE (+35% HP)', '#facc15', 20);
          queueSound(game, 'level');
        }
        if (player.hp <= 0) {
          if (!tryHeroDeathAwakening(game)) {
            game.over = true;
            game.running = false;
          }
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
      onEarnLobbyCoins?.(bossCoins, { kills: 1, boss: 1 });
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
      onChapterClear?.(activeHero?.id);

      // 🌈 Asriel Dreemurr Special Twist: 10% chance to fade away (die) at the end of every chapter!
      if (player.asrielHero && Math.random() < 0.1) {
        player.hp = 0;
        game.over = true;
        game.running = false;
        game.bossClearText = '🌸 챕터 종료 10% 확률 발동 · 아스리엘의 영혼이 흩어져 사망했습니다...';
        addParticles(game, player.x, player.y, '#e879f9', 48);
        addFloatingText(game, player.x, player.y - 44, '🌸 10% 소멸 발동 · 아스리엘 사망...', '#e879f9', 22);
        queueSound(game, 'hurt');
        return false;
      }

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
          const baseHit = Math.max(1, enemy.damage - player.armor);
          const dmgTaken = player.neoHero
            ? Math.round(Math.max(15, enemy.damage) * 250)
            : player.undyingHero
              ? Math.round(Math.max(12, enemy.damage) * 130)
              : player.floweyHero
                ? Math.round(Math.max(12, enemy.damage) * 48)
                : baseHit;
          player.hp = Math.max(0, player.hp - dmgTaken);
          if (player.neoHero) addFloatingText(game, player.x, player.y - 28, `-${dmgTaken.toLocaleString()} (NEO 약점!)`, '#f472b6', 17);
          player.invincible = 0.55 + player.invincibleBonus;
          game.shake = 12;
          queueSound(game, 'hurt');
          if (player.floweyHero && player.hp > 0 && player.hp <= player.maxHp * 0.25 && (player.floweySaveCd ?? 0) <= 0) {
            player.hp = Math.min(player.maxHp, player.hp + Math.round(player.maxHp * 0.35));
            player.floweySaveCd = 35;
            player.invincible = 1.4;
            addFloatingText(game, player.x, player.y - 42, '📁 LOAD FILE (+35% HP)', '#facc15', 20);
            queueSound(game, 'level');
          }
          if (player.hp <= 0) {
            if (!tryHeroDeathAwakening(game)) {
              game.over = true;
              game.running = false;
            }
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
    onEarnLobbyCoins?.(coinDrop, { kills: 1, elite: enemy.elite ? 1 : 0 });
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
        const baseHit = Math.max(1, eb.damage - player.armor);
        const dmgTaken = player.neoHero
          ? Math.round(Math.max(12, eb.damage) * 250)
          : player.undyingHero
            ? Math.round(Math.max(10, eb.damage) * 130)
            : player.floweyHero
              ? Math.round(Math.max(10, eb.damage) * 48)
              : baseHit;
        player.hp = Math.max(0, player.hp - dmgTaken);
        if (player.neoHero) addFloatingText(game, player.x, player.y - 28, `-${dmgTaken.toLocaleString()} (NEO 약점!)`, '#f472b6', 17);
        player.invincible = 0.5 + player.invincibleBonus;
        if (eb.chill) player.slowTimer = Math.max(player.slowTimer ?? 0, 1.5);
        game.shake = 10;
        addParticles(game, player.x, player.y, eb.color, 12);
        queueSound(game, 'hurt');
        if (player.floweyHero && player.hp > 0 && player.hp <= player.maxHp * 0.25 && (player.floweySaveCd ?? 0) <= 0) {
          player.hp = Math.min(player.maxHp, player.hp + Math.round(player.maxHp * 0.35));
          player.floweySaveCd = 35;
          player.invincible = 1.4;
          addFloatingText(game, player.x, player.y - 42, '📁 LOAD FILE (+35% HP)', '#facc15', 20);
          queueSound(game, 'level');
        }
        if (player.hp <= 0) {
          if (!tryHeroDeathAwakening(game)) {
            game.over = true;
            game.running = false;
          }
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
        if (!player.canonFixedHp) {
          player.maxHp += 6;
          player.hp = Math.min(player.maxHp, player.hp + 12);
        } else if (player.sansHero) {
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

function drawHeartShape(context, x, y, size) {
  context.beginPath();
  context.moveTo(x, y + size * 0.72);
  context.bezierCurveTo(x - size * 1.15, y - size * 0.05, x - size * 0.9, y - size * 0.95, x, y - size * 0.34);
  context.bezierCurveTo(x + size * 0.9, y - size * 0.95, x + size * 1.15, y - size * 0.05, x, y + size * 0.72);
  context.closePath();
}

function drawEnemyArt(context, enemy, game, player) {
  const hpRatio = clamp(enemy.hp / enemy.maxHp, 0, 1);
  const toPlayer = Math.atan2(player.y - enemy.y, player.x - enemy.x);
  const faceDir = Math.cos(toPlayer) < 0 ? -1 : 1;
  const phase = (enemy.x * 0.03 + enemy.y * 0.02);
  const bob = Math.sin(game.time * (enemy.kind === 'runner' ? 14 : 8) + phase) * (enemy.boss ? 3.5 : 2.2);
  const frozen = enemy.slow > 0;
  const r = enemy.radius;

  if (enemy.boss) {
    const enraged = enemy.hp < enemy.maxHp * 0.5;
    const bossKey = enemy.bossId || (
      enemy.pattern === 'neonRing' ? 'neon-overlord'
        : enemy.pattern === 'boulderBurst' ? 'sand-titan'
          : enemy.pattern === 'frostSpiral' ? 'frost-lich'
            : 'inferno-lord'
    );
    context.save();

    // Dash telegraph laser line
    if (enemy.dashWindup > 0) {
      context.strokeStyle = 'rgba(239, 68, 68, 0.9)';
      context.lineWidth = 6;
      context.setLineDash([14, 8]);
      context.beginPath();
      context.moveTo(enemy.x, enemy.y);
      context.lineTo(enemy.x + Math.cos(enemy.dashAngle) * 340, enemy.y + Math.sin(enemy.dashAngle) * 340);
      context.stroke();
      context.setLineDash([]);
    }

    // Ground shadow
    context.fillStyle = 'rgba(0, 0, 0, 0.42)';
    context.beginPath();
    context.ellipse(enemy.x, enemy.y + r * 0.92, r * 0.95, r * 0.3, 0, 0, Math.PI * 2);
    context.fill();

    // Outer boss aura ring
    context.strokeStyle = enraged ? '#facc15' : enemy.glow || '#f87171';
    context.lineWidth = enraged ? 6 : 4;
    context.globalAlpha = 0.52 + Math.sin(game.time * 8) * 0.24;
    context.beginPath();
    context.arc(enemy.x, enemy.y, r + 14 + Math.sin(game.time * 6) * 4, 0, Math.PI * 2);
    context.stroke();
    context.globalAlpha = 1;

    context.translate(enemy.x, enemy.y + bob);

    if (bossKey === 'neon-overlord') {
      // 🤖 CH.1 BOSS: NEON OVERLORD — Cybernetic Mech Warlord!
      // Rotating cyber energy ring & 4 plasma nodes
      context.save();
      context.rotate(game.time * 1.4);
      context.strokeStyle = enraged ? '#facc15' : '#38bdf8';
      context.lineWidth = 3;
      context.setLineDash([12, 10]);
      context.beginPath();
      context.arc(0, 0, r * 1.15, 0, Math.PI * 2);
      context.stroke();
      context.setLineDash([]);
      for (let i = 0; i < 4; i += 1) {
        const a = (Math.PI * 2 * i) / 4;
        context.fillStyle = enraged ? '#fde047' : '#7dd3fc';
        context.beginPath();
        context.arc(Math.cos(a) * r * 1.15, Math.sin(a) * r * 1.15, 6, 0, Math.PI * 2);
        context.fill();
      }
      context.restore();

      // Twin Shoulder Plasma Cannons
      [-1, 1].forEach((side) => {
        context.fillStyle = '#0f172a';
        context.strokeStyle = '#38bdf8';
        context.lineWidth = 3;
        context.beginPath();
        context.roundRect(side * r * 0.72 - 14, -r * 0.55, 28, r * 0.78, 6);
        context.fill();
        context.stroke();
        context.fillStyle = enraged ? '#facc15' : '#38bdf8';
        context.fillRect(side * r * 0.72 - 8, -r * 0.72, 16, 12);
      });

      // Hexagonal Armored Mech Chassis
      context.shadowColor = enraged ? '#facc15' : '#38bdf8';
      context.shadowBlur = 22;
      context.fillStyle = frozen ? '#bae6fd' : '#0c4a6e';
      context.strokeStyle = enraged ? '#fde047' : '#e0f2fe';
      context.lineWidth = 4;
      context.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const a = (Math.PI * 2 * i) / 6 - Math.PI / 6;
        const px = Math.cos(a) * r * 0.94;
        const py = Math.sin(a) * r * 0.94;
        if (i === 0) context.moveTo(px, py);
        else context.lineTo(px, py);
      }
      context.closePath();
      context.fill();
      context.stroke();
      context.shadowBlur = 0;

      // Cyber V-Crest Crown
      context.fillStyle = enraged ? '#facc15' : '#38bdf8';
      context.beginPath();
      context.moveTo(0, -r * 0.78);
      context.lineTo(-r * 0.56, -r * 1.16);
      context.lineTo(-r * 0.28, -r * 0.62);
      context.lineTo(0, -r * 1.05);
      context.lineTo(r * 0.28, -r * 0.62);
      context.lineTo(r * 0.56, -r * 1.16);
      context.closePath();
      context.fill();

      // Visor Plate & Scanning Glowing Eye
      context.fillStyle = '#020617';
      context.beginPath();
      context.roundRect(-r * 0.58, -r * 0.34, r * 1.16, r * 0.34, 8);
      context.fill();
      const scanX = Math.sin(game.time * 4.5) * r * 0.22;
      context.shadowColor = enraged ? '#ef4444' : '#38bdf8';
      context.shadowBlur = 16;
      context.fillStyle = enraged ? '#ef4444' : '#38bdf8';
      context.beginPath();
      context.ellipse(scanX, -r * 0.17, r * 0.24, r * 0.11, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#ffffff';
      context.beginPath();
      context.arc(scanX, -r * 0.17, r * 0.07, 0, Math.PI * 2);
      context.fill();
      context.shadowBlur = 0;

      // Chest Plasma Reactor Core
      context.fillStyle = enraged ? '#fef08a' : '#7dd3fc';
      context.beginPath();
      context.arc(0, r * 0.34, r * 0.2, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = '#ffffff';
      context.lineWidth = 2.5;
      context.stroke();
    } else if (bossKey === 'sand-titan') {
      // 🏜️ CH.2 BOSS: SAND TITAN — Ancient Runic Desert Colossus!
      // Orbiting ancient rune stone monoliths
      for (let i = 0; i < 4; i += 1) {
        const a = game.time * 1.1 + (Math.PI * 2 * i) / 4;
        const rx = Math.cos(a) * (r * 1.18);
        const ry = Math.sin(a) * (r * 1.18);
        context.fillStyle = '#78350f';
        context.strokeStyle = '#fbbf24';
        context.lineWidth = 2;
        context.fillRect(rx - 8, ry - 11, 16, 22);
        context.strokeRect(rx - 8, ry - 11, 16, 22);
      }

      // Massive Craggy Boulder Pauldrons
      [-1, 1].forEach((side) => {
        context.fillStyle = frozen ? '#bae6fd' : '#92400e';
        context.strokeStyle = '#fbbf24';
        context.lineWidth = 3;
        context.beginPath();
        context.moveTo(side * r * 0.5, -r * 0.48);
        context.lineTo(side * r * 1.16, -r * 0.22);
        context.lineTo(side * r * 1.04, r * 0.45);
        context.lineTo(side * r * 0.52, r * 0.35);
        context.closePath();
        context.fill();
        context.stroke();
      });

      // Rugged Polygonal Golem Core
      context.shadowColor = enraged ? '#f97316' : '#facc15';
      context.shadowBlur = 22;
      context.fillStyle = frozen ? '#bae6fd' : '#b45309';
      context.strokeStyle = '#fef08a';
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(0, -r * 1.04);
      context.lineTo(r * 0.72, -r * 0.62);
      context.lineTo(r * 0.92, r * 0.16);
      context.lineTo(r * 0.56, r * 0.86);
      context.lineTo(-r * 0.56, r * 0.86);
      context.lineTo(-r * 0.92, r * 0.16);
      context.lineTo(-r * 0.72, -r * 0.62);
      context.closePath();
      context.fill();
      context.stroke();
      context.shadowBlur = 0;

      // Glowing Magma Fissure Cracks
      context.strokeStyle = enraged ? '#fef08a' : '#fb923c';
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(-r * 0.45, -r * 0.55);
      context.lineTo(-r * 0.12, -r * 0.1);
      context.lineTo(0, r * 0.45);
      context.moveTo(r * 0.48, -r * 0.45);
      context.lineTo(r * 0.16, r * 0.05);
      context.stroke();

      // Golden Pharaoh / Titan Forehead Crest
      context.fillStyle = '#facc15';
      context.beginPath();
      context.moveTo(0, -r * 1.24);
      context.lineTo(r * 0.26, -r * 0.74);
      context.lineTo(0, -r * 0.56);
      context.lineTo(-r * 0.26, -r * 0.74);
      context.closePath();
      context.fill();

      // Blazing Amber Golem Eyes + Grim Stone Jaw
      context.shadowColor = '#facc15';
      context.shadowBlur = 14;
      context.fillStyle = enraged ? '#ef4444' : '#fef08a';
      context.beginPath();
      context.moveTo(-r * 0.46, -r * 0.22);
      context.lineTo(-r * 0.12, -r * 0.08);
      context.lineTo(-r * 0.42, 0);
      context.closePath();
      context.moveTo(r * 0.46, -r * 0.22);
      context.lineTo(r * 0.12, -r * 0.08);
      context.lineTo(r * 0.42, 0);
      context.closePath();
      context.fill();
      context.shadowBlur = 0;
    } else if (bossKey === 'frost-lich') {
      // ❄️ CH.3 BOSS: FROST LICH — Glacial Undead Ice Sovereign!
      // Orbiting Razor Icicle Shards
      for (let i = 0; i < 6; i += 1) {
        const a = game.time * 1.8 + (Math.PI * 2 * i) / 6;
        const ix = Math.cos(a) * (r * 1.18);
        const iy = Math.sin(a) * (r * 1.18);
        context.save();
        context.translate(ix, iy);
        context.rotate(a + Math.PI / 2);
        context.fillStyle = '#e0f2fe';
        context.strokeStyle = '#38bdf8';
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(0, -12);
        context.lineTo(6, 6);
        context.lineTo(0, 11);
        context.lineTo(-6, 6);
        context.closePath();
        context.fill();
        context.stroke();
        context.restore();
      }

      // Tattered Spectral Midnight Cloak & Frost Mantle
      context.fillStyle = '#1e3a8a';
      context.strokeStyle = '#7dd3fc';
      context.lineWidth = 3.5;
      context.beginPath();
      context.moveTo(-r * 0.92, -r * 0.2);
      context.quadraticCurveTo(0, -r * 1.05, r * 0.92, -r * 0.2);
      context.lineTo(r * 0.96, r * 0.95);
      context.lineTo(r * 0.45, r * 0.65);
      context.lineTo(0, r * 1.04);
      context.lineTo(-r * 0.45, r * 0.65);
      context.lineTo(-r * 0.96, r * 0.95);
      context.closePath();
      context.fill();
      context.stroke();

      // Jagged Ice-Crystal Crown
      context.shadowColor = '#7dd3fc';
      context.shadowBlur = 20;
      context.fillStyle = '#bae6fd';
      context.strokeStyle = '#ffffff';
      context.lineWidth = 2.5;
      context.beginPath();
      context.moveTo(-r * 0.62, -r * 0.56);
      context.lineTo(-r * 0.5, -r * 1.24);
      context.lineTo(-r * 0.2, -r * 0.8);
      context.lineTo(0, -r * 1.38);
      context.lineTo(r * 0.2, -r * 0.8);
      context.lineTo(r * 0.5, -r * 1.24);
      context.lineTo(r * 0.62, -r * 0.56);
      context.closePath();
      context.fill();
      context.stroke();

      // Pale Glacial Skull Visage
      context.fillStyle = '#e0f2fe';
      context.strokeStyle = '#0284c7';
      context.lineWidth = 3;
      context.beginPath();
      context.arc(0, -r * 0.14, r * 0.54, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.fillRect(-r * 0.28, r * 0.2, r * 0.56, r * 0.28);
      context.strokeRect(-r * 0.28, r * 0.2, r * 0.56, r * 0.28);

      // Hollow Black Sockets + Piercing Cyan Lich Flames
      context.fillStyle = '#020617';
      context.beginPath();
      context.ellipse(-r * 0.22, -r * 0.18, r * 0.14, r * 0.16, -0.15, 0, Math.PI * 2);
      context.ellipse(r * 0.22, -r * 0.18, r * 0.14, r * 0.16, 0.15, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = enraged ? '#facc15' : '#38bdf8';
      context.beginPath();
      context.arc(-r * 0.22, -r * 0.18, r * 0.075, 0, Math.PI * 2);
      context.arc(r * 0.22, -r * 0.18, r * 0.075, 0, Math.PI * 2);
      context.fill();
      context.shadowBlur = 0;
    } else {
      // 🔥 FINAL BOSS: INFERNO LORD — Demonic Winged Overlord of Ember Core!
      const wingFlap = Math.sin(game.time * 7) * 0.18;
      // Massive Flapping Demon Wings
      [-1, 1].forEach((side) => {
        context.save();
        context.rotate(side * wingFlap);
        context.fillStyle = '#450a0a';
        context.strokeStyle = enraged ? '#facc15' : '#ef4444';
        context.lineWidth = 3.5;
        context.beginPath();
        context.moveTo(side * r * 0.45, -r * 0.1);
        context.lineTo(side * r * 1.55, -r * 0.85);
        context.lineTo(side * r * 1.35, -r * 0.12);
        context.lineTo(side * r * 1.48, r * 0.36);
        context.lineTo(side * r * 0.82, r * 0.22);
        context.lineTo(side * r * 0.52, r * 0.55);
        context.closePath();
        context.fill();
        context.stroke();
        context.restore();
      });

      // Curved Obsidian Demon Horns
      [-1, 1].forEach((side) => {
        context.fillStyle = '#18181b';
        context.strokeStyle = enraged ? '#fde047' : '#f97316';
        context.lineWidth = 3;
        context.beginPath();
        context.moveTo(side * r * 0.36, -r * 0.65);
        context.quadraticCurveTo(side * r * 1.15, -r * 1.05, side * r * 0.72, -r * 1.48);
        context.quadraticCurveTo(side * r * 0.74, -r * 0.92, side * r * 0.14, -r * 0.78);
        context.closePath();
        context.fill();
        context.stroke();
      });

      // Armored Volcanic Demon Body
      context.shadowColor = enraged ? '#facc15' : '#ef4444';
      context.shadowBlur = 28;
      context.fillStyle = frozen ? '#bae6fd' : '#7f1d1d';
      context.strokeStyle = enraged ? '#fef08a' : '#fb7185';
      context.lineWidth = 4.5;
      context.beginPath();
      context.arc(0, 0, r * 0.92, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.shadowBlur = 0;

      // Glowing Hellfire Chest Sigil
      context.fillStyle = enraged ? '#fef08a' : '#f97316';
      context.beginPath();
      context.moveTo(0, r * 0.12);
      context.lineTo(r * 0.24, r * 0.44);
      context.lineTo(0, r * 0.72);
      context.lineTo(-r * 0.24, r * 0.44);
      context.closePath();
      context.fill();

      // Terrifying Slanted Demon Eyes + Fanged Roaring Maw
      context.shadowColor = '#facc15';
      context.shadowBlur = 14;
      context.fillStyle = '#fef08a';
      context.beginPath();
      context.moveTo(-r * 0.5, -r * 0.28);
      context.lineTo(-r * 0.12, -r * 0.1);
      context.lineTo(-r * 0.44, -r * 0.04);
      context.closePath();
      context.moveTo(r * 0.5, -r * 0.28);
      context.lineTo(r * 0.12, -r * 0.1);
      context.lineTo(r * 0.44, -r * 0.04);
      context.closePath();
      context.fill();
      context.shadowBlur = 0;

      // Fanged mouth
      context.fillStyle = '#09090b';
      context.beginPath();
      context.ellipse(0, r * 0.14, r * 0.38, r * 0.16, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#ffffff';
      [-0.24, -0.08, 0.08, 0.24].forEach((fx) => {
        context.beginPath();
        context.moveTo(fx * r - 4, r * 0.04);
        context.lineTo(fx * r, r * 0.18);
        context.lineTo(fx * r + 4, r * 0.04);
        context.closePath();
        context.fill();
      });
    }

    context.restore();

    // Boss HP Bar
    context.save();
    context.fillStyle = '#111827';
    context.fillRect(enemy.x - r, enemy.y + r + 14, r * 2, 9);
    context.fillStyle = enraged ? '#facc15' : '#ef4444';
    context.fillRect(enemy.x - r, enemy.y + r + 14, r * 2 * hpRatio, 9);
    context.strokeStyle = '#ffffff';
    context.lineWidth = 1.5;
    context.strokeRect(enemy.x - r, enemy.y + r + 14, r * 2, 9);
    context.restore();
    return;
  }

  // ===== REGULAR & ELITE MONSTERS =====
  context.save();

  // Ground drop shadow
  context.fillStyle = 'rgba(0, 0, 0, 0.34)';
  context.beginPath();
  context.ellipse(enemy.x, enemy.y + r * 0.88, r * 0.85, r * 0.28, 0, 0, Math.PI * 2);
  context.fill();

  // Elite pulsing golden/violet halo
  if (enemy.elite) {
    context.strokeStyle = '#facc15';
    context.lineWidth = 3;
    context.shadowColor = '#c026d3';
    context.shadowBlur = 14;
    context.beginPath();
    context.arc(enemy.x, enemy.y, r + 6 + Math.sin(game.time * 9) * 2, 0, Math.PI * 2);
    context.stroke();
    context.shadowBlur = 0;
  }

  context.translate(enemy.x, enemy.y + bob);

  if (enemy.kind === 'shooter') {
    // 👁️ Arcane Floating Beholder / Void Eye Turret!
    context.save();
    context.rotate(game.time * 1.9);
    context.strokeStyle = '#e879f9';
    context.lineWidth = 2.5;
    context.beginPath();
    context.arc(0, 0, r * 1.15, 0, Math.PI * 2);
    context.stroke();
    // 4 Floating Arcane Crystal Prongs
    for (let i = 0; i < 4; i += 1) {
      const a = (Math.PI * 2 * i) / 4;
      context.fillStyle = frozen ? '#bae6fd' : '#f0abfc';
      context.beginPath();
      context.moveTo(Math.cos(a) * (r * 1.48), Math.sin(a) * (r * 1.48));
      context.lineTo(Math.cos(a + 0.35) * (r * 0.96), Math.sin(a + 0.35) * (r * 0.96));
      context.lineTo(Math.cos(a - 0.35) * (r * 0.96), Math.sin(a - 0.35) * (r * 0.96));
      context.closePath();
      context.fill();
    }
    context.restore();

    // Beholder body + tracking pupil
    context.fillStyle = frozen ? '#bae6fd' : enemy.color;
    context.strokeStyle = '#f5d0fe';
    context.lineWidth = 3;
    context.beginPath();
    context.arc(0, 0, r * 0.92, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.ellipse(0, 0, r * 0.56, r * 0.42, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#c026d3';
    context.beginPath();
    context.arc(Math.cos(toPlayer) * 3.5, Math.sin(toPlayer) * 3.5, r * 0.25, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#09090b';
    context.beginPath();
    context.ellipse(Math.cos(toPlayer) * 4, Math.sin(toPlayer) * 4, r * 0.08, r * 0.2, 0, 0, Math.PI * 2);
    context.fill();
  } else if (enemy.kind === 'bomber') {
    // 💣 Volatile Bob-omb / Blast Fiend!
    const pulse = 0.92 + Math.sin(game.time * 16) * 0.1;
    context.scale(pulse, pulse);
    // Brass wind-up key on back
    context.strokeStyle = '#facc15';
    context.lineWidth = 2.5;
    context.beginPath();
    context.moveTo(-faceDir * r * 0.85, 0);
    context.lineTo(-faceDir * (r + 7), 0);
    context.stroke();
    context.beginPath();
    context.arc(-faceDir * (r + 9), -4, 3.5, 0, Math.PI * 2);
    context.arc(-faceDir * (r + 9), 4, 3.5, 0, Math.PI * 2);
    context.stroke();

    // Glossy dark iron bomb body
    context.fillStyle = frozen ? '#bae6fd' : '#18181b';
    context.strokeStyle = '#ef4444';
    context.lineWidth = 3;
    context.beginPath();
    context.arc(0, 0, r, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    // Specular shine
    context.fillStyle = 'rgba(255,255,255,0.22)';
    context.beginPath();
    context.ellipse(-r * 0.34, -r * 0.36, r * 0.26, r * 0.14, -0.6, 0, Math.PI * 2);
    context.fill();
    // Fuse cap + lit sizzling spark
    context.fillStyle = '#64748b';
    context.fillRect(-5, -r - 3, 10, 6);
    context.strokeStyle = '#d97706';
    context.lineWidth = 2.5;
    context.beginPath();
    context.moveTo(0, -r - 3);
    context.quadraticCurveTo(6, -r - 12, 11, -r - 9);
    context.stroke();
    context.shadowColor = '#facc15';
    context.shadowBlur = 10;
    context.fillStyle = Math.sin(game.time * 28) > 0 ? '#fef08a' : '#ef4444';
    context.beginPath();
    context.arc(11, -r - 9, 4.5, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;

    // Fierce glowing white cartoon eyes + skull warning
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.ellipse(faceDir * 3 - 5, -2, 3.2, 5, 0, 0, Math.PI * 2);
    context.ellipse(faceDir * 3 + 5, -2, 3.2, 5, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#ef4444';
    context.beginPath();
    context.arc(faceDir * 4 - 5, -1, 1.8, 0, Math.PI * 2);
    context.arc(faceDir * 4 + 5, -1, 1.8, 0, Math.PI * 2);
    context.fill();
  } else if (enemy.kind === 'splitter' || enemy.kind === 'miniSlime') {
    // 🟢 Glossy King / Toxic Gel Slime!
    const squishX = 1 + Math.sin(game.time * 8 + phase) * 0.1;
    const squishY = 1 - Math.sin(game.time * 8 + phase) * 0.1;
    context.scale(squishX, squishY);
    context.globalAlpha = 0.9;
    context.fillStyle = frozen ? '#bae6fd' : enemy.color;
    context.strokeStyle = '#d1fae5';
    context.lineWidth = 2.8;
    // Classic flat-bottomed dome slime silhouette
    context.beginPath();
    context.moveTo(-r, r * 0.45);
    context.quadraticCurveTo(-r * 1.04, -r * 0.95, 0, -r * 0.98);
    context.quadraticCurveTo(r * 1.04, -r * 0.95, r, r * 0.45);
    context.quadraticCurveTo(0, r * 0.82, -r, r * 0.45);
    context.closePath();
    context.fill();
    context.stroke();
    // Translucent inner core & bubbles
    context.fillStyle = 'rgba(6, 78, 59, 0.35)';
    context.beginPath();
    context.arc(0, r * 0.08, r * 0.42, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = 'rgba(255, 255, 255, 0.55)';
    context.beginPath();
    context.ellipse(-r * 0.38, -r * 0.38, r * 0.22, r * 0.12, -0.5, 0, Math.PI * 2);
    context.fill();
    // Slime fierce cute eyes
    context.globalAlpha = 1;
    context.fillStyle = '#022c22';
    context.beginPath();
    context.arc(-r * 0.28, -r * 0.02, r * 0.14, 0, Math.PI * 2);
    context.arc(r * 0.28, -r * 0.02, r * 0.14, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.arc(-r * 0.32, -r * 0.06, r * 0.055, 0, Math.PI * 2);
    context.arc(r * 0.24, -r * 0.06, r * 0.055, 0, Math.PI * 2);
    context.fill();
  } else if (enemy.kind === 'shielder') {
    // 🛡️ Heavy Riot-Knight Mech Golem!
    // Armored shoulder pauldrons
    context.fillStyle = '#334155';
    context.strokeStyle = '#cbd5e1';
    context.lineWidth = 2.5;
    context.beginPath();
    context.roundRect(-r * 1.15, -r * 0.5, r * 2.3, r * 1.15, 6);
    context.fill();
    context.stroke();
    // Knight Helmet Core
    context.fillStyle = frozen ? '#bae6fd' : enemy.color;
    context.strokeStyle = '#e2e8f0';
    context.lineWidth = 3;
    context.beginPath();
    context.roundRect(-r * 0.78, -r * 0.92, r * 1.56, r * 1.72, 8);
    context.fill();
    context.stroke();
    // Helmet crest plume
    context.fillStyle = '#38bdf8';
    context.beginPath();
    context.moveTo(0, -r * 1.24);
    context.lineTo(6, -r * 0.85);
    context.lineTo(-6, -r * 0.85);
    context.closePath();
    context.fill();
    // Glowing cyan visor slit
    context.fillStyle = '#0f172a';
    context.fillRect(-r * 0.56, -r * 0.32, r * 1.12, r * 0.3);
    context.shadowColor = '#38bdf8';
    context.shadowBlur = 10;
    context.fillStyle = '#38bdf8';
    context.fillRect(-r * 0.44, -r * 0.22, r * 0.88, r * 0.12);
    context.shadowBlur = 0;

    // Holographic Riot Energy Shield facing player!
    context.save();
    context.rotate(toPlayer);
    context.shadowColor = '#38bdf8';
    context.shadowBlur = 14;
    context.strokeStyle = '#38bdf8';
    context.lineWidth = 5.5;
    context.beginPath();
    context.arc(0, 0, r + 7, -0.92, 0.92);
    context.stroke();
    context.strokeStyle = '#e0f2fe';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(0, 0, r + 9, -0.82, 0.82);
    context.stroke();
    context.restore();
  } else if (enemy.kind === 'ghost') {
    // 👻 Hooded Phantom Wraith Reaper!
    context.globalAlpha = (enemy.phaseDash ?? 0) > 0 ? 0.48 : 0.86;
    const wave = Math.sin(game.time * 10 + phase) * 3;
    context.shadowColor = '#818cf8';
    context.shadowBlur = 14;
    context.fillStyle = frozen ? '#bae6fd' : enemy.color;
    context.strokeStyle = '#e0e7ff';
    context.lineWidth = 2.5;
    // Pointed Wraith Hood + Flowing Wavy Spectral Cloak
    context.beginPath();
    context.moveTo(0, -r * 1.25);
    context.quadraticCurveTo(r * 1.05, -r * 0.55, r * 0.95, r * 0.72);
    context.lineTo(r * 0.45, r * 0.42 + wave);
    context.lineTo(0, r * 0.98 - wave);
    context.lineTo(-r * 0.45, r * 0.42 + wave);
    context.lineTo(-r * 0.95, r * 0.72);
    context.quadraticCurveTo(-r * 1.05, -r * 0.55, 0, -r * 1.25);
    context.closePath();
    context.fill();
    context.stroke();
    context.shadowBlur = 0;
    // Dark Empty Hood Cavity
    context.fillStyle = '#0f172a';
    context.beginPath();
    context.ellipse(0, -r * 0.16, r * 0.5, r * 0.46, 0, 0, Math.PI * 2);
    context.fill();
    // Eerie Glowing Spectral Eyes
    context.shadowColor = '#fef08a';
    context.shadowBlur = 10;
    context.fillStyle = '#fef08a';
    context.beginPath();
    context.ellipse(-r * 0.2, -r * 0.18, 3.2, 2.2, 0.25, 0, Math.PI * 2);
    context.ellipse(r * 0.2, -r * 0.18, 3.2, 2.2, -0.25, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;
  } else if (enemy.kind === 'brute') {
    // 👹 Horned Minotaur / Armored Ogre Crusher!
    // Massive curved horns
    [-1, 1].forEach((side) => {
      context.fillStyle = '#fef3c7';
      context.strokeStyle = '#78350f';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(side * r * 0.48, -r * 0.62);
      context.quadraticCurveTo(side * r * 1.18, -r * 0.88, side * r * 0.85, -r * 1.32);
      context.quadraticCurveTo(side * r * 0.75, -r * 0.82, side * r * 0.24, -r * 0.78);
      context.closePath();
      context.fill();
      context.stroke();
    });
    // Spiked shoulder armor
    context.fillStyle = '#334155';
    context.strokeStyle = '#0f172a';
    context.lineWidth = 2.5;
    context.beginPath();
    context.ellipse(0, r * 0.18, r * 1.15, r * 0.78, 0, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    // Muscular body + angry face
    context.fillStyle = frozen ? '#bae6fd' : enemy.color;
    context.strokeStyle = enemy.elite ? '#fde047' : '#111827';
    context.lineWidth = 3.2;
    context.beginPath();
    context.arc(0, -r * 0.06, r * 0.88, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    // Slanted angry eyes + sharp tusks
    context.fillStyle = '#fef08a';
    context.beginPath();
    context.moveTo(-r * 0.46, -r * 0.28);
    context.lineTo(-r * 0.12, -r * 0.12);
    context.lineTo(-r * 0.42, -r * 0.06);
    context.closePath();
    context.moveTo(r * 0.46, -r * 0.28);
    context.lineTo(r * 0.12, -r * 0.12);
    context.lineTo(r * 0.42, -r * 0.06);
    context.closePath();
    context.fill();
    context.fillStyle = '#ffffff';
    [-1, 1].forEach((side) => {
      context.beginPath();
      context.moveTo(side * r * 0.26, r * 0.34);
      context.lineTo(side * r * 0.36, r * 0.08);
      context.lineTo(side * r * 0.14, r * 0.32);
      context.closePath();
      context.fill();
    });
  } else if (enemy.kind === 'runner') {
    // 🐺 Swift Shadow-Imp / Hellhound Dasher!
    context.save();
    context.rotate(toPlayer);
    // Fiery speed-tail streaming behind
    context.fillStyle = 'rgba(251, 146, 60, 0.55)';
    context.beginPath();
    context.moveTo(-r * 0.6, -r * 0.45);
    context.lineTo(-r * 1.65, 0);
    context.lineTo(-r * 0.6, r * 0.45);
    context.closePath();
    context.fill();
    // Sleek arrow-head beast body with swept-back ears
    context.fillStyle = frozen ? '#bae6fd' : enemy.color;
    context.strokeStyle = enemy.elite ? '#fde047' : '#111827';
    context.lineWidth = 2.8;
    context.beginPath();
    context.moveTo(r * 1.18, 0);
    context.lineTo(r * 0.1, -r * 0.88);
    context.lineTo(-r * 0.96, -r * 1.04);
    context.lineTo(-r * 0.62, 0);
    context.lineTo(-r * 0.96, r * 1.04);
    context.lineTo(r * 0.1, r * 0.88);
    context.closePath();
    context.fill();
    context.stroke();
    // Narrow predator eyes
    context.fillStyle = '#fef08a';
    context.beginPath();
    context.ellipse(r * 0.36, -r * 0.28, 3.6, 2, -0.3, 0, Math.PI * 2);
    context.ellipse(r * 0.36, r * 0.28, 3.6, 2, 0.3, 0, Math.PI * 2);
    context.fill();
    context.restore();
  } else {
    // 👾 Normal Imp / Goblin Monster Grunt!
    // Pointy goblin ears
    context.fillStyle = frozen ? '#bae6fd' : enemy.color;
    context.strokeStyle = enemy.elite ? '#fde047' : '#111827';
    context.lineWidth = 2.5;
    [-1, 1].forEach((side) => {
      context.beginPath();
      context.moveTo(side * r * 0.65, -r * 0.2);
      context.lineTo(side * r * 1.32, -r * 0.62);
      context.lineTo(side * r * 0.82, r * 0.15);
      context.closePath();
      context.fill();
      context.stroke();
    });
    // Head / body
    context.beginPath();
    context.arc(0, 0, r * 0.92, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    // Little horn nubs
    context.fillStyle = '#fef3c7';
    [-1, 1].forEach((side) => {
      context.beginPath();
      context.moveTo(side * r * 0.3, -r * 0.72);
      context.lineTo(side * r * 0.45, -r * 1.15);
      context.lineTo(side * r * 0.12, -r * 0.84);
      context.closePath();
      context.fill();
    });
    // Fierce glowing eyes + mischievous fanged grin
    context.fillStyle = '#fef08a';
    context.beginPath();
    context.arc(-r * 0.3, -r * 0.14, r * 0.18, 0, Math.PI * 2);
    context.arc(r * 0.3, -r * 0.14, r * 0.18, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#991b1b';
    context.beginPath();
    context.arc(-r * 0.3 + faceDir * 1.2, -r * 0.14, r * 0.08, 0, Math.PI * 2);
    context.arc(r * 0.3 + faceDir * 1.2, -r * 0.14, r * 0.08, 0, Math.PI * 2);
    context.fill();
    // Angry slanted brows
    context.strokeStyle = '#111827';
    context.lineWidth = 2.2;
    context.beginPath();
    context.moveTo(-r * 0.5, -r * 0.38);
    context.lineTo(-r * 0.1, -r * 0.22);
    context.moveTo(r * 0.5, -r * 0.38);
    context.lineTo(r * 0.1, -r * 0.22);
    context.stroke();
    // Fanged mouth
    context.fillStyle = '#111827';
    context.beginPath();
    context.arc(0, r * 0.24, r * 0.34, 0, Math.PI);
    context.fill();
    context.fillStyle = '#ffffff';
    context.fillRect(-r * 0.22, r * 0.24, 3, 4);
    context.fillRect(r * 0.1, r * 0.24, 3, 4);
  }

  // Golden Elite Crown on top of any elite monster!
  if (enemy.elite) {
    context.fillStyle = '#facc15';
    context.strokeStyle = '#78350f';
    context.lineWidth = 1.6;
    context.beginPath();
    context.moveTo(-10, -r - 4);
    context.lineTo(-12, -r - 14);
    context.lineTo(-5, -r - 9);
    context.lineTo(0, -r - 17);
    context.lineTo(5, -r - 9);
    context.lineTo(12, -r - 14);
    context.lineTo(10, -r - 4);
    context.closePath();
    context.fill();
    context.stroke();
  }

  context.restore();

  if ((enemy.karmaTimer ?? 0) > 0) {
    context.save();
    context.strokeStyle = '#d946ef';
    context.lineWidth = 2.5;
    context.shadowColor = '#c026d3';
    context.shadowBlur = 12;
    context.beginPath();
    context.arc(enemy.x, enemy.y, r + 5, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }

  context.fillStyle = '#111827';
  context.fillRect(enemy.x - r, enemy.y + r + 8, r * 2, 5);
  context.fillStyle = (enemy.karmaTimer ?? 0) > 0 ? '#d946ef' : '#22c55e';
  context.fillRect(enemy.x - r, enemy.y + r + 8, r * 2 * hpRatio, 5);
}

function drawHeroArt(context, player, hero, game, weapon) {
  const t = game.time;
  const idleBob = Math.sin(t * 7.5) * 1.8;
  const hitFlash = player.invincible > 0 && Math.floor(t * 24) % 2 === 0;

  context.save();

  // Ground drop shadow
  context.fillStyle = 'rgba(0, 0, 0, 0.38)';
  context.beginPath();
  context.ellipse(player.x, player.y + 22, 18, 6.5, 0, 0, Math.PI * 2);
  context.fill();

  // Immortal Black Market Aura
  if (game.bm?.immortal) {
    context.save();
    context.strokeStyle = '#ec4899';
    context.lineWidth = 3.5;
    context.shadowColor = '#a855f7';
    context.shadowBlur = 16;
    context.beginPath();
    context.arc(player.x, player.y, 31 + Math.sin(t * 6) * 3, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }

  // Awakened Golden Weapon Ring
  if (game.awakenedWeapons[weapon?.id]) {
    context.save();
    context.strokeStyle = '#facc15';
    context.lineWidth = 3;
    context.globalAlpha = 0.72;
    context.beginPath();
    context.arc(player.x, player.y, 36 + Math.sin(t * 8) * 4, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }

  // Death Awakening Aura (1st Awakening = Blazing Flame Ring / 2nd Super-Awakening = Double Rotating Hyper Halo!)
  if ((player.awakeningStage ?? 0) >= 1) {
    const isSuper = player.awakeningStage >= 2;
    const auraClr = isSuper ? '#facc15' : (hero.ultColor || '#f97316');
    context.save();
    context.strokeStyle = auraClr;
    context.lineWidth = isSuper ? 4 : 3;
    context.shadowColor = auraClr;
    context.shadowBlur = isSuper ? 24 : 16;
    context.globalAlpha = 0.78 + Math.sin(t * 14) * 0.18;
    context.beginPath();
    context.arc(player.x, player.y, (isSuper ? 41 : 33) + Math.sin(t * 12) * 3, 0, Math.PI * 2);
    context.stroke();
    if (isSuper) {
      context.setLineDash([10, 8]);
      context.strokeStyle = '#ffffff';
      context.lineWidth = 2.4;
      context.beginPath();
      context.arc(player.x, player.y, 48 + Math.cos(t * 10) * 3, t * 2.4, t * 2.4 + Math.PI * 2);
      context.stroke();
      context.setLineDash([]);
    }
    context.restore();
  }

  context.translate(player.x, player.y + idleBob);
  if (hitFlash) {
    context.globalAlpha = 0.72;
  }

  if (hero.id === 'sans') {
    // 💀 AUTHENTIC UNDERTALE SANS: Iconic Skull Cheekbones, Blue Open Hoodie, Fluffy Fur Collar, Shorts & Pink Slippers!
    // Pink slippers & dark shorts
    context.fillStyle = '#0f172a';
    context.fillRect(-10, 14, 8, 6);
    context.fillRect(2, 14, 8, 6);
    context.fillStyle = '#f8fafc';
    context.fillRect(-10, 15, 2, 4);
    context.fillRect(8, 15, 2, 4);
    context.fillStyle = '#f472b6';
    context.beginPath();
    context.ellipse(-6, 21, 5.5, 3, 0, 0, Math.PI * 2);
    context.ellipse(6, 21, 5.5, 3, 0, 0, Math.PI * 2);
    context.fill();

    // Classic Blue Zip-Up Hoodie Torso + White T-Shirt Center
    context.fillStyle = '#2563eb';
    context.strokeStyle = '#0f172a';
    context.lineWidth = 2.2;
    context.beginPath();
    context.roundRect(-16, 1, 32, 16, 7);
    context.fill();
    context.stroke();
    // White inner t-shirt
    context.fillStyle = '#e2e8f0';
    context.fillRect(-5, 3, 10, 13);
    // Hoodie zip edge lines & pockets (hands tucked in!)
    context.strokeStyle = '#1e3a8a';
    context.lineWidth = 1.6;
    context.beginPath();
    context.moveTo(-5, 3);
    context.lineTo(-5, 16);
    context.moveTo(5, 3);
    context.lineTo(5, 16);
    context.stroke();

    // Fluffy Off-White Hood Fur Trim around neck
    context.fillStyle = '#cbd5e1';
    context.strokeStyle = '#475569';
    context.lineWidth = 1.5;
    [-11, -6, 0, 6, 11].forEach((fx) => {
      context.beginPath();
      context.arc(fx, 2, 4.4, 0, Math.PI * 2);
      context.fill();
    });

    // Iconic Sculpted White Sans Skeleton Skull (wider cheeks + jaw!)
    context.fillStyle = '#f8fafc';
    context.strokeStyle = '#020617';
    context.lineWidth = 2.4;
    context.beginPath();
    context.arc(0, -10, 13.5, Math.PI, 0);
    context.quadraticCurveTo(15.5, -2, 12.5, 1);
    context.lineTo(8.5, 3.5);
    context.lineTo(-8.5, 3.5);
    context.lineTo(-12.5, 1);
    context.quadraticCurveTo(-15.5, -2, -13.5, -10);
    context.closePath();
    context.fill();
    context.stroke();

    // Hollow Black Oval Eye Sockets
    context.fillStyle = '#020617';
    context.beginPath();
    context.ellipse(-5.5, -10.5, 4, 4.2, -0.08, 0, Math.PI * 2);
    context.ellipse(5.5, -10.5, 4.2, 4.4, 0.08, 0, Math.PI * 2);
    context.fill();
    // Right eye tiny white pupil
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.arc(-5.2, -10.5, 1.3, 0, Math.PI * 2);
    context.fill();

    // Inverted-heart/triangle skull nose cavity
    context.fillStyle = '#020617';
    context.beginPath();
    context.moveTo(0, -6.5);
    context.lineTo(-2.3, -3.2);
    context.lineTo(2.3, -3.2);
    context.closePath();
    context.fill();

    // Wide Iconic Skeletal Toothy Grin
    context.strokeStyle = '#020617';
    context.lineWidth = 1.9;
    context.beginPath();
    context.moveTo(-9, -1.2);
    context.quadraticCurveTo(0, 3.6, 9, -1.2);
    context.stroke();
    [-5.5, -2.2, 1.2, 4.8].forEach((tx) => {
      context.beginPath();
      context.moveTo(tx, -1.4);
      context.lineTo(tx, 2.2);
      context.stroke();
    });

    // Blazing Cyan/Yellow Bad-Time Left Eye Flame!
    const eyeFlash = Math.sin(t * 24) > 0 ? '#38bdf8' : '#facc15';
    context.save();
    context.shadowColor = eyeFlash;
    context.shadowBlur = 18;
    context.fillStyle = eyeFlash;
    context.beginPath();
    context.arc(5.5, -10.5, 3.6, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.moveTo(5.5, -14);
    context.quadraticCurveTo(17, -18 + Math.sin(t * 18) * 3, 26, -24 + Math.cos(t * 14) * 3);
    context.quadraticCurveTo(15, -8, 5.5, -7);
    context.closePath();
    context.fillStyle = 'rgba(56, 189, 248, 0.8)';
    context.fill();
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.arc(5.5, -10.5, 1.6, 0, Math.PI * 2);
    context.fill();
    context.restore();
  } else if (hero.id === 'asriel') {
    // 🌈 AUTHENTIC UNDERTALE ASRIEL DREEMURR (GOD OF HYPERDEATH): Rainbow Prism Wings + Goat-Dragon Head + Delta Rune Robe!
    const hueBase = (t * 200) % 360;
    const rainbow1 = `hsl(${Math.floor(hueBase)}, 95%, 64%)`;
    const rainbow2 = `hsl(${Math.floor((hueBase + 120) % 360)}, 95%, 64%)`;
    const rainbow3 = `hsl(${Math.floor((hueBase + 240) % 360)}, 95%, 64%)`;

    // Shimmering 6-Blade Rainbow Hyperdeath Wings behind back!
    context.save();
    context.shadowColor = rainbow1;
    context.shadowBlur = 18;
    [-1, 1].forEach((side) => {
      [
        { ang: -0.45, len: 34, clr: rainbow1 },
        { ang: 0.02, len: 30, clr: rainbow2 },
        { ang: 0.48, len: 24, clr: rainbow3 },
      ].forEach((w, idx) => {
        const flap = Math.sin(t * 6 + idx) * 0.1;
        context.save();
        context.rotate(side * (w.ang + flap));
        context.fillStyle = w.clr;
        context.globalAlpha = 0.78;
        context.beginPath();
        context.moveTo(side * 8, -2);
        context.lineTo(side * (10 + w.len), -10);
        context.lineTo(side * (6 + w.len * 0.78), 4);
        context.closePath();
        context.fill();
        context.restore();
      });
    });
    context.restore();

    // Royal Black-and-Violet Delta Rune Robe + Wide Shoulder Pauldrons
    context.fillStyle = '#1e1b4b';
    context.strokeStyle = '#a855f7';
    context.lineWidth = 2.4;
    context.beginPath();
    context.moveTo(-17, 1);
    context.lineTo(17, 1);
    context.lineTo(15, 22);
    context.lineTo(-15, 22);
    context.closePath();
    context.fill();
    context.stroke();
    // White shoulder mantle collar
    context.fillStyle = '#f8fafc';
    context.strokeStyle = '#94a3b8';
    context.lineWidth = 1.6;
    context.beginPath();
    context.moveTo(-19, 0);
    context.lineTo(-8, 6);
    context.lineTo(0, 10);
    context.lineTo(8, 6);
    context.lineTo(19, 0);
    context.lineTo(14, -4);
    context.lineTo(-14, -4);
    context.closePath();
    context.fill();
    context.stroke();

    // Authentic Golden Delta Rune Emblem on Chest (Winged Orb + 3 Triangles)
    context.fillStyle = '#facc15';
    context.beginPath();
    context.arc(0, 11, 2.5, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.moveTo(-7, 10);
    context.lineTo(-2.5, 11);
    context.lineTo(-5, 13);
    context.moveTo(7, 10);
    context.lineTo(2.5, 11);
    context.lineTo(5, 13);
    context.fill();
    context.beginPath();
    context.moveTo(0, 14);
    context.lineTo(-4.5, 19);
    context.lineTo(4.5, 19);
    context.closePath();
    context.fill();

    // Long White Floppy Dreemurr Goat Ears
    context.fillStyle = '#f8fafc';
    context.strokeStyle = '#64748b';
    context.lineWidth = 2;
    [-1, 1].forEach((side) => {
      context.beginPath();
      context.ellipse(side * 15.5, -5, 4.8, 11.5, side * 0.28, 0, Math.PI * 2);
      context.fill();
      context.stroke();
    });

    // Sculpted Curved Hyperdeath Goat Horns
    context.fillStyle = '#f8fafc';
    context.strokeStyle = '#64748b';
    context.lineWidth = 2;
    [-1, 1].forEach((side) => {
      context.beginPath();
      context.moveTo(side * 6, -18);
      context.quadraticCurveTo(side * 20, -28, side * 11, -34);
      context.quadraticCurveTo(side * 13, -24, side * 2, -20);
      context.closePath();
      context.fill();
      context.stroke();
    });

    // Sculpted White Goat-Dragon Head & Snout
    context.fillStyle = '#ffffff';
    context.strokeStyle = '#0f172a';
    context.lineWidth = 2.2;
    context.beginPath();
    context.arc(0, -11, 12.5, 0, Math.PI * 2);
    context.fill();
    context.stroke();

    // Iconic Vertical Black Hyperdeath Sclera Marks & Rainbow Glowing Eyes!
    context.fillStyle = '#020617';
    context.fillRect(-7.5, -16, 4.5, 11);
    context.fillRect(3, -16, 4.5, 11);
    context.shadowColor = rainbow2;
    context.shadowBlur = 12;
    context.fillStyle = rainbow2;
    context.beginPath();
    context.arc(-5.2, -11.5, 2.2, 0, Math.PI * 2);
    context.arc(5.2, -11.5, 2.2, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;

    // Snout nose & confident smile
    context.fillStyle = '#0f172a';
    context.beginPath();
    context.moveTo(-2, -6.5);
    context.lineTo(2, -6.5);
    context.lineTo(0, -4.5);
    context.closePath();
    context.fill();
    context.strokeStyle = '#0f172a';
    context.lineWidth = 1.6;
    context.beginPath();
    context.moveTo(-4.5, -2.5);
    context.quadraticCurveTo(0, 0.8, 4.5, -2.5);
    context.stroke();
  } else if (hero.id === 'chara') {
    // 🔪 AUTHENTIC UNDERTALE CHARA: Lime-Green & Yellow Striped Sweater + Golden Heart Locket + Brown Bob + Red Eyes + Real Knife!
    // Pulsing Crimson Determination Aura
    context.save();
    context.strokeStyle = '#ef4444';
    context.lineWidth = 2.5;
    context.shadowColor = '#ef4444';
    context.shadowBlur = 18;
    context.beginPath();
    context.arc(0, 0, 27 + Math.sin(t * 10) * 2.5, 0, Math.PI * 2);
    context.stroke();
    context.restore();

    // Dark brown pants & boots
    context.fillStyle = '#451a03';
    context.fillRect(-9, 14, 7, 7);
    context.fillRect(2, 14, 7, 7);

    // Iconic Lime-Green Sweater + Single Thick Bright Yellow Stripe!
    context.fillStyle = '#22c55e';
    context.strokeStyle = '#052e16';
    context.lineWidth = 2.2;
    context.beginPath();
    context.roundRect(-14, 0, 28, 16, 5);
    context.fill();
    context.stroke();
    context.fillStyle = '#facc15';
    context.fillRect(-13, 6.5, 26, 4.5);

    // Golden Heart Locket gleaming at chest!
    context.fillStyle = '#fde047';
    context.strokeStyle = '#92400e';
    context.lineWidth = 1.2;
    drawHeartShape(context, 0, 4.5, 3.8);
    context.fill();
    context.stroke();

    // Gleaming Crimson Real Knife held at right side!
    context.save();
    context.translate(16, 8);
    context.rotate(-0.4 + Math.sin(t * 9) * 0.12);
    context.shadowColor = '#ef4444';
    context.shadowBlur = 10;
    context.fillStyle = '#fef2f2';
    context.strokeStyle = '#ef4444';
    context.lineWidth = 1.8;
    context.beginPath();
    context.moveTo(0, -17);
    context.lineTo(4.5, -2);
    context.lineTo(-2.5, -2);
    context.closePath();
    context.fill();
    context.stroke();
    context.fillStyle = '#facc15';
    context.fillRect(-4, -2, 9, 2.5);
    context.fillStyle = '#1f2937';
    context.fillRect(-1.5, 0.5, 3.5, 7);
    context.restore();

    // Pale Head + Chin-Length Brown Bob Hair
    context.fillStyle = '#78350f';
    context.strokeStyle = '#451a03';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(0, -11, 14.5, Math.PI * 0.88, Math.PI * 2.12);
    context.lineTo(15, 2);
    context.lineTo(-15, 2);
    context.closePath();
    context.fill();
    context.stroke();

    // Face
    context.fillStyle = '#fef3c7';
    context.beginPath();
    context.arc(0, -9.5, 11.2, 0, Math.PI * 2);
    context.fill();

    // Brown Bangs sweeping across forehead
    context.fillStyle = '#78350f';
    context.beginPath();
    context.arc(0, -12, 12.2, Math.PI, 0);
    context.lineTo(11, -11);
    context.lineTo(5, -14.5);
    context.lineTo(1, -10.5);
    context.lineTo(-4, -14.5);
    context.lineTo(-11, -11);
    context.closePath();
    context.fill();

    // Iconic Bright Rosy Pink Cheeks
    context.fillStyle = '#fb7185';
    context.beginPath();
    context.ellipse(-7.5, -6, 3.2, 2.2, 0, 0, Math.PI * 2);
    context.ellipse(7.5, -6, 3.2, 2.2, 0, 0, Math.PI * 2);
    context.fill();

    // Intense Glowing Crimson Determination Eyes
    context.shadowColor = '#ef4444';
    context.shadowBlur = 10;
    context.fillStyle = '#dc2626';
    context.fillRect(-6.5, -12.5, 3.8, 4.8);
    context.fillRect(2.7, -12.5, 3.8, 4.8);
    context.fillStyle = '#ffffff';
    context.fillRect(-5.6, -11.6, 1.3, 1.4);
    context.fillRect(3.6, -11.6, 1.3, 1.4);
    context.shadowBlur = 0;

    // Haunting Wide Smile
    context.strokeStyle = '#450a0a';
    context.lineWidth = 1.8;
    context.beginPath();
    context.moveTo(-5.5, -4);
    context.quadraticCurveTo(0, 0, 5.5, -4);
    context.stroke();
  } else if (hero.id === 'omegaFlowey') {
    // 🌻 AUTHENTIC OMEGA (PHOTOSHOP) FLOWEY: 6 Orbiting Heart Human Souls + Thrashing Thorny Vines + Giant Flytrap Maw + CRT TV Head!
    const soulColors = ['#ef4444', '#fb923c', '#facc15', '#22c55e', '#38bdf8', '#a855f7'];
    // 6 Orbiting Authentic Heart-Shaped Human Souls!
    soulColors.forEach((sc, idx) => {
      const sa = t * 2.5 + (Math.PI * 2 * idx) / 6;
      const sx = Math.cos(sa) * 34;
      const sy = Math.sin(sa) * 34;
      context.save();
      context.shadowColor = sc;
      context.shadowBlur = 12;
      context.fillStyle = sc;
      context.strokeStyle = '#ffffff';
      context.lineWidth = 1.2;
      drawHeartShape(context, sx, sy, 5.4);
      context.fill();
      context.stroke();
      context.restore();
    });

    // Thrashing Dark-Green Thorny Plant-Arms / Vines on Left & Right
    [-1, 1].forEach((side) => {
      const sway = Math.sin(t * 9 + side * 2) * 5;
      context.strokeStyle = '#15803d';
      context.lineWidth = 5;
      context.lineCap = 'round';
      context.beginPath();
      context.moveTo(side * 12, 4);
      context.quadraticCurveTo(side * 26, -6 + sway, side * 34, 8 - sway * 0.6);
      context.stroke();
      // Vine claws / thorns
      context.fillStyle = '#84cc16';
      context.beginPath();
      context.arc(side * 34, 8 - sway * 0.6, 4.5, 0, Math.PI * 2);
      context.fill();
    });

    // Organic-Mechanical Base Stem & Red Ribbed Pipes
    context.fillStyle = '#14532d';
    context.strokeStyle = '#22c55e';
    context.lineWidth = 2;
    context.beginPath();
    context.roundRect(-14, 3, 28, 17, 6);
    context.fill();
    context.stroke();
    // Red nightmare pipes
    context.strokeStyle = '#dc2626';
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(-14, 8);
    context.quadraticCurveTo(-22, 14, -12, 20);
    context.moveTo(14, 8);
    context.quadraticCurveTo(22, 14, 12, 20);
    context.stroke();

    // Giant Toothed Venus-Flytrap Lower Maw!
    context.fillStyle = '#450a0a';
    context.beginPath();
    context.ellipse(0, 12, 11, 6, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#ffffff';
    [-7, -2.5, 2.5, 7].forEach((tx) => {
      context.beginPath();
      context.moveTo(tx - 2, 7.5);
      context.lineTo(tx, 12);
      context.lineTo(tx + 2, 7.5);
      context.closePath();
      context.fill();
    });

    // Golden Jagged Petals framing the CRT TV Head
    context.fillStyle = '#facc15';
    context.strokeStyle = '#a16207';
    context.lineWidth = 1.5;
    for (let p = 0; p < 6; p += 1) {
      const pa = (Math.PI * 2 * p) / 6 + Math.sin(t * 3) * 0.1;
      context.beginPath();
      context.arc(Math.cos(pa) * 18, -8 + Math.sin(pa) * 15, 6.2, 0, Math.PI * 2);
      context.fill();
      context.stroke();
    }

    // CRT TV Rabbit-Ear Antennas!
    context.strokeStyle = '#cbd5e1';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(-4, -22);
    context.lineTo(-14, -32);
    context.moveTo(4, -22);
    context.lineTo(14, -32);
    context.stroke();
    context.fillStyle = '#ef4444';
    context.beginPath();
    context.arc(-14, -32, 2.4, 0, Math.PI * 2);
    context.arc(14, -32, 2.4, 0, Math.PI * 2);
    context.fill();

    // Iconic Heavy Retro CRT TV Monitor Head!
    context.fillStyle = '#1e293b';
    context.strokeStyle = '#94a3b8';
    context.lineWidth = 2.6;
    context.beginPath();
    context.roundRect(-17, -23, 34, 26, 5);
    context.fill();
    context.stroke();
    // Flickering Static CRT Screen
    const staticFlash = Math.sin(t * 32) > 0;
    context.fillStyle = staticFlash ? '#f8fafc' : '#cbd5e1';
    context.fillRect(-13.5, -19.5, 27, 19);
    // Scanlines
    context.fillStyle = 'rgba(15, 23, 42, 0.12)';
    for (let sy = -18; sy < 0; sy += 3) {
      context.fillRect(-13.5, sy, 27, 1);
    }
    // Creepy Wide Manic Eyes & Laughing Jagged Grin on TV Screen!
    context.fillStyle = '#0f172a';
    context.fillRect(-10, -16, 6.5, 6);
    context.fillRect(3.5, -16, 6.5, 6);
    context.fillStyle = '#ef4444';
    context.fillRect(-8, -14.5, 3, 3);
    context.fillRect(5.5, -14.5, 3, 3);
    context.fillStyle = '#0f172a';
    context.beginPath();
    context.moveTo(-10, -7);
    context.quadraticCurveTo(0, -1, 10, -7);
    context.quadraticCurveTo(0, -4, -10, -7);
    context.fill();
  } else if (hero.id === 'undying') {
    // 🛡️ AUTHENTIC UNDYNE THE UNDYING: Green Soul Fortress + Spiked Royal Guard Armor + Red Ponytail + Red Side-Fins + Blazing Left-Eye Spear!
    // Green Soul Immovable Fortress Barrier Ring at feet
    context.save();
    context.strokeStyle = '#22c55e';
    context.lineWidth = 3.5;
    context.shadowColor = '#22c55e';
    context.shadowBlur = 18;
    context.beginPath();
    context.arc(0, 2, 31, 0, Math.PI * 2);
    context.stroke();
    context.setLineDash([7, 7]);
    context.lineWidth = 2;
    context.beginPath();
    context.arc(0, 2, 38, t * 1.6, t * 1.6 + Math.PI * 2);
    context.stroke();
    context.setLineDash([]);
    // Glowing Green Soul Heart emblem in front
    context.fillStyle = '#22c55e';
    drawHeartShape(context, 0, 27, 5);
    context.fill();
    context.restore();

    // Glowing Cyan Spear of Justice held diagonally at her side!
    context.save();
    context.translate(18, 2);
    context.rotate(-0.55);
    context.shadowColor = '#38bdf8';
    context.shadowBlur = 14;
    context.strokeStyle = '#38bdf8';
    context.lineWidth = 3.2;
    context.beginPath();
    context.moveTo(0, 18);
    context.lineTo(0, -24);
    context.stroke();
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.moveTo(0, -32);
    context.lineTo(5, -20);
    context.lineTo(0, -23);
    context.lineTo(-5, -20);
    context.closePath();
    context.fill();
    context.restore();

    // Huge Streaming Fiery Crimson Ponytail!
    context.fillStyle = '#dc2626';
    context.strokeStyle = '#7f1d1d';
    context.lineWidth = 1.8;
    context.beginPath();
    context.moveTo(-2, -21);
    context.quadraticCurveTo(-18, -36 + Math.sin(t * 10) * 3, -30, -20 + Math.cos(t * 9) * 3);
    context.quadraticCurveTo(-17, -14, -3, -16);
    context.closePath();
    context.fill();
    context.stroke();

    // Dark Metallic Spiked Royal Guard Armor Torso + Shoulder Pauldrons!
    context.fillStyle = '#1e293b';
    context.strokeStyle = '#94a3b8';
    context.lineWidth = 2.2;
    // Spiked shoulder plates
    [-1, 1].forEach((side) => {
      context.beginPath();
      context.moveTo(side * 10, 0);
      context.lineTo(side * 22, -4);
      context.lineTo(side * 18, 8);
      context.lineTo(side * 10, 8);
      context.closePath();
      context.fill();
      context.stroke();
    });
    // Chestplate
    context.beginPath();
    context.roundRect(-13, 0, 26, 20, 5);
    context.fill();
    context.stroke();
    // Iconic White Heart Crest on Armor Chest!
    context.fillStyle = '#ffffff';
    drawHeartShape(context, 0, 9.5, 5.2);
    context.fill();

    // Red Aquatic Side-Fins on both sides of head!
    context.fillStyle = '#ef4444';
    context.strokeStyle = '#7f1d1d';
    context.lineWidth = 1.5;
    [-1, 1].forEach((side) => {
      context.beginPath();
      context.moveTo(side * 10, -13);
      context.lineTo(side * 19, -16);
      context.lineTo(side * 17, -8);
      context.lineTo(side * 10, -7);
      context.closePath();
      context.fill();
      context.stroke();
    });

    // Cyan-Blue Scaly Warrior Head
    context.fillStyle = '#38bdf8';
    context.strokeStyle = '#0c4a6e';
    context.lineWidth = 2.2;
    context.beginPath();
    context.arc(0, -11, 11.8, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    // Red hair swept across top
    context.fillStyle = '#dc2626';
    context.beginPath();
    context.arc(0, -14, 11.5, Math.PI * 1.1, Math.PI * 1.9);
    context.closePath();
    context.fill();

    // Fierce Yellow Cat-Slit Right Eye
    context.fillStyle = '#facc15';
    context.beginPath();
    context.ellipse(-5, -11, 3.6, 2.6, 0.15, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#0f172a';
    context.fillRect(-5.6, -13, 1.4, 4);

    // Fierce Fanged Warrior Grin!
    context.fillStyle = '#ffffff';
    context.strokeStyle = '#0f172a';
    context.lineWidth = 1.4;
    context.beginPath();
    context.moveTo(-6, -5);
    context.quadraticCurveTo(0, -2, 6, -5);
    context.lineTo(4, -2.5);
    context.lineTo(-4, -2.5);
    context.closePath();
    context.fill();
    context.stroke();

    // ICONIC UNDYING BLAZING CYAN SPEAR OF LIGHT BURSTING FROM LEFT EYE!
    context.save();
    context.shadowColor = '#38bdf8';
    context.shadowBlur = 22;
    context.strokeStyle = '#38bdf8';
    context.lineWidth = 3.8;
    context.beginPath();
    context.moveTo(4, -11);
    context.lineTo(30, -18 + Math.sin(t * 22) * 1.6);
    context.stroke();
    context.strokeStyle = '#ffffff';
    context.lineWidth = 1.6;
    context.beginPath();
    context.moveTo(4, -11);
    context.lineTo(27, -17 + Math.sin(t * 22) * 1.6);
    context.stroke();
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.arc(5, -11, 3.8, 0, Math.PI * 2);
    context.fill();
    context.restore();
  } else if (hero.id === 'mettatonNeo') {
    // 🌟 AUTHENTIC METTATON NEO: Giant Hot-Pink Mechanical NEO Wings + Spiked Pauldrons + Glowing Pink Heart Core + NEO Arm Cannon + Swept Black Hair!
    // Glamorous Hot-Pink & Gold Stage Spotlight Aura
    context.save();
    context.strokeStyle = Math.sin(t * 14) > 0 ? '#ec4899' : '#facc15';
    context.lineWidth = 2.4;
    context.shadowColor = '#ec4899';
    context.shadowBlur = 16;
    context.beginPath();
    context.arc(0, 0, 29 + Math.sin(t * 9) * 2.2, 0, Math.PI * 2);
    context.stroke();
    context.restore();

    // Giant Jagged Hot-Pink Mechanical NEO Wings flaring behind back!
    context.save();
    context.shadowColor = '#ec4899';
    context.shadowBlur = 16;
    [-1, 1].forEach((side) => {
      const wingSway = Math.sin(t * 7 + side) * 0.08;
      context.save();
      context.rotate(side * wingSway);
      context.fillStyle = '#ec4899';
      context.strokeStyle = '#fdf2f8';
      context.lineWidth = 1.8;
      context.beginPath();
      context.moveTo(side * 8, -2);
      context.lineTo(side * 36, -18);
      context.lineTo(side * 28, -4);
      context.lineTo(side * 38, 4);
      context.lineTo(side * 22, 7);
      context.lineTo(side * 30, 17);
      context.lineTo(side * 10, 10);
      context.closePath();
      context.fill();
      context.stroke();
      context.restore();
    });
    context.restore();

    // High-Heeled Hot-Pink Armored Legs
    context.fillStyle = '#18181b';
    context.fillRect(-7, 15, 5, 7);
    context.fillRect(2, 15, 5, 7);
    context.fillStyle = '#ec4899';
    context.fillRect(-7, 19, 5, 3);
    context.fillRect(2, 19, 5, 3);

    // Sleek Black Metallic Armor Torso + Sharp Winged Shoulder Pauldrons
    context.fillStyle = '#18181b';
    context.strokeStyle = '#f472b6';
    context.lineWidth = 2.2;
    [-1, 1].forEach((side) => {
      context.beginPath();
      context.moveTo(side * 9, 0);
      context.lineTo(side * 22, -7);
      context.lineTo(side * 19, 6);
      context.lineTo(side * 9, 7);
      context.closePath();
      context.fill();
      context.stroke();
    });
    context.beginPath();
    context.roundRect(-12, 0, 24, 17, 5);
    context.fill();
    context.stroke();
    // Iconic Glowing Hot-Pink Heart Core in Chest!
    context.save();
    context.shadowColor = '#ec4899';
    context.shadowBlur = 12;
    context.fillStyle = '#ec4899';
    context.strokeStyle = '#ffffff';
    context.lineWidth = 1.2;
    drawHeartShape(context, 0, 8.5, 4.8);
    context.fill();
    context.stroke();
    context.restore();

    // Glowing NEO Arm Cannon on Right Arm!
    context.save();
    context.translate(15, 5);
    context.rotate(-0.2);
    context.fillStyle = '#334155';
    context.strokeStyle = '#ec4899';
    context.lineWidth = 2;
    context.beginPath();
    context.roundRect(-3, -4, 18, 9, 3);
    context.fill();
    context.stroke();
    context.shadowColor = '#38bdf8';
    context.shadowBlur = 12;
    context.fillStyle = '#38bdf8';
    context.beginPath();
    context.arc(16, 0.5, 3.6, 0, Math.PI * 2);
    context.fill();
    context.restore();

    // Pale Metallic Robot Face
    context.fillStyle = '#f8fafc';
    context.strokeStyle = '#18181b';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(0, -11, 11.2, 0, Math.PI * 2);
    context.fill();
    context.stroke();

    // Iconic Dramatic Swept Black Hair Covering Right Eye!
    context.fillStyle = '#09090b';
    context.beginPath();
    context.arc(0, -13, 12.2, Math.PI * 0.9, Math.PI * 2.08);
    context.lineTo(13, -6);
    context.lineTo(7, -14);
    context.lineTo(1, -5);
    context.lineTo(-10, -4);
    context.lineTo(-13, -9);
    context.closePath();
    context.fill();

    // Piercing Glowing Hot-Pink Left Eye + Star Glint!
    context.save();
    context.shadowColor = '#ec4899';
    context.shadowBlur = 12;
    context.fillStyle = '#ec4899';
    context.beginPath();
    context.ellipse(5, -10.5, 3.4, 2.4, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.arc(5, -10.5, 1.3, 0, Math.PI * 2);
    context.fill();
    context.restore();

    // Confident Glam Showman Grin
    context.strokeStyle = '#09090b';
    context.lineWidth = 1.6;
    context.beginPath();
    context.moveTo(-4, -5);
    context.quadraticCurveTo(1, -2.5, 6, -5.5);
    context.stroke();
  } else if (hero.id === 'forsaken') {
    // 👁️ AUTHENTIC FORSAKEN: Corrupted Glitch Aura + Tattered Void Cloak + Jagged Obsidian Crown + Single Piercing Crimson Void Eye!
    // Pulsing Crimson/Toxic-Green Glitch Aura
    context.save();
    context.strokeStyle = Math.sin(t * 16) > 0 ? '#ef4444' : '#22c55e';
    context.lineWidth = 2.6;
    context.shadowColor = '#ef4444';
    context.shadowBlur = 18;
    context.beginPath();
    context.arc(0, 0, 28 + Math.sin(t * 10) * 2.5, 0, Math.PI * 2);
    context.stroke();
    // Floating Glitch Artifact Bars
    context.fillStyle = '#22c55e';
    context.fillRect(-26, -8 + Math.sin(t * 24) * 5, 8, 2.5);
    context.fillRect(19, 9 + Math.cos(t * 20) * 4, 7, 2.5);
    context.fillStyle = '#ef4444';
    context.fillRect(18, -11 + Math.cos(t * 22) * 5, 9, 2.5);
    context.fillRect(-24, 10 + Math.sin(t * 19) * 4, 7, 2.5);
    context.restore();

    // Tattered Pitch-Black Void Cloak with Glowing Crimson Rim
    context.fillStyle = '#09090b';
    context.strokeStyle = '#ef4444';
    context.lineWidth = 2.2;
    context.beginPath();
    context.moveTo(-16, -2);
    context.lineTo(16, -2);
    context.lineTo(19, 22);
    context.lineTo(9, 16);
    context.lineTo(0, 24);
    context.lineTo(-9, 16);
    context.lineTo(-19, 22);
    context.closePath();
    context.fill();
    context.stroke();

    // Floating Dark Void Blade beside them
    context.save();
    context.translate(20, 4 + Math.sin(t * 8) * 3);
    context.rotate(0.28);
    context.shadowColor = '#22c55e';
    context.shadowBlur = 12;
    context.fillStyle = '#18181b';
    context.strokeStyle = '#22c55e';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(0, -19);
    context.lineTo(4.5, 2);
    context.lineTo(0, 7);
    context.lineTo(-4.5, 2);
    context.closePath();
    context.fill();
    context.stroke();
    context.restore();

    // Void Hooded Head
    context.fillStyle = '#09090b';
    context.strokeStyle = '#ef4444';
    context.lineWidth = 2.4;
    context.beginPath();
    context.arc(0, -10, 13.2, 0, Math.PI * 2);
    context.fill();
    context.stroke();

    // Hovering Jagged Shadow Crown
    context.fillStyle = '#18181b';
    context.strokeStyle = '#ef4444';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(-13, -19);
    context.lineTo(-11, -33);
    context.lineTo(-4, -24);
    context.lineTo(0, -36);
    context.lineTo(4, -24);
    context.lineTo(11, -33);
    context.lineTo(13, -19);
    context.closePath();
    context.fill();
    context.stroke();

    // Single Massive Piercing Crimson Eye of the Void!
    context.save();
    context.shadowColor = '#ef4444';
    context.shadowBlur = 18;
    context.fillStyle = '#ef4444';
    context.beginPath();
    context.ellipse(0, -10, 9.2, 5.4, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#fef2f2';
    context.beginPath();
    context.ellipse(0, -10, 4.5, 4.4, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#09090b';
    context.beginPath();
    context.ellipse(0, -10, 1.8, 4.4, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
  } else {
    // ===== UPGRADED 6 BASE HEROES (Full Head + Armored/Styled Torso + Iconic Gear!) =====
    // Torso / Outfit
    context.fillStyle = hero.body;
    context.strokeStyle = hero.stroke;
    context.lineWidth = 2.4;
    context.beginPath();
    context.roundRect(-13, 1, 26, 18, 6);
    context.fill();
    context.stroke();

    // Hero-specific Back Cloaks / Weapons / Gear behind head
    if (hero.id === 'ninja') {
      // Crossed twin katana hilts behind back
      context.strokeStyle = '#e2e8f0';
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(-15, -20);
      context.lineTo(14, 12);
      context.moveTo(15, -20);
      context.lineTo(-14, 12);
      context.stroke();
      // Fluttering crimson ninja scarf tail
      context.fillStyle = '#ef4444';
      context.beginPath();
      context.moveTo(11, -6);
      context.lineTo(29, -12 + Math.sin(t * 14) * 3.5);
      context.lineTo(25, -1 + Math.cos(t * 12) * 2.5);
      context.closePath();
      context.fill();
    } else if (hero.id === 'vampire') {
      // High-collared aristocratic bat-wing crimson cape!
      context.fillStyle = '#881337';
      context.strokeStyle = '#fda4af';
      context.lineWidth = 1.8;
      context.beginPath();
      context.moveTo(-15, 2);
      context.lineTo(-26, -15);
      context.lineTo(-10, -7);
      context.lineTo(10, -7);
      context.lineTo(26, -15);
      context.lineTo(15, 2);
      context.lineTo(20, 19);
      context.lineTo(0, 14);
      context.lineTo(-20, 19);
      context.closePath();
      context.fill();
      context.stroke();
    } else if (hero.id === 'titan') {
      // Massive broad steel juggernaut shoulder pauldrons
      context.fillStyle = '#115e59';
      context.strokeStyle = '#99f6e4';
      context.lineWidth = 2.2;
      context.beginPath();
      context.roundRect(-21, -1, 11, 13, 4);
      context.roundRect(10, -1, 11, 13, 4);
      context.fill();
      context.stroke();
      // Glowing emerald chest core
      context.fillStyle = '#34d399';
      context.beginPath();
      context.arc(0, 10, 4, 0, Math.PI * 2);
      context.fill();
    }

    // Head Base
    const skinTone = hero.id === 'vampire' ? '#f1f5f9'
      : hero.id === 'commando' ? '#fde68a'
        : hero.body;
    context.fillStyle = skinTone;
    context.strokeStyle = hero.stroke;
    context.lineWidth = 2.4;
    context.beginPath();
    context.arc(0, -10, 12.2, 0, Math.PI * 2);
    context.fill();
    context.stroke();

    // Hero-specific Helmets, Hats, Visors & Faces
    if (hero.id === 'commando') {
      // Tactical Combat Helmet + Golden Band & Star
      context.fillStyle = '#1d4ed8';
      context.beginPath();
      context.arc(0, -12, 13, Math.PI, 0);
      context.closePath();
      context.fill();
      context.fillStyle = '#facc15';
      context.fillRect(-13, -14, 26, 4);
      // Determined eyes
      context.fillStyle = '#0f172a';
      context.fillRect(-6, -9, 3.6, 3.6);
      context.fillRect(2.4, -9, 3.6, 3.6);
    } else if (hero.id === 'ninja') {
      // Dark Shinobi Hood & Crimson Headband
      context.fillStyle = '#ef4444';
      context.fillRect(-12, -16, 24, 4.5);
      // Glowing golden ninja eyes in dark slit
      context.fillStyle = '#020617';
      context.fillRect(-9, -11, 18, 5);
      context.fillStyle = '#fef08a';
      context.fillRect(-6.5, -9.8, 4.5, 2.5);
      context.fillRect(2, -9.8, 4.5, 2.5);
    } else if (hero.id === 'titan') {
      // Armored Horned Helmet + Glowing Emerald T-Visor
      context.fillStyle = '#99f6e4';
      [-1, 1].forEach((side) => {
        context.beginPath();
        context.moveTo(side * 9, -16);
        context.lineTo(side * 17, -26);
        context.lineTo(side * 5, -20);
        context.closePath();
        context.fill();
      });
      context.fillStyle = '#0f172a';
      context.fillRect(-9, -13, 18, 6);
      context.fillRect(-3, -10, 6, 8);
      context.fillStyle = '#34d399';
      context.fillRect(-7.5, -11.5, 15, 3);
    } else if (hero.id === 'pyro') {
      // Blazing Flame Crown & Fiery Battle-Mage Eyes!
      context.shadowColor = '#f97316';
      context.shadowBlur = 12;
      context.fillStyle = '#facc15';
      context.beginPath();
      context.moveTo(-11, -17);
      context.lineTo(-7, -30 + Math.sin(t * 16) * 2);
      context.lineTo(-1, -21);
      context.lineTo(3, -32 + Math.cos(t * 14) * 2);
      context.lineTo(9, -22);
      context.lineTo(12, -28);
      context.lineTo(11, -17);
      context.closePath();
      context.fill();
      context.shadowBlur = 0;
      context.fillStyle = '#fef08a';
      context.fillRect(-6.5, -11, 4, 3.5);
      context.fillRect(2.5, -11, 4, 3.5);
    } else if (hero.id === 'cyber') {
      // Sleek Chrome-Cyan Cyber Visor + Antenna
      context.strokeStyle = '#38bdf8';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(10, -16);
      context.lineTo(15, -27);
      context.stroke();
      context.fillStyle = '#38bdf8';
      context.beginPath();
      context.arc(15, -27, 2.5, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#0f172a';
      context.beginPath();
      context.roundRect(-11, -14, 22, 8, 3);
      context.fill();
      context.shadowColor = '#38bdf8';
      context.shadowBlur = 10;
      context.fillStyle = '#38bdf8';
      context.fillRect(-9, -11.5, 18, 3.2);
      context.shadowBlur = 0;
    } else if (hero.id === 'vampire') {
      // Slicked dark hair with Widow's Peak + Ruby Eyes + Fangs!
      context.fillStyle = '#1e1b4b';
      context.beginPath();
      context.arc(0, -13, 12.5, Math.PI, 0);
      context.lineTo(6, -13);
      context.lineTo(0, -10);
      context.lineTo(-6, -13);
      context.closePath();
      context.fill();
      context.shadowColor = '#f43f5e';
      context.shadowBlur = 8;
      context.fillStyle = '#f43f5e';
      context.fillRect(-6.5, -10.5, 3.8, 3.2);
      context.fillRect(2.7, -10.5, 3.8, 3.2);
      context.shadowBlur = 0;
      context.fillStyle = '#ffffff';
      context.fillRect(-4, -5, 2, 3);
      context.fillRect(2, -5, 2, 3);
    }

    // Awakened Gaster Blaster eye flame if a base hero wields Gaster Blaster
    if (player.sansMode && weapon?.id === 'gaster') {
      const eyeFlash = Math.sin(t * 24) > 0 ? '#38bdf8' : '#facc15';
      context.save();
      context.shadowColor = eyeFlash;
      context.shadowBlur = 16;
      context.fillStyle = eyeFlash;
      context.beginPath();
      context.arc(4.5, -10, 3.6, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
  }

  context.restore();
}

function drawUltimateCutscene(context, cs, w, h) {
  const elapsed = cs.maxTimer - cs.timer;
  const enterT = clamp(elapsed / 0.16, 0, 1);
  const exitT = cs.timer < 0.3 ? clamp(cs.timer / 0.3, 0, 1) : 1;
  const easeOut = 1 - Math.pow(1 - enterT, 3);
  const impactElapsed = cs.impactAt - cs.timer;
  const impactActive = impactElapsed >= 0;
  const impactBurstT = impactActive ? clamp(impactElapsed / 0.28, 0, 1) : 0;
  const alpha = exitT;
  const cy = h * 0.5;

  // Dynamic micro camera shake on entrance slam & impact detonation
  let shakeMag = 0;
  if (elapsed < 0.18) shakeMag = (1 - elapsed / 0.18) * 10;
  else if (impactActive && impactElapsed < 0.22) shakeMag = (1 - impactElapsed / 0.22) * 14;
  else if (cs.charaMode || cs.floweyMode || cs.forsakenMode) shakeMag = 2.2;
  const sxOff = shakeMag ? Math.sin(elapsed * 95) * shakeMag : 0;
  const syOff = shakeMag ? Math.cos(elapsed * 83) * shakeMag * 0.7 : 0;

  const dynAccent = cs.rainbowMode
    ? `hsl(${Math.floor((elapsed * 320) % 360)}, 95%, 64%)`
    : cs.accent;
  const dynAccent2 = cs.rainbowMode
    ? `hsl(${Math.floor((elapsed * 320 + 150) % 360)}, 95%, 64%)`
    : cs.forsakenMode
      ? '#22c55e'
      : cs.undyingMode
        ? '#22c55e'
        : '#ffffff';

  context.save();
  context.globalAlpha = alpha;
  context.translate(sxOff, syOff);

  // 1. Deep Atmospheric Dramatic Backdrop + Radial Spotlight
  const bgGrad = context.createRadialGradient(w * 0.25, cy, 20, w * 0.5, cy, Math.max(w, h) * 0.85);
  bgGrad.addColorStop(0, cs.bg);
  bgGrad.addColorStop(0.55, 'rgba(2, 6, 23, 0.9)');
  bgGrad.addColorStop(1, 'rgba(0, 0, 0, 0.96)');
  context.fillStyle = bgGrad;
  context.fillRect(-24, -24, w + 48, h + 48);

  // 1B. Character-Specific Full-Screen Environmental Stage VFX!
  context.save();
  if (cs.sansMode) {
    // Golden Judgment Hall diagonal cathedral light shafts!
    for (let p = 0; p < 5; p += 1) {
      const bx = w * (0.06 + p * 0.22);
      const shaftGrad = context.createLinearGradient(bx, 0, bx + 120, h);
      shaftGrad.addColorStop(0, 'rgba(250, 204, 21, 0.24)');
      shaftGrad.addColorStop(0.6, 'rgba(56, 189, 248, 0.10)');
      shaftGrad.addColorStop(1, 'rgba(2, 6, 23, 0)');
      context.fillStyle = shaftGrad;
      context.beginPath();
      context.moveTo(bx, 0);
      context.lineTo(bx + 76, 0);
      context.lineTo(bx + 190, h);
      context.lineTo(bx + 90, h);
      context.closePath();
      context.fill();
    }
  } else if (cs.rainbowMode) {
    // Asriel Cosmic Prismatic Aurora Waves & Twinkling Stars!
    for (let i = 0; i < 6; i += 1) {
      const hue = Math.floor((elapsed * 260 + i * 60) % 360);
      context.strokeStyle = `hsla(${hue}, 95%, 64%, 0.22)`;
      context.lineWidth = 22;
      context.beginPath();
      context.moveTo(-20, h * (0.14 + i * 0.14) + Math.sin(elapsed * 6 + i) * 34);
      context.bezierCurveTo(
        w * 0.33,
        h * (0.08 + i * 0.15) - Math.cos(elapsed * 5 + i) * 48,
        w * 0.66,
        h * (0.2 + i * 0.12) + Math.sin(elapsed * 7 + i) * 42,
        w + 20,
        h * (0.12 + i * 0.14),
      );
      context.stroke();
    }
  } else if (cs.charaMode) {
    // Chara Cascading Crimson "9999999" Genocide Matrix & Red Screen Glitch!
    context.font = '900 22px monospace';
    context.fillStyle = 'rgba(239, 68, 68, 0.22)';
    for (let r = 0; r < 10; r += 1) {
      const yPos = ((r * 74 + elapsed * 240) % (h + 60)) - 30;
      const xShift = Math.sin(elapsed * 26 + r) * 14;
      context.fillText('9999999   ERASE   9999999   LV.20   9999999   9999999', -40 + xShift, yPos);
    }
  } else if (cs.floweyMode) {
    // Omega Flowey TV Static Glitch Bars + Flashing SAVE / LOAD Watermarks!
    for (let g = 0; g < 16; g += 1) {
      const gy = ((g * 53 + Math.floor(elapsed * 420)) % h);
      context.fillStyle = g % 3 === 0 ? 'rgba(239, 68, 68, 0.22)' : 'rgba(250, 204, 21, 0.14)';
      context.fillRect(0, gy, w, 3 + (g % 4) * 2);
    }
    context.font = '900 34px monospace';
    context.fillStyle = Math.sin(elapsed * 32) > 0 ? 'rgba(250, 204, 21, 0.24)' : 'rgba(239, 68, 68, 0.24)';
    context.fillText('SAVE FILE LOADED // YOUR BEST NIGHTMARE', w * 0.12, h * 0.2);
    context.fillText('HAHAHA // SAVE // LOAD // HAHAHA', w * 0.22, h * 0.84);
  } else if (cs.forsakenMode) {
    // Forsaken Corrupted Crimson & Toxic-Green Void Glitch Tears!
    for (let g = 0; g < 14; g += 1) {
      const gy = ((g * 61 + Math.floor(elapsed * 300)) % h);
      const gx = ((g * 197 + Math.floor(elapsed * 900)) % w) - 100;
      context.fillStyle = g % 2 === 0 ? 'rgba(239, 68, 68, 0.26)' : 'rgba(34, 197, 94, 0.24)';
      context.fillRect(gx, gy, 160 + (g % 4) * 60, 4 + (g % 3) * 3);
    }
  } else if (cs.undyingMode) {
    // Undyne Blazing Cyan Diagonal Heroic Spear-Light Beams!
    for (let i = 0; i < 8; i += 1) {
      const ox = ((i * 180 + elapsed * 580) % (w + 300)) - 150;
      context.strokeStyle = i % 2 === 0 ? 'rgba(56, 189, 248, 0.26)' : 'rgba(34, 197, 94, 0.22)';
      context.lineWidth = i % 2 === 0 ? 5 : 3;
      context.beginPath();
      context.moveTo(ox, 0);
      context.lineTo(ox - 240, h);
      context.stroke();
    }
  } else if (cs.neoMode) {
    // Mettaton NEO Sweeping Glam Concert Spotlights & Ratings Marquee!
    for (let i = 0; i < 4; i += 1) {
      const sx = w * (0.15 + i * 0.24);
      const sway = Math.sin(elapsed * 5 + i * 1.4) * 140;
      const spotGrad = context.createLinearGradient(sx, 0, sx + sway, h);
      spotGrad.addColorStop(0, i % 2 === 0 ? 'rgba(236, 72, 153, 0.32)' : 'rgba(56, 189, 248, 0.26)');
      spotGrad.addColorStop(1, 'rgba(0,0,0,0)');
      context.fillStyle = spotGrad;
      context.beginPath();
      context.moveTo(sx - 28, 0);
      context.lineTo(sx + 28, 0);
      context.lineTo(sx + sway + 140, h);
      context.lineTo(sx + sway - 140, h);
      context.closePath();
      context.fill();
    }
    context.font = '900 26px monospace';
    context.fillStyle = 'rgba(250, 204, 21, 0.24)';
    context.fillText('★ RATINGS: 999999 ★ SHOWTIME ★ POWER OF "NEO" ★', w * 0.14, h * 0.2);
  }
  context.restore();

  // 2. High-Contrast Anime Manga Radial Speed-Lines (56 dynamic rays!)
  context.save();
  context.translate(w * 0.24, cy);
  for (let i = 0; i < 56; i += 1) {
    const a = (Math.PI * 2 * i) / 56 + elapsed * 1.65;
    const inner = 68 + ((i * 41) % 105);
    const outer = Math.max(w, h) * 1.2;
    context.strokeStyle = i % 4 === 0 ? '#ffffff' : i % 2 === 0 ? dynAccent : dynAccent2;
    context.globalAlpha = alpha * (i % 4 === 0 ? 0.42 : i % 2 === 0 ? 0.24 : 0.14);
    context.lineWidth = i % 5 === 0 ? 4.2 : i % 2 === 0 ? 2.1 : 1.1;
    context.beginPath();
    context.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
    context.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
    context.stroke();
  }
  context.restore();

  // 3. Dramatic Diagonal Cut-In Slash Band (Wider, sharper, cinematic glow!)
  const bandHalfH = (h * 0.275) * easeOut;
  const tilt = h * 0.085;
  context.save();
  const bandGrad = context.createLinearGradient(0, cy - bandHalfH, w, cy + bandHalfH);
  bandGrad.addColorStop(0, cs.bg);
  bandGrad.addColorStop(0.42, cs.sansMode ? '#0b1636' : cs.bg);
  bandGrad.addColorStop(0.85, '#090d1f');
  bandGrad.addColorStop(1, '#020617');
  context.fillStyle = bandGrad;
  context.beginPath();
  context.moveTo(-24, cy - bandHalfH + tilt);
  context.lineTo(w + 24, cy - bandHalfH - tilt);
  context.lineTo(w + 24, cy + bandHalfH - tilt);
  context.lineTo(-24, cy + bandHalfH + tilt);
  context.closePath();
  context.fill();

  // Clip high-speed streaks, geometric shards & hero portrait inside slash band
  context.save();
  context.clip();

  // High-speed anime streak beams + flying glowing shards
  for (let s = 0; s < 22; s += 1) {
    const sy = cy - bandHalfH + ((s + 0.4) / 22) * (bandHalfH * 2);
    const sx = ((elapsed * (2100 + (s % 4) * 420) + s * 167) % (w + 460)) - 320;
    const slen = 120 + (s % 5) * 85;
    context.fillStyle = s % 3 === 0 ? '#ffffff' : s % 2 === 0 ? dynAccent : dynAccent2;
    context.globalAlpha = alpha * (s % 3 === 0 ? 0.45 : 0.28);
    context.fillRect(sx, sy, slen, s % 4 === 0 ? 5 : 2.2);
  }
  // Flying diamond energy embers
  for (let p = 0; p < 18; p += 1) {
    const pxSpark = ((elapsed * (900 + p * 75) + p * 131) % (w + 160)) - 80;
    const pySpark = cy + Math.sin(p * 1.9 + elapsed * 5) * (bandHalfH * 0.85);
    const sz = 4 + (p % 4) * 2.5;
    context.fillStyle = p % 2 === 0 ? '#ffffff' : dynAccent;
    context.globalAlpha = alpha * 0.72;
    context.beginPath();
    context.moveTo(pxSpark, pySpark - sz);
    context.lineTo(pxSpark + sz * 1.5, pySpark);
    context.lineTo(pxSpark, pySpark + sz);
    context.lineTo(pxSpark - sz * 1.5, pySpark);
    context.closePath();
    context.fill();
  }
  context.globalAlpha = alpha;

  // 4. Giant Heroic Anime Close-Up Portrait + Rotating Sacred Circle on Left!
  const px = w * 0.23 - (1 - easeOut) * 220;
  const py = cy + 6;
  const pr = Math.min(w, h) * 0.165;
  context.save();
  context.translate(px, py);

  // Rotating Geometric Magic / Tech Seal behind portrait
  context.save();
  context.rotate(elapsed * 1.35);
  context.strokeStyle = dynAccent;
  context.globalAlpha = alpha * 0.55;
  context.lineWidth = 3;
  context.beginPath();
  context.arc(0, 0, pr * 1.42, 0, Math.PI * 2);
  context.stroke();
  context.setLineDash([12, 8]);
  context.lineWidth = 2;
  context.beginPath();
  context.arc(0, 0, pr * 1.24, 0, Math.PI * 2);
  context.stroke();
  context.setLineDash([]);
  // Inscribed rotating 6-point star / geometric emblem
  for (let k = 0; k < 2; k += 1) {
    context.beginPath();
    for (let v = 0; v < 3; v += 1) {
      const ang = (Math.PI * 2 * v) / 3 + k * (Math.PI / 3);
      const vx = Math.cos(ang) * pr * 1.24;
      const vy = Math.sin(ang) * pr * 1.24;
      if (v === 0) context.moveTo(vx, vy);
      else context.lineTo(vx, vy);
    }
    context.closePath();
    context.stroke();
  }
  context.restore();

  // Radiant core glow behind portrait
  context.save();
  context.globalAlpha = alpha * 0.55;
  const auraGrad = context.createRadialGradient(0, 0, pr * 0.15, 0, 0, pr * 1.85);
  auraGrad.addColorStop(0, '#ffffff');
  auraGrad.addColorStop(0.28, dynAccent);
  auraGrad.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = auraGrad;
  context.beginPath();
  context.arc(0, 0, pr * 1.85, 0, Math.PI * 2);
  context.fill();
  context.restore();

  // ===== CHARACTER / WEAPON PORTRAIT ART =====
  if (cs.weaponId === 'gaster') {
    // 💀 SANS: Blue Hoodie + Giant Sculpted Skull + Twin Flanking Gaster Blasters + Crackling Cyan Eye Lightning!
    // Flanking Gaster Blaster silhouettes firing energy!
    [-1, 1].forEach((side) => {
      context.save();
      context.translate(side * pr * 1.08, -pr * 0.34);
      context.rotate(side * 0.22);
      context.shadowColor = '#38bdf8';
      context.shadowBlur = 18;
      context.fillStyle = '#f8fafc';
      context.strokeStyle = '#020617';
      context.lineWidth = 3;
      context.beginPath();
      context.ellipse(0, 0, pr * 0.34, pr * 0.28, 0, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.fillStyle = '#38bdf8';
      context.beginPath();
      context.arc(-pr * 0.1, -pr * 0.04, pr * 0.07, 0, Math.PI * 2);
      context.arc(pr * 0.1, -pr * 0.04, pr * 0.07, 0, Math.PI * 2);
      context.fill();
      context.restore();
    });

    // Hoodie shoulders & fluffy white collar
    context.fillStyle = '#2563eb';
    context.strokeStyle = '#020617';
    context.lineWidth = 4;
    context.beginPath();
    context.ellipse(0, pr * 0.96, pr * 1.15, pr * 0.65, 0, Math.PI, 0);
    context.fill();
    context.stroke();
    context.fillStyle = '#cbd5e1';
    for (let f = -3; f <= 3; f += 1) {
      context.beginPath();
      context.arc(f * pr * 0.24, pr * 0.68, pr * 0.18, 0, Math.PI * 2);
      context.fill();
    }

    // Iconic Sans Skull
    context.fillStyle = '#f8fafc';
    context.strokeStyle = '#020617';
    context.lineWidth = 5;
    context.beginPath();
    context.ellipse(0, -pr * 0.12, pr * 0.94, pr * 0.78, 0, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.beginPath();
    context.roundRect(-pr * 0.68, pr * 0.18, pr * 1.36, pr * 0.54, 18);
    context.fill();
    context.stroke();
    // Wide skeletal grin
    context.strokeStyle = '#020617';
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(-pr * 0.54, pr * 0.44);
    context.quadraticCurveTo(0, pr * 0.65, pr * 0.54, pr * 0.44);
    context.stroke();
    for (let ti = -3; ti <= 3; ti += 1) {
      context.beginPath();
      context.moveTo(ti * pr * 0.145, pr * 0.34);
      context.lineTo(ti * pr * 0.145, pr * 0.57);
      context.stroke();
    }
    // Hollow eye sockets + nose
    context.fillStyle = '#020617';
    context.beginPath();
    context.ellipse(-pr * 0.34, -pr * 0.1, pr * 0.23, pr * 0.21, -0.1, 0, Math.PI * 2);
    context.ellipse(pr * 0.34, -pr * 0.1, pr * 0.25, pr * 0.23, 0.1, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.moveTo(0, pr * 0.06);
    context.lineTo(-pr * 0.11, pr * 0.24);
    context.lineTo(pr * 0.11, pr * 0.24);
    context.closePath();
    context.fill();
    // Blazing Cyan/Yellow Bad-Time Eye + Jagged Lightning Flame!
    const eyeClr = Math.sin(elapsed * 34) > 0 ? '#38bdf8' : '#facc15';
    context.save();
    context.shadowColor = eyeClr;
    context.shadowBlur = 36;
    context.fillStyle = eyeClr;
    context.beginPath();
    context.arc(pr * 0.34, -pr * 0.1, pr * 0.14, 0, Math.PI * 2);
    context.fill();
    // Massive anime eye flame ribbon sweeping right
    context.beginPath();
    context.moveTo(pr * 0.34, -pr * 0.26);
    context.quadraticCurveTo(pr * 1.1, -pr * 0.56, pr * 1.85, -pr * 0.78);
    context.quadraticCurveTo(pr * 1.05, -pr * 0.04, pr * 0.34, pr * 0.06);
    context.closePath();
    context.fillStyle = 'rgba(56, 189, 248, 0.9)';
    context.fill();
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.arc(pr * 0.34, -pr * 0.1, pr * 0.07, 0, Math.PI * 2);
    context.fill();
    context.restore();
  } else if (cs.weaponId === 'chaosSaber') {
    // 🌈 ASRIEL DREEMURR (GOD OF HYPERDEATH): Massive Rainbow Wings + Goat-Dragon Close-Up + Crossed Chaos Sabers!
    const h1 = Math.floor((elapsed * 420) % 360);
    const h2 = (h1 + 140) % 360;
    const h3 = (h1 + 260) % 360;
    // Unfolding 6-blade Hyperdeath Rainbow Wings!
    [-1, 1].forEach((side) => {
      [
        { ang: -0.42, len: 1.85, clr: `hsl(${h1},95%,64%)` },
        { ang: 0.02, len: 1.65, clr: `hsl(${h2},95%,64%)` },
        { ang: 0.44, len: 1.35, clr: `hsl(${h3},95%,64%)` },
      ].forEach((wing, wi) => {
        context.save();
        context.rotate(side * (wing.ang + Math.sin(elapsed * 8 + wi) * 0.08));
        context.shadowColor = wing.clr;
        context.shadowBlur = 24;
        context.fillStyle = wing.clr;
        context.globalAlpha = alpha * 0.85;
        context.beginPath();
        context.moveTo(side * pr * 0.2, 0);
        context.lineTo(side * pr * wing.len, -pr * 0.45);
        context.lineTo(side * pr * (wing.len * 0.78), pr * 0.22);
        context.closePath();
        context.fill();
        context.restore();
      });
    });

    // Crossed Rainbow Chaos Sabers behind portrait!
    [-0.65, 0.65].forEach((rot, idx) => {
      context.save();
      context.rotate(rot);
      const bladeClr = `hsl(${idx === 0 ? h1 : h2}, 95%, 64%)`;
      context.shadowColor = bladeClr;
      context.shadowBlur = 26;
      context.fillStyle = '#ffffff';
      context.strokeStyle = bladeClr;
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(-pr * 1.15, -5);
      context.lineTo(pr * 1.32, -9);
      context.lineTo(pr * 1.45, 0);
      context.lineTo(pr * 1.32, 9);
      context.lineTo(-pr * 1.15, 5);
      context.closePath();
      context.fill();
      context.stroke();
      context.restore();
    });

    // Asriel Goat Ears + Curved Horns + Face
    context.fillStyle = '#f8fafc';
    context.strokeStyle = '#0f172a';
    context.lineWidth = 4;
    [-1, 1].forEach((side) => {
      context.beginPath();
      context.ellipse(side * pr * 0.88, pr * 0.14, pr * 0.26, pr * 0.62, side * 0.28, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.beginPath();
      context.moveTo(side * pr * 0.34, -pr * 0.64);
      context.quadraticCurveTo(side * pr * 1.15, -pr * 1.12, side * pr * 0.62, -pr * 1.48);
      context.quadraticCurveTo(side * pr * 0.72, -pr * 0.94, side * pr * 0.12, -pr * 0.72);
      context.closePath();
      context.fill();
      context.stroke();
    });
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.arc(0, -pr * 0.04, pr * 0.72, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    // Black Hyperdeath vertical sclera + glowing rainbow eyes!
    context.fillStyle = '#020617';
    context.fillRect(-pr * 0.42, -pr * 0.36, pr * 0.24, pr * 0.64);
    context.fillRect(pr * 0.18, -pr * 0.36, pr * 0.24, pr * 0.64);
    context.save();
    context.shadowColor = dynAccent;
    context.shadowBlur = 22;
    context.fillStyle = dynAccent;
    context.beginPath();
    context.arc(-pr * 0.3, -pr * 0.08, pr * 0.11, 0, Math.PI * 2);
    context.arc(pr * 0.3, -pr * 0.08, pr * 0.11, 0, Math.PI * 2);
    context.fill();
    context.restore();
  } else if (cs.weaponId === 'realKnife') {
    // 🔪 CHARA: Dramatic Anime Close-Up (Shadow over Brow + Glowing Crimson Eyes + Rosy Cheeks) + Giant Real Knife + Screen-Ripping Red Slash!
    // Brown bob hair silhouette
    context.fillStyle = '#78350f';
    context.strokeStyle = '#020617';
    context.lineWidth = 4;
    context.beginPath();
    context.arc(0, -pr * 0.12, pr * 0.92, Math.PI * 0.85, Math.PI * 2.15);
    context.lineTo(pr * 0.95, pr * 0.68);
    context.lineTo(-pr * 0.95, pr * 0.68);
    context.closePath();
    context.fill();
    context.stroke();
    // Pale face + forehead menace shadow
    context.fillStyle = '#fef3c7';
    context.beginPath();
    context.arc(0, -pr * 0.04, pr * 0.72, 0, Math.PI * 2);
    context.fill();
    // Forehead dark anime shadow gradient!
    const shadGrad = context.createLinearGradient(0, -pr * 0.76, 0, -pr * 0.05);
    shadGrad.addColorStop(0, 'rgba(2, 6, 23, 0.86)');
    shadGrad.addColorStop(1, 'rgba(2, 6, 23, 0)');
    context.fillStyle = shadGrad;
    context.beginPath();
    context.arc(0, -pr * 0.04, pr * 0.72, Math.PI, 0);
    context.fill();
    // Bangs
    context.fillStyle = '#78350f';
    context.beginPath();
    context.arc(0, -pr * 0.18, pr * 0.78, Math.PI, 0);
    context.lineTo(pr * 0.7, -pr * 0.16);
    context.lineTo(pr * 0.3, -pr * 0.36);
    context.lineTo(0, -pr * 0.12);
    context.lineTo(-pr * 0.3, -pr * 0.36);
    context.lineTo(-pr * 0.7, -pr * 0.16);
    context.closePath();
    context.fill();
    // Rosy cheeks
    context.fillStyle = '#fb7185';
    context.beginPath();
    context.ellipse(-pr * 0.44, pr * 0.16, pr * 0.19, pr * 0.12, 0, 0, Math.PI * 2);
    context.ellipse(pr * 0.44, pr * 0.16, pr * 0.19, pr * 0.12, 0, 0, Math.PI * 2);
    context.fill();
    // Piercing Blood-Red Determination Eyes!
    context.save();
    context.shadowColor = '#ef4444';
    context.shadowBlur = 28;
    context.fillStyle = '#dc2626';
    context.fillRect(-pr * 0.38, -pr * 0.2, pr * 0.22, pr * 0.28);
    context.fillRect(pr * 0.16, -pr * 0.2, pr * 0.22, pr * 0.28);
    context.fillStyle = '#ffffff';
    context.fillRect(-pr * 0.32, -pr * 0.14, pr * 0.08, pr * 0.09);
    context.fillRect(pr * 0.22, -pr * 0.14, pr * 0.08, pr * 0.09);
    context.restore();
    // Haunting wide smile
    context.strokeStyle = '#450a0a';
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(-pr * 0.34, pr * 0.3);
    context.quadraticCurveTo(0, pr * 0.56, pr * 0.34, pr * 0.3);
    context.stroke();
    // Giant Real Knife + Iconic Screen-Wide Crimson Battle Slash!
    context.save();
    context.strokeStyle = '#ef4444';
    context.lineWidth = 14;
    context.shadowColor = '#ef4444';
    context.shadowBlur = 32;
    context.beginPath();
    context.moveTo(-pr * 1.45, pr * 1.05);
    context.quadraticCurveTo(0, -pr * 0.12, pr * 1.65, -pr * 1.15);
    context.stroke();
    context.strokeStyle = '#ffffff';
    context.lineWidth = 4;
    context.stroke();
    context.restore();
  } else if (cs.weaponId === 'floweyArsenal') {
    // 🌻 OMEGA FLOWEY: 6 Orbiting Giant Heart Human Souls + Massive CRT TV Monitor Head + Thrashing Vines!
    const soulColors = ['#ef4444', '#fb923c', '#facc15', '#22c55e', '#38bdf8', '#a855f7'];
    soulColors.forEach((sc, idx) => {
      const a = elapsed * 3.8 + (Math.PI * 2 * idx) / 6;
      context.save();
      context.shadowColor = sc;
      context.shadowBlur = 22;
      context.fillStyle = sc;
      context.strokeStyle = '#ffffff';
      context.lineWidth = 2;
      drawHeartShape(context, Math.cos(a) * pr * 1.24, Math.sin(a) * pr * 1.24, pr * 0.2);
      context.fill();
      context.stroke();
      context.restore();
    });
    // CRT TV Rabbit-Ear Antennas
    context.strokeStyle = '#e2e8f0';
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(-pr * 0.2, -pr * 0.72);
    context.lineTo(-pr * 0.72, -pr * 1.28);
    context.moveTo(pr * 0.2, -pr * 0.72);
    context.lineTo(pr * 0.72, -pr * 1.28);
    context.stroke();
    // Heavy CRT TV Chassis
    context.fillStyle = '#1e293b';
    context.strokeStyle = '#facc15';
    context.lineWidth = 6;
    context.beginPath();
    context.roundRect(-pr * 0.92, -pr * 0.74, pr * 1.84, pr * 1.46, 16);
    context.fill();
    context.stroke();
    // Flickering Static Screen + Scanlines
    context.fillStyle = Math.sin(elapsed * 45) > 0 ? '#f8fafc' : '#cbd5e1';
    context.fillRect(-pr * 0.76, -pr * 0.58, pr * 1.52, pr * 1.14);
    context.fillStyle = 'rgba(15, 23, 42, 0.16)';
    for (let sy = -pr * 0.54; sy < pr * 0.54; sy += 8) {
      context.fillRect(-pr * 0.76, sy, pr * 1.52, 2.5);
    }
    // Demonic Manic Eyes + Wide Jagged Laughing Maw!
    context.save();
    context.fillStyle = '#020617';
    context.fillRect(-pr * 0.52, -pr * 0.34, pr * 0.36, pr * 0.34);
    context.fillRect(pr * 0.16, -pr * 0.34, pr * 0.36, pr * 0.34);
    context.shadowColor = '#ef4444';
    context.shadowBlur = 22;
    context.fillStyle = '#ef4444';
    context.beginPath();
    context.arc(-pr * 0.34, -pr * 0.17, pr * 0.11, 0, Math.PI * 2);
    context.arc(pr * 0.34, -pr * 0.17, pr * 0.11, 0, Math.PI * 2);
    context.fill();
    context.restore();
    context.fillStyle = '#020617';
    context.beginPath();
    context.moveTo(-pr * 0.56, pr * 0.14);
    context.quadraticCurveTo(0, pr * 0.62, pr * 0.56, pr * 0.14);
    context.quadraticCurveTo(0, pr * 0.32, -pr * 0.56, pr * 0.14);
    context.fill();
  } else if (cs.weaponId === 'justiceSpear') {
    // 🛡️ UNDYNE THE UNDYING: Fiery Crimson Ponytail + Cyan Warrior Portrait + Green Soul Shield + Screen-Crossing Blazing Eye Spear!
    // Glowing Green Soul Fortress Ring behind her
    context.save();
    context.strokeStyle = '#22c55e';
    context.lineWidth = 7;
    context.shadowColor = '#22c55e';
    context.shadowBlur = 28;
    context.beginPath();
    context.arc(0, 0, pr * 1.15, 0, Math.PI * 2);
    context.stroke();
    context.restore();
    // Crossed Spears of Justice behind her
    [-0.62, 0.62].forEach((rot) => {
      context.save();
      context.rotate(rot);
      context.shadowColor = '#38bdf8';
      context.shadowBlur = 24;
      context.strokeStyle = '#38bdf8';
      context.lineWidth = 7;
      context.beginPath();
      context.moveTo(-pr * 1.3, 0);
      context.lineTo(pr * 1.2, 0);
      context.stroke();
      context.fillStyle = '#ffffff';
      context.beginPath();
      context.moveTo(pr * 1.48, 0);
      context.lineTo(pr * 0.96, -pr * 0.18);
      context.lineTo(pr * 1.1, 0);
      context.lineTo(pr * 0.96, pr * 0.18);
      context.closePath();
      context.fill();
      context.restore();
    });
    // Streaming Crimson Ponytail
    context.fillStyle = '#dc2626';
    context.strokeStyle = '#450a0a';
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(-pr * 0.1, -pr * 0.72);
    context.quadraticCurveTo(-pr * 1.15, -pr * 1.38, -pr * 1.65, -pr * 0.52);
    context.quadraticCurveTo(-pr * 0.92, -pr * 0.32, -pr * 0.1, -pr * 0.52);
    context.closePath();
    context.fill();
    context.stroke();
    // Red Side-Fins + Cyan Warrior Face
    context.fillStyle = '#ef4444';
    [-1, 1].forEach((side) => {
      context.beginPath();
      context.moveTo(side * pr * 0.62, -pr * 0.25);
      context.lineTo(side * pr * 1.18, -pr * 0.42);
      context.lineTo(side * pr * 1.04, pr * 0.12);
      context.lineTo(side * pr * 0.6, pr * 0.1);
      context.closePath();
      context.fill();
      context.stroke();
    });
    context.fillStyle = '#38bdf8';
    context.strokeStyle = '#0c4a6e';
    context.lineWidth = 4;
    context.beginPath();
    context.arc(0, -pr * 0.04, pr * 0.72, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    // Yellow cat-slit right eye + fanged battle shout!
    context.fillStyle = '#facc15';
    context.beginPath();
    context.ellipse(-pr * 0.3, -pr * 0.1, pr * 0.2, pr * 0.14, 0.15, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#020617';
    context.fillRect(-pr * 0.33, -pr * 0.22, pr * 0.06, pr * 0.24);
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.moveTo(-pr * 0.38, pr * 0.24);
    context.quadraticCurveTo(0, pr * 0.48, pr * 0.38, pr * 0.24);
    context.lineTo(pr * 0.28, pr * 0.42);
    context.lineTo(-pr * 0.28, pr * 0.42);
    context.closePath();
    context.fill();
    // Blazing Cyan Spear-of-Light bursting out of Left Eye!
    context.save();
    context.shadowColor = '#38bdf8';
    context.shadowBlur = 34;
    context.strokeStyle = '#38bdf8';
    context.lineWidth = 10;
    context.beginPath();
    context.moveTo(pr * 0.24, -pr * 0.1);
    context.lineTo(pr * 2.1, -pr * 0.62);
    context.stroke();
    context.strokeStyle = '#ffffff';
    context.lineWidth = 4;
    context.stroke();
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.arc(pr * 0.28, -pr * 0.1, pr * 0.2, 0, Math.PI * 2);
    context.fill();
    context.restore();
  } else if (cs.weaponId === 'voidBlade') {
    // 👁️ FORSAKEN: Jagged Obsidian Crown + Huge Piercing Crimson Eye of the Void + Crossed Void Blades!
    [-0.6, 0.6].forEach((rot) => {
      context.save();
      context.rotate(rot);
      context.shadowColor = '#22c55e';
      context.shadowBlur = 24;
      context.fillStyle = '#18181b';
      context.strokeStyle = '#22c55e';
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(-pr * 1.15, -6);
      context.lineTo(pr * 1.35, 0);
      context.lineTo(-pr * 1.15, 6);
      context.closePath();
      context.fill();
      context.stroke();
      context.restore();
    });
    // Void Silhouette Head + Jagged Crown
    context.fillStyle = '#09090b';
    context.strokeStyle = '#ef4444';
    context.lineWidth = 5;
    context.beginPath();
    context.arc(0, pr * 0.02, pr * 0.78, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.beginPath();
    context.moveTo(-pr * 0.76, -pr * 0.56);
    context.lineTo(-pr * 0.62, -pr * 1.32);
    context.lineTo(-pr * 0.24, -pr * 0.82);
    context.lineTo(0, -pr * 1.48);
    context.lineTo(pr * 0.24, -pr * 0.82);
    context.lineTo(pr * 0.62, -pr * 1.32);
    context.lineTo(pr * 0.76, -pr * 0.56);
    context.closePath();
    context.fill();
    context.stroke();
    // Massive Glowing Crimson Eye of the Void!
    context.save();
    context.shadowColor = '#ef4444';
    context.shadowBlur = 32;
    context.fillStyle = '#ef4444';
    context.beginPath();
    context.ellipse(0, 0, pr * 0.62, pr * 0.36, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.ellipse(0, 0, pr * 0.3, pr * 0.3, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#09090b';
    context.beginPath();
    context.ellipse(0, 0, pr * 0.11, pr * 0.3, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
  } else if (cs.weaponId === 'neoCannon') {
    // 🌟 METTATON NEO: Giant Jagged Hot-Pink NEO Wings + Swept Black Hair + Blazing Pink Star Eye + Heart Core!
    [-1, 1].forEach((side) => {
      context.save();
      context.shadowColor = '#ec4899';
      context.shadowBlur = 28;
      context.fillStyle = '#ec4899';
      context.strokeStyle = '#ffffff';
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(side * pr * 0.25, 0);
      context.lineTo(side * pr * 1.8, -pr * 0.78);
      context.lineTo(side * pr * 1.35, -pr * 0.12);
      context.lineTo(side * pr * 1.9, pr * 0.18);
      context.lineTo(side * pr * 1.1, pr * 0.36);
      context.lineTo(side * pr * 1.48, pr * 0.78);
      context.lineTo(side * pr * 0.35, pr * 0.45);
      context.closePath();
      context.fill();
      context.stroke();
      context.restore();
    });
    // Pale face + iconic swept black hair
    context.fillStyle = '#f8fafc';
    context.strokeStyle = '#09090b';
    context.lineWidth = 5;
    context.beginPath();
    context.arc(0, -pr * 0.06, pr * 0.72, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.fillStyle = '#09090b';
    context.beginPath();
    context.arc(0, -pr * 0.18, pr * 0.8, Math.PI * 0.88, Math.PI * 2.1);
    context.lineTo(pr * 0.82, pr * 0.24);
    context.lineTo(pr * 0.45, -pr * 0.26);
    context.lineTo(pr * 0.05, pr * 0.28);
    context.lineTo(-pr * 0.65, pr * 0.35);
    context.lineTo(-pr * 0.84, -pr * 0.04);
    context.closePath();
    context.fill();
    // Blazing Hot-Pink Left Star-Eye + Lens Flare!
    context.save();
    context.shadowColor = '#ec4899';
    context.shadowBlur = 32;
    context.fillStyle = '#ec4899';
    context.beginPath();
    context.ellipse(pr * 0.3, -pr * 0.08, pr * 0.22, pr * 0.15, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.arc(pr * 0.3, -pr * 0.08, pr * 0.09, 0, Math.PI * 2);
    context.fill();
    // Glowing Pink Heart Core beneath chin!
    context.fillStyle = '#ec4899';
    context.strokeStyle = '#ffffff';
    context.lineWidth = 3;
    drawHeartShape(context, 0, pr * 0.82, pr * 0.32);
    context.fill();
    context.stroke();
    context.restore();
  } else if (cs.weaponId === 'trident') {
    // 🔱 GIANT GOLDEN POSEIDON TRIDENT + LIGHTNING!
    context.rotate(-0.42);
    context.shadowColor = '#2dd4bf';
    context.shadowBlur = 30;
    context.strokeStyle = '#f59e0b';
    context.lineWidth = 10;
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(-pr * 1.1, 0);
    context.lineTo(pr * 0.4, 0);
    context.stroke();
    context.strokeStyle = '#fef08a';
    context.lineWidth = 8;
    context.beginPath();
    context.moveTo(pr * 0.28, -pr * 0.5);
    context.quadraticCurveTo(pr * 0.54, 0, pr * 0.28, pr * 0.5);
    context.stroke();
    context.fillStyle = '#fef08a';
    context.beginPath();
    context.moveTo(pr * 1.24, 0);
    context.lineTo(pr * 0.56, -pr * 0.18);
    context.lineTo(pr * 0.66, 0);
    context.lineTo(pr * 0.56, pr * 0.18);
    context.closePath();
    context.fill();
    [-1, 1].forEach((d) => {
      context.beginPath();
      context.moveTo(pr * 0.28, d * pr * 0.46);
      context.quadraticCurveTo(pr * 0.7, d * pr * 0.5, pr * 1.02, d * pr * 0.3);
      context.stroke();
    });
    context.fillStyle = '#2dd4bf';
    context.beginPath();
    context.arc(pr * 0.36, 0, pr * 0.14, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;
  } else if (cs.weaponId === 'katana' || cs.weaponId === 'lightchaser') {
    context.rotate(-0.52);
    context.shadowColor = cs.accent;
    context.shadowBlur = 32;
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.moveTo(-pr * 0.9, 6);
    context.lineTo(pr * 1.22, -6);
    context.lineTo(pr * 0.96, 12);
    context.lineTo(-pr * 0.9, 16);
    context.closePath();
    context.fill();
    context.strokeStyle = cs.accent;
    context.lineWidth = 7;
    context.beginPath();
    context.arc(0, 0, pr * 0.96, -1.15, 1.15);
    context.stroke();
    context.fillStyle = '#facc15';
    context.fillRect(-pr * 0.66, -22, 11, 48);
    context.shadowBlur = 0;
  } else {
    // High-Craft Radiant Crest Emblem for all Base Weapons!
    context.shadowColor = dynAccent;
    context.shadowBlur = 34;
    context.strokeStyle = dynAccent;
    context.lineWidth = 8;
    context.beginPath();
    context.arc(0, 0, pr * 0.92, 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = 'rgba(2, 6, 23, 0.8)';
    context.fill();
    context.strokeStyle = '#ffffff';
    context.lineWidth = 2.8;
    context.beginPath();
    context.arc(0, 0, pr * 0.72, 0, Math.PI * 2);
    context.stroke();
    context.font = `900 ${Math.round(pr * 0.98)}px Arial`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = '#ffffff';
    context.fillText(cs.ultIcon || '⚡', 0, 5);
    context.textBaseline = 'alphabetic';
    context.shadowBlur = 0;
  }
  context.restore();
  context.restore();

  // Triple Neon Metallic Slash-Band Borders!
  context.save();
  context.strokeStyle = dynAccent;
  context.lineWidth = 8;
  context.shadowColor = dynAccent;
  context.shadowBlur = 26;
  context.beginPath();
  context.moveTo(-24, cy - bandHalfH + tilt);
  context.lineTo(w + 24, cy - bandHalfH - tilt);
  context.moveTo(-24, cy + bandHalfH + tilt);
  context.lineTo(w + 24, cy + bandHalfH - tilt);
  context.stroke();
  context.strokeStyle = '#ffffff';
  context.lineWidth = 2.5;
  context.stroke();
  context.restore();
  context.restore();

  // 5. Kinetic Anime Typography + Metallic Gradient + Horizontal Lens Flare!
  const textX = w * 0.62 + (1 - easeOut) * 260;
  context.save();
  context.textAlign = 'center';

  // Angled glowing top badge pill
  const badgeText = cs.synergyMode
    ? cs.rainbowMode
      ? '★ SYNERGY OVERDRIVE · HOPES AND DREAMS ★'
      : cs.charaMode
        ? '★ SYNERGY OVERDRIVE · ERASE (9999999) ★'
        : cs.undyingMode
          ? '★ TRUE HERO AWAKENED · BATTLE AGAINST A TRUE HERO ★'
          : cs.floweyMode
            ? '★ NIGHTMARE OVERDRIVE · SAVE & LOAD ★'
            : cs.forsakenMode
              ? '★ VOID CORRUPTION · FORSAKEN ★'
              : cs.neoMode
                ? '★ GLAMOUR OVERDRIVE · POWER OF "NEO" ★'
                : '★ SYNERGY OVERDRIVE · 심판의 회랑 ★'
    : `✦ ULTIMATE OVERDRIVE · ${cs.weaponName} ✦`;

  context.font = '900 14px Arial';
  const badgeW = Math.min(w * 0.56, context.measureText(badgeText).width + 34);
  context.fillStyle = 'rgba(2, 6, 23, 0.85)';
  context.strokeStyle = dynAccent;
  context.lineWidth = 2;
  context.beginPath();
  context.roundRect(textX - badgeW / 2, cy - 82, badgeW, 26, 999);
  context.fill();
  context.stroke();
  context.fillStyle = dynAccent;
  context.fillText(badgeText, textX, cy - 64);

  // Giant Italicized Metallic Skill Name with Chromatic Split + Heavy Stroke!
  const titleSize = Math.min(58, Math.max(32, Math.round(w * 0.058)));
  context.font = `italic 900 ${titleSize}px Arial`;
  const titleText = `${cs.ultIcon} ${cs.ultName}`;
  if (cs.sansMode || cs.charaMode || cs.forsakenMode || cs.floweyMode || cs.rainbowMode) {
    // Subtle RGB chromatic aberration ghost shadow for ultra-cinematic punch!
    context.globalAlpha = alpha * 0.55;
    context.fillStyle = '#ef4444';
    context.fillText(titleText, textX - 4, cy + 8);
    context.fillStyle = '#38bdf8';
    context.fillText(titleText, textX + 4, cy + 4);
    context.globalAlpha = alpha;
  }
  context.lineWidth = 10;
  context.strokeStyle = '#020617';
  context.strokeText(titleText, textX, cy + 6);
  const titleGrad = context.createLinearGradient(textX, cy - 42, textX, cy + 16);
  titleGrad.addColorStop(0, '#ffffff');
  titleGrad.addColorStop(0.55, '#fef9c3');
  titleGrad.addColorStop(1, dynAccent);
  context.shadowColor = dynAccent;
  context.shadowBlur = 28;
  context.fillStyle = titleGrad;
  context.fillText(titleText, textX, cy + 6);
  context.shadowBlur = 0;

  // Razor-sharp horizontal anime lens-flare streak slicing across the title!
  if (elapsed < 0.65) {
    const flareAlpha = Math.sin((elapsed / 0.65) * Math.PI);
    const flareGrad = context.createLinearGradient(textX - 280, cy - 8, textX + 280, cy - 8);
    flareGrad.addColorStop(0, 'rgba(255,255,255,0)');
    flareGrad.addColorStop(0.5, `rgba(255,255,255,${0.85 * flareAlpha})`);
    flareGrad.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = flareGrad;
    context.fillRect(textX - 280, cy - 10, 560, 4);
  }

  // Wide-tracked neon subtitle
  context.font = '900 13px Arial';
  context.fillStyle = 'rgba(255,255,255,0.84)';
  context.fillText(cs.ultSub, textX, cy + 34);

  // Overdrive Power Surge Gauge Bar
  const surgePct = clamp(elapsed / (cs.maxTimer - cs.impactAt), 0, 1);
  const barW = Math.min(340, w * 0.36);
  context.fillStyle = 'rgba(2, 6, 23, 0.85)';
  context.fillRect(textX - barW / 2, cy + 50, barW, 8);
  context.fillStyle = impactActive ? '#ffffff' : dynAccent;
  context.fillRect(textX - barW / 2, cy + 50, barW * surgePct, 8);
  context.strokeStyle = 'rgba(255,255,255,0.45)';
  context.lineWidth = 1.5;
  context.strokeRect(textX - barW / 2, cy + 50, barW, 8);
  context.restore();

  // 5B. Iconic Undertale-Style Character Dialogue Box with Typewriter Reveal!
  const rawQuote = String(cs.ultQuote || '');
  const quoteLines = rawQuote.split('\n');
  const boxW = Math.min(w - 56, 740);
  const boxH = quoteLines.length > 1 ? 94 : 68;
  const boxX = (w - boxW) / 2;
  const barHPreview = Math.round(h * 0.11 * easeOut);
  const boxY = h - barHPreview - boxH - 14 + (1 - easeOut) * 42;
  context.save();
  context.fillStyle = 'rgba(0, 0, 0, 0.94)';
  context.fillRect(boxX, boxY, boxW, boxH);
  context.strokeStyle = '#ffffff';
  context.lineWidth = 4;
  context.strokeRect(boxX, boxY, boxW, boxH);
  // Speaker name pill on top-left corner of dialogue box
  const speakerLabel = `${cs.heroIcon || cs.ultIcon || '★'} ${cs.heroName || cs.weaponName}`;
  context.font = '900 13px Arial';
  const spW = context.measureText(speakerLabel).width + 22;
  context.fillStyle = dynAccent;
  context.fillRect(boxX + 12, boxY - 14, spW, 22);
  context.fillStyle = '#020617';
  context.textAlign = 'left';
  context.fillText(speakerLabel, boxX + 22, boxY + 1);
  // Typewriter reveal text (fast dramatic Undertale pacing!)
  const totalChars = rawQuote.replace(/\n/g, '').length;
  let remainingChars = Math.min(totalChars, Math.floor(elapsed * 95));
  context.font = '800 18px "Malgun Gothic", "Noto Sans KR", monospace';
  context.fillStyle = '#ffffff';
  quoteLines.forEach((line, li) => {
    const shown = line.slice(0, Math.max(0, remainingChars));
    remainingChars -= line.length;
    context.fillText(shown, boxX + 22, boxY + 34 + li * 28, boxW - 44);
  });
  context.restore();

  // 6. IMPACT FRAME: Expanding Shockwave Ring & 8-Point Star-Flare at Detonation!
  if (impactActive && impactBurstT < 1) {
    context.save();
    context.translate(px, py);
    const ringR = pr * 0.6 + impactBurstT * Math.max(w, h) * 0.95;
    context.strokeStyle = impactBurstT < 0.25 ? '#ffffff' : dynAccent;
    context.lineWidth = 14 * (1 - impactBurstT);
    context.globalAlpha = alpha * (1 - impactBurstT);
    context.beginPath();
    context.arc(0, 0, ringR, 0, Math.PI * 2);
    context.stroke();
    // 8-point bright star-burst rays
    context.strokeStyle = '#ffffff';
    context.lineWidth = 5 * (1 - impactBurstT);
    for (let r = 0; r < 8; r += 1) {
      const ang = (Math.PI * 2 * r) / 8 + 0.2;
      context.beginPath();
      context.moveTo(0, 0);
      context.lineTo(Math.cos(ang) * ringR * 1.15, Math.sin(ang) * ringR * 1.15);
      context.stroke();
    }
    context.restore();
  }

  // 7. Cinematic Widescreen Letterbox Bars + Subtle Film Tech Watermarks
  const barH = Math.round(h * 0.11 * easeOut);
  context.fillStyle = '#000000';
  context.fillRect(-24, -24, w + 48, barH + 24);
  context.fillRect(-24, h - barH, w + 48, barH + 24);
  if (barH > 22) {
    context.font = '800 11px monospace';
    context.fillStyle = 'rgba(255, 255, 255, 0.45)';
    context.textAlign = 'left';
    context.fillText(`// ULTIMATE SEQUENCE :: ${cs.weaponId.toUpperCase()}`, 18, barH - 12);
    context.textAlign = 'right';
    context.fillText(impactActive ? 'STATUS :: DETONATION!' : 'STATUS :: OVERDRIVE CHARGING...', w - 18, h - barH + 20);
  }

  context.restore();
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
      const rainbowHue = Math.floor((game.time * 420) % 360);

      context.rotate(-bullet.spin);
      context.globalAlpha = alpha * 0.34;
      context.fillStyle = bullet.rainbow
        ? `hsl(${rainbowHue}, 95%, 62%)`
        : bullet.awakened ? '#facc15' : '#f43f5e';
      context.beginPath();
      context.moveTo(0, 0);
      context.arc(0, 0, bullet.radius, startAngle, endAngle);
      context.closePath();
      context.fill();

      context.globalAlpha = alpha;
      context.strokeStyle = bullet.rainbow
        ? `hsl(${(rainbowHue + 60) % 360}, 100%, 75%)`
        : bullet.awakened ? '#fef08a' : '#fecdd3';
      context.lineWidth = bullet.rainbow ? 10 : bullet.awakened ? 9 : 6;
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

    if (bullet.type === 'asrielStar') {
      // ⭐ Undertale Asriel Spinning Rainbow Star!
      context.rotate(bullet.spin * 0.7);
      const rOuter = bullet.radius;
      const rInner = rOuter * 0.45;
      context.shadowColor = bullet.color || '#facc15';
      context.shadowBlur = 16;
      context.fillStyle = bullet.color || '#facc15';
      context.strokeStyle = '#ffffff';
      context.lineWidth = 2;
      context.beginPath();
      for (let i = 0; i < 10; i += 1) {
        const r = i % 2 === 0 ? rOuter : rInner;
        const a = (Math.PI * i) / 5 - Math.PI / 2;
        if (i === 0) context.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else context.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      context.closePath();
      context.fill();
      context.stroke();
      context.fillStyle = '#ffffff';
      context.beginPath();
      context.arc(0, 0, rInner * 0.55, 0, Math.PI * 2);
      context.fill();
      context.shadowBlur = 0;
      context.restore();
      return;
    }

    if (bullet.type === 'charaKnife') {
      // 🔪 Undertale Chara Glowing Red Determination Real Knife!
      context.rotate(-bullet.spin + Math.atan2(bullet.vy, bullet.vx));
      context.shadowColor = '#ef4444';
      context.shadowBlur = bullet.awakened ? 18 : 11;
      // Glowing crimson blade
      context.fillStyle = '#fef2f2';
      context.strokeStyle = '#ef4444';
      context.lineWidth = 2.4;
      context.beginPath();
      context.moveTo(22, 0);
      context.lineTo(-2, -6);
      context.lineTo(-4, 4);
      context.closePath();
      context.fill();
      context.stroke();
      // Guard & dark handle
      context.fillStyle = '#facc15';
      context.fillRect(-5, -7, 3, 14);
      context.fillStyle = '#1f2937';
      context.fillRect(-15, -3, 10, 6);
      context.shadowBlur = 0;
      context.restore();
      return;
    }

    if (bullet.type === 'floweyPellet') {
      // 🌻 Undertale Omega Flowey Wiggling Friendliness Pellet!
      context.rotate(bullet.spin * 0.8);
      context.shadowColor = '#facc15';
      context.shadowBlur = 12;
      context.fillStyle = '#fef9c3';
      context.strokeStyle = '#ca8a04';
      context.lineWidth = 2;
      context.beginPath();
      context.ellipse(0, 0, bullet.radius * 1.15, bullet.radius * 0.65, 0, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.fillStyle = '#ffffff';
      context.beginPath();
      context.arc(2, -1, bullet.radius * 0.28, 0, Math.PI * 2);
      context.fill();
      context.shadowBlur = 0;
      context.restore();
      return;
    }

    if (bullet.type === 'justiceSpear') {
      // 🛡️ Undertale Undyne the Undying Glowing Spear of Justice!
      context.rotate(-bullet.spin + Math.atan2(bullet.vy, bullet.vx));
      const spearClr = bullet.color || '#38bdf8';
      context.shadowColor = spearClr;
      context.shadowBlur = bullet.awakened ? 20 : 12;
      // Glowing shaft
      context.strokeStyle = spearClr;
      context.lineWidth = 4;
      context.lineCap = 'round';
      context.beginPath();
      context.moveTo(-26, 0);
      context.lineTo(14, 0);
      context.stroke();
      // White-hot diamond spearhead
      context.fillStyle = '#ffffff';
      context.strokeStyle = spearClr;
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(28, 0);
      context.lineTo(10, -7);
      context.lineTo(14, 0);
      context.lineTo(10, 7);
      context.closePath();
      context.fill();
      context.stroke();
      context.shadowBlur = 0;
      context.restore();
      return;
    }

    if (bullet.type === 'neoStar') {
      // 🌟 Mettaton NEO Hot-Pink & Gold 4-Point Glamour Starlight Bolt!
      context.rotate(bullet.spin * 0.9);
      const clr = bullet.color || '#ec4899';
      const ro = bullet.radius * 1.15;
      const ri = ro * 0.38;
      context.shadowColor = clr;
      context.shadowBlur = bullet.awakened ? 20 : 12;
      context.fillStyle = clr;
      context.strokeStyle = '#ffffff';
      context.lineWidth = 2;
      context.beginPath();
      for (let i = 0; i < 8; i += 1) {
        const rr = i % 2 === 0 ? ro : ri;
        const aa = (Math.PI * i) / 4;
        if (i === 0) context.moveTo(Math.cos(aa) * rr, Math.sin(aa) * rr);
        else context.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr);
      }
      context.closePath();
      context.fill();
      context.stroke();
      context.fillStyle = '#ffffff';
      context.beginPath();
      context.arc(0, 0, ri * 0.6, 0, Math.PI * 2);
      context.fill();
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
    drawEnemyArt(context, enemy, game, player);
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
  drawHeroArt(context, player, hero, game, weapon);

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
    drawUltimateCutscene(context, game.ultCutscene, canvas.width, canvas.height);
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

  if ((game.deathAwakenFlash ?? 0) > 0) {
    const daClr = game.deathAwakenColor || '#facc15';
    const isStage2 = (game.deathAwakenStage ?? 1) >= 2;
    context.save();
    context.globalAlpha = Math.min(1, game.deathAwakenFlash / 1.4);
    context.fillStyle = isStage2 ? 'rgba(69, 10, 10, 0.86)' : 'rgba(15, 23, 42, 0.86)';
    context.fillRect(0, canvas.height / 2 - 84, canvas.width, 168);
    context.strokeStyle = daClr;
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(0, canvas.height / 2 - 84);
    context.lineTo(canvas.width, canvas.height / 2 - 84);
    context.moveTo(0, canvas.height / 2 + 84);
    context.lineTo(canvas.width, canvas.height / 2 + 84);
    context.stroke();
    context.textAlign = 'center';
    context.font = '900 15px Arial';
    context.fillStyle = daClr;
    context.fillText(
      isStage2 ? '⚡ FINAL AWAKENING · 2차 초각성 발동! (무기 각성 + 필살기 MAX!) ⚡' : '🔥 DEATH AWAKENING · 1차 각성 발동! 🔥',
      canvas.width / 2,
      canvas.height / 2 - 44,
    );
    context.font = '900 32px Arial';
    context.fillStyle = '#ffffff';
    context.shadowColor = daClr;
    context.shadowBlur = 18;
    context.fillText(game.deathAwakenTitle || 'AWAKENED!', canvas.width / 2, canvas.height / 2 + 4);
    context.shadowBlur = 0;
    context.font = '800 17px "Malgun Gothic", sans-serif';
    context.fillStyle = '#fef08a';
    context.fillText(game.deathAwakenQuote || '', canvas.width / 2, canvas.height / 2 + 44);
    context.restore();
  }
}

// 7종 특별 캐릭터 전용 BGM (Toby Fox 원곡 고증 Web Audio 신스 + 선택적 로컬 MP3 지원)
const BGM_NOTES = {
  E1: 41.2, F1: 43.65, Gb1: 46.25, G1: 49.0, Ab1: 51.91, A1: 55.0, Bb1: 58.27, B1: 61.74,
  C2: 65.41, Db2: 69.3, D2: 73.42, Eb2: 77.78, E2: 82.41, F2: 87.31, Gb2: 92.5, G2: 98.0, Ab2: 103.83, A2: 110.0, Bb2: 116.54, B2: 123.47,
  C3: 130.81, Db3: 138.59, D3: 146.83, Eb3: 155.56, E3: 164.81, F3: 174.61, Gb3: 185.0, G3: 196.0, Ab3: 207.65, A3: 220.0, Bb3: 233.08, B3: 246.94,
  C4: 261.63, Db4: 277.18, D4: 293.66, Eb4: 311.13, E4: 329.63, F4: 349.23, Gb4: 369.99, G4: 392.0, Ab4: 415.3, A4: 440.0, Bb4: 466.16, B4: 493.88,
  C5: 523.25, Db5: 554.37, D5: 587.33, Eb5: 622.25, E5: 659.25, F5: 698.46, Gb5: 739.99, G5: 783.99, Ab5: 830.61, A5: 880.0, Bb5: 932.33, B5: 987.77,
  C6: 1046.5, Db6: 1108.73, D6: 1174.66, Eb6: 1244.51, E6: 1318.51, F6: 1396.91, Gb6: 1479.98, G6: 1567.98, Ab6: 1661.22,
};

const SPECIAL_HERO_BGM = (() => {
  const N = BGM_NOTES;
  const repeat = (arr, times) => {
    const out = [];
    for (let i = 0; i < times; i += 1) out.push(...arr);
    return out;
  };

  return {
    // 💀 샌즈 — Toby Fox: MEGALOVANIA (120 BPM · D Minor SNES EarthBound Overdriven Guitar Rock!)
    sans: {
      label: 'MEGALOVANIA',
      title: 'MEGALOVANIA (Toby Fox)',
      mp3: '/audio/megalovania.mp3',
      stepMs: 125,
      drumStyle: 'rock',
      synth: {
        leadWave1: 'square', leadWave2: 'sawtooth', detuneRatio: 1.004,
        leadGain: 0.056, leadCutoffStart: 3600, leadCutoffEnd: 1200, leadQ: 2.5,
        overdrive: 26,
        bassWave: 'sawtooth', bassGain: 0.072, bassCutoffStart: 940, bassCutoffEnd: 280,
        arpWave: 'square', arpGain: 0.015,
      },
      leadSeq: [
        [N.D4, 0.9], [N.D4, 0.9], [N.D5, 1.7], null, [N.A4, 2.2], null, null, [N.Ab4, 1.4],
        null, [N.G4, 1.4], null, [N.F4, 1.7], null, [N.D4, 0.9], [N.F4, 0.9], [N.G4, 0.9],
        [N.C4, 0.9], [N.C4, 0.9], [N.D5, 1.7], null, [N.A4, 2.2], null, null, [N.Ab4, 1.4],
        null, [N.G4, 1.4], null, [N.F4, 1.7], null, [N.D4, 0.9], [N.F4, 0.9], [N.G4, 0.9],
        [N.B3, 0.9], [N.B3, 0.9], [N.D5, 1.7], null, [N.A4, 2.2], null, null, [N.Ab4, 1.4],
        null, [N.G4, 1.4], null, [N.F4, 1.7], null, [N.D4, 0.9], [N.F4, 0.9], [N.G4, 0.9],
        [N.Bb3, 0.9], [N.Bb3, 0.9], [N.D5, 1.7], null, [N.A4, 2.2], null, null, [N.Ab4, 1.4],
        null, [N.G4, 1.4], null, [N.F4, 1.7], null, [N.D4, 0.9], [N.F4, 0.9], [N.G4, 0.9],
        [N.F5, 1.8], null, [N.F5, 0.9], [N.F5, 0.9], [N.F5, 1.6], null, [N.D5, 1.6], null,
        [N.D5, 1.6], null, [N.F5, 1.6], null, [N.F5, 0.9], [N.G5, 0.9], [N.Ab5, 1.5], null,
        [N.G5, 1.5], null, [N.F5, 1.5], null, [N.D5, 1.5], null, [N.F5, 0.9], [N.G5, 0.9],
        [N.A5, 2.2], null, null, [N.G5, 1.4], null, [N.F5, 1.4], [N.D5, 1.2], null,
        [N.D5, 0.9], [N.F5, 0.9], [N.G5, 1.6], null, [N.A5, 1.8], null, [N.G5, 1.5], null,
        [N.F5, 1.5], null, [N.D5, 1.5], null, [N.C5, 1.4], null, [N.D5, 1.4], null,
        [N.E5, 1.8], null, [N.F5, 1.6], null, [N.G5, 1.8], null, [N.A5, 2.4], null,
        null, [N.G5, 0.9], [N.F5, 0.9], [N.E5, 0.9], [N.D5, 1.4], null, [N.C5, 1.2], null,
      ],
      bassSeq: [
        N.D2, 0, N.D3, 0, N.D2, 0, N.D3, N.D2, N.D2, 0, N.D3, 0, N.A1, 0, N.C2, 0,
        N.C2, 0, N.C3, 0, N.C2, 0, N.C3, N.C2, N.C2, 0, N.C3, 0, N.C2, 0, N.D2, 0,
        N.B1, 0, N.B2, 0, N.B1, 0, N.B2, N.B1, N.B1, 0, N.B2, 0, N.B1, 0, N.C2, 0,
        N.Bb1, 0, N.Bb2, 0, N.Bb1, 0, N.Bb2, N.Bb1, N.Bb1, 0, N.C2, 0, N.A1, 0, N.C2, 0,
        N.D2, N.D2, N.D3, 0, N.D2, 0, N.D3, N.D2, N.D2, N.D2, N.D3, 0, N.F2, 0, N.G2, 0,
        N.C2, N.C2, N.C3, 0, N.C2, 0, N.C3, N.C2, N.C2, N.C2, N.C3, 0, N.G2, 0, N.C2, 0,
        N.Bb1, N.Bb1, N.Bb2, 0, N.Bb1, 0, N.Bb2, N.Bb1, N.Bb1, N.Bb1, N.Bb2, 0, N.F2, 0, N.Bb1, 0,
        N.C2, 0, N.C3, 0, N.C2, 0, N.C3, 0, N.A1, 0, N.A2, 0, N.A1, N.B1, N.C2, N.D2,
      ],
      arpSeq: [
        ...repeat([0], 64),
        ...repeat([N.D4, N.A4, N.F4, N.A4], 4),
        ...repeat([N.C4, N.G4, N.E4, N.G4], 4),
        ...repeat([N.Bb3, N.F4, N.D4, N.F4], 4),
        ...repeat([N.C4, N.G4, N.A4, N.E4], 4),
      ],
      chordPads: {
        0: [N.D3, N.A3, N.F4], 16: [N.C3, N.G3, N.E4], 32: [N.B2, N.F3, N.D4], 48: [N.Bb2, N.F3, N.D4],
        64: [N.D3, N.A3, N.D4], 80: [N.C3, N.G3, N.C4], 96: [N.Bb2, N.F3, N.Bb3], 112: [N.C3, N.G3, N.C4], 120: [N.A2, N.E3, N.A3],
      },
    },

    // 🌈 아스리엘 드리무어 — Toby Fox: Hopes and Dreams + SAVE the World (171 BPM · Bb Major / G Minor Exact Authentic Medley!)
    asriel: {
      label: 'HOPES & DREAMS / SAVE THE WORLD',
      title: 'Hopes and Dreams + SAVE the World (Toby Fox)',
      mp3: '/audio/hopes-and-dreams.mp3',
      stepMs: 88,
      drumStyle: 'anthem',
      synth: {
        leadWave1: 'sawtooth', leadWave2: 'square', detuneRatio: 1.005,
        leadGain: 0.056, leadCutoffStart: 4800, leadCutoffEnd: 1900, leadQ: 2.0,
        overdrive: 22,
        part2Step: 128, part2Wave1: 'square', part2Wave2: 'triangle', part2Overdrive: 0,
        bassWave: 'sawtooth', bassGain: 0.072, bassCutoffStart: 1200, bassCutoffEnd: 340,
        arpWave: 'triangle', arpGain: 0.032, arpHarmonic: true,
      },
      leadSeq: [
        // === PART 1: HOPES AND DREAMS (Exact Once Upon a Time / Hopes and Dreams Guitar Theme!) ===
        // Bar 1 (Eb): Bb4 -> Bb5 -> F5 -> Eb5 -> Bb5 -> Bb4 -> Bb5 -> A5
        [N.Bb4, 2.0], null, [N.Bb5, 2.0], null, [N.F5, 2.0], null, [N.Eb5, 2.0], null,
        [N.Bb5, 2.0], null, [N.Bb4, 2.0], null, [N.Bb5, 2.0], null, [N.A5, 2.0], null,
        // Bar 2 (F): F5 -> G5 -> F5 -> D5 -> Eb5 -> F5
        [N.F5, 2.0], null, [N.G5, 2.0], null, [N.F5, 3.5], null, null, null,
        [N.D5, 2.0], null, [N.Eb5, 2.0], null, [N.F5, 3.5], null, null, null,
        // Bar 3 (Gm): Bb4 -> Bb5 -> F5 -> Eb5 -> Bb5 -> Bb4 -> C6 -> Bb5
        [N.Bb4, 2.0], null, [N.Bb5, 2.0], null, [N.F5, 2.0], null, [N.Eb5, 2.0], null,
        [N.Bb5, 2.0], null, [N.Bb4, 2.0], null, [N.C6, 2.0], null, [N.Bb5, 2.0], null,
        // Bar 4 (Dm -> F): A5 -> G5 -> F5 -> D5 -> Eb5 -> F5 -> G5 -> A5
        [N.A5, 2.0], null, [N.G5, 2.0], null, [N.F5, 2.0], null, [N.D5, 2.0], null,
        [N.Eb5, 1.8], null, [N.F5, 1.8], null, [N.G5, 1.8], null, [N.A5, 1.8], null,
        // Bar 5 (Eb Climax): Soaring High Guitar Answer!
        [N.D5, 1.8], null, [N.F5, 1.8], null, [N.G5, 2.2], null, [N.F5, 1.8], null,
        [N.Eb5, 1.8], null, [N.D5, 1.8], null, [N.C5, 1.8], null, [N.D5, 1.8], null,
        // Bar 6 (F Climax): Eb5 -> F5 -> Bb5 -> A5 -> G5 -> F5
        [N.Eb5, 1.8], null, [N.F5, 1.8], null, [N.Bb5, 2.6], null, [N.A5, 1.6], null,
        [N.G5, 1.8], null, [N.F5, 1.8], null, [N.D5, 1.8], null, [N.F5, 1.8], null,
        // Bar 7 (Gm Climax): G5 -> A5 -> Bb5 -> C6 -> D6 -> C6 -> Bb5
        [N.G5, 1.8], null, [N.A5, 1.8], null, [N.Bb5, 2.2], null, [N.C6, 1.8], null,
        [N.D6, 2.6], null, [N.C6, 1.6], null, [N.Bb5, 1.8], null, [N.A5, 1.8], null,
        // Bar 8 (F -> SAVE THE WORLD Launch!)
        [N.G5, 1.8], null, [N.A5, 1.8], null, [N.Bb5, 2.0], null, [N.C6, 2.0], null,
        [N.D6, 1.5], [N.C6, 1.5], [N.Bb5, 1.5], [N.A5, 1.5], [N.F5, 2.0], null, [N.Bb5, 1.8], null,

        // === PART 2: SAVE THE WORLD (Bright Joyful Chiptune Square Synth Reprise!) ===
        // Bar 9 (Eb): Bb5 -> F5 -> D5 -> F5 -> G5 -> F5 -> Eb5 -> D5
        [N.Bb5, 1.8], null, [N.F5, 1.8], null, [N.D5, 1.8], null, [N.F5, 1.8], null,
        [N.G5, 1.8], null, [N.F5, 1.8], null, [N.Eb5, 1.8], null, [N.D5, 1.8], null,
        // Bar 10 (F): C5 -> D5 -> Eb5 -> F5 -> G5 -> A5 -> Bb5 -> A5
        [N.C5, 1.8], null, [N.D5, 1.8], null, [N.Eb5, 1.8], null, [N.F5, 1.8], null,
        [N.G5, 1.8], null, [N.A5, 1.8], null, [N.Bb5, 2.2], null, [N.A5, 1.6], null,
        // Bar 11 (Gm): Bb5 -> D6 -> C6 -> Bb5 -> A5 -> G5 -> F5 -> G5
        [N.Bb5, 1.8], null, [N.D6, 2.2], null, [N.C6, 1.8], null, [N.Bb5, 1.8], null,
        [N.A5, 1.8], null, [N.G5, 1.8], null, [N.F5, 1.8], null, [N.G5, 1.8], null,
        // Bar 12 (Bb -> F): A5 -> Bb5 -> C6 -> D6 -> C6 -> Bb5 -> A5
        [N.A5, 1.8], null, [N.Bb5, 1.8], null, [N.C6, 1.8], null, [N.D6, 2.4], null,
        [N.C6, 1.8], null, [N.Bb5, 1.8], null, [N.A5, 2.2], null, [N.F5, 1.6], null,
        // Bar 13 (Eb): Full-energy euphoric SAVE the World chorus!
        [N.Bb5, 1.0], [N.Bb5, 1.0], [N.F5, 1.8], null, [N.G5, 1.8], null, [N.Bb5, 2.0], null,
        [N.C6, 1.8], null, [N.Bb5, 1.8], null, [N.A5, 1.8], null, [N.G5, 1.8], null,
        // Bar 14 (F): Soaring harmony
        [N.A5, 1.0], [N.A5, 1.0], [N.F5, 1.8], null, [N.G5, 1.8], null, [N.A5, 2.0], null,
        [N.Bb5, 1.8], null, [N.C6, 1.8], null, [N.D6, 2.2], null, [N.C6, 1.6], null,
        // Bar 15 (Gm): Grand Finale peak!
        [N.D6, 2.4], null, null, [N.C6, 1.4], [N.Bb5, 1.8], null, [N.A5, 1.8], null,
        [N.G5, 1.8], null, [N.Bb5, 1.8], null, [N.D6, 2.4], null, [N.Eb6, 1.6], null,
        // Bar 16 (F -> Bb): Radiant loop turnaround
        [N.F6, 2.4], null, null, [N.Eb6, 1.4], [N.D6, 1.8], null, [N.C6, 1.8], null,
        [N.Bb5, 1.8], null, [N.A5, 1.8], null, [N.F5, 2.2], null, [N.D5, 1.6], null,
      ],
      bassSeq: [
        ...repeat([N.Eb2, 0, N.Eb3, 0, N.Eb2, 0, N.Eb3, N.Eb2], 2),
        ...repeat([N.F2, 0, N.F3, 0, N.F2, 0, N.F3, N.F2], 2),
        ...repeat([N.G2, 0, N.G3, 0, N.G2, 0, N.G3, N.G2], 2),
        N.D2, 0, N.D3, 0, N.D2, 0, N.D3, 0, N.F2, 0, N.F3, 0, N.F2, 0, N.G2, 0,
        ...repeat([N.Eb2, N.Eb2, N.Eb3, 0, N.Eb2, 0, N.Eb3, N.Eb2], 2),
        ...repeat([N.F2, N.F2, N.F3, 0, N.F2, 0, N.F3, N.F2], 2),
        ...repeat([N.G2, N.G2, N.G3, 0, N.G2, 0, N.G3, N.G2], 2),
        N.F2, N.F2, N.F3, 0, N.F2, 0, N.G2, 0, N.F2, N.F2, N.F3, 0, N.A2, 0, N.Bb2, 0,
        ...repeat([N.Eb2, N.Eb2, N.Eb3, 0, N.Eb2, 0, N.Eb3, N.Eb2], 2),
        ...repeat([N.F2, N.F2, N.F3, 0, N.F2, 0, N.F3, N.F2], 2),
        ...repeat([N.G2, N.G2, N.G3, 0, N.G2, 0, N.G3, N.G2], 2),
        ...repeat([N.Bb1, N.Bb1, N.Bb2, 0, N.F2, 0, N.F3, N.F2], 2),
        ...repeat([N.Eb2, N.Eb2, N.Eb3, 0, N.Eb2, N.Eb3, N.Eb2, N.Eb3], 2),
        ...repeat([N.F2, N.F2, N.F3, 0, N.F2, N.F3, N.F2, N.F3], 2),
        ...repeat([N.G2, N.G2, N.G3, 0, N.G2, N.G3, N.G2, N.G3], 2),
        N.F2, N.F2, N.F3, 0, N.F2, 0, N.G2, 0, N.F2, N.F2, N.F3, 0, N.C2, 0, N.D2, 0,
      ],
      arpSeq: [
        ...repeat([N.Eb5, N.G5, N.Bb5, N.Eb6], 4),
        ...repeat([N.F5, N.A5, N.C6, N.F6], 4),
        ...repeat([N.G5, N.Bb5, N.D6, N.G6], 4),
        ...repeat([N.D5, N.F5, N.A5, N.D6], 2), ...repeat([N.F5, N.A5, N.C6, N.F6], 2),
        ...repeat([N.Eb5, N.Bb5, N.G5, N.Eb6], 4),
        ...repeat([N.F5, N.C6, N.A5, N.F6], 4),
        ...repeat([N.G5, N.D6, N.Bb5, N.G6], 4),
        ...repeat([N.F5, N.A5, N.C6, N.D6], 4),
        ...repeat([N.Bb5, N.Eb6, N.G5, N.Eb6], 4),
        ...repeat([N.C6, N.F6, N.A5, N.F6], 4),
        ...repeat([N.D6, N.G6, N.Bb5, N.G6], 4),
        ...repeat([N.Bb5, N.D6, N.F6, N.D6], 4),
        ...repeat([N.Eb5, N.G5, N.Bb5, N.Eb6], 4),
        ...repeat([N.F5, N.A5, N.C6, N.F6], 4),
        ...repeat([N.G5, N.Bb5, N.D6, N.G6], 4),
        ...repeat([N.F5, N.C6, N.A5, N.F6], 4),
      ],
      chordPads: {
        0: [N.Eb3, N.G3, N.Bb3], 16: [N.F3, N.A3, N.C4], 32: [N.G3, N.Bb3, N.D4], 48: [N.D3, N.F3, N.A3], 56: [N.F3, N.A3, N.C4],
        64: [N.Eb3, N.Bb3, N.Eb4], 80: [N.F3, N.C4, N.F4], 96: [N.G3, N.D4, N.G4], 112: [N.F3, N.C4, N.F4],
        128: [N.Eb3, N.G3, N.Bb3], 144: [N.F3, N.A3, N.C4], 160: [N.G3, N.Bb3, N.D4], 176: [N.Bb2, N.F3, N.Bb3],
        192: [N.Eb3, N.Bb3, N.Eb4], 208: [N.F3, N.C4, N.F4], 224: [N.G3, N.D4, N.G4], 240: [N.F3, N.C4, N.F4],
      },
    },

    // 🔪 차라 — Toby Fox: Megalo Strike Back (150 BPM · C Minor Overdriven Industrial Chiptune Metal)
    chara: {
      label: 'STRIKE BACK',
      title: 'Megalo Strike Back (Toby Fox)',
      mp3: '/audio/megalo-strike-back.mp3',
      stepMs: 100,
      drumStyle: 'industrial',
      synth: {
        leadWave1: 'sawtooth', leadWave2: 'square', detuneRatio: 1.007,
        leadGain: 0.056, leadCutoffStart: 4400, leadCutoffEnd: 900, leadQ: 3.8,
        overdrive: 34,
        bassWave: 'sawtooth', bassGain: 0.08, bassCutoffStart: 900, bassCutoffEnd: 220,
        arpWave: 'square', arpGain: 0.018,
      },
      leadSeq: [
        [N.C5, 0.9], [N.C5, 0.9], [N.Eb5, 1.5], null, [N.D5, 1.4], null, [N.C5, 0.9], [N.B4, 0.9],
        [N.C5, 1.6], null, [N.G4, 1.4], null, [N.Ab4, 1.4], null, [N.G4, 1.4], null,
        [N.Ab4, 0.9], [N.Ab4, 0.9], [N.C5, 1.5], null, [N.Eb5, 1.6], null, [N.D5, 1.4], null,
        [N.C5, 1.6], null, [N.Bb4, 1.4], null, [N.Ab4, 1.4], null, [N.G4, 1.4], null,
        [N.F4, 0.9], [N.F4, 0.9], [N.Ab4, 1.5], null, [N.C5, 1.6], null, [N.Eb5, 1.6], null,
        [N.D5, 1.4], null, [N.C5, 1.4], null, [N.B4, 1.6], null, [N.G4, 1.4], null,
        [N.G4, 0.9], [N.Ab4, 0.9], [N.A4, 0.9], [N.Bb4, 0.9], [N.B4, 1.5], null, [N.D5, 1.5], null,
        [N.F5, 1.5], null, [N.E5, 0.9], [N.Eb5, 0.9], [N.D5, 1.5], null, [N.B4, 1.4], null,
        [N.G5, 1.4], null, [N.G5, 0.9], [N.Ab5, 0.9], [N.G5, 1.5], null, [N.Eb5, 1.5], null,
        [N.C5, 1.4], null, [N.Eb5, 0.9], [N.F5, 0.9], [N.G5, 1.8], null, [N.C6, 1.6], null,
        [N.Ab5, 1.5], null, [N.G5, 1.4], null, [N.F5, 1.5], null, [N.Eb5, 1.5], null,
        [N.D5, 1.4], null, [N.Eb5, 1.4], null, [N.F5, 1.8], null, [N.Ab5, 1.6], null,
        [N.G5, 1.0], [N.Gb5, 1.0], [N.F5, 1.0], [N.E5, 1.0], [N.Eb5, 1.4], null, [N.D5, 1.4], null,
        [N.C5, 1.4], null, [N.Eb5, 1.4], null, [N.G5, 1.8], null, [N.F5, 1.4], null,
        [N.B5, 1.8], null, [N.G5, 1.4], null, [N.F5, 1.4], null, [N.D5, 1.4], null,
        [N.G5, 0.9], [N.Gb5, 0.9], [N.F5, 0.9], [N.E5, 0.9], [N.Eb5, 1.2], [N.D5, 1.2], [N.B4, 1.4], null,
      ],
      bassSeq: [
        N.C2, N.C2, N.C3, 0, N.C2, N.C2, N.G2, 0, N.C2, N.C2, N.C3, 0, N.Bb1, 0, N.B1, 0,
        N.Ab1, N.Ab1, N.Ab2, 0, N.Ab1, N.Ab1, N.Eb2, 0, N.Ab1, N.Ab1, N.Ab2, 0, N.G1, 0, N.Ab1, 0,
        N.F1, N.F1, N.F2, 0, N.F1, N.F1, N.C2, 0, N.F1, N.F1, N.F2, 0, N.G1, 0, N.Ab1, 0,
        N.G1, N.G1, N.G2, 0, N.G1, N.G1, N.D2, 0, N.G1, N.Ab1, N.A1, N.Bb1, N.B1, 0, N.G1, 0,
        N.C2, N.C2, N.C3, N.C2, N.Eb2, 0, N.G2, 0, N.C2, N.C2, N.C3, N.C2, N.Bb1, 0, N.G1, 0,
        N.Ab1, N.Ab1, N.Ab2, N.Ab1, N.C2, 0, N.Eb2, 0, N.Ab1, N.Ab1, N.Ab2, N.Ab1, N.G1, 0, N.F1, 0,
        N.F1, N.F1, N.F2, N.F1, N.Ab1, 0, N.C2, 0, N.D2, N.D2, N.D3, 0, N.Eb2, 0, N.F2, 0,
        N.G1, N.G1, N.G2, N.G1, N.B1, 0, N.D2, 0, N.G1, N.G2, N.G1, N.G2, N.G1, N.Ab1, N.A1, N.B1,
      ],
      arpSeq: [
        ...repeat([N.C4, 0, N.G4, 0], 4),
        ...repeat([N.Ab3, 0, N.Eb4, 0], 4),
        ...repeat([N.F3, 0, N.C4, 0], 4),
        ...repeat([N.G3, 0, N.B3, N.D4], 4),
        ...repeat([N.C4, N.Eb4, N.G4, N.C5], 4),
        ...repeat([N.Ab3, N.C4, N.Eb4, N.Ab4], 4),
        ...repeat([N.F3, N.Ab3, N.C4, N.F4], 4),
        ...repeat([N.G3, N.B3, N.D4, N.F4], 4),
      ],
      chordPads: {
        0: [N.C3, N.G3, N.Eb4], 16: [N.Ab2, N.Eb3, N.C4], 32: [N.F2, N.C3, N.Ab3], 48: [N.G2, N.D3, N.B3],
        64: [N.C3, N.G3, N.C4], 80: [N.Ab2, N.Eb3, N.Ab3], 96: [N.F2, N.C3, N.F3], 112: [N.G2, N.D3, N.G3],
      },
    },

    // 🌻 오메가 플라위 — Toby Fox: Finale (190 BPM · C Minor / Eb Major Authentic High-Speed Breakbeat Symphony!)
    omegaFlowey: {
      label: 'FINALE',
      title: 'Finale (Toby Fox)',
      mp3: '/audio/finale.mp3',
      stepMs: 79,
      drumStyle: 'finale',
      synth: {
        leadWave1: 'square', leadWave2: 'sawtooth', detuneRatio: 1.0035,
        leadGain: 0.056, leadCutoffStart: 5200, leadCutoffEnd: 2200, leadQ: 2.0,
        bassWave: 'sawtooth', bassGain: 0.074, bassCutoffStart: 1250, bassCutoffEnd: 380,
        arpWave: 'triangle', arpGain: 0.038, arpHarmonic: true,
      },
      leadSeq: [
        // Bar 1 (Cm): Iconic Finale Your-Best-Friend-transformed soaring motif!
        [N.G5, 1.8], null, [N.Eb5, 1.8], null, [N.G5, 1.8], null, [N.Ab5, 2.0], null,
        [N.G5, 1.8], null, [N.F5, 1.8], null, [N.Eb5, 1.8], null, [N.D5, 1.8], null,
        // Bar 2 (Ab): Hopeful 6-Souls rising response
        [N.Eb5, 3.2], null, null, null, [N.C5, 1.8], null, [N.D5, 1.8], null,
        [N.Eb5, 1.8], null, [N.F5, 1.8], null, [N.G5, 3.2], null, null, null,
        // Bar 3 (Bb): Rapid soaring determination motif
        [N.F5, 1.8], null, [N.D5, 1.8], null, [N.F5, 1.8], null, [N.G5, 2.0], null,
        [N.F5, 1.8], null, [N.Eb5, 1.8], null, [N.D5, 1.8], null, [N.C5, 1.8], null,
        // Bar 4 (G7 -> Cm): Dramatic baroque climb
        [N.D5, 3.0], null, null, null, [N.G5, 2.0], null, [N.A5, 1.8], null,
        [N.B5, 2.8], null, null, [N.A5, 1.4], [N.G5, 2.0], null, [N.B5, 1.8], null,
        // Bar 5 (Climax Cm — High-Octave Triumphant Finale!)
        [N.C6, 1.8], null, [N.G5, 1.8], null, [N.C6, 1.8], null, [N.D6, 2.0], null,
        [N.Eb6, 2.2], null, [N.D6, 1.6], null, [N.C6, 1.8], null, [N.Bb5, 1.8], null,
        // Bar 6 (Climax Ab)
        [N.Ab5, 2.0], null, [N.G5, 1.6], null, [N.Ab5, 1.8], null, [N.Bb5, 2.0], null,
        [N.C6, 2.2], null, [N.Bb5, 1.6], null, [N.Ab5, 1.8], null, [N.G5, 1.8], null,
        // Bar 7 (Climax Bb)
        [N.Bb5, 1.8], null, [N.F5, 1.8], null, [N.Bb5, 1.8], null, [N.C6, 2.0], null,
        [N.D6, 2.2], null, [N.C6, 1.6], null, [N.Bb5, 1.8], null, [N.Ab5, 1.8], null,
        // Bar 8 (Climax G7 -> C6 Finale burst!)
        [N.G5, 1.8], null, [N.F5, 1.6], null, [N.G5, 1.8], null, [N.Ab5, 1.8], null,
        [N.B5, 1.8], null, [N.C6, 1.8], null, [N.D6, 2.0], null, [N.G5, 1.8], null,
      ],
      bassSeq: [
        ...repeat([N.C2, N.C2, N.C3, 0, N.C2, 0, N.C3, N.C2], 2),
        ...repeat([N.Ab1, N.Ab1, N.Ab2, 0, N.Ab1, 0, N.Ab2, N.Ab1], 2),
        ...repeat([N.Bb1, N.Bb1, N.Bb2, 0, N.Bb1, 0, N.Bb2, N.Bb1], 2),
        N.G1, N.G1, N.G2, 0, N.G1, 0, N.B1, 0, N.G1, N.G1, N.G2, 0, N.D2, 0, N.G2, 0,
        ...repeat([N.C2, N.C2, N.C3, 0, N.C2, N.C3, N.C2, N.C3], 2),
        ...repeat([N.Ab1, N.Ab1, N.Ab2, 0, N.Ab1, N.Ab2, N.Ab1, N.Ab2], 2),
        ...repeat([N.Bb1, N.Bb1, N.Bb2, 0, N.Bb1, N.Bb2, N.Bb1, N.Bb2], 2),
        N.G1, N.G1, N.G2, 0, N.G1, 0, N.B1, 0, N.G1, N.G2, N.G1, N.G2, N.D2, 0, N.G1, 0,
      ],
      arpSeq: [
        // Authentic nonstop Finale baroque harp/bell ostinato!
        ...repeat([N.C5, N.G5, N.Eb5, N.G5], 4),
        ...repeat([N.Ab4, N.Eb5, N.C5, N.Eb5], 4),
        ...repeat([N.Bb4, N.F5, N.D5, N.F5], 4),
        ...repeat([N.G4, N.D5, N.B4, N.D5], 4),
        ...repeat([N.C6, N.G5, N.Eb6, N.G5], 4),
        ...repeat([N.Ab5, N.Eb5, N.C6, N.Eb5], 4),
        ...repeat([N.Bb5, N.F5, N.D6, N.F5], 4),
        ...repeat([N.G5, N.D5, N.B5, N.G6], 4),
      ],
      chordPads: {
        0: [N.C3, N.G3, N.Eb4], 16: [N.Ab2, N.Eb3, N.C4], 32: [N.Bb2, N.F3, N.D4], 48: [N.G2, N.D3, N.B3],
        64: [N.C3, N.G3, N.C4], 80: [N.Ab2, N.Eb3, N.Ab3], 96: [N.Bb2, N.F3, N.Bb3], 112: [N.G2, N.D3, N.G3],
      },
    },

    // 🛡️ 불사의 언다인 — Toby Fox: Battle Against a True Hero (150 BPM · G Minor Exact Piano Arpeggios & Tragic Heroic Lead!)
    undying: {
      label: 'BATTLE AGAINST A TRUE HERO',
      title: 'Battle Against a True Hero (Toby Fox)',
      mp3: '/audio/battle-against-a-true-hero.mp3',
      stepMs: 100,
      drumStyle: 'march',
      synth: {
        leadWave1: 'sawtooth', leadWave2: 'triangle', detuneRatio: 1.003,
        leadGain: 0.06, leadCutoffStart: 4000, leadCutoffEnd: 1700, leadQ: 2.0,
        bassWave: 'sawtooth', bassGain: 0.072, bassCutoffStart: 1020, bassCutoffEnd: 300,
        arpWave: 'triangle', arpGain: 0.042, arpHarmonic: true,
      },
      leadSeq: [
        // Bar 1 (Gm): Exact Iconic BAATH Theme — Bb4 -> C5-D5 -> G5 -> F5-D5!
        [N.Bb4, 3.4], null, null, null, [N.C5, 1.8], null, [N.D5, 1.8], null,
        [N.G5, 3.4], null, null, null, [N.F5, 1.8], null, [N.D5, 1.8], null,
        // Bar 2 (Eb): C5 -> D5 -> Bb4 -> A4-G4
        [N.C5, 3.4], null, null, null, [N.D5, 3.4], null, null, null,
        [N.Bb4, 3.4], null, null, null, [N.A4, 1.8], null, [N.G4, 1.8], null,
        // Bar 3 (F): Second Phrase — Bb4 -> C5-D5 -> G5 -> F5-G5!
        [N.Bb4, 3.4], null, null, null, [N.C5, 1.8], null, [N.D5, 1.8], null,
        [N.G5, 3.4], null, null, null, [N.F5, 1.8], null, [N.G5, 1.8], null,
        // Bar 4 (D7): A5 -> G5-F5 -> D5 (dramatic resolve!)
        [N.A5, 3.6], null, null, null, [N.G5, 1.8], null, [N.F5, 1.8], null,
        [N.D5, 4.8], null, null, null, null, null, [N.F5, 1.8], null,
        // Bar 5 (Climax Eb — Blazing Spear of Justice / True Hero Peak!)
        [N.Eb5, 1.8], null, [N.F5, 1.8], null, [N.G5, 2.2], null, [N.Bb5, 2.2], null,
        [N.A5, 1.8], null, [N.G5, 1.8], null, [N.F5, 1.8], null, [N.D5, 1.8], null,
        // Bar 6 (Climax F)
        [N.Eb5, 1.8], null, [N.F5, 1.8], null, [N.G5, 2.0], null, [N.A5, 2.0], null,
        [N.Bb5, 2.4], null, [N.A5, 1.6], null, [N.G5, 1.8], null, [N.F5, 1.8], null,
        // Bar 7 (Climax Gm)
        [N.G5, 3.0], null, null, null, [N.A5, 1.8], null, [N.Bb5, 1.8], null,
        [N.C6, 2.4], null, [N.Bb5, 1.6], null, [N.A5, 1.8], null, [N.G5, 1.8], null,
        // Bar 8 (Climax D7 -> G5 noble resolve!)
        [N.A5, 3.0], null, null, null, [N.G5, 1.8], null, [N.Gb5, 1.8], null,
        [N.D5, 3.0], null, null, null, [N.G5, 3.0], null, null, null,
      ],
      bassSeq: [
        N.G2, 0, N.G3, 0, N.G2, 0, N.G3, N.G2, N.G2, 0, N.G3, 0, N.F2, 0, N.G2, 0,
        N.Eb2, 0, N.Eb3, 0, N.Eb2, 0, N.Eb3, N.Eb2, N.Eb2, 0, N.Eb3, 0, N.D2, 0, N.Eb2, 0,
        N.F2, 0, N.F3, 0, N.F2, 0, N.F3, N.F2, N.F2, 0, N.F3, 0, N.Eb2, 0, N.F2, 0,
        N.D2, 0, N.D3, 0, N.D2, 0, N.D3, N.D2, N.D2, 0, N.Gb2, 0, N.A2, 0, N.D2, 0,
        N.Eb2, N.Eb2, N.Eb3, 0, N.Eb2, 0, N.Eb3, N.Eb2, N.Eb2, N.Eb2, N.Eb3, 0, N.G2, 0, N.Bb2, 0,
        N.F2, N.F2, N.F3, 0, N.F2, 0, N.F3, N.F2, N.F2, N.F2, N.F3, 0, N.A2, 0, N.C3, 0,
        N.G2, N.G2, N.G3, 0, N.G2, 0, N.G3, N.G2, N.G2, N.G2, N.G3, 0, N.F2, 0, N.Eb2, 0,
        N.D2, N.D2, N.D3, 0, N.D2, 0, N.Gb2, 0, N.D2, 0, N.A2, 0, N.D2, N.E2, N.Gb2, N.G2,
      ],
      arpSeq: [
        // Authentic rising & falling classical piano 16th-note arpeggios!
        ...repeat([N.G4, N.Bb4, N.D5, N.F5, N.G5, N.F5, N.D5, N.Bb4], 2),
        ...repeat([N.Eb4, N.G4, N.Bb4, N.D5, N.Eb5, N.D5, N.Bb4, N.G4], 2),
        ...repeat([N.F4, N.A4, N.C5, N.Eb5, N.F5, N.Eb5, N.C5, N.A4], 2),
        ...repeat([N.D4, N.Gb4, N.A4, N.C5, N.D5, N.C5, N.A4, N.Gb4], 2),
        ...repeat([N.Eb5, N.G5, N.Bb5, N.Eb6, N.D6, N.Bb5, N.G5, N.Eb5], 2),
        ...repeat([N.F5, N.A5, N.C6, N.F6, N.Eb6, N.C6, N.A5, N.F5], 2),
        ...repeat([N.G5, N.Bb5, N.D6, N.G6, N.F6, N.D6, N.Bb5, N.G5], 2),
        ...repeat([N.D5, N.Gb5, N.A5, N.D6, N.C6, N.A5, N.Gb5, N.D5], 2),
      ],
      chordPads: {
        0: [N.G3, N.Bb3, N.D4], 16: [N.Eb3, N.G3, N.Bb3], 32: [N.F3, N.A3, N.C4], 48: [N.D3, N.Gb3, N.A3],
        64: [N.Eb3, N.Bb3, N.G4], 80: [N.F3, N.C4, N.A4], 96: [N.G3, N.D4, N.Bb4], 112: [N.D3, N.A3, N.Gb4],
      },
    },

    // 👁️ 포세이큰 — FORSAKEN · VOID CORRUPTION (136 BPM · E Phrygian Gothic Industrial Void Boss)
    forsaken: {
      label: 'CORRUPTION',
      title: 'Forsaken · Void Corruption',
      mp3: '/audio/forsaken.mp3',
      stepMs: 110,
      drumStyle: 'gothic',
      synth: {
        leadWave1: 'square', leadWave2: 'triangle', detuneRatio: 1.009,
        leadGain: 0.052, leadCutoffStart: 2800, leadCutoffEnd: 780, leadQ: 3.5,
        bassWave: 'sawtooth', bassGain: 0.078, bassCutoffStart: 760, bassCutoffEnd: 190,
        arpWave: 'sine', arpGain: 0.028,
      },
      leadSeq: [
        [N.E4, 2.2], null, [N.F4, 1.5], null, [N.G4, 2.2], null, [N.F4, 1.5], null,
        [N.E4, 1.8], null, [N.B4, 2.2], null, [N.A4, 1.5], null, [N.G4, 1.5], null,
        [N.F4, 2.2], null, [N.A4, 1.5], null, [N.C5, 2.2], null, [N.B4, 1.5], null,
        [N.A4, 1.8], null, [N.G4, 1.8], null, [N.F4, 2.2], null, [N.E4, 1.4], null,
        [N.D4, 2.2], null, [N.F4, 1.5], null, [N.A4, 2.2], null, [N.G4, 1.5], null,
        [N.F4, 1.8], null, [N.E4, 1.8], null, [N.D4, 2.0], null, [N.F4, 1.4], null,
        [N.E4, 1.8], null, [N.G4, 1.8], null, [N.B4, 2.4], null, [N.Eb5, 1.6], null,
        [N.E5, 2.2], null, [N.B4, 1.6], null, [N.A4, 1.6], null, [N.F4, 1.6], null,
        [N.E5, 1.6], null, [N.F5, 1.4], null, [N.E5, 1.4], null, [N.B4, 1.4], null,
        [N.C5, 1.6], null, [N.B4, 1.4], null, [N.A4, 1.4], null, [N.G4, 1.4], null,
        [N.F5, 1.6], null, [N.A5, 1.6], null, [N.G5, 1.6], null, [N.F5, 1.4], null,
        [N.E5, 1.6], null, [N.D5, 1.4], null, [N.C5, 1.6], null, [N.B4, 1.4], null,
        [N.G5, 1.8], null, [N.F5, 1.4], null, [N.E5, 1.6], null, [N.D5, 1.4], null,
        [N.C5, 1.6], null, [N.B4, 1.4], null, [N.A4, 1.6], null, [N.G4, 1.4], null,
        [N.B5, 2.0], null, [N.A5, 1.4], null, [N.G5, 1.4], null, [N.F5, 1.4], null,
        [N.E5, 1.4], null, [N.Eb5, 1.4], null, [N.B4, 1.8], null, [N.F4, 1.4], null,
      ],
      bassSeq: [
        N.E1, 0, N.E2, 0, N.E1, N.E1, N.E2, 0, N.E1, 0, N.E2, 0, N.F1, 0, N.E1, 0,
        N.F1, 0, N.F2, 0, N.F1, N.F1, N.F2, 0, N.F1, 0, N.F2, 0, N.E1, 0, N.F1, 0,
        N.D2, 0, N.D3, 0, N.D2, N.D2, N.D3, 0, N.D2, 0, N.C2, 0, N.B1, 0, N.D2, 0,
        N.E1, 0, N.E2, 0, N.B1, 0, N.B2, 0, N.E1, N.E2, N.F1, N.F2, N.E1, 0, N.B1, 0,
        N.E1, N.E1, N.E2, 0, N.F1, 0, N.E2, 0, N.E1, N.E1, N.E2, 0, N.G1, 0, N.F1, 0,
        N.F1, N.F1, N.F2, 0, N.A1, 0, N.F2, 0, N.F1, N.F1, N.F2, 0, N.E1, 0, N.D2, 0,
        N.G1, N.G1, N.G2, 0, N.F1, 0, N.E1, 0, N.A1, N.A1, N.A2, 0, N.G1, 0, N.F1, 0,
        N.B1, N.B1, N.B2, 0, N.B1, 0, N.Eb2, 0, N.B1, N.B2, N.A1, N.G1, N.F1, 0, N.E1, 0,
      ],
      arpSeq: [
        ...repeat([N.E5, 0, N.B4, N.F5], 4),
        ...repeat([N.F5, 0, N.C5, N.A5], 4),
        ...repeat([N.D5, 0, N.A4, N.F5], 4),
        ...repeat([N.E5, 0, N.B4, N.Eb5], 4),
        ...repeat([N.E5, N.B4, N.F5, N.E5], 4),
        ...repeat([N.F5, N.C5, N.A5, N.F5], 4),
        ...repeat([N.G5, N.D5, N.A5, N.E5], 4),
        ...repeat([N.B5, N.Eb5, N.F5, N.B4], 4),
      ],
      chordPads: {
        0: [N.E2, N.B2, N.G3], 16: [N.F2, N.C3, N.A3], 32: [N.D2, N.A2, N.F3], 48: [N.E2, N.B2, N.E3], 56: [N.B2, N.Eb3, N.A3],
        64: [N.E2, N.B2, N.E3], 80: [N.F2, N.C3, N.F3], 96: [N.G2, N.D3, N.G3], 112: [N.B2, N.Gb3, N.B3],
      },
    },

    // 🌟 메타톤 NEO — Toby Fox: Power of "NEO" (138 BPM · C# Minor Exact Authentic Electronic Glam-Rock Anthem!)
    mettatonNeo: {
      label: 'POWER OF "NEO"',
      title: 'Power of "NEO" (Toby Fox)',
      mp3: '/audio/power-of-neo.mp3',
      stepMs: 108,
      drumStyle: 'anthem',
      synth: {
        leadWave1: 'sawtooth', leadWave2: 'square', detuneRatio: 1.005,
        leadGain: 0.058, leadCutoffStart: 4800, leadCutoffEnd: 1700, leadQ: 2.6,
        overdrive: 20,
        bassWave: 'sawtooth', bassGain: 0.08, bassCutoffStart: 1120, bassCutoffEnd: 290,
        arpWave: 'square', arpGain: 0.024,
      },
      leadSeq: [
        // Bar 1 (C#m): Exact Iconic Power of "NEO" Synth-Brass Lead! E5 -> Gb5-Ab5 -> Db6 -> B5-Ab5!
        [N.E5, 3.4], null, null, null, [N.Gb5, 1.8], null, [N.Ab5, 1.8], null,
        [N.Db6, 3.4], null, null, null, [N.B5, 1.8], null, [N.Ab5, 1.8], null,
        // Bar 2 (A): Gb5 -> Ab5 -> E5 -> Eb5-Db5!
        [N.Gb5, 3.4], null, null, null, [N.Ab5, 3.4], null, null, null,
        [N.E5, 3.4], null, null, null, [N.Eb5, 1.8], null, [N.Db5, 1.8], null,
        // Bar 3 (B): Second Phrase — E5 -> Gb5-Ab5 -> Db6 -> B5-Db6!
        [N.E5, 3.4], null, null, null, [N.Gb5, 1.8], null, [N.Ab5, 1.8], null,
        [N.Db6, 3.4], null, null, null, [N.B5, 1.8], null, [N.Db6, 1.8], null,
        // Bar 4 (G#7): Eb6 -> Db6-B5 -> Ab5!
        [N.Eb6, 3.6], null, null, null, [N.Db6, 1.8], null, [N.B5, 1.8], null,
        [N.Ab5, 4.6], null, null, null, null, null, [N.B5, 1.8], null,
        // Bar 5-8: Staccato Glam-Synth Overdrive Hook (Death by Glamour / NEO Rhythm!)
        [N.Db5, 0.9], [N.Db5, 0.9], [N.E5, 1.5], null, [N.Db5, 1.2], null, [N.Ab5, 1.6], null,
        [N.Gb5, 1.5], null, [N.E5, 1.5], null, [N.Eb5, 1.5], null, [N.Db5, 1.5], null,
        [N.A4, 0.9], [N.A4, 0.9], [N.Db5, 1.5], null, [N.E5, 1.6], null, [N.Ab5, 1.6], null,
        [N.Gb5, 1.5], null, [N.E5, 1.5], null, [N.Db5, 1.6], null, [N.E5, 1.4], null,
        [N.B4, 0.9], [N.B4, 0.9], [N.Eb5, 1.5], null, [N.Gb5, 1.6], null, [N.B5, 1.8], null,
        [N.Ab5, 1.5], null, [N.Gb5, 1.5], null, [N.E5, 1.5], null, [N.Eb5, 1.5], null,
        [N.Ab5, 1.8], null, [N.B5, 1.6], null, [N.Db6, 2.0], null, [N.Eb6, 2.0], null,
        [N.Db6, 1.2], [N.B5, 1.2], [N.Ab5, 1.2], [N.Gb5, 1.2], [N.E5, 1.4], null, [N.Eb5, 1.4], null,
      ],
      bassSeq: [
        // Iconic driving pulsing 8th-note Power of NEO synth bass (C#m -> A -> B -> G#)!
        ...repeat([N.Db2, N.Db2, N.Db3, N.Db2, N.Db2, N.Db3, N.Db2, N.Db3], 2),
        ...repeat([N.A1, N.A1, N.A2, N.A1, N.A1, N.A2, N.A1, N.A2], 2),
        ...repeat([N.B1, N.B1, N.B2, N.B1, N.B1, N.B2, N.B1, N.B2], 2),
        ...repeat([N.Ab1, N.Ab1, N.Ab2, N.Ab1, N.Ab1, N.Ab2, N.Ab1, N.Ab2], 2),
        ...repeat([N.Db2, N.Db2, N.Db3, 0, N.Db2, N.Db3, N.E2, N.Gb2], 2),
        ...repeat([N.A1, N.A1, N.A2, 0, N.A1, N.A2, N.B1, N.Db2], 2),
        ...repeat([N.B1, N.B1, N.B2, 0, N.B1, N.B2, N.Db2, N.Eb2], 2),
        N.Ab1, N.Ab1, N.Ab2, 0, N.C2, 0, N.Eb2, 0, N.Ab1, N.B1, N.Db2, N.Eb2, N.Ab1, 0, N.B1, 0,
      ],
      arpSeq: [
        ...repeat([N.Db5, N.E5, N.Ab5, N.Db6], 4),
        ...repeat([N.A4, N.Db5, N.E5, N.A5], 4),
        ...repeat([N.B4, N.Eb5, N.Gb5, N.B5], 4),
        ...repeat([N.Ab4, N.C5, N.Eb5, N.Ab5], 4),
        ...repeat([N.Db5, N.Ab5, N.E5, N.Db6], 4),
        ...repeat([N.A4, N.E5, N.Db5, N.A5], 4),
        ...repeat([N.B4, N.Gb5, N.Eb5, N.B5], 4),
        ...repeat([N.Ab4, N.Eb5, N.C5, N.Ab5], 4),
      ],
      chordPads: {
        0: [N.Db3, N.E3, N.Ab3], 16: [N.A2, N.Db3, N.E3], 32: [N.B2, N.Eb3, N.Gb3], 48: [N.Ab2, N.C3, N.Eb3],
        64: [N.Db3, N.Ab3, N.Db4], 80: [N.A2, N.E3, N.A3], 96: [N.B2, N.Gb3, N.B3], 112: [N.Ab2, N.Eb3, N.Ab3],
      },
    },
  };
})();

export default function TangtangPage({ playerName = '' }) {
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
  const [bgmPreviewHeroId, setBgmPreviewHeroId] = useState(null);
  const heroBgmRef = useRef({
    active: false,
    heroId: null,
    preview: false,
    intervalId: null,
    step: 0,
    audioEl: null,
    audioHeroId: null,
    hasMp3: {},
  });
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
  const reverseWeaponProgressRef = useRef(0);
  const [specialHeroAreaOpen, setSpecialHeroAreaOpen] = useState(false);
  const specialHeroAreaOpenRef = useRef(false);
  const errorCodeProgressRef = useRef(0);
  const recordedOverRef = useRef(false);

  useEffect(() => {
    const GRANT_120K_KEY = 'gangyoon-tangtang-grant-120k-v1';
    let shouldGrant120k = false;
    try {
      shouldGrant120k = !window.localStorage.getItem(GRANT_120K_KEY);
    } catch {
      shouldGrant120k = false;
    }

    try {
      const saved = JSON.parse(window.localStorage.getItem(BLACK_MARKET_KEY) || '{}');
      const loaded = {
        gold:
          (Number.isFinite(Number(saved.gold)) ? Math.max(0, Number(saved.gold)) : DEFAULT_BLACK_MARKET.gold) +
          (shouldGrant120k ? 120000 : 0),
        owned: saved.owned && typeof saved.owned === 'object' ? saved.owned : {},
        equipped: saved.equipped && typeof saved.equipped === 'object' ? saved.equipped : {},
      };
      bmStateRef.current = loaded;
      setBmState(loaded);
      if (shouldGrant120k) {
        window.localStorage.setItem(BLACK_MARKET_KEY, JSON.stringify(loaded));
      }
    } catch {
      bmStateRef.current = DEFAULT_BLACK_MARKET;
    }

    try {
      const savedMeta = JSON.parse(window.localStorage.getItem(LOBBY_META_KEY) || '{}');
      const loadedMeta = {
        coins:
          (Number.isFinite(Number(savedMeta.coins)) ? Math.max(0, Number(savedMeta.coins)) : DEFAULT_LOBBY_META.coins) +
          (shouldGrant120k ? 120000 : 0),
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
        unlockStats: {
          ...DEFAULT_LOBBY_META.unlockStats,
          ...(savedMeta.unlockStats && typeof savedMeta.unlockStats === 'object' ? savedMeta.unlockStats : {}),
        },
      };
      lobbyMetaRef.current = loadedMeta;
      setLobbyMeta(loadedMeta);
      if (shouldGrant120k) {
        window.localStorage.setItem(LOBBY_META_KEY, JSON.stringify(loadedMeta));
        window.localStorage.setItem(GRANT_120K_KEY, '1');
      }
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

  function earnLobbyCoins(amount, killDelta = null) {
    if ((!amount || amount <= 0) && !killDelta) return;
    const prevStats = lobbyMetaRef.current.unlockStats ?? DEFAULT_LOBBY_META.unlockStats;
    const nextStats = killDelta
      ? {
          ...prevStats,
          totalKills: (prevStats.totalKills ?? 0) + (killDelta.kills ?? 0),
          eliteKills: (prevStats.eliteKills ?? 0) + (killDelta.elite ?? 0),
          bossClears: (prevStats.bossClears ?? 0) + (killDelta.boss ?? 0),
        }
      : prevStats;
    const next = {
      ...lobbyMetaRef.current,
      coins: lobbyMetaRef.current.coins + Math.max(0, amount || 0),
      unlockStats: nextStats,
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

  function recordSansDeath() {
    updateLobbyMeta((prev) => ({
      ...prev,
      unlockStats: {
        ...(prev.unlockStats ?? DEFAULT_LOBBY_META.unlockStats),
        sansDeaths: ((prev.unlockStats?.sansDeaths ?? 0) + 1),
      },
    }));
  }

  function recordChapterClear(heroId) {
    if (heroId !== 'asriel') return;
    updateLobbyMeta((prev) => ({
      ...prev,
      unlockStats: {
        ...(prev.unlockStats ?? DEFAULT_LOBBY_META.unlockStats),
        asrielClears: ((prev.unlockStats?.asrielClears ?? 0) + 1),
      },
    }));
  }

  function returnToLobby(tab = 'deploy') {
    stopHeroBgm();
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

  function stopHeroBgm() {
    const bgm = heroBgmRef.current;
    bgm.active = false;
    bgm.heroId = null;
    bgm.preview = false;
    setBgmPreviewHeroId(null);
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

  function startHeroChiptuneLoop(heroId) {
    const bgm = heroBgmRef.current;
    const track = SPECIAL_HERO_BGM[heroId];
    if (!track || !bgm.active || bgm.heroId !== heroId || bgmMutedRef.current) return;
    if (bgm.intervalId) {
      window.clearInterval(bgm.intervalId);
      bgm.intervalId = null;
    }

    const { leadSeq, bassSeq, arpSeq, chordPads, stepMs, drumStyle, synth, pitchWarp } = track;
    const stepDur = stepMs / 1000;
    const totalSteps = leadSeq.length;

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

    const distCurves = {};
    function getOverdriveCurve(amount) {
      if (distCurves[amount]) return distCurves[amount];
      const samples = 256;
      const curve = new Float32Array(samples);
      for (let i = 0; i < samples; i += 1) {
        const x = (i * 2) / samples - 1;
        curve[i] = ((3 + amount) * x * 20 * (Math.PI / 180)) / (Math.PI + amount * Math.abs(x));
      }
      distCurves[amount] = curve;
      return curve;
    }

    bgm.step = 0;
    bgm.intervalId = window.setInterval(() => {
      if (!bgm.active || bgm.heroId !== heroId || bgmMutedRef.current) return;
      if (!bgm.preview && (!gameRef.current.running || gameRef.current.over)) {
        stopHeroBgm();
        return;
      }
      const ctx = getAudioContext();
      if (!ctx) return;

      const step = bgm.step % totalSteps;
      bgm.step += 1;
      const now = ctx.currentTime;
      const barStep = step % 16;
      const inPart2 = Boolean(synth.part2Step && step >= synth.part2Step);

      // 1. Lead Synth (Dual-Oscillator + Authentic EarthBound/SNES Overdrive Shaper + Dynamic Filter!)
      const leadEntry = leadSeq[step];
      if (leadEntry) {
        const [rawFreq, mult] = leadEntry;
        const dur = stepDur * mult;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(synth.leadCutoffStart, now);
        filter.frequency.exponentialRampToValueAtTime(synth.leadCutoffEnd, now + dur);
        filter.Q.setValueAtTime(synth.leadQ, now);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(synth.leadGain, now + 0.007);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

        const osc1 = ctx.createOscillator();
        osc1.type = inPart2 && synth.part2Wave1 ? synth.part2Wave1 : synth.leadWave1;
        osc1.frequency.setValueAtTime(rawFreq, now);

        const osc2 = ctx.createOscillator();
        osc2.type = inPart2 && synth.part2Wave2 ? synth.part2Wave2 : synth.leadWave2;
        osc2.frequency.setValueAtTime(rawFreq * synth.detuneRatio, now);

        if (pitchWarp) {
          const bendTarget = step >= 64 ? rawFreq * (step % 2 === 0 ? 1.04 : 0.96) : rawFreq * 0.985;
          osc1.frequency.exponentialRampToValueAtTime(Math.max(40, bendTarget), now + dur);
          osc2.frequency.exponentialRampToValueAtTime(Math.max(40, bendTarget * synth.detuneRatio), now + dur);
        }

        const driveAmt = inPart2 && synth.part2Overdrive !== undefined ? synth.part2Overdrive : (synth.overdrive ?? 0);
        if (driveAmt > 0) {
          const shaper = ctx.createWaveShaper();
          shaper.curve = getOverdriveCurve(driveAmt);
          shaper.oversample = '2x';
          osc1.connect(shaper);
          osc2.connect(shaper);
          shaper.connect(filter);
        } else {
          osc1.connect(filter);
          osc2.connect(filter);
        }

        filter.connect(gain);
        gain.connect(ctx.destination);
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + dur + 0.015);
        osc2.stop(now + dur + 0.015);
      }

      // 2. Piano / Harp / Bell Arpeggio Counter-Layer (with sparkling octave overtone!)
      const arpFreq = arpSeq ? arpSeq[step % arpSeq.length] : 0;
      if (arpFreq && synth.arpWave) {
        const aOsc = ctx.createOscillator();
        const aGain = ctx.createGain();
        aOsc.type = synth.arpWave;
        aOsc.frequency.setValueAtTime(arpFreq, now);
        aGain.gain.setValueAtTime(0.0001, now);
        aGain.gain.linearRampToValueAtTime(synth.arpGain ?? 0.024, now + 0.004);
        aGain.gain.exponentialRampToValueAtTime(0.0001, now + stepDur * 0.95);
        aOsc.connect(aGain);
        aGain.connect(ctx.destination);
        aOsc.start(now);
        aOsc.stop(now + stepDur * 1.05);

        if (synth.arpHarmonic) {
          // Crisp piano/harp upper harmonic pluck
          const hOsc = ctx.createOscillator();
          const hGain = ctx.createGain();
          hOsc.type = 'sine';
          hOsc.frequency.setValueAtTime(arpFreq * 2, now);
          hGain.gain.setValueAtTime(0.0001, now);
          hGain.gain.linearRampToValueAtTime((synth.arpGain ?? 0.024) * 0.42, now + 0.003);
          hGain.gain.exponentialRampToValueAtTime(0.0001, now + stepDur * 0.55);
          hOsc.connect(hGain);
          hGain.connect(ctx.destination);
          hOsc.start(now);
          hOsc.stop(now + stepDur * 0.6);
        }
      }

      // 3. Punchy Layered Bassline (Sawtooth Growl + Warm Triangle Sub!)
      const bassFreq = bassSeq[step];
      if (bassFreq) {
        const bFilter = ctx.createBiquadFilter();
        bFilter.type = 'lowpass';
        bFilter.frequency.setValueAtTime(synth.bassCutoffStart, now);
        bFilter.frequency.exponentialRampToValueAtTime(synth.bassCutoffEnd, now + stepDur * 1.05);

        const bGain = ctx.createGain();
        bGain.gain.setValueAtTime(0.0001, now);
        bGain.gain.linearRampToValueAtTime(synth.bassGain, now + 0.006);
        bGain.gain.exponentialRampToValueAtTime(0.0001, now + stepDur * 1.15);

        const bassOsc = ctx.createOscillator();
        bassOsc.type = synth.bassWave;
        bassOsc.frequency.setValueAtTime(bassFreq, now);

        const subOsc = ctx.createOscillator();
        subOsc.type = 'triangle';
        subOsc.frequency.setValueAtTime(bassFreq, now);

        bassOsc.connect(bFilter);
        subOsc.connect(bGain);
        bFilter.connect(bGain);
        bGain.connect(ctx.destination);
        bassOsc.start(now);
        subOsc.start(now);
        bassOsc.stop(now + stepDur * 1.2);
        subOsc.stop(now + stepDur * 1.2);
      }

      // 4. Chord Stabs / Orchestral Pads
      const chord = chordPads[step] || (step >= 64 && step % 4 === 0 ? chordPads[Math.floor(step / 16) * 16] : null);
      if (chord) {
        const isClimaxStab = step >= 64;
        const cDur = isClimaxStab ? stepDur * 1.35 : stepDur * 2.8;
        chord.forEach((freq) => {
          const cOsc = ctx.createOscillator();
          const cGain = ctx.createGain();
          cOsc.type = drumStyle === 'march' || drumStyle === 'finale' ? 'triangle' : 'sawtooth';
          cOsc.frequency.setValueAtTime(freq, now);
          cGain.gain.setValueAtTime(0.0001, now);
          cGain.gain.linearRampToValueAtTime(isClimaxStab ? 0.015 : 0.011, now + 0.012);
          cGain.gain.exponentialRampToValueAtTime(0.0001, now + cDur);
          cOsc.connect(cGain);
          cGain.connect(ctx.destination);
          cOsc.start(now);
          cOsc.stop(now + cDur + 0.015);
        });
      }

      // 5. Character-Specific Drum Kit Patterns
      let kickHit = false;
      let snareHit = false;
      let hatHit = false;
      let glitchBurst = false;

      if (drumStyle === 'finale') {
        // High-speed Toby Fox Finale breakbeat!
        kickHit = barStep === 0 || barStep === 3 || barStep === 8 || barStep === 10 || barStep === 14;
        snareHit = barStep === 4 || barStep === 12 || (step >= 64 && barStep === 15);
        hatHit = true;
      } else if (drumStyle === 'anthem') {
        kickHit = barStep === 0 || barStep === 6 || barStep === 8 || barStep === 10 || barStep === 14;
        snareHit = barStep === 4 || barStep === 12 || (step >= 120 && barStep % 2 === 0);
        hatHit = true;
      } else if (drumStyle === 'industrial') {
        kickHit = barStep === 0 || barStep === 2 || barStep === 6 || barStep === 8 || barStep === 10 || barStep === 14;
        snareHit = barStep === 4 || barStep === 12 || (step >= 112 && barStep === 15);
        hatHit = step % 2 === 1 || step >= 64;
      } else if (drumStyle === 'nightmare') {
        kickHit = barStep === 0 || barStep === 3 || barStep === 7 || barStep === 10 || (step >= 64 && barStep === 13);
        snareHit = barStep === 4 || barStep === 11 || (step >= 64 && (barStep === 6 || barStep === 14));
        hatHit = step >= 32 && (step % 2 === 0 || barStep % 3 === 0);
        glitchBurst = (step >= 64 && (barStep === 15 || barStep === 7)) || step === 14 || step === 30;
      } else if (drumStyle === 'march') {
        kickHit = barStep === 0 || barStep === 3 || barStep === 8 || barStep === 11 || barStep === 14;
        snareHit = barStep === 4 || barStep === 12 || barStep === 14 || barStep === 15 || (step >= 64 && barStep === 6);
        hatHit = step % 2 === 0 || step >= 64;
      } else if (drumStyle === 'gothic') {
        kickHit = barStep === 0 || barStep === 6 || barStep === 8 || (step >= 64 && barStep === 11);
        snareHit = barStep === 4 || barStep === 12;
        hatHit = step % 2 === 1 || (step >= 64 && barStep % 4 === 2);
      } else {
        kickHit = barStep === 0 || barStep === 6 || barStep === 8 || barStep === 14;
        snareHit = barStep === 4 || barStep === 12 || (step >= 120 && barStep % 2 === 0);
        hatHit = step % 2 === 1 || step >= 64;
      }

      if (kickHit) {
        const kick = ctx.createOscillator();
        const kGain = ctx.createGain();
        kick.type = 'sine';
        kick.frequency.setValueAtTime(drumStyle === 'gothic' ? 135 : 162, now);
        kick.frequency.exponentialRampToValueAtTime(drumStyle === 'gothic' ? 32 : 38, now + 0.09);
        kGain.gain.setValueAtTime(barStep === 0 || barStep === 8 ? 0.125 : 0.082, now);
        kGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
        kick.connect(kGain);
        kGain.connect(ctx.destination);
        kick.start(now);
        kick.stop(now + 0.11);
      }
      if (snareHit) {
        const src = ctx.createBufferSource();
        src.buffer = getNoiseBuffer(ctx);
        const sFilter = ctx.createBiquadFilter();
        sFilter.type = 'bandpass';
        sFilter.frequency.setValueAtTime(drumStyle === 'march' ? 2400 : drumStyle === 'gothic' ? 1400 : 2000, now);
        const sGain = ctx.createGain();
        sGain.gain.setValueAtTime(drumStyle === 'march' && (barStep === 14 || barStep === 15) ? 0.052 : 0.082, now);
        sGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
        src.connect(sFilter);
        sFilter.connect(sGain);
        sGain.connect(ctx.destination);
        src.start(now);
        src.stop(now + 0.12);

        // Snare tonal body snap!
        const sBody = ctx.createOscillator();
        const sbGain = ctx.createGain();
        sBody.type = 'triangle';
        sBody.frequency.setValueAtTime(220, now);
        sBody.frequency.exponentialRampToValueAtTime(115, now + 0.055);
        sbGain.gain.setValueAtTime(0.055, now);
        sbGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);
        sBody.connect(sbGain);
        sbGain.connect(ctx.destination);
        sBody.start(now);
        sBody.stop(now + 0.07);
      }
      if (hatHit) {
        const hSrc = ctx.createBufferSource();
        hSrc.buffer = getNoiseBuffer(ctx);
        const hFilter = ctx.createBiquadFilter();
        hFilter.type = 'highpass';
        hFilter.frequency.setValueAtTime(7500, now);
        const hGain = ctx.createGain();
        hGain.gain.setValueAtTime(step % 2 === 0 ? 0.026 : 0.017, now);
        hGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);
        hSrc.connect(hFilter);
        hFilter.connect(hGain);
        hGain.connect(ctx.destination);
        hSrc.start(now);
        hSrc.stop(now + 0.04);
      }
      if (glitchBurst) {
        const gSrc = ctx.createBufferSource();
        gSrc.buffer = getNoiseBuffer(ctx);
        const gFilter = ctx.createBiquadFilter();
        gFilter.type = 'bandpass';
        gFilter.frequency.setValueAtTime(3400, now);
        gFilter.Q.setValueAtTime(4, now);
        const gGain = ctx.createGain();
        gGain.gain.setValueAtTime(0.075, now);
        gGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
        gSrc.connect(gFilter);
        gFilter.connect(gGain);
        gGain.connect(ctx.destination);
        gSrc.start(now);
        gSrc.stop(now + 0.08);
      }
    }, stepMs);
  }

  function startHeroBgm(heroId, { preview = false } = {}) {
    const track = SPECIAL_HERO_BGM[heroId];
    if (!track) {
      stopHeroBgm();
      return;
    }
    if (bgmMutedRef.current) return;
    stopHeroBgm();
    const bgm = heroBgmRef.current;
    bgm.active = true;
    bgm.heroId = heroId;
    bgm.preview = Boolean(preview);
    setBgmPreviewHeroId(preview ? heroId : null);

    // Optional local user-supplied MP3 (e.g. public/audio/megalovania.mp3); seamlessly plays built-in chiptune theme if absent!
    const playMp3 = () => {
      if (!bgm.active || bgm.heroId !== heroId || bgmMutedRef.current) return;
      if (!bgm.audioEl || bgm.audioHeroId !== heroId) {
        const el = new Audio(track.mp3);
        el.loop = true;
        el.volume = 0.45;
        bgm.audioEl = el;
        bgm.audioHeroId = heroId;
      }
      bgm.audioEl.currentTime = 0;
      bgm.audioEl.play().catch(() => {
        bgm.hasMp3[heroId] = false;
        startHeroChiptuneLoop(heroId);
      });
    };

    if (bgm.hasMp3[heroId] === true) {
      playMp3();
      return;
    }
    if (bgm.hasMp3[heroId] === false) {
      startHeroChiptuneLoop(heroId);
      return;
    }

    fetch(track.mp3, { method: 'HEAD' })
      .then((res) => {
        if (!bgm.active || bgm.heroId !== heroId || bgmMutedRef.current) return;
        if (res.ok) {
          bgm.hasMp3[heroId] = true;
          playMp3();
        } else {
          bgm.hasMp3[heroId] = false;
          startHeroChiptuneLoop(heroId);
        }
      })
      .catch(() => {
        bgm.hasMp3[heroId] = false;
        if (bgm.active && bgm.heroId === heroId && !bgmMutedRef.current) {
          startHeroChiptuneLoop(heroId);
        }
      });
  }

  function toggleBgmMute() {
    setBgmMuted((prev) => {
      const next = !prev;
      bgmMutedRef.current = next;
      if (next) {
        stopHeroBgm();
      } else if (gameRef.current.running && !gameRef.current.over) {
        const activeId = HEROES[gameRef.current.heroIndex]?.id;
        if (SPECIAL_HERO_BGM[activeId]) {
          startHeroBgm(activeId);
        }
      }
      return next;
    });
  }

  function toggleLobbyBgmPreview(heroId) {
    if (!SPECIAL_HERO_BGM[heroId]) return;
    getAudioContext();
    if (heroBgmRef.current.active && heroBgmRef.current.preview && heroBgmRef.current.heroId === heroId) {
      stopHeroBgm();
      return;
    }
    if (bgmMutedRef.current) {
      bgmMutedRef.current = false;
      setBgmMuted(false);
    }
    startHeroBgm(heroId, { preview: true });
  }

  function resetGame(stageIndex = selectedStage, weaponIndex = selectedWeapon, heroIndex = selectedHero) {
    getAudioContext();
    closeBlackMarket();
    recordedOverRef.current = false;
    const equippedBm = bmStateRef.current.equipped;
    const safeHeroIndex = isHeroUnlocked(HEROES[heroIndex], bmStateRef.current.owned, lobbyMetaRef.current.unlockStats)
      ? heroIndex
      : 0;
    const safeHero = HEROES[safeHeroIndex] ?? HEROES[0];
    const sigIdx = safeHero.signatureWeaponId
      ? weapons.findIndex((w) => w.id === safeHero.signatureWeaponId)
      : -1;
    const chosenSpec = weapons[weaponIndex];
    const unlockKey = chosenSpec?.blackMarketUnlockId;
    const exclusiveMismatch = chosenSpec?.exclusiveHeroId && chosenSpec.exclusiveHeroId !== safeHero.id;
    const safeWeaponIndex = sigIdx >= 0
      ? sigIdx
      : (unlockKey && !bmStateRef.current.owned?.[unlockKey]) || exclusiveMismatch
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
    if (SPECIAL_HERO_BGM[safeHero.id]) {
      startHeroBgm(safeHero.id);
    } else {
      stopHeroBgm();
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
    if (!isHeroUnlocked(HEROES[index], bmStateRef.current.owned, lobbyMetaRef.current.unlockStats)) return;
    getAudioContext();
    const nextHero = HEROES[index] ?? HEROES[0];
    const sigIdx = nextHero.signatureWeaponId
      ? weapons.findIndex((w) => w.id === nextHero.signatureWeaponId)
      : -1;
    let nextWeaponIdx = selectedWeapon;
    if (sigIdx >= 0) {
      // Special heroes can ONLY wield their own signature weapon -> auto-equip!
      nextWeaponIdx = sigIdx;
    } else {
      const curW = weapons[nextWeaponIdx];
      const lockedByBm = curW?.blackMarketUnlockId && !bmStateRef.current.owned?.[curW.blackMarketUnlockId];
      const lockedByHero = curW?.exclusiveHeroId && curW.exclusiveHeroId !== nextHero.id;
      if (lockedByBm || lockedByHero) {
        nextWeaponIdx = 0;
      }
    }
    if (heroBgmRef.current.preview) {
      if (SPECIAL_HERO_BGM[nextHero.id]) {
        startHeroBgm(nextHero.id, { preview: true });
      } else {
        stopHeroBgm();
      }
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
    if (activeHero?.signatureWeaponId && weapons[index]?.id !== activeHero.signatureWeaponId) return;
    const targetW = weapons[index];
    if (targetW?.exclusiveHeroId && targetW.exclusiveHeroId !== activeHero?.id) return;
    const unlockKey = targetW?.blackMarketUnlockId;
    if (!activeHero?.signatureWeaponId && unlockKey && !bmStateRef.current.owned?.[unlockKey]) return;
    getAudioContext();
    setSelectedWeapon(index);
    gameRef.current.player.weaponIndex = index;
    gameRef.current.player.cooldown = 0;
    queueSound(gameRef.current, 'switch');
    setHud({ ...gameRef.current, player: { ...gameRef.current.player } });

    // Mobile & Click Secret Easter Eggs:
    // - Forward 1→2→3→4→5→6→7→8→9 opens Black Market!
    // - Reverse (12→11→10→)9→8→7→6→5→4→3→2→1 opens the secret ERROR special hero & weapon panel!
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

      const reverseSeq = '987654321';
      if (digit === reverseSeq[reverseWeaponProgressRef.current]) {
        reverseWeaponProgressRef.current += 1;
        if (reverseWeaponProgressRef.current >= reverseSeq.length) {
          reverseWeaponProgressRef.current = 0;
          specialHeroAreaOpenRef.current = true;
          setSpecialHeroAreaOpen(true);
          playSound('blackMarket');
        }
      } else {
        reverseWeaponProgressRef.current = digit === '9' ? 1 : 0;
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
      updateGame(
        gameRef.current,
        inputRef.current,
        canvas,
        delta,
        earnBlackMarketGold,
        earnLobbyCoins,
        recordChapterClear,
      );
      if (gameRef.current.over) {
        if (heroBgmRef.current.active) {
          stopHeroBgm();
        }
        if (!recordedOverRef.current) {
          recordedOverRef.current = true;
          const fallenHero = HEROES[gameRef.current.heroIndex ?? 0];
          if (fallenHero?.id === 'sans') {
            recordSansDeath();
          }
        }
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

      // Secret Lobby Easter Egg: press 123456789 (Black Market) or type "error" (Special Character Zone) while in lobby (!running)
      const targetTag = event.target?.tagName?.toLowerCase();
      const typingInField = targetTag === 'input' || targetTag === 'textarea' || Boolean(event.target?.isContentEditable);
      if (!gameRef.current.running && !event.repeat && !typingInField) {
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

        const letter =
          /^Key[A-Z]$/.test(event.code) ? event.code.slice(3).toLowerCase() :
          /^[a-z]$/.test(key) ? key : '';
        if (letter) {
          const errorSeq = 'error';
          if (letter === errorSeq[errorCodeProgressRef.current]) {
            errorCodeProgressRef.current += 1;
            if (errorCodeProgressRef.current >= errorSeq.length) {
              errorCodeProgressRef.current = 0;
              specialHeroAreaOpenRef.current = true;
              setSpecialHeroAreaOpen(true);
              playSound('blackMarket');
              return;
            }
          } else {
            errorCodeProgressRef.current = letter === 'e' ? 1 : 0;
          }
        }
      }

      const code = event.code || '';
      if (['arrowup', 'w'].includes(key) || code === 'KeyW') inputRef.current.up = true;
      if (['arrowdown', 's'].includes(key) || code === 'KeyS') inputRef.current.down = true;
      if (['arrowleft', 'a'].includes(key) || code === 'KeyA') inputRef.current.left = true;
      if (['arrowright', 'd'].includes(key) || code === 'KeyD') inputRef.current.right = true;
      if (gameRef.current.running && !event.repeat && ([' ', 'e', 'q'].includes(key) || code === 'KeyE' || code === 'KeyQ')) {
        event.preventDefault();
        activateUltimate();
      }
      if (!gameRef.current.running && Number(key) >= 1 && Number(key) <= Math.min(9, weapons.length)) {
        setWeapon(Number(key) - 1, true);
      }
    }

    function handleKeyUp(event) {
      const key = event.key.toLowerCase();
      const code = event.code || '';
      if (['arrowup', 'w'].includes(key) || code === 'KeyW') inputRef.current.up = false;
      if (['arrowdown', 's'].includes(key) || code === 'KeyS') inputRef.current.down = false;
      if (['arrowleft', 'a'].includes(key) || code === 'KeyA') inputRef.current.left = false;
      if (['arrowright', 'd'].includes(key) || code === 'KeyD') inputRef.current.right = false;
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

  useEffect(() => () => stopHeroBgm(), []);

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
  const selectedHeroObj = HEROES[selectedHero] ?? HEROES[0];
  const signatureWeaponId = selectedHeroObj.signatureWeaponId || null;
  const isSansSelected = selectedHeroObj.id === 'sans';
  const isSansSynergyActive = Boolean(isSansSelected && weapons[selectedWeapon]?.id === 'gaster');
  const isAsrielSynergyActive = Boolean(selectedHeroObj.id === 'asriel' && weapons[selectedWeapon]?.id === 'chaosSaber');
  const isCharaSynergyActive = Boolean(selectedHeroObj.id === 'chara' && weapons[selectedWeapon]?.id === 'realKnife');
  const unlockStats = lobbyMeta.unlockStats ?? DEFAULT_LOBBY_META.unlockStats;
  const visibleHeroEntries = HEROES
    .map((hero, index) => ({
      hero,
      index,
      unlocked: isHeroUnlocked(hero, bmState.owned, unlockStats),
    }))
    .filter(({ hero, unlocked }) => !hero.blackMarketUnlockId || unlocked);
  const baseHeroEntries = visibleHeroEntries.filter(({ hero }) => !hero.signatureWeaponId);
  const specialHeroEntries = visibleHeroEntries.filter(({ hero }) => Boolean(hero.signatureWeaponId));
  const visibleWeaponEntries = weapons
    .map((weapon, index) => ({ weapon, index }))
    .filter(({ weapon }) => {
      if (signatureWeaponId) {
        return weapon.id === signatureWeaponId;
      }
      return !weapon.exclusiveHeroId && !weapon.blackMarketUnlockId;
    });
  const specialWeaponEntries = weapons
    .map((weapon, index) => ({ weapon, index }))
    .filter(({ weapon }) => Boolean(weapon.exclusiveHeroId || weapon.blackMarketUnlockId));
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
          {SPECIAL_HERO_BGM[activeHeroObj.id] && (
            <button
              type="button"
              className={
                !bgmMuted
                  ? bmStyles.aimToggleBtn
                  : `${bmStyles.aimToggleBtn} ${bmStyles.aimToggleBtnAuto}`
              }
              onClick={toggleBgmMute}
            >
              {bgmMuted ? '🔇 BGM OFF' : `🎵 ${SPECIAL_HERO_BGM[activeHeroObj.id].label} ON`}
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
              <span>
                HP
                {(player.maxAwakenings ?? 0) > 0 && (
                  <>
                    {' '}
                    <strong style={{ color: (player.awakeningStage ?? 0) >= 2 ? '#facc15' : '#fb923c', fontSize: '0.78rem' }}>
                      {(player.awakeningStage ?? 0) >= 2
                        ? '⚡2차 초각성'
                        : (player.awakeningStage ?? 0) === 1
                          ? (player.maxAwakenings ?? 0) > 1
                            ? `🔥1차 각성 (잔여 ${(player.maxAwakenings ?? 1) - 1})`
                            : '🔥각성 완료'
                          : `각성 0/${player.maxAwakenings}`}
                    </strong>
                  </>
                )}
              </span>
              <em>
                {Math.ceil(player.hp).toLocaleString()} / {player.maxHp.toLocaleString()}
              </em>
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
              {activeWeaponUlt.icon} 필살기 ·{' '}
              {isSansSynergyActive
                ? '심판의 회랑 · 메갈로바니아'
                : isAsrielSynergyActive
                  ? '호프 앤 드림즈 · 하이퍼 고너'
                  : isCharaSynergyActive
                    ? '세계 삭제 · ERASE (9999999)'
                    : activeWeaponUlt.name}{' '}
              ({ultReady ? 'SPACE 발동!' : `${ultPct}%`})
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
            <em>HP {Math.ceil(player.hp).toLocaleString()}</em>
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
                    <h2>🏕️ {playerName ? `${playerName}님의 ` : ''}탕탕 작전 준비 로비</h2>
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
                        <span>캐릭터 선택 ({baseHeroEntries.length}명)</span>
                        <span>{HEROES[selectedHero].icon} {HEROES[selectedHero].name}</span>
                      </div>
                      <div className={bmStyles.heroPicker} aria-label="캐릭터 선택">
                        {baseHeroEntries.map(({ hero: heroItem, index, unlocked }) => {
                          const lockLabel = !unlocked
                            ? getHeroQuestLabel(heroItem, unlockStats)
                            : heroItem.role;
                          return (
                            <button
                              key={heroItem.id}
                              type="button"
                              disabled={!unlocked}
                              style={!unlocked ? { opacity: 0.52, cursor: 'not-allowed' } : undefined}
                              className={
                                selectedHero === index
                                  ? `${bmStyles.heroBtn} ${bmStyles.heroBtnActive}`
                                  : bmStyles.heroBtn
                              }
                              onClick={() => selectHero(index)}
                              title={!unlocked ? lockLabel : heroItem.perk}
                            >
                              <span className={bmStyles.heroIcon} style={{ background: heroItem.body }}>
                                {unlocked ? heroItem.icon : '🔒'}
                              </span>
                              <span className={bmStyles.heroName}>{heroItem.name}</span>
                              <span className={bmStyles.heroRole}>{lockLabel}</span>
                            </button>
                          );
                        })}
                      </div>

                      {specialHeroAreaOpen && specialHeroEntries.length > 0 && (
                        <div
                          style={{
                            marginTop: '10px',
                            padding: '10px',
                            borderRadius: '14px',
                            border: '1px solid rgba(239, 68, 68, 0.55)',
                            background: 'linear-gradient(135deg, rgba(24, 9, 24, 0.92), rgba(15, 23, 42, 0.92))',
                            boxShadow: '0 0 22px rgba(239, 68, 68, 0.22)',
                          }}
                        >
                          <div className={bmStyles.lobbySectionTitle} style={{ marginTop: 0 }}>
                            <span style={{ color: '#f87171', fontWeight: 800 }}>
                              ⚠️ ERROR · 특별 캐릭터 선택 ({specialHeroEntries.length}명)
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                specialHeroAreaOpenRef.current = false;
                                setSpecialHeroAreaOpen(false);
                              }}
                              className={bmStyles.lobbySecondaryBtn}
                              style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                            >
                              숨기기
                            </button>
                          </div>
                          <div className={bmStyles.heroPicker} aria-label="특별 캐릭터 선택">
                            {specialHeroEntries.map(({ hero: heroItem, index, unlocked }) => {
                              const lockLabel = !unlocked
                                ? getHeroQuestLabel(heroItem, unlockStats)
                                : heroItem.role;
                              return (
                                <button
                                  key={heroItem.id}
                                  type="button"
                                  disabled={!unlocked}
                                  style={!unlocked ? { opacity: 0.52, cursor: 'not-allowed' } : undefined}
                                  className={
                                    selectedHero === index
                                      ? `${bmStyles.heroBtn} ${bmStyles.heroBtnActive}`
                                      : bmStyles.heroBtn
                                  }
                                  onClick={() => selectHero(index)}
                                  title={!unlocked ? lockLabel : heroItem.perk}
                                >
                                  <span className={bmStyles.heroIcon} style={{ background: heroItem.body }}>
                                    {unlocked ? heroItem.icon : '🔒'}
                                  </span>
                                  <span className={bmStyles.heroName}>{heroItem.name}</span>
                                  <span className={bmStyles.heroRole}>{lockLabel}</span>
                                </button>
                              );
                            })}
                          </div>

                          <div className={bmStyles.lobbySectionTitle} style={{ marginTop: '12px' }}>
                            <span style={{ color: '#fbbf24', fontWeight: 800 }}>
                              ⚔️ ERROR · 특별 무기 선택 ({specialWeaponEntries.length}종)
                            </span>
                            <span style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                              전용 무기 클릭 시 해당 특별 캐릭 자동 선택
                            </span>
                          </div>
                          <div className="startWeaponPicker" aria-label="특별 무기 선택" style={{ maxWidth: '100%' }}>
                            {specialWeaponEntries.map(({ weapon, index }) => {
                              const ownerHeroIdx = weapon.exclusiveHeroId
                                ? HEROES.findIndex((h) => h.id === weapon.exclusiveHeroId)
                                : -1;
                              const ownerHero = ownerHeroIdx >= 0 ? HEROES[ownerHeroIdx] : null;
                              const sansIdx = HEROES.findIndex((h) => h.id === 'sans');
                              const sansUnlocked = sansIdx >= 0 && isHeroUnlocked(HEROES[sansIdx], bmState.owned, unlockStats);
                              const bmOwned = weapon.blackMarketUnlockId
                                ? Boolean(bmState.owned?.[weapon.blackMarketUnlockId])
                                : false;
                              const weaponUnlocked = ownerHero
                                ? isHeroUnlocked(ownerHero, bmState.owned, unlockStats)
                                : weapon.id === 'gaster'
                                  ? bmOwned || sansUnlocked
                                  : bmOwned;
                              const blockedBySpecialHero = Boolean(
                                !ownerHero &&
                                signatureWeaponId &&
                                weapon.id !== signatureWeaponId &&
                                !(weapon.id === 'gaster' && sansUnlocked),
                              );
                              const canClick = weaponUnlocked && !blockedBySpecialHero;
                              const subTag = !weaponUnlocked
                                ? '🔒 잠금'
                                : ownerHero
                                  ? `${ownerHero.icon} ${ownerHero.name} 전용`
                                  : blockedBySpecialHero
                                    ? '기본 캐릭 전용'
                                    : weapon.id === 'gaster' && !bmOwned
                                      ? '💀 샌즈 전용'
                                      : '장착 가능';

                              return (
                                <button
                                  key={weapon.id}
                                  type="button"
                                  disabled={!canClick}
                                  style={!canClick ? { opacity: 0.48, cursor: 'not-allowed' } : undefined}
                                  className={selectedWeapon === index ? 'active' : ''}
                                  title={`${weapon.name} · ${subTag} — ${weapon.detail}`}
                                  onClick={() => {
                                    if (!canClick) return;
                                    if (ownerHeroIdx >= 0) {
                                      selectHero(ownerHeroIdx);
                                    } else if (weapon.id === 'gaster' && (!bmOwned || signatureWeaponId)) {
                                      if (sansIdx >= 0) selectHero(sansIdx);
                                    } else {
                                      setWeapon(index, true);
                                    }
                                  }}
                                >
                                  <i style={{ background: weapon.color }} />
                                  <span>
                                    {weaponUnlocked ? weapon.name : `🔒 ${weapon.name}`}
                                    <small style={{ display: 'block', fontSize: '0.7rem', opacity: 0.82 }}>
                                      {subTag}
                                    </small>
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      <div className={bmStyles.heroPerkNote}>
                        <div>
                          {HEROES[selectedHero].icon} {HEROES[selectedHero].name}: {HEROES[selectedHero].perk}
                        </div>
                        {SPECIAL_HERO_BGM[selectedHeroObj.id] && (
                          <div
                            style={{
                              marginTop: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '8px',
                              flexWrap: 'wrap',
                            }}
                          >
                            <span style={{ color: '#fde047', fontWeight: 700 }}>
                              🎵 전용 BGM: {SPECIAL_HERO_BGM[selectedHeroObj.id].title}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleLobbyBgmPreview(selectedHeroObj.id)}
                              className={bmStyles.lobbySecondaryBtn}
                              style={{ padding: '4px 10px', fontSize: '0.82rem' }}
                            >
                              {bgmPreviewHeroId === selectedHeroObj.id ? '⏹ 미리듣기 정지' : '▶ 노래 미리듣기'}
                            </button>
                          </div>
                        )}
                      </div>

                      <div className={bmStyles.lobbySectionTitle}>
                        <span>
                          {signatureWeaponId
                            ? `${selectedHeroObj.icon} ${selectedHeroObj.name} 전용 무기 고정 (${lobbySelectedWeapon.name} 전용!)`
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
                        {lobbyWeaponUlt.icon} 무기 필살기 ·{' '}
                        <strong>
                          {isSansSynergyActive
                            ? '심판의 회랑 · 메갈로바니아'
                            : isAsrielSynergyActive
                              ? '호프 앤 드림즈 · 하이퍼 고너'
                              : isCharaSynergyActive
                                ? '세계 삭제 · ERASE (9999999)'
                                : lobbyWeaponUlt.name}
                        </strong>
                        :{' '}
                        {isSansSynergyActive
                          ? '⚡ 시너지 콤보 발동! 3.1초마다 [뼈 감옥 십자 심판] & [심판의 회랑 대격돌] 추가 기술 자동 발동 + 12블래스터·24뼈다귀 초강화 필살기!'
                          : isAsrielSynergyActive
                            ? '🌈 시너지 콤보 발동! 3.2초마다 [하이퍼 고너] 무지개 소용돌이·낙뢰·회복 추가 기술 발동 + 24연 별똥별·16연 낙뢰 초강화 필살기!'
                            : isCharaSynergyActive
                              ? '🔪 시너지 콤보 발동! 3.0초마다 [ERASE 3중 진홍 참격 & 10연 칼날] 추가 기술 발동 + 620px 9999999 초강화 필살기!'
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
                    const unlockedViaChallenge =
                      item.isHeroUnlock &&
                      isHeroUnlocked(
                        HEROES.find((h) => h.id === item.unlockHeroId),
                        bmState.owned,
                        unlockStats,
                      );
                    const isOwned = Boolean(bmState.owned[item.id]) || Boolean(unlockedViaChallenge);
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
                                  if (wIdx >= 0) {
                                    specialHeroAreaOpenRef.current = true;
                                    setSpecialHeroAreaOpen(true);
                                    setWeapon(wIdx, true);
                                  }
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
                                  if (hIdx >= 0) {
                                    specialHeroAreaOpenRef.current = true;
                                    setSpecialHeroAreaOpen(true);
                                    selectHero(hIdx);
                                  }
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
