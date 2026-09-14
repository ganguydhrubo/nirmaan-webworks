export const rooms = [
  { name: 'Garden Verandah', rate: 5200, guests: 2, area: '32 m²', view: 'Coconut grove', description: 'A shaded verandah, a king bed and enough quiet to finish the book you packed.' },
  { name: 'Waterfront Cottage', rate: 7400, guests: 2, area: '44 m²', view: 'Backwater frontage', description: 'Wake to fishing boats passing your private deck. A separate sitting room makes slow mornings easy.' },
  { name: 'Family Courtyard', rate: 9800, guests: 4, area: '68 m²', view: 'Private courtyard', description: 'Two connected bedrooms around a little courtyard. Space for grandparents, children and everyone’s bags.' },
] as const;
export const experiences = [
  { time: '06:30 AM', name: 'A canoe before breakfast', detail: 'Paddle the narrow canals with a local guide. Life jackets provided; weather permitting.' },
  { time: '12:30 PM', name: 'Lunch on a banana leaf', detail: 'A seasonal Kerala lunch with rice, vegetable thoran and a choice of fish curry or avial.' },
  { time: '05:00 PM', name: 'The village, on foot', detail: 'Walk past coir workshops and waterside homes. Return for tea and banana fritters.' },
] as const;
