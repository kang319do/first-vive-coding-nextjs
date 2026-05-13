import Link from 'next/link';

const pages = [
  {
    href: '/bounce',
    title: '바운스게임',
    description: '움직이는 발판과 위험 블록을 지나 목표 지점까지 도착하는 게임',
  },
  {
    href: '/rpg',
    title: 'RPG게임',
    description: '여러 맵을 탐험하며 블록과 구조물을 설치하는 2D RPG 게임',
  },
];

export default function Home() {
  return (
    <section className="homePage">
      <div className="homeIntro">
        <p>상단 메뉴의 버튼을 눌러 게임 페이지로 이동하세요.</p>
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
