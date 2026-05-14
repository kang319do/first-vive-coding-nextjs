import { useEffect, useRef, useState } from 'react';

const world = { width: 2600, height: 1700 };
const stageSeconds = 70;

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
    cooldown: 0.34,
    damage: 18,
    speed: 680,
    radius: 7,
    life: 0.95,
    pierce: 1,
  },
  {
    id: 'shotgun',
    displayName: '산탄총',
    displayDetail: '부채꼴로 여러 발을 발사',
    name: '산탄총',
    detail: '부채꼴로 여러 발을 발사',
    color: '#fb7185',
    cooldown: 0.68,
    damage: 13,
    speed: 610,
    radius: 6,
    life: 0.62,
    pierce: 1,
    count: 5,
    spread: 0.48,
  },
  {
    id: 'railgun',
    displayName: '레일건',
    displayDetail: '느리지만 강한 관통 한 방',
    name: '레일건',
    detail: '느리지만 강한 관통 한 방',
    color: '#f8fafc',
    cooldown: 0.92,
    damage: 42,
    speed: 920,
    radius: 5,
    life: 0.85,
    pierce: 5,
  },
  {
    id: 'boomer',
    displayName: '부메랑',
    displayDetail: '넓게 회전하며 관통 피해',
    name: '부메랑',
    detail: '넓게 회전하며 관통 피해',
    color: '#facc15',
    cooldown: 0.7,
    damage: 25,
    speed: 430,
    radius: 12,
    life: 1.22,
    pierce: 3,
  },
  {
    id: 'shockwave',
    displayName: '광역 충격파',
    displayDetail: '주변 전체를 터뜨리는 광역기',
    name: '오비탈 칼날',
    detail: '몸 주변을 도는 방어 무기',
    color: '#a78bfa',
    cooldown: 1.05,
    damage: 46,
    radius: 44,
    life: 0.34,
    blast: 132,
  },
  {
    id: 'flame',
    displayName: '화염방사기',
    displayDetail: '짧은 사거리의 지속 화염',
    name: '화염방사기',
    detail: '짧은 사거리의 지속 화염',
    color: '#f97316',
    cooldown: 0.12,
    damage: 8,
    speed: 330,
    radius: 16,
    life: 0.38,
    pierce: 2,
  },
  {
    id: 'frost',
    displayName: '냉동탄',
    displayDetail: '피해를 주고 적을 느리게 만듦',
    name: '냉동탄',
    detail: '피해를 주고 적을 느리게 만듦',
    color: '#7dd3fc',
    cooldown: 0.48,
    damage: 15,
    speed: 540,
    radius: 9,
    life: 0.98,
    pierce: 2,
    slow: 1.4,
  },
  {
    id: 'mine',
    displayName: '지뢰',
    displayDetail: '발밑에 폭발 함정을 설치',
    name: '지뢰',
    detail: '발밑에 폭발 함정을 설치',
    color: '#86efac',
    cooldown: 0.82,
    damage: 54,
    radius: 10,
    life: 4.2,
    blast: 92,
  },
];

const upgradePool = [
  { id: 'damage', name: '화력 +25%', text: '모든 공격 피해 증가' },
  { id: 'speed', name: '이동 속도 +12%', text: '위험한 포위망을 빠르게 탈출' },
  { id: 'firerate', name: '연사력 +18%', text: '자동 사격 간격 감소' },
  { id: 'magnet', name: '자석 +45', text: '경험치 보석 흡수 거리 증가' },
  { id: 'maxHp', name: '최대 HP +18', text: '체력 회복과 함께 최대치 증가' },
  { id: 'pierce', name: '관통 +1', text: '탄환이 더 많은 적을 통과' },
];

const extraUpgradePool = [
  { id: 'crit', name: '치명타 +8%', text: '가끔 2배 피해를 터뜨림' },
  { id: 'critPower', name: '치명 피해 +35%', text: '치명타가 더 강력해짐' },
  { id: 'armor', name: '방어력 +3', text: '부딪힐 때 받는 피해 감소' },
  { id: 'regen', name: '재생 +0.9', text: '초당 HP를 조금씩 회복' },
  { id: 'area', name: '범위 +16%', text: '폭발, 화염, 칼날 범위 증가' },
  { id: 'bulletSize', name: '탄 크기 +14%', text: '탄환 명중 판정이 넓어짐' },
  { id: 'xpGain', name: '학습력 +20%', text: '보석 경험치 획득량 증가' },
  { id: 'invincible', name: '회피 본능 +0.18초', text: '피격 후 무적 시간이 증가' },
  { id: 'heal', name: '응급 치료', text: '즉시 HP를 크게 회복' },
];

