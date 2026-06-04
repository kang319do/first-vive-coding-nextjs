import { useEffect, useMemo, useRef, useState } from 'react';

const arenaLimit = 18;
const botCount = 5;
const targetKos = 15;

const heroes = [
  {
    id: 'blade',
    name: 'Blade Ace',
    role: '근접 돌격',
    color: '#facc15',
    accent: '#ef4444',
    hp: 135,
    speed: 6.1,
    basic: { damage: 12, range: 2.35, cooldown: 0.48 },
    abilities: [
      { key: '1', name: 'Triple Slash', text: '가까운 적에게 3연속 베기', cooldown: 5, kind: 'burst', damage: 34, range: 3.2 },
      { key: '2', name: 'Dash Strike', text: '앞으로 돌진하며 큰 피해', cooldown: 7, kind: 'dash', damage: 28, range: 4.4 },
      { key: '3', name: 'Guard Break', text: '적을 밀치고 둔화', cooldown: 8, kind: 'stun', damage: 22, range: 3 },
      { key: 'R', name: 'Blade Storm', text: '주변 전부를 베는 궁극기', cooldown: 18, kind: 'ultimate', damage: 58, range: 5.8 },
    ],
  },
  {
    id: 'volt',
    name: 'Volt Runner',
    role: '원거리 기동',
    color: '#38bdf8',
    accent: '#22c55e',
    hp: 108,
    speed: 7.2,
    basic: { damage: 9, range: 7.5, cooldown: 0.62 },
    abilities: [
      { key: '1', name: 'Arc Bolt', text: '전기탄 발사', cooldown: 4, kind: 'projectile', damage: 24, range: 9.5 },
      { key: '2', name: 'Blink', text: '바라보는 방향으로 순간 이동', cooldown: 7, kind: 'blink', damage: 0, range: 4.8 },
      { key: '3', name: 'Static Field', text: '주변 적 지속 피해', cooldown: 9, kind: 'field', damage: 24, range: 4.5 },
      { key: 'R', name: 'Thunder Drop', text: '가장 가까운 적에게 낙뢰', cooldown: 17, kind: 'snipe', damage: 72, range: 12 },
    ],
  },
  {
    id: 'aegis',
    name: 'Aegis Titan',
    role: '방어형 탱커',
    color: '#14b8a6',
    accent: '#f97316',
    hp: 170,
    speed: 5.1,
    basic: { damage: 10, range: 2.5, cooldown: 0.7 },
    abilities: [
      { key: '1', name: 'Shield Bash', text: '방패로 밀쳐내기', cooldown: 5, kind: 'stun', damage: 26, range: 3 },
      { key: '2', name: 'Fortify', text: '체력 회복과 방어 태세', cooldown: 10, kind: 'heal', damage: 0, range: 0 },
      { key: '3', name: 'Hammer Quake', text: '넓은 바닥 충격파', cooldown: 9, kind: 'field', damage: 32, range: 4.2 },
      { key: 'R', name: 'Iron Arena', text: '주변 적 전부 강타', cooldown: 20, kind: 'ultimate', damage: 64, range: 5.2 },
    ],
  },
  {
    id: 'ember',
    name: 'Ember Witch',
    role: '화염 마법',
    color: '#fb923c',
    accent: '#a855f7',
    hp: 116,
    speed: 6,
    basic: { damage: 11, range: 6.6, cooldown: 0.66 },
    abilities: [
      { key: '1', name: 'Fireball', text: '폭발하는 화염구', cooldown: 4, kind: 'projectile', damage: 30, range: 8.8 },
      { key: '2', name: 'Flame Step', text: '이동하며 주변을 태움', cooldown: 8, kind: 'dash', damage: 22, range: 4 },
      { key: '3', name: 'Burn Ring', text: '주변 광역 화염', cooldown: 9, kind: 'field', damage: 35, range: 4.8 },
      { key: 'R', name: 'Meteor Call', text: '큰 폭발을 소환', cooldown: 19, kind: 'ultimate', damage: 76, range: 6.2 },
    ],
  },
];

const botNames = ['Rune Bot', 'Iron Bot', 'Spark Bot', 'Shade Bot', 'Crush Bot'];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function rotateTowardDirection(player, targetX, targetZ, amount = 1) {
  const currentX = player.directionX || 0;
  const currentZ = player.directionZ || -1;
  const nextX = currentX + (targetX - currentX) * amount;
  const nextZ = currentZ + (targetZ - currentZ) * amount;
  const length = Math.hypot(nextX, nextZ) || 1;
  player.directionX = nextX / length;
  player.directionZ = nextZ / length;
}

function makeCooldowns(hero) {
  return hero.abilities.map(() => 0);
}

function createBot(index, wave = 1) {
  const angle = (Math.PI * 2 * index) / botCount + Math.random() * 0.4;
  const radius = 9 + Math.random() * 7;
  const maxHp = 72 + wave * 9 + index * 5;
  return {
    id: `${Date.now()}-${index}-${Math.random()}`,
    name: botNames[index % botNames.length],
    x: Math.cos(angle) * radius,
    z: Math.sin(angle) * radius,
    hp: maxHp,
    maxHp,
    damage: 8 + wave * 1.4,
    speed: 2.5 + Math.random() * 0.6 + wave * 0.05,
    attackCooldown: 0.6 + Math.random(),
    hitTimer: 0,
    respawn: 0,
  };
}

function createGame(heroId = 'blade') {
  const hero = heroes.find((item) => item.id === heroId) ?? heroes[0];
  return {
    running: false,
    heroId,
    wave: 1,
    kos: 0,
    streak: 0,
    message: '영웅을 고르고 전장 시작을 누르세요.',
    player: {
      x: 0,
      z: 0,
      hp: hero.hp,
      maxHp: hero.hp,
      shieldTimer: 0,
      basicCooldown: 0,
      directionX: 0,
      directionZ: -1,
      velocityX: 0,
      velocityZ: 0,
      hitTimer: 0,
    },
    cooldowns: makeCooldowns(hero),
    bots: Array.from({ length: botCount }, (_, index) => createBot(index, 1)),
    projectiles: [],
    effects: [],
    ended: false,
  };
}

function getHero(game) {
  return heroes.find((hero) => hero.id === game.heroId) ?? heroes[0];
}

function findNearestBot(game, range = Infinity) {
  return game.bots
    .filter((bot) => bot.hp > 0 && distance(game.player, bot) <= range)
    .sort((a, b) => distance(game.player, a) - distance(game.player, b))[0];
}

