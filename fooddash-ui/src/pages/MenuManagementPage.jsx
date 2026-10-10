import { useCallback, useEffect, useState } from 'react';
import * as API from '../api/endpoints';
import { useToast } from '../context/hooks';
import { naira, apiError } from '../lib/format';
import { DishTile } from '../components/MenuItemCard';
import { Button, Card, Input, Modal, PageTitle, Segmented, Select, Skeleton, Textarea } from '../components/ui';
import Icon from '../components/Icon';

// Runs an API call, shows a toast on failure, returns success.
function useAction() {
  const toast = useToast();
  return async (fn, success) => {
    try {
      await fn();
      if (success) toast(success, 'success');
      return true;
    } catch (err) {
      toast(apiError(err), 'error');
      return false;
    }
  };
}

function Switch({ on, onChange, label, disabled }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative h-7 w-12 shrink-0 rounded-full border-2 border-ink transition disabled:opacity-50 ${on ? 'bg-palm' : 'bg-cream-dark'}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full border-2 border-ink bg-white transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );
}

// ---------------- Dishes ----------------

function DishForm({ item, categories, onSaved, onClose }) {
  const act = useAction();
  const [form, setForm] = useState({
    category_id: item?.category_id || categories[0]?.ID || '',
    name: item?.name || '',
    description: item?.description || '',
    price: item?.price ?? '',
    image_url: item?.image_url || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const catName = categories.find((c) => String(c.ID) === String(form.category_id))?.name;

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const body = { ...form, category_id: Number(form.category_id), price: Number(form.price) };
    const ok = await act(() => (item ? API.updateMenuItem(item.ID, body) : API.createMenuItem(body)), item ? 'Dish updated' : 'Dish added to the menu');
    setSaving(false);
    if (ok) {
      onSaved();
      onClose();
    }
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-[160px_1fr]">
      <div>
        <DishTile item={{ name: form.name || 'dish', image_url: form.image_url }} category={catName} className="aspect-square w-full rounded-2xl" />
        <p className="mt-2 text-center text-xs text-muted">Preview</p>
      </div>
      <div className="space-y-4">
        <Select label="Category" value={form.category_id} onChange={set('category_id')} required>
          {categories.map((c) => <option key={c.ID} value={c.ID}>{c.name}</option>)}
        </Select>
        <Input label="Name" value={form.name} onChange={set('name')} required maxLength={120} placeholder="Ofada Rice & Ayamase" />
        <Input label="Price (₦)" type="number" min="1" step="0.01" inputMode="decimal" value={form.price} onChange={set('price')} required />
      </div>
      <Textarea label="Description" value={form.description} onChange={set('description')} maxLength={1000} className="sm:col-span-2" placeholder="What makes it special?" />
      <Input label="Photo URL (optional)" type="url" value={form.image_url} onChange={set('image_url')} placeholder="https://…" hint="Leave empty to use Cravely’s illustration" className="sm:col-span-2" />
      <div className="flex gap-3 sm:col-span-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button type="submit" className="flex-1" loading={saving}>{item ? 'Save changes' : 'Add dish'}</Button>
      </div>
    </form>
  );
}

function DishRow({ item, category, onChanged, onEdit }) {
  const act = useAction();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(item.sold_out_note || '');

  const run = async (fn, msg) => {
    setBusy(true);
    await act(fn, msg);
    await onChanged();
    setBusy(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4">
      <DishTile item={item} category={category} className={`h-16 w-16 shrink-0 rounded-2xl ${item.is_available ? '' : 'grayscale'}`} />
      <div className="min-w-0 flex-1 basis-36">
        <p className="font-display text-lg font-bold leading-tight">{item.name}</p>
        <p className="font-semibold text-jollof">{naira(item.price)}</p>
      </div>
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <span className={`text-sm font-bold ${item.is_available ? 'text-palm' : 'text-jollof'}`}>{item.is_available ? 'Available' : 'Sold out'}</span>
        <Switch on={item.is_available} disabled={busy} label={`${item.name} available`} onChange={() => run(() => API.toggleAvailability(item.ID))} />
        <Button size="sm" variant="ghost" onClick={() => onEdit(item)} aria-label={`Edit ${item.name}`}><Icon name="edit" className="h-4 w-4" /></Button>
        <Button
          size="sm"
          variant="ghost"
          aria-label={`Delete ${item.name}`}
          onClick={() => window.confirm(`Remove ${item.name} from the menu?`) && run(() => API.deleteMenuItem(item.ID), `${item.name} removed`)}
        >
          <Icon name="trash" className="h-4 w-4" />
        </Button>
      </div>
      {!item.is_available && (
        <div className="flex w-full gap-2 sm:pl-20">
          <input
            value={note}
            maxLength={200}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note for customers, e.g. Back by 4pm"
            className="h-10 min-w-0 flex-1 rounded-xl border-2 border-line bg-white px-3 text-sm focus:border-ink focus:outline-none"
          />
          <Button size="sm" variant="dark" className="shrink-0 whitespace-nowrap" loading={busy} disabled={note === (item.sold_out_note || '')} onClick={() => run(() => API.setSoldOutNote(item.ID, { note }), 'Note saved')}>Save note</Button>
        </div>
      )}
    </div>
  );
}

function DishesTab({ categories, reload }) {
  const [editing, setEditing] = useState(null); // item, 'new', or null
  const [query, setQuery] = useState('');
  const q = query.toLowerCase();
  const soldOut = categories.reduce((n, c) => n + (c.items || []).filter((i) => !i.is_available).length, 0);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a dish" className="h-11 w-full rounded-full border-2 border-line bg-white pl-10 pr-4 focus:border-ink focus:outline-none" />
        </div>
        <div className="flex items-center gap-3">
          {soldOut > 0 && <span className="text-sm font-bold text-jollof">{soldOut} sold out</span>}
          <Button onClick={() => setEditing('new')} disabled={!categories.length}><Icon name="plus" className="h-4 w-4" /> Add dish</Button>
        </div>
      </div>
      {!categories.length && <p className="rounded-2xl bg-danfo-soft p-4 font-semibold">Create a category first, then add dishes to it.</p>}
      <div className="space-y-5">
        {categories.map((c) => {
          const items = (c.items || []).filter((i) => !q || i.name.toLowerCase().includes(q));
          if (q && !items.length) return null;
          return (
            <Card key={c.ID} className="px-5 py-2 sm:px-6">
              <h3 className="pt-3 text-xl font-bold">{c.name} <span className="text-base font-semibold text-muted">· {items.length}</span></h3>
              <div className="divide-y divide-line/70">
                {items.length ? items.map((it) => <DishRow key={it.ID} item={it} category={c.name} onChanged={reload} onEdit={setEditing} />) : <p className="py-4 text-sm text-muted">No dishes yet.</p>}
              </div>
            </Card>
          );
        })}
      </div>
      <Modal wide open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add a dish' : `Edit ${editing?.name || ''}`}>
        {editing && <DishForm item={editing === 'new' ? null : editing} categories={categories} onSaved={reload} onClose={() => setEditing(null)} />}
      </Modal>
    </>
  );
}

// ---------------- Categories ----------------

function CategoryForm({ cat, onSaved, onClose }) {
  const act = useAction();
  const [form, setForm] = useState({ name: cat?.name || '', description: cat?.description || '', display_order: cat?.display_order ?? 0 });
  const [saving, setSaving] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const body = { ...form, display_order: Number(form.display_order) };
    const ok = await act(() => (cat ? API.updateCategory(cat.ID, body) : API.createCategory(body)), cat ? 'Category updated' : 'Category created');
    setSaving(false);
    if (ok) { onSaved(); onClose(); }
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <Input label="Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required maxLength={80} placeholder="Swallow & Soups" />
      <Input label="Short description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} maxLength={500} />
      <Input label="Position on menu" type="number" value={form.display_order} onChange={(e) => setForm((p) => ({ ...p, display_order: e.target.value }))} hint="Lower numbers show first" />
      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button type="submit" className="flex-1" loading={saving}>Save</Button>
      </div>
    </form>
  );
}

