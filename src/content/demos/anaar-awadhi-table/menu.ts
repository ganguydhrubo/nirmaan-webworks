import { z } from "zod";

const menuItemSchema = z.object({
  name: z.string(),
  description: z.string(),
  priceInr: z.number(),
  veg: z.boolean(),
  chefSpecial: z.boolean().optional(),
});

const menuCategorySchema = z.object({
  id: z.string(),
  label: z.string(),
  items: z.array(menuItemSchema).min(1),
});

export type MenuCategory = z.infer<typeof menuCategorySchema>;

const raw: MenuCategory[] = [
  {
    id: "kebabs",
    label: "Kebabs & Starters",
    items: [
      { name: "Galouti Kebab", description: "Melt-in-mouth minced mutton kebab, slow-worked with over a dozen spices — the dish Lucknow is famous for.", priceInr: 450, veg: false, chefSpecial: true },
      { name: "Kakori Kebab", description: "Skewer-grilled minced lamb kebab, named after Kakori village near Lucknow.", priceInr: 480, veg: false, chefSpecial: true },
      { name: "Murgh Malai Tikka", description: "Cream and cheese marinated chicken tikka, grilled to a gentle char.", priceInr: 380, veg: false },
      { name: "Shami Kebab", description: "Pan-fried lentil and mutton patties, a Nawabi teatime classic.", priceInr: 320, veg: false },
      { name: "Awadhi Fish Tikka", description: "River fish marinated in mustard and Awadhi spices, tandoor-grilled.", priceInr: 420, veg: false },
      { name: "Paneer Shashlik", description: "Skewered paneer, capsicum and onion in a smoky tikka marinade.", priceInr: 340, veg: true },
      { name: "Dal ki Kebab", description: "Crisp lentil kebabs — a vegetarian nod to the Nawabi kitchen.", priceInr: 300, veg: true },
    ],
  },
  {
    id: "biryani",
    label: "Biryani & Pulao",
    items: [
      { name: "Awadhi Mutton Biryani", description: "Dum-cooked basmati and mutton, sealed and slow-steamed the traditional Lucknowi way.", priceInr: 520, veg: false, chefSpecial: true },
      { name: "Lucknowi Chicken Biryani", description: "Lighter on spice than its southern cousins, layered with saffron and fried onions.", priceInr: 460, veg: false },
      { name: "Yakhni Pulao", description: "Mutton-stock pulao, delicately spiced — Nawabi comfort food.", priceInr: 420, veg: false },
      { name: "Vegetable Dum Pulao", description: "Seasonal vegetables and basmati, dum-cooked with whole spices.", priceInr: 360, veg: true },
    ],
  },
  {
    id: "curries",
    label: "Curries & Kormas",
    items: [
      { name: "Mutton Korma", description: "Slow-braised mutton in a cashew and yogurt gravy, finished with kewra water.", priceInr: 540, veg: false },
      { name: "Nihari", description: "Overnight slow-cooked mutton shank stew, traditionally served at dawn.", priceInr: 480, veg: false, chefSpecial: true },
      { name: "Murgh Korma", description: "Chicken in a mild, creamy Awadhi korma gravy.", priceInr: 460, veg: false },
      { name: "Paneer Do Pyaza", description: "Paneer in a double-onion gravy.", priceInr: 360, veg: true },
      { name: "Bhindi do Pyaza", description: "Okra with onions, dry-tempered Awadhi-style.", priceInr: 300, veg: true },
      { name: "Dal Lucknowi", description: "Slow-simmered black lentils, finished with cream.", priceInr: 280, veg: true },
    ],
  },
  {
    id: "breads",
    label: "Breads",
    items: [
      { name: "Sheermal", description: "Saffron-sweetened Awadhi flatbread, baked in a tandoor.", priceInr: 90, veg: true },
      { name: "Taftan", description: "Soft, mildly leavened bread flavoured with saffron and cardamom.", priceInr: 80, veg: true },
      { name: "Roomali Roti", description: "Paper-thin handkerchief bread.", priceInr: 60, veg: true },
      { name: "Butter Naan", description: "Classic tandoor-baked naan, finished with butter.", priceInr: 70, veg: true },
    ],
  },
  {
    id: "desserts",
    label: "Desserts",
    items: [
      { name: "Shahi Tukda", description: "Fried bread soaked in saffron milk, topped with reduced rabri.", priceInr: 220, veg: true, chefSpecial: true },
      { name: "Kulfi Falooda", description: "Traditional milk kulfi with vermicelli and rose syrup.", priceInr: 200, veg: true },
      { name: "Zarda", description: "Sweet saffron rice with dry fruits.", priceInr: 180, veg: true },
    ],
  },
  {
    id: "beverages",
    label: "Beverages",
    items: [
      { name: "Lucknowi Sharbat", description: "Rose and khus sharbat, served chilled.", priceInr: 120, veg: true },
      { name: "Kesar Doodh", description: "Warm saffron milk.", priceInr: 150, veg: true },
      { name: "Masala Chai", description: "Spiced tea, brewed strong.", priceInr: 80, veg: true },
    ],
  },
];

export const menuCategories: MenuCategory[] = raw.map((c) => menuCategorySchema.parse(c));
