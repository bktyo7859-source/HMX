"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu, X } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // On home page, navbar becomes visible and white as user scrolls past the hero video
  const isHomePage = pathname === "/";

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 120) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Properties", href: "/properties" },
    { name: "Predict", href: "/predict" },
    { name: "Insights", href: "/insights" },
    { name: "About", href: "/about" },
    { name: "ML Analytics", href: "/ml-dashboard" },
  ];

  // If on home page and not yet scrolled, show subtle translucent/floating header or reveal on scroll
  const navBackground = isHomePage && !isScrolled
    ? "bg-transparent text-white border-transparent"
    : "bg-white/95 backdrop-blur-md text-[#111111] border-[#EAEAEA] shadow-[0_2px_16px_rgba(0,0,0,0.03)]";

  const logoColor = isHomePage && !isScrolled ? "text-white" : "text-[#111111]";
  const linkColor = isHomePage && !isScrolled
    ? "text-white/80 hover:text-white"
    : "text-[#6B6B6B] hover:text-[#111111]";
  const ctaClasses = isHomePage && !isScrolled
    ? "bg-white text-[#111111] hover:bg-[#F5EFE6]"
    : "bg-[#111111] text-white hover:bg-[#262626]";

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-400 ease-out border-b ${navBackground}`}
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 group focus:outline-none"
        >
          <span
            className={`font-serif text-2xl sm:text-3xl font-medium tracking-[0.18em] uppercase ${logoColor} transition-colors duration-300`}
            style={{
              fontFamily: "var(--font-cormorant), Cormorant Garamond, serif",
              letterSpacing: "0.18em",
            }}
          >
            HMX
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-8 lg:space-x-10">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href === "/ml-dashboard" && pathname === "/analytics");
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`text-sm font-sans tracking-wide transition-colors duration-200 relative py-1 ${
                  isActive
                    ? `${isHomePage && !isScrolled ? "text-white font-medium" : "text-[#111111] font-medium"}`
                    : linkColor
                }`}
                style={{ fontFamily: "var(--font-dmsans), DM Sans, sans-serif" }}
              >
                {link.name}
                {isActive && (
                  <span
                    className={`absolute bottom-0 left-0 right-0 h-[1.5px] ${
                      isHomePage && !isScrolled ? "bg-white" : "bg-[#111111]"
                    }`}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Action Button */}
        <div className="hidden md:flex items-center space-x-4">
          <Link
            href="/predict"
            className={`group inline-flex items-center gap-2 text-xs uppercase tracking-wider font-medium px-5 py-2.5 rounded-full transition-all duration-300 shadow-sm ${ctaClasses}`}
            style={{ fontFamily: "var(--font-dmsans), DM Sans, sans-serif" }}
          >
            <span>Predict Property</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="md:hidden flex items-center">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`p-2 rounded-lg focus:outline-none transition-colors ${
              isHomePage && !isScrolled ? "text-white" : "text-[#111111]"
            }`}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Slide Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-[#EAEAEA] px-6 py-6 space-y-4 shadow-xl animate-fadeIn">
          <nav className="flex flex-col space-y-3">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || (link.href === "/ml-dashboard" && pathname === "/analytics");
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`text-base font-sans py-2 border-b border-[#F2F2F0] transition-colors ${
                    isActive
                      ? "text-[#111111] font-semibold"
                      : "text-[#6B6B6B] hover:text-[#111111]"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>
          <div className="pt-2">
            <Link
              href="/predict"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full inline-flex items-center justify-center gap-2 bg-[#111111] text-white text-sm font-medium py-3 rounded-full hover:bg-[#262626] transition-colors"
            >
              <span>Predict Property</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
