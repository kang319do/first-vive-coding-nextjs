import { useEffect, useMemo, useRef, useState } from 'react';

const grades = [
  { id: 'rare', name: '희귀', color: '#38bdf8', weight: 55 },
  { id: 'superRare', name: '초희귀', color: '#22c55e', weight: 25 },
  { id: 'hero', name: '영웅', color: '#a78bfa', weight: 13 },
  { id: 'myth', name: '신화', color: '#f97316', weight: 5 },
  { id: 'legend', name: '전설', color: '#facc15', weight: 2 },
];

const gradeMap = Object.fromEntries(grades.map((grade) => [grade.id, grade]));
const arenaLimit = 16;
const arenaRadius = 18;

const monsterTypes = [
  { id: 'stalker', name: '추적자', color: '#55606c', hp: 1, speed: 1, damage: 1, scale: 1 },
  { id: 'runner', name: '질주 괴수', color: '#365314', hp: 0.72, speed: 1.58, damage: 0.78, scale: 0.82 },
  { id: 'brute', name: '중갑 괴수', color: '#7f1d1d', hp: 1.85, speed: 0.64, damage: 1.45, scale: 1.32 },
  { id: 'spitter', name: '독침 괴수', color: '#581c87', hp: 0.95, speed: 0.82, damage: 0.88, scale: 0.96, ranged: true },
  { id: 'bomber', name: '폭발 괴수', color: '#92400e', hp: 0.8, speed: 1.18, damage: 2.2, scale: 0.9, explode: true },
];

const rewards = [
  { id: 'burst-rifle', kind: 'weapon', grade: 'rare', name: '연발 라이플', power: 12, cooldown: 0.48, speed: 8.5, count: 1, text: '빠른 기본 사격' },
  { id: 'guard-roll', kind: 'skill', grade: 'rare', name: '경량 장갑', power: 8, text: '최대 체력 +12' },
  { id: 'crystal-shot', kind: 'weapon', grade: 'superRare', name: '수정 산탄총', power: 18, cooldown: 0.82, speed: 7.4, count: 5, spread: 0.52, text: '넓게 퍼지는 탄환' },
  { id: 'wind-boots', kind: 'skill', grade: 'superRare', name: '질풍 부츠', power: 14, text: '이동 속도 +18%' },
  { id: 'dragon-cannon', kind: 'weapon', grade: 'hero', name: '용염 캐논', power: 31, cooldown: 1.05, speed: 6.7, count: 1, blast: 1.25, text: '착탄 폭발 피해' },
  { id: 'hunter-sense', kind: 'skill', grade: 'hero', name: '사냥 감각', power: 24, text: '공격력 +20%' },
  { id: 'void-lance', kind: 'weapon', grade: 'myth', name: '공허 장창', power: 48, cooldown: 0.9, speed: 11, count: 2, pierce: true, text: '관통하는 신화 탄환' },
  { id: 'time-core', kind: 'skill', grade: 'myth', name: '시간 핵', power: 36, text: '공격 쿨타임 -18%' },
  { id: 'sun-orb', kind: 'weapon', grade: 'legend', name: '태양 구체', power: 78, cooldown: 1.25, speed: 5.8, count: 8, spread: Math.PI * 2, blast: 1.7, text: '전방위 전설 폭발' },
  { id: 'immortal-heart', kind: 'skill', grade: 'legend', name: '불멸 심장', power: 60, text: '초당 회복 +2.2' },
];

const extraRewards = [
  { id: 'iron-guard', kind: 'skill', grade: 'rare', name: '철벽 방어', power: 9, text: '받는 피해 감소' },
  { id: 'wide-barrel', kind: 'skill', grade: 'superRare', name: '확장 총열', power: 16, text: '탄환과 폭발 범위 증가' },
  { id: 'double-trigger', kind: 'skill', grade: 'hero', name: '이중 방아쇠', power: 28, text: '추가 탄환 발사' },
  { id: 'frost-field', kind: 'skill', grade: 'myth', name: '빙결장', power: 34, text: '주변 몬스터 이동 속도 감소' },
  { id: 'storm-crown', kind: 'skill', grade: 'legend', name: '폭풍 왕관', power: 66, text: '공격력과 연사력 대폭 강화' },
];

const allRewards = [...rewards, ...extraRewards];

const difficulties = [
  { id: 'easy', name: '쉬움', monsterHp: 34, monsterSpeed: 1.25, damage: 8, waveBonus: 1 },
  { id: 'normal', name: '보통', monsterHp: 48, monsterSpeed: 1.55, damage: 12, waveBonus: 2 },
  { id: 'hard', name: '어려움', monsterHp: 66, monsterSpeed: 1.85, damage: 16, waveBonus: 3 },
  { id: 'hell', name: '지옥', monsterHp: 92, monsterSpeed: 2.2, damage: 22, waveBonus: 4 },
];

function todayKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getDailyState() {
  if (typeof window === 'undefined') return { date: todayKey(), pulls: 0, bonusPulls: 0, killCharge: 0, history: [] };
  const saved = window.localStorage.getItem('summon3d-action-daily');
  if (!saved) return { date: todayKey(), pulls: 0, bonusPulls: 0, killCharge: 0, history: [] };

  try {
    const parsed = JSON.parse(saved);
    if (parsed.date !== todayKey()) return { date: todayKey(), pulls: 0, bonusPulls: 0, killCharge: 0, history: [] };
    return {
      date: parsed.date,
      pulls: Number(parsed.pulls) || 0,
      bonusPulls: Number(parsed.bonusPulls) || 0,
      killCharge: Number(parsed.killCharge) || 0,
      history: Array.isArray(parsed.history) ? parsed.history : Array.isArray(parsed.inventory) ? parsed.inventory : [],
    };
  } catch {
    return { date: todayKey(), pulls: 0, bonusPulls: 0, killCharge: 0, history: [] };
  }
}

function saveDailyState(state) {
  window.localStorage.setItem('summon3d-action-daily', JSON.stringify(state));
}

function drawReward() {
  const totalWeight = grades.reduce((sum, grade) => sum + grade.weight, 0);
  let roll = Math.random() * totalWeight;
  const grade = grades.find((item) => {
    roll -= item.weight;
    return roll <= 0;
  }) ?? grades[0];
  const pool = allRewards.filter((reward) => reward.grade === grade.id);
  return pool[Math.floor(Math.random() * pool.length)];
}

