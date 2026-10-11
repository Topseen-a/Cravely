import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, useCart } from '../context/hooks';
import Logo, { LogoMark } from './illustrations/Logo';
import Icon from './Icon';

const linkCls = ({ isActive }) =>
  `rounded-full px-4 py-2 text-[15px] font-semibold transition ${isActive ? 'bg-ink text-cream' : 'text-ink-soft hover:bg-ink/5'}`;

// Pages that are a "home" for someone, so they don't get a back arrow.
const ROOT_PAGES = ['/', '/staff'];

export function CartButton({ className = '' }) {
  const { itemCount, bump } = useCart();
  return (
    <Link to="/cart" aria-label={`Cart, ${itemCount} items`} className={`relative inline-flex h-11 items-center gap-2 rounded-full border-2 border-ink bg-danfo px-3.5 font-bold shadow-[2px_2px_0_0_var(--color-ink)] transition hover:-translate-y-0.5 sm:px-4 ${className}`}>
      <Icon name="bag" />
      <span className="hidden sm:inline">Cart</span>
      {itemCount > 0 && (
        <span key={bump} className="animate-pop flex h-6 min-w-6 items-center justify-center rounded-full bg-ink px-1.5 text-xs text-danfo">
          {itemCount}
        </span>
      )}
    </Link>
  );
}

// Goes to the previous page, or home when the page was opened directly
// (e.g. from a shared link), so the button never leaves the site.
function BackButton() {
  const navigate = useNavigate();
  const { isStaff } = useAuth();
  const goBack = () => {
    if ((window.history.state?.idx ?? 0) > 0) navigate(-1);
    else navigate(isStaff ? '/staff' : '/');
  };
  return (
    <button onClick={goBack} aria-label="Go back" className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink hover:bg-ink/5 md:hidden">
      <Icon name="back" className="h-6 w-6" />
    </button>
  );
}

function MenuLink({ to, icon, children, end, onClick }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) => `flex items-center gap-3 rounded-2xl px-4 py-3.5 text-lg font-semibold transition ${isActive ? 'bg-danfo text-ink' : 'text-ink hover:bg-ink/5'}`}
    >
      <Icon name={icon} className="h-5 w-5" />
      {children}
    </NavLink>
  );
}

