// Minimal stroke icon set (24px grid).
const P = {
  menu: 'M4 7h16M4 12h16M4 17h10',
  bag: 'M6 8h12l-1 12H7L6 8zm3 0V6a3 3 0 0 1 6 0v2',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2V3zm3 5h6M9 12h6M9 16h3',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 9a7 7 0 0 1 14 0',
  logout: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2',
  pin: 'M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21zm0-9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-13v4l3 2',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zm9 2l-4-4',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  trash: 'M5 7h14M10 7V5h4v2m-7 0l1 13h8l1-13',
  copy: 'M9 9h10v10H9zM5 15V5h10',
  check: 'M5 12l5 5L20 7',
  chef: 'M7 14v6h10v-6M6 14a4 4 0 0 1 1.5-7.7A4.5 4.5 0 0 1 16.5 6 4 4 0 0 1 18 14z',
  bike: 'M5 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm14 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM5 15h5l3-6h3l3 6M9 9h4',
  store: 'M4 10v10h16V10M3 10l2-6h14l2 6zM9 20v-6h6v6',
  card: 'M3 6h18v12H3zM3 10h18M7 15h3',
  cash: 'M3 7h18v10H3zm9 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 10v4M18 10v4',
  refresh: 'M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zm4 4h4',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  back: 'M19 12H5M11 6l-6 6 6 6',
  x: 'M6 6l12 12M18 6L6 18',
  map: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14',
  flame: 'M12 21c4 0 7-2.7 7-6.5 0-3-2-5.5-4-7.5 0 2.5-1.5 4-3 4 0-3-1-6-4-8 .5 3-3 6-3 10.5C5 18.3 8 21 12 21z',
  sound: 'M4 10v4h4l5 4V6L8 10zm12-1a4 4 0 0 1 0 6m2-9a8 8 0 0 1 0 12',
  mute: 'M4 10v4h4l5 4V6L8 10zm12 0l5 5m0-5l-5 5',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  'eye-off': 'M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6C3.9 8.4 2 12 2 12s4 7 10 7a9.6 9.6 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2',
  mail: 'M3 6h18v12H3zm0 0l9 7 9-7',
};

export default function Icon({ name, className = 'h-5 w-5', strokeWidth = 2 }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[name]} />
    </svg>
  );
}
