import { useEffect, useState } from 'react';
import Link from 'next/link';
import profileStyles from '@/styles/PlayerProfile.module.css';

const pureHallKey = 'jump-map-pure-clear-hall-v1';

const pages = [
  {
    href: '/bounce',
    title: '바운스 게임',
    description: '공을 조종해서 위험한 블록을 피해 목표 지점까지 가는 게임',
  },
  {
    href: '/swing-hook',
    title: 'Swing Hook',
    description: '줄을 걸고 놓는 타이밍으로 하늘 코스를 통과하는 스윙 액션 게임',
  },
  {
    href: '/jump-map',
    title: 'Jump Map',
    description: '슬라이딩·공중 대시·블록 쌓기·벽점프로 극악 70스테이지를 돌파하는 파쿠르 게임',
  },
  {
    href: '/rpg',
    title: 'RPG 게임',
    description: '다양한 맵을 탐험하고 무기를 바꿔가며 몬스터와 싸우는 2D RPG 게임',
  },
  {
    href: '/tangtang',
    title: '탕탕 서바이벌',
    description: '몰려오는 적을 처치하고 무기를 강화하며 오래 버티는 액션 게임',
  },
];

export default function Home({ playerName = '', openNameModal }) {
  const [pureClearHall, setPureClearHall] = useState([]);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(pureHallKey) || '[]');
      if (Array.isArray(saved)) {
        setPureClearHall(saved.filter((entry) => entry && typeof entry.name === 'string' && entry.name.trim()));
      }
    } catch {
      setPureClearHall([]);
    }
  }, []);

  return (
    <section className="homePage">
      <div className="homeIntro">
        <div className={profileStyles.greetingRow}>
          <p>
            {playerName
              ? `👋 ${playerName}님, GANGYOON!LAB!에 오신 걸 환영해요!`
              : '게임·스터디·일상 기능을 하나씩 만들어 채워가는 실험실'}
          </p>
          {openNameModal && (
            <button type="button" className={profileStyles.renameBtn} onClick={openNameModal}>
              ✏️ {playerName ? '이름 변경' : '이름 정하기'}
            </button>
          )}
        </div>
        <h1>GANGYOON!LAB!</h1>
      </div>

      <div className="pageGrid">
        {pages.map((page) => (
          <Link key={page.href} href={page.href} className="pageCard">
            <span>{page.title}</span>
            <p>{page.description}</p>
          </Link>
        ))}
      </div>

      {pureClearHall.length > 0 && (
        <footer className="lobbyHonorRoll" aria-label="Jump Map 정통 클리어 명단">
          <span className="lobbyHonorLabel">🏆 Jump Map 정통 클리어</span>
          <div className="lobbyHonorNames">
            {pureClearHall.map((entry, idx) => (
              <span key={`${entry.name}-${entry.clearedAt || idx}`} className="lobbyHonorName">
                {entry.name}
              </span>
            ))}
          </div>
        </footer>
      )}
    </section>
  );
}
