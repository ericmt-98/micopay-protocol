/**
 * Root shell for Micopay MVP flows. Owns cross-page state so issue #17 (confirmation + drafts) and #20/#31
 * (trade detail, cancel, deep links) can share `activeAmount`, `tradeDetailId`, and history `pushState`.
 */
import { useState, useEffect, useCallback } from 'react'
import Home from './pages/Home'
import CashoutRequest from './pages/CashoutRequest'
import DepositRequest from './pages/DepositRequest'
import ExploreMap from './pages/ExploreMap'
import DepositMap from './pages/DepositMap'
import ChatRoom from './pages/ChatRoom'
import DepositChat from './pages/DepositChat'
import QRReveal from './pages/QRReveal'
import DepositQR from './pages/DepositQR'
import SuccessScreen from './pages/SuccessScreen'
import Explore from './pages/Explore'
import CETESScreen from './pages/CETESScreen'
import BlendScreen from './pages/BlendScreen'
import BottomNav from './components/BottomNav'
import TradeConfirmation from './components/TradeConfirmation'
import TradeDetail, { type GeneralCancelOutcome, type TradeDetailLoadedTrade } from './pages/TradeDetail'
import TradeCancelled from './pages/TradeCancelled'
import { extractApiErrorPayload } from './utils/apiError'
import { registerUser, createTrade, lockTrade, revealTrade, UserData, TradeData } from './services/api'

interface AppProps {
  /** Cold `/trade/:id` entry (issue #31) — optional deep link bootstrap. */
  initialTradeId?: string | null
}

