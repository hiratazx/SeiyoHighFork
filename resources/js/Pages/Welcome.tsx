import { Head, Link, usePage } from '@inertiajs/react';
import { useState } from 'react';
import CookieConsent from '@/Components/CookieConsent';

// Constants
const APP_NAME = "ainime-games";

const FEATURES = [
    {
        title: "Living Characters",
        description: "Every action has consequences. Characters grow and change over time through genuine long-term development shaped by your choices.",
        icon: "psychology",
        imageUrl: "/images/image1.png"
    },
    {
        title: "Dynamic Dialogue",
        description: "Engage in natural, unscripted conversations. Your input isn't limited to three options—express yourself freely.",
        icon: "chat_bubble",
        imageUrl: "/images/image2.png"
    },
    {
        title: "Infinite Stories",
        description: "There are no scripted endings or 'Game Over' screens. Your journey continues as long as you wish, evolving naturally with every day you play.",
        icon: "all_inclusive",
        imageUrl: "/images/image3.png"
    }
];

const CHARACTERS = [
    {
        id: "nana",
        name: "Nana Asahi",
        title: "The Stray Cat",
        year: "2nd Year",
        club: "Student Council President",
        description: "Perfectionist president with a surprisingly warm heart hiding behind all those rules. She runs the school with an iron will—but why does she stay so late in that empty office?",
        imageUrl: "/images/characters/nana_neutral.jpg",
        icon: "star",
    },
    {
        id: "banri",
        name: "Banri Sato",
        title: "The Quiet Observer",
        year: "2nd Year",
        club: "Literature Club",
        description: "The quiet bookworm who sees more than he lets on. Always lost in thought—or is he just analyzing everyone around him? His grey-blue eyes miss nothing.",
        imageUrl: "/images/characters/banri_amused.jpg",
        icon: "menu_book",
    },
    {
        id: "shinobu",
        name: "Shinobu Tanaka",
        title: "The Timid Flower",
        year: "2nd Year",
        club: "Going Home Club",
        description: "Adorably clumsy and impossibly shy. She apologizes for everything—even for apologizing. But beneath that timid exterior lies a heart full of unspoken feelings.",
        imageUrl: "/images/characters/shinobu_neutral.png",
        icon: "local_florist",
    },
    {
        id: "ryuji",
        name: "Ryuji Onizuka",
        title: "The Wounded Lion",
        year: "2nd Year",
        club: "No Club",
        description: "The school's notorious delinquent with a motorcycle and an attitude. Cross him at your peril—but those who earn his loyalty find a protector fiercer than any knight.",
        imageUrl: "/images/characters/ryuji_confident.jpg",
        icon: "local_fire_department",
    },
    {
        id: "rin",
        name: "Rin Katsuragi",
        title: "The Ivory Queen",
        year: "2nd Year",
        club: "Kendo Captain",
        description: "The untouchable school princess, always in a pristine white kimono. Academically brilliant, martially lethal, and impossibly elegant. What lies beneath that serene mask?",
        imageUrl: "/images/characters/rin_amused.jpg",
        icon: "sports_martial_arts",
    },
    {
        id: "soichiro",
        name: "Soichiro Honda",
        title: "The Gentle Prince",
        year: "2nd Year",
        club: "Everyone's Friend",
        description: "Handsome, kind, and effortlessly charming—everyone's favorite friend. His smile lights up any room. But is there more to this prince than meets the eye?",
        imageUrl: "/images/characters/soichiro_neutral.png",
        icon: "brightness_7",
    },
    {
        id: "hina",
        name: "Hina Sato",
        title: "Princess of the Gloom",
        year: "1st Year",
        club: "Anime & Manga Club",
        description: "A self-proclaimed 'creature of darkness' with a flair for the dramatic. Gothic, theatrical, and harboring a not-so-secret obsession with her adoptive brother Banri.",
        imageUrl: "/images/characters/hina_neutral.jpg",
        icon: "dark_mode",
    },
    {
        id: "akemi",
        name: "Akemi Yoshida",
        title: "The Enigmatic Mirror",
        year: "???",
        club: "???",
        description: "A transfer student who appeared like a ghost, already knowing names and secrets she shouldn't. Her silver hair and mismatched eyes mark her as otherworldly. Why does she seem to know you?",
        imageUrl: "/images/characters/akemi_neutral.jpg",
        icon: "mystery",
    },
];

