import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const REVIEWS_FILE = path.join(process.cwd(), "local_reviews.json");
const ORDERS_FILE = path.join(process.cwd(), "local_orders.json");

function getLocalReviews(): Record<string, any[]> {
  try {
    if (fs.existsSync(REVIEWS_FILE)) {
      const data = fs.readFileSync(REVIEWS_FILE, "utf-8");
      return JSON.parse(data) || {};
    }
  } catch (err) {
    console.error("Failed to read local reviews file:", err);
  }
  return {};
}

function saveLocalReview(shopId: string, review: { user: string; comment: string }) {
  try {
    const reviews = getLocalReviews();
    if (!reviews[shopId]) {
      reviews[shopId] = [];
    }
    reviews[shopId].push(review);
    fs.writeFileSync(REVIEWS_FILE, JSON.stringify(reviews, null, 2), "utf-8");
    console.log(`Saved review locally for shop ${shopId}`);
  } catch (err) {
    console.error("Failed to write to local reviews file:", err);
  }
}

function saveLocalOrder(order: any) {
  try {
    let orders: any[] = [];
    if (fs.existsSync(ORDERS_FILE)) {
      const data = fs.readFileSync(ORDERS_FILE, "utf-8");
      orders = JSON.parse(data) || [];
    }
    orders.push({
      ...order,
      timestamp: new Date().toISOString()
    });
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), "utf-8");
    console.log(`Saved order locally`);
  } catch (err) {
    console.error("Failed to write to local orders file:", err);
  }
}

const app = express();
const PORT = 3000;

// =========================================================================
// ⚙️ إعدادات الربط المباشر مع آيرتبل (Airtable API Settings for Masar Platform)
// =========================================================================
// يمكنكِ تغيير المفاتيح والروابط أدناه مباشرة لربط المنصة بقاعدة بياناتك الخاصة:
const AIRTABLE_API_TOKEN = process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_API_TOKEN || "";
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || "appRRBihIQV5zZYD3";

// أسماء الجداول في Airtable:
const TABLE_SHOPS = "المتاجر";             // الاسم الافتراضي لجدول المتاجر
const TABLE_PRODUCTS = "المنتجات";         // الاسم الافتراضي لجدول المنتجات
const TABLE_OPTIONS = "خيارات المنتجات";   // الاسم الافتراضي لجدول خيارات ومقاسات المنتجات
const TABLE_REVIEWS = "الآراء";             // الاسم الافتراضي لجدول آراء وتقييمات العملاء
const TABLE_ORDERS = "الطلبات";             // الاسم الافتراضي لجدول طلبات المنتجات
// =========================================================================

app.use(express.json());

// Initialize Gemini AI client
const getAIClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("WARNING: GEMINI_API_KEY environment variable is not set.");
  }
  return new GoogleGenAI({ apiKey: apiKey || "MOCK_KEY" });
};