function pushEffect(game, x, z, color, radius = 1.4, life = 0.32, kind = 'ring', angle = 0) {
  game.effects.push({ id: `${Date.now()}-${Math.random()}`, x, z, color, radius, life, maxLife: life, kind, angle });
}

function damageBot(game, bot, amount, knockback = 0) {
  if (!bot || bot.hp <= 0) return;
  const before = bot.hp;
  bot.hp = Math.max(0, bot.hp - amount);
  bot.hitTimer = 0.16;
  if (knockback > 0) {
    const dx = bot.x - game.player.x;
    const dz = bot.z - game.player.z;
    const len = Math.hypot(dx, dz) || 1;
    bot.x = clamp(bot.x + (dx / len) * knockback, -arenaLimit, arenaLimit);
    bot.z = clamp(bot.z + (dz / len) * knockback, -arenaLimit, arenaLimit);
  }
  if (before > 0 && bot.hp <= 0) {
    game.kos += 1;
    game.streak += 1;
    game.player.hp = Math.min(game.player.maxHp, game.player.hp + 12);
    bot.respawn = 2.2;
    game.message = `${bot.name} KO! 연속 ${game.streak}킬`;
  }
}

function damageBotsInRange(game, x, z, range, damage, knockback = 0) {
  game.bots.forEach((bot) => {
    if (bot.hp > 0 && Math.hypot(bot.x - x, bot.z - z) <= range) damageBot(game, bot, damage, knockback);
  });
}

function castAbility(game, index) {
  const hero = getHero(game);
  const ability = hero.abilities[index];
  if (!game.running || game.ended || !ability || game.cooldowns[index] > 0) return;

  game.cooldowns[index] = ability.cooldown;
  const target = findNearestBot(game, ability.range || 7);
  const dirX = game.player.directionX || 0;
  const dirZ = game.player.directionZ || -1;

  if (ability.kind === 'projectile') {
    const aim = target ? { x: target.x - game.player.x, z: target.z - game.player.z } : { x: dirX, z: dirZ };
    const len = Math.hypot(aim.x, aim.z) || 1;
    game.projectiles.push({
      id: `${Date.now()}-${Math.random()}`,
      x: game.player.x,
      z: game.player.z,
      vx: (aim.x / len) * 10,
      vz: (aim.z / len) * 10,
      damage: ability.damage,
      radius: 0.45,
      life: 1.25,
      color: hero.accent,
      heroId: hero.id,
      blast: hero.id === 'ember' ? 2.1 : 0,
    });
    pushEffect(game, game.player.x + dirX * 0.7, game.player.z + dirZ * 0.7, hero.accent, 1.1, 0.28, hero.id === 'ember' ? 'flameBurst' : 'spark', Math.atan2(dirZ, dirX));
    game.message = `${ability.name} 발사`;
    return;
  }

  if (ability.kind === 'dash' || ability.kind === 'blink') {
    const distanceValue = ability.range;
    game.player.x = clamp(game.player.x + dirX * distanceValue, -arenaLimit, arenaLimit);
    game.player.z = clamp(game.player.z + dirZ * distanceValue, -arenaLimit, arenaLimit);
    pushEffect(game, game.player.x, game.player.z, hero.accent, 2.2, 0.42, ability.kind === 'blink' ? 'blink' : 'slash', Math.atan2(dirZ, dirX));
    if (ability.damage > 0) damageBotsInRange(game, game.player.x, game.player.z, 2.4, ability.damage, 1.2);
    game.message = ability.kind === 'blink' ? '순간 이동!' : `${ability.name}!`;
    return;
  }

  if (ability.kind === 'heal') {
    game.player.hp = Math.min(game.player.maxHp, game.player.hp + 46);
    game.player.shieldTimer = 4.5;
    pushEffect(game, game.player.x, game.player.z, hero.color, 3, 0.55, 'shield');
    game.message = '방어 태세: 피해 감소';
    return;
  }

  if (ability.kind === 'snipe') {
    const mark = target ?? findNearestBot(game, Infinity);
    if (mark) {
      damageBot(game, mark, ability.damage, 0.8);
      pushEffect(game, mark.x, mark.z, hero.color, 2.6, 0.5, 'lightning');
      game.message = `${ability.name}!`;
    }
    return;
  }

  if (ability.kind === 'field' || ability.kind === 'ultimate' || ability.kind === 'burst' || ability.kind === 'stun') {
    const range = ability.range;
    const damage = ability.damage;
    const knockback = ability.kind === 'stun' ? 1.8 : ability.kind === 'ultimate' ? 1.2 : 0.6;
    damageBotsInRange(game, game.player.x, game.player.z, range, damage, knockback);
    const effectKind =
      ability.kind === 'ultimate' && hero.id === 'ember' ? 'meteor' :
      ability.kind === 'ultimate' && hero.id === 'blade' ? 'bladeStorm' :
      ability.kind === 'ultimate' ? 'ultimate' :
      hero.id === 'aegis' ? 'quake' :
      hero.id === 'ember' ? 'flameBurst' :
      hero.id === 'volt' ? 'spark' :
      'slash';
    pushEffect(game, game.player.x, game.player.z, ability.kind === 'ultimate' ? hero.accent : hero.color, range, ability.kind === 'ultimate' ? 0.7 : 0.46, effectKind, Math.atan2(dirZ, dirX));
    game.message = `${ability.name}!`;
  }
}

