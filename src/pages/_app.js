import "@/styles/globals.css";
import Link from "next/link";
import { useRouter } from "next/router";

const menuItems = [
  { href: "/", label: "홈" },
  { href: "/bounce", label: "바운스게임" },
  { href: "/rpg", label: "RPG게임" },
];

export default function App({ Component, pageProps }) {
  const router = useRouter();

  return (
    <>
      <header className="siteHeader">
        <nav className="siteNav" aria-label="주 메뉴">
          <Link href="/" className="siteLogo">
            Game Lab
          </Link>
          <div className="siteMenu">
            {menuItems.map((item) => {
              const isActive = router.pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={isActive ? "siteMenuLink active" : "siteMenuLink"}
                  aria-current={isActive ? "page" : undefined}
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
