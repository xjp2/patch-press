

import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Notice } from './AdminPanel';

interface HeroGalleryProps {
    notices: Notice[];
}

interface HeroSlide {
    id: string;
    title: string;
    content: string;
    image: string;
    type: string;
    isDefault: boolean;
}

export function HeroGallery({ notices }: HeroGalleryProps) {
    const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [Autoplay({ delay: 6000 })]);

    const scrollPrev = () => emblaApi && emblaApi.scrollPrev();
    const scrollNext = () => emblaApi && emblaApi.scrollNext();

    // Map notices to slides
    let slides: HeroSlide[] = notices.map(n => ({
        id: n.id,
        title: n.title,
        content: n.content,
        image: n.image || '/products/tote-bag.png', // Fallback
        type: n.type,
        isDefault: false
    }));

    if (slides.length === 0) {
        slides = [
            { id: 'default-1', title: 'Design Your Own Keychain', content: 'Choose your item, pick your patches, and make it yours!', image: 'https://images.unsplash.com/photo-1589363460779-cd717d2ed1f6?q=80&w=2671&auto=format&fit=crop', type: 'new-product', isDefault: true },
            { id: 'default-2', title: 'New Summer Collection', content: 'Check out our new fruit-themed patches!', image: 'https://images.unsplash.com/photo-1621332847526-772922650cd3?q=80&w=2670&auto=format&fit=crop', type: 'promotion', isDefault: true }
        ];
    }

    return (
        <div className="relative overflow-hidden bg-cream h-[80vh] min-h-[600px] group">
            <div className="w-full h-full" ref={emblaRef}>
                <div className="flex h-full">
                    {slides.map((slide) => (
                        <div key={slide.id} className="flex-[0_0_100%] min-w-0 relative h-full">
                            {/* Background Image - No Gradient as requested */}
                            <div className="absolute inset-0">
                                <img
                                    src={slide.image}
                                    alt={slide.title}
                                    className="w-full h-full object-cover transition-transform duration-[10s] ease-in-out hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-black/10" /> {/* Very subtle overlay for text readability only */}
                            </div>

                            {/* Content Overlay */}
                            <div className="absolute inset-0 flex flex-col justify-end pb-24 px-8 sm:px-16 max-w-7xl mx-auto w-full">
                                <div className="z-10 text-left animate-slide-up">
                                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full mb-6 border border-white/20">
                                        <Sparkles className="w-4 h-4 text-pink-300" />
                                        <span className="text-sm font-semibold text-white tracking-wide uppercase">{slide.type === 'new-product' ? 'New Arrival' : slide.type === 'promotion' ? 'Special Offer' : 'Announcement'}</span>
                                    </div>
                                    <h1 className="font-heading text-5xl sm:text-7xl font-bold text-white mb-6 leading-tight drop-shadow-lg max-w-4xl">
                                        {slide.title}
                                    </h1>
                                    <p className="text-lg sm:text-2xl text-white/90 mb-10 max-w-2xl font-light leading-relaxed drop-shadow-md">
                                        {slide.content}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Navigation Arrows */}
            <button
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all opacity-0 group-hover:opacity-100"
                onClick={scrollPrev}
            >
                <ChevronLeft className="w-6 h-6" />
            </button>
            <button
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all opacity-0 group-hover:opacity-100"
                onClick={scrollNext}
            >
                <ChevronRight className="w-6 h-6" />
            </button>

            {/* Custom Styles for this component only */}
            <style>{`
                .btn-primary-white {
                    background-color: white;
                    color: #ec4899;
                    font-weight: bold;
                    border-radius: 9999px;
                }
                .btn-primary-white:hover {
                    background-color: #fce7f3;
                }
            `}</style>
        </div>
    );
}
