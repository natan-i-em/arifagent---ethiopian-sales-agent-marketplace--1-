'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'am';

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (path: string, fallback?: string) => string;
}

const STORAGE_KEY = 'azwari_language_preference';

export const translations = {
  en: {
    nav: {
      brandTagline: 'Addis Ababa, Ethiopia',
      products: 'Products',
      signIn: 'Sign In',
      getStarted: 'Get Started',
      signOut: 'Sign Out',
      agent: 'Agent',
      merchant: 'Merchant',
      admin: 'Admin',
      agentWorkspace: 'Agent Workspace & Catalog',
      supplierConsole: 'Supplier Operations & Fulfillment',
      adminConsole: 'Admin Console',
      language: 'Language',
    },
    hero: {
      headlinePart1: 'Your products, sold by ',
      headlineHighlight: 'many agents',
      headlinePart2: '. Pay only when they sell.',
      subheadline: 'Merchants list a product and set the commission. Agents sell it on TikTok, Telegram, WhatsApp or face to face, and earn when it sells.',
      startSelling: 'Start selling',
      listProduct: 'List your product',
      openAgent: 'Open Agent Workspace',
      openMerchant: 'Open Merchant Console',
      openPortal: 'Open Portal',
      eyebrow: 'Addis Ababa · Verified Sales Marketplace',
    },
    roles: {
      sectionBadge: 'Two Ways to Join',
      sectionTitle: 'Choose how you want to use Azwari',
      agentBadge: '✦ No Capital Needed',
      agentTitle: 'Sales Agent',
      agentDesc: 'Sell and earn. Pick a product, share it, and get paid when it sells. No capital needed.',
      agentCta: 'Start selling',
      merchantBadge: '✦ Pay on Sales',
      merchantTitle: 'Merchant',
      merchantDesc: 'Get more sales. List your product, set your commission, and agents do the selling.',
      merchantCta: 'List your product',
    },
    promises: {
      p1Title: 'No upfront cost to sell',
      p1Desc: 'Free to join, zero initial capital needed.',
      p2Title: 'Paid by Telebirr or CBE',
      p2Desc: 'Direct transfers straight to your phone or bank.',
      p3Title: 'Delivery across Addis Ababa',
      p3Desc: 'Fast pickup and drop-off in every subcity.',
      p4Title: 'Commission fixed before every sale',
      p4Desc: 'Your agreed rate cannot be changed later.',
    },
    trust: {
      title: 'Why people trust Azwari',
      t1Title: 'Your commission is locked',
      t1Desc: "The commission agreed when an order is made can't be changed later.",
      t2Title: 'Simple for buyers',
      t2Desc: 'Buyers get a text message and pay by Telebirr or CBE. No app, no sign-up.',
      t3Title: 'Agents always get paid',
      t3Desc: 'Merchants keep a deposit on Azwari to cover commissions.',
    },
    calculator: {
      badge: 'Earnings Calculator',
      title: 'How much can you earn?',
      subtitle: "Pick a product, choose how many you'll sell, and see your commission.",
      chooseProduct: 'Choose a product:',
      unitsSlider: 'Units you expect to sell per month:',
      unitsLabel: 'units',
      youEarn: 'You earn',
      totalSales: 'Total sales:',
      merchantReceives: 'Merchant receives:',
      cta: 'Start selling this product',
      projectionBadge: '✦ Your Projection',
      monthlyNet: 'Monthly Net',
    },
    catalog: {
      readyInventory: 'Ready Inventory',
      title: 'Products you can sell today',
      subtitle: 'Verified merchants in Addis Ababa, ready to deliver.',
      seeAll: 'See all products',
      price: 'Price:',
      yourCommission: 'Your commission:',
      deliveryAreas: 'Delivery areas:',
      details: 'Details',
      sellThis: 'Sell this',
      viewPhoto: 'View photo',
      verified: 'Verified',
      fixedUnit: 'unit',
      ofOrder: 'of order',
    },
    footer: {
      desc: 'Azwari connects Ethiopian product owners with independent sales agents. Operating in Addis Ababa.',
      forAgents: 'For agents',
      agentPortal: 'Agent portal',
      howItWorks: 'How it works',
      calc: 'Commission calculator',
      forMerchants: 'For merchants',
      merchantConsole: 'Merchant console',
      listAProduct: 'List a product',
      depositWorks: 'How the deposit works',
      payments: 'Payments',
      help: 'Help',
      contactUs: 'Contact us',
      faq: 'FAQ',
      terms: 'Terms of Service',
      privacy: 'Privacy Policy',
      copyright: '© 2026 Azwari PLC. All rights reserved. Addis Ababa, Ethiopia.',
    },
    common: {
      currency: 'ETB',
      loading: 'Loading...',
    }
  },
  am: {
    nav: {
      brandTagline: 'አዲስ አበባ፣ ኢትዮጵያ',
      products: 'ምርቶች',
      signIn: 'ግባ',
      getStarted: 'ይቀላቀሉ',
      signOut: 'ውጣ',
      agent: 'ሽያጭ ወኪል',
      merchant: 'ነጋዴ',
      admin: 'አስተዳዳሪ',
      agentWorkspace: 'የወኪል የስራ ገጽ እና ካታሎግ',
      supplierConsole: 'የአቅራቢ ኦፕሬሽን እና ርክክብ',
      adminConsole: 'የአስተዳዳሪ ኮንሶል',
      language: 'ቋንቋ',
    },
    hero: {
      headlinePart1: 'የእርስዎ ምርቶች፣ በብዙ ',
      headlineHighlight: 'ወኪሎች',
      headlinePart2: ' ይሸጣሉ። ሲሸጥ ብቻ ይክፈሉ።',
      subheadline: 'ነጋዴዎች ምርታቸውን ይዘረዝራሉ፣ ኮሚሽን ይወስናሉ። ወኪሎች በቲክቶክ፣ ቴሌግራም፣ ዋትስአፕ ወይም ፊት ለፊት ይሸጣሉ፣ ሲሸጥ ገቢ ያገኛሉ።',
      startSelling: 'መሸጥ ጀምር',
      listProduct: 'ምርትዎን ይመዝግቡ',
      openAgent: 'የወኪል የስራ ገጽ ክፈት',
      openMerchant: 'የነጋዴ ኮንሶል ክፈት',
      openPortal: 'ፖርታል ክፈት',
      eyebrow: 'አዲስ አበባ · የተረጋገጠ የሽያጭ ገበያ',
    },
    roles: {
      sectionBadge: 'ለመቀላቀል 2 አማራጮች',
      sectionTitle: 'አዝዋሪን እንዴት መጠቀም እንደሚፈልጉ ይምረጡ',
      agentBadge: '✦ ምንም ካፒታል አያስፈልግም',
      agentTitle: 'የሽያጭ ወኪል',
      agentDesc: 'ይሽጡ እና ያግኙ። ምርት ይምረጡ፣ ያጋሩ፣ ሲሸጥ ይከፈሉ። ምንም መነሻ ካፒታል አያስፈልግም።',
      agentCta: 'መሸጥ ጀምር',
      merchantBadge: '✦ በሽያጭ ላይ ብቻ ይክፈሉ',
      merchantTitle: 'ነጋዴ / አቅራቢ',
      merchantDesc: 'የሽያጭ መጠንዎን ያሳድጉ። ምርትዎን ይመዝግቡ፣ ኮሚሽን ይወስኑ፣ ወኪሎች ይሽጡልዎታል።',
      merchantCta: 'ምርትዎን ይመዝግቡ',
    },
    promises: {
      p1Title: 'ለመሸጥ ምንም የቅድሚያ ክፍያ የለም',
      p1Desc: 'በነጻ ይቀላቀሉ፣ ምንም መነሻ ካፒታል አያስፈልግም።',
      p2Title: 'ክፍያ በቴሌብር ወይም በንግድ ባንክ',
      p2Desc: 'ቀጥታ ወደ ስልክዎ ወይም ባንክ ሂሳብዎ የሚላክ ክፍያ።',
      p3Title: 'ማድረስ በመላው አዲስ አበባ',
      p3Desc: 'በሁሉም ክፍለ ከተሞች ፈጣን ርክክብ።',
      p4Title: 'ከሽያጭ በፊት የተወሰነ ኮሚሽን',
      p4Desc: 'የተስማሙበት የኮሚሽን መጠን በኋላ አይቀየርም።',
    },
    trust: {
      title: 'ሰዎች አዝዋሪን ለምን ያምናሉ',
      t1Title: 'ኮሚሽንዎ የተቆለፈ ነው',
      t1Desc: 'ትዕዛዝ ሲፈጠር የተስማሙበት ኮሚሽን በኋላ ሊቀየር አይችልም።',
      t2Title: 'ለገዢዎች እጅግ ቀላል ነው',
      t2Desc: 'ገዢዎች በኤስኤምኤስ መልዕክት ይደርሳቸዋል፣ በቴሌብር ወይም በንግድ ባንክ ይከፍላሉ። ምንም መተግበሪያ አያስፈልግም።',
      t3Title: 'ወኪሎች ሁልጊዜ ይከፈላቸዋል',
      t3Desc: 'ነጋዴዎች ኮሚሽኖችን ለመሸፈን በአዝዋሪ ላይ ተቀማጭ ሂሳብ ይይዛሉ።',
    },
    calculator: {
      badge: 'የገቢ ማስያ',
      title: 'ምን ያህል ማግኘት ይችላሉ?',
      subtitle: 'ምርት ይምረጡ፣ ምን ያህል እንደሚሸጡ ይወስኑ፣ ኮሚሽንዎን ይመልከቱ።',
      chooseProduct: 'ምርት ይምረጡ፦',
      unitsSlider: 'በወር ይሸጣሉ ተብሎ የሚጠበቅ ብዛት፦',
      unitsLabel: 'ፍሬ',
      youEarn: 'እርስዎ የሚያገኙት',
      totalSales: 'ጠቅላላ ሽያጭ፦',
      merchantReceives: 'ነጋዴው የሚቀበለው፦',
      cta: 'ይህን ምርት መሸጥ ጀምር',
      projectionBadge: '✦ የእርስዎ ትንበያ',
      monthlyNet: 'የወር የተጣራ',
    },
    catalog: {
      readyInventory: 'ዝግጁ ምርቶች',
      title: 'ዛሬ መሸጥ የሚችሏቸው ምርቶች',
      subtitle: 'የተረጋገጡ የአዲስ አበባ ነጋዴዎች፣ ለማድረስ ዝግጁ።',
      seeAll: 'ሁሉንም ምርቶች ይመልከቱ',
      price: 'ዋጋ፦',
      yourCommission: 'የእርስዎ ኮሚሽን፦',
      deliveryAreas: 'የሚደርስባቸው ቦታዎች፦',
      details: 'ዝርዝር',
      sellThis: 'ይህን ሽጥ',
      viewPhoto: 'ፎቶ ይመልከቱ',
      verified: 'የተረጋገጠ',
      fixedUnit: 'በአንድ ፍሬ',
      ofOrder: 'ከትዕዛዙ',
    },
    footer: {
      desc: 'አዝዋሪ የኢትዮጵያ ምርት ባለቤቶችን ከነጻ የሽያጭ ወኪሎች ጋር ያገናኛል። አዲስ አበባ ውስጥ ይሰራል።',
      forAgents: 'ለሽያጭ ወኪሎች',
      agentPortal: 'የወኪል ፖርታል',
      howItWorks: 'እንዴት ይሰራል',
      calc: 'የኮሚሽን ማስያ',
      forMerchants: 'ለነጋዴዎች',
      merchantConsole: 'የነጋዴ ኮንሶል',
      listAProduct: 'ምርት ይመዝግቡ',
      depositWorks: 'ተቀማጭ እንዴት ይሰራል',
      payments: 'የክፍያ መንገዶች',
      help: 'እርዳታ',
      contactUs: 'ያግኙን',
      faq: 'ተደጋጋሚ ጥያቄዎች',
      terms: 'የአገልግሎት ውሎች',
      privacy: 'የግላዊነት ፖሊሲ',
      copyright: '© 2026 አዝዋሪ ኃ/የተ/የግ/ማ። መብቱ በህግ የተጠበቀ ነው። አዲስ አበባ፣ ኢትዮጵያ።',
    },
    common: {
      currency: 'ብር',
      loading: 'በመጫን ላይ...',
    }
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Language;
      if (saved === 'am' || saved === 'en') {
        setLanguageState(saved);
      }
    } catch {}
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {}
  };

  const toggleLanguage = () => {
    const nextLang = language === 'en' ? 'am' : 'en';
    setLanguage(nextLang);
  };

  const t = (path: string, fallback?: string): string => {
    const keys = path.split('.');
    
    // 1. Try active language
    let current: any = translations[language];
    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        current = undefined;
        break;
      }
    }
    if (typeof current === 'string') return current;

    // 2. Fallback to English
    let enCurrent: any = translations.en;
    for (const k of keys) {
      if (enCurrent && typeof enCurrent === 'object' && k in enCurrent) {
        enCurrent = enCurrent[k];
      } else {
        enCurrent = undefined;
        break;
      }
    }
    if (typeof enCurrent === 'string') return enCurrent;

    return fallback || path;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

