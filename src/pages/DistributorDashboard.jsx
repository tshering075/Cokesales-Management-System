import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  Stack,
  useMediaQuery,
  useTheme,
  Tooltip,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { DRAWER_FOREGROUND } from "../theme/drawerContrast";
import MenuIcon from "@mui/icons-material/Menu";
import NotificationsIcon from "@mui/icons-material/Notifications";
import LogoutIcon from "@mui/icons-material/Logout";
import { BarChart as BarChartIcon, CalendarMonth, Close as CloseIcon, ListAlt as ListAltIcon, Inventory as InventoryIcon, Dashboard as DashboardIcon, Warehouse as WarehouseIcon } from "@mui/icons-material";
import NuProductRateIcon from "../components/NuProductRateIcon";
import CokeCalculator from "../cokecalculator";
import OrdersDialog from "../components/OrdersDialog";
import StockLiftingRecordsTable from "../components/StockLiftingRecordsTable";
import OrderCalculatedTableDialog from "../components/OrderCalculatedTableDialog";
import DistributorPhysicalStockDialog from "../components/DistributorPhysicalStockDialog";
import AppSnackbar from "../components/AppSnackbar";
import DayNightThemeToggle from "../components/DayNightThemeToggle";
import SalesDataRefreshNoticeDialog from "../components/SalesDataRefreshNoticeDialog";
import { getTargetPeriod, saveTargetPeriod, getDaysRemaining } from "../utils/targetPeriod";
import {
  tryClaimTwiceWeeklyTargetReminder,
  buildTargetBalanceReminderMessage,
  getTargetReminderNotificationIconUrl,
} from "../utils/targetReminder";
import { playOrderSubmittedNotifyChime, playSalesDataRefreshChime } from "../utils/newOrderAlertSound";
import { getDistributors, saveDistributors } from "../utils/distributorAuth";
import { 
  getDistributorByCode, 
  subscribeToDistributor,
  getOrdersByDistributor,
  subscribeToOrders,
  updateDistributor,
  getTarget,
  subscribeToTarget,
  getActiveSchemesForDistributor,
  saveOrder,
  updateOrderStatus as updateOrderStatusInSupabase,
  deleteOrder as deleteOrderFromSupabase,
  getStockLiftingRecords,
  subscribeToSalesData,
  supabase,
  getProductRates,
  getGlobalTargetPeriod,
  getFgOpeningStock,
  subscribeFgOpeningStock,
} from "../services/supabaseService";
import { buildFgStockOpeningAllSkus } from "../utils/fgStockSkuMatch";
import { getAllCalculatorSkuNames } from "../utils/calculatorSkuNames";
import { sumReservedCasesBySku } from "../utils/fgStockOrderReservations";
import { logActivity, ACTIVITY_TYPES } from "../services/activityService";
import {
  ensureDashboardBaselineIfMissing,
  markDashboardTargetSeen,
  markPhysicalStockRevisionSeen,
  shouldShowDashboardBadge,
  shouldShowPhysicalStockBadge,
} from "../utils/distributorSidebarSignals";
import { getRawPhysicalStockFromDistributor } from "../utils/physicalStockTemplate";
import { readProductRatesFromLocalStorage, writeProductRatesToLocalStorage } from "../utils/productRatesStorage";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";


// Helper function to format dates
function formatDate(dateString) {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleString("en-US", { month: "short" });
  const year = date.getFullYear();
  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
      ? "nd"
      : day % 10 === 3 && day !== 13
      ? "rd"
      : "th";
  return `${day}${suffix} ${month} ${year}`;
}

function formatDistributorOrderRow(order) {
  return {
    ...order,
    timestamp:
      order.createdAt?.toDate
        ? order.createdAt.toDate().toLocaleString()
        : order.timestamp || new Date().toLocaleString(),
  };
}

function fingerprintStockLiftingRecords(records) {
  if (!Array.isArray(records) || records.length === 0) return "0";
  return records
    .map((r) =>
      `${r.id ?? "noid"}:${Number(r.csdPC) || 0}:${Number(r.csdUC) || 0}:${Number(r.waterPC) || 0}:${Number(r.waterUC) || 0}:${r.date ?? ""}`
    )
    .sort()
    .join("|");
}

