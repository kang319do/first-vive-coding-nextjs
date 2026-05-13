import { Fragment, useEffect, useMemo, useRef, useState } from 'react';

const mapWidth = 18;
const mapHeight = 12;

const buildTools = [
  { id: 'wall', name: '벽', mark: 'W' },
  { id: 'house', name: '집', mark: 'H' },
  { id: 'farm', name: '밭', mark: 'F' },
  { id: 'lamp', name: '등불', mark: 'L' },
];

const weapons = [
  { id: 'stick', name: '나무 몽둥이', mark: 'ST', damage: 1, range: 1, cooldown: 0.8, grade: 'common', effect: 'knockback', effectText: '넉백 1' },
  { id: 'dagger', name: '그림자 단검', mark: 'DG', damage: 2, range: 1, cooldown: 0.55, grade: 'common', effect: 'bleed', effectText: '출혈' },
  { id: 'sword', name: '기사의 철검', mark: 'SW', damage: 3, range: 1, cooldown: 0.95, grade: 'rare', effect: 'cleave', effectText: '광역 1칸' },
  { id: 'axe', name: '전투 도끼', mark: 'AX', damage: 4, range: 1, cooldown: 1.25, grade: 'rare', effect: 'stun', effectText: '기절' },
  { id: 'spear', name: '긴 사냥창', mark: 'SP', damage: 3, range: 2, cooldown: 1.05, grade: 'rare', effect: 'pierce', effectText: '관통 2체' },
  { id: 'bow', name: '바람 활', mark: 'BW', damage: 2, range: 4, cooldown: 1.15, grade: 'epic', effect: 'knockback', effectText: '원거리 넉백' },
  { id: 'crossbow', name: '강철 석궁', mark: 'CB', damage: 3, range: 4, cooldown: 1.55, grade: 'epic', effect: 'pierce', effectText: '관통 2체' },
  { id: 'wand', name: '별빛 지팡이', mark: 'WD', damage: 3, range: 3, cooldown: 1.2, grade: 'epic', effect: 'slow', effectText: '둔화' },
  { id: 'fireStaff', name: '화염 지팡이', mark: 'FS', damage: 5, range: 3, cooldown: 1.9, grade: 'legend', effect: 'burn', effectText: '화상' },
  { id: 'hammer', name: '거인의 망치', mark: 'HM', damage: 6, range: 1, cooldown: 2.2, grade: 'legend', effect: 'heavyKnockback', effectText: '강한 넉백' },
];

const maps = [
  {
    id: 'meadow',
    name: '초원 마을',
    start: { x: 4, y: 6 },
    theme: 'meadow',
    blocked: ['2,2', '3,2', '13,3', '14,3', '6,9', '7,9'],
    water: ['0,8', '1,8', '2,8', '0,9', '1,9', '0,10'],
    resources: ['8,4', '9,4', '10,5', '11,5'],
    monsters: [
      { id: 'slime-a', type: 'slime', name: '슬라임', x: 11, y: 4, hp: 4, maxHp: 4 },
      { id: 'wolf-a', type: 'wolf', name: '늑대', x: 15, y: 7, hp: 6, maxHp: 6 },
    ],
  },
  {
    id: 'forest',
    name: '깊은 숲',
    start: { x: 8, y: 8 },
    theme: 'forest',
    blocked: ['1,1', '2,1', '5,2', '11,2', '12,2', '15,3', '3,6', '4,6', '12,8', '13,8'],
    water: ['7,0', '7,1', '8,1', '8,2', '9,2'],
    resources: ['6,5', '7,5', '8,5', '9,6', '10,6'],
    monsters: [
      { id: 'goblin-a', type: 'goblin', name: '고블린', x: 13, y: 5, hp: 8, maxHp: 8 },
      { id: 'spider-a', type: 'spider', name: '거미', x: 5, y: 9, hp: 5, maxHp: 5 },
    ],
  },
  {
    id: 'quarry',
    name: '돌 채석장',
    start: { x: 2, y: 9 },
    theme: 'quarry',
    blocked: ['4,2', '5,2', '6,2', '12,3', '13,3', '10,7', '11,7', '14,8'],
    water: ['15,10', '16,10', '17,10', '16,11', '17,11'],
    resources: ['8,3', '9,3', '9,4', '10,4', '11,5'],
    monsters: [
      { id: 'golem-a', type: 'golem', name: '돌 골렘', x: 9, y: 5, hp: 12, maxHp: 12 },
      { id: 'bat-a', type: 'bat', name: '박쥐', x: 15, y: 5, hp: 4, maxHp: 4 },
    ],
  },
  {
    id: 'desert',
    name: '모래 유적',
    start: { x: 15, y: 8 },
    theme: 'desert',
    blocked: ['2,3', '3,3', '4,3', '2,4', '11,5', '12,5', '13,5', '7,8'],
    water: ['5,10', '6,10', '5,11', '6,11'],
    resources: ['9,2', '10,2', '9,3', '14,7'],
    monsters: [
      { id: 'scorpion-a', type: 'scorpion', name: '전갈', x: 8, y: 6, hp: 7, maxHp: 7 },
      { id: 'mummy-a', type: 'mummy', name: '미라', x: 4, y: 7, hp: 10, maxHp: 10 },
    ],
  },
  {
    id: 'snow',
    name: '눈 능선',
    start: { x: 3, y: 3 },
    theme: 'snow',
    blocked: ['6,1', '7,1', '8,1', '13,4', '14,4', '4,8', '5,8', '11,9'],
    water: ['0,5', '1,5', '2,5', '1,6'],
    resources: ['9,6', '10,6', '11,6', '12,7'],
    monsters: [
      { id: 'yeti-a', type: 'yeti', name: '설인', x: 12, y: 6, hp: 14, maxHp: 14 },
      { id: 'ice-a', type: 'ice', name: '얼음 정령', x: 7, y: 9, hp: 8, maxHp: 8 },
    ],
  },
  {
    id: 'swamp',
    name: '늪지대',
    start: { x: 14, y: 2 },
    theme: 'swamp',
    blocked: ['3,1', '4,1', '10,3', '11,3', '5,7', '6,7', '15,9'],
    water: ['2,8', '3,8', '4,8', '3,9', '4,9', '5,9', '4,10'],
    resources: ['8,5', '9,5', '10,6', '11,6'],
    monsters: [
      { id: 'toad-a', type: 'toad', name: '독 두꺼비', x: 8, y: 8, hp: 7, maxHp: 7 },
      { id: 'shade-a', type: 'shade', name: '그림자', x: 2, y: 4, hp: 9, maxHp: 9 },
    ],
  },
  {
    id: 'harbor',
    name: '항구',
    start: { x: 5, y: 5 },
    theme: 'harbor',
    blocked: ['1,2', '2,2', '9,4', '10,4', '11,4', '14,7', '15,7'],
    water: ['0,0', '1,0', '2,0', '0,1', '1,1', '16,10', '17,10', '17,11'],
    resources: ['6,8', '7,8', '8,8', '12,2'],
    monsters: [
      { id: 'pirate-a', type: 'pirate', name: '해적', x: 12, y: 6, hp: 9, maxHp: 9 },
      { id: 'crab-a', type: 'crab', name: '큰 게', x: 4, y: 9, hp: 6, maxHp: 6 },
    ],
  },
  {
    id: 'ember',
    name: '불씨 협곡',
    start: { x: 9, y: 9 },
    theme: 'ember',
    blocked: ['5,2', '6,2', '12,2', '13,2', '3,6', '4,6', '14,6', '15,6'],
    water: ['8,0', '9,0', '8,1', '9,1'],
    resources: ['7,5', '8,5', '9,5', '10,5', '11,5'],
    monsters: [
      { id: 'imp-a', type: 'imp', name: '불 임프', x: 5, y: 8, hp: 8, maxHp: 8 },
      { id: 'drake-a', type: 'drake', name: '작은 드레이크', x: 13, y: 9, hp: 16, maxHp: 16 },
    ],
  },
];

