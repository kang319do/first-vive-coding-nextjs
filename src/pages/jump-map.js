import { useEffect, useMemo, useRef, useState } from 'react';
import styles from '@/styles/JumpMap.module.css';

const playerWidth = 28;
const standHeight = 38;
const slideHeight = 20;
const gravity = 1600;
const moveSpeed = 380;
const airMoveSpeed = 360;
const jumpPower = 780;
const wallJumpX = 685;
const wallJumpY = 830;
const slideSpeed = 620;
const slideDuration = 0.38;
const slideCooldown = 0.16;
const dashSpeed = 715;
const dashDuration = 0.19;
const blockWidth = 96;
const blockHeight = 20;
const blockLifetimeMs = 8500;
const maxActiveBlocks = 8;
const grappleRange = 390;
const grappleDuration = 0.25;
const grappleCooldownSec = 0.9;
const blinkDistance = 220;
const blinkCooldownSec = 0.45;
const SECRET_CODE = 'abcdefghijklmnopqrstuvwxyz';
const TOTAL_STAGES = 70;
const saveKey = 'jump-map-progress-v1';
const pureHallKey = 'jump-map-pure-clear-hall-v1';

const BLACK_MARKET_ITEMS = [
  {
    id: 'infBlocks',
    name: '무한 황금 블록',
    icon: '🧱',
    price: 1,
    keyHint: '패시브',
    kind: 'permanent',
    description: '블록이 절대 줄어들지 않으며 설치한 황금 블록이 20초 동안 유지됩니다.',
  },
  {
    id: 'coinMagnet',
    name: '코인 자석 · 3배',
    icon: '🧲',
    price: 2,
    keyHint: '패시브',
    kind: 'permanent',
    description: '주변 코인이 자동으로 끌려오며 모든 코인 획득량이 3배로 증가합니다.',
  },
  {
    id: 'infJump',
    name: '무한 공중 점프',
    icon: '⚡',
    price: 3,
    keyHint: '공중 Enter 무한',
    kind: 'permanent',
    description: '공중에서 Enter를 횟수 제한 없이 무한으로 점프해 하늘을 날 수 있습니다.',
  },
  {
    id: 'blink',
    name: '순간이동 블링크',
    icon: '🚀',
    price: 4,
    keyHint: 'T 키',
    kind: 'permanent',
    description: 'T 키를 누르면 바라보는 방향으로 벽과 가시를 뚫고 220px 앞으로 순간이동!',
  },
  {
    id: 'godMode',
    name: '유령 무적 모드',
    icon: '👻',
    price: 5,
    keyHint: '패시브',
    kind: 'permanent',
    description: '가시·레이저·회전 톱날에 닿아도 전혀 죽지 않고 통과합니다.',
  },
  {
    id: 'unlockAll',
    name: '전 스테이지 해금',
    icon: '👑',
    price: 5,
    keyHint: '즉시 발동',
    kind: 'unlockAll',
    description: `잠겨 있던 ${TOTAL_STAGES}개 모든 스테이지를 한 번에 해금해 자유롭게 이동합니다.`,
  },
];

const SHOP_ITEMS = [
  {
    id: 'doubleJump',
    name: '더블 점프',
    icon: '🪽',
    price: 55,
    keyHint: '공중 Enter',
    kind: 'permanent',
    description: '공중에서 Enter를 한 번 더 눌러 2단 점프로 위기를 탈출합니다.',
  },
  {
    id: 'grappleHook',
    name: '그래플링 후크',
    icon: '🪝',
    price: 95,
    keyHint: 'G 키 / 후크',
    kind: 'permanent',
    description: '앞쪽 위로 갈고리 줄을 발사해 빠르게 날아가며 넓은 절벽을 돌파합니다.',
  },
  {
    id: 'shield',
    name: '가시 방어막',
    icon: '🛡️',
    price: 70,
    keyHint: '자동 발동',
    kind: 'permanent',
    description: '스테이지당 1회(체크포인트 리필) 가시·레이저·톱날 피해를 막아냅니다.',
  },
  {
    id: 'feather',
    name: '저중력 깃털',
    icon: '🪶',
    price: 85,
    keyHint: '패시브',
    kind: 'permanent',
    description: '중력이 16% 줄어 더 멀리, 더 부드럽게 점프하고 착지할 수 있습니다.',
  },
  {
    id: 'blockBag',
    name: '블록 가방 확장',
    icon: '🧱',
    price: 45,
    keyHint: '패시브',
    kind: 'permanent',
    description: '스테이지 시작 블록 +3개 증가, 설치한 블록 유지 시간 +2초 연장!',
  },
  {
    id: 'skipTicket',
    name: '스테이지 스킵권',
    icon: '🎟️',
    price: 110,
    keyHint: '소모품',
    kind: 'consumable',
    description: '어려운 스테이지를 즉시 클리어하고 다음 스테이지로 넘어갑니다.',
  },
];

const DEFAULT_SHOP = {
  coins: 0,
  owned: {},
  equipped: {},
  skipTickets: 0,
  visitedBlackMarket: false,
};

function hasBlackMarketItems(owned) {
  return BLACK_MARKET_ITEMS.some((item) => Boolean(owned?.[item.id]));
}

