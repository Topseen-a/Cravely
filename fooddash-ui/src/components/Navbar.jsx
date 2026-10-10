import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/hooks';
import { useCart } from '../context/hooks';
import Logo from './illustrations/Logo';
import Icon from './Icon';

const linkCls = ({ isActive }) =>
  `rounded-full px-4 py-2 text-[15px] font-semibold transition ${isActive ? 'bg-ink text-cream' : 'text-ink-soft hover:bg-ink/5'}`;

export function CartButton({ className = '' }) {
  const { itemCount, bump } = useCart();
  return (
    <Link to="/cart" aria-label={`Cart, ${itemCount} items`} className={`relative inline-flex h-11 items-center gap-2 rounded-full border-2 border-ink bg-danfo px-4 font-bold shadow-[2px_2px_0_0_var(--color-ink)] transition hover:-translate-y-0.5 ${className}`}>
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

export default function Navbar() {
  const { user, logout, isStaff } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-cream/85 backdrop-blur-md">
      <div className="danfo-stripes h-1.5" />
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link to={isStaff ? '/staff' : '/'} aria-label="Cravely home">
          <Logo />
        </Link>

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

        <div className="flex items-center gap-2">
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
                onClick={() => { logout(); navigate('/'); }}
                className="hidden h-11 w-11 items-center justify-center rounded-full text-ink-soft hover:bg-ink/5 md:inline-flex"
                aria-label="Log out"
                title="Log out"
              >
                <Icon name="logout" />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="hidden h-11 items-center rounded-full px-4 font-semibold hover:bg-ink/5 sm:inline-flex">Log in</Link>
              <Link to="/register" className="inline-flex h-11 items-center rounded-full bg-ink px-5 font-bold text-cream hover:bg-ink-soft">Sign up</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