function CategoriesTab({ categories, reload }) {
  const act = useAction();
  const [editing, setEditing] = useState(null);
  return (
    <>
      <div className="mb-5 flex justify-end"><Button onClick={() => setEditing('new')}><Icon name="plus" className="h-4 w-4" /> Add category</Button></div>
      <Card className="divide-y divide-line/70">
        {categories.map((c) => (
          <div key={c.ID} className="flex items-center gap-3 px-4 py-4 sm:gap-4 sm:px-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cream-dark font-display font-bold">{c.display_order}</span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-base font-bold leading-snug sm:text-lg">{c.name}</p>
              <p className="truncate text-sm text-muted">{c.description || '—'} · {(c.items || []).length} dishes</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setEditing(c)} aria-label={`Edit ${c.name}`}><Icon name="edit" className="h-4 w-4" /></Button>
            <Button size="sm" variant="ghost" aria-label={`Delete ${c.name}`} onClick={async () => window.confirm(`Delete ${c.name}?`) && (await act(() => API.deleteCategory(c.ID), 'Category deleted')) && reload()}>
              <Icon name="trash" className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {!categories.length && <p className="p-6 text-center text-muted">No categories yet.</p>}
      </Card>
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'New category' : 'Edit category'}>
        {editing && <CategoryForm cat={editing === 'new' ? null : editing} onSaved={reload} onClose={() => setEditing(null)} />}
      </Modal>
    </>
  );
}

// ---------------- Delivery areas ----------------

function ZoneForm({ zone, onSaved, onClose }) {
  const act = useAction();
  const [form, setForm] = useState({ name: zone?.name || '', fee: zone?.fee ?? '', estimated_minutes: zone?.estimated_minutes ?? 45 });
  const [saving, setSaving] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const body = { name: form.name, fee: Number(form.fee), estimated_minutes: Number(form.estimated_minutes), is_active: zone ? zone.is_active : true };
    const ok = await act(() => (zone ? API.updateZone(zone.ID, body) : API.createZone(body)), zone ? 'Area updated' : 'Delivery area added');
    setSaving(false);
    if (ok) { onSaved(); onClose(); }
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <Input label="Area name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required maxLength={80} placeholder="Gbagada" />
      <div className="grid grid-cols-2 gap-4">
        <Input label="Delivery fee (₦)" type="number" min="0" value={form.fee} onChange={(e) => setForm((p) => ({ ...p, fee: e.target.value }))} required />
        <Input label="Delivery time (min)" type="number" min="0" max="600" value={form.estimated_minutes} onChange={(e) => setForm((p) => ({ ...p, estimated_minutes: e.target.value }))} hint="Allow for traffic" />
      </div>
      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button type="submit" className="flex-1" loading={saving}>Save</Button>
      </div>
    </form>
  );
}

