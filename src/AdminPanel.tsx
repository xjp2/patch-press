import { useState, useEffect, useRef } from 'react';
import { db, storage, supabase, frontendProductToDb, frontendPatchToDb } from './lib/supabase';
import { Settings, X, Plus, ShoppingCart, Palette, Layers, Camera, AlertCircle, Trash2, Layout, ChevronDown, ChevronUp, Eye, EyeOff, Facebook, Twitter, Globe, Loader2, ImageIcon, RefreshCw, Wand2, Sparkles, Crop, Beaker } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { ImageTracer, type TracedZone } from './ImageTracer';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableSection } from './SortableSection';
import { SortableItem } from './SortableItem';
import { AdminOrderManagement } from './components/AdminOrderManagement';
import { TestRunner } from './components/TestRunner';
import { clearCmsCache } from './lib/cms';

export interface Notice {
    id: string;
    title: string;
    content: string;
    image?: string;
    date: string;
    type: 'announcement' | 'new-product' | 'promotion';
}

export interface Patch {
    id: string;
    name: string;
    category: string;
    image: string;
    price: number;
    width: number;
    height: number;
    contentZone?: {
        x: number;
        y: number;
        width: number;
        height: number;
        type: 'rectangle' | 'polygon';
        points?: { x: number; y: number }[];
    };
}

export interface Product {
    id: string;
    name: string;
    frontImage: string;
    backImage: string;
    basePrice: number;
    width: number;
    height: number;
    placementZone: {
        x: number;
        y: number;
        width: number;
        height: number;
        type: 'rectangle' | 'polygon';
        points?: { x: number; y: number }[];
    };
    cropZone?: {
        x: number;
        y: number;
        width: number;
        height: number;
        type: 'rectangle' | 'polygon';
        points?: { x: number; y: number }[];
    };
}

// ───── Site Content Types ─────
export interface HeroSlide {
    id: string;
    title: string;
    subtitle: string;
    image: string;
    ctaLink?: string;
    ctaAction?: 'customize' | 'scroll' | 'link';
    ctaText?: string;
    isFullWidth?: boolean;
}

export interface HowItWorksStep {
    id: string; // Add ID for stable keys
    title: string;
    description: string;
    image: string;
    emoji: string;
}

export interface GalleryItem {
    id: string;
    image: string;
    label: string;
    linkUrl?: string; // Redirect link for gallery item
}

// ── New addable section content types ──
export interface TextBlockContent { heading: string; body: string; alignment: 'left' | 'center' | 'right'; }
export interface ImageBannerContent {
    image: string;
    alt: string;
    caption: string;
    fullWidth: boolean;
    isGallery?: boolean; // Toggle for carousel/gallery mode
    galleryItems?: { image: string, linkUrl?: string }[];
    linkUrl?: string; // Redirect URL for single image
    isClickable?: boolean; // Toggle clickability
    // Container styling
    hasContainer?: boolean; // Add outer container with background
    containerBgColor?: string;
    borderRadius?: number; // Corner roundness (px)
    borderWidth?: number; // Border thickness (px)
    borderColor?: string;
    padding?: number; // Inner padding (px)
    shadow?: 'none' | 'small' | 'medium' | 'large';
    imageFit?: 'cover' | 'contain' | 'none';
    maxHeight?: number;
    // Button properties
    showButton?: boolean;
    buttonText?: string;
    buttonUrl?: string;
    buttonAction?: 'customize' | 'scroll' | 'link';
    buttonPosition?: 'left' | 'center' | 'right';
    buttonVerticalFrom?: 'top' | 'bottom';
    buttonVerticalPosition?: number; // pixels from top or bottom
    buttonStyle?: 'solid' | 'outline' | 'ghost';
    buttonColor?: string;
    buttonTextColor?: string;
}
export interface TestimonialItem {
    id: string;
    quote: string;
    author: string;
    avatar?: string;
    proofImage?: string;
    linkUrl?: string;
}
export interface TestimonialsContent { 
    sectionTitle: string; 
    items: TestimonialItem[];
    titleAlignment?: 'left' | 'center' | 'right';
    titleColor?: string;
}
export interface CtaContent {
    heading: string;
    subtitle?: string;
    buttonText: string;
    buttonAction: 'customize' | 'scroll' | 'link';
    linkUrl?: string;
    titleAlignment?: 'left' | 'center' | 'right';
    titleColor?: string;
    subtitleAlignment?: 'left' | 'center' | 'right';
    subtitleColor?: string;
}
export interface DividerContent { style: 'line' | 'dots' | 'wave'; }

// New: Organic transition shapes between sections
export interface TransitionContent {
    shape: 'wave' | 'blob' | 'cloud' | 'arch' | 'zigzag' | 'triangle' | 'curve' | 'none';
    fillColor: string;      // Color of the shape
    flipVertical?: boolean; // Flip the shape upside down
    flipHorizontal?: boolean;
    height?: number;        // Height of the transition (px)
    marginTop?: number;
    marginBottom?: number;
}
export interface SectionStyling {
    backgroundColor?: string;
    paddingTop?: string;
    paddingBottom?: string;
    textColor?: string;
}

export type SectionType = 'hero' | 'howItWorks' | 'gallery' | 'textBlock' | 'imageBanner' | 'testimonials' | 'cta' | 'divider' | 'transition';

export interface CustomizePageContent {
    step1Title: string;
    step1Subtitle: string;
    step2PanelTitle: string;
    step3Title: string;
    step3Subtitle: string;
    howToDesignSteps: string[];
}

export interface PageSection {
    id: string;
    type: SectionType;
    visible: boolean;
    content: HeroContent | HowItWorksContent | GalleryContent | TextBlockContent | ImageBannerContent | TestimonialsContent | CtaContent | DividerContent | TransitionContent;
    styling?: SectionStyling;
}

export interface HeroContent {
    slides: HeroSlide[];
    ctaText: string;
    showNoticesOverride?: boolean;
    isFullWidth?: boolean;
    titleAlignment?: 'left' | 'center' | 'right';
    titleColor?: string;
    subtitleAlignment?: 'left' | 'center' | 'right';
    subtitleColor?: string;
}
export interface HowItWorksContent { 
    sectionTitle: string; 
    steps: HowItWorksStep[];
    titleAlignment?: 'left' | 'center' | 'right';
    titleColor?: string;
}
export interface GalleryContent { 
    sectionTitle: string; 
    items: GalleryItem[];
    titleAlignment?: 'left' | 'center' | 'right';
    titleColor?: string;
}

export interface GlobalSettings {
    logoText: string;
    logoImage: string;
    primaryColor: string;
    secondaryColor: string;
    headingFont: string;
    bodyFont: string;
    currency: 'USD' | 'SGD' | 'EUR' | 'GBP' | 'JPY' | 'KRW';
    currencySymbol: string;
}

export interface FooterContent {
    brandName: string;
    tagline: string;
    copyright: string;
    instagramUrl: string;
    facebookUrl: string;
    twitterUrl: string;
}

export interface NavbarContent {
    links: { label: string; url: string; id?: string }[];
    showLogo?: boolean;
    showCart?: boolean;
    bgColor?: string;
    textColor?: string;
    // Enhanced navbar options
    isFloating?: boolean; // Floating pill-style navbar
    isTransparent?: boolean; // Transparent background
    position?: 'fixed' | 'static';
    height?: number; // Navbar height in px
    borderRadius?: number; // For floating style
    shadow?: 'none' | 'small' | 'medium' | 'large';
    wrapperBgColor?: string; // Background color behind the navbar
}

export interface SiteContent {
    landingPage: PageSection[];
    footer: FooterContent;
    global: GlobalSettings;
    customizePage: CustomizePageContent;
    navbar: NavbarContent;
}

// Helper: section type metadata
export const SECTION_META: Record<SectionType, { label: string; icon: string }> = {
    hero: { label: 'Hero Section', icon: '🖼️' },
    howItWorks: { label: 'How It Works', icon: '🔧' },
    gallery: { label: 'Featured Creations', icon: '🎨' },
    textBlock: { label: 'Text Block', icon: '📝' },
    imageBanner: { label: 'Image Banner', icon: '🏞️' },
    testimonials: { label: 'Testimonials', icon: '💬' },
    cta: { label: 'Call to Action', icon: '🚀' },
    divider: { label: 'Divider', icon: '➖' },
    transition: { label: 'Shape Transition', icon: '🌊' },
};

type AdminTab = 'products' | 'patches' | 'orders' | 'pages' | 'global' | 'tests';

export interface AdminPanelProps {
    showAdmin: boolean;
    setShowAdmin: (show: boolean) => void;
    adminTab: AdminTab;
    setAdminTab: (tab: AdminTab) => void;
    products: Product[];
    setProducts: (products: Product[]) => void;
    patches: Patch[];
    setPatches: (patches: Patch[]) => void;
    siteContent: SiteContent;
    setSiteContent: (content: SiteContent) => void;
    onContentSaved?: () => Promise<boolean> | void;
    usingStaticCms?: boolean;
}

