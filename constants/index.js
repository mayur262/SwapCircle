export const CATEGORIES = [
  { id: 'all', name: 'All', icon: 'apps' },
  { id: 'kitchen', name: 'Kitchen', icon: 'restaurant' },
  { id: 'outdoor', name: 'Outdoor', icon: 'leaf' },
  { id: 'electronics', name: 'Electronics', icon: 'phone-portrait' },
  { id: 'books', name: 'Books', icon: 'book' },
  { id: 'furniture', name: 'Furniture', icon: 'bed' },
  { id: 'clothing', name: 'Clothing', icon: 'shirt' },
  { id: 'toys', name: 'Toys', icon: 'game-controller' },
  { id: 'misc', name: 'Misc', icon: 'ellipsis-horizontal' }
];

export const ITEM_TYPES = [
  { id: 'swap', name: 'Swap', color: '#4CAF50', icon: 'swap-horizontal' },
  { id: 'rent', name: 'Rent', color: '#2196F3', icon: 'time' },
  { id: 'donate', name: 'Donate', color: '#FF9800', icon: 'heart' },
  { id: 'recycle', name: 'Recycle', color: '#9C27B0', icon: 'refresh' }
];

export const TRANSACTION_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  COMPLETED: 'completed',
  REJECTED: 'rejected'
};

export const ECO_IMPACT = {
  MONEY_SAVED_PER_TRANSACTION: 200, // ₹200 per transaction
  CO2_SAVED_PER_TRANSACTION: 1.5 // 1.5kg CO₂ per transaction
};

export const COLORS = {
  primary: '#4CAF50',
  secondary: '#2196F3',
  accent: '#FF9800',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336'
};