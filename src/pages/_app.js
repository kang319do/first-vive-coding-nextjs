import '@/styles/globals.css';
import Link from 'next/link';
import { useRouter } from 'next/router';

const gameMenuItems = [
  { href: '/', label: 'Game Lab' },
  { href: '/bounce', label: '바운스 게임' },
  { href: '/swing-hook', label: 'Swing Hook' },
  { href: '/rpg', label: 'RPG 게임' },
  { href: '/tangtang', label: '탕탕 서바이벌' },
  { href: '/summon3d', label: '3D 소환 사냥' },
  { href: '/hero-arena', label: '영웅 전장' },
];

const studyMenuItems = [
  { href: '/study-zone', label: 'Study Zone' },
  { href: '/study-zone/typing', label: '타자연습' },
];

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const isStudyZone = router.pathname.startsWith('/study-zone');
  const activeMenuItems = isStudyZone ? studyMenuItems : gameMenuItems;

  return (
    <>
      <header className="siteHeader">
        <nav className="siteNav" aria-label="주 메뉴">
          <div className="sitePicker">
            <span className={isStudyZone ? 'siteLogo study' : 'siteLogo'}>
              {isStudyZone ? 'Study Zone' : 'Game Lab'}
            </span>
            <div className="siteModeToggle" aria-label="사이트 모드 선택">
              <Link href="/" className={isStudyZone ? '' : 'active'} aria-current={isStudyZone ? undefined : 'page'}>
                Game Lab
              </Link>
              <Link href="/study-zone" className={isStudyZone ? 'active' : ''} aria-current={isStudyZone ? 'page' : undefined}>
                Study Zone
              </Link>
            </div>
          </div>
          <div className="siteMenu">
            {activeMenuItems.map((item) => {
              const isActive = router.pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={isActive ? 'siteMenuLink active' : 'siteMenuLink'}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>
      <main className="siteMain">
        <Component {...pageProps} />
      </main>
    </>
  );
}
