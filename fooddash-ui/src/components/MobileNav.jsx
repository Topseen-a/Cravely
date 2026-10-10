import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/hooks';
import { useCart } from '../context/hooks';
import Icon from './Icon';

// Thumb-friendly bottom tab bar for phones — most Lagos customers order on mobile.
export default function MobileNav() {
  const { user, isStaff } = useAuth();
  const { itemCount, bump } = useCart();
  if (!user) return null;

  const tabs = isStaff
    ? [
        { to: '/staff', icon: 'chef', label: 'Kitchen', end: true },
        { to: '/staff/menu', icon: 'menu', label: 'Menu' },
        { to: '/account', icon: 'user', label: 'Account' },
      ]
    : [
        { to: '/', icon: 'menu', label: 'Menu', end: true },
        { to: '/cart', icon: 'bag', label: 'Cart', badge: itemCount },
        { to: '/orders', icon: 'receipt', label: 'Orders' },
        { to: '/account', icon: 'user', label: 'Account' },
      ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-cream/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
      <div className="mx-auto flex max-w-md justify-around">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => `relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-bold ${isActive ? 'text-ink' : 'text-muted'}`}>
            {({ isActive }) => (
              <>
                <span className={`flex h-8 w-12 items-center justify-center rounded-full transition ${isActive ? 'bg-danfo' : ''}`}>
                  <Icon name={t.icon} />
                </span>
                {t.label}
                {t.badge > 0 && (
                  <span key={bump} className="animate-pop absolute right-[22%] top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-jollof px-1 text-[10px] text-white">
                    {t.badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