const difficultyBands = [
  { name: 'Tutorial', label: '튜토리얼', color: '#38bdf8', from: 0, to: 9, width: 2050, gap: 140, maxBlocks: 8, crumbleMs: 920 },
  { name: 'Easy', label: '쉬움', color: '#22c55e', from: 10, to: 19, width: 2700, gap: 165, maxBlocks: 7, crumbleMs: 820 },
  { name: 'Normal', label: '보통', color: '#facc15', from: 20, to: 29, width: 3450, gap: 190, maxBlocks: 7, crumbleMs: 740 },
  { name: 'Hard', label: '어려움', color: '#fb923c', from: 30, to: 39, width: 4350, gap: 215, maxBlocks: 6, crumbleMs: 660 },
  { name: 'Extreme', label: '극악', color: '#ef4444', from: 40, to: 49, width: 5300, gap: 235, maxBlocks: 6, crumbleMs: 600 },
  { name: 'Nightmare', label: '악몽', color: '#c084fc', from: 50, to: 59, width: 6100, gap: 255, maxBlocks: 6, crumbleMs: 560 },
  { name: 'Mythic', label: '신화', color: '#f472b6', from: 60, to: 69, width: 6900, gap: 270, maxBlocks: 6, crumbleMs: 520 },
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getBand(index) {
  return difficultyBands.find((band) => index >= band.from && index <= band.to) ?? difficultyBands[0];
}

function intersects(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function stageNoise(index, step) {
  return Math.sin(index * 12.9898 + step * 78.233) * 43758.5453;
}

function noise01(index, step, offset = 0) {
  return Math.abs(stageNoise(index + offset * 3.17, step + offset * 5.91) % 1);
}

function getMovingPlatformRect(platform, timeSec) {
  if (!platform.move) return platform;
  const offset = Math.sin(timeSec * platform.move.speed + (platform.move.phase ?? 0)) * platform.move.distance;
  if (platform.move.axis === 'y') {
    return { ...platform, y: platform.y + offset };
  }
  return { ...platform, x: platform.x + offset };
}

function getHazardRect(hazard, timeSec) {
  if (hazard.kind === 'movingBlade') {
    const offset = Math.sin(timeSec * hazard.speed + (hazard.phase ?? 0)) * hazard.range;
    if (hazard.axis === 'y') {
      return { ...hazard, y: hazard.y + offset };
    }
    return { ...hazard, x: hazard.x + offset };
  }
  return hazard;
}

function isBlinkLaserActive(hazard, timeSec) {
  if (hazard.kind !== 'blinkLaser') return true;
  const cycle = hazard.cycle;
  const t = ((timeSec + (hazard.phase ?? 0)) % cycle + cycle) % cycle;
  return t < hazard.onTime;
}

function isBlinkLaserWarning(hazard, timeSec) {
  if (hazard.kind !== 'blinkLaser') return false;
  const cycle = hazard.cycle;
  const t = ((timeSec + (hazard.phase ?? 0)) % cycle + cycle) % cycle;
  return t >= cycle - 0.42;
}

function makeStage(index) {
  const band = getBand(index);
  const local = index - band.from;
  const difficulty = index / (TOTAL_STAGES - 1);
  const width = Math.round(band.width + local * 155 + difficulty * 950);
  const floorY = 520;
  const platforms = [
    { x: 0, y: floorY, width: 520, height: 40, kind: 'start', id: `${index}-start` },
  ];
  const walls = [];
  const hazards = [];
  const items = [];
  const checkpoints = [];
  const interactables = [
    {
      id: `${index}-start-box`,
      kind: 'box',
      label: '상자 열기 (+2 블록)',
      x: 215,
      y: floorY - 32,
      width: 34,
      height: 32,
    },
  ];

  // Tall mandatory slide-under gate right on the starting runway (too tall to jump over!)
  const slideGateHeight = 420;
  walls.push({
    x: 320,
    y: floorY - 26 - slideGateHeight,
    width: 96,
    height: slideGateHeight,
    kind: 'lowBeam',
  });

  let x = 560;
  let y = floorY - 82;
  let step = 0;

  while (x < width - 380) {
    const wave = Math.sin(index * 0.9 + step * 1.35);
    const rising = Math.sin(index * 0.4 + step * 0.7);
    const isSlideSection = (index >= 2 && step % 6 === 2) || (index >= 24 && step % 6 === 1);
    const baseWidth = clamp(172 - difficulty * 54 - (step % 3) * 6, 92, 180);
    const platformWidth = isSlideSection ? Math.max(baseWidth, 160) : baseWidth;

    y = clamp(y + wave * (58 + difficulty * 18) - 14 + rising * 20, 145, floorY - 70);

    const isMoving = !isSlideSection && index >= 9 && (step + index) % (index >= 35 ? 5 : 7) === 3;
    const platformKind =
      isMoving ? 'moving' :
      index >= 18 && step % 7 === 4 ? 'ice' :
      index >= 10 && step % 6 === 2 ? 'crumble' :
      index >= 5 && step % 5 === 1 ? 'spring' :
      step % 5 === 0 ? 'thin' :
      'normal';

    const platform = {
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(platformWidth),
      height: 26,
      kind: platformKind,
      id: `${index}-platform-${step}`,
    };

    if (isMoving) {
      const vertical = (step + index) % 2 === 0;
      platform.move = {
        axis: vertical ? 'y' : 'x',
        distance: Math.round((vertical ? 40 : 50) + difficulty * 32),
        speed: Number((0.85 + difficulty * 0.85).toFixed(2)),
        phase: (step * 1.1 + index * 0.7) % 6.28,
      };
    }

    platforms.push(platform);

    // Tall mandatory slide-under ceiling gate! Leaves 26px clearance (stand=38px blocked, slide=20px passes!)
    // Extends 420px straight up so players cannot jump over it — must slide underneath.
    if (isSlideSection) {
      const beamWidth = Math.round(clamp(platformWidth * 0.56, 74, 118));
      const beamX = Math.round(x + (platformWidth - beamWidth) / 2);
      walls.push({
        x: beamX,
        y: Math.round(y - 26 - slideGateHeight),
        width: beamWidth,
        height: slideGateHeight,
        kind: 'lowBeam',
      });
    }

    // Collectible gold coin (also grants +1 block charge!)
    if ((step + index) % 3 === 0) {
      items.push({
        x: Math.round(x + platformWidth / 2 - 10),
        y: Math.round(isSlideSection ? y - 22 : y - 46),
        width: 20,
        height: 20,
        id: `${index}-${step}`,
      });
    }

    // Grounded steel pit spike bed (sits on an iron trap girder — never floating in mid-air!)
    if (index >= 3 && (step + index) % 5 === 1) {
      const groundSpikeWidth = Math.round(clamp(54 + noise01(index, step, 1) * (58 + difficulty * 26), 48, 118));
      const groundSpikeH = Math.round(20 + noise01(index, step, 2) * 6);
      hazards.push({
        x: Math.round(x - band.gap * 0.35),
        y: floorY - groundSpikeH,
        width: groundSpikeWidth,
        height: groundSpikeH,
        kind: 'spike',
        hasGirder: true,
      });
    }

    // Platform top spikes (100% flush with platform surface, always leaves a wide clean landing edge!)
    const hasPlatformBox = !isSlideSection && !isMoving && step > 1 && step % 7 === 3 && platformWidth >= 82;
    if (!isSlideSection && !isMoving && !hasPlatformBox && index >= 4 && (step + index) % (index >= 34 ? 4 : 5) === 0 && platformWidth >= 96) {
      const topSpikeWidth = Math.round(clamp(platformWidth * (0.2 + noise01(index, step, 3) * 0.12), 22, platformWidth - 68));
      const topSpikeOffset = Math.round(16 + noise01(index, step, 4) * Math.max(0, platformWidth - topSpikeWidth - 32));
      const topSpikeH = Math.round(18 + noise01(index, step, 5) * 5);
      hazards.push({
        x: Math.round(x + topSpikeOffset),
        y: Math.round(y - topSpikeH),
        width: topSpikeWidth,
        height: topSpikeH,
        kind: 'topSpike',
      });
    }

    // Downward spikes attached flush to the underside of elevated platforms on harder stages
    if (!isSlideSection && !isMoving && index >= 16 && y < floorY - 145 && (step + index) % 8 === 5 && platformWidth >= 84) {
      const downSpikeW = Math.round(clamp(platformWidth * 0.44, 30, platformWidth - 24));
      const downSpikeH = 18;
      hazards.push({
        x: Math.round(x + (platformWidth - downSpikeW) / 2),
        y: Math.round(y + 26),
        width: downSpikeW,
        height: downSpikeH,
        kind: 'downSpike',
      });
    }

    // Blinking laser gates (Stage 13+, gentler timing & shorter ON duration)
    if (index >= 12 && (step + local) % (index >= 36 ? 5 : 7) === 4) {
      const cycle = clamp(3.3 - difficulty * 0.9, 2.1, 3.3);
      hazards.push({
        x: Math.round(x + platformWidth + 46),
        y: Math.round(y - 110),
        width: 14,
        height: Math.round(clamp(88 + difficulty * 66, 88, 155)),
        kind: 'blinkLaser',
        cycle,
        onTime: cycle * (0.36 + difficulty * 0.1),
        phase: (step * 0.8 + index * 0.4) % cycle,
      });

      if (!isMoving && platformWidth >= 68) {
        interactables.push({
          id: `${index}-switch-${step}`,
          kind: 'switch',
          label: '레이저 끄기 (8초)',
          x: Math.round(x + platformWidth - 36),
          y: Math.round(y - 34),
          width: 28,
          height: 34,
        });
      }
    }

    // Moving spinning sawblades (Stage 19+, gentler speed & smaller hitbox)
    if (index >= 18 && (step + index) % (index >= 38 ? 5 : 7) === 2) {
      const verticalBlade = (step + index) % 2 === 1;
      hazards.push({
        x: Math.round(x + platformWidth / 2 - 14),
        y: Math.round(verticalBlade ? y - 62 : y - 32),
        width: 28,
        height: 28,
        kind: 'movingBlade',
        axis: verticalBlade ? 'y' : 'x',
        range: Math.round((verticalBlade ? 38 : 46) + difficulty * 38),
        speed: Number((1.1 + difficulty * 1.05).toFixed(2)),
        phase: (step * 1.3) % 6.28,
      });
    }

    // Frequent Checkpoints starting from Stage 2!
    if (index >= 1 && step % 5 === 3) {
      checkpoints.push({
        x: Math.round(x + platformWidth / 2 - 16),
        y: Math.round(y - 62),
        width: 32,
        height: 62,
        id: `${index}-checkpoint-${step}`,
      });
    }

    // Gap / Wall-Jump / Mega-Chasm (much fairer jump distances!)
    const isMegaChasm = index >= 13 && step > 1 && (step + index) % (index >= 34 ? 7 : 9) === 0;
    const forcedWallGap = !isMegaChasm && (step + 1) % 6 === 0;
    const randomGap = !isMegaChasm && index >= 9 && noise01(index, step, 11) > (0.84 - difficulty * 0.2);

    const gapSize = isMegaChasm
      ? Math.round(225 + difficulty * 115)
      : forcedWallGap
        ? Math.round(145 + difficulty * 82)
        : randomGap
          ? Math.round(94 + difficulty * 60)
          : Math.round(16 + difficulty * 34 + Math.abs(Math.sin(index + step)) * 18);

    if ((forcedWallGap || randomGap) && index >= 1) {
      const wallHeight = Math.round(150 + difficulty * 110);
      const wallBaseY = Math.round(clamp(y + 52, 240, floorY + 24));
      const firstWallX = Math.round(x + platformWidth + gapSize * 0.26);
      walls.push({
        x: firstWallX,
        y: wallBaseY - wallHeight,
        width: 34,
        height: wallHeight,
        kind: forcedWallGap ? 'wallJump' : 'wall',
      });

      if (forcedWallGap || index >= 22) {
        walls.push({
          x: Math.round(x + platformWidth + gapSize * 0.72),
          y: wallBaseY - wallHeight - 28,
          width: 34,
          height: wallHeight + 28,
          kind: 'wallJump',
        });
      }
    }

    // Place a bonus coin mid-air over mega-chasm + wide bridge lever before chasm!
    if (isMegaChasm) {
      if (!isMoving) {
        interactables.push({
          id: `${index}-lever-${step}`,
          kind: 'bridgeLever',
          label: '다리 소환 (9초)',
          x: Math.round(x + platformWidth - 38),
          y: Math.round(y - 34),
          width: 28,
          height: 34,
          bridge: {
            x: Math.round(x + platformWidth + 18),
            y: Math.round(y + 4),
            width: Math.round(gapSize * 0.78),
            height: 20,
          },
        });
      }
      items.push({
        x: Math.round(x + platformWidth + gapSize * 0.5 - 10),
        y: Math.round(y - 54),
        width: 20,
        height: 20,
        id: `${index}-chasm-${step}`,
      });
    } else if (!isSlideSection && !isMoving && step > 1 && step % 7 === 3 && platformWidth >= 82) {
      interactables.push({
        id: `${index}-box-${step}`,
        kind: 'box',
        label: '상자 열기 (+2 블록)',
        x: Math.round(x + platformWidth / 2 - 17),
        y: Math.round(y - 32),
        width: 34,
        height: 32,
      });
    }

    x += platformWidth + gapSize;
    step += 1;
  }

  platforms.push({ x: width - 300, y: floorY - 115, width: 210, height: 30, kind: 'goalPad', id: `${index}-goalPad` });
  items.push({ x: width - 230, y: floorY - 166, width: 24, height: 24, id: `${index}-goal` });

  return {
    index,
    name: `Stage ${index + 1}`,
    band,
    width,
    floorY,
    start: { x: 90, y: floorY - standHeight - 1 },
    goal: { x: width - 145, y: floorY - 178, width: 46, height: 116 },
    platforms,
    walls,
    hazards,
    items,
    checkpoints,
    interactables,
  };
}

const stages = Array.from({ length: TOTAL_STAGES }, (_, index) => makeStage(index));

function createPlayer(stageIndex, equipped = {}) {
  const stage = stages[stageIndex];
  const bonusBlocks = equipped.blockBag ? 3 : 0;
  const maxBlocks = stage.band.maxBlocks + bonusBlocks;
  return {
    x: stage.start.x,
    y: stage.start.y,
    vx: 0,
    vy: 0,
    facing: 1,
    grounded: false,
    coyoteTimer: 0,
    wallDir: 0,
    wallSliding: false,
    sliding: false,
    slideTimer: 0,
    slideCooldown: 0,
    dashTimer: 0,
    canDash: true,
    airJumpsLeft: equipped.doubleJump ? 1 : 0,
    grapple: null,
    grappleCooldown: 0,
    blinkCooldown: 0,
    shieldActive: Boolean(equipped.shield),
    invulnTimer: 0,
    blocksLeft: maxBlocks,
    maxBlocks,
  };
}

export default function JumpMapPage() {
  const canvasRef = useRef(null);
  const frameRef = useRef(null);
  const lastTimeRef = useRef(null);
  const inputRef = useRef({
    left: false,
    right: false,
    jump: false,
    jumpPressed: false,
    slide: false,
    slidePressed: false,
    placeBlockPressed: false,
    interactPressed: false,
    grapplePressed: false,
    blinkPressed: false,
  });
  const shopStateRef = useRef(DEFAULT_SHOP);
  const shopOpenRef = useRef(false);
  const stageModalOpenRef = useRef(false);
  const blackMarketOpenRef = useRef(false);
  const hallModalOpenRef = useRef(false);
  const secretProgressRef = useRef(0);
  const playerRef = useRef(createPlayer(0, DEFAULT_SHOP.equipped));
  const stageRef = useRef(0);
  const cameraRef = useRef({ x: 0, y: 0 });
  const collectedRef = useRef(new Set());
  const brokenRef = useRef(new Map());
  const placedBlocksRef = useRef([]);
  const usedInteractablesRef = useRef(new Set());
  const activeBridgesRef = useRef([]);
  const laserDisabledUntilRef = useRef(0);
  const nearbyInteractableRef = useRef(null);
  const trailsRef = useRef([]);
  const checkpointRef = useRef(null);
  const clearedRef = useRef(0);
  const deathsRef = useRef(0);
  const resetStageFnRef = useRef(null);
  const nextStageFnRef = useRef(null);
  const saveProgressFnRef = useRef(null);
  const audioRef = useRef(null);
  const soundEnabledRef = useRef(true);
  const dirPointersRef = useRef(new Map());
  const jumpPointersRef = useRef(new Set());
  const slidePointersRef = useRef(new Set());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [shopOpen, setShopOpen] = useState(false);
  const [stageModalOpen, setStageModalOpen] = useState(false);
  const [blackMarketOpen, setBlackMarketOpen] = useState(false);
  const [hallModalOpen, setHallModalOpen] = useState(false);
  const [hallNameDraft, setHallNameDraft] = useState('');
  const [shop, setShop] = useState(DEFAULT_SHOP);
  const [padState, setPadState] = useState({ left: false, right: false, jump: false, slide: false, block: false, hook: false });
  const [hud, setHud] = useState({
    stage: 0,
    cleared: 0,
    items: 0,
    totalItems: stages[0].items.length,
    deaths: 0,
    blocksLeft: stages[0].band.maxBlocks,
    maxBlocks: stages[0].band.maxBlocks,
    shieldActive: false,
    nearbyLabel: '',
    status: 'Ready',
  });

  function getAudioContext() {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!audioRef.current) {
      audioRef.current = new AudioCtx();
    }
    if (audioRef.current.state === 'suspended') {
      audioRef.current.resume();
    }
    return audioRef.current;
  }

  function playSound(type) {
    if (!soundEnabledRef.current) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    const tone = (wave, startFreq, endFreq, duration, volume = 0.14, delay = 0) => {
      const t = now + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = wave;
      osc.frequency.setValueAtTime(startFreq, t);
      if (endFreq !== startFreq) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(30, endFreq), t + duration);
      }
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(volume, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + duration + 0.02);
    };

    switch (type) {
      case 'jump':
        tone('triangle', 290, 580, 0.11, 0.14);
        break;
      case 'doubleJump':
        tone('sine', 460, 880, 0.12, 0.14);
        tone('triangle', 660, 1080, 0.1, 0.09, 0.04);
        break;
      case 'wallJump':
        tone('triangle', 350, 740, 0.12, 0.15);
        tone('square', 520, 820, 0.07, 0.05, 0.02);
        break;
      case 'slide':
        tone('sawtooth', 220, 95, 0.14, 0.07);
        break;
      case 'dash':
        tone('sawtooth', 540, 1120, 0.09, 0.08);
        tone('triangle', 820, 340, 0.11, 0.1, 0.04);
        break;
      case 'block':
        tone('triangle', 230, 440, 0.09, 0.14);
        tone('sine', 520, 620, 0.07, 0.09, 0.03);
        break;
      case 'grapple':
        tone('square', 640, 1280, 0.08, 0.07);
        tone('triangle', 480, 920, 0.16, 0.12, 0.03);
        break;
      case 'spring':
        tone('sine', 240, 980, 0.22, 0.16);
        tone('triangle', 480, 1240, 0.16, 0.1, 0.04);
        break;
      case 'crumble':
        tone('square', 175, 92, 0.09, 0.06);
        break;
      case 'coin':
        tone('sine', 988, 988, 0.07, 0.13);
        tone('sine', 1319, 1319, 0.14, 0.13, 0.065);
        break;
      case 'interact':
        tone('triangle', 440, 660, 0.09, 0.14);
        tone('triangle', 660, 990, 0.14, 0.14, 0.07);
        break;
      case 'checkpoint':
        tone('triangle', 523, 523, 0.1, 0.14);
        tone('triangle', 784, 1046, 0.2, 0.15, 0.09);
        break;
      case 'shield':
        tone('sine', 780, 420, 0.14, 0.15);
        tone('triangle', 520, 980, 0.18, 0.12, 0.05);
        break;
      case 'death':
        tone('sawtooth', 240, 65, 0.24, 0.13);
        tone('triangle', 150, 52, 0.26, 0.12, 0.03);
        break;
      case 'clear':
        tone('triangle', 523, 523, 0.11, 0.15, 0);
        tone('triangle', 659, 659, 0.11, 0.15, 0.09);
        tone('triangle', 784, 784, 0.11, 0.15, 0.18);
        tone('triangle', 1046, 1046, 0.26, 0.17, 0.27);
        break;
      case 'buy':
        tone('sine', 880, 880, 0.07, 0.13, 0);
        tone('sine', 1175, 1175, 0.08, 0.13, 0.06);
        tone('sine', 1568, 1568, 0.16, 0.14, 0.13);
        break;
      case 'blink':
        tone('sine', 960, 1800, 0.09, 0.12);
        tone('triangle', 640, 260, 0.1, 0.1, 0.03);
        break;
      case 'blackMarket':
        tone('sawtooth', 180, 220, 0.16, 0.1, 0);
        tone('triangle', 277, 330, 0.18, 0.12, 0.12);
        tone('sine', 440, 660, 0.28, 0.14, 0.24);
        break;
      default:
        break;
    }
  }

  function toggleSound() {
    setSoundEnabled((prev) => {
      const next = !prev;
      soundEnabledRef.current = next;
      if (next) playSound('coin');
      return next;
    });
  }

  function updateShopState(updater) {
    setShop((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      shopStateRef.current = next;
      saveProgressFnRef.current?.(stageRef.current, next);
      return next;
    });
  }

  function openShop() {
    stageModalOpenRef.current = false;
    blackMarketOpenRef.current = false;
    setStageModalOpen(false);
    setBlackMarketOpen(false);
    shopOpenRef.current = true;
    setShopOpen(true);
  }

  function closeShop() {
    shopOpenRef.current = false;
    setShopOpen(false);
  }

  function openStageModal() {
    shopOpenRef.current = false;
    blackMarketOpenRef.current = false;
    setShopOpen(false);
    setBlackMarketOpen(false);
    stageModalOpenRef.current = true;
    setStageModalOpen(true);
  }

  function closeStageModal() {
    stageModalOpenRef.current = false;
    setStageModalOpen(false);
  }

  function closeBlackMarket() {
    blackMarketOpenRef.current = false;
    setBlackMarketOpen(false);
  }

  function closeHallModal() {
    hallModalOpenRef.current = false;
    setHallModalOpen(false);
  }

  function handleRegisterHallName(event) {
    event.preventDefault();
    const trimmed = hallNameDraft.trim().slice(0, 16);
    if (!trimmed) return;
    try {
      const raw = JSON.parse(window.localStorage.getItem(pureHallKey) || '[]');
      const list = Array.isArray(raw) ? raw : [];
      const filtered = list.filter((entry) => entry && entry.name !== trimmed);
      filtered.push({
        name: trimmed,
        clearedAt: new Date().toISOString().slice(0, 10),
        deaths: deathsRef.current,
      });
      window.localStorage.setItem(pureHallKey, JSON.stringify(filtered.slice(-30)));
    } catch {
      // Saving Hall of Fame entry is optional if storage is unavailable.
    }
    setHallNameDraft('');
    closeHallModal();
    playSound('clear');
    setHud((prev) => ({ ...prev, status: `로비 등록 완료! (${trimmed})` }));
  }

  function buyBlackMarketItem(item) {
    if (shopStateRef.current.coins < item.price) return;

    if (item.kind === 'unlockAll') {
      if (clearedRef.current >= stages.length - 1) return;
      playSound('buy');
      clearedRef.current = stages.length - 1;
      updateShopState((prev) => ({
        ...prev,
        coins: prev.coins - item.price,
        owned: { ...prev.owned, [item.id]: true },
      }));
      setHud((prev) => ({ ...prev, cleared: stages.length - 1, status: '전 스테이지 해금!' }));
      return;
    }

    if (shopStateRef.current.owned[item.id]) return;

    playSound('buy');
    updateShopState((prev) => ({
      ...prev,
      coins: prev.coins - item.price,
      owned: { ...prev.owned, [item.id]: true },
      equipped: { ...prev.equipped, [item.id]: true },
    }));
  }

  function selectStageFromModal(stageIdx) {
    closeStageModal();
    resetStageFnRef.current?.(stageIdx, false);
  }

  function buyShopItem(item) {
    if (shopStateRef.current.coins < item.price) return;

    if (item.kind === 'consumable') {
      playSound('buy');
      updateShopState((prev) => ({
        ...prev,
        coins: prev.coins - item.price,
        skipTickets: (prev.skipTickets || 0) + 1,
      }));
      return;
    }

    if (shopStateRef.current.owned[item.id]) return;

    playSound('buy');
    updateShopState((prev) => {
      const nextEquipped = { ...prev.equipped, [item.id]: true };
      const next = {
        ...prev,
        coins: prev.coins - item.price,
        owned: { ...prev.owned, [item.id]: true },
        equipped: nextEquipped,
      };
      // Apply immediately to active player!
      const player = playerRef.current;
      if (item.id === 'doubleJump') player.airJumpsLeft = 1;
      if (item.id === 'shield') player.shieldActive = true;
      if (item.id === 'blockBag') {
        player.maxBlocks += 3;
        player.blocksLeft += 3;
      }
      return next;
    });
  }

  function toggleEquipItem(itemId) {
    if (!shopStateRef.current.owned[itemId]) return;
    updateShopState((prev) => {
      const isNowOn = !prev.equipped[itemId];
      const nextEquipped = { ...prev.equipped, [itemId]: isNowOn };
      const player = playerRef.current;
      if (itemId === 'doubleJump') player.airJumpsLeft = isNowOn ? 1 : 0;
      if (itemId === 'shield') player.shieldActive = isNowOn;
      if (itemId === 'blockBag') {
        const baseMax = stages[stageRef.current].band.maxBlocks;
        player.maxBlocks = baseMax + (isNowOn ? 3 : 0);
        player.blocksLeft = Math.min(player.blocksLeft + (isNowOn ? 3 : 0), player.maxBlocks + 3);
      }
      return { ...prev, equipped: nextEquipped };
    });
  }

  function useSkipTicket() {
    if ((shopStateRef.current.skipTickets || 0) <= 0) return;
    updateShopState((prev) => ({
      ...prev,
      skipTickets: Math.max(0, (prev.skipTickets || 0) - 1),
    }));
    closeShop();
    nextStageFnRef.current?.(true);
  }

  function syncJumpPad() {
    let left = false;
    let right = false;
    dirPointersRef.current.forEach((dir) => {
      if (dir === 'left') left = true;
      if (dir === 'right') right = true;
    });
    const jump = jumpPointersRef.current.size > 0;
    const slide = slidePointersRef.current.size > 0;
    inputRef.current.left = left;
    inputRef.current.right = right;
    inputRef.current.jump = jump;
    inputRef.current.slide = slide;
    setPadState((prev) => ({ ...prev, left, right, jump, slide }));
  }

  function handleDirDown(event) {
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const rect = event.currentTarget.getBoundingClientRect();
    const dir = event.clientX - rect.left < rect.width / 2 ? 'left' : 'right';
    dirPointersRef.current.set(event.pointerId, dir);
    syncJumpPad();
  }

  function handleDirMove(event) {
    if (!dirPointersRef.current.has(event.pointerId)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const dir = event.clientX - rect.left < rect.width / 2 ? 'left' : 'right';
    if (dirPointersRef.current.get(event.pointerId) !== dir) {
      dirPointersRef.current.set(event.pointerId, dir);
      syncJumpPad();
    }
  }

  function handleDirUp(event) {
    event.stopPropagation();
    if (dirPointersRef.current.delete(event.pointerId)) {
      syncJumpPad();
    }
  }

  function handleJumpBtnDown(event) {
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    if (!jumpPointersRef.current.has(event.pointerId)) {
      inputRef.current.jumpPressed = true;
    }
    jumpPointersRef.current.add(event.pointerId);
    syncJumpPad();
  }

  function handleJumpBtnUp(event) {
    event.stopPropagation();
    if (jumpPointersRef.current.delete(event.pointerId)) {
      syncJumpPad();
    }
  }

  function handleSlideBtnDown(event) {
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    if (!slidePointersRef.current.has(event.pointerId)) {
      inputRef.current.slidePressed = true;
    }
    slidePointersRef.current.add(event.pointerId);
    syncJumpPad();
  }

  function handleSlideBtnUp(event) {
    event.stopPropagation();
    if (slidePointersRef.current.delete(event.pointerId)) {
      syncJumpPad();
    }
  }

  function handleBlockBtnDown(event) {
    event.stopPropagation();
    event.preventDefault();
    inputRef.current.placeBlockPressed = true;
    setPadState((prev) => ({ ...prev, block: true }));
    window.setTimeout(() => setPadState((prev) => ({ ...prev, block: false })), 130);
  }

  function handleInteractBtnDown(event) {
    event.stopPropagation();
    event.preventDefault();
    inputRef.current.interactPressed = true;
  }

  function handleHookBtnDown(event) {
    event.stopPropagation();
    event.preventDefault();
    inputRef.current.grapplePressed = true;
    setPadState((prev) => ({ ...prev, hook: true }));
    window.setTimeout(() => setPadState((prev) => ({ ...prev, hook: false })), 150);
  }

  const stageButtons = useMemo(() => stages.map((stage) => ({
    index: stage.index,
    label: stage.index + 1,
    difficulty: stage.band.label,
  })), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    function loadProgress() {
      try {
        const saved = JSON.parse(window.localStorage.getItem(saveKey) || '{}');
        clearedRef.current = clamp(Number(saved.cleared) || 0, 0, stages.length);
        const loadedOwned = saved.owned && typeof saved.owned === 'object' ? saved.owned : {};
        const loadedShop = {
          coins: Math.max(0, Number(saved.coins) || 0),
          owned: loadedOwned,
          equipped: saved.equipped && typeof saved.equipped === 'object' ? saved.equipped : {},
          skipTickets: Math.max(0, Number(saved.skipTickets) || 0),
          visitedBlackMarket: Boolean(saved.visitedBlackMarket) || hasBlackMarketItems(loadedOwned),
        };
        shopStateRef.current = loadedShop;
        setShop(loadedShop);
        return clamp(Number(saved.stage) || 0, 0, stages.length - 1);
      } catch {
        return 0;
      }
    }

    function saveProgress(stageIndex = stageRef.current, shopOverride = null) {
      const s = shopOverride ?? shopStateRef.current;
      try {
        window.localStorage.setItem(saveKey, JSON.stringify({
          cleared: clearedRef.current,
          stage: clamp(stageIndex, 0, stages.length - 1),
          coins: s.coins,
          owned: s.owned,
          equipped: s.equipped,
          skipTickets: s.skipTickets,
          visitedBlackMarket: Boolean(s.visitedBlackMarket),
        }));
      } catch {
        // Saving is optional; the game should still play without localStorage.
      }
    }

    function addCoins(amount) {
      if (amount <= 0) return;
      const nextShop = {
        ...shopStateRef.current,
        coins: shopStateRef.current.coins + amount,
      };
      shopStateRef.current = nextShop;
      setShop(nextShop);
      saveProgress(stageRef.current, nextShop);
    }

    function resizeCanvas() {
      const rect = canvas.getBoundingClientRect();
      const scale = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * scale));
      canvas.height = Math.max(1, Math.floor(rect.height * scale));
      context.setTransform(scale, 0, 0, scale, 0, 0);
    }

    function updateHud(status = undefined) {
      const stage = stages[stageRef.current];
      const player = playerRef.current;
      setHud((prev) => ({
        stage: stageRef.current,
        cleared: clearedRef.current,
        items: collectedRef.current.size,
        totalItems: stage.items.length,
        deaths: deathsRef.current,
        blocksLeft: player.blocksLeft,
        maxBlocks: player.maxBlocks,
        shieldActive: player.shieldActive,
        nearbyLabel: nearbyInteractableRef.current?.label ?? '',
        status: status ?? prev.status,
      }));
    }

    function resetStage(nextStage = stageRef.current, died = false) {
      stageRef.current = clamp(nextStage, 0, stages.length - 1);
      playerRef.current = createPlayer(stageRef.current, shopStateRef.current.equipped);
      placedBlocksRef.current = [];
      activeBridgesRef.current = [];
      laserDisabledUntilRef.current = 0;
      nearbyInteractableRef.current = null;
      trailsRef.current = [];
      if (died && checkpointRef.current && checkpointRef.current.stage === stageRef.current) {
        playerRef.current.x = checkpointRef.current.x;
        playerRef.current.y = checkpointRef.current.y;
      } else {
        checkpointRef.current = null;
        collectedRef.current = new Set();
        usedInteractablesRef.current = new Set();
        brokenRef.current = new Map();
      }
      cameraRef.current = { x: 0, y: 0 };
      lastTimeRef.current = null;
      if (died) {
        deathsRef.current += 1;
        playSound('death');
      }
      saveProgress(stageRef.current);
      updateHud(died ? 'Retry' : 'Ready');
    }

    function nextStage(fromSkip = false) {
      playSound('clear');
      const wasFinalStage = stageRef.current === stages.length - 1;
      const isPureClear =
        wasFinalStage &&
        !fromSkip &&
        !shopStateRef.current.visitedBlackMarket &&
        !hasBlackMarketItems(shopStateRef.current.owned);

      const cleared = stageRef.current + 1;
      clearedRef.current = Math.max(clearedRef.current, cleared);
      const clearReward = fromSkip ? 0 : 5 + Math.floor(stageRef.current / 10) * 3;
      if (clearReward > 0) {
        addCoins(clearReward);
      }
      const next = clamp(stageRef.current + 1, 0, stages.length - 1);
      saveProgress(next);
      resetStage(next, false);
      updateHud(
        fromSkip
          ? '스킵 완료!'
          : cleared >= stages.length
            ? `All Clear! +${clearReward}코인`
            : `Clear! +${clearReward}코인`,
      );

      if (isPureClear) {
        shopOpenRef.current = false;
        stageModalOpenRef.current = false;
        blackMarketOpenRef.current = false;
        setShopOpen(false);
        setStageModalOpen(false);
        setBlackMarketOpen(false);
        try {
          const savedNick = (window.localStorage.getItem('gangyoon-lab-nickname-v1') || '').trim();
          if (savedNick) setHallNameDraft(savedNick);
        } catch {
          // Ignore storage read failure.
        }
        hallModalOpenRef.current = true;
        setHallModalOpen(true);
      }
    }

    function getPlayerHeight(player) {
      return player.sliding ? slideHeight : standHeight;
    }

    function canStandUp(player, solids) {
      const standY = player.y - (standHeight - slideHeight);
      const standBox = { x: player.x, y: standY, width: playerWidth, height: standHeight };
      return !solids.some((solid) => intersects(standBox, solid));
    }

    function collideAxis(player, solids, axis, now, crumbleMs) {
      const height = getPlayerHeight(player);
      if (axis !== 'y') player.grounded = false;

      for (const solid of solids) {
        if (!intersects({ x: player.x, y: player.y, width: playerWidth, height }, solid)) continue;

        if (axis === 'x') {
          if (player.vx > 0) {
            player.x = solid.x - playerWidth;
            if (solid.kind === 'wallJump') player.wallDir = 1;
          } else if (player.vx < 0) {
            player.x = solid.x + solid.width;
            if (solid.kind === 'wallJump') player.wallDir = -1;
          }
          player.vx = 0;
        } else if (player.vy > 0) {
          player.y = solid.y - height;
          if (solid.kind === 'spring') {
            player.vy = -960;
            playSound('spring');
          } else {
            player.vy = 0;
          }
          player.grounded = true;
          player.canDash = true;
          player.airJumpsLeft = shopStateRef.current.equipped.doubleJump ? 1 : 0;
          player.wallSliding = false;
          if (solid.kind === 'crumble' && !brokenRef.current.has(solid.id)) {
            brokenRef.current.set(solid.id, now + crumbleMs);
            playSound('crumble');
          }
        } else if (player.vy < 0) {
          player.y = solid.y + solid.height;
          player.vy = 0;
        }
      }
    }

    function tryPlaceBlock(player, solids, now) {
      const hasInfBlocks = Boolean(shopStateRef.current.equipped.infBlocks);
      if (!hasInfBlocks && player.blocksLeft <= 0) return;

      const height = getPlayerHeight(player);
      const lifetime = hasInfBlocks
        ? 20000
        : blockLifetimeMs + (shopStateRef.current.equipped.blockBag ? 2000 : 0);
      const newBlock = player.grounded
        ? {
            x: Math.round(player.x + player.facing * 52 - 18),
            y: Math.round(player.y + height - 48),
            width: blockWidth,
            height: blockHeight,
            kind: 'playerBlock',
            golden: hasInfBlocks,
            expiresAt: now + lifetime,
            duration: lifetime,
            id: `pb-${now}-${Math.random()}`,
          }
        : {
            x: Math.round(player.x + playerWidth / 2 - blockWidth / 2),
            y: Math.round(player.y + height + 2),
            width: blockWidth,
            height: blockHeight,
            kind: 'playerBlock',
            golden: hasInfBlocks,
            expiresAt: now + lifetime,
            duration: lifetime,
            id: `pb-${now}-${Math.random()}`,
          };

      // Don't place overlapping player body
      const playerBox = { x: player.x, y: player.y, width: playerWidth, height };
      if (intersects(playerBox, newBlock)) {
        newBlock.y = Math.round(player.y + height + 2);
      }

      // Avoid placing directly inside an existing static solid
      if (solids.some((s) => s.kind !== 'playerBlock' && intersects(newBlock, s))) {
        return;
      }

      placedBlocksRef.current.push(newBlock);
      if (placedBlocksRef.current.length > maxActiveBlocks) {
        placedBlocksRef.current.shift();
      }

      if (!hasInfBlocks) {
        player.blocksLeft -= 1;
      }
      playSound('block');

      // Mid-air catch: softly stop falling so block-stacking upwards feels super snappy!
      if (!player.grounded && player.vy > 0) {
        player.y = newBlock.y - height;
        player.vy = 0;
        player.grounded = true;
        player.canDash = true;
        player.airJumpsLeft = shopStateRef.current.equipped.doubleJump ? 1 : 0;
      }

      updateHud(`Block (${player.blocksLeft}/${player.maxBlocks})`);
    }

    function tryGrapple(player, solids) {
      if (!shopStateRef.current.equipped.grappleHook || player.grappleCooldown > 0 || player.grapple) {
        return;
      }
      const height = getPlayerHeight(player);
      const originX = player.x + playerWidth / 2;
      const originY = player.y + height * 0.35;

      let bestAnchor = null;
      let bestScore = Infinity;

      for (const solid of solids) {
        const ax = clamp(originX + player.facing * 140, solid.x + 8, solid.x + solid.width - 8);
        const ay = clamp(originY - 90, solid.y + 4, solid.y + solid.height - 4);
        const dx = ax - originX;
        const dy = ay - originY;
        if (dx * player.facing < 30) continue;
        const dist = Math.hypot(dx, dy);
        if (dist < 55 || dist > grappleRange) continue;
        const score = dist + Math.abs(dy + 90) * 0.6;
        if (score < bestScore) {
          bestScore = score;
          bestAnchor = { x: ax, y: ay };
        }
      }

      // Sky-hook fallback so grapple always feels reliable even over wide open chasms
      if (!bestAnchor) {
        bestAnchor = {
          x: originX + player.facing * 215,
          y: Math.max(40, originY - 155),
        };
      }

      player.grapple = {
        x: bestAnchor.x,
        y: bestAnchor.y,
        timer: grappleDuration,
      };
      player.grappleCooldown = grappleCooldownSec;
      player.grounded = false;
      player.canDash = true;
      player.airJumpsLeft = shopStateRef.current.equipped.doubleJump ? 1 : 0;
      playSound('grapple');
      updateHud('후크 발사!');
    }

    function update(delta) {
      if (
        shopOpenRef.current ||
        stageModalOpenRef.current ||
        blackMarketOpenRef.current ||
        hallModalOpenRef.current
      ) {
        return;
      }

      const stage = stages[stageRef.current];
      const player = playerRef.current;
      const equipped = shopStateRef.current.equipped;
      const now = performance.now();
      const timeSec = now / 1000;

      if (player.invulnTimer > 0) player.invulnTimer = Math.max(0, player.invulnTimer - delta);
      if (player.grappleCooldown > 0) player.grappleCooldown = Math.max(0, player.grappleCooldown - delta);
      if (player.blinkCooldown > 0) player.blinkCooldown = Math.max(0, player.blinkCooldown - delta);

      // Remove expired placed blocks & summoned bridges
      placedBlocksRef.current = placedBlocksRef.current.filter((block) => now < block.expiresAt);
      activeBridgesRef.current = activeBridgesRef.current.filter((bridge) => now < bridge.expiresAt);

      // Decay visual motion trails
      trailsRef.current = trailsRef.current
        .map((trail) => ({ ...trail, alpha: trail.alpha - delta * 3.8 }))
        .filter((trail) => trail.alpha > 0.04);

      const activePlatforms = stage.platforms
        .filter((platform) => {
          const breakAt = brokenRef.current.get(platform.id);
          return !breakAt || now < breakAt;
        })
        .map((platform) => getMovingPlatformRect(platform, timeSec));

      const solids = [
        ...activePlatforms,
        ...stage.walls,
        ...placedBlocksRef.current,
        ...activeBridgesRef.current,
      ];

      const input = inputRef.current;
      const wasGrounded = player.grounded;
      if (wasGrounded) {
        player.coyoteTimer = 0.16;
      } else {
        player.coyoteTimer = Math.max(0, player.coyoteTimer - delta);
      }

      // Detect nearest interactable object within range
      const pHNow = getPlayerHeight(player);
      const pCx = player.x + playerWidth / 2;
      const pCy = player.y + pHNow / 2;
      let nearestObj = null;
      let nearestDist = 56;
      for (const obj of stage.interactables) {
        if (obj.kind === 'box' && usedInteractablesRef.current.has(obj.id)) continue;
        const oCx = obj.x + obj.width / 2;
        const oCy = obj.y + obj.height / 2;
        const dist = Math.hypot(pCx - oCx, pCy - oCy);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestObj = obj;
        }
      }
      nearbyInteractableRef.current = nearestObj;

      // Interact trigger (A key / mobile interact button)
      if (input.interactPressed) {
        if (nearestObj) {
          if (nearestObj.kind === 'box') {
            usedInteractablesRef.current.add(nearestObj.id);
            player.blocksLeft = Math.min(player.maxBlocks + 3, player.blocksLeft + 2);
            trailsRef.current.push({ x: nearestObj.x, y: nearestObj.y - 10, w: nearestObj.width, h: nearestObj.height, color: '#facc15', alpha: 0.85 });
            playSound('interact');
            updateHud('상자 열림! 블록 +2');
          } else if (nearestObj.kind === 'switch') {
            usedInteractablesRef.current.add(nearestObj.id);
            laserDisabledUntilRef.current = now + 8000;
            playSound('interact');
            updateHud('레이저 정지 (8초)!');
          } else if (nearestObj.kind === 'bridgeLever' && nearestObj.bridge) {
            usedInteractablesRef.current.add(nearestObj.id);
            activeBridgesRef.current.push({
              ...nearestObj.bridge,
              kind: 'bridge',
              expiresAt: now + 9000,
              id: `bridge-${now}`,
            });
            playSound('interact');
            updateHud('다리 소환! (9초)');
          }
        }
        input.interactPressed = false;
      }

      if (input.left) player.facing = -1;
      if (input.right) player.facing = 1;

      // Block stacking trigger
      if (input.placeBlockPressed) {
        tryPlaceBlock(player, solids, now);
        input.placeBlockPressed = false;
      }

      // Grappling hook trigger (G key / mobile hook button)
      if (input.grapplePressed) {
        tryGrapple(player, solids);
        input.grapplePressed = false;
      }

      // Black Market Blink teleport trigger (T key)
      if (input.blinkPressed) {
        if (equipped.blink && player.blinkCooldown <= 0) {
          const curH = getPlayerHeight(player);
          trailsRef.current.push({ x: player.x, y: player.y, w: playerWidth, h: curH, color: '#ec4899', alpha: 0.9 });
          player.x = clamp(player.x + player.facing * blinkDistance, 0, stage.width - playerWidth);
          player.y = Math.max(20, player.y - 24);
          player.vy = Math.min(player.vy, -180);
          player.blinkCooldown = blinkCooldownSec;
          player.invulnTimer = Math.max(player.invulnTimer, 0.25);
          trailsRef.current.push({ x: player.x, y: player.y, w: playerWidth, h: curH, color: '#a855f7', alpha: 0.9 });
          playSound('blink');
          updateHud('순간이동!');
        }
        input.blinkPressed = false;
      }

      // Slide / Air Dash trigger
      if (player.slideCooldown > 0) player.slideCooldown = Math.max(0, player.slideCooldown - delta);

      if (input.slidePressed) {
        if (wasGrounded && !player.sliding && player.slideCooldown <= 0) {
          player.sliding = true;
          player.slideTimer = slideDuration;
          player.y += standHeight - slideHeight;
          player.vx = player.facing * slideSpeed;
          playSound('slide');
        } else if (!wasGrounded && player.canDash && player.dashTimer <= 0) {
          player.dashTimer = dashDuration;
          player.canDash = false;
          player.vx = player.facing * dashSpeed;
          player.vy = 0;
          playSound('dash');
          if (player.sliding && canStandUp(player, solids)) {
            player.y -= standHeight - slideHeight;
            player.sliding = false;
          }
        }
        input.slidePressed = false;
      }

      // Maintain or end slide
      if (player.sliding) {
        player.slideTimer -= delta;
        if (player.slideTimer <= 0 && !input.slide) {
          if (canStandUp(player, solids)) {
            player.y -= standHeight - slideHeight;
            player.sliding = false;
            player.slideCooldown = slideCooldown;
          }
        }
      }

      const curHeight = getPlayerHeight(player);
      const standingOnIce = solids.some((solid) => solid.kind === 'ice' && intersects(
        { x: player.x, y: player.y + 2, width: playerWidth, height: curHeight },
        solid
      ));

      player.grounded = false;
      player.wallDir = 0;
      player.wallSliding = false;

      const effectiveGravity = equipped.feather ? gravity * 0.84 : gravity;

      if (player.grapple) {
        player.grapple.timer -= delta;
        const gx = player.grapple.x - (player.x + playerWidth / 2);
        const gy = player.grapple.y - (player.y + curHeight / 2);
        const gDist = Math.max(1, Math.hypot(gx, gy));
        const pullSpeed = 790;
        player.vx = (gx / gDist) * pullSpeed;
        player.vy = (gy / gDist) * pullSpeed;
        trailsRef.current.push({ x: player.x, y: player.y, w: playerWidth, h: curHeight, color: '#facc15', alpha: 0.65 });
        if (player.grapple.timer <= 0 || gDist < 42) {
          player.grapple = null;
          player.vy = Math.min(player.vy, -460);
        }
      } else if (player.dashTimer > 0) {
        player.dashTimer -= delta;
        player.vy = 0;
        trailsRef.current.push({ x: player.x, y: player.y, w: playerWidth, h: curHeight, color: '#c084fc', alpha: 0.65 });
      } else if (player.sliding) {
        const slideDir = input.left ? -1 : input.right ? 1 : player.facing;
        const slideTarget = player.slideTimer > 0 ? slideDir * slideSpeed * 0.86 : slideDir * 190;
        player.vx += (slideTarget - player.vx) * clamp(6 * delta, 0, 1);
        player.vy += effectiveGravity * delta;
        if (Math.abs(player.vx) > 260) {
          trailsRef.current.push({ x: player.x, y: player.y, w: playerWidth, h: curHeight, color: '#38bdf8', alpha: 0.45 });
        }
      } else {
        const targetSpeed =
          input.left ? -(wasGrounded ? moveSpeed : airMoveSpeed) :
          input.right ? (wasGrounded ? moveSpeed : airMoveSpeed) :
          0;
        const accel = standingOnIce ? 3.5 : wasGrounded ? 18 : 9;
        player.vx += (targetSpeed - player.vx) * clamp(accel * delta, 0, 1);
        player.vy += effectiveGravity * delta;
        if (equipped.feather && player.vy > 480) {
          player.vy = 480;
        }
      }

      // Horizontal move & collide
      player.x = Math.max(0, player.x + player.vx * delta);
      collideAxis(player, solids, 'x', now, stage.band.crumbleMs);

      // Also detect 1px adjacency ONLY to designated 'wallJump' blocks for crisp wall-cling / wall-jump
      if (player.wallDir === 0 && !player.grounded && !player.sliding) {
        const rightProbe = { x: player.x + playerWidth, y: player.y + 4, width: 2, height: curHeight - 8 };
        const leftProbe = { x: player.x - 2, y: player.y + 4, width: 2, height: curHeight - 8 };
        for (const wall of stage.walls) {
          if (wall.kind !== 'wallJump') continue;
          if (intersects(rightProbe, wall)) {
            player.wallDir = 1;
            break;
          }
          if (intersects(leftProbe, wall)) {
            player.wallDir = -1;
            break;
          }
        }
      }

      // Wall sliding (only on designated 'wallJump' blocks!)
      const pushingWall = (player.wallDir === 1 && input.right) || (player.wallDir === -1 && input.left);
      if (!player.grounded && pushingWall && player.vy > 0 && !player.sliding) {
        player.wallSliding = true;
        player.vy = Math.min(player.vy, 160);
      }

      // Jump & Wall Jump (with 0.1s coyote time & slide-jump boost!)
      if (input.jumpPressed) {
        if (wasGrounded || player.coyoteTimer > 0) {
          if (player.sliding) {
            if (canStandUp(player, solids)) {
              player.y -= standHeight - slideHeight;
              player.sliding = false;
              player.vy = -jumpPower * 0.96;
              player.vx = player.facing * Math.max(Math.abs(player.vx), 470);
              player.grounded = false;
              player.coyoteTimer = 0;
              playSound('jump');
            }
          } else {
            player.vy = -jumpPower;
            player.grounded = false;
            player.coyoteTimer = 0;
            playSound('jump');
          }
        } else if (player.wallDir !== 0) {
          player.vx = -player.wallDir * wallJumpX;
          player.vy = -wallJumpY;
          player.facing = -player.wallDir;
          player.wallSliding = false;
          player.canDash = true;
          player.airJumpsLeft = equipped.doubleJump ? 1 : 0;
          playSound('wallJump');
        } else if (equipped.infJump || player.airJumpsLeft > 0) {
          if (!equipped.infJump) {
            player.airJumpsLeft -= 1;
          }
          player.vy = -jumpPower * 0.94;
          player.grapple = null;
          trailsRef.current.push({
            x: player.x - 8,
            y: player.y + curHeight - 6,
            w: playerWidth + 16,
            h: 8,
            color: equipped.infJump ? '#a855f7' : '#22d3ee',
            alpha: 0.9,
          });
          playSound('doubleJump');
          updateHud(equipped.infJump ? '무한 점프!' : '더블 점프!');
        }
        input.jumpPressed = false;
      }

      // Vertical move & collide
      player.y += player.vy * delta;
      collideAxis(player, solids, 'y', now, stage.band.crumbleMs);

      const finalHeight = getPlayerHeight(player);
      const playerBox = { x: player.x, y: player.y, width: playerWidth, height: finalHeight };

      // Collect items (+1 block charge & +1 shop coin, or 3x with Black Market coin magnet!)
      const coinValue = equipped.coinMagnet ? 3 : 1;
      stage.items.forEach((item) => {
        if (collectedRef.current.has(item.id)) return;
        const magnetHit =
          equipped.coinMagnet &&
          Math.hypot(
            player.x + playerWidth / 2 - (item.x + item.width / 2),
            player.y + finalHeight / 2 - (item.y + item.height / 2),
          ) < 220;
        if (magnetHit || intersects(playerBox, item)) {
          collectedRef.current.add(item.id);
          addCoins(coinValue);
          playSound('coin');
          if (player.blocksLeft < player.maxBlocks + 3) {
            player.blocksLeft += 1;
          }
        }
      });

      // Checkpoints (also refill block charges & spike shield!)
      stage.checkpoints.forEach((checkpoint) => {
        if (intersects(playerBox, checkpoint)) {
          const isNew = checkpointRef.current?.id !== checkpoint.id;
          checkpointRef.current = {
            stage: stageRef.current,
            x: checkpoint.x,
            y: checkpoint.y - standHeight,
            id: checkpoint.id,
          };
          if (isNew) {
            player.blocksLeft = Math.max(player.blocksLeft, player.maxBlocks);
            if (equipped.shield) player.shieldActive = true;
            playSound('checkpoint');
            updateHud('Checkpoint!');
          }
        }
      });

      // Hazard checks (with blinkLaser ON/OFF + switch disable + godMode + spike shield + movingBlade)
      const lasersDisabled = now < laserDisabledUntilRef.current;
      const hitHazard = !equipped.godMode && player.invulnTimer <= 0 && stage.hazards.some((hazard) => {
        if (hazard.kind === 'blinkLaser' && (lasersDisabled || !isBlinkLaserActive(hazard, timeSec))) {
          return false;
        }
        const liveHazard = getHazardRect(hazard, timeSec);
        const isPointedSpike =
          hazard.kind === 'spike' || hazard.kind === 'topSpike' || hazard.kind === 'downSpike';
        const shrunk = isPointedSpike
          ? {
              x: liveHazard.x + 7,
              y: hazard.kind === 'downSpike' ? liveHazard.y : liveHazard.y + liveHazard.height * 0.34,
              width: Math.max(6, liveHazard.width - 14),
              height: Math.max(6, liveHazard.height * 0.66),
            }
          : {
              x: liveHazard.x + 5,
              y: liveHazard.y + 5,
              width: Math.max(6, liveHazard.width - 10),
              height: Math.max(6, liveHazard.height - 10),
            };
        return intersects(playerBox, shrunk);
      });

      if (hitHazard) {
        if (player.shieldActive) {
          player.shieldActive = false;
          player.invulnTimer = 1.4;
          player.vy = -560;
          player.grapple = null;
          trailsRef.current.push({
            x: player.x - 10,
            y: player.y - 10,
            w: playerWidth + 20,
            h: finalHeight + 20,
            color: '#38bdf8',
            alpha: 0.9,
          });
          playSound('shield');
          updateHud('방어막 발동!');
        } else {
          resetStage(stageRef.current, true);
          return;
        }
      }

      if (player.y > stage.floorY + 240) {
        resetStage(stageRef.current, true);
        return;
      }

      if (intersects(playerBox, stage.goal)) {
        nextStage();
      }
    }

    function drawRect(rect, color, camera, radius = 0) {
      context.fillStyle = color;
      if (!radius) {
        context.fillRect(rect.x - camera.x, rect.y - camera.y, rect.width, rect.height);
        return;
      }
      const x = rect.x - camera.x;
      const y = rect.y - camera.y;
      context.beginPath();
      context.roundRect(x, y, rect.width, rect.height, radius);
      context.fill();
    }

    function draw() {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const stage = stages[stageRef.current];
      const player = playerRef.current;
      const camera = cameraRef.current;
      const now = performance.now();
      const timeSec = now / 1000;

      camera.x = clamp(player.x - width * 0.36, 0, Math.max(0, stage.width - width));
      camera.y = clamp(player.y - height * 0.48, -130, 220);

      // Sky gradient darkens slightly with difficulty band!
      const sky = context.createLinearGradient(0, 0, 0, height);
      if (stage.index >= 60) {
        sky.addColorStop(0, '#14041c');
        sky.addColorStop(0.55, '#831843');
        sky.addColorStop(1, '#fbcfe8');
      } else if (stage.index >= 50) {
        sky.addColorStop(0, '#0f0524');
        sky.addColorStop(0.55, '#581c87');
        sky.addColorStop(1, '#e9d5ff');
      } else if (stage.index >= 40) {
        sky.addColorStop(0, '#1f0710');
        sky.addColorStop(0.55, '#7f1d1d');
        sky.addColorStop(1, '#fecaca');
      } else if (stage.index >= 30) {
        sky.addColorStop(0, '#1c1008');
        sky.addColorStop(0.55, '#9a3412');
        sky.addColorStop(1, '#fed7aa');
      } else {
        sky.addColorStop(0, '#0f172a');
        sky.addColorStop(0.55, '#1d4ed8');
        sky.addColorStop(1, '#dbeafe');
      }
      context.fillStyle = sky;
      context.fillRect(0, 0, width, height);

      // Clouds
      context.save();
      context.translate(-camera.x * 0.18, -camera.y * 0.08);
      context.fillStyle = 'rgba(255,255,255,0.12)';
      for (let i = -2; i < 20; i += 1) {
        context.beginPath();
        context.arc(i * 180 + 80, 86 + (i % 3) * 38, 32 + (i % 2) * 16, 0, Math.PI * 2);
        context.fill();
      }
      context.restore();

      // Grid lines
      context.fillStyle = 'rgba(15, 23, 42, 0.2)';
      for (let gx = -camera.x % 80; gx < width; gx += 80) {
        context.fillRect(gx, 0, 1, height);
      }

      // Platforms (including moving rails!)
      stage.platforms.forEach((rawPlatform) => {
        const breakAt = brokenRef.current.get(rawPlatform.id);
        if (breakAt && now >= breakAt) return;

        if (rawPlatform.move) {
          context.save();
          context.strokeStyle = 'rgba(103, 232, 249, 0.45)';
          context.lineWidth = 3;
          context.setLineDash([7, 7]);
          context.beginPath();
          const cx = rawPlatform.x + rawPlatform.width / 2 - camera.x;
          const cy = rawPlatform.y + rawPlatform.height / 2 - camera.y;
          if (rawPlatform.move.axis === 'y') {
            context.moveTo(cx, cy - rawPlatform.move.distance);
            context.lineTo(cx, cy + rawPlatform.move.distance);
          } else {
            context.moveTo(cx - rawPlatform.move.distance, cy);
            context.lineTo(cx + rawPlatform.move.distance, cy);
          }
          context.stroke();
          context.restore();
        }

        const platform = getMovingPlatformRect(rawPlatform, timeSec);
        const color =
          platform.kind === 'goalPad' ? '#facc15' :
          platform.kind === 'spring' ? '#22c55e' :
          platform.kind === 'crumble' ? '#fb923c' :
          platform.kind === 'ice' ? '#bfdbfe' :
          platform.kind === 'moving' ? '#14b8a6' :
          platform.kind === 'thin' ? '#67e8f9' :
          '#f8fafc';

        drawRect(platform, color, camera, 7);
        context.fillStyle = 'rgba(15,23,42,0.22)';
        context.fillRect(platform.x - camera.x, platform.y - camera.y + platform.height - 5, platform.width, 5);

        if (platform.kind === 'spring') {
          context.fillStyle = '#ffffff';
          context.fillRect(platform.x - camera.x + 10, platform.y - camera.y + 7, platform.width - 20, 5);
        }
        if (platform.kind === 'crumble') {
          context.fillStyle = 'rgba(15,23,42,0.38)';
          for (let line = 14; line < platform.width; line += 22) {
            context.fillRect(platform.x - camera.x + line, platform.y - camera.y + 4, 3, platform.height - 8);
          }
        }
        if (platform.kind === 'ice') {
          context.strokeStyle = 'rgba(255,255,255,0.88)';
          context.lineWidth = 2;
          context.beginPath();
          context.moveTo(platform.x - camera.x + 10, platform.y - camera.y + 8);
          context.lineTo(platform.x - camera.x + platform.width - 10, platform.y - camera.y + 8);
          context.stroke();
        }
      });

      // Player-stacked temporary blocks!
      placedBlocksRef.current.forEach((block) => {
        const remaining = clamp((block.expiresAt - now) / (block.duration || blockLifetimeMs), 0, 1);
        const blinking = remaining < 0.25 && Math.floor(now / 110) % 2 === 0;
        const bx = block.x - camera.x;
        const by = block.y - camera.y;

        context.save();
        context.globalAlpha = blinking ? 0.45 : 0.95;
        drawRect(block, block.golden ? '#f59e0b' : '#38bdf8', camera, 6);
        context.strokeStyle = block.golden ? '#fef08a' : '#e0f2fe';
        context.lineWidth = 2;
        context.strokeRect(bx + 1, by + 1, block.width - 2, block.height - 2);
        // Lifetime progress bar inside block
        context.fillStyle = block.golden ? '#78350f' : '#0369a1';
        context.fillRect(bx + 6, by + block.height - 6, (block.width - 12) * remaining, 3);
        context.restore();
      });

      // Summoned emerald bridges (from A-interact levers!)
      activeBridgesRef.current.forEach((bridge) => {
        const remaining = clamp((bridge.expiresAt - now) / 9000, 0, 1);
        const bx = bridge.x - camera.x;
        const by = bridge.y - camera.y;
        context.save();
        context.globalAlpha = remaining < 0.25 && Math.floor(now / 110) % 2 === 0 ? 0.45 : 0.96;
        drawRect(bridge, '#10b981', camera, 6);
        context.fillStyle = '#a7f3d0';
        context.fillRect(bx + 6, by + bridge.height - 5, (bridge.width - 12) * remaining, 3);
        context.restore();
      });

      // Interactable objects (chests, switches, levers) + floating [A] prompt!
      stage.interactables.forEach((obj) => {
        const ox = obj.x - camera.x;
        const oy = obj.y - camera.y;
        const isUsed = usedInteractablesRef.current.has(obj.id);
        const isNearby = nearbyInteractableRef.current?.id === obj.id;

        if (obj.kind === 'box') {
          drawRect(obj, isUsed ? '#64748b' : '#d97706', camera, 5);
          context.fillStyle = isUsed ? '#94a3b8' : '#facc15';
          context.fillRect(ox + 3, oy + (isUsed ? 2 : 12), obj.width - 6, 5);
          context.fillStyle = '#fef08a';
          context.fillRect(ox + obj.width / 2 - 4, oy + 10, 8, 8);
        } else if (obj.kind === 'switch') {
          context.fillStyle = '#334155';
          context.fillRect(ox + 4, oy + 12, obj.width - 8, obj.height - 12);
          context.fillStyle = now < laserDisabledUntilRef.current ? '#22c55e' : '#ef4444';
          context.beginPath();
          context.arc(ox + obj.width / 2, oy + 10, 8, 0, Math.PI * 2);
          context.fill();
        } else if (obj.kind === 'bridgeLever') {
          context.fillStyle = '#475569';
          context.fillRect(ox + 2, oy + obj.height - 10, obj.width - 4, 10);
          context.strokeStyle = isUsed ? '#10b981' : '#facc15';
          context.lineWidth = 4;
          context.beginPath();
          context.moveTo(ox + obj.width / 2, oy + obj.height - 10);
          context.lineTo(ox + obj.width / 2 + (isUsed ? 10 : -10), oy + 4);
          context.stroke();
        }

        if (isNearby) {
          const promptText = `[Q] ${obj.label}`;
          context.font = '900 12px Arial';
          const textW = context.measureText(promptText).width;
          const pillW = textW + 18;
          const pillX = ox + obj.width / 2 - pillW / 2;
          const pillY = oy - 34;
          context.fillStyle = 'rgba(15, 23, 42, 0.92)';
          context.beginPath();
          context.roundRect(pillX, pillY, pillW, 24, 999);
          context.fill();
          context.strokeStyle = '#facc15';
          context.lineWidth = 2;
          context.stroke();
          context.fillStyle = '#facc15';
          context.textAlign = 'center';
          context.fillText(promptText, ox + obj.width / 2, pillY + 16);
        }
      });

      // Walls & Low Slide Beams
      stage.walls.forEach((wall) => {
        const wx = wall.x - camera.x;
        const wy = wall.y - camera.y;

        if (wall.kind === 'lowBeam') {
          drawRect(wall, '#1e293b', camera, 4);
          // Vertical steel gate ribbing
          context.fillStyle = 'rgba(148, 163, 184, 0.14)';
          for (let rx = 10; rx < wall.width - 6; rx += 18) {
            context.fillRect(wx + rx, wy, 4, wall.height - 12);
          }
          // Caution yellow/black bottom shutter stripe
          context.fillStyle = '#facc15';
          context.fillRect(wx, wy + wall.height - 10, wall.width, 10);
          context.fillStyle = '#0f172a';
          for (let sx = 0; sx < wall.width; sx += 16) {
            context.fillRect(wx + sx, wy + wall.height - 10, 8, 10);
          }
          context.fillStyle = '#facc15';
          context.font = '900 11px Arial';
          context.textAlign = 'center';
          context.fillText('SLIDE ↓', wx + wall.width / 2, wy + wall.height - 18);
          return;
        }

        if (wall.kind === 'wallJump') {
          drawRect(wall, '#8b5cf6', camera, 6);
          context.strokeStyle = '#ddd6fe';
          context.lineWidth = 2;
          context.strokeRect(wx + 1, wy + 1, wall.width - 2, wall.height - 2);
          context.fillStyle = 'rgba(255, 255, 255, 0.34)';
          for (let wyLine = wy + 24; wyLine < wy + wall.height - 8; wyLine += 18) {
            context.fillRect(wx + 5, wyLine, wall.width - 10, 4);
          }
          context.fillStyle = '#ffffff';
          context.font = '900 10px Arial';
          context.textAlign = 'center';
          context.fillText('WJ', wx + wall.width / 2, wy + 16);
          return;
        }

        drawRect(wall, '#64748b', camera, 6);
        context.fillStyle = 'rgba(15, 23, 42, 0.28)';
        for (let wyLine = wy + 10; wyLine < wy + wall.height; wyLine += 24) {
          context.fillRect(wx + 6, wyLine, wall.width - 12, 3);
        }
      });

      // Hazards (spikes, blinking lasers, spinning moving sawblades)
      stage.hazards.forEach((rawHazard) => {
        if (rawHazard.kind === 'blinkLaser') {
          const hx = rawHazard.x - camera.x;
          const hy = rawHazard.y - camera.y;
          const disabledBySwitch = now < laserDisabledUntilRef.current;
          const active = !disabledBySwitch && isBlinkLaserActive(rawHazard, timeSec);
          const warning = !disabledBySwitch && isBlinkLaserWarning(rawHazard, timeSec);

          // Emitter caps
          context.fillStyle = '#334155';
          context.fillRect(hx - 4, hy - 6, rawHazard.width + 8, 8);
          context.fillRect(hx - 4, hy + rawHazard.height - 2, rawHazard.width + 8, 8);

          if (active) {
            context.fillStyle = 'rgba(239, 68, 68, 0.25)';
            context.fillRect(hx - 8, hy, rawHazard.width + 16, rawHazard.height);
            context.fillStyle = '#ef4444';
            context.fillRect(hx, hy, rawHazard.width, rawHazard.height);
            context.fillStyle = '#fee2e2';
            context.fillRect(hx + 5, hy, 5, rawHazard.height);
          } else if (warning) {
            context.strokeStyle = 'rgba(250, 204, 21, 0.85)';
            context.lineWidth = 2;
            context.setLineDash([6, 6]);
            context.beginPath();
            context.moveTo(hx + rawHazard.width / 2, hy);
            context.lineTo(hx + rawHazard.width / 2, hy + rawHazard.height);
            context.stroke();
            context.setLineDash([]);
          }
          return;
        }

        if (rawHazard.kind === 'movingBlade') {
          const live = getHazardRect(rawHazard, timeSec);
          const cx = live.x + live.width / 2 - camera.x;
          const cy = live.y + live.height / 2 - camera.y;
          const r = live.width / 2;

          context.save();
          context.translate(cx, cy);
          context.rotate(timeSec * 8);
          context.fillStyle = '#dc2626';
          context.beginPath();
          const teeth = 10;
          for (let i = 0; i < teeth * 2; i += 1) {
            const rad = i % 2 === 0 ? r : r * 0.65;
            const ang = (i * Math.PI) / teeth;
            const px = Math.cos(ang) * rad;
            const py = Math.sin(ang) * rad;
            if (i === 0) context.moveTo(px, py);
            else context.lineTo(px, py);
          }
          context.closePath();
          context.fill();
          context.fillStyle = '#fecaca';
          context.beginPath();
          context.arc(0, 0, r * 0.34, 0, Math.PI * 2);
          context.fill();
          context.restore();
          return;
        }

        const hx = rawHazard.x - camera.x;
        const hy = rawHazard.y - camera.y;
        const isDown = rawHazard.kind === 'downSpike';
        const toothCount = Math.max(2, Math.round(rawHazard.width / 12));
        const toothW = rawHazard.width / toothCount;
        const baseY = isDown ? hy : hy + rawHazard.height;
        const tipY = isDown ? hy + rawHazard.height : hy;

        // Solid steel girder underneath pit spike traps so spikes are never floating in mid-air
        if (rawHazard.hasGirder) {
          context.fillStyle = '#1e293b';
          context.fillRect(hx - 4, baseY, rawHazard.width + 8, 14);
          context.fillStyle = '#475569';
          context.fillRect(hx - 4, baseY, rawHazard.width + 8, 3);
          context.fillStyle = '#94a3b8';
          for (let rx = hx + 4; rx < hx + rawHazard.width - 4; rx += 18) {
            context.fillRect(rx, baseY + 6, 4, 4);
          }
        }

        // Slim gunmetal mounting strip flush to surface
        context.fillStyle = '#1e293b';
        context.fillRect(hx, isDown ? hy : baseY - 3, rawHazard.width, 3);

        // Razor-sharp 3D beveled metallic needles with crimson warning tips
        for (let i = 0; i < toothCount; i += 1) {
          const sx = hx + i * toothW;
          const midX = sx + toothW / 2;
          const ex = sx + toothW;

          // Left bright steel bevel
          context.fillStyle = '#e2e8f0';
          context.beginPath();
          context.moveTo(sx + 0.5, baseY);
          context.lineTo(midX, tipY);
          context.lineTo(midX, baseY);
          context.closePath();
          context.fill();

          // Right dark gunmetal shadow bevel
          context.fillStyle = '#475569';
          context.beginPath();
          context.moveTo(midX, baseY);
          context.lineTo(midX, tipY);
          context.lineTo(ex - 0.5, baseY);
          context.closePath();
          context.fill();

          // Crimson razor tip accent
          const tipSplitY = isDown
            ? tipY - rawHazard.height * 0.32
            : tipY + rawHazard.height * 0.32;
          context.fillStyle = '#ef4444';
          context.beginPath();
          context.moveTo(midX, tipY);
          context.lineTo(midX - toothW * 0.16, tipSplitY);
          context.lineTo(midX + toothW * 0.16, tipSplitY);
          context.closePath();
          context.fill();

          // Crisp dark outline
          context.strokeStyle = '#0f172a';
          context.lineWidth = 1.2;
          context.beginPath();
          context.moveTo(sx + 0.5, baseY);
          context.lineTo(midX, tipY);
          context.lineTo(ex - 0.5, baseY);
          context.stroke();
        }
      });

      // Checkpoints
      stage.checkpoints.forEach((checkpoint) => {
        const active = checkpointRef.current?.id === checkpoint.id;
        const cx = checkpoint.x - camera.x;
        const cy = checkpoint.y - camera.y;
        context.fillStyle = active ? '#22c55e' : 'rgba(34, 197, 94, 0.35)';
        context.fillRect(cx, cy, 8, checkpoint.height);
        context.fillStyle = active ? '#bbf7d0' : '#ffffff';
        context.beginPath();
        context.moveTo(cx + 8, cy + 8);
        context.lineTo(cx + checkpoint.width, cy + 18);
        context.lineTo(cx + 8, cy + 30);
        context.closePath();
        context.fill();
      });

      // Collectible coins (+1 block)
      stage.items.forEach((item) => {
        if (collectedRef.current.has(item.id)) return;
        const cx = item.x - camera.x + item.width / 2;
        const cy = item.y - camera.y + item.height / 2;
        context.fillStyle = '#facc15';
        context.beginPath();
        context.arc(cx, cy, item.width / 2, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = '#ffffff';
        context.lineWidth = 3;
        context.stroke();
      });

      // Goal flag
      drawRect(stage.goal, 'rgba(34, 197, 94, 0.28)', camera, 6);
      context.fillStyle = '#22c55e';
      context.fillRect(stage.goal.x - camera.x, stage.goal.y - camera.y, 8, stage.goal.height);
      context.fillStyle = '#ffffff';
      context.fillRect(stage.goal.x - camera.x + 8, stage.goal.y - camera.y + 8, 32, 20);

      // Motion trails (slide & air dash)
      trailsRef.current.forEach((trail) => {
        context.save();
        context.globalAlpha = trail.alpha;
        context.fillStyle = trail.color;
        context.beginPath();
        context.roundRect(trail.x - camera.x, trail.y - camera.y, trail.w, trail.h, 7);
        context.fill();
        context.restore();
      });

      // Grappling hook rope & claw visual!
      const pHeight = getPlayerHeight(player);
      const px = player.x - camera.x;
      const py = player.y - camera.y;
      if (player.grapple) {
        const ax = player.grapple.x - camera.x;
        const ay = player.grapple.y - camera.y;
        context.save();
        context.strokeStyle = '#facc15';
        context.lineWidth = 3.5;
        context.beginPath();
        context.moveTo(px + playerWidth / 2, py + pHeight * 0.35);
        context.lineTo(ax, ay);
        context.stroke();
        context.fillStyle = '#fef08a';
        context.beginPath();
        context.arc(ax, ay, 7, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = '#b45309';
        context.lineWidth = 2;
        context.stroke();
        context.restore();
      }

      // Player character (flickers briefly while invulnerable after shield break)
      const invulnFlicker = player.invulnTimer > 0 && Math.floor(now / 70) % 2 === 0;
      context.save();
      if (invulnFlicker) context.globalAlpha = 0.5;
      context.fillStyle =
        player.grapple ? '#facc15' :
        player.dashTimer > 0 ? '#c084fc' :
        player.sliding ? '#38bdf8' :
        player.wallSliding ? '#facc15' :
        stage.band.color;
      context.beginPath();
      context.roundRect(px, py, playerWidth, pHeight, 8);
      context.fill();

      // Visor / eyes showing facing direction
      context.fillStyle = '#0f172a';
      const eyeX = player.facing === 1 ? px + 14 : px + 4;
      context.fillRect(eyeX, py + (player.sliding ? 5 : 9), 10, 6);

      // Protective glowing shield ring or Black Market godMode crimson aura!
      if (shopStateRef.current.equipped.godMode) {
        context.strokeStyle = 'rgba(244, 63, 94, 0.92)';
        context.lineWidth = 2.5;
        context.beginPath();
        context.arc(px + playerWidth / 2, py + pHeight / 2, Math.max(playerWidth, pHeight) * 0.72, 0, Math.PI * 2);
        context.stroke();
      } else if (player.shieldActive) {
        context.strokeStyle = 'rgba(56, 189, 248, 0.9)';
        context.lineWidth = 2.5;
        context.beginPath();
        context.arc(px + playerWidth / 2, py + pHeight / 2, Math.max(playerWidth, pHeight) * 0.68, 0, Math.PI * 2);
        context.stroke();
      }
      context.restore();

      // Canvas mini overlay
      context.fillStyle = 'rgba(15, 23, 42, 0.72)';
      context.beginPath();
      context.roundRect(14, 14, 198, 86, 10);
      context.fill();
      context.fillStyle = stage.band.color;
      context.font = '900 14px Arial';
      context.textAlign = 'left';
      context.fillText(`${stage.name} · ${stage.band.label}`, 26, 36);
      context.fillStyle = '#ffffff';
      context.font = '800 12px Arial';
      context.fillText(`블록 ${player.blocksLeft}/${player.maxBlocks} · 코인 ${collectedRef.current.size}/${stage.items.length}`, 26, 58);
      context.fillStyle = '#93c5fd';
      const stateLabel =
        player.dashTimer > 0 ? 'Air Dash!' :
        player.sliding ? 'Sliding' :
        player.wallSliding ? 'Wall Slide' :
        player.grounded ? 'Ground' :
        player.canDash ? 'Air (대시 가능)' : 'Air';
      context.fillText(stateLabel, 26, 78);
    }

    function tick(time) {
      const last = lastTimeRef.current ?? time;
      const delta = clamp((time - last) / 1000, 0, 1 / 30);
      lastTimeRef.current = time;

      update(delta);
      draw();
      if (Math.floor(time / 120) !== Math.floor(last / 120)) updateHud();
      frameRef.current = requestAnimationFrame(tick);
    }

    function setKey(event, pressed) {
      if (
        shopOpenRef.current ||
        stageModalOpenRef.current ||
        blackMarketOpenRef.current ||
        hallModalOpenRef.current
      ) {
        if (pressed && event.key === 'Escape') {
          shopOpenRef.current = false;
          stageModalOpenRef.current = false;
          blackMarketOpenRef.current = false;
          hallModalOpenRef.current = false;
          setShopOpen(false);
          setStageModalOpen(false);
          setBlackMarketOpen(false);
          setHallModalOpen(false);
        }
        return;
      }

      const key = event.key.toLowerCase();

      // Secret Easter Egg: press a-z in exact order to open Black Market!
      if (pressed && !event.repeat) {
        const codeLetter =
          /^Key[A-Z]$/.test(event.code) ? event.code.slice(3).toLowerCase() :
          /^[a-z]$/.test(key) ? key : '';
        if (codeLetter) {
          if (codeLetter === SECRET_CODE[secretProgressRef.current]) {
            secretProgressRef.current += 1;
            if (secretProgressRef.current >= SECRET_CODE.length) {
              secretProgressRef.current = 0;
              if (!shopStateRef.current.visitedBlackMarket) {
                const markedShop = { ...shopStateRef.current, visitedBlackMarket: true };
                shopStateRef.current = markedShop;
                setShop(markedShop);
                saveProgress(stageRef.current, markedShop);
              }
              shopOpenRef.current = false;
              stageModalOpenRef.current = false;
              blackMarketOpenRef.current = true;
              setShopOpen(false);
              setStageModalOpen(false);
              setBlackMarketOpen(true);
              playSound('blackMarket');
              return;
            }
          } else {
            secretProgressRef.current = codeLetter === 'a' ? 1 : 0;
          }
        }
      }

      const code = event.code || '';
      if (['arrowleft', 'a'].includes(key) || code === 'KeyA') {
        event.preventDefault();
        inputRef.current.left = pressed;
      }
      if (['arrowright', 'd'].includes(key) || code === 'KeyD') {
        event.preventDefault();
        inputRef.current.right = pressed;
      }
      if (['enter', 'arrowup', ' ', 'w'].includes(key) || code === 'KeyW') {
        event.preventDefault();
        if (pressed && !inputRef.current.jump) inputRef.current.jumpPressed = true;
        inputRef.current.jump = pressed;
      }
      if (['shift', 'arrowdown', 's'].includes(key) || code === 'KeyS') {
        event.preventDefault();
        if (pressed && !inputRef.current.slide) inputRef.current.slidePressed = true;
        inputRef.current.slide = pressed;
      }
      if (pressed && !event.repeat && key === 'q') {
        event.preventDefault();
        inputRef.current.interactPressed = true;
      }
      if (pressed && !event.repeat && key === 'g') {
        event.preventDefault();
        inputRef.current.grapplePressed = true;
      }
      if (pressed && !event.repeat && key === 't') {
        event.preventDefault();
        inputRef.current.blinkPressed = true;
      }
      if (pressed && !event.repeat && ['e', 'f', 'b'].includes(key)) {
        event.preventDefault();
        inputRef.current.placeBlockPressed = true;
      }
      if (pressed && key === 'r') resetStage(stageRef.current, false);
    }

    function handleKeyDown(event) {
      setKey(event, true);
    }

    function handleKeyUp(event) {
      setKey(event, false);
    }

    resetStageFnRef.current = resetStage;
    nextStageFnRef.current = nextStage;
    saveProgressFnRef.current = saveProgress;
    resizeCanvas();
    resetStage(loadProgress(), false);
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    frameRef.current = requestAnimationFrame(tick);

    return () => {
      resetStageFnRef.current = null;
      nextStageFnRef.current = null;
      saveProgressFnRef.current = null;
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <section className={styles.jumpPage}>
      <div className={styles.jumpShell}>
        <header className={styles.jumpHud}>
          <div>
            <span className={styles.brandTag}>GANGYOON!LAB!</span>
            <h1>Jump Map</h1>
          </div>
          <div className={styles.stats}>
            <strong className={styles.statPrimary}>{stages[hud.stage].name}</strong>
            <span className={styles.statBadge}>{stages[hud.stage].band.label}</span>
            <span className={styles.statBlockBadge}>블록 {hud.blocksLeft}/{hud.maxBlocks}</span>
            <span className={styles.statCoinBadge}>🪙 {shop.coins} 코인</span>
            <button type="button" className={styles.stageOpenBtn} onClick={openStageModal}>
              🗺️ 스테이지 ({hud.cleared}/{stages.length})
            </button>
            <button type="button" className={styles.shopOpenBtn} onClick={openShop}>
              🛒 상점
            </button>
            <button
              type="button"
              className={styles.stageOpenBtn}
              onClick={toggleSound}
              aria-label={soundEnabled ? '소리 끄기' : '소리 켜기'}
            >
              {soundEnabled ? '🔊' : '🔇'}
            </button>
            <button
              type="button"
              className={styles.stageOpenBtn}
              onClick={() => resetStageFnRef.current?.(stageRef.current, false)}
              aria-label="스테이지 재시작"
              title="현재 스테이지 다시 시작 (R)"
            >
              ↻ 다시
            </button>
            <span className={styles.statBadge}>사망 {hud.deaths}</span>
            <span className={styles.statBadge}>{hud.status}</span>
          </div>
        </header>

        <div className={styles.gameFrame}>
          <canvas ref={canvasRef} className={styles.gameCanvas} />
          <div className={styles.guide}>
            <strong>
              A/D·←/→ 이동 · Enter 점프 · Shift 슬라이딩/대시 · Q 상호작용 · E 블록
              {shop.equipped.grappleHook ? ' · G 후크' : ''}
            </strong>
            <span>코인을 모아 우측 상단 🛒 상점에서 더블점프·그래플링 후크·방어막 등을 구매하세요!</span>
          </div>

          <button
            type="button"
            className={styles.stagePicker}
            onClick={openStageModal}
            style={{ width: 'auto', border: 0, background: 'transparent', padding: 0 }}
          >
            <span
              style={{
                minHeight: '36px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0 12px',
                border: '1px solid rgba(255, 255, 255, 0.24)',
                borderRadius: '8px',
                background: 'rgba(15, 23, 42, 0.82)',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 900,
                cursor: 'pointer',
              }}
            >
              🗺️ 스테이지 {hud.stage + 1}/{stages.length}
            </span>
          </button>

          <div className={styles.mobilePadBar} aria-label="모바일 점프맵 조작">
            <div
              className={styles.mobileDirPad}
              onPointerDown={handleDirDown}
              onPointerMove={handleDirMove}
              onPointerUp={handleDirUp}
              onPointerCancel={handleDirUp}
              onContextMenu={(e) => e.preventDefault()}
            >
              <span className={padState.left ? `${styles.dirKey} ${styles.dirKeyActive}` : styles.dirKey}>◀</span>
              <span className={padState.right ? `${styles.dirKey} ${styles.dirKeyActive}` : styles.dirKey}>▶</span>
            </div>

            <div className={styles.mobileActionPad}>
              {shop.equipped.grappleHook ? (
                <button
                  type="button"
                  className={
                    padState.hook
                      ? `${styles.mobileHookBtn} ${styles.mobileHookBtnActive}`
                      : styles.mobileHookBtn
                  }
                  onPointerDown={handleHookBtnDown}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  🪝 후크
                </button>
              ) : (
                <button
                  type="button"
                  className={
                    hud.nearbyLabel
                      ? `${styles.mobileInteractBtn} ${styles.mobileInteractBtnReady}`
                      : styles.mobileInteractBtn
                  }
                  onPointerDown={handleInteractBtnDown}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  Q 상호작용
                </button>
              )}
              <button
                type="button"
                className={
                  padState.block
                    ? `${styles.mobileSkillBtn} ${styles.mobileSkillBtnActive}`
                    : styles.mobileSkillBtn
                }
                onPointerDown={handleBlockBtnDown}
                onContextMenu={(e) => e.preventDefault()}
              >
                블록 ({hud.blocksLeft})
              </button>
              {shop.equipped.grappleHook && (
                <button
                  type="button"
                  className={
                    hud.nearbyLabel
                      ? `${styles.mobileInteractBtn} ${styles.mobileInteractBtnReady}`
                      : styles.mobileInteractBtn
                  }
                  onPointerDown={handleInteractBtnDown}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  Q
                </button>
              )}
              <button
                type="button"
                className={
                  padState.slide
                    ? `${styles.mobileSlideBtn} ${styles.mobileSlideBtnActive}`
                    : styles.mobileSlideBtn
                }
                onPointerDown={handleSlideBtnDown}
                onPointerUp={handleSlideBtnUp}
                onPointerCancel={handleSlideBtnUp}
                onContextMenu={(e) => e.preventDefault()}
              >
                슬라이드
              </button>
              <button
                type="button"
                className={
                  padState.jump
                    ? `${styles.mobileJumpBtn} ${styles.mobileJumpBtnActive}`
                    : styles.mobileJumpBtn
                }
                onPointerDown={handleJumpBtnDown}
                onPointerUp={handleJumpBtnUp}
                onPointerCancel={handleJumpBtnUp}
                onContextMenu={(e) => e.preventDefault()}
              >
                JUMP
              </button>
            </div>
          </div>

          {stageModalOpen && (
            <div className={styles.shopOverlay} role="dialog" aria-modal="true" aria-label="스테이지 다시하기 창">
              <div className={styles.shopModal}>
                <div className={styles.shopHeader}>
                  <div>
                    <h2>🗺️ 스테이지 선택 · 다시하기</h2>
                    <p>클리어한 스테이지(✓)를 선택해 언제든 다시 플레이하고 코인을 모을 수 있습니다.</p>
                  </div>
                  <div className={styles.shopHeaderRight}>
                    <button
                      type="button"
                      className={styles.shopUseBtn}
                      style={{ flex: 'none', padding: '0 12px' }}
                      onClick={() => selectStageFromModal(Math.min(hud.cleared, stages.length - 1))}
                    >
                      최신 단계 ({Math.min(hud.cleared + 1, stages.length)})
                    </button>
                    <button type="button" className={styles.shopCloseBtn} onClick={closeStageModal}>
                      닫기 ✕
                    </button>
                  </div>
                </div>

                <div className={styles.stageBandList}>
                  {difficultyBands.map((band) => {
                    const bandStages = stages.slice(band.from, band.to + 1);
                    const bandCleared = bandStages.filter((s) => s.index < hud.cleared).length;

                    return (
                      <div key={band.name} className={styles.stageBandSection}>
                        <div className={styles.stageBandHead}>
                          <strong style={{ color: band.color }}>
                            {band.label} (Stage {band.from + 1} ~ {band.to + 1})
                          </strong>
                          <span>{bandCleared} / {bandStages.length} 클리어</span>
                        </div>
                        <div className={styles.stageModalGrid}>
                          {bandStages.map((stage) => {
                            const isCleared = stage.index < hud.cleared;
                            const isUnlocked = stage.index <= Math.min(hud.cleared, stages.length - 1);
                            const isCurrent = stage.index === hud.stage;

                            const btnClasses = [
                              styles.stageModalBtn,
                              isCleared ? styles.stageModalBtnCleared : '',
                              isCurrent ? styles.stageModalBtnCurrent : '',
                              !isUnlocked ? styles.stageModalBtnLocked : '',
                            ]
                              .filter(Boolean)
                              .join(' ');

                            return (
                              <button
                                key={stage.index}
                                type="button"
                                disabled={!isUnlocked}
                                className={btnClasses}
                                onClick={() => selectStageFromModal(stage.index)}
                              >
                                <span>{isUnlocked ? `${stage.index + 1}` : `🔒 ${stage.index + 1}`}</span>
                                <small>
                                  {isCurrent ? '플레이 중' : isCleared ? '다시하기 ✓' : isUnlocked ? '도전' : '잠김'}
                                </small>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {blackMarketOpen && (
            <div className={styles.blackMarketOverlay} role="dialog" aria-modal="true" aria-label="비밀 블랙마켓">
              <div className={styles.blackMarketModal}>
                <div className={styles.shopHeader}>
                  <div>
                    <h2 className={styles.blackMarketTitle}>🕶️ BLACK MARKET · 비밀 암시장</h2>
                    <p className={styles.blackMarketSub}>
                      비밀 코드를 발견하셨습니다! 금단의 최강 능력들을 1~5 코인 특가로 구매하세요.
                    </p>
                  </div>
                  <div className={styles.shopHeaderRight}>
                    <span className={styles.statCoinBadge}>🪙 {shop.coins} 코인</span>
                    <button type="button" className={styles.shopCloseBtn} onClick={closeBlackMarket}>
                      닫기 ✕
                    </button>
                  </div>
                </div>

                <div className={styles.shopGrid}>
                  {BLACK_MARKET_ITEMS.map((item) => {
                    const isOwned = Boolean(shop.owned[item.id]);
                    const isEquipped = Boolean(shop.equipped[item.id]);
                    const canAfford = shop.coins >= item.price;

                    return (
                      <div
                        key={item.id}
                        className={
                          isOwned ? `${styles.blackCard} ${styles.blackCardOwned}` : styles.blackCard
                        }
                      >
                        <div className={styles.shopCardTop}>
                          <div className={styles.shopCardTitle}>
                            <span className={styles.shopCardIcon}>{item.icon}</span>
                            <div>
                              <strong>{item.name}</strong>
                              <span>{item.keyHint}</span>
                            </div>
                          </div>
                          <span className={styles.blackPriceTag}>
                            {isOwned ? '해금됨' : `🪙 ${item.price} 코인`}
                          </span>
                        </div>

                        <p className={styles.shopCardDesc}>{item.description}</p>

                        <div className={styles.shopCardActions}>
                          {item.kind === 'unlockAll' ? (
                            <button
                              type="button"
                              className={styles.blackBuyBtn}
                              disabled={hud.cleared >= stages.length - 1 || !canAfford}
                              onClick={() => buyBlackMarketItem(item)}
                            >
                              {hud.cleared >= stages.length - 1
                                ? `${stages.length}단계 전체 해금 완료 ✓`
                                : canAfford
                                  ? `🪙 ${item.price} 즉시 해금`
                                  : `코인 부족 (${shop.coins}/${item.price})`}
                            </button>
                          ) : isOwned ? (
                            <button
                              type="button"
                              className={
                                isEquipped
                                  ? `${styles.shopToggleBtn} ${styles.blackToggleActive}`
                                  : styles.shopToggleBtn
                              }
                              onClick={() => toggleEquipItem(item.id)}
                            >
                              {isEquipped ? '활성화 중 ⚡ (클릭해 끄기)' : '꺼짐 (클릭해 켜기)'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className={styles.blackBuyBtn}
                              disabled={!canAfford}
                              onClick={() => buyBlackMarketItem(item)}
                            >
                              {canAfford ? `🪙 ${item.price} 암시장 구매` : `코인 부족 (${shop.coins}/${item.price})`}
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

          {hallModalOpen && (
            <div className={styles.shopOverlay} role="dialog" aria-modal="true" aria-label="정통 클리어 이름 등록">
              <div className={styles.hallModal}>
                <h2>🏆 정통 올클리어 달성!</h2>
                <p>
                  블랙마켓을 한 번도 가지 않고 {stages.length}스테이지를 끝까지 클리어했습니다!
                  <br />
                  이름을 남기면 GANGYOON!LAB! 로비에 작게 기록됩니다.
                </p>
                <form className={styles.hallForm} onSubmit={handleRegisterHallName}>
                  <input
                    type="text"
                    className={styles.hallInput}
                    value={hallNameDraft}
                    onChange={(e) => setHallNameDraft(e.target.value)}
                    placeholder="이름 또는 닉네임 (최대 16자)"
                    maxLength={16}
                    autoFocus
                  />
                  <button
                    type="submit"
                    className={styles.hallSubmitBtn}
                    disabled={!hallNameDraft.trim()}
                  >
                    등록
                  </button>
                </form>
                <button type="button" className={styles.shopCloseBtn} onClick={closeHallModal}>
                  나중에 하기
                </button>
              </div>
            </div>
          )}

          {shopOpen && (
            <div className={styles.shopOverlay} role="dialog" aria-modal="true" aria-label="점프맵 상점">
              <div className={styles.shopModal}>
                <div className={styles.shopHeader}>
                  <div>
                    <h2>🛒 점프맵 아이템 상점</h2>
                    <p>맵 코인(+1)과 스테이지 클리어 보너스(+5~23)로 능력을 구매하세요!</p>
                  </div>
                  <div className={styles.shopHeaderRight}>
                    <span className={styles.statCoinBadge}>🪙 {shop.coins} 코인</span>
                    <button type="button" className={styles.shopCloseBtn} onClick={closeShop}>
                      닫기 ✕
                    </button>
                  </div>
                </div>

                <div className={styles.shopGrid}>
                  {SHOP_ITEMS.map((item) => {
                    const isOwned = Boolean(shop.owned[item.id]);
                    const isEquipped = Boolean(shop.equipped[item.id]);
                    const canAfford = shop.coins >= item.price;

                    return (
                      <div
                        key={item.id}
                        className={
                          isOwned ? `${styles.shopCard} ${styles.shopCardOwned}` : styles.shopCard
                        }
                      >
                        <div className={styles.shopCardTop}>
                          <div className={styles.shopCardTitle}>
                            <span className={styles.shopCardIcon}>{item.icon}</span>
                            <div>
                              <strong>{item.name}</strong>
                              <span>{item.keyHint}</span>
                            </div>
                          </div>
                          <span className={styles.shopPriceTag}>
                            {item.kind === 'consumable'
                              ? `보유 ${shop.skipTickets || 0}개 · 🪙${item.price}`
                              : isOwned
                                ? '보유 중'
                                : `🪙 ${item.price}`}
                          </span>
                        </div>

                        <p className={styles.shopCardDesc}>{item.description}</p>

                        <div className={styles.shopCardActions}>
                          {item.kind === 'consumable' ? (
                            <>
                              <button
                                type="button"
                                className={styles.shopBuyBtn}
                                disabled={!canAfford}
                                onClick={() => buyShopItem(item)}
                              >
                                🪙 {item.price} 구매
                              </button>
                              {(shop.skipTickets || 0) > 0 && (
                                <button
                                  type="button"
                                  className={styles.shopUseBtn}
                                  onClick={useSkipTicket}
                                >
                                  지금 스킵!
                                </button>
                              )}
                            </>
                          ) : isOwned ? (
                            <button
                              type="button"
                              className={
                                isEquipped
                                  ? `${styles.shopToggleBtn} ${styles.shopToggleBtnActive}`
                                  : styles.shopToggleBtn
                              }
                              onClick={() => toggleEquipItem(item.id)}
                            >
                              {isEquipped ? '장착 중 ✓ (클릭해 끄기)' : '꺼짐 (클릭해 장착)'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className={styles.shopBuyBtn}
                              disabled={!canAfford}
                              onClick={() => buyShopItem(item)}
                            >
                              {canAfford ? `🪙 ${item.price} 구매하기` : `코인 부족 (${shop.coins}/${item.price})`}
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
    </section>
  );
}