const allUpgradePool = [...upgradePool, ...extraUpgradePool];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const randomBetween = (min, max) => min + Math.random() * (max - min);

function getStage(game) {
  const nextStageIndex = Math.min(stages.length - 1, game.startStage + Math.floor(game.time / stageSeconds));
  if (nextStageIndex !== game.stageIndex) {
    game.stageIndex = nextStageIndex;
    game.stageFlash = 2.4;
    game.enemies = game.enemies.slice(-28);
    addParticles(game, game.player.x, game.player.y, stages[nextStageIndex].enemyColors[0], 34);
  }
  return stages[game.stageIndex];
}

function createGame(startStage = 0) {
  return {
    running: false,
    pausedForUpgrade: false,
    over: false,
    time: 0,
    score: 0,
    kills: 0,
    level: 1,
    xp: 0,
    nextXp: 16,
    shake: 0,
    stageIndex: startStage,
    startStage,
    stageFlash: 0,
    awakenFlash: 0,
    player: {
      x: world.width / 2,
      y: world.height / 2,
      radius: 18,
      hp: 100,
      maxHp: 100,
      speed: 245,
      damage: 1,
      fireRate: 1,
      magnet: 110,
      pierce: 1,
      critChance: 0.05,
      critDamage: 2,
      armor: 0,
      regen: 0,
      area: 1,
      bulletSize: 1,
      xpGain: 1,
      invincibleBonus: 0,
      weaponIndex: 0,
      cooldown: 0,
      invincible: 0,
    },
    enemies: [],
    bullets: [],
    gems: [],
    particles: [],
    spawnTimer: 0,
    eliteTimer: Math.max(13, 24 - startStage * 3),
    upgrades: [],
    weaponLevels: weapons.reduce((result, weapon) => ({ ...result, [weapon.id]: 0 }), {}),
    awakenedWeapons: {},
    sounds: [],
  };
}

function getWeaponUpgrade(game) {
  const weapon = weapons[game.player.weaponIndex];
  const level = game.weaponLevels[weapon.id] ?? 0;
  const isAwakened = Boolean(game.awakenedWeapons[weapon.id]);

  return {
    id: `weapon:${weapon.id}`,
    name: isAwakened ? `${weapon.displayName ?? weapon.name} 각성 강화` : `${weapon.displayName ?? weapon.name} 강화 ${Math.min(level + 1, 5)}/5`,
    text: isAwakened ? '각성 무기의 화력과 범위를 추가로 강화' : '같은 무기를 5번 강화하면 각성 효과 발동',
  };
}

