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
    href: '/rpg',
    title: 'RPG 게임',
    description: '마을을 탐험하고 블록과 구조물을 설치하는 2D RPG 게임',
  },
  {
    href: '/tangtang',
    title: '탕탕 서바이벌',
    description: '몰려오는 적을 처치하고 무기를 강화하며 오래 버티는 액션 게임',
  },
  {
    href: '/summon3d',
    title: '3D 소환 사냥',
    description: '무기와 스킬을 뽑고 3D 몬스터 웨이브를 사냥하는 게임',
  },
  {
    href: '/hero-arena',
    title: '블록 영웅 전장',
    description: '영웅을 골라 3D 전장에서 스킬 콤보로 봇 적들을 KO시키는 아레나 게임',
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
