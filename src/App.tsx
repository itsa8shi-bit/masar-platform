import React, { useState, useEffect } from "react";
import { BOUTIQUE_SHOPS, CATEGORIES, LOCATIONS } from "./data";
import { Shop, Product, CartItem, Review } from "./types";
import { Search, Heart, Sparkles, Filter, RefreshCw, Star, Calendar, MapPin, Smile, ShoppingBag, Trash2, Send, X, Plus, Minus, Copy, Lightbulb, PenTool, Terminal, Calculator, BarChart3, Wrench, Briefcase, Check } from "lucide-react";
import DecoSticker from "./components/DecoSticker";
import ShopCard from "./components/ShopCard";
import ShopDetailsModal from "./components/ShopDetailsModal";
import { motion, AnimatePresence } from "motion/react";

// =========================================================================
// ⚙️ إعدادات الربط المباشر مع آيرتبل (Airtable API Settings - Client & Server)
// =========================================================================
// لتشغيل المنصة ديناميكياً على Netlify أو أي بيئة استضافة ثابتة، نستخدم الإعدادات التالية:
const AIRTABLE_API_TOKEN = ((import.meta as any).env?.AIRTABLE_TOKEN as string) || "";
const AIRTABLE_BASE_ID = "appRRBihIQV5zZYD3";

// أسماء الجداول في Airtable:
const TABLE_SHOPS = "المتاجر";             // الاسم الحقيقي لجدول المتاجر
const TABLE_PRODUCTS = "المنتجات";         // الاسم الحقيقي لجدول المنتجات
const TABLE_OPTIONS = "خيارات المنتجات";   // الاسم الحقيقي لجدول خيارات ومقاسات المنتجات
const TABLE_REVIEWS = "الآراء";             // الاسم الحقيقي لجدول آراء وتقييمات العملاء
const TABLE_ORDERS = "الطلبات";             // الاسم الحقيقي لجدول طلبات المنتجات
// =========================================================================

function parseWhatsAppPhone(whatsappField: any): string {
  if (!whatsappField) return "967770007059";
  
  const str = String(whatsappField).trim();
  if (!str) return "967770007059";

  // 1. Try to extract digits from a URL or standard pattern
  const urlMatch = str.match(/(?:wa\.me|api\.whatsapp\.com\/send\?phone=|api\.whatsapp\.com\/send\/\?phone=|send\?phone=)(\d+)/i);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }

  // 2. If it's a wa.me link but has custom routing, try to find consecutive digits after wa.me/
  if (str.includes("wa.me/")) {
    const parts = str.split("wa.me/");
    const after = parts[1] || "";
    const digitsMatch = after.match(/^(\d+)/);
    if (digitsMatch && digitsMatch[1]) {
      return digitsMatch[1];
    }
  }

  // 3. Clean all non-digit characters
  const cleaned = str.replace(/\D/g, "");
  if (cleaned) {
    let num = cleaned;
    if (num.startsWith("00")) {
      num = num.substring(2);
    }
    if (num.startsWith("0") && num.length === 10) {
      num = num.substring(1);
    }
    // If it is a 9-digit Yemeni mobile number starting with 7, prepend country code 967
    if (num.length === 9 && num.startsWith("7")) {
      return "967" + num;
    }
    if (num.length >= 7) {
      return num;
    }
  }

  return "967770007059";
}

function parseFAQs(faqValue: any): any[] {
  if (!faqValue) return [];
  if (Array.isArray(faqValue)) {
    return faqValue.map(item => ({
      question: item.question || item.q || "",
      answer: item.answer || item.a || ""
    })).filter(item => item.question && item.answer);
  }
  if (typeof faqValue === "string") {
    const trimmed = faqValue.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map(item => ({
            question: item.question || item.q || "",
            answer: item.answer || item.a || ""
          })).filter(item => item.question && item.answer);
        }
      } catch (e) {
        // Ignore and fallback to text parsing
      }
    }
    
    const faqs: any[] = [];
    const lines = faqValue.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    let currentQuestion = "";
    
    for (const line of lines) {
      // Clean leading and trailing markdown/bullets/numbering/asterisks
      const cleanLine = line
        .replace(/^[\s-*•_#\d.)(]+/, "") // Remove bullet markers, list numbers, asterisks, dashes, hashes
        .replace(/[\s*•_#]+$/, "")       // Remove trailing formatting markers
        .trim();
        
      if (!cleanLine) continue;

      // Matches optionally starting with "ال" (e.g. السؤال, الجواب, سؤال, جواب)
      const qMatch = cleanLine.match(/^(?:ال)?(?:س(?:ؤال)?\s*[:：]|\bQ(?:uestion)?\s*[:：]|\b[Qq]\s*[:：])\s*(.*)$/i);
      const aMatch = cleanLine.match(/^(?:ال)?(?:ج(?:واب|ابة)?\s*[:：]|\bA(?:nswer)?\s*[:：]|\b[Aa]\s*[:：])\s*(.*)$/i);
      
      if (qMatch) {
        currentQuestion = qMatch[1].trim();
      } else if (aMatch) {
        const answer = aMatch[1].trim();
        if (currentQuestion) {
          faqs.push({ question: currentQuestion, answer });
          currentQuestion = "";
        }
      } else {
        // Heuristic: If it ends with Arabic or English question mark, it's a question
        if (cleanLine.endsWith("؟") || cleanLine.endsWith("?")) {
          currentQuestion = cleanLine;
        } else {
          if (currentQuestion) {
            faqs.push({ question: currentQuestion, answer: cleanLine });
            currentQuestion = "";
          } else {
            // Check if both Q & A are in the same line separated by a question mark
            const splitIdx = cleanLine.indexOf("؟") !== -1 ? cleanLine.indexOf("؟") : cleanLine.indexOf("?");
            if (splitIdx !== -1 && splitIdx < cleanLine.length - 1) {
              const qPart = cleanLine.substring(0, splitIdx + 1).trim();
              const aPart = cleanLine.substring(splitIdx + 1).trim();
              if (qPart && aPart) {
                faqs.push({ question: qPart, answer: aPart });
              }
            } else {
              currentQuestion = cleanLine;
            }
          }
        }
      }
    }
    return faqs;
  }
  return [];
}

// دالة جلب البيانات مباشرة من Airtable في حال عدم توفر خادم الخلفية (مثال على Netlify)
async function fetchShopsFromAirtableDirect(): Promise<Shop[]> {
  try {
    // 1. جلب المتاجر
    const shopsRes = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLE_SHOPS)}`, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_TOKEN}` }
    });
    if (!shopsRes.ok) throw new Error("Failed to fetch shops from Airtable");
    const shopsData = await shopsRes.json();

    // 2. جلب المنتجات
    const productsRes = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLE_PRODUCTS)}`, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_TOKEN}` }
    });
    if (!productsRes.ok) throw new Error("Failed to fetch products from Airtable");
    const productsData = await productsRes.json();

    // 3. جلب خيارات المنتجات
    let optionsData = { records: [] };
    try {
      const optionsRes = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLE_OPTIONS)}`, {
        headers: { Authorization: `Bearer ${AIRTABLE_API_TOKEN}` }
      });
      if (optionsRes.ok) {
        optionsData = await optionsRes.json();
      }
    } catch (err) {
      console.warn("Product options fetch failed on client, continuing with empty list", err);
    }

    // 4. جلب الآراء والتقييمات
    let airtableReviews: any[] = [];
    try {
      const reviewsRes = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLE_REVIEWS)}`, {
        headers: { Authorization: `Bearer ${AIRTABLE_API_TOKEN}` }
      });
      if (reviewsRes.ok) {
        const reviewsData = await reviewsRes.json();
        airtableReviews = reviewsData.records || [];
      }
    } catch (err) {
      console.warn("Reviews fetch failed on client, continuing with empty list", err);
    }

    // بناء خريطة الخيارات للرجوع السريع لها
    const optionMap: Record<string, { name: string; price: number }> = {};
    optionsData.records.forEach((optionRec: any) => {
      const f = optionRec.fields;
      const optName = f["اسم الخيار"] || f["الاسم"] || f["الخيار"] || f["اسم"] || "";
      if (optionRec.id && optName) {
        let optionPrice = 0;
        if (f["السعر الاضافي"] !== undefined) optionPrice = Number(f["السعر الاضافي"]);
        else if (f["السعر الإضافي"] !== undefined) optionPrice = Number(f["السعر الإضافي"]);
        else if (f["السعر"] !== undefined) optionPrice = Number(f["السعر"]);
        else if (f["سعر الخيار"] !== undefined) optionPrice = Number(f["سعر الخيار"]);
        else if (f["سعر إضافي"] !== undefined) optionPrice = Number(f["سعر إضافي"]);
        else if (f["Price"] !== undefined) optionPrice = Number(f["Price"]);

        optionMap[optionRec.id] = {
          name: optName,
          price: optionPrice
        };
      }
    });

    // بناء قائمة المنتجات
    const productsList = productsData.records.map((pRec: any) => {
      const f = pRec.fields;
      const sizeIdsFromProduct = f["خيارات المنتجات"] || [];
      const sizeIds = Array.isArray(sizeIdsFromProduct) ? sizeIdsFromProduct : [sizeIdsFromProduct];
      
      const sizeIdsFromOptions = optionsData.records
        .filter((optionRec: any) => {
          const optFields = optionRec.fields;
          const parentProds = optFields["المنتج التابع له"] || [];
          const parentProdIds = Array.isArray(parentProds) ? parentProds : [parentProds];
          return parentProdIds.includes(pRec.id);
        })
        .map((optionRec: any) => optionRec.id);

      const allOptionIds = Array.from(new Set([...sizeIds, ...sizeIdsFromOptions]));
      const options = allOptionIds.map((id: string) => optionMap[id]).filter(Boolean);
      const sizes = options.map((opt: any) => opt.name);
      
      const shopLinks = f["اسم المتجر"] || [];

      return {
        id: pRec.id,
        name: f["المنتج"] || f["الاسم"] || "",
        price: Number(f["السعر"]) || 0,
        description: f["وصف المنتج"] || f["الوصف"] || "",
        image: f["Attachments"]?.[0]?.url || f["الصورة"]?.[0]?.url || "https://images.unsplash.com/photo-1544816155-12df9643f363?w=600",
        sizes: sizes,
        options: options,
        shopLinks: shopLinks
      };
    });

    // بناء خريطة الآراء لكل متجر
    const reviewsByShopId: Record<string, any[]> = {};
    airtableReviews.forEach((rRec: any) => {
      const f = rRec.fields;
      const user = f["اسم العميل"] || f["الاسم"] || f["الاسم الكريم"] || f["User"] || f["user"] || "عميلة مسار";
      const comment = f["التعليق"] || f["الرأي"] || f["Comment"] || f["comment"] || "";
      
      const shopIdsFromMatajer = f["المتاجر"] || [];
      const shopIdsFromMatjar = f["المتجر"] || [];
      const shopIds = Array.from(new Set([
        ...(Array.isArray(shopIdsFromMatajer) ? shopIdsFromMatajer : [shopIdsFromMatajer]),
        ...(Array.isArray(shopIdsFromMatjar) ? shopIdsFromMatjar : [shopIdsFromMatjar])
      ]));
      const shopName = f["اسم المتجر"];

      if (comment) {
        const reviewObj = { user, comment };
        if (shopIds.length > 0) {
          shopIds.forEach((sId: string) => {
            if (!reviewsByShopId[sId]) {
              reviewsByShopId[sId] = [];
            }
            reviewsByShopId[sId].push(reviewObj);
          });
        }
        if (shopName) {
          const sNameKey = String(shopName).toLowerCase().trim();
          if (!reviewsByShopId[sNameKey]) {
            reviewsByShopId[sNameKey] = [];
          }
          reviewsByShopId[sNameKey].push(reviewObj);
        }
      }
    });

    // إعداد البيانات الثابتة والأسئلة الشائعة الافتراضية
    const staticMetadata: Record<string, any> = {
      "togethry design studio": {
        category: "تصاميم رقمية وملابس",
        rating: 4.9,
        featured: true,
        tags: ["تصاميم رقمية", "عبايات", "هدايا"],
        location: "صنعاء / أونلاين",
        faqs: [
          { q: "هل يتوفر شحن خارج صنعاء؟", a: "نعم، نوفر خدمة التوصيل والشحن لجميع المحافظات اليمنية." },
          { q: "كيف أستلم الملفات للتصاميم الرقمية؟", a: "بمجرد تأكيد طلبكِ، نرسل لكِ رابط التحميل مباشرة عبر واتساب وبريدكِ الإلكتروني." }
        ],
        reviews: [
          { user: "رنا أحمد", comment: "التصميم يجنن والتعامل راقي جداً والملفات ممتازة!" },
          { user: "فاطمة عادل", comment: "أفضل متجر تعاملت معه في مسار سرعة وإتقان لا يعلى عليه" }
        ]
      },
      "ألوان بيضاء": {
        category: "مستلزمات طبية وتجميل",
        rating: 4.8,
        featured: true,
        tags: ["سكرابات طبية", "إكسسوارات تجميل", "ملابس عمل"],
        location: "عدن",
        faqs: [
          { q: "ما هي المقاسات المتوفرة للسكرابات؟", a: "تتوفر المقاسات من XS وحتى XXL، وهناك جدول مقاسات خاص بكل منتج." }
        ],
        reviews: [
          { user: "د. أروى صالح", comment: "الخامة مريحة جداً واللون رائع وثابت بعد الغسيل." }
        ]
      },
      "عَسَل يَمَن": {
        category: "أغذية ومنتجات طبيعية",
        rating: 5.0,
        featured: true,
        tags: ["عسل سدر طبيعي", "عسل دوعني", "مكسرات بالعسل"],
        location: "حضرموت / شبوة",
        faqs: [
          { q: "هل العسل مضمون ومفحوص؟", a: "نعم، عسلنا طبيعي 100% ومفحوص مخبرياً ونضمن جودته الكاملة." }
        ],
        reviews: [
          { user: "محمد عمر", comment: "عسل سدر من أفضل ما تذوقت، جودة عالية وتغليف ممتاز وحريص." }
        ]
      }
    };

    const finalShops: Shop[] = [];
    shopsData.records.forEach((sRec: any) => {
      const f = sRec.fields;
      const originalName = f["اسم المتجر"] || "";
      if (!originalName) return;

      const nameKey = originalName.toLowerCase().trim();
      const meta = staticMetadata[nameKey] || {
        category: f["الفئة"] || "متجر متميز",
        rating: 5.0,
        featured: false,
        tags: f["الوسوم"] || f["Tags"] || ["جديد", "متجر"],
        location: f["الموقع"] || "اليمن",
        faqs: [],
        reviews: []
      };

      const shopProducts = productsList.filter((p: any) => p.shopLinks.includes(sRec.id));
      const logoUrl = f["صورة اللوجو"]?.[0]?.url || "https://images.unsplash.com/photo-1544816155-12df9643f363?w=600";
      const instagramUrl = f["الانستقرام"] || f["انستقرام"] || "";
      const whatsappLink = f["رابط الواتساب"] || f["واتساب"] || "";
      
      // Parse WhatsApp phone number from the link using robust parser
      const whatsappPhone = parseWhatsAppPhone(whatsappLink);

      const staticReviews = meta.reviews || [];
      const airtableShopIdReviews = reviewsByShopId[sRec.id] || [];
      const airtableShopNameReviews = reviewsByShopId[nameKey] || [];

      const seenComments = new Set<string>();
      const combinedReviews: any[] = [];
      [...staticReviews, ...airtableShopIdReviews, ...airtableShopNameReviews].forEach((rev: any) => {
        const key = `${rev.user?.trim()}|||${rev.comment?.trim()}`;
        if (!seenComments.has(key)) {
          seenComments.add(key);
          combinedReviews.push(rev);
        }
      });

      const badgeVal = f["الشارة"] || f["الشاره"] || f["badge"] || f["Badge"] || "";
      const categoryVal = f["التصنيف"] || f["الفئة"] || f["القسم"] || meta.category || "متجر متميز";
      const themeColorVal = f["لون الثيم"] || f["لون_الثيم"] || f["themeColor"] || f["ThemeColor"] || f["اللون"] || "";
      const themeColorPrimaryVal = f["لون الثيم الاساسي"] || f["لون_الثيم_الاساسي"] || f["themeColorPrimary"] || f["ThemeColorPrimary"] || f["اللون الاساسي"] || "";
      const themeColorSecondaryVal = f["لون الثيم الثانوي"] || f["لون_الثيم_الثانوي"] || f["themeColorSecondary"] || f["ThemeColorSecondary"] || f["اللون الثانوي"] || "";
      const faqRaw = f["الأسئلة المكررة"] || f["الأسئلة الشائعة"] || f["الاسئلة المكررة"] || f["الاسئلة الشائعة"] || f["faqs"] || f["FAQs"] || f["FAQ"];
      const faqsList = faqRaw ? parseFAQs(faqRaw) : (meta.faqs || []);

      finalShops.push({
        id: sRec.id,
        name: originalName,
        category: categoryVal,
        badge: badgeVal,
        themeColor: themeColorVal,
        themeColorPrimary: themeColorPrimaryVal,
        themeColorSecondary: themeColorSecondaryVal,
        description: f["وصف المتجر"] || f["الوصف"] || "",
        image: logoUrl,
        instagram: instagramUrl,
        rating: meta.rating,
        featured: meta.featured,
        tags: meta.tags,
        location: f["الموقع"] || meta.location,
        whatsappPhone: whatsappPhone,
        products: shopProducts.map((p: any) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          description: p.description,
          image: p.image,
          sizes: p.sizes,
          options: p.options
        })),
        reviews: combinedReviews,
        faqs: faqsList
      });
    });

    return finalShops;
  } catch (err) {
    console.error("fetchShopsFromAirtableDirect failed:", err);
    throw err;
  }
}

