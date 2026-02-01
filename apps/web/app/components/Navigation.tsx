"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navigation() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };
  
  const navLinkStyle = (path: string) => ({
    padding: "12px 24px",
    textDecoration: "none",
    color: "#000",
    fontWeight: isActive(path) ? "bold" : "normal",
    borderBottom: isActive(path) ? "2px solid #000" : "2px solid transparent",
  });

  return (
    <nav style={{
      borderBottom: "1px solid #ddd",
      marginBottom: "24px",
      backgroundColor: "#fff"
    }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", gap: "8px" }}>
        <Link href="/" style={navLinkStyle("/")}>
          Home
        </Link>
        <Link href="/markets" style={navLinkStyle("/markets")}>
          Markets
        </Link>
        <Link href="/trade" style={navLinkStyle("/trade")}>
          Trade
        </Link>
      </div>
    </nav>
  );
}