function createGameState(difficultyId = 'normal') {
  return {
    running: false,
    difficultyId,
    wave: 1,
    waveLeft: 0,
    kills: 0,
    hp: 100,
    maxHp: 100,
    regen: 0,
    armor: 0,
    projectileScale: 1,
    extraProjectiles: 0,
    frostAura: 0,
    damageBonus: 1,
    speedBonus: 1,
    cooldownBonus: 1,
    player: { x: 0, z: 0 },
    monsters: [],
    bullets: [],
    cooldown: 0,
    skillCooldown: 0,
    skillTimer: 0,
    skillKeyDown: false,
    message: '난이도를 고르고 시작하세요.',
    activeWeapon: null,
    activeSkills: [],
  };
}

function resetSkillEffects(game) {
  game.maxHp = 100;
  game.hp = Math.min(game.hp, game.maxHp);
  game.regen = 0;
  game.armor = 0;
  game.projectileScale = 1;
  game.extraProjectiles = 0;
  game.frostAura = 0;
  game.damageBonus = 1;
  game.speedBonus = 1;
  game.cooldownBonus = 1;
}

function equipSkill(game, item) {
  resetSkillEffects(game);
  game.activeSkills = [item];
  game.skillTimer = 0;
  game.skillCooldown = 0;
}

function applySkill(game, item) {
  if (item.id === 'guard-roll') {
    game.maxHp = 126;
    game.hp = Math.min(game.maxHp, game.hp + 26);
  }
  if (item.id === 'wind-boots') game.speedBonus = 1.55;
  if (item.id === 'hunter-sense') game.damageBonus = 1.65;
  if (item.id === 'time-core') game.cooldownBonus = 0.46;
  if (item.id === 'immortal-heart') game.regen = 9;
  if (item.id === 'iron-guard') game.armor = 12;
  if (item.id === 'wide-barrel') game.projectileScale = 1.75;
  if (item.id === 'double-trigger') game.extraProjectiles = 3;
  if (item.id === 'frost-field') game.frostAura = 0.55;
  if (item.id === 'storm-crown') {
    game.damageBonus = 1.9;
    game.cooldownBonus = 0.58;
    game.projectileScale = 1.35;
  }
}

function triggerSkill(game) {
  const skill = game.activeSkills[0];
  if (!skill) {
    game.message = '장착한 스킬이 없습니다. 뽑기에서 스킬을 얻어 장착하세요.';
    return;
  }
  if (game.skillCooldown > 0) return;

  resetSkillEffects(game);
  applySkill(game, skill);
  game.skillTimer = skill.grade === 'legend' ? 7 : skill.grade === 'myth' ? 6 : 5;
  game.skillCooldown = 11;
  game.message = `${skill.name} 발동! 효과가 잠시 동안 적용됩니다.`;
}

function spawnWave(game) {
  const difficulty = difficulties.find((item) => item.id === game.difficultyId) ?? difficulties[1];
  const count = 4 + game.wave * 2 + difficulty.waveBonus;
  game.waveLeft = count;
  game.monsters = Array.from({ length: count }, (_, index) => {
    const angle = (Math.PI * 2 * index) / count + Math.random() * 0.55;
    const radius = arenaLimit + 1 + Math.random() * 4.5;
    const type = monsterTypes[(index + game.wave + Math.floor(Math.random() * monsterTypes.length)) % monsterTypes.length];
    const hp = Math.round((difficulty.monsterHp + game.wave * 10) * type.hp);
    return {
      id: `${Date.now()}-${index}`,
      type: type.id,
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      hp,
      maxHp: hp,
      speed: (difficulty.monsterSpeed + game.wave * 0.05) * type.speed,
      damage: Math.round(difficulty.damage * type.damage),
      hitTimer: 0,
      attackCooldown: 0.4 + Math.random() * 1.4,
    };
  });
  game.message = `웨이브 ${game.wave}: 몬스터 ${count}마리 접근 중`;
}

