import React, { useEffect, useRef, useState } from 'react';

const playerSize = 34;
const gravity = 1800;
const moveSpeed = 280;
const jumpPower = 720;
const worldWidth = 2600;
const groundY = 438;

const startPosition = { x: 90, y: groundY - playerSize };

const platforms = [
  { x: 0, y: groundY, width: 520, height: 44 },
  { x: 620, y: groundY, width: 360, height: 44 },
  { x: 1100, y: groundY, width: 440, height: 44 },
  { x: 1680, y: groundY, width: 340, height: 44 },
  { x: 2160, y: groundY, width: 420, height: 44 },
  { x: 390, y: 320, width: 120, height: 26 },
  { x: 760, y: 270, width: 120, height: 26 },
  { x: 1180, y: 320, width: 140, height: 26 },
  { x: 1440, y: 240, width: 120, height: 26 },
  { x: 1840, y: 300, width: 150, height: 26 },
  { x: 2240, y: 250, width: 130, height: 26 },
];

const coins = [
  { x: 435, y: 280 },
  { x: 805, y: 230 },
  { x: 1240, y: 280 },
  { x: 1490, y: 200 },
  { x: 1905, y: 260 },
  { x: 2295, y: 210 },
];

const enemies = [
  { x: 700, y: groundY - 30, width: 34, height: 30, patrol: 120, speed: 1.4 },
  { x: 1320, y: groundY - 30, width: 34, height: 30, patrol: 150, speed: 1.7 },
  { x: 1930, y: groundY - 30, width: 34, height: 30, patrol: 100, speed: 1.9 },
];

const goal = { x: 2460, y: groundY - 180, width: 22, height: 180 };

