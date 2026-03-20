
import { ArrowRight, ChevronLeft, ChevronRight, Instagram, Facebook, Twitter, Palette } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import type { Notice, SiteContent, HeroContent, HowItWorksContent, GalleryContent, TextBlockContent, ImageBannerContent, TestimonialsContent, CtaContent, DividerContent, TransitionContent, PageSection } from './AdminPanel';

interface LandingPageProps {
    notices: Notice[];
    startCustomizing: () => void;
    siteContent: SiteContent;
}

// ── Scroll reveal hook ──
function useScrollReveal<T extends HTMLElement>(threshold = 0.15) {
    const ref = useRef<T>(null);
    const [isRevealed, setIsRevealed] = useState(false);

    const handleIntersect = useCallback(([entry]: IntersectionObserverEntry[]) => {
        if (entry.isIntersecting) {
            setIsRevealed(true);
        }
    }, []);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(handleIntersect, { threshold });
        observer.observe(el);
        return () => observer.disconnect();
    }, [handleIntersect, threshold]);

    return { ref, isRevealed };
}

// ── Individual section renderers ──

function HeroSection({ section, startCustomizing, notices: initialNotices }: { section: PageSection; startCustomizing: () => void; notices: Notice[] }) {
    const c = section.content as HeroContent;
    const [notices] = useState<Notice[]>(initialNotices);
    const [heroIndex, setHeroIndex] = useState(0);
    const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');

    const heroSlides = (c.showNoticesOverride && notices.length > 0)
        ? notices.map(n => ({
            title: n.title,
            content: n.content,
            image: n.image,
            ctaText: c.ctaText || 'Learn More',
            ctaAction: 'link' as const,
            ctaLink: '',
            isFullWidth: c.isFullWidth
        }))
        : c.slides.map(s => ({
            title: s.title,
            content: s.subtitle,
            image: s.image,
            ctaText: s.ctaText || c.ctaText || 'Learn More',
            ctaAction: s.ctaAction || 'customize',
            ctaLink: s.ctaLink || '',
            isFullWidth: s.isFullWidth !== undefined ? s.isFullWidth : c.isFullWidth
        }));

    const nextSlide = useCallback(() => {
        setSlideDirection('right');
        setHeroIndex((prev) => (prev + 1) % heroSlides.length);
    }, [heroSlides.length]);
    
    const prevSlide = useCallback(() => {
        setSlideDirection('left');
        setHeroIndex((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
    }, [heroSlides.length]);
    
    const goToSlide = useCallback((index: number) => {
        setSlideDirection(index > heroIndex ? 'right' : 'left');
        setHeroIndex(index);
    }, [heroIndex]);

    // Auto-advance timer that resets when user manually changes slides
    useEffect(() => {
        if (heroSlides.length <= 1) return;
        const timer = setInterval(() => {
            setSlideDirection('right');
            setHeroIndex((prev) => (prev + 1) % heroSlides.length);
        }, 7000);
        return () => clearInterval(timer);
    }, [heroSlides.length, heroIndex]);

    const currentSlide = heroSlides[heroIndex];

    const handleCtaClick = (action: string, link?: string) => {
        if (action === 'startdesigning' || action === 'customize') {
            startCustomizing();
        } else if (action === 'scroll') {
            window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
        } else if (action === 'link' && link) {
            if (link.startsWith('http')) window.open(link, '_blank');
            else window.location.href = link;
        } else {
            startCustomizing();
        }
    };

    return (
        <section className={`relative overflow-hidden min-h-[85vh] flex items-center group`}>
            {/* Background Layer */}
            {currentSlide.isFullWidth ? (
                <div className="absolute inset-0 z-0">
                    <img src={currentSlide.image} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
                </div>
            ) : (
                <div className="absolute inset-0 opacity-[0.03] z-0" style={{ backgroundImage: 'radial-gradient(#3a3530 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
            )}

            {/* Main slide content - single key for uniform animation */}
            <div 
                key={heroIndex}
                className={`max-w-7xl mx-auto px-6 w-full grid lg:grid-cols-2 gap-8 lg:gap-12 items-center py-16 relative z-10 ${slideDirection === 'right' ? 'animate-hero-right' : 'animate-hero-left'}`}
            >
                {/* Left content */}
                <div className="flex flex-col gap-6">
                    <h1 className={`font-heading text-5xl sm:text-6xl lg:text-7xl font-bold text-balance whitespace-pre-line ${currentSlide.isFullWidth ? 'text-white' : 'text-[#3a3530]'}`}>
                        {currentSlide.title}
                    </h1>
                    <p className={`text-lg sm:text-xl max-w-prose leading-relaxed ${currentSlide.isFullWidth ? 'text-white/90' : 'text-[#7a7570]'}`}>
                        {currentSlide.content}
                    </p>
                    <button
                        onClick={() => handleCtaClick(currentSlide.ctaAction, currentSlide.ctaLink)}
                        className={`self-start inline-flex items-center gap-3 px-8 py-4 rounded-full text-lg font-semibold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${currentSlide.isFullWidth
                            ? 'bg-white text-[#3a3530] hover:bg-pink hover:text-white focus-visible:ring-white'
                            : 'bg-[#6b8f71] text-white hover:bg-[#5a7e60] shadow-[#6b8f71]/20 hover:shadow-[#6b8f71]/30 focus-visible:ring-[#6b8f71]'
                            }`}
                    >
                        {currentSlide.ctaText} <ArrowRight className="w-5 h-5" />
                    </button>
                </div>

                {!currentSlide.isFullWidth && (
                    <div className="relative flex items-center justify-center min-h-[450px]">
                        <img
                            src={currentSlide.image || '/products/tote-bag.png'}
                            alt="Featured Product"
                            className="relative z-10 max-h-[420px] w-auto object-contain drop-shadow-2xl transition-all duration-700 cursor-pointer hover:scale-105"
                            onClick={() => handleCtaClick(currentSlide.ctaAction, currentSlide.ctaLink)}
                        />
                        {/* Background blobs for floating image */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink/5 rounded-full blur-3xl" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#6b8f71]/5 rounded-full blur-3xl translate-x-10 translate-y-10" />
                    </div>
                )}
            </div>

            {/* Fixed position navigation for ALL slide types */}
            {heroSlides.length > 1 && (
                <>
                    {/* Left Arrow - fixed position, no transition-all to prevent jitter */}
                    <button 
                        onClick={prevSlide} 
                        className={`absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 w-12 h-12 sm:w-14 sm:h-14 rounded-full backdrop-blur-md flex items-center justify-center z-20
                            ${currentSlide.isFullWidth 
                                ? 'bg-white/10 text-white opacity-0 group-hover:opacity-100 hover:bg-white/20 transition-opacity' 
                                : 'bg-[#3a3530]/5 text-[#3a3530] opacity-60 hover:opacity-100 hover:bg-[#3a3530]/10 transition-opacity'}`}
                    >
                        <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
                    </button>
                    
                    {/* Right Arrow - fixed position, no transition-all to prevent jitter */}
                    <button 
                        onClick={nextSlide} 
                        className={`absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 w-12 h-12 sm:w-14 sm:h-14 rounded-full backdrop-blur-md flex items-center justify-center z-20
                            ${currentSlide.isFullWidth 
                                ? 'bg-white/10 text-white opacity-0 group-hover:opacity-100 hover:bg-white/20 transition-opacity' 
                                : 'bg-[#3a3530]/5 text-[#3a3530] opacity-60 hover:opacity-100 hover:bg-[#3a3530]/10 transition-opacity'}`}
                    >
                        <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
                    </button>
                    
                    {/* Slide indicators (dots) - ALWAYS at bottom center for ALL slide types */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                        {heroSlides.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => goToSlide(i)}
                                className={`h-2 rounded-full transition-all duration-300 ${i === heroIndex 
                                    ? (currentSlide.isFullWidth ? 'w-8 bg-white' : 'w-8 bg-[#3a3530]') 
                                    : (currentSlide.isFullWidth ? 'w-2 bg-white/40 hover:bg-white/60' : 'w-2 bg-[#3a3530]/30 hover:bg-[#3a3530]/50')}`}
                            />
                        ))}
                    </div>
                </>
            )}
        </section>
    );
}

function HowItWorksSection({ section }: { section: PageSection }) {
    const c = section.content as HowItWorksContent;
    const { ref, isRevealed } = useScrollReveal();
    const styling = section.styling || {};

    return (
        <section
            ref={ref}
            className={`py-16 scroll-reveal ${isRevealed ? 'scroll-revealed' : ''}`}
            style={{
                backgroundColor: styling.backgroundColor,
                paddingTop: styling.paddingTop || '4rem',
                paddingBottom: styling.paddingBottom || '4rem',
                color: styling.textColor,
            }}
        >
            <div className="max-w-6xl mx-auto px-6">
                {/* Title with reveal */}
                <div className={`text-${c.titleAlignment || 'center'} mb-12 lg:mb-16 flex flex-col gap-3 scroll-reveal ${isRevealed ? 'scroll-revealed' : ''}`}>
                    <h2 className="font-heading text-3xl sm:text-4xl font-bold text-balance" style={{ color: c.titleColor || 'var(--color-primary)' }}>{c.sectionTitle}</h2>
                    <div className="flex items-center justify-center gap-1 text-[var(--color-secondary)] scroll-reveal scroll-delay-1"><span className="text-2xl">✦</span></div>
                </div>
                {/* Steps with staggered reveal */}
                <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
                    {c.steps.map((step, i) => (
                        <div key={i} className={`flex flex-col gap-4 text-center group scroll-reveal scroll-delay-${i + 1} ${isRevealed ? 'scroll-revealed' : ''}`}>
                            <div className="relative mx-auto w-36 h-36">
                                <div className="absolute inset-0 bg-[var(--color-primary)]/10 rounded-full scale-0 group-hover:scale-100 transition-transform duration-500" />
                                <div className="absolute top-0 right-0 w-8 h-8 bg-[var(--color-secondary)] text-white rounded-full flex items-center justify-center text-sm font-bold z-10 group-hover:scale-110 transition-transform">{i + 1}</div>
                                <div className="relative z-10 w-full h-full flex items-center justify-center">
                                    {step.image ? (
                                        <img src={step.image} alt={step.title} className="w-20 h-20 object-contain group-hover:scale-110 group-hover:rotate-3 transition-all duration-300" />
                                    ) : step.emoji ? (
                                        <span className="text-5xl group-hover:scale-110 transition-transform">{step.emoji}</span>
                                    ) : (
                                        <div className="flex gap-1">
                                            <img src="/patches/patch-strawberry.png" alt="" className="w-10 h-10 object-contain group-hover:scale-110 transition-transform duration-300" />
                                            <img src="/patches/patch-watermelon.png" alt="" className="w-10 h-10 object-contain group-hover:scale-110 transition-transform duration-300 delay-75" />
                                            <img src="/patches/patch-cherry.png" alt="" className="w-10 h-10 object-contain group-hover:scale-110 transition-transform duration-300 delay-150" />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <h3 className="font-heading text-xl font-bold text-[var(--color-primary)]">{step.title}</h3>
                                <p className="text-[var(--color-primary)] text-sm leading-relaxed opacity-80 max-w-xs mx-auto">{step.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function GallerySection({ section, startCustomizing }: { section: PageSection; startCustomizing: () => void }) {
    const c = section.content as GalleryContent;
    const { ref, isRevealed } = useScrollReveal();
    const styling = section.styling || {};

    const handleItemClick = (url?: string) => {
        if (url) {
            if (url.startsWith('http')) window.open(url, '_blank');
            else window.location.href = url;
        } else {
            startCustomizing();
        }
    };

    return (
        <section
            id="gallery"
            ref={ref}
            className={`py-16 scroll-reveal ${isRevealed ? 'scroll-revealed' : ''}`}
            style={{
                backgroundColor: styling.backgroundColor,
                paddingTop: styling.paddingTop || '4rem',
                paddingBottom: styling.paddingBottom || '4rem',
                color: styling.textColor,
            }}
        >
            <div className="max-w-[1400px] mx-auto px-6">
                <h2 className={`text-4xl font-black mb-12 scroll-reveal ${isRevealed ? 'scroll-revealed' : ''}`} style={{ 
                    color: c.titleColor || styling.textColor || 'var(--color-primary)',
                    textAlign: c.titleAlignment || 'center'
                }}>{c.sectionTitle}</h2>
                <div className="flex gap-6 overflow-x-auto pb-12 snap-x hide-scrollbar justify-center">
                    {c.items.map((item, i) => (
                        <div key={item.id} className={`flex-shrink-0 snap-center group cursor-pointer scroll-reveal-scale scroll-delay-${Math.min(i + 1, 6)} ${isRevealed ? 'scroll-revealed' : ''}`} onClick={() => handleItemClick(item.linkUrl)}>
                            <div className="w-52 h-52 rounded-2xl overflow-hidden bg-[var(--color-primary)]/10 shadow-md group-hover:shadow-xl transition-all duration-300 group-hover:-translate-y-2 group-hover:scale-105">
                                <img src={item.image} alt={item.label} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                            </div>
                            <p className="text-center text-sm font-medium text-[var(--color-primary)] opacity-80 mt-3 group-hover:opacity-100 transition-opacity">{item.label}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function TextBlockSection({ section }: { section: PageSection }) {
    const c = section.content as TextBlockContent;
    const { ref, isRevealed } = useScrollReveal();
    const styling = section.styling || {};

    const alignmentClass = c.alignment === 'center' ? 'text-center' : c.alignment === 'right' ? 'text-right' : 'text-left';

    return (
        <section
            ref={ref}
            className={`scroll-reveal ${isRevealed ? 'scroll-revealed' : ''}`}
            style={{
                backgroundColor: styling.backgroundColor,
                paddingTop: styling.paddingTop,
                paddingBottom: styling.paddingBottom,
                color: styling.textColor,
            }}
        >
            <div className={`max-w-4xl mx-auto px-6 ${alignmentClass}`}>
                {c.heading && <h2 className={`font-heading text-3xl sm:text-4xl font-bold text-[var(--color-primary)] mb-6 scroll-reveal ${isRevealed ? 'scroll-revealed' : ''}`}>{c.heading}</h2>}
                {c.body && <p className={`text-[var(--color-primary)] text-lg leading-relaxed opacity-80 whitespace-pre-line scroll-reveal scroll-delay-1 ${isRevealed ? 'scroll-revealed' : ''}`}>{c.body}</p>}
            </div>
        </section>
    );
}

function ImageBannerSection({ section, startCustomizing }: { section: PageSection; startCustomizing: () => void }) {
    const c = section.content as ImageBannerContent;
    const { ref, isRevealed } = useScrollReveal();
    const styling = section.styling || {};

    const handleRedirect = (url?: string) => {
        if (!url || c.isClickable === false) return;
        if (url.startsWith('http')) window.open(url, '_blank');
        else window.location.href = url;
    };

    const handleButtonClick = () => {
        if (!c.showButton) return;
        
        switch (c.buttonAction) {
            case 'customize':
                startCustomizing();
                break;
            case 'scroll':
                if (c.buttonUrl?.startsWith('#')) {
                    const el = document.querySelector(c.buttonUrl);
                    el?.scrollIntoView({ behavior: 'smooth' });
                } else {
                    window.location.href = c.buttonUrl || '#';
                }
                break;
            case 'link':
            default:
                if (c.buttonUrl?.startsWith('http')) {
                    window.open(c.buttonUrl, '_blank');
                } else {
                    window.location.href = c.buttonUrl || '#';
                }
        }
    };

    // Container styling
    const containerStyle: React.CSSProperties = {
        backgroundColor: c.hasContainer ? (c.containerBgColor || '#ffffff') : undefined,
        borderRadius: c.hasContainer && c.borderRadius ? `${c.borderRadius}px` : undefined,
        border: c.hasContainer && c.borderWidth ? `${c.borderWidth}px solid ${c.borderColor || '#e5e7eb'}` : undefined,
        padding: c.hasContainer && c.padding ? `${c.padding}px` : undefined,
    };

    const shadowClass = c.shadow === 'small' ? 'shadow-md' : c.shadow === 'medium' ? 'shadow-lg' : c.shadow === 'large' ? 'shadow-xl' : '';

    // Image border radius
    const imageBorderRadius = c.borderRadius || 16;

    return (
        <section
            ref={ref}
            className={`${c.fullWidth ? '' : 'py-12 px-6'} scroll-reveal ${isRevealed ? 'scroll-revealed' : ''}`}
            style={{
                backgroundColor: styling.backgroundColor,
                paddingTop: styling.paddingTop,
                paddingBottom: styling.paddingBottom,
                color: styling.textColor,
            }}
        >
            <div className={`${c.fullWidth ? '' : 'max-w-6xl mx-auto'}`}>
                <div className={`${c.hasContainer ? `${shadowClass} overflow-hidden` : ''}`} style={containerStyle}>
                    {c.isGallery ? (
                        <div className="flex gap-4 overflow-x-auto pb-4 snap-x scrollbar-hide">
                            {(c.galleryItems || []).map((item, idx) => (
                                <img
                                    key={idx}
                                    src={item.image}
                                    alt={`Banner ${idx}`}
                                    className={`flex-shrink-0 snap-center min-w-[300px] ${c.imageFit === 'contain' ? 'h-auto max-h-[400px] object-contain' : c.imageFit === 'none' ? 'h-auto object-none' : `h-[${c.maxHeight || 400}px] object-cover`} ${c.isClickable !== false ? 'cursor-pointer' : ''} hover:scale-[1.02] transition-all duration-500 scroll-reveal-scale scroll-delay-${Math.min(idx + 1, 4)} ${isRevealed ? 'scroll-revealed' : ''}`}
                                    style={{ borderRadius: `${imageBorderRadius}px` }}
                                    onClick={() => handleRedirect(item.linkUrl)}
                                />
                            ))}
                        </div>
                    ) : (
                        c.image && (
                            <div className="relative">
                                <img
                                    src={c.image}
                                    alt={c.alt}
                                    className={`w-full max-w-full h-auto ${c.imageFit === 'contain' ? 'object-contain' : c.imageFit === 'none' ? 'object-none' : 'object-cover'} ${c.isClickable !== false ? 'cursor-pointer' : ''} hover:scale-[1.01] transition-all duration-700 scroll-reveal-scale ${isRevealed ? 'scroll-revealed' : ''}`}
                                    style={{ 
                                        borderRadius: `${imageBorderRadius}px`,
                                        maxHeight: c.maxHeight && c.maxHeight > 0 ? `${c.maxHeight}px` : undefined,
                                    }}
                                    onClick={() => handleRedirect(c.linkUrl)}
                                />
                                {c.showButton && c.buttonText && (
                                    <div 
                                        className={`absolute left-0 right-0 flex px-4 sm:px-6 ${c.buttonPosition === 'left' ? 'justify-start' : c.buttonPosition === 'right' ? 'justify-end' : 'justify-center'}`}
                                        style={{
                                            // Use percentage for responsive positioning that scales with image
                                            [c.buttonVerticalFrom === 'top' ? 'top' : 'bottom']: `${(c.buttonVerticalPosition ?? 24) / 5}%`
                                        }}
                                    >
                                        <button
                                            onClick={handleButtonClick}
                                            className={`px-5 sm:px-8 py-2.5 sm:py-4 rounded-full font-bold text-sm sm:text-base whitespace-nowrap transition-all duration-300 hover:scale-105 ${
                                                c.buttonStyle === 'outline' 
                                                    ? 'border-2 bg-transparent hover:bg-opacity-10' 
                                                    : c.buttonStyle === 'ghost' 
                                                        ? 'bg-transparent hover:bg-opacity-10' 
                                                        : 'shadow-lg hover:shadow-xl'
                                            }`}
                                            style={{
                                                backgroundColor: c.buttonStyle === 'solid' ? (c.buttonColor || '#6b8f71') : 'transparent',
                                                color: c.buttonStyle === 'solid' ? (c.buttonTextColor || '#ffffff') : (c.buttonColor || '#6b8f71'),
                                                borderColor: c.buttonStyle !== 'ghost' ? (c.buttonColor || '#6b8f71') : 'transparent',
                                                boxShadow: c.buttonStyle === 'solid' ? '0 10px 30px -10px rgba(0,0,0,0.3)' : undefined,
                                            }}
                                        >
                                            {c.buttonText}
                                            <span className="ml-2">→</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )
                    )}
                </div>
                {c.caption && <p className={`text-center text-sm text-[var(--color-primary)] opacity-80 mt-3 scroll-reveal scroll-delay-1 ${isRevealed ? 'scroll-revealed' : ''}`}>{c.caption}</p>}
            </div>
        </section>
    );
}

function TestimonialsSection({ section }: { section: PageSection }) {
    const c = section.content as TestimonialsContent;
    const { ref, isRevealed } = useScrollReveal();
    const styling = section.styling || {};

    const handleRedirect = (url?: string) => {
        if (!url) return;
        if (url.startsWith('http')) window.open(url, '_blank');
        else window.location.href = url;
    };

    // Alternate between left and right animations for cards
    const getCardAnimation = (i: number) => {
        if (i % 3 === 0) return 'scroll-reveal-left';
        if (i % 3 === 2) return 'scroll-reveal-right';
        return 'scroll-reveal';
    };

    return (
        <section
            ref={ref}
            className={`scroll-reveal ${isRevealed ? 'scroll-revealed' : ''}`}
            style={{
                backgroundColor: styling.backgroundColor,
                paddingTop: styling.paddingTop,
                paddingBottom: styling.paddingBottom,
                color: styling.textColor,
            }}
        >
            <div className="max-w-5xl mx-auto px-6">
                <h2 className={`font-heading text-3xl sm:text-4xl font-bold mb-12 scroll-reveal ${isRevealed ? 'scroll-revealed' : ''}`} style={{ 
                    color: c.titleColor || 'var(--color-primary)',
                    textAlign: c.titleAlignment || 'center'
                }}>{c.sectionTitle}</h2>
                <div className="grid md:grid-cols-3 gap-6">
                    {c.items.map((item, i) => (
                        <div
                            key={item.id}
                            onClick={() => handleRedirect(item.linkUrl)}
                            className={`bg-[var(--color-primary)]/10 rounded-2xl p-6 relative ${getCardAnimation(i)} scroll-delay-${Math.min(i + 1, 3)} ${isRevealed ? 'scroll-revealed' : ''} flex flex-col ${item.linkUrl ? 'cursor-pointer hover:bg-[var(--color-primary)]/15 hover:-translate-y-1 transition-all' : ''}`}
                        >
                            <span className="absolute top-4 left-5 text-4xl text-[var(--color-primary)]/20 font-serif group-hover:scale-110 transition-transform">"</span>
                            <p className="text-[var(--color-primary)] text-sm leading-relaxed opacity-80 mt-6 mb-4 flex-1">{item.quote}</p>

                            {item.proofImage && (
                                <div className="mb-4 rounded-lg overflow-hidden border border-white/20 shadow-sm">
                                    <img src={item.proofImage} alt="Proof" className="w-full h-32 object-cover hover:scale-105 transition-transform duration-500" />
                                </div>
                            )}

                            <div className="flex items-center gap-3">
                                {item.avatar ? (
                                    <img src={item.avatar} alt={item.author} className="w-10 h-10 rounded-full object-cover ring-2 ring-white/50" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-[var(--color-secondary)] flex items-center justify-center text-white font-bold text-sm ring-2 ring-white/50">{item.author?.[0] || '?'}</div>
                                )}
                                <span className="font-heading font-bold text-sm text-[var(--color-primary)]">{item.author}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function CtaSection({ section, startCustomizing }: { section: PageSection; startCustomizing: () => void }) {
    const c = section.content as CtaContent;
    const { ref, isRevealed } = useScrollReveal();
    const styling = section.styling || {};

    const handleCtaClick = () => {
        if (c.buttonAction === 'customize') {
            startCustomizing();
        } else if (c.buttonAction === 'scroll') {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        } else if (c.buttonAction === 'link' && c.linkUrl) {
            if (c.linkUrl.startsWith('http')) window.open(c.linkUrl, '_blank');
            else window.location.href = c.linkUrl;
        } else {
            startCustomizing();
        }
    };

    return (
        <section
            ref={ref}
            className={`scroll-reveal ${isRevealed ? 'scroll-revealed' : ''}`}
            style={{
                backgroundColor: styling.backgroundColor,
                paddingTop: styling.paddingTop,
                paddingBottom: styling.paddingBottom,
                color: styling.textColor,
            }}
        >
            <div className="max-w-3xl mx-auto text-center px-6">
                <h2 className={`font-heading text-3xl sm:text-4xl font-bold mb-4 scroll-reveal ${isRevealed ? 'scroll-revealed' : ''}`} style={{ 
                    color: c.titleColor || 'white',
                    textAlign: c.titleAlignment || 'center'
                }}>{c.heading}</h2>
                {c.subtitle && <p className={`text-lg mb-8 scroll-reveal scroll-delay-1 ${isRevealed ? 'scroll-revealed' : ''}`} style={{ 
                    color: c.subtitleColor || 'white',
                    textAlign: c.subtitleAlignment || 'center'
                }}>{c.subtitle}</p>}
                <button
                    onClick={handleCtaClick}
                    className={`inline-flex items-center gap-3 bg-white text-[var(--color-primary)] px-8 py-4 rounded-full text-lg font-semibold hover:bg-[var(--color-primary)]/10 hover:scale-105 hover:-translate-y-1 transition-all shadow-lg hover:shadow-xl scroll-reveal scroll-delay-2 ${isRevealed ? 'scroll-revealed' : ''}`}
                >
                    {c.buttonText} <ArrowRight className="w-5 h-5" />
                </button>
            </div>
        </section>
    );
}

function DividerSection({ section }: { section: PageSection }) {
    const c = section.content as DividerContent;
    const { ref, isRevealed } = useScrollReveal<HTMLDivElement>();
    const styling = section.styling || {};

    return (
        <div
            ref={ref}
            style={{
                backgroundColor: styling.backgroundColor,
                paddingTop: styling.paddingTop,
                paddingBottom: styling.paddingBottom,
                color: styling.textColor
            }}
        >
            <div className={`max-w-4xl mx-auto scroll-reveal-scale ${isRevealed ? 'scroll-revealed' : ''}`}>
                {c.style === 'line' && <hr className="border-t-2 border-[var(--color-primary)]/20" />}
                {c.style === 'dots' && <div className="flex justify-center gap-3">{[...Array(5)].map((_, i) => <div key={i} className="w-2 h-2 rounded-full bg-[var(--color-primary)]/20 animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />)}</div>}
                {c.style === 'wave' && (
                    <svg viewBox="0 0 600 20" className="w-full h-5 text-[var(--color-primary)]/20">
                        <path d="M0,10 Q50,0 100,10 Q150,20 200,10 Q250,0 300,10 Q350,20 400,10 Q450,0 500,10 Q550,20 600,10" fill="none" stroke="currentColor" strokeWidth="2" />
                    </svg>
                )}
            </div>
        </div>
    );
}

// ── Organic Shape Transition Section ──
function TransitionSection({ section }: { section: PageSection }) {
    const c = section.content as TransitionContent;
    const height = c.height || 80;
    
    const getTransform = () => {
        const transforms = [];
        if (c.flipVertical) transforms.push('scaleY(-1)');
        if (c.flipHorizontal) transforms.push('scaleX(-1)');
        return transforms.length > 0 ? transforms.join(' ') : undefined;
    };

    const renderShape = () => {
        const fill = c.fillColor || '#FFB6C1';
        const transform = getTransform();
        
        switch (c.shape) {
            case 'wave':
                return (
                    <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="w-full h-full" style={{ transform }}>
                        <path fill={fill} d="M0,64L48,69.3C96,75,192,85,288,80C384,75,480,53,576,48C672,43,768,53,864,64C960,75,1056,85,1152,80C1248,75,1344,53,1392,42.7L1440,32L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z" />
                    </svg>
                );
            case 'blob':
                return (
                    <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="w-full h-full" style={{ transform }}>
                        <path fill={fill} d="M0,96L48,90.7C96,85,192,75,288,74.7C384,75,480,85,576,90.7C672,96,768,96,864,85.3C960,75,1056,53,1152,48C1248,43,1344,53,1392,58.7L1440,64L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z" />
                    </svg>
                );
            case 'cloud':
                return (
                    <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="w-full h-full" style={{ transform }}>
                        <path fill={fill} d="M0,64L48,64C96,64,192,64,288,58.7C384,53,480,43,576,48C672,53,768,75,864,80C960,85,1056,75,1152,69.3C1248,64,1344,64,1392,64L1440,64L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z" />
                    </svg>
                );
            case 'arch':
                return (
                    <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="w-full h-full" style={{ transform }}>
                        <path fill={fill} d="M0,120L0,60C240,120,480,120,720,60C960,0,1200,0,1440,60L1440,120Z" />
                    </svg>
                );
            case 'zigzag':
                return (
                    <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="w-full h-full" style={{ transform }}>
                        <path fill={fill} d="M0,120L0,60L120,120L240,60L360,120L480,60L600,120L720,60L840,120L960,60L1080,120L1200,60L1320,120L1440,60L1440,120Z" />
                    </svg>
                );
            case 'triangle':
                return (
                    <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="w-full h-full" style={{ transform }}>
                        <path fill={fill} d="M720,0L0,120L1440,120Z" />
                    </svg>
                );
            case 'curve':
                return (
                    <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="w-full h-full" style={{ transform }}>
                        <path fill={fill} d="M0,120L1440,120L1440,0C1200,80,960,120,720,120C480,120,240,80,0,0Z" />
                    </svg>
                );
            case 'none':
            default:
                return <div className="w-full h-full" style={{ backgroundColor: fill }} />;
        }
    };

    return (
        <div 
            className="w-full overflow-hidden transition-all duration-500"
            style={{ 
                height: `${height}px`,
                marginTop: c.marginTop || 0,
                marginBottom: c.marginBottom || 0
            }}
        >
            {renderShape()}
        </div>
    );
}


export function LandingPage({ notices, startCustomizing, siteContent }: LandingPageProps) {
    const { global, footer } = siteContent;
    const visibleSections = siteContent.landingPage.filter(s => s.visible);

    return (
        <div className="min-h-screen bg-white" style={{
            ['--color-primary' as any]: global.primaryColor,
            ['--color-secondary' as any]: global.secondaryColor
        }}>
            {/* Sections */}
            {visibleSections.map((section) => {
                switch (section.type) {
                    case 'hero': return <HeroSection key={section.id} section={section} notices={notices} startCustomizing={startCustomizing} />;
                    case 'howItWorks': return <HowItWorksSection key={section.id} section={section} />;
                    case 'gallery': return <GallerySection key={section.id} section={section} startCustomizing={startCustomizing} />;
                    case 'textBlock': return <TextBlockSection key={section.id} section={section} />;
                    case 'imageBanner': return <ImageBannerSection key={section.id} section={section} startCustomizing={startCustomizing} />;
                    case 'testimonials': return <TestimonialsSection key={section.id} section={section} />;
                    case 'cta': return <CtaSection key={section.id} section={section} startCustomizing={startCustomizing} />;
                    case 'divider': return <DividerSection key={section.id} section={section} />;
                    case 'transition': return <TransitionSection key={section.id} section={section} />;
                    default: return null;
                }
            })}

            {/* Footer */}
            <footer className="bg-[var(--color-primary)] text-white py-20">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid md:grid-cols-4 gap-12 mb-16">
                        <div className="col-span-2">
                            <div className="flex items-center gap-2 mb-6">
                                {global.logoImage ? (
                                    <img src={global.logoImage} alt="" className="h-8 brightness-0 invert" />
                                ) : (
                                    <div className="w-8 h-8 bg-[var(--color-secondary)] rounded-full flex items-center justify-center">
                                        <Palette className="w-5 h-5 text-white" />
                                    </div>
                                )}
                                <span className="font-heading text-xl font-bold tracking-tight">{footer.brandName}</span>
                            </div>
                            <p className="text-white/80 max-w-sm leading-relaxed">{footer.tagline}</p>
                        </div>
                        <div>
                            <h4 className="font-bold mb-6">Explore</h4>
                            <ul className="space-y-4 text-white/80">
                                <li><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-[var(--color-secondary)]">Home</button></li>
                                <li><button onClick={startCustomizing} className="hover:text-[var(--color-secondary)]">Gallery</button></li>
                                <li><button onClick={startCustomizing} className="hover:text-[var(--color-secondary)]">Design Tool</button></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold mb-6">Connect</h4>
                            <div className="flex gap-4 mb-6">
                                <a href={footer.instagramUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-[var(--color-secondary)] transition-colors"><Instagram className="w-5 h-5" /></a>
                                <a href={footer.facebookUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-[var(--color-secondary)] transition-colors"><Facebook className="w-5 h-5" /></a>
                                <a href={footer.twitterUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-[var(--color-secondary)] transition-colors"><Twitter className="w-5 h-5" /></a>
                            </div>
                        </div>
                    </div>
                    <div className="pt-8 border-t border-white/10 text-center text-white/60 text-sm">
                        <p>{footer.copyright} • {footer.brandName}</p>
                    </div>
                </div>
            </footer>

            {/* Hero Animation Keyframes */}
            <style>{`
                @keyframes float {
                    0% { transform: translateY(0px) rotate(0deg); }
                    100% { transform: translateY(-12px) rotate(5deg); }
                }
                /* Hero slide animations - completely isolated */
                @keyframes hero-right {
                    0% { opacity: 0; transform: translateX(50px); }
                    100% { opacity: 1; transform: translateX(0); }
                }
                @keyframes hero-left {
                    0% { opacity: 0; transform: translateX(-50px); }
                    100% { opacity: 1; transform: translateX(0); }
                }
                .animate-hero-right {
                    animation: hero-right 0.5s ease-out forwards;
                }
                .animate-hero-left {
                    animation: hero-left 0.5s ease-out forwards;
                }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                
                /* ── Scroll Reveal Animations ── */
                /* Base state - hidden */
                .scroll-reveal {
                    opacity: 0;
                    transform: translateY(40px);
                    transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), 
                                transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
                    will-change: opacity, transform;
                }
                
                /* Revealed state */
                .scroll-reveal.scroll-revealed {
                    opacity: 1;
                    transform: translateY(0);
                }
                
                /* Scale reveal for images/banners */
                .scroll-reveal-scale {
                    opacity: 0;
                    transform: scale(0.95);
                    transition: opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1), 
                                transform 0.9s cubic-bezier(0.16, 1, 0.3, 1);
                    will-change: opacity, transform;
                }
                
                .scroll-reveal-scale.scroll-revealed {
                    opacity: 1;
                    transform: scale(1);
                }
                
                /* Left slide reveal */
                .scroll-reveal-left {
                    opacity: 0;
                    transform: translateX(-60px);
                    transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), 
                                transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
                    will-change: opacity, transform;
                }
                
                .scroll-reveal-left.scroll-revealed {
                    opacity: 1;
                    transform: translateX(0);
                }
                
                /* Right slide reveal */
                .scroll-reveal-right {
                    opacity: 0;
                    transform: translateX(60px);
                    transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), 
                                transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
                    will-change: opacity, transform;
                }
                
                .scroll-reveal-right.scroll-revealed {
                    opacity: 1;
                    transform: translateX(0);
                }
                
                /* Down slide reveal (for fade-down) */
                .scroll-reveal-down {
                    opacity: 0;
                    transform: translateY(-40px);
                    transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), 
                                transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
                    will-change: opacity, transform;
                }
                
                .scroll-reveal-down.scroll-revealed {
                    opacity: 1;
                    transform: translateY(0);
                }
                
                /* Stagger delays for child elements */
                .scroll-reveal.scroll-delay-1,
                .scroll-reveal-scale.scroll-delay-1,
                .scroll-reveal-left.scroll-delay-1,
                .scroll-reveal-right.scroll-delay-1,
                .scroll-reveal-down.scroll-delay-1 { transition-delay: 0.1s; }
                
                .scroll-reveal.scroll-delay-2,
                .scroll-reveal-scale.scroll-delay-2,
                .scroll-reveal-left.scroll-delay-2,
                .scroll-reveal-right.scroll-delay-2,
                .scroll-reveal-down.scroll-delay-2 { transition-delay: 0.2s; }
                
                .scroll-reveal.scroll-delay-3,
                .scroll-reveal-scale.scroll-delay-3,
                .scroll-reveal-left.scroll-delay-3,
                .scroll-reveal-right.scroll-delay-3,
                .scroll-reveal-down.scroll-delay-3 { transition-delay: 0.3s; }
                
                .scroll-reveal.scroll-delay-4,
                .scroll-reveal-scale.scroll-delay-4,
                .scroll-reveal-left.scroll-delay-4,
                .scroll-reveal-right.scroll-delay-4,
                .scroll-reveal-down.scroll-delay-4 { transition-delay: 0.4s; }
                
                .scroll-reveal.scroll-delay-5,
                .scroll-reveal-scale.scroll-delay-5,
                .scroll-reveal-left.scroll-delay-5,
                .scroll-reveal-right.scroll-delay-5 { transition-delay: 0.5s; }
                
                .scroll-reveal.scroll-delay-6,
                .scroll-reveal-scale.scroll-delay-6,
                .scroll-reveal-left.scroll-delay-6,
                .scroll-reveal-right.scroll-delay-6 { transition-delay: 0.6s; }
                
                /* Reduced motion support */
                @media (prefers-reduced-motion: reduce) {
                    .scroll-reveal,
                    .scroll-reveal-scale,
                    .scroll-reveal-left,
                    .scroll-reveal-right {
                        opacity: 1;
                        transform: none;
                        transition: none;
                    }
                }
            `}</style>
        </div>
    );
}