// Full menu for phones: every destination for the current visitor.
function MobileMenu({ open, onClose }) {
  const { user, isStaff, logout } = useAuth();

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  // Portalled to <body>: the header's backdrop blur would otherwise trap
  // this fixed overlay inside the header.
  return createPortal(
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={onClose} />
      <div className="animate-fade-up absolute inset-x-0 top-0 max-h-[100dvh] overflow-y-auto rounded-b-3xl bg-cream pb-6 shadow-pop">
        <div className="danfo-stripes h-1.5" />
        <div className="flex h-16 items-center justify-between px-4">
          <Logo />
          <button onClick={onClose} aria-label="Close menu" className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full hover:bg-ink/5">
            <Icon name="x" className="h-6 w-6" />
          </button>
        </div>

        {user && (
          <div className="mx-4 mb-3 flex items-center gap-3 rounded-2xl bg-white px-4 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-adire font-display font-bold text-cream">
              {user.name?.[0]?.toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate font-bold">{user.name}</p>
              <p className="truncate text-sm text-muted">{isStaff ? 'Kitchen team' : user.email}</p>
            </div>
          </div>
        )}

        <nav className="space-y-1 px-3">
          {isStaff ? (
            <>
              <MenuLink to="/staff" end icon="chef" onClick={onClose}>Kitchen board</MenuLink>
              <MenuLink to="/staff/menu" icon="edit" onClick={onClose}>Menu & delivery areas</MenuLink>
              <MenuLink to="/" end icon="store" onClick={onClose}>Storefront</MenuLink>
            </>
          ) : (
            <>
              <MenuLink to="/" end icon="menu" onClick={onClose}>Menu</MenuLink>
              {user && <MenuLink to="/cart" icon="bag" onClick={onClose}>Cart</MenuLink>}
              {user && <MenuLink to="/orders" icon="receipt" onClick={onClose}>My orders</MenuLink>}
            </>
          )}
          {user && <MenuLink to="/account" icon="user" onClick={onClose}>Account</MenuLink>}
        </nav>

        <div className="mt-4 border-t border-line px-4 pt-4">
          {user ? (
            <button
              onClick={() => { onClose(); logout(); }}
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-lg font-semibold text-jollof-dark hover:bg-jollof-soft"
            >
              <Icon name="logout" className="h-5 w-5" /> Log out
            </button>
          ) : (
            <div className="space-y-3">
              <Link to="/register" onClick={onClose} className="flex h-14 items-center justify-center rounded-xl border-2 border-ink bg-danfo text-lg font-bold shadow-[3px_3px_0_0_var(--color-ink)]">
                Create an account
              </Link>
              <Link to="/login" onClick={onClose} className="flex h-14 items-center justify-center rounded-xl border-2 border-ink bg-white text-lg font-bold">
                Log in
              </Link>
              <Link to="/staff/register" onClick={onClose} className="block pt-2 text-center text-sm font-semibold text-muted underline">
                Kitchen staff sign-up
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function Navbar() {
  const { user, logout, isStaff } = useAuth();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const showBack = !ROOT_PAGES.includes(pathname);

  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-cream/85 backdrop-blur-md">
      <div className="danfo-stripes h-1.5" />
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:gap-4">
        <div className="flex min-w-0 items-center">
          {showBack && <BackButton />}
          <Link to={isStaff ? '/staff' : '/'} aria-label="Cravely home" className="min-w-0">
            {/* Just the mark on very small phones when the back arrow needs room */}
            <span className={showBack ? 'hidden min-[380px]:block' : ''}><Logo /></span>
            {showBack && <span className="min-[380px]:hidden"><LogoMark /></span>}
          </Link>
        </div>

        <div className="hidden items-center gap-1 md:flex">
          {isStaff ? (
            <>
              <NavLink to="/staff" end className={linkCls}>Kitchen</NavLink>
              <NavLink to="/staff/menu" className={linkCls}>Menu & areas</NavLink>
              <NavLink to="/" end className={linkCls}>Storefront</NavLink>
            </>
          ) : (
            <>
              <NavLink to="/" end className={linkCls}>Menu</NavLink>
              {user && <NavLink to="/orders" className={linkCls}>My orders</NavLink>}
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {user && !isStaff && <CartButton />}
          {user ? (
            <>
              <Link to="/account" className="hidden h-11 items-center gap-2 rounded-full px-3 font-semibold text-ink-soft hover:bg-ink/5 md:inline-flex">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-adire font-display text-sm font-bold text-cream">
                  {user.name?.[0]?.toUpperCase()}
                </span>
                <span className="max-w-[9rem] truncate">{user.name?.split(' ')[0]}</span>
              </Link>
              <button
                onClick={logout}
                className="hidden h-11 w-11 items-center justify-center rounded-full text-ink-soft hover:bg-ink/5 md:inline-flex"
                aria-label="Log out"
                title="Log out"
              >
                <Icon name="logout" />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="inline-flex h-11 items-center rounded-full px-3 font-semibold hover:bg-ink/5 sm:px-4">Log in</Link>
              <Link to="/register" className="hidden h-11 items-center rounded-full bg-ink px-5 font-bold text-cream hover:bg-ink-soft sm:inline-flex">Sign up</Link>
            </>
          )}
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-ink/5 md:hidden"
          >
            <Icon name="menu" className="h-6 w-6" />
          </button>
        </div>
      </nav>
      <MobileMenu open={menuOpen} onClose={closeMenu} />
    </header>
  );
}