// Navbar Component
function Navbar() {
    const { auth } = usePage().props as any;
    const user = auth?.user;
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <>
            <div className="fixed top-0 left-0 right-0 z-50 flex justify-center py-5 px-4 pointer-events-none">
                <header className="floating-nav pointer-events-auto">
                    <Link href="/" className="flex items-center gap-3 text-primary group">
                        <span className="material-symbols-outlined text-3xl text-primary transition-transform group-hover:scale-110">school</span>
                        <h2 className="text-white text-lg font-bold tracking-tight font-display">Seiyo High</h2>
                    </Link>

                    <div className="hidden md:flex flex-1 justify-end gap-8 items-center">
                        <nav className="flex items-center gap-8">
                            <a className="text-white/80 hover:text-primary transition-colors text-sm font-medium" href="#features">Features</a>
                            <a className="text-white/80 hover:text-primary transition-colors text-sm font-medium" href="#characters">Characters</a>
                            <Link href={route('guide')} className="text-white/80 hover:text-primary transition-colors text-sm font-medium">Guide</Link>
                            <Link href={route('terms')} className="text-white/80 hover:text-primary transition-colors text-sm font-medium">Terms</Link>
                        </nav>
                        {user ? (
                            <Link
                                href={route('dashboard')}
                                className="bg-primary hover:bg-primary/90 text-background-dark px-5 py-2 rounded-full text-sm font-bold transition-all shadow-lg shadow-primary/20"
                            >
                                Play Now
                            </Link>
                        ) : (
                            <div className="flex items-center gap-3">
                                <Link
                                    href={route('login')}
                                    className="text-white/80 hover:text-primary transition-colors text-sm font-medium"
                                >
                                    Log in
                                </Link>
                                <Link
                                    href={route('register')}
                                    className="bg-primary hover:bg-primary/90 text-background-dark px-5 py-2 rounded-full text-sm font-bold transition-all shadow-lg shadow-primary/20"
                                >
                                    Get Started
                                </Link>
                            </div>
                        )}
                    </div>

                    <div className="md:hidden">
                        <button 
                            className="text-white p-2"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            aria-label="Toggle mobile menu"
                        >
                            <span className="material-symbols-outlined">
                                {isMobileMenuOpen ? 'close' : 'menu'}
                            </span>
                        </button>
                    </div>
                </header>
            </div>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-40 md:hidden">
                    {/* Backdrop */}
                    <div 
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                    
                    {/* Menu Content */}
                    <div className="absolute top-20 left-4 right-4 bg-background-dark/95 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
                        <nav className="flex flex-col gap-4">
                            <Link 
                                href={route('dashboard')} 
                                className="text-white/80 hover:text-primary transition-colors text-lg font-medium py-2"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Games
                            </Link>
                            <Link 
                                href={route('guide')} 
                                className="text-white/80 hover:text-primary transition-colors text-lg font-medium py-2"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Game Guide
                            </Link>
                            <Link 
                                href={route('terms')} 
                                className="text-white/80 hover:text-primary transition-colors text-lg font-medium py-2"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Terms
                            </Link>
                            <Link 
                                href={route('contact')} 
                                className="text-white/80 hover:text-primary transition-colors text-lg font-medium py-2"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Contact
                            </Link>
                            
                            <div className="border-t border-white/10 my-2" />
                            
                            {user ? (
                                <>
                                    <div className="text-white font-medium">{user.name}</div>
                                    <div className="text-white/60 text-sm -mt-2">{user.email}</div>
                                    <Link
                                        href={route('profile.edit')}
                                        className="text-white/80 hover:text-primary transition-colors text-lg font-medium py-2"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        Profile
                                    </Link>
                                    <Link
                                        href={route('logout')}
                                        method="post"
                                        as="button"
                                        className="text-white/80 hover:text-primary transition-colors text-lg font-medium py-2 text-left"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        Log Out
                                    </Link>
                                </>
                            ) : (
                                <>
                                    <Link
                                        href={route('login')}
                                        className="text-white/80 hover:text-primary transition-colors text-lg font-medium py-2"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        Log in
                                    </Link>
                                    <Link
                                        href={route('register')}
                                        className="text-white/80 hover:text-primary transition-colors text-lg font-medium py-2"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        Register
                                    </Link>
                                </>
                            )}
                        </nav>
                    </div>
                </div>
            )}
        </>
    );
}

