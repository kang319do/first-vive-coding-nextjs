import { useEffect, useRef, useState } from 'react';

const playerRadius = 18;
const gravity = 1450;
const minCruiseSpeed = 420;
const levelCount = 50;
const saveKey = 'swing-hook-progress-v1';
const ceremonyDuration = 1350;

const themes = [
  { name: 'Neon City', skyTop: '#172554', skyMid: '#2563eb', ground: '#0f172a', accent: '#22d3ee', hazard: '#fb7185' },
  { name: 'Candy Cloud', skyTop: '#fce7f3', skyMid: '#dbeafe', ground: '#7c3aed', accent: '#facc15', hazard: '#e11d48' },
  { name: 'Jungle Rush', skyTop: '#14532d', skyMid: '#86efac', ground: '#064e3b', accent: '#bef264', hazard: '#f97316' },
  { name: 'Lava Rail', skyTop: '#450a0a', skyMid: '#fb923c', ground: '#1f2937', accent: '#fde047', hazard: '#dc2626' },
  { name: 'Moon Lab', skyTop: '#020617', skyMid: '#64748b', ground: '#334155', accent: '#a78bfa', hazard: '#38bdf8' },
];

const characters = [
  { name: 'Rookie', body: '#0f172a', suit: '#22d3ee', cape: 'rgba(37, 99, 235, 0.55)', unlock: 'Start' },
  { name: 'Bolt', body: '#111827', suit: '#facc15', cape: 'rgba(250, 204, 21, 0.45)', unlock: 'Clear 5' },
  { name: 'Violet', body: '#2e1065', suit: '#c084fc', cape: 'rgba(168, 85, 247, 0.45)', unlock: 'Clear 10' },
  { name: 'Ember', body: '#431407', suit: '#fb923c', cape: 'rgba(239, 68, 68, 0.48)', unlock: 'Clear 15' },
  { name: 'Aurora', body: '#052e16', suit: '#86efac', cape: 'rgba(34, 197, 94, 0.45)', unlock: 'Clear 20' },
  { name: 'Nova', body: '#020617', suit: '#f8fafc', cape: 'rgba(148, 163, 184, 0.48)', unlock: 'Clear 25' },
];

function createLevel(index) {
  const difficulty = index / (levelCount - 1);
  const width = Math.round(2300 + index * 185 + difficulty * 1700);
  const finishX = width - 270;
  const hookGap = Math.max(170, 285 - difficulty * 74);
  const hookCount = Math.ceil((finishX - 260) / hookGap);
  const hooks = [];
  const pads = [];
  const theme = themes[index % themes.length];

  for (let hookIndex = 0; hookIndex < hookCount; hookIndex += 1) {
    const x = 300 + hookIndex * hookGap + Math.sin(index * 0.9 + hookIndex * 1.35) * (22 + difficulty * 35);
    const wave = Math.sin(hookIndex * 1.52 + index * 0.7);
    const steep = Math.sin(hookIndex * 0.73 + index * 0.31);
    const y = clamp(155 + wave * (52 + difficulty * 38) + steep * difficulty * 46, 78, 258);
    hooks.push({ x: Math.round(x), y: Math.round(y) });
  }

  const padGap = 560 - difficulty * 180;
  for (let x = 540 + (index % 4) * 72; x < finishX - 210; x += padGap) {
    const padTypeIndex = Math.abs(Math.floor(index + x / 300)) % 3;
    const padType = padTypeIndex === 0 ? 'boost' : padTypeIndex === 1 ? 'float' : 'long';
    const isWallPad = Math.abs(Math.floor(index * 3 + x / 180)) % 5 === 0;
    const typePower =
      padType === 'boost' ? 1040 :
      padType === 'float' ? 930 :
      980;
    const pad = {
      x: Math.round(x),
      y: Math.round(456 - Math.sin(x * 0.01 + index) * 24),
      width: Math.round((isWallPad ? 84 : padType === 'long' ? 148 : 116) - difficulty * 18),
      height: isWallPad ? Math.round(74 + difficulty * 34) : 20,
      angle: isWallPad ? 84 + Math.sin(index + x * 0.01) * 10 : Math.sin(index * 0.8 + x * 0.012) * (16 + difficulty * 8),
      power: Math.round(typePower + difficulty * 310 + (isWallPad ? 160 : 0)),
      type: isWallPad ? 'wall' : padType,
    };

    pads.push(pad);

    if (Math.abs(Math.floor(index + x / 210)) % 4 === 0) {
      hooks.push({
        x: Math.round(pad.x + (isWallPad ? 44 : 0)),
        y: Math.round(pad.y - (isWallPad ? 102 : 92)),
        attached: true,
      });
    }
  }

  return {
    name: `STAGE ${String(index + 1).padStart(2, '0')}`,
    themeName: theme.name,
    theme,
    width,
    start: { x: 120, y: Math.round(322 - difficulty * 52) },
    finishX,
    hooks,
    pads,
    difficulty,
  };
}

