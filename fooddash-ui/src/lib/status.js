// Every order status with a plain-English label, a Lagos-flavoured caption,
// and colours for chips.
export const STATUS = {
  RECEIVED: {
    label: 'Order received', short: 'New', caption: 'Your order don enter. We dey on am!',
    chip: 'bg-adire-soft text-adire', dot: 'bg-adire',
  },
  PREPARING: {
    label: 'In the kitchen', short: 'Cooking', caption: 'Chef dey cook am fresh — the pot is on fire.',
    chip: 'bg-danfo-soft text-ink', dot: 'bg-danfo-dark',
  },
  READY: {
    label: 'Ready', short: 'Ready', caption: 'Food ready, hot and packed.',
    chip: 'bg-palm-soft text-palm', dot: 'bg-palm',
  },
  OUT_FOR_DELIVERY: {
    label: 'On the way', short: 'On the way', caption: 'Rider don commot. Dodging traffic to reach you.',
    chip: 'bg-lagoon-soft text-lagoon-dark', dot: 'bg-lagoon',
  },
  DELIVERED: {
    label: 'Delivered', short: 'Delivered', caption: 'E don land! Enjoy your meal.',
    chip: 'bg-cream-dark text-ink-soft', dot: 'bg-ink-soft',
  },
  PICKED_UP: {
    label: 'Picked up', short: 'Picked up', caption: 'Collected. Enjoy your meal!',
    chip: 'bg-cream-dark text-ink-soft', dot: 'bg-ink-soft',
  },
  CANCELLED: {
    label: 'Cancelled', short: 'Cancelled', caption: 'This order was cancelled.',
    chip: 'bg-jollof-soft text-jollof-dark', dot: 'bg-jollof',
  },
};

export const stepsFor = (type) =>
  type === 'pickup'
    ? ['RECEIVED', 'PREPARING', 'READY', 'PICKED_UP']
    : ['RECEIVED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'];

export const isTerminal = (s) => ['DELIVERED', 'PICKED_UP', 'CANCELLED'].includes(s);

// Labels for the staff action buttons.
export const ACTION_LABEL = {
  PREPARING: 'Start cooking',
  READY: 'Mark ready',
  OUT_FOR_DELIVERY: 'Send with rider',
  DELIVERED: 'Delivered',
  PICKED_UP: 'Picked up',
  CANCELLED: 'Cancel',
};

export const PAYMENT = {
  pending: { label: 'Unpaid', chip: 'bg-danfo-soft text-ink' },
  paid: { label: 'Paid', chip: 'bg-palm-soft text-palm' },
  failed: { label: 'Payment failed', chip: 'bg-jollof-soft text-jollof-dark' },
  refund_pending: { label: 'Refund due', chip: 'bg-jollof-soft text-jollof-dark' },
};
