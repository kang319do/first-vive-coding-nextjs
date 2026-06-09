import Link from 'next/link';

const studyTools = [
  {
    href: '/study-zone/typing',
    title: '타자연습',
    description: '자리연습과 단어 만들기를 단계별로 연습합니다.',
  },
];

export default function StudyZoneHome() {
  return (
    <section className="studyZoneHome">
      <div className="studyZoneIntro">
        <span>Study Zone</span>
        <h1>Study Zone</h1>
        <p>타자연습 같은 공부 프로그램은 이곳에 모아둡니다.</p>
      </div>

      <div className="pageGrid">
        {studyTools.map((tool) => (
          <Link key={tool.href} href={tool.href} className="pageCard">
            <span>{tool.title}</span>
            <p>{tool.description}</p>
          </Link>
        ))}
      </div>

      <style jsx>{`
        .studyZoneHome {
          min-height: calc(100vh - var(--site-nav-height));
          padding: 64px 24px;
          background:
            linear-gradient(rgba(37, 99, 235, 0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(15, 23, 42, 0.05) 1px, transparent 1px),
            #eef4fb;
          background-size: 38px 38px, 38px 38px, auto;
          color: #111827;
        }

        .studyZoneIntro {
          width: min(960px, 100%);
          margin: 0 auto;
        }

        .studyZoneIntro span {
          color: #2563eb;
          font-size: 13px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .studyZoneIntro h1 {
          margin: 8px 0 0;
          color: #0f172a;
          font-size: 48px;
          line-height: 1;
        }

        .studyZoneIntro p {
          margin: 14px 0 0;
          color: #475569;
          font-size: 16px;
          font-weight: 800;
        }

        @media (max-width: 720px) {
          .studyZoneHome {
            padding: 42px 18px;
          }

          .studyZoneIntro h1 {
            font-size: 38px;
          }
        }
      `}</style>
    </section>
  );
}