const levels = Array.from({ length: levelCount }, (_, index) => createLevel(index));

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function rectHitCircle(rect, circle, radius) {
  const left = rect.x - rect.width / 2;
  const right = rect.x + rect.width / 2;
  const top = rect.y - rect.height / 2;
  const bottom = rect.y + rect.height / 2;
  const closestX = clamp(circle.x, left, right);
  const closestY = clamp(circle.y, top, bottom);

  return Math.hypot(circle.x - closestX, circle.y - closestY) <= radius;
}

function rotatedRectHitCircle(rect, circle, radius) {
  const angle = (-rect.angle * Math.PI) / 180;
  const dx = circle.x - rect.x;
  const dy = circle.y - rect.y;
  const localCircle = {
    x: Math.cos(angle) * dx - Math.sin(angle) * dy,
    y: Math.sin(angle) * dx + Math.cos(angle) * dy,
  };

  return rectHitCircle({ x: 0, y: 0, width: rect.width, height: rect.height }, localCircle, radius);
}

function createPlayer(levelIndex) {
  const level = levels[levelIndex];

  return {
    x: level.start.x,
    y: level.start.y,
    vx: 430,
    vy: -140,
    rotation: 0,
    bounceCombo: 0,
    lastPadId: '',
    lastPadTime: 0,
  };
}

function drawRoundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
  context.fill();
}

function getUnlockedCount(clearedStages) {
  return Math.min(characters.length, Math.floor(clearedStages / 5) + 1);
}

