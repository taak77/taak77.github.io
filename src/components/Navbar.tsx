import { useEffect, useState } from 'preact/hooks';

const LINKS = [
  { href: '#portfolio', label: 'Portfolio', id: 'portfolio' },
  { href: '#about', label: 'About', id: 'about' },
];

export default function Navbar() {
  const [shrink, setShrink] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  // Reproduces the original 300px shrink threshold without a scroll handler.
  useEffect(() => {
    const sentinel = document.querySelector('[data-nav-sentinel]');
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => setShrink(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const sections = LINKS.map((l) => document.getElementById(l.id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: '-50% 0px -50% 0px' },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      data-navbar
      data-shrink={shrink ? 'true' : 'false'}
      class={`fixed top-0 right-0 left-0 z-[1050] bg-brand-primary font-heading font-bold uppercase transition-[padding] duration-300 ${
        shrink ? 'navbar-shrink sm:py-[10px]' : 'sm:py-[25px]'
      }`}
    >
      <div class="container flex flex-wrap items-center justify-between py-2 sm:py-0">
        <a
          href="#page-top"
          class={`text-white transition-all duration-300 hover:text-brand-success ${
            shrink ? 'sm:text-[1.5em]' : 'sm:text-[2em]'
          }`}
        >
          Takashi Aoki
        </a>

        <button
          type="button"
          data-nav-toggle
          aria-expanded={open}
          aria-controls="nav-menu"
          aria-label="Toggle navigation"
          onClick={() => setOpen((value) => !value)}
          class="cursor-pointer border-2 border-navbar-active bg-transparent px-3 py-2 sm:hidden"
        >
          <span class="mb-1 block h-px w-[22px] bg-white"></span>
          <span class="mb-1 block h-px w-[22px] bg-white"></span>
          <span class="block h-px w-[22px] bg-white"></span>
        </button>

        <div
          id="nav-menu"
          data-nav-menu
          class={`w-full sm:block sm:w-auto ${open ? 'block' : 'hidden'}`}
        >
          <ul class="flex flex-col tracking-[1px] sm:flex-row">
            {LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  aria-current={active === link.id ? 'page' : undefined}
                  onClick={() => setOpen(false)}
                  class={`block px-4 py-3 text-white hover:text-brand-success ${
                    active === link.id ? 'bg-navbar-active' : ''
                  }`}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
}
