import { useEffect, useRef, useState } from 'react';

const playerRadius = 18;
const gravity = 1450;
const maxSpeed = 1500;
const levelCount = 50;

const themes = [
  { name: 'Neon City', skyTop: '#172554', skyMid: '#2563eb', ground: '#0f172a', accent: '#22d3ee', hazard: '#fb7185' },
  { name: 'Candy Cloud', skyTop: '#fce7f3', skyMid: '#dbeafe', ground: '#7c3aed', accent: '#facc15', hazard: '#e11d48' },
  { name: 'Jungle Rush', skyTop: '#14532d', skyMid: '#86efac', ground: '#064e3b', accent: '#bef264', hazard: '#f97316' },
  { name: 'Lava Rail', skyTop: '#450a0a', skyMid: '#fb923c', ground: '#1f2937', accent: '#fde047', hazard: '#dc2626' },
  { name: 'Moon Lab', skyTop: '#020617', skyMid: '#64748b', ground: '#334155', accent: '#a78bfa', hazard: '#38bdf8' },
];

function createLevel(index) {
  const difficulty = index / (levelCount - 1);
  const width = Math.round(2300 + index * 185 + difficulty * 1700);
  const finishX = width - 270;
  const hookGap = Math.max(170, 285 - difficulty * 74);
  const hookCount = Math.ceil((finishX - 260) / hookGap);
  const hooks = [];
  const pads = [];
  const hazards = [];
  const theme = themes[index % themes.length];

  for (let hookIndex = 0; hookIndex < hookCount; hookIndex += 1) {
    const x = 300 + hookIndex * hookGap + Math.sin(index * 0.9 + hookIndex * 1.35) * (22 + difficulty * 35);
    const wave = Math.sin(hookIndex * 1.52 + index * 0.7);
    const steep = Math.sin(hookIndex * 0.73 + index * 0.31);
    const y = clamp(155 + wave * (52 + difficulty * 38) + steep * difficulty * 46, 78, 258);
    hooks.push({ x: Math.round(x), y: Math.round(y) });
  }

  for (let x = 760 + (index % 3) * 90; x < finishX - 260; x += 900 - difficulty * 350) {
    pads.push({
      x: Math.round(x),
      y: Math.round(456 - Math.sin(x * 0.01 + index) * 24),
      width: Math.round(118 - difficulty * 30),
      height: 20,
      angle: Math.sin(index * 0.8 + x * 0.012) * (16 + difficulty * 8),
      power: Math.round(880 + difficulty * 260),
    });
  }

  for (let x = 980 + (index % 4) * 110; x < finishX - 180; x += 690 - difficulty * 230) {
    hazards.push({
      x: Math.round(x),
      y: 526,
      width: Math.round(170 + difficulty * 95 + ((index + Math.floor(x)) % 3) * 28),
      height: 38,
    });
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
    hazards,
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
  const audioRef = useRef(null);
  const [hud, setHud] = useState({
    level: 0,
    progress: 0,
    fails: 0,
    hooked: false,
    speed: 0,
    combo: 0,
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
      const frequencies = {
        hook: [760, 480],
        pad: [420, 980],
        fail: [180, 80],
        goal: [640, 1120],
      };
      const [start, end] = frequencies[type] ?? frequencies.hook;

      gain.connect(audio.destination);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(type === 'goal' ? 0.22 : 0.14, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      oscillator.type = type === 'fail' ? 'sawtooth' : 'triangle';
      oscillator.frequency.setValueAtTime(start, now);
      oscillator.frequency.exponentialRampToValueAtTime(end, now + 0.18);
      oscillator.connect(gain);
      oscillator.start(now);
      oscillator.stop(now + 0.24);
    }

    function resizeCanvas() {
      const rect = canvas.getBoundingClientRect();
      const scale = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * scale));
      canvas.height = Math.max(1, Math.floor(rect.height * scale));
      context.setTransform(scale, 0, 0, scale, 0, 0);
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
    }

    function getNearestHook(player, level) {
      let nearest = null;
      let nearestDistance = Infinity;

      level.hooks.forEach((hook) => {
        const hookDistance = distance(player, hook);

        if (hookDistance < nearestDistance && hookDistance < 455 - level.difficulty * 45 && hook.x > player.x - 100) {
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
        length: clamp(nearest.hookDistance, 92, 318 - level.difficulty * 38),
      };
      playSound('hook');
    }

    function launchNextLevel() {
      const nextLevel = levelRef.current + 1;
      playSound('goal');

      if (nextLevel >= levels.length) {
        resetLevel(levels.length - 1, false);
        return;
      }

      resetLevel(nextLevel, false);
    }

    function updatePhysics(delta) {
      const player = playerRef.current;
      const level = levels[levelRef.current];

      if (inputRef.current.holding && !ropeRef.current) {
        attachNearestHook();
      }

      if (player.bounceCombo > 0 && performance.now() - player.lastPadTime > 2400) {
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

        if (currentLength > rope.length) {
          player.x = rope.hook.x + normalX * rope.length;
          player.y = rope.hook.y + normalY * rope.length;
          const outwardSpeed = player.vx * normalX + player.vy * normalY;

          if (outwardSpeed > 0) {
            player.vx -= outwardSpeed * normalX;
            player.vy -= outwardSpeed * normalY;
          }
        }

        player.vx *= 0.998;
        player.vy *= 0.998;
      }

      player.x += player.vx * delta;
      player.y += player.vy * delta;
      player.rotation += player.vx * delta * 0.014;

      const speed = Math.hypot(player.vx, player.vy);
      if (speed > maxSpeed) {
        player.vx = (player.vx / speed) * maxSpeed;
        player.vy = (player.vy / speed) * maxSpeed;
      }

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
          const comboBoost = 1 + player.bounceCombo * 0.12;
          const launchPower = Math.max(pad.power, impactSpeed * 1.1 + pad.power * 0.28) * comboBoost;
          player.vx = tangentX * tangentSpeed * 0.34 + normalX * launchPower + 170;
          player.vy = tangentY * tangentSpeed * 0.34 + normalY * launchPower - player.bounceCombo * 38;
          player.y -= 12;
          ropeRef.current = null;
          playSound('pad');
        }
      });

      if (level.hazards.some((hazard) => rectHitCircle(hazard, player, playerRadius)) || player.y > 760 || player.x < -180) {
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
        context.fillStyle = isSelected ? 'rgba(250, 204, 21, 0.22)' : 'rgba(255, 255, 255, 0.16)';
        context.fill();

        context.beginPath();
        context.arc(x, hook.y, isSelected ? 21 : 18, 0, Math.PI * 2);
        context.fillStyle = '#ffffff';
        context.fill();
        context.lineWidth = isSelected ? 7 : 6;
        context.strokeStyle = isSelected ? '#facc15' : level.theme.accent;
        context.stroke();

        context.beginPath();
        context.arc(x, hook.y, isSelected ? 8 : 6, 0, Math.PI * 2);
        context.fillStyle = isSelected ? '#facc15' : '#111827';
        context.fill();
      });
    }

    function drawPadsAndHazards(level) {
      const camera = cameraRef.current;
      level.pads.forEach((pad) => {
        const x = pad.x - camera.x;
        const y = pad.y;
        const angle = (pad.angle * Math.PI) / 180;
        context.save();
        context.translate(x, y);
        context.rotate(angle);
        context.fillStyle = level.theme.accent;
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
        context.restore();
      });

      level.hazards.forEach((hazard) => {
        const left = hazard.x - camera.x - hazard.width / 2;
        const top = hazard.y - hazard.height / 2;
        context.fillStyle = 'rgba(255, 255, 255, 0.78)';
        drawRoundedRect(context, left, top, hazard.width, hazard.height, 7);
        context.fillStyle = level.theme.hazard;
        const spikeCount = Math.max(4, Math.floor(hazard.width / 24));
        for (let index = 0; index < spikeCount; index += 1) {
          const spikeX = left + (index / spikeCount) * hazard.width;
          context.beginPath();
          context.moveTo(spikeX, top + hazard.height);
          context.lineTo(spikeX + hazard.width / spikeCount / 2, top);
          context.lineTo(spikeX + hazard.width / spikeCount, top + hazard.height);
          context.closePath();
          context.fill();
        }
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
      const x = player.x - camera.x;
      const y = player.y;
      const angle = Math.atan2(player.vy, player.vx || 1);

      if (ropeRef.current) {
        context.beginPath();
        context.moveTo(ropeRef.current.hook.x - camera.x, ropeRef.current.hook.y);
        context.lineTo(x, y - 13);
        context.lineWidth = 5;
        context.strokeStyle = '#f8fafc';
        context.shadowColor = level.theme.accent;
        context.shadowBlur = 14;
        context.stroke();
        context.shadowBlur = 0;
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
      context.fillStyle = 'rgba(37, 99, 235, 0.55)';
      context.fill();

      context.lineWidth = 7;
      context.strokeStyle = '#0f172a';

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
      context.strokeStyle = level.theme.accent;
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
      context.fillStyle = '#111827';
      context.fill();
      context.lineWidth = 4;
      context.strokeStyle = '#f8fafc';
      context.stroke();

      context.fillStyle = level.theme.accent;
      context.beginPath();
      context.ellipse(3, -24, 12, 6, -0.08, 0, Math.PI * 2);
      context.fill();

      context.beginPath();
      context.arc(7, -25, 2, 0, Math.PI * 2);
      context.fillStyle = '#ffffff';
      context.fill();

      context.restore();
    }

    function draw() {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const level = levels[levelRef.current];

      drawBackground(width, height, level);
      context.save();
      context.translate(0, Math.max(0, (height - 620) / 2));
      drawHooks(level);
      drawPadsAndHazards(level);
      drawFinish(level, height);
      drawPlayer();
      context.restore();
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
    }

    resizeCanvas();
    resetLevel(0, false);
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
            <span>{hud.hooked ? 'Hooked' : 'Flying'}</span>
            <span>{hud.speed}</span>
          </div>
        </header>

        <div className="canvasFrame">
          <canvas ref={canvasRef} className="swingCanvas" />
          <div className="helpPanel">
            <strong>Hold</strong>
            <span>Click or touch to hook. Release to fly.</span>
            <em>R restart · number keys jump to early stages</em>
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

        .helpPanel {
          position: absolute;
          left: 14px;
          bottom: 14px;
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
            bottom: 10px;
          }
        }
      `}</style>
    </section>
  );
}
