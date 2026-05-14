
import { ArrowRight, Instagram, Facebook, Twitter } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { HeroSection } from './components/HeroSection';
import { PatchuuHeroSection } from './components/PatchuuHeroSection';
import { PaperCard } from './components/PaperCard';

import { PatchuuLogo } from './components/PatchuuLogo';
import type { SiteContent, HeroContent, HowItWorksContent, GalleryContent, TextBlockContent, ImageBannerContent, TestimonialsContent, CtaContent, DividerContent, TransitionContent, PageSection } from './AdminPanel';

interface LandingPageProps {
    startCustomizing: () => void;
    siteContent: SiteContent;
    onNavigateToLegal?: (page: 'privacy' | 'terms' | 'refund' | 'shipping') => void;
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

/** Fix legacy image paths that wrongly include /products/ or /patches/ prefixes */
function fixImagePath(path: string): string {
    if (!path) return path;
    return path.replace(/^\/products\//, '/').replace(/^\/patches\//, '/');
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
                    {c.steps.map((step, i) => {
                        const cardColors: Array<'white' | 'mint' | 'yellow' | 'pink'> = ['mint', 'yellow', 'pink'];
                        return (
                            <div key={i} className={`flex flex-col gap-4 text-center group scroll-reveal scroll-delay-${i + 1} ${isRevealed ? 'scroll-revealed' : ''}`}>
                                <PaperCard
                                    color={cardColors[i % 3]}
                                    border="hand"
                                    shadow="paper"
                                    rotation={i === 0 ? -1 : i === 2 ? 1 : 0}
                                    decoration={i === 0 ? 'binder-clip-mint' : i === 1 ? 'tape-top' : 'pin'}
                                    className="p-6"
                                >
                                    <div className="relative mx-auto w-32 h-32">
                                        <div className="absolute top-0 right-0 w-8 h-8 bg-craft-mint text-white rounded-full flex items-center justify-center text-sm font-bold z-10 group-hover:scale-110 transition-transform border-[2px] border-ink">{i + 1}</div>
                                        <div className="relative z-10 w-full h-full flex items-center justify-center">
                                            {step.image ? (
                                                <img src={fixImagePath(step.image)} alt={step.title} className="w-20 h-20 object-contain group-hover:scale-110 group-hover:rotate-3 transition-all duration-300" />
                                            ) : step.emoji === '🔥' ? (
                                                <img src="/pouch-beige.png" alt="Heat Press" className="w-20 h-20 object-contain group-hover:scale-110 group-hover:rotate-3 transition-all duration-300" />
                                            ) : step.emoji ? (
                                                <span className="text-5xl group-hover:scale-110 transition-transform">{step.emoji}</span>
                                            ) : (
                                                <div className="flex gap-2 items-center">
                                                    <img src="/patch-strawberry.png" alt="" className="w-10 h-10 object-contain group-hover:scale-110 transition-transform duration-300" />
                                                    <img src="/patch-watermelon.png" alt="" className="w-10 h-10 object-contain group-hover:scale-110 transition-transform duration-300 delay-75" />
                                                    <img src="/patch-cherry.png" alt="" className="w-10 h-10 object-contain group-hover:scale-110 transition-transform duration-300 delay-150" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 mt-4">
                                        <h3 className="font-heading text-lg font-bold text-ink">{step.title}</h3>
                                        <p className="text-ink text-sm leading-relaxed opacity-70 max-w-xs mx-auto">{step.description}</p>
                                    </div>
                                </PaperCard>
                            </div>
                        );
                    })}
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
                            <PaperCard
                                color="white"
                                border="hand"
                                shadow="paper"
                                rotation={i % 2 === 0 ? -1 : 1}
                                className="w-52 h-52 overflow-hidden p-0 group-hover:shadow-paper-hover transition-all duration-300 group-hover:-translate-y-2 group-hover:scale-105"
                            >
                                <img src={fixImagePath(item.image)} alt={item.label} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                            </PaperCard>
                            <p className="text-center text-sm font-medium text-ink opacity-70 mt-3 group-hover:opacity-100 transition-opacity">{item.label}</p>
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
                                    src={fixImagePath(item.image)}
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
                                    src={fixImagePath(c.image)}
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
                                                backgroundColor: c.buttonStyle === 'solid' ? (c.buttonColor || '#81c784') : 'transparent',
                                                color: c.buttonStyle === 'solid' ? (c.buttonTextColor || '#ffffff') : (c.buttonColor || '#81c784'),
                                                borderColor: c.buttonStyle !== 'ghost' ? (c.buttonColor || '#81c784') : 'transparent',
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
                            className={`${getCardAnimation(i)} scroll-delay-${Math.min(i + 1, 3)} ${isRevealed ? 'scroll-revealed' : ''} ${item.linkUrl ? 'cursor-pointer' : ''}`}
                        >
                            <PaperCard
                                color={i % 3 === 0 ? 'yellow' : i % 3 === 1 ? 'mint' : 'pink'}
                                border="hand"
                                shadow="paper"
                                rotation={i % 2 === 0 ? -1 : 1}
                                className={`p-6 relative flex flex-col h-full ${item.linkUrl ? 'hover:shadow-paper-hover hover:-translate-y-1 transition-all' : ''}`}
                            >
                                <span className="absolute top-3 left-4 text-3xl text-ink/15 font-serif">"</span>
                                <p className="text-ink text-sm leading-relaxed opacity-70 mt-5 mb-4 flex-1">{item.quote}</p>

                                {item.proofImage && (
                                    <div className="mb-4 rounded-xl overflow-hidden border-[2px] border-ink/10 shadow-sm">
                                        <img src={item.proofImage} alt="Proof" className="w-full h-32 object-cover hover:scale-105 transition-transform duration-500" />
                                    </div>
                                )}

                                <div className="flex items-center gap-3">
                                    {item.avatar ? (
                                        <img src={item.avatar} alt={item.author} className="w-10 h-10 rounded-full object-cover ring-2 ring-ink/10" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-craft-mint flex items-center justify-center text-white font-bold text-sm border-[2px] border-ink">{item.author?.[0] || '?'}</div>
                                    )}
                                    <span className="font-heading font-bold text-sm text-ink">{item.author}</span>
                                </div>
                            </PaperCard>
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
                    className={`inline-flex items-center gap-3 bg-cardstock-mint text-ink px-8 py-4 border-[2.5px] border-ink rounded-[1.25rem] text-lg font-bold hover:bg-cardstock-yellow hover:scale-105 hover:-rotate-1 transition-all shadow-paper hover:shadow-paper-hover scroll-reveal scroll-delay-2 ${isRevealed ? 'scroll-revealed' : ''}`}
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
        const fill = c.fillColor || '#81c784';
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


export function LandingPage({ startCustomizing, siteContent, onNavigateToLegal }: LandingPageProps) {
    const { global, footer } = siteContent;
    const visibleSections = siteContent.landingPage.filter(s => s.visible && s.type !== 'patchuuHero');

    return (
        <div className="min-h-screen bg-paper" style={{
            ['--color-primary' as any]: global.primaryColor,
            ['--color-secondary' as any]: global.secondaryColor
        }}>
            {/* Hardcoded Patchuu Hero — not editable via CMS */}
            <PatchuuHeroSection
                content={{
                    logoImage: '/hero/patchuu-logo.png',
                    catLeftImage: '/hero/cat-left.png',
                    catRightImage: '/hero/cat-right.png',
                    headlineImage: '/hero/headline-text.png',
                    descriptionImage: '/hero/description-text.png',
                    flowerImage: '/hero/flower.png',
                    heartImage: '/hero/heart.png',
                    ctaText: 'Start Designing',
                    backgroundColor: '#fdfbf7',
                    toteBagImage: '/hero/tote-bag.png',
                    strawberryImage: '/hero/strawberry.png',
                    keychainWhiteImage: '/hero/keychain-white.png',
                    pouchImage: '/hero/pouch.png',
                    keychainBlueImage: '/hero/keychain-blue.png'
                }}
                startCustomizing={startCustomizing}
            />

            {/* Sections */}
            {visibleSections.map((section) => {
                switch (section.type) {
                    case 'hero': return <HeroSection key={section.id} content={section.content as HeroContent} startCustomizing={startCustomizing} />;
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
            <footer className="bg-paper-craft py-20 border-t-[2.5px] border-ink">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid md:grid-cols-4 gap-12 mb-16">
                        <div className="col-span-2">
                            <div className="flex items-center gap-3 mb-6">
                                <PatchuuLogo height={36} />
                                <span className="font-heading text-xl font-bold tracking-tight text-ink">{footer.brandName}</span>
                            </div>
                            <p className="text-ink/70 max-w-sm leading-relaxed">{footer.tagline}</p>
                        </div>
                        <div>
                            <h4 className="font-bold mb-6 text-ink">Explore</h4>
                            <ul className="space-y-4 text-ink/70">
                                <li><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-craft-mint transition-colors">Home</button></li>
                                <li><button onClick={startCustomizing} className="hover:text-craft-mint transition-colors">Gallery</button></li>
                                <li><button onClick={startCustomizing} className="hover:text-craft-mint transition-colors">Design Tool</button></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold mb-6 text-ink">Legal</h4>
                            <ul className="space-y-4 text-ink/70">
                                <li><button onClick={() => onNavigateToLegal?.('privacy')} className="hover:text-craft-mint transition-colors">Privacy Policy</button></li>
                                <li><button onClick={() => onNavigateToLegal?.('terms')} className="hover:text-craft-mint transition-colors">Terms of Service</button></li>
                                <li><button onClick={() => onNavigateToLegal?.('refund')} className="hover:text-craft-mint transition-colors">Refund Policy</button></li>
                                <li><button onClick={() => onNavigateToLegal?.('shipping')} className="hover:text-craft-mint transition-colors">Shipping Policy</button></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold mb-6 text-ink">Connect</h4>
                            <div className="flex gap-4 mb-6">
                                <a href={footer.instagramUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-cardstock-mint flex items-center justify-center border-[2px] border-ink hover:bg-cardstock-yellow transition-colors shadow-paper hover:shadow-paper-hover"><Instagram className="w-5 h-5 text-ink" /></a>
                                <a href={footer.facebookUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-cardstock-blue flex items-center justify-center border-[2px] border-ink hover:bg-cardstock-yellow transition-colors shadow-paper hover:shadow-paper-hover"><Facebook className="w-5 h-5 text-ink" /></a>
                                <a href={footer.twitterUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-cardstock-pink flex items-center justify-center border-[2px] border-ink hover:bg-cardstock-yellow transition-colors shadow-paper hover:shadow-paper-hover"><Twitter className="w-5 h-5 text-ink" /></a>
                            </div>
                        </div>
                    </div>
                    <div className="pt-8 border-t-[2px] border-ink/10 border-dashed text-center text-ink/50 text-sm">
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
