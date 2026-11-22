import React, { useEffect, useRef, useState } from 'react';
import styles from '@/styles/Bounce.module.css';

const ballRadius = 24;
const floorHeight = 72;
const saveKey = 'bounce-ball-progress-v1';

function spikeOn(platformX, platformY, platformHeight = 28, offsetX = 0, width = 42, height = 22) {
  return {
    x: platformX + offsetX,
    y: platformY - platformHeight / 2 - height / 2,
    width,
    height,
    spike: true,
  };
}

function SpikeCluster({ width, height }) {
  const teeth = Math.max(3, Math.round(width / 12));
  const step = width / teeth;

  return (
    <svg
      className={styles.spikeSvg}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <rect x="0" y={height - 3} width={width} height="3" fill="#1e293b" />
      {Array.from({ length: teeth }, (_, i) => {
        const x1 = i * step + 0.4;
        const xm = i * step + step / 2;
        const x2 = (i + 1) * step - 0.4;
        const tipSplitY = height * 0.34;
        return (
          <g key={i}>
            <polygon points={`${x1},${height} ${xm},0.5 ${xm},${height}`} fill="#e2e8f0" />
            <polygon points={`${xm},${height} ${xm},0.5 ${x2},${height}`} fill="#475569" />
            <polygon
              points={`${xm},0.5 ${xm - step * 0.16},${tipSplitY} ${xm + step * 0.16},${tipSplitY}`}
              fill="#ef4444"
            />
            <polyline
              points={`${x1},${height} ${xm},0.5 ${x2},${height}`}
              fill="none"
              stroke="#0f172a"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          </g>
        );
      })}
    </svg>
  );
}

