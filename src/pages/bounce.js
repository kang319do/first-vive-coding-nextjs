import React, { useEffect, useRef, useState } from 'react';

const ballRadius = 24;
const floorHeight = 72;

const maps = [
  {
    name: 'MAP 1',
    worldWidth: 2200,
    floorStart: 40,
    floorEnd: 620,
    obstacles: [
      { x: 670, y: 316, width: 132, height: 28 },
      { x: 900, y: 232, width: 122, height: 28 },
      { x: 1130, y: 154, width: 112, height: 28 },
      { x: 1260, y: 236, width: 92, height: 28, moving: { axis: 'x', distance: 90, speed: 1.2 } },
      { x: 1360, y: 78, width: 104, height: 28 },
      { x: 1605, y: 0, width: 100, height: 28 },
      { x: 1845, y: -82, width: 118, height: 28, goal: true },
      { x: 1060, y: 302, width: 110, height: 26, hazard: true },
    ],
  },
  {
    name: 'MAP 2',
    worldWidth: 2800,
    floorStart: 40,
    floorEnd: 540,
    obstacles: [
      { x: 610, y: 326, width: 108, height: 28 },
      { x: 790, y: 236, width: 96, height: 28 },
      { x: 990, y: 154, width: 86, height: 28 },
      { x: 1110, y: 248, width: 82, height: 28, moving: { axis: 'y', distance: 70, speed: 1.35 } },
      { x: 1195, y: 76, width: 84, height: 28 },
      { x: 1395, y: -6, width: 80, height: 28 },
      { x: 1605, y: 70, width: 78, height: 28 },
      { x: 1810, y: -16, width: 76, height: 28 },
      { x: 1920, y: 142, width: 72, height: 28, moving: { axis: 'x', distance: 110, speed: 1.55 } },
      { x: 2030, y: -102, width: 74, height: 28 },
      { x: 2260, y: -184, width: 92, height: 28, goal: true },
      { x: 900, y: 310, width: 110, height: 26, hazard: true },
      { x: 1510, y: 158, width: 116, height: 26, hazard: true },
      { x: 2110, y: -28, width: 92, height: 26, hazard: true },
    ],
  },
  {
    name: 'MAP 3',
    worldWidth: 3400,
    floorStart: 40,
    floorEnd: 480,
    obstacles: [
      { x: 560, y: 330, width: 92, height: 28 },
      { x: 725, y: 252, width: 78, height: 28 },
      { x: 900, y: 174, width: 74, height: 28 },
      { x: 1090, y: 96, width: 70, height: 28 },
      { x: 1195, y: 236, width: 62, height: 28, moving: { axis: 'x', distance: 120, speed: 1.65 } },
      { x: 1290, y: 24, width: 68, height: 28 },
      { x: 1495, y: -50, width: 66, height: 28 },
      { x: 1710, y: 34, width: 64, height: 28 },
      { x: 1930, y: -48, width: 62, height: 28 },
      { x: 2160, y: -130, width: 60, height: 28 },
      { x: 2280, y: 44, width: 58, height: 28, moving: { axis: 'y', distance: 86, speed: 1.8 } },
      { x: 2400, y: -54, width: 58, height: 28 },
      { x: 2645, y: -140, width: 56, height: 28 },
      { x: 2910, y: -226, width: 88, height: 28, goal: true },
      { x: 780, y: 332, width: 92, height: 26, hazard: true },
      { x: 1350, y: 128, width: 96, height: 26, hazard: true },
      { x: 2045, y: 34, width: 88, height: 26, hazard: true },
      { x: 2530, y: -38, width: 84, height: 26, hazard: true },
    ],
  },
];

function getCameraX(ballX, map) {
  if (typeof window === 'undefined') {
    return 0;
  }

  const target = ballX - window.innerWidth * 0.38;

  return Math.max(0, Math.min(map.worldWidth - window.innerWidth, target));
}

function getStartPosition(map) {
  if (typeof window === 'undefined') {
    return { x: 120, y: 0 };
  }

  const floorTop = window.innerHeight / 2 - floorHeight;

  return {
    x: map.floorStart + 80,
    y: floorTop - ballRadius,
  };
}

function getObstaclePosition(obstacle, time) {
  if (!obstacle.moving) {
    return obstacle;
  }

  const offset = Math.sin(time * obstacle.moving.speed) * obstacle.moving.distance;

  if (obstacle.moving.axis === 'y') {
    return {
      ...obstacle,
      y: obstacle.y + offset,
    };
  }

  return {
    ...obstacle,
    x: obstacle.x + offset,
  };
}

