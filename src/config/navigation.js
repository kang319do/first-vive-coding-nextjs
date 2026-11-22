export const navigationMenus = [
  {
    id: 'game-lab',
    label: '게임랩',
    href: '/',
    accent: 'game',
    items: [
      { href: '/', label: '게임랩 홈' },
      { href: '/bounce', label: '바운스 게임' },
      { href: '/swing-hook', label: 'Swing Hook' },
      { href: '/jump-map', label: 'Jump Map' },
      { href: '/rpg', label: 'RPG 게임' },
      { href: '/tangtang', label: '탕탕 서바이벌' },
    ],
  },
  {
    id: 'study-lab',
    label: '스터디랩',
    href: '/study-zone',
    basePath: '/study-zone',
    accent: 'study',
    items: [
      { href: '/study-zone', label: '스터디랩 홈' },
      { href: '/study-zone/typing', label: '타자연습' },
    ],
  },
];

export function isMenuGroupActive(group, pathname) {
  if (pathname === group.href) {
    return true;
  }

  if (group.basePath && pathname.startsWith(`${group.basePath}/`)) {
    return true;
  }

  return group.items.some((item) => item.href === pathname);
}
