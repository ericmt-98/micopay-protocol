import MapSim from '../components/MapSim';

interface ExploreMapProps {
    onBack: () => void;
    onSelectOffer: (offerId: string) => void;
    amount?: number;
    loading?: boolean;
    /** Issue #17 — surfaced when POST /trades (or lock/reveal) fails; user can retry without re-entering amount. */
    creationError?: string | null;
    onDismissCreationError?: () => void;
}

const ExploreMap = ({
    onBack,
    onSelectOffer,
    amount = 500,
    loading = false,
    creationError,
    onDismissCreationError,
}: ExploreMapProps) => {
    return (
        <div className="bg-surface-container-lowest text-on-surface font-body min-h-screen pb-24">
            {/* Top Navigation */}
            <header className="fixed top-0 left-0 w-full z-50 flex items-center px-6 py-4 bg-white/80 backdrop-blur-md shadow-sm">
                <button 
                    onClick={onBack}
                    className="flex items-center justify-center p-2 rounded-full hover:bg-surface-container-low transition-colors duration-200"
                >
                    <span className="material-symbols-outlined text-primary">arrow_back</span>
                </button>
                <h1 className="ml-4 font-headline font-bold text-xl text-primary tracking-tight">Convertir a efectivo</h1>
            </header>

            <main className="pt-24 px-6 max-w-2xl mx-auto">
                {creationError ? (
                    <div
                        className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 flex flex-col gap-2"
                        role="alert"
                    >
                        <p>{creationError}</p>
                        <div className="flex flex-wrap gap-2 justify-end">
                            <button
                                type="button"
                                className="text-xs font-semibold text-primary underline"
                                onClick={() => onDismissCreationError?.()}
                            >
                                Ocultar
                            </button>
                            <a href="mailto:soporte@micopay.app" className="text-xs font-semibold text-primary underline">
                                Contactar soporte
                            </a>
                        </div>
                    </div>
                ) : null}
                {/* Map Section */}
                <section className="mb-10">
                    <MapSim />
                </section>

                {/* Results Header */}
                <div className="mb-6">
                    <h2 className="font-headline font-bold text-2xl text-on-surface">{`3 ofertas para $${amount} MXN`}</h2>
                    <div className="flex items-center gap-1 mt-1">
                        <span className="material-symbols-outlined text-primary text-sm">location_on</span>
                        <p className="text-sm text-outline font-medium">Zona Centro</p>
                    </div>
                </div>

                {/* Offers List */}
                <div className="space-y-4">
                    {/* CARD 1 (Premium/Best Offer) */}
                    <article className="relative bg-surface p-6 rounded-[24px] border border-primary-container/10 shadow-[0_4px_24px_rgba(0,133,96,0.06)] overflow-hidden">
                        <div className="absolute top-0 right-0 p-4">
                            <div className="w-16 h-16 rounded-full bg-surface-container-high overflow-hidden opacity-40 blur-[1px]">
                                <img 
                                    alt="Local map thumbnail" 
                                    className="w-full h-full object-cover" 
                                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDVnejJTZl4k6kbUtgVVveHEcpYnCcyuNpmxvKgdOURTA-nwegtddt1zJHZ6qtCtQJyP7qax7fb32fip8RaXJ40zAqH_-Al3wUUnZxbZIY3FdANeTu6RQGU1wkVM_HvJKhAbNzq40nOyHwaawE5jPvMc6e3WH039BsBdcc2zRlCmk8z0_9VgZOZsEf_vN4oVdfKpZM0DQhxCaae4mCbGb1fLcjf9M-dmMhU-q0zjhJ5GlsbUd5oEQ2NgBZRJxJBMMGkcGpl_gLbSRdn" 
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 mb-4">
                            <span className="px-3 py-1 bg-primary text-white text-[11px] font-bold rounded-full uppercase tracking-wider">Mejor oferta</span>
                            <span className="px-3 py-1 bg-surface-container-high text-primary text-[11px] font-bold rounded-full uppercase tracking-wider">Negocio verificado</span>
                        </div>
                        <div className="flex items-start justify-between mb-6">
                            <div className="flex gap-4">
                                <div className="w-14 h-14 bg-primary-container/10 rounded-2xl flex items-center justify-center">
                                    <span className="material-symbols-outlined text-primary text-3xl">storefront</span>
                                </div>
                                <div>
                                    <h3 className="font-headline font-bold text-lg text-on-surface">Farmacia Guadalupe</h3>
                                    <p className="text-sm text-outline font-medium flex items-center gap-1">
                                        <span className="material-symbols-outlined text-sm">directions_walk</span> 180 m · 3 min
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between mb-6 p-4 bg-white/50 rounded-2xl">
                            <div>
                                <p className="text-[11px] font-bold text-outline uppercase tracking-wider mb-1">Recibes</p>
                                <p className="text-2xl font-headline font-extrabold text-[#5DCAA5]">$495.00 MXN</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[11px] font-bold text-outline uppercase tracking-wider mb-1">Comisión</p>
                                <p className="text-sm font-bold text-on-surface">$5.00 (1%)</p>
                            </div>
                        </div>
                        <button
                            onClick={() => onSelectOffer('offer_1')}
                            disabled={loading}
                            className="w-full h-[52px] bg-gradient-to-r from-primary to-primary-container text-white font-headline font-bold rounded-xl shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Preparando escrow...
                                </>
                            ) : 'Ir con este agente'}
                        </button>
                    </article>

                    {/* CARD 2 */}
                    <article className="bg-surface-container-low/30 p-5 rounded-[24px] border border-transparent hover:border-surface-container-high transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center border border-surface-container-high">
                                    <span className="material-symbols-outlined text-outline">person</span>
                                </div>
                                <div>
                                    <h3 className="font-headline font-bold text-on-surface">Usuario @carlos_g</h3>
                                    <div className="flex items-center gap-1">
                                        <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">⭐ 4.9 · 87 intercambios</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-outline uppercase tracking-wider">Oferta</p>
                                <p className="text-lg font-headline font-bold text-on-surface">$490.00 MXN</p>
                            </div>
                        </div>
                        <button className="w-full py-3 border border-primary text-primary font-bold rounded-xl active:scale-95 transition-all">
                            Ver oferta
                        </button>
                    </article>

                    {/* CARD 3 */}
                    <article className="bg-surface-container-low/30 p-5 rounded-[24px] border border-transparent hover:border-surface-container-high transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center border border-surface-container-high">
                                    <span className="material-symbols-outlined text-outline">laundry</span>
                                </div>
                                <div>
                                    <h3 className="font-headline font-bold text-on-surface">Lavandería El Sol</h3>
                                    <div className="flex items-center gap-1">
                                        <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">Verificado</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-outline uppercase tracking-wider">Oferta</p>
                                <p className="text-lg font-headline font-bold text-on-surface">$485.00 MXN</p>
                            </div>
                        </div>
                        <button className="w-full py-3 border border-primary text-primary font-bold rounded-xl active:scale-95 transition-all">
                            Ver oferta
                        </button>
                    </article>
                </div>

                {/* Footer Note */}
                <footer className="mt-10 mb-8 p-6 text-center">
                    <p className="text-[12px] leading-relaxed text-outline font-medium">
                        Tu saldo se bloquea en garantía hasta que confirmes la recepción del efectivo. Operación segura y protegida por MicoPay Smart Escrow.
                    </p>
                </footer>
            </main>
        </div>
    );
};

export default ExploreMap;