export default function SwingHookPage() {
  const canvasRef = useRef(null);
  const frameRef = useRef(null);
  const playerRef = useRef(createPlayer(0));
  const levelRef = useRef(0);
  const cameraRef = useRef({ x: 0 });
  const ropeRef = useRef(null);
  const inputRef = useRef({ holding: false });
  const lastTimeRef = useRef(null);
  const failCountRef = useRef(0);
  const clearedStagesRef = useRef(0);
  const ceremonyRef = useRef(null);
  const selectedCharacterRef = useRef(0);
  const audioRef = useRef(null);
  const [hud, setHud] = useState({
    level: 0,
    progress: 0,
    fails: 0,
    hooked: false,
    speed: 0,
    combo: 0,
    unlocked: 1,
    character: characters[0].name,
    ceremony: '',
    cleared: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    function getAudioContext() {
      if (!audioRef.current) {
        audioRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }

      if (audioRef.current.state === 'suspended') {
        audioRef.current.resume();
      }

      return audioRef.current;
    }

    function playSound(type) {
      const audio = getAudioContext();
      const now = audio.currentTime;
      const gain = audio.createGain();
      const oscillator = audio.createOscillator();
      const sparkle = audio.createOscillator();
      const frequencies = {
        hook: [760, 480],
        pad: [360, 1180],
        fail: [180, 80],
        goal: [640, 1120],
      };
      const [start, end] = frequencies[type] ?? frequencies.hook;

      gain.connect(audio.destination);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(type === 'goal' ? 0.24 : type === 'pad' ? 0.2 : 0.15, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + (type === 'goal' ? 0.34 : 0.22));
      oscillator.type = type === 'fail' ? 'sawtooth' : 'triangle';
      oscillator.frequency.setValueAtTime(start, now);
      oscillator.frequency.exponentialRampToValueAtTime(end, now + 0.18);
      oscillator.connect(gain);
      oscillator.start(now);
      oscillator.stop(now + 0.24);

      sparkle.type = type === 'pad' ? 'square' : 'sine';
      sparkle.frequency.setValueAtTime(type === 'goal' ? 1320 : type === 'pad' ? 1480 : 980, now + 0.018);
      sparkle.frequency.exponentialRampToValueAtTime(type === 'goal' ? 1760 : 720, now + 0.16);
      sparkle.connect(gain);
      sparkle.start(now + 0.018);
      sparkle.stop(now + (type === 'goal' ? 0.32 : 0.16));
    }

    function resizeCanvas() {
      const rect = canvas.getBoundingClientRect();
      const scale = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * scale));
      canvas.height = Math.max(1, Math.floor(rect.height * scale));
      context.setTransform(scale, 0, 0, scale, 0, 0);
    }

    function loadProgress() {
      try {
        const saved = JSON.parse(window.localStorage.getItem(saveKey) || '{}');
        const clearedStages = clamp(Number(saved.clearedStages) || 0, 0, levels.length);
        const lastLevel = clamp(Number(saved.lastLevel) || 0, 0, levels.length - 1);
        const unlocked = getUnlockedCount(clearedStages);
        const selectedCharacter = clamp(Number(saved.selectedCharacter) || 0, 0, unlocked - 1);

        clearedStagesRef.current = clearedStages;
        selectedCharacterRef.current = selectedCharacter;

        return lastLevel;
      } catch {
        return 0;
      }
    }

    function saveProgress(nextLevel = levelRef.current) {
      try {
        window.localStorage.setItem(saveKey, JSON.stringify({
          clearedStages: clearedStagesRef.current,
          lastLevel: clamp(nextLevel, 0, levels.length - 1),
          selectedCharacter: selectedCharacterRef.current,
        }));
      } catch {
        // Progress saving is optional; gameplay should continue if storage is unavailable.
      }
    }

    function resetLevel(nextLevel = levelRef.current, failed = false) {
      levelRef.current = clamp(nextLevel, 0, levels.length - 1);
      playerRef.current = createPlayer(levelRef.current);
      cameraRef.current = { x: 0 };
      ropeRef.current = null;
      inputRef.current.holding = false;
      lastTimeRef.current = null;

      if (failed) {
        failCountRef.current += 1;
        playSound('fail');
      }

      saveProgress(levelRef.current);
    }

    function getNearestHook(player, level) {
      let nearest = null;
      let nearestDistance = Infinity;

      level.hooks.forEach((hook) => {
        const hookDistance = distance(player, hook);

        if (hookDistance < nearestDistance) {
          nearest = hook;
          nearestDistance = hookDistance;
        }
      });

      return nearest ? { hook: nearest, hookDistance: nearestDistance } : null;
    }

    function attachNearestHook() {
      const player = playerRef.current;
      const level = levels[levelRef.current];
      const nearest = getNearestHook(player, level);

      if (!nearest) return;

      ropeRef.current = {
        hook: nearest.hook,
        length: nearest.hookDistance,
      };
      player.vx += 120;
      playSound('hook');
    }

    function launchNextLevel() {
      if (ceremonyRef.current) return;
      const nextLevel = levelRef.current + 1;
      const clearedLevel = levelRef.current + 1;
      playSound('goal');
      clearedStagesRef.current = Math.max(clearedStagesRef.current, clearedLevel);
      const unlocked = getUnlockedCount(clearedStagesRef.current);
      if (selectedCharacterRef.current >= unlocked) {
        selectedCharacterRef.current = unlocked - 1;
      }
      saveProgress(nextLevel >= levels.length ? levels.length - 1 : nextLevel);

      ceremonyRef.current = {
        startedAt: performance.now(),
        nextLevel: nextLevel >= levels.length ? levels.length - 1 : nextLevel,
        text: clearedLevel % 5 === 0 && unlocked > 1 ? `NEW HERO: ${characters[unlocked - 1].name}` : 'STAGE CLEAR',
      };
      updateHud();
    }

    function finishCeremony() {
      if (!ceremonyRef.current) return;
      const nextLevel = ceremonyRef.current.nextLevel;
      ceremonyRef.current = null;
      resetLevel(nextLevel, false);
    }


    function updatePhysics(delta) {
      const player = playerRef.current;
      const level = levels[levelRef.current];

      if (ceremonyRef.current) {
        player.vx *= 0.94;
        player.vy *= 0.94;
        player.rotation += 0.08;
        return;
      }

      if (inputRef.current.holding && !ropeRef.current) {
        attachNearestHook();
      }

      if (player.bounceCombo > 0 && performance.now() - player.lastPadTime > 3200) {
        player.bounceCombo = 0;
        player.lastPadId = '';
      }

      player.vy += gravity * delta;

      if (ropeRef.current) {
        const rope = ropeRef.current;
        const dx = player.x - rope.hook.x;
        const dy = player.y - rope.hook.y;
        const currentLength = Math.max(1, Math.hypot(dx, dy));
        const normalX = dx / currentLength;
        const normalY = dy / currentLength;
        const radialSpeed = player.vx * normalX + player.vy * normalY;

        player.x = rope.hook.x + normalX * rope.length;
        player.y = rope.hook.y + normalY * rope.length;
        player.vx -= normalX * radialSpeed;
        player.vy -= normalY * radialSpeed;
        player.vx += (96 + level.difficulty * 34) * delta;
        player.vy *= 0.999;
      } else if (player.vx < minCruiseSpeed && player.y < 620) {
        player.vx += (minCruiseSpeed - player.vx) * 1.75 * delta;
      }

      player.x += player.vx * delta;
      player.y += player.vy * delta;
      player.rotation += player.vx * delta * 0.014;

      level.pads.forEach((pad, padIndex) => {
        if (rotatedRectHitCircle(pad, player, playerRadius)) {
          const padId = `${levelRef.current}-${padIndex}`;
          const now = performance.now();
          if (player.lastPadId === padId && now - player.lastPadTime < 420) return;

          const isCombo = player.lastPadId !== padId && now - player.lastPadTime < 1800;
          player.bounceCombo = isCombo ? Math.min(8, player.bounceCombo + 1) : 1;
          player.lastPadId = padId;
          player.lastPadTime = now;

          const surfaceAngle = (pad.angle * Math.PI) / 180;
          const normalAngle = surfaceAngle - Math.PI / 2;
          const normalX = Math.cos(normalAngle);
          const normalY = Math.sin(normalAngle);
          const tangentX = Math.cos(surfaceAngle);
          const tangentY = Math.sin(surfaceAngle);
          const tangentSpeed = player.vx * tangentX + player.vy * tangentY;
          const normalSpeed = player.vx * normalX + player.vy * normalY;
          const impactSpeed = Math.max(360, -normalSpeed);
          const comboBoost = 1 + player.bounceCombo * 0.16;
          const typeForward =
            pad.type === 'boost' ? 380 :
            pad.type === 'long' ? 520 :
            pad.type === 'wall' ? 260 :
            285;
          const typeLift =
            pad.type === 'float' ? 240 :
            pad.type === 'boost' ? 130 :
            pad.type === 'wall' ? 165 :
            155;
          const launchPower = Math.max(pad.power, impactSpeed * 1.12 + pad.power * 0.38) * comboBoost;
          const keepTangent = clamp(Math.abs(tangentSpeed) * 0.78, 230, 880 + player.bounceCombo * 90);
          player.vx = tangentX * keepTangent + normalX * launchPower + typeForward + player.bounceCombo * 82;
          player.vy = tangentY * keepTangent + normalY * launchPower - typeLift - player.bounceCombo * 66;
          player.y -= 12;
          if (!inputRef.current.holding) {
            ropeRef.current = null;
          }
          playSound('pad');
        }
      });

      if (!ropeRef.current && (player.y > 760 || player.x < -180)) {
        resetLevel(levelRef.current, true);
        return;
      }

      if (player.x >= level.finishX) {
        launchNextLevel();
      }
    }

    function drawBackground(width, height, level) {
      const camera = cameraRef.current;
      const gradient = context.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, level.theme.skyTop);
      gradient.addColorStop(0.58, level.theme.skyMid);
      gradient.addColorStop(1, '#f8fafc');
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);

      context.save();
      context.translate(-camera.x * 0.15, 0);
      context.fillStyle = 'rgba(255, 255, 255, 0.16)';
      for (let index = -2; index < 14; index += 1) {
        context.beginPath();
        context.arc(index * 220 + 80, 80 + (index % 3) * 44, 38 + (index % 2) * 18, 0, Math.PI * 2);
        context.fill();
      }
      context.restore();

      context.save();
      context.translate(-camera.x * 0.26, 0);
      for (let index = -2; index < 18; index += 1) {
        const x = index * 235;
        const towerHeight = 120 + ((index * 37) % 110);
        context.fillStyle = 'rgba(15, 23, 42, 0.17)';
        drawRoundedRect(context, x, height - towerHeight, 78, towerHeight, 8);
        context.fillStyle = 'rgba(255, 255, 255, 0.22)';
        for (let row = 0; row < 4; row += 1) {
          context.fillRect(x + 14, height - towerHeight + 18 + row * 28, 12, 10);
          context.fillRect(x + 44, height - towerHeight + 18 + row * 28, 12, 10);
        }
      }
      context.restore();

      context.strokeStyle = 'rgba(15, 23, 42, 0.08)';
      context.lineWidth = 1;
      for (let y = 80; y < height; y += 70) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
      }

      context.fillStyle = level.theme.ground;
      context.fillRect(-camera.x, 548, level.width, 20);

      context.fillStyle = level.theme.accent;
      context.fillRect(-camera.x, 546, level.width, 4);
    }

    function drawHooks(level) {
      const camera = cameraRef.current;
      const selectedHook = getNearestHook(playerRef.current, level)?.hook;
      level.hooks.forEach((hook) => {
        const x = hook.x - camera.x;
        const isSelected = selectedHook === hook;

        if (isSelected) {
          context.save();
          context.shadowColor = '#facc15';
          context.shadowBlur = 28;
          context.beginPath();
          context.arc(x, hook.y, 38, 0, Math.PI * 2);
          context.fillStyle = 'rgba(250, 204, 21, 0.3)';
          context.fill();
          context.restore();
        }

        context.beginPath();
        context.arc(x, hook.y, isSelected ? 34 : 30, 0, Math.PI * 2);
        context.fillStyle = isSelected ? 'rgba(250, 204, 21, 0.22)' : hook.attached ? 'rgba(250, 204, 21, 0.16)' : 'rgba(255, 255, 255, 0.16)';
        context.fill();

        context.beginPath();
        context.arc(x, hook.y, isSelected ? 21 : 18, 0, Math.PI * 2);
        context.fillStyle = '#ffffff';
        context.fill();
        context.lineWidth = isSelected ? 7 : 6;
        context.strokeStyle = isSelected ? '#facc15' : hook.attached ? '#facc15' : level.theme.accent;
        context.stroke();

        context.beginPath();
        context.arc(x, hook.y, isSelected ? 8 : 6, 0, Math.PI * 2);
        context.fillStyle = isSelected ? '#facc15' : '#111827';
        context.fill();
      });
    }

    function drawPads(level) {
      const camera = cameraRef.current;
      level.pads.forEach((pad) => {
        const x = pad.x - camera.x;
        const y = pad.y;
        const angle = (pad.angle * Math.PI) / 180;
        const padColor =
          pad.type === 'boost' ? '#facc15' :
          pad.type === 'float' ? '#38bdf8' :
          pad.type === 'wall' ? '#fb7185' :
          level.theme.accent;
        context.save();
        context.translate(x, y);
        context.rotate(angle);
        context.fillStyle = padColor;
        drawRoundedRect(context, -pad.width / 2, -pad.height / 2, pad.width, pad.height, 8);
        context.fillStyle = 'rgba(255, 255, 255, 0.82)';
        context.beginPath();
        context.moveTo(-pad.width / 2 + 18, pad.height / 2);
        context.lineTo(0, -pad.height / 2 - 20);
        context.lineTo(pad.width / 2 - 18, pad.height / 2);
        context.closePath();
        context.fill();
        context.fillStyle = 'rgba(15, 23, 42, 0.34)';
        context.fillRect(-pad.width / 2 + 10, pad.height / 2 + 4, pad.width - 20, 4);
        context.fillStyle = 'rgba(15, 23, 42, 0.62)';
        context.font = '900 11px Arial';
        context.textAlign = 'center';
        context.fillText(pad.type.toUpperCase(), 0, 4);
        context.restore();
      });
    }

    function drawFinish(level, height) {
      const x = level.finishX - cameraRef.current.x;
      context.fillStyle = '#111827';
      context.fillRect(x, 92, 8, height - 120);
      for (let index = 0; index < 12; index += 1) {
        context.fillStyle = index % 2 === 0 ? '#ffffff' : '#111827';
        context.fillRect(x + 8, 100 + index * 22, 34, 22);
      }
      context.fillStyle = '#111827';
      context.font = '900 14px Arial';
      context.fillText('FINISH', x - 18, 78);
    }

    function drawPlayer() {
      const player = playerRef.current;
      const camera = cameraRef.current;
      const level = levels[levelRef.current];
      const character = characters[selectedCharacterRef.current] ?? characters[0];
      const x = player.x - camera.x;
      const y = player.y;
      const angle = Math.atan2(player.vy, player.vx || 1);

      if (ropeRef.current) {
        const hookX = ropeRef.current.hook.x - camera.x;
        const hookY = ropeRef.current.hook.y;
        const tension = 0.35;
        const midX = (hookX + x) / 2;
        const midY = (hookY + y - 13) / 2;

        context.save();
        context.lineCap = 'round';
        context.beginPath();
        context.moveTo(hookX, hookY);
        context.quadraticCurveTo(midX, midY, x, y - 13);
        context.lineWidth = 8 + tension * 2;
        context.strokeStyle = 'rgba(15, 23, 42, 0.36)';
        context.stroke();

        context.beginPath();
        context.moveTo(hookX, hookY);
        context.quadraticCurveTo(midX, midY, x, y - 13);
        context.lineWidth = 4 + tension * 1.4;
        context.strokeStyle = tension > 0.45 ? '#facc15' : '#f8fafc';
        context.shadowColor = level.theme.accent;
        context.shadowBlur = 12 + tension * 18;
        context.stroke();

        context.beginPath();
        context.arc(hookX, hookY, 7 + tension * 3, 0, Math.PI * 2);
        context.fillStyle = '#facc15';
        context.fill();
        context.restore();
      }

      context.save();
      context.translate(x, y);
      context.rotate(angle * 0.18);
      context.lineCap = 'round';

      context.beginPath();
      context.moveTo(-7, 0);
      context.lineTo(-38, 18);
      context.lineTo(-5, 32);
      context.closePath();
      context.fillStyle = character.cape;
      context.fill();

      context.lineWidth = 7;
      context.strokeStyle = character.body;

      context.beginPath();
      context.moveTo(0, -4);
      context.lineTo(0, 28);
      context.moveTo(-2, 8);
      context.lineTo(-22, 20);
      context.moveTo(2, 8);
      context.lineTo(24, 14);
      context.moveTo(0, 28);
      context.lineTo(-16, 49);
      context.moveTo(0, 28);
      context.lineTo(20, 46);
      context.stroke();

      context.lineWidth = 4;
      context.strokeStyle = character.suit;
      context.beginPath();
      context.moveTo(0, -3);
      context.lineTo(0, 27);
      context.stroke();

      context.fillStyle = '#ffffff';
      context.beginPath();
      context.arc(-22, 20, 6, 0, Math.PI * 2);
      context.arc(24, 14, 6, 0, Math.PI * 2);
      context.fill();

      context.beginPath();
      context.arc(0, -22, 17, 0, Math.PI * 2);
      context.fillStyle = character.body;
      context.fill();
      context.lineWidth = 4;
      context.strokeStyle = '#f8fafc';
      context.stroke();

      context.fillStyle = character.suit;
      context.beginPath();
      context.ellipse(3, -24, 12, 6, -0.08, 0, Math.PI * 2);
      context.fill();

      context.beginPath();
      context.arc(7, -25, 2, 0, Math.PI * 2);
      context.fillStyle = '#ffffff';
      context.fill();

      context.restore();
    }

    function drawCeremony(width, height) {
      const ceremony = ceremonyRef.current;
      if (!ceremony) return;

      const elapsed = performance.now() - ceremony.startedAt;
      const progress = clamp(elapsed / ceremonyDuration, 0, 1);
      const pulse = Math.sin(progress * Math.PI);

      context.save();
      context.fillStyle = `rgba(15, 23, 42, ${0.18 + pulse * 0.22})`;
      context.fillRect(0, 0, width, height);

      context.translate(width / 2, height / 2);
      context.scale(1 + pulse * 0.22, 1 + pulse * 0.22);
      context.fillStyle = '#facc15';
      context.font = '900 54px Arial';
      context.textAlign = 'center';
      context.shadowColor = '#facc15';
      context.shadowBlur = 26;
      context.fillText(ceremony.text, 0, -18);

      context.shadowBlur = 0;
      context.fillStyle = '#ffffff';
      context.font = '900 18px Arial';
      context.fillText('Perfect swing!', 0, 28);

      for (let index = 0; index < 18; index += 1) {
        const angle = index * 0.9 + progress * 8;
        const radius = 90 + pulse * 130 + (index % 3) * 18;
        context.beginPath();
        context.arc(Math.cos(angle) * radius, Math.sin(angle) * radius, 5 + (index % 2) * 3, 0, Math.PI * 2);
        context.fillStyle = index % 2 === 0 ? '#22d3ee' : '#facc15';
        context.fill();
      }

      context.restore();
    }

    function draw() {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const level = levels[levelRef.current];
      const ceremony = ceremonyRef.current;
      const ceremonyProgress = ceremony ? clamp((performance.now() - ceremony.startedAt) / ceremonyDuration, 0, 1) : 0;
      const zoom = 1 + Math.sin(ceremonyProgress * Math.PI) * 0.32;

      drawBackground(width, height, level);
      context.save();
      if (ceremony) {
        const playerScreenX = playerRef.current.x - cameraRef.current.x;
        const playerScreenY = playerRef.current.y + Math.max(0, (height - 620) / 2);
        context.translate(width / 2, height / 2);
        context.scale(zoom, zoom);
        context.translate(-playerScreenX, -playerScreenY);
      }
      context.translate(0, Math.max(0, (height - 620) / 2));
      drawHooks(level);
      drawPads(level);
      drawFinish(level, height);
      drawPlayer();
      context.restore();
      drawCeremony(width, height);
    }

    function updateHud() {
      const level = levels[levelRef.current];
      const player = playerRef.current;
      setHud({
        level: levelRef.current,
        progress: clamp(Math.round((player.x / level.finishX) * 100), 0, 100),
        fails: failCountRef.current,
        hooked: Boolean(ropeRef.current),
        speed: Math.round(Math.hypot(player.vx, player.vy)),
        combo: player.bounceCombo,
        unlocked: getUnlockedCount(clearedStagesRef.current),
        character: characters[selectedCharacterRef.current]?.name ?? characters[0].name,
        ceremony: ceremonyRef.current?.text ?? '',
        cleared: clearedStagesRef.current,
      });
    }

    function loop(time) {
      if (lastTimeRef.current == null) {
        lastTimeRef.current = time;
      }

      const delta = clamp((time - lastTimeRef.current) / 1000, 0.001, 0.033);
      lastTimeRef.current = time;
      const level = levels[levelRef.current];
      const player = playerRef.current;
      const width = canvas.clientWidth;

      updatePhysics(delta);
      if (ceremonyRef.current && time - ceremonyRef.current.startedAt > ceremonyDuration) {
        finishCeremony();
      }
      cameraRef.current.x = clamp(player.x - width * 0.34, 0, Math.max(0, level.width - width));
      draw();

      if (Math.floor(time / 120) !== Math.floor((time - delta * 1000) / 120)) {
        updateHud();
      }

      frameRef.current = requestAnimationFrame(loop);
    }

    function handlePointerDown(event) {
      if (event.button != null && event.button !== 0) return;
      canvas.setPointerCapture?.(event.pointerId);
      inputRef.current.holding = true;
      getAudioContext();
      attachNearestHook();
    }

    function handlePointerUp(event) {
      canvas.releasePointerCapture?.(event.pointerId);
      inputRef.current.holding = false;
      ropeRef.current = null;
    }

    function handleKeyDown(event) {
      if (event.key.toLowerCase() === 'r') {
        resetLevel(levelRef.current, false);
      }

      if (['1', '2', '3', '4', '5'].includes(event.key)) {
        resetLevel(Number(event.key) - 1, false);
      }

      if (['q', 'w', 'e', 'a', 's', 'd'].includes(event.key.toLowerCase())) {
        const keyMap = { q: 0, w: 1, e: 2, a: 3, s: 4, d: 5 };
        const nextCharacter = keyMap[event.key.toLowerCase()];
        const unlocked = getUnlockedCount(clearedStagesRef.current);
        if (nextCharacter < unlocked) {
          selectedCharacterRef.current = nextCharacter;
          saveProgress(levelRef.current);
        }
      }
    }

    resizeCanvas();
    resetLevel(loadProgress(), false);
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('keydown', handleKeyDown);
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerUp);
    frameRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('keydown', handleKeyDown);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointercancel', handlePointerUp);
      cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <section className="swingPage">
      <div className="swingShell">
        <header className="swingHud">
          <div>
            <span>Game Lab</span>
            <h1>Swing Hook</h1>
          </div>
          <div className="hudStats">
            <strong>{levels[hud.level].name}</strong>
            <span>{hud.level + 1}/{levels.length}</span>
            <span>{levels[hud.level].themeName}</span>
            <span>{hud.progress}%</span>
            <span>Fails {hud.fails}</span>
            <span>Combo x{hud.combo}</span>
            <span>{hud.character}</span>
            <span>Heroes {hud.unlocked}/{characters.length}</span>
            <span>Cleared {hud.cleared}</span>
            <span>{hud.hooked ? 'Hooked' : 'Flying'}</span>
            <span>{hud.speed}</span>
          </div>
        </header>

        <div className="canvasFrame">
          <canvas ref={canvasRef} className="swingCanvas" />
          <details className="heroDock">
            <summary>
              <i style={{ background: characters[selectedCharacterRef.current]?.suit ?? characters[0].suit }} />
              <span>{hud.character}</span>
            </summary>
            <div>
            {characters.map((character, index) => {
              const isUnlocked = index < hud.unlocked;
              const isActive = character.name === hud.character;

              return (
                <button
                  key={character.name}
                  type="button"
                  className={`${isActive ? 'active' : ''} ${isUnlocked ? '' : 'locked'}`}
                  disabled={!isUnlocked}
                  onClick={() => {
                    if (isUnlocked) {
                      selectedCharacterRef.current = index;
                      try {
                        window.localStorage.setItem(saveKey, JSON.stringify({
                          clearedStages: clearedStagesRef.current,
                          lastLevel: levelRef.current,
                          selectedCharacter: index,
                        }));
                      } catch {
                        // Character selection still works even if progress cannot be saved.
                      }
                      setHud((current) => ({ ...current, character: character.name }));
                    }
                  }}
                >
                  <i style={{ background: character.suit }} />
                  <span>{character.name}</span>
                  <em>{isUnlocked ? 'Ready' : character.unlock}</em>
                </button>
              );
            })}
            </div>
          </details>
          <details className="stageRail" aria-label="Stage select">
            <summary>Stages {hud.level + 1}/{levels.length}</summary>
            <div>
            {levels.map((level, index) => {
              const isAvailable = index <= Math.min(hud.cleared, levels.length - 1);
              const isActive = index === hud.level;

              return (
                <button
                  key={level.name}
                  type="button"
                  className={isActive ? 'active' : ''}
                  disabled={!isAvailable}
                  onClick={() => {
                    if (isAvailable) {
                      levelRef.current = index;
                      ceremonyRef.current = null;
                      playerRef.current = createPlayer(index);
                      cameraRef.current = { x: 0 };
                      ropeRef.current = null;
                      inputRef.current.holding = false;
                      lastTimeRef.current = null;
                      try {
                        window.localStorage.setItem(saveKey, JSON.stringify({
                          clearedStages: clearedStagesRef.current,
                          lastLevel: index,
                          selectedCharacter: selectedCharacterRef.current,
                        }));
                      } catch {
                        // Stage selection still works even if progress cannot be saved.
                      }
                      setHud((current) => ({ ...current, level: index, progress: 0 }));
                    }
                  }}
                >
                  {index + 1}
                </button>
              );
            })}
            </div>
          </details>
          <div className="helpPanel">
            <strong>Hold</strong>
            <span>Hold to grab nearest hook. Release to fly.</span>
            <em>Our pads stay: boost, float, long, wall.</em>
          </div>
        </div>
      </div>

      <style jsx>{`
        .swingPage {
          min-height: calc(100vh - var(--site-nav-height));
          padding: 18px;
          background:
            radial-gradient(circle at 18% 16%, rgba(34, 211, 238, 0.18), transparent 28%),
            radial-gradient(circle at 88% 12%, rgba(250, 204, 21, 0.18), transparent 24%),
            linear-gradient(rgba(15, 23, 42, 0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(15, 23, 42, 0.08) 1px, transparent 1px),
            #0f172a;
          background-size: 34px 34px, 34px 34px, auto;
          color: #f8fafc;
        }

        .swingShell {
          width: min(1180px, 100%);
          margin: 0 auto;
          display: grid;
          gap: 12px;
        }

        .swingHud {
          min-height: 82px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 16px 18px;
          border: 1px solid rgba(15, 23, 42, 0.12);
          border-radius: 8px;
          background: rgba(15, 23, 42, 0.86);
          box-shadow: 0 18px 36px rgba(0, 0, 0, 0.24);
          backdrop-filter: blur(14px);
        }

        .swingHud span {
          color: #2563eb;
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .swingHud h1 {
          margin: 4px 0 0;
          color: #f8fafc;
          font-size: 36px;
          line-height: 1;
        }

        .hudStats {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 8px;
        }

        .hudStats strong,
        .hudStats span {
          min-height: 34px;
          display: inline-flex;
          align-items: center;
          padding: 0 11px;
          border-radius: 8px;
          background: #111827;
          color: #ffffff;
          font-size: 12px;
          font-weight: 900;
          text-transform: none;
        }

        .hudStats span {
          background: #dbeafe;
          color: #1e3a8a;
        }

        .canvasFrame {
          height: min(640px, calc(100vh - var(--site-nav-height) - 132px));
          min-height: 480px;
          position: relative;
          overflow: hidden;
          border: 4px solid #111827;
          border-radius: 8px;
          background: #dbeafe;
          box-shadow: 0 22px 52px rgba(0, 0, 0, 0.36);
        }

        .swingCanvas {
          width: 100%;
          height: 100%;
          display: block;
          touch-action: none;
          cursor: crosshair;
        }

        .heroDock {
          position: absolute;
          top: 12px;
          left: 12px;
          max-width: min(620px, calc(100% - 24px));
          color: #ffffff;
          pointer-events: auto;
        }

        .heroDock summary,
        .stageRail summary {
          min-height: 38px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0 12px;
          border: 1px solid rgba(255, 255, 255, 0.24);
          border-radius: 8px;
          background: rgba(15, 23, 42, 0.78);
          color: #ffffff;
          font-size: 12px;
          font-weight: 900;
          list-style: none;
          cursor: pointer;
          box-shadow: 0 12px 24px rgba(15, 23, 42, 0.18);
          backdrop-filter: blur(10px);
        }

        .heroDock summary::-webkit-details-marker,
        .stageRail summary::-webkit-details-marker {
          display: none;
        }

        .heroDock summary::after,
        .stageRail summary::after {
          content: '▾';
          color: #facc15;
          font-size: 11px;
        }

        .heroDock[open] summary::after,
        .stageRail[open] summary::after {
          content: '▴';
        }

        .heroDock > div {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          max-width: min(620px, calc(100vw - 60px));
          margin-top: 8px;
        }

        .heroDock button {
          min-height: 42px;
          display: grid;
          grid-template-columns: 18px minmax(0, 1fr);
          grid-template-rows: auto auto;
          align-items: center;
          column-gap: 7px;
          padding: 6px 9px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          background: rgba(15, 23, 42, 0.7);
          color: #ffffff;
          font: inherit;
          font-size: 11px;
          font-weight: 900;
          text-align: left;
          cursor: pointer;
          backdrop-filter: blur(10px);
        }

        .heroDock button.active {
          border-color: #facc15;
          box-shadow: 0 0 0 3px rgba(250, 204, 21, 0.22);
        }

        .heroDock button.locked {
          opacity: 0.46;
          cursor: not-allowed;
        }

        .heroDock i {
          width: 18px;
          height: 18px;
          grid-row: 1 / span 2;
          border: 2px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 12px rgba(255, 255, 255, 0.3);
        }

        .heroDock span,
        .heroDock em {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .heroDock em {
          color: #cbd5e1;
          font-size: 9px;
          font-style: normal;
        }

        .stageRail {
          position: absolute;
          right: 12px;
          bottom: 12px;
          width: min(360px, calc(100% - 24px));
          color: #ffffff;
          pointer-events: auto;
          text-align: right;
        }

        .stageRail > div {
          max-height: 152px;
          display: grid;
          grid-template-columns: repeat(8, minmax(30px, 1fr));
          gap: 5px;
          overflow-y: auto;
          margin-top: 8px;
          padding: 8px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 8px;
          background: rgba(15, 23, 42, 0.68);
          box-shadow: 0 12px 24px rgba(15, 23, 42, 0.2);
          backdrop-filter: blur(10px);
        }

        .stageRail button {
          min-width: 0;
          min-height: 32px;
          border: 0;
          border-radius: 7px;
          background: rgba(255, 255, 255, 0.18);
          color: #ffffff;
          font-weight: 900;
          cursor: pointer;
        }

        .stageRail button.active {
          background: #facc15;
          color: #111827;
        }

        .stageRail button:disabled {
          opacity: 0.28;
          cursor: not-allowed;
        }

        .helpPanel {
          position: absolute;
          left: 14px;
          bottom: 68px;
          display: grid;
          gap: 4px;
          padding: 12px 14px;
          border: 1px solid rgba(255, 255, 255, 0.26);
          border-radius: 8px;
          background: rgba(15, 23, 42, 0.78);
          color: #ffffff;
          box-shadow: 0 14px 30px rgba(15, 23, 42, 0.22);
          backdrop-filter: blur(10px);
          pointer-events: none;
        }

        .helpPanel strong {
          font-size: 17px;
        }

        .helpPanel span,
        .helpPanel em {
          color: #dbeafe;
          font-size: 12px;
          font-style: normal;
          font-weight: 800;
        }

        @media (max-width: 760px) {
          .swingPage {
            padding: 12px;
          }

          .swingHud {
            display: grid;
            padding: 14px;
          }

          .swingHud h1 {
            font-size: 30px;
          }

          .hudStats {
            justify-content: start;
          }

          .canvasFrame {
            height: calc(100vh - var(--site-nav-height) - 170px);
            min-height: 430px;
          }

          .helpPanel {
            right: 10px;
            left: 10px;
            bottom: 62px;
          }

          .heroDock {
            right: 10px;
            left: 10px;
            max-width: none;
          }

          .heroDock button {
            flex: 1 1 96px;
          }
        }
      `}</style>
    </section>
  );
}