function reflectVelocity(velocity, normal, bounciness = 0.9) {
  const dot = velocity.x * normal.x + velocity.y * normal.y;

  if (dot >= 0) {
    return velocity;
  }

  return {
    x: velocity.x - (1 + bounciness) * dot * normal.x,
    y: velocity.y - (1 + bounciness) * dot * normal.y,
  };
}

function collideCircleWithRect(ball, velocity, rect) {
  const rectLeft = rect.x - rect.width / 2;
  const rectRight = rect.x + rect.width / 2;
  const rectTop = rect.y - rect.height / 2;
  const rectBottom = rect.y + rect.height / 2;
  const closestX = Math.max(rectLeft, Math.min(ball.x, rectRight));
  const closestY = Math.max(rectTop, Math.min(ball.y, rectBottom));
  const diffX = ball.x - closestX;
  const diffY = ball.y - closestY;
  const distanceSquared = diffX * diffX + diffY * diffY;

  if (distanceSquared > ballRadius * ballRadius) {
    return { ball, velocity, normal: null, collided: false };
  }

  let normal = { x: 0, y: -1 };
  let overlap = ballRadius;

  if (distanceSquared > 0) {
    const distance = Math.sqrt(distanceSquared);
    normal = {
      x: diffX / distance,
      y: diffY / distance,
    };
    overlap = ballRadius - distance;
  } else {
    const distances = [
      { side: 'left', value: Math.abs(ball.x - rectLeft) },
      { side: 'right', value: Math.abs(rectRight - ball.x) },
      { side: 'top', value: Math.abs(ball.y - rectTop) },
      { side: 'bottom', value: Math.abs(rectBottom - ball.y) },
    ].sort((a, b) => a.value - b.value);

    if (distances[0].side === 'left') {
      normal = { x: -1, y: 0 };
    } else if (distances[0].side === 'right') {
      normal = { x: 1, y: 0 };
    } else if (distances[0].side === 'bottom') {
      normal = { x: 0, y: 1 };
    }
  }

  return {
    ball: {
      x: ball.x + normal.x * overlap,
      y: ball.y + normal.y * overlap,
      rotation: ball.rotation,
    },
    velocity: reflectVelocity(velocity, normal),
    normal,
    collided: true,
  };
}