function App({ initialTradeId = null }: AppProps) {
  const [currentPage, setCurrentPage] = useState('home')
  const [flow, setFlow] = useState<'cashout' | 'deposit' | null>(null)

  const [buyerUser, setBuyerUser] = useState<UserData | null>(null)
  const [sellerUser, setSellerUser] = useState<UserData | null>(null)
  const [activeTrade, setActiveTrade] = useState<TradeData | null>(null)
  const [lockTxHash, setLockTxHash] = useState<string | null>(null)
  const [activeAmount, setActiveAmount] = useState(500)
  const [tradeLoading, setTradeLoading] = useState(false)
  const [tradeDetailId, setTradeDetailId] = useState<string | null>(null)
  const [tradeCreationError, setTradeCreationError] = useState<string | null>(null)
  const [cancelledScreen, setCancelledScreen] = useState<GeneralCancelOutcome | null>(null)
  const [cashoutDraft, setCashoutDraft] = useState('500')
  const [depositDraft, setDepositDraft] = useState('500')
import { useState, useEffect } from "react";
import Home from "./pages/Home";
import CashoutRequest from "./pages/CashoutRequest";
import DepositRequest from "./pages/DepositRequest";
import ExploreMap from "./pages/ExploreMap";
import DepositMap from "./pages/DepositMap";
import ChatRoom from "./pages/ChatRoom";
import DepositChat from "./pages/DepositChat";
import QRReveal from "./pages/QRReveal";
import DepositQR from "./pages/DepositQR";
import SuccessScreen from "./pages/SuccessScreen";
import Explore from "./pages/Explore";
import CETESScreen from "./pages/CETESScreen";
import BlendScreen from "./pages/BlendScreen";
import Profile from "./pages/Profile";
import BottomNav from "./components/BottomNav";
import {
  registerUser,
  createTrade,
  lockTrade,
  revealTrade,
  UserData,
  TradeData,
} from "./services/api";

function App() {
  const [currentPage, setCurrentPage] = useState("home");
  const [flow, setFlow] = useState<"cashout" | "deposit" | null>(null);

  // API state
  const [buyerUser, setBuyerUser] = useState<UserData | null>(null);
  const [sellerUser, setSellerUser] = useState<UserData | null>(null);
  const [activeTrade, setActiveTrade] = useState<TradeData | null>(null);
  const [lockTxHash, setLockTxHash] = useState<string | null>(null);
  const [activeAmount, setActiveAmount] = useState(500);
  const [tradeLoading, setTradeLoading] = useState(false);

  useEffect(() => {
    const initUsers = async () => {
      try {
        const stored = localStorage.getItem("micopay_users");
        if (stored) {
          const { buyer, seller } = JSON.parse(stored);
          setBuyerUser(buyer);
          setSellerUser(seller);
          console.log("✅ Users restored:", buyer.username, seller.username);
          return;
        }
        const ts = Date.now() % 100000;
        const [buyer, seller] = await Promise.all([
          registerUser(`juan_${ts}`),
          registerUser(`farmacia_${ts}`),
        ]);
        localStorage.setItem(
          "micopay_users",
          JSON.stringify({ buyer, seller }),
        );
        setBuyerUser(buyer);
        setSellerUser(seller);
        console.log("✅ Users registered:", buyer.username, seller.username);
      } catch (e) {
        console.warn("⚠️ Backend not available, running in UI-only mode", e);
      }
    };
    initUsers();
  }, []);

  useEffect(() => {
    if (initialTradeId) {
      setTradeDetailId(initialTradeId)
      setCurrentPage('trade_detail')
    }
  }, [initialTradeId])

  const syncTradeFromDetail = useCallback((t: TradeDetailLoadedTrade) => {
    setActiveTrade((prev) => {
      if (
        prev?.id === t.id
        && prev.status === t.status
        && prev.amount_mxn === t.amount_mxn
        && prev.secret_hash === t.secret_hash
      ) {
        return prev
      }
      return {
        id: t.id,
        status: t.status,
        secret_hash: t.secret_hash,
        amount_mxn: t.amount_mxn,
        lock_tx_hash: t.lock_tx_hash ?? undefined,
      }
    })
    if (t.lock_tx_hash) setLockTxHash(t.lock_tx_hash)
    setActiveAmount(t.amount_mxn)
  }, [])

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
  };

  const handleAccountDeleted = () => {
    setBuyerUser(null);
    setSellerUser(null);
    setActiveTrade(null);
    setLockTxHash(null);
    setFlow(null);
    localStorage.removeItem("micopay_users");
    setCurrentPage("home");
  };

  const startCashout = () => {
    setFlow("cashout");
    setCurrentPage("cashout");
  };

  const startDeposit = () => {
    setFlow("deposit");
    setCurrentPage("deposit");
  };

  const handleOfferSelected = async (_offerId: string) => {
    if (!buyerUser || !sellerUser) {
      setCurrentPage('chat')
      return
    }
    setTradeLoading(true)
    setTradeCreationError(null)
    try {
      const trade = await createTrade(sellerUser.id, activeAmount, buyerUser.token)
      const { lock_tx_hash } = await lockTrade(trade.id, sellerUser.token)
      await revealTrade(trade.id, sellerUser.token)
      setActiveTrade(trade)
      setLockTxHash(lock_tx_hash)
      setTradeDetailId(trade.id)
      window.history.pushState({}, '', `/trade/${trade.id}`)
      console.log('✅ Trade ready:', trade.id, 'lock_tx_hash:', lock_tx_hash)
      setCurrentPage('trade_detail')
    } catch (e: unknown) {
      console.error('Trade flow failed', e)
      setTradeCreationError(extractApiErrorPayload(e).message)
    } finally {
      setTradeLoading(false)
      // Backend unavailable — go straight to chat (UI-only demo)
      setCurrentPage("chat");
      return;
    }
    setTradeLoading(true);
    try {
      const trade = await createTrade(
        sellerUser.id,
        activeAmount,
        buyerUser.token,
      );
      const { lock_tx_hash } = await lockTrade(trade.id, sellerUser.token);
      await revealTrade(trade.id, sellerUser.token);
      setActiveTrade(trade);
      setLockTxHash(lock_tx_hash);
      console.log("✅ Trade ready:", trade.id, "lock_tx_hash:", lock_tx_hash);
    } catch (e) {
      console.error("Trade flow failed, continuing as demo", e);
    } finally {
      setTradeLoading(false);
      setCurrentPage("chat");
    }
  };

  const handleDepositOfferSelected = async (_offerId: string) => {
    if (!buyerUser || !sellerUser) {
      setCurrentPage("chat_deposit");
      return;
    }
    setTradeLoading(true)
    setTradeCreationError(null)
    try {
      const trade = await createTrade(sellerUser.id, activeAmount, buyerUser.token)
      const { lock_tx_hash } = await lockTrade(trade.id, sellerUser.token)
      await revealTrade(trade.id, sellerUser.token)
      setActiveTrade(trade)
      setLockTxHash(lock_tx_hash)
      setTradeDetailId(trade.id)
      window.history.pushState({}, '', `/trade/${trade.id}`)
      console.log('✅ Deposit trade ready:', trade.id, 'lock_tx_hash:', lock_tx_hash)
      setCurrentPage('trade_detail')
    } catch (e: unknown) {
      console.error('Deposit trade flow failed', e)
      setTradeCreationError(extractApiErrorPayload(e).message)
    } finally {
      setTradeLoading(false)
    setTradeLoading(true);
    try {
      const trade = await createTrade(
        sellerUser.id,
        activeAmount,
        buyerUser.token,
      );
      const { lock_tx_hash } = await lockTrade(trade.id, sellerUser.token);
      await revealTrade(trade.id, sellerUser.token);
      setActiveTrade(trade);
      setLockTxHash(lock_tx_hash);
      console.log(
        "✅ Deposit trade ready:",
        trade.id,
        "lock_tx_hash:",
        lock_tx_hash,
      );
    } catch (e) {
      console.error("Deposit trade flow failed, continuing as demo", e);
    } finally {
      setTradeLoading(false);
      setCurrentPage("chat_deposit");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F4FAFF]">
      {currentPage === "home" && (
        <Home
          onNavigateCashout={startCashout}
          onNavigateDeposit={startDeposit}
          token={buyerUser?.token ?? null}
        />
      )}

      {currentPage === 'cashout' && (
        <CashoutRequest
          amountStr={cashoutDraft}
          onAmountStrChange={setCashoutDraft}
          onBack={() => setCurrentPage('home')}
          onContinueToConfirmation={(amount) => {
            setActiveAmount(amount)
            setTradeCreationError(null)
            setCurrentPage('cashout_confirm')
          }}
        />
      )}

      {currentPage === 'cashout_confirm' && (
        <TradeConfirmation
          flow="cashout"
          amountMxn={activeAmount}
          merchantDisplayName={sellerUser ? `@${sellerUser.username}` : 'Agente verificado (mapa)'}
          exchangeRateLabel="1 USDC ≈ 17.50 MXN (referencial — confirma en el mapa)"
          onBack={() => setCurrentPage('cashout')}
          onConfirm={() => {
            setTradeCreationError(null)
            setCurrentPage('map')
          }}
        />
      )}

      {currentPage === 'deposit' && (
        <DepositRequest
          amountStr={depositDraft}
          onAmountStrChange={setDepositDraft}
          onBack={() => setCurrentPage('home')}
          onContinueToConfirmation={(amount) => {
            setActiveAmount(amount)
            setTradeCreationError(null)
            setCurrentPage('deposit_confirm')
          }}
        />
      )}

      {currentPage === 'deposit_confirm' && (
        <TradeConfirmation
          flow="deposit"
          amountMxn={activeAmount}
          merchantDisplayName={sellerUser ? `@${sellerUser.username}` : 'Agente verificado (mapa)'}
          exchangeRateLabel="1 USDC ≈ 17.50 MXN (referencial — confirma en el mapa)"
          onBack={() => setCurrentPage('deposit')}
          onConfirm={() => {
            setTradeCreationError(null)
            setCurrentPage('map_deposit')
      {/* Cashout Flow */}
      {currentPage === "cashout" && (
        <CashoutRequest
          onBack={() => setCurrentPage("home")}
          onSearch={(amount) => {
            setActiveAmount(amount);
            setCurrentPage("map");
          }}
        />
      )}

      {/* Deposit Flow */}
      {currentPage === "deposit" && (
        <DepositRequest
          onBack={() => setCurrentPage("home")}
          onSearch={(amount) => {
            setActiveAmount(Number(amount) || 500);
            setCurrentPage("map_deposit");
          }}
        />
      )}

      {currentPage === "map_deposit" && (
        <DepositMap
          amount={activeAmount}
          creationError={tradeCreationError}
          onDismissCreationError={() => setTradeCreationError(null)}
          onBack={() => {
            setTradeCreationError(null)
            setCurrentPage('deposit_confirm')
          }}
          onBack={() => setCurrentPage("deposit")}
          onSelectOffer={handleDepositOfferSelected}
          loading={tradeLoading}
        />
      )}

      {currentPage === "map" && (
        <ExploreMap
          amount={activeAmount}
          creationError={tradeCreationError}
          onDismissCreationError={() => setTradeCreationError(null)}
          loading={tradeLoading}
          onBack={() => {
            setTradeCreationError(null)
            setCurrentPage('cashout_confirm')
          }}
          onBack={() => setCurrentPage("cashout")}
          onSelectOffer={handleOfferSelected}
        />
      )}

      {currentPage === 'trade_detail' && tradeDetailId && (
        <TradeDetail
          tradeId={tradeDetailId}
          buyerToken={buyerUser?.token ?? null}
          flow={flow === 'deposit' ? 'deposit' : 'cashout'}
          onOpenQR={() => setCurrentPage(flow === 'deposit' ? 'qr_deposit' : 'qr_reveal')}
          onOpenChat={() => setCurrentPage(flow === 'deposit' ? 'chat_deposit' : 'chat')}
          onTradeLoaded={syncTradeFromDetail}
          onBackToMap={() => {
            window.history.replaceState({}, '', '/')
            setCurrentPage(flow === 'deposit' ? 'map_deposit' : 'map')
          }}
          onCancelRematch={(amountMxn) => {
            setActiveTrade(null)
            setLockTxHash(null)
            setTradeDetailId(null)
            setActiveAmount(amountMxn)
            window.history.replaceState({}, '', '/')
            setCurrentPage(flow === 'deposit' ? 'map_deposit' : 'map')
          }}
          onGeneralCancelComplete={(outcome: GeneralCancelOutcome) => {
            setCancelledScreen(outcome)
            setActiveTrade(null)
            setLockTxHash(null)
            setTradeDetailId(null)
            window.history.replaceState({}, '', '/')
            setCurrentPage('trade_cancelled')
          }}
        />
      )}

      {currentPage === 'trade_cancelled' && cancelledScreen && (
        <TradeCancelled
          tradeId={cancelledScreen.tradeId}
          amountMxn={cancelledScreen.amountMxn}
          refundExpected={cancelledScreen.refundExpected}
          lockTxHash={cancelledScreen.lockTxHash}
          onContinue={() => {
            setCancelledScreen(null)
            setCurrentPage('home')
          }}
        />
      )}

      {currentPage === 'chat' && (
        <ChatRoom
          lockTxHash={lockTxHash}
          onBack={() => setCurrentPage(tradeDetailId ? 'trade_detail' : 'map')}
      {currentPage === "chat" && (
        <ChatRoom
          lockTxHash={lockTxHash}
          onBack={() => setCurrentPage("map")}
          onViewQR={() => {
            setCurrentPage("qr_reveal");
          }}
        />
      )}

      {currentPage === "chat_deposit" && (
        <DepositChat
          lockTxHash={lockTxHash}
          onBack={() => setCurrentPage(tradeDetailId ? 'trade_detail' : 'map_deposit')}
          onBack={() => setCurrentPage("map_deposit")}
          onViewQR={() => {
            setCurrentPage("qr_deposit");
          }}
        />
      )}

      {currentPage === "qr_reveal" && (
        <QRReveal
          activeTrade={activeTrade}
          sellerToken={sellerUser?.token ?? null}
          buyerToken={buyerUser?.token ?? null}
          amount={activeAmount}
          onBack={() => setCurrentPage(tradeDetailId ? 'trade_detail' : 'chat')}
          onChat={() => setCurrentPage('chat')}
          onBack={() => setCurrentPage("chat")}
          onChat={() => setCurrentPage("chat")}
          onSuccess={() => {
            setCurrentPage("success");
          }}
        />
      )}

      {currentPage === "qr_deposit" && (
        <DepositQR
          onBack={() => setCurrentPage(tradeDetailId ? 'trade_detail' : 'chat_deposit')}
          onChat={() => setCurrentPage('chat_deposit')}
          onBack={() => setCurrentPage("chat_deposit")}
          onChat={() => setCurrentPage("chat_deposit")}
          onSuccess={() => {
            setCurrentPage("success");
          }}
        />
      )}

      {currentPage === "success" && (
        <SuccessScreen
          type={flow === "cashout" ? "cashout" : "deposit"}
          amount={activeAmount.toFixed(2)}
          commission={
            flow === "cashout"
              ? (activeAmount * 0.01).toFixed(2)
              : (activeAmount * 0.008).toFixed(2)
          }
          received={
            flow === "cashout"
              ? `$${(activeAmount * 0.99).toFixed(2)} MXN`
              : `${(activeAmount * 0.992).toFixed(0)} MXN`
          }
          agentName={
            flow === "cashout" ? "Farmacia Guadalupe" : "Tienda Don Pepe"
          }
          tradeId={activeTrade?.id}
          lockTxHash={lockTxHash}
          onHome={() => {
            setFlow(null)
            setActiveTrade(null)
            setLockTxHash(null)
            setTradeDetailId(null)
            window.history.replaceState({}, '', '/')
            setCurrentPage('home')
            setFlow(null);
            setActiveTrade(null);
            setLockTxHash(null);
            setCurrentPage("home");
          }}
        />
      )}

      {currentPage === "explore" && (
        <Explore
          onBack={() => setCurrentPage("home")}
          onNavigate={handleNavigate}
        />
      )}

      {currentPage === "cetes" && (
        <CETESScreen
          onBack={() => setCurrentPage("explore")}
          onBanco={() => setCurrentPage("deposit")}
          userToken={buyerUser?.token}
        />
      )}

      {currentPage === "blend" && (
        <BlendScreen
          onBack={() => setCurrentPage("explore")}
          userToken={buyerUser?.token}
        />
      )}

      {!['chat', 'chat_deposit', 'qr_reveal', 'qr_deposit', 'success', 'cetes', 'blend', 'trade_detail', 'trade_cancelled', 'cashout_confirm', 'deposit_confirm'].includes(currentPage) && (
      {currentPage === "profile" && (
        <Profile
          token={buyerUser?.token ?? null}
          onBack={() => setCurrentPage("home")}
          onDeleted={handleAccountDeleted}
        />
      )}

      {![
        "chat",
        "chat_deposit",
        "qr_reveal",
        "qr_deposit",
        "success",
        "cetes",
        "blend",
      ].includes(currentPage) && (
        <BottomNav currentPage={currentPage} onNavigate={handleNavigate} />
      )}
    </div>
  );
}

export default App;