// API: Project Idea Generator
app.post("/api/generate-idea", async (req, res) => {
  try {
    const { interests, availableTime, capital } = req.body;
    if (!interests || !availableTime) {
      return res.status(400).json({ error: "الرجاء إدخال الاهتمامات والوقت المتاح" });
    }

    const ai = getAIClient();
    const prompt = `أنت مستشار أعمال محترف ومحلل مشاريع لمنصة "مسار" (Masar). هدفك هو تقديم تحليل واقعي وعملي ومباشر وصياغة أفكار مشاريع قابلة للتطبيق لرائدات الأعمال.

الأسلوب وصياغة الإجابة:
- استخدم اللغة العربية الفصحى الحديثة والمهنية بدقة تامة.
- تجنب تماماً استخدام أي لهجة محلية أو عامية، أو كلمات ودية مفرطة ومصطلحات غير رسمية.
- كن مباشراً وموضوعياً وموجزاً ومقنعاً في طرح الحلول. تجنب المقدمات الطويلة وفقرات التحفيز الإنشائية.
- ركّز على الخطوات الإجرائية القابلة للتنفيذ المباشر.

المهمة المطلوبة:
اقترح 3 أفكار مشاريع واقعية ومجدية تجارياً ومريحة وملائمة للسوق، بناءً على المدخلات التالية:
- الاهتمامات والمهارات: ${interests}
- الوقت المتاح أسبوعياً: ${availableTime} ساعة.
- رأس المال المتوفر: ${capital || "غير محدد"} ريال يمني.

الشروط الإلزامية:
1. قدم 3 أفكار مشاريع مناسبة ومخصصة تماماً لهذه المدخلات.
2. لكل فكرة مشروع، اذكر الهيكل التالي بدقة واختصار:
   - اسم المشروع المقترح (واضح ومباشر ومهني).
   - نبذة تشغيلية سريعة (طبيعة العمل، طريقة تقديم الخدمة أو تصنيع المنتج).
   - متطلبات البدء والتمويل (تكلفة تقديرية وإجراءات التشغيل الأولى).
3. اختتم التقرير بدعوة مهنية مباشرة وواضحة لتنظيم الحسابات والمبيعات ومتابعة الأرباح بدقة عبر منصة وموقع "مسار" (Masar) لضمان الاستمرارية والنمو المالي والتحليلي المستدام.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    const resultText = response.text || "عذراً، لم نتمكن من الحصول على رد من الذكاء الاصطناعي.";
    res.json({ result: resultText });
  } catch (error: any) {
    console.error("Error in generate-idea:", error);
    res.status(500).json({ error: error.message || "حدث خطأ أثناء الاتصال بالذكاء الاصطناعي." });
  }
});

// API: AI Marketing Assistant
app.post("/api/generate-marketing", async (req, res) => {
  try {
    const { projectType, tone, details } = req.body;
    if (!projectType || !tone) {
      return res.status(400).json({ error: "الرجاء إدخال نوع المشروع والنبرة المطلوبة" });
    }

    const ai = getAIClient();
    const prompt = `أنت مستشار تسويق محترف في منصة "مسار" (Masar). مهمتك هي تقديم نموذج تسويقي ناضج، مباشر وعملي لصاحبات المشاريع، مع التركيز التام على الهياكل البيعية المنظمة والمنطقية.

الأسلوب والضوابط الصارمة:
- استخدم لغة عربية فصحى حديثة ومهنية بالكامل.
- تجنب تماماً اللهجات المحلية والعبارات الودية المفرطة أو لغة "الأخوات وصديقات الدرب".
- كن حاسماً وعملياً ورسمياً ومباشراً. تجنب الإطالة، الحشو، والفقرات التحفيزية الإنشائية.
- ركز على إنتاج هيكل تسويقي متماسك وبسيط يبني المصداقية بدون مصطلحات تسويقية مبتذلة (salesy jargon).

المعطيات المتوفرة:
- تصنيف التجارة/المنتج: ${projectType}
- تفاصيل العرض أو المزايا: ${details || "لا توجد تفاصيل إضافية"}
- نبرة التعبير المفضلة: ${tone}

المخرج المطلوب:
قم بصياغة مقترح تسويقي واضح يتبع بدقة هذا الهيكل المزدوج:
1. منشور ترويجي مكتوب (Social Media Post) موزع على 3 أركان واضحة ومسماة:
   - الخطاف الأولي (Hook): عبارة افتتاحية قوية لشد الانتباه.
   - القيمة الجوهرية (Value): شرح موجز للميزة والفائدة بوضوح ودقة.
   - دعوة لاتخاذ إجراء (CTA): توجيه مباشر ومحدد حول كيفية الشراء أو التواصل.
2. فكرة لخطاف فيديو قصير (Short Video Hook): خطاف لفظي مدته 3 ثوانٍ للأدلة المرئية أو العروض التشويقية.

القيد الحاسم:
- قدم الإرشاد بأسلوب خطوات محددة وإجراءات سريعة.
- اختتم المخرج بدعوة مهنية موجزة ومباشرة توضح أهمية متابعة مبيعات وحملات هذا المنتج وتدفقاته النقدية من خلال لوحة تحليلات منصة "مسار" (Masar) لقياس العائد على الاستثمار الفعلي وتفادي الخسائر التشغيلية.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    const resultText = response.text || "عذراً، لم نتمكن من الحصول على رد من الذكاء الاصطناعي.";
    res.json({ result: resultText });
  } catch (error: any) {
    console.error("Error in generate-marketing:", error);
    res.status(500).json({ error: error.message || "حدث خطأ أثناء الاتصال بالذكاء الاصطناعي." });
  }
});

