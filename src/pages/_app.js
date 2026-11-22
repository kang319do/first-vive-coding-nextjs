import '@/styles/globals.css';
import { isMenuGroupActive, navigationMenus } from '@/config/navigation';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const navRef = useRef(null);
  const lastPointerTypeRef = useRef('mouse');
  const [openMenuId, setOpenMenuId] = useState(null);

  const activeGroup =
    navigationMenus.find((group) => isMenuGroupActive(group, router.pathname)) ?? navigationMenus[0];
  const activeItem = activeGroup?.items.find((item) => item.href === router.pathname);

  useEffect(() => {
    const handleRouteStart = () => {
      setOpenMenuId(null);
    };

    router.events.on('routeChangeStart', handleRouteStart);
    return () => {
      router.events.off('routeChangeStart', handleRouteStart);
    };
  }, [router.events]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpenMenuId(null);
      }
    };

    const handlePointerDown = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setOpenMenuId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('pointerdown', handlePointerDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  return (
    <>
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />
      </Head>
      <header className="siteHeader">
        <nav className="siteNav" aria-label="주 메뉴" ref={navRef}>
          <ul className="topMenuList">
            {navigationMenus.map((group) => {
              const isGroupActive = isMenuGroupActive(group, router.pathname);
              const isOpen = openMenuId === group.id;

              return (
                <li
                  key={group.id}
                  className={`topMenuItem${isOpen ? ' isOpen' : ''}`}
                  onMouseEnter={() => {
                    if (lastPointerTypeRef.current !== 'touch') {
                      setOpenMenuId(group.id);
                    }
                  }}
                  onMouseLeave={() => {
                    if (lastPointerTypeRef.current !== 'touch') {
                      setOpenMenuId((current) => (current === group.id ? null : current));
                    }
                  }}
                >
                  <div className="topMenuTriggerGroup">
                    <Link
                      href={group.href}
                      className={`topMenuLink${isGroupActive ? ' active' : ''}${group.accent ? ` accent-${group.accent}` : ''}`}
                      aria-current={router.pathname === group.href ? 'page' : undefined}
                      aria-expanded={isOpen}
                      aria-haspopup="true"
                      onPointerDown={(event) => {
                        lastPointerTypeRef.current = event.pointerType || 'mouse';
                      }}
                      onFocus={() => {
                        if (lastPointerTypeRef.current !== 'touch') {
                          setOpenMenuId(group.id);
                        }
                      }}
                      onClick={(event) => {
                        if (lastPointerTypeRef.current === 'touch' && !isOpen) {
                          event.preventDefault();
                          setOpenMenuId(group.id);
                          return;
                        }
                        setOpenMenuId(null);
                      }}
                    >
                      <span>{group.label}</span>
                      <svg
                        className="topMenuChevron"
                        viewBox="0 0 16 16"
                        width="14"
                        height="14"
                        aria-hidden="true"
                      >
                        <path
                          d="M4 6l4 4 4-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </Link>
                  </div>

                  <div className="subMenuWrap" aria-hidden={!isOpen}>
                    <ul className="subMenuList" aria-label={`${group.label} 하위 메뉴`}>
                      {group.items.map((item) => {
                        const isItemActive = router.pathname === item.href;

                        return (
                          <li key={item.href} className="subMenuItem">
                            <Link
                              href={item.href}
                              className={`subMenuLink${isItemActive ? ' active' : ''}`}
                              aria-current={isItemActive ? 'page' : undefined}
                              tabIndex={isOpen ? 0 : -1}
                              onClick={() => setOpenMenuId(null)}
                            >
                              <span className="subMenuDot" aria-hidden="true" />
                              <span>{item.label}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </li>
              );
            })}
          </ul>

          {activeGroup && (
            <div className="siteCurrentPath" aria-label="현재 위치">
              <span className="siteCurrentGroup">{activeGroup.label}</span>
              {activeItem && activeItem.href !== activeGroup.href && (
                <>
                  <span className="siteCurrentDivider" aria-hidden="true">/</span>
                  <span className="siteCurrentPage">{activeItem.label}</span>
                </>
              )}
            </div>
          )}
        </nav>
      </header>
      <main className="siteMain">
        <Component {...pageProps} />
      </main>
    </>
  );
}