function updateGame(game, delta, keys, mouseAimActive = false) {
  if (!game.running || game.ended) return;
  const hero = getHero(game);
  const player = game.player;

  const moveX = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
  const moveZ = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
  const moveLen = Math.hypot(moveX, moveZ) || 1;
  const shiftMoving = Boolean(keys.shift && (moveX || moveZ));
  const moveDirX = moveX / moveLen;
  const moveDirZ = moveZ / moveLen;
  const targetSpeed = moveX || moveZ ? hero.speed * (shiftMoving ? 1.04 : 1) : 0;
  const targetVelocityX = (moveX || moveZ) ? moveDirX * targetSpeed : 0;
  const targetVelocityZ = (moveX || moveZ) ? moveDirZ * targetSpeed : 0;
  const acceleration = 1 - Math.exp(-delta * (shiftMoving ? 6.2 : 11.5));
  player.velocityX = (player.velocityX ?? 0) + (targetVelocityX - (player.velocityX ?? 0)) * acceleration;
  player.velocityZ = (player.velocityZ ?? 0) + (targetVelocityZ - (player.velocityZ ?? 0)) * acceleration;

  if (moveX || moveZ) {
    if (!mouseAimActive) {
      const velocityLength = Math.hypot(player.velocityX ?? 0, player.velocityZ ?? 0);
      const faceX = velocityLength > 0.08 ? player.velocityX / velocityLength : moveDirX;
      const faceZ = velocityLength > 0.08 ? player.velocityZ / velocityLength : moveDirZ;
      const turnAmount = shiftMoving ? 1 - Math.exp(-delta * 7.5) : 1 - Math.exp(-delta * 18);
      rotateTowardDirection(player, faceX, faceZ, turnAmount);
    }
  }
  player.x = clamp(player.x + player.velocityX * delta, -arenaLimit, arenaLimit);
  player.z = clamp(player.z + player.velocityZ * delta, -arenaLimit, arenaLimit);
  if (Math.abs(player.x) >= arenaLimit) player.velocityX = 0;
  if (Math.abs(player.z) >= arenaLimit) player.velocityZ = 0;

  player.basicCooldown = Math.max(0, player.basicCooldown - delta);
  player.shieldTimer = Math.max(0, player.shieldTimer - delta);
  player.hitTimer = Math.max(0, player.hitTimer - delta);
  game.cooldowns = game.cooldowns.map((value) => Math.max(0, value - delta));

  const basicTarget = findNearestBot(game, hero.basic.range);
  if (basicTarget && player.basicCooldown <= 0) {
    player.basicCooldown = hero.basic.cooldown;
    damageBot(game, basicTarget, hero.basic.damage, 0.25);
    pushEffect(game, basicTarget.x, basicTarget.z, hero.color, 0.9, 0.22, hero.id === 'blade' ? 'slash' : 'hit');
  }

  game.projectiles.forEach((projectile) => {
    projectile.x += projectile.vx * delta;
    projectile.z += projectile.vz * delta;
    projectile.life -= delta;
    game.bots.forEach((bot) => {
      if (projectile.hit || bot.hp <= 0) return;
      if (Math.hypot(projectile.x - bot.x, projectile.z - bot.z) < projectile.radius + 0.55) {
        damageBot(game, bot, projectile.damage, 0.75);
        if (projectile.blast) damageBotsInRange(game, bot.x, bot.z, projectile.blast, projectile.damage * 0.45, 0.5);
        pushEffect(game, bot.x, bot.z, projectile.color, projectile.blast || 1.2, 0.36, projectile.heroId === 'ember' ? 'flameBurst' : 'spark');
        projectile.hit = true;
      }
    });
  });
  game.projectiles = game.projectiles.filter((projectile) => !projectile.hit && projectile.life > 0 && Math.hypot(projectile.x, projectile.z) < arenaLimit + 8);

  game.bots.forEach((bot, index) => {
    if (bot.hp <= 0) {
      bot.respawn -= delta;
      if (bot.respawn <= 0 && game.kos < targetKos) {
        const nextBot = createBot(index, game.wave);
        Object.assign(bot, nextBot);
      }
      return;
    }

    bot.hitTimer = Math.max(0, bot.hitTimer - delta);
    bot.attackCooldown = Math.max(0, bot.attackCooldown - delta);
    const dx = player.x - bot.x;
    const dz = player.z - bot.z;
    const len = Math.hypot(dx, dz) || 1;
    if (len > 1.55) {
      bot.x = clamp(bot.x + (dx / len) * bot.speed * delta, -arenaLimit, arenaLimit);
      bot.z = clamp(bot.z + (dz / len) * bot.speed * delta, -arenaLimit, arenaLimit);
    } else if (bot.attackCooldown <= 0) {
      bot.attackCooldown = 1.05;
      const reduction = player.shieldTimer > 0 ? 0.42 : 1;
      player.hp = Math.max(0, player.hp - bot.damage * reduction);
      player.hitTimer = 0.18;
      game.streak = 0;
      if (player.hp <= 0) {
        game.running = false;
        game.message = '쓰러졌습니다. 다시 시작해서 조합을 바꿔보세요.';
      }
    }
  });

  if (game.kos >= targetKos) {
    game.ended = true;
    game.running = false;
    game.message = '승리! 영웅 전장을 제압했습니다.';
  }

  if (game.kos > 0 && game.kos % 5 === 0) game.wave = Math.floor(game.kos / 5) + 1;

  game.effects.forEach((effect) => {
    effect.life -= delta;
  });
  game.effects = game.effects.filter((effect) => effect.life > 0);
}

