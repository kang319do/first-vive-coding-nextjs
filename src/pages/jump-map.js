import { useEffect, useMemo, useRef, useState } from 'react';

const playerSize = { width: 28, height: 38 };
const gravity = 1850;
const moveSpeed = 360;
const airMoveSpeed = 295;
const jumpPower = 720;
const wallJumpX = 670;
const wallJumpY = 780;
const saveKey = 'jump-map-progress-v1';
const crumbleDelay = 520;

const difficultyBands = [
  { name: 'Tutorial', label: '튜토리얼', color: '#38bdf8', from: 0, to: 9, width: 2300, gap: 175, hazards: 0.18 },
  { name: 'Easy', label: '쉬움', color: '#22c55e', from: 10, to: 19, width: 3000, gap: 205, hazards: 0.26 },
  { name: 'Normal', label: '보통', color: '#facc15', from: 20, to: 29, width: 3800, gap: 230, hazards: 0.36 },
  { name: 'Hard', label: '어려움', color: '#fb923c', from: 30, to: 39, width: 4700, gap: 260, hazards: 0.48 },
  { name: 'Extreme', label: '극악', color: '#ef4444', from: 40, to: 49, width: 5900, gap: 295, hazards: 0.62 },
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

function makeStage(index) {
  const band = getBand(index);
  const local = index - band.from;
  const difficulty = index / 49;
  const width = Math.round(band.width + local * 145 + difficulty * 800);
  const floorY = 520;
  const platforms = [
    { x: 0, y: floorY, width: 520, height: 40, kind: 'start' },
  ];
  const walls = [];
  const hazards = [];
  const items = [];
  const checkpoints = [];

  let x = 560;
  let y = floorY - 84;
  let step = 0;

  while (x < width - 360) {
    const wave = Math.sin(index * 0.9 + step * 1.35);
    const rising = Math.sin(index * 0.4 + step * 0.7);
    const platformWidth = clamp(140 - difficulty * 62 - (step % 3) * 8, 56, 150);
    y = clamp(y + wave * 78 - 20 + rising * 26, 130, floorY - 72);
    const platformKind =
      index > 18 && step % 7 === 4 ? 'ice' :
      index > 11 && step % 6 === 2 ? 'crumble' :
      index > 6 && step % 5 === 1 ? 'spring' :
      step % 5 === 0 ? 'thin' :
      'normal';
    platforms.push({
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(platformWidth),
      height: 26,
      kind: platformKind,
      id: `${index}-platform-${step}`,
    });

    if ((step + index) % 3 === 0) {
      items.push({
        x: Math.round(x + platformWidth / 2 - 10),
        y: Math.round(y - 44),
        width: 20,
        height: 20,
        id: `${index}-${step}`,
      });
    }

    if (index > 2 && (step + index) % 4 === 1) {
      const groundSpikeWidth = Math.round(clamp(58 + noise01(index, step, 1) * (86 + difficulty * 34), 52, 128));
      hazards.push({
        x: Math.round(x - band.gap * 0.42),
        y: floorY + 3,
        width: groundSpikeWidth,
        height: Math.round(20 + noise01(index, step, 2) * 16),
        kind: 'spike',
      });
    }

    if (index > 3 && (step + index) % 5 === 0) {
      const topSpikeWidth = Math.round(clamp(platformWidth * (0.34 + noise01(index, step, 3) * 0.34), 28, platformWidth - 34));
      const topSpikeOffset = Math.round(12 + noise01(index, step, 4) * Math.max(0, platformWidth - topSpikeWidth - 24));
      hazards.push({
        x: Math.round(x + topSpikeOffset),
        y: Math.round(y - (16 + noise01(index, step, 5) * 14)),
        width: topSpikeWidth,
        height: Math.round(16 + noise01(index, step, 6) * 14),
        kind: 'topSpike',
      });
    }

    if (index > 4 && step % 4 === 2) {
      const wallHeight = Math.round(145 + difficulty * 95);
      walls.push({
        x: Math.round(x + platformWidth + 76),
        y: Math.round(y - wallHeight + 28),
        width: 34,
        height: wallHeight,
        kind: 'wall',
      });
    }

    if (index > 16 && (step + local) % 5 === 3) {
      hazards.push({
        x: Math.round(x + platformWidth + 34),
        y: Math.round(y - 18),
        width: Math.round(clamp(44 + noise01(index, step, 7) * (62 + difficulty * 28), 40, 106)),
        height: Math.round(16 + noise01(index, step, 8) * 18),
        kind: 'blade',
      });
    }

    if (index > 23 && step % 6 === 4) {
      hazards.push({
        x: Math.round(x + platformWidth + 92),
        y: Math.round(y - 124),
        width: Math.round(12 + noise01(index, step, 9) * 14),
        height: Math.round(clamp(70 + noise01(index, step, 10) * (105 + difficulty * 35), 68, 178)),
        kind: 'laser',
      });
    }

    if (index > 8 && step % 8 === 5) {
      checkpoints.push({
        x: Math.round(x + platformWidth / 2 - 16),
        y: Math.round(y - 62),
        width: 32,
        height: 62,
        id: `${index}-checkpoint-${step}`,
      });
    }

    const forcedGap = (step + 1) % 5 === 0;
    const randomGap = index > 7 && Math.abs(stageNoise(index, step) % 1) > 0.82;
    const gapSize = forcedGap
      ? 178 + difficulty * 120
      : randomGap
        ? 112 + difficulty * 88
        : 8 + Math.abs(Math.sin(index + step)) * 18;

    if ((forcedGap || randomGap) && index > 1) {
      const wallHeight = Math.round(155 + difficulty * 120);
      const wallBaseY = Math.round(clamp(y + 52, 240, floorY + 24));
      const firstWallX = Math.round(x + platformWidth + gapSize * 0.26);
      walls.push({
        x: firstWallX,
        y: wallBaseY - wallHeight,
        width: 34,
        height: wallHeight,
        kind: forcedGap ? 'wallJump' : 'wall',
      });

      if (forcedGap || index > 18) {
        walls.push({
          x: Math.round(x + platformWidth + gapSize * 0.72),
          y: wallBaseY - wallHeight - 26,
          width: 34,
          height: wallHeight + 26,
          kind: 'wallJump',
        });
      }
    }

    x += platformWidth + gapSize;
    step += 1;
  }

  platforms.push({ x: width - 300, y: floorY - 115, width: 210, height: 30, kind: 'goalPad' });
  items.push({ x: width - 230, y: floorY - 166, width: 24, height: 24, id: `${index}-goal` });

  return {
    index,
    name: `Stage ${index + 1}`,
    band,
    width,
    floorY,
    start: { x: 90, y: floorY - playerSize.height - 1 },
    goal: { x: width - 145, y: floorY - 178, width: 46, height: 116 },
    platforms,
    walls,
    hazards,
    items,
    checkpoints,
  };
}

const stages = Array.from({ length: 50 }, (_, index) => makeStage(index));

function createPlayer(stageIndex) {
  const stage = stages[stageIndex];
  return {
    x: stage.start.x,
    y: stage.start.y,
    vx: 0,
    vy: 0,
    grounded: false,
    wallDir: 0,
    wallSliding: false,
  };
}

export default function JumpMapPage() {
  const canvasRef = useRef(null);
  const frameRef = useRef(null);
  const lastTimeRef = useRef(null);
  const inputRef = useRef({ left: false, right: false, jump: false, jumpPressed: false });
  const playerRef = useRef(createPlayer(0));
  const stageRef = useRef(0);
  const cameraRef = useRef({ x: 0, y: 0 });
  const collectedRef = useRef(new Set());
  const brokenRef = useRef(new Map());
  const checkpointRef = useRef(null);
  const clearedRef = useRef(0);
  const deathsRef = useRef(0);
  const [hud, setHud] = useState({
    stage: 0,
    cleared: 0,
    items: 0,
    totalItems: stages[0].items.length,
    deaths: 0,
    status: 'Ready',
  });

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
        clearedRef.current = clamp(Number(saved.cleared) || 0, 0, stages.length - 1);
        return clamp(Number(saved.stage) || 0, 0, stages.length - 1);
      } catch {
        return 0;
      }
    }

    function saveProgress(stageIndex = stageRef.current) {
      try {
        window.localStorage.setItem(saveKey, JSON.stringify({
          cleared: clearedRef.current,
          stage: clamp(stageIndex, 0, stages.length - 1),
        }));
      } catch {
        // Saving is optional; the game should still play without localStorage.
      }
    }

    function resizeCanvas() {
      const rect = canvas.getBoundingClientRect();
      const scale = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * scale));
      canvas.height = Math.max(1, Math.floor(rect.height * scale));
      context.setTransform(scale, 0, 0, scale, 0, 0);
    }

    function resetStage(nextStage = stageRef.current, died = false) {
      stageRef.current = clamp(nextStage, 0, stages.length - 1);
      playerRef.current = createPlayer(stageRef.current);
      if (died && checkpointRef.current && checkpointRef.current.stage === stageRef.current) {
        playerRef.current.x = checkpointRef.current.x;
        playerRef.current.y = checkpointRef.current.y;
      } else {
        checkpointRef.current = null;
        collectedRef.current = new Set();
        brokenRef.current = new Map();
      }
      cameraRef.current = { x: 0, y: 0 };
      lastTimeRef.current = null;
      if (died) deathsRef.current += 1;
      saveProgress(stageRef.current);
      updateHud(died ? 'Retry' : 'Ready');
    }

    function nextStage() {
      const cleared = stageRef.current + 1;
      clearedRef.current = Math.max(clearedRef.current, cleared);
      const next = clamp(stageRef.current + 1, 0, stages.length - 1);
      saveProgress(next);
      resetStage(next, false);
      updateHud(cleared >= stages.length ? 'All Clear' : 'Clear');
    }

    function collideAxis(player, solids, axis, now) {
      player.grounded = axis === 'y' ? player.grounded : false;
      for (const solid of solids) {
        if (!intersects({ ...player, width: playerSize.width, height: playerSize.height }, solid)) continue;

        if (axis === 'x') {
          if (player.vx > 0) {
            player.x = solid.x - playerSize.width;
            player.wallDir = 1;
          } else if (player.vx < 0) {
            player.x = solid.x + solid.width;
            player.wallDir = -1;
          }
          player.vx = 0;
        } else if (player.vy > 0) {
          player.y = solid.y - playerSize.height;
          player.vy = solid.kind === 'spring' ? -940 : 0;
          player.grounded = true;
          player.wallSliding = false;
          if (solid.kind === 'crumble' && !brokenRef.current.has(solid.id)) {
            brokenRef.current.set(solid.id, now + crumbleDelay);
          }
        } else if (player.vy < 0) {
          player.y = solid.y + solid.height;
          player.vy = 0;
        }
      }
    }

    function update(delta) {
      const stage = stages[stageRef.current];
      const player = playerRef.current;
      const now = performance.now();
      const solids = [
        ...stage.platforms.filter((platform) => {
          const breakAt = brokenRef.current.get(platform.id);
          return !breakAt || now < breakAt;
        }),
        ...stage.walls,
      ];
      const input = inputRef.current;
      const wasGrounded = player.grounded;
      const standingOnIce = solids.some((solid) => solid.kind === 'ice' && intersects(
        { x: player.x, y: player.y + 2, width: playerSize.width, height: playerSize.height },
        solid
      ));

      player.grounded = false;
      player.wallDir = 0;
      player.wallSliding = false;

      const targetSpeed =
        input.left ? -(wasGrounded ? moveSpeed : airMoveSpeed) :
        input.right ? (wasGrounded ? moveSpeed : airMoveSpeed) :
        0;
      const accel = standingOnIce ? 4 : wasGrounded ? 18 : 9;
      player.vx += (targetSpeed - player.vx) * clamp(accel * delta, 0, 1);
      player.vy += gravity * delta;

      player.x += player.vx * delta;
      collideAxis(player, solids, 'x', now);

      const pushingWall = (player.wallDir === 1 && input.right) || (player.wallDir === -1 && input.left);
      if (!player.grounded && pushingWall && player.vy > 0) {
        player.wallSliding = true;
        player.vy = Math.min(player.vy, 165);
      }

      if (input.jumpPressed) {
        if (wasGrounded) {
          player.vy = -jumpPower;
          player.grounded = false;
        } else if (player.wallDir !== 0) {
          player.vx = -player.wallDir * wallJumpX;
          player.vy = -wallJumpY;
          player.wallSliding = false;
        }
        input.jumpPressed = false;
      }

      player.y += player.vy * delta;
      collideAxis(player, solids, 'y', now);

      const playerBox = { ...player, width: playerSize.width, height: playerSize.height };
      stage.items.forEach((item) => {
        if (!collectedRef.current.has(item.id) && intersects(playerBox, item)) {
          collectedRef.current.add(item.id);
        }
      });

      stage.checkpoints.forEach((checkpoint) => {
        if (intersects(playerBox, checkpoint)) {
          checkpointRef.current = {
            stage: stageRef.current,
            x: checkpoint.x,
            y: checkpoint.y - playerSize.height,
            id: checkpoint.id,
          };
        }
      });

      if (stage.hazards.some((hazard) => intersects(playerBox, hazard)) || player.y > stage.floorY + 240) {
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
      camera.x = clamp(player.x - width * 0.38, 0, Math.max(0, stage.width - width));
      camera.y = clamp(player.y - height * 0.48, -120, 220);

      const sky = context.createLinearGradient(0, 0, 0, height);
      sky.addColorStop(0, '#0f172a');
      sky.addColorStop(0.55, '#1d4ed8');
      sky.addColorStop(1, '#dbeafe');
      context.fillStyle = sky;
      context.fillRect(0, 0, width, height);

      context.save();
      context.translate(-camera.x * 0.18, -camera.y * 0.08);
      context.fillStyle = 'rgba(255,255,255,0.12)';
      for (let i = -2; i < 18; i += 1) {
        context.beginPath();
        context.arc(i * 180 + 80, 86 + (i % 3) * 38, 32 + (i % 2) * 16, 0, Math.PI * 2);
        context.fill();
      }
      context.restore();

      context.fillStyle = 'rgba(15, 23, 42, 0.2)';
      for (let x = -camera.x % 80; x < width; x += 80) {
        context.fillRect(x, 0, 1, height);
      }

      stage.platforms.forEach((platform) => {
        const breakAt = brokenRef.current.get(platform.id);
        if (breakAt && performance.now() >= breakAt) return;
        const color =
          platform.kind === 'goalPad' ? '#facc15' :
          platform.kind === 'spring' ? '#22c55e' :
          platform.kind === 'crumble' ? '#fb923c' :
          platform.kind === 'ice' ? '#bfdbfe' :
          platform.kind === 'thin' ? '#67e8f9' :
          '#f8fafc';
        drawRect(platform, color, camera, 7);
        context.fillStyle = 'rgba(15,23,42,0.22)';
        context.fillRect(platform.x - camera.x, platform.y - camera.y + platform.height - 5, platform.width, 5);
        if (platform.kind === 'spring') {
          context.fillStyle = '#ffffff';
          context.fillRect(platform.x - camera.x + 12, platform.y - camera.y + 7, platform.width - 24, 5);
        }
        if (platform.kind === 'crumble') {
          context.fillStyle = 'rgba(15,23,42,0.34)';
          for (let line = 16; line < platform.width; line += 24) {
            context.fillRect(platform.x - camera.x + line, platform.y - camera.y + 4, 3, platform.height - 8);
          }
        }
        if (platform.kind === 'ice') {
          context.strokeStyle = 'rgba(255,255,255,0.85)';
          context.lineWidth = 2;
          context.beginPath();
          context.moveTo(platform.x - camera.x + 10, platform.y - camera.y + 8);
          context.lineTo(platform.x - camera.x + platform.width - 12, platform.y - camera.y + 8);
          context.stroke();
        }
      });

      stage.walls.forEach((wall) => {
        drawRect(wall, wall.kind === 'wallJump' ? '#a78bfa' : '#94a3b8', camera, 6);
        context.fillStyle = 'rgba(15,23,42,0.24)';
        for (let y = wall.y - camera.y + 8; y < wall.y - camera.y + wall.height; y += 22) {
          context.fillRect(wall.x - camera.x + 6, y, wall.width - 12, 3);
        }
        if (wall.kind === 'wallJump') {
          context.fillStyle = 'rgba(255,255,255,0.86)';
          context.font = '900 10px Arial';
          context.textAlign = 'center';
          context.fillText('WJ', wall.x - camera.x + wall.width / 2, wall.y - camera.y + 18);
        }
      });

      stage.hazards.forEach((hazard) => {
        const hx = hazard.x - camera.x;
        const hy = hazard.y - camera.y;
        if (hazard.kind === 'laser') {
          context.fillStyle = 'rgba(239, 68, 68, 0.22)';
          context.fillRect(hx - 10, hy, hazard.width + 20, hazard.height);
          context.fillStyle = '#ef4444';
          context.fillRect(hx, hy, hazard.width, hazard.height);
          context.fillStyle = '#fee2e2';
          context.fillRect(hx + 5, hy, 4, hazard.height);
          return;
        }

        drawRect(hazard, hazard.kind === 'topSpike' ? '#b91c1c' : '#ef4444', camera, 4);
        context.fillStyle = '#fee2e2';
        const count = Math.max(3, Math.floor(hazard.width / 20));
        for (let i = 0; i < count; i += 1) {
          const x = hx + (i / count) * hazard.width;
          context.beginPath();
          if (hazard.kind === 'topSpike') {
            context.moveTo(x, hy + hazard.height);
            context.lineTo(x + hazard.width / count / 2, hy);
            context.lineTo(x + hazard.width / count, hy + hazard.height);
          } else {
            context.moveTo(x, hy + hazard.height);
            context.lineTo(x + hazard.width / count / 2, hy);
            context.lineTo(x + hazard.width / count, hy + hazard.height);
          }
          context.closePath();
          context.fill();
        }
      });

      stage.checkpoints.forEach((checkpoint) => {
        const active = checkpointRef.current?.id === checkpoint.id;
        const x = checkpoint.x - camera.x;
        const y = checkpoint.y - camera.y;
        context.fillStyle = active ? '#22c55e' : 'rgba(34, 197, 94, 0.32)';
        context.fillRect(x, y, 8, checkpoint.height);
        context.fillStyle = active ? '#bbf7d0' : '#ffffff';
        context.beginPath();
        context.moveTo(x + 8, y + 8);
        context.lineTo(x + checkpoint.width, y + 18);
        context.lineTo(x + 8, y + 30);
        context.closePath();
        context.fill();
      });

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

      drawRect(stage.goal, 'rgba(34, 197, 94, 0.28)', camera, 6);
      context.fillStyle = '#22c55e';
      context.fillRect(stage.goal.x - camera.x, stage.goal.y - camera.y, 8, stage.goal.height);
      context.fillStyle = '#ffffff';
      context.fillRect(stage.goal.x - camera.x + 8, stage.goal.y - camera.y + 8, 32, 20);

      const px = player.x - camera.x;
      const py = player.y - camera.y;
      context.fillStyle = player.wallSliding ? '#facc15' : stage.band.color;
      context.beginPath();
      context.roundRect(px, py, playerSize.width, playerSize.height, 8);
      context.fill();
      context.fillStyle = '#0f172a';
      context.fillRect(px + 7, py + 9, 4, 4);
      context.fillRect(px + 18, py + 9, 4, 4);
      context.fillStyle = '#ffffff';
      context.fillRect(px + 8, py + 25, 12, 4);

      context.fillStyle = 'rgba(15,23,42,0.78)';
      context.fillRect(14, 14, 260, 82);
      context.fillStyle = stage.band.color;
      context.font = '900 14px Arial';
      context.fillText(`${stage.name} · ${stage.band.label}`, 28, 40);
      context.fillStyle = '#ffffff';
      context.font = '800 12px Arial';
      context.fillText(`Items ${collectedRef.current.size}/${stage.items.length}`, 28, 62);
      context.fillText(player.wallSliding ? 'Wall Slide' : player.grounded ? 'Ground' : 'Air', 28, 82);
    }

    function updateHud(status = hud.status) {
      const stage = stages[stageRef.current];
      setHud({
        stage: stageRef.current,
        cleared: clearedRef.current,
        items: collectedRef.current.size,
        totalItems: stage.items.length,
        deaths: deathsRef.current,
        status,
      });
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
      const key = event.key.toLowerCase();
      if (['arrowleft', 'a'].includes(key)) inputRef.current.left = pressed;
      if (['arrowright', 'd'].includes(key)) inputRef.current.right = pressed;
      if (['arrowup', 'w', ' '].includes(key)) {
        if (pressed && !inputRef.current.jump) inputRef.current.jumpPressed = true;
        inputRef.current.jump = pressed;
      }
      if (pressed && key === 'r') resetStage(stageRef.current, false);
      if (pressed && /^[1-5]$/.test(key)) resetStage((Number(key) - 1) * 10, false);
    }

    function handleKeyDown(event) {
      setKey(event, true);
    }

    function handleKeyUp(event) {
      setKey(event, false);
    }

    function handlePointerDown() {
      inputRef.current.jumpPressed = true;
      inputRef.current.jump = true;
    }

    function handlePointerUp() {
      inputRef.current.jump = false;
    }

    resizeCanvas();
    resetStage(loadProgress(), false);
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerUp);
    frameRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointercancel', handlePointerUp);
      cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <section className="jumpPage">
      <div className="jumpShell">
        <header className="jumpHud">
          <div>
            <span>Game Lab</span>
            <h1>Jump Map</h1>
          </div>
          <div className="stats">
            <strong>{stages[hud.stage].name}</strong>
            <span>{stages[hud.stage].band.label}</span>
            <span>{hud.items}/{hud.totalItems}</span>
            <span>Deaths {hud.deaths}</span>
            <span>{hud.status}</span>
          </div>
        </header>

        <div className="gameFrame">
          <canvas ref={canvasRef} className="gameCanvas" />
          <div className="guide">
            <strong>Move · Jump · Wall Jump</strong>
            <span>A/D 또는 방향키 이동, W/Space 점프, 벽을 밀면서 떨어지면 미끄러짐</span>
          </div>
          <details className="stagePicker">
            <summary>Stages {hud.stage + 1}/50</summary>
            <div>
              {stageButtons.map((stage) => {
                const isUnlocked = stage.index <= Math.min(hud.cleared, stages.length - 1);
                return (
                  <button
                    key={stage.index}
                    type="button"
                    disabled={!isUnlocked}
                    className={stage.index === hud.stage ? 'active' : ''}
                    title={stage.difficulty}
                    onClick={() => {
                      stageRef.current = stage.index;
                      playerRef.current = createPlayer(stage.index);
                      collectedRef.current = new Set();
                      lastTimeRef.current = null;
                      setHud((current) => ({
                        ...current,
                        stage: stage.index,
                        items: 0,
                        totalItems: stages[stage.index].items.length,
                        status: 'Ready',
                      }));
                      try {
                        window.localStorage.setItem(saveKey, JSON.stringify({ cleared: clearedRef.current, stage: stage.index }));
                      } catch {
                        // Stage selection still works if saving is blocked.
                      }
                    }}
                  >
                    {stage.label}
                  </button>
                );
              })}
            </div>
          </details>
        </div>
      </div>

      <style jsx>{`
        .jumpPage {
          min-height: calc(100vh - var(--site-nav-height));
          padding: 18px;
          background:
            linear-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.06) 1px, transparent 1px),
            #0f172a;
          background-size: 34px 34px;
          color: #f8fafc;
        }

        .jumpShell {
          width: min(1180px, 100%);
          margin: 0 auto;
          display: grid;
          gap: 12px;
        }

        .jumpHud {
          min-height: 82px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 16px 18px;
          border-radius: 8px;
          background: rgba(15, 23, 42, 0.9);
          box-shadow: 0 18px 36px rgba(0, 0, 0, 0.26);
        }

        .jumpHud span {
          color: #38bdf8;
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .jumpHud h1 {
          margin: 4px 0 0;
          font-size: 36px;
          line-height: 1;
        }

        .stats {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 8px;
        }

        .stats strong,
        .stats span {
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

        .stats span {
          background: #dbeafe;
          color: #1e3a8a;
        }

        .gameFrame {
          height: min(660px, calc(100vh - var(--site-nav-height) - 132px));
          min-height: 500px;
          position: relative;
          overflow: hidden;
          border: 4px solid #111827;
          border-radius: 8px;
          background: #dbeafe;
          box-shadow: 0 22px 52px rgba(0, 0, 0, 0.36);
        }

        .gameCanvas {
          width: 100%;
          height: 100%;
          display: block;
          touch-action: none;
        }

        .guide {
          position: absolute;
          left: 14px;
          bottom: 14px;
          display: grid;
          gap: 4px;
          max-width: min(460px, calc(100% - 28px));
          padding: 12px 14px;
          border: 1px solid rgba(255, 255, 255, 0.24);
          border-radius: 8px;
          background: rgba(15, 23, 42, 0.78);
          color: #ffffff;
          pointer-events: none;
          backdrop-filter: blur(10px);
        }

        .guide strong {
          font-size: 15px;
        }

        .guide span {
          color: #dbeafe;
          font-size: 12px;
          font-weight: 800;
        }

        .stagePicker {
          position: absolute;
          right: 12px;
          bottom: 12px;
          width: min(360px, calc(100% - 24px));
          text-align: right;
        }

        .stagePicker summary {
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
          backdrop-filter: blur(10px);
        }

        .stagePicker summary::-webkit-details-marker {
          display: none;
        }

        .stagePicker > div {
          max-height: 152px;
          display: grid;
          grid-template-columns: repeat(8, minmax(30px, 1fr));
          gap: 5px;
          overflow-y: auto;
          margin-top: 8px;
          padding: 8px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 8px;
          background: rgba(15, 23, 42, 0.72);
          backdrop-filter: blur(10px);
        }

        .stagePicker button {
          min-height: 32px;
          border: 0;
          border-radius: 7px;
          background: rgba(255, 255, 255, 0.18);
          color: #ffffff;
          font-weight: 900;
          cursor: pointer;
        }

        .stagePicker button.active {
          background: #facc15;
          color: #111827;
        }

        .stagePicker button:disabled {
          opacity: 0.28;
          cursor: not-allowed;
        }

        @media (max-width: 760px) {
          .jumpPage {
            padding: 12px;
          }

          .jumpHud {
            display: grid;
            padding: 14px;
          }

          .jumpHud h1 {
            font-size: 30px;
          }

          .stats {
            justify-content: start;
          }

          .gameFrame {
            height: calc(100vh - var(--site-nav-height) - 170px);
            min-height: 440px;
          }

          .guide {
            right: 10px;
            left: 10px;
            bottom: 62px;
          }
        }
      `}</style>
    </section>
  );
}
