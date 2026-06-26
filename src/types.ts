export interface ProductOption {
  name: string;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  price: number; // in YER (Yemeni Rial)
  description: string;
  image: string;
  sizes?: string[];
  options?: ProductOption[];
}

export interface Review {
  user: string;
  comment: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface Shop {
  id: string;
  name: string;
  category: string;
  badge?: string;
  themeColor?: string;
  themeColorPrimary?: string;
  themeColorSecondary?: string;
  description: string;
  image: string;
  instagram: string;
  rating: number;
  featured: boolean;
  tags: string[];
  location: string; // e.g., "كريتر", "المنصورة", "خورمكسر"
  whatsappPhone: string; // e.g., "967777777777"
  products: Product[];
  reviews: Review[];
  faqs?: FAQItem[];
}

export interface CartItem {
  id: string; // generated unique id
  product: Product;
  shopId: string;
  shopName: string;
  size: string;
  notes: string;
  quantity: number;
}
