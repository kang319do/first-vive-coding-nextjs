import Link from 'next/link';

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
    description: '슬라이딩·공중 대시·블록 쌓기·벽점프로 극악 50스테이지를 돌파하는 파쿠르 게임',
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

export default function Home() {
  return (
    <section className="homePage">
      <div className="homeIntro">
        <p>상단 메뉴나 아래 카드를 눌러 원하는 페이지로 이동하세요.</p>
        <h1>Game Lab</h1>
      </div>

      <div className="pageGrid">
        {pages.map((page) => (
          <Link key={page.href} href={page.href} className="pageCard">
            <span>{page.title}</span>
            <p>{page.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
