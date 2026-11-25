import '@/styles/globals.css';
import profileStyles from '@/styles/PlayerProfile.module.css';
import { isMenuGroupActive, navigationMenus } from '@/config/navigation';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';

const PLAYER_NAME_KEY = 'gangyoon-lab-nickname-v1';
const NAME_PRESETS = ['강윤', '특공대원', '점프마스터', '샌즈러버'];

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const navRef = useRef(null);
  const lastPointerTypeRef = useRef('mouse');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [nameDraft, setNameDraft] = useState('');
  const [nameModalOpen, setNameModalOpen] = useState(false);

  const activeGroup =
    navigationMenus.find((group) => isMenuGroupActive(group, router.pathname)) ?? navigationMenus[0];
  const activeItem = activeGroup?.items.find((item) => item.href === router.pathname);
  const pageTitle =
    activeItem && activeItem.href !== '/' ? `${activeItem.label} · GANGYOON!LAB!` : 'GANGYOON!LAB!';

  useEffect(() => {
    try {
      const saved = (window.localStorage.getItem(PLAYER_NAME_KEY) || '').trim();
      if (saved) {
        setPlayerName(saved);
        setNameDraft(saved);
      } else {
        setNameModalOpen(true);
      }
    } catch {
      setNameModalOpen(true);
    }
  }, []);

  function openNameModal() {
    setNameDraft(playerName);
    setNameModalOpen(true);
  }

  function savePlayerName(nextRaw) {
    const cleaned = String(nextRaw ?? '').trim().slice(0, 14);
    if (!cleaned) return;
    setPlayerName(cleaned);
    setNameDraft(cleaned);
    setNameModalOpen(false);
    try {
      window.localStorage.setItem(PLAYER_NAME_KEY, cleaned);
    } catch {
      // Ignore storage write failure.
    }
  }

  function handleNameSubmit(event) {
    event.preventDefault();
    savePlayerName(nameDraft);
  }

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
        <title>{pageTitle}</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />
      </Head>
      <header className="siteHeader">
        <nav className="siteNav" aria-label="주 메뉴" ref={navRef}>
          <div className="siteNavLeft">
            <Link
              href="/"
              className="siteBrand"
              aria-label="GANGYOON!LAB! 홈"
              onClick={() => setOpenMenuId(null)}
            >
              <span className="siteBrandMark" aria-hidden="true">G</span>
              <span className="siteBrandText">
                GANGYOON<span className="siteBrandBang">!</span>
                <span className="siteBrandAccent">LAB</span>
                <span className="siteBrandBang">!</span>
              </span>
            </Link>

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
          </div>

          <div className={profileStyles.navRight}>
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
            <button
              type="button"
              className={profileStyles.playerBadge}
              onClick={openNameModal}
              title="클릭해서 플레이어 이름 변경"
            >
              <span aria-hidden="true">👤</span>
              <span>{playerName || '이름 설정'}</span>
            </button>
          </div>
        </nav>
      </header>
      <main className="siteMain">
        <Component {...pageProps} playerName={playerName} openNameModal={openNameModal} />
      </main>

      {nameModalOpen && (
        <div
          className={profileStyles.modalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-label="플레이어 이름 설정"
          onKeyDown={(e) => {
            if (e.key === 'Escape' && playerName) {
              setNameModalOpen(false);
            }
            e.stopPropagation();
          }}
        >
          <div className={profileStyles.modalCard}>
            <span className={profileStyles.modalTag}>WELCOME TO GANGYOON!LAB!</span>
            <h2>👋 시작하기 전에 이름을 정해주세요!</h2>
            <p>
              설정한 이름은 상단 프로필과 게임 기록·명예의 전당에 사용됩니다. 언제든 상단 이름 버튼을 눌러 바꿀 수 있어요.
            </p>
            <form className={profileStyles.modalForm} onSubmit={handleNameSubmit}>
              <input
                type="text"
                className={profileStyles.modalInput}
                value={nameDraft}
                maxLength={14}
                autoFocus
                placeholder="사용할 이름 입력 (최대 14자)"
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter' && e.key !== 'Escape') {
                    e.stopPropagation();
                  }
                }}
              />
              <div className={profileStyles.presetRow} aria-label="추천 이름 빠른 선택">
                {NAME_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={profileStyles.presetChip}
                    onClick={() => setNameDraft(preset)}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <div className={profileStyles.modalActions}>
                <button
                  type="submit"
                  className={profileStyles.modalSubmit}
                  disabled={!nameDraft.trim()}
                >
                  🚀 {playerName ? '이름 변경하기' : '이 이름으로 시작하기'}
                </button>
                {playerName && (
                  <button
                    type="button"
                    className={profileStyles.modalCancel}
                    onClick={() => setNameModalOpen(false)}
                  >
                    닫기
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