// API: AI Prompt Engineer Assistant
app.post("/api/generate-prompt", async (req, res) => {
  try {
    const { businessNeed } = req.body;
    if (!businessNeed) {
      return res.status(400).json({ error: "الرجاء إدخال تفاصيل مهاراتك أو مشروعكِ" });
    }

    const ai = getAIClient();
    const prompt = `أنت مهندس ومستشار أوامر ذكاء اصطناعي محترف في منصة "مسار" (Masar). مهمتك هي تقديم وتصميم موجه فائق الكفاءة (Super-Prompt) متكامل لمساعدة صاحبة المشروع في تحسين وبناء مخرجاتها من أنظمة الذكاء الاصطناعي الأخرى.

الأسلوب والضوابط الصارمة:
- استخدم لغة عربية فصحى حديثة ومهنية بالكامل.
- تجنب تماماً استخدام أي لهجة عامية، أو مخاطبة المستخدمة بألفاظ ودية مثل "أختي" أو "أخواتنا".
- كن مباشراً وموضوعياً وموجزاً ومقنعاً. تجنب التمهيد الطويل والمبالغة في التشجيع المعنوي.
- قدم قيمة عملية فورية وقابلة للتطبيق الفوري.

المعطيات المتوفرة للطلب:
- طبيعة الاحتياج أو المطلب للمشروع: "${businessNeed}"

المخرج المطلوب:
صمم المخرج بناءً على جزأين منظمين بدقة تامة:
1. مقدمة استشارية مهنية موجزة للغاية (حدود سطرين كحد أقصى) لتوضيح الغرض من الموجه وكيفية استغلاله.
2. الموجه الاحترافي الجاهز للنسخ (The Master Prompt to Copy/Paste):
   - يجب أن يكون موجهاً ذكياً وتفصيلياً، مكتوباً بصيغة المتحدث (رائدة الأعمال)، يطلب من النموذج الآخر توليد أفضل استراتيجية عمل متطورة مع تفكيك المطلب لنقاط تحليلية دقيقة وطلب خطوات ترويجية/تشغيلية متوافقة وواقعية.

القيد الحاسم:
- يجب أن ينتهي المخرج بملاحظة مهنية ورسمية توجّه المستخدمة لتوثيق التحليلات وتكاليف المشروع عبر أدوات منصة "مسار" (Masar) للمحافظة على كفاءة القرارات المالية للمشروع واستدامته.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    const resultText = response.text || "عذراً، لم نتمكن من توليد الموجه حالياً.";
    res.json({ result: resultText });
  } catch (error: any) {
    console.error("Error in generate-prompt:", error);
    res.status(500).json({ error: error.message || "حدث خطأ أثناء صياغة الموجه الذكي." });
  }
});

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

// API: Get Shops, Products, and Options from Airtable securely
app.get("/api/shops", async (req, res) => {
  try {
    const localReviews = getLocalReviews();
    
    // 1. Fetch Shops (المتاجر)
    const shopsRes = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLE_SHOPS)}`, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_TOKEN}` }
    });
    if (!shopsRes.ok) {
      throw new Error(`Failed to fetch shops from Airtable: ${shopsRes.statusText}`);
    }
    const shopsData: any = await shopsRes.json();

    // 2. Fetch Products (المنتجات)
    const productsRes = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLE_PRODUCTS)}`, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_TOKEN}` }
    });
    if (!productsRes.ok) {
      throw new Error(`Failed to fetch products from Airtable: ${productsRes.statusText}`);
    }
    const productsData: any = await productsRes.json();

    // 3. Fetch Product Options (خيارات المنتجات)
    const optionsRes = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLE_OPTIONS)}`, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_TOKEN}` }
    });
    let optionsData: any = { records: [] };
    if (optionsRes.ok) {
      optionsData = await optionsRes.json();
    } else {
      console.warn("Product options table fetch bypassed or failed, continuing with empty options list");
    }

    // 4. Fetch Reviews from Airtable Dynamically (جدول الآراء)
    const reviewTableCandidates = [TABLE_REVIEWS, "Reviews", "التقييمات", "الآراء"];
    let airtableReviews: any[] = [];
    for (const tableName of reviewTableCandidates) {
      try {
        const reviewsRes = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`, {
          headers: { Authorization: `Bearer ${AIRTABLE_API_TOKEN}` }
        });
        if (reviewsRes.ok) {
          const reviewsData: any = await reviewsRes.json();
          airtableReviews = reviewsData.records || [];
          console.log(`Successfully fetched reviews from Airtable table: ${tableName}`);
          break;
        }
      } catch (err) {
        console.warn(`Could not fetch reviews from table ${tableName}:`, err);
      }
    }

    // Build options map for easy lookup
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

    // Build products list and map
    const productsList = productsData.records.map((pRec: any) => {
      const f = pRec.fields;
      
      // 1. Check linked options defined on product record ("خيارات المنتجات")
      const sizeIdsFromProduct = f["خيارات المنتجات"] || [];
      const sizeIds = Array.isArray(sizeIdsFromProduct) ? sizeIdsFromProduct : [sizeIdsFromProduct];
      
      // 2. Discover options referencing this product on options record ("المنتج التابع له")
      const sizeIdsFromOptions = optionsData.records
        .filter((optionRec: any) => {
          const optFields = optionRec.fields;
          const parentProds = optFields["المنتج التابع له"] || [];
          const parentProdIds = Array.isArray(parentProds) ? parentProds : [parentProds];
          return parentProdIds.includes(pRec.id);
        })
        .map((optionRec: any) => optionRec.id);

      // Combine and filter unique option ids
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

    // Build dynamic Airtable reviews map grouped by shop association
    const reviewsByShopId: Record<string, any[]> = {};
    airtableReviews.forEach((rRec: any) => {
      const f = rRec.fields;
      const user = f["اسم العميل"] || f["الاسم"] || f["الاسم الكريم"] || f["User"] || f["user"] || "عميلة مسار";
      const rating = Number(f["rating"]) || Number(f["التقييم"]) || 5;
      const comment = f["التعليق"] || f["الرأي"] || f["Comment"] || f["comment"] || "";
      
      // Support "المتاجر" and "المتجر" fields
      const shopIdsFromMatajer = f["المتاجر"] || [];
      const shopIdsFromMatjar = f["المتجر"] || [];
      const shopIds = Array.from(new Set([
        ...(Array.isArray(shopIdsFromMatajer) ? shopIdsFromMatajer : [shopIdsFromMatajer]),
        ...(Array.isArray(shopIdsFromMatjar) ? shopIdsFromMatjar : [shopIdsFromMatjar])
      ]));
      const shopName = f["اسم المتجر"];

      if (comment) {
        const reviewObj = { user, comment };
        if (Array.isArray(shopIds) && shopIds.length > 0) {
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

    // Provide default rich styling/metadata for our known stores, so their original categories, reviews, and FAQs remain beautifully integrated and we default gracefully for any newly added store
    const staticMetadata: Record<string, any> = {
      "togethry design studio": {
        category: "تصميم جرافيكي وبناء مواقع",
        rating: 4.9,
        featured: true,
        tags: ["هوية بصرية", "تصوير", "بوستات", "مواقع"],
        location: "عدن",
        faqs: [
          {
            question: "هل تتوفر لديكم خدمة الطباعة؟",
            answer: "للأسف، نحن متخصصون في التصميم الرقمي فقط ولا تتوفر لدينا خدمة الطباعة."
          },
          {
            question: "هل تقدمون قوالب جاهزة؟",
            answer: "نحن نقدم خدمات تصميم مخصصة حسب احتياج كل مشروع، ولا نقدم قوالب جاهزة."
          },
          {
            question: "ما هي سياسة الدفع لديكم؟",
            answer: "لضمان جدية الطلب، يتم دفع 50% من إجمالي المبلغ عند تأكيد الطلب، والـ 50% المتبقية يتم دفعها عند انتهاء العمل وقبل تسليم الملفات النهائية."
          }
        ],
        reviews: [
          { user: "متجر أورمان", comment: "الجودة ممتازة، التسليم كان سريعاً، وكل شيء كان ممتازاً." },
          { user: "متجر غيمة", comment: "اللوجو كان ممتازاً جداً والمعاملة لطيفة، والجميع أصبح يسألني عن اللوجو ومن أين صممته." }
        ]
      },
      "polyglot ashi": {
        category: "حصص اونلاين و كتب الكترونية",
        rating: 4.5,
        featured: true,
        tags: ["تعليم لغات", "كتب الكترونية", "حصص اونلاين", "إنجليزية", "صينية"],
        location: "أونلاين",
        faqs: [
          {
            question: "هل الحصص الأونلاين مسجلة؟",
            answer: "لا، حصصنا مباشرة وتفاعلية وليست مسجلة."
          },
          {
            question: "على أي تطبيق تتم الحصص؟",
            answer: "تُعقد جميع الحصص عبر تطبيق Google Meet."
          },
          {
            question: "هل الأسعار بالريال اليمني أم السعودي؟",
            answer: "جميع أسعارنا محددة بالريال السعودي."
          },
          {
            question: "هل السعر يشمل الحصة الواحدة فقط؟",
            answer: "لا، باقاتنا مصممة لتشمل 12 حصة خلال الشهر الواحد."
          },
          {
            question: "هل الكتاب المرفق مطبوع؟",
            answer: "الكتاب المعتمد هو كتاب إلكتروني (PDF) يرسل إليكِ رقمياً، ولا يتوفر كتاب مطبوع."
          }
        ],
        reviews: []
      }
    };

    const finalShops: any[] = [];

    shopsData.records.forEach((sRec: any) => {
      const f = sRec.fields;
      const originalName = f["اسم المتجر"];
      if (!originalName) return; // skip empty or incomplete shops

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

      // Find products that are linked to this specific shop
      const shopProducts = productsList.filter((p: any) => p.shopLinks.includes(sRec.id));

      const logoUrl = f["صورة اللوجو"]?.[0]?.url || "https://images.unsplash.com/photo-1544816155-12df9643f363?w=600";
      const instagramUrl = f["الانستقرام"] || f["انستقرام"] || "";
      const whatsappLink = f["رابط الواتساب"] || f["واتساب"] || "";
      
      // Parse WhatsApp phone number from the link using robust parser
      const whatsappPhone = parseWhatsAppPhone(whatsappLink);

      // Collect all available reviews for this shop and deduplicate them
      const staticReviews = meta.reviews || [];
      const localShopsReviews = localReviews[sRec.id] || [];
      const airtableShopIdReviews = reviewsByShopId[sRec.id] || [];
      const airtableShopNameReviews = reviewsByShopId[nameKey] || [];

      const seenComments = new Set<string>();
      const combinedReviews: any[] = [];
      [...staticReviews, ...localShopsReviews, ...airtableShopIdReviews, ...airtableShopNameReviews].forEach((rev: any) => {
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

    res.json(finalShops);
  } catch (error: any) {
    console.error("Error loading Airtable shops data:", error);
    res.status(500).json({ error: error.message || "Failed to load dynamic store listings from Airtable" });
  }
});

// API: Create Review in Airtable
app.post("/api/reviews", async (req, res) => {
  const { shopId, shopName, user, comment } = req.body;

  if (!shopId || !user || !comment) {
    return res.status(400).json({ error: "بيانات التقييم ناقصة" });
  }

  // Save locally first to guarantee persistence
  saveLocalReview(shopId, { user, comment });

  try {
    const tableCandidates = [TABLE_REVIEWS, "الآراء", "Reviews", "التقييمات"];
    let posted = false;
    let errorDetail = "";

    for (const tableName of tableCandidates) {
      const fields: Record<string, any> = {};
      
      if (tableName === "الآراء" || tableName === "التقييمات" || tableName === TABLE_REVIEWS) {
        fields["اسم العميل"] = user;
        fields["التعليق"] = comment;
        fields["المتاجر"] = [shopId];
      } else {
        fields["User"] = user;
        fields["Comment"] = comment;
        fields["Shop"] = [shopId];
      }

      const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          records: [{ fields }]
        })
      });

      if (response.ok) {
        console.log(`Successfully saved review to Airtable table: ${tableName}`);
        posted = true;
        break;
      } else {
        const errJson = await response.json().catch(() => ({}));
        errorDetail = JSON.stringify(errJson);
        console.log(`Info: Saving review to Airtable table ${tableName} returned:`, errorDetail);
      }
    }

    res.json({ success: true, airtableSaved: posted, error: posted ? null : errorDetail });
  } catch (err: any) {
    console.error("Error saving review to Airtable:", err);
    res.json({ success: true, airtableSaved: false, error: err.message });
  }
});

// API: Create Order in Airtable (Bypassed for User Privacy)
app.post("/api/orders", async (req, res) => {
  // Directly return success without saving anything for privacy
  console.log("Order bypasses database/Airtable storage for user privacy.");
  res.json({ success: true, bypassed: true, message: "Order processed without saving for privacy" });
});

// Vite middleware for development or serving index.html in production
const startServer = async () => {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
};

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