export default function HeroArenaPage() {
  const mountRef = useRef(null);
  const keysRef = useRef({});
  const mouseLookRef = useRef({ dragging: false, locked: false, lastX: 0, yaw: 0 });
  const sceneRef = useRef(null);
  const gameRef = useRef(createGame());
  const [selectedHeroId, setSelectedHeroId] = useState('blade');
  const [mouseLookLocked, setMouseLookLocked] = useState(false);
  const [hud, setHud] = useState(() => gameRef.current);

  const selectedHero = useMemo(() => heroes.find((hero) => hero.id === selectedHeroId) ?? heroes[0], [selectedHeroId]);
  const activeHero = getHero(hud);
  const hpPercent = Math.max(0, Math.min(100, (hud.player.hp / hud.player.maxHp) * 100));
  const koPercent = Math.min(100, (hud.kos / targetKos) * 100);

  useEffect(() => {
    function applyMouseYaw(deltaX) {
      if (!Number.isFinite(deltaX) || deltaX === 0) return;
      const look = mouseLookRef.current;
      look.yaw += deltaX * 0.006;
      const player = gameRef.current.player;
      player.directionX = Math.sin(look.yaw);
      player.directionZ = -Math.cos(look.yaw);
    }

    const handleDown = (event) => {
      const key = event.key.toLowerCase();
      keysRef.current[key] = true;
      if (key === 'f' && event.shiftKey && !event.repeat) {
        event.preventDefault();
        mouseLookRef.current.locked = !mouseLookRef.current.locked;
        setMouseLookLocked(mouseLookRef.current.locked);
      }
      if (key === '1') castAbility(gameRef.current, 0);
      if (key === '2') castAbility(gameRef.current, 1);
      if (key === '3') castAbility(gameRef.current, 2);
      if (key === 'r') castAbility(gameRef.current, 3);
    };
    const handleUp = (event) => {
      keysRef.current[event.key.toLowerCase()] = false;
    };
    const handleMouseDown = (event) => {
      if (event.button !== 2 || !mountRef.current?.contains(event.target)) return;
      mouseLookRef.current.dragging = true;
      mouseLookRef.current.lastX = event.clientX;
      event.preventDefault();
    };
    const handleMouseUp = (event) => {
      if (event.button === 2) mouseLookRef.current.dragging = false;
    };
    const handleContextMenu = (event) => {
      if (mountRef.current?.contains(event.target)) event.preventDefault();
    };
    const handleMouseMove = (event) => {
      const look = mouseLookRef.current;
      if (!look.dragging && !look.locked) return;
      const deltaX = event.movementX || event.clientX - look.lastX;
      look.lastX = event.clientX;
      applyMouseYaw(deltaX);
      event.preventDefault();
    };
    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('contextmenu', handleContextMenu);
    return () => {
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('keyup', handleUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  useEffect(() => {
    let cleanup = () => {};

    async function setupScene() {
      const THREE = await import('three');
      const mount = mountRef.current;
      if (!mount) return;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#0b1020');
      scene.fog = new THREE.Fog('#0b1020', 18, 46);

      const camera = new THREE.PerspectiveCamera(54, mount.clientWidth / mount.clientHeight, 0.1, 100);
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      renderer.shadowMap.enabled = true;
      mount.appendChild(renderer.domElement);

      const hemi = new THREE.HemisphereLight('#dbeafe', '#111827', 1.7);
      scene.add(hemi);
      const sun = new THREE.DirectionalLight('#ffffff', 4.4);
      sun.position.set(6, 12, 8);
      sun.castShadow = true;
      scene.add(sun);
      const arenaGlow = new THREE.PointLight('#facc15', 4.2, 24);
      arenaGlow.position.set(0, 4, 0);
      scene.add(arenaGlow);

      const floor = new THREE.Mesh(
        new THREE.CircleGeometry(arenaLimit + 4, 120),
        new THREE.MeshStandardMaterial({ color: '#243044', roughness: 0.86, metalness: 0.08 })
      );
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      scene.add(floor);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(arenaLimit, 0.08, 12, 160),
        new THREE.MeshStandardMaterial({ color: '#facc15', emissive: '#f59e0b', emissiveIntensity: 0.72 })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.05;
      scene.add(ring);

      const decorMat = new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.75, metalness: 0.12 });
      const padMat = new THREE.MeshStandardMaterial({ color: '#14b8a6', emissive: '#0f766e', emissiveIntensity: 0.55 });
      for (let index = 0; index < 12; index += 1) {
        const angle = (Math.PI * 2 * index) / 12;
        const x = Math.cos(angle) * 13.5;
        const z = Math.sin(angle) * 13.5;
        const tower = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.4 + (index % 3) * 0.35, 0.72), decorMat);
        tower.position.set(x, tower.geometry.parameters.height / 2, z);
        tower.rotation.y = -angle;
        tower.castShadow = true;
        scene.add(tower);
        const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.12, 16), padMat);
        pad.position.set(x, tower.geometry.parameters.height + 0.18, z);
        scene.add(pad);
      }

      function addPart(group, geometry, material, position, scale = [1, 1, 1]) {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(...position);
        mesh.scale.set(...scale);
        mesh.castShadow = true;
        group.add(mesh);
        return mesh;
      }

      function makeAvatar(hero, isBot = false) {
        const group = new THREE.Group();
        const body = new THREE.MeshStandardMaterial({ color: isBot ? '#64748b' : hero.color, roughness: 0.62, metalness: 0.1 });
        const accent = new THREE.MeshStandardMaterial({ color: isBot ? '#ef4444' : hero.accent, emissive: isBot ? '#991b1b' : hero.accent, emissiveIntensity: isBot ? 0.45 : 1.15 });
        const dark = new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.7 });
        const face = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.55 });
        const trim = new THREE.MeshStandardMaterial({ color: '#f8fafc', metalness: 0.52, roughness: 0.26 });
        const mouth = new THREE.MeshStandardMaterial({ color: '#7f1d1d', roughness: 0.5 });
        const core = new THREE.MeshStandardMaterial({ color: hero.accent, emissive: hero.accent, emissiveIntensity: 1.8, metalness: 0.35, roughness: 0.2 });

        addPart(group, new THREE.BoxGeometry(0.78, 0.92, 0.46), body, [0, 0.9, 0]);
        addPart(group, new THREE.BoxGeometry(0.5, 0.44, 0.5), face, [0, 1.62, 0.02]);
        addPart(group, new THREE.BoxGeometry(0.58, 0.16, 0.22), dark, [0, 1.74, 0.26]);
        addPart(group, new THREE.BoxGeometry(0.18, 0.72, 0.22), body, [-0.56, 0.9, 0], [1, 1, 1]);
        addPart(group, new THREE.BoxGeometry(0.18, 0.72, 0.22), body, [0.56, 0.9, 0], [1, 1, 1]);
        addPart(group, new THREE.BoxGeometry(0.22, 0.74, 0.24), dark, [-0.22, 0.26, 0]);
        addPart(group, new THREE.BoxGeometry(0.22, 0.74, 0.24), dark, [0.22, 0.26, 0]);
        addPart(group, new THREE.TorusGeometry(0.48, 0.025, 8, 36), accent, [0, 0.08, 0], [1, 1, 1]).rotation.x = Math.PI / 2;

        if (!isBot) {
          for (const x of [-0.13, 0.13]) {
            addPart(group, new THREE.SphereGeometry(0.045, 16, 10), dark, [x, 1.65, 0.285]);
            addPart(group, new THREE.BoxGeometry(0.13, 0.026, 0.018), accent, [x, 1.72, 0.292]);
          }
          addPart(group, new THREE.ConeGeometry(0.04, 0.11, 12), face, [0, 1.58, 0.31]).rotation.x = Math.PI / 2;
          addPart(group, new THREE.BoxGeometry(0.18, 0.028, 0.018), mouth, [0, 1.49, 0.292]);
          addPart(group, new THREE.OctahedronGeometry(0.13), core, [0, 1.05, 0.27]);
          addPart(group, new THREE.BoxGeometry(0.58, 0.08, 0.08), trim, [0, 1.28, 0.27]);
          for (const x of [-0.54, 0.54]) {
            addPart(group, new THREE.SphereGeometry(0.18, 18, 12), accent, [x, 1.34, 0], [1.25, 0.62, 1]);
            addPart(group, new THREE.ConeGeometry(0.17, 0.42, 16), trim, [x * 1.06, 1.42, -0.06]).rotation.z = x < 0 ? 0.62 : -0.62;
            addPart(group, new THREE.BoxGeometry(0.14, 0.24, 0.12), trim, [x, 0.58, 0.15]);
          }
          const backRing = addPart(group, new THREE.TorusGeometry(0.55, 0.018, 8, 48), core, [0, 1.12, -0.34]);
          backRing.rotation.x = Math.PI / 2;
          const halo = addPart(group, new THREE.TorusGeometry(0.35, 0.016, 8, 42), accent, [0, 1.95, -0.05]);
          halo.rotation.x = Math.PI / 2;
          for (let i = 0; i < 4; i += 1) {
            const angle = (Math.PI * 2 * i) / 4;
            const shard = addPart(group, new THREE.ConeGeometry(0.055, 0.34, 10), core, [Math.cos(angle) * 0.32, 1.12 + Math.sin(angle) * 0.26, -0.44]);
            shard.rotation.z = angle;
          }
        }

        const weapon = addPart(group, new THREE.BoxGeometry(0.12, isBot ? 0.78 : 1.24, 0.12), accent, [0.72, 0.92, 0.2]);
        weapon.rotation.z = -0.62;
        if (!isBot) {
          const blade = addPart(group, new THREE.ConeGeometry(0.12, 0.46, 18), core, [0.98, 1.42, 0.2]);
          blade.rotation.z = -0.62;
          addPart(group, new THREE.SphereGeometry(0.09, 14, 10), core, [0.58, 0.5, 0.2]);
        }
        group.userData.weapon = weapon;
        return group;
      }

      const playerMesh = makeAvatar(getHero(gameRef.current));
      scene.add(playerMesh);
      const botMeshes = new Map();
      const projectileMeshes = new Map();
      const effectMeshes = new Map();

      function makeEffectObject(effect) {
        const group = new THREE.Group();
        const main = new THREE.MeshStandardMaterial({
          color: effect.color,
          emissive: effect.color,
          emissiveIntensity: 1.45,
          transparent: true,
          opacity: 0.9,
          roughness: 0.35,
          metalness: 0.18,
          side: THREE.DoubleSide,
        });
        const white = new THREE.MeshStandardMaterial({
          color: '#f8fafc',
          emissive: effect.color,
          emissiveIntensity: 1.2,
          transparent: true,
          opacity: 0.86,
          side: THREE.DoubleSide,
        });

        const add = (geometry, material, position = [0, 0, 0], scale = [1, 1, 1], rotation = [0, 0, 0]) => {
          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.set(...position);
          mesh.scale.set(...scale);
          mesh.rotation.set(...rotation);
          group.add(mesh);
          return mesh;
        };

        if (effect.kind === 'slash') {
          for (let i = -1; i <= 1; i += 1) {
            add(new THREE.BoxGeometry(effect.radius * 1.05, 0.08, 0.18), i === 0 ? white : main, [0, 0.45 + i * 0.08, 0], [1, 1, 1], [0, effect.angle + i * 0.34, 0.12 * i]);
          }
          add(new THREE.TorusGeometry(effect.radius * 0.55, 0.025, 8, 48), main, [0, 0.1, 0], [1.2, 0.38, 1], [Math.PI / 2, 0, effect.angle]);
        } else if (effect.kind === 'bladeStorm') {
          for (let i = 0; i < 5; i += 1) {
            const angle = (Math.PI * 2 * i) / 5;
            add(new THREE.BoxGeometry(effect.radius * 0.78, 0.09, 0.16), i % 2 ? main : white, [Math.cos(angle) * 0.35, 0.52, Math.sin(angle) * 0.35], [1, 1, 1], [0, angle, 0.2]);
          }
          add(new THREE.TorusGeometry(effect.radius * 0.92, 0.05, 12, 96), main, [0, 0.12, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);
        } else if (effect.kind === 'spark' || effect.kind === 'lightning') {
          const bolts = effect.kind === 'lightning' ? 6 : 4;
          add(new THREE.CylinderGeometry(0.05, 0.12, effect.kind === 'lightning' ? 4.4 : 1.8, 8), white, [0, effect.kind === 'lightning' ? 2.1 : 0.85, 0]);
          for (let i = 0; i < bolts; i += 1) {
            const angle = (Math.PI * 2 * i) / bolts;
            add(new THREE.ConeGeometry(0.08, effect.radius * 0.9, 8), main, [Math.cos(angle) * effect.radius * 0.34, 0.5, Math.sin(angle) * effect.radius * 0.34], [1, 1, 1], [Math.PI / 2, 0, -angle]);
          }
          add(new THREE.SphereGeometry(effect.radius * 0.22, 18, 12), main, [0, 0.55, 0]);
        } else if (effect.kind === 'shield') {
          add(new THREE.SphereGeometry(effect.radius * 0.62, 28, 16), main, [0, 1.05, 0], [1, 0.82, 1]);
          add(new THREE.TorusGeometry(effect.radius * 0.72, 0.04, 10, 72), white, [0, 1.05, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);
          add(new THREE.TorusGeometry(effect.radius * 0.52, 0.03, 10, 72), main, [0, 1.05, 0], [1, 1, 1], [0, 0, Math.PI / 2]);
        } else if (effect.kind === 'quake') {
          add(new THREE.TorusGeometry(effect.radius * 0.82, 0.055, 10, 90), main, [0, 0.08, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);
          for (let i = 0; i < 10; i += 1) {
            const angle = (Math.PI * 2 * i) / 10;
            add(new THREE.BoxGeometry(effect.radius * 0.34, 0.05, 0.06), white, [Math.cos(angle) * effect.radius * 0.45, 0.08, Math.sin(angle) * effect.radius * 0.45], [1, 1, 1], [0, -angle, 0]);
          }
        } else if (effect.kind === 'flameBurst' || effect.kind === 'meteor') {
          add(new THREE.SphereGeometry(effect.radius * 0.32, 22, 14), main, [0, 0.55, 0], [1, 0.72, 1]);
          add(new THREE.TorusGeometry(effect.radius * 0.62, 0.06, 12, 90), main, [0, 0.12, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);
          for (let i = 0; i < 8; i += 1) {
            const angle = (Math.PI * 2 * i) / 8;
            add(new THREE.ConeGeometry(0.1, effect.radius * 0.58, 10), i % 2 ? main : white, [Math.cos(angle) * effect.radius * 0.26, 0.5, Math.sin(angle) * effect.radius * 0.26], [1, 1, 1], [Math.PI / 2, 0, -angle]);
          }
          if (effect.kind === 'meteor') add(new THREE.ConeGeometry(effect.radius * 0.18, 2.4, 18), white, [0, 2.4, 0], [1, 1, 1], [0.55, 0, 0.42]);
        } else if (effect.kind === 'blink') {
          add(new THREE.TorusGeometry(effect.radius * 0.5, 0.04, 10, 64), main, [0, 0.12, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);
          add(new THREE.CylinderGeometry(0.22, 0.42, 1.6, 18), white, [0, 0.8, 0], [1, 1, 1]);
          for (let i = 0; i < 5; i += 1) {
            const angle = (Math.PI * 2 * i) / 5;
            add(new THREE.SphereGeometry(0.08, 10, 8), main, [Math.cos(angle) * effect.radius * 0.52, 0.55, Math.sin(angle) * effect.radius * 0.52]);
          }
        } else {
          add(new THREE.TorusGeometry(effect.radius, 0.045, 10, 90), main, [0, 0.12, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);
        }

        group.position.set(effect.x, 0, effect.z);
        group.userData.kind = effect.kind;
        return group;
      }

      function makeProjectileObject(projectile) {
        const group = new THREE.Group();
        const core = new THREE.MeshStandardMaterial({ color: projectile.color, emissive: projectile.color, emissiveIntensity: 1.7 });
        const glow = new THREE.MeshStandardMaterial({ color: '#f8fafc', emissive: projectile.color, emissiveIntensity: 1.2, transparent: true, opacity: 0.82 });
        const sphere = new THREE.Mesh(new THREE.SphereGeometry(projectile.radius, 18, 12), core);
        group.add(sphere);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(projectile.radius * 1.25, 0.025, 8, 36), glow);
        ring.rotation.x = Math.PI / 2;
        group.add(ring);
        if (projectile.heroId === 'ember') {
          const tail = new THREE.Mesh(new THREE.ConeGeometry(projectile.radius * 0.55, 1.3, 16), core);
          tail.position.set(0, 0, 0.62);
          tail.rotation.x = Math.PI / 2;
          group.add(tail);
        } else {
          for (let i = 0; i < 3; i += 1) {
            const spark = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.5), glow);
            spark.rotation.y = (Math.PI * 2 * i) / 3;
            group.add(spark);
          }
        }
        return group;
      }

      function sync(game, time) {
        const hero = getHero(game);
        if (playerMesh.userData.heroId !== hero.id) {
          playerMesh.clear();
          const replacement = makeAvatar(hero);
          while (replacement.children.length) playerMesh.add(replacement.children[0]);
          playerMesh.userData.weapon = replacement.userData.weapon;
          playerMesh.userData.heroId = hero.id;
        }
        playerMesh.position.set(game.player.x, 0, game.player.z);
        playerMesh.lookAt(game.player.x + game.player.directionX, 0.9, game.player.z + game.player.directionZ);
        playerMesh.scale.setScalar(game.player.hitTimer > 0 ? 1.08 : 1);
        if (playerMesh.userData.weapon) playerMesh.userData.weapon.rotation.z = -0.62 + Math.sin(time * 8) * 0.08;

        game.bots.forEach((bot) => {
          if (!botMeshes.has(bot.id)) {
            const mesh = makeAvatar(heroes[(botMeshes.size + 1) % heroes.length], true);
            scene.add(mesh);
            botMeshes.set(bot.id, mesh);
          }
          const mesh = botMeshes.get(bot.id);
          mesh.visible = bot.hp > 0;
          mesh.position.set(bot.x, 0, bot.z);
          mesh.lookAt(game.player.x, 0.9, game.player.z);
          mesh.scale.setScalar(bot.hitTimer > 0 ? 1.18 : 0.92);
        });

        botMeshes.forEach((mesh, id) => {
          if (!game.bots.some((bot) => bot.id === id)) {
            scene.remove(mesh);
            botMeshes.delete(id);
          }
        });

        game.projectiles.forEach((projectile) => {
          if (!projectileMeshes.has(projectile.id)) {
            const mesh = makeProjectileObject(projectile);
            scene.add(mesh);
            projectileMeshes.set(projectile.id, mesh);
          }
          const mesh = projectileMeshes.get(projectile.id);
          mesh.position.set(projectile.x, 0.72, projectile.z);
          mesh.rotation.y = Math.atan2(projectile.vx, projectile.vz);
          mesh.rotation.z += 0.18;
        });
        projectileMeshes.forEach((mesh, id) => {
          if (!game.projectiles.some((projectile) => projectile.id === id)) {
            scene.remove(mesh);
            projectileMeshes.delete(id);
          }
        });

        game.effects.forEach((effect) => {
          if (!effectMeshes.has(effect.id)) {
            const effectObject = makeEffectObject(effect);
            scene.add(effectObject);
            effectMeshes.set(effect.id, effectObject);
          }
          const effectObject = effectMeshes.get(effect.id);
          const progress = 1 - effect.life / effect.maxLife;
          effectObject.position.set(effect.x, 0, effect.z);
          effectObject.rotation.y += 0.12 + progress * 0.08;
          effectObject.scale.setScalar(1 + progress * (effect.kind === 'meteor' ? 0.42 : 0.24));
          effectObject.traverse((child) => {
            if (child.material) child.material.opacity = Math.max(0, 1 - progress);
          });
        });
        effectMeshes.forEach((mesh, id) => {
          if (!game.effects.some((effect) => effect.id === id)) {
            scene.remove(mesh);
            effectMeshes.delete(id);
          }
        });
      }

      let last = performance.now();
      function animate(now) {
        const delta = Math.min((now - last) / 1000, 0.033);
        last = now;
        const game = gameRef.current;
        updateGame(game, delta, keysRef.current, mouseLookRef.current.dragging || mouseLookRef.current.locked);
        sync(game, now / 1000);
        ring.rotation.z += delta * 0.45;
        const cameraDirX = game.player.directionX || 0;
        const cameraDirZ = game.player.directionZ || -1;
        const targetCameraX =
          game.player.x - cameraDirX * 7.2 + cameraDirZ * 1.15,
        targetCameraY = 6.8,
        targetCameraZ = game.player.z - cameraDirZ * 8.5 - cameraDirX * 1.15;
        const cameraFollow = 1 - Math.exp(-delta * 10);
        const lookFollow = 1 - Math.exp(-delta * 9);
        const targetLookX = game.player.x + cameraDirX * 1.8;
        const targetLookY = 1.4;
        const targetLookZ = game.player.z + cameraDirZ * 1.8;
        if (!camera.userData.ready) {
          camera.position.set(targetCameraX, targetCameraY, targetCameraZ);
          camera.userData.lookX = targetLookX;
          camera.userData.lookY = targetLookY;
          camera.userData.lookZ = targetLookZ;
          camera.userData.ready = true;
        } else {
          camera.position.x += (targetCameraX - camera.position.x) * cameraFollow;
          camera.position.y += (targetCameraY - camera.position.y) * cameraFollow;
          camera.position.z += (targetCameraZ - camera.position.z) * cameraFollow;
          camera.userData.lookX += (targetLookX - camera.userData.lookX) * lookFollow;
          camera.userData.lookY += (targetLookY - camera.userData.lookY) * lookFollow;
          camera.userData.lookZ += (targetLookZ - camera.userData.lookZ) * lookFollow;
        }
        camera.lookAt(camera.userData.lookX, camera.userData.lookY, camera.userData.lookZ);
        renderer.render(scene, camera);
        sceneRef.current.frame = window.requestAnimationFrame(animate);
        setHud({ ...game, player: { ...game.player }, bots: [...game.bots], cooldowns: [...game.cooldowns] });
      }

      function resize() {
        if (!mount.clientWidth || !mount.clientHeight) return;
        camera.aspect = mount.clientWidth / mount.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(mount.clientWidth, mount.clientHeight);
      }

      sceneRef.current = { frame: 0 };
      window.addEventListener('resize', resize);
      sceneRef.current.frame = window.requestAnimationFrame(animate);

      cleanup = () => {
        window.removeEventListener('resize', resize);
        window.cancelAnimationFrame(sceneRef.current?.frame);
        renderer.dispose();
        mount.removeChild(renderer.domElement);
      };
    }

    setupScene();
    return () => cleanup();
  }, []);

  function startGame(heroId = selectedHeroId) {
    const next = createGame(heroId);
    next.running = true;
    next.message = `${heroes.find((hero) => hero.id === heroId)?.name ?? 'Hero'} 출전! ${targetKos} KO를 먼저 달성하세요.`;
    gameRef.current = next;
    setHud({ ...next });
  }

  function chooseHero(heroId) {
    setSelectedHeroId(heroId);
    if (!hud.running) {
      const next = createGame(heroId);
      gameRef.current = next;
      setHud({ ...next });
    }
  }

  return (
    <section className="arenaPage">
      <div className="arenaTop">
        <div>
          <span>Block Hero Arena</span>
          <h1>블록 영웅 전장</h1>
        </div>
        <button type="button" onClick={() => startGame()}>
          {hud.running ? '다시 시작' : '전장 시작'}
        </button>
      </div>

      <div className="arenaLayout">
        <aside className="heroPanel">
          <div className="messageBox">{hud.message}</div>
          <div className="heroGrid">
            {heroes.map((hero) => (
              <button
                key={hero.id}
                type="button"
                className={selectedHeroId === hero.id ? 'active' : ''}
                onClick={() => chooseHero(hero.id)}
                style={{ '--hero-color': hero.color, '--hero-accent': hero.accent }}
              >
                <span>{hero.name}</span>
                <strong>{hero.role}</strong>
              </button>
            ))}
          </div>

          <div className="statBox">
            <span>선택 영웅</span>
            <strong style={{ color: selectedHero.color }}>{selectedHero.name}</strong>
            <p>체력 {selectedHero.hp} · 속도 {selectedHero.speed} · 기본 공격 {selectedHero.basic.damage}</p>
          </div>

          <div className="botList">
            {hud.bots.map((bot) => (
              <div key={bot.id} className={bot.hp <= 0 ? 'down' : ''}>
                <span>{bot.name}</span>
                <i><b style={{ width: `${Math.max(0, (bot.hp / bot.maxHp) * 100)}%` }} /></i>
              </div>
            ))}
          </div>
        </aside>

        <div className="arenaStage">
          <div ref={mountRef} className="arenaMount" />
          <div className={mouseLookLocked ? 'mouseLookBadge active' : 'mouseLookBadge'}>
            {mouseLookLocked ? '우클릭 조준 고정 ON' : '우클릭 드래그 조준'}
          </div>
          <div className="arenaHud">
            <div>
              <span>HP</span>
              <strong>{Math.ceil(hud.player.hp)} / {hud.player.maxHp}</strong>
              <i><b style={{ width: `${hpPercent}%` }} /></i>
            </div>
            <div>
              <span>KO</span>
              <strong>{hud.kos} / {targetKos}</strong>
              <i><b style={{ width: `${koPercent}%` }} /></i>
            </div>
            <div>
              <span>WAVE</span>
              <strong>{hud.wave}</strong>
              <small>연속 {hud.streak}킬</small>
            </div>
          </div>
        </div>

        <aside className="skillPanel">
          <div className="controlCard">
            <p className="mouseGuide">WASD / 방향키 이동 · 우클릭 드래그 시점 회전 · Shift 이동 방향 부드럽게 · Shift+F 조준 고정 · 1,2,3,R 스킬</p>
            <span>조작</span>
            <p>WASD / 방향키 이동 · 1,2,3,R 스킬 · 기본 공격은 가까운 적 자동 타격</p>
          </div>

          <div className="skillGrid">
            {activeHero.abilities.map((ability, index) => {
              const cooldown = hud.cooldowns[index] ?? 0;
              const ready = cooldown <= 0;
              return (
                <button
                  key={ability.name}
                  type="button"
                  className={ready ? 'ready' : ''}
                  onClick={() => {
                    castAbility(gameRef.current, index);
                    setHud({ ...gameRef.current });
                  }}
                  style={{ '--hero-color': activeHero.color, '--hero-accent': activeHero.accent }}
                  disabled={!hud.running || !ready}
                >
                  <span>{ability.key}</span>
                  <strong>{ability.name}</strong>
                  <em>{ready ? 'READY' : `${cooldown.toFixed(1)}s`}</em>
                  <small>{ability.text}</small>
                </button>
              );
            })}
          </div>
        </aside>
      </div>

      <style jsx>{`
        .arenaPage {
          min-height: calc(100vh - var(--site-nav-height));
          padding: 18px;
          background:
            linear-gradient(rgba(255, 255, 255, 0.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.045) 1px, transparent 1px),
            #07111f;
          background-size: 44px 44px, 44px 44px, auto;
          color: #f8fafc;
        }

        .arenaTop,
        .arenaLayout {
          width: min(1380px, 100%);
          margin: 0 auto;
        }

        .arenaTop {
          min-height: 86px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .arenaTop span,
        .statBox span,
        .controlCard span {
          color: #7dd3fc;
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .arenaTop h1 {
          margin: 4px 0 0;
          font-size: 38px;
          line-height: 1;
        }

        .arenaTop button {
          min-height: 46px;
          padding: 0 20px;
          border: 0;
          border-radius: 8px;
          background: #facc15;
          color: #111827;
          font-weight: 900;
          cursor: pointer;
        }

        .arenaLayout {
          display: grid;
          grid-template-columns: 270px minmax(0, 1fr) 300px;
          gap: 14px;
          align-items: stretch;
        }

        .heroPanel,
        .skillPanel,
        .arenaStage {
          min-width: 0;
          border: 1px solid rgba(226, 232, 240, 0.16);
          border-radius: 8px;
          background: rgba(15, 23, 42, 0.78);
          box-shadow: 0 22px 56px rgba(0, 0, 0, 0.3);
        }

        .heroPanel,
        .skillPanel {
          padding: 14px;
          display: grid;
          align-content: start;
          gap: 12px;
        }

        .messageBox,
        .statBox,
        .controlCard {
          padding: 12px;
          border: 1px solid rgba(148, 163, 184, 0.18);
          border-radius: 8px;
          background: rgba(8, 17, 31, 0.8);
        }

        .messageBox {
          min-height: 58px;
          color: #e2e8f0;
          font-size: 13px;
          font-weight: 800;
          line-height: 1.45;
        }

        .heroGrid,
        .skillGrid,
        .botList {
          display: grid;
          gap: 8px;
        }

        .heroGrid button,
        .skillGrid button {
          min-height: 70px;
          padding: 10px;
          border: 1px solid rgba(148, 163, 184, 0.22);
          border-radius: 8px;
          background: rgba(30, 41, 59, 0.82);
          color: #f8fafc;
          text-align: left;
          cursor: pointer;
        }

        .heroGrid button.active {
          border-color: var(--hero-color);
          background:
            linear-gradient(135deg, color-mix(in srgb, var(--hero-color) 22%, transparent), rgba(15, 23, 42, 0.9));
          box-shadow: 0 0 0 2px color-mix(in srgb, var(--hero-color) 24%, transparent);
        }

        .heroGrid span,
        .skillGrid strong,
        .statBox strong {
          display: block;
          font-weight: 900;
        }

        .heroGrid strong,
        .statBox p,
        .controlCard p,
        .skillGrid small {
          margin: 5px 0 0;
          color: #cbd5e1;
          font-size: 12px;
          line-height: 1.35;
        }

        .arenaStage {
          min-height: 690px;
          position: relative;
          overflow: hidden;
        }

        .arenaMount {
          width: 100%;
          height: 100%;
          min-height: 690px;
        }

        .mouseLookBadge {
          position: absolute;
          top: 14px;
          left: 14px;
          z-index: 4;
          min-height: 34px;
          display: inline-flex;
          align-items: center;
          padding: 0 12px;
          border: 1px solid rgba(226, 232, 240, 0.2);
          border-radius: 8px;
          background: rgba(8, 17, 31, 0.76);
          color: #cbd5e1;
          font-size: 12px;
          font-weight: 900;
          pointer-events: none;
          backdrop-filter: blur(10px);
        }

        .mouseLookBadge.active {
          border-color: rgba(250, 204, 21, 0.75);
          background: rgba(113, 63, 18, 0.82);
          color: #fef3c7;
          box-shadow: 0 0 24px rgba(250, 204, 21, 0.2);
        }

        .mouseGuide {
          margin: 0 0 8px;
          color: #e0f2fe;
          font-size: 13px;
          font-weight: 900;
          line-height: 1.45;
        }

        .arenaHud {
          position: absolute;
          right: 14px;
          bottom: 14px;
          left: 14px;
          display: grid;
          grid-template-columns: 1fr 1fr 0.7fr;
          gap: 10px;
          pointer-events: none;
        }

        .arenaHud div {
          min-height: 74px;
          padding: 11px;
          border: 1px solid rgba(226, 232, 240, 0.18);
          border-radius: 8px;
          background: rgba(8, 17, 31, 0.82);
          backdrop-filter: blur(12px);
        }

        .arenaHud span,
        .arenaHud small {
          color: #94a3b8;
          font-size: 11px;
          font-weight: 900;
        }

        .arenaHud strong {
          display: block;
          margin: 4px 0 8px;
          font-size: 22px;
          line-height: 1;
        }

        .arenaHud i,
        .botList i {
          height: 8px;
          display: block;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(148, 163, 184, 0.28);
        }

        .arenaHud b,
        .botList b {
          height: 100%;
          display: block;
          border-radius: inherit;
          background: linear-gradient(90deg, #22c55e, #facc15);
        }

        .botList div {
          padding: 9px;
          border: 1px solid rgba(148, 163, 184, 0.16);
          border-radius: 8px;
          background: rgba(8, 17, 31, 0.66);
        }

        .botList div.down {
          opacity: 0.48;
        }

        .botList span {
          display: block;
          margin-bottom: 6px;
          color: #e2e8f0;
          font-size: 12px;
          font-weight: 900;
        }

        .skillGrid button {
          min-height: 96px;
          position: relative;
          padding-left: 48px;
        }

        .skillGrid button.ready {
          border-color: var(--hero-color);
        }

        .skillGrid button:disabled {
          cursor: not-allowed;
          opacity: 0.62;
        }

        .skillGrid span {
          width: 30px;
          height: 30px;
          position: absolute;
          top: 10px;
          left: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background: var(--hero-color);
          color: #111827;
          font-weight: 900;
        }

        .skillGrid em {
          display: block;
          margin-top: 4px;
          color: var(--hero-accent);
          font-size: 11px;
          font-style: normal;
          font-weight: 900;
        }

        @media (max-width: 1100px) {
          .arenaLayout {
            grid-template-columns: 1fr;
          }

          .heroGrid,
          .skillGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .arenaStage,
          .arenaMount {
            min-height: 620px;
          }
        }

        @media (max-width: 640px) {
          .arenaPage {
            padding: 12px;
          }

          .arenaTop {
            display: grid;
          }

          .arenaTop h1 {
            font-size: 31px;
          }

          .heroGrid,
          .skillGrid,
          .arenaHud {
            grid-template-columns: 1fr;
          }

          .arenaStage,
          .arenaMount {
            min-height: 560px;
          }
        }
      `}</style>
    </section>
  );
}
