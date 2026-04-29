import { useState, useEffect } from "react";
import ErrorBoundary from './components/ErrorBoundary';

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
import MerchantInbox from "./pages/MerchantInbox";
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

interface AppProps {
  /** Cold `/trade/:id` entry (issue #31) — optional deep link bootstrap. */
  initialTradeId?: string | null;
}

function App({ initialTradeId = null }: AppProps) {
  const [currentPage, setCurrentPage] = useState<'home' | string>('home');
  const [flow, setFlow] = useState<'cashout' | 'deposit' | null>(null);

  // API state
  const [buyerUser, setBuyerUser] = useState<UserData | null>(null);
  const [sellerUser, setSellerUser] = useState<UserData | null>(null);
  const [activeTrade, setActiveTrade] = useState<TradeData | null>(null);
  const [lockTxHash, setLockTxHash] = useState<string | null>(null);
  const [activeAmount, setActiveAmount] = useState(500);
  const [tradeLoading, setTradeLoading] = useState(false);

  // Estados adicionales
  const [tradeDetailId, setTradeDetailId] = useState<string | null>(null);
  const [tradeCreationError, setTradeCreationError] = useState<string | null>(null);
  const [cancelledScreen, setCancelledScreen] = useState<any>(null);
  const [cashoutDraft, setCashoutDraft] = useState('500');
  const [depositDraft, setDepositDraft] = useState('500');

  // Auto-register buyer + mock seller
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

        localStorage.setItem("micopay_users", JSON.stringify({ buyer, seller }));
        setBuyerUser(buyer);
        setSellerUser(seller);
        console.log("✅ Users registered:", buyer.username, seller.username);
      } catch (e) {
        console.warn("⚠️ Backend not available, running in UI-only mode", e);
      }
    };

    initUsers();
  }, []);

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

  const handleOfferSelected = async (offerId: string) => {
    if (!buyerUser || !sellerUser) {
      setCurrentPage("chat");
      return;
    }

    setTradeLoading(true);
    try {
      const trade = await createTrade(sellerUser.id, activeAmount, buyerUser.token);
      const { lock_tx_hash } = await lockTrade(trade.id, sellerUser.token);
      await revealTrade(trade.id, sellerUser.token);

      setActiveTrade(trade);
      setLockTxHash(lock_tx_hash);
    } catch (e) {
      console.error("Trade flow failed, continuing as demo", e);
    } finally {
      setTradeLoading(false);
      setCurrentPage("chat");
    }
  };

  const handleDepositOfferSelected = async (offerId: string) => {
    if (!buyerUser || !sellerUser) {
      setCurrentPage("chat_deposit");
      return;
    }

    setTradeLoading(true);
    try {
      const trade = await createTrade(sellerUser.id, activeAmount, buyerUser.token);
      const { lock_tx_hash } = await lockTrade(trade.id, sellerUser.token);
      await revealTrade(trade.id, sellerUser.token);

      setActiveTrade(trade);
      setLockTxHash(lock_tx_hash);
    } catch (e) {
      console.error("Deposit trade flow failed, continuing as demo", e);
    } finally {
      setTradeLoading(false);
      setCurrentPage("chat_deposit");
    }
  };

  return (
    <ErrorBoundary>
      <div className="flex flex-col min-h-screen bg-[#F4FAFF]">
        {currentPage === 'home