// دالة إرسال الطلبات مباشرة من المتصفح إلى Airtable كاحتياط (تم تعطيل الحفظ للخصوصية بطلب المستخدم)
async function postOrderToAirtableDirect(orderData: any) {
  console.log("Direct order posting bypassed for user privacy.");
  return true;
}

// دالة إرسال الآراء والتقييمات مباشرة من المتصفح إلى Airtable كاحتياط
async function postReviewToAirtableDirect(reviewData: any) {
  try {
    const tableCandidates = [TABLE_REVIEWS, "الآراء", "Reviews", "التقييمات"];
    let posted = false;
    for (const tableName of tableCandidates) {
      const fields: Record<string, any> = {};
      
      if (tableName === "الآراء" || tableName === "التقييمات" || tableName === TABLE_REVIEWS) {
        fields["اسم العميل"] = reviewData.user;
        fields["التعليق"] = reviewData.comment;
        fields["المتاجر"] = [reviewData.shopId];
      } else {
        fields["User"] = reviewData.user;
        fields["Comment"] = reviewData.comment;
        fields["Shop"] = [reviewData.shopId];
      }

      const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${AIRTABLE_API_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          records: [{ fields }]
        })
      });
      if (response.ok) {
        posted = true;
        console.log(`Successfully posted review directly to Airtable table: ${tableName}`);
        break;
      }
    }
    return posted;
  } catch (err) {
    console.error("Direct Airtable review post failed:", err);
    return false;
  }
}

function isProductDigital(product: Product, shop?: Shop): boolean {
  if (shop) {
    const cat = (shop.category || "").toLowerCase();
    const tags = (shop.tags || []).map(t => t.toLowerCase());
    if (
      cat.includes("رقمي") ||
      cat.includes("اونلاين") ||
      cat.includes("أونلاين") ||
      cat.includes("كتب") ||
      cat.includes("تصميم") ||
      cat.includes("مواقع") ||
      cat.includes("إلكتروني") ||
      cat.includes("الكتروني")
    ) {
      return true;
    }
  }

  const nameDesc = ((product.name || "") + " " + (product.description || "")).toLowerCase();
  const digitalKeywords = [
    "شعار", "لوجو", "لوقو", "هايلايت", "بوست", "تصميم", "موقع", "صفحة", "رقمي", "رقمية",
    "كتاب", "pdf", "حصص", "حصة", "اونلاين", "أونلاين", "كورس", "دورة", "ملف", "إلكتروني", "الكتروني"
  ];
  return digitalKeywords.some(keyword => nameDesc.includes(keyword));
}