function intersects(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function getEnemy(enemy, time) {
  return {
    ...enemy,
    x: enemy.x + Math.sin(time * enemy.speed) * enemy.patrol,
  };
}

function getCameraX(playerX) {
  if (typeof window === 'undefined') {
    return 0;
  }

  return Math.max(0, Math.min(worldWidth - window.innerWidth, playerX - window.innerWidth * 0.38));
}

export default function Platformer() {
  const [player, setPlayer] = useState({ ...startPosition, vx: 0, vy: 0, onGround: false });
  const [cameraX, setCameraX] = useState(0);
  const [collectedCoins, setCollectedCoins] = useState([]);
  const [message, setMessage] = useState('READY');
  const [time, setTime] = useState(0);
  const playerRef = useRef({ ...startPosition, vx: 0, vy: 0, onGround: false });
  const coinsRef = useRef([]);
  const keys = useRef(new Set());
  const lastFrame = useRef(null);
  const animationFrame = useRef(null);

  useEffect(() => {
    function reset(messageText = 'TRY AGAIN') {
      playerRef.current = { ...startPosition, vx: 0, vy: 0, onGround: false };
      setPlayer(playerRef.current);
      setCameraX(0);
      setMessage(messageText);
    }

    function handleKeyDown(event) {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', ' '].includes(event.key)) {
        return;
      }

      event.preventDefault();
      keys.current.add(event.key);
    }

    function handleKeyUp(event) {
      keys.current.delete(event.key);
    }

    function tick(timestamp) {
      if (lastFrame.current === null) {
        lastFrame.current = timestamp;
      }

      const delta = Math.min((timestamp - lastFrame.current) / 1000, 0.03);
      const currentTime = timestamp / 1000;
      lastFrame.current = timestamp;

      let next = { ...playerRef.current };
      const wantsLeft = keys.current.has('ArrowLeft');
      const wantsRight = keys.current.has('ArrowRight');
      const wantsJump = keys.current.has('ArrowUp') || keys.current.has(' ');

      next.vx = wantsLeft ? -moveSpeed : wantsRight ? moveSpeed : 0;

      if (wantsJump && next.onGround) {
        next.vy = -jumpPower;
        next.onGround = false;
      }

      next.vy += gravity * delta;
      next.x += next.vx * delta;
      next.y += next.vy * delta;
      next.x = Math.max(0, Math.min(worldWidth - playerSize, next.x));
      next.onGround = false;

      platforms.forEach((platform) => {
        const wasAbove = playerRef.current.y + playerSize <= platform.y;
        const playerBox = { x: next.x, y: next.y, width: playerSize, height: playerSize };

        if (wasAbove && next.vy >= 0 && intersects(playerBox, platform)) {
          next.y = platform.y - playerSize;
          next.vy = 0;
          next.onGround = true;
        }
      });

      coins.forEach((coin, index) => {
        if (coinsRef.current.includes(index)) {
          return;
        }

        const coinBox = { x: coin.x - 14, y: coin.y - 14, width: 28, height: 28 };
        const playerBox = { x: next.x, y: next.y, width: playerSize, height: playerSize };

        if (intersects(playerBox, coinBox)) {
          coinsRef.current = [...coinsRef.current, index];
          setCollectedCoins(coinsRef.current);
          setMessage('COIN +1');
        }
      });

      enemies.forEach((enemy) => {
        const movingEnemy = getEnemy(enemy, currentTime);
        const enemyBox = {
          x: movingEnemy.x,
          y: movingEnemy.y,
          width: movingEnemy.width,
          height: movingEnemy.height,
        };
        const playerBox = { x: next.x, y: next.y, width: playerSize, height: playerSize };

        if (intersects(playerBox, enemyBox)) {
          reset('OUCH');
          animationFrame.current = requestAnimationFrame(tick);
          return;
        }
      });

      if (next.y > window.innerHeight + 120) {
        reset('MISS');
        animationFrame.current = requestAnimationFrame(tick);
        return;
      }

      const goalBox = { x: goal.x, y: goal.y, width: goal.width + 28, height: goal.height };
      const playerBox = { x: next.x, y: next.y, width: playerSize, height: playerSize };

      if (intersects(playerBox, goalBox)) {
        setMessage('CLEAR!');
        next = { ...startPosition, vx: 0, vy: 0, onGround: false };
        playerRef.current = next;
        setPlayer(next);
        setCameraX(0);
        animationFrame.current = requestAnimationFrame(tick);
        return;
      }

      playerRef.current = next;
      setPlayer(next);
      setCameraX(getCameraX(next.x));
      setTime(currentTime);
      animationFrame.current = requestAnimationFrame(tick);
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    animationFrame.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(animationFrame.current);
    };
  }, []);

  return (
    <div className="screen">
      <div className="hud">
        <div>
          <span>WORLD</span>
          <strong>1-1</strong>
        </div>
        <div>
          <span>COINS</span>
          <strong>{collectedCoins.length} / {coins.length}</strong>
        </div>
        <div>
          <span>STATUS</span>
          <strong>{message}</strong>
        </div>
      </div>

      <div className="world" style={{ transform: `translateX(${-cameraX}px)` }}>
        {platforms.map((platform, index) => (
          <div
            key={index}
            className={platform.height > 30 ? 'ground platform' : 'platform'}
            style={{
              left: `${platform.x}px`,
              top: `${platform.y}px`,
              width: `${platform.width}px`,
              height: `${platform.height}px`,
            }}
          />
        ))}

        {coins.map((coin, index) => (
          <div
            key={index}
            className={collectedCoins.includes(index) ? 'coin collected' : 'coin'}
            style={{
              left: `${coin.x}px`,
              top: `${coin.y}px`,
            }}
          />
        ))}

        {enemies.map((enemy, index) => {
          const movingEnemy = getEnemy(enemy, time);

          return (
            <div
              key={index}
              className="enemy"
              style={{
                left: `${movingEnemy.x}px`,
                top: `${movingEnemy.y}px`,
                width: `${movingEnemy.width}px`,
                height: `${movingEnemy.height}px`,
              }}
            />
          );
        })}

        <div
          className="goalPole"
          style={{
            left: `${goal.x}px`,
            top: `${goal.y}px`,
            width: `${goal.width}px`,
            height: `${goal.height}px`,
          }}
        />

        <div
          className="player"
          style={{
            left: `${player.x}px`,
            top: `${player.y}px`,
            width: `${playerSize}px`,
            height: `${playerSize}px`,
          }}
        />
      </div>

      <style jsx>{`
        .screen {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          background: linear-gradient(#7dd3fc 0%, #bae6fd 58%, #86efac 58%, #65a30d 100%);
          font-family: Arial, sans-serif;
        }

        .hud {
          position: fixed;
          top: 14px;
          left: 16px;
          right: 16px;
          z-index: 10;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .hud div {
          padding: 9px 12px;
          border: 3px solid #1e293b;
          border-radius: 8px;
          background: #fef3c7;
          box-shadow: 0 5px 0 #92400e;
        }

        .hud span {
          display: block;
          color: #92400e;
          font-size: 10px;
          font-weight: 900;
        }

        .hud strong {
          display: block;
          margin-top: 3px;
          color: #1e293b;
          font-size: 18px;
          font-weight: 900;
        }

        .world {
          width: ${worldWidth}px;
          height: 100vh;
          position: absolute;
          left: 0;
          top: 0;
          transition: transform 80ms linear;
        }

        .platform {
          position: absolute;
          border: 3px solid #78350f;
          border-radius: 6px;
          background:
            linear-gradient(90deg, rgba(255, 255, 255, 0.16) 0 14px, transparent 14px 28px),
            #b45309;
          box-shadow: 0 8px 0 #78350f;
        }

        .ground {
          background:
            repeating-linear-gradient(90deg, #92400e 0 32px, #78350f 32px 64px);
        }

        .coin {
          width: 26px;
          height: 26px;
          position: absolute;
          border: 3px solid #b45309;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 25%, #fef9c3, #facc15 60%, #ca8a04);
          transform: translate(-50%, -50%);
          box-shadow: 0 0 14px rgba(250, 204, 21, 0.65);
        }

        .coin.collected {
          display: none;
        }

        .enemy {
          position: absolute;
          border: 3px solid #7f1d1d;
          border-radius: 14px 14px 6px 6px;
          background: #dc2626;
          box-shadow: 0 6px 0 #7f1d1d;
        }

        .enemy::before,
        .enemy::after {
          content: '';
          width: 5px;
          height: 5px;
          position: absolute;
          top: 8px;
          border-radius: 50%;
          background: #fff;
        }

        .enemy::before {
          left: 8px;
        }

        .enemy::after {
          right: 8px;
        }

        .goalPole {
          position: absolute;
          border-radius: 999px;
          background: #f8fafc;
          box-shadow: inset 0 0 0 4px #15803d;
        }

        .goalPole::before {
          content: '';
          width: 72px;
          height: 42px;
          position: absolute;
          top: 8px;
          left: 20px;
          background: #22c55e;
          clip-path: polygon(0 0, 100% 50%, 0 100%);
        }

        .player {
          position: absolute;
          z-index: 3;
          border: 3px solid #7f1d1d;
          border-radius: 8px;
          background:
            radial-gradient(circle at 35% 28%, #fed7aa 0 18%, transparent 19%),
            linear-gradient(#dc2626 0 34%, #2563eb 34% 100%);
          box-shadow: 0 8px 0 rgba(127, 29, 29, 0.75);
        }

        .player::before {
          content: '';
          width: 30px;
          height: 9px;
          position: absolute;
          left: -1px;
          top: -10px;
          border: 3px solid #7f1d1d;
          border-radius: 8px 8px 3px 3px;
          background: #dc2626;
        }

        @media (max-width: 720px) {
          .hud {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .hud strong {
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  );
}