const monsterMarks = {
  slime: 'SL',
  wolf: 'WF',
  goblin: 'GB',
  spider: 'SP',
  golem: 'GL',
  bat: 'BT',
  scorpion: 'SC',
  mummy: 'MM',
  yeti: 'YT',
  ice: 'IC',
  toad: 'TD',
  shade: 'SH',
  pirate: 'PR',
  crab: 'CR',
  imp: 'IM',
  drake: 'DR',
  hornet: 'HN',
  shaman: 'SM',
  lizard: 'LZ',
  wraith: 'WR',
  knight: 'KN',
  lava: 'LV',
  titan: 'TN',
};

const extraMonstersByMap = {
  meadow: [
    { id: 'mushroom-a', type: 'slime', name: '버섯몹', x: 6, y: 4, hp: 5, maxHp: 5 },
  ],
  forest: [
    { id: 'hornet-a', type: 'hornet', name: '독 벌', x: 9, y: 8, hp: 7, maxHp: 7 },
    { id: 'shaman-a', type: 'shaman', name: '숲 주술사', x: 15, y: 9, hp: 9, maxHp: 9 },
  ],
  quarry: [
    { id: 'lizard-a', type: 'lizard', name: '돌 도마뱀', x: 6, y: 7, hp: 10, maxHp: 10 },
    { id: 'golem-b', type: 'golem', name: '작은 골렘', x: 13, y: 9, hp: 13, maxHp: 13 },
  ],
  desert: [
    { id: 'scarab-a', type: 'scorpion', name: '황금 풍뎅이', x: 12, y: 8, hp: 12, maxHp: 12 },
    { id: 'wraith-a', type: 'wraith', name: '모래 망령', x: 6, y: 2, hp: 14, maxHp: 14 },
  ],
  snow: [
    { id: 'wolf-b', type: 'wolf', name: '빙설 늑대', x: 15, y: 8, hp: 14, maxHp: 14 },
    { id: 'knight-a', type: 'knight', name: '얼음 기사', x: 10, y: 3, hp: 18, maxHp: 18 },
  ],
  swamp: [
    { id: 'shade-b', type: 'shade', name: '늪 그림자', x: 13, y: 6, hp: 16, maxHp: 16 },
    { id: 'toad-b', type: 'toad', name: '거대 두꺼비', x: 7, y: 10, hp: 18, maxHp: 18 },
  ],
  harbor: [
    { id: 'pirate-b', type: 'pirate', name: '해적 선장', x: 14, y: 3, hp: 20, maxHp: 20 },
    { id: 'crab-b', type: 'crab', name: '장갑 게', x: 9, y: 9, hp: 18, maxHp: 18 },
  ],
  ember: [
    { id: 'lava-a', type: 'lava', name: '용암 정령', x: 7, y: 3, hp: 22, maxHp: 22 },
    { id: 'titan-a', type: 'titan', name: '협곡 거인', x: 15, y: 9, hp: 28, maxHp: 28 },
  ],
};

