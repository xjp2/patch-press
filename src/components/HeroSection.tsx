import { useEffect, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import type { HeroContent } from '../AdminPanel';

interface HeroSectionProps {
  content: HeroContent;
  startCustomizing: () => void;
}

export function HeroSection({ content, startCustomizing }: HeroSectionProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const { 
    slides = [], 
    ctaText = 'Get Started',
    isFullWidth = true,
    titleAlignment = 'center',
    subtitleAlignment = 'center'
  } = content;

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // Auto-advance slides
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  if (slides.length === 0) {
    return null;
  }

  return (
    <section className={`relative overflow-hidden ${isFullWidth ? 'w-full' : 'max-w-7xl mx-auto'}`}>
      {/* Slides */}
      <div className="relative h-[500px] sm:h-[600px] lg:h-[700px]">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-all duration-700 ${
              index === currentSlide 
                ? 'opacity-100 translate-x-0' 
                : index < currentSlide 
                  ? 'opacity-0 -translate-x-full' 
                  : 'opacity-0 translate-x-full'
            }`}
          >
            {/* Background Image */}
            {slide.image && (
              <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${slide.image})` }}
              >
                <div className="absolute inset-0 bg-black/30" />
              </div>
            )}
            
            {/* Content */}
            <div className="relative h-full flex items-center justify-center px-4 sm:px-6 lg:px-8">
              <div 
                className={`text-center max-w-4xl mx-auto transition-all duration-1000 delay-300 ${
                  isLoaded && index === currentSlide ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
              >
                <h2 
                  className="font-heading text-4xl sm:text-5xl lg:text-7xl font-bold text-white mb-6 whitespace-pre-line"
                  style={{ textAlign: titleAlignment }}
                >
                  {slide.title}
                </h2>
                <p 
                  className="text-lg sm:text-xl lg:text-2xl text-white/90 mb-8 max-w-2xl mx-auto"
                  style={{ textAlign: subtitleAlignment }}
                >
                  {slide.subtitle}
                </p>
                <button
                  onClick={startCustomizing}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-pink text-white font-bold rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 text-lg"
                >
                  {ctaText}
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      {slides.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 hover:bg-white/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all z-10"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 hover:bg-white/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all z-10"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {slides.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                index === currentSlide 
                  ? 'bg-pink w-8' 
                  : 'bg-white/50 hover:bg-white/80'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default HeroSection;