const maps = [
  {
    name: 'MAP 1 · 입문 코스',
    worldWidth: 2800,
    floorStart: 40,
    floorEnd: 620,
    floorSpikes: [
      { x: 380, width: 48, height: 22 },
    ],
    obstacles: [
      { x: 675, y: 272, width: 138, height: 28 },
      { x: 910, y: 198, width: 128, height: 28 },
      { x: 1145, y: 128, width: 122, height: 28 },
      { x: 1475, y: 148, width: 124, height: 28, moving: { axis: 'x', distance: 155, speed: 0.95 } },
      { x: 1805, y: 80, width: 120, height: 28 },
      { x: 2035, y: 8, width: 114, height: 28 },
      { x: 2270, y: -64, width: 110, height: 28 },
      { x: 2515, y: -132, width: 128, height: 28, goal: true },
      { x: 1060, y: 266, width: 108, height: 26, hazard: true },
    ],
  },
  {
    name: 'MAP 2 · 가시 계단',
    worldWidth: 3400,
    floorStart: 40,
    floorEnd: 560,
    floorSpikes: [
      { x: 350, width: 54, height: 22 },
    ],
    obstacles: [
      { x: 620, y: 274, width: 118, height: 28 },
      { x: 825, y: 194, width: 146, height: 28 },
      spikeOn(825, 194, 28, 44, 38, 22),
      { x: 1045, y: 118, width: 102, height: 28 },
      { x: 1265, y: 126, width: 102, height: 28, moving: { axis: 'y', distance: 98, speed: 1.15 } },
      { x: 1495, y: 12, width: 146, height: 28 },
      spikeOn(1495, 12, 28, -44, 38, 22),
      { x: 1865, y: 36, width: 114, height: 28, moving: { axis: 'x', distance: 190, speed: 1.05 } },
      { x: 2235, y: -14, width: 96, height: 28 },
      { x: 2450, y: 42, width: 138, height: 28 },
      spikeOn(2450, 42, 28, 42, 36, 22),
      { x: 2675, y: -36, width: 92, height: 28 },
      { x: 2900, y: -112, width: 90, height: 28 },
      { x: 3130, y: -172, width: 108, height: 28, goal: true },
      { x: 1865, y: 140, width: 140, height: 26, hazard: true },
    ],
  },
  {
    name: 'MAP 3 · 위험 지대',
    worldWidth: 4000,
    floorStart: 40,
    floorEnd: 520,
    floorSpikes: [
      { x: 280, width: 44, height: 22 },
      { x: 430, width: 44, height: 22 },
    ],
    obstacles: [
      { x: 580, y: 274, width: 98, height: 28 },
      { x: 775, y: 198, width: 140, height: 28 },
      spikeOn(775, 198, 28, 42, 38, 22),
      { x: 980, y: 124, width: 88, height: 28 },
      { x: 1360, y: 134, width: 106, height: 28, moving: { axis: 'x', distance: 210, speed: 1.15 } },
      { x: 1750, y: 58, width: 142, height: 28 },
      spikeOn(1750, 58, 28, -42, 38, 22),
      { x: 1975, y: -20, width: 84, height: 28 },
      { x: 2200, y: 46, width: 136, height: 28 },
      spikeOn(2200, 46, 28, 40, 38, 22),
      { x: 2560, y: 24, width: 102, height: 28, moving: { axis: 'x', distance: 190, speed: 1.28, phase: 1.2 } },
      { x: 2925, y: -44, width: 86, height: 28 },
      { x: 3145, y: -42, width: 84, height: 28, moving: { axis: 'y', distance: 108, speed: 1.45 } },
      { x: 3395, y: -124, width: 134, height: 28 },
      spikeOn(3395, -124, 28, -40, 36, 22),
      { x: 3675, y: -182, width: 100, height: 28, goal: true },
      { x: 1360, y: 34, width: 96, height: 26, hazard: true },
      { x: 2560, y: 128, width: 132, height: 26, hazard: true },
    ],
  },
  {
    name: 'MAP 4 · 장거리 셔틀',
    worldWidth: 4900,
    floorStart: 40,
    floorEnd: 520,
    floorSpikes: [
      { x: 270, width: 46, height: 24 },
      { x: 430, width: 46, height: 24 },
    ],
    obstacles: [
      { x: 605, y: 254, width: 106, height: 28 },
      { x: 1065, y: 212, width: 120, height: 28, moving: { axis: 'x', distance: 265, speed: 0.92 } },
      { x: 1540, y: 152, width: 150, height: 28 },
      spikeOn(1540, 152, 28, 46, 40, 22),
      { x: 1765, y: 84, width: 98, height: 28 },
      { x: 2275, y: 78, width: 122, height: 28, moving: { axis: 'x', distance: 315, speed: 0.88, phase: 0.7 } },
      { x: 2810, y: 14, width: 150, height: 28 },
      spikeOn(2810, 14, 28, -46, 40, 22),
      { x: 3030, y: -56, width: 96, height: 28 },
      { x: 3520, y: -42, width: 118, height: 28, moving: { axis: 'x', distance: 295, speed: 1.0, phase: 2.1 } },
      { x: 4020, y: -96, width: 146, height: 28 },
      spikeOn(4020, -96, 28, 44, 38, 22),
      { x: 4255, y: -152, width: 96, height: 28 },
      { x: 4530, y: -178, width: 116, height: 28, goal: true },
      { x: 1065, y: 90, width: 96, height: 26, hazard: true },
      { x: 2115, y: -44, width: 92, height: 26, hazard: true },
      { x: 2445, y: 186, width: 132, height: 26, hazard: true },
      { x: 3520, y: -158, width: 104, height: 26, hazard: true },
    ],
  },
  {
    name: 'MAP 5 · 스카이 엘리베이터',
    worldWidth: 5100,
    floorStart: 40,
    floorEnd: 500,
    floorSpikes: [
      { x: 265, width: 48, height: 24 },
      { x: 420, width: 48, height: 24 },
    ],
    obstacles: [
      { x: 590, y: 268, width: 102, height: 28 },
      { x: 820, y: 134, width: 100, height: 28, moving: { axis: 'y', distance: 134, speed: 1.2 } },
      { x: 1080, y: -12, width: 148, height: 28 },
      spikeOn(1080, -12, 28, 46, 40, 22),
      { x: 1560, y: -18, width: 116, height: 28, moving: { axis: 'x', distance: 285, speed: 0.98 } },
      { x: 2055, y: -74, width: 146, height: 28 },
      spikeOn(2055, -74, 28, -45, 40, 22),
      { x: 2300, y: 90, width: 140, height: 28 },
      spikeOn(2300, 90, 28, 42, 38, 22),
      { x: 2545, y: 58, width: 98, height: 28, moving: { axis: 'y', distance: 150, speed: 1.28, phase: 1.4 } },
      { x: 2805, y: -108, width: 104, height: 28 },
      { x: 3305, y: -92, width: 114, height: 28, moving: { axis: 'x', distance: 295, speed: 1.04, phase: 0.5 } },
      { x: 3815, y: -136, width: 144, height: 28 },
      spikeOn(3815, -136, 28, 44, 38, 22),
      { x: 4065, y: 40, width: 98, height: 28 },
      { x: 4305, y: -4, width: 98, height: 28, moving: { axis: 'y', distance: 144, speed: 1.35, phase: 2.3 } },
      { x: 4570, y: -154, width: 96, height: 28 },
      { x: 4800, y: -184, width: 110, height: 28, goal: true },
      { x: 1560, y: 84, width: 140, height: 26, hazard: true },
      { x: 2300, y: -32, width: 92, height: 26, hazard: true },
      { x: 3305, y: -196, width: 112, height: 26, hazard: true },
      { x: 4065, y: -80, width: 96, height: 26, hazard: true },
    ],
  },
  {
    name: 'MAP 6 · 환승 고속도로',
    worldWidth: 5700,
    floorStart: 40,
    floorEnd: 480,
    floorSpikes: [
      { x: 255, width: 52, height: 24 },
      { x: 410, width: 48, height: 24 },
    ],
    obstacles: [
      { x: 580, y: 258, width: 100, height: 28 },
      { x: 1010, y: 204, width: 112, height: 28, moving: { axis: 'x', distance: 245, speed: 1.04, phase: 0 } },
      { x: 1620, y: 150, width: 112, height: 28, moving: { axis: 'x', distance: 250, speed: 1.04, phase: 3.14 } },
      { x: 2080, y: 98, width: 152, height: 28 },
      spikeOn(2080, 98, 28, 48, 42, 24),
      { x: 2540, y: 68, width: 112, height: 28, moving: { axis: 'x', distance: 270, speed: 1.1, phase: 0.6 } },
      { x: 3185, y: 12, width: 112, height: 28, moving: { axis: 'x', distance: 270, speed: 1.1, phase: 3.74 } },
      { x: 3670, y: -38, width: 150, height: 28 },
      spikeOn(3670, -38, 28, -46, 42, 24),
      { x: 4145, y: -56, width: 110, height: 28, moving: { axis: 'x', distance: 280, speed: 1.16, phase: 1.1 } },
      { x: 4805, y: -112, width: 108, height: 28, moving: { axis: 'x', distance: 275, speed: 1.16, phase: 4.24 } },
      { x: 5320, y: -168, width: 110, height: 28, goal: true },
      { x: 1315, y: 274, width: 132, height: 26, hazard: true },
      { x: 2540, y: -48, width: 98, height: 26, hazard: true },
      { x: 3185, y: 122, width: 124, height: 26, hazard: true },
      { x: 4475, y: -180, width: 102, height: 26, hazard: true },
    ],
  },
  {
    name: 'MAP 7 · 대각선 공중 철도',
    worldWidth: 5900,
    floorStart: 40,
    floorEnd: 480,
    floorSpikes: [
      { x: 255, width: 54, height: 24 },
      { x: 410, width: 52, height: 24 },
    ],
    obstacles: [
      { x: 585, y: 264, width: 98, height: 28 },
      { x: 1050, y: 148, width: 110, height: 28, moving: { axis: 'xy', distanceX: 260, distanceY: -98, speed: 1.02 } },
      { x: 1535, y: 26, width: 148, height: 28 },
      spikeOn(1535, 26, 28, 46, 42, 24),
      { x: 1775, y: 124, width: 98, height: 28, boost: true },
      { x: 2055, y: -110, width: 146, height: 28 },
      spikeOn(2055, -110, 28, -45, 42, 24),
      { x: 2555, y: -34, width: 112, height: 28, moving: { axis: 'xy', distanceX: 290, distanceY: 88, speed: 1.06, phase: 1.2 } },
      { x: 3060, y: 42, width: 102, height: 28, boost: true },
      { x: 3360, y: -146, width: 144, height: 28 },
      spikeOn(3360, -146, 28, 44, 42, 24),
      { x: 3880, y: -88, width: 108, height: 28, moving: { axis: 'x', distance: 310, speed: 1.14 } },
      { x: 4405, y: -120, width: 98, height: 28 },
      { x: 4885, y: -64, width: 108, height: 28, moving: { axis: 'xy', distanceX: 270, distanceY: -102, speed: 1.12, phase: 2.2 } },
      { x: 5490, y: -184, width: 110, height: 28, goal: true },
      { x: 1915, y: 16, width: 90, height: 26, hazard: true },
      { x: 3205, y: -38, width: 94, height: 26, hazard: true },
      { x: 3880, y: -194, width: 116, height: 26, hazard: true },
      { x: 4630, y: 16, width: 114, height: 26, hazard: true },
    ],
  },
  {
    name: 'MAP 8 · 그랜드 마스터',
    worldWidth: 6600,
    floorStart: 40,
    floorEnd: 460,
    floorSpikes: [
      { x: 245, width: 56, height: 26 },
      { x: 395, width: 56, height: 26 },
    ],
    obstacles: [
      { x: 560, y: 264, width: 92, height: 28 },
      { x: 1045, y: 214, width: 106, height: 28, moving: { axis: 'x', distance: 285, speed: 1.14 } },
      { x: 1545, y: 154, width: 92, height: 28, boost: true },
      { x: 1855, y: -74, width: 146, height: 28 },
      spikeOn(1855, -74, 28, 46, 44, 24),
      { x: 2390, y: -56, width: 106, height: 28, moving: { axis: 'x', distance: 330, speed: 1.12, phase: 0.4 } },
      { x: 3075, y: -26, width: 102, height: 28, moving: { axis: 'x', distance: 260, speed: 1.2, phase: 3.54 } },
      { x: 3555, y: 58, width: 144, height: 28 },
      spikeOn(3555, 58, 28, -44, 42, 24),
      { x: 3800, y: 28, width: 92, height: 28, moving: { axis: 'y', distance: 148, speed: 1.38 } },
      { x: 4065, y: -124, width: 144, height: 28 },
      spikeOn(4065, -124, 28, 44, 42, 24),
      { x: 4570, y: -42, width: 104, height: 28, moving: { axis: 'xy', distanceX: 295, distanceY: 96, speed: 1.16, phase: 1.6 } },
      { x: 5080, y: 46, width: 92, height: 28, boost: true },
      { x: 5385, y: -148, width: 142, height: 28 },
      spikeOn(5385, -148, 28, -44, 42, 24),
      { x: 5820, y: -154, width: 102, height: 28, moving: { axis: 'x', distance: 245, speed: 1.28, phase: 0.9 } },
      { x: 6280, y: -188, width: 108, height: 28, goal: true },
      { x: 1045, y: 90, width: 104, height: 26, hazard: true },
      { x: 1700, y: 36, width: 94, height: 26, hazard: true },
      { x: 2390, y: 56, width: 138, height: 26, hazard: true },
      { x: 3075, y: -146, width: 110, height: 26, hazard: true },
      { x: 4570, y: -162, width: 110, height: 26, hazard: true },
      { x: 5230, y: -42, width: 94, height: 26, hazard: true },
    ],
  },
  {
    name: 'MAP 9 · 지옥의 스카이웨이',
    worldWidth: 7200,
    floorStart: 40,
    floorEnd: 460,
    floorSpikes: [
      { x: 240, width: 58, height: 26 },
      { x: 390, width: 58, height: 26 },
    ],
    obstacles: [
      { x: 560, y: 264, width: 88, height: 28 },
      { x: 1035, y: 146, width: 98, height: 28, moving: { axis: 'xy', distanceX: 280, distanceY: -102, speed: 1.22 } },
      { x: 1550, y: 38, width: 140, height: 28 },
      spikeOn(1550, 38, 28, 44, 44, 24),
      { x: 1790, y: 138, width: 88, height: 28, boost: true },
      { x: 2095, y: -96, width: 140, height: 28 },
      spikeOn(2095, -96, 28, -44, 44, 24),
      { x: 2595, y: -74, width: 100, height: 28, moving: { axis: 'x', distance: 285, speed: 1.24, phase: 0 } },
      { x: 3250, y: -32, width: 98, height: 28, moving: { axis: 'x', distance: 265, speed: 1.24, phase: 3.14 } },
      { x: 3765, y: -22, width: 138, height: 28 },
      spikeOn(3765, -22, 28, 42, 42, 24),
      { x: 4025, y: 58, width: 90, height: 28, moving: { axis: 'y', distance: 148, speed: 1.42 } },
      { x: 4295, y: -116, width: 136, height: 28 },
      spikeOn(4295, -116, 28, -42, 42, 24),
      { x: 4840, y: -92, width: 98, height: 28, moving: { axis: 'x', distance: 340, speed: 1.2, phase: 0.9 } },
      { x: 5405, y: 84, width: 88, height: 28, boost: true },
      { x: 5710, y: -124, width: 136, height: 28 },
      spikeOn(5710, -124, 28, 42, 42, 24),
      { x: 6225, y: -102, width: 96, height: 28, moving: { axis: 'xy', distanceX: 295, distanceY: -64, speed: 1.26, phase: 2.0 } },
      { x: 6820, y: -190, width: 102, height: 28, goal: true },
      { x: 1945, y: 26, width: 90, height: 26, hazard: true },
      { x: 2595, y: 42, width: 120, height: 26, hazard: true },
      { x: 3250, y: -150, width: 112, height: 26, hazard: true },
      { x: 4840, y: -204, width: 114, height: 26, hazard: true },
      { x: 5560, y: -14, width: 90, height: 26, hazard: true },
    ],
  },
  {
    name: 'MAP 10 · 최종 극악 챌린지',
    worldWidth: 7800,
    floorStart: 40,
    floorEnd: 460,
    floorSpikes: [
      { x: 235, width: 60, height: 26 },
      { x: 385, width: 60, height: 26 },
    ],
    obstacles: [
      { x: 555, y: 262, width: 86, height: 28 },
      { x: 1020, y: 204, width: 96, height: 28, moving: { axis: 'x', distance: 270, speed: 1.28, phase: 0 } },
      { x: 1655, y: 134, width: 94, height: 28, moving: { axis: 'x', distance: 265, speed: 1.28, phase: 3.14 } },
      { x: 2170, y: 86, width: 136, height: 28 },
      spikeOn(2170, 86, 28, 42, 44, 24),
      { x: 2430, y: 10, width: 88, height: 28, moving: { axis: 'y', distance: 152, speed: 1.48 } },
      { x: 2700, y: -142, width: 134, height: 28 },
      spikeOn(2700, -142, 28, -41, 44, 24),
      { x: 3240, y: -38, width: 96, height: 28, moving: { axis: 'xy', distanceX: 315, distanceY: 104, speed: 1.26, phase: 1.1 } },
      { x: 3785, y: 78, width: 86, height: 28, boost: true },
      { x: 4090, y: -138, width: 136, height: 28 },
      spikeOn(4090, -138, 28, 42, 44, 24),
      { x: 4615, y: -116, width: 96, height: 28, moving: { axis: 'x', distance: 310, speed: 1.28, phase: 0.4 } },
      { x: 5345, y: -62, width: 94, height: 28, moving: { axis: 'x', distance: 310, speed: 1.28, phase: 3.54 } },
      { x: 5910, y: -16, width: 134, height: 28 },
      spikeOn(5910, -16, 28, -42, 44, 24),
      { x: 6165, y: 12, width: 86, height: 28, moving: { axis: 'y', distance: 148, speed: 1.52, phase: 2.0 } },
      { x: 6415, y: 88, width: 84, height: 28, boost: true },
      { x: 6885, y: -88, width: 94, height: 28, moving: { axis: 'xy', distanceX: 270, distanceY: -88, speed: 1.32, phase: 0.7 } },
      { x: 7450, y: -192, width: 98, height: 28, goal: true },
      { x: 1020, y: 86, width: 108, height: 26, hazard: true },
      { x: 3240, y: -158, width: 110, height: 26, hazard: true },
      { x: 3940, y: -26, width: 90, height: 26, hazard: true },
      { x: 4615, y: 6, width: 128, height: 26, hazard: true },
      { x: 5345, y: -182, width: 118, height: 26, hazard: true },
      { x: 6565, y: -22, width: 88, height: 26, hazard: true },
      { x: 6885, y: 34, width: 116, height: 26, hazard: true },
    ],
  },
];

