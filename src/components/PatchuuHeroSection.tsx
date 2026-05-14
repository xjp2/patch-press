import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import type { PatchuuHeroContent } from '../AdminPanel';
import { DoodleStar, DoodleHeart, DoodleSparkle, ScribbleCircle } from './StationeryDecorations';
import { PatchuuLogo } from './PatchuuLogo';

interface PatchuuHeroSectionProps {
  content: PatchuuHeroContent;
  startCustomizing: () => void;
}

export function PatchuuHeroSection({ content, startCustomizing }: PatchuuHeroSectionProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const {
    catLeftImage,
    catRightImage,
    flowerImage,
    heartImage,
    ctaText,
    backgroundColor = '#fdfbf7',
    toteBagImage,
    strawberryImage,
    keychainWhiteImage,
    pouchImage,
    keychainBlueImage
  } = content;

  return (
    <section
      className="relative min-h-screen overflow-hidden bg-paper-grid"
      style={{ backgroundColor }}
    >
      {/* SEO Text - Visually hidden but readable by search engines */}
      <h1 className="sr-only">
        Self-Design Adorable Keychains, Gifts & More with embroidery patches!
      </h1>
      {/* Floating scrapbook doodles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <DoodleStar className={`absolute top-[12%] left-[8%] opacity-50 transition-all duration-1000 ${isLoaded ? 'translate-y-0 opacity-50' : '-translate-y-4 opacity-0'}`} size={24} />
        <DoodleHeart className={`absolute top-[18%] right-[10%] opacity-40 transition-all duration-1000 delay-200 ${isLoaded ? 'translate-y-0 opacity-40' : '-translate-y-4 opacity-0'}`} size={20} />
        <DoodleSparkle className={`absolute top-[8%] right-[25%] opacity-45 transition-all duration-1000 delay-300 ${isLoaded ? 'translate-y-0 opacity-45' : '-translate-y-4 opacity-0'}`} size={18} />
        <ScribbleCircle className={`absolute bottom-[30%] left-[5%] opacity-35 transition-all duration-1000 delay-400 ${isLoaded ? 'translate-y-0 opacity-35' : '-translate-y-4 opacity-0'}`} size={32} />
        <DoodleStar className={`absolute bottom-[22%] right-[8%] opacity-40 transition-all duration-1000 delay-500 ${isLoaded ? 'translate-y-0 opacity-40' : '-translate-y-4 opacity-0'}`} size={18} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">

        {/* Logo Row with Cats - Mobile matches desktop proportions */}
        <div className={`flex items-center justify-center gap-2 sm:gap-6 lg:gap-8 mb-0 transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {/* Left Cat - Mobile sized like desktop */}
          <div className="w-28 sm:w-52 lg:w-64 flex-shrink-0">
            {catLeftImage && (
              <img
                src={catLeftImage}
                alt=""
                className="w-full h-auto transform -rotate-3 hover:rotate-0 transition-transform duration-500"
                aria-hidden="true"
              />
            )}
          </div>

          {/* Logo - Hand-drawn SVG */}
          <div className="flex-shrink-0">
            <PatchuuLogo height={180} className="h-24 sm:h-44 md:h-56 lg:h-64 w-auto" />
          </div>

          {/* Right Cat - Mobile sized like desktop */}
          <div className="w-32 sm:w-56 lg:w-72 flex-shrink-0">
            {catRightImage && (
              <img
                src={catRightImage}
                alt=""
                className="w-full h-auto transform rotate-2 hover:rotate-0 transition-transform duration-500"
                aria-hidden="true"
              />
            )}
          </div>
        </div>

        {/* Headline Row with Side Decorations - Half off screen */}
        <div className={`relative flex items-center justify-center mb-8 sm:mb-10 transition-all duration-1000 delay-200 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {/* Flower - Left side, half off-screen, mobile like desktop */}
          <div className="absolute -left-16 sm:-left-32 lg:-left-48 top-1/2 -translate-y-1/2 w-28 sm:w-52 lg:w-64">
            {flowerImage && (
              <img src={flowerImage} alt="" className="w-full h-auto opacity-95" aria-hidden="true" />
            )}
          </div>

          {/* Headline Text */}
          <h2 className="text-center text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-ink leading-snug tracking-wide px-4 sm:px-16 drop-shadow-sm">
            Self-Design Adorable Keychains, Gifts & More with Embroidery Patches!
          </h2>

          {/* Blue Heart - Right side, half off-screen, mobile like desktop */}
          <div className="absolute -right-16 sm:-right-32 lg:-right-40 top-1/2 -translate-y-1/2 w-24 sm:w-48 lg:w-60">
            {heartImage && (
              <img src={heartImage} alt="" className="w-full h-auto opacity-90" aria-hidden="true" />
            )}
          </div>
        </div>

        {/* CTA Button — Hand-drawn scrapbook style */}
        <div className={`relative z-10 flex justify-center mb-4 transition-all duration-1000 delay-400 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <button
            onClick={startCustomizing}
            className="inline-flex items-center gap-3 px-10 py-4 bg-cardstock-yellow text-ink font-bold border-[2.5px] border-ink rounded-[1.25rem] shadow-[4px_4px_0px_rgba(45,45,45,0.15)] hover:shadow-[6px_6px_0px_rgba(45,45,45,0.25)] hover:scale-105 hover:-rotate-1 transition-all duration-300 text-lg"
          >
            {ctaText || 'Start Designing'}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* Products Showcase - Mobile matches desktop alignment */}
        <div className={`relative h-64 sm:h-72 lg:h-80 transition-all duration-1000 delay-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
          {/* Tote Bag - Mobile like desktop */}
          <div className="absolute -left-12 sm:-left-32 lg:-left-36 bottom-20 w-28 sm:w-64 lg:w-96 transform -rotate-14 hover:-translate-y-2 transition-all duration-300">
            {toteBagImage && (
              <img
                src={toteBagImage}
                alt="Canvas tote bag with embroidery"
                className="w-full h-auto drop-shadow-xl"
              />
            )}
          </div>

          {/* Strawberry - Mobile like desktop */}
          <div className="absolute left-[18%] sm:left-[20%] bottom-20 w-14 sm:w-48 lg:w-48 transform -rotate-6">
            {strawberryImage && (
              <img src={strawberryImage} alt="" className="w-full h-auto" aria-hidden="true" />
            )}
          </div>

          {/* White Keychain - Mobile like desktop */}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-12 sm:bottom-8 w-24 sm:w-40 lg:w-96 transform rotate-45 hover:-translate-y-1 transition-all duration-300">
            {keychainWhiteImage && (
              <img
                src={keychainWhiteImage}
                alt="White leather keychain"
                className="w-full h-auto drop-shadow-lg"
              />
            )}
          </div>

          {/* Pouch - Mobile like desktop */}
          <div className="absolute right-[3%] sm:right-[8%] bottom-6 w-32 sm:w-60 lg:w-72 transform rotate-6 hover:-translate-y-2 transition-all duration-300">
            {pouchImage && (
              <img
                src={pouchImage}
                alt="Beige canvas pouch with patches"
                className="w-full h-auto drop-shadow-xl"
              />
            )}
          </div>

          {/* Blue Keychain - Mobile like desktop */}
          <div className="absolute -right-12 sm:-right-16 lg:-right-64 bottom-48 w-28 sm:w-64 lg:w-96 transform -rotate-15 hover:-translate-y-1 transition-all duration-300">
            {keychainBlueImage && (
              <img
                src={keychainBlueImage}
                alt="Blue leather keychain"
                className="w-full h-auto drop-shadow-lg"
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default PatchuuHeroSection;