export default function App() {
  // Navigation states
  const [hasEntered, setHasEntered] = useState<boolean>(false);

  // User mood state from Page 1 to show a lovely custom greeting on Page 2
  const [selectedMood, setSelectedMood] = useState<string | null>(() => {
    return localStorage.getItem("masar_user_mood");
  });

  // Database of shops & favorites
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem("masar_favorites");
    return saved ? JSON.parse(saved) : [];
  });

  // Shopping Cart state
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem("masar_cart_items");
    return saved ? JSON.parse(saved) : [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Search & Filters states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("الكل");
  const [selectedLocation, setSelectedLocation] = useState("الكل");
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

  // Modal State
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);

  // Toast State for quick notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Public Tools Active Tab
  const [activeToolSuite, setActiveToolSuite] = useState<"premium" | "free">("premium");
  const [activeToolTab, setActiveToolTab] = useState<"idea" | "marketing" | "prompt-gen" | "profit-sim">("idea");

  // Project Idea Generator states
  const [ideaInterests, setIdeaInterests] = useState("");
  const [ideaTime, setIdeaTime] = useState("10");
  const [ideaCapital, setIdeaCapital] = useState("");
  const [generatedIdeaResult, setGeneratedIdeaResult] = useState("");
  const [isGeneratingIdea, setIsGeneratingIdea] = useState(false);

  // AI Marketing Assistant states
  const [marketingProduct, setMarketingProduct] = useState("");
  const [marketingTone, setMarketingTone] = useState("أنيق ولطيف");
  const [marketingDetails, setMarketingDetails] = useState("");
  const [generatedMarketingResult, setGeneratedMarketingResult] = useState("");
  const [isGeneratingMarketing, setIsGeneratingMarketing] = useState(false);

  // AI Prompt Engineer Assistant states
  const [promptInput, setPromptInput] = useState("");
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [generatedPromptResult, setGeneratedPromptResult] = useState("");

  // Public Commercial Calculator states
  const [activeCalcTab, setActiveCalcTab] = useState<"pricing" | "profit">("pricing");
  
  // Public Pricing Calc Inputs
  const [calcCost, setCalcCost] = useState<number | string>("");
  const [calcHours, setCalcHours] = useState<number | string>("");
  const [calcHourlyRate, setCalcHourlyRate] = useState<number | string>("");
  const [calcMarketAverage, setCalcMarketAverage] = useState<number | string>("");
  const [calcMarginPercent, setCalcMarginPercent] = useState<number | string>("30");
  const [calcMarketAdjustment, setCalcMarketAdjustment] = useState<number | string>("");
  const [calcSuggestedPrice, setCalcSuggestedPrice] = useState<number | null>(null);

  // Public Profit Calc Inputs
  const [profitCost, setProfitCost] = useState<number | string>("");
  const [profitPrice, setProfitPrice] = useState<number | string>("");
  const [profitQty, setProfitQty] = useState<number | string>("");
  const [profitResult, setProfitResult] = useState<number | null>(null);

  // Profit Simulator PIN Protection States (Preloaded from LocalStorage)
  const [isAuthorizedToProfitSim, setIsAuthorizedToProfitSim] = useState<boolean>(() => {
    try {
      return localStorage.getItem("masar_authorized_pin") === "1234";
    } catch {
      return false;
    }
  });
  const [pinInput, setPinInput] = useState<string>("");
  const [pinError, setPinError] = useState<string | null>(null);

  // Dynamic shops state loaded from Airtable, falling back to static BOUTIQUE_SHOPS initially
  const [shops, setShops] = useState<Shop[]>(BOUTIQUE_SHOPS);
  const [isLoadingShops, setIsLoadingShops] = useState<boolean>(false);

  // Dynamic locations derived from existing shops in local state
  const dynamicLocations = ["الكل", ...Array.from(new Set(shops.map(shop => shop.location).filter(Boolean)))];

  // Dynamic categories derived from existing shops to ensure exact match with Airtable categories
  const dynamicCategories = ["الكل", ...Array.from(new Set(shops.map(shop => shop.category?.trim()).filter(Boolean)))];

  useEffect(() => {
    setIsLoadingShops(true);
    fetch("/api/shops")
      .then((res) => {
        if (!res.ok) throw new Error("Server response was not ok");
        return res.json();
      })
      .then((data) => {
        if (data && Array.isArray(data) && data.length > 0) {
          setShops(data);
          // If our current simSelectedShopId is not in the new dataset, update it!
          if (!data.some(s => s.id === simSelectedShopId)) {
            setSimSelectedShopId(data[0].id);
          }
        } else {
          throw new Error("Empty or invalid server data");
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch shops from server API, trying direct Airtable API fetch instead...", err);
        return fetchShopsFromAirtableDirect();
      })
      .then((data) => {
        if (data && Array.isArray(data) && data.length > 0) {
          setShops(data);
          if (!data.some(s => s.id === simSelectedShopId)) {
            setSimSelectedShopId(data[0].id);
          }
        }
      })
      .catch((err) => {
        console.error("Failed both server API and direct Airtable API fetches, using static data", err);
      })
      .finally(() => {
        setIsLoadingShops(false);
      });
  }, []);

  // New States for the Upgraded Order Form
  const [isOrderFormOpen, setIsOrderFormOpen] = useState<boolean>(false);
  const [orderShopId, setOrderShopId] = useState<string | null>(null);
  const [orderShopItems, setOrderShopItems] = useState<CartItem[]>([]);
  const [orderName, setOrderName] = useState<string>("");
  const [orderPhone, setOrderPhone] = useState<string>("");
  const [orderAddress, setOrderAddress] = useState<string>("");
  const [orderQuantity, setOrderQuantity] = useState<number>(1);
  const [orderNotes, setOrderNotes] = useState<string>("");

  // Profit Simulator Calculations
  const [simSelectedShopId, setSimSelectedShopId] = useState<string>(BOUTIQUE_SHOPS[0]?.id || "");
  const currentShopForSim = shops.find(s => s.id === simSelectedShopId);
  const currentProductsForSim = currentShopForSim?.products || [];
  const [simSelectedProductId, setSimSelectedProductId] = useState<string>(currentProductsForSim[0]?.id || "");

  const [simCost, setSimCost] = useState<number | string>("");
  const [simPrice, setSimPrice] = useState<number | string>("");
  const [simQuantity, setSimQuantity] = useState<number | string>("10");

  // Sync pricing values when selected product changes in Sim
  useEffect(() => {
    const prod = currentProductsForSim.find(p => p.id === simSelectedProductId);
    if (prod) {
      setSimPrice(prod.price);
      setSimCost(Math.round(prod.price * 0.6));
    } else {
      setSimPrice("");
      setSimCost("");
    }
  }, [simSelectedProductId, simSelectedShopId]);

  // Adjust selection when shop changes
  useEffect(() => {
    const firstProd = currentProductsForSim[0];
    if (firstProd) {
      setSimSelectedProductId(firstProd.id);
    } else {
      setSimSelectedProductId("");
    }
  }, [simSelectedShopId]);

  // Handle PIN verification
  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === "1234") {
      setIsAuthorizedToProfitSim(true);
      try {
        localStorage.setItem("masar_authorized_pin", "1234");
      } catch (err) {
        console.error(err);
      }
      setPinError(null);
      showToast("تم التحقق بنجاح! تم تنشيط المزايا الذهبية الحصرية");
    } else {
      setPinError("رمز الوصول الآمن غير صحيح! يرجى إعادة المحاولة");
    }
  };

  // Sync favorites with localStorage
  useEffect(() => {
    localStorage.setItem("masar_favorites", JSON.stringify(favorites));
  }, [favorites]);

  // Sync cart items with localStorage
  useEffect(() => {
    localStorage.setItem("masar_cart_items", JSON.stringify(cart));
  }, [cart]);

  // User reviews state to store custom reviews added in the browser
  const [userReviews, setUserReviews] = useState<Record<string, Review[]>>(() => {
    const saved = localStorage.getItem("masar_user_reviews");
    return saved ? JSON.parse(saved) : {};
  });

  // Sync user reviews with localStorage
  useEffect(() => {
    localStorage.setItem("masar_user_reviews", JSON.stringify(userReviews));
  }, [userReviews]);

  // Add review logic
  const handleAddReview = (shopId: string, review: Review) => {
    setUserReviews((prev) => {
      const prevReviews = prev[shopId] || [];
      return {
        ...prev,
        [shopId]: [...prevReviews, review]
      };
    });

    const shopDetail = shops.find((s) => s.id === shopId);
    const shopName = shopDetail?.name || "";

    const reviewPayload = {
      shopId,
      shopName,
      user: review.user,
      comment: review.comment
    };

    // Save to Airtable asynchronously
    fetch("/api/reviews", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(reviewPayload)
    })
    .then((res) => {
      if (!res.ok) throw new Error("Server review post failed");
      return res.json();
    })
    .then((data) => {
      console.log("Review saved status via server:", data);
    })
    .catch((err) => {
      console.warn("Server review post failed, trying direct Airtable review post...", err);
      postReviewToAirtableDirect(reviewPayload);
    });

    showToast("تمت إضافة تقييمكِ اللطيف بنجاح! ⭐");
  };

  // Join Us logic
  const handleJoinUs = () => {
    try {
      navigator.clipboard.writeText("السلام عليكم، حابة أشترك بمسار");
    } catch (err) {
      console.log(err);
    }
    showToast("نسخنا لكِ رسالة الاشتراك التلقائية وفتحنا الإنستغرام! 💖");
    window.open("https://ig.me/m/masar_platform", "_blank");
  };

  // Public Pricing Calculate
  const handleCalculatePricing = () => {
    const cost = parseFloat(calcCost as string) || 0;
    const hours = parseFloat(calcHours as string) || 0;
    const rate = parseFloat(calcHourlyRate as string) || 0;
    const marginPercentValue = parseFloat(calcMarginPercent as string) || 0;
    const marketAdj = parseFloat(calcMarketAdjustment as string) || 0;

    if (cost === 0 && hours === 0) {
      showToast("الرجاء إدخال تكلفة المواد أو ساعات العمل أولاً");
      return;
    }

    const baseCost = cost + (hours * rate);
    const profitMargin = baseCost * (marginPercentValue / 100);
    const suggested = baseCost + profitMargin + marketAdj;

    setCalcSuggestedPrice(Math.round(suggested));
    showToast("تم احتساب السعر المقترح بنجاح!");
  };

  // Public Profit Calculate
  const handleCalculateProfit = () => {
    const cost = parseFloat(profitCost as string) || 0;
    const price = parseFloat(profitPrice as string) || 0;
    const qty = parseFloat(profitQty as string) || 0;

    if (price === 0) {
      showToast("الرجاء إدخال سعر بيع المنتج");
      return;
    }

    setProfitResult((price - cost) * qty);
    showToast("تم احتساب صافي الأرباح المتوقعة!");
  };

  // Public Project Idea Generator api call
  const handleGenerateProjectIdea = async () => {
    if (!ideaInterests.trim()) {
      showToast("الرجاء تحديد اهتماماتك أو مهاراتك لتوجيه الذكاء الاصطناعي");
      return;
    }
    setIsGeneratingIdea(true);
    setGeneratedIdeaResult("");
    try {
      const response = await fetch("/api/generate-idea", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interests: ideaInterests,
          availableTime: ideaTime,
          capital: ideaCapital
        })
      });
      const data = await response.json();
      if (data.result) {
        setGeneratedIdeaResult(data.result);
        showToast("اكتمل توليد الأفكار الملهمة!");
      } else {
        showToast("عذراً، لم تنجح العملية. يرجى المحاولة بعد قليل.");
      }
    } catch (err) {
      console.error(err);
      showToast("خطأ في الشبكة، يرجى التأكد من تشغيل الخادم");
    } finally {
      setIsGeneratingIdea(false);
    }
  };

  // Public AI Marketing Assistant api call
  const handleGenerateMarketingAssistant = async () => {
    if (!marketingProduct.trim()) {
      showToast("الرجاء كتابة نوع المشروع أو المنتج أولاً");
      return;
    }
    setIsGeneratingMarketing(true);
    setGeneratedMarketingResult("");
    try {
      const response = await fetch("/api/generate-marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectType: marketingProduct,
          tone: marketingTone,
          details: marketingDetails
        })
      });
      const data = await response.json();
      if (data.result) {
        setGeneratedMarketingResult(data.result);
        showToast("تمت صياغة المحتوى التسويقي بنجاح!");
      } else {
        showToast("عذراً، لم نتمكن من صياغة الإعلان.");
      }
    } catch (err) {
      console.error(err);
      showToast("خطأ في الاتصال بالسيرفر، تأكدي من الاتصال بالشبكة.");
    } finally {
      setIsGeneratingMarketing(false);
    }
  };

  // Public AI Prompt Engineer Assistant api call
  const handleGeneratePromptAssistant = async () => {
    if (!promptInput.trim()) {
      showToast("الرجاء صفي طبيعة مشروعكِ لتوجيه مهندس الأوامر");
      return;
    }
    setIsGeneratingPrompt(true);
    setGeneratedPromptResult("");
    try {
      const response = await fetch("/api/generate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessNeed: promptInput
        })
      });
      const data = await response.json();
      if (data.result) {
        setGeneratedPromptResult(data.result);
        showToast("اكتمل توليد الموجه الاحترافي بنجاح!");
      } else {
        showToast("عذراً، لم نتمكن من توليد الموجه حالياً.");
      }
    } catch (err) {
      console.error(err);
      showToast("خطأ في الاتصال بالشبكة، تأكدي من الاتصال بالخادم");
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  const handleCopyText = (text: string) => {
    try {
      navigator.clipboard.writeText(text);
      showToast("تم نسخ النص بنجاح لبورد الهاتف!");
    } catch (err) {
      console.error(err);
    }
  };

  // Sync entry state
  const handleEnterApp = () => {
    localStorage.setItem("masar_entered", "true");
    setHasEntered(true);
  };

  // Toggle favorite status
  const handleToggleFavorite = (shopId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const isAlreadyFav = prev.includes(shopId);
      const nameOfShop = shops.find(s => s.id === shopId)?.name || "المتجر";
      
      if (isAlreadyFav) {
        showToast(`تم إزالة ${nameOfShop} من مفضلتكِ`);
        return prev.filter((id) => id !== shopId);
      } else {
        showToast(`أضفتِ ${nameOfShop} إلى مفضلتكِ`);
        return [...prev, shopId];
      }
    });
  };

  // Toast trigger utility
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Select mood on Welcome screen
  const selectMoodResponse = (mood: string) => {
    setSelectedMood(mood);
    localStorage.setItem("masar_user_mood", mood);
    showToast("تم تحديد التوجه الاستراتيجي بنجاح.");
  };

  // Clear all filters
  const resetFilters = () => {
    setSearchTerm("");
    setSelectedCategory("الكل");
    setSelectedLocation("الكل");
    setShowOnlyFavorites(false);
    showToast("تم إعادة تصفّح جميع المتاجر");
  };

  // Add Item to Cart
  const handleAddToCart = (product: Product, shop: Shop, size: string, notes: string) => {
    setCart((prev) => {
      const uniqueId = `${product.id}-${size}`;
      const existing = prev.find((item) => item.id === uniqueId);
      
      if (existing) {
        showToast(`تم زيادة كمية ${product.name} في سلتكِ`);
        return prev.map((item) =>
          item.id === uniqueId
            ? { ...item, quantity: item.quantity + 1, notes: notes || item.notes }
            : item
        );
      } else {
        showToast(`أضفتِ ${product.name} إلى السلة`);
        return [
          ...prev,
          {
            id: uniqueId,
            product,
            shopId: shop.id,
            shopName: shop.name,
            size,
            notes,
            quantity: 1,
          },
        ];
      }
    });
  };

  // Update Cart Quantity
  const handleUpdateCartQty = (itemId: string, increment: boolean) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === itemId) {
            const newQty = increment ? item.quantity + 1 : item.quantity - 1;
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  // Remove item representation completely
  const handleRemoveCartItem = (itemId: string) => {
    setCart((prev) => {
      const itemToRemove = prev.find((item) => item.id === itemId);
      if (itemToRemove) {
        showToast(`تم إزالة ${itemToRemove.product.name} من السلة`);
      }
      return prev.filter((item) => item.id !== itemId);
    });
  };

  // WhatsApp Order Flow Triggers the Upgraded Order Form Modal
  const sendWhatsAppOrder = (shopId: string, shopItems: CartItem[]) => {
    const shopDetail = shops.find((s) => s.id === shopId);
    if (!shopDetail) return;

    setOrderShopId(shopId);
    setOrderShopItems(shopItems);
    
    // Prefill the total quantity in the cart for this shop
    const totalQty = shopItems.reduce((sum, item) => sum + item.quantity, 0);
    setOrderQuantity(totalQty);
    
    // Reset form states and prefill saved ones
    setOrderNotes("");
    const savedName = localStorage.getItem("masar_order_name") || "";
    const savedPhone = localStorage.getItem("masar_order_phone") || "";
    setOrderName(savedName);
    setOrderPhone(savedPhone);
    setOrderAddress("");
    
    setIsOrderFormOpen(true);
  };

  // Filter criteria logic
  const filteredShops = shops.filter((shop) => {
    const matchesSearch =
      shop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shop.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shop.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shop.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = selectedCategory === "الكل" || (shop.category || "").trim().toLowerCase() === selectedCategory.trim().toLowerCase();
    const matchesLocation = selectedLocation === "الكل" || shop.location === selectedLocation;
    const matchesFavorites = !showOnlyFavorites || favorites.includes(shop.id);

    return matchesSearch && matchesCategory && matchesLocation && matchesFavorites;
  });

  // Unique list of shops that have items in the cart
  const cartShops = Array.from(new Set(cart.map((item) => item.shopId))) as string[];

  // Total quantity of items in cart
  const totalCartQty = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Helper date rendering
  const getArabicDate = () => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
    return new Date().toLocaleDateString('ar-YE', options);
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#1e293b] font-sans selection:bg-[#1e293b]/10 relative overflow-hidden flex flex-col">
      {/* Toast Notification Banner */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="fixed top-6 inset-x-0 mx-auto z-50 w-max max-w-[90%] px-6 py-3.5 bg-[#1e293b] text-white font-cairo font-semibold text-xs md:text-sm rounded-full shadow-xl flex items-center gap-2 border border-slate-700/50"
          >
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BACKGROUND FLOATING DECORATIONS - ALWAYS PRESENT */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <DecoSticker type="sparkle" size={24} className="absolute top-[8%] right-[10%] opacity-40" />
        <DecoSticker type="star" size={32} className="absolute top-[18%] left-[7%] opacity-30" delay={0.8} />
        <DecoSticker type="heart" size={20} className="absolute bottom-[25%] right-[5%] opacity-35" delay={1.5} />
        <DecoSticker type="flower" size={28} className="absolute bottom-[10%] left-[10%] opacity-30" delay={2.2} />
        <DecoSticker type="sparkle" size={16} className="absolute top-[45%] right-[3%] opacity-20" delay={3.1} />
        <DecoSticker type="star" size={20} className="absolute bottom-[48%] left-[4%] opacity-25" delay={1.1} />
      </div>

      <AnimatePresence mode="wait">
        {!hasEntered ? (
          /* PAGE 1: SPLASH & WELCOME SCREEN */
          <motion.div
            key="welcome-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.6 }}
            className="flex-grow flex flex-col items-center justify-center p-4 relative z-10 w-full max-w-2xl mx-auto py-6"
          >
            {/* Massive Greeting Frame */}
            <div className="w-full text-center py-8 px-6 bg-white border border-[#1e293b]/5 rounded-[2.5rem] shadow-sm select-none">
              
              {/* Brand Header Mark */}
              <div className="mb-8 inline-flex flex-col items-center">
                <div className="relative bg-white rounded-full shadow-md mb-2 hover:scale-105 transition-transform flex items-center justify-center w-20 h-20 overflow-hidden border border-slate-200">
                  <img src="https://i.ibb.co/m53gL8t9/masra-logo.png" alt="Brand Logo" className="w-full h-full object-cover scale-[1.3] object-center" referrerPolicy="no-referrer" />
                  <DecoSticker type="sparkle" size={18} className="absolute top-1 right-1" />
                </div>
                <h1 className="font-cairo font-black text-3xl tracking-tight text-[#1e293b]">مَسَار</h1>
                <p className="font-sans text-[11px] text-slate-400 mt-0.5">دليل منتقى للمتاجر والمشاريع اليمنية الأنيقة</p>
              </div>

              {/* Action Buttons Box */}
              <div className="flex flex-col gap-3.5 w-full max-w-xs mx-auto">
                <button
                  id="enter-app-button"
                  onClick={handleEnterApp}
                  className="w-full flex items-center justify-center gap-2 bg-[#1e293b] hover:bg-slate-800 text-white font-cairo font-bold text-md py-4 px-8 rounded-3xl transition-all duration-300 shadow-[0_8px_24px_rgba(30,41,59,0.18)] active:translate-y-0.5"
                >
                  <span>استكشفي المتاجر</span>
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </button>

                <button
                  id="join-us-button"
                  type="button"
                  onClick={handleJoinUs}
                  className="w-full flex items-center justify-center gap-2 bg-[#FDFBF7] border-2 border-[#1e293b] text-[#1e293b] hover:bg-[#1e293b]/5 font-cairo font-bold text-md py-3.5 px-8 rounded-3xl transition-all duration-300 active:translate-y-0.5"
                >
                  <span>انضمي إلينا</span>
                  <Smile className="w-5 h-5 text-rose-500" />
                </button>
              </div>
            </div>

            {/* PUBLIC VISITOR ENTERPRISE TOOLBOX */}
            <div className="w-full bg-white border border-[#1e293b]/10 rounded-[2.5rem] p-5 sm:p-6 md:p-8 mt-4 shadow-sm">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto text-[#1e293b] mb-2 shadow-sm">
                  <Wrench className="w-5 h-5 text-slate-700" />
                </div>
                <h3 className="font-cairo font-black text-lg text-[#1e293b] mt-1">
                  أدوات مَسَار لتمكين المشاريع اليمنية
                </h3>
                <p className="font-sans text-slate-450 text-[11px] mt-1 leading-normal max-w-md mx-auto">
                  مساحة مخصصة تدمج بين المحاكاة والذكاء الاصطناعي لمساعدتكِ على تسعير وتطوير عملكِ الناشئ بكل ثقة ونجاح!
                </p>
              </div>

              {/* Sub tabs inside the Tools Card */}
              <div className="flex bg-[#EFEBE4]/50 p-1 rounded-2xl gap-1 mb-5 overflow-x-auto scrollbar-none">
                {[
                  { id: "idea", label: "أفكار مشاريع عدن", icon: Lightbulb },
                  { id: "marketing", label: "مساعد التسويق الذكي", icon: PenTool },
                  { id: "prompt-gen", label: "مهندس الأوامر الذكي", icon: Terminal },
                  { id: "calculator", label: "الحاسبة التجارية", icon: Calculator },
                  { id: "profit-sim", label: "محاكاة الأرباح", icon: BarChart3 }
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveToolTab(tab.id as any)}
                      className={`flex-grow shrink-0 flex items-center justify-center gap-2 text-center font-cairo font-black text-[11px] py-2 px-2.5 rounded-xl transition-all duration-300 ${
                        activeToolTab === tab.id
                          ? "bg-[#1e293b] text-white shadow-sm"
                          : "text-slate-600 hover:bg-[#1e293b]/5"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="whitespace-nowrap">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* IF CHOSEN TAB IS A PREMIUM TOOL AND USER IS NOT AUTHORIZED, SHOW SECURE GATE (DONT MENTION PIN SECRET FOR MAXIMUM PRIVACY) */}
              {(activeToolTab === "marketing" || activeToolTab === "prompt-gen" || activeToolTab === "profit-sim") && !isAuthorizedToProfitSim ? (
                <form onSubmit={handleVerifyPin} className="space-y-4 max-w-sm mx-auto text-center py-8">
                  <div className="w-12 h-12 bg-rose-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto text-[#1e293b] mb-2 shadow-sm animate-pulse">
                    <Sparkles className="w-5 h-5 text-amber-500 fill-amber-200" />
                  </div>
                  <h4 className="font-cairo font-black text-xs text-[#1e293b]">جناح مَسَار الاحترافي المتقدم</h4>
                  <p className="font-sans text-[11px] text-slate-500 leading-normal">
                    مساحة مخصصة للشركاء وصاحبات المشاريع لإدارة الحسابات وتخطيط وإعداد التحليلات ونماذج الأعمال بأسلوب مهني واحترافي. يرجى إدخال رمز الوصول الآمن للمتابعة.
                  </p>
                  <div className="space-y-2">
                    <input
                      type="password"
                      maxLength={6}
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value)}
                      placeholder="أدخلي رمز المرور والوصول الآمن..."
                      className="w-full text-center font-sans text-sm tracking-widest p-3 bg-[#FDFBF7] border border-[#1e293b]/10 focus:border-[#1e293b] outline-none rounded-2xl placeholder:tracking-normal"
                    />
                    {pinError && (
                      <span className="block font-sans text-[10px] text-rose-500 font-bold">{pinError}</span>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-[#1e293b] hover:bg-slate-800 text-white font-cairo font-bold text-xs py-3 rounded-2xl transition-all"
                  >
                    تأكيد رمز الوصول والعبور
                  </button>
                </form>
              ) : (
                /* ACTUAL ACTIVE TABS CONTAINER */
                <>
                  {/* Lock Screen Button if Authorized and viewing premium tool */}
                  {(activeToolTab === "marketing" || activeToolTab === "prompt-gen" || activeToolTab === "profit-sim") && isAuthorizedToProfitSim && (
                    <div className="flex justify-end mb-3">
                      <button
                        onClick={() => {
                          setIsAuthorizedToProfitSim(false);
                          setPinInput("");
                          try {
                            localStorage.removeItem("masar_authorized_pin");
                          } catch (err) {
                            console.error(err);
                          }
                          showToast("تم قفل ميزات العضوية بنجاح");
                        }}
                        className="font-cairo text-[9px] bg-slate-500/5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 px-2 py-0.5 rounded-lg transition-colors border border-dashed border-slate-200"
                        title="قفل الشاشة"
                      >
                        قفل الأدوات الممتازة
                      </button>
                    </div>
                  )}

                  {/* 1. Project Idea Generator Tab */}
                  {activeToolTab === "idea" && (
                    <div className="space-y-4 text-right">
                      <div>
                        <label className="block font-cairo font-extrabold text-[11px] text-slate-700 mb-1">ما هي اهتماماتك أو المهارات التي تميلين إليها؟</label>
                        <input
                          type="text"
                          value={ideaInterests}
                          onChange={(e) => setIdeaInterests(e.target.value)}
                          placeholder="مثال: الخياطة، بخور، طبخ حلويات، تصميم إعلاني، تعبئة عطور..."
                          className="w-full font-sans text-xs p-3 bg-[#FDFBF7] border border-[#1e293b]/10 focus:border-[#1e293b] outline-none rounded-2xl"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-cairo font-extrabold text-[11px] text-slate-700 mb-1">الوقت المتاح أسبوعياً:</label>
                          <select
                            value={ideaTime}
                            onChange={(e) => setIdeaTime(e.target.value)}
                            className="w-full font-sans text-xs p-3 bg-[#FDFBF7] border border-[#1e293b]/10 focus:border-[#1e293b] outline-none rounded-2xl cursor-pointer"
                          >
                            <option value="5">أقل من ٥ ساعات</option>
                            <option value="10">٥ إلى ١٠ ساعات</option>
                            <option value="20">١٠ إلى ٢٠ ساعة</option>
                            <option value="40">دوام كامل (أكثر من ٢٠ ساعة)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block font-cairo font-extrabold text-[11px] text-slate-700 mb-1">رأس المال المعادل (ريال):</label>
                          <input
                            type="number"
                            value={ideaCapital}
                            onChange={(e) => setIdeaCapital(e.target.value)}
                            placeholder="مثال: 50000"
                            className="w-full font-sans text-xs p-3 bg-[#FDFBF7] border border-[#1e293b]/10 focus:border-[#1e293b] outline-none rounded-2xl"
                          />
                        </div>
                      </div>

                      <button
                        onClick={handleGenerateProjectIdea}
                        disabled={isGeneratingIdea}
                        className="w-full bg-[#1e293b] hover:bg-slate-800 text-[#FDFBF7] font-cairo font-bold text-xs py-3 rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2"
                      >
                        {isGeneratingIdea ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>جاري اقتراح الأفكار...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                            <span>اقترح فكرة مشروع بالذكاء الاصطناعي</span>
                          </>
                        )}
                      </button>

                      {/* Generated result */}
                      {generatedIdeaResult && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-4 p-5 bg-[#FCF9F3] border border-[#1e293b]/5 rounded-[2rem] text-slate-700 font-sans text-xs leading-relaxed relative text-right"
                        >
                          <button
                            onClick={() => handleCopyText(generatedIdeaResult)}
                            className="absolute top-3 left-3 bg-white hover:bg-slate-100 p-2 rounded-xl text-[#1e293b] shadow-sm transition-all"
                            title="نسخ الأفكار"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <div className="whitespace-pre-wrap pr-1" style={{ direction: "rtl" }}>
                            {generatedIdeaResult}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  )}
              {activeToolTab === "marketing" && (
                <div className="space-y-4 text-right">
                  <div>
                    <label className="block font-cairo font-extrabold text-[11px] text-slate-700 mb-1">ما هو نوع منتجك أو مشروعكِ للترويج له؟</label>
                    <input
                      type="text"
                      value={marketingProduct}
                      onChange={(e) => setMarketingProduct(e.target.value)}
                      placeholder="مثال: عباية كتان سوداء صيفية، بخور عرائسي عدني، معمول هبّة العيد..."
                      className="w-full font-sans text-xs p-3 bg-[#FDFBF7] border border-[#1e293b]/10 focus:border-[#1e293b] outline-none rounded-2xl"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-cairo font-extrabold text-[11px] text-slate-700 mb-1">النبرة التسويقية المفضلة:</label>
                      <select
                        value={marketingTone}
                        onChange={(e) => setMarketingTone(e.target.value)}
                        className="w-full font-cairo font-semibold text-xs p-3 bg-[#FDFBF7] border border-[#1e293b]/10 focus:border-[#1e293b] outline-none rounded-2xl cursor-pointer"
                      >
                        <option>أنيق ولطيف</option>
                        <option>حماسي وقوي جداً</option>
                        <option>مرح وفكاهي شبابي</option>
                        <option>قصصي دافئ يمس القلب</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-cairo font-extrabold text-[11px] text-slate-700 mb-1">عرض خاص أو مزايا تريدي توضيحها؟</label>
                      <input
                        type="text"
                        value={marketingDetails}
                        onChange={(e) => setMarketingDetails(e.target.value)}
                        placeholder="مثال: خصم 15% بمناسبة الافتتاح، شحن مباشر للمكتب..."
                        className="w-full font-sans text-xs p-3 bg-[#FDFBF7] border border-[#1e293b]/10 focus:border-[#1e293b] outline-none rounded-2xl"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleGenerateMarketingAssistant}
                    disabled={isGeneratingMarketing}
                    className="w-full bg-[#1e293b] hover:bg-slate-800 disabled:bg-slate-350 text-[#FDFBF7] font-cairo font-bold text-xs py-3 rounded-2xl text-center transition-all duration-305 flex items-center justify-center gap-1.5"
                  >
                    {isGeneratingMarketing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>جاري صياغة محتوى الإعلان الأنسب...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-[#FDFBF7] fill-white" />
                        <span>صياغة إعلان تسويقي فتاك بالذكاء الاصطناعي</span>
                      </>
                    )}
                  </button>

                  {/* Marketing Result */}
                  {generatedMarketingResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-5 bg-[#FCF9F3] border border-[#1e293b]/5 rounded-[2rem] text-slate-700 font-sans text-xs leading-relaxed relative text-right"
                    >
                      <button
                        onClick={() => handleCopyText(generatedMarketingResult)}
                        className="absolute top-3 left-3 bg-white hover:bg-slate-100 p-2 rounded-xl text-[#1e293b] shadow-sm transition-all"
                        title="نسخ الإعلان"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <div className="whitespace-pre-wrap pr-1" style={{ direction: "rtl" }}>
                        {generatedMarketingResult}
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
              {/* 3. AI Prompt Engineer Assistant Tab */}
              {activeToolTab === "prompt-gen" && (
                <div className="space-y-4 text-right">
                  <div>
                    <label className="block font-cairo font-extrabold text-[11px] text-slate-700 mb-1">صفي احتياج مشروعكِ أو الخدمة التي ترغبين في ترويجها (لصياغة موجه احترافي خارق):</label>
                    <textarea
                      value={promptInput}
                      onChange={(e) => setPromptInput(e.target.value)}
                      placeholder="مثال: أحتاج خطة تسويق إبداعية لمتجر عباياتي الكتان في عدن، أو تصميم إعلان مميز لعطر عرائسي..."
                      rows={3}
                      className="w-full font-sans text-xs p-3 bg-[#FDFBF7] border border-[#1e293b]/10 focus:border-[#1e293b] outline-none rounded-2xl resize-none"
                    />
                  </div>

                  <button
                    onClick={handleGeneratePromptAssistant}
                    disabled={isGeneratingPrompt}
                    className="w-full bg-[#1e293b] hover:bg-slate-800 disabled:bg-slate-350 text-[#FDFBF7] font-cairo font-bold text-xs py-3 rounded-2xl text-center transition-all duration-305 flex items-center justify-center gap-1.5"
                  >
                    {isGeneratingPrompt ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>جاري صياغة وهندسة الأمر الاحترافي الأقوى...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-[#FDFBF7] fill-white animate-pulse" />
                        <span>توليد الموجه الاحترافي لـ Gemini</span>
                      </>
                    )}
                  </button>

                  {/* Prompt Result */}
                  {generatedPromptResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-5 bg-[#FCF9F3] border border-[#1e293b]/5 rounded-[2rem] text-slate-700 font-sans text-xs leading-relaxed relative text-right"
                    >
                      <button
                        onClick={() => handleCopyText(generatedPromptResult)}
                        className="absolute top-3 left-3 bg-white hover:bg-slate-100 p-2 rounded-xl text-[#1e293b] shadow-sm transition-all"
                        title="نسخ الموجه"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <div className="whitespace-pre-wrap pr-1" style={{ direction: "rtl" }}>
                        {generatedPromptResult}
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              {/* 3. Commercial Calculator Tab */}
              {activeToolTab === "calculator" && (
                <div className="space-y-4 text-right">
                  {/* Calcs Inner Toggle */}
                  <div className="flex bg-slate-150/40 p-1 rounded-xl gap-1">
                    <button
                      type="button"
                      onClick={() => setActiveCalcTab("pricing")}
                      className={`flex-1 font-cairo font-extrabold text-[11px] py-1.5 rounded-lg transition-all ${
                        activeCalcTab === "pricing" ? "bg-white text-[#1e293b] shadow-sm" : "text-slate-500"
                      }`}
                    >
                      حاسبة تسعير المنتجات 💸
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveCalcTab("profit")}
                      className={`flex-1 font-cairo font-extrabold text-[11px] py-1.5 rounded-lg transition-all ${
                        activeCalcTab === "profit" ? "bg-white text-[#1e293b] shadow-sm" : "text-slate-500"
                      }`}
                    >
                      حاسبة الأرباح والمبيعات 📈
                    </button>
                  </div>

                  {/* Interactive Inputs for Pricing Calculator */}
                  {activeCalcTab === "pricing" ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block font-cairo font-extrabold text-[11px] text-slate-700 mb-1">تكلفة المواد للقطعة (ريال):</label>
                          <input
                            type="number"
                            value={calcCost}
                            onChange={(e) => setCalcCost(e.target.value)}
                            placeholder="مثال: 12000"
                            className="w-full font-sans text-xs p-2.5 bg-[#FDFBF7] border border-[#1e293b]/10 focus:border-[#1e293b] outline-none rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="block font-cairo font-extrabold text-[11px] text-slate-700 mb-1">الوقت المصروف للإنتاج (ساعة):</label>
                          <input
                            type="number"
                            value={calcHours}
                            onChange={(e) => setCalcHours(e.target.value)}
                            placeholder="مثال: 4"
                            className="w-full font-sans text-xs p-2.5 bg-[#FDFBF7] border border-[#1e293b]/10 focus:border-[#1e293b] outline-none rounded-xl"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block font-cairo font-extrabold text-[11px] text-slate-700 mb-1">أجر الساعة العادل لجهدكِ (ريال):</label>
                          <input
                            type="number"
                            value={calcHourlyRate}
                            onChange={(e) => setCalcHourlyRate(e.target.value)}
                            placeholder="مثال: 2000"
                            className="w-full font-sans text-xs p-2.5 bg-[#FDFBF7] border border-[#1e293b]/10 focus:border-[#1e293b] outline-none rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="block font-cairo font-extrabold text-[11px] text-slate-700 mb-1">سعر السوق الشبيه لمنتجكِ (ريال):</label>
                          <input
                            type="number"
                            value={calcMarketAverage}
                            onChange={(e) => setCalcMarketAverage(e.target.value)}
                            placeholder="مثال: 25000"
                            className="w-full font-sans text-xs p-2.5 bg-[#FDFBF7] border border-[#1e293b]/10 focus:border-[#1e293b] outline-none rounded-xl"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block font-cairo font-extrabold text-[11px] text-slate-700 mb-1">هامش الربح المطلوب (%):</label>
                          <input
                            type="number"
                            value={calcMarginPercent}
                            onChange={(e) => setCalcMarginPercent(e.target.value)}
                            placeholder="مثال: 30"
                            className="w-full font-sans text-xs p-2.5 bg-[#FDFBF7] border border-[#1e293b]/10 focus:border-[#1e293b] outline-none rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="block font-cairo font-extrabold text-[11px] text-slate-700 mb-1">تعديل ملاءمة سعر السوق [اختياري] (ريال):</label>
                          <input
                            type="number"
                            value={calcMarketAdjustment}
                            onChange={(e) => setCalcMarketAdjustment(e.target.value)}
                            placeholder="مثال: 2000"
                            className="w-full font-sans text-xs p-2.5 bg-[#FDFBF7] border border-[#1e293b]/10 focus:border-[#1e293b] outline-none rounded-xl"
                          />
                        </div>
                      </div>

                      <button
                        onClick={handleCalculatePricing}
                        className="w-full bg-[#1e293b] hover:bg-slate-800 text-white font-cairo font-bold text-xs py-2.5 rounded-xl transition-all"
                      >
                        احسب سعر البيع المقترح لمنتجكِ
                      </button>

                      {calcSuggestedPrice !== null && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl mt-2 text-center text-emerald-800"
                        >
                          <span className="block font-cairo text-[11px] font-bold text-emerald-700">السعر المقترح للمبيعات:</span>
                          <span className="font-cairo font-black text-md block my-0.5">{calcSuggestedPrice.toLocaleString("ar-YE")} ريال يمني</span>
                          <span className="font-sans text-[10px] text-emerald-900 block leading-relaxed mt-1 font-semibold">
                            يشمل هذا السعر: تكاليف الإنتاج + أجر الجهد + هامش ربح للتوسع لضمان استدامة ونمو هذا العمل.
                          </span>
                        </motion.div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block font-cairo font-extrabold text-[11px] text-slate-700 mb-1">تكلفة الشراء/المواد للقطعة:</label>
                          <input
                            type="number"
                            value={profitCost}
                            onChange={(e) => setProfitCost(e.target.value)}
                            placeholder="تكلفتك"
                            className="w-full font-sans text-xs p-2.5 bg-[#FDFBF7] border border-[#1e293b]/10 focus:border-[#1e293b] outline-none rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="block font-cairo font-extrabold text-[11px] text-slate-700 mb-1">سعر بيع التجزئة المقترح:</label>
                          <input
                            type="number"
                            value={profitPrice}
                            onChange={(e) => setProfitPrice(e.target.value)}
                            placeholder="سعر البيع"
                            className="w-full font-sans text-xs p-2.5 bg-[#FDFBF7] border border-[#1e293b]/10 focus:border-[#1e293b] outline-none rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="block font-cairo font-extrabold text-[11px] text-slate-700 mb-1">الكمية المتوقع بيعها:</label>
                          <input
                            type="number"
                            value={profitQty}
                            onChange={(e) => setProfitQty(e.target.value)}
                            placeholder="كميتك"
                            className="w-full font-sans text-xs p-2.5 bg-[#FDFBF7] border border-[#1e293b]/10 focus:border-[#1e293b] outline-none rounded-xl"
                          />
                        </div>
                      </div>

                      <button
                        onClick={handleCalculateProfit}
                        className="w-full bg-[#1e293b] hover:bg-slate-800 text-white font-cairo font-bold text-xs py-2.5 rounded-xl transition-all"
                      >
                        احسب إجمالي الأرباح المتوقعة
                      </button>

                      {profitResult !== null && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className={`p-4 rounded-2xl mt-2 text-center border ${
                            profitResult >= 0 
                              ? "bg-emerald-50 border-emerald-100 text-emerald-800" 
                              : "bg-rose-50 border-rose-100 text-rose-800"
                          }`}
                        >
                          <span className="block font-cairo text-[11px] font-bold">صافي الأرباح الإجمالي المتوقع:</span>
                          <span className="font-cairo font-black text-md block my-0.5">{profitResult.toLocaleString("ar-YE")} ريال يمني</span>
                          <span className="font-sans text-[10px] text-slate-500 block leading-normal mt-1">
                            {profitResult >= 0 
                              ? "أداء ربحي مستقر وملهم يدعم انطلاقتكِ في السوق اليمني!" 
                              : "تنبيه: سعر البيع يقل عن التكلفة الإجمالية، يرجى مراجعة الأسعار لتبقي بالمنطقة الإيجابية."}
                          </span>
                        </motion.div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 4. Profit Simulator Block */}
              {activeToolTab === "profit-sim" && (
                <div className="space-y-4">
                  <div className="space-y-4 text-right">
                    <div className="bg-white border border-dashed border-[#1e293b]/15 p-5 rounded-3xl">

                      <h3 className="font-cairo font-extrabold text-xs text-slate-400 mb-2 flex items-center gap-1.5 justify-end">
                        <span>محاكاة الأرباح لمنتجات المتاجر الحية</span>
                        <Sparkles className="w-4 h-4 text-amber-500 fill-amber-300 animate-pulse" />
                      </h3>
                      <p className="font-sans text-[11px] text-slate-500 mb-4 leading-normal text-right">
                        أداة تشاركية تتيح لكِ استهداف أي مشروع ومحاكاة مبيعات وسعر القطعة مع التكاليف لمراقبة هوامش الأرباح الحقيقية!
                      </p>

                      <div className="space-y-3">
                        {/* Boutique Selector */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block font-cairo font-bold text-[11px] text-slate-600 mb-1 text-right">اختر مشروع المقارنة:</label>
                            <select
                              value={simSelectedShopId}
                              onChange={(e) => setSimSelectedShopId(e.target.value)}
                              className="w-full font-sans text-xs p-2.5 bg-[#FDFBF7] border border-[#1e293b]/10 focus:border-[#1e293b] outline-none rounded-xl cursor-pointer"
                            >
                              {shops.map(s => (
                                <option key={s.id} value={s.id}>{s.name} ({s.location})</option>
                              ))}
                            </select>
                          </div>

                          {/* Product Selector */}
                          <div>
                            <label className="block font-cairo font-bold text-[11px] text-slate-600 mb-1 text-right">اختر المنتج المتوفر:</label>
                            <select
                              value={simSelectedProductId}
                              onChange={(e) => setSimSelectedProductId(e.target.value)}
                              className="w-full font-sans text-xs p-2.5 bg-[#FDFBF7] border border-[#1e293b]/10 focus:border-[#1e293b] outline-none rounded-xl cursor-pointer"
                            >
                              {currentProductsForSim.map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({p.price.toLocaleString("ar-YE")} ريال)</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Inputs */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block font-cairo font-bold text-[11px] text-slate-600 mb-1 text-right">تكلفة الإنتاج للقطعة (ريال):</label>
                            <input
                              type="number"
                              value={simCost}
                              onChange={(e) => setSimCost(e.target.value)}
                              placeholder="تكلفة المواد واللوجستيات"
                              className="w-full font-sans text-xs p-2.5 bg-[#FDFBF7] border border-[#1e293b]/10 focus:border-[#1e293b] outline-none rounded-xl"
                            />
                          </div>
                          <div>
                            <label className="block font-cairo font-bold text-[11px] text-slate-600 mb-1 text-right">سعر بيع التجزئة المقترح (ريال):</label>
                            <input
                              type="number"
                              value={simPrice}
                              onChange={(e) => setSimPrice(e.target.value)}
                              placeholder="سعر البيع للتجزئة"
                              className="w-full font-sans text-xs p-2.5 bg-[#FDFBF7] border border-[#1e293b]/10 focus:border-[#1e293b] outline-none rounded-xl"
                            />
                          </div>
                          <div>
                            <label className="block font-cairo font-bold text-[11px] text-slate-600 mb-1 text-right">الكمية المستهدفة لتجربة السوق:</label>
                            <input
                              type="number"
                              value={simQuantity}
                              onChange={(e) => setSimQuantity(e.target.value)}
                              placeholder="مثال: 10"
                              className="w-full font-sans text-xs p-2.5 bg-[#FDFBF7] border border-[#1e293b]/10 focus:border-[#1e293b] outline-none rounded-xl"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Calculated KPI cards */}
                    {(() => {
                      const parsedPrice = parseFloat(simPrice as string) || 0;
                      const parsedCost = parseFloat(simCost as string) || 0;
                      const parsedQty = parseFloat(simQuantity as string) || 0;

                      const totalRevenue = parsedPrice * parsedQty;
                      const totalCost = parsedCost * parsedQty;
                      const totalProfit = totalRevenue - totalCost;
                      const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

                      return (
                        <div className="space-y-4">
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                              <span className="block font-cairo text-[10px] text-slate-500 font-bold text-center">إجمالي الإيرادات</span>
                              <span className="font-cairo font-black text-xs text-slate-800 block mt-0.5">{totalRevenue.toLocaleString("ar-YE")} ريال</span>
                            </div>
                            <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                              <span className="block font-cairo text-[10px] text-slate-500 font-bold text-center">إجمالي التكلفة</span>
                              <span className="font-cairo font-black text-xs text-slate-800 block mt-0.5">{totalCost.toLocaleString("ar-YE")} ريال</span>
                            </div>
                            <div className={`p-3 rounded-2xl border ${totalProfit >= 0 ? "bg-emerald-50/60 border-emerald-100 text-emerald-700" : "bg-rose-50 border-rose-100 text-rose-700"}`}>
                              <span className="block font-cairo text-[10px] text-slate-500 font-bold text-center">صافي الأرباح</span>
                              <span className="font-cairo font-black text-xs block mt-0.5">{totalProfit.toLocaleString("ar-YE")} ريال</span>
                            </div>
                          </div>

                          <div className="bg-[#FCF9F3] border border-[#1e293b]/5 p-4 rounded-3xl">
                            <h4 className="font-cairo font-extrabold text-[#1e293b] text-xs mb-1 flex items-center gap-1.5 justify-end">
                              <span>تحليل هامش ربح المشروع:</span>
                              <span className="font-sans font-black">{profitMargin.toFixed(1)}%</span>
                            </h4>
                            <p className="font-sans text-[11px] text-slate-600 leading-normal pr-1 text-right mt-1.5">
                              {profitMargin >= 50 ? (
                                "هامش ربح استثنائي يتعدى الـ 50%. يتيح لكِ ذلك ضخ جزء من الأرباح للتسويق الممول والبحث عن خدمات غلاف وتغليف فاخرة تزيد ولاء الزبائن للعلامة التجارية."
                              ) : profitMargin >= 30 ? (
                                "هامش ربح مستقر وصحي للمشاريع اليمنية الناشئة (بين 30% إلى 50%). هذه النسبة ممتازة وتضمن تغطية تكاليف التوصيل والدفع عند الاستلام ونسبة الارتجاع الهامشية."
                              ) : profitMargin > 0 ? (
                                "هامش الربح مقبول ولكنه قليل نسبياً. حاولي شراء المواد الخام بسعر الجملة لتقليل تكلفة إنتاج القطعة، أو تقديم عبوة تصميمية جذابة تبرر رفع سعر البيع قليلاً."
                              ) : (
                                "تنبيه: الأسعار الحالية تضع مشروعكِ تحت الخسارة الدائمة! تكلفة إنتاج القطعة تفوق سعر البيع للتجزئة. يجب تعديل الأسعار فوراً لضمان استمرار مَسير المشروع بسلامة."
                              )}
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

            </>
          )}
        </div>

            {/* Platform watermark */}
            <div className="absolute bottom-6 text-center select-none pointer-events-none">
              <span className="font-sans text-[11px] text-slate-400 tracking-wider">مسار اليمن • طبعة الشباب العصري ٢٠٢٦</span>
            </div>
          </motion.div>
        ) : (
          /* PAGE 2: MAIN BOUTIQUE DISCOVERY DASHBOARD */
          <motion.div
            key="discovery-screen"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-grow flex flex-col relative z-10 text-[#1e293b]"
          >
            {/* Header section with brand and date */}
            <header className="border-b border-[#1e293b]/5 bg-[#FDFBF7]/80 backdrop-blur-md sticky top-0 z-40 select-none">
              <div className="w-full max-w-6xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
                
                {/* Brand Logo and descriptor */}
                <div className="flex items-center gap-3">
                  <div className="bg-white rounded-xl flex items-center justify-center shadow-md w-14 h-14 overflow-hidden border border-slate-100 shrink-0">
                    <img src="https://i.ibb.co/m53gL8t9/masra-logo.png" alt="Brand Logo" className="w-full h-full object-cover scale-[1.3] object-center" referrerPolicy="no-referrer" />
                  </div>
                  <div>
                    <h1 className="font-cairo font-black text-2xl tracking-normal text-[#1e293b] leading-none mb-0.5">
                      مَسَار
                    </h1>
                    <span className="font-sans text-[11px] text-slate-400 font-semibold">دليل المتاجر والمشاريع الأكثر عصرية في اليمن</span>
                  </div>
                </div>

                {/* Date indicator and customizable greeting */}
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="font-sans text-[10px] text-slate-400 font-semibold">{getArabicDate()}</span>
                    <span className="font-cairo text-xs text-slate-600 font-medium">أهلاً بكِ في مَسَار</span>
                  </div>
                  
                  {/* Reset App entry (simple hidden door to explore page 1 again) */}
                  <button
                    onClick={() => {
                      localStorage.setItem("masar_entered", "false");
                      setHasEntered(false);
                      showToast("تمت العودة لشاشة الترحيب بنجاح");
                    }}
                    className="p-2.5 rounded-xl border border-slate-200/80 hover:bg-slate-50 transition-colors text-slate-400 hover:text-[#1e293b]"
                    title="الرجوع للترحيب ومسح الحالة"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

              </div>
            </header>

            {/* Main Interactive Workspace Area */}
            <main className="flex-grow w-full max-w-6xl mx-auto px-4 sm:px-6 py-5 pb-16">
              
              {/* Cute Personalized Greeting Alert */}
              <div className="mb-6 p-4 sm:p-5 bg-white border border-[#1e293b]/5 rounded-[2.5rem] flex items-center justify-between relative overflow-hidden shadow-sm">
                <div className="relative z-10 flex items-center gap-3">
                  <div className="p-2.5 bg-rose-50 text-rose-500 rounded-2xl">
                    <Smile className="w-5.5 h-5.5 stroke-[2]" />
                  </div>
                  <div>
                    <h2 className="font-cairo font-extrabold text-[#1e293b] text-sm md:text-md">
                      {"أهلاً بكِ في مَسَار، يسعدنا تصفّحكِ لليوم."}
                    </h2>
                    <p className="font-sans text-[11px] text-slate-500 leading-normal mt-0.5">
                      {selectedMood === "happy" && "رائع! تم تحديد التشكيلات الأنسب للملابس والعبايات العصرية."}
                      {selectedMood === "cozy" && "تفاصيل المنتجات الفنية والبخور الفاخر بانتظار استكشافكِ."}
                      {selectedMood === "gift" && "بدائل الهدايا والمصنوعات المتميزة متوفرة حالياً."}
                      {!selectedMood && "اكتشفي تشكيلة رائعة من المتاجر والمشاريع اليمنية الناشئة والراقية."}
                    </p>
                  </div>
                </div>

                {/* Absolute small stickers nearby */}
                <DecoSticker type="sparkle" size={24} className="absolute left-[3%] top-[10%] opacity-30 rotate-12" />
                <DecoSticker type="heart" size={16} className="absolute left-[8%] bottom-[12%] opacity-20" />
              </div>

              {/* SEARCH & FILTERS BAR */}
              <section id="discovery-filters" className="mb-6 space-y-3.5">
                
                {/* Search Bar & Location dropdown */}
                <div className="flex flex-col sm:flex-row gap-3">
                  
                  {/* Text search */}
                  <div className="relative flex-grow">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                    <input
                      id="shop-search-input"
                      type="text"
                      placeholder="ابحثي عن اسم متجر، عباية، بخور، إكسسوار..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full font-sans text-sm pr-12 pl-4 py-3.5 bg-white border border-[#1e293b]/10 focus:border-[#1e293b] focus:ring-1 focus:ring-[#1e293b] outline-none rounded-2xl transition-all shadow-sm"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm("")}
                        className="absolute left-3 top-1/2 -translate-y-1/2 font-cairo text-xs text-slate-400 hover:text-slate-600 bg-slate-100 px-2 py-1 rounded"
                      >
                        مسح
                      </button>
                    )}
                  </div>

                  {/* Location quick filter */}
                  <div className="relative min-w-[160px]">
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none text-slate-400">
                      <MapPin className="w-4 h-4 text-[#1e293b]" />
                    </div>
                    <select
                      id="shop-location-select"
                      value={selectedLocation}
                      onChange={(e) => {
                        setSelectedLocation(e.target.value);
                        showToast(`مصفى حسب المحافظة: ${e.target.value}`);
                      }}
                      className="w-full font-cairo font-bold text-xs pr-10 pl-3 py-3.5 bg-white border border-[#1e293b]/10 focus:border-[#1e293b] focus:ring-1 focus:ring-[#1e293b] outline-none rounded-2xl transition-all shadow-sm appearance-none cursor-pointer"
                    >
                      {dynamicLocations.map((loc) => (
                        <option key={loc} value={loc}>
                          📍 {loc === "الكل" ? "جميع المحافظات والمدن" : loc}
                        </option>
                      ))}
                    </select>
                  </div>

                </div>

                {/* Category selectors chips-scroll & Favorites toggle */}
                <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                  
                  {/* Category scrolling container */}
                  <div className="w-full overflow-x-auto no-scrollbar py-1">
                    <div className="flex gap-2 max-w-max select-none">
                      {dynamicCategories.map((cat) => {
                        const isSelected = selectedCategory === cat;
                        return (
                          <button
                            key={cat}
                            onClick={() => {
                              setSelectedCategory(cat);
                              showToast(`تصفح فئة: ${cat}`);
                            }}
                            className={`font-cairo font-semibold text-xs px-4 py-2.5 rounded-full transition-all duration-300 shrink-0 border whitespace-nowrap active:scale-95 ${
                              isSelected
                                ? "bg-[#1e293b] border-[#1e293b] text-white shadow-sm"
                                : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                            }`}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Favorites Toggle switch option */}
                  <button
                    id="toggle-fav-filter"
                    onClick={() => {
                      setShowOnlyFavorites(!showOnlyFavorites);
                      showToast(showOnlyFavorites ? "عرض جميع المتاجر" : "عرض المفضلة الخاصة بكِ فقط");
                    }}
                    className={`flex items-center gap-2 font-cairo font-bold text-xs px-4 py-2.5 rounded-full border transition-all duration-300 shrink-0 self-end lg:self-auto ${
                      showOnlyFavorites
                        ? "bg-rose-50 border-rose-200 text-rose-600 shadow-sm"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Heart className={`w-4.5 h-4.5 ${showOnlyFavorites ? "fill-rose-500 text-rose-500 scale-105" : "text-slate-400"}`} />
                    <span>مفضلتي ({favorites.length})</span>
                  </button>

                </div>

              </section>

              {/* CARD DECORATION TITLE HEADER */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-cairo font-black text-lg text-[#1e293b] flex items-center gap-1.5 select-none">
                     المشاريع والمتاجر والمبتكرين الأكثر رواجاً
                    <DecoSticker type="sparkle" size={16} className="inline-block inline-flex align-middle" />
                  </h3>
                  <span className="font-sans text-xs font-semibold text-slate-400">({filteredShops.length} متجر متوفر)</span>
                </div>

                {/* Clear options if filtered */}
                {(searchTerm || selectedCategory !== "الكل" || selectedLocation !== "الكل" || showOnlyFavorites) && (
                  <button
                    onClick={resetFilters}
                    className="flex items-center gap-1.5 font-cairo font-semibold text-xs text-rose-500 hover:text-rose-600 transition-colors bg-rose-50 px-3.5 py-1.5 rounded-full"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>إعادة تهيئة التصفية</span>
                  </button>
                )}
              </div>

              {/* BOUTIQUE GRID */}
              {filteredShops.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredShops.map((shop) => (
                    <motion.div
                      key={shop.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.35 }}
                    >
                      <ShopCard
                        shop={shop}
                        isFavorite={favorites.includes(shop.id)}
                        onToggleFavorite={handleToggleFavorite}
                        onOpenDetails={(s) => setSelectedShop(s)}
                      />
                    </motion.div>
                  ))}
                </div>
              ) : (
                /* EMPTY STATE DESIGN */
                <div className="py-20 text-center w-full max-w-md mx-auto bg-white/40 border border-[#F2EDE2] rounded-[2.5rem] p-8 select-none">
                  <div className="text-4xl mb-4">🍃</div>
                  <h4 className="font-cairo font-black text-xl text-[#1e293b] mb-2">يا خسارة.. لم نجد نتائج!</h4>
                  <p className="font-sans text-xs text-slate-500 leading-relaxed mb-6">
                    المشروع الذي تبحثين عنه قد لا ينتمي لهذه الفئة أو المنطقة المحددة، أو لم يتم إدراجه في تفضيلاتكِ بعد. جربي تصفية أخرى!
                  </p>
                  <button
                    onClick={resetFilters}
                    className="flex items-center justify-center gap-1.5 font-cairo font-bold text-xs text-white bg-[#1e293b] hover:bg-slate-800 transition-all px-6 py-3 rounded-2xl mx-auto shadow-sm"
                  >
                    <span>استكشفي جميع المشاريع والمتاجر</span>
                  </button>
                </div>
              )}

            </main>

            {/* FLOATING ACTION CART NOTIFIER BUTTON */}
            <AnimatePresence>
              {totalCartQty > 0 && (
                <motion.button
                  id="floating-cart-anchor"
                  initial={{ scale: 0.8, opacity: 0, y: 50 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.8, opacity: 0, y: 50 }}
                  onClick={() => setIsCartOpen(true)}
                  className="fixed bottom-6 left-6 z-40 bg-[#1e293b] hover:bg-slate-800 text-[#FDFBF7] p-4 rounded-3xl shadow-[0_16px_40px_rgba(30,41,59,0.25)] flex items-center gap-3 active:scale-95 transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="relative">
                    <ShoppingBag className="w-5.5 h-5.5" />
                    <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white font-sans text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                      {totalCartQty}
                    </span>
                  </div>
                  <span className="font-cairo font-extrabold text-xs tracking-wide">حقيبة طلباتي مَسَار</span>
                </motion.button>
              )}
            </AnimatePresence>

            {/* Sticky/Fixed Aesthetic elements */}
            <div className="absolute top-[40%] right-2 opacity-10 pointer-events-none">
              <DecoSticker type="flower" size={48} />
            </div>

            {/* Footer with credit */}
            <footer className="border-t border-[#1e293b]/5 py-10 mt-20 text-center bg-[#FDFBF7] z-10 select-none">
              <div className="max-w-4xl mx-auto px-4 text-center">
                <div className="font-cairo font-black text-lg text-[#1e293b] tracking-wide mb-1 flex items-center justify-center gap-1">
                  <span>مَسَار</span>
                  <DecoSticker type="heart" size={14} className="inline-block pb-0.5" />
                </div>
                <p className="font-sans text-[11px] text-slate-400 font-semibold mb-2">دليل اليمن الأنيق والمبسط للمتاجر والمشاريع والخدمات والمنتجات الذاتية</p>
                <p className="font-sans text-[11px] text-slate-500 mb-3 bg-slate-100/50 py-1.5 px-4 rounded-full inline-block">
                  crafted by <span className="font-semibold text-[#1e293b]">togethry design studio</span> , من قبل <span className="font-semibold text-[#1e293b]">أسيل أحمد المشدلي</span>
                </p>
                <div className="flex justify-center gap-1.5 text-[10px] font-sans text-slate-400">
                  <span>صُنع بحب لأجل اليمن السعيد والشباب المبدع</span>
                  <span>•</span>
                  <span>حقوق النشر مَسَار ٢٠٢٦ ©</span>
                </div>
              </div>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SHOP DETAILS POPUP MODAL */}
      <AnimatePresence>
        {selectedShop && (
          <ShopDetailsModal
            shop={selectedShop}
            onClose={() => setSelectedShop(null)}
            onAddToCart={handleAddToCart}
            reviews={[...(selectedShop.reviews || []), ...(userReviews[selectedShop.id] || [])]}
            onAddReview={(newReview) => handleAddReview(selectedShop.id, newReview)}
          />
        )}
      </AnimatePresence>

      {/* SHOPPING CART OVERLAY / SIDEBAR PANEL */}
      <AnimatePresence>
        {isCartOpen && (
          <div
            id="cart-overlay-container"
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex justify-end"
            onClick={() => setIsCartOpen(false)}
          >
            <motion.div
              id="cart-drawer-panel"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 180 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-[#FDFBF7] h-full shadow-2xl p-6 flex flex-col text-[#1e293b] border-r border-[#1e293b]/5 overflow-hidden"
            >
              {/* Cart Drawer Header */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200/80 shrink-0">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5.5 h-5.5" />
                  <h3 className="font-cairo font-black text-lg text-[#1e293b]">حقيبة طلباتكِ</h3>
                  <span className="font-sans text-xs bg-[#EFEBE4] text-[#1e293b] px-2 py-0.5 rounded-full font-bold">
                    {totalCartQty} قطع
                  </span>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-1.5 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable list items container */}
              <div className="flex-grow overflow-y-auto pr-1 pb-4 scrollbar-thin flex flex-col min-h-0">
                {cart.length > 0 ? (
                  <div className="space-y-6">
                    {cartShops.map((shopId) => {
                      const shopItems = cart.filter((item) => item.shopId === shopId);
                      const shopName = shopItems[0]?.shopName;
                      const shopSubtotal = shopItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

                      return (
                        <div
                          key={shopId}
                          className="bg-white border border-[#1e293b]/5 p-4 rounded-3xl space-y-4 shadow-sm relative group/cartshop"
                        >
                          {/* Boutique header inside cart item */}
                          <div className="flex items-center justify-between pb-2 border-b border-dashed border-slate-100">
                            <span className="font-cairo font-extrabold text-xs text-slate-400 bg-[#FCF9F3] px-3 py-1 rounded-full">
                              مشروع: {shopName}
                            </span>
                            <span className="font-cairo font-extrabold text-xs text-slate-700">
                              المجموع: {shopSubtotal.toLocaleString("ar-YE")} ريال يمني
                            </span>
                          </div>

                          {/* Items for this specific boutique */}
                          <div className="space-y-3">
                            {shopItems.map((item) => (
                              <div
                                key={item.id}
                                className="flex gap-3 items-start relative hover:bg-slate-50/50 p-1.5 rounded-2xl transition-all"
                              >
                                <div className="w-12 h-12 bg-slate-100 rounded-xl overflow-hidden shrink-0">
                                  <img
                                    src={item.product.image}
                                    alt={item.product.name}
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="flex-grow">
                                  <h4 className="font-cairo font-bold text-xs text-[#1e293b] leading-tight mb-0.5">
                                    {item.product.name}
                                  </h4>
                                  <div className="flex flex-wrap gap-1 mb-1">
                                    <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded-md font-sans font-bold">
                                      المقاس: {item.size}
                                    </span>
                                    {item.notes && (
                                      <span className="text-[10px] bg-slate-100 text-rose-500/80 px-1.5 py-0.5 rounded-md font-sans line-clamp-1">
                                        ملاحظة: {item.notes}
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-sans text-[11px] text-slate-500 block font-bold">
                                    {(item.product.price * item.quantity).toLocaleString("ar-YE")} ريال
                                  </span>
                                </div>

                                {/* Actions quantity & remove buttons for order */}
                                <div className="flex items-center gap-1.5 bg-slate-100 rounded-xl p-1 shrink-0 self-center">
                                  <button
                                    onClick={() => handleUpdateCartQty(item.id, false)}
                                    className="p-1 rounded-lg hover:bg-white text-slate-600 transition-colors"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <span className="font-sans text-xs font-bold px-1.5">{item.quantity}</span>
                                  <button
                                    onClick={() => handleUpdateCartQty(item.id, true)}
                                    className="p-1 rounded-lg hover:bg-white text-slate-600 transition-colors"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>

                                {/* Trash bin item remover */}
                                <button
                                  onClick={() => handleRemoveCartItem(item.id)}
                                  className="text-rose-400 hover:text-rose-500 p-1 rounded-lg transition-all self-center"
                                  title="حذف المنتج"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>

                          {/* Order checkout for boutique button */}
                          <div className="pt-2 border-t border-slate-100 flex gap-2">
                            <button
                              onClick={() => sendWhatsAppOrder(shopId, shopItems)}
                              className="w-full flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-cairo font-bold text-xs py-2.5 rounded-2xl transition-colors shadow-sm active:scale-[0.98]"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>إرسال لـ {shopName} واتساب</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-24 select-none">
                    <span className="text-4xl block mb-2">🛒</span>
                    <h4 className="font-cairo font-bold text-md text-[#1e293b] mb-1">حمامة سلتكِ فارغة!</h4>
                    <p className="font-sans text-xs text-slate-400 px-12 leading-relaxed">
                      تصفحي خدماتنا ومنتجاتنا المميزة ثم اضغطي "أضف للسلة" لتجهيز طلبيتكِ الأنيقة.
                    </p>
                  </div>
                )}
              </div>

              {/* Total Summary Footer of Drawer */}
              {cart.length > 0 && (
                <div className="border-t border-slate-200/80 pt-4 mt-auto shrink-0 bg-[#FDFBF7]">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-cairo font-extrabold text-sm text-slate-500">القيمة الإجمالية لجميع الطلبات والمشاريع:</span>
                    <span className="font-cairo font-black text-lg text-slate-900">
                      {cart
                        .reduce((sum, item) => sum + item.product.price * item.quantity, 0)
                        .toLocaleString("ar-YE")}{" "}
                      ريال يمني
                    </span>
                  </div>

                  <p className="text-[10px] font-sans text-slate-500 text-center mb-4 bg-amber-50 py-2 px-3 rounded-xl border border-amber-100">
                    ملاحظة: بما أن هذه المشاريع متميزة ومستقلة، سيتم إرسال كل طلبية في السلة للمشروع المخصص لها على حدة لتسهيل التواصل المباشر مع صاحب/صاحبة المشروع.
                  </p>

                  <button
                    onClick={() => {
                      setIsCartOpen(false);
                      showToast("واصلي تصفح المشاريع الرائعة لمزيد من التفاصيل");
                    }}
                    className="w-full bg-[#1e293b] hover:bg-slate-800 text-white font-cairo font-bold text-xs py-3.5 rounded-2xl text-center transition-colors"
                  >
                    متابعة التسوق ومزيد من الانتقاءات
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* UPGRADED ORDER FORM MODAL */}
      <AnimatePresence>
        {isOrderFormOpen && orderShopId && (
          <div
            id="order-form-modal-overlay"
            className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-slate-900/40 backdrop-blur-md overflow-y-auto"
            onClick={() => setIsOrderFormOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#FDFBF7] border border-[#1e293b]/5 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between bg-white select-none shrink-0 border-solid">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                    <ShoppingBag className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="font-cairo font-black text-sm text-[#1e293b] leading-tight">تأكيد تفاصيل الطلب</h3>
                    <p className="font-sans text-[11px] text-slate-400 font-bold">يرجى ملء البيانات لتأكيد المشتريات وإرسالها</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOrderFormOpen(false)}
                  className="p-2 hover:bg-slate-50 transition-colors rounded-full text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content Scrollable */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!orderName.trim() || !orderPhone.trim()) {
                    showToast("الرجاء تعبئة البيانات المطلوبة");
                    return;
                  }
                  const isOrderDigital = orderShopItems.every(item => isProductDigital(item.product, shops.find(s => s.id === orderShopId)));
                  if (!isOrderDigital && !orderAddress.trim()) {
                    showToast("الرجاء إدخال عنوان التوصيل الفعلي");
                    return;
                  }

                  const orderShop = shops.find(s => s.id === orderShopId);
                  const isDigital = orderShopItems.every(item => isProductDigital(item.product, orderShop));
                  const deliveryAddress = isDigital ? "منتج رقمي" : orderAddress;
                  const extraNotes = orderNotes.trim() ? orderNotes : "لا يوجد";
                  
                  const productStr = orderShopItems.map(item => {
                    const sizeStr = item.size ? ` (المقاس: ${item.size})` : "";
                    const notesStr = item.notes ? ` [ملاحظة: ${item.notes}]` : "";
                    return `${item.product.name}${sizeStr}${notesStr}`;
                  }).join(" ، ");

                  // 1. Direct WhatsApp dispatch only (Saving to database bypassed for maximum privacy as requested)
                  console.log("Order bypasses database storage for privacy.");

                  // 2. Open WhatsApp on client
                  const whatsappMessage = `أهلاً! حابة أطلب منك عن طريق منصة مسار.

تفاصيل طلبي:
- المنتج: ${productStr}
- العدد: ${orderQuantity}
- اسمي: ${orderName}
- رقم جوالي: ${orderPhone}
- عنواني للتوصيل: ${deliveryAddress}
- ملاحظات إضافية: ${extraNotes}

بانتظار تأكيدك للطلب، وشكراً لك!`;
                  
                  localStorage.setItem("masar_order_name", orderName);
                  localStorage.setItem("masar_order_phone", orderPhone);

                  const encodedMessage = encodeURIComponent(whatsappMessage);
                  const whatsappUrl = `https://wa.me/${orderShop?.whatsappPhone}?text=${encodedMessage}`;
                  
                  // Clear cart items for this shop
                  setCart(prev => prev.filter(item => item.shopId !== orderShopId));
                  setIsOrderFormOpen(false);
                  setIsCartOpen(false);

                  window.open(whatsappUrl, "_blank");
                  showToast(`جاري توجيهكِ لـ ${orderShop?.name} عبر الواتساب... 🚀`);
                }}
                className="flex-grow flex flex-col overflow-hidden"
              >
                <div className="p-6 overflow-y-auto space-y-6 flex-grow">
                  
                  {/* Selected Shop Info */}
                  <div className="bg-[#FCF9F3] p-4 rounded-3xl border border-[#1e293b]/5">
                    <span className="block font-cairo font-black text-[10px] text-slate-400 mb-1.5">المتجر الذي تطلبين منه</span>
                    <p className="font-cairo font-black text-xs text-[#1e293b]">
                      {shops.find(s => s.id === orderShopId)?.name || "المتجر"}
                    </p>
                    <div className="mt-2.5 text-xs font-sans text-[#1e293b]/80 space-y-2">
                      {orderShopItems.map((item, index) => (
                        <div key={index} className="flex justify-between items-center bg-white px-3 py-2 rounded-xl border border-[#1e293b]/5">
                          <span>{item.product.name} {item.size ? `(${item.size})` : ""}</span>
                          <span className="font-bold">عدد: {item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Warning message general */}
                  <div className="bg-amber-50 border border-amber-200/80 p-3.5 rounded-2xl flex gap-2.5 items-start select-none">
                    <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <span className="font-sans text-[11px] text-amber-800 leading-normal font-bold">
                      يرجى تعبئة البيانات بتفصيل دقيق، الطلبات الناقصة أو غير الواضحة لن يتم اعتمادها.
                    </span>
                  </div>

                  {/* Customer details input group with warning adjacent */}
                  <div className="space-y-4 bg-white p-4 rounded-3xl border border-[#1e293b]/5">
                    <h4 className="font-cairo font-bold text-xs text-[#1e293b] border-b pb-2 mb-2">بيانات العميل:</h4>
                    
                    <p className="font-sans text-[10px] text-amber-600 bg-amber-50/50 p-2 rounded-xl mt-1 font-semibold">
                      ⚠️ يرجى تعبئة البيانات بتفصيل دقيق، الطلبات الناقصة أو غير الواضحة لن يتم اعتمادها
                    </p>

                    <div>
                      <label className="block font-cairo font-bold text-xs text-slate-500 mb-1.5 flex items-center justify-between">
                        <span>الاسم الكريم:</span>
                        <span className="text-[10px] text-slate-400 font-sans">مطلوب *</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={orderName}
                        onChange={(e) => setOrderName(e.target.value)}
                        placeholder="الاسم الكامل"
                        className="w-full font-sans text-xs p-3 bg-[#FDFBF7] border border-[#1e293b]/10 focus:border-[#1e293b]/40 outline-none rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block font-cairo font-bold text-xs text-slate-500 mb-1.5 flex items-center justify-between">
                        <span>رقم الجوال:</span>
                        <span className="text-[10px] text-slate-400 font-sans">مطلوب *</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={orderPhone}
                        onChange={(e) => setOrderPhone(e.target.value)}
                        placeholder="رقم الهاتف (مثل 777000700)"
                        className="w-full font-sans text-xs p-3 bg-[#FDFBF7] border border-[#1e293b]/10 focus:border-[#1e293b]/40 outline-none rounded-xl text-left"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  {/* Address Input Group (Conditional on Product Type) */}
                  {!orderShopItems.every(item => isProductDigital(item.product, shops.find(s => s.id === orderShopId))) ? (
                    <div className="space-y-3 bg-white p-4 rounded-3xl border border-[#1e293b]/5">
                      <h4 className="font-cairo font-bold text-xs text-rose-600">عنوان التوصيل (ملموس):</h4>
                      
                      <p className="font-sans text-[10px] text-amber-600 bg-amber-50/50 p-2 rounded-xl mt-1 font-semibold">
                        ⚠️ يرجى تعبئة البيانات بتفصيل دقيق، الطلبات الناقصة أو غير الواضحة لن يتم اعتمادها
                      </p>

                      <div>
                        <label className="block font-cairo font-bold text-xs text-slate-500 mb-1.5 flex items-center justify-between">
                          <span>عنوان التوصيل بالتفصيل الممل:</span>
                          <span className="text-[10px] text-rose-500 font-sans font-bold">إلزامي للمنتجات الملموسة *</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={orderAddress}
                          onChange={(e) => setOrderAddress(e.target.value)}
                          placeholder="مثال: عدن، كريتر، حي شعب العيدروس، بجانب مسجد العيدروس"
                          className="w-full font-sans text-xs p-3 bg-[#FDFBF7] border border-[#1e293b]/10 focus:border-[#1e293b]/40 outline-none rounded-xl"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="bg-emerald-50/50 border border-emerald-100 p-3.5 rounded-2xl flex gap-2.5 items-center select-none">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-sans text-[11px] text-emerald-800 leading-normal font-bold">
                        المنتجات في هذه السلة خدمات/منتجات رقمية. لن يطلب منك عنوان للشحن والتوصيل.
                      </span>
                    </div>
                  )}

                  {/* Quantity Field */}
                  <div className="bg-white p-4 rounded-3xl border border-[#1e293b]/5 space-y-3">
                    <label className="block font-cairo font-bold text-xs text-slate-500">
                      العدد الإجمالي المطلوب مراجعته:
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={orderQuantity}
                      onChange={(e) => setOrderQuantity(Number(e.target.value))}
                      className="w-full font-sans text-xs p-3 bg-[#FDFBF7] border border-[#1e293b]/10 focus:border-[#1e293b] outline-none rounded-xl font-bold"
                    />
                  </div>

                  {/* Notes input group with warning adjacent */}
                  <div className="bg-white p-4 rounded-3xl border border-[#1e293b]/5 space-y-3">
                    <h4 className="font-cairo font-bold text-xs text-[#1e293b]">الملاحظات:</h4>
                    
                    <p className="font-sans text-[10px] text-amber-600 bg-amber-50/50 p-2 rounded-xl mt-1 font-semibold">
                      ⚠️ يرجى تعبئة البيانات بتفصيل دقيق، الطلبات الناقصة أو غير الواضحة لن يتم اعتمادها
                    </p>

                    <div>
                      <label className="block font-cairo font-bold text-xs text-slate-500 mb-1.5">
                        تفاصيل إضافية للمتجر (اختياري):
                      </label>
                      <textarea
                        value={orderNotes}
                        onChange={(e) => setOrderNotes(e.target.value)}
                        placeholder="مثال: تعديل مقاس أو إضافة مواصفات أو أي استفسار آخر..."
                        rows={3}
                        className="w-full font-sans text-xs p-3 bg-[#FDFBF7] border border-[#1e293b]/10 focus:border-[#1e293b]/40 outline-none rounded-xl resize-none shadow-inner"
                      />
                    </div>
                  </div>

                </div>

                {/* Sticky Action Footer */}
                <div className="p-6 bg-[#FCF9F3] border-t border-slate-100 flex gap-3 select-none shrink-0">
                  <button
                    type="submit"
                    className="flex-grow flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-cairo font-extrabold text-xs py-3.5 rounded-2xl transition-all shadow-md active:scale-[0.98]"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>تأكيد وإرسال الطلب للواتساب</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOrderFormOpen(false)}
                    className="bg-slate-200/80 hover:bg-slate-300/80 text-slate-700 font-cairo font-bold text-xs px-5 py-3.5 rounded-2xl transition-all"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
