import React from "react";
import { Shop } from "../types";
import { Heart, MapPin, Star, ExternalLink } from "lucide-react";
import DecoSticker from "./DecoSticker";

function getValidColor(colorStr?: string): string | null {
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

interface ShopCardProps {
  shop: Shop;
  isFavorite: boolean;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
  onOpenDetails: (shop: Shop) => void;
}

export default function ShopCard({ shop, isFavorite, onToggleFavorite, onOpenDetails }: ShopCardProps) {
  const primaryColor = getValidColor(shop.themeColorPrimary) || "#1e293b"; // Interactive elements
  const secondaryColor = getValidColor(shop.themeColorSecondary) || "#ffffff"; // Background

  const cardBg = secondaryColor;
  const interactiveCol = primaryColor;
  const cardTxtCol = getContrastColor(cardBg);
  const btnTxtCol = getContrastColor(interactiveCol);

  return (
    <div
      id={`shop-card-${shop.id}`}
      onClick={() => onOpenDetails(shop)}
      className="group relative border rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-md transition-all duration-500 cursor-pointer flex flex-col h-full transform hover:-translate-y-1"
      style={{ 
        backgroundColor: cardBg,
        borderColor: `${cardTxtCol}15`
      }}
    >
      {/* Favorite Heart Trigger */}
      <button
        id={`fav-btn-${shop.id}`}
        onClick={(e) => onToggleFavorite(shop.id, e)}
        className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-white/90 backdrop-blur-md shadow-md hover:scale-110 active:scale-95 transition-all duration-300 group-hover:opacity-100"
        aria-label={isFavorite ? "إزالة من المفضلة" : "إضافة للمفضلة"}
      >
        <Heart
          id={`heart-icon-${shop.id}`}
          className={`w-5.5 h-5.5 transition-colors duration-300 ${isFavorite ? "fill-rose-500 stroke-rose-500 scale-110" : "text-slate-400 hover:text-rose-500"}`}
        />
      </button>

      {/* Decorative inner sparkles or custom badge from Airtable */}
      {(shop.badge || shop.rating === 5.0) && (
        <div 
          className="absolute top-4 left-4 z-20 font-cairo font-bold text-[11px] px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm backdrop-blur-sm"
          style={{ backgroundColor: interactiveCol, color: btnTxtCol }}
        >
          <span>{shop.badge || "مميز جداً"}</span>
          <DecoSticker type="sparkle" size={12} className="inline-block" />
        </div>
      )}

      {/* Card Image Cover */}
      <div className="relative aspect-4/3 overflow-hidden bg-slate-100">
        <img
          id={`shop-img-${shop.id}`}
          src={shop.image}
          alt={shop.name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>

      {/* Card Body */}
      <div className="p-6 flex flex-col flex-grow relative">
        {/* Rating and District */}
        <div className="flex items-center justify-between text-xs font-sans mb-2.5" style={{ color: `${cardTxtCol}99` }}>
          <div 
            className="flex items-center gap-1.5 font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: `${interactiveCol}15`, color: interactiveCol }}
          >
            <Star className="w-3.5 h-3.5 fill-current" />
            <span>{shop.rating.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1 font-medium">
            <MapPin className="w-3.5 h-3.5" style={{ color: interactiveCol }} />
            <span>{shop.location}</span>
          </div>
        </div>

        {/* Name and Categories */}
        <h3 
          id={`shop-title-${shop.id}`} 
          className="font-cairo font-bold text-xl mb-1.5 transition-colors duration-300"
          style={{ color: cardTxtCol }}
        >
          {shop.name}
        </h3>
        <p 
          className="inline-block self-start font-sans font-medium text-xs px-2.5 py-1 rounded-full mb-3.5"
          style={{ color: cardTxtCol, backgroundColor: `${cardTxtCol}12` }}
        >
          {shop.category}
        </p>

        {/* Short Description */}
        <p 
          id={`shop-desc-${shop.id}`} 
          className="font-sans text-sm leading-relaxed mb-4 line-clamp-3 flex-grow"
          style={{ color: `${cardTxtCol}cc` }}
        >
          {shop.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-5 select-none">
          {shop.tags.map((tag, idx) => (
            <span
              key={idx}
              className="text-[11px] font-sans font-medium rounded-full px-2 py-0.5 border"
              style={{ 
                color: `${cardTxtCol}b3`, 
                borderColor: `${cardTxtCol}20`,
                backgroundColor: `${cardTxtCol}05`
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Actions Button */}
        <div className="flex gap-2.5 mt-auto pt-3 border-t border-dashed" style={{ borderColor: `${cardTxtCol}20` }}>
          <button
            id={`details-btn-${shop.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetails(shop);
            }}
            className="flex-grow flex items-center justify-center gap-2 font-cairo font-bold text-sm active:scale-[0.98] transition-all duration-300 py-3 rounded-2xl hover:opacity-90"
            style={{ 
              backgroundColor: interactiveCol,
              color: btnTxtCol,
              boxShadow: `0 4px 12px ${interactiveCol}25`
            }}
          >
            <span>تصفح المنتجات</span>
          </button>
        </div>
      </div>

      {/* Floating internal subtle decor sticker */}
      {shop.id === "1" && <DecoSticker type="flower" size={16} className="absolute bottom-[80px] left-3 opacity-20 pointer-events-none" />}
      {shop.id === "4" && <DecoSticker type="heart" size={14} className="absolute bottom-[80px] left-3 opacity-25 pointer-events-none" />}
    </div>
  );
}
