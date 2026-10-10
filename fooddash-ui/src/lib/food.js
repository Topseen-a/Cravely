// Picks an illustration for a dish from its name (and category), so new menu
// items get sensible art automatically.

export function foodKind(name = '', category = '') {
  const n = `${name} ${category}`.toLowerCase();
  const has = (...w) => w.some((x) => n.includes(x));

  // Drinks
  if (has('zobo')) return { kind: 'drink', variant: 'zobo' };
  if (has('chapman')) return { kind: 'drink', variant: 'chapman' };
  if (has('water')) return { kind: 'bottle', variant: 'water' };
  if (has('malt')) return { kind: 'bottle', variant: 'malt' };
  if (has('coke', 'coca', 'cola', 'fanta', 'sprite', 'pepsi', 'soda')) return { kind: 'bottle', variant: 'cola' };
  if (has('juice', 'smoothie', 'drink', 'tea', 'coffee', 'kunu')) return { kind: 'drink', variant: 'juice' };

  // Snacks & grills
  if (has('puff')) return { kind: 'puff' };
  if (has('pie', 'roll', 'samosa', 'spring')) return { kind: 'pie' };
  if (has('suya', 'kebab', 'skewer')) return { kind: 'suya' };
  if (has('shawarma', 'wrap')) return { kind: 'wrap' };

  // Proteins & sides
  if (has('dodo', 'plantain')) return { kind: 'dodo' };
  if (has('moi')) return { kind: 'moimoi' };
  if (has('fish', 'croaker', 'tilapia')) return { kind: 'fish' };
  if (has('asun')) return { kind: 'meat', variant: 'asun' };
  if (has('turkey')) return { kind: 'meat', variant: 'turkey' };
  if (has('goat', 'beef', 'meat', 'ponmo', 'assorted')) return { kind: 'meat', variant: 'goat' };
  if (has('chicken', 'wing')) return { kind: 'chicken' };

  // Rice
  if (has('jollof')) return { kind: 'rice', variant: 'jollof' };
  if (has('fried rice')) return { kind: 'rice', variant: 'fried' };
  if (has('coconut')) return { kind: 'rice', variant: 'coconut' };
  if (has('ofada')) return { kind: 'rice', variant: 'ofada' };
  if (has('white rice', 'rice & stew', 'rice and stew')) return { kind: 'rice', variant: 'white' };
  if (has('rice')) return { kind: 'rice', variant: 'jollof' };

  // Swallow & soups
  if (has('pounded', 'amala', 'eba', 'garri', 'semo', 'fufu', 'swallow', 'soup', 'egusi', 'okra', 'ogbono', 'efo', 'banga')) {
    const swallow = has('amala') ? 'amala' : has('eba', 'garri') ? 'eba' : has('semo') ? 'semo' : has('fufu') ? 'fufu' : 'pounded';
    const soup = has('egusi') ? 'egusi' : has('ewedu', 'gbegiri') ? 'abula' : has('okra', 'okro') ? 'okra' : has('ogbono') ? 'ogbono' : has('efo', 'vegetable') ? 'efo' : has('banga') ? 'banga' : 'egusi';
    return { kind: 'swallow', swallow, soup };
  }

  if (has('cake', 'brownie', 'dessert', 'ice cream', 'chin')) return { kind: 'dessert' };
  return { kind: 'bowl' };
}

// Background tint per dish kind.
export const TILE = {
  rice: 'bg-jollof-soft', swallow: 'bg-palm-soft', chicken: 'bg-danfo-soft', meat: 'bg-jollof-soft',
  fish: 'bg-lagoon-soft', dodo: 'bg-danfo-soft', moimoi: 'bg-palm-soft', suya: 'bg-danfo-soft',
  wrap: 'bg-danfo-soft', puff: 'bg-danfo-soft', pie: 'bg-danfo-soft', drink: 'bg-adire-soft',
  bottle: 'bg-lagoon-soft', dessert: 'bg-adire-soft', bowl: 'bg-cream-dark',
};
