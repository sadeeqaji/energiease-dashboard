import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Search,
  RefreshCw,
  Send,
  CheckCircle2,
  Clock,
  User,
  Zap,
  Copy,
  Check,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  RotateCw,
  Phone,
  Hash,
  Bell,
  BellOff,
  Activity,
  Volume2,
} from 'lucide-react';
import { SupportTicket, SupportTicketDetails, AdminUser, OrderItem } from '../types';
import { api } from '../api';
import { StatusBadge } from '../components/StatusBadge';

interface Props {
  currentUser?: AdminUser | null;
  onSelectOrder?: (order: OrderItem) => void;
}

interface JourneyEvent {
  id: string;
  type: 'order_start' | 'vend_ok' | 'vend_failed' | 'chat_start' | 'nudge' | 'resolved';
  title: string;
  description: string;
  timestamp: string;
  badge?: string;
  badgeColor?: string;
}

const formatRelativeTime = (dateStr?: string) => {
  if (!dateStr) return '';
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
};

const getCustomerJourney = (details: SupportTicketDetails): JourneyEvent[] => {
  const events: JourneyEvent[] = [];
  const { ticket, customerContext } = details;
  const recentOrders = customerContext?.recentOrders || [];

  recentOrders.slice(0, 3).forEach((ord) => {
    events.push({
      id: `ord-init-${ord.reference}`,
      type: 'order_start',
      title: `Order #${ord.reference.slice(-6)} Initiated`,
      description: `₦${ord.amount?.toLocaleString()} • ${ord.disco || 'DISCO'}${ord.meterNumber ? ` • Meter: ${ord.meterNumber}` : ''}`,
      timestamp: ord.createdAt,
      badge: 'Order',
      badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    });

    if (ord.status === 'success') {
      events.push({
        id: `ord-vend-ok-${ord.reference}`,
        type: 'vend_ok',
        title: 'Payment & Token Delivered',
        description: ord.token ? `Token: ${ord.token.slice(0, 9)}... (${ord.units ? `${ord.units} kWh` : 'Delivered'})` : 'Units vended successfully',
        timestamp: ord.updatedAt || ord.createdAt,
        badge: 'Success',
        badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      });
    } else if (ord.status === 'failed' || ord.requiresManualIntervention) {
      events.push({
        id: `ord-vend-fail-${ord.reference}`,
        type: 'vend_failed',
        title: 'Vending Delay / Intervention',
        description: ord.failureReason || ord.fulfillmentFailureReason || 'Provider vending timeout / manual retry needed',
        timestamp: ord.updatedAt || ord.createdAt,
        badge: 'Alert',
        badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      });
    }
  });

  if (ticket.createdAt) {
    const firstCustMsg = ticket.messages?.find((m) => m.sender === 'customer');
    events.push({
      id: `ticket-start-${ticket.ticketId}`,
      type: 'chat_start',
      title: 'WhatsApp Support Opened',
      description: firstCustMsg ? `"${firstCustMsg.text.slice(0, 45)}${firstCustMsg.text.length > 45 ? '...' : ''}"` : 'Customer initiated live support chat',
      timestamp: ticket.createdAt,
      badge: 'WhatsApp',
      badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    });
  }

  if (ticket.inactivityWarningSentAt) {
    events.push({
      id: `ticket-nudge-${ticket.ticketId}`,
      type: 'nudge',
      title: '10m Inactivity Nudge Sent',
      description: 'Customer sent check-in notification',
      timestamp: ticket.inactivityWarningSentAt,
      badge: '10m Nudge',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    });
  }

  if (ticket.status === 'resolved') {
    events.push({
      id: `ticket-resolve-${ticket.ticketId}`,
      type: 'resolved',
      title: 'Ticket Closed',
      description: `Closed via ${
        ticket.resolutionReason === 'inactivity_timeout'
          ? '15m Inactivity'
          : ticket.resolutionReason === 'customer_exit'
          ? 'Customer Exit'
          : 'Support Agent'
      }`,
      timestamp: ticket.updatedAt || ticket.lastMessageAt,
      badge: 'Closed',
      badgeColor: 'bg-zinc-800 text-zinc-400 border-zinc-700/60',
    });
  }

  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const SupportDeskView: React.FC<Props> = ({ currentUser, onSelectOrder }) => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [counts, setCounts] = useState({
    open: 0,
    pending_agent: 0,
    pending_customer: 0,
    resolved: 0,
    totalActive: 0,
  });
  const [activeFilter, setActiveFilter] = useState<'active' | 'pending_agent' | 'resolved' | 'all'>('active');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [ticketDetails, setTicketDetails] = useState<SupportTicketDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Reply state
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedMeter, setCopiedMeter] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Phone search state for customer support diagnostics
  const [orderSearchPhone, setOrderSearchPhone] = useState('');
  const [customOrders, setCustomOrders] = useState<OrderItem[] | null>(null);
  const [searchingOrders, setSearchingOrders] = useState(false);

  // Audio chime & desktop browser notification states
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('ee_support_sound') !== 'false';
  });
  const [notificationsAllowed, setNotificationsAllowed] = useState(() => {
    return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
  });

  const lastKnownPendingAgentCountRef = useRef<number | null>(null);
  const latestSeenCustomerMessageTimeRef = useRef<number>(Date.now() - 30000);
  const sharedAudioCtxRef = useRef<AudioContext | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom without scrolling parent page containers
  const scrollToBottom = (smooth = true) => {
    if (chatScrollContainerRef.current) {
      chatScrollContainerRef.current.scrollTo({
        top: chatScrollContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
    } else if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'nearest' });
    }
  };

  // Helper to get or unlock active AudioContext
  const getAudioContext = async (): Promise<AudioContext | null> => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return null;
      if (!sharedAudioCtxRef.current || sharedAudioCtxRef.current.state === 'closed') {
        sharedAudioCtxRef.current = new AudioCtx();
      }
      if (sharedAudioCtxRef.current.state === 'suspended') {
        await sharedAudioCtxRef.current.resume();
      }
      return sharedAudioCtxRef.current;
    } catch (e) {
      console.warn('Could not initialize AudioContext:', e);
      return null;
    }
  };

  // Unlock AudioContext on initial user gesture anywhere on screen
  useEffect(() => {
    const unlock = () => {
      getAudioContext().catch(() => {});
    };
    window.addEventListener('click', unlock, { once: false });
    window.addEventListener('keydown', unlock, { once: false });
    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  // Synthesized Web Audio dual-tone notification chime (crisp, audible, professional)
  const playNotificationSound = async (force = false) => {
    if (!force && !soundEnabled) return;
    try {
      const ctx = await getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Note 1: 659.25 Hz (E5) - Crisp alert attack
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.22);

      // Note 2: 987.77 Hz (B5) - Melodic harmonic resolution
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(987.77, now + 0.12);
      gain2.gain.setValueAtTime(0.35, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.45);
    } catch (e) {
      console.warn('Audio chime playback error:', e);
    }
  };

  const triggerDesktopNotification = (title: string, body: string, ticketId?: string) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          body,
          icon: '/favicon.ico',
        });
        notif.onclick = () => {
          window.focus();
          if (ticketId) {
            setSelectedTicketId(ticketId);
          }
        };
      } catch {}
    }
  };

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('ee_support_sound', String(next));
      if (next) {
        setTimeout(() => playNotificationSound(true), 50);
      }
      return next;
    });
  };

  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await Notification.requestPermission();
      setNotificationsAllowed(perm === 'granted');
      if (perm === 'granted') {
        triggerDesktopNotification('Notifications Enabled', 'You will receive alerts for new incoming WhatsApp inquiries.');
      }
    }
  };

  const fetchTickets = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await api.getSupportTickets({
        status: activeFilter,
        search: search.trim() || undefined,
        limit: 50,
      });
      setTickets(res.tickets || []);
      setCounts(res.counts || { open: 0, pending_agent: 0, pending_customer: 0, resolved: 0, totalActive: 0 });

      // Audio & Desktop Notification alert if new customer inquiries arrive
      if (res.counts) {
        const currentPending = res.counts.pending_agent || 0;
        const prevPending = lastKnownPendingAgentCountRef.current;

        // Check 1: Has pending count increased? (e.g. from 0 to 1, or 1 to 2)
        const countIncreased = prevPending !== null && currentPending > prevPending;

        // Check 2: Has any ticket in pending_agent received a new customer message?
        let hasNewCustomerMessage = false;
        if (res.tickets && res.tickets.length > 0) {
          for (const t of res.tickets) {
            if (t.status === 'pending_agent' && t.lastMessageAt) {
              const msgTime = new Date(t.lastMessageAt).getTime();
              if (msgTime > latestSeenCustomerMessageTimeRef.current) {
                hasNewCustomerMessage = true;
                latestSeenCustomerMessageTimeRef.current = msgTime;
              }
            }
          }
        }

        if (countIncreased || hasNewCustomerMessage) {
          playNotificationSound();
          triggerDesktopNotification(
            'EnergiEase Support Alert',
            `${currentPending} customer(s) waiting for response`
          );
        }

        lastKnownPendingAgentCountRef.current = currentPending;
      }

      // If currently selected ticket is not set and we have tickets, select first
      if (!selectedTicketId && res.tickets && res.tickets.length > 0) {
        setSelectedTicketId(res.tickets[0].ticketId);
      }
    } catch (err) {
      console.error('Failed to load support tickets:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const loadTicketDetails = async (ticketId: string, silent = false) => {
    if (!silent) setDetailsLoading(true);
    try {
      const res = await api.getSupportTicketDetails(ticketId);
      setTicketDetails((prev) => {
        const prevCount = prev?.ticket?.messages?.length || 0;
        const newCount = res.ticket?.messages?.length || 0;
        // Check if customer sent a new message
        if (newCount > prevCount && prevCount > 0) {
          const lastMsg = res.ticket.messages[newCount - 1];
          if (lastMsg && lastMsg.sender === 'customer') {
            playNotificationSound();
            triggerDesktopNotification(
              `WhatsApp: ${res.ticket.customerName || res.ticket.customerPhone}`,
              lastMsg.text,
              res.ticket.ticketId
            );
          }
        }
        return res;
      });
    } catch (err) {
      console.error('Failed to load ticket details:', err);
    } finally {
      if (!silent) setDetailsLoading(false);
    }
  };

  // Initial load and filter changes
  useEffect(() => {
    fetchTickets();
  }, [activeFilter]);

  // When selected ticket changes, load details immediately
  useEffect(() => {
    if (selectedTicketId) {
      loadTicketDetails(selectedTicketId, false);
    } else {
      setTicketDetails(null);
    }
  }, [selectedTicketId]);

  // Live polling for the active ticket conversation (every 2.5s)
  useEffect(() => {
    if (!selectedTicketId) return;

    const chatInterval = setInterval(() => {
      loadTicketDetails(selectedTicketId, true);
    }, 2500);

    return () => clearInterval(chatInterval);
  }, [selectedTicketId]);

  // Periodic polling for ticket queue list & status badges (every 6s)
  useEffect(() => {
    const listInterval = setInterval(() => {
      fetchTickets(false);
    }, 6000);

    return () => clearInterval(listInterval);
  }, [activeFilter, search, selectedTicketId]);

  // Auto-scroll chat whenever new messages arrive
  const messagesCount = ticketDetails?.ticket?.messages?.length || 0;
  useEffect(() => {
    if (messagesCount > 0) {
      scrollToBottom(true);
    }
  }, [messagesCount]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTickets();
  };

  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedTicketId || !replyText.trim() || sendingReply) return;

    const textToSend = replyText.trim();
    setSendingReply(true);

    // Optimistic UI: append the message immediately so agent sees 0 latency
    const agentName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}`.trim() : 'Support Agent';
    setTicketDetails((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        ticket: {
          ...prev.ticket,
          status: 'pending_customer',
          messages: [
            ...prev.ticket.messages,
            {
              sender: 'agent',
              senderName: agentName,
              text: textToSend,
              timestamp: new Date().toISOString(),
            },
          ],
        },
      };
    });
    setReplyText('');
    setTimeout(() => scrollToBottom(true), 50);

    try {
      await api.replySupportTicket(selectedTicketId, textToSend);
      await loadTicketDetails(selectedTicketId, true);
      await fetchTickets(false);
      setTimeout(() => scrollToBottom(true), 50);
    } catch (err: any) {
      alert(`Failed to send reply: ${err.message || 'Error'}`);
      await loadTicketDetails(selectedTicketId, true);
    } finally {
      setSendingReply(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedTicketId || resolving) return;
    if (!confirm('Resolve this support ticket? The customer will receive a closing WhatsApp message.')) return;

    setResolving(true);
    try {
      await api.resolveSupportTicket(selectedTicketId);
      await loadTicketDetails(selectedTicketId);
      await fetchTickets(false);
      setActionSuccess('Ticket marked as resolved and customer notified on WhatsApp.');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(`Failed to resolve: ${err.message}`);
    } finally {
      setResolving(false);
    }
  };

  const handleRetryVend = async (orderRef: string) => {
    try {
      const res = await api.retryVend(orderRef);
      setActionSuccess(`Vend Retry Result: ${res.message}`);
      if (selectedTicketId) loadTicketDetails(selectedTicketId);
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      alert(`Retry failed: ${err.message}`);
    }
  };

  const handleResendWhatsApp = async (orderRef: string) => {
    try {
      await api.resendToken(orderRef);
      setActionSuccess('Token successfully re-sent to customer via WhatsApp.');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(`Failed to resend: ${err.message}`);
    }
  };

  const copyToClipboard = (text: string, type: 'meter' | 'token') => {
    navigator.clipboard.writeText(text);
    if (type === 'meter') {
      setCopiedMeter(true);
      setTimeout(() => setCopiedMeter(false), 2000);
    } else {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  // Synchronize phone search input whenever the selected ticket changes
  useEffect(() => {
    if (ticketDetails?.customerContext?.phone) {
      setOrderSearchPhone(ticketDetails.customerContext.phone);
      setCustomOrders(null);
    }
  }, [ticketDetails?.ticket?.ticketId]);

  const handleSearchOrdersByPhone = async (e?: React.FormEvent, overridePhone?: string) => {
    if (e) e.preventDefault();
    const phoneToSearch = (overridePhone !== undefined ? overridePhone : orderSearchPhone).trim();
    if (!phoneToSearch && !ticketDetails?.customerContext?.meterNo) return;

    setSearchingOrders(true);
    try {
      const orders = await api.fetchOrdersByPhone({
        phone: phoneToSearch,
        meterNo: !phoneToSearch ? ticketDetails?.customerContext?.meterNo : undefined,
        limit: 15,
      });
      setCustomOrders(orders);
    } catch (err: any) {
      alert(`Failed to fetch orders: ${err.message || 'Error'}`);
    } finally {
      setSearchingOrders(false);
    }
  };

  const handleResetOrderSearch = () => {
    if (ticketDetails?.customerContext?.phone) {
      setOrderSearchPhone(ticketDetails.customerContext.phone);
    }
    setCustomOrders(null);
  };

  const quickSnippets = [
    { label: '👋 Greeting', text: 'Hello! Thank you for contacting EnergiEase. How may we assist you today?' },
    { label: '⚡ Checking DISCO', text: 'We are checking your transaction directly with the DISCO vending servers now. Please give us 1-2 minutes.' },
    { label: '🎫 Token Resent', text: 'Your token has been regenerated and re-sent to your WhatsApp. Please verify entering it into your meter.' },
    { label: '🔢 Verify Meter #', text: 'Could you please confirm the 11-digit meter number and DISCO provider?' },
  ];

  return (
    <div className="h-full flex flex-col min-h-0 space-y-3">
      {/* Top Header & Telemetry Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/40 px-4 py-3 rounded-xl border border-zinc-800/80 shrink-0">
        <div>
          <h1 className="text-base sm:text-lg font-semibold tracking-tight text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-zinc-300" />
            <span>Support Desk &amp; WhatsApp Live Chat</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Live two-way WhatsApp customer care with integrated meter &amp; order diagnostics.
          </p>
        </div>

        {/* Status Counts */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-2.5 py-1 rounded-md bg-zinc-800/80 border border-zinc-700/80 text-zinc-200 text-xs font-medium flex items-center gap-1.5 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400"></span>
            <span>{counts.totalActive} Active</span>
          </div>
          <div className="px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium flex items-center gap-1.5 font-mono">
            <span>{counts.pending_agent} Needs Reply</span>
          </div>
          <div className="px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-1.5 font-mono">
            <span>{counts.resolved} Resolved</span>
          </div>
          <button
            onClick={() => fetchTickets()}
            disabled={loading}
            className="p-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors border border-zinc-700/60 cursor-pointer"
            title="Refresh Tickets"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Sound Notification Toggle */}
          <button
            onClick={toggleSound}
            className={`px-2.5 py-1 rounded-md border transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer ${
              soundEnabled
                ? 'bg-zinc-800 border-zinc-700 text-emerald-400 hover:bg-zinc-700'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-400'
            }`}
            title={soundEnabled ? 'Chime sound alerts enabled (Click to mute)' : 'Sound alerts muted (Click to enable)'}
          >
            {soundEnabled ? <Bell className="w-3.5 h-3.5 text-emerald-400" /> : <BellOff className="w-3.5 h-3.5 text-zinc-500" />}
            <span className="hidden sm:inline">{soundEnabled ? 'Chime ON' : 'Muted'}</span>
          </button>

          {/* Test Sound Button */}
          <button
            onClick={() => {
              if (!soundEnabled) {
                setSoundEnabled(true);
                localStorage.setItem('ee_support_sound', 'true');
              }
              playNotificationSound(true);
            }}
            className="px-2.5 py-1 rounded-md border border-zinc-700/80 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer shadow-xs"
            title="Test notification chime sound"
          >
            <Volume2 className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">Test Sound</span>
          </button>

          {/* Desktop Push Notification Request (if not already granted) */}
          {!notificationsAllowed && typeof window !== 'undefined' && 'Notification' in window && (
            <button
              onClick={requestNotificationPermission}
              className="px-2.5 py-1 rounded-md bg-zinc-800/80 border border-zinc-700/80 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              title="Enable desktop notifications for incoming messages"
            >
              <Bell className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden md:inline">Browser Alerts</span>
            </button>
          )}
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium flex items-center gap-2 animate-fadeIn shrink-0">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Main 3-Column Support Workspace */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        
        {/* COLUMN 1: Queue / Ticket List (4 cols) */}
        <div className="lg:col-span-4 bg-zinc-900/40 border border-zinc-800/80 rounded-xl flex flex-col h-full min-h-0 overflow-hidden">
          {/* Search & Tabs */}
          <div className="p-3.5 border-b border-zinc-800/80 space-y-2.5">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search ticket, phone, meter..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
              />
            </form>

            <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg text-xs font-medium text-zinc-400 border border-zinc-800">
              <button
                onClick={() => setActiveFilter('active')}
                className={`flex-1 py-1 rounded-md transition-all cursor-pointer ${
                  activeFilter === 'active'
                    ? 'bg-zinc-800 text-white shadow-xs font-medium'
                    : 'hover:text-white'
                }`}
              >
                Active ({counts.totalActive})
              </button>
              <button
                onClick={() => setActiveFilter('pending_agent')}
                className={`flex-1 py-1 rounded-md transition-all cursor-pointer ${
                  activeFilter === 'pending_agent'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium'
                    : 'hover:text-white'
                }`}
              >
                Urgent ({counts.pending_agent})
              </button>
              <button
                onClick={() => setActiveFilter('resolved')}
                className={`flex-1 py-1 rounded-md transition-all cursor-pointer ${
                  activeFilter === 'resolved'
                    ? 'bg-zinc-800 text-zinc-300 font-medium'
                    : 'hover:text-white'
                }`}
              >
                Closed ({counts.resolved})
              </button>
            </div>
          </div>

          {/* Ticket List Items */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/60 custom-scrollbar">
            {loading && tickets.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs flex flex-col items-center gap-2">
                <RotateCw className="w-5 h-5 animate-spin text-zinc-400" />
                <span>Loading tickets...</span>
              </div>
            ) : tickets.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs">
                <CheckCircle2 className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="font-semibold text-zinc-400">No tickets found</p>
                <p className="mt-1">All customer WhatsApp inquiries in this view are clear.</p>
              </div>
            ) : (
              tickets.map((t) => {
                const isSelected = selectedTicketId === t.ticketId;
                const lastMsg = t.messages[t.messages.length - 1];
                const isNeedsReply = t.status === 'pending_agent';
                const isClosed = t.status === 'resolved';

                return (
                  <div
                    key={t.ticketId}
                    onClick={() => setSelectedTicketId(t.ticketId)}
                    className={`p-4 cursor-pointer transition-colors text-left relative ${
                      isSelected
                        ? 'bg-zinc-800/70 border-l-2 border-l-zinc-200'
                        : 'hover:bg-zinc-900/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-mono text-[11px] font-medium text-zinc-400">
                        #{t.ticketId}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono tabular-nums">
                        {new Date(t.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-xs font-semibold text-zinc-100 truncate">
                        {t.customerName || t.customerPhone}
                      </p>
                      {isNeedsReply && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          Reply Needed
                        </span>
                      )}
                      {t.status === 'pending_customer' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700/60 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5 text-zinc-400" />
                          <span>Waiting (15m)</span>
                        </span>
                      )}
                      {isClosed && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">
                          {t.resolutionReason === 'inactivity_timeout' ? 'Auto-Closed' : 'Resolved'}
                        </span>
                      )}
                    </div>

                    {t.meterNo && (
                      <p className="text-[11px] text-zinc-400 mb-1 flex items-center gap-1 font-mono">
                        <Zap className="w-3 h-3 text-amber-400" />
                        <span>{t.meterNo}</span>
                        {t.disco && <span className="text-zinc-500">({t.disco})</span>}
                      </p>
                    )}

                    <p className="text-xs text-zinc-400 line-clamp-1 italic">
                      {lastMsg ? lastMsg.text : 'No messages'}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLUMN 2: Center Live Chat Thread (5 cols) */}
        <div className="lg:col-span-5 bg-zinc-900/40 border border-zinc-800/80 rounded-xl flex flex-col h-full min-h-0 overflow-hidden">
          {ticketDetails ? (
            <>
              {/* Active Conversation Header */}
              <div className="px-3.5 py-2.5 border-b border-zinc-800/80 flex items-center justify-between gap-3 bg-zinc-900/70 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-300 font-mono font-bold text-xs shrink-0">
                    WA
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xs sm:text-sm font-semibold text-zinc-100 truncate">
                      {ticketDetails.ticket.customerName || 'Customer'}
                    </h2>
                    <p className="text-[11px] text-zinc-400 font-mono flex items-center gap-1.5 truncate">
                      <span>{ticketDetails.ticket.customerPhone}</span>
                      <span className="text-zinc-600">•</span>
                      <span className="text-zinc-400">#{ticketDetails.ticket.ticketId}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => loadTicketDetails(ticketDetails.ticket.ticketId)}
                    disabled={detailsLoading}
                    title="Refresh Chat (Live Sync Active)"
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border border-zinc-700/60 transition-colors relative"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${detailsLoading ? 'animate-spin text-zinc-300' : ''}`} />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 absolute top-1 right-1" />
                  </button>

                  {ticketDetails.ticket.status !== 'resolved' ? (
                    <button
                      onClick={handleResolve}
                      disabled={resolving}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-all flex items-center gap-1.5 shadow-xs shrink-0"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{resolving ? 'Resolving...' : 'Resolve'}</span>
                    </button>
                  ) : (
                    <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium ${
                      ticketDetails.ticket.resolutionReason === 'inactivity_timeout'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : ticketDetails.ticket.resolutionReason === 'customer_exit'
                        ? 'bg-zinc-800 text-zinc-300 border border-zinc-700/60'
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700/60'
                    }`}>
                      Closed
                    </span>
                  )}
                </div>
              </div>

              {/* Chat Thread Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {ticketDetails.ticket.messages.map((m, idx) => {
                  const isCustomer = m.sender === 'customer';
                  const isSystem = m.sender === 'system';

                  if (isSystem) {
                    return (
                      <div key={idx} className="text-center my-2">
                        <span className="px-3 py-1 rounded-full bg-zinc-800/80 text-zinc-400 text-[11px] font-mono border border-zinc-700/50">
                          {m.text}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={idx}
                      className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'}`}
                    >
                      <span className="text-[10px] text-zinc-500 mb-1 px-1 font-mono">
                        {isCustomer ? 'Customer' : m.senderName || 'Support Agent'} •{' '}
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed ${
                          isCustomer
                            ? 'bg-zinc-900 text-zinc-100 rounded-tl-sm border border-zinc-800'
                            : 'bg-zinc-100 text-zinc-950 rounded-tr-sm shadow-xs font-normal'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.text}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Composer & Quick Replies Footer */}
              <div className="bg-zinc-950 border-t border-zinc-800/80 p-3 space-y-2.5">
                {/* Quick Response Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none">
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider shrink-0 mr-1">
                    Quick:
                  </span>
                  {quickSnippets.map((snip, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setReplyText(snip.text)}
                      title={snip.text}
                      className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-[11px] font-medium text-zinc-300 hover:text-white whitespace-nowrap border border-zinc-800 hover:border-zinc-700 transition-all flex items-center gap-1 shrink-0 active:scale-[0.98]"
                    >
                      <span>{snip.label}</span>
                    </button>
                  ))}
                </div>

                {/* Reply Input Form */}
                <form onSubmit={handleSendReply} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Type your WhatsApp reply (customer receives instantly)..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    disabled={sendingReply}
                    className="flex-1 bg-zinc-900/90 border border-zinc-800 focus:border-zinc-600 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={sendingReply || !replyText.trim()}
                    className={`px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all flex items-center gap-1.5 shrink-0 ${
                      sendingReply || !replyText.trim()
                        ? 'bg-zinc-900 border border-zinc-800 text-zinc-600 cursor-not-allowed'
                        : 'bg-zinc-100 hover:bg-white text-zinc-950 font-semibold shadow-xs active:scale-[0.98]'
                    }`}
                  >
                    <Send className={`w-4 h-4 ${sendingReply || !replyText.trim() ? 'text-zinc-600' : 'text-zinc-950'}`} />
                    <span>{sendingReply ? 'Sending...' : 'Send'}</span>
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500">
              <MessageSquare className="w-12 h-12 text-zinc-700 mb-3" />
              <p className="text-base font-bold text-zinc-300">No Conversation Selected</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                Choose a customer WhatsApp inquiry from the left queue to review chat history and reply.
              </p>
            </div>
          )}
        </div>

        {/* COLUMN 3: Right Fintech Diagnostics Panel (3 cols) */}
        <div className="lg:col-span-3 bg-zinc-900/40 border border-zinc-800/80 rounded-xl flex flex-col h-full min-h-0 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {ticketDetails ? (
            <>
              {/* Customer Diagnostics */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Customer Profile</span>
                </h3>
                <div className="bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800/80 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Phone:</span>
                    <span className="font-mono text-zinc-100 font-medium">{ticketDetails.customerContext.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Name:</span>
                    <span className="text-zinc-100 font-medium">{ticketDetails.customerContext.name || 'Not provided'}</span>
                  </div>
                </div>
              </div>

              {/* Meter Info Card */}
              {ticketDetails.customerContext.meterNo && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Active Meter</span>
                  </h3>
                  <div className="bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800/80 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Meter Number:</span>
                      <button
                        onClick={() => copyToClipboard(ticketDetails.customerContext.meterNo!, 'meter')}
                        className="font-mono text-amber-400 font-medium hover:underline flex items-center gap-1"
                      >
                        <span>{ticketDetails.customerContext.meterNo}</span>
                        {copiedMeter ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-zinc-400" />}
                      </button>
                    </div>
                    {ticketDetails.customerContext.disco && (
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400">DISCO:</span>
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700/60 font-medium uppercase text-[10px]">
                          {ticketDetails.customerContext.disco}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Customer Journey Timeline */}
              {(() => {
                const journeyEvents = getCustomerJourney(ticketDetails);
                return (
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Customer Journey</span>
                      </h3>
                      <span className="text-[10px] text-zinc-500 font-mono font-medium">
                        {journeyEvents.length} {journeyEvents.length === 1 ? 'event' : 'events'}
                      </span>
                    </div>

                    {journeyEvents.length === 0 ? (
                      <div className="bg-zinc-900/40 p-3 rounded-xl border border-zinc-800/80 text-zinc-500 text-xs text-center">
                        No journey events recorded yet.
                      </div>
                    ) : (
                      <div className="bg-zinc-900/40 p-3.5 rounded-xl border border-zinc-800/80">
                        <div className="relative pl-3.5 space-y-3.5 before:absolute before:left-1 before:top-2 before:bottom-2 before:w-[2px] before:bg-zinc-800">
                          {journeyEvents.map((evt) => (
                            <div key={evt.id} className="relative text-xs">
                              {/* Timeline dot */}
                              <div
                                className={`absolute -left-[14px] top-1 w-2.5 h-2.5 rounded-full ring-2 ring-zinc-950 ${
                                  evt.type === 'vend_ok'
                                    ? 'bg-emerald-400'
                                    : evt.type === 'vend_failed'
                                    ? 'bg-rose-500'
                                    : evt.type === 'chat_start'
                                    ? 'bg-zinc-300'
                                    : evt.type === 'nudge'
                                    ? 'bg-amber-400'
                                    : evt.type === 'resolved'
                                    ? 'bg-zinc-500'
                                    : 'bg-zinc-400'
                                }`}
                              />

                              <div className="flex items-start justify-between gap-1.5">
                                <span className="font-medium text-zinc-200 leading-tight">
                                  {evt.title}
                                </span>
                                {evt.badge && (
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-medium border uppercase tracking-wider flex-shrink-0 ${
                                      evt.badgeColor || 'bg-zinc-800 text-zinc-400 border-zinc-700/60'
                                    }`}
                                  >
                                    {evt.badge}
                                  </span>
                                )}
                              </div>

                              {evt.description && (
                                <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed break-words font-mono">
                                  {evt.description}
                                </p>
                              )}

                              <div className="flex items-center gap-1 text-[10px] text-zinc-500 mt-1 font-mono tabular-nums">
                                <Clock className="w-2.5 h-2.5 flex-shrink-0" />
                                <span>{formatRelativeTime(evt.timestamp)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Recent Orders / Vends by Phone */}
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Customer Orders ({customOrders !== null ? customOrders.length : (ticketDetails.customerContext.recentOrders?.length || 0)})</span>
                  </h3>
                  {customOrders !== null && (
                    <button
                      onClick={handleResetOrderSearch}
                      className="text-[10px] text-zinc-400 hover:text-zinc-200 hover:underline flex items-center gap-1"
                    >
                      <span>Reset</span>
                    </button>
                  )}
                </div>

                {/* Search input for support agents to look up ANY phone number */}
                <form onSubmit={(e) => handleSearchOrdersByPhone(e)} className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <Phone className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="Search phone or meter #..."
                      value={orderSearchPhone}
                      onChange={(e) => setOrderSearchPhone(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-7 pr-2 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700 font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={searchingOrders || !orderSearchPhone.trim()}
                    className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 border border-zinc-700/60 font-medium text-xs transition-colors flex items-center gap-1 flex-shrink-0 shadow-xs"
                    title="Lookup Orders by Phone"
                  >
                    <Search className={`w-3.5 h-3.5 ${searchingOrders ? 'animate-spin' : ''}`} />
                    <span>Find</span>
                  </button>
                </form>

                {/* Displayed orders */}
                {(customOrders !== null ? customOrders : (ticketDetails.customerContext.recentOrders || [])).length > 0 ? (
                  <div className="space-y-3">
                    {(customOrders !== null ? customOrders : (ticketDetails.customerContext.recentOrders || [])).map((ord) => (
                      <div
                        key={ord.reference}
                        className="bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/80 text-xs space-y-2 hover:border-zinc-700 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[11px] text-zinc-400">#{ord.reference.slice(-8)}</span>
                          <StatusBadge status={ord.status} />
                        </div>
                        <div className="flex justify-between font-medium text-zinc-100 font-mono tabular-nums">
                          <span>₦{ord.amount?.toLocaleString()}</span>
                          <span className="text-zinc-400 font-normal text-[11px]">{new Date(ord.createdAt).toLocaleDateString()}</span>
                        </div>

                        {/* Meter & Disco */}
                        {(ord.meterNumber || ord.disco) && (
                          <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-zinc-800/60">
                            <span className="font-medium text-zinc-300">{ord.disco}</span>
                            <span className="font-mono text-zinc-400">{ord.meterNumber}</span>
                          </div>
                        )}

                        {/* Token display with copy button */}
                        {ord.token && (
                          <div className="p-2 rounded bg-zinc-950 border border-zinc-800/80 flex items-center justify-between font-mono text-emerald-400 font-medium text-[11px]">
                            <span className="break-all">{ord.token}</span>
                            <button
                              onClick={() => copyToClipboard(ord.token!, 'token')}
                              className="text-zinc-400 hover:text-white flex-shrink-0 ml-2"
                              title="Copy token"
                            >
                              {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        )}

                        {/* Failure reason if failed */}
                        {ord.status === 'failed' && (ord.failureReason || ord.fulfillmentFailureReason) && (
                          <p className="text-[10px] text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded p-1.5 font-mono">
                            {ord.failureReason || ord.fulfillmentFailureReason}
                          </p>
                        )}

                        {/* Fast Actions */}
                        <div className="flex items-center gap-2 pt-1 border-t border-zinc-800/60">
                          {ord.status === 'failed' || ord.requiresManualIntervention ? (
                            <button
                              onClick={() => handleRetryVend(ord.reference)}
                              className="flex-1 py-1 rounded bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-[10px] transition-colors"
                            >
                              Retry Vend
                            </button>
                          ) : null}

                          {ord.token && (
                            <button
                              onClick={() => handleResendWhatsApp(ord.reference)}
                              className="flex-1 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 font-medium text-[10px] transition-colors shadow-xs"
                            >
                              Resend Token
                            </button>
                          )}

                          {onSelectOrder && (
                            <button
                              onClick={() => onSelectOrder(ord)}
                              className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/60"
                              title="Open in Order Drawer"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 text-center text-zinc-500 text-xs">
                    <p>No orders found for this phone.</p>
                    <p className="text-[10px] text-zinc-600 mt-1">Try entering another phone number or meter number above.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-4 text-center text-xs text-zinc-500">
              Select a conversation to see customer meter and order history.
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
