import Link from 'next/link';

const pages = [
  {
    href: '/bounce',
    title: '바운스 게임',
    description: '튀어 오르는 공을 조종해서 위험한 블록을 피해 목표 지점까지 가는 게임',
  },
  {
    href: '/rpg',
    title: 'RPG 게임',
    description: '여러 맵을 탐험하며 블록과 구조물을 설치하는 2D RPG 게임',
  },
  {
    href: '/tangtang',
    title: '탕탕 특공대',
    description: '몰려오는 적을 피하고 자동 무기와 레벨 업 강화로 오래 버티는 생존 액션 게임',
  },
  {
    href: '/pokopia',
    title: '포코피아 진행판',
    description: '할 일을 체크하고 포켓몬 API 정보를 보며 진행률을 확인하는 페이지',
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