export default function Summon3dPage() {
  const mountRef = useRef(null);
  const keysRef = useRef({});
  const sceneRef = useRef(null);
  const gameRef = useRef(createGameState());
  const dailyRef = useRef({ date: todayKey(), pulls: 0, bonusPulls: 0, killCharge: 0, history: [] });
  const [daily, setDaily] = useState({ date: todayKey(), pulls: 0, bonusPulls: 0, killCharge: 0, history: [] });
  const [difficultyId, setDifficultyId] = useState('normal');
  const [hud, setHud] = useState(() => gameRef.current);

  const activeWeapon = hud.activeWeapon;
  const oddsText = useMemo(() => {
    const total = grades.reduce((sum, grade) => sum + grade.weight, 0);
    return grades.map((grade) => `${grade.name} ${Math.round((grade.weight / total) * 100)}%`).join(' · ');
  }, []);

  useEffect(() => {
    const initial = getDailyState();
    dailyRef.current = initial;
    setDaily(initial);
  }, []);

  useEffect(() => {
    let cleanup = () => {};

    async function setupScene() {
      const THREE = await import('three');
      const mount = mountRef.current;
      if (!mount) return;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#08111f');
      scene.fog = new THREE.Fog('#08111f', 13, 34);

      const camera = new THREE.PerspectiveCamera(52, mount.clientWidth / mount.clientHeight, 0.1, 100);
      camera.position.set(0, 12.5, 17.5);
      camera.lookAt(0, 0.8, 0);

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      renderer.shadowMap.enabled = true;
      mount.appendChild(renderer.domElement);

      const hemi = new THREE.HemisphereLight('#c7e6ff', '#121827', 1.8);
      scene.add(hemi);
      const key = new THREE.DirectionalLight('#ffffff', 4.2);
      key.position.set(5, 8, 4);
      key.castShadow = true;
      scene.add(key);
      const dangerLight = new THREE.PointLight('#ef4444', 5, 18);
      dangerLight.position.set(-4, 3, -5);
      scene.add(dangerLight);

      const floor = new THREE.Mesh(
        new THREE.CircleGeometry(arenaRadius + 2, 128),
        new THREE.MeshStandardMaterial({ color: '#142238', roughness: 0.88, metalness: 0.08 })
      );
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      scene.add(floor);

      const arenaRing = new THREE.Mesh(
        new THREE.TorusGeometry(arenaRadius, 0.045, 10, 160),
        new THREE.MeshStandardMaterial({ color: '#38bdf8', emissive: '#0ea5e9', emissiveIntensity: 0.65 })
      );
      arenaRing.rotation.x = Math.PI / 2;
      arenaRing.position.y = 0.04;
      scene.add(arenaRing);

      function addMesh(group, geometry, material, position, scale = [1, 1, 1], rotation = [0, 0, 0]) {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(...position);
        mesh.scale.set(...scale);
        mesh.rotation.set(...rotation);
        mesh.castShadow = true;
        group.add(mesh);
        return mesh;
      }

      function prepareWalkParts(group, extra = {}) {
        const parts = group.children.filter((child) => child.geometry?.type === 'CapsuleGeometry' && Math.abs(child.position.x) > 0.2);
        parts.forEach((part) => {
          part.userData.homeRotation = part.rotation.clone();
          part.userData.homePosition = part.position.clone();
        });
        group.userData.walkParts = parts;
        group.userData.walkExtra = extra;
        group.userData.walkPhase = Math.random() * Math.PI * 2;
        group.userData.homeY = group.position.y;
      }

      function animateWalker(group, time, moving, intensity = 1, stride = 1) {
        const phase = time * 9.5 * stride + (group.userData.walkPhase ?? 0);
        const swing = moving ? Math.sin(phase) * 0.34 * intensity : Math.sin(phase * 0.35) * 0.035;
        const bounce = moving ? Math.abs(Math.sin(phase)) * 0.09 * intensity : 0;
        group.position.y = (group.userData.homeY ?? 0) + bounce;
        group.rotation.z = moving ? Math.sin(phase * 0.5) * 0.035 * intensity : 0;

        group.userData.walkParts?.forEach((part, index) => {
          const homeRotation = part.userData.homeRotation;
          const homePosition = part.userData.homePosition;
          const side = index % 2 === 0 ? 1 : -1;
          part.rotation.x = homeRotation.x + swing * side;
          part.rotation.z = homeRotation.z + swing * side * 0.35;
          part.position.y = homePosition.y + (moving ? Math.abs(Math.sin(phase + side)) * 0.035 * intensity : 0);
        });

        const cape = group.userData.walkExtra?.cape;
        if (cape) cape.rotation.x = -0.28 - (moving ? Math.abs(Math.sin(phase)) * 0.18 : Math.sin(phase * 0.25) * 0.03);

        const weapon = group.userData.walkExtra?.weapon;
        if (weapon) weapon.rotation.z = -0.74 + (moving ? Math.sin(phase) * 0.08 : Math.sin(phase * 0.3) * 0.025);
      }

      function makePlayer() {
        const group = new THREE.Group();
        const armor = new THREE.MeshStandardMaterial({ color: '#263241', metalness: 0.72, roughness: 0.28 });
        const darkArmor = new THREE.MeshStandardMaterial({ color: '#111827', metalness: 0.62, roughness: 0.34 });
        const gold = new THREE.MeshStandardMaterial({ color: '#facc15', emissive: '#b45309', emissiveIntensity: 0.38, metalness: 0.82, roughness: 0.22 });
        const capeMat = new THREE.MeshStandardMaterial({ color: '#991b1b', roughness: 0.74, side: THREE.DoubleSide });
        const glowBlue = new THREE.MeshStandardMaterial({ color: '#67e8f9', emissive: '#0891b2', emissiveIntensity: 1.35 });
        const glowWhite = new THREE.MeshStandardMaterial({ color: '#f8fafc', emissive: '#38bdf8', emissiveIntensity: 0.95 });

        addMesh(group, new THREE.CapsuleGeometry(0.34, 0.88, 10, 20), armor, [0, 1.08, 0], [1.05, 1.06, 0.86]);
        addMesh(group, new THREE.BoxGeometry(0.7, 0.2, 0.18), gold, [0, 1.36, 0.08]);
        addMesh(group, new THREE.SphereGeometry(0.28, 28, 18), darkArmor, [0, 1.78, 0], [1, 0.96, 1]);
        addMesh(group, new THREE.BoxGeometry(0.48, 0.08, 0.1), glowBlue, [0, 1.79, 0.25]);
        addMesh(group, new THREE.CylinderGeometry(0.12, 0.18, 0.16, 18), gold, [0, 2.02, 0]);
        addMesh(group, new THREE.ConeGeometry(0.1, 0.34, 18), gold, [0, 2.24, 0]);
        addMesh(group, new THREE.SphereGeometry(0.12, 16, 10), glowWhite, [0, 1.18, 0.32]);

        const cape = addMesh(group, new THREE.PlaneGeometry(1.05, 1.26), capeMat, [0, 1.02, -0.36], [1, 1, 1], [-0.28, 0, 0]);
        cape.castShadow = false;

        for (const x of [-0.44, 0.44]) {
          addMesh(group, new THREE.SphereGeometry(0.18, 18, 12), gold, [x, 1.42, 0.03], [1.15, 0.8, 1]);
          addMesh(group, new THREE.CapsuleGeometry(0.08, 0.58, 8, 12), armor, [x * 1.06, 1.03, 0.04], [1, 1, 1], [0, 0, x < 0 ? -0.24 : 0.24]);
          addMesh(group, new THREE.CapsuleGeometry(0.08, 0.46, 8, 12), darkArmor, [x * 0.72, 0.46, 0], [0.9, 1, 0.9]);
        }

        const weapon = addMesh(group, new THREE.BoxGeometry(0.1, 0.9, 0.1), gold, [0.58, 1.04, 0.32], [1, 1, 1], [0, 0, -0.74]);
        addMesh(group, new THREE.ConeGeometry(0.11, 0.34, 18), glowBlue, [0.86, 1.4, 0.34], [1, 1, 1], [0, 0, -0.74]);
        addMesh(group, new THREE.TorusGeometry(0.42, 0.018, 8, 42), glowBlue, [0, 0.12, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);

        prepareWalkParts(group, { cape, weapon });
        scene.add(group);
        return group;
      }

      function makeMonster(typeId = 'stalker') {
        const group = new THREE.Group();
        const type = monsterTypes.find((item) => item.id === typeId) ?? monsterTypes[0];
        group.userData.baseScale = type.scale;
        const skin = new THREE.MeshStandardMaterial({ color: type.color, roughness: 0.9, metalness: 0.08 });
        const hide = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.96 });
        const bone = new THREE.MeshStandardMaterial({ color: '#ddd6c5', roughness: 0.68 });
        const redEye = new THREE.MeshStandardMaterial({ color: '#fecaca', emissive: '#ef4444', emissiveIntensity: 1.95 });
        const acid = new THREE.MeshStandardMaterial({ color: '#c084fc', emissive: '#7e22ce', emissiveIntensity: 1.3 });
        const fire = new THREE.MeshStandardMaterial({ color: '#fb923c', emissive: '#ea580c', emissiveIntensity: 1.65 });
        const greenGlow = new THREE.MeshStandardMaterial({ color: '#86efac', emissive: '#16a34a', emissiveIntensity: 1.1 });

        const addEyePair = (y, z, gap = 0.16, material = redEye) => {
          for (const x of [-gap, gap]) addMesh(group, new THREE.SphereGeometry(0.055, 12, 8), material, [x, y, z]);
        };

        if (type.id === 'runner') {
          addMesh(group, new THREE.SphereGeometry(0.54, 24, 14), skin, [0, 0.8, 0], [1.28, 0.72, 0.62]);
          addMesh(group, new THREE.SphereGeometry(0.31, 18, 12), skin, [0, 1.17, 0.36], [1.15, 0.72, 0.9]);
          addEyePair(1.22, 0.61, 0.15, greenGlow);
          for (const x of [-0.36, 0.36]) {
            addMesh(group, new THREE.CapsuleGeometry(0.075, 0.82, 6, 12), skin, [x, 0.42, 0.2], [0.8, 1.25, 0.8], [0.48, 0, x < 0 ? -0.28 : 0.28]);
            addMesh(group, new THREE.ConeGeometry(0.065, 0.36, 8), bone, [x * 1.18, 0.1, 0.42], [1, 1, 1], [Math.PI / 2, 0, 0]);
          }
          for (let i = 0; i < 3; i += 1) addMesh(group, new THREE.ConeGeometry(0.08, 0.32, 10), greenGlow, [0, 0.86 + i * 0.12, -0.42 - i * 0.1], [1, 1, 1], [-Math.PI / 2, 0, 0]);
        } else if (type.id === 'brute') {
          addMesh(group, new THREE.SphereGeometry(0.72, 28, 18), skin, [0, 0.95, 0], [1.3, 1.38, 0.98]);
          addMesh(group, new THREE.BoxGeometry(1.15, 0.22, 0.22), hide, [0, 1.44, 0.14]);
          addMesh(group, new THREE.SphereGeometry(0.42, 22, 14), skin, [0, 1.68, 0.06], [1.18, 0.9, 1.08]);
          addEyePair(1.72, 0.43, 0.2);
          for (const x of [-0.34, 0.34]) {
            addMesh(group, new THREE.ConeGeometry(0.13, 0.54, 14), bone, [x, 2.05, 0], [1, 1, 1], [0, 0, x < 0 ? 0.42 : -0.42]);
            addMesh(group, new THREE.CapsuleGeometry(0.16, 0.84, 8, 14), skin, [x * 1.6, 0.9, 0.05], [1.15, 1, 1.15], [0, 0, x < 0 ? 0.78 : -0.78]);
            addMesh(group, new THREE.BoxGeometry(0.34, 0.2, 0.34), hide, [x * 2.05, 0.38, 0.14]);
          }
          for (let i = 0; i < 5; i += 1) addMesh(group, new THREE.ConeGeometry(0.09, 0.34, 10), bone, [0, 0.82 + i * 0.22, -0.57], [1, 1, 1], [-Math.PI / 2, 0, 0]);
        } else if (type.id === 'spitter') {
          addMesh(group, new THREE.CapsuleGeometry(0.42, 0.9, 10, 18), skin, [0, 0.95, 0], [1, 1.08, 0.9]);
          addMesh(group, new THREE.SphereGeometry(0.36, 22, 14), skin, [0, 1.56, 0.2], [1, 0.82, 1.12]);
          addMesh(group, new THREE.CylinderGeometry(0.11, 0.2, 0.58, 18), acid, [0, 1.47, 0.62], [1, 1, 1], [Math.PI / 2, 0, 0]);
          addEyePair(1.64, 0.48, 0.14, acid);
          for (const x of [-0.42, 0.42]) {
            addMesh(group, new THREE.CapsuleGeometry(0.08, 0.66, 6, 12), skin, [x, 0.78, 0], [1, 1, 1], [0.22, 0, x < 0 ? 0.48 : -0.48]);
            addMesh(group, new THREE.SphereGeometry(0.2, 16, 10), acid, [x * 0.7, 1.08, -0.36], [1, 1.25, 1]);
          }
          for (let i = 0; i < 4; i += 1) addMesh(group, new THREE.OctahedronGeometry(0.12), acid, [-0.3 + i * 0.2, 1.1 + i * 0.08, -0.52]);
        } else if (type.id === 'bomber') {
          addMesh(group, new THREE.SphereGeometry(0.58, 28, 18), hide, [0, 0.86, 0], [1.12, 1.12, 1.12]);
          addMesh(group, new THREE.SphereGeometry(0.42, 24, 14), fire, [0, 0.86, 0.03], [0.68, 0.68, 0.68]);
          addMesh(group, new THREE.SphereGeometry(0.3, 20, 12), hide, [0, 1.48, 0.1], [1, 0.85, 1]);
          addEyePair(1.5, 0.38, 0.16, fire);
          addMesh(group, new THREE.TorusGeometry(0.55, 0.035, 8, 42), fire, [0, 0.9, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);
          addMesh(group, new THREE.TorusGeometry(0.38, 0.025, 8, 36), fire, [0, 1.18, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);
          addMesh(group, new THREE.CylinderGeometry(0.025, 0.025, 0.45, 8), bone, [0, 1.9, 0], [1, 1, 1], [0.4, 0, 0.25]);
          addMesh(group, new THREE.SphereGeometry(0.08, 12, 8), fire, [0.1, 2.08, 0.07]);
          for (const x of [-0.44, 0.44]) addMesh(group, new THREE.CapsuleGeometry(0.09, 0.42, 6, 10), hide, [x, 0.34, 0.08], [1, 1, 1], [0, 0, x < 0 ? -0.28 : 0.28]);
        } else {
          addMesh(group, new THREE.SphereGeometry(0.58, 24, 16), skin, [0, 0.92, 0], [1.06, 1.28, 0.78]);
          addMesh(group, new THREE.SphereGeometry(0.38, 24, 14), skin, [0, 1.58, 0.1], [1.1, 0.82, 0.95]);
          addMesh(group, new THREE.BoxGeometry(0.64, 0.16, 0.3), hide, [0, 1.45, 0.36]);
          addEyePair(1.64, 0.42);
          for (const x of [-0.32, 0.32]) {
            addMesh(group, new THREE.ConeGeometry(0.08, 0.42, 12), bone, [x, 1.96, 0.03], [1, 1, 1], [0, 0, x < 0 ? 0.42 : -0.42]);
            addMesh(group, new THREE.CapsuleGeometry(0.1, 0.64, 6, 12), skin, [x * 1.35, 0.9, 0.08], [1, 1, 1], [0, 0, x < 0 ? 0.58 : -0.58]);
            addMesh(group, new THREE.ConeGeometry(0.075, 0.25, 8), bone, [x * 1.72, 0.52, 0.18], [1, 1, 1], [Math.PI / 2, 0, 0]);
          }
          for (let i = 0; i < 4; i += 1) addMesh(group, new THREE.ConeGeometry(0.07, 0.3, 10), bone, [0, 0.72 + i * 0.22, -0.48], [1, 1, 1], [-Math.PI / 2, 0, 0]);
        }

        prepareWalkParts(group);
        scene.add(group);
        return group;
      }

      const playerMesh = makePlayer();
      const monsterMeshes = new Map();
      const bulletMeshes = new Map();
      const clock = new THREE.Clock();

      function syncMeshes(game, time) {
        const lastPlayerX = playerMesh.userData.lastX ?? game.player.x;
        const lastPlayerZ = playerMesh.userData.lastZ ?? game.player.z;
        const playerDx = game.player.x - lastPlayerX;
        const playerDz = game.player.z - lastPlayerZ;
        const playerMoving = Math.hypot(playerDx, playerDz) > 0.004;
        playerMesh.position.set(game.player.x, 0, game.player.z);
        if (playerMoving) playerMesh.lookAt(game.player.x + playerDx, 0.8, game.player.z + playerDz);
        animateWalker(playerMesh, time, playerMoving, 1.1, 1.05);
        playerMesh.userData.lastX = game.player.x;
        playerMesh.userData.lastZ = game.player.z;

        game.monsters.forEach((monster) => {
          if (!monsterMeshes.has(monster.id)) monsterMeshes.set(monster.id, makeMonster(monster.type));
          const mesh = monsterMeshes.get(monster.id);
          const lastX = mesh.userData.lastX ?? monster.x;
          const lastZ = mesh.userData.lastZ ?? monster.z;
          const moving = Math.hypot(monster.x - lastX, monster.z - lastZ) > 0.003;
          mesh.position.set(monster.x, 0, monster.z);
          mesh.scale.setScalar((mesh.userData.baseScale ?? 1) * (monster.hitTimer > 0 ? 1.16 : 1));
          mesh.lookAt(game.player.x, 0.9, game.player.z);
          animateWalker(mesh, time, moving, monster.type === 'runner' ? 1.45 : monster.type === 'brute' ? 0.7 : 1, monster.type === 'runner' ? 1.45 : monster.type === 'brute' ? 0.72 : 1);
          mesh.userData.lastX = monster.x;
          mesh.userData.lastZ = monster.z;
        });

        monsterMeshes.forEach((mesh, id) => {
          if (!game.monsters.some((monster) => monster.id === id)) {
            scene.remove(mesh);
            monsterMeshes.delete(id);
          }
        });

        game.bullets.forEach((bullet) => {
          if (!bulletMeshes.has(bullet.id)) {
            const grade = bullet.color ? null : gradeMap[game.activeWeapon?.grade] ?? grades[0];
            const mesh = new THREE.Mesh(
              new THREE.SphereGeometry(bullet.radius, 16, 10),
              new THREE.MeshStandardMaterial({
                color: bullet.color ?? grade.color,
                emissive: bullet.color ?? grade.color,
                emissiveIntensity: 1.2,
              })
            );
            scene.add(mesh);
            bulletMeshes.set(bullet.id, mesh);
          }
          bulletMeshes.get(bullet.id).position.set(bullet.x, 0.55, bullet.z);
        });

        bulletMeshes.forEach((mesh, id) => {
          if (!game.bullets.some((bullet) => bullet.id === id)) {
            scene.remove(mesh);
            bulletMeshes.delete(id);
          }
        });
      }

      function animate() {
        const delta = Math.min(clock.getDelta(), 0.033);
        const game = gameRef.current;
        if (game.running) updateGame(game, delta);
        syncMeshes(game, clock.elapsedTime);
        arenaRing.rotation.z += delta * 0.35;
        camera.position.x = game.player.x * 0.45;
        camera.position.y = 12.5;
        camera.position.z = game.player.z + 17.5;
        camera.lookAt(game.player.x, 0.8, game.player.z);
        renderer.render(scene, camera);
        sceneRef.current.frame = window.requestAnimationFrame(animate);
      }

      function resize() {
        if (!mount.clientWidth || !mount.clientHeight) return;
        camera.aspect = mount.clientWidth / mount.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(mount.clientWidth, mount.clientHeight);
      }

      sceneRef.current = { frame: 0 };
      window.addEventListener('resize', resize);
      animate();

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

  useEffect(() => {
    function down(event) {
      keysRef.current[event.key.toLowerCase()] = true;
    }
    function up(event) {
      keysRef.current[event.key.toLowerCase()] = false;
    }
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  function updateGame(game, delta) {
    const keys = keysRef.current;
    const moveX = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
    const moveZ = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
    const moveLength = Math.hypot(moveX, moveZ) || 1;
    const speed = 3.4 * game.speedBonus;
    game.player.x = Math.max(-arenaLimit, Math.min(arenaLimit, game.player.x + (moveX / moveLength) * speed * delta));
    game.player.z = Math.max(-arenaLimit, Math.min(arenaLimit, game.player.z + (moveZ / moveLength) * speed * delta));

    const skillPressed = Boolean(keys.e || keys[' ']);
    if (skillPressed && !game.skillKeyDown) triggerSkill(game);
    game.skillKeyDown = skillPressed;

    game.skillCooldown = Math.max(0, game.skillCooldown - delta);
    if (game.skillTimer > 0) {
      game.skillTimer = Math.max(0, game.skillTimer - delta);
      if (game.skillTimer <= 0) {
        resetSkillEffects(game);
        game.message = '스킬 효과가 끝났습니다. 쿨타임 후 다시 사용할 수 있습니다.';
      }
    }

    if (game.regen > 0) game.hp = Math.min(game.maxHp, game.hp + game.regen * delta);

    game.cooldown -= delta;
    if (game.activeWeapon && game.cooldown <= 0 && game.monsters.length > 0) {
      fireWeapon(game);
      game.cooldown = game.activeWeapon.cooldown * game.cooldownBonus;
    }

    game.bullets.forEach((bullet) => {
      bullet.x += bullet.vx * delta;
      bullet.z += bullet.vz * delta;
      bullet.life -= delta;
    });

    game.bullets.forEach((bullet) => {
      if (bullet.owner !== 'monster') return;
      if (Math.hypot(bullet.x - game.player.x, bullet.z - game.player.z) < bullet.radius + 0.34) {
        game.hp = Math.max(0, game.hp - Math.max(1, bullet.damage - game.armor));
        bullet.hit = true;
        if (game.hp <= 0) {
          game.running = false;
          game.message = '원거리 공격에 쓰러졌습니다. 방어 스킬이나 더 좋은 무기를 노려보세요.';
        }
      }
    });

    game.monsters.forEach((monster) => {
      monster.hitTimer = Math.max(0, monster.hitTimer - delta);
      monster.attackCooldown = Math.max(0, (monster.attackCooldown ?? 0) - delta);
      const type = monsterTypes.find((item) => item.id === monster.type) ?? monsterTypes[0];
      const dx = game.player.x - monster.x;
      const dz = game.player.z - monster.z;
      const length = Math.hypot(dx, dz) || 1;
      const frostFactor = game.frostAura > 0 && length < 4.5 ? Math.max(0.45, 1 - game.frostAura) : 1;

      if (type.ranged && length < 8 && monster.attackCooldown <= 0) {
        monster.attackCooldown = 2.4;
        game.bullets.push({
          id: `${Date.now()}-${Math.random()}`,
          owner: 'monster',
          x: monster.x,
          z: monster.z,
          vx: (dx / length) * 5.2,
          vz: (dz / length) * 5.2,
          damage: monster.damage,
          radius: 0.18,
          life: 2.4,
          color: '#a855f7',
        });
      } else if (!type.ranged || length > 5.8) {
        monster.x += (dx / length) * monster.speed * frostFactor * delta;
        monster.z += (dz / length) * monster.speed * frostFactor * delta;
      }

      if (length < 0.72) {
        game.hp = Math.max(0, game.hp - Math.max(1, monster.damage - game.armor) * delta);
        if (type.explode) {
          monster.hp = 0;
          game.monsters.forEach((nearby) => {
            if (nearby !== monster && Math.hypot(nearby.x - monster.x, nearby.z - monster.z) < 2.3) {
              nearby.hp -= monster.damage * 1.4;
              nearby.hitTimer = 0.2;
            }
          });
        }
        if (game.hp <= 0) {
          game.running = false;
          game.message = '쓰러졌습니다. 난이도를 낮추거나 더 좋은 무기를 뽑아보세요.';
        }
      }
    });

    game.bullets.forEach((bullet) => {
      if (bullet.owner === 'monster') return;
      game.monsters.forEach((monster) => {
        if (bullet.hit || Math.hypot(bullet.x - monster.x, bullet.z - monster.z) > bullet.radius + 0.42) return;
        monster.hp -= bullet.damage;
        monster.hitTimer = 0.16;
        if (!bullet.pierce) bullet.hit = true;

        if (bullet.blast) {
          game.monsters.forEach((nearby) => {
            if (nearby !== monster && Math.hypot(nearby.x - monster.x, nearby.z - monster.z) < bullet.blast) {
              nearby.hp -= bullet.damage * 0.45;
              nearby.hitTimer = 0.16;
            }
          });
        }
      });
    });

    game.bullets = game.bullets.filter((bullet) => !bullet.hit && bullet.life > 0 && Math.hypot(bullet.x, bullet.z) < arenaRadius + 8);

    const before = game.monsters.length;
    game.monsters = game.monsters.filter((monster) => monster.hp > 0);
    const killed = before - game.monsters.length;
    if (killed > 0) {
      game.kills += killed;
      game.waveLeft -= killed;
      addKillCharge(killed, game);
    }

    if (game.running && game.monsters.length === 0) {
      game.wave += 1;
      spawnWave(game);
    }

    setHud({ ...game, player: { ...game.player }, monsters: [...game.monsters], bullets: [...game.bullets] });
  }

  function addKillCharge(killed, game) {
    const current = dailyRef.current;
    const totalCharge = (current.killCharge || 0) + killed;
    const earned = Math.floor(totalCharge / 3);
    const next = {
      ...current,
      killCharge: totalCharge % 3,
      bonusPulls: (current.bonusPulls || 0) + earned,
    };

    dailyRef.current = next;
    saveDailyState(next);
    setDaily(next);

    if (earned > 0) {
      game.message = `몬스터 3마리 처치 보상! 보너스 뽑기 ${earned}개 충전`;
    }
  }

  function fireWeapon(game) {
    const weapon = game.activeWeapon;
    const nearest = [...game.monsters].sort((a, b) => {
      return Math.hypot(a.x - game.player.x, a.z - game.player.z) - Math.hypot(b.x - game.player.x, b.z - game.player.z);
    })[0];
    if (!weapon || !nearest) return;

    const baseAngle = Math.atan2(nearest.z - game.player.z, nearest.x - game.player.x);
    const count = (weapon.count ?? 1) + game.extraProjectiles;
    const spread = weapon.spread ?? 0;
    for (let index = 0; index < count; index += 1) {
      const angle = spread >= Math.PI * 2 ? (Math.PI * 2 * index) / count : baseAngle + (count === 1 ? 0 : (index / (count - 1) - 0.5) * spread);
      game.bullets.push({
        id: `${Date.now()}-${Math.random()}`,
        x: game.player.x,
        z: game.player.z,
        vx: Math.cos(angle) * weapon.speed,
        vz: Math.sin(angle) * weapon.speed,
        damage: weapon.power * game.damageBonus,
        radius: (weapon.grade === 'legend' ? 0.24 : 0.16) * game.projectileScale,
        life: 1.6,
        pierce: Boolean(weapon.pierce),
        blast: weapon.blast ? weapon.blast * game.projectileScale : undefined,
      });
    }
  }

  function startGame() {
    const next = createGameState(difficultyId);
    next.running = true;
    next.activeWeapon = gameRef.current.activeWeapon;
    next.activeSkills = gameRef.current.activeSkills;
    spawnWave(next);
    gameRef.current = next;
    setHud({ ...next });
  }

  function pullOne() {
    if (daily.pulls >= 10) {
      const message = '오늘 뽑기는 모두 사용했습니다. 내일 다시 10번 충전됩니다.';
      gameRef.current.message = message;
      setHud({ ...gameRef.current });
      return;
    }

    const reward = drawReward();
    const item = { ...reward, uid: `${Date.now()}-${Math.random().toString(16).slice(2)}` };
    const nextDaily = { date: todayKey(), pulls: daily.pulls + 1, history: [item, ...daily.history].slice(0, 20) };
    saveDailyState(nextDaily);
    setDaily(nextDaily);

    if (item.kind === 'weapon') {
      gameRef.current.activeWeapon = item;
      gameRef.current.cooldown = 0;
      gameRef.current.message = `${gradeMap[item.grade].name} 무기 장착: ${item.name}. 이전 공격 무기 효과는 사라졌습니다.`;
    } else {
      equipSkill(gameRef.current, item);
      gameRef.current.message = `${gradeMap[item.grade].name} 스킬 획득: ${item.name}`;
    }
    setHud({ ...gameRef.current });
  }

  function pullOneWithBonus() {
    const currentDaily = dailyRef.current;
    if (currentDaily.pulls >= 10 && currentDaily.bonusPulls <= 0) {
      gameRef.current.message = '오늘 기본 뽑기와 보너스 뽑기를 모두 사용했습니다. 몬스터 3마리를 처치하면 보너스 뽑기 1개가 충전됩니다.';
      setHud({ ...gameRef.current });
      return;
    }

    const reward = drawReward();
    const item = { ...reward, uid: `${Date.now()}-${Math.random().toString(16).slice(2)}` };
    const nextDaily = {
      ...currentDaily,
      date: todayKey(),
      pulls: currentDaily.pulls < 10 ? currentDaily.pulls + 1 : currentDaily.pulls,
      bonusPulls: currentDaily.pulls < 10 ? currentDaily.bonusPulls : Math.max(0, currentDaily.bonusPulls - 1),
      history: [item, ...currentDaily.history].slice(0, 30),
    };

    saveDailyState(nextDaily);
    dailyRef.current = nextDaily;
    setDaily(nextDaily);

    if (item.kind === 'weapon') {
      gameRef.current.activeWeapon = item;
      gameRef.current.cooldown = 0;
      gameRef.current.message = `${gradeMap[item.grade].name} 무기 획득: ${item.name}. 이전 무기도 보관되어 다시 장착할 수 있습니다.`;
    } else {
      equipSkill(gameRef.current, item);
      gameRef.current.message = `${gradeMap[item.grade].name} 스킬 획득: ${item.name}`;
    }
    setHud({ ...gameRef.current });
  }

  function equipWeapon(item) {
    if (item.kind !== 'weapon') return;
    gameRef.current.activeWeapon = item;
    gameRef.current.cooldown = 0;
    gameRef.current.message = `보유 무기 장착: ${item.name}`;
    setHud({ ...gameRef.current });
  }

  function activateEquippedSkill() {
    triggerSkill(gameRef.current);
    setHud({ ...gameRef.current });
  }

  const difficulty = difficulties.find((item) => item.id === difficultyId) ?? difficulties[1];
  const hpRatio = Math.max(0, Math.min(100, (hud.hp / hud.maxHp) * 100));

  return (
    <section className="summonPage">
      <div className="summonHeader">
        <div>
          <span>3D Wave Hunt</span>
          <h1>3D 몬스터 웨이브</h1>
        </div>
        <button type="button" onClick={pullOneWithBonus} disabled={daily.pulls >= 10 && daily.bonusPulls <= 0}>
          오늘 뽑기 {10 - daily.pulls}/10
        </button>
        <div className="pullInfo">
          기본 {Math.max(0, 10 - daily.pulls)} · 보너스 {daily.bonusPulls} · 처치 충전 {daily.killCharge}/3
        </div>
      </div>

      <div className="summonLayout">
        <div className="scenePanel">
          <div ref={mountRef} className="threeMount" />
          <div className="battleHud">
            <div>
              <span>PLAYER HP</span>
              <strong>{Math.ceil(hud.hp)} / {hud.maxHp}</strong>
            </div>
            <i><b style={{ width: `${hpRatio}%` }} /></i>
            <p>WASD / 방향키 이동 · 몬스터가 플레이어를 추적합니다</p>
          </div>
          <div className="waveHud">
            <span>WAVE {hud.wave}</span>
            <strong>{hud.monsters.length}마리</strong>
          </div>
        </div>

        <aside className="summonPanel">
          <div className="messageBox">{hud.message}</div>

          <div className="difficultyBox">
            <span>난이도 선택</span>
            <div>
              {difficulties.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={difficultyId === item.id ? 'active' : ''}
                  disabled={hud.running}
                  onClick={() => setDifficultyId(item.id)}
                >
                  {item.name}
                </button>
              ))}
            </div>
            <em>현재: {difficulty.name}</em>
          </div>

          <button type="button" className="startButton" onClick={startGame}>
            {hud.running ? '처음부터 재시작' : '게임 시작'}
          </button>

          <div className="activeBox">
            <span>현재 공격 무기</span>
            {hud.activeWeapon ? (
              <strong style={{ color: gradeMap[hud.activeWeapon.grade].color }}>{hud.activeWeapon.name}</strong>
            ) : (
              <strong>없음</strong>
            )}
            <p>무기를 새로 뽑으면 이전 공격 무기는 교체됩니다.</p>
          </div>

          <div className="activeBox">
            <span>활성 스킬</span>
            <strong>{hud.activeSkills.length}개</strong>
            <p>
              방어 {hud.armor} · 탄범위 {Math.round(hud.projectileScale * 100)}% · 추가탄 {hud.extraProjectiles} · 빙결 {Math.round(hud.frostAura * 100)}%
            </p>
          </div>

          <div className="activeBox">
            <span>장착 스킬</span>
            {hud.activeSkills[0] ? (
              <strong style={{ color: gradeMap[hud.activeSkills[0].grade].color }}>{hud.activeSkills[0].name}</strong>
            ) : (
              <strong>없음</strong>
            )}
            <p>
              E / Space 발동 · 지속 {Math.ceil(hud.skillTimer)}초 · 쿨타임 {Math.ceil(hud.skillCooldown)}초
            </p>
            <button type="button" className="skillButton" onClick={activateEquippedSkill} disabled={!hud.activeSkills[0] || hud.skillCooldown > 0}>
              스킬 발동
            </button>
          </div>

          <div className="monsterTypeBox">
            {monsterTypes.map((type) => (
              <div key={type.id} style={{ borderColor: type.color }}>
                <span style={{ color: type.color }}>{type.name}</span>
              </div>
            ))}
          </div>

          <div className="gradeGrid">
            {grades.map((grade) => (
              <div key={grade.id} style={{ borderColor: grade.color }}>
                <span style={{ color: grade.color }}>{grade.name}</span>
                <strong>{grade.weight}%</strong>
                <em>2개</em>
              </div>
            ))}
          </div>

          <div className="inventoryList">
            {daily.history.map((item) => {
              const grade = gradeMap[item.grade];
              return (
                <div
                  key={item.uid}
                  role={item.kind === 'weapon' ? 'button' : undefined}
                  tabIndex={item.kind === 'weapon' ? 0 : undefined}
                  className={hud.activeWeapon?.uid === item.uid ? 'active' : ''}
                  onClick={() => equipWeapon(item)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') equipWeapon(item);
                  }}
                  style={{ borderColor: grade.color }}
                >
                  <span style={{ background: grade.color }}>{grade.name}</span>
                  <strong>{item.name}</strong>
                  <em>{item.kind === 'weapon' ? '공격 무기' : '스킬'} · 전투력 {item.power}</em>
                  <small>{item.text}</small>
                </div>
              );
            })}
            {daily.history.length === 0 && <p>아직 뽑은 보상이 없습니다. 하루 10번까지 뽑을 수 있습니다.</p>}
          </div>

          <p className="oddsText">{oddsText}</p>
        </aside>
      </div>

      <style jsx>{`
        .summonPage {
          min-height: calc(100vh - var(--site-nav-height));
          padding: 18px;
          background:
            radial-gradient(circle at 18% 10%, rgba(56, 189, 248, 0.18), transparent 28%),
            radial-gradient(circle at 82% 4%, rgba(250, 204, 21, 0.14), transparent 28%),
            #08111f;
          color: #f8fafc;
        }

        .summonHeader,
        .summonLayout {
          width: min(1280px, 100%);
          margin: 0 auto;
        }

        .summonHeader {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 14px;
        }

        .summonHeader span,
        .battleHud span,
        .difficultyBox span,
        .activeBox span {
          display: block;
          color: #93c5fd;
          font-size: 11px;
          font-weight: 900;
        }

        .summonHeader h1 {
          margin: 4px 0 0;
          font-size: 38px;
          line-height: 1;
        }

        .summonHeader button,
        .startButton {
          min-height: 46px;
          padding: 0 18px;
          border: 0;
          border-radius: 8px;
          background: #facc15;
          color: #111827;
          font-weight: 900;
          cursor: pointer;
        }

        .summonHeader button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .skillButton {
          width: 100%;
          min-height: 38px;
          margin-top: 10px;
          border: 1px solid rgba(103, 232, 249, 0.42);
          border-radius: 8px;
          background: #0891b2;
          color: #ecfeff;
          font-weight: 900;
          cursor: pointer;
        }

        .skillButton:disabled {
          opacity: 0.48;
          cursor: not-allowed;
        }

        .pullInfo {
          align-self: center;
          color: #cbd5e1;
          font-size: 12px;
          font-weight: 900;
          line-height: 1.35;
        }

        .summonLayout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 370px;
          gap: 14px;
        }

        .scenePanel,
        .summonPanel {
          border: 1px solid rgba(226, 232, 240, 0.14);
          border-radius: 8px;
          background: rgba(15, 23, 42, 0.72);
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.34);
        }

        .scenePanel {
          min-height: calc(100vh - var(--site-nav-height) - 96px);
          position: relative;
          overflow: hidden;
        }

        .threeMount {
          position: absolute;
          inset: 0;
        }

        .battleHud,
        .waveHud {
          position: absolute;
          z-index: 2;
          padding: 12px;
          border: 1px solid rgba(226, 232, 240, 0.16);
          border-radius: 8px;
          background: rgba(8, 17, 31, 0.76);
          backdrop-filter: blur(10px);
        }

        .battleHud {
          width: min(360px, calc(100% - 24px));
          top: 12px;
          left: 12px;
        }

        .battleHud strong {
          display: block;
          margin-top: 4px;
          font-size: 24px;
        }

        .battleHud p {
          margin: 8px 0 0;
          color: #cbd5e1;
          font-size: 12px;
          font-weight: 800;
        }

        .battleHud i {
          height: 10px;
          display: block;
          overflow: hidden;
          margin-top: 10px;
          border-radius: 999px;
          background: #1e293b;
        }

        .battleHud b {
          height: 100%;
          display: block;
          border-radius: inherit;
          background: linear-gradient(90deg, #ef4444, #facc15);
          transition: width 160ms ease;
        }

        .waveHud {
          right: 12px;
          top: 12px;
          text-align: right;
        }

        .waveHud span,
        .waveHud strong {
          display: block;
          font-weight: 900;
        }

        .waveHud strong {
          margin-top: 4px;
          font-size: 22px;
        }

        .summonPanel {
          min-height: calc(100vh - var(--site-nav-height) - 96px);
          padding: 14px;
          display: grid;
          align-content: start;
          gap: 12px;
        }

        .messageBox,
        .difficultyBox,
        .activeBox {
          padding: 12px;
          border: 1px solid rgba(148, 163, 184, 0.22);
          border-radius: 8px;
          background: rgba(8, 17, 31, 0.76);
        }

        .messageBox {
          min-height: 64px;
          color: #dbeafe;
          font-weight: 900;
          line-height: 1.45;
        }

        .difficultyBox div {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 6px;
          margin-top: 8px;
        }

        .difficultyBox button {
          min-height: 34px;
          border: 1px solid rgba(148, 163, 184, 0.25);
          border-radius: 8px;
          background: rgba(15, 23, 42, 0.9);
          color: #f8fafc;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .difficultyBox button.active {
          border-color: #facc15;
          background: #facc15;
          color: #111827;
        }

        .difficultyBox button:disabled {
          opacity: 0.58;
          cursor: not-allowed;
        }

        .difficultyBox em,
        .activeBox p,
        .oddsText {
          display: block;
          margin: 8px 0 0;
          color: #cbd5e1;
          font-size: 12px;
          font-style: normal;
          font-weight: 800;
          line-height: 1.4;
        }

        .activeBox strong {
          display: block;
          margin-top: 6px;
          font-size: 22px;
        }

        .gradeGrid,
        .monsterTypeBox {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .gradeGrid div,
        .monsterTypeBox div {
          padding: 10px;
          border: 1px solid;
          border-radius: 8px;
          background: rgba(15, 23, 42, 0.78);
        }

        .gradeGrid span,
        .gradeGrid strong,
        .gradeGrid em,
        .monsterTypeBox span {
          display: block;
          font-weight: 900;
        }

        .monsterTypeBox span {
          font-size: 12px;
        }

        .gradeGrid strong {
          margin-top: 4px;
          color: #f8fafc;
          font-size: 18px;
        }

        .gradeGrid em {
          color: #cbd5e1;
          font-size: 12px;
          font-style: normal;
        }

        .inventoryList {
          max-height: 34vh;
          overflow-y: auto;
          display: grid;
          gap: 8px;
          padding-right: 3px;
        }

        .inventoryList div {
          min-height: 88px;
          display: grid;
          grid-template-columns: 72px minmax(0, 1fr);
          gap: 4px 10px;
          padding: 10px;
          border: 1px solid;
          border-radius: 8px;
          background: rgba(15, 23, 42, 0.82);
        }

        .inventoryList div[role="button"] {
          cursor: pointer;
        }

        .inventoryList div.active {
          box-shadow: 0 0 0 3px rgba(250, 204, 21, 0.22);
        }

        .inventoryList span {
          grid-row: span 3;
          align-self: center;
          padding: 7px 6px;
          border-radius: 8px;
          color: #111827;
          font-size: 12px;
          font-weight: 900;
          text-align: center;
        }

        .inventoryList strong,
        .inventoryList em,
        .inventoryList small {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .inventoryList em,
        .inventoryList small {
          color: #cbd5e1;
          font-style: normal;
          font-weight: 800;
        }

        .inventoryList p {
          margin: 0;
          color: #cbd5e1;
          font-weight: 800;
          line-height: 1.5;
        }

        @media (max-width: 900px) {
          .summonHeader {
            display: grid;
            align-items: stretch;
          }

          .summonHeader h1 {
            font-size: 30px;
          }

          .summonLayout {
            grid-template-columns: 1fr;
          }

          .scenePanel {
            min-height: 60vh;
          }

          .summonPanel {
            min-height: 0;
          }
        }
      `}</style>
    </section>
  );
}
