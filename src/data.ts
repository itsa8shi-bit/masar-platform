import { Shop } from "./types";

// @ts-ignore
import boxImage from "./components/images/box.jpg";
// @ts-ignore
import cardImage from "./components/images/card.jpg";
// @ts-ignore
import chineseBookImage from "./components/images/chinese book.jpg";
// @ts-ignore
import highlightImage from "./components/images/highlight.PNG";
// @ts-ignore
import langFlags from "./components/images/language_lessons_flags_1782129988498.jpg";
// @ts-ignore
import masraLogoImage from "./components/images/masra logo.jpg";
// @ts-ignore
import polyglotLogoImage from "./components/images/polyglot ashi logo.jpg";
// @ts-ignore
import togethryLogoImage from "./components/images/togethry .png";
// @ts-ignore
import postDesignImage from "./components/images/post_design.png";

export const BOUTIQUE_SHOPS: Shop[] = [
  {
    id: "1",
    name: "Togethry design studio",
    category: "تصميم جرافيكي وبناء مواقع",
    description: "نساعد المشاريع الصغيرة، الشركات، البراندات، وحتى حسابات الطلاب، في تبني هوية واضحة واحترافية. أؤمن بأن كل فكرة — مهما كانت صغيرة — تستحق شكلاً قوياً يعكس قيمتها. أعمل على تطوير الهوية البصرية، المحتوى، والتغليف، وبناء مواقع إلكترونية احترافية، بحيث يتحول الحساب من عشوائي إلى منظم وواثق. هدفي هو أن أكون داعماً حقيقياً لكل شخص طموح يتمنى أن يكبر.",
    image: togethryLogoImage,
    instagram: "https://www.instagram.com/togethry.design/",
    rating: 4.9,
    featured: true,
    tags: ["هوية بصرية", "تصميم لوجو", "بناء مواقع", "تصميم بوست"],
    location: "اليمن",
    whatsappPhone: "967770007059",
    products: [
      {
        id: "p1-1",
        name: "تصميم لوقو احترافي",
        price: 7500,
        description: "السعر يختلف حسب الوقت والمجهود المخصص للتصميم، لكن السعر لا يتجاوز 7,500 ريال كحد أقصى.",
        image: masraLogoImage,
        sizes: ["ايقونة", "شعار نصي", "نصوص مع ايقونة"]
      },
      {
        id: "p1-2",
        name: "تصميم بوست",
        price: 1500,
        description: "تصميم وتطوير منشورات احترافية تبرز هوية حسابك بأسلوب مميز وجذاب.",
        image: postDesignImage,
        sizes: ["كاروسيل تعريفي", "بوست واحد"]
      },
      {
        id: "p1-3",
        name: "تصميم هايلايت انستقرام",
        price: 500,
        description: "تصميم وتنسيق أيقونات هايلايت مخصصة لصفحتك على إنستقرام لتبدو متناسقة وجذابة. السعر للهايلايت الواحد.",
        image: highlightImage,
        sizes: ["٣ هايلايت", "٥ هايلايت", "١٠ هايلايت"]
      },
      {
        id: "p1-4",
        name: "تصميم تغليف",
        price: 10000,
        description: "هام جداً: التصميم فقط علينا، ولا نقوم بتوفير خدمات الطباعة.",
        image: boxImage,
        sizes: ["بوكس", "كيس", "بوكس و كيس"]
      },
      {
        id: "p1-5",
        name: "تصميم كرت",
        price: 6500,
        description: "الكرت دائماً يأتي بتصميم مميز ومتناسق للوجهين.",
        image: cardImage,
        sizes: ["كرت شكر", "كرت تعريفي"]
      }
    ],
    reviews: [
      { user: "متجر أورمان", comment: "الجودة ممتازة، التسليم كان سريعاً، وكل شيء كان ممتازاً." },
      { user: "متجر غيمة", comment: "اللوجو كان ممتازاً جداً والمعاملة لطيفة، والجميع أصبح يسألني عن اللوجو ومن أين صممته." }
    ],
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
    ]
  },
  {
    id: "2",
    name: "polyglot ashi",
    category: "حصص اونلاين و كتب الكترونية",
    description: "أنا أسيل، أو آشي، صفحتي polyglot ashi هي صفحة تعليمية وشخصية أشارك فيها تجربتي في تعلم اللغات وتطوير المهارات. أتحدث أربع لغات وأتعلم لغتي الخامسة حالياً، وأقدم محتوى عملي يساعد المتابعين على تعلم اللغات بطرق فعالة، بالإضافة إلى حصص أونلاين في اللغة الإنجليزية والصينية للمبتدئين والراغبين بتطوير مستواهم.",
    image: polyglotLogoImage,
    instagram: "https://www.instagram.com/polyglot_ashi/",
    rating: 4.5,
    featured: true,
    tags: ["تعلم اللغات", "حصص مباشر", "كتاب لغات", "بناء المهارات"],
    location: "اليمن",
    whatsappPhone: "967770007059",
    products: [
      {
        id: "p2-1",
        name: "حصص اونلاين",
        price: 100,
        description: "الحصص تفاعلية ومباشرة أونلاين. السعر هو 100 ريال سعودي شهرياً مقابل 12 حصة بالشهر، مدة دورتنا ساعة لكل حصة، تشمل واجبات إلكترونية ومتابعة ومراجعات دورية لضمان النتيجة المرجوة بالتحدث بطلاقة.",
        image: langFlags,
        sizes: ["انجليزي مبتدىء", "انجليزي متقدم", "صيني مبتدىء", "صيني من الصفر"]
      },
      {
        id: "p2-2",
        name: "كتاب اللغة الصينية من الصفر الى الحوار",
        price: 36.99,
        description: "كتاب إلكتروني PDF متكامل يشرح أساسيات ومفردات اللغة الصينية بأسلوب بسيط وشيق جاهز للطباعة الفورية والدراسة في أي مكان.",
        image: chineseBookImage,
        sizes: []
      }
    ],
    reviews: [],
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
    ]
  }
];

export const CATEGORIES = [
  "الكل",
  "تصميم جرافيكي وبناء مواقع",
  "حصص اونلاين و كتب الكترونية"
];

export const LOCATIONS = [
  "الكل",
  "اليمن"
];
