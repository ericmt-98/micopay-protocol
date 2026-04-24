import MapSim from '../components/MapSim';

interface DepositMapProps {
    onBack: () => void;
    onSelectOffer: (offerId: string) => void;
    loading?: boolean;
    amount?: number;
    creationError?: string | null;
    onDismissCreationError?: () => void;
}

const DepositMap = ({
    onBack,
    onSelectOffer,
    loading,
    amount = 500,
    creationError,
    onDismissCreationError,
}: DepositMapProps) => {
    return (
        <div className="bg-surface text-on-surface min-h-screen pb-24">
            {/* TopAppBar */}
            <header className="w-full top-0 sticky bg-[#E7F6FF] transition-colors duration-300 shadow-[0px_32px_32px_rgba(11,30,38,0.04)] z-50">
                <div className="flex items-center justify-between px-6 py-4 w-full">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={onBack}
                            className="text-[#00694C] active:scale-95 duration-200"
                        >
                            <span className="material-symbols-outlined">arrow_back</span>
                        </button>
                        <h1 className="font-headline font-bold text-xl text-[#00694C]">Ofertas de depósito</h1>
                    </div>
                </div>
            </header>

            <main className="max-w-xl mx-auto px-6 pt-8 space-y-8">
                {creationError ? (
                    <div
                        className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 flex flex-col gap-2"
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
                {/* Summary Context */}
                <section className="space-y-2">
                    <span className="text-on-surface-variant font-label text-sm uppercase tracking-widest">Solicitud de depósito</span>
                    <div className="flex items-baseline gap-2">
                        <h2 className="text-4xl font-headline font-extrabold text-on-surface tracking-tight">${amount}</h2>
                        <span className="text-xl font-headline font-bold text-on-surface-variant">MXN</span>
                    </div>
                    <p className="text-on-surface-variant text-sm font-body">Buscando agentes y usuarios verificados cerca de ti.</p>
                </section>

                {/* Map View Section */}
                <section>
                    <MapSim type="deposit" />
                </section>

                {/* Offers List */}
                <div className="space-y-6">
                    {/* Card 1: Premium Offer */}
                    <div className="relative group">
                        <div className="absolute -top-3 left-6 z-10">
                            <span className="bg-primary text-on-primary text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">Mejor oferta</span>
                        </div>
                        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0px_32px_32px_rgba(11,30,38,0.04)] ring-1 ring-outline-variant/10 flex flex-col gap-5 transition-transform hover:scale-[1.01] duration-300">
                            <div className="flex justify-between items-start">
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 bg-primary-fixed rounded-xl flex items-center justify-center text-primary">
                                        <span className="material-symbols-outlined" style={{ fontVariationSettings: '"FILL" 1' }}>storefront</span>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-1">
                                            <h3 className="font-bold text-lg">Tienda Don Pepe</h3>
                                            <span className="material-symbols-outlined text-accent text-sm" style={{ fontVariationSettings: '"FILL" 1' }}>verified</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-on-surface-variant text-xs">
                                            <span className="material-symbols-outlined text-xs">near_me</span>
                                            <span>120m de distancia</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="block text-xs text-on-surface-variant font-label uppercase">Comisión</span>
                                    <span className="text-primary font-bold">$2 MXN</span>
                                </div>
                            </div>
                            <div className="bg-surface-container-low rounded-lg p-4 flex justify-between items-center">
                                <div className="space-y-1">
                                    <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-tight">Recibimos</p>
                                    <p className="font-bold text-on-surface">$500 MXN</p>
                                </div>
                                <span className="material-symbols-outlined text-outline-variant">trending_flat</span>
                                <div className="space-y-1 text-right">
                                    <p className="text-[10px] text-accent uppercase font-bold tracking-tight">Recibes</p>
                                    <p className="font-bold text-on-surface text-lg">498 MXN</p>
                                </div>
                            </div>
                            <button
                                onClick={() => onSelectOffer('don_pepe')}
                                disabled={loading}
                                className="w-full h-[46px] bg-gradient-to-r from-primary to-primary-container text-white font-semibold rounded-lg shadow-md active:scale-95 duration-200 transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-wait"
                            >
                                {loading ? 'Bloqueando fondos…' : 'Aceptar esta oferta'}
                            </button>
                        </div>
                    </div>

                    {/* Card 2: P2P Offer */}
                    <div className="bg-surface-container rounded-xl p-6 ring-1 ring-outline-variant/5 flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                            <div className="flex gap-4">
                                <div className="w-12 h-12 bg-surface-container-highest rounded-full overflow-hidden">
                                    <img 
                                        alt="Usuario @ana_m" 
                                        className="w-full h-full object-cover" 
                                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuCp_NgOKNlIgWMDhXs1-yN_QbAU68g12IATEXGneP92K4wwRT0KZCB9sAyPpp_oDv2ox9Qe-E8WflDnH6Pv5Zba4GIbsWqkuRiulQ_MjZx5gp2g4F_x5eZlMitJqxXEQwambzMvFbXXc63xWSEQRyt0a_6eF9LS0zxY-YVmuqqxnfDggD8mBE6oUHCAoQ6m7tY3u3SOL9W4nmNwlYpp8SKF0V_IBuSTGqqK_ddbE5aA252kRw-S7t04SiLx4zzz4DbSDbk_XGJ4BcFR" 
                                    />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">Usuario @ana_m</h3>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-0.5 text-amber-500">
                                            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: '"FILL" 1' }}>star</span>
                                            <span className="text-xs font-bold text-on-surface">4.8</span>
                                        </div>
                                        <span className="text-xs text-on-surface-variant">•</span>
                                        <div className="flex items-center gap-1 text-on-surface-variant text-xs">
                                            <span className="material-symbols-outlined text-xs">near_me</span>
                                            <span>300m</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="block text-xs text-on-surface-variant font-label uppercase">Recibes</span>
                                <span className="text-on-surface font-bold">495 MXN</span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center border-t border-outline-variant/10 pt-4">
                            <p className="text-xs text-on-surface-variant">Entrega rápida en efectivo</p>
                            <button className="text-primary font-bold text-sm px-4 py-2 hover:bg-primary/5 rounded-lg transition-colors">Ver detalles</button>
                        </div>
                    </div>
                </div>

                {/* Informative note */}
                <div className="bg-surface-container-low rounded-2xl p-6 border border-primary/10">
                    <div className="flex gap-4">
                        <span className="material-symbols-outlined text-primary">info</span>
                        <p className="text-sm text-on-surface-variant leading-relaxed">
                            Las ofertas están basadas en la tasa de cambio actual y la cercanía de los agentes. Todas las transacciones están protegidas por el contrato de depósito en garantía de MicoPay.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default DepositMap;
