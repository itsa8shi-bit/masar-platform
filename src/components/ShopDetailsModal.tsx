import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Shop, Product, Review } from "../types";
import { 
  X, 
  MapPin, 
  Star, 
  Copy, 
  Check, 
  Instagram, 
  Sparkles, 
  MessageCircle, 
  ShoppingBag, 
  TrendingUp, 
  Coins, 
  MessageSquare, 
  HelpCircle, 
  Users, 
  Phone,
  Trash2,
  Plus,
  ArrowLeftRight
} from "lucide-react";
import DecoSticker from "./DecoSticker";
import { motion, AnimatePresence } from "motion/react";

function getValidThemeColor(colorStr?: string): string | null {
  if (!colorStr) return null;
  const clean = colorStr.trim().replace(/^#/, "");
  if (/^[0-9A-Fa-f]{3}$/.test(clean) || /^[0-9A-Fa-f]{6}$/.test(clean)) {
    return `#${clean}`;
  }
  return null;
}

function getContrastColor(hexColor: string): string {
  const clean = hexColor.trim().replace(/^#/, "");
  let r = 0, g = 0, b = 0;
  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16);
    g = parseInt(clean[1] + clean[1], 16);
    b = parseInt(clean[2] + clean[2], 16);
  } else if (clean.length === 6) {
    r = parseInt(clean.substring(0, 2), 16);
    g = parseInt(clean.substring(2, 4), 16);
    b = parseInt(clean.substring(4, 6), 16);
  } else {
    return "#1e293b";
  }
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#1e293b" : "#ffffff";
}

interface ShopDetailsModalProps {
  shop: Shop | null;
  onClose: () => void;
  onAddToCart: (product: Product, shop: Shop, size: string, notes: string) => void;
  reviews: Review[];
  onAddReview: (review: Review) => void;
}

