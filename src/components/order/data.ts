export type OrderItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  spicy?: boolean;
  vegetarian?: boolean;
  categoryId: string;
};

export type OrderCategory = {
  id: string;
  name: string;
  order: number;
};

export type MenuData = {
  categories: OrderCategory[];
  items: OrderItem[];
};

const kebapItems: OrderItem[] = [];
const fladenbrotrollenItems: OrderItem[] = [];
const pizzaSchneckenItems: OrderItem[] = [];
const pommBoxItems: OrderItem[] = [];
const pizzaItems: OrderItem[] = [];
const vegetarischePizzaItems: OrderItem[] = [];
const taschenpizzaItems: OrderItem[] = [];
const fingerFoodMenueItems: OrderItem[] = [];
const fingerfoodItems: OrderItem[] = [];

const pastaItems: OrderItem[] = [
  {
    id: "130",
    categoryId: "pasta",
    name: "Spaghetti",
    description: "Spaghetti mit Rinder-Bolognese-Sauce, serviert mit Pizzabrötchen.",
    price: 9.0,
  },
  {
    id: "131",
    categoryId: "pasta",
    name: "Tortellini Tonno",
    description: "Gefüllte Tortellini mit Thunfisch in Schinken-Sahne-Sauce, dazu Pizzabrötchen.",
    price: 10.5,
  },
  {
    id: "132",
    categoryId: "pasta",
    name: "Tortellini",
    description: "Gefüllte Tortellini in cremiger Schinken-Sahne-Sauce mit Pizzabrötchen.",
    price: 9.0,
  },
  {
    id: "133",
    categoryId: "pasta",
    name: "Lasagne",
    description: "Überbackene Lasagne mit Rinder-Bolognese-Sauce, serviert mit Pizzabrötchen.",
    price: 9.0,
  },
  {
    id: "134",
    categoryId: "pasta",
    name: "Rigatoni Pollo",
    description: "Rigatoni mit Hähnchenstreifen, Brokkoli und Paprika in cremiger Sahnesauce, dazu Pizzabrötchen.",
    price: 10.5,
  },
  {
    id: "135",
    categoryId: "pasta",
    name: "Rigatoni Arrabiata",
    description: "Rigatoni in scharfer Tomatensauce, serviert mit Pizzabrötchen.",
    price: 9.0,
    spicy: true,
  },
  {
    id: "136",
    categoryId: "pasta",
    name: "Rigatoni Kebap",
    description: "Rigatoni mit Kebapfleisch, Zwiebeln und frischen Pilzen in Sahnesauce, dazu Pizzabrötchen.",
    price: 10.5,
  },
];

export const menuData: MenuData = {
  categories: [
    { id: "kebap", name: "Kebap", order: 10 },
    { id: "fladenbrotrollen", name: "Fladenbrotrollen", order: 20 },
    { id: "pizza-schnecken", name: "Pizza-Schnecken", order: 30 },
    { id: "pomm-box", name: "Pomm-Box", order: 40 },
    { id: "pizza", name: "Pizza", order: 50 },
    { id: "vegetarische-pizza", name: "Vegetarische Pizza", order: 60 },
    { id: "taschenpizza", name: "Taschenpizza", order: 70 },
    { id: "finger-food-menue", name: "Finger Food Menü", order: 80 },
    { id: "fingerfood", name: "Fingerfood", order: 90 },
    { id: "pasta", name: "Pasta", order: 100 },
  ],
  items: [
    ...kebapItems,
    ...fladenbrotrollenItems,
    ...pizzaSchneckenItems,
    ...pommBoxItems,
    ...pizzaItems,
    ...vegetarischePizzaItems,
    ...taschenpizzaItems,
    ...fingerFoodMenueItems,
    ...fingerfoodItems,
    ...pastaItems,
  ],
};

export const pastaCategory: OrderCategory = { id: "pasta", name: "Pasta", order: 100 };
export { pastaItems };
