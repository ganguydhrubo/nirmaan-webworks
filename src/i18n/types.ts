export type SupportedLocale = 'en' | 'bn' | 'hi';

export interface TranslationDictionary {
  meta: {
    langName: string;
    langCode: SupportedLocale;
    htmlLang: string;
  };
  common: Record<string, string>;
  nav: Record<string, string>;
  hero: Record<string, string>;
  enquiryCards: Record<string, { name: string; category: string; city: string; text: string; time: string; tag: string }>;
  categories: Record<string, string>;
  problem: Record<string, string>;
  whatWeBuild: Record<string, string>;
  industryShowcase: Record<string, string>;
  whyUs: Record<string, string>;
  process: Record<string, string>;
  evaluatorTeaser: Record<string, string>;
  roiCalculator: Record<string, any>;
  pricingTeaser: Record<string, string>;
  proof: Record<string, string>;
  servicesTeaser: Record<string, string>;
  faqTeaser: Record<string, string>;
  finalCta: Record<string, string>;
  footer: Record<string, string>;
  dock: Record<string, string>;
  enquiryForm: Record<string, string>;
  whatsappMessages: Record<string, string>;
}