function pickUpgrades(game) {
  return [
    getWeaponUpgrade(game),
    ...[...allUpgradePool].sort(() => Math.random() - 0.5).slice(0, 2),
  ];
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
  const isRunner = Math.random() < 0.26 + minute * 0.018 + stageBonus * 0.04;
  const isBrute = Math.random() < 0.08 + minute * 0.012 + stageBonus * 0.025;
  const baseHp = isBrute ? 60 : isRunner ? 20 : 32;
  const hp = Math.round((baseHp + minute * 8 + stageBonus * 9) * stage.hpFactor);
  const palette = stage.enemyColors;

  game.enemies.push({
    x: clamp(x, 30, world.width - 30),
    y: clamp(y, 30, world.height - 30),
    radius: isBrute ? 27 : isRunner ? 14 : 18,
    hp,
    maxHp: hp,
    damage: Math.round((isBrute ? 19 : 11) + stageBonus * 3),
    speed: ((isRunner ? 114 : 77) + minute * 5 + stageBonus * 5) * stage.speedFactor,
    color: isBrute ? palette[2] : isRunner ? palette[1] : palette[0],
    worth: isBrute ? 8 + stageBonus : isRunner ? 4 + stageBonus : 5 + stageBonus,
    slow: 0,
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
      game.shake = 16;
      queueSound(game, 'awake');
      addParticles(game, player.x, player.y, weapons.find((weapon) => weapon.id === weaponId)?.color ?? '#facc15', 42);
    } else {
      queueSound(game, 'upgrade');
    }
  }

  if (id === 'damage') player.damage *= 1.25;
  if (id === 'speed') player.speed *= 1.12;
  if (id === 'firerate') player.fireRate *= 1.18;
  if (id === 'magnet') player.magnet += 45;
  if (id === 'pierce') player.pierce += 1;
  if (id === 'crit') player.critChance = Math.min(0.65, player.critChance + 0.08);
  if (id === 'critPower') player.critDamage += 0.35;
  if (id === 'armor') player.armor += 3;
  if (id === 'regen') player.regen += 0.9;
  if (id === 'area') player.area *= 1.16;
  if (id === 'bulletSize') player.bulletSize *= 1.14;
  if (id === 'xpGain') player.xpGain *= 1.2;
  if (id === 'invincible') player.invincibleBonus += 0.18;
  if (id === 'heal') player.hp = Math.min(player.maxHp, player.hp + 55);
  if (id === 'maxHp') {
    player.maxHp += 18;
    player.hp = Math.min(player.maxHp, player.hp + 34);
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

function getPlayerDamage(player, baseDamage) {
  const isCritical = Math.random() < player.critChance;
  return baseDamage * player.damage * (isCritical ? player.critDamage : 1);
}

function getWeaponBoost(game, weapon) {
  const level = game.weaponLevels[weapon.id] ?? 0;
  const awakened = Boolean(game.awakenedWeapons[weapon.id]);
  return 1 + level * 0.14 + (awakened ? 1.35 : 0);
}

function queueSound(game, type) {
  if (game.sounds.length < 8) {
    game.sounds.push(type);
  }
}

function fireWeapon(game) {
  const player = game.player;
  const weapon = weapons[player.weaponIndex];
  const boost = getWeaponBoost(game, weapon);
  const awakened = Boolean(game.awakenedWeapons[weapon.id]);

  if (weapon.id === 'shockwave') {
    const ringCount = awakened ? 3 : 1;
    for (let ring = 0; ring < ringCount; ring += 1) {
      game.bullets.push({
        x: player.x,
        y: player.y,
        vx: 0,
        vy: 0,
        radius: weapon.radius * player.area,
        damage: getPlayerDamage(player, weapon.damage * boost * (ring === 0 ? 1 : 0.7)),
        life: weapon.life + ring * 0.12,
        maxLife: weapon.life + ring * 0.12,
        pierce: 99,
        color: ring === 0 ? '#fef3c7' : weapon.color,
        spin: 0,
        type: weapon.id,
        blast: weapon.blast * player.area * (awakened ? 1.85 + ring * 0.3 : 1),
        hitIds: new Set(),
      });
    }
    game.shake = awakened ? 15 : 7;
    addParticles(game, player.x, player.y, weapon.color, awakened ? 48 : 18);
    queueSound(game, 'boom');
    return;
  }

  if (weapon.id === 'mine') {
    const mineCount = awakened ? 7 : 1;
    for (let i = 0; i < mineCount; i += 1) {
      const angle = (Math.PI * 2 * i) / mineCount + game.time;
      const offset = awakened && i > 0 ? 74 : 0;
      game.bullets.push({
        x: player.x + Math.cos(angle) * offset,
        y: player.y + Math.sin(angle) * offset,
        vx: 0,
        vy: 0,
        radius: weapon.radius * player.bulletSize * (awakened ? 1.22 : 1),
        damage: getPlayerDamage(player, weapon.damage * boost),
        life: weapon.life + (awakened ? 1.8 : 0),
        pierce: 1,
        color: awakened ? '#bbf7d0' : weapon.color,
        spin: 0,
        type: weapon.id,
        blast: weapon.blast * player.area * (awakened ? 1.65 : 1),
        armed: 0.18,
      });
    }
    if (awakened) {
      addParticles(game, player.x, player.y, weapon.color, 24);
      queueSound(game, 'boom');
    }
    return;
  }

  const nearest = game.enemies
    .map((enemy) => ({ enemy, dist: distance(player, enemy) }))
    .sort((a, b) => a.dist - b.dist)[0]?.enemy;

  if (!nearest) return;

  const baseAngle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
  const count =
    awakened && weapon.id === 'shotgun' ? 18 :
    awakened && weapon.id === 'blaster' ? 5 :
    awakened && weapon.id === 'railgun' ? 3 :
    awakened && weapon.id === 'boomer' ? 6 :
    awakened && weapon.id === 'flame' ? 12 :
    awakened && weapon.id === 'frost' ? 10 :
    weapon.count ?? 1;
  const spread =
    awakened && weapon.id === 'shotgun' ? Math.PI * 2 :
    awakened && weapon.id === 'flame' ? Math.PI * 2 :
    awakened && weapon.id === 'frost' ? Math.PI * 2 :
    (weapon.spread ?? 0) * (awakened && weapon.id === 'shotgun' ? 1.18 : 1);

  for (let i = 0; i < count; i += 1) {
    const centerOffset = count === 1 ? 0 : i / (count - 1) - 0.5;
    const radialAngle = (Math.PI * 2 * i) / count + game.time * 0.35;
    const angle =
      awakened && ['shotgun', 'flame', 'frost', 'boomer'].includes(weapon.id) ? radialAngle :
      baseAngle + centerOffset * spread;
    const sideOffset = awakened && weapon.id === 'railgun' ? (i - 1) * 18 : 0;
    const sideAngle = angle + Math.PI / 2;

    game.bullets.push({
      x: player.x + Math.cos(sideAngle) * sideOffset,
      y: player.y + Math.sin(sideAngle) * sideOffset,
      vx: Math.cos(angle) * weapon.speed * (awakened && weapon.id === 'railgun' ? 1.22 : 1),
      vy: Math.sin(angle) * weapon.speed * (awakened && weapon.id === 'railgun' ? 1.22 : 1),
      radius: weapon.radius * player.bulletSize * (weapon.id === 'flame' ? player.area : 1) * (awakened ? 1.45 : 1),
      damage: getPlayerDamage(player, weapon.damage * boost),
      life: weapon.life * (awakened ? 1.28 : 1),
      pierce: weapon.pierce + player.pierce - 1 + (awakened ? 5 : 0),
      color: awakened ? '#fef3c7' : weapon.color,
      spin: 0,
      type: weapon.id,
      slow: (weapon.slow ?? 0) * (awakened && weapon.id === 'frost' ? 2.4 : 1),
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

function updateGame(game, input, canvas, delta) {
  if (!game.running || game.pausedForUpgrade || game.over) return;

  game.time += delta;
  game.shake = Math.max(0, game.shake - delta * 16);
  game.stageFlash = Math.max(0, game.stageFlash - delta);
  game.awakenFlash = Math.max(0, game.awakenFlash - delta);
  const stage = getStage(game);
  const player = game.player;
  const moveX = (input.right ? 1 : 0) - (input.left ? 1 : 0) + input.touch.x;
  const moveY = (input.down ? 1 : 0) - (input.up ? 1 : 0) + input.touch.y;
  const mouseX = input.mouse.active ? input.mouse.x : 0;
  const mouseY = input.mouse.active ? input.mouse.y : 0;
  const totalMoveX = moveX + mouseX;
  const totalMoveY = moveY + mouseY;
  const moveLength = Math.hypot(totalMoveX, totalMoveY) || 1;

  player.x = clamp(player.x + (totalMoveX / moveLength) * player.speed * delta, 24, world.width - 24);
  player.y = clamp(player.y + (totalMoveY / moveLength) * player.speed * delta, 24, world.height - 24);
  player.invincible = Math.max(0, player.invincible - delta);
  if (player.regen > 0 && player.hp > 0) {
    player.hp = Math.min(player.maxHp, player.hp + player.regen * delta);
  }

  const camera = {
    width: canvas.width,
    height: canvas.height,
    x: clamp(player.x - canvas.width / 2, 0, world.width - canvas.width),
    y: clamp(player.y - canvas.height / 2, 0, world.height - canvas.height),
  };

  game.spawnTimer -= delta;
  const spawnDelay = Math.max(0.1, (0.72 - game.time * 0.004) / stage.spawnFactor);
  while (game.spawnTimer <= 0) {
    spawnEnemy(game, camera);
    game.spawnTimer += spawnDelay;
  }

  game.eliteTimer -= delta;
  if (game.eliteTimer <= 0) {
    spawnElite(game, camera);
    game.eliteTimer = Math.max(11, (30 - game.time * 0.05) / stage.spawnFactor);
  }

  player.cooldown -= delta;
  const weapon = weapons[player.weaponIndex];
  if (player.cooldown <= 0) {
    fireWeapon(game);
    player.cooldown = (weapon.cooldown ?? 0.4) / player.fireRate;
  }

  updateOrbit(game, delta);

  game.bullets = game.bullets.filter((bullet) => {
    bullet.x += bullet.vx * delta;
    bullet.y += bullet.vy * delta;
    bullet.life -= delta;
    bullet.spin += delta * 14;
    bullet.armed = Math.max(0, (bullet.armed ?? 0) - delta);

    if (bullet.type === 'shockwave') {
      const progress = 1 - bullet.life / (bullet.maxLife ?? weapons.find((weapon) => weapon.id === 'shockwave')?.life ?? 0.34);
      bullet.radius = bullet.blast * clamp(progress, 0.18, 1);

      game.enemies.forEach((enemy) => {
        if (!bullet.hitIds.has(enemy) && distance(bullet, enemy) < bullet.radius + enemy.radius) {
          enemy.hp -= bullet.damage;
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
          enemy.hp -= bullet.damage;
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
        enemy.hp -= bullet.damage;
        enemy.slow = Math.max(enemy.slow ?? 0, bullet.slow ?? 0);
        bullet.pierce -= 1;
        game.shake = 3;
        addParticles(game, enemy.x, enemy.y, bullet.color, bullet.awakened ? 12 : bullet.type === 'flame' ? 2 : 5);
        if (bullet.awakened && ['railgun', 'boomer'].includes(bullet.type)) {
          game.enemies.forEach((nearby) => {
            if (nearby !== enemy && distance(enemy, nearby) < 76) {
              nearby.hp -= bullet.damage * 0.28;
              addParticles(game, nearby.x, nearby.y, bullet.color, 3);
            }
          });
        }
        if (bullet.awakened && bullet.type === 'frost') {
          game.enemies.forEach((nearby) => {
            if (distance(enemy, nearby) < 118) nearby.slow = Math.max(nearby.slow ?? 0, 1.8);
          });
        }
        if (Math.random() < 0.18) queueSound(game, 'hit');
        if (bullet.pierce <= 0) return false;
      }
    }

    return bullet.life > 0 && bullet.x > 0 && bullet.y > 0 && bullet.x < world.width && bullet.y < world.height;
  });

  game.enemies = game.enemies.filter((enemy) => {
    const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    const slowFactor = enemy.slow > 0 ? 0.45 : 1;
    enemy.slow = Math.max(0, (enemy.slow ?? 0) - delta);
    enemy.x += Math.cos(angle) * enemy.speed * slowFactor * delta;
    enemy.y += Math.sin(angle) * enemy.speed * slowFactor * delta;

    if (distance(player, enemy) < player.radius + enemy.radius) {
      if (player.invincible <= 0) {
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
    game.score += enemy.elite ? 120 : 35;
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
        game.nextXp = Math.round(game.nextXp * 1.32 + 8);
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

  game.enemies.forEach((enemy) => {
    const hpRatio = enemy.hp / enemy.maxHp;
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
    context.fillStyle = '#111827';
    context.fillRect(enemy.x - enemy.radius, enemy.y + enemy.radius + 8, enemy.radius * 2, 5);
    context.fillStyle = '#22c55e';
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

  context.fillStyle = player.invincible > 0 ? '#fef08a' : '#60a5fa';
  context.strokeStyle = '#eff6ff';
  context.lineWidth = 4;
  if (game.awakenedWeapons[weapons[player.weaponIndex]?.id]) {
    context.strokeStyle = '#facc15';
    context.lineWidth = 3;
    context.globalAlpha = 0.72;
    context.beginPath();
    context.arc(player.x, player.y, 34 + Math.sin(game.time * 8) * 4, 0, Math.PI * 2);
    context.stroke();
    context.globalAlpha = 1;
    context.strokeStyle = '#eff6ff';
    context.lineWidth = 4;
  }
  context.beginPath();
  context.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.fillStyle = '#1e293b';
  context.fillRect(player.x - 6, player.y - 8, 4, 4);
  context.fillRect(player.x + 3, player.y - 8, 4, 4);

  game.particles.forEach((particle) => {
    context.globalAlpha = clamp(particle.life * 2, 0, 1);
    context.fillStyle = particle.color;
    context.beginPath();
    context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;
  });

  context.restore();

  if (game.stageFlash > 0) {
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

  if (game.awakenFlash > 0) {
    const weapon = weapons[game.player.weaponIndex];
    context.save();
    context.globalAlpha = Math.min(1, game.awakenFlash / 1.6);
    context.fillStyle = 'rgba(88, 28, 135, 0.78)';
    context.fillRect(0, canvas.height / 2 - 70, canvas.width, 140);
    context.fillStyle = '#fef3c7';
    context.textAlign = 'center';
    context.font = '900 38px Arial';
    context.fillText('WEAPON AWAKENED', canvas.width / 2, canvas.height / 2 - 8);
    context.font = '900 18px Arial';
    context.fillText(weapon.displayName ?? weapon.name, canvas.width / 2, canvas.height / 2 + 30);
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
  });
  const audioRef = useRef(null);
  const [selectedStage, setSelectedStage] = useState(0);
  const [hud, setHud] = useState(() => gameRef.current);
  const [version, setVersion] = useState(0);

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
      switch: [360, 540, 0.08, 'triangle', 0.045],
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

  function resetGame(stageIndex = selectedStage) {
    getAudioContext();
    gameRef.current = createGame(stageIndex);
    gameRef.current.running = true;
    queueSound(gameRef.current, 'level');
    setSelectedStage(stageIndex);
    setHud({ ...gameRef.current });
    setVersion((current) => current + 1);
  }

  function chooseUpgrade(id) {
    getAudioContext();
    applyUpgrade(gameRef.current, id);
    setHud({ ...gameRef.current });
  }

  function setWeapon(index) {
    getAudioContext();
    gameRef.current.player.weaponIndex = index;
    gameRef.current.player.cooldown = 0;
    queueSound(gameRef.current, 'switch');
    setHud({ ...gameRef.current, player: { ...gameRef.current.player } });
  }

  function selectWeaponByOffset(offset) {
    const currentIndex = gameRef.current.player.weaponIndex;
    const nextIndex = (currentIndex + offset + weapons.length) % weapons.length;
    setWeapon(nextIndex);
  }

  function isGameUiPointer(event) {
    return Boolean(event.target.closest('button, .startOverlay, .upgradeOverlay, .mobileGameHud'));
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
      updateGame(gameRef.current, inputRef.current, canvas, delta);
      drainSounds(gameRef.current);
      drawGame(context, gameRef.current, canvas);
      setHud({ ...gameRef.current, player: { ...gameRef.current.player } });
      frameRef.current = requestAnimationFrame(loop);
    }

    function handleKeyDown(event) {
      const key = event.key.toLowerCase();
      if (['arrowup', 'w'].includes(key)) inputRef.current.up = true;
      if (['arrowdown', 's'].includes(key)) inputRef.current.down = true;
      if (['arrowleft', 'a'].includes(key)) inputRef.current.left = true;
      if (['arrowright', 'd'].includes(key)) inputRef.current.right = true;
      if (Number(key) >= 1 && Number(key) <= weapons.length) setWeapon(Number(key) - 1);
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

  return (
    <section className="survivorPage">
      <div className="survivorTop">
        <div>
          <span>RPG Survival</span>
          <h1>탕탕 특공대</h1>
        </div>
        <button type="button" onClick={() => resetGame()}>
          {hud.running ? '다시 시작' : '게임 시작'}
        </button>
      </div>

      <div className="survivorLayout">
        <aside className="survivorPanel">
          <div className="statBox">
            <span>MAP</span>
            <strong>{stage.name}</strong>
            <em>난이도 {stage.level}</em>
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
                  gameRef.current = createGame(index);
                  setHud({ ...gameRef.current });
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

          <div className="weaponList">
            {weapons.map((weapon, index) => (
              <button
                key={weapon.id}
                type="button"
                className={`${player.weaponIndex === index ? 'active' : ''} ${hud.awakenedWeapons[weapon.id] ? 'awakened' : ''}`}
                onClick={() => setWeapon(index)}
              >
                <span style={{ background: weapon.color }}>{index + 1}</span>
                <strong>{weapon.displayName ?? weapon.name}</strong>
                <em>
                  {hud.awakenedWeapons[weapon.id] ? 'AWAKEN' : `LV ${hud.weaponLevels[weapon.id] ?? 0}/5`} · {weapon.displayDetail ?? weapon.detail}
                </em>
              </button>
            ))}
          </div>
        </aside>

        <div
          className="arenaWrap"
          onPointerDown={(event) => {
            if (event.pointerType === 'mouse' && !isGameUiPointer(event)) {
              event.currentTarget.setPointerCapture(event.pointerId);
              getAudioContext();
              updateMouseMove(event);
            }
          }}
          onPointerMove={(event) => {
            if (inputRef.current.mouse.active) {
              updateMouseMove(event);
            }
          }}
          onPointerUp={stopMouseMove}
          onPointerCancel={stopMouseMove}
          onPointerLeave={stopMouseMove}
        >
          <canvas ref={canvasRef} className="arenaCanvas" />
          <div className="mobileGameHud">
            <span>{stage.name}</span>
            <strong>{minutes}:{seconds}</strong>
            <em>HP {Math.ceil(player.hp)}</em>
          </div>
          {!hud.running && !hud.over && (
            <div className="startOverlay">
              <strong>{stages[selectedStage].name} 진입</strong>
              <p>WASD 또는 방향키로 이동하세요. 숫자키 1-{weapons.length}로 무기를 즉시 바꿀 수 있습니다.</p>
              <button type="button" onClick={() => resetGame()}>시작</button>
            </div>
          )}
          {hud.pausedForUpgrade && (
            <div className="upgradeOverlay">
              <strong>레벨 업!</strong>
              <div>
                {hud.upgrades.map((upgrade) => (
                  <button key={upgrade.id} type="button" onClick={() => chooseUpgrade(upgrade.id)}>
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
              <p>{minutes}:{seconds} 생존, {hud.kills} 처치, 점수 {hud.score}</p>
              <button type="button" onClick={() => resetGame()}>다시 도전</button>
            </div>
          )}
        </div>
      </div>

      <div
        className="touchStick"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const x = (event.clientX - rect.left - rect.width / 2) / (rect.width / 2);
          const y = (event.clientY - rect.top - rect.height / 2) / (rect.height / 2);
          const length = Math.max(1, Math.hypot(x, y));
          inputRef.current.touch = { x: x / length, y: y / length };
        }}
        onPointerUp={() => {
          inputRef.current.touch = { x: 0, y: 0 };
        }}
        onPointerCancel={() => {
          inputRef.current.touch = { x: 0, y: 0 };
        }}
      >
        <span />
      </div>

      <div className="mobileWeaponPad" aria-label="무기 변경">
        <button type="button" onClick={() => selectWeaponByOffset(-1)} aria-label="이전 무기">
          ‹
        </button>
        <div>
          <strong>{currentWeapon.displayName ?? currentWeapon.name}</strong>
          <span>{currentWeaponAwakened ? 'AWAKEN' : `LV ${currentWeaponLevel}/5`} · {cooldownText}</span>
          <i className="mobileCooldown"><b style={{ width: `${cooldownRatio}%` }} /></i>
        </div>
        <button type="button" onClick={() => selectWeaponByOffset(1)} aria-label="다음 무기">
          ›
        </button>
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
        .startOverlay button {
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
          place-content: center;
          gap: 14px;
          padding: 24px;
          background: rgba(15, 23, 42, 0.72);
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

        @media (max-width: 640px) {
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
            width: 116px;
            height: 116px;
            position: fixed;
            right: 18px;
            bottom: 18px;
            z-index: 20;
            display: grid;
            place-items: center;
            border: 1px solid rgba(226, 232, 240, 0.24);
            border-radius: 50%;
            background: rgba(15, 23, 42, 0.62);
            touch-action: none;
          }

          .touchStick span {
            width: 42px;
            height: 42px;
            border-radius: 50%;
            background: #facc15;
            box-shadow: 0 0 0 8px rgba(250, 204, 21, 0.16);
          }

          .mobileWeaponPad {
            width: min(188px, calc(50vw - 20px));
            min-height: 86px;
            position: fixed;
            left: 18px;
            bottom: 18px;
            z-index: 20;
            display: grid;
            grid-template-columns: 46px minmax(0, 1fr) 46px;
            align-items: center;
            gap: 7px;
            padding: 8px;
            border: 1px solid rgba(226, 232, 240, 0.24);
            border-radius: 8px;
            background: rgba(15, 23, 42, 0.72);
            backdrop-filter: blur(10px);
          }

          .mobileWeaponPad button {
            width: 46px;
            height: 58px;
            border: 0;
            border-radius: 8px;
            background: #facc15;
            color: #111827;
            font-size: 30px;
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