export function AdminPanel({ showAdmin, setShowAdmin, adminTab, setAdminTab, products, setProducts, patches, setPatches, siteContent, setSiteContent, onContentSaved, usingStaticCms = false }: AdminPanelProps) {
    if (!showAdmin) return null;
    // Pages CMS state
    const [openSection, setOpenSection] = useState<string | null>(null);
    const [pageSubTab, setPageSubTab] = useState<'landing' | 'customize' | 'global'>('landing');
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    
    // Ref to track latest siteContent for auto-save (avoids stale closure issues)
    const siteContentRef = useRef(siteContent);
    useEffect(() => {
        siteContentRef.current = siteContent;
    }, [siteContent]);
    
    // Rebuild state
    const [isRebuilding, setIsRebuilding] = useState(false);
    const [rebuildStatus, setRebuildStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [rebuildMessage, setRebuildMessage] = useState('');
    


    const handleRebuild = async () => {
        if (isRebuilding) return;
        
        setIsRebuilding(true);
        setRebuildStatus('idle');
        setRebuildMessage('');
        
        try {
            // Call the rebuild edge function
            const { data, error } = await supabase.functions.invoke('rebuild-site', {
                body: {}
            });

            if (error) {
                throw error;
            }

            if (data.success) {
                setRebuildStatus('success');
                setRebuildMessage(data.message || 'Rebuild triggered successfully!');
            } else {
                throw new Error(data.error || 'Rebuild failed');
            }
        } catch (err: any) {
            console.error('Rebuild error:', err);
            setRebuildStatus('error');
            
            if (err.message?.includes('No deploy webhook configured')) {
                setRebuildMessage('Deploy webhook not configured. Please set DEPLOY_WEBHOOK_URL in Supabase Edge Function secrets.');
            } else {
                setRebuildMessage(err.message || 'Failed to trigger rebuild');
            }
        } finally {
            setIsRebuilding(false);
            setTimeout(() => {
                setRebuildStatus('idle');
                setRebuildMessage('');
            }, 5000);
        }
    }

    // Note: CDN export is now integrated into save functions

    const handleSaveProducts = async (showFeedback = true) => {
        if (isSaving) return;
        setIsSaving(true);
        setSaveSuccess(null);
        try {
            console.log('Saving products...', products.length);
            // Step 1: Save all products to database
            const dbProducts = products.map((p, i) => frontendProductToDb(p, i));
            console.log('DB products to upsert:', dbProducts);
            const { data, error } = await db.products.upsert(dbProducts);
            if (error) {
                console.error('Upsert error:', error);
                throw error;
            }
            console.log('Upsert success:', data);
            
            // Clean up deleted products
            const currentIds = products.map(p => p.id);
            const { data: existingProducts } = await supabase.from('products').select('id');
            const toDelete = existingProducts?.filter(p => !currentIds.includes(p.id)) || [];
            
            // Delete in parallel
            await Promise.all(toDelete.map(p => db.products.remove(p.id)));
            
            // Step 2: Auto-export to CDN (so changes appear immediately)
            console.log('Auto-exporting to CDN...');
            const { error: exportError } = await supabase.functions.invoke('export-products-patches', {
                body: {}
            });
            
            if (exportError) {
                console.warn('Auto-export failed:', exportError);
                // Don't fail the save if export fails
            } else {
                console.log('✅ Products exported to CDN');
            }
            
            // Refresh local data (for dev mode without static files)
            if (onContentSaved) await onContentSaved();
            
            if (showFeedback) {
                setSaveSuccess('products');
                setHasUnsavedChanges(false);
                setTimeout(() => setSaveSuccess(null), 3000);
            }
        } catch (err: any) {
            console.error('Failed to save products:', err);
            if (showFeedback) alert('Failed to save products: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSavePatches = async (showFeedback = true) => {
        if (isSaving) return;
        setIsSaving(true);
        setSaveSuccess(null);
        try {
            console.log('Saving patches...', patches.length);
            // Step 1: Save all patches to database
            const dbPatches = patches.map((p, i) => frontendPatchToDb(p, i));
            console.log('DB patches to upsert:', dbPatches);
            const { data, error } = await db.patches.upsert(dbPatches);
            if (error) {
                console.error('Upsert error:', error);
                throw error;
            }
            console.log('Upsert success:', data);
            
            // Clean up deleted patches
            const currentIds = patches.map(p => p.id);
            const { data: existingPatches } = await supabase.from('patches').select('id');
            const toDelete = existingPatches?.filter(p => !currentIds.includes(p.id)) || [];
            
            // Delete in parallel
            await Promise.all(toDelete.map(p => db.patches.remove(p.id)));
            
            // Step 2: Auto-export to CDN (so changes appear immediately)
            console.log('Auto-exporting to CDN...');
            const { error: exportError } = await supabase.functions.invoke('export-products-patches', {
                body: {}
            });
            
            if (exportError) {
                console.warn('Auto-export failed:', exportError);
                // Don't fail the save if export fails
            } else {
                console.log('✅ Patches exported to CDN');
            }
            
            // Refresh local data (for dev mode without static files)
            if (onContentSaved) await onContentSaved();
            
            if (showFeedback) {
                setSaveSuccess('patches');
                setHasUnsavedChanges(false);
                setTimeout(() => setSaveSuccess(null), 3000);
            }
        } catch (err: any) {
            console.error('Failed to save patches:', err);
            if (showFeedback) alert('Failed to save patches: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSavePages = async (successType: 'pages' | 'global' = 'pages', showFeedback = true) => {
        if (isSaving) return;
        setIsSaving(true);
        setSaveSuccess(null);
        // Use ref to get latest state (avoids stale closure issues in auto-save)
        const content = siteContentRef.current;
        try {
            console.log('💾 handleSavePages saving navbar:', content.navbar);
            const { error } = await db.siteContent.save({
                landing_page: content.landingPage,
                footer: content.footer,
                global_settings: content.global,
                customize_page: content.customizePage,
                navbar: content.navbar
            });
            if (error) throw error;
            console.log('✅ handleSavePages saved successfully');
            
            // Only refresh data for manual saves, NOT auto-saves
            // This prevents auto-save from overwriting user's ongoing edits
            if (showFeedback && onContentSaved) {
                await onContentSaved();
            }
            
            if (showFeedback) {
                setSaveSuccess(successType);
                setTimeout(() => setSaveSuccess(null), 3000);
            }
            // Always mark as saved
            setHasUnsavedChanges(false);
        } catch (err: any) {
            console.error('Failed to save site settings:', err);
            if (showFeedback) alert('Failed to save site settings: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };
    
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);
    
    // Warn about unsaved changes when closing
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    const toggleSection = (sectionId: string) => setOpenSection(openSection === sectionId ? null : sectionId);

    // DnD sensors
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    // ── Section-level operations ──
    const updateLandingPage = (sections: PageSection[]) => {
        const newContent = { ...siteContent, landingPage: sections };
        setSiteContent(newContent);
        siteContentRef.current = newContent;
        setHasUnsavedChanges(true);
        // Auto-save after delay
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => handleSavePages('pages', false), 2000);
    };
    const updateFooter = (patch: Partial<SiteContent['footer']>) => {
        const newContent = { ...siteContent, footer: { ...siteContent.footer, ...patch } };
        setSiteContent(newContent);
        siteContentRef.current = newContent;
        setHasUnsavedChanges(true);
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => handleSavePages('pages', false), 2000);
    };
    const updateCustomizePage = (patch: Partial<CustomizePageContent>) => {
        const newContent = { ...siteContent, customizePage: { ...siteContent.customizePage, ...patch } };
        setSiteContent(newContent);
        siteContentRef.current = newContent;
        setHasUnsavedChanges(true);
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => handleSavePages('pages', false), 2000);
    };

    const updateSectionContent = (sectionId: string, content: PageSection['content']) => {
        updateLandingPage(siteContent.landingPage.map(s => s.id === sectionId ? { ...s, content } : s));
    };

    const updateSectionStyling = (sectionId: string, styling: Partial<SectionStyling>) => {
        updateLandingPage(siteContent.landingPage.map(s => s.id === sectionId ? { ...s, styling: { ...s.styling, ...styling } } : s));
    };

    const updateGlobalSettings = (patch: Partial<GlobalSettings>) => {
        const newContent = { ...siteContent, global: { ...siteContent.global, ...patch } };
        setSiteContent(newContent);
        siteContentRef.current = newContent;
        setHasUnsavedChanges(true);
        // Auto-save after delay
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => handleSavePages('global', false), 2000);
    };
    
    const updateNavbar = (patch: Partial<NavbarContent>) => {
        console.log('📝 updateNavbar called with patch:', patch);
        // Update state
        const newContent = { ...siteContent, navbar: { ...siteContent.navbar, ...patch } };
        setSiteContent(newContent);
        // Also update ref immediately for auto-save
        siteContentRef.current = newContent;
        setHasUnsavedChanges(true);
        // Auto-save after delay
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            handleSavePages('pages', false);
        }, 2000);
    };

    const toggleSectionVisibility = (sectionId: string) => {
        updateLandingPage(siteContent.landingPage.map(s => s.id === sectionId ? { ...s, visible: !s.visible } : s));
    };

    const removeSection = (sectionId: string) => {
        updateLandingPage(siteContent.landingPage.filter(s => s.id !== sectionId));
    };

    const addSection = (type: SectionType) => {
        const defaults: Record<SectionType, PageSection['content']> = {
            hero: { slides: [{ id: uuidv4(), title: 'New Slide', subtitle: 'Your subtitle here', image: '', ctaAction: 'customize', isFullWidth: true }], ctaText: 'Get Started' } as HeroContent,
            howItWorks: { sectionTitle: 'How It Works', steps: [{ id: uuidv4(), title: 'Step 1', description: 'Description', image: '', emoji: '✨' }] } as HowItWorksContent,
            gallery: { sectionTitle: 'Gallery', items: [{ id: uuidv4(), image: '', label: 'Item 1' }] } as GalleryContent,
            textBlock: { heading: 'Your Heading', body: 'Your text content here...', alignment: 'center' } as TextBlockContent,
            imageBanner: { image: '', alt: 'Banner', caption: '', fullWidth: true, isGallery: false, galleryItems: [], imageFit: 'none', maxHeight: 0 } as ImageBannerContent,
            testimonials: { sectionTitle: 'What Our Customers Say', items: [{ id: uuidv4(), quote: 'Amazing!', author: 'Happy Customer', avatar: '' }] } as TestimonialsContent,
            cta: { heading: 'Ready to create?', subtitle: 'Start designing your custom accessories today.', buttonText: 'Start Now', buttonAction: 'customize' } as CtaContent,
            divider: { style: 'line' } as DividerContent,
            transition: { shape: 'wave', fillColor: '#FFB6C1', height: 80, flipVertical: false, flipHorizontal: false } as TransitionContent,
        };
        const newSection: PageSection = { id: uuidv4(), type, visible: true, content: defaults[type] };
        updateLandingPage([...siteContent.landingPage, newSection]);
        setShowAddMenu(false);
    };

    const handleSectionDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = siteContent.landingPage.findIndex(s => s.id === active.id);
            const newIndex = siteContent.landingPage.findIndex(s => s.id === over.id);
            updateLandingPage(arrayMove(siteContent.landingPage, oldIndex, newIndex));
        }
    };

    // ── Item-level helpers (work on a specific section) ──
    const getHeroContent = (sectionId: string) => siteContent.landingPage.find(s => s.id === sectionId)?.content as HeroContent | undefined;
    const getHowItWorksContent = (sectionId: string) => siteContent.landingPage.find(s => s.id === sectionId)?.content as HowItWorksContent | undefined;
    const getGalleryContent = (sectionId: string) => siteContent.landingPage.find(s => s.id === sectionId)?.content as GalleryContent | undefined;

    const updateHeroSlide = (sectionId: string, index: number, patch: Partial<HeroSlide>) => {
        const c = getHeroContent(sectionId); if (!c) return;
        const slides = [...c.slides]; slides[index] = { ...slides[index], ...patch };
        updateSectionContent(sectionId, { ...c, slides });
    };
    const addHeroSlide = (sectionId: string) => {
        const c = getHeroContent(sectionId); if (!c) return;
        updateSectionContent(sectionId, { ...c, slides: [...c.slides, { id: uuidv4(), title: 'New Slide', subtitle: '', image: '' }] });
    };
    const removeHeroSlide = (sectionId: string, slideId: string) => {
        const c = getHeroContent(sectionId); if (!c) return;
        updateSectionContent(sectionId, { ...c, slides: c.slides.filter(s => s.id !== slideId) });
    };
    const handleHeroSlideDragEnd = (sectionId: string, event: DragEndEvent) => {
        const c = getHeroContent(sectionId); if (!c) return;
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = c.slides.findIndex(s => s.id === active.id);
            const newIndex = c.slides.findIndex(s => s.id === over.id);
            updateSectionContent(sectionId, { ...c, slides: arrayMove(c.slides, oldIndex, newIndex) });
        }
    };

    const updateStep = (sectionId: string, index: number, patch: Partial<HowItWorksStep>) => {
        const c = getHowItWorksContent(sectionId); if (!c) return;
        const steps = [...c.steps]; steps[index] = { ...steps[index], ...patch };
        updateSectionContent(sectionId, { ...c, steps });
    };
    const addStep = (sectionId: string) => {
        const c = getHowItWorksContent(sectionId); if (!c) return;
        updateSectionContent(sectionId, { ...c, steps: [...c.steps, { id: uuidv4(), title: 'New Step', description: '', image: '', emoji: '' }] });
    };
    const removeStep = (sectionId: string, stepId: string) => {
        const c = getHowItWorksContent(sectionId); if (!c) return;
        updateSectionContent(sectionId, { ...c, steps: c.steps.filter(s => s.id !== stepId) });
    };
    const handleStepDragEnd = (sectionId: string, event: DragEndEvent) => {
        const c = getHowItWorksContent(sectionId); if (!c) return;
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = c.steps.findIndex(s => s.id === active.id);
            const newIndex = c.steps.findIndex(s => s.id === over.id);
            updateSectionContent(sectionId, { ...c, steps: arrayMove(c.steps, oldIndex, newIndex) });
        }
    };

    const addGalleryItem = (sectionId: string) => {
        const c = getGalleryContent(sectionId); if (!c) return;
        updateSectionContent(sectionId, { ...c, items: [...c.items, { id: uuidv4(), image: '', label: 'New Item' }] });
    };
    const removeGalleryItem = (sectionId: string, itemId: string) => {
        const c = getGalleryContent(sectionId); if (!c) return;
        updateSectionContent(sectionId, { ...c, items: c.items.filter(i => i.id !== itemId) });
    };
    const updateGalleryItem = (sectionId: string, itemId: string, patch: Partial<GalleryItem>) => {
        const c = getGalleryContent(sectionId); if (!c) return;
        updateSectionContent(sectionId, { ...c, items: c.items.map(i => i.id === itemId ? { ...i, ...patch } : i) });
    };
    const handleGalleryDragEnd = (sectionId: string, event: DragEndEvent) => {
        const c = getGalleryContent(sectionId); if (!c) return;
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = c.items.findIndex(i => i.id === active.id);
            const newIndex = c.items.findIndex(i => i.id === over.id);
            updateSectionContent(sectionId, { ...c, items: arrayMove(c.items, oldIndex, newIndex) });
        }
    };

    const addTestimonial = (sectionId: string) => {
        const c = siteContent.landingPage.find(s => s.id === sectionId)?.content as TestimonialsContent | undefined; if (!c) return;
        updateSectionContent(sectionId, { ...c, items: [...c.items, { id: uuidv4(), quote: 'New quote', author: 'Author', avatar: '' }] });
    };
    const removeTestimonial = (sectionId: string, itemId: string) => {
        const c = siteContent.landingPage.find(s => s.id === sectionId)?.content as TestimonialsContent | undefined; if (!c) return;
        updateSectionContent(sectionId, { ...c, items: c.items.filter(i => i.id !== itemId) });
    };
    const updateTestimonial = (sectionId: string, itemId: string, patch: Partial<TestimonialItem>) => {
        const c = siteContent.landingPage.find(s => s.id === sectionId)?.content as TestimonialsContent | undefined; if (!c) return;
        updateSectionContent(sectionId, { ...c, items: c.items.map(i => i.id === itemId ? { ...i, ...patch } : i) });
    };
    // State for inputs

    const [newProductName, setNewProductName] = useState('');
    const [newProductPrice, setNewProductPrice] = useState('');
    const [newProductFrontImage, setNewProductFrontImage] = useState('');
    const [newProductBackImage, setNewProductBackImage] = useState('');
    // Visual Zone Editor State
    const [showZoneEditor, setShowZoneEditor] = useState(false);
    const [showCropEditor, setShowCropEditor] = useState(false);

    const [editingProductId, setEditingProductId] = useState<string | null>(null);
    const [editingProductForCrop, setEditingProductForCrop] = useState<string | null>(null);
    const [editingPatchId, setEditingPatchId] = useState<string | null>(null);
    const [tracerImageUrl, setTracerImageUrl] = useState('');
    const [tracerInitialZone, setTracerInitialZone] = useState<TracedZone | undefined>(undefined);

    const [tempZone, setTempZone] = useState<TracedZone>({ x: 15, y: 25, width: 70, height: 60, type: 'rectangle' });

    const [newPatchName, setNewPatchName] = useState('');
    const [newPatchPrice, setNewPatchPrice] = useState('');
    // const [newPatchCategory, setNewPatchCategory] = useState('food'); // Removed unused
    const [newPatchImage, setNewPatchImage] = useState('');
    // Patch dimensions
    const [newPatchWidth, setNewPatchWidth] = useState('80');
    const [newPatchHeight, setNewPatchHeight] = useState('80');
    // Patch content zone editor (for trimming patch bounds)
    const [showPatchSizer, setShowPatchSizer] = useState(false);
    const [tempPatchZone, setTempPatchZone] = useState<TracedZone>({ x: 10, y: 10, width: 80, height: 80, type: 'rectangle' });


    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, setter: (url: string) => void, folder: string = 'uploads', onLoad?: (width: number, height: number) => void) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                setIsSaving(true);
                const fileName = `${uuidv4()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
                const publicUrl = await storage.upload(folder, fileName, file);
                setter(publicUrl);
                
                // If callback provided, load image to get dimensions
                if (onLoad) {
                    const img = new Image();
                    img.onload = () => {
                        onLoad(img.naturalWidth, img.naturalHeight);
                    };
                    img.src = publicUrl;
                }
            } catch (err: any) {
                alert('Upload failed: ' + err.message);
            } finally {
                setIsSaving(false);
            }
        }
    };

    const handleAddProduct = () => {
        if (!newProductName || !newProductPrice || !newProductFrontImage) return;
        const product: Product = {
            id: uuidv4(),
            name: newProductName,
            frontImage: newProductFrontImage,
            backImage: newProductBackImage || newProductFrontImage,
            basePrice: parseInt(newProductPrice),
            width: 400, // Default base width
            height: 500, // Default base height 
            placementZone: tempZone
        };
        setProducts([...products, product]);
        // Reset forms
        setNewProductName(''); setNewProductPrice(''); setNewProductFrontImage(''); setNewProductBackImage('');
        setTempZone({ x: 15, y: 25, width: 70, height: 60, type: 'rectangle' });
    };

    const handleAddPatch = () => {
        if (!newPatchName || !newPatchPrice || !newPatchImage) return;
        const patch: Patch = {
            id: uuidv4(),
            name: newPatchName,
            category: 'Custom',
            image: newPatchImage,
            price: parseInt(newPatchPrice),
            width: parseInt(newPatchWidth) || 80,
            height: parseInt(newPatchHeight) || 80,
            contentZone: tempPatchZone
        };
        setPatches([...patches, patch]);
        setNewPatchName(''); setNewPatchPrice(''); setNewPatchImage('');
        setTempPatchZone({ x: 10, y: 10, width: 80, height: 80, type: 'rectangle' });
    };

    const handleDeletePatch = async (id: string) => {
        if (confirm('Are you sure you want to delete this patch?')) {
            const { error } = await db.patches.remove(id);
            if (error) {
                alert('Failed to delete patch from database: ' + error.message);
                return; // Don't update UI if DB deletion failed
            }
            setPatches(patches.filter(p => p.id !== id));
        }
    };

    

    const openImageTracer = (mode: 'placement' | 'crop', productId?: string) => {
        const product = productId ? products.find(p => p.id === productId) : null;
        const imageUrl = product?.frontImage || newProductFrontImage;
        
        if (!imageUrl) {
            alert("Please upload an image first!");
            return;
        }

        setTracerImageUrl(imageUrl);
        
        if (mode === 'placement') {
            setTracerInitialZone(product?.placementZone || tempZone);
        } else {
            setTracerInitialZone(product?.cropZone || { x: 0, y: 0, width: 100, height: 100, type: 'rectangle' });
        }
        
        if (productId) {
            if (mode === 'placement') {
                setEditingProductId(productId);
            } else {
                setEditingProductForCrop(productId);
            }
        }
        
        if (mode === 'placement') {
            setShowZoneEditor(true);
        } else {
            setShowCropEditor(true);
        }
    };

    // Open visual sizer for NEW patches (to define content zone before adding)
    const openPatchSizer = () => {
        if (!newPatchImage) {
            alert("Please upload a patch image first!");
            return;
        }
        setTracerImageUrl(newPatchImage);
        setTracerInitialZone(tempPatchZone);
        setShowPatchSizer(true);
    };

    const openExistingPatchSizer = (patchId: string) => {
        const patch = patches.find(p => p.id === patchId);
        if (!patch?.image) {
            alert("Patch has no image!");
            return;
        }
        setEditingPatchId(patchId);
        setTracerImageUrl(patch.image);
        setTracerInitialZone(patch.contentZone || { x: 10, y: 10, width: 80, height: 80, type: 'rectangle' });
        setShowPatchSizer(true);
    };

    return (
        <>
            <div className="fixed inset-0 z-[100] bg-cream overflow-auto animate-slide-up shadow-2xl">
                <div className="max-w-6xl mx-auto p-4 sm:p-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10 border-b border-pink/10 pb-8">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-pink to-[#ff8da1] rounded-2xl flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-0 transition-transform duration-300">
                                <Settings className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h1 className="font-heading text-3xl font-bold tracking-tight text-gray-900">Admin <span className="text-pink">Panel</span></h1>
                                <p className="text-gray-500 text-sm font-medium">Manage your brand's digital experience</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setShowAdmin(false)} className="p-2.5 hover:bg-white rounded-xl border border-transparent hover:border-pink/10 transition-all shadow-sm hover:shadow text-gray-400 hover:text-pink">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    {/* Unsaved Changes Warning */}
                    {hasUnsavedChanges && (
                        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-amber-700">
                            <AlertCircle className="w-5 h-5" />
                            <span className="text-sm font-medium">You have unsaved changes. Click "Update Live Site" to save and deploy.</span>
                        </div>
                    )}

                    {/* Rebuild Button - only show if usingStaticCms */}
                    {usingStaticCms && (
                        <div className="mb-6 flex items-center gap-3">
                            <button
                                onClick={handleRebuild}
                                disabled={isRebuilding}
                                className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg flex items-center gap-2 ${
                                    rebuildStatus === 'success' 
                                        ? 'bg-green-500 text-white shadow-green-500/30' 
                                        : rebuildStatus === 'error'
                                        ? 'bg-red-500 text-white shadow-red-500/30'
                                        : 'bg-pink text-white hover:bg-pink-400 shadow-pink/30 hover:shadow-xl hover:-translate-y-0.5'
                                } ${isRebuilding ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {isRebuilding ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Updating...
                                    </>
                                ) : rebuildStatus === 'success' ? (
                                    <>
                                        <Sparkles className="w-4 h-4" />
                                        Updated!
                                    </>
                                ) : rebuildStatus === 'error' ? (
                                    <>
                                        <AlertCircle className="w-4 h-4" />
                                        Failed
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="w-4 h-4" />
                                        Update Live Site
                                    </>
                                )}
                            </button>
                            {rebuildMessage && (
                                <p className={`text-sm ${rebuildStatus === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                    {rebuildMessage}
                                </p>
                            )}
                            
                            {/* Manual refresh button for admin's browser */}
                            <button
                                onClick={() => {
                                    clearCmsCache();
                                    window.location.reload();
                                }}
                                className="px-4 py-2 text-sm text-gray-600 hover:text-pink hover:bg-pink/10 rounded-lg transition-colors flex items-center gap-2"
                                title="Force refresh this browser window to see latest changes"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Refresh My View
                            </button>
                        </div>
                    )}

                    {/* Tabs */}
                    <div className="flex gap-2 mb-10 bg-white p-1.5 rounded-2xl border border-pink/10 overflow-x-auto no-scrollbar shadow-sm">
                        {[
                            { id: 'products', label: 'Products', icon: ShoppingCart },
                            { id: 'patches', label: 'Patches', icon: Palette },
                            { id: 'orders', label: 'Orders', icon: Layers },
                            { id: 'pages', label: 'Pages', icon: Layout },
                            { id: 'global', label: 'Global', icon: Globe },
                            { id: 'tests', label: 'Tests', icon: Beaker }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setAdminTab(tab.id as AdminTab)}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${adminTab === tab.id
                                    ? 'bg-white text-pink shadow-md shadow-pink/5 translate-y-[-1px] border border-pink/5'
                                    : 'text-gray-400 hover:text-pink hover:bg-white/60'
                                    }`}
                            >
                                <tab.icon className={`w-4 h-4 ${adminTab === tab.id ? 'text-pink' : 'text-gray-400'}`} />{tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-pink/5 border border-pink/10 min-h-[600px]">

                        {/* Products Tab with Visual Zone Editor */}
                        {adminTab === 'products' && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center bg-pink/5 p-4 rounded-2xl border border-pink/10 mb-2">
                                    <div>
                                        <h2 className="font-heading text-xl font-bold text-gray-900">Products</h2>
                                        <p className="text-xs text-gray-500 font-medium">Add or edit base products for customization</p>
                                    </div>
                                    <button
                                        onClick={() => handleSaveProducts(true)}
                                        disabled={isSaving}
                                        className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm ${saveSuccess === 'products' ? 'bg-green-500 text-white' : 'bg-pink text-white hover:bg-pink/90'} ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        title="Saves to database and publishes to live site via CDN"
                                    >
                                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : saveSuccess === 'products' ? null : <ShoppingCart className="w-4 h-4" />}
                                        {saveSuccess === 'products' ? '✅ Published Live' : '💾 Save & Publish'}
                                    </button>
                                </div>

                                {/* Context7 Best Practice: Section heading with proper spacing */}
                                <h2 className="font-heading text-xl font-bold text-foreground">Add New Product</h2>
                                
                                {/* Context7 Best Practice: flex flex-col gap-6 for field groups */}
                                <div className="flex flex-col gap-6">
                                    <div className="grid md:grid-cols-2 gap-4">
                                        {/* Context7 Best Practice: focus-visible ring for accessibility */}
                                        <input 
                                            type="text" 
                                            value={newProductName || ''} 
                                            onChange={(e) => setNewProductName(e.target.value)} 
                                            placeholder="Product Name" 
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink/50 focus-visible:ring-offset-2 transition-all" 
                                        />
                                        <input 
                                            type="number" 
                                            value={newProductPrice || ''} 
                                            onChange={(e) => setNewProductPrice(e.target.value)} 
                                            placeholder="Base Price ($)" 
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink/50 focus-visible:ring-offset-2 transition-all" 
                                        />
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-6">
                                        {/* Context7 Best Practice: Field groups with gap-2 for label+input */}
                                        <div className="flex flex-col gap-2">
                                            <label className="text-sm font-semibold text-foreground">Front Image (Base)</label>
                                            <label className="flex items-center justify-center gap-2 px-4 py-8 bg-cream rounded-xl cursor-pointer hover:bg-pink/10 transition-colors border-2 border-dashed border-gray-300 focus-within:ring-2 focus-within:ring-pink/50 focus-within:ring-offset-2">
                                                <Camera className="w-6 h-6 text-pink" aria-hidden="true" />
                                                <span className="text-sm">Upload Front</span>
                                                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setNewProductFrontImage, 'products')} className="hidden" />
                                            </label>
                                            {newProductFrontImage && <img src={newProductFrontImage} alt="Front Preview" className="mt-2 w-24 h-24 object-contain rounded-lg" />}
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-sm font-semibold text-foreground">Back Image</label>
                                            <label className="flex items-center justify-center gap-2 px-4 py-8 bg-cream rounded-xl cursor-pointer hover:bg-pink/10 transition-colors border-2 border-dashed border-gray-300 focus-within:ring-2 focus-within:ring-pink/50 focus-within:ring-offset-2">
                                                <Camera className="w-6 h-6 text-pink" aria-hidden="true" />
                                                <span className="text-sm">Upload Back</span>
                                                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setNewProductBackImage, 'products')} className="hidden" />
                                            </label>
                                            {newProductBackImage && <img src={newProductBackImage} alt="Back Preview" className="mt-2 w-24 h-24 object-contain rounded-lg" />}
                                        </div>
                                    </div>
                                </div>

                                {/* Placement Zone Configuration */}
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                    <div className="flex justify-between items-center mb-4">
                                        <div>
                                            <h3 className="font-bold text-gray-700">Patch Placement Area</h3>
                                            <p className="text-xs text-gray-500">Define where customers can place patches on this product</p>
                                        </div>
                                        <button
                                            onClick={() => openImageTracer('placement')}
                                            className="text-pink hover:text-pink-600 font-semibold text-sm flex items-center gap-1 bg-pink/10 px-3 py-1.5 rounded-lg hover:bg-pink/20 transition-colors"
                                        >
                                            <Wand2 className="w-4 h-4" /> Edit Placement Area
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 text-sm">
                                        <div>
                                            <span className="text-gray-500">X:</span> {Math.round(tempZone.x)}%
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Y:</span> {Math.round(tempZone.y)}%
                                        </div>
                                        <div>
                                            <span className="text-gray-500">W:</span> {Math.round(tempZone.width)}%
                                        </div>
                                        <div>
                                            <span className="text-gray-500">H:</span> {Math.round(tempZone.height)}%
                                        </div>
                                    </div>
                                    {!newProductFrontImage && <p className="text-red-400 text-xs mt-2"><AlertCircle className="w-3 h-3 inline" /> Upload front image to edit zone</p>}
                                </div>

                                <button onClick={handleAddProduct} className="btn-primary"><Plus className="w-4 h-4 inline mr-2" />Add Product</button>

                                <div className="mt-8">
                                    <h3 className="font-heading text-lg font-bold mb-4">Existing Products ({products.length})</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {products.map(product => (
                                            <div key={product.id} className="bg-cream rounded-xl p-3 text-center relative group">
                                                <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                    <button onClick={() => openImageTracer('placement', product.id)} className="p-1.5 bg-white rounded-lg shadow text-indigo-500 hover:text-indigo-700 hover:scale-110 transition-transform" title="Edit where patches can be placed"><Wand2 className="w-4 h-4" /></button>
                                                    <button onClick={async () => {
                                                        if (confirm('Delete this product?')) {
                                                            const { error } = await db.products.remove(product.id);
                                                            if (error) alert('Failed to delete product: ' + error.message);
                                                            const newProducts = products.filter(p => p.id !== product.id);
                                                            setProducts(newProducts);
                                                        }
                                                    }} className="p-1 bg-white rounded shadow text-red-500 hover:text-red-700 hover:scale-110" title="Delete Product"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                                <img src={product.frontImage} alt={product.name} className="w-full h-20 object-contain mb-2" />
                                                <p className="text-sm font-semibold truncate">{product.name}</p>
                                                <p className="text-sm text-pink">${product.basePrice}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Patches Tab */}
                        {adminTab === 'patches' && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center bg-pink/5 p-4 rounded-2xl border border-pink/10 mb-2">
                                    <div>
                                        <h2 className="font-heading text-xl font-bold text-gray-900">Patches</h2>
                                        <p className="text-xs text-gray-500 font-medium">Manage custom patches and assets</p>
                                    </div>
                                    <button
                                        onClick={() => handleSavePatches(true)}
                                        disabled={isSaving}
                                        className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm ${saveSuccess === 'patches' ? 'bg-green-500 text-white' : 'bg-pink text-white hover:bg-pink/90'} ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        title="Saves to database and publishes to live site via CDN"
                                    >
                                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : saveSuccess === 'patches' ? null : <Palette className="w-4 h-4" />}
                                        {saveSuccess === 'patches' ? '✅ Published Live' : '💾 Save & Publish'}
                                    </button>
                                </div>
                                <h2 className="font-heading text-xl font-bold">Add New Patch</h2>
                                <div className="grid gap-4">
                                    <input type="text" value={newPatchName || ''} onChange={(e) => setNewPatchName(e.target.value)} placeholder="Patch Name" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink outline-none" />
                                    <input type="number" value={newPatchPrice || ''} onChange={(e) => setNewPatchPrice(e.target.value)} placeholder="Price ($)" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink outline-none" />

                                    <div>
                                        <label className="block text-sm font-semibold mb-2">Patch Image <span className="text-xs text-gray-500 font-normal">(size auto-detected)</span></label>
                                        <label className="flex items-center justify-center gap-2 px-4 py-8 bg-cream rounded-xl cursor-pointer hover:bg-pink/10 transition-colors border-2 border-dashed border-gray-300">
                                            <Camera className="w-6 h-6 text-pink" /><span className="text-sm">Upload Patch Image</span>
                                            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setNewPatchImage, 'patches', (w, h) => {
                                                setNewPatchWidth(String(w));
                                                setNewPatchHeight(String(h));
                                            })} className="hidden" />
                                        </label>
                                        {newPatchImage && (
                                            <div className="mt-2">
                                                <img src={newPatchImage} alt="Patch Preview" className="w-24 h-24 object-contain" />
                                                <p className="text-xs text-gray-500 mt-1">Size: {newPatchWidth} × {newPatchHeight} px (auto-detected)</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Content Zone Editor for New Patches */}
                                    {newPatchImage && (
                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <h4 className="font-bold text-gray-700">Patch Content Zone</h4>
                                                    <p className="text-xs text-gray-500">Define the usable area of this patch</p>
                                                </div>
                                                <button
                                                    onClick={openPatchSizer}
                                                    className="text-pink hover:text-pink-600 font-semibold text-sm flex items-center gap-1 bg-pink/10 px-3 py-1.5 rounded-lg hover:bg-pink/20 transition-colors"
                                                >
                                                    <Crop className="w-4 h-4" /> Edit Content Zone
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <button onClick={handleAddPatch} className="btn-primary w-fit"><Plus className="w-4 h-4 inline mr-2" />Add Patch</button>
                                </div>

                                <div className="mt-8">
                                    <h3 className="font-heading text-lg font-bold mb-4">Existing Patches ({patches.length})</h3>
                                    <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
                                        {patches.map(patch => (
                                            <div key={patch.id} className="bg-cream rounded-xl p-2 text-center relative group">
                                                <div className="absolute -top-1 -right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                    <button
                                                        onClick={() => openExistingPatchSizer(patch.id)}
                                                        className="bg-blue-500 text-white rounded-full p-0.5 shadow-sm"
                                                        title="Edit Content Zone"
                                                    >
                                                        <Crop className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeletePatch(patch.id)}
                                                        className="bg-red-500 text-white rounded-full p-0.5 shadow-sm"
                                                        title="Delete Patch"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                                <img src={patch.image} alt={patch.name} className="w-full aspect-square object-contain mb-1" />
                                                <p className="text-[10px] font-semibold truncate">{patch.name}</p>
                                                <p className="text-[10px] text-gray-400">{patch.width}×{patch.height}px</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {adminTab === 'orders' && (
                            <AdminOrderManagement />
                        )}

                        {adminTab === 'tests' && (
                            <TestRunner />
                        )}

                        {/* ───── Pages CMS Tab ───── */}
                        {adminTab === 'pages' && (
                            <div className="space-y-4">
                                {/* Page sub-tabs */}
                                <div className="flex justify-between items-center bg-pink/5 p-4 rounded-2xl border border-pink/10 mb-4">
                                    <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                                        {(['landing', 'customize'] as const).map(tab => (
                                            <button key={tab} onClick={() => setPageSubTab(tab)} className={`py-2 px-4 rounded-lg text-sm font-semibold transition-all ${pageSubTab === tab ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                                                {tab === 'landing' ? '🏠 Landing' : '🎨 Customize'}
                                            </button>
                                        ))}
                                    </div>
                                    {!usingStaticCms ? (
                                        <button
                                            onClick={() => handleSavePages('pages')}
                                            disabled={isSaving}
                                            className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm ${saveSuccess === 'pages' ? 'bg-green-500 text-white' : 'bg-pink text-white hover:bg-pink/90'} ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : saveSuccess === 'pages' ? null : <Layout className="w-4 h-4" />}
                                            {saveSuccess === 'pages' ? '✅ Saved' : '☁️ Save Site Changes'}
                                        </button>
                                    ) : (
                                        <div className="text-xs text-gray-400 bg-white px-3 py-1.5 rounded-lg border border-pink/10">
                                            Changes saved automatically
                                        </div>
                                    )}
                                </div>

                                {/* ─── Landing Page Builder ─── */}
                                {pageSubTab === 'landing' && (
                                    <div className="space-y-3">
                                        <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Drag sections to reorder • Toggle visibility • Add new blocks</p>

                                        {/* Sortable section list */}
                                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSectionDragEnd}>
                                            <SortableContext items={siteContent.landingPage.map(s => s.id)} strategy={verticalListSortingStrategy}>
                                                {siteContent.landingPage.map((section) => (
                                                    <SortableSection key={section.id} id={section.id}>
                                                        <div className={`border rounded-2xl overflow-hidden transition-all ${section.visible ? 'border-gray-200' : 'border-dashed border-gray-300 opacity-60'}`}>
                                                            {/* Section header */}
                                                            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50">
                                                                <span className="text-lg">{SECTION_META[section.type].icon}</span>
                                                                <button onClick={() => toggleSection(section.id)} className="flex-1 text-left font-heading font-bold text-sm">
                                                                    {SECTION_META[section.type].label}
                                                                </button>
                                                                <button onClick={() => toggleSectionVisibility(section.id)} className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors" title={section.visible ? 'Hide section' : 'Show section'}>
                                                                    {section.visible ? <Eye className="w-4 h-4 text-gray-500" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
                                                                </button>
                                                                <button onClick={() => removeSection(section.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors" title="Delete section">
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                                <button onClick={() => toggleSection(section.id)} className="p-1.5">
                                                                    {openSection === section.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                                                </button>
                                                            </div>

                                                            {/* Section content editor (expanded) */}
                                                            {openSection === section.id && (
                                                                <div className="p-4 space-y-4 border-t border-gray-100">
                                                                    {/* ── Hero editor ── */}
                                                                    {section.type === 'hero' && (() => {
                                                                        const c = section.content as HeroContent; return (
                                                                            <div className="space-y-4">
                                                                                <div className="flex flex-col sm:flex-row gap-4">
                                                                                    <div className="flex-1">
                                                                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Global CTA Button Text</label>
                                                                                        <input type="text" value={c.ctaText || ''} onChange={e => updateSectionContent(section.id, { ...c, ctaText: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink outline-none shadow-sm" />
                                                                                    </div>
                                                                                    <div className="flex items-center gap-2 pt-6">
                                                                                        <input type="checkbox" checked={c.isFullWidth} onChange={e => updateSectionContent(section.id, { ...c, isFullWidth: e.target.checked })} className="w-5 h-5 accent-pink" id={`full-width-${section.id}`} />
                                                                                        <label htmlFor={`full-width-${section.id}`} className="text-sm font-semibold text-gray-700">Global Full Width Mode</label>
                                                                                    </div>
                                                                                </div>
                                                                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Hero Slides</label>
                                                                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleHeroSlideDragEnd(section.id, e)}>
                                                                                    <SortableContext items={c.slides.map(s => s.id)} strategy={verticalListSortingStrategy}>
                                                                                        {c.slides.map((slide, i) => (
                                                                                            <SortableItem key={slide.id} id={slide.id}>
                                                                                                <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3 group shadow-sm hover:border-pink/30 transition-all">
                                                                                                    <div className="flex items-center justify-between">
                                                                                                        <span className="text-xs font-bold text-gray-400">Slide {i + 1}</span>
                                                                                                        <div className="flex items-center gap-2">
                                                                                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                                                                                <input type="checkbox" checked={slide.isFullWidth} onChange={e => updateHeroSlide(section.id, i, { isFullWidth: e.target.checked })} className="w-4 h-4 accent-pink" />
                                                                                                                <span className="text-[10px] font-bold text-gray-500">Full Width</span>
                                                                                                            </label>
                                                                                                            {c.slides.length > 1 && <button onClick={() => removeHeroSlide(section.id, slide.id)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                    <div className="grid sm:grid-cols-2 gap-3">
                                                                                                        <input type="text" value={slide.title || ''} onChange={e => updateHeroSlide(section.id, i, { title: e.target.value })} placeholder="Slide Title" className="w-full px-3 py-2 rounded-lg border border-gray-100 focus:border-pink outline-none text-sm" />
                                                                                                        <input type="text" value={slide.subtitle || ''} onChange={e => updateHeroSlide(section.id, i, { subtitle: e.target.value })} placeholder="Subtitle" className="w-full px-3 py-2 rounded-lg border border-gray-100 focus:border-pink outline-none text-sm" />
                                                                                                    </div>
                                                                                                    <div className="grid sm:grid-cols-2 gap-3">
                                                                                                        <div className="space-y-1">
                                                                                                            <select value={slide.ctaAction || ''} onChange={e => updateHeroSlide(section.id, i, { ctaAction: e.target.value as any })} className="w-full px-3 py-2 rounded-lg border border-gray-100 focus:border-pink outline-none text-sm bg-white">
                                                                                                                <option value="">Default Action</option>
                                                                                                                <option value="customize">Go to Customize</option>
                                                                                                                <option value="scroll">Scroll Down</option>
                                                                                                                <option value="link">Custom Link</option>
                                                                                                            </select>
                                                                                                        </div>
                                                                                                        <input type="text" value={slide.ctaText || ''} onChange={e => updateHeroSlide(section.id, i, { ctaText: e.target.value })} placeholder="CTA Text (overrides global)" className="w-full px-3 py-2 rounded-lg border border-gray-100 focus:border-pink outline-none text-sm" />
                                                                                                    </div>
                                                                                                    <input type="text" value={slide.ctaLink || ''} onChange={e => updateHeroSlide(section.id, i, { ctaLink: e.target.value })} placeholder="Custom Redirect URL (if action is link)" className="w-full px-3 py-2 rounded-lg border border-gray-100 focus:border-pink outline-none text-sm" />

                                                                                                    <div className="flex items-center gap-3">
                                                                                                        <label className="flex items-center gap-2 px-3 py-2 bg-cream rounded-lg cursor-pointer hover:bg-pink/10 transition-colors text-sm border border-gray-100">
                                                                                                            <Camera className="w-4 h-4 text-pink" /><span>Image</span>
                                                                                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, (url) => updateHeroSlide(section.id, i, { image: url }))} />
                                                                                                        </label>
                                                                                                        {slide.image && <img src={slide.image} alt="" className="w-10 h-10 rounded-lg object-cover border" />}
                                                                                                    </div>
                                                                                                </div>
                                                                                            </SortableItem>
                                                                                        ))}
                                                                                    </SortableContext>
                                                                                </DndContext>
                                                                                <button onClick={() => addHeroSlide(section.id)} className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-pink hover:bg-pink/5 rounded-xl transition-colors border border-pink/20"><Plus className="w-4 h-4" /> Add Slide</button>
                                                                            </div>
                                                                        );
                                                                    })()}

                                                                    {/* ── How It Works editor ── */}
                                                                    {section.type === 'howItWorks' && (() => {
                                                                        const c = section.content as HowItWorksContent; return (
                                                                            <div className="space-y-4">
                                                                                <div>
                                                                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Section Title</label>
                                                                                    <input type="text" value={c.sectionTitle || ''} onChange={e => updateSectionContent(section.id, { ...c, sectionTitle: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink outline-none" />
                                                                                </div>
                                                                                <div className="grid grid-cols-2 gap-4">
                                                                                    <div>
                                                                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Title Alignment</label>
                                                                                        <div className="flex gap-1">
                                                                                            {(['left', 'center', 'right'] as const).map(align => (
                                                                                                <button key={align} onClick={() => updateSectionContent(section.id, { ...c, titleAlignment: align })} className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${c.titleAlignment === align ? 'bg-pink text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{align}</button>
                                                                                            ))}
                                                                                        </div>
                                                                                    </div>
                                                                                    <div>
                                                                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Title Color</label>
                                                                                        <div className="flex items-center gap-2">
                                                                                            <input type="color" value={c.titleColor || '#3a3530'} onChange={e => updateSectionContent(section.id, { ...c, titleColor: e.target.value })} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer" />
                                                                                            <input type="text" value={c.titleColor || ''} onChange={e => updateSectionContent(section.id, { ...c, titleColor: e.target.value })} placeholder="#3a3530" className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleStepDragEnd(section.id, e)}>
                                                                                    <SortableContext items={c.steps.map(s => s.id || `step-${Math.random()}`)} strategy={verticalListSortingStrategy}>
                                                                                        {c.steps.map((step: HowItWorksStep, i: number) => (
                                                                                            <SortableItem key={step.id || `step-${section.id}-${i}`} id={step.id || `step-${section.id}-${i}`}>
                                                                                                <div className="bg-cream rounded-xl p-4 space-y-3 group">
                                                                                                    <div className="flex items-center justify-between">
                                                                                                        <span className="text-xs font-bold text-gray-400">Step {i + 1}</span>
                                                                                                        {c.steps.length > 1 && <button onClick={() => removeStep(section.id, step.id)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>}
                                                                                                    </div>
                                                                                                    <input type="text" value={step.title || ''} onChange={e => updateStep(section.id, i, { title: e.target.value })} placeholder="Step Title" className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-pink outline-none text-sm" />
                                                                                                    <textarea value={step.description || ''} onChange={e => updateStep(section.id, i, { description: e.target.value })} placeholder="Description" rows={2} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-pink outline-none text-sm resize-none" />
                                                                                                    <div className="flex items-center gap-3">
                                                                                                        <input type="text" value={step.emoji || ''} onChange={e => updateStep(section.id, i, { emoji: e.target.value })} placeholder="Emoji" className="w-20 px-3 py-2 rounded-lg border border-gray-200 focus:border-pink outline-none text-sm text-center" />
                                                                                                        <label className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg cursor-pointer hover:bg-pink/10 transition-colors text-sm border border-gray-200">
                                                                                                            <Camera className="w-4 h-4 text-gray-400" /><span>Image</span>
                                                                                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, (url) => updateStep(section.id, i, { image: url }))} />
                                                                                                        </label>
                                                                                                        {step.image && <img src={step.image} alt="" className="w-10 h-10 rounded-lg object-cover border" />}
                                                                                                    </div>
                                                                                                </div>
                                                                                            </SortableItem>
                                                                                        ))}
                                                                                    </SortableContext>
                                                                                </DndContext>
                                                                                <button onClick={() => addStep(section.id)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-pink hover:bg-pink/10 rounded-xl transition-colors"><Plus className="w-4 h-4" /> Add Step</button>
                                                                            </div>
                                                                        );
                                                                    })()}

                                                                    {/* ── Gallery editor ── */}
                                                                    {section.type === 'gallery' && (() => {
                                                                        const c = section.content as GalleryContent; return (
                                                                            <div className="space-y-4">
                                                                                <div>
                                                                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Section Title</label>
                                                                                    <input type="text" value={c.sectionTitle || ''} onChange={e => updateSectionContent(section.id, { ...c, sectionTitle: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink outline-none" />
                                                                                </div>
                                                                                <div className="grid grid-cols-2 gap-4">
                                                                                    <div>
                                                                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Title Alignment</label>
                                                                                        <div className="flex gap-1">
                                                                                            {(['left', 'center', 'right'] as const).map(align => (
                                                                                                <button key={align} onClick={() => updateSectionContent(section.id, { ...c, titleAlignment: align })} className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${c.titleAlignment === align ? 'bg-pink text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{align}</button>
                                                                                            ))}
                                                                                        </div>
                                                                                    </div>
                                                                                    <div>
                                                                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Title Color</label>
                                                                                        <div className="flex items-center gap-2">
                                                                                            <input type="color" value={c.titleColor || '#3a3530'} onChange={e => updateSectionContent(section.id, { ...c, titleColor: e.target.value })} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer" />
                                                                                            <input type="text" value={c.titleColor || ''} onChange={e => updateSectionContent(section.id, { ...c, titleColor: e.target.value })} placeholder="#3a3530" className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleGalleryDragEnd(section.id, e)}>
                                                                                    <SortableContext items={c.items.map(item => item.id)} strategy={verticalListSortingStrategy}>
                                                                                        {c.items.map((item) => (
                                                                                            <SortableItem key={item.id} id={item.id}>
                                                                                                <div className="flex items-center gap-3 bg-cream rounded-xl p-3 group">
                                                                                                    {item.image ? (
                                                                                                        <img src={item.image} alt="" className="w-14 h-14 rounded-lg object-cover border flex-shrink-0" />
                                                                                                    ) : (
                                                                                                        <div className="w-14 h-14 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0"><Camera className="w-5 h-5 text-gray-400" /></div>
                                                                                                    )}
                                                                                                    <div className="flex-1 min-w-0 space-y-1">
                                                                                                        <input type="text" value={item.label || ''} onChange={e => updateGalleryItem(section.id, item.id, { label: e.target.value })} placeholder="Label" className="w-full px-3 py-1.5 rounded-lg border border-gray-200 focus:border-pink outline-none text-sm" />
                                                                                                        <input type="text" value={item.linkUrl || ''} onChange={e => updateGalleryItem(section.id, item.id, { linkUrl: e.target.value })} placeholder="Redirect Link (optional)" className="w-full px-3 py-1.5 rounded-lg border border-gray-200 focus:border-pink outline-none text-xs" />
                                                                                                        <label className="flex items-center gap-1 px-2 py-1 bg-white rounded-md cursor-pointer hover:bg-pink/10 transition-colors text-xs w-fit border border-gray-200">
                                                                                                            <Camera className="w-3 h-3 text-gray-400" /> Upload
                                                                                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, (url) => updateGalleryItem(section.id, item.id, { image: url }))} />
                                                                                                        </label>
                                                                                                    </div>
                                                                                                    <button onClick={() => removeGalleryItem(section.id, item.id)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"><Trash2 className="w-4 h-4" /></button>
                                                                                                </div>
                                                                                            </SortableItem>
                                                                                        ))}
                                                                                    </SortableContext>
                                                                                </DndContext>
                                                                                <button onClick={() => addGalleryItem(section.id)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-pink hover:bg-pink/10 rounded-xl transition-colors"><Plus className="w-4 h-4" /> Add Gallery Item</button>
                                                                            </div>
                                                                        );
                                                                    })()}

                                                                    {/* ── Text Block editor ── */}
                                                                    {section.type === 'textBlock' && (() => {
                                                                        const c = section.content as TextBlockContent; return (
                                                                            <div className="space-y-4">
                                                                                <div>
                                                                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Heading</label>
                                                                                    <input type="text" value={c.heading || ''} onChange={e => updateSectionContent(section.id, { ...c, heading: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink outline-none" />
                                                                                </div>
                                                                                <div>
                                                                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Body Text</label>
                                                                                    <textarea value={c.body || ''} onChange={e => updateSectionContent(section.id, { ...c, body: e.target.value })} rows={4} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink outline-none resize-none" />
                                                                                </div>
                                                                                <div>
                                                                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Alignment</label>
                                                                                    <div className="flex gap-2">
                                                                                        {(['left', 'center', 'right'] as const).map(align => (
                                                                                            <button key={align} onClick={() => updateSectionContent(section.id, { ...c, alignment: align })} className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${c.alignment === align ? 'bg-pink text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{align}</button>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })()}

                                                                    {/* ── Image Banner editor ── */}
                                                                    {section.type === 'imageBanner' && (() => {
                                                                        const c = section.content as ImageBannerContent; return (
                                                                            <div className="space-y-4">
                                                                                <div className="flex items-center justify-between">
                                                                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Banner Configuration</label>
                                                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                                                        <input type="checkbox" checked={c.isGallery} onChange={e => updateSectionContent(section.id, { ...c, isGallery: e.target.checked })} className="w-4 h-4 accent-pink" />
                                                                                        <span className="text-xs font-bold text-pink">Gallery Mode (Carousel)</span>
                                                                                    </label>
                                                                                </div>

                                                                                {!c.isGallery ? (
                                                                                    <div className="space-y-3">
                                                                                        <div className="flex items-center gap-3">
                                                                                            <label className="flex items-center gap-2 px-4 py-3 bg-cream rounded-xl cursor-pointer hover:bg-pink/10 transition-colors border border-dashed border-gray-300">
                                                                                                <Camera className="w-5 h-5 text-pink" /><span className="text-sm">Upload Single Image</span>
                                                                                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, (url) => updateSectionContent(section.id, { ...c, image: url }))} />
                                                                                            </label>
                                                                                            {c.image && <img src={c.image} alt="" className="w-14 h-14 object-cover rounded-lg border" />}
                                                                                        </div>
                                                                                        <input type="text" value={c.linkUrl || ''} onChange={e => updateSectionContent(section.id, { ...c, linkUrl: e.target.value })} placeholder="Redirect Link (e.g. /customize)" className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-pink outline-none text-sm" />
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="space-y-3">
                                                                                        {(c.galleryItems || []).map((item, idx) => (
                                                                                            <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
                                                                                                {item.image ? (
                                                                                                    <img src={item.image} className="w-10 h-10 object-cover rounded border" />
                                                                                                ) : (
                                                                                                    <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                                                                                                        <ImageIcon className="w-4 h-4 text-gray-400" />
                                                                                                    </div>
                                                                                                )}
                                                                                                <input type="text" value={item.linkUrl || ''} onChange={e => {
                                                                                                    const items = [...(c.galleryItems || [])];
                                                                                                    items[idx].linkUrl = e.target.value;
                                                                                                    updateSectionContent(section.id, { ...c, galleryItems: items });
                                                                                                }} placeholder="Slide Link" className="flex-1 px-2 py-1 text-xs border rounded" />
                                                                                                <button onClick={() => {
                                                                                                    const items = (c.galleryItems || []).filter((_, i) => i !== idx);
                                                                                                    updateSectionContent(section.id, { ...c, galleryItems: items });
                                                                                                }} className="text-red-400 p-1"><X className="w-4 h-4" /></button>
                                                                                            </div>
                                                                                        ))}
                                                                                        <label className="flex items-center justify-center gap-2 p-2 bg-white rounded-lg cursor-pointer hover:bg-pink/10 transition-colors border border-dashed border-gray-300 text-xs font-semibold text-pink">
                                                                                            <Plus className="w-4 h-4" /> Add Gallery Image
                                                                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, (url) => {
                                                                                                const items = [...(c.galleryItems || []), { image: url, linkUrl: '' }];
                                                                                                updateSectionContent(section.id, { ...c, galleryItems: items });
                                                                                            })} />
                                                                                        </label>
                                                                                    </div>
                                                                                )}

                                                                                <input type="text" value={c.alt || ''} onChange={e => updateSectionContent(section.id, { ...c, alt: e.target.value })} placeholder="Alt text" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink outline-none text-sm" />
                                                                                <input type="text" value={c.caption || ''} onChange={e => updateSectionContent(section.id, { ...c, caption: e.target.value })} placeholder="Caption (optional)" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink outline-none text-sm" />
                                                                                
                                                                                {/* Clickable Toggle */}
                                                                                <label className="flex items-center gap-2 cursor-pointer">
                                                                                    <input type="checkbox" checked={c.isClickable !== false} onChange={e => updateSectionContent(section.id, { ...c, isClickable: e.target.checked })} className="w-4 h-4 rounded accent-pink" />
                                                                                    <span className="text-xs font-bold text-gray-600">Clickable (links enabled)</span>
                                                                                </label>

                                                                                {/* Container Styling Options */}
                                                                                <div className="pt-3 border-t border-gray-100 space-y-3">
                                                                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Container Styling</p>
                                                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                                                        <input type="checkbox" checked={c.hasContainer || false} onChange={e => updateSectionContent(section.id, { ...c, hasContainer: e.target.checked })} className="w-4 h-4 rounded accent-pink" />
                                                                                        <span className="text-xs font-bold text-gray-600">Add Outer Container</span>
                                                                                    </label>
                                                                                    {c.hasContainer && (
                                                                                        <div className="grid grid-cols-2 gap-3 pl-4 border-l-2 border-pink/20">
                                                                                            <div>
                                                                                                <label className="text-xs text-gray-500 mb-1 block">Container BG</label>
                                                                                                <div className="flex gap-2">
                                                                                                    <input type="color" value={c.containerBgColor || '#ffffff'} onChange={(e) => updateSectionContent(section.id, { ...c, containerBgColor: e.target.value })} className="w-8 h-8 rounded border border-gray-200 cursor-pointer" />
                                                                                                    <input type="text" value={c.containerBgColor || ''} onChange={(e) => updateSectionContent(section.id, { ...c, containerBgColor: e.target.value })} className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded" />
                                                                                                </div>
                                                                                            </div>
                                                                                            <div>
                                                                                                <label className="text-xs text-gray-500 mb-1 block">Corner Radius (px)</label>
                                                                                                <input type="number" value={c.borderRadius || 16} onChange={(e) => updateSectionContent(section.id, { ...c, borderRadius: parseInt(e.target.value) || 0 })} className="w-full px-2 py-1 text-xs border border-gray-200 rounded" min="0" max="100" />
                                                                                            </div>
                                                                                            <div>
                                                                                                <label className="text-xs text-gray-500 mb-1 block">Border Width (px)</label>
                                                                                                <input type="number" value={c.borderWidth || 0} onChange={(e) => updateSectionContent(section.id, { ...c, borderWidth: parseInt(e.target.value) || 0 })} className="w-full px-2 py-1 text-xs border border-gray-200 rounded" min="0" max="20" />
                                                                                            </div>
                                                                                            {c.borderWidth ? (
                                                                                                <div>
                                                                                                    <label className="text-xs text-gray-500 mb-1 block">Border Color</label>
                                                                                                    <div className="flex gap-2">
                                                                                                        <input type="color" value={c.borderColor || '#e5e7eb'} onChange={(e) => updateSectionContent(section.id, { ...c, borderColor: e.target.value })} className="w-8 h-8 rounded border border-gray-200 cursor-pointer" />
                                                                                                        <input type="text" value={c.borderColor || ''} onChange={(e) => updateSectionContent(section.id, { ...c, borderColor: e.target.value })} className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded" />
                                                                                                    </div>
                                                                                                </div>
                                                                                            ) : null}
                                                                                            <div>
                                                                                                <label className="text-xs text-gray-500 mb-1 block">Inner Padding (px)</label>
                                                                                                <input type="number" value={c.padding || 0} onChange={(e) => updateSectionContent(section.id, { ...c, padding: parseInt(e.target.value) || 0 })} className="w-full px-2 py-1 text-xs border border-gray-200 rounded" min="0" max="100" />
                                                                                            </div>
                                                                                            <div>
                                                                                                <label className="text-xs text-gray-500 mb-1 block">Shadow</label>
                                                                                                <select value={c.shadow || 'none'} onChange={(e) => updateSectionContent(section.id, { ...c, shadow: e.target.value as any })} className="w-full px-2 py-1 text-xs border border-gray-200 rounded bg-white">
                                                                                                    <option value="none">None</option>
                                                                                                    <option value="small">Small</option>
                                                                                                    <option value="medium">Medium</option>
                                                                                                    <option value="large">Large</option>
                                                                                                </select>
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                </div>

                                                                                {/* Image Display Settings */}
                                                                                <div className="pt-3 border-t border-gray-100 space-y-3">
                                                                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Image Display</p>
                                                                                    <div className="grid grid-cols-2 gap-3">
                                                                                        <div>
                                                                                            <label className="text-xs text-gray-500 mb-1 block">Image Fit</label>
                                                                                            <select value={c.imageFit || 'cover'} onChange={(e) => updateSectionContent(section.id, { ...c, imageFit: e.target.value as any })} className="w-full px-2 py-1 text-xs border border-gray-200 rounded bg-white" title="Cover fills space (may cut off), Contain shows full image">
                                                                                                <option value="cover">Cover (fill space)</option>
                                                                                                <option value="contain">Contain (full image)</option>
                                                                                                <option value="none">Natural Size (no crop)</option>
                                                                                            </select>
                                                                                        </div>
                                                                                        <div>
                                                                                            <label className="text-xs text-gray-500 mb-1 block">Max Height (px, 0=auto)</label>
                                                                                            <input type="number" value={c.maxHeight || 0} onChange={(e) => updateSectionContent(section.id, { ...c, maxHeight: parseInt(e.target.value) || 0 })} className="w-full px-2 py-1 text-xs border border-gray-200 rounded" min="0" max="2000" placeholder="Auto" />
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="bg-blue-50 p-2 rounded text-[10px] text-blue-700 space-y-1">
                                                                                        <p><strong>Tip:</strong> Set Image Fit to "Natural Size" and Max Height to 0 for wide banners. The image will scale down proportionally on mobile.</p>
                                                                                        <p><strong>Mobile:</strong> Images automatically scale to fit screen width while maintaining aspect ratio.</p>
                                                                                    </div>
                                                                                </div>

                                                                                {/* Button Settings */}
                                                                                <div className="pt-3 border-t border-gray-100 space-y-3">
                                                                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Button</p>
                                                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                                                        <input type="checkbox" checked={c.showButton || false} onChange={e => updateSectionContent(section.id, { ...c, showButton: e.target.checked })} className="w-4 h-4 rounded accent-pink" />
                                                                                        <span className="text-xs font-bold text-gray-600">Show Button</span>
                                                                                    </label>
                                                                                    {c.showButton && (
                                                                                        <div className="space-y-3 pl-4 border-l-2 border-pink/20">
                                                                                            <input type="text" value={c.buttonText || ''} onChange={e => updateSectionContent(section.id, { ...c, buttonText: e.target.value })} placeholder="Button Text (e.g. Shop Now)" className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-pink outline-none text-sm" />
                                                                                            <div className="grid grid-cols-2 gap-3">
                                                                                                <div>
                                                                                                    <label className="text-xs text-gray-500 mb-1 block">Action</label>
                                                                                                    <select value={c.buttonAction || 'link'} onChange={e => updateSectionContent(section.id, { ...c, buttonAction: e.target.value as any })} className="w-full px-2 py-2 text-xs border border-gray-200 rounded bg-white">
                                                                                                        <option value="link">Link</option>
                                                                                                        <option value="customize">Start Designing</option>
                                                                                                        <option value="scroll">Scroll to Section</option>
                                                                                                    </select>
                                                                                                </div>
                                                                                                <div>
                                                                                                    <label className="text-xs text-gray-500 mb-1 block">Horizontal</label>
                                                                                                    <select value={c.buttonPosition || 'center'} onChange={e => updateSectionContent(section.id, { ...c, buttonPosition: e.target.value as any })} className="w-full px-2 py-2 text-xs border border-gray-200 rounded bg-white">
                                                                                                        <option value="left">Left</option>
                                                                                                        <option value="center">Center</option>
                                                                                                        <option value="right">Right</option>
                                                                                                    </select>
                                                                                                </div>
                                                                                            </div>
                                                                                            <div className="grid grid-cols-2 gap-3">
                                                                                                <div>
                                                                                                    <label className="text-xs text-gray-500 mb-1 block">Vertical From</label>
                                                                                                    <select value={c.buttonVerticalFrom || 'bottom'} onChange={e => updateSectionContent(section.id, { ...c, buttonVerticalFrom: e.target.value as any })} className="w-full px-2 py-2 text-xs border border-gray-200 rounded bg-white">
                                                                                                        <option value="top">Top</option>
                                                                                                        <option value="bottom">Bottom</option>
                                                                                                    </select>
                                                                                                </div>
                                                                                                <div>
                                                                                                    <label className="text-xs text-gray-500 mb-1 block">Position (px)</label>
                                                                                                    <input type="number" value={c.buttonVerticalPosition ?? 24} onChange={e => updateSectionContent(section.id, { ...c, buttonVerticalPosition: parseInt(e.target.value) || 0 })} className="w-full px-2 py-2 text-xs border border-gray-200 rounded" min="0" max="500" />
                                                                                                </div>
                                                                                            </div>
                                                                                            {(c.buttonAction === 'link' || c.buttonAction === 'scroll') && (
                                                                                                <input type="text" value={c.buttonUrl || ''} onChange={e => updateSectionContent(section.id, { ...c, buttonUrl: e.target.value })} placeholder={c.buttonAction === 'scroll' ? '#section-id (e.g. #gallery)' : 'https://example.com'} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-pink outline-none text-sm" />
                                                                                            )}
                                                                                            <div className="grid grid-cols-2 gap-3">
                                                                                                <div>
                                                                                                    <label className="text-xs text-gray-500 mb-1 block">Style</label>
                                                                                                    <select value={c.buttonStyle || 'solid'} onChange={e => updateSectionContent(section.id, { ...c, buttonStyle: e.target.value as any })} className="w-full px-2 py-2 text-xs border border-gray-200 rounded bg-white">
                                                                                                        <option value="solid">Solid</option>
                                                                                                        <option value="outline">Outline</option>
                                                                                                        <option value="ghost">Ghost</option>
                                                                                                    </select>
                                                                                                </div>
                                                                                                <div>
                                                                                                    <label className="text-xs text-gray-500 mb-1 block">Button Color</label>
                                                                                                    <div className="flex gap-2">
                                                                                                        <input type="color" value={c.buttonColor || '#6b8f71'} onChange={e => updateSectionContent(section.id, { ...c, buttonColor: e.target.value })} className="w-8 h-8 rounded border border-gray-200 cursor-pointer" />
                                                                                                        <input type="text" value={c.buttonColor || ''} onChange={e => updateSectionContent(section.id, { ...c, buttonColor: e.target.value })} placeholder="#6b8f71" className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded" />
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                            <div>
                                                                                                <label className="text-xs text-gray-500 mb-1 block">Text Color</label>
                                                                                                <div className="flex gap-2">
                                                                                                    <input type="color" value={c.buttonTextColor || '#ffffff'} onChange={e => updateSectionContent(section.id, { ...c, buttonTextColor: e.target.value })} className="w-8 h-8 rounded border border-gray-200 cursor-pointer" />
                                                                                                    <input type="text" value={c.buttonTextColor || ''} onChange={e => updateSectionContent(section.id, { ...c, buttonTextColor: e.target.value })} placeholder="#ffffff" className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded" />
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                </div>

                                                                                <label className="flex items-center gap-2 cursor-pointer pt-2 border-t border-gray-100">
                                                                                    <input type="checkbox" checked={c.fullWidth || false} onChange={e => updateSectionContent(section.id, { ...c, fullWidth: e.target.checked })} className="w-4 h-4 rounded accent-pink" />
                                                                                    <span className="text-xs font-bold text-gray-600">Full Width Page Section</span>
                                                                                </label>
                                                                            </div>
                                                                        );
                                                                    })()}

                                                                    {/* ── Testimonials editor ── */}
                                                                    {section.type === 'testimonials' && (() => {
                                                                        const c = section.content as TestimonialsContent; return (
                                                                            <div className="space-y-4">
                                                                                <div>
                                                                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Section Title</label>
                                                                                    <input type="text" value={c.sectionTitle || ''} onChange={e => updateSectionContent(section.id, { ...c, sectionTitle: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink outline-none" />
                                                                                </div>
                                                                                <div className="grid grid-cols-2 gap-4">
                                                                                    <div>
                                                                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Title Alignment</label>
                                                                                        <div className="flex gap-1">
                                                                                            {(['left', 'center', 'right'] as const).map(align => (
                                                                                                <button key={align} onClick={() => updateSectionContent(section.id, { ...c, titleAlignment: align })} className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${c.titleAlignment === align ? 'bg-pink text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{align}</button>
                                                                                            ))}
                                                                                        </div>
                                                                                    </div>
                                                                                    <div>
                                                                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Title Color</label>
                                                                                        <div className="flex items-center gap-2">
                                                                                            <input type="color" value={c.titleColor || '#3a3530'} onChange={e => updateSectionContent(section.id, { ...c, titleColor: e.target.value })} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer" />
                                                                                            <input type="text" value={c.titleColor || ''} onChange={e => updateSectionContent(section.id, { ...c, titleColor: e.target.value })} placeholder="#3a3530" className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                {c.items.map((item) => (
                                                                                    <div key={item.id} className="bg-white border border-gray-100 rounded-xl p-4 space-y-3 group shadow-sm hover:border-pink/30 transition-all">
                                                                                        <div className="flex items-center justify-between">
                                                                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-tighter">💬 Testimonial</span>
                                                                                            {c.items.length > 1 && <button onClick={() => removeTestimonial(section.id, item.id)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>}
                                                                                        </div>
                                                                                        <textarea value={item.quote || ''} onChange={e => updateTestimonial(section.id, item.id, { quote: e.target.value })} placeholder="Customer quote..." rows={2} className="w-full px-3 py-2 rounded-lg border border-gray-100 focus:border-pink outline-none text-sm resize-none" />
                                                                                        <div className="grid sm:grid-cols-2 gap-3">
                                                                                            <input type="text" value={item.author || ''} onChange={e => updateTestimonial(section.id, item.id, { author: e.target.value })} placeholder="Author name" className="w-full px-3 py-2 rounded-lg border border-gray-100 focus:border-pink outline-none text-sm" />
                                                                                            <input type="text" value={item.linkUrl || ''} onChange={e => updateTestimonial(section.id, item.id, { linkUrl: e.target.value })} placeholder="Redirect Link (optional)" className="w-full px-3 py-2 rounded-lg border border-gray-100 focus:border-pink outline-none text-sm" />
                                                                                        </div>
                                                                                        <div className="flex items-center gap-2 bg-cream/50 px-3 py-2 rounded-lg border border-pink/10">
                                                                                            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-pink whitespace-nowrap">
                                                                                                <Camera className="w-4 h-4" /> Proof Attachment
                                                                                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, (url) => updateTestimonial(section.id, item.id, { proofImage: url }))} />
                                                                                            </label>
                                                                                            {item.proofImage && <img src={item.proofImage} className="w-6 h-6 object-cover rounded border" />}
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                                <button onClick={() => addTestimonial(section.id)} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-pink hover:bg-pink/5 rounded-xl transition-colors border border-pink/20"><Plus className="w-4 h-4" /> Add Testimonial</button>
                                                                            </div>
                                                                        );
                                                                    })()}

                                                                    {/* ── CTA editor ── */}
                                                                    {section.type === 'cta' && (() => {
                                                                        const c = section.content as CtaContent; return (
                                                                            <div className="space-y-4">
                                                                                <div className="grid sm:grid-cols-2 gap-4">
                                                                                    <div>
                                                                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Heading</label>
                                                                                        <input type="text" value={c.heading || ''} onChange={e => updateSectionContent(section.id, { ...c, heading: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink outline-none shadow-sm" />
                                                                                    </div>
                                                                                    <div>
                                                                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Title Color</label>
                                                                                        <div className="flex items-center gap-2">
                                                                                            <input type="color" value={c.titleColor || '#ffffff'} onChange={e => updateSectionContent(section.id, { ...c, titleColor: e.target.value })} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer" />
                                                                                            <input type="text" value={c.titleColor || ''} onChange={e => updateSectionContent(section.id, { ...c, titleColor: e.target.value })} placeholder="#ffffff" className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                <div>
                                                                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Title Alignment</label>
                                                                                    <div className="flex gap-1 max-w-xs">
                                                                                        {(['left', 'center', 'right'] as const).map(align => (
                                                                                            <button key={align} onClick={() => updateSectionContent(section.id, { ...c, titleAlignment: align })} className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${c.titleAlignment === align ? 'bg-pink text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{align}</button>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                                <div>
                                                                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Subtitle</label>
                                                                                    <input type="text" value={c.subtitle || ''} onChange={e => updateSectionContent(section.id, { ...c, subtitle: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink outline-none shadow-sm" />
                                                                                </div>
                                                                                <div className="grid grid-cols-2 gap-4">
                                                                                    <div>
                                                                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Subtitle Alignment</label>
                                                                                        <div className="flex gap-1">
                                                                                            {(['left', 'center', 'right'] as const).map(align => (
                                                                                                <button key={align} onClick={() => updateSectionContent(section.id, { ...c, subtitleAlignment: align })} className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${c.subtitleAlignment === align ? 'bg-pink text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{align}</button>
                                                                                            ))}
                                                                                        </div>
                                                                                    </div>
                                                                                    <div>
                                                                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Subtitle Color</label>
                                                                                        <div className="flex items-center gap-2">
                                                                                            <input type="color" value={c.subtitleColor || '#ffffff'} onChange={e => updateSectionContent(section.id, { ...c, subtitleColor: e.target.value })} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer" />
                                                                                            <input type="text" value={c.subtitleColor || ''} onChange={e => updateSectionContent(section.id, { ...c, subtitleColor: e.target.value })} placeholder="#ffffff" className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="grid sm:grid-cols-2 gap-4">
                                                                                    <div>
                                                                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Button Text</label>
                                                                                        <input type="text" value={c.buttonText || ''} onChange={e => updateSectionContent(section.id, { ...c, buttonText: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink outline-none shadow-sm" />
                                                                                    </div>
                                                                                    <div>
                                                                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Button Action</label>
                                                                                        <select value={c.buttonAction} onChange={e => updateSectionContent(section.id, { ...c, buttonAction: e.target.value as any })} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink outline-none bg-white shadow-sm">
                                                                                            <option value="customize">Go to Customize</option>
                                                                                            <option value="scroll">Scroll Down</option>
                                                                                            <option value="link">Custom URL</option>
                                                                                        </select>
                                                                                    </div>
                                                                                </div>
                                                                                {c.buttonAction === 'link' && (
                                                                                    <div>
                                                                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Custom URL Link</label>
                                                                                        <input type="text" value={c.linkUrl || ''} onChange={e => updateSectionContent(section.id, { ...c, linkUrl: e.target.value })} placeholder="https://..." className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink outline-none shadow-sm" />
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })()}

                                                                    {/* ── Divider editor ── */}
                                                                    {section.type === 'divider' && (() => {
                                                                        const c = section.content as DividerContent; return (
                                                                            <div>
                                                                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Style</label>
                                                                                <div className="flex gap-2">
                                                                                    {(['line', 'dots', 'wave'] as const).map(style => (
                                                                                        <button key={style} onClick={() => updateSectionContent(section.id, { ...c, style })} className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${c.style === style ? 'bg-pink text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{style}</button>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })()}

                                                                    {/* ── Shape Transition editor ── */}
                                                                    {section.type === 'transition' && (() => {
                                                                        const c = section.content as TransitionContent;
                                                                        const shapes = [
                                                                            { id: 'wave', label: 'Wave', icon: '〰️' },
                                                                            { id: 'blob', label: 'Blob', icon: '☁️' },
                                                                            { id: 'cloud', label: 'Cloud', icon: '🌤️' },
                                                                            { id: 'arch', label: 'Arch', icon: '⛩️' },
                                                                            { id: 'zigzag', label: 'Zigzag', icon: '⚡' },
                                                                            { id: 'triangle', label: 'Triangle', icon: '🔺' },
                                                                            { id: 'curve', label: 'Curve', icon: '⌒' },
                                                                        ] as const;
                                                                        return (
                                                                            <div className="space-y-4">
                                                                                <div>
                                                                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Shape</label>
                                                                                    <div className="grid grid-cols-4 gap-2">
                                                                                        {shapes.map(s => (
                                                                                            <button key={s.id} onClick={() => updateSectionContent(section.id, { ...c, shape: s.id })} className={`px-2 py-3 rounded-xl text-sm font-semibold transition-all flex flex-col items-center gap-1 ${c.shape === s.id ? 'bg-pink text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                                                                                                <span className="text-lg">{s.icon}</span>
                                                                                                <span className="text-xs">{s.label}</span>
                                                                                            </button>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                                <div className="grid grid-cols-2 gap-3">
                                                                                    <div>
                                                                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Fill Color</label>
                                                                                        <div className="flex gap-2 items-center">
                                                                                            <input type="color" value={c.fillColor} onChange={(e) => updateSectionContent(section.id, { ...c, fillColor: e.target.value })} className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer" />
                                                                                            <input type="text" value={c.fillColor} onChange={(e) => updateSectionContent(section.id, { ...c, fillColor: e.target.value })} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="#FFB6C1" />
                                                                                        </div>
                                                                                    </div>
                                                                                    <div>
                                                                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Height (px)</label>
                                                                                        <input type="number" value={c.height || 80} onChange={(e) => updateSectionContent(section.id, { ...c, height: parseInt(e.target.value) || 80 })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" min="20" max="200" />
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex gap-3">
                                                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                                                        <input type="checkbox" checked={c.flipVertical || false} onChange={(e) => updateSectionContent(section.id, { ...c, flipVertical: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-pink focus:ring-pink" />
                                                                                        <span className="text-sm text-gray-600">Flip Vertical</span>
                                                                                    </label>
                                                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                                                        <input type="checkbox" checked={c.flipHorizontal || false} onChange={(e) => updateSectionContent(section.id, { ...c, flipHorizontal: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-pink focus:ring-pink" />
                                                                                        <span className="text-sm text-gray-600">Flip Horizontal</span>
                                                                                    </label>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })()}

                                                                    {/* ── Section Styling Editor ── */}
                                                                    {section.type !== 'divider' && section.type !== 'transition' && (
                                                                        <div className="mt-4 pt-4 border-t border-gray-200">
                                                                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Section Colors</p>
                                                                            <div className="grid grid-cols-2 gap-3">
                                                                                {/* Background Color */}
                                                                                <div>
                                                                                    <label className="text-xs text-gray-500 mb-1 block">Background</label>
                                                                                    <div className="flex gap-2">
                                                                                        <input type="color" value={section.styling?.backgroundColor || '#ffffff'} onChange={(e) => updateSectionStyling(section.id, { backgroundColor: e.target.value })} className="w-10 h-9 rounded-lg border border-gray-200 cursor-pointer" />
                                                                                        <input type="text" value={section.styling?.backgroundColor || ''} onChange={(e) => updateSectionStyling(section.id, { backgroundColor: e.target.value })} placeholder="transparent" className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg" />
                                                                                    </div>
                                                                                </div>
                                                                                {/* Text Color */}
                                                                                <div>
                                                                                    <label className="text-xs text-gray-500 mb-1 block">Text Color</label>
                                                                                    <div className="flex gap-2">
                                                                                        <input type="color" value={section.styling?.textColor || '#3a3530'} onChange={(e) => updateSectionStyling(section.id, { textColor: e.target.value })} className="w-10 h-9 rounded-lg border border-gray-200 cursor-pointer" />
                                                                                        <input type="text" value={section.styling?.textColor || ''} onChange={(e) => updateSectionStyling(section.id, { textColor: e.target.value })} placeholder="inherit" className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg" />
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </SortableSection>
                                                ))}
                                            </SortableContext>
                                        </DndContext>

                                        {/* Add Section button */}
                                        <div className="relative">
                                            <button onClick={() => setShowAddMenu(!showAddMenu)} className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-2xl text-gray-500 hover:border-pink hover:text-pink transition-colors font-semibold text-sm">
                                                <Plus className="w-5 h-5" /> Add Section
                                            </button>
                                            {showAddMenu && (
                                                <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-lg border border-gray-200 p-2 z-20 grid grid-cols-2 gap-1">
                                                    {(Object.keys(SECTION_META) as SectionType[]).map(type => (
                                                        <button key={type} onClick={() => addSection(type)} className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-cream transition-colors text-left text-sm">
                                                            <span>{SECTION_META[type].icon}</span>
                                                            <span className="font-semibold">{SECTION_META[type].label}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Navbar — always at top */}
                                        <div className="border border-gray-200 rounded-2xl overflow-hidden mb-4">
                                            <button onClick={() => toggleSection('navbar')} className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xl">🧭</span>
                                                    <span className="font-heading font-bold text-lg">Navbar</span>
                                                    <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">Pinned</span>
                                                </div>
                                                {openSection === 'navbar' ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                                            </button>
                                            {openSection === 'navbar' && (
                                                <div className="p-5 space-y-4">
                                                                                                        <div className="grid grid-cols-2 gap-4">
                                                                                                                <div>
                                                                                                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Navbar Background</label>
                                                                                                                        <div className="flex gap-2">
                                                                                                                                <input type="color" value={siteContent.navbar?.bgColor || '#ffffff'} onChange={e => updateNavbar({ bgColor: e.target.value })} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer" />
                                                                                                                                <input type="text" value={siteContent.navbar?.bgColor || ''} onChange={e => updateNavbar({ bgColor: e.target.value })} className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                                                                                                                        </div>
                                                                                                                </div>
                                                                                                                <div>
                                                                                                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Text Color</label>
                                                                                                                        <div className="flex gap-2">
                                                                                                                                <input type="color" value={siteContent.navbar?.textColor || '#3a3530'} onChange={e => updateNavbar({ textColor: e.target.value })} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer" />
                                                                                                                                <input type="text" value={siteContent.navbar?.textColor || ''} onChange={e => updateNavbar({ textColor: e.target.value })} className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                                                                                                                        </div>
                                                                                                                </div>
                                                                                                        </div>
                                                                                                        <div className="grid grid-cols-2 gap-4">
                                                                                                                <div>
                                                                                                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Background Behind Navbar</label>
                                                                                                                        <div className="flex gap-2">
                                                                                                                                <input type="color" value={siteContent.navbar?.wrapperBgColor || '#f5f5dc'} onChange={e => updateNavbar({ wrapperBgColor: e.target.value })} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer" />
                                                                                                                                <input type="text" value={siteContent.navbar?.wrapperBgColor || ''} onChange={e => updateNavbar({ wrapperBgColor: e.target.value })} className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                                                                                                                        </div>
                                                                                                                </div>
                                                                                                                <div>
                                                                                                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Height (px)</label>
                                                                                                                        <input type="number" value={siteContent.navbar?.height || 64} onChange={e => updateNavbar({ height: parseInt(e.target.value) || 64 })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" min="40" max="120" />
                                                                                                                </div>
                                                                                                                <div>
                                                                                                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Position</label>
                                                                                                                        <select value={siteContent.navbar?.position || 'fixed'} onChange={e => updateNavbar({ position: e.target.value as any })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white">
                                                                                                                                <option value="fixed">Fixed (always visible)</option>
                                                                                                                                <option value="static">Static (scrolls away)</option>
                                                                                                                        </select>
                                                                                                                </div>
                                                                                                        </div>
                                                                                                        <div className="flex gap-4">
                                                                                                                <label className="flex items-center gap-2 cursor-pointer">
                                                                                                                        <input type="checkbox" checked={siteContent.navbar?.showLogo !== false} onChange={e => updateNavbar({ showLogo: e.target.checked })} className="w-4 h-4 rounded accent-pink" />
                                                                                                                        <span className="text-sm text-gray-600">Show Logo</span>
                                                                                                                </label>
                                                                                                                <label className="flex items-center gap-2 cursor-pointer">
                                                                                                                        <input type="checkbox" checked={siteContent.navbar?.showCart !== false} onChange={e => updateNavbar({ showCart: e.target.checked })} className="w-4 h-4 rounded accent-pink" />
                                                                                                                        <span className="text-sm text-gray-600">Show Cart</span>
                                                                                                                </label>
                                                                                                                <label className="flex items-center gap-2 cursor-pointer">
                                                                                                                        <input type="checkbox" checked={siteContent.navbar?.isFloating || false} onChange={e => updateNavbar({ isFloating: e.target.checked })} className="w-4 h-4 rounded accent-pink" />
                                                                                                                        <span className="text-sm text-gray-600">Floating Style</span>
                                                                                                                </label>
                                                                                                                <label className="flex items-center gap-2 cursor-pointer">
                                                                                                                        <input type="checkbox" checked={siteContent.navbar?.isTransparent || false} onChange={e => updateNavbar({ isTransparent: e.target.checked })} className="w-4 h-4 rounded accent-pink" />
                                                                                                                        <span className="text-sm text-gray-600">Transparent</span>
                                                                                                                </label>
                                                                                                        </div>
                                                                                                        {siteContent.navbar?.isFloating && (
                                                                                                                <div className="grid grid-cols-2 gap-4">
                                                                                                                        <div>
                                                                                                                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Border Radius (px)</label>
                                                                                                                                <input type="number" value={siteContent.navbar?.borderRadius || 32} onChange={e => updateNavbar({ borderRadius: parseInt(e.target.value) || 32 })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" min="0" max="60" />
                                                                                                                        </div>
                                                                                                                        <div>
                                                                                                                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Shadow</label>
                                                                                                                                <select value={siteContent.navbar?.shadow || 'small'} onChange={e => updateNavbar({ shadow: e.target.value as any })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white">
                                                                                                                                        <option value="none">None</option>
                                                                                                                                        <option value="small">Small</option>
                                                                                                                                        <option value="medium">Medium</option>
                                                                                                                                        <option value="large">Large</option>
                                                                                                                                </select>
                                                                                                                        </div>
                                                                                                                </div>
                                                                                                        )}
                                                                                                        <div className="border-t border-gray-100 pt-4">
                                                                                                                <div className="flex items-center justify-between mb-3">
                                                                                                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Navigation Links</label>
                                                                                                                        <button onClick={() => updateNavbar({ links: [...(siteContent.navbar?.links || []), { label: 'New Link', url: '#', id: uuidv4() }] })} className="text-xs text-pink font-semibold flex items-center gap-1">
                                                                                                                                <Plus className="w-3 h-3" /> Add Link
                                                                                                                        </button>
                                                                                                                </div>
                                                                                                                <div className="space-y-2">
                                                                                                                        {(siteContent.navbar?.links || []).map((link, idx) => (
                                                                                                                                <div key={link.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                                                                                                                                        <input type="text" value={link.label} onChange={e => {
                                                                                                                                                const links = [...(siteContent.navbar?.links || [])];
                                                                                                                                                links[idx].label = e.target.value;
                                                                                                                                                updateNavbar({ links });
                                                                                                                                        }} className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded" placeholder="Label" />
                                                                                                                                        <input type="text" value={link.url} onChange={e => {
                                                                                                                                                const links = [...(siteContent.navbar?.links || [])];
                                                                                                                                                links[idx].url = e.target.value;
                                                                                                                                                updateNavbar({ links });
                                                                                                                                        }} className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded" placeholder="URL (#section or /page)" />
                                                                                                                                        <button onClick={() => {
                                                                                                                                                const links = (siteContent.navbar?.links || []).filter((_, i) => i !== idx);
                                                                                                                                                updateNavbar({ links });
                                                                                                                                        }} className="text-red-400 p-1"><X className="w-4 h-4" /></button>
                                                                                                                                </div>
                                                                                                                        ))}
                                                                                                                </div>
                                                                                                        </div>
                                                                                                </div>
                                                                                        )}
                                                                                </div>

                                        {/* Footer — always at bottom */}
                                        <div className="border border-gray-200 rounded-2xl overflow-hidden mt-4">
                                            <button onClick={() => toggleSection('footer')} className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xl">📌</span>
                                                    <span className="font-heading font-bold text-lg">Footer</span>
                                                    <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">Pinned</span>
                                                </div>
                                                {openSection === 'footer' ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                                            </button>
                                            {openSection === 'footer' && (
                                                <div className="p-5 space-y-4">
                                                    <div>
                                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Brand Name</label>
                                                        <input type="text" value={siteContent.footer.brandName || ''} onChange={e => updateFooter({ brandName: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink outline-none" />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Tagline</label>
                                                        <input type="text" value={siteContent.footer.tagline || ''} onChange={e => updateFooter({ tagline: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink outline-none" />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Copyright Text</label>
                                                        <input type="text" value={siteContent.footer.copyright || ''} onChange={e => updateFooter({ copyright: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink outline-none" />
                                                    </div>
                                                    <div className="border-t border-gray-100 pt-4">
                                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 block">Social Links</label>
                                                        <div className="grid gap-3">
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-sm w-20 text-gray-500 flex-shrink-0">Instagram</span>
                                                                <input type="url" value={siteContent.footer.instagramUrl || ''} onChange={e => updateFooter({ instagramUrl: e.target.value })} placeholder="https://instagram.com/..." className="flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:border-pink outline-none text-sm" />
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-lg bg-[#1877F2]/10 flex items-center justify-center text-[#1877F2]"><Facebook className="w-4 h-4" /></div>
                                                                <input type="url" value={siteContent.footer.facebookUrl || ''} onChange={e => updateFooter({ facebookUrl: e.target.value })} placeholder="https://facebook.com/..." className="flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:border-pink outline-none text-sm" />
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-lg bg-black/10 flex items-center justify-center text-black"><Twitter className="w-4 h-4" /></div>
                                                                <input type="url" value={siteContent.footer.twitterUrl || ''} onChange={e => updateFooter({ twitterUrl: e.target.value })} placeholder="https://twitter.com/..." className="flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:border-pink outline-none text-sm" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* ─── Customize Page Editor ─── */}
                                {pageSubTab === 'customize' && (
                                    <div className="space-y-4">
                                        <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Edit the text displayed on the product customization page</p>
                                        <div className="border border-gray-200 rounded-2xl p-5 space-y-4">
                                            <h4 className="font-heading font-bold text-sm flex items-center gap-2">📦 Step 1 — Choose Product</h4>
                                            <div>
                                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Title</label>
                                                <input type="text" value={siteContent.customizePage.step1Title || ''} onChange={e => updateCustomizePage({ step1Title: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink outline-none" />
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Subtitle</label>
                                                <input type="text" value={siteContent.customizePage.step1Subtitle || ''} onChange={e => updateCustomizePage({ step1Subtitle: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink outline-none" />
                                            </div>
                                        </div>
                                        <div className="border border-gray-200 rounded-2xl p-5 space-y-4">
                                            <h4 className="font-heading font-bold text-sm flex items-center gap-2">🎨 Step 2 — Design</h4>
                                            <div>
                                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Panel Title</label>
                                                <input type="text" value={siteContent.customizePage.step2PanelTitle || ''} onChange={e => updateCustomizePage({ step2PanelTitle: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink outline-none" />
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">How to Design Steps</label>
                                                {siteContent.customizePage.howToDesignSteps.map((step, i) => (
                                                    <div key={i} className="flex items-center gap-2 mb-2">
                                                        <span className="text-xs font-bold text-gray-400 w-5">{i + 1}.</span>
                                                        <input type="text" value={step || ''} onChange={e => { const steps = [...siteContent.customizePage.howToDesignSteps]; steps[i] = e.target.value; updateCustomizePage({ howToDesignSteps: steps }); }} className="flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:border-pink outline-none text-sm" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="border border-gray-200 rounded-2xl p-5 space-y-4">
                                            <h4 className="font-heading font-bold text-sm flex items-center gap-2">✅ Step 3 — Complete</h4>
                                            <div>
                                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Title</label>
                                                <input type="text" value={siteContent.customizePage.step3Title || ''} onChange={e => updateCustomizePage({ step3Title: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink outline-none" />
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Subtitle</label>
                                                <input type="text" value={siteContent.customizePage.step3Subtitle || ''} onChange={e => updateCustomizePage({ step3Subtitle: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink outline-none" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Global Settings Tab */}
                        {adminTab === 'global' && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center bg-pink/5 p-4 rounded-2xl border border-pink/10 mb-2">
                                    <div>
                                        <h2 className="font-heading text-xl font-bold text-gray-900">Global Settings</h2>
                                        <p className="text-xs text-gray-500 font-medium">Site branding, fonts, and core style tokens</p>
                                    </div>
                                    {!usingStaticCms ? (
                                        <button
                                            onClick={() => handleSavePages('global')}
                                            disabled={isSaving}
                                            className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm ${saveSuccess === 'global' ? 'bg-green-500 text-white' : 'bg-pink text-white hover:bg-pink/90'} ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : saveSuccess === 'global' ? null : <Globe className="w-4 h-4" />}
                                            {saveSuccess === 'global' ? '✅ Saved Successfully' : '☁️ Save Global Settings'}
                                        </button>
                                    ) : (
                                        <div className="text-xs text-gray-400 bg-white px-3 py-1.5 rounded-lg border border-pink/10">
                                            Changes saved automatically
                                        </div>
                                    )}
                                </div>

                                <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="grid md:grid-cols-2 gap-6">
                                        {/* Branding Section */}
                                        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-5">
                                            <h4 className="font-heading font-bold text-gray-800 flex items-center gap-2">
                                                ✨ Branding
                                            </h4>

                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Logo Text</label>
                                                    <input
                                                        type="text"
                                                        value={siteContent.global.logoText || ''}
                                                        onChange={e => updateGlobalSettings({ logoText: e.target.value })}
                                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink outline-none transiton-all"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Logo Image</label>
                                                    <div className="flex gap-4 items-center">
                                                        <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-cream rounded-xl cursor-pointer hover:bg-pink/10 transition-colors border border-dashed border-gray-300">
                                                            <Camera className="w-5 h-5 text-pink" />
                                                            <span className="text-sm font-semibold">Upload Logo</span>
                                                            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, (url) => updateGlobalSettings({ logoImage: url }))} className="hidden" />
                                                        </label>
                                                        {siteContent.global.logoImage && (
                                                            <div className="relative group">
                                                                <img src={siteContent.global.logoImage} alt="Logo" className="w-12 h-12 object-contain rounded-lg border bg-white shadow-sm" />
                                                                <button
                                                                    onClick={() => updateGlobalSettings({ logoImage: '' })}
                                                                    className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                                >
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Colors Section */}
                                        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-5">
                                            <h4 className="font-heading font-bold text-gray-800 flex items-center gap-2">
                                                🎨 Color Palette
                                            </h4>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Primary Color</label>
                                                    <div className="flex items-center gap-3 p-1 bg-gray-50 rounded-xl border border-gray-100">
                                                        <input
                                                            type="color"
                                                            value={siteContent.global.primaryColor || '#ec4899'}
                                                            onChange={e => updateGlobalSettings({ primaryColor: e.target.value })}
                                                            className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-none"
                                                        />
                                                        <span className="text-sm font-mono text-gray-600">{siteContent.global.primaryColor || ''}</span>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Secondary Color</label>
                                                    <div className="flex items-center gap-3 p-1 bg-gray-50 rounded-xl border border-gray-100">
                                                        <input
                                                            type="color"
                                                            value={siteContent.global.secondaryColor || '#ffffff'}
                                                            onChange={e => updateGlobalSettings({ secondaryColor: e.target.value })}
                                                            className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-none"
                                                        />
                                                        <span className="text-sm font-mono text-gray-600">{siteContent.global.secondaryColor || ''}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Typography Section */}
                                        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm md:col-span-2 space-y-5">
                                            <h4 className="font-heading font-bold text-gray-800 flex items-center gap-2">
                                                🔡 Typography
                                            </h4>

                                            <div className="grid md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Heading Font</label>
                                                    <select
                                                        value={siteContent.global.headingFont || 'Outfit'}
                                                        onChange={e => updateGlobalSettings({ headingFont: e.target.value })}
                                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink outline-none bg-white font-medium"
                                                    >
                                                        <option value="Outfit">Outfit (Modern)</option>
                                                        <option value="Inter">Inter (Clean)</option>
                                                        <option value="Playfair Display">Playfair Display (Elegant)</option>
                                                        <option value="Roboto">Roboto (Classic)</option>
                                                        <option value="210-Claytoy">210 클레이토이 (Korean Cute)</option>
                                                    </select>
                                                    <p className="mt-2 text-xs text-gray-400">Used for titles and large headings</p>
                                                </div>

                                                <div>
                                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Body Font</label>
                                                    <select
                                                        value={siteContent.global.bodyFont || 'Inter'}
                                                        onChange={e => updateGlobalSettings({ bodyFont: e.target.value })}
                                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink outline-none bg-white font-medium"
                                                    >
                                                        <option value="Inter">Inter (Systemic)</option>
                                                        <option value="Open Sans">Open Sans (Readable)</option>
                                                        <option value="Lato">Lato (Balanced)</option>
                                                        <option value="Montserrat">Montserrat (Geometric)</option>
                                                    </select>
                                                    <p className="mt-2 text-xs text-gray-400">Used for paragraphs and descriptions</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showZoneEditor && (
                <ImageTracer
                    imageUrl={tracerImageUrl || (editingProductId ? (products.find(p => p.id === editingProductId)?.frontImage || '') : newProductFrontImage)}
                    mode="placement"
                    title="Auto-Trace Placement Zone"
                    initialZone={tracerInitialZone || tempZone}
                    onSave={(zone) => {
                        if (editingProductId) {
                            setProducts(products.map(p => p.id === editingProductId ? { ...p, placementZone: zone } : p));
                        } else {
                            setTempZone(zone);
                        }
                        setShowZoneEditor(false);
                        setEditingProductId(null);
                        setTracerImageUrl('');
                        setTracerInitialZone(undefined);
                    }}
                    onCancel={() => { 
                        setShowZoneEditor(false); 
                        setEditingProductId(null);
                        setTracerImageUrl('');
                        setTracerInitialZone(undefined);
                    }}
                />
            )}

            {showCropEditor && (
                <ImageTracer
                    imageUrl={tracerImageUrl || (editingProductForCrop ? (products.find(p => p.id === editingProductForCrop)?.frontImage || '') : newProductFrontImage)}
                    mode="crop"
                    title="Auto-Trace Product Crop"
                    initialZone={tracerInitialZone || tempZone}
                    onSave={(zone) => {
                        if (editingProductForCrop) {
                            setProducts(products.map(p => p.id === editingProductForCrop ? { ...p, cropZone: zone } : p));
                        }
                        setShowCropEditor(false);
                        setEditingProductForCrop(null);
                        setTracerImageUrl('');
                        setTracerInitialZone(undefined);
                    }}
                    onCancel={() => { 
                        setShowCropEditor(false); 
                        setEditingProductForCrop(null);
                        setTracerImageUrl('');
                        setTracerInitialZone(undefined);
                    }}
                />
            )}

            {showPatchSizer && (
                <ImageTracer
                    imageUrl={tracerImageUrl || newPatchImage}
                    mode="patch"
                    title="Auto-Trace Patch Content Zone"
                    initialZone={tracerInitialZone || tempPatchZone}
                    onSave={(zone) => {
                        if (editingPatchId) {
                            setPatches(patches.map(p => p.id === editingPatchId ? { ...p, contentZone: zone } : p));
                        } else {
                            setTempPatchZone(zone);
                        }
                        setShowPatchSizer(false);
                        setEditingPatchId(null);
                        setTracerImageUrl('');
                        setTracerInitialZone(undefined);
                    }}
                    onCancel={() => {
                        setShowPatchSizer(false);
                        setEditingPatchId(null);
                        setTracerImageUrl('');
                        setTracerInitialZone(undefined);
                    }}
                />
            )}
        </>
    );
}