function getCameraX(ballX, map) {
  if (typeof window === 'undefined') {
    return 0;
  }

  const target = ballX - window.innerWidth * 0.36;

  return Math.max(0, Math.min(Math.max(0, map.worldWidth - window.innerWidth), target));
}

function getStartPosition(map, containerHeight) {
  if (typeof window === 'undefined') {
    return { x: 120, y: 0 };
  }

  const height = containerHeight || window.innerHeight;
  const floorTop = height / 2 - floorHeight;

  return {
    x: map.floorStart + 80,
    y: floorTop - ballRadius,
  };
}

function getObstaclePosition(obstacle, time) {
  if (!obstacle.moving) {
    return obstacle;
  }

  const phase = obstacle.moving.phase ?? 0;
  const speed = obstacle.moving.speed * 0.93;
  const wave = Math.sin(time * speed + phase);

  if (obstacle.moving.axis === 'xy') {
    return {
      ...obstacle,
      x: obstacle.x + wave * (obstacle.moving.distanceX ?? obstacle.moving.distance ?? 0),
      y: obstacle.y + wave * (obstacle.moving.distanceY ?? 0),
    };
  }

  const offset = wave * obstacle.moving.distance;

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
  const [unlockedLevel, setUnlockedLevel] = useState(0);
  const [clearedCount, setClearedCount] = useState(0);
  const [ball, setBall] = useState({ x: 120, y: 0, rotation: 0 });
  const [cameraX, setCameraX] = useState(0);
  const [worldTime, setWorldTime] = useState(0);
  const [hud, setHud] = useState({ vx: 220, vy: -760, deaths: 0 });
  const [success, setSuccess] = useState(null);
  const [activeTouchDir, setActiveTouchDir] = useState('');
  const currentMap = maps[level];
  const pageRef = useRef(null);
  const ballRef = useRef({ x: 120, y: 0, rotation: 0 });
  const velocityRef = useRef({ x: 220, y: -760 });
  const levelRef = useRef(0);
  const unlockedLevelRef = useRef(0);
  const clearedCountRef = useRef(0);
  const pressedKeys = useRef(new Set());
  const touchPointersRef = useRef(new Map());
  const resetBallFnRef = useRef(null);
  const lastFrameTime = useRef(null);
  const animationFrame = useRef(null);
  const audioContext = useRef(null);
  const successCooldown = useRef(false);
  const deaths = useRef(0);
  const lastSoundTime = useRef(0);

  function syncTouchKeys() {
    pressedKeys.current.delete('TouchLeft');
    pressedKeys.current.delete('TouchRight');
    let latestDir = '';
    touchPointersRef.current.forEach((dir) => {
      pressedKeys.current.add(dir === 'left' ? 'TouchLeft' : 'TouchRight');
      latestDir = dir;
    });
    setActiveTouchDir(latestDir);
  }

  function pressTouchDir(event, dir) {
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    touchPointersRef.current.set(event.pointerId, dir);
    syncTouchKeys();
  }

  function releaseTouchDir(event) {
    event.stopPropagation();
    if (touchPointersRef.current.has(event.pointerId)) {
      touchPointersRef.current.delete(event.pointerId);
      syncTouchKeys();
    }
  }

  useEffect(() => {
    const gravity = 1650;
    const floorBouncePower = 780;
    const obstacleBouncePower = 865;
    const boostBouncePower = 1055;
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
      const startPosition = getStartPosition(map, pageRef.current?.clientHeight);
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

    function saveProgress(nextUnlocked, nextCleared, currentLevel) {
      try {
        window.localStorage.setItem(
          saveKey,
          JSON.stringify({
            unlockedLevel: nextUnlocked,
            clearedCount: nextCleared,
            lastLevel: currentLevel,
          }),
        );
      } catch {
        // Ignore storage write errors
      }
    }

    function showSuccessAndReset() {
      if (successCooldown.current) {
        return;
      }

      successCooldown.current = true;
      const clearedIndex = levelRef.current;
      const nextClearedCount = Math.max(clearedCountRef.current, clearedIndex + 1);
      const nextLevel = clearedIndex + 1;
      const hasNextMap = nextLevel < maps.length;
      const nextUnlocked = Math.max(unlockedLevelRef.current, hasNextMap ? nextLevel : maps.length - 1);
      const nextMap = hasNextMap ? maps[nextLevel] : maps[0];
      const startPosition = getStartPosition(nextMap, pageRef.current?.clientHeight);

      unlockedLevelRef.current = nextUnlocked;
      clearedCountRef.current = nextClearedCount;
      setUnlockedLevel(nextUnlocked);
      setClearedCount(nextClearedCount);

      setSuccess({
        left: startPosition.x - getCameraX(startPosition.x, nextMap),
        top: (pageRef.current?.clientHeight || window.innerHeight) / 2 + startPosition.y - 82,
      });
      playCollisionSound('goal', 1.8);
      levelRef.current = hasNextMap ? nextLevel : 0;
      setLevel(levelRef.current);
      saveProgress(nextUnlocked, nextClearedCount, levelRef.current);
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

      const containerHeight = pageRef.current?.clientHeight || window.innerHeight;
      const viewportHalfHeight = containerHeight / 2;
      const floorTop = viewportHalfHeight - floorHeight;
      const map = maps[levelRef.current];

      let currentBall = ballRef.current;
      let velocity = velocityRef.current;
      let xDirection = 0;

      if (pressedKeys.current.has('ArrowLeft') || pressedKeys.current.has('TouchLeft')) {
        xDirection -= 1;
      }

      if (pressedKeys.current.has('ArrowRight') || pressedKeys.current.has('TouchRight')) {
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

      if (map.floorSpikes) {
        for (const spike of map.floorSpikes) {
          if (died) break;
          const spikeBox = {
            x: spike.x,
            y: floorTop - (spike.height * 0.7) / 2,
            width: spike.width * 0.64,
            height: spike.height * 0.7,
          };
          if (collideCircleWithRect(currentBall, velocity, spikeBox).collided) {
            dieAndReset();
            died = true;
          }
        }
      }

      map.obstacles.forEach((obstacle) => {
        if (reachedGoal || died) {
          return;
        }

        const obstaclePosition = getObstaclePosition(obstacle, time);
        const collisionRect = obstacle.spike
          ? {
              ...obstaclePosition,
              y: obstaclePosition.y + obstaclePosition.height * 0.15,
              width: obstaclePosition.width * 0.64,
              height: obstaclePosition.height * 0.7,
            }
          : obstaclePosition;

        const result = collideCircleWithRect(currentBall, velocity, collisionRect);
        if (result.collided) {
          if (obstacle.hazard || obstacle.spike) {
            dieAndReset();
            died = true;
            return;
          }

          playCollisionSound(obstacle.goal ? 'goal' : obstacle.boost ? 'goal' : 'obstacle', 1.25);

          const bouncePower = obstacle.boost ? boostBouncePower : obstacleBouncePower;
          if (result.normal && result.normal.y < -0.45) {
            result.velocity.y = -bouncePower;
          } else if (result.normal && Math.abs(result.normal.x) > 0.5) {
            result.velocity.y = Math.min(result.velocity.y, -bouncePower * 0.62);
          }

          if (obstacle.goal && currentBall.y < obstaclePosition.y && velocity.y > 0) {
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

    resetBallFnRef.current = resetBall;
    try {
      const raw = window.localStorage.getItem(saveKey);
      if (raw) {
        const saved = JSON.parse(raw);
        const savedUnlocked = Math.max(0, Math.min(maps.length - 1, Number(saved.unlockedLevel) || 0));
        const savedCleared = Math.max(0, Math.min(maps.length, Number(saved.clearedCount) || 0));
        const savedLast = Math.max(0, Math.min(savedUnlocked, Number(saved.lastLevel) || 0));
        unlockedLevelRef.current = savedUnlocked;
        clearedCountRef.current = savedCleared;
        levelRef.current = savedLast;
        setUnlockedLevel(savedUnlocked);
        setClearedCount(savedCleared);
        setLevel(savedLast);
      }
    } catch {
      // Ignore storage read errors
    }
    resetBall();
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('pointerdown', getAudioContext);
    window.addEventListener('resize', resetBall);
    animationFrame.current = requestAnimationFrame(moveBall);

    return () => {
      resetBallFnRef.current = null;
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('pointerdown', getAudioContext);
      window.removeEventListener('resize', resetBall);
      cancelAnimationFrame(animationFrame.current);
    };
  }, []);

  function selectMap(nextIndex) {
    if (nextIndex > unlockedLevelRef.current) {
      return;
    }

    levelRef.current = nextIndex;
    setLevel(nextIndex);
    setSuccess(null);
    successCooldown.current = false;
    try {
      window.localStorage.setItem(
        saveKey,
        JSON.stringify({
          unlockedLevel: unlockedLevelRef.current,
          clearedCount: clearedCountRef.current,
          lastLevel: nextIndex,
        }),
      );
    } catch {
      // Ignore storage write errors
    }
    resetBallFnRef.current?.();
  }

  return (
    <div
      ref={pageRef}
      className={styles.page}
      style={{
        backgroundPosition: `${-cameraX * 0.18}px 0, ${-cameraX * 0.18}px 0, 0 0`,
      }}
      onPointerDown={(event) => {
        if (event.target.closest(`button, .${styles.hud}, .${styles.mapSelectorBar}`)) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const dir = event.clientX - rect.left < rect.width / 2 ? 'left' : 'right';
        event.currentTarget.setPointerCapture?.(event.pointerId);
        touchPointersRef.current.set(event.pointerId, dir);
        syncTouchKeys();
      }}
      onPointerMove={(event) => {
        if (!touchPointersRef.current.has(event.pointerId)) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const dir = event.clientX - rect.left < rect.width / 2 ? 'left' : 'right';
        if (touchPointersRef.current.get(event.pointerId) !== dir) {
          touchPointersRef.current.set(event.pointerId, dir);
          syncTouchKeys();
        }
      }}
      onPointerUp={releaseTouchDir}
      onPointerCancel={releaseTouchDir}
    >
      <div className={styles.hudWrap}>
        <div className={styles.hud}>
          <div className={styles.hudItem}>
            <span>POS</span>
            <strong>
              {Math.round(ball.x)}, {Math.round(ball.y)}
            </strong>
          </div>
          <div className={styles.hudItem}>
            <span>VEL</span>
            <strong>
              {Math.round(hud.vx)}, {Math.round(hud.vy)}
            </strong>
          </div>
          <div className={styles.hudItem}>
            <span>DEATHS</span>
            <strong>{hud.deaths}</strong>
          </div>
          <div className={`${styles.hudItem} ${styles.goalStatus}`}>
            <span>{currentMap.name}</span>
            <strong>{Math.round(ball.x)} / {currentMap.worldWidth}</strong>
          </div>
        </div>

        <div className={styles.mapBarRow}>
          <div className={styles.mapSelectorBar} aria-label="맵 선택">
            {maps.map((map, idx) => {
              const isLocked = idx > unlockedLevel;
              const isCleared = idx < clearedCount;
              const isActive = idx === level;
              const chipClasses = [
                styles.mapChip,
                isCleared ? styles.mapChipCleared : '',
                isActive ? styles.mapChipActive : '',
                isLocked ? styles.mapChipLocked : '',
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <button
                  key={map.name}
                  type="button"
                  disabled={isLocked}
                  className={chipClasses}
                  title={isLocked ? `MAP ${idx}를 먼저 깨야 열립니다` : map.name}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectMap(idx);
                  }}
                >
                  {isLocked ? `🔒 M${idx + 1}` : isCleared ? `M${idx + 1} ✓` : `M${idx + 1}`}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className={styles.topResetChip}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              resetBallFnRef.current?.();
            }}
            aria-label="다시 시작"
            title="현재 맵 처음부터 다시 시작"
          >
            ↻ 다시
          </button>
        </div>
      </div>

      {currentMap.obstacles.map((obstacle, index) => {
        if (!obstacle.moving) return null;

        if (obstacle.moving.axis === 'xy') {
          const dx = obstacle.moving.distanceX ?? obstacle.moving.distance ?? 0;
          const dy = obstacle.moving.distanceY ?? 0;
          const railLength = Math.hypot(dx * 2, dy * 2);
          const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
          return (
            <div
              key={`rail-${index}`}
              className={styles.movingRail}
              style={{
                width: `${railLength}px`,
                height: '4px',
                left: `${obstacle.x - cameraX}px`,
                top: `calc(50% + ${obstacle.y}px)`,
                transform: `translate(-50%, -50%) rotate(${angleDeg}deg)`,
              }}
            />
          );
        }

        const isVertical = obstacle.moving.axis === 'y';
        return (
          <div
            key={`rail-${index}`}
            className={isVertical ? `${styles.movingRail} ${styles.movingRailVertical}` : styles.movingRail}
            style={{
              width: isVertical ? '4px' : `${obstacle.moving.distance * 2}px`,
              height: isVertical ? `${obstacle.moving.distance * 2}px` : '4px',
              left: `${obstacle.x - cameraX}px`,
              top: `calc(50% + ${obstacle.y}px)`,
            }}
          />
        );
      })}

      {currentMap.obstacles.map((obstacle, index) => {
        const obstaclePosition = getObstaclePosition(obstacle, worldTime);

        if (obstacle.spike) {
          return (
            <div
              key={`spike-${index}`}
              className={styles.spikeBlock}
              style={{
                width: `${obstacle.width}px`,
                height: `${obstacle.height}px`,
                left: `${obstaclePosition.x - cameraX}px`,
                top: `calc(50% + ${obstaclePosition.y}px)`,
              }}
            >
              <SpikeCluster width={obstacle.width} height={obstacle.height} />
            </div>
          );
        }

        const variantClass =
          obstacle.goal ? styles.goalBlock :
          obstacle.hazard ? styles.hazardBlock :
          obstacle.boost ? styles.boostBlock :
          obstacle.moving ? styles.movingBlock :
          '';

        return (
          <div
            key={index}
            className={variantClass ? `${styles.obstacle} ${variantClass}` : styles.obstacle}
            style={{
              width: `${obstacle.width}px`,
              height: `${obstacle.height}px`,
              left: `${obstaclePosition.x - cameraX}px`,
              top: `calc(50% + ${obstaclePosition.y}px)`,
            }}
          />
        );
      })}

      {(currentMap.floorSpikes ?? []).map((spike, index) => (
        <div
          key={`floor-spike-${index}`}
          className={styles.floorSpike}
          style={{
            width: `${spike.width}px`,
            height: `${spike.height}px`,
            left: `${spike.x - cameraX}px`,
          }}
        >
          <SpikeCluster width={spike.width} height={spike.height} />
        </div>
      ))}

      {success && (
        <div
          className={styles.success}
          style={{
            left: `${success.left}px`,
            top: `${success.top}px`,
          }}
        >
          SUCCESS
        </div>
      )}

      <div
        className={styles.ball}
        style={{
          left: `${ball.x - cameraX}px`,
          top: `calc(50% + ${ball.y}px)`,
          transform: `translate(-50%, -50%) rotate(${ball.rotation}deg)`,
        }}
      />

      <div
        className={styles.floor}
        style={{
          left: `${currentMap.floorStart - cameraX}px`,
          width: `${currentMap.floorEnd - currentMap.floorStart}px`,
        }}
      />

      <div className={styles.touchControls} aria-label="모바일 이동 조작">
        <button
          type="button"
          className={activeTouchDir === 'left' ? `${styles.touchBtn} ${styles.touchBtnActive}` : styles.touchBtn}
          onPointerDown={(e) => pressTouchDir(e, 'left')}
          onPointerUp={releaseTouchDir}
          onPointerCancel={releaseTouchDir}
          onContextMenu={(e) => e.preventDefault()}
        >
          ◀ 왼쪽
        </button>
        <button
          type="button"
          className={activeTouchDir === 'right' ? `${styles.touchBtn} ${styles.touchBtnActive}` : styles.touchBtn}
          onPointerDown={(e) => pressTouchDir(e, 'right')}
          onPointerUp={releaseTouchDir}
          onPointerCancel={releaseTouchDir}
          onContextMenu={(e) => e.preventDefault()}
        >
          오른쪽 ▶
        </button>
      </div>
    </div>
  );
}