const monsterStats = {
  slime: { range: 1, cooldown: 2.4 },
  wolf: { range: 1, cooldown: 1.8 },
  goblin: { range: 1, cooldown: 1.9 },
  spider: { range: 2, cooldown: 2.3 },
  golem: { range: 1, cooldown: 3.2 },
  bat: { range: 1, cooldown: 1.5 },
  scorpion: { range: 2, cooldown: 2.2 },
  mummy: { range: 1, cooldown: 2.8 },
  yeti: { range: 1, cooldown: 3 },
  ice: { range: 3, cooldown: 2.8 },
  toad: { range: 2, cooldown: 2.6 },
  shade: { range: 2, cooldown: 2.1 },
  pirate: { range: 2, cooldown: 2 },
  crab: { range: 1, cooldown: 2.6 },
  imp: { range: 3, cooldown: 1.9 },
  drake: { range: 3, cooldown: 3 },
  hornet: { range: 1, cooldown: 1.4 },
  shaman: { range: 4, cooldown: 3 },
  lizard: { range: 1, cooldown: 2 },
  wraith: { range: 3, cooldown: 2.4 },
  knight: { range: 1, cooldown: 2.3 },
  lava: { range: 3, cooldown: 2.6 },
  titan: { range: 2, cooldown: 3.6 },
};

function keyOf(x, y) {
  return `${x},${y}`;
}

function distance(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getInitialBuilds() {
  return maps.reduce((result, map) => ({ ...result, [map.id]: {} }), {});
}

function getInitialMonsters() {
  return maps.reduce((result, map, index) => {
    const difficulty = index + 1;
    const mapMonsters = [...map.monsters, ...(extraMonstersByMap[map.id] ?? [])].map((monster) => ({
      ...monster,
      hp: monster.hp + difficulty * 2,
      maxHp: monster.maxHp + difficulty * 2,
      attack: Math.ceil(difficulty / 2),
      attackRange: monsterStats[monster.type]?.range ?? 1,
      attackCooldown: monsterStats[monster.type]?.cooldown ?? 2,
      cooldownLeft: 0,
      difficulty,
      status: {},
    }));

    return { ...result, [map.id]: mapMonsters };
  }, {});
}

function getStepToward(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) {
    return { dx: Math.sign(dx), dy: 0 };
  }

  if (dy !== 0) {
    return { dx: 0, dy: Math.sign(dy) };
  }

  return { dx: 0, dy: 0 };
}

function getRandomStep() {
  const steps = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: 0 },
  ];

  return steps[Math.floor(Math.random() * steps.length)];
}