export default function ShopDetailsModal({ 
  shop, 
  onClose, 
  onAddToCart, 
  reviews, 
  onAddReview 
}: ShopDetailsModalProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"products" | "contacts" | "reviews">("products");

  // Customization sub-state
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [customNotes, setCustomNotes] = useState<string>("");

  const handleCopyHandle = () => {
    if (!shop) return;
    const handle = shop.instagram.split('/').pop() || "";
    navigator.clipboard.writeText(handle);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startCustomizing = (product: Product) => {
    setCustomizingProduct(product);
    setSelectedSize(product.sizes && product.sizes.length > 0 ? product.sizes[0] : "");
    setCustomNotes("");
  };

  const handleConfirmAdd = () => {
    if (customizingProduct && shop) {
      // Find extra price associated with the selected option/size
      const selectedOptionObj = customizingProduct.options?.find(opt => opt.name === selectedSize);
      const extraPrice = selectedOptionObj ? selectedOptionObj.price : 0;
      const combinedPrice = customizingProduct.price + extraPrice;

      onAddToCart({ ...customizingProduct, price: combinedPrice }, shop, selectedSize, customNotes);
      setCustomizingProduct(null);
    }
  };

  const [reviewName, setReviewName] = useState("");
  const [reviewComment, setReviewComment] = useState("");

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewName.trim() || !reviewComment.trim()) return;
    
    onAddReview({
      user: reviewName,
      comment: reviewComment
    });

    setReviewName("");
    setReviewComment("");
  };

  useEffect(() => {
    // Disable scrolling on the body when the modal is active
    const originalStyle = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  if (!shop) return null;

  const primaryColor = getValidThemeColor(shop.themeColorPrimary) || "#1e293b"; // Interactive elements
  const secondaryColor = getValidThemeColor(shop.themeColorSecondary) || "#fdfbf7"; // Backgrounds

  const modalBg = secondaryColor;
  const interactiveCol = primaryColor;
  const modalTxtCol = getContrastColor(modalBg);
  const btnTxtCol = getContrastColor(interactiveCol);

  const tabs = [
    { id: "products" as const, label: "المنتجات", icon: ShoppingBag },
    { id: "contacts" as const, label: "بيانات الاتصال", icon: Phone },
    { id: "reviews" as const, label: "الآراء", icon: Star }
  ];

  return (
    <div
      id="shop-modal-container"
      className="fixed inset-0 w-full h-full z-50 flex items-center justify-center p-3 sm:p-6 md:p-8 bg-slate-900/40 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
      style={{
        "--shop-theme": interactiveCol,
        "--shop-theme-light": `${interactiveCol}12`,
        "--shop-theme-glow": `${interactiveCol}25`,
      } as React.CSSProperties}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 15 }}
        className="relative w-full max-w-2xl border flex flex-col my-auto overflow-hidden shadow-2xl"
        style={{ 
          backgroundColor: modalBg,
          borderColor: `${modalTxtCol}15`,
          borderRadius: "2.5rem"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Header Container */}
        <div className="shrink-0 relative">
          {/* Close Button */}
          <button
            id="close-modal-btn"
            onClick={onClose}
            className="absolute top-4 right-4 z-30 p-2.5 rounded-full bg-white/95 text-[#1e293b] shadow-md hover:scale-110 active:scale-95 transition-all duration-200"
            aria-label="إغلاق التفاصيل"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>

          {/* Modal Banner Image */}
          <div className="relative h-44 bg-slate-100" style={{ backgroundColor: `${interactiveCol}12` }}>
            <img
              id="modal-banner-img"
              src={shop.image}
              alt={shop.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 h-20" style={{ backgroundImage: `linear-gradient(to top, ${modalBg}, transparent)` }} />
            
            <DecoSticker type="sparkle" size={32} className="absolute bottom-4 right-6" />
          </div>

          {/* Header Block Details */}
          <div className="px-5 sm:px-6 md:px-8 pt-2">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span 
                className="font-sans text-[11px] font-bold px-3 py-1 rounded-full"
                style={{ backgroundColor: interactiveCol, color: btnTxtCol }}
              >
                {shop.category}
              </span>
              {shop.badge && (
                <span 
                  className="font-sans text-[11px] font-bold px-3 py-1 rounded-full"
                  style={{ backgroundColor: interactiveCol, color: btnTxtCol }}
                >
                  {shop.badge}
                </span>
              )}
              <span 
                className="font-sans text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1"
                style={{ color: `${modalTxtCol}b3`, backgroundColor: `${modalTxtCol}12` }}
              >
                <MapPin className="w-3 h-3" />
                <span>{shop.location}</span>
              </span>
            </div>

            <div className="flex items-center justify-between mb-1.5">
              <h2 id="modal-shop-title" className="font-cairo font-black text-xl flex items-center gap-2" style={{ color: modalTxtCol }}>
                {shop.name}
                <DecoSticker type="star" size={16} className="inline-block" />
              </h2>
              <div 
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-xs"
                style={{ backgroundColor: `${interactiveCol}15`, color: interactiveCol }}
              >
                <Star className="w-4 h-4 fill-current" />
                <span>{shop.rating.toFixed(1)}</span>
              </div>
            </div>

            <p id="modal-shop-desc" className="font-sans text-xs leading-relaxed mb-3" style={{ color: `${modalTxtCol}cc` }}>
              {shop.description}
            </p>
          </div>

          {/* CUSTOM TABS INTERFACES */}
          <div className="px-5 sm:px-6 md:px-8 pb-3 border-b" style={{ borderColor: `${modalTxtCol}10` }}>
            <div className="grid grid-cols-3 p-1 rounded-2xl gap-1 w-full shrink-0" style={{ backgroundColor: `${modalTxtCol}10` }}>
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center justify-center gap-2 text-center font-cairo font-extrabold text-[10px] sm:text-xs py-2 px-1 rounded-xl transition-all duration-300 ${
                      activeTab === tab.id
                        ? "text-white shadow-sm"
                        : "hover:bg-slate-200/50"
                    }`}
                    style={
                      activeTab === tab.id
                        ? { backgroundColor: interactiveCol, color: btnTxtCol }
                        : { color: `${modalTxtCol}b3` }
                    }
                  >
                    <IconComponent className="w-3.5 h-3.5 shrink-0" />
                    <span className="whitespace-nowrap hidden min-[400px]:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* TAB CONTENTS CONTAINER */}
        <div className="p-5 sm:p-6 md:p-8 pt-4" style={{ backgroundColor: modalBg, color: modalTxtCol }}>
          
          {/* TAB 1: PRODUCTS GRID */}
          {activeTab === "products" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="font-cairo font-bold text-xs text-slate-400">المنتجات الحصرية المتوفرة ({shop.products?.length || 0})</span>
                <DecoSticker type="flower" size={14} className="inline-block" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {shop.products && shop.products.length > 0 ? (
                  shop.products.map((product) => (
                    <div
                      key={product.id}
                      className="border rounded-[2rem] overflow-hidden transition-all duration-300 flex flex-col justify-between group h-full"
                      style={{ 
                        backgroundColor: `${modalTxtCol}05`, 
                        borderColor: `${modalTxtCol}12`
                      }}
                    >
                      {/* Large professional image container as requested */}
                      <div className="w-full h-44 bg-slate-50 relative overflow-hidden shrink-0">
                        <img
                          src={product.image}
                          alt={product.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                        />
                        <div className="absolute top-2.5 left-2.5 px-3 py-1 rounded-full shadow-sm" style={{ backgroundColor: modalBg }}>
                          <span className="font-cairo font-black text-xs" style={{ color: modalTxtCol }}>
                            {product.price.toLocaleString("ar-YE")} ريال
                          </span>
                        </div>
                      </div>

                      <div className="p-4 flex flex-col justify-between flex-grow">
                        <div>
                          <h4 className="font-cairo font-extrabold text-sm mb-1 line-clamp-1" style={{ color: modalTxtCol }}>{product.name}</h4>
                          <p className="font-sans text-[11px] line-clamp-2 leading-relaxed mb-3" style={{ color: `${modalTxtCol}99` }}>
                            {product.description}
                          </p>
                        </div>
                        
                        <button
                          onClick={() => startCustomizing(product)}
                          className="w-full flex items-center justify-center gap-1 font-cairo font-bold text-xs py-2.5 rounded-xl transition-all duration-200 hover:opacity-90"
                          style={{ backgroundColor: interactiveCol, color: btnTxtCol }}
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>تصفح خيارات الطلب</span>
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 text-center py-10 font-sans text-xs" style={{ color: `${modalTxtCol}60` }}>
                    لا توجد منتجات معروضة حالياً.
                  </div>
                )}
              </div>
            </div>
          )}

           {/* TAB 3: CONTACTS & FAQS */}
          {activeTab === "contacts" && (
            <div className="space-y-5">
              {/* FAQ Section */}
              <div className="border p-4 rounded-3xl" style={{ backgroundColor: `${modalTxtCol}05`, borderColor: `${modalTxtCol}12` }}>
                <h4 className="font-cairo font-black text-xs mb-3 flex items-center gap-1" style={{ color: modalTxtCol }}>
                  <HelpCircle className="w-4 h-4" style={{ color: interactiveCol }} />
                  <span>الأسئلة الأكثر شيوعاً للمشروع</span>
                </h4>
                <div className="space-y-4">
                  {shop.faqs && shop.faqs.length > 0 ? (
                    shop.faqs.map((faq, index) => (
                      <div key={index} className="border-b border-dashed last:border-0 pb-3 last:pb-0" style={{ borderColor: `${modalTxtCol}15` }}>
                        <span className="block font-cairo font-black text-xs flex items-start gap-1" style={{ color: modalTxtCol }}>
                          <span className="shrink-0 font-bold" style={{ color: interactiveCol }}>س:</span>
                          <span>{faq.question}</span>
                        </span>
                        <p className="font-sans text-[11px] mt-1 leading-relaxed p-2 rounded-xl pr-3 border" style={{ backgroundColor: modalBg, color: `${modalTxtCol}cc`, borderColor: `${modalTxtCol}10` }}>
                          {faq.answer}
                        </p>
                      </div>
                    ))
                  ) : (
                    <>
                      <div>
                        <span className="block font-cairo font-bold text-xs" style={{ color: modalTxtCol }}>س: هل يتوفر الشحن والتوصيل لجميع المحافظات؟</span>
                        <p className="font-sans text-[11px] mt-0.5 leading-relaxed" style={{ color: `${modalTxtCol}99` }}>
                          نعم، نقوم بالتنسيق مع شركات النقل البري ومندوبي التوصيل لبقية المدن خلال أيام عمل محددة وبجدول زمني واضح.
                        </p>
                      </div>
                      <div>
                        <span className="block font-cairo font-bold text-xs" style={{ color: modalTxtCol }}>س: كيف أضمن تفاصيل ومقاسات طلبي؟</span>
                        <p className="font-sans text-[11px] mt-0.5 leading-relaxed" style={{ color: `${modalTxtCol}99` }}>
                          بمجرد إضافة المنتج والتأكيد، سنتابع طلبك لمراجعة وتدقيق التعديلات الخاصة والمقاسات المطلوبة بدقة كاملة.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Direct Communications Links */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <a
                  href={`https://wa.me/${shop.whatsappPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-100 p-3 rounded-2xl flex items-center justify-center gap-2 transition-colors text-emerald-700"
                >
                  <Phone className="w-4 h-4" />
                  <span className="font-cairo font-extrabold text-xs">اتصال سريع واتس آب</span>
                </a>
                
                <button
                  onClick={handleCopyHandle}
                  className="p-3 rounded-2xl border flex items-center justify-center gap-2 transition-colors font-cairo font-extrabold text-xs"
                  style={
                    copied
                      ? { backgroundColor: `${interactiveCol}15`, borderColor: interactiveCol, color: interactiveCol }
                      : { backgroundColor: modalBg, borderColor: `${modalTxtCol}20`, color: modalTxtCol }
                  }
                >
                  <Instagram className="w-4 h-4" />
                  <span>{copied ? "تم نسخ اسم التسجيل" : "نسخ رابط إنستغرام"}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: REVIEWS COMMENTS */}
          {activeTab === "reviews" && (
            <div>
              {reviews && reviews.length > 0 ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-cairo font-bold text-xs px-3 py-1 rounded-full" style={{ backgroundColor: `${interactiveCol}15`, color: interactiveCol }}>
                      التقييمات الحقيقية للعملاء
                    </span>
                    <DecoSticker type="star" size={14} className="text-amber-400" />
                  </div>

                  <div className="space-y-3.5 mb-6">
                    {reviews.map((comment, index) => (
                      <div key={index} className="border p-4 rounded-2xl relative shadow-sm hover:shadow-md transition-shadow" style={{ backgroundColor: `${modalTxtCol}05`, borderColor: `${modalTxtCol}12` }}>
                        <div className="absolute top-3 left-3 select-none">
                          <DecoSticker type="sparkle" size={11} className="opacity-70 text-[#1e293b]" />
                        </div>
                        
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-cairo font-extrabold text-xs" style={{ color: modalTxtCol }}>{comment.user}</span>
                          <span className="text-[9px] font-sans text-amber-500 font-bold flex items-center gap-0.5">
                            <Star className="w-2.5 h-2.5 fill-amber-300 stroke-amber-500" />
                            <span>تقييم موثق</span>
                          </span>
                        </div>
                        <p className="font-sans text-xs leading-relaxed pr-1" style={{ color: `${modalTxtCol}cc` }}>{comment.comment}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}

              {/* Add review form inside modal */}
              <form onSubmit={handleSubmitReview} className="p-4 border rounded-3xl mt-4" style={{ backgroundColor: `${modalTxtCol}05`, borderColor: `${modalTxtCol}15` }}>
                <h5 className="font-cairo font-bold text-xs mb-3 flex items-center gap-1" style={{ color: modalTxtCol }}>
                  <span>إضافة تقييم جديد لمساندة المشروع</span>
                </h5>
                <div className="space-y-3">
                  <div>
                    <input
                      type="text"
                      required
                      value={reviewName}
                      onChange={(e) => setReviewName(e.target.value)}
                      placeholder="الاسم الكريم"
                      className="w-full font-sans text-xs p-2.5 outline-none rounded-xl border transition-all"
                      style={{ backgroundColor: modalBg, color: modalTxtCol, borderColor: `${modalTxtCol}20` }}
                    />
                  </div>
                  <div>
                    <textarea
                      required
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="اكتب مراجعتك الحقيقية هنا لمساندة صاحب المتجر..."
                      rows={3}
                      className="w-full font-sans text-xs p-2.5 outline-none rounded-xl resize-none border transition-all"
                      style={{ backgroundColor: modalBg, color: modalTxtCol, borderColor: `${modalTxtCol}20` }}
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-1 text-white font-cairo font-bold text-xs py-2.5 rounded-xl transition-all duration-300 active:scale-[0.98] hover:opacity-90"
                    style={{ backgroundColor: interactiveCol, color: btnTxtCol }}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>تأكيد ونشر التقييم في مسار</span>
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>

        {/* Global Footer CTA */}
        <div className="p-6 border-t flex items-center justify-between gap-4 select-none shrink-0" style={{ backgroundColor: `${interactiveCol}12`, borderColor: `${modalTxtCol}15` }}>
          <a
            id="modal-insta-link"
            href={shop.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-grow flex items-center justify-center gap-2 font-cairo font-extrabold text-sm py-3.5 rounded-2xl transition-all duration-300 shadow-sm active:scale-[0.99] hover:opacity-90"
            style={{ backgroundColor: interactiveCol, color: btnTxtCol }}
          >
            <span>زيارة المعرض بالتواصل المباشر</span>
            <Instagram className="w-4 h-4" />
          </a>
        </div>
      </motion.div>

      {/* POPUP SUB-MODAL FOR CUSTOMIZATION/PRODUCT OPTIONS */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {customizingProduct && (
            <div 
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm" 
              onClick={() => setCustomizingProduct(null)}
              style={{
                "--shop-theme": interactiveCol,
                "--shop-theme-light": `${interactiveCol}12`,
                "--shop-theme-glow": `${interactiveCol}25`,
              } as React.CSSProperties}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 15 }}
                onClick={(e) => e.stopPropagation()}
                className="border rounded-[2rem] shadow-2xl p-6 w-full max-w-sm overflow-hidden"
                style={{ backgroundColor: modalBg, color: modalTxtCol, borderColor: `${modalTxtCol}15` }}
              >
                {/* Product mini header */}
                <div className="flex flex-col gap-3 pb-4 mb-4 border-b" style={{ borderColor: `${modalTxtCol}20` }}>
                  <div className="flex gap-4 items-center">
                    <div className="w-14 h-14 bg-slate-100 rounded-xl overflow-hidden shrink-0">
                      <img
                        src={customizingProduct.image}
                        alt={customizingProduct.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h5 className="font-cairo font-extrabold text-sm leading-tight mb-1" style={{ color: modalTxtCol }}>{customizingProduct.name}</h5>
                      <div className="flex flex-col gap-0.5 mt-0.5">
                        <span className="font-sans text-[11px] font-medium" style={{ color: `${modalTxtCol}99` }}>
                          السعر الأساسي: {customizingProduct.price.toLocaleString("ar-YE")} ريال
                        </span>
                        {(() => {
                          const selectedOptionObj = customizingProduct.options?.find(opt => opt.name === selectedSize);
                          const extraPrice = selectedOptionObj ? selectedOptionObj.price : 0;
                          const totalPrice = customizingProduct.price + extraPrice;
                          return (
                            <>
                              {extraPrice > 0 && (
                                <span className="font-sans text-[11px] text-emerald-600 font-bold block">
                                  قيمة الخيار: +{extraPrice.toLocaleString("ar-YE")} ريال
                                </span>
                              )}
                              <span className="font-sans text-xs font-black px-2 py-1 rounded-lg mt-1 inline-block w-fit" style={{ backgroundColor: `${interactiveCol}15`, color: interactiveCol }}>
                                السعر الإجمالي: {totalPrice.toLocaleString("ar-YE")} ريال
                              </span>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                  {customizingProduct.description && (
                    <p className="font-sans text-[11px] leading-relaxed p-2.5 rounded-2xl border" style={{ backgroundColor: `${modalTxtCol}05`, color: `${modalTxtCol}b3`, borderColor: `${modalTxtCol}10` }}>
                      {customizingProduct.description}
                    </p>
                  )}
                </div>

                {/* Sizing/Variant Selection */}
                {customizingProduct.sizes && customizingProduct.sizes.length > 0 && (
                  <div className="mb-4">
                    <label className="block font-cairo font-bold text-xs mb-2" style={{ color: `${modalTxtCol}99` }}>اختر الخيار المتوفر:</label>
                    <div className="flex flex-wrap gap-2">
                      {customizingProduct.sizes.map((sz) => {
                        const optObj = customizingProduct.options?.find(opt => opt.name === sz);
                        const optPrice = optObj ? optObj.price : 0;
                        return (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => setSelectedSize(sz)}
                            className="font-sans text-xs px-3 py-1.5 rounded-xl border font-bold transition-all flex items-center gap-1.5"
                            style={
                              selectedSize === sz
                                ? { backgroundColor: interactiveCol, borderColor: interactiveCol, color: btnTxtCol }
                                : { backgroundColor: modalBg, borderColor: `${modalTxtCol}20`, color: modalTxtCol }
                            }
                          >
                            <span>{sz}</span>
                            {optPrice > 0 && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                                selectedSize === sz ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-700"
                              }`}>
                                +{optPrice.toLocaleString("ar-YE")}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Notes/Customization instructions text box */}
                <div className="mb-5">
                  <label className="block font-cairo font-bold text-xs mb-2" style={{ color: `${modalTxtCol}99` }}>ملاحظات أو مواصفات خاصة (اختياري):</label>
                  <textarea
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    placeholder="مثال: تحديد الحجم الفعلي أو تعديل اللون والتفاصيل المطلوبة..."
                    rows={3}
                    className="w-full font-sans text-xs p-2.5 outline-none rounded-xl resize-none border"
                    style={{ backgroundColor: modalBg, color: modalTxtCol, borderColor: `${modalTxtCol}20` }}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2 text-center">
                  <button
                    onClick={handleConfirmAdd}
                    className="flex-grow flex items-center justify-center gap-1.5 font-cairo font-bold text-xs py-3 rounded-2xl transition-colors hover:opacity-90"
                    style={{ backgroundColor: interactiveCol, color: btnTxtCol }}
                  >
                    <Check className="w-4 h-4" />
                    <span>تأكيد وإضافة للسلة</span>
                  </button>
                  <button
                    onClick={() => setCustomizingProduct(null)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-cairo font-bold text-xs px-4 py-3 rounded-2xl transition-colors"
                  >
                    <span>إلغاء</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
