import { useEffect, useState } from 'react';
import { StoreContext } from './hooks';
import { getStore, getDeliveryZones } from '../api/endpoints';


// Opening hours, VAT, payment options and delivery areas — fetched once and
// refreshed every few minutes so "open/closed" stays accurate.
export function StoreProvider({ children }) {
  const [store, setStore] = useState(null);
  const [zones, setZones] = useState([]);

  useEffect(() => {
    const load = () => {
      getStore().then(({ data }) => setStore(data.data)).catch(() => {});
      getDeliveryZones().then(({ data }) => setZones(data.data || [])).catch(() => {});
    };
    load();
    const t = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  return <StoreContext.Provider value={{ store, zones }}>{children}</StoreContext.Provider>;
}
