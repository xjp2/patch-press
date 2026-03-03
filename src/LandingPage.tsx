
import { ArrowRight, ChevronLeft, ChevronRight, Instagram, Facebook, Twitter, Palette } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import type { Notice, SiteContent, HeroContent, HowItWorksContent, GalleryContent, TextBlockContent, ImageBannerContent, TestimonialsContent, CtaContent, DividerContent, PageSection } from './AdminPanel';

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
        <section className={`relative overflow-hidden transition-all duration-700 ${currentSlide.isFullWidth ? 'h-[90vh]' : 'pt-20 min-h-[85vh]'} flex items-center group`}>
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
                className={`max-w-7xl mx-auto px-6 w-full grid lg:grid-cols-2 gap-8 lg:gap-12 items-center py-16 relative z-10 hero-slide-content ${slideDirection === 'right' ? 'animate-slide-in-right' : 'animate-slide-in-left'}`}
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
                    {/* Left Arrow */}
                    <button 
                        onClick={prevSlide} 
                        className={`absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 w-12 h-12 sm:w-14 sm:h-14 rounded-full backdrop-blur-md flex items-center justify-center transition-all z-20
                            ${currentSlide.isFullWidth 
                                ? 'bg-white/10 text-white opacity-0 group-hover:opacity-100 hover:bg-white/20' 
                                : 'bg-[#3a3530]/5 text-[#3a3530] opacity-60 hover:opacity-100 hover:bg-[#3a3530]/10'}`}
                    >
                        <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
                    </button>
                    
                    {/* Right Arrow */}
                    <button 
                        onClick={nextSlide} 
                        className={`absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 w-12 h-12 sm:w-14 sm:h-14 rounded-full backdrop-blur-md flex items-center justify-center transition-all z-20
                            ${currentSlide.isFullWidth 
                                ? 'bg-white/10 text-white opacity-0 group-hover:opacity-100 hover:bg-white/20' 
                                : 'bg-[#3a3530]/5 text-[#3a3530] opacity-60 hover:opacity-100 hover:bg-[#3a3530]/10'}`}
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
            className={`scroll-reveal ${isRevealed ? 'scroll-revealed' : ''}`}
            style={{
                backgroundColor: styling.backgroundColor,
                paddingTop: styling.paddingTop,
                paddingBottom: styling.paddingBottom,
                color: styling.textColor
            }}
        >
            {/* Context7 Best Practice: Consistent container max-width and padding */}
            <div className="max-w-6xl mx-auto px-6">
                {/* Context7 Best Practice: Proper heading hierarchy with text-balance */}
                <div className={`text-center mb-12 lg:mb-16 flex flex-col gap-3 scroll-reveal ${isRevealed ? 'scroll-revealed' : ''}`}>
                    <h2 className="font-heading text-3xl sm:text-4xl font-bold text-[var(--color-primary)] text-balance">{c.sectionTitle}</h2>
                    <div className="flex items-center justify-center gap-1 text-[var(--color-secondary)]"><span className="text-2xl">✦</span></div>
                </div>
                {/* Context7 Best Practice: gap-6 for consistent spacing (shadcn/ui field group pattern) */}
                <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
                    {c.steps.map((step, i) => (
                        /* Context7 Best Practice: Card-like structure with flex col gap */
                        <div key={i} className={`flex flex-col gap-4 text-center group scroll-reveal scroll-delay-${i + 1} ${isRevealed ? 'scroll-revealed' : ''}`}>
                            <div className="relative mx-auto w-36 h-36">
                                <div className="absolute inset-0 bg-[var(--color-primary)]/10 rounded-full" />
                                <div className="absolute top-0 right-0 w-8 h-8 bg-[var(--color-secondary)] text-white rounded-full flex items-center justify-center text-sm font-bold z-10">{i + 1}</div>
                                <div className="relative z-10 w-full h-full flex items-center justify-center">
                                    {step.image ? (
                                        <img src={step.image} alt={step.title} className="w-20 h-20 object-contain group-hover:scale-110 transition-transform duration-300" />
                                    ) : step.emoji ? (
                                        <span className="text-5xl">{step.emoji}</span>
                                    ) : (
                                        <div className="flex gap-1">
                                            <img src="/patches/patch-strawberry.png" alt="" className="w-10 h-10 object-contain group-hover:scale-110 transition-transform duration-300" />
                                            <img src="/patches/patch-watermelon.png" alt="" className="w-10 h-10 object-contain group-hover:scale-110 transition-transform duration-300 delay-75" />
                                            <img src="/patches/patch-cherry.png" alt="" className="w-10 h-10 object-contain group-hover:scale-110 transition-transform duration-300 delay-150" />
                                        </div>
                                    )}
                                </div>
                            </div>
                            {/* Context7 Best Practice: Semantic spacing with gap-2 */}
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
            className={`scroll-reveal ${isRevealed ? 'scroll-revealed' : ''}`}
            style={{
                backgroundColor: styling.backgroundColor,
                paddingTop: styling.paddingTop,
                paddingBottom: styling.paddingBottom,
                color: styling.textColor
            }}
        >
            <div className="max-w-[1400px] mx-auto px-6">
                <h2 className="text-4xl font-black mb-12" style={{ color: styling.textColor }}>{c.sectionTitle}</h2>
                <div className="flex gap-6 overflow-x-auto pb-12 snap-x hide-scrollbar">
                    {c.items.map((item, i) => (
                        <div key={item.id} className={`flex-shrink-0 snap-center group cursor-pointer scroll-reveal-scale scroll-delay-${Math.min(i + 1, 6)} ${isRevealed ? 'scroll-revealed' : ''}`} onClick={() => handleItemClick(item.linkUrl)}>
                            <div className="w-52 h-52 rounded-2xl overflow-hidden bg-[var(--color-primary)]/10 shadow-md group-hover:shadow-xl transition-all duration-300 group-hover:-translate-y-1">
                                <img src={item.image} alt={item.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            </div>
                            <p className="text-center text-sm font-medium text-[var(--color-primary)] opacity-80 mt-3">{item.label}</p>
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

    return (
        <section
            ref={ref}
            className={`scroll-reveal ${isRevealed ? 'scroll-revealed' : ''}`}
            style={{
                backgroundColor: styling.backgroundColor,
                paddingTop: styling.paddingTop,
                paddingBottom: styling.paddingBottom,
                color: styling.textColor
            }}
        >
            <div className={`max-w-4xl mx-auto text-${c.alignment} scroll-reveal ${isRevealed ? 'scroll-revealed' : ''}`}>
                {c.heading && <h2 className="font-heading text-3xl sm:text-4xl font-bold text-[var(--color-primary)] mb-6">{c.heading}</h2>}
                {c.body && <p className="text-[var(--color-primary)] text-lg leading-relaxed opacity-80 whitespace-pre-line">{c.body}</p>}
            </div>
        </section>
    );
}

function ImageBannerSection({ section }: { section: PageSection }) {
    const c = section.content as ImageBannerContent;
    const { ref, isRevealed } = useScrollReveal();
    const styling = section.styling || {};

    const handleRedirect = (url?: string) => {
        if (!url) return;
        if (url.startsWith('http')) window.open(url, '_blank');
        else window.location.href = url;
    };

    return (
        <section
            ref={ref}
            className={`${c.fullWidth ? '' : 'py-12 px-6'} scroll-reveal-scale ${isRevealed ? 'scroll-revealed' : ''}`}
            style={{
                backgroundColor: styling.backgroundColor,
                paddingTop: styling.paddingTop,
                paddingBottom: styling.paddingBottom,
                color: styling.textColor
            }}
        >
            <div className={`${c.fullWidth ? '' : 'max-w-6xl mx-auto'} scroll-reveal-scale ${isRevealed ? 'scroll-revealed' : ''}`}>
                {c.isGallery ? (
                    <div className="flex gap-4 overflow-x-auto pb-4 snap-x scrollbar-hide">
                        {(c.galleryItems || []).map((item, idx) => (
                            <img
                                key={idx}
                                src={item.image}
                                alt={`Banner ${idx}`}
                                className={`flex-shrink-0 snap-center min-w-[300px] h-[400px] object-cover rounded-2xl cursor-pointer hover:opacity-90 transition-opacity`}
                                onClick={() => handleRedirect(item.linkUrl)}
                            />
                        ))}
                    </div>
                ) : (
                    c.image && (
                        <img
                            src={c.image}
                            alt={c.alt}
                            className={`${c.fullWidth ? 'w-full max-h-[500px]' : 'w-full max-h-[400px] rounded-2xl'} object-cover cursor-pointer hover:opacity-95 transition-opacity`}
                            onClick={() => handleRedirect(c.linkUrl)}
                        />
                    )
                )}
                {c.caption && <p className="text-center text-sm text-[var(--color-primary)] opacity-80 mt-3">{c.caption}</p>}
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

    return (
        <section
            ref={ref}
            className={`scroll-reveal ${isRevealed ? 'scroll-revealed' : ''}`}
            style={{
                backgroundColor: styling.backgroundColor,
                paddingTop: styling.paddingTop,
                paddingBottom: styling.paddingBottom,
                color: styling.textColor
            }}
        >
            <div className="max-w-5xl mx-auto">
                <h2 className={`font-heading text-3xl sm:text-4xl font-bold text-[var(--color-primary)] text-center mb-12 scroll-reveal ${isRevealed ? 'scroll-revealed' : ''}`}>{c.sectionTitle}</h2>
                <div className="grid md:grid-cols-3 gap-6">
                    {c.items.map((item, i) => (
                        <div
                            key={item.id}
                            onClick={() => handleRedirect(item.linkUrl)}
                            className={`bg-[var(--color-primary)]/10 rounded-2xl p-6 relative scroll-reveal scroll-delay-${i + 1} ${isRevealed ? 'scroll-revealed' : ''} flex flex-col ${item.linkUrl ? 'cursor-pointer hover:bg-[var(--color-primary)]/15 transition-colors' : ''}`}
                        >
                            <span className="absolute top-4 left-5 text-4xl text-[var(--color-primary)]/20 font-serif">"</span>
                            <p className="text-[var(--color-primary)] text-sm leading-relaxed opacity-80 mt-6 mb-4 flex-1">{item.quote}</p>

                            {item.proofImage && (
                                <div className="mb-4 rounded-lg overflow-hidden border border-white/20 shadow-sm">
                                    <img src={item.proofImage} alt="Proof" className="w-full h-32 object-cover hover:scale-105 transition-transform" />
                                </div>
                            )}

                            <div className="flex items-center gap-3">
                                {item.avatar ? (
                                    <img src={item.avatar} alt={item.author} className="w-10 h-10 rounded-full object-cover" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-[var(--color-secondary)] flex items-center justify-center text-white font-bold text-sm">{item.author?.[0] || '?'}</div>
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
                color: styling.textColor
            }}
        >
            <div className={`max-w-3xl mx-auto text-center scroll-reveal ${isRevealed ? 'scroll-revealed' : ''}`}>
                <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mb-4">{c.heading}</h2>
                {c.subtitle && <p className="text-white/80 text-lg mb-8">{c.subtitle}</p>}
                <button
                    onClick={handleCtaClick}
                    className="inline-flex items-center gap-3 bg-white text-[var(--color-primary)] px-8 py-4 rounded-full text-lg font-semibold hover:bg-[var(--color-primary)]/10 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                    {c.buttonText} <ArrowRight className="w-5 h-5" />
                </button>
            </div>
        </section>
    );
}

function DividerSection({ section }: { section: PageSection }) {
    const c = section.content as DividerContent;
    const styling = section.styling || {};

    return (
        <div
            style={{
                backgroundColor: styling.backgroundColor,
                paddingTop: styling.paddingTop,
                paddingBottom: styling.paddingBottom,
                color: styling.textColor
            }}
        >
            <div className="max-w-4xl mx-auto">
                {c.style === 'line' && <hr className="border-t-2 border-[var(--color-primary)]/20" />}
                {c.style === 'dots' && <div className="flex justify-center gap-3">{[...Array(5)].map((_, i) => <div key={i} className="w-2 h-2 rounded-full bg-[var(--color-primary)]/20" />)}</div>}
                {c.style === 'wave' && (
                    <svg viewBox="0 0 600 20" className="w-full h-5 text-[var(--color-primary)]/20">
                        <path d="M0,10 Q50,0 100,10 Q150,20 200,10 Q250,0 300,10 Q350,20 400,10 Q450,0 500,10 Q550,20 600,10" fill="none" stroke="currentColor" strokeWidth="2" />
                    </svg>
                )}
            </div>
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
            {/* Header / Nav */}

            {/* Sections */}
            {visibleSections.map((section) => {
                switch (section.type) {
                    case 'hero': return <HeroSection key={section.id} section={section} notices={notices} startCustomizing={startCustomizing} />;
                    case 'howItWorks': return <HowItWorksSection key={section.id} section={section} />;
                    case 'gallery': return <GallerySection key={section.id} section={section} startCustomizing={startCustomizing} />;
                    case 'textBlock': return <TextBlockSection key={section.id} section={section} />;
                    case 'imageBanner': return <ImageBannerSection key={section.id} section={section} />;
                    case 'testimonials': return <TestimonialsSection key={section.id} section={section} />;
                    case 'cta': return <CtaSection key={section.id} section={section} startCustomizing={startCustomizing} />;
                    case 'divider': return <DividerSection key={section.id} section={section} />;
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
                /* Hero slide animations - horizontal only */
                @keyframes hero-slide-right {
                    from { opacity: 0; transform: translateX(40px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes hero-slide-left {
                    from { opacity: 0; transform: translateX(-40px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                .hero-slide-content {
                    will-change: transform, opacity;
                }
                .hero-slide-content.animate-slide-in-right {
                    animation: hero-slide-right 0.4s ease-out forwards;
                }
                .hero-slide-content.animate-slide-in-left {
                    animation: hero-slide-left 0.4s ease-out forwards;
                }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
            `}</style>
        </div>
    );
}