export default function BouncePage() {
  const [level, setLevel] = useState(0);
  const [ball, setBall] = useState({ x: 120, y: 0, rotation: 0 });
  const [cameraX, setCameraX] = useState(0);
  const [worldTime, setWorldTime] = useState(0);
  const [hud, setHud] = useState({ vx: 220, vy: -760, deaths: 0 });
  const [success, setSuccess] = useState(null);
  const currentMap = maps[level];
  const ballRef = useRef({ x: 120, y: 0, rotation: 0 });
  const velocityRef = useRef({ x: 220, y: -760 });
  const levelRef = useRef(0);
  const pressedKeys = useRef(new Set());
  const lastFrameTime = useRef(null);
  const animationFrame = useRef(null);
  const audioContext = useRef(null);
  const successCooldown = useRef(false);
  const deaths = useRef(0);
  const lastSoundTime = useRef(0);

  useEffect(() => {
    const gravity = 1650;
    const floorBouncePower = 760;
    const obstacleBouncePower = 840;
    const moveSpeed = 520;

    function getAudioContext() {
      if (!audioContext.current) {
        audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
      }

      if (audioContext.current.state === 'suspended') {
        audioContext.current.resume();
      }

      return audioContext.current;
    }

    function playBounceSound(type = 'floor', intensity = 1) {
      const context = getAudioContext();
      const now = context.currentTime;
      const output = context.createGain();
      const main = context.createOscillator();
      const wobble = context.createOscillator();
      const filter = context.createBiquadFilter();
      const noise = type === 'death' ? context.createOscillator() : null;
      const volume = Math.min(type === 'death' ? 0.26 : 0.18, 0.07 + intensity * 0.045);
      const startFrequency =
        type === 'death' ? 140 :
        type === 'goal' ? 920 :
        type === 'obstacle' ? 690 :
        type === 'wall' ? 410 :
        540;
      const endFrequency =
        type === 'death' ? 60 :
        type === 'wall' ? 180 :
        270;

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, now);
      filter.frequency.exponentialRampToValueAtTime(420, now + 0.22);

      output.gain.setValueAtTime(0.0001, now);
      output.gain.exponentialRampToValueAtTime(volume, now + 0.012);
      output.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);

      main.type = 'sine';
      main.frequency.setValueAtTime(startFrequency, now);
      main.frequency.exponentialRampToValueAtTime(endFrequency, now + 0.22);

      wobble.type = 'triangle';
      wobble.frequency.setValueAtTime(startFrequency * 1.52, now);
      wobble.frequency.exponentialRampToValueAtTime(endFrequency * 1.18, now + 0.18);

      main.connect(filter);
      wobble.connect(filter);

      if (noise) {
        noise.type = 'sawtooth';
        noise.frequency.setValueAtTime(90, now);
        noise.frequency.exponentialRampToValueAtTime(42, now + 0.32);
        noise.connect(filter);
      }

      filter.connect(output);
      output.connect(context.destination);

      main.start(now);
      wobble.start(now + 0.018);
      noise?.start(now);
      main.stop(now + (type === 'death' ? 0.36 : 0.25));
      wobble.stop(now + (type === 'death' ? 0.3 : 0.22));
      noise?.stop(now + 0.34);
    }

    function playCollisionSound(type, intensity = 1) {
      const now = performance.now();

      if (now - lastSoundTime.current < 70 && type !== 'death' && type !== 'goal') {
        return;
      }

      lastSoundTime.current = now;
      playBounceSound(type, intensity);
    }

    function resetBall() {
      const map = maps[levelRef.current];
      const startPosition = getStartPosition(map);
      ballRef.current = { ...startPosition, rotation: 0 };
      velocityRef.current = { x: moveSpeed, y: -floorBouncePower };
      setBall(ballRef.current);
      setCameraX(getCameraX(startPosition.x, map));
      setHud((current) => ({
        ...current,
        vx: velocityRef.current.x,
        vy: velocityRef.current.y,
      }));
    }

    function dieAndReset() {
      deaths.current += 1;
      playCollisionSound('death', 2.2);
      resetBall();
      setHud((current) => ({
        ...current,
        deaths: deaths.current,
      }));
    }

    function showSuccessAndReset() {
      if (successCooldown.current) {
        return;
      }

      successCooldown.current = true;
      const nextLevel = levelRef.current + 1;
      const hasNextMap = nextLevel < maps.length;
      const nextMap = hasNextMap ? maps[nextLevel] : maps[0];
      const startPosition = getStartPosition(nextMap);

      setSuccess({
        left: startPosition.x - getCameraX(startPosition.x, nextMap),
        top: window.innerHeight / 2 + startPosition.y - 82,
      });
      playCollisionSound('goal', 1.8);
      levelRef.current = hasNextMap ? nextLevel : 0;
      setLevel(levelRef.current);
      resetBall();

      window.setTimeout(() => {
        setSuccess(null);
        successCooldown.current = false;
      }, 1400);
    }

    function handleKeyDown(event) {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) {
        return;
      }

      event.preventDefault();
      getAudioContext();
      pressedKeys.current.add(event.key);
    }

    function handleKeyUp(event) {
      pressedKeys.current.delete(event.key);
    }

    function moveBall(timestamp) {
      if (lastFrameTime.current === null) {
        lastFrameTime.current = timestamp;
      }

      const deltaSeconds = Math.min((timestamp - lastFrameTime.current) / 1000, 0.03);
      const time = timestamp / 1000;
      lastFrameTime.current = timestamp;

      const viewportHalfHeight = window.innerHeight / 2;
      const floorTop = viewportHalfHeight - floorHeight;
      const map = maps[levelRef.current];

      let currentBall = ballRef.current;
      let velocity = velocityRef.current;
      let xDirection = 0;

      if (pressedKeys.current.has('ArrowLeft')) {
        xDirection -= 1;
      }

      if (pressedKeys.current.has('ArrowRight')) {
        xDirection += 1;
      }

      velocity = {
        x: xDirection * moveSpeed,
        y: velocity.y + gravity * deltaSeconds,
      };

      currentBall = {
        x: currentBall.x + velocity.x * deltaSeconds,
        y: currentBall.y + velocity.y * deltaSeconds,
        rotation: currentBall.rotation + (velocity.x / ballRadius) * deltaSeconds * 57,
      };

      if (currentBall.x - ballRadius < 0) {
        currentBall.x = ballRadius;
        playCollisionSound('wall', 0.8);
        velocity.x = 0;
      }

      if (currentBall.x + ballRadius > map.worldWidth) {
        currentBall.x = map.worldWidth - ballRadius;
        playCollisionSound('wall', 0.8);
        velocity.x = 0;
      }

      if (
        currentBall.x + ballRadius > map.floorStart &&
        currentBall.x - ballRadius < map.floorEnd &&
        currentBall.y + ballRadius >= floorTop &&
        velocity.y > 0
      ) {
        currentBall.y = floorTop - ballRadius;
        playCollisionSound('floor', Math.min(Math.abs(velocity.y) / 760, 1.7));
        velocity.y = -floorBouncePower;
      }

      let reachedGoal = false;
      let died = false;

      map.obstacles.forEach((obstacle) => {
        if (reachedGoal || died) {
          return;
        }

        const obstaclePosition = getObstaclePosition(obstacle, time);
        const result = collideCircleWithRect(currentBall, velocity, obstaclePosition);
        if (result.collided) {
          if (obstacle.hazard) {
            dieAndReset();
            died = true;
            return;
          }

          playCollisionSound(obstacle.goal ? 'goal' : 'obstacle', 1.25);

          if (result.normal && result.normal.y < -0.45) {
            result.velocity.y = -obstacleBouncePower;
          } else if (result.normal && Math.abs(result.normal.x) > 0.5) {
            result.velocity.y = Math.min(result.velocity.y, -obstacleBouncePower * 0.62);
          }

          if (obstacle.goal && currentBall.y < obstacle.y && velocity.y > 0) {
            showSuccessAndReset();
            reachedGoal = true;
          }
        }
        currentBall = result.ball;
        velocity = result.velocity;
      });

      if (reachedGoal || died) {
        animationFrame.current = requestAnimationFrame(moveBall);
        return;
      }

      if (currentBall.y - ballRadius > viewportHalfHeight) {
        dieAndReset();
        animationFrame.current = requestAnimationFrame(moveBall);
        return;
      }

      ballRef.current = currentBall;
      velocityRef.current = velocity;
      setBall(currentBall);
      setWorldTime(time);
      setCameraX(getCameraX(currentBall.x, map));
      setHud({
        vx: velocity.x,
        vy: velocity.y,
        deaths: deaths.current,
      });

      animationFrame.current = requestAnimationFrame(moveBall);
    }

    resetBall();
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('pointerdown', getAudioContext);
    window.addEventListener('resize', resetBall);
    animationFrame.current = requestAnimationFrame(moveBall);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('pointerdown', getAudioContext);
      window.removeEventListener('resize', resetBall);
      cancelAnimationFrame(animationFrame.current);
    };
  }, []);

  return (
    <div className="page">
      <div className="hud">
        <div className="hudItem">
          <span>POS</span>
          <strong>
            {Math.round(ball.x)}, {Math.round(ball.y)}
          </strong>
        </div>
        <div className="hudItem">
          <span>VEL</span>
          <strong>
            {Math.round(hud.vx)}, {Math.round(hud.vy)}
          </strong>
        </div>
        <div className="hudItem">
          <span>DEATHS</span>
          <strong>{hud.deaths}</strong>
        </div>
        <div className="hudItem goalStatus">
          <span>{currentMap.name}</span>
          <strong>{Math.round(cameraX)} / {currentMap.worldWidth}</strong>
        </div>
      </div>

      {currentMap.obstacles.map((obstacle, index) => {
        const obstaclePosition = getObstaclePosition(obstacle, worldTime);

        return (
          <div
            key={index}
            className={
              obstacle.goal ? 'obstacle goalBlock' :
              obstacle.hazard ? 'obstacle hazardBlock' :
              obstacle.moving ? 'obstacle movingBlock' :
              'obstacle'
            }
            style={{
              width: `${obstacle.width}px`,
              height: `${obstacle.height}px`,
              left: `${obstaclePosition.x - cameraX}px`,
              top: `calc(50% + ${obstaclePosition.y}px)`,
            }}
          />
        );
      })}

      {success && (
        <div
          className="success"
          style={{
            left: `${success.left}px`,
            top: `${success.top}px`,
          }}
        >
          SUCCESS
        </div>
      )}

      <div
        className="ball"
        style={{
          left: `${ball.x - cameraX}px`,
          top: `calc(50% + ${ball.y}px)`,
          transform: `translate(-50%, -50%) rotate(${ball.rotation}deg)`,
        }}
      />

      <div
        className="floor"
        style={{
          left: `${currentMap.floorStart - cameraX}px`,
          width: `${currentMap.floorEnd - currentMap.floorStart}px`,
        }}
      />

      <style jsx>{`
        .page {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          background:
            linear-gradient(rgba(15, 23, 42, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(15, 23, 42, 0.05) 1px, transparent 1px),
            linear-gradient(#e8f1f7 0%, #f7fafc 62%, #e7ecef 62%);
          background-size: 42px 42px, 42px 42px, auto;
          background-position: ${-cameraX * 0.18}px 0, ${-cameraX * 0.18}px 0, 0 0;
        }

        .hud {
          min-height: 68px;
          position: fixed;
          top: calc(var(--site-nav-height) + 14px);
          right: 16px;
          left: 16px;
          z-index: 10;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          padding: 10px;
          border: 1px solid rgba(15, 23, 42, 0.16);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.84);
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.14);
          backdrop-filter: blur(10px);
        }

        .hudItem {
          min-width: 0;
          padding: 8px 10px;
          border: 1px solid rgba(100, 116, 139, 0.22);
          border-radius: 7px;
          background: linear-gradient(180deg, #ffffff, #f8fafc);
        }

        .hudItem span {
          display: block;
          color: #64748b;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0;
        }

        .hudItem strong {
          display: block;
          margin-top: 4px;
          overflow: hidden;
          color: #0f172a;
          font-size: 17px;
          font-weight: 900;
          line-height: 1.05;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .goalStatus strong {
          color: #15803d;
        }

        .ball {
          width: ${ballRadius * 2}px;
          height: ${ballRadius * 2}px;
          position: absolute;
          z-index: 2;
          border-radius: 50%;
          background:
            radial-gradient(circle at 32% 25%, rgba(255, 255, 255, 0.95) 0 10%, transparent 11%),
            radial-gradient(circle at 35% 30%, #f97316 0 18%, #dc2626 58%, #7f1d1d 100%);
          box-shadow: 0 16px 24px rgba(15, 23, 42, 0.22);
        }

        .ball::after {
          content: '';
          width: 66%;
          height: 4px;
          position: absolute;
          left: 17%;
          top: calc(50% - 2px);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.48);
        }

        .obstacle {
          position: absolute;
          z-index: 1;
          border: 3px solid #273447;
          border-radius: 8px;
          background: #475569;
          transform: translate(-50%, -50%);
          box-shadow: 0 10px 20px rgba(15, 23, 42, 0.2);
        }

        .goalBlock {
          border-color: #15803d;
          background: linear-gradient(135deg, #22c55e, #86efac);
          box-shadow: 0 10px 24px rgba(34, 197, 94, 0.34);
        }

        .movingBlock {
          border-color: #0f766e;
          background:
            linear-gradient(90deg, rgba(255, 255, 255, 0.34) 0 14px, transparent 14px 28px),
            linear-gradient(135deg, #14b8a6, #0f766e);
          box-shadow: 0 12px 24px rgba(20, 184, 166, 0.32);
        }

        .hazardBlock {
          border-color: #7f1d1d;
          background:
            repeating-linear-gradient(
              135deg,
              #ef4444 0,
              #ef4444 12px,
              #7f1d1d 12px,
              #7f1d1d 24px
            );
          box-shadow: 0 10px 24px rgba(220, 38, 38, 0.34);
        }

        .success {
          position: fixed;
          z-index: 20;
          padding: 10px 16px;
          border: 3px solid #15803d;
          border-radius: 8px;
          background: #dcfce7;
          color: #14532d;
          font-size: 22px;
          font-weight: 900;
          letter-spacing: 0;
          pointer-events: none;
          transform: translate(-50%, -50%);
          animation: successPop 1400ms ease-out forwards;
        }

        @keyframes successPop {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.7);
          }

          16% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.08);
          }

          75% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }

          100% {
            opacity: 0;
            transform: translate(-50%, -70%) scale(0.96);
          }
        }

        .floor {
          height: ${floorHeight}px;
          position: absolute;
          bottom: 0;
          border-top: 4px solid #334155;
          border-right: 4px solid #334155;
          border-left: 4px solid #334155;
          border-radius: 10px 10px 0 0;
          background: repeating-linear-gradient(
            90deg,
            #64748b 0,
            #64748b 34px,
            #536171 34px,
            #536171 68px
          );
        }

        @media (max-width: 720px) {
          .hud {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .hudItem strong {
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
}