function DistributorDashboard({ distributorName = "Distributor", distributorCode, onLogout }) {
  const theme = useTheme();
  const drawerPrimaryTypographyProps = {
    sx: {
      color: DRAWER_FOREGROUND,
      fontWeight: 700,
      fontSize: { xs: "0.82rem", sm: "0.9rem" },
      lineHeight: 1.35,
    },
  };
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [orders, setOrders] = useState([]);
  const [cancelingOrderId, setCancelingOrderId] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [calculatorInitialInputs, setCalculatorInitialInputs] = useState(null);
  const [openOrderCalculatedDialog, setOpenOrderCalculatedDialog] = useState(false);
  const [orderForCalculatedTable, setOrderForCalculatedTable] = useState(null);
  const [openOrdersListDialog, setOpenOrdersListDialog] = useState(false);
  const [openProductRateDialog, setOpenProductRateDialog] = useState(false);
  const [productRates, setProductRates] = useState(null);
  const [openStockLiftingDialog, setOpenStockLiftingDialog] = useState(false);
  const [openPhysicalStockDialog, setOpenPhysicalStockDialog] = useState(false);
  const DISTRIBUTOR_VIEW_STORAGE_KEY = `distributor_current_view_${distributorCode || "default"}`;
  const [stockLiftingRecords, setStockLiftingRecords] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [toast, setToast] = useState({
    open: false,
    message: "",
    title: "",
    severity: "info",
    duration: 4000,
  });
  const [sidebarBadgeTick, setSidebarBadgeTick] = useState(0);
  
  // Check if Supabase is configured
  const isSupabaseConfigured = supabase !== null;
  
  // Get distributor data from Supabase or localStorage
  const [distributor, setDistributor] = useState(null);
  const [, setDistributorLoading] = useState(isSupabaseConfigured);
  const [activeSchemes, setActiveSchemes] = useState([]); // Active schemes for this distributor
  const notificationsInitializedRef = useRef(false);
  const previousOrderStatusesRef = useRef({});
  const previousTargetAchievedRef = useRef(null);
  const [targetPeriodRev, setTargetPeriodRev] = useState(0);
  const stockLiftingFingerprintRef = useRef(null);
  const [salesRefreshNoticeOpen, setSalesRefreshNoticeOpen] = useState(false);
  const [fgOpeningStockRecord, setFgOpeningStockRecord] = useState(null);
  const lastFgUpdatedAtRef = useRef(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    const apply = (data) => {
      if (cancelled) return;
      setFgOpeningStockRecord(data || null);
      const nextAt = data?.updatedAt || null;
      if (nextAt) {
        if (lastFgUpdatedAtRef.current && lastFgUpdatedAtRef.current !== nextAt) {
          setToast({
            open: true,
            title: "Opening stock updated",
            message:
              "FG availability beside each SKU in the calculator now reflects the latest upload from your admin.",
            severity: "success",
            duration: 6500,
          });
        }
        lastFgUpdatedAtRef.current = nextAt;
      }
    };
    (async () => {
      try {
        const data = await getFgOpeningStock();
        apply(data);
      } catch (e) {
        console.warn("FG opening stock load failed:", e);
      }
    })();
    const unsub = subscribeFgOpeningStock((payload) => apply(payload));
    return () => {
      cancelled = true;
      unsub();
    };
  }, [isSupabaseConfigured]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    (async () => {
      try {
        const remote = await getGlobalTargetPeriod();
        if (cancelled || !remote?.start || !remote?.end) return;
        saveTargetPeriod(remote.start, remote.end);
        setTargetPeriodRev((n) => n + 1);
      } catch (e) {
        console.warn("Could not load global target period from Supabase:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSupabaseConfigured]);
  
  // Load distributor data
  useEffect(() => {
    let isMounted = true;
    
    const loadDistributor = async () => {
      try {
        if (isSupabaseConfigured && distributorCode) {
          // Load distributor and target in parallel for faster loading
          console.log(`🔄 Loading distributor ${distributorCode} and target in parallel...`);
          const [supabaseDistributor, targetFromCollection] = await Promise.allSettled([
            getDistributorByCode(distributorCode).catch(err => {
              if (err.name === 'AbortError') {
                console.log('Request aborted, ignoring error');
                return null;
              }
              throw err;
            }),
            getTarget(distributorCode).catch(err => {
              if (err.name === 'AbortError') {
                console.log('Request aborted, ignoring error');
                return null;
              }
              throw err;
            })
          ]).then(results => [
            results[0].status === 'fulfilled' ? results[0].value : null,
            results[1].status === 'fulfilled' ? results[1].value : null
          ]);
          
          if (!isMounted) return;
          
          if (supabaseDistributor) {
            if (targetFromCollection) {
              // Merge target from targets collection with distributor data
              const distributorWithTarget = {
                ...supabaseDistributor,
                target: {
                  CSD_PC: targetFromCollection.CSD_PC || 0,
                  CSD_UC: targetFromCollection.CSD_UC || 0,
                  Water_PC: targetFromCollection.Water_PC || 0,
                  Water_UC: targetFromCollection.Water_UC || 0,
                }
              };
              console.log(`✅ Loaded distributor and target for ${distributorCode}`);
              setDistributor(distributorWithTarget);
            } else {
              // No target in targets collection, use target from distributor document (backward compatibility)
              console.log(`⚠️ No target found in targets collection for ${distributorCode}, using target from distributor document`);
              setDistributor(supabaseDistributor);
            }
          } else {
            // Fallback to localStorage
            const distributors = getDistributors();
            const localDistributor = distributors.find(d => d.code === distributorCode || d.name === distributorName);
            setDistributor(localDistributor || null);
          }
        } else {
          // Use localStorage
          const distributors = getDistributors();
          const localDistributor = distributorCode 
            ? distributors.find(d => d.code === distributorCode || d.name === distributorName)
            : distributors.find(d => d.name === distributorName);
          setDistributor(localDistributor || null);
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('Request aborted, ignoring error');
          return;
        }
        if (!isMounted) return;
        console.error("Error loading distributor:", error);
        // Fallback to localStorage
        const distributors = getDistributors();
        const localDistributor = distributorCode 
          ? distributors.find(d => d.code === distributorCode || d.name === distributorName)
          : distributors.find(d => d.name === distributorName);
        setDistributor(localDistributor || null);
      } finally {
        if (isMounted) {
          setDistributorLoading(false);
        }
      }
    };
    loadDistributor();
    
    return () => {
      isMounted = false;
    };
  }, [distributorCode, distributorName, isSupabaseConfigured]);

  const loadProductRates = useCallback(async () => {
    try {
      if (isSupabaseConfigured) {
        const ratesDoc = await getProductRates();
        if (ratesDoc) {
          setProductRates({
            skuRates: ratesDoc.skuRates || {},
            canRate: ratesDoc.canRate,
            customProducts: Array.isArray(ratesDoc.customProducts) ? ratesDoc.customProducts : [],
          });
          writeProductRatesToLocalStorage(ratesDoc);
          return;
        }
      }
    } catch (error) {
      console.error("Error loading product rates from Supabase:", error);
    }
    const local = readProductRatesFromLocalStorage();
    if (local) {
      setProductRates({
        skuRates: local.skuRates || {},
        canRate: local.canRate,
        customProducts: Array.isArray(local.customProducts) ? local.customProducts : [],
      });
    }
  }, [isSupabaseConfigured]);

  useEffect(() => {
    loadProductRates();
  }, [loadProductRates]);

  useEffect(() => {
    if (!showCalculator) return;
    loadProductRates();
  }, [showCalculator, loadProductRates]);

  // Subscribe to real-time distributor updates
  // Only subscribe if we have a distributor loaded to avoid unnecessary subscriptions
  useEffect(() => {
    if (isSupabaseConfigured && distributorCode && distributor) {
      let isSubscribed = true;
      
      const unsubscribe = subscribeToDistributor(distributorCode, (updatedDistributor) => {
        if (!isSubscribed) return; // Prevent state updates after unmount
        
        if (updatedDistributor) {
          // Update distributor data (target will be updated separately by target subscription)
          // Keep existing target if available, otherwise use target from distributor document
          setDistributor(prev => {
            if (prev && prev.target) {
              // Preserve existing target from targets collection subscription
              return {
                ...updatedDistributor,
                target: prev.target
              };
            }
            // Use target from distributor document if no target subscription data exists
            return updatedDistributor;
          });
        }
      });
      
      return () => {
        isSubscribed = false;
        unsubscribe();
      };
    }
  }, [distributorCode, isSupabaseConfigured, distributor]);

  // Subscribe to real-time target updates from targets collection
  // Only subscribe if we have a distributor loaded to avoid unnecessary subscriptions
  useEffect(() => {
    if (isSupabaseConfigured && distributorCode && distributor) {
      console.log(`🔄 Subscribing to target updates for distributor ${distributorCode}...`);
      let isSubscribed = true;
      
      const unsubscribeTarget = subscribeToTarget(distributorCode, (targetData) => {
        if (!isSubscribed) return; // Prevent state updates after unmount
        
        if (targetData) {
          // Update distributor state with new target data
          setDistributor(prev => {
            if (prev) {
              const updated = {
                ...prev,
                target: {
                  CSD_PC: targetData.CSD_PC || 0,
                  CSD_UC: targetData.CSD_UC || 0,
                  Water_PC: targetData.Water_PC || 0,
                  Water_UC: targetData.Water_UC || 0,
                }
              };
              console.log(`✅ Target updated in real-time for distributor ${distributorCode}:`, updated.target);
              return updated;
            }
            return prev;
          });
        } else {
          // Target was deleted or doesn't exist, keep existing target or set to defaults
          console.log(`⚠️ Target not found for distributor ${distributorCode}, keeping existing target`);
        }
      });
      
      return () => {
        isSubscribed = false;
        unsubscribeTarget();
      };
    }
  }, [distributorCode, isSupabaseConfigured, distributor]);

  // Load active schemes for this distributor
  useEffect(() => {
    const loadSchemes = async () => {
      try {
        if (isSupabaseConfigured && distributorCode) {
          console.log(`🔄 Loading active schemes for distributor ${distributorCode}...`);
          const schemes = await getActiveSchemesForDistributor(distributorCode);
          setActiveSchemes(schemes);
          console.log(`✅ Loaded ${schemes.length} active schemes for distributor ${distributorCode}`);
        } else {
          // Fallback to localStorage
          const stored = localStorage.getItem("schemes");
          if (stored) {
            const allSchemes = JSON.parse(stored);
            const now = new Date();
            const active = allSchemes.filter(scheme => {
              const startDate = new Date(scheme.startDate);
              const endDate = new Date(scheme.endDate);
              return startDate <= now && endDate >= now && scheme.distributors?.includes(distributorCode);
            });
            setActiveSchemes(active);
          }
        }
      } catch (error) {
        console.error("Error loading schemes:", error);
        setActiveSchemes([]);
      }
    };
    if (distributorCode) {
      loadSchemes();
      // Reload schemes every hour to check for expired/new schemes
      const interval = setInterval(loadSchemes, 60 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [distributorCode, isSupabaseConfigured]);
  
  // Get target and achieved data from distributor
  const targetData = useMemo(
    () => distributor?.target || { CSD_PC: 0, CSD_UC: 0, Water_PC: 0, Water_UC: 0 },
    [distributor?.target]
  );
  const achievedData = useMemo(
    () => distributor?.achieved || { CSD_PC: 0, CSD_UC: 0, Water_PC: 0, Water_UC: 0 },
    [distributor?.achieved]
  );

  /** Dashboard / progress: match stock lifting totals from sales_data when loaded; else stored achieved (e.g. orders-only). */
  const progressAchievedData = useMemo(() => {
    const stored = achievedData;
    if (!isSupabaseConfigured || !Array.isArray(stockLiftingRecords) || stockLiftingRecords.length === 0) {
      return stored;
    }
    const fromSalesDb = stockLiftingRecords.some(
      (r) => r?.id != null && String(r.id).trim() !== ""
    );
    if (!fromSalesDb) {
      return stored;
    }
    let CSD_PC = 0;
    let CSD_UC = 0;
    let Water_PC = 0;
    let Water_UC = 0;
    for (const r of stockLiftingRecords) {
      CSD_PC += Number(r.csdPC) || 0;
      CSD_UC += Number(r.csdUC) || 0;
      Water_PC += Number(r.waterPC) || 0;
      Water_UC += Number(r.waterUC) || 0;
    }
    return { CSD_PC, CSD_UC, Water_PC, Water_UC };
  }, [isSupabaseConfigured, stockLiftingRecords, achievedData]);

  const pendingOrdersCount = useMemo(
    () =>
      orders.filter((o) => {
        const s = String(o?.status || "pending").toLowerCase();
        return s === "pending" || s === "sent";
      }).length,
    [orders]
  );

  const physicalStockPayload = useMemo(
    () => getRawPhysicalStockFromDistributor(distributor),
    [distributor]
  );

  const sidebarBadges = useMemo(() => {
    void sidebarBadgeTick; // bumpSidebarBadges() increments tick to re-read localStorage-driven badges
    if (!distributorCode) {
      return { dashboard: false, physicalStock: false, pendingOrders: 0 };
    }
    return {
      dashboard: shouldShowDashboardBadge(distributorCode, targetData, progressAchievedData),
      physicalStock: shouldShowPhysicalStockBadge(distributorCode, physicalStockPayload),
      pendingOrders: pendingOrdersCount,
    };
  }, [
    distributorCode,
    targetData,
    progressAchievedData,
    physicalStockPayload,
    pendingOrdersCount,
    sidebarBadgeTick,
  ]);

  useEffect(() => {
    if (!distributorCode) return;
    ensureDashboardBaselineIfMissing(distributorCode, targetData, progressAchievedData);
  }, [distributorCode, targetData, progressAchievedData]);

  const bumpSidebarBadges = useCallback(() => {
    setSidebarBadgeTick((n) => n + 1);
  }, []);

  const handlePhysicalStockDialogOpened = useCallback(() => {
    if (!distributorCode) return;
    const raw = getRawPhysicalStockFromDistributor(distributor);
    markPhysicalStockRevisionSeen(distributorCode, raw?.updatedAt || "");
    bumpSidebarBadges();
  }, [distributorCode, distributor, bumpSidebarBadges]);

  const handlePhysicalStockAcknowledged = useCallback(
    (iso) => {
      if (!distributorCode) return;
      markPhysicalStockRevisionSeen(distributorCode, iso || "");
      bumpSidebarBadges();
    },
    [distributorCode, bumpSidebarBadges]
  );

  const getOrderStatus = useCallback((order) => {
    const s = order?.status;
    if (s == null || String(s).trim() === "") return "pending";
    return String(s).trim().toLowerCase();
  }, []);
  const getOrderKey = useCallback((order) => {
    if (order?.orderNumber) return `ORD-${order.orderNumber}`;
    if (order?.id) return order.id;
    return `${order?.timestamp || ""}_${order?.distributorCode || distributorCode || ""}`;
  }, [distributorCode]);

  /** Per-SKU cases: opening file aggregate minus pending/sent/approved orders (rejected excluded; canceled absent). While editing an order, that order is excluded from reservations. */
  const fgStockBySku = useMemo(() => {
    const names = getAllCalculatorSkuNames(productRates);
    const rows = Array.isArray(fgOpeningStockRecord?.rows) ? fgOpeningStockRecord.rows : [];
    const base = buildFgStockOpeningAllSkus(names, rows);
    const excludeKey = editingOrder ? getOrderKey(editingOrder) : null;
    const reserved = sumReservedCasesBySku(orders, getOrderStatus, {
      excludeOrderKey: excludeKey,
      getOrderKey,
    });
    const out = {};
    for (const name of names) {
      const b = Number(base[name]) || 0;
      const r = Number(reserved[name]) || 0;
      out[name] = Math.max(0, Math.round(b - r));
    }
    return out;
  }, [fgOpeningStockRecord, productRates, orders, getOrderStatus, getOrderKey, editingOrder]);

  const refreshDistributorOrders = useCallback(async () => {
    try {
      if (isSupabaseConfigured && distributorCode) {
        const remoteOrders = await getOrdersByDistributor(distributorCode);
        if (remoteOrders.length > 0) {
          setOrders(remoteOrders.map(formatDistributorOrderRow));
          return;
        }
        const stored = localStorage.getItem("coke_orders");
        if (stored) {
          const allOrders = JSON.parse(stored);
          const myOrders = allOrders.filter(
            (o) => o.distributorCode === distributorCode || o.distributorName === distributorName
          );
          setOrders(myOrders);
        }
        return;
      }
      const stored = localStorage.getItem("coke_orders");
      if (stored) {
        const allOrders = JSON.parse(stored);
        const myOrders = allOrders.filter(
          (o) => o.distributorCode === distributorCode || o.distributorName === distributorName
        );
        setOrders(myOrders);
      }
    } catch (error) {
      console.error("Error loading orders:", error);
      try {
        const stored = localStorage.getItem("coke_orders");
        if (stored) {
          const allOrders = JSON.parse(stored);
          const myOrders = allOrders.filter(
            (o) => o.distributorCode === distributorCode || o.distributorName === distributorName
          );
          setOrders(myOrders);
        }
      } catch (e) {
        // Ignore
      }
    }
  }, [isSupabaseConfigured, distributorCode, distributorName]);

  const pushNotification = useCallback((message, type = "info", headline = "") => {
    const entry = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      message,
      headline: headline || (type === "success" ? "Update" : type === "error" ? "Something went wrong" : "Notice"),
      type,
      timestamp: new Date().toLocaleString(),
    };
    setNotifications((prev) => [entry, ...prev].slice(0, 50));
    setUnreadNotifications((prev) => prev + 1);
  }, []);

  /** @param {string} title Short headline shown above the message */
  const showToast = useCallback((message, severity = "info", duration = 4000, title = "") => {
    setToast({ open: true, message, severity, duration, title });
  }, []);

  useEffect(() => {
    notificationsInitializedRef.current = false;
    previousOrderStatusesRef.current = {};
  }, [distributorCode]);

  useEffect(() => {
    if (!notificationsInitializedRef.current) {
      const initialStatuses = {};
      orders.forEach((order) => {
        initialStatuses[getOrderKey(order)] = getOrderStatus(order);
      });
      previousOrderStatusesRef.current = initialStatuses;
      notificationsInitializedRef.current = true;
      return;
    }

    const previous = previousOrderStatusesRef.current || {};
    const nextStatuses = {};
    orders.forEach((order) => {
      const key = getOrderKey(order);
      const status = getOrderStatus(order);
      nextStatuses[key] = status;

      const prevStatus = previous[key];
      if (prevStatus !== undefined && prevStatus !== status) {
        if (status === "approved") {
          const msg = `Order ${key} was approved. You can review details under Orders.`;
          pushNotification(msg, "success", "Order approved");
          showToast(msg, "success", 6000, "Order approved");
          (async () => {
            if (typeof window === "undefined" || !("Notification" in window)) return;
            try {
              const iconUrl = getTargetReminderNotificationIconUrl();
              if (Notification.permission === "granted") {
                new Notification("Order approved", { body: msg, icon: iconUrl });
              } else if (Notification.permission === "default") {
                const p = await Notification.requestPermission();
                if (p === "granted") {
                  new Notification("Order approved", { body: msg, icon: iconUrl });
                }
              }
            } catch (e) {
              console.warn("Browser notification failed:", e);
            }
          })();
        } else if (status === "rejected") {
          const msg = `Order ${key} was rejected. Open Orders for details or place a new order if needed.`;
          pushNotification(msg, "error", "Order rejected");
          showToast(msg, "error", 6500, "Order rejected");
          (async () => {
            if (typeof window === "undefined" || !("Notification" in window)) return;
            try {
              const iconUrl = getTargetReminderNotificationIconUrl();
              if (Notification.permission === "granted") {
                new Notification("Order rejected", { body: msg, icon: iconUrl });
              } else if (Notification.permission === "default") {
                const p = await Notification.requestPermission();
                if (p === "granted") {
                  new Notification("Order rejected", { body: msg, icon: iconUrl });
                }
              }
            } catch (e) {
              console.warn("Browser notification failed:", e);
            }
          })();
        } else {
          pushNotification(`Order ${key} is now: ${status}.`, "info", "Order status");
        }
      }
    });
    previousOrderStatusesRef.current = nextStatuses;
  }, [orders, getOrderKey, getOrderStatus, pushNotification, showToast]);

  useEffect(() => {
    const snapshot = {
      target: targetData,
      achieved: achievedData,
    };

    if (!previousTargetAchievedRef.current) {
      previousTargetAchievedRef.current = snapshot;
      return;
    }

    const prev = previousTargetAchievedRef.current;
    const changed =
      JSON.stringify(prev.target) !== JSON.stringify(targetData) ||
      JSON.stringify(prev.achieved) !== JSON.stringify(achievedData);

    if (changed) {
      pushNotification(
        "Your monthly target or achieved figures were updated by the admin. Check the dashboard cards for the latest numbers.",
        "info",
        "Target or performance updated"
      );
      previousTargetAchievedRef.current = snapshot;
    }
  }, [targetData, achievedData, pushNotification]);

  /** Twice weekly (Mon & Thu): device notification + in-app notice for target balance & days left */
  useEffect(() => {
    if (!distributorCode || !distributor) return;
    const claimed = tryClaimTwiceWeeklyTargetReminder(distributorCode);
    if (!claimed) return;

    const period = getTargetPeriod();
    const rem = getDaysRemaining(period.end);

    const rows = [
      {
        category: "CSD",
        targetPC: targetData.CSD_PC || 0,
        targetUC: targetData.CSD_UC || 0,
        achievedPC: progressAchievedData.CSD_PC || 0,
        achievedUC: progressAchievedData.CSD_UC || 0,
      },
      {
        category: "Kinley Water",
        targetPC: targetData.Water_PC || 0,
        targetUC: targetData.Water_UC || 0,
        achievedPC: progressAchievedData.Water_PC || 0,
        achievedUC: progressAchievedData.Water_UC || 0,
      },
    ];

    const message = buildTargetBalanceReminderMessage({
      remainingDays: rem,
      periodEndYmd: period.end,
      rows,
    });

    pushNotification(message, "info", "Target & stock reminder");

    (async () => {
      if (typeof window === "undefined" || !("Notification" in window)) return;
      try {
        const iconUrl = getTargetReminderNotificationIconUrl();
        if (Notification.permission === "granted") {
          new Notification("Target & stock reminder", {
            body: message,
            icon: iconUrl,
          });
        } else if (Notification.permission === "default") {
          const p = await Notification.requestPermission();
          if (p === "granted") {
            new Notification("Target & stock reminder", {
              body: message,
              icon: iconUrl,
            });
          }
        }
      } catch (e) {
        console.warn("Browser notification failed:", e);
      }
    })();
  }, [distributorCode, distributor, targetData, progressAchievedData, targetPeriodRev, pushNotification]);

  // Load orders from Supabase or localStorage
  useEffect(() => {
    refreshDistributorOrders();
  }, [refreshDistributorOrders]);

  // Poll Supabase so approve/reject shows even if Realtime is off or flaky (admin dashboard uses the same interval)
  useEffect(() => {
    if (!isSupabaseConfigured || !distributorCode) return;
    const id = setInterval(() => {
      refreshDistributorOrders();
    }, 5000);
    return () => clearInterval(id);
  }, [isSupabaseConfigured, distributorCode, refreshDistributorOrders]);

  // Other tabs / admin session on same browser: localStorage-only deployments
  useEffect(() => {
    if (isSupabaseConfigured) return;
    const onStorage = (e) => {
      if (e.key !== "coke_orders") return;
      refreshDistributorOrders();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [isSupabaseConfigured, refreshDistributorOrders]);

  // Subscribe to real-time order updates (do not depend on `orders` — that re-subscribed on every status change and broke sync)
  useEffect(() => {
    if (!isSupabaseConfigured || !distributorCode) return;
    const unsubscribe = subscribeToOrders(distributorCode, (firebaseOrders) => {
      setOrders(firebaseOrders.map(formatDistributorOrderRow));
    });
    return () => unsubscribe();
  }, [distributorCode, isSupabaseConfigured]);

  useEffect(() => {
    stockLiftingFingerprintRef.current = null;
  }, [distributorCode]);

  // Load stock lifting records from sales_data
  useEffect(() => {
    const loadStockLiftingRecords = async () => {
      try {
        if (isSupabaseConfigured && distributorCode) {
          const records = await getStockLiftingRecords(distributorCode);
          setStockLiftingRecords(records);
          stockLiftingFingerprintRef.current = fingerprintStockLiftingRecords(records);
        } else {
          // Fallback: use orders as stock lifting records if no sales data
          setStockLiftingRecords(orders.map(order => ({
            date: order.timestamp ? new Date(order.timestamp).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            timestamp: order.timestamp || order.created_at || new Date().toLocaleString(),
            created_at: order.created_at || order.timestamp,
            csdPC: order.csdPC || 0,
            csdUC: order.csdUC || 0,
            waterPC: order.waterPC || 0,
            waterUC: order.waterUC || 0,
          })));
        }
      } catch (error) {
        console.error("Error loading stock lifting records:", error);
        // Fallback to orders
        setStockLiftingRecords(orders.map(order => ({
          date: order.timestamp ? new Date(order.timestamp).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          timestamp: order.timestamp || order.created_at || new Date().toLocaleString(),
          created_at: order.created_at || order.timestamp,
          csdPC: order.csdPC || 0,
          csdUC: order.csdUC || 0,
          waterPC: order.waterPC || 0,
          waterUC: order.waterUC || 0,
        })));
      }
    };
    loadStockLiftingRecords();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [distributorCode, isSupabaseConfigured]);

  // Subscribe to sales_data changes to refresh stock lifting records
  useEffect(() => {
    if (isSupabaseConfigured && distributorCode) {
      const unsubscribe = subscribeToSalesData(async () => {
        try {
          const records = await getStockLiftingRecords(distributorCode);
          const nextFp = fingerprintStockLiftingRecords(records);
          const prevFp = stockLiftingFingerprintRef.current;
          setStockLiftingRecords(records);
          if (prevFp !== null && prevFp !== nextFp) {
            setSalesRefreshNoticeOpen(true);
            try {
              playSalesDataRefreshChime();
            } catch {
              /* ignore */
            }
          }
          stockLiftingFingerprintRef.current = nextFp;
        } catch (error) {
          console.error("Error refreshing stock lifting records:", error);
        }
      });
      return () => unsubscribe();
    }
  }, [distributorCode, isSupabaseConfigured]);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const setDistributorCurrentView = (view) => {
    try {
      localStorage.setItem(DISTRIBUTOR_VIEW_STORAGE_KEY, view);
    } catch (error) {
      console.warn("Could not persist distributor current view:", error);
    }
  };

  useEffect(() => {
    try {
      const savedView = localStorage.getItem(DISTRIBUTOR_VIEW_STORAGE_KEY);
      if (!savedView) return;

      if (savedView === "orders") setOpenOrdersListDialog(true);
      if (savedView === "product_rates") setOpenProductRateDialog(true);
      if (savedView === "stock_lifting") setOpenStockLiftingDialog(true);
      if (savedView === "physical_stock") setOpenPhysicalStockDialog(true);
      if (savedView === "calculator") setShowCalculator(true);
    } catch (error) {
      console.warn("Could not restore distributor current view:", error);
    }
  }, [DISTRIBUTOR_VIEW_STORAGE_KEY]);

  // Target period: localStorage, refreshed when Supabase global period is loaded (targetPeriodRev)
  const targetPeriod = useMemo(() => {
    void targetPeriodRev;
    return getTargetPeriod();
  }, [targetPeriodRev]);
  const targetStart = targetPeriod.start;
  const targetEnd = targetPeriod.end;
  
  // Use actual distributor data from localStorage
  const progressData = [
    { 
      category: "CSD", 
      targetPC: targetData.CSD_PC || 0, 
      targetUC: targetData.CSD_UC || 0, 
      achievedPC: progressAchievedData.CSD_PC || 0, 
      achievedUC: progressAchievedData.CSD_UC || 0 
    },
    { 
      category: "Kinley Water", 
      targetPC: targetData.Water_PC || 0, 
      targetUC: targetData.Water_UC || 0, 
      achievedPC: progressAchievedData.Water_PC || 0, 
      achievedUC: progressAchievedData.Water_UC || 0 
    },
  ];
  
  const remainingDays = getDaysRemaining(targetEnd);

  const today = new Date();

  // Handle order placement / re-submission from calculator
  const handlePlaceOrder = async (orderData, orderNumber, tableImageData = null, editContext = null, orderCaption = "") => {
    try {
      const timestamp = new Date().toLocaleString();
      const normalizedCaption =
        (typeof orderCaption === "string" && orderCaption.trim()) ||
        (Array.isArray(orderData) && typeof orderData[0]?.orderCaption === "string" && orderData[0].orderCaption.trim()) ||
        "";
      
      // Calculate CSD and Water UC/PC from order
      let csdUC = 0, waterUC = 0, csdPC = 0, waterPC = 0;
      
      orderData.forEach(item => {
        const category = item.category || "CSD"; // Use category from order data
        
        if (category === "CSD") {
          csdUC += (item.totalUC || 0);
          csdPC += (item.cases || 0);
        } else if (category === "Water") {
          waterUC += (item.totalUC || 0);
          waterPC += (item.cases || 0);
        }
      });
      
      // Edit order flow: update existing order instead of creating a new one
      if (editContext?.isEdit && editContext?.orderKey) {
        const existingOrder = orders.find((o) => getOrderKey(o) === editContext.orderKey) || editingOrder;
        const currentEditedCount = Number(existingOrder?.editedCount || 0);
        const updatedOrder = {
          ...existingOrder,
          data: orderData,
          timestamp,
          totalUC: csdUC + waterUC,
          csdUC,
          waterUC,
          csdPC,
          waterPC,
          orderNumber: existingOrder?.orderNumber || orderNumber,
          tableImageData: tableImageData || existingOrder?.tableImageData || null,
          status: "pending",
          isEdited: true,
          editedAt: new Date().toISOString(),
          editedCount: currentEditedCount + 1,
          caption: normalizedCaption
        };

        let supabaseUpdatedOrder = null;

        if (isSupabaseConfigured) {
          try {
            let targetOrderId = editContext.orderId || updatedOrder.id || null;

            // Fallback lookup when id is missing in local state.
            if (!targetOrderId && updatedOrder.orderNumber && updatedOrder.distributorCode) {
              const { data: foundOrders, error: findError } = await supabase
                .from("orders")
                .select("id")
                .eq("distributorCode", updatedOrder.distributorCode)
                .eq("orderNumber", updatedOrder.orderNumber)
                .order("created_at", { ascending: false })
                .limit(1);
              if (findError) {
                console.warn("Could not resolve order id for edit sync:", findError);
              } else if (foundOrders && foundOrders.length > 0) {
                targetOrderId = foundOrders[0].id;
              }
            }

            const editFallback =
              updatedOrder.distributorCode &&
              updatedOrder.orderNumber != null &&
              String(updatedOrder.orderNumber).trim() !== ""
                ? {
                    distributorCode: updatedOrder.distributorCode,
                    orderNumber: updatedOrder.orderNumber,
                  }
                : null;

            if (targetOrderId || editFallback) {
              supabaseUpdatedOrder = await updateOrderStatusInSupabase(
                targetOrderId,
                "pending",
                {
                  data: orderData,
                  timestamp,
                  totalUC: csdUC + waterUC,
                  csdUC,
                  waterUC,
                  csdPC,
                  waterPC,
                  orderNumber: updatedOrder.orderNumber,
                  tableImageData: updatedOrder.tableImageData,
                  caption: updatedOrder.caption,
                },
                editFallback
              );
            } else {
              showToast(
                "We could not find this order on the server. Try refreshing the page, then edit again.",
                "error",
                5000,
                "Order not updated"
              );
              return;
            }
          } catch (supabaseError) {
            console.error("Failed to sync edited order to Supabase:", supabaseError);
            showToast(
              supabaseError?.message || "Check your connection and try again.",
              "error",
              5000,
              "Could not update order"
            );
            return;
          }
        }

        // Update UI state after successful server sync (or local-only mode)
        const finalUpdatedOrder = supabaseUpdatedOrder
          ? { ...updatedOrder, ...supabaseUpdatedOrder }
          : updatedOrder;
        setOrders((prev) =>
          prev.map((o) => (getOrderKey(o) === editContext.orderKey ? finalUpdatedOrder : o))
        );

        try {
          const stored = localStorage.getItem("coke_orders");
          if (stored) {
            const allOrders = JSON.parse(stored);
            const updatedOrders = allOrders.map((o) =>
              getOrderKey(o) === editContext.orderKey ? finalUpdatedOrder : o
            );
            localStorage.setItem("coke_orders", JSON.stringify(updatedOrders));
          }
        } catch (storageError) {
          console.warn("Error updating localStorage edited order:", storageError);
        }

        setEditingOrder(null);
        setCalculatorInitialInputs(null);
        setShowCalculator(false);
        setDistributorCurrentView("dashboard");
        const updatedMsg = `Order ${updatedOrder.orderNumber || editContext.orderKey} was updated and sent back as pending for review.`;
        pushNotification(updatedMsg, "success", "Order updated");
        showToast(updatedMsg, "success", 4200, "Order updated");
        return;
      }

      // New order flow: update distributor's achieved values
      if (distributor) {
        const updatedAchieved = {
          CSD_PC: (distributor.achieved?.CSD_PC || 0) + csdPC,
          CSD_UC: (distributor.achieved?.CSD_UC || 0) + csdUC,
          Water_PC: (distributor.achieved?.Water_PC || 0) + waterPC,
          Water_UC: (distributor.achieved?.Water_UC || 0) + waterUC,
        };
        
        if (isSupabaseConfigured && distributorCode) {
          // Update in Supabase
          try {
            await updateDistributor(distributorCode, { achieved: updatedAchieved });
            setDistributor({ ...distributor, achieved: updatedAchieved });
          } catch (updateError) {
            console.error('Failed to update distributor in Supabase:', updateError);
            throw new Error(`Failed to update distributor in Supabase: ${updateError?.message || updateError}`);
          }
        } else {
          // Update in localStorage
          const distributors = getDistributors();
          const updatedDistributors = distributors.map(d => {
            if ((d.code === distributorCode) || (d.name === distributorName)) {
              return {
                ...d,
                achieved: updatedAchieved
              };
            }
            return d;
          });
          saveDistributors(updatedDistributors);
          setDistributor({ ...distributor, achieved: updatedAchieved });
        }
      }
      
      // Create order object
      const totalUC = csdUC + waterUC;
      // Generate order number if not provided
      let finalOrderNumber = orderNumber;
      if (!finalOrderNumber) {
        const { getNextOrderNumber } = await import('../utils/orderNumber');
        finalOrderNumber = getNextOrderNumber();
      }
      
      const order = {
        distributorCode: distributorCode || distributor?.code,
        distributorName: distributorName,
        data: orderData,
        timestamp,
        totalUC,
        csdUC,
        waterUC,
        csdPC,
        waterPC,
        orderNumber: finalOrderNumber, // Add 4-digit order number
        tableImageData: tableImageData, // Store table PNG for email attachment
        status: "pending",
        caption: normalizedCaption
      };
      
      // Log activity
      await logActivity(
        ACTIVITY_TYPES.ORDER_CREATED,
        `Order placed: ${distributorName} - Total UC: ${totalUC.toFixed(2)}`,
        {
          distributorName,
          distributorCode: distributorCode || distributor?.code,
          orderId: `ORD-${Date.now()}`,
          totalUC,
          itemCount: orderData.length,
          userEmail: distributorName,
          userName: distributorName,
        }
      );
      
      // Save order to Supabase if configured, otherwise to localStorage
      if (isSupabaseConfigured) {
        try {
          const savedOrder = await saveOrder(order);
          // Add the Supabase ID to the order object
          order.id = savedOrder.id;
          console.log(`✅ Order saved to Supabase (Order #${finalOrderNumber}, ID: ${savedOrder.id})`);
          
          // Also save to localStorage as backup
          const stored = localStorage.getItem("coke_orders");
          const allOrders = stored ? JSON.parse(stored) : [];
          allOrders.push(order);
          localStorage.setItem("coke_orders", JSON.stringify(allOrders));
          console.log(`✅ Order also saved to localStorage as backup`);
        } catch (supabaseError) {
          console.error('Failed to save order to Supabase:', supabaseError);
          throw new Error(`Failed to save order to Supabase: ${supabaseError?.message || supabaseError}`);
        }
      } else {
        // Save order to localStorage only (Supabase not configured)
        const stored = localStorage.getItem("coke_orders");
        const allOrders = stored ? JSON.parse(stored) : [];
        allOrders.push(order);
        localStorage.setItem("coke_orders", JSON.stringify(allOrders));
        console.log(`✅ Order saved to localStorage (Order #${finalOrderNumber})`);
      }
      
      // Update local state
      setOrders((prev) => [order, ...prev]);
      
      const orderPlacedMessage = `Order #${finalOrderNumber} is submitted. CSD UC: ${csdUC.toFixed(2)}, Water UC: ${waterUC.toFixed(2)}. You’ll get a notification when it’s approved or rejected.`;
      playOrderSubmittedNotifyChime();
      pushNotification(orderPlacedMessage, "success", "Order placed");
      showToast(orderPlacedMessage, "success", 5200, "Order placed");
      (async () => {
        if (typeof window === "undefined" || !("Notification" in window)) return;
        try {
          const iconUrl = getTargetReminderNotificationIconUrl();
          const title = "Order placed";
          const body = `Order #${finalOrderNumber} submitted — pending admin review.`;
          if (Notification.permission === "granted") {
            new Notification(title, { body, icon: iconUrl, tag: `coke-order-placed-${finalOrderNumber}` });
          } else if (Notification.permission === "default") {
            const p = await Notification.requestPermission();
            if (p === "granted") {
              new Notification(title, { body, icon: iconUrl, tag: `coke-order-placed-${finalOrderNumber}` });
            }
          }
        } catch (e) {
          console.warn("Order placed notification failed:", e);
        }
      })();
    } catch (error) {
      console.error("Error placing order:", error);
      const errBody =
        error?.message && String(error.message).length < 200
          ? error.message
          : "Check your connection and try again. If this continues, contact support.";
      pushNotification(`Could not place order: ${errBody}`, "error", "Order failed");
      showToast(errBody, "error", 5000, "Could not place order");
    }
  };

  const handleCancelOrder = async (order) => {
    try {
      const currentStatus = getOrderStatus(order);
      if (currentStatus !== "pending" && currentStatus !== "sent") {
        showToast(
          "Only orders that are still pending or sent can be canceled. Approved or rejected orders can’t be canceled here.",
          "warning",
          5000,
          "Can’t cancel this order"
        );
        return;
      }

      const confirmed = window.confirm(
        "Cancel and remove this order? It will be deleted from the app, local storage, and the server (if connected)."
      );
      if (!confirmed) return;

      const orderKey = getOrderKey(order);
      const cancelMarker = order?.id || order?.orderNumber || orderKey;
      setCancelingOrderId(cancelMarker);

      const previousOrdersSnapshot = orders;

      const deleteFallback =
        order?.distributorCode &&
        order?.orderNumber != null &&
        String(order.orderNumber).trim() !== ""
          ? { distributorCode: order.distributorCode, orderNumber: order.orderNumber }
          : null;

      // Remove from UI immediately
      setOrders((prev) => prev.filter((o) => getOrderKey(o) !== orderKey));

      if (previousOrderStatusesRef.current && orderKey in previousOrderStatusesRef.current) {
        const nextPrev = { ...previousOrderStatusesRef.current };
        delete nextPrev[orderKey];
        previousOrderStatusesRef.current = nextPrev;
      }

      // Remove from localStorage
      try {
        const stored = localStorage.getItem("coke_orders");
        if (stored) {
          const allOrders = JSON.parse(stored);
          const filtered = allOrders.filter((o) => getOrderKey(o) !== orderKey);
          localStorage.setItem("coke_orders", JSON.stringify(filtered));
        }
      } catch (storageError) {
        console.warn("Error removing order from localStorage:", storageError);
      }

      if (isSupabaseConfigured && (order?.id || deleteFallback)) {
        try {
          await deleteOrderFromSupabase(order.id, deleteFallback);
        } catch (supabaseError) {
          console.error("Failed to delete order from Supabase:", supabaseError);
          setOrders(previousOrdersSnapshot);
          try {
            const stored = localStorage.getItem("coke_orders");
            const parsed = stored ? JSON.parse(stored) : [];
            const restored = Array.isArray(parsed) ? [...parsed] : [];
            const stillMissing = !restored.some((o) => getOrderKey(o) === orderKey);
            if (stillMissing) restored.push(order);
            localStorage.setItem("coke_orders", JSON.stringify(restored));
          } catch (rollbackStorageError) {
            console.warn("Error rolling back localStorage after failed delete:", rollbackStorageError);
          }
          throw new Error(supabaseError?.message || String(supabaseError));
        }
      }

      if (
        orderForCalculatedTable &&
        getOrderKey(orderForCalculatedTable) === orderKey
      ) {
        setOrderForCalculatedTable(null);
        setOpenOrderCalculatedDialog(false);
      }

      pushNotification(
        `Order ${order.orderNumber || orderKey} was removed.`,
        "warning",
        "Order canceled"
      );
    } catch (error) {
      console.error("Error canceling order:", error);
      showToast(
        error?.message || "Try again in a moment. If the order still shows, refresh the page.",
        "error",
        5000,
        "Could not cancel order"
      );
    } finally {
      setCancelingOrderId(null);
    }
  };

  /** Row click: only the saved calculated table (dialog). */
  const handleViewOrderCalculatedTable = (order) => {
    setOrderForCalculatedTable(order);
    setOpenOrderCalculatedDialog(true);
  };

  /** Edit icon: full calculator to change and resubmit (not available for approved). */
  const handleEditOrderInCalculator = (order) => {
    const initial = {};
    (order?.data || []).forEach((row) => {
      if (row?.sku) initial[row.sku] = Number(row.cases || 0);
    });
    setEditingOrder(order);
    setCalculatorInitialInputs(initial);
    setOpenOrdersListDialog(false);
    setShowCalculator(true);
    setDistributorCurrentView("calculator");
  };

  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      {/* Top AppBar */}
      <AppBar position="fixed" sx={{ zIndex: 1201, bgcolor: "primary.main" }}>
        <Toolbar>
          <IconButton color="inherit" onClick={toggleSidebar} aria-label="toggle menu">
            <MenuIcon />
          </IconButton>
          <Typography variant="subtitle1" sx={{ flexGrow: 1, fontWeight: 600, fontSize: { xs: "0.9rem", sm: "1rem" } }}>
            {distributorName}
          </Typography>
          <Typography variant="body2" sx={{ mr: { xs: 1, sm: 2 }, fontSize: { xs: "0.75rem", sm: "0.875rem" }, display: { xs: "none", sm: "block" } }}>
            {today.toLocaleDateString()}
          </Typography>
          <DayNightThemeToggle />
          <Tooltip title="Notifications">
            <IconButton
              color="inherit"
              aria-label="notifications"
              onClick={() => {
                setNotificationsOpen(true);
                setUnreadNotifications(0);
              }}
            >
              <Badge badgeContent={unreadNotifications} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          <Tooltip title="Logout">
            <IconButton color="inherit" onClick={onLogout} aria-label="logout">
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* Sidebar Drawer */}
      <Drawer
        variant="temporary"
        open={sidebarOpen}
        onClose={toggleSidebar}
        sx={{
          [`& .MuiDrawer-paper`]: {
            width: { xs: 180, sm: 200 },
            boxSizing: "border-box",
            bgcolor: "secondary.main",
            color: DRAWER_FOREGROUND,
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <Toolbar />
        <List sx={{ flex: 1, overflowY: "auto" }}>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => {
                if (distributorCode) {
                  markDashboardTargetSeen(distributorCode, targetData, progressAchievedData);
                  bumpSidebarBadges();
                }
                setDistributorCurrentView("dashboard");
                setSidebarOpen(false);
              }}
              sx={{
                color: DRAWER_FOREGROUND,
                borderRadius: 2,
                "&:hover": { bgcolor: alpha(theme.palette.common.black, 0.1) },
              }}
            >
              <Badge
                variant="dot"
                color="primary"
                overlap="circular"
                invisible={!sidebarBadges.dashboard}
                sx={{
                  mr: 2,
                  color: "inherit",
                  "& .MuiBadge-badge": {
                    top: 6,
                    right: 6,
                    minWidth: 10,
                    height: 10,
                    borderRadius: "50%",
                    border: "2px solid",
                    borderColor: "secondary.dark",
                  },
                }}
              >
                <DashboardIcon sx={{ fontSize: 20, color: "inherit" }} />
              </Badge>
              <ListItemText primary="Dashboard" primaryTypographyProps={drawerPrimaryTypographyProps} />
            </ListItemButton>
          </ListItem>

          {/* Orders List */}
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => {
                setOpenOrdersListDialog(true);
                setDistributorCurrentView("orders");
                setSidebarOpen(false);
              }}
              sx={{
                color: DRAWER_FOREGROUND,
                borderRadius: 2,
                "&:hover": { bgcolor: alpha(theme.palette.common.black, 0.1) },
              }}
            >
              <Badge
                badgeContent={sidebarBadges.pendingOrders > 99 ? "99+" : sidebarBadges.pendingOrders}
                color="error"
                overlap="circular"
                invisible={sidebarBadges.pendingOrders === 0}
                sx={{
                  mr: 2,
                  color: "inherit",
                  "& .MuiBadge-badge": {
                    right: 4,
                    top: 4,
                    fontWeight: 800,
                    border: "2px solid",
                    borderColor: "secondary.dark",
                  },
                }}
              >
                <ListAltIcon sx={{ fontSize: 20, color: "inherit" }} />
              </Badge>
              <ListItemText
                primary="Orders"
                secondary={sidebarBadges.pendingOrders ? "Awaiting review" : null}
                primaryTypographyProps={drawerPrimaryTypographyProps}
                secondaryTypographyProps={
                  sidebarBadges.pendingOrders
                    ? {
                        sx: {
                          fontSize: "0.68rem",
                          fontWeight: 600,
                          color: theme.palette.error.dark,
                          mt: 0.25,
                        },
                      }
                    : undefined
                }
              />
            </ListItemButton>
          </ListItem>

          {/* Product Rate List */}
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => {
                setOpenProductRateDialog(true);
                setDistributorCurrentView("product_rates");
                setSidebarOpen(false);
              }}
              sx={{
                color: DRAWER_FOREGROUND,
                borderRadius: 2,
                "&:hover": { bgcolor: alpha(theme.palette.common.black, 0.1) },
              }}
            >
              <NuProductRateIcon
                sx={{
                  mr: 2,
                  minWidth: 28,
                  height: 28,
                  fontSize: "0.8rem",
                  borderRadius: "6px",
                  bgcolor: "rgba(228, 5, 33, 0.14)",
                  color: "#b71c1c",
                }}
              />
              <ListItemText primary="Product Rate List" primaryTypographyProps={drawerPrimaryTypographyProps} />
            </ListItemButton>
          </ListItem>

          {/* Stock Lifting Record */}
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => {
                setOpenStockLiftingDialog(true);
                setDistributorCurrentView("stock_lifting");
                setSidebarOpen(false);
              }}
              sx={{
                color: DRAWER_FOREGROUND,
                borderRadius: 2,
                "&:hover": { bgcolor: alpha(theme.palette.common.black, 0.1) },
              }}
            >
              <InventoryIcon sx={{ mr: 2, fontSize: 20, color: "inherit" }} />
              <ListItemText primary="Stock Lifting Record" primaryTypographyProps={drawerPrimaryTypographyProps} />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => {
                setOpenPhysicalStockDialog(true);
                setDistributorCurrentView("physical_stock");
                setSidebarOpen(false);
              }}
              sx={{
                color: DRAWER_FOREGROUND,
                borderRadius: 2,
                "&:hover": { bgcolor: alpha(theme.palette.common.black, 0.1) },
              }}
            >
              <Badge
                variant="dot"
                color="secondary"
                overlap="circular"
                invisible={!sidebarBadges.physicalStock}
                sx={{
                  mr: 2,
                  color: "inherit",
                  "& .MuiBadge-badge": {
                    top: 6,
                    right: 6,
                    minWidth: 10,
                    height: 10,
                    borderRadius: "50%",
                    border: "2px solid",
                    borderColor: "secondary.dark",
                    bgcolor: "#6a1b9a",
                  },
                }}
              >
                <WarehouseIcon sx={{ fontSize: 20, color: "inherit" }} />
              </Badge>
              <ListItemText
                primary="Physical Stock"
                secondary={sidebarBadges.physicalStock ? "New update" : null}
                primaryTypographyProps={drawerPrimaryTypographyProps}
                secondaryTypographyProps={
                  sidebarBadges.physicalStock
                    ? {
                        sx: {
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          color: "#4a148c",
                          mt: 0.25,
                        },
                      }
                    : undefined
                }
              />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton 
              onClick={() => {
                setEditingOrder(null);
                setCalculatorInitialInputs(null);
                setShowCalculator(true);
                setDistributorCurrentView("calculator");
                setSidebarOpen(false);
              }}
              sx={{
                bgcolor: "primary.main",
                color: theme.palette.primary.contrastText,
                borderRadius: 2,
                mx: 1,
                mb: 1,
                "&:hover": {
                  bgcolor: "primary.dark",
                }
              }}
            >
              <ListItemText
                primary="Place Order"
                primaryTypographyProps={{
                  sx: {
                    fontWeight: 700,
                    color: "inherit",
                    textAlign: "center",
                    fontSize: { xs: "0.95rem", sm: "1rem" },
                  },
                }}
              />
            </ListItemButton>
          </ListItem>
        </List>
        <Box
          sx={{
            mt: "auto",
            mx: 1,
            mb: 1.5,
            p: 1,
            borderRadius: 1.5,
            bgcolor: alpha(DRAWER_FOREGROUND, 0.07),
            border: 1,
            borderColor: alpha(DRAWER_FOREGROUND, 0.2),
          }}
        >
          <Typography sx={{ fontSize: "0.7rem", fontWeight: 800, color: DRAWER_FOREGROUND, mb: 0.25 }}>
            Logged In
          </Typography>
          <Typography sx={{ fontSize: "0.72rem", fontWeight: 600, color: DRAWER_FOREGROUND }}>
            {distributorName || "Distributor"}
          </Typography>
          <Typography sx={{ fontSize: "0.68rem", fontWeight: 600, color: DRAWER_FOREGROUND, mt: 0.25 }}>
            Code: {distributorCode || "N/A"} | Role: DISTRIBUTOR
          </Typography>
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, bgcolor: "background.default", p: { xs: 2, sm: 3 }, overflow: "auto" }}>
        <Toolbar />

        {/* Improved Info Cards - Mobile First */}
        <Box sx={{ 
          display: "grid", 
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
          gap: { xs: 1.5, sm: 2 },
          mb: 3
        }}>
          <Card 
            elevation={2}
            sx={{ 
              p: { xs: 2, sm: 2.5 },
              borderRadius: 3,
              background:
                theme.palette.mode === "dark"
                  ? `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.info.main, 0.14)} 100%)`
                  : "linear-gradient(135deg, #fff 0%, #bbdefb 100%)",
              border: theme.palette.mode === "dark" ? 1 : 0,
              borderColor: "divider",
              transition: "transform 0.2s, box-shadow 0.2s",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: 4
              }
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", mb: 1.5 }}>
              <Box sx={{ 
                p: { xs: 1, sm: 1.5 }, 
                borderRadius: 2, 
                bgcolor: theme.palette.mode === "dark" ? alpha(theme.palette.info.main, 0.2) : "rgba(13, 71, 161, 0.1)",
                mr: 1.5
              }}>
                <BarChartIcon sx={{ fontSize: { xs: 24, sm: 28 }, color: theme.palette.mode === "dark" ? "info.light" : "#0d47a1" }} />
              </Box>
              <Typography variant="subtitle2" sx={{ color: "text.secondary", fontWeight: 600, fontSize: { xs: "0.875rem", sm: "1rem" } }}>
                Target Balance
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: { xs: 2, sm: 3 }, flexWrap: "wrap" }}>
              {/* CSD Balance */}
              <Box sx={{ flex: { xs: "1 1 calc(50% - 8px)", sm: "1 1 auto" }, minWidth: { xs: "45%", sm: "auto" } }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary", mb: 1, fontSize: { xs: "0.8rem", sm: "0.875rem" } }}>
                  CSD
                </Typography>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontSize: { xs: "0.7rem", sm: "0.75rem" } }}>PC:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.mode === "dark" ? "info.light" : "#0d47a1", fontSize: { xs: "0.8rem", sm: "0.875rem" } }}>
                    {(targetData.CSD_PC || 0) - (progressAchievedData.CSD_PC || 0)}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontSize: { xs: "0.7rem", sm: "0.75rem" } }}>UC:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.mode === "dark" ? "info.light" : "#0d47a1", fontSize: { xs: "0.8rem", sm: "0.875rem" } }}>
                    {Math.round((targetData.CSD_UC || 0) - (progressAchievedData.CSD_UC || 0)).toLocaleString()}
                  </Typography>
                </Box>
              </Box>
              {/* Water Balance */}
              <Box sx={{ flex: { xs: "1 1 calc(50% - 8px)", sm: "1 1 auto" }, minWidth: { xs: "45%", sm: "auto" } }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary", mb: 1, fontSize: { xs: "0.8rem", sm: "0.875rem" } }}>
                  Water
                </Typography>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontSize: { xs: "0.7rem", sm: "0.75rem" } }}>PC:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.mode === "dark" ? "info.light" : "#0d47a1", fontSize: { xs: "0.8rem", sm: "0.875rem" } }}>
                    {(targetData.Water_PC || 0) - (progressAchievedData.Water_PC || 0)}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontSize: { xs: "0.7rem", sm: "0.75rem" } }}>UC:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.mode === "dark" ? "info.light" : "#0d47a1", fontSize: { xs: "0.8rem", sm: "0.875rem" } }}>
                    {Math.round((targetData.Water_UC || 0) - (progressAchievedData.Water_UC || 0)).toLocaleString()}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Card>

          <Card 
            elevation={2}
            sx={{ 
              p: { xs: 2, sm: 2.5 },
              borderRadius: 3,
              background:
                theme.palette.mode === "dark"
                  ? `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.success.main, 0.14)} 100%)`
                  : "linear-gradient(135deg, #fff 0%, #c8e6c9 100%)",
              border: theme.palette.mode === "dark" ? 1 : 0,
              borderColor: "divider",
              transition: "transform 0.2s, box-shadow 0.2s",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: 4
              }
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", mb: 1.5 }}>
              <Box sx={{ 
                p: { xs: 1, sm: 1.5 }, 
                borderRadius: 2, 
                bgcolor: theme.palette.mode === "dark" ? alpha(theme.palette.success.main, 0.2) : "rgba(27, 94, 32, 0.1)",
                mr: 1.5
              }}>
                <CalendarMonth sx={{ fontSize: { xs: 24, sm: 28 }, color: theme.palette.mode === "dark" ? "success.light" : "#1b5e20" }} />
              </Box>
              <Typography variant="subtitle2" sx={{ color: "text.secondary", fontWeight: 600, fontSize: { xs: "0.875rem", sm: "1rem" } }}>
                Target Period
              </Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ color: "text.primary", fontWeight: 600, fontSize: { xs: "0.875rem", sm: "1rem" }, mb: 0.5 }}>
                  {formatDate(targetStart)}
                </Typography>
                <Typography variant="body2" sx={{ color: "text.primary", fontWeight: 600, fontSize: { xs: "0.875rem", sm: "1rem" } }}>
                  to {formatDate(targetEnd)}
                </Typography>
              </Box>
              <Box sx={{ 
                display: "flex", 
                flexDirection: "column", 
                alignItems: "flex-end",
                borderLeft: "2px solid",
                borderLeftColor: theme.palette.mode === "dark" ? alpha(theme.palette.success.main, 0.35) : "rgba(27, 94, 32, 0.2)",
                pl: 2,
                minWidth: { xs: "80px", sm: "100px" }
              }}>
                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: { xs: "0.7rem", sm: "0.75rem" }, mb: 0.5 }}>
                  Days Remaining
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: "bold", color: theme.palette.mode === "dark" ? "success.light" : "#1b5e20", fontSize: { xs: "1.5rem", sm: "1.75rem" } }}>
                  {remainingDays}
                </Typography>
              </Box>
            </Box>
          </Card>
        </Box>

        {/* Target progress — same grid: Category | Target PC/UC | Achieved PC/UC | Balance PC/UC */}
        <Box sx={{ mb: 1.5 }}>
          <Typography
            id="distributor-target-progress-heading"
            variant="h6"
            fontWeight="bold"
            sx={{ fontSize: { xs: "1.1rem", sm: "1.25rem" }, mb: 0.5 }}
          >
            Target Progress Tracker
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 720, lineHeight: 1.55 }}>
            <strong>PC</strong> = physical cases, <strong>UC</strong> = unit cases. Compare Target to Achieved; Balance is what remains toward your goal.
          </Typography>
        </Box>

        <TableContainer
          component={Paper}
          elevation={theme.palette.mode === "dark" ? 4 : 2}
          sx={{
            borderRadius: 2,
            width: "100%",
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
            mb: 3,
            border: 1,
            borderColor: "divider",
          }}
        >
          <Table
            size="medium"
            aria-labelledby="distributor-target-progress-heading"
            sx={{
              width: "100%",
              borderCollapse: "collapse",
              tableLayout: "fixed",
              minWidth: { xs: 300, sm: 520 },
            }}
          >
            <caption style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0,0,0,0)", border: 0 }}>
              Target, achieved, and balance by category in PC and UC
            </caption>
            <TableHead>
              <TableRow>
                <TableCell
                  rowSpan={2}
                  align="center"
                  sx={{
                    fontWeight: 700,
                    color: theme.palette.primary.contrastText,
                    bgcolor: "primary.main",
                    p: { xs: 0.85, sm: 1.25 },
                    fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    width: { xs: "18%", sm: "auto" },
                    verticalAlign: "middle",
                    borderBottom: 0,
                  }}
                >
                  Category
                </TableCell>
                <TableCell
                  colSpan={2}
                  align="center"
                  sx={{
                    fontWeight: 700,
                    color: theme.palette.primary.contrastText,
                    bgcolor: "primary.main",
                    p: { xs: 0.85, sm: 1.25 },
                    fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    width: { xs: "27%", sm: "auto" },
                    borderBottom: 0,
                  }}
                >
                  Target
                </TableCell>
                <TableCell
                  colSpan={2}
                  align="center"
                  sx={{
                    fontWeight: 700,
                    color: theme.palette.primary.contrastText,
                    bgcolor: "primary.main",
                    p: { xs: 0.85, sm: 1.25 },
                    fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    width: { xs: "27%", sm: "auto" },
                    borderBottom: 0,
                  }}
                >
                  Achieved
                </TableCell>
                <TableCell
                  colSpan={2}
                  align="center"
                  sx={{
                    fontWeight: 700,
                    color: theme.palette.primary.contrastText,
                    bgcolor: "primary.main",
                    p: { xs: 0.85, sm: 1.25 },
                    fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    width: { xs: "28%", sm: "auto" },
                    borderBottom: 0,
                  }}
                >
                  Balance
                </TableCell>
              </TableRow>
              <TableRow sx={{ bgcolor: "secondary.main" }}>
                {Array(3)
                  .fill()
                  .map((_, i) => (
                    <React.Fragment key={i}>
                      <TableCell
                        align="center"
                        sx={{
                          fontWeight: 700,
                          color: (t) => t.palette.getContrastText(t.palette.secondary.main),
                          p: { xs: 0.65, sm: 1.15 },
                          fontSize: { xs: "0.7rem", sm: "0.8rem" },
                          lineHeight: { xs: 1.35, sm: 1.5 },
                          borderTop: 1,
                          borderColor: alpha(theme.palette.common.black, theme.palette.mode === "dark" ? 0.2 : 0.08),
                        }}
                      >
                        PC
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          fontWeight: 700,
                          color: (t) => t.palette.getContrastText(t.palette.secondary.main),
                          p: { xs: 0.65, sm: 1.15 },
                          fontSize: { xs: "0.7rem", sm: "0.8rem" },
                          lineHeight: { xs: 1.35, sm: 1.5 },
                          borderTop: 1,
                          borderColor: alpha(theme.palette.common.black, theme.palette.mode === "dark" ? 0.2 : 0.08),
                        }}
                      >
                        UC
                      </TableCell>
                    </React.Fragment>
                  ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {progressData.map((row, idx) => (
                <TableRow
                  key={idx}
                  hover
                  sx={{
                    transition: "background-color 0.15s ease",
                    "&:nth-of-type(odd)": {
                      bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.14 : 0.05),
                    },
                    "&:nth-of-type(even)": {
                      bgcolor: alpha(theme.palette.secondary.main, theme.palette.mode === "dark" ? 0.12 : 0.07),
                    },
                    "&:hover": {
                      bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.22 : 0.1),
                    },
                  }}
                >
                  <TableCell
                    align="center"
                    scope="row"
                    sx={{
                      p: { xs: 0.85, sm: 1.25 },
                      fontSize: { xs: "0.75rem", sm: "0.875rem" },
                      fontWeight: 700,
                      lineHeight: { xs: 1.45, sm: 1.6 },
                      borderTop: 1,
                      borderColor: "divider",
                    }}
                  >
                    {row.category}
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      p: { xs: 0.85, sm: 1.25 },
                      fontSize: { xs: "0.75rem", sm: "0.875rem" },
                      fontWeight: 700,
                      lineHeight: { xs: 1.45, sm: 1.6 },
                      fontVariantNumeric: "tabular-nums",
                      borderTop: 1,
                      borderColor: "divider",
                    }}
                  >
                    {row.targetPC.toLocaleString()}
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      p: { xs: 0.85, sm: 1.25 },
                      fontSize: { xs: "0.75rem", sm: "0.875rem" },
                      fontWeight: 700,
                      lineHeight: { xs: 1.45, sm: 1.6 },
                      fontVariantNumeric: "tabular-nums",
                      borderTop: 1,
                      borderColor: "divider",
                    }}
                  >
                    {Math.round(row.targetUC).toLocaleString()}
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      p: { xs: 0.85, sm: 1.25 },
                      fontSize: { xs: "0.75rem", sm: "0.875rem" },
                      fontWeight: 700,
                      lineHeight: { xs: 1.45, sm: 1.6 },
                      fontVariantNumeric: "tabular-nums",
                      borderTop: 1,
                      borderColor: "divider",
                    }}
                  >
                    {row.achievedPC.toLocaleString()}
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      p: { xs: 0.85, sm: 1.25 },
                      fontSize: { xs: "0.75rem", sm: "0.875rem" },
                      fontWeight: 700,
                      lineHeight: { xs: 1.45, sm: 1.6 },
                      fontVariantNumeric: "tabular-nums",
                      borderTop: 1,
                      borderColor: "divider",
                    }}
                  >
                    {Math.round(row.achievedUC).toLocaleString()}
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      p: { xs: 0.85, sm: 1.25 },
                      fontSize: { xs: "0.75rem", sm: "0.875rem" },
                      fontWeight: 700,
                      lineHeight: { xs: 1.45, sm: 1.6 },
                      fontVariantNumeric: "tabular-nums",
                      borderTop: 1,
                      borderColor: "divider",
                    }}
                  >
                    {(row.targetPC - row.achievedPC).toLocaleString()}
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      p: { xs: 0.85, sm: 1.25 },
                      fontSize: { xs: "0.75rem", sm: "0.875rem" },
                      fontWeight: 700,
                      lineHeight: { xs: 1.45, sm: 1.6 },
                      fontVariantNumeric: "tabular-nums",
                      borderTop: 1,
                      borderColor: "divider",
                    }}
                  >
                    {Math.round(row.targetUC - row.achievedUC).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Stock Lifting Record Table */}
        <Typography variant="h6" fontWeight="bold" sx={{ mt: 3, mb: 1, fontSize: { xs: "1.1rem", sm: "1.25rem" } }}>
          Stock lifting record
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 720 }}>
          Each row is a lift toward your target: <strong>CSD</strong> and <strong>Water (Kinley)</strong> in physical cases (PC) and unit cases (UC).
        </Typography>
        <Box sx={{ mb: 3 }}>
          <StockLiftingRecordsTable records={stockLiftingRecords} showTotalsRow />
        </Box>

      </Box>

      <Dialog
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: "1.15rem", pb: 0.5, color: "text.primary" }}>
          Notifications
        </DialogTitle>
        <Typography variant="body2" color="text.secondary" sx={{ px: 3, pb: 1.5 }}>
          Order status, target changes, twice-weekly target reminders (Mondays & Thursdays when you open the app), and other updates.
        </Typography>
        <DialogContent
          dividers
          sx={{
            bgcolor: "action.hover",
            maxHeight: { xs: "55vh", sm: 400 },
            py: 2,
          }}
        >
          {notifications.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 4, px: 2 }}>
              <InfoOutlinedIcon sx={{ fontSize: 40, color: "text.disabled", mb: 1 }} />
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                You’re all caught up. New activity will appear here.
              </Typography>
            </Box>
          ) : (
            <Stack spacing={1.25}>
              {notifications.map((note) => {
                const isOk = note.type === "success";
                const isErr = note.type === "error";
                const isWarn = note.type === "warning";
                const main = isOk
                  ? theme.palette.success.main
                  : isErr
                    ? theme.palette.error.main
                    : isWarn
                      ? theme.palette.warning.dark
                      : theme.palette.info.main;
                const bg = alpha(main, 0.1);
                const border = alpha(main, 0.35);
                const IconCmp = isOk ? CheckCircleOutlineIcon : isErr ? ErrorOutlineIcon : InfoOutlinedIcon;
                return (
                  <Paper
                    key={note.id}
                    elevation={0}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: border,
                      bgcolor: bg,
                    }}
                  >
                    <Box sx={{ display: "flex", gap: 1.25, alignItems: "flex-start" }}>
                      <IconCmp sx={{ fontSize: 22, color: main, mt: 0.15, flexShrink: 0 }} />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "text.primary", mb: 0.35 }}>
                          {note.headline || "Update"}
                        </Typography>
                        <Typography variant="body2" sx={{ color: "text.primary", lineHeight: 1.45, fontWeight: 500 }}>
                          {note.message}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
                          {note.timestamp}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.5, bgcolor: "background.paper" }}>
          <Button onClick={() => setNotifications([])} color="inherit" size="medium">
            Clear all
          </Button>
          <Button onClick={() => setNotificationsOpen(false)} variant="contained" size="medium" sx={{ fontWeight: 700 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <SalesDataRefreshNoticeDialog
        open={salesRefreshNoticeOpen}
        onClose={() => setSalesRefreshNoticeOpen(false)}
        liftingLineCount={stockLiftingRecords.length}
      />

      <AppSnackbar
        open={toast.open}
        title={toast.title}
        message={toast.message}
        severity={toast.severity}
        autoHideDuration={toast.duration}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      />

      {/* Fullscreen Calculator Dialog */}
      <Dialog 
        fullScreen 
        open={showCalculator} 
        onClose={() => {
          setShowCalculator(false);
          setEditingOrder(null);
          setCalculatorInitialInputs(null);
          setDistributorCurrentView("dashboard");
        }}
        disableEnforceFocus={false}
        disableAutoFocus={false}
      >
        <Box sx={{ p: 2, bgcolor: "background.default", minHeight: "100%", color: "text.primary" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h6" sx={{ color: "text.primary", fontWeight: 700 }}>
              {editingOrder ? "Update order" : "Place Order"}
            </Typography>
            <IconButton
              onClick={() => {
                setShowCalculator(false);
                setEditingOrder(null);
                setCalculatorInitialInputs(null);
                setDistributorCurrentView("dashboard");
              }}
              aria-label="close dialog"
              sx={{ color: "text.primary" }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
          <CokeCalculator
            distributorName={distributorName}
            distributorCode={distributorCode}
            schemes={activeSchemes}
            onPlaceOrder={handlePlaceOrder}
            productRates={productRates}
            fgStockBySku={fgStockBySku}
            initialInputs={calculatorInitialInputs}
            fixedOrderNumber={editingOrder?.orderNumber || null}
            placeOrderButtonText={editingOrder ? "Update Order" : "Place Order"}
            submitOrderButtonText={editingOrder ? "Submit Updated Order" : "Submit Order"}
            editContext={
              editingOrder
                ? {
                    isEdit: true,
                    orderKey: getOrderKey(editingOrder),
                    orderId: editingOrder.id || null,
                  }
                : null
            }
          />
        </Box>
        </Dialog>
        
        {/* Orders List Dialog */}
        <OrdersDialog
          open={openOrdersListDialog}
          onClose={() => {
            setOpenOrdersListDialog(false);
            setDistributorCurrentView("dashboard");
          }}
          orders={orders}
          distributorName={distributorName}
          onCancelOrder={handleCancelOrder}
          cancelingOrderId={cancelingOrderId}
          getOrderStatus={getOrderStatus}
          getOrderKey={getOrderKey}
          onEditOrder={handleEditOrderInCalculator}
          onOrderRowClick={handleViewOrderCalculatedTable}
        />

        <OrderCalculatedTableDialog
          open={openOrderCalculatedDialog}
          onClose={() => {
            setOpenOrderCalculatedDialog(false);
            setOrderForCalculatedTable(null);
          }}
          order={orderForCalculatedTable}
          distributorName={distributorName}
          getOrderStatus={getOrderStatus}
        />

        {/* Product Rate List Dialog - Placeholder */}
        <Dialog
          open={openProductRateDialog}
          onClose={() => {
            setOpenProductRateDialog(false);
            setDistributorCurrentView("dashboard");
          }}
          fullWidth
          maxWidth="md"
        >
          <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", bgcolor: "primary.main", color: "primary.contrastText" }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Product Rate List
            </Typography>
            <IconButton
              onClick={() => {
                setOpenProductRateDialog(false);
                setDistributorCurrentView("dashboard");
              }}
              sx={{ color: "primary.contrastText" }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 3, mt: 2 }}>
            <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 4 }}>
              Product rate list will be displayed here
            </Typography>
          </DialogContent>
        </Dialog>

        <Dialog
          open={openStockLiftingDialog}
          onClose={() => {
            setOpenStockLiftingDialog(false);
            setDistributorCurrentView("dashboard");
          }}
          fullWidth
          maxWidth="lg"
          fullScreen={isMobile}
        >
          <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", bgcolor: "primary.main", color: "primary.contrastText" }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Stock lifting record
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.95, display: "block", mt: 0.5 }}>
                {distributorName}
              </Typography>
            </Box>
            <IconButton
              onClick={() => {
                setOpenStockLiftingDialog(false);
                setDistributorCurrentView("dashboard");
              }}
              sx={{ color: "primary.contrastText" }}
              aria-label="close"
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: { xs: 1.5, sm: 2.5 }, pt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
              Lifts recorded for your account (from sales data). <strong>PC</strong> = physical cases, <strong>UC</strong> = unit cases. Compare with your target balance on the dashboard.
            </Typography>
            <StockLiftingRecordsTable
              records={stockLiftingRecords}
              stickyHeader
              headerLayout="flat"
              showTotalsRow
              maxHeight={{ xs: "calc(100vh - 220px)", sm: "60vh" }}
              emptyMessage="When the admin uploads sales for your distributor code, lifts will appear here."
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button
              onClick={() => {
                setOpenStockLiftingDialog(false);
                setDistributorCurrentView("dashboard");
              }}
              variant="contained"
              sx={{ bgcolor: "primary.main", "&:hover": { bgcolor: "primary.dark" } }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>

        <DistributorPhysicalStockDialog
          open={openPhysicalStockDialog}
          onClose={() => {
            setOpenPhysicalStockDialog(false);
            setDistributorCurrentView("dashboard");
          }}
          distributorCode={distributorCode}
          distributorName={distributorName}
          distributor={distributor}
          isSupabaseConfigured={isSupabaseConfigured}
          setDistributor={setDistributor}
          showToast={showToast}
          onDialogOpened={handlePhysicalStockDialogOpened}
          onPhysicalStockAcknowledged={handlePhysicalStockAcknowledged}
        />
    </Box>
  );
}

export default DistributorDashboard;