// Hero Component
function Hero() {
    const { auth } = usePage().props as any;
    const user = auth?.user;
    const ctaHref = user ? route('dashboard') : route('register');
    const ctaText = user ? 'Continue Your Story' : 'Begin Your Story';

    return (
        <section className="relative min-h-screen flex items-center justify-center pt-20">
            {/* Background Image */}
            <div className="absolute inset-0 z-0">
                <div
                    className="w-full h-full bg-cover bg-center"
                    style={{ backgroundImage: `url("/images/hero.jpg")` }}
                />
                <div className="absolute inset-0 hero-gradient" />
            </div>

            {/* Hero Content */}
            <div className="relative z-20 w-full max-w-[960px] flex flex-col items-center text-center px-6">
                <div className="flex flex-col gap-6">
                    <div className="inline-flex items-center self-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest mb-2 backdrop-blur-sm">
                        <span className="material-symbols-outlined text-sm">auto_awesome</span>
                        Unscripted Narrative Engine
                    </div>

                    <h1 className="text-white text-5xl md:text-7xl font-black leading-[1.1] tracking-[-0.04em] font-display drop-shadow-2xl">
                        Every choice is <span className="text-primary italic">unscripted.</span><br />
                        Every memory is yours.
                    </h1>

                    <p className="text-white/70 text-lg md:text-xl font-normal leading-relaxed max-w-2xl mx-auto">
                        Experience the next generation of visual novels at ainime-games. A living world where your words shape the souls of those around you.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
                        <Link href={ctaHref} className="btn-primary min-w-[200px]">
                            {ctaText}
                        </Link>
                        <a href="#deep-systems" className="btn-secondary min-w-[200px]">
                            Learn More
                        </a>
                    </div>
                </div>
            </div>

            {/* Scroll Indicator */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce opacity-50">
                <span className="material-symbols-outlined text-3xl text-white">keyboard_double_arrow_down</span>
            </div>
        </section>
    );
}

// Features Component
function Features() {
    return (
        <section className="flex flex-col items-center py-20 md:py-32 bg-background-dark">
            <div className="w-full max-w-[960px] px-6">
                <div className="flex flex-col gap-16">
                    <div className="flex flex-col gap-4 text-center md:text-left">
                        <h2 className="text-primary text-sm font-bold uppercase tracking-[0.3em]">The Core System</h2>
                        <h1 className="text-white tracking-tight text-4xl md:text-5xl font-bold leading-tight font-display">
                            A Living, Breathing World
                        </h1>
                        <p className="text-white/60 text-lg font-normal leading-relaxed max-w-[720px]">
                            Our AI engine ensures that no two playthroughs are ever the same. Characters don't just follow paths; they evolve based on the weight of your presence.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {FEATURES.map((feature, idx) => (
                            <div key={idx} className="feature-card group">
                                <div className="w-full aspect-video rounded-xl overflow-hidden relative">
                                    <div
                                        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                                        style={{ backgroundImage: `url("${feature.imageUrl}")` }}
                                    />
                                    <div className="absolute inset-0 bg-primary/10 group-hover:bg-transparent transition-colors duration-500" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-2 text-primary">
                                        <span className="material-symbols-outlined">{feature.icon}</span>
                                        <p className="text-white text-xl font-bold font-display">{feature.title}</p>
                                    </div>
                                    <p className="text-white/50 text-sm leading-relaxed">
                                        {feature.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

// Player Agency Component
function PlayerAgency() {
    return (
        <section className="flex flex-col items-center py-20 md:py-32 bg-background-dark border-t border-white/5">
            <div className="w-full max-w-[1200px] px-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-wider mb-4">
                            <span className="material-symbols-outlined text-sm">warning</span>
                            Total Freedom, Total Consequences
                        </div>
                        <h2 className="text-white text-3xl md:text-5xl font-bold font-display tracking-tight mb-6">
                            You Are The <span className="text-primary">Co-Author</span>
                        </h2>
                        <div className="space-y-4 text-white/60 leading-relaxed">
                            <p>
                                This is not a story on rails. There are no invisible walls, no "you can't do that," no predetermined endings. <strong className="text-white">You decide everything.</strong>
                            </p>
                            <p>
                                <strong className="text-primary">Go anywhere.</strong> Paris, Tokyo, a mountain shrine, or just the convenience store at 2am. The world generates around your choices.
                            </p>
                            <p>
                                <strong className="text-primary">Be anyone.</strong> A kind-hearted hero, a manipulative mastermind, a hopeless romantic, or something in between. The AI adapts to your character.
                            </p>
                            <p>
                                <strong className="text-primary">Choose your genre.</strong> Start with cozy slice-of-life and let it evolve into psychological thriller. Or keep it light and wholesome forever. You're in control.
                            </p>
                        </div>
                        
                        <div className="mt-8 p-4 rounded-xl bg-red-900/20 border border-red-500/20">
                            <p className="text-red-200/90 text-sm">
                                <strong className="text-red-300">⚠️ But be warned:</strong> This world has consequences. The AI runs deep psychological simulation—characters remember, relationships shift, trust breaks. The choices you make are yours to live with.
                            </p>
                        </div>
                    </div>
                    
                    <div>
                        <img 
                            src="/images/choices2.jpg" 
                            alt="Your choices shape the story" 
                            className="w-full rounded-2xl border border-white/10 shadow-2xl"
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}

// Privacy Component
function Privacy() {
    return (
        <section className="flex flex-col items-center py-20 md:py-32 bg-background-dark border-t border-white/5">
            <div className="w-full max-w-[1200px] px-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div className="lg:order-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold uppercase tracking-wider mb-4">
                            <span className="material-symbols-outlined text-sm">lock</span>
                            Your Privacy Is Sacred
                        </div>
                        <h2 className="text-white text-3xl md:text-5xl font-bold font-display tracking-tight mb-6">
                            Your Story <span className="text-green-400">Stays Yours</span>
                        </h2>
                        <div className="space-y-4 text-white/60 leading-relaxed">
                            <p>
                                <strong className="text-white">We store nothing.</strong> Your dialogues, your choices, your psychological profile, your entire story—none of it ever touches our servers.
                            </p>
                            <p>
                                <strong className="text-green-400">Everything lives on your device.</strong> Your save file, your generated images, your API key—all stored locally in your browser. We can't see it, we can't access it, we can't analyze it.
                            </p>
                            <p>
                                <strong className="text-white">No logging. No analytics on your gameplay.</strong> We don't track what you do in-game, who you romance, what you say, or how you play. Your story is private by design.
                            </p>
                            <p>
                                <strong className="text-green-400">Your API key is never stored.</strong> It's kept in your browser and only transmitted over encrypted HTTPS when making AI calls. We handle it in transit to assemble prompts, but we never log it, store it, or retain it.
                            </p>
                        </div>
                        
                        <div className="mt-8 p-4 rounded-xl bg-amber-900/20 border border-amber-500/20">
                            <p className="text-amber-200/90 text-sm mb-2">
                                <strong className="text-amber-300">⚠️ Important:</strong> Because everything is local, <strong>you must back up your saves regularly</strong>. If you clear your browser data, your story is gone forever.
                            </p>
                            <p className="text-amber-200/70 text-sm">
                                <span className="material-symbols-outlined text-xs align-middle mr-1">check_circle</span>
                                Save files <strong>never contain your API key</strong>—only your story. Share them freely with friends you trust.
                            </p>
                        </div>
                    </div>
                    
                    <div className="lg:order-1">
                        <img 
                            src="/images/characters/dataprivacy.jpg" 
                            alt="Your privacy is protected - no data stored" 
                            className="w-full rounded-2xl border border-white/10 shadow-2xl"
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}

// Characters Component
function Characters() {
    return (
        <section id="characters" className="flex flex-col items-center py-20 bg-background-dark">
            <div className="w-full max-w-[1200px] px-6">
                <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-4">
                    <div>
                        <h2 className="text-white text-3xl font-bold font-display tracking-tight">Meet the Students</h2>
                        <p className="text-white/50 mt-2">The main cast—but they're just the beginning</p>
                    </div>
                    <Link href={route('guide')} className="text-primary text-sm font-bold flex items-center gap-1 hover:underline">
                        View Game Guide <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {CHARACTERS.map((char) => (
                        <div key={char.id} className="character-card group aspect-[3/4]">
                            {/* Background */}
                            <div
                                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                                style={{ backgroundImage: `url("${char.imageUrl}")` }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/40 to-transparent opacity-90 transition-opacity group-hover:opacity-100" />

                            {/* Content */}
                            <div className="absolute bottom-0 left-0 px-4 py-3 w-full">
                                <p className="text-primary/80 text-[10px] font-semibold uppercase tracking-wider">{char.title}</p>
                                <h3 className="text-lg font-bold text-white font-display leading-tight">{char.name}</h3>
                                <p className="text-white/50 text-[11px]">{char.year} • {char.club}</p>
                                <p className="text-white/60 text-xs leading-relaxed mt-1.5 lg:opacity-0 lg:group-hover:opacity-100 lg:transition-all lg:duration-300 lg:transform lg:translate-y-2 lg:group-hover:translate-y-0">
                                    {char.description}
                                </p>
                            </div>

                            {/* Icon Badge */}
                            <div className="absolute top-3 right-3 bg-primary/20 backdrop-blur-md p-2 rounded-full text-primary border border-primary/30 shadow-lg">
                                <span className="material-symbols-outlined text-lg">{char.icon}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Emergent Characters Showcase */}
                <div id="features" className="mt-16 glass-panel rounded-2xl p-6 md:p-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-4">
                                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                                Your Story, Your Characters
                            </div>
                            <h3 className="text-white text-2xl md:text-3xl font-bold font-display mb-4">
                                Every Playthrough Spawns Unique Lives
                            </h3>
                            <div className="space-y-3 text-white/60 text-sm leading-relaxed">
                                <p>
                                    <strong className="text-white">Dozens of side characters</strong> populate the world—teachers, shopkeepers, classmates, and family members—each with their own stories waiting to unfold.
                                </p>
                                <p>
                                    <strong className="text-primary">Invent characters on the fly.</strong> Describe a new friend, a rival, a love interest—the AI brings them to life instantly and remembers them forever.
                                </p>
                                <p>
                                    <strong className="text-white">Your story is unique.</strong> The characters that emerge from your choices, your conversations, your imagination—they exist only in your world. No one else will ever meet them.
                                </p>
                            </div>
                        </div>
                        <div className="relative">
                            <img 
                                src="/images/characters/unique characters.PNG" 
                                alt="Unique emergent characters from player stories" 
                                className="w-full rounded-xl border border-white/10 shadow-2xl"
                            />
                            <div className="absolute -bottom-3 -right-3 bg-primary/20 backdrop-blur-md px-4 py-2 rounded-full text-primary text-xs font-bold border border-primary/30">
                                Characters from real playthroughs
                            </div>
                        </div>
                    </div>

                    {/* Side Characters Can Become Main Characters */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center mt-16">
                        <div className="relative">
                            <img 
                                src="/images/characters/sidecharacters1.jpg" 
                                alt="Side characters can become protagonists" 
                                className="w-full rounded-xl border border-white/10 shadow-2xl"
                            />
                            <div className="absolute -bottom-3 -right-3 bg-amber-500/20 backdrop-blur-md px-4 py-2 rounded-full text-amber-400 text-xs font-bold border border-amber-500/30">
                                Today's extra, tomorrow's lead
                            </div>
                        </div>
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider mb-4">
                                <span className="material-symbols-outlined text-sm">trending_up</span>
                                Dynamic Importance
                            </div>
                            <h3 className="text-white text-2xl md:text-3xl font-bold font-display mb-4">
                                Anyone Can Become a Protagonist
                            </h3>
                            <div className="space-y-3 text-white/60 text-sm leading-relaxed">
                                <p>
                                    <strong className="text-white">Side characters don't stay side characters.</strong> That quiet girl behind the konbini counter? Keep talking to her and she'll develop a full backstory, complex motivations, and her own story arc.
                                </p>
                                <p>
                                    <strong className="text-amber-400">Invent someone? They're just as real.</strong> Describe a childhood friend, mention a rival from another school, or imagine a mysterious stranger—the AI brings them to life with the same depth as the original cast.
                                </p>
                                <p>
                                    <strong className="text-white">Your choices decide who matters.</strong> Befriend a random classmate, invent a love interest, or ignore the main cast entirely—build your own circle from the ground up.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Time Systems: Years, Seasons, Weather, Calendar */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center mt-16">
                        <div className="relative lg:order-2">
                            <img 
                                src="/images/characters/snow2.jpg" 
                                alt="Seasons change throughout your story" 
                                className="w-full rounded-xl border border-white/10 shadow-2xl"
                            />
                            <div className="absolute -bottom-3 -left-3 bg-cyan-500/20 backdrop-blur-md px-4 py-2 rounded-full text-cyan-400 text-xs font-bold border border-cyan-500/30">
                                Time flows, seasons change
                            </div>
                        </div>
                        <div className="lg:order-1">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-4">
                                <span className="material-symbols-outlined text-sm">calendar_month</span>
                                Living World
                            </div>
                            <h3 className="text-white text-2xl md:text-3xl font-bold font-display mb-4">
                                A World That Breathes With Time
                            </h3>
                            <div className="space-y-3 text-white/60 text-sm leading-relaxed">
                                <p>
                                    <strong className="text-cyan-400">Years of your life.</strong> Play through two years of high school, then continue into college or working life. What future will you build? Who will still be by your side?
                                </p>
                                <p>
                                    <strong className="text-white">Seasons transform everything.</strong> Cherry blossoms in spring, summer festivals, autumn leaves, winter snow—each season brings new activities, new moods, and new story possibilities.
                                </p>
                                <p>
                                    <strong className="text-cyan-400">Dynamic weather.</strong> Rain, sunshine, storms—the weather changes with the seasons and even throughout the day, affecting the atmosphere and what you can do.
                                </p>
                                <p>
                                    <strong className="text-white">Grounded in reality.</strong> Holidays, cultural events, school festivals, exams—the calendar is filled with real moments that shape your story and deepen your connections.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

// Deep Systems Showcase Component
function DeepSystems() {
    const features = [
        {
            title: "Classic Visual Novel Feel",
            subtitle: "Nostalgic Gameplay",
            description: "Experience the charm of early 2000s visual novels—character sprites, beautiful backgrounds, and that unmistakable atmosphere. But with a modern twist: everything is dynamically generated.",
            image: "/images/characters/ingame.PNG",
            icon: "videogame_asset",
            color: "text-blue-400",
        },
        {
            title: "Be Anyone. Build Your Legend.",
            subtitle: "Living Autobiography",
            description: "The AI meticulously tracks every detail you reveal about yourself—your backstory, your family, your secrets. Invent your past on the fly and watch it become canon. You're not playing a character; you're becoming one.",
            image: "/images/characters/playerbackstory.PNG",
            icon: "person_edit",
            color: "text-cyan-400",
        },
        {
            title: "Epic Story Arcs Unfold",
            subtitle: "Structured Narratives",
            description: "This isn't AI slop winging it. The system creates and tracks multi-chapter story arcs with beats, conflicts, and resolutions. Unlock new arcs through your choices. Every playthrough weaves a unique epic.",
            image: "/images/characters/storyarcs.PNG",
            icon: "timeline",
            color: "text-yellow-400",
        },
        {
            title: "Subplots Within Subplots",
            subtitle: "Layered Drama",
            description: "While your main story unfolds, dozens of subplots simmer beneath the surface. Character rivalries, secret alliances, hidden romances—all tracked and evolving whether you're watching or not. The world lives.",
            image: "/images/characters/subplots.PNG",
            icon: "account_tree",
            color: "text-orange-400",
        },
        {
            title: "The AI Psychoanalyzes YOU",
            subtitle: "Player Psychology",
            description: "As you play, the AI builds a deep psychological profile of your character. Your attachment style, defense mechanisms, fears, desires—it sees how you really play, not just what you do.",
            image: "/images/characters/psychoanalysis.PNG",
            icon: "psychology",
            color: "text-purple-400",
        },
        {
            title: "Every NPC Has Depth",
            subtitle: "NPC Psychology",
            description: "The AI psychoanalyzes every character after each scene. Their emotional states, perceptions of you, internal conflicts—all evolving in real time based on your interactions.",
            image: "/images/characters/npcpsychoanalysis.PNG",
            icon: "psychology_alt",
            color: "text-pink-400",
        },
        {
            title: "Characters Truly Evolve",
            subtitle: "Long-Term Development",
            description: "Watch personalities transform over time. The AI tracks developing traits, new habits, emotional growth, and even traumas. That shy girl might find her voice. That bully might soften. Every character's journey is unique.",
            image: "/images/characters/character traits.PNG",
            icon: "trending_up",
            color: "text-emerald-400",
        },
        {
            title: "Affection With Reasoning",
            subtitle: "Relationship Dynamics",
            description: "Watch relationships evolve with detailed explanations. The AI doesn't just track affection—it tells you exactly WHY a character's feelings changed. Every +1 and -1 has a story.",
            image: "/images/characters/Profile affection.PNG",
            icon: "favorite",
            color: "text-red-400",
        },
        {
            title: "Go Anywhere In The World",
            subtitle: "Infinite Locations",
            description: "Flight to Paris? A secret mountain temple? The AI generates unique, beautiful backgrounds for any location you visit. Your world expands with every adventure.",
            image: "/images/characters/uniquelocations.PNG",
            icon: "travel_explore",
            color: "text-green-400",
        },
        {
            title: "Generate Your Own Novel",
            subtitle: "Living Story",
            description: "Every day, the AI writes a beautifully crafted chapter of YOUR story. Read back your adventures as a novel—you're not just playing a game, you're authoring a book.",
            image: "/images/characters/novels.PNG",
            icon: "auto_stories",
            color: "text-amber-400",
        },
        {
            title: "Replay, Share & Relive",
            subtitle: "Global Stories",
            description: "Replay your own adventures anytime. Import a friend's save to continue their story—or just watch it unfold in replay mode. Story in another language? One click translates the replay to English so anyone can experience your journey.",
            image: "/images/characters/replayanylanguage.PNG",
            icon: "replay",
            color: "text-teal-400",
        },
    ];

    return (
        <section id="deep-systems" className="flex flex-col items-center py-20 md:py-32 bg-background-dark border-t border-white/5">
            <div className="w-full max-w-[1200px] px-6">
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-4">
                        <span className="material-symbols-outlined text-sm">neurology</span>
                        Deep Systems
                    </div>
                    <h2 className="text-white text-3xl md:text-5xl font-bold font-display tracking-tight mb-4">
                        This Isn't Your Average Visual Novel
                    </h2>
                    <p className="text-white/50 text-lg max-w-2xl mx-auto">
                        Beneath the nostalgic surface lies a deeply intelligent system that watches, remembers, and evolves.
                    </p>
                </div>

                <div className="space-y-8">
                    {features.map((feature, idx) => (
                        <div 
                            key={idx} 
                            className={`glass-panel rounded-2xl p-6 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center ${idx % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}
                        >
                            <div className={idx % 2 === 1 ? 'lg:order-2' : ''}>
                                <div className={`inline-flex items-center gap-2 ${feature.color} text-xs font-bold uppercase tracking-wider mb-2`}>
                                    <span className="material-symbols-outlined text-lg">{feature.icon}</span>
                                    {feature.subtitle}
                                </div>
                                <h3 className="text-white text-2xl md:text-3xl font-bold font-display mb-4">
                                    {feature.title}
                                </h3>
                                <p className="text-white/60 leading-relaxed">
                                    {feature.description}
                                </p>
                            </div>
                            <div className={idx % 2 === 1 ? 'lg:order-1' : ''}>
                                <img 
                                    src={feature.image} 
                                    alt={feature.title}
                                    className="w-full rounded-xl border border-white/10 shadow-2xl"
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Teaser */}
                <div className="mt-16 text-center">
                    <p className="text-white/40 text-lg italic">
                        ...and dozens more systems we haven't even mentioned.
                    </p>
                </div>
            </div>
        </section>
    );
}

// API Setup Component
function ApiSetup() {
    return (
        <section className="flex flex-col items-center py-20 bg-background-dark border-t border-white/5">
            <div className="w-full max-w-[960px] px-6">
                <div className="flex flex-col gap-8">
                    <div className="flex flex-col gap-4 text-center">
                        <h2 className="text-primary text-sm font-bold uppercase tracking-[0.3em]">Getting Started</h2>
                        <h1 className="text-white tracking-tight text-4xl md:text-5xl font-bold leading-tight font-display">
                            Bring Your Own AI
                        </h1>
                        <p className="text-white/60 text-lg font-normal leading-relaxed max-w-[720px] mx-auto">
                            Seiyo High uses Google's Gemini AI. You'll need your own API key to play—it's free to start!
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="glass-panel rounded-2xl p-8">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="bg-primary/20 p-3 rounded-full">
                                    <span className="material-symbols-outlined text-primary text-2xl">key</span>
                                </div>
                                <h3 className="text-white text-xl font-bold font-display">Step 1: Get API Key</h3>
                            </div>
                            <p className="text-white/60 leading-relaxed mb-4">
                                <a
                                    href="https://aistudio.google.com/app/apikey"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline font-medium"
                                >
                                    Create your Google Gemini API key here →
                                </a>
                            </p>
                            <p className="text-white/40 text-sm">
                                It takes less than a minute. You'll need Tier 1 access to play (see Step 2).
                            </p>
                        </div>

                        <div className="glass-panel rounded-2xl p-8">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="bg-primary/20 p-3 rounded-full">
                                    <span className="material-symbols-outlined text-primary text-2xl">rocket_launch</span>
                                </div>
                                <h3 className="text-white text-xl font-bold font-display">Step 2: Unlock Tier 1</h3>
                            </div>
                            <p className="text-white/60 leading-relaxed mb-4">
                                Add a payment method to your Google Cloud account to unlock <span className="text-green-400 font-semibold">$300 in free credits</span> and higher rate limits.
                            </p>
                            <div className="bg-amber-900/30 border border-amber-600/30 rounded-lg p-3">
                                <p className="text-amber-200/90 text-sm">
                                    <span className="font-bold">💡 Don't worry:</span> You won't be charged until you explicitly convert to a paid account.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

// Coming Soon Component
function ComingSoon() {
    const upcomingStories = [
        {
            title: "The Dorm",
            description: "Navigate the chaos of campus drama, late-night study sessions, and finding yourself.",
            image: "/images/college2.jpg",
            color: "from-orange-500/80",
            status: "Coming Soon",
        },
        {
            title: "Salaryman",
            description: "Survive the corporate jungle. Office politics, burnout, and dreams of something more.",
            image: "/images/Salaryman.jpg",
            color: "from-blue-500/80",
            status: "In Development",
        },
        {
            title: "Basements & Drakes",
            description: "Dungeons, dragons, and destiny. Forge your legend in a world of magic and mystery.",
            image: "/images/Fantasy2.jpg",
            color: "from-emerald-500/80",
            status: "In Development",
        },
        {
            title: "The Middle Frontier",
            description: "Explore the cosmos. First contact, space stations, and the frontiers of human ambition.",
            image: "/images/Scifi2.jpg",
            color: "from-purple-500/80",
            status: "In Development",
        },
    ];

    return (
        <section className="flex flex-col items-center py-20 bg-background-dark border-t border-white/5">
            <div className="w-full max-w-[1200px] px-6">
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
                        <span className="material-symbols-outlined text-lg">rocket_launch</span>
                        Platform Roadmap
                    </div>
                    <h2 className="text-white text-2xl md:text-3xl font-bold font-display mb-4">
                        More AI-Powered Stories Coming Soon
                    </h2>
                    <p className="text-white/50 text-lg max-w-2xl mx-auto">
                        Seiyo High is just the beginning. We're building a platform of unscripted AI visual novels across different genres, settings, and worlds.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {upcomingStories.map((story, index) => (
                        <div 
                            key={index}
                            className="group relative aspect-[16/9] rounded-2xl overflow-hidden border border-white/10"
                        >
                            <img 
                                src={story.image} 
                                alt={story.title}
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            <div className={`absolute inset-0 bg-gradient-to-t ${story.color} via-transparent to-transparent opacity-50`} />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                            
                            <div className="absolute bottom-0 left-0 right-0 p-6">
                                <h3 className="text-white font-bold font-display text-2xl mb-2">{story.title}</h3>
                                <p className="text-white/80 text-sm leading-relaxed">
                                    {story.description}
                                </p>
                            </div>

                            <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full text-white/90 text-xs font-bold uppercase tracking-wider border border-white/20">
                                {story.status}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// Disclaimer Component
function Disclaimer() {
    return (
        <section className="flex flex-col items-center py-20 bg-background-dark border-t border-white/5">
            <div className="w-full max-w-[1200px] px-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div className="relative">
                        <img 
                            src="/images/disclaimer2.jpg" 
                            alt="AI technology has limitations" 
                            className="w-full rounded-xl border border-white/10 shadow-2xl"
                        />
                    </div>
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold uppercase tracking-wider mb-4">
                            <span className="material-symbols-outlined text-sm">info</span>
                            Honest Expectations
                        </div>
                        <h2 className="text-white text-2xl md:text-3xl font-bold font-display mb-6">
                            The Frontier of Interactive Storytelling
                        </h2>
                        <div className="space-y-4 text-white/60 text-sm leading-relaxed">
                            <p>
                                <strong className="text-white">You're experiencing something experimental.</strong> This is the bleeding edge of AI-driven narrative—technology that didn't exist a few years ago. We're pushing these models to their absolute limits to create something that's never been possible before.
                            </p>
                            <p>
                                <strong className="text-rose-400">AI will make mistakes.</strong> At their core, these are sophisticated pattern-matching systems. When the AI slips up, simply correct it—tell it what went wrong, and your story continues. Think of it as collaborative storytelling with an enthusiastic but occasionally confused partner.
                            </p>
                            <p>
                                <strong className="text-white">Memory is compressed, not lost.</strong> Perfect recall across an entire playthrough isn't possible yet. Character development and relationships are always preserved, but distant events get summarized over time—their effects on your story remain, even as the details compress.
                            </p>
                            <p>
                                <strong className="text-rose-400">When all else fails:</strong> Import a backup save, or embrace the chaos and start fresh. Sometimes the best stories come from unexpected new beginnings.
                            </p>
                            <p>
                                <strong className="text-white">This is for the pioneers.</strong> Running simulations this deep has only recently become financially feasible—AI is still expensive. If you love stories, visual novels, reading, or writing, and want to experience the future of interactive fiction <em>now</em>, you're in the right place. Google's $300 in free credits gives you hundreds of hours to discover if this is worth it for you.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

// CTA Component
function CTA() {
    const { auth } = usePage().props as any;
    const user = auth?.user;
    const ctaHref = user ? route('dashboard') : route('register');

    return (
        <section className="flex flex-col items-center py-20 bg-background-dark">
            <div className="w-full max-w-[960px] px-6">
                <div className="cta-panel">
                    <div className="bg-background-dark/90 backdrop-blur-xl rounded-[1.4rem] p-10 md:p-16 flex flex-col items-center gap-8">
                        <img 
                            src="/images/seiyo_transparent1.png" 
                            alt="Seiyo High" 
                            className="w-64 md:w-80 h-auto -mb-4"
                        />
                        <div className="text-center max-w-2xl">
                            <h2 className="text-4xl font-bold text-white font-display mb-4">Ready to start your first day?</h2>
                            <p className="text-white/80 text-lg mb-4">
                                Japan, spring of 2000. You're a 2nd-year transfer student stepping through the gates of Seiyo High for the first time. Your flip phone buzzes with i-mode emails, your bag holds a MiniDisc player loaded with your favorite tracks, and somewhere in town there's a purikura booth with your name on it. No smartphones, no social media—just plans made in person, letters passed in class, and the thrill of actually getting lost.
                            </p>
                            <p className="text-white/60 text-lg">
                                This is our love letter to high school animes and visual novels. The gates of Seiyo High are open. Step into a world where your story is truly your own!
                            </p>
                        </div>
                        <div>
                            <Link
                                href={ctaHref}
                                className="bg-primary hover:bg-white text-background-dark px-10 py-5 rounded-2xl text-xl font-black transition-all hover:scale-105 inline-block"
                                style={{ boxShadow: '0 0 50px rgba(244, 157, 37, 0.2)' }}
                            >
                                {user ? 'Enter the Gates' : 'Enroll Now'}
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

// Footer Component
function Footer() {
    return (
        <footer className="bg-background-dark border-t border-white/5 py-16">
            <div className="max-w-[960px] mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                    <div className="col-span-1 md:col-span-2 flex flex-col gap-6">
                        <div className="flex items-center gap-3 text-primary">
                            <img 
                                src="/images/AI-visual-novel-logo.png" 
                                alt="Logo" 
                                className="w-12 h-12 rounded-xl border border-primary/20 bg-primary/10"
                            />
                            <h2 className="text-white text-2xl font-bold font-display">ainime-games</h2>
                        </div>
                        <p className="text-white/40 max-w-sm leading-relaxed">
                            ainime-games is a platform dedicated to pushing the boundaries of interactive storytelling through advanced AI models and a nostalgic aesthetic.
                        </p>
                    </div>

                    <div>
                        <h4 className="text-white font-bold mb-6 font-display uppercase tracking-wider text-sm">Navigation</h4>
                        <ul className="flex flex-col gap-4 text-white/40 text-sm">
                            <li><Link className="hover:text-primary transition-colors" href="/">Home</Link></li>
                            <li><a className="hover:text-primary transition-colors" href="#characters">Characters</a></li>
                            <li><Link className="hover:text-primary transition-colors" href={route('guide')}>Game Guide</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-bold mb-6 font-display uppercase tracking-wider text-sm">Support</h4>
                        <ul className="flex flex-col gap-4 text-white/40 text-sm">
                            <li><Link className="hover:text-primary transition-colors" href={route('terms')}>Terms of Service</Link></li>
                            <li><Link className="hover:text-primary transition-colors" href={route('contact')}>Contact</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="mt-16 pt-8 border-t border-white/5 text-center text-white/20 text-[10px] tracking-[0.3em] uppercase">
                    © {new Date().getFullYear()} Ainime Games. All memories reserved.
                </div>
            </div>
        </footer>
    );
}

// Main Welcome Page
export default function Welcome() {
    return (
        <div className="relative min-h-screen bg-background-dark text-white/90 overflow-x-hidden selection:bg-primary selection:text-background-dark">
            <Head title="Seiyo High - Unscripted AI Visual Novel" />

            <Navbar />

            <main>
                <Hero />
                <Features />
                <PlayerAgency />
                <Privacy />
                <Characters />
                <DeepSystems />
                <ApiSetup />
                <ComingSoon />
                <Disclaimer />
                <CTA />
            </main>

            <Footer />
            <CookieConsent />
        </div>
    );
}