export default function RpgPage() {
  const [mapIndex, setMapIndex] = useState(0);
  const [unlockedMapIndex, setUnlockedMapIndex] = useState(0);
  const [player, setPlayer] = useState(maps[0].start);
  const [selectedTool, setSelectedTool] = useState('wall');
  const [selectedWeapon, setSelectedWeapon] = useState('stick');
  const [isBuildMode, setIsBuildMode] = useState(false);
  const [playerCooldownLeft, setPlayerCooldownLeft] = useState(0);
  const [playerHp, setPlayerHp] = useState(30);
  const [builds, setBuilds] = useState(getInitialBuilds);
  const [monsters, setMonsters] = useState(getInitialMonsters);
  const [message, setMessage] = useState('몬스터를 찾아 무기로 공격하세요.');
  const [attackEffect, setAttackEffect] = useState(null);
  const [damagePopups, setDamagePopups] = useState([]);
  const [hitMonsterId, setHitMonsterId] = useState(null);
  const [playerHit, setPlayerHit] = useState(false);
  const [clearPopup, setClearPopup] = useState(null);
  const audioContext = useRef(null);
  const isPlayerDead = playerHp <= 0;
  const currentMap = maps[mapIndex];
  const currentBuilds = builds[currentMap.id] ?? {};
  const currentMonsters = monsters[currentMap.id] ?? [];
  const currentWeapon = weapons.find((weapon) => weapon.id === selectedWeapon) ?? weapons[0];

  const blockedTiles = useMemo(() => {
    return new Set([...currentMap.blocked, ...currentMap.water]);
  }, [currentMap]);

  const monsterTiles = useMemo(() => {
    return new Set(currentMonsters.map((monster) => keyOf(monster.x, monster.y)));
  }, [currentMonsters]);

  function canStandOn(x, y) {
    const tileKey = keyOf(x, y);
    return !blockedTiles.has(tileKey) && !currentBuilds[tileKey] && !monsterTiles.has(tileKey);
  }

  function canMonsterMoveTo(x, y, occupiedTiles) {
    const tileKey = keyOf(x, y);

    if (x < 0 || y < 0 || x >= mapWidth || y >= mapHeight) {
      return false;
    }

    return (
      !blockedTiles.has(tileKey) &&
      !currentBuilds[tileKey] &&
      !occupiedTiles.has(tileKey) &&
      !(player.x === x && player.y === y)
    );
  }

  function createMapMonsters(map, index) {
    const difficulty = index + 1;

    return [...map.monsters, ...(extraMonstersByMap[map.id] ?? [])].map((monster) => ({
      ...monster,
      hp: monster.hp + difficulty * 2,
      maxHp: monster.maxHp + difficulty * 2,
      attack: Math.ceil(difficulty / 2),
      attackRange: monsterStats[monster.type]?.range ?? 1,
      attackCooldown: monsterStats[monster.type]?.cooldown ?? 2,
      cooldownLeft: 0,
      difficulty,
      status: {},
    }));
  }

  function movePlayer(dx, dy) {
    getAudioContext();

    setPlayer((currentPlayer) => {
      const next = {
        x: clamp(currentPlayer.x + dx, 0, mapWidth - 1),
        y: clamp(currentPlayer.y + dy, 0, mapHeight - 1),
      };

      if (!canStandOn(next.x, next.y)) {
        playSound('blocked');
        return currentPlayer;
      }

      return next;
    });
  }

  function changeMap(nextIndex) {
    if (nextIndex > unlockedMapIndex) {
      setMessage('이전 맵의 몬스터를 모두 처치해야 이동할 수 있습니다.');
      return;
    }

    const nextMap = maps[nextIndex];
    setMapIndex(nextIndex);
    setPlayer(nextMap.start);
    setPlayerHp(30);
    setMessage(`${nextMap.name}에 도착했습니다.`);
  }

  function selectWeaponByOffset(offset) {
    const currentIndex = weapons.findIndex((weapon) => weapon.id === selectedWeapon);
    const nextIndex = (currentIndex + offset + weapons.length) % weapons.length;
    const nextWeapon = weapons[nextIndex];

    setSelectedWeapon(nextWeapon.id);
    setPlayerCooldownLeft(0);
    playSound('equip');
    setMessage(`${nextWeapon.name} 장착`);
  }

  function respawnMonsters() {
    setMonsters((current) => ({
      ...current,
      [currentMap.id]: createMapMonsters(currentMap, mapIndex),
    }));
    setPlayerHp(30);
    setMessage(`${currentMap.name}의 몬스터가 다시 나타났습니다.`);
  }

  function restartGame() {
    setMapIndex(0);
    setUnlockedMapIndex(0);
    setPlayer(maps[0].start);
    setPlayerHp(30);
    setBuilds(getInitialBuilds());
    setMonsters(getInitialMonsters());
    setAttackEffect(null);
    setDamagePopups([]);
    setHitMonsterId(null);
    setPlayerHit(false);
    setClearPopup(null);
    setPlayerCooldownLeft(0);
    setMessage('처음부터 다시 시작합니다.');
  }

  function completeCurrentMap() {
    if (clearPopup || isPlayerDead) {
      return;
    }

    const isLastMap = mapIndex >= maps.length - 1;
    const nextMap = maps[Math.min(mapIndex + 1, maps.length - 1)];

    setUnlockedMapIndex((currentUnlocked) => Math.max(currentUnlocked, Math.min(mapIndex + 1, maps.length - 1)));
    setClearPopup({
      title: isLastMap ? 'ALL CLEAR!' : 'MAP CLEAR!',
      body: isLastMap ? '불씨 협곡까지 모두 정복했습니다.' : `${nextMap.name}으로 이동합니다.`,
      nextName: isLastMap ? '최종 클리어' : nextMap.name,
    });
    playSound('equip');

    window.setTimeout(() => {
      setClearPopup(null);

      if (!isLastMap) {
        setMapIndex(mapIndex + 1);
        setPlayer(nextMap.start);
        setPlayerHp(30);
        setPlayerCooldownLeft(0);
        setMessage(`${nextMap.name}에 도착했습니다.`);
      }
    }, 1800);
  }

  function getAudioContext() {
    if (typeof window === 'undefined') {
      return null;
    }

    if (!audioContext.current) {
      audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (audioContext.current.state === 'suspended') {
      audioContext.current.resume();
    }

    return audioContext.current;
  }

  function playSound(type) {
    const context = getAudioContext();

    if (!context) {
      return;
    }

    const now = context.currentTime;
    const output = context.createGain();
    const oscillator = context.createOscillator();
    const filter = context.createBiquadFilter();
    const settings = {
      attack: [440, 160, 0.12, 'sawtooth'],
      magic: [760, 220, 0.22, 'sine'],
      hit: [180, 70, 0.16, 'square'],
      equip: [520, 880, 0.12, 'triangle'],
      death: [150, 38, 0.55, 'sawtooth'],
      blocked: [120, 90, 0.08, 'square'],
    }[type] ?? [360, 160, 0.14, 'sine'];
    const [startFrequency, endFrequency, duration, wave] = settings;

    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(startFrequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + duration);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1800, now);
    filter.frequency.exponentialRampToValueAtTime(360, now + duration);

    output.gain.setValueAtTime(0.0001, now);
    output.gain.exponentialRampToValueAtTime(type === 'death' ? 0.2 : 0.12, now + 0.012);
    output.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(filter);
    filter.connect(output);
    output.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.03);
  }

  function buildOnTile(x, y) {
    if (!isBuildMode) {
      return;
    }

    const tileKey = keyOf(x, y);

    if (blockedTiles.has(tileKey) || monsterTiles.has(tileKey) || (player.x === x && player.y === y)) {
      return;
    }

    setBuilds((current) => ({
      ...current,
      [currentMap.id]: {
        ...current[currentMap.id],
        [tileKey]: current[currentMap.id]?.[tileKey] ? undefined : selectedTool,
      },
    }));
  }

  function attack() {
    getAudioContext();

    if (playerCooldownLeft > 0) {
      setMessage(`${currentWeapon.name} 재사용 대기 ${playerCooldownLeft.toFixed(1)}초`);
      playSound('blocked');
      return;
    }

    const targets = currentMonsters
      .map((monster) => ({ ...monster, distance: distance(player, monster) }))
      .filter((monster) => monster.distance <= currentWeapon.range)
      .sort((a, b) => a.distance - b.distance || a.hp - b.hp);

    if (targets.length === 0) {
      setMessage(`${currentWeapon.name} 사거리 안에 몬스터가 없습니다.`);
      playSound('blocked');
      return;
    }

    const hitTargets = currentWeapon.effect === 'pierce' ? targets.slice(0, 2) : [targets[0]];
    const primaryTarget = hitTargets[0];
    const hitIds = new Set(hitTargets.map((target) => target.id));
    const occupiedAfterHit = new Set(currentMonsters.map((monster) => keyOf(monster.x, monster.y)));

    setMonsters((current) => {
      const nextMonsters = current[currentMap.id]
        .map((monster) => {
          if (!hitIds.has(monster.id)) {
            return monster;
          }

          occupiedAfterHit.delete(keyOf(monster.x, monster.y));

          let nextMonster = {
            ...monster,
            hp: monster.hp - currentWeapon.damage,
            status: { ...(monster.status ?? {}) },
          };

          if (currentWeapon.effect === 'burn') {
            nextMonster.status.burn = 3;
          }

          if (currentWeapon.effect === 'bleed') {
            nextMonster.status.bleed = 2;
          }

          if (currentWeapon.effect === 'stun') {
            nextMonster.status.stun = 1;
          }

          if (currentWeapon.effect === 'slow') {
            nextMonster.status.slow = 2;
          }

          if (['knockback', 'heavyKnockback'].includes(currentWeapon.effect)) {
            const knockbackDistance = currentWeapon.effect === 'heavyKnockback' ? 2 : 1;
            const step = getStepToward(player, monster);

            for (let i = 0; i < knockbackDistance; i += 1) {
              const pushed = {
                x: clamp(nextMonster.x + step.dx, 0, mapWidth - 1),
                y: clamp(nextMonster.y + step.dy, 0, mapHeight - 1),
              };

              if (!canMonsterMoveTo(pushed.x, pushed.y, occupiedAfterHit)) {
                break;
              }

              nextMonster = { ...nextMonster, x: pushed.x, y: pushed.y };
            }
          }

          occupiedAfterHit.add(keyOf(nextMonster.x, nextMonster.y));

          return nextMonster;
        })
        .filter((monster) => monster.hp > 0);

      return {
        ...current,
        [currentMap.id]: nextMonsters,
      };
    });

    const defeated = primaryTarget.hp - currentWeapon.damage <= 0;
    const popupId = `${Date.now()}-${primaryTarget.id}`;
    setPlayerCooldownLeft(currentWeapon.cooldown);
    playSound(['wand', 'fireStaff'].includes(currentWeapon.id) ? 'magic' : 'attack');

    setAttackEffect({
      id: popupId,
      type: currentWeapon.id,
      from: player,
      to: primaryTarget,
      range: currentWeapon.range,
    });
    setHitMonsterId(primaryTarget.id);
    setDamagePopups((current) => [
      ...current,
      ...hitTargets.map((target, index) => ({
        id: `${popupId}-${index}`,
        x: target.x,
        y: target.y,
        text: `-${currentWeapon.damage}`,
        kind: currentWeapon.effect,
      })),
    ]);
    window.setTimeout(() => setAttackEffect(null), 360);
    window.setTimeout(() => setHitMonsterId(null), 260);
    window.setTimeout(() => {
      setDamagePopups((current) => current.filter((popup) => !popup.id.startsWith(popupId)));
    }, 760);

    setMessage(
      defeated
        ? `${currentWeapon.name}으로 ${primaryTarget.name} 처치! ${currentWeapon.effectText}`
        : `${currentWeapon.name}: ${primaryTarget.name}에게 ${currentWeapon.damage} 피해 + ${currentWeapon.effectText}`
    );
  }

  function moveMonsters() {
    let totalDamage = 0;
    let attackerName = '';
    let statusDamage = 0;
    const occupiedTiles = new Set(currentMonsters.map((monster) => keyOf(monster.x, monster.y)));

    const nextMonsters = currentMonsters.map((monster) => {
      occupiedTiles.delete(keyOf(monster.x, monster.y));
      let nextMonster = {
        ...monster,
        status: { ...(monster.status ?? {}) },
        cooldownLeft: Math.max(0, (monster.cooldownLeft ?? 0) - 0.85),
      };

      if (nextMonster.status.burn > 0) {
        nextMonster.hp -= 1;
        nextMonster.status.burn -= 1;
        statusDamage += 1;
      }

      if (nextMonster.status.bleed > 0) {
        nextMonster.hp -= 1;
        nextMonster.status.bleed -= 1;
        statusDamage += 1;
      }

      if (nextMonster.hp <= 0) {
        return null;
      }

      if (nextMonster.status.stun > 0) {
        nextMonster.status.stun -= 1;
        occupiedTiles.add(keyOf(nextMonster.x, nextMonster.y));
        return nextMonster;
      }

      if (distance(nextMonster, player) <= (nextMonster.attackRange ?? 1)) {
        if (nextMonster.cooldownLeft <= 0) {
          totalDamage += nextMonster.attack ?? 1;
          attackerName = nextMonster.name;
          nextMonster.cooldownLeft = nextMonster.attackCooldown ?? 2;
        }
        occupiedTiles.add(keyOf(nextMonster.x, nextMonster.y));
        return nextMonster;
      }

      const isSlowed = nextMonster.status.slow > 0;
      const step = distance(nextMonster, player) <= 5 ? getStepToward(nextMonster, player) : getRandomStep();
      const next = {
        x: clamp(nextMonster.x + (isSlowed ? 0 : step.dx), 0, mapWidth - 1),
        y: clamp(nextMonster.y + (isSlowed ? 0 : step.dy), 0, mapHeight - 1),
      };

      if (isSlowed) {
        nextMonster.status.slow -= 1;
      }

      if (!canMonsterMoveTo(next.x, next.y, occupiedTiles)) {
        occupiedTiles.add(keyOf(nextMonster.x, nextMonster.y));
        return nextMonster;
      }

      occupiedTiles.add(keyOf(next.x, next.y));
      return { ...nextMonster, x: next.x, y: next.y };
    }).filter(Boolean);

    setMonsters((current) => {
      return {
        ...current,
        [currentMap.id]: nextMonsters,
      };
    });

    if (totalDamage > 0) {
      const popupId = `${Date.now()}-player`;
      setPlayerHp((currentHp) => Math.max(0, currentHp - totalDamage));
      playSound('hit');
      setPlayerHit(true);
      setDamagePopups((current) => [
        ...current,
        {
          id: popupId,
          x: player.x,
          y: player.y,
          text: `-${totalDamage}`,
          kind: 'player',
        },
      ]);
      window.setTimeout(() => setPlayerHit(false), 260);
      window.setTimeout(() => {
        setDamagePopups((current) => current.filter((popup) => popup.id !== popupId));
      }, 760);
      setMessage(`${attackerName}의 공격! HP -${totalDamage}`);
    } else if (statusDamage > 0) {
      setMessage(`상태 효과로 몬스터에게 ${statusDamage} 피해`);
    }
  }

  useEffect(() => {
    function handleKeyDown(event) {
      const keys = {
        ArrowUp: [0, -1],
        w: [0, -1],
        W: [0, -1],
        ArrowDown: [0, 1],
        s: [0, 1],
        S: [0, 1],
        ArrowLeft: [-1, 0],
        a: [-1, 0],
        A: [-1, 0],
        ArrowRight: [1, 0],
        d: [1, 0],
        D: [1, 0],
      };
      const weaponIndex = Number(event.key) - 1;

      if (event.key === ' ') {
        event.preventDefault();
        if (!event.repeat) {
          attack();
        }
        return;
      }

      if (weapons[weaponIndex]) {
        setSelectedWeapon(weapons[weaponIndex].id);
        setPlayerCooldownLeft(0);
        playSound('equip');
        setMessage(`${weapons[weaponIndex].name} 장착`);
        return;
      }

      if (!keys[event.key]) {
        return;
      }

      event.preventDefault();

      if (event.repeat) {
        return;
      }

      movePlayer(keys[event.key][0], keys[event.key][1]);
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [blockedTiles, currentBuilds, currentMap.id, currentMonsters, currentWeapon, monsterTiles, player, playerCooldownLeft]);

  useEffect(() => {
    if (playerCooldownLeft <= 0) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setPlayerCooldownLeft((current) => Math.max(0, current - 0.1));
    }, 100);

    return () => {
      window.clearInterval(timer);
    };
  }, [playerCooldownLeft]);

  useEffect(() => {
    if (playerHp <= 0 || currentMonsters.length === 0) {
      return undefined;
    }

    const timer = window.setInterval(moveMonsters, 850);

    return () => {
      window.clearInterval(timer);
    };
  }, [blockedTiles, currentBuilds, currentMap.id, currentMonsters, monsterTiles, player, playerHp]);

  useEffect(() => {
    if (currentMonsters.length === 0) {
      completeCurrentMap();
    }
  }, [currentMonsters.length, mapIndex, clearPopup, isPlayerDead]);

  useEffect(() => {
    if (playerHp <= 0) {
      playSound('death');
    }
  }, [playerHp]);

  return (
    <section className={`rpgPage ${currentMap.theme}`}>
      <div className="rpgShell">
        <aside className="rpgPanel">
          <div>
            <span className="panelLabel">MAP</span>
            <strong>{currentMap.name}</strong>
            <p className="statusText">난이도 {mapIndex + 1} / {maps.length}</p>
          </div>

          <div className="mapButtons">
            {maps.map((map, index) => (
              <button
                key={map.id}
                type="button"
                className={`${index === mapIndex ? 'active' : ''} ${index > unlockedMapIndex ? 'locked' : ''}`}
                disabled={index > unlockedMapIndex}
                onClick={() => changeMap(index)}
              >
                {index + 1}. {map.name}
              </button>
            ))}
          </div>
        </aside>

        <div className="gameArea">
          <div className="mobileBattleHud">
            <strong>HP {playerHp}/30</strong>
            <span>{currentWeapon.name}</span>
            <em>{playerCooldownLeft > 0 ? `${playerCooldownLeft.toFixed(1)}s` : 'READY'}</em>
          </div>

          <div className="toolBar buildToolBar">
            <button
              type="button"
              className={isBuildMode ? 'active buildModeButton' : 'buildModeButton'}
              onClick={() => setIsBuildMode((current) => !current)}
            >
              <span>{isBuildMode ? 'ON' : 'OFF'}</span>
              건설 모드
            </button>
            {buildTools.map((tool) => (
              <button
                key={tool.id}
                type="button"
                className={tool.id === selectedTool ? 'active' : ''}
                onClick={() => setSelectedTool(tool.id)}
              >
                <span>{tool.mark}</span>
                {tool.name}
              </button>
            ))}
          </div>

          <div className="weaponBar">
            {weapons.map((weapon, index) => (
              <button
                key={weapon.id}
                type="button"
                className={weapon.id === selectedWeapon ? `active ${weapon.grade}` : weapon.grade}
                onClick={() => {
                  setSelectedWeapon(weapon.id);
                  setPlayerCooldownLeft(0);
                  playSound('equip');
                  setMessage(`${weapon.name} 장착`);
                }}
              >
                <span className="weaponKey">{index === 9 ? 0 : index + 1}</span>
                <span className="weaponMark">{weapon.mark}</span>
                <span className="weaponName">{weapon.name}</span>
                <small>피해 {weapon.damage} / 사거리 {weapon.range} / 쿨 {weapon.cooldown}s</small>
              </button>
            ))}
          </div>

          <div className="mapGrid" style={{ '--columns': mapWidth }}>
            {Array.from({ length: mapWidth * mapHeight }).map((_, index) => {
              const x = index % mapWidth;
              const y = Math.floor(index / mapWidth);
              const tileKey = keyOf(x, y);
              const build = currentBuilds[tileKey];
              const inRange = distance(player, { x, y }) <= currentWeapon.range && !(player.x === x && player.y === y);
              const tileType =
                currentMap.water.includes(tileKey) ? 'water' :
                currentMap.blocked.includes(tileKey) ? 'blocked' :
                currentMap.resources.includes(tileKey) ? 'resource' :
                'ground';

              return (
                <button
                  key={tileKey}
                  type="button"
                  className={`tile ${tileType} ${inRange ? 'inWeaponRange' : ''} ${build ? `build ${build}` : ''}`}
                  onClick={() => buildOnTile(x, y)}
                  aria-label={`${x}, ${y}`}
                >
                  {build && (
                    <span className="buildMark">
                      {buildTools.find((tool) => tool.id === build)?.mark}
                    </span>
                  )}
                </button>
              );
            })}

            {currentMonsters.map((monster) => (
              <Fragment key={monster.id}>
                <span
                  className="monsterRange"
                  style={{
                    left: `${((monster.x + 0.5) / mapWidth) * 100}%`,
                    top: `${((monster.y + 0.5) / mapHeight) * 100}%`,
                    width: `${(((monster.attackRange ?? 1) * 2 + 1) / mapWidth) * 100}%`,
                    height: `${(((monster.attackRange ?? 1) * 2 + 1) / mapHeight) * 100}%`,
                  }}
                />
                <span
                  className={`monster ${monster.type} ${hitMonsterId === monster.id ? 'hit' : ''}`}
                  style={{
                    left: `${((monster.x + 0.5) / mapWidth) * 100}%`,
                    top: `${((monster.y + 0.5) / mapHeight) * 100}%`,
                  }}
                  title={`${monster.name} ${monster.hp}/${monster.maxHp}`}
                >
                  <span className="monsterArt">
                    <span className="monsterEye left" />
                    <span className="monsterEye right" />
                    <span className="monsterMouth" />
                  </span>
                  <span className="monsterName">{monster.name}</span>
                  {(monster.status?.burn > 0 || monster.status?.bleed > 0 || monster.status?.stun > 0 || monster.status?.slow > 0) && (
                    <span className="monsterStatus">
                      {monster.status?.burn > 0 && '화'}
                      {monster.status?.bleed > 0 && '출'}
                      {monster.status?.stun > 0 && '기'}
                      {monster.status?.slow > 0 && '둔'}
                    </span>
                  )}
                  <span className="monsterCooldown">
                    {monster.cooldownLeft > 0 ? monster.cooldownLeft.toFixed(1) : 'READY'}
                  </span>
                  <span className="monsterHp" style={{ width: `${(monster.hp / monster.maxHp) * 100}%` }} />
                </span>
              </Fragment>
            ))}

            {attackEffect && (
              <span
                className={`attackEffect ${attackEffect.type}`}
                style={{
                  left: `${((attackEffect.from.x + 0.5) / mapWidth) * 100}%`,
                  top: `${((attackEffect.from.y + 0.5) / mapHeight) * 100}%`,
                  width: `${
                    (Math.max(
                      Math.hypot(attackEffect.to.x - attackEffect.from.x, attackEffect.to.y - attackEffect.from.y),
                      1
                    ) / mapWidth) * 100
                  }%`,
                  '--angle': `${Math.atan2(
                    attackEffect.to.y - attackEffect.from.y,
                    attackEffect.to.x - attackEffect.from.x
                  )}rad`,
                }}
              />
            )}

            {damagePopups.map((popup) => (
              <span
                key={popup.id}
                className={`damagePopup ${popup.kind}`}
                style={{
                  left: `${((popup.x + 0.5) / mapWidth) * 100}%`,
                  top: `${((popup.y + 0.2) / mapHeight) * 100}%`,
                }}
              >
                {popup.text}
              </span>
            ))}

            <span
              className={playerHit ? 'rpgPlayer hit' : 'rpgPlayer'}
              style={{
                left: `${((player.x + 0.5) / mapWidth) * 100}%`,
                top: `${((player.y + 0.5) / mapHeight) * 100}%`,
              }}
              aria-hidden="true"
            />
          </div>
        </div>

        <aside className="rpgPanel statusPanel">
          <div>
            <span className="panelLabel">PLAYER</span>
            <strong>{player.x}, {player.y}</strong>
            <p className="statusText">HP {playerHp} / 30</p>
          </div>
          <div>
            <span className="panelLabel">MONSTER</span>
            <strong>{currentMonsters.length}</strong>
          </div>
          <div className="monsterList">
            {currentMonsters.map((monster) => (
              <div key={monster.id}>
                <span>{monsterMarks[monster.type] ?? 'M'}</span>
                <strong>{monster.name}</strong>
                <em>
                  {monster.hp}/{monster.maxHp} ATK {monster.attack} RNG {monster.attackRange} CD{' '}
                  {monster.cooldownLeft > 0 ? monster.cooldownLeft.toFixed(1) : '준비'}
                </em>
              </div>
            ))}
            {currentMonsters.length === 0 && <p className="statusText">현재 맵의 몬스터를 모두 처치했습니다.</p>}
          </div>
          <div>
            <span className="panelLabel">WEAPON</span>
            <strong>{currentWeapon.name}</strong>
            <p className="statusText">
              피해 {currentWeapon.damage} / 사거리 {currentWeapon.range} / 쿨타임 {currentWeapon.cooldown}s / {currentWeapon.effectText}
            </p>
            <p className="statusText">
              {playerCooldownLeft > 0 ? `공격 가능까지 ${playerCooldownLeft.toFixed(1)}초` : '공격 준비 완료'}
            </p>
          </div>
          <div>
            <span className="panelLabel">BUILD</span>
            <strong>{Object.values(currentBuilds).filter(Boolean).length}</strong>
          </div>
          <button type="button" className="attackButton" onClick={attack}>
            공격
          </button>
          <button type="button" className="respawnButton" onClick={respawnMonsters}>
            몬스터 생성
          </button>
          <p className="statusText">{message}</p>
          <div className="movePad" aria-label="캐릭터 이동">
            <button type="button" onClick={() => movePlayer(0, -1)}>위</button>
            <button type="button" onClick={() => movePlayer(-1, 0)}>왼쪽</button>
            <button type="button" onClick={() => movePlayer(1, 0)}>오른쪽</button>
            <button type="button" onClick={() => movePlayer(0, 1)}>아래</button>
          </div>
        </aside>
      </div>

      <div className="mobileControls" aria-label="모바일 조작">
        <div className="mobileWeaponControls">
          <button type="button" onClick={() => selectWeaponByOffset(-1)}>이전</button>
          <div className="mobileWeaponInfo">
            <strong>{currentWeapon.name}</strong>
            <span>
              피해 {currentWeapon.damage} / 사거리 {currentWeapon.range} / {currentWeapon.effectText}
            </span>
            <div className="mobileCooldownBar">
              <i
                style={{
                  width: `${Math.max(0, Math.min(1, 1 - playerCooldownLeft / currentWeapon.cooldown)) * 100}%`,
                }}
              />
            </div>
          </div>
          <button type="button" onClick={() => selectWeaponByOffset(1)}>다음</button>
        </div>

        <div className="mobileActionRow">
          <div className="touchPad">
            <button type="button" className="up" onClick={() => movePlayer(0, -1)}>위</button>
            <button type="button" className="left" onClick={() => movePlayer(-1, 0)}>왼쪽</button>
            <button type="button" className="right" onClick={() => movePlayer(1, 0)}>오른쪽</button>
            <button type="button" className="down" onClick={() => movePlayer(0, 1)}>아래</button>
          </div>

          <button type="button" className="mobileAttackButton" onClick={attack}>
            공격
          </button>

          <button
            type="button"
            className={isBuildMode ? 'mobileBuildButton active' : 'mobileBuildButton'}
            onClick={() => setIsBuildMode((current) => !current)}
          >
            건설 {isBuildMode ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {isPlayerDead && (
        <div className="deathOverlay" role="alert">
          <div className="deathDialog">
            <span>YOU DIED</span>
            <p>몬스터에게 쓰러졌습니다.</p>
            <button type="button" onClick={restartGame}>
              다시 시작
            </button>
          </div>
        </div>
      )}

      {clearPopup && (
        <div className="clearOverlay" role="status">
          <div className="clearDialog">
            <span>{clearPopup.title}</span>
            <strong>{clearPopup.nextName}</strong>
            <p>{clearPopup.body}</p>
            <div className="clearSparkles">
              <i />
              <i />
              <i />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