function ZonesTab() {
  const act = useAction();
  const [zones, setZones] = useState(null);
  const [editing, setEditing] = useState(null);
  const load = useCallback(() => API.getZonesAdmin().then(({ data }) => setZones(data.data)).catch(() => setZones([])), []);
  useEffect(() => {
    load();
  }, [load]);

  if (!zones) return <Skeleton className="h-64" />;
  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted">Flat delivery fee per area. Turn an area off to pause deliveries there (e.g. during flooding).</p>
        <Button onClick={() => setEditing('new')}><Icon name="plus" className="h-4 w-4" /> Add area</Button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {zones.map((z) => (
          <Card key={z.ID} className={`p-5 ${z.is_active ? '' : 'opacity-60'}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-1.5 font-display text-xl font-bold"><Icon name="pin" className="h-4 w-4 text-jollof" />{z.name}</p>
                <p className="mt-1 text-sm text-muted">~{z.estimated_minutes} min</p>
              </div>
              <Switch on={z.is_active} label={`Deliver to ${z.name}`} onChange={async () => (await act(() => API.updateZone(z.ID, { ...z, is_active: !z.is_active }))) && load()} />
            </div>
            <div className="mt-4 flex items-center justify-between">
              <p className="font-display text-2xl font-extrabold">{naira(z.fee)}</p>
              <div>
                <Button size="sm" variant="ghost" onClick={() => setEditing(z)} aria-label={`Edit ${z.name}`}><Icon name="edit" className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" aria-label={`Delete ${z.name}`} onClick={async () => window.confirm(`Delete ${z.name}?`) && (await act(() => API.deleteZone(z.ID), 'Area deleted')) && load()}>
                  <Icon name="trash" className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
      {!zones.length && <p className="rounded-2xl bg-danfo-soft p-4 font-semibold">No delivery areas yet — customers can only pick up.</p>}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'New delivery area' : `Edit ${editing?.name}`}>
        {editing && <ZoneForm zone={editing === 'new' ? null : editing} onSaved={load} onClose={() => setEditing(null)} />}
      </Modal>
    </>
  );
}

export default function MenuManagementPage() {
  const [tab, setTab] = useState('dishes');
  const [categories, setCategories] = useState(null);

  const reload = useCallback(
    () => API.getMenuAdmin().then(({ data }) => setCategories(data.data || [])).catch(() => setCategories([])),
    [],
  );
  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <div>
      <PageTitle eyebrow="Kitchen team" title="Menu & delivery areas">
        Changes show on the storefront immediately. Mark dishes sold out the moment the pot is empty.
      </PageTitle>
      <div className="mb-6">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'dishes', label: 'Dishes' },
            { value: 'categories', label: 'Categories' },
            { value: 'zones', label: 'Delivery areas' },
          ]}
        />
      </div>
      {tab === 'zones' ? <ZonesTab /> : !categories ? <Skeleton className="h-96" /> : tab === 'dishes' ? <DishesTab categories={categories} reload={reload} /> : <CategoriesTab categories={categories} reload={reload} />}
    </div>
  );
}
