import React, { useState, useMemo, useRef } from "react";
import {
  Dialog,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Chip,
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DeleteIcon from "@mui/icons-material/Delete";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { parseExcelFile } from "../utils/excelUtils";
import { parseFirestoreDate } from "../utils/dateUtils";
import { logger } from "../utils/logger";
import AppSnackbar from "./AppSnackbar";

/**
 * ReportsDialog - Rebuilt for sales data reporting
 * 
 * Features:
 * 1. Upload sales data (Excel format, headers at row 4)
 * 2. Date range filtering
 * 3. Distributor Performance Report (CSD/Water PC/UC per distributor)
 * 4. CSD SKU-wise Report (highest selling products for production forecasting)
 * 
 * Props:
 * - open, onClose
 * - distributors: array of all distributors
 * - salesData: array of sales data from Firebase
 */
export default function ReportsDialog({ open, onClose, distributors = [], salesData = [], onSalesDataUploaded, canWrite = true }) {
  // Report type tabs
  const [reportType, setReportType] = useState("performance"); // "performance" or "sku"
  
  // Date filtering
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateError, setDateError] = useState("");
  
  // Region filtering (single select - only for "performance" report)
  const [selectedRegion, setSelectedRegion] = useState("All");
  
  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ total: 0, processed: 0, saved: 0 });
  const hiddenFileRef = useRef(null);
  
  // Local sales data - ONLY from uploads in this dialog (persisted in localStorage)
  const [localSalesData, setLocalSalesData] = useState(() => {
    // Load from localStorage on initialization
    try {
      const stored = localStorage.getItem("reports_sales_data");
      if (!stored) return [];
      const data = JSON.parse(stored);
      // Convert date strings back to Date objects
      return data.map(record => ({
        ...record,
        invoiceDate: record.invoiceDate ? new Date(record.invoiceDate) : new Date()
      }));
    } catch (e) {
      console.error("Error loading sales data from localStorage:", e);
      return [];
    }
  });
  
  // Track uploaded files with their data (persisted in localStorage)
  const [uploadedFiles, setUploadedFiles] = useState(() => {
    // Load from localStorage on initialization
    try {
      const stored = localStorage.getItem("reports_uploaded_files");
      if (!stored) return [];
      const files = JSON.parse(stored);
      // Convert date strings back to Date objects and fix data dates
      return files.map(file => ({
        ...file,
        uploadDate: file.uploadDate ? new Date(file.uploadDate) : new Date(),
        data: file.data ? file.data.map(record => ({
          ...record,
          invoiceDate: record.invoiceDate ? new Date(record.invoiceDate) : new Date()
        })) : []
      }));
    } catch (e) {
      console.error("Error loading uploaded files from localStorage:", e);
      return [];
    }
  });
  
  // Snackbar notifications
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });
  const showSnackbar = (message, severity = "info") => {
    setSnackbar({ open: true, message, severity });
  };
  
  // PDF export state
  const [exportingPDF, setExportingPDF] = useState(false);
  const tableRef = useRef(null);
  
  // Save localSalesData to localStorage whenever it changes
  React.useEffect(() => {
    if (localSalesData && localSalesData.length > 0) {
      try {
        // Convert Date objects to ISO strings for localStorage
        const serializableData = localSalesData.map(record => ({
          ...record,
          invoiceDate: record.invoiceDate instanceof Date 
            ? record.invoiceDate.toISOString() 
            : record.invoiceDate
        }));
        localStorage.setItem("reports_sales_data", JSON.stringify(serializableData));
      } catch (e) {
        console.error("Error saving sales data to localStorage:", e);
      }
    } else if (localSalesData.length === 0) {
      // Only clear localStorage if explicitly empty (not on initial mount)
      try {
        localStorage.removeItem("reports_sales_data");
      } catch (e) {
        console.error("Error clearing sales data from localStorage:", e);
      }
    }
  }, [localSalesData]);
  
  // Save uploadedFiles to localStorage whenever it changes
  React.useEffect(() => {
    if (uploadedFiles && uploadedFiles.length > 0) {
      try {
        // Convert Date objects to ISO strings for localStorage
        const serializableFiles = uploadedFiles.map(file => ({
          ...file,
          uploadDate: file.uploadDate instanceof Date 
            ? file.uploadDate.toISOString() 
            : file.uploadDate,
          // Also serialize data dates
          data: file.data ? file.data.map(record => ({
            ...record,
            invoiceDate: record.invoiceDate instanceof Date 
              ? record.invoiceDate.toISOString() 
              : record.invoiceDate
          })) : []
        }));
        localStorage.setItem("reports_uploaded_files", JSON.stringify(serializableFiles));
      } catch (e) {
        console.error("Error saving uploaded files to localStorage:", e);
      }
    } else if (uploadedFiles.length === 0) {
      // Only clear localStorage if explicitly empty (not on initial mount)
      try {
        localStorage.removeItem("reports_uploaded_files");
      } catch (e) {
        console.error("Error clearing uploaded files from localStorage:", e);
      }
    }
  }, [uploadedFiles]);
  
  // Debug: Log distributors when they change or dialog opens
  React.useEffect(() => {
    if (open) {
      logger.log("ReportsDialog opened - Distributors check:");
      logger.log("- distributors prop received:", distributors?.length || 0);
      logger.log("- distributor names:", distributors?.map(d => d.name) || []);
      logger.log("- distributor codes:", distributors?.map(d => d.code) || []);
      
      // Log region distribution
      const regionCounts = {};
      distributors?.forEach(d => {
        const region = d.region || "Unknown";
        regionCounts[region] = (regionCounts[region] || 0) + 1;
      });
      logger.log("- region distribution:", regionCounts);
      logger.log("- unique regions:", Object.keys(regionCounts));
    }
  }, [open, distributors]);
  
  // Date validation
  const validateDateRange = (start, end) => {
    if (!start || !end) {
      setDateError("");
      return true;
    }
    
    const startDateObj = new Date(start);
    const endDateObj = new Date(end);
    
    if (endDateObj < startDateObj) {
      setDateError("End date must be after start date");
      return false;
    }
    
    setDateError("");
    return true;
  };
  
  // Filter sales data by date range and distributor selection
  // Note: Distributor filter only applies to "Distributor Performance" report
  const filteredSalesData = useMemo(() => {
    let filtered = localSalesData;
    
    // Filter by date range
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Include entire end date
      
      filtered = filtered.filter(record => {
        const invoiceDate = parseFirestoreDate(record.invoiceDate);
        return invoiceDate >= start && invoiceDate <= end;
      });
    }
    
    // Filter by selected region (only for "performance" report type)
    if (reportType === "performance" && selectedRegion && selectedRegion !== "All") {
      // Helper function to normalize strings (same as upload matching)
      const normalize = (s) => {
        if (!s) return "";
        return s.toString()
          .trim()
          .toLowerCase()
          .replace(/\s+/g, " ")
          .replace(/[.,\-_]/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      };
      
      const selectedRegionLower = String(selectedRegion).toLowerCase().trim();
      let matchedCount = 0;
      let unmatchedCount = 0;
      
      filtered = filtered.filter(record => {
        // Prefer matchedDistributorName (from upload matching) over original distributorName
        const distName = record.matchedDistributorName || record.distributorName || "";
        const distCode = record.distributorCode || "";
        
        // Find the distributor in the distributors list using multiple strategies
        let distributor = null;
        
        // Strategy 1: Try exact match by code (most reliable)
        if (distCode) {
          distributor = distributors.find(d => d.code === distCode);
        }
        
        // Strategy 2: Try exact match by matchedDistributorName
        if (!distributor && record.matchedDistributorName) {
          distributor = distributors.find(d => d.name === record.matchedDistributorName);
        }
        
        // Strategy 3: Try normalized name match
        if (!distributor && distName) {
          const normalizedDistName = normalize(distName);
          distributor = distributors.find(d => {
            const normalizedDName = normalize(d.name);
            return normalizedDName === normalizedDistName;
          });
        }
        
        // Strategy 4: Try partial match (one name contains the other)
        if (!distributor && distName) {
          const normalizedDistName = normalize(distName);
          distributor = distributors.find(d => {
            const normalizedDName = normalize(d.name);
            return normalizedDistName.includes(normalizedDName) || 
                   normalizedDName.includes(normalizedDistName);
          });
        }
        
        // If no distributor found, exclude this record
        if (!distributor || !distributor.region) {
          unmatchedCount++;
          logger.log(`Region filter: Could not find distributor for record: ${distName} (code: ${distCode})`);
          return false;
        }
        
        // Match region (case-insensitive, handle variations like "Southern" vs "South")
        const recordRegion = String(distributor.region).toLowerCase().trim();
        
        // Direct match
        if (recordRegion === selectedRegionLower) {
          matchedCount++;
          return true;
        }
        
        // Handle partial matches (e.g., "south" in "southern")
        if (selectedRegionLower === "southern" && recordRegion.includes("south")) {
          matchedCount++;
          return true;
        }
        if (selectedRegionLower === "western" && recordRegion.includes("west")) {
          matchedCount++;
          return true;
        }
        if (selectedRegionLower === "eastern" && recordRegion.includes("east")) {
          matchedCount++;
          return true;
        }
        
        // Region doesn't match
        logger.log(`Region filter: Record "${distName}" has region "${distributor.region}" (normalized: "${recordRegion}"), selected: "${selectedRegion}" (normalized: "${selectedRegionLower}") - NO MATCH`);
        return false;
      });
      
      logger.log(`Region filter applied: ${matchedCount} records matched, ${unmatchedCount} records excluded for region "${selectedRegion}"`);
    }
    
    return filtered;
  }, [localSalesData, startDate, endDate, selectedRegion, distributors, reportType]);
  
  // Helper: Convert PC to UC based on product SKU
  // Handles product names from Excel: "WATER 200 ML", "K WATER 500 ML", "K WATER R 1L", "COKE 300 ML", etc.
  const convertPCtoUC = (pc, sku) => {
    if (!pc || !sku) return 0;
    const pcNum = Number(pc) || 0;
    if (pcNum === 0) return 0;
    
    const skuLower = sku.toString().toLowerCase().trim().replace(/\s+/g, " ");
    
    // Exclude can products (they don't follow standard PC to UC conversion)
    if (skuLower.includes("can") || skuLower.includes("tin")) {
      return 0; // Cans are excluded from UC calculations
    }
    
    // Water Products - 200ml (e.g., "WATER 200 ML", "KINLEY 200ML")
    if ((skuLower.includes("200ml") || skuLower.includes("200 ml")) && 
        (skuLower.includes("water") || skuLower.includes("kinley"))) {
      return (pcNum * 4.8) / 5.678;
    }
    
    // CSD Products - 300ml (e.g., "COKE 300 ML", "FANTA 300 ML", "SPRITE 300 ML", "CHARGED 300 ML")
    if ((skuLower.includes("300ml") || skuLower.includes("300 ml")) && 
        !skuLower.includes("can")) {
      return (pcNum * 7.2) / 5.678;
    }
    
    // Water Products - 500ml (e.g., "K WATER 500 ML", "KINLEY 500ML")
    if ((skuLower.includes("500ml") || skuLower.includes("500 ml")) && 
        (skuLower.includes("water") || skuLower.includes("kinley"))) {
      return (pcNum * 12) / 5.678;
    }
    
    // CSD Products - 500ml (e.g., "COKE 500 ML", "FANTA A 500 ML", "SPRITE E 500 ML")
    if ((skuLower.includes("500ml") || skuLower.includes("500 ml")) && 
        !skuLower.includes("water") && !skuLower.includes("kinley")) {
      return (pcNum * 12) / 5.678;
    }
    
    // CSD Products - 1.25L (e.g., "COKE 1.25 L", "FANTA 1.25 L", "SPRITE E 1.25 L")
    if (skuLower.includes("1.25l") || skuLower.includes("1.25 l") || 
        skuLower.includes("1.25ltr") || skuLower.includes("1.25 ltr")) {
      return (pcNum * 15) / 5.678;
    }
    
    // Water Products - 1L (e.g., "K WATER R 1L", "K WATER 1L", "KINLEY 1L")
    if ((skuLower.includes("1l") || skuLower.includes("1 l") || skuLower.includes("1ltr") || skuLower.includes("1 ltr")) && 
        (skuLower.includes("water") || skuLower.includes("kinley"))) {
      return (pcNum * 12) / 5.678;
    }
    
    return 0; // Unknown SKU - no conversion
  };
  
  // 1. DISTRIBUTOR PERFORMANCE REPORT
  // Aggregates sales data by distributor, showing CSD and Water PC/UC
  const performanceReport = useMemo(() => {
    const report = {};
    
    filteredSalesData.forEach(record => {
      const distName = record.distributorName || record.matchedDistributorName || "Unknown";
      
      if (!report[distName]) {
        report[distName] = {
          name: distName,
          code: record.distributorCode || null,
          csdPC: 0,
          csdUC: 0,
          waterPC: 0,
          waterUC: 0,
        };
      }
      
      // Calculate PC/UC from products array (preferred - more accurate)
      // If products array exists, use it; otherwise fall back to stored values
      if (record.products && Array.isArray(record.products) && record.products.length > 0) {
        record.products.forEach(product => {
          if (!product || !product.sku) return;
          
          const pc = Number(product.quantity) || 0;
          if (pc === 0) return;
          
          const category = product.category || "Unknown";
          const uc = convertPCtoUC(pc, product.sku);
          
          if (category === "CSD") {
            report[distName].csdPC += pc;
            report[distName].csdUC += uc;
          } else if (category === "Water") {
            report[distName].waterPC += pc;
            report[distName].waterUC += uc;
          }
        });
      } else {
        // Fall back to stored values if products array is not available
        report[distName].csdPC += Number(record.csdPC) || 0;
        report[distName].csdUC += Number(record.csdUC) || 0;
        report[distName].waterPC += Number(record.waterPC) || 0;
        report[distName].waterUC += Number(record.waterUC) || 0;
      }
    });
    
    // Convert to array, sort by total UC (descending), and add ranks
    const sortedReport = Object.values(report)
      .map(item => ({
        ...item,
        csdPC: Math.round(item.csdPC),
        csdUC: Math.round(item.csdUC * 100) / 100, // 2 decimal places
        waterPC: Math.round(item.waterPC),
        waterUC: Math.round(item.waterUC * 100) / 100,
        totalUC: Math.round((item.csdUC + item.waterUC) * 100) / 100, // Total UC for ranking
      }))
      .sort((a, b) => b.totalUC - a.totalUC); // Sort by total UC descending
    
    // Add rank to each item (handle ties - same rank for same total UC)
    let currentRank = 1;
    let previousTotalUC = null;
    
    return sortedReport.map((item, index) => {
      if (previousTotalUC !== null && item.totalUC !== previousTotalUC) {
        currentRank = index + 1;
      }
      previousTotalUC = item.totalUC;
      return {
        ...item,
        rank: currentRank,
      };
    });
  }, [filteredSalesData]);
  
  // 2. CSD SKU-WISE REPORT
  // Shows highest selling CSD products for production forecasting
  const skuReport = useMemo(() => {
    const skuMap = new Map(); // SKU -> { sku, totalPC, totalUC, category }
    
    filteredSalesData.forEach(record => {
      if (record.products && Array.isArray(record.products)) {
        record.products.forEach(product => {
          if (!product || !product.sku) return;
          
          const category = product.category || "Unknown";
          if (category !== "CSD") return; // Only CSD products
          
          const sku = product.sku.toString().trim();
          const pc = Number(product.quantity) || 0;
          if (pc === 0) return;
          
          const uc = convertPCtoUC(pc, sku);
          
          if (!skuMap.has(sku)) {
            skuMap.set(sku, {
              sku: sku,
              category: category,
              totalPC: 0,
              totalUC: 0,
            });
          }
          
          const skuData = skuMap.get(sku);
          skuData.totalPC += pc;
          skuData.totalUC += uc;
        });
      }
    });
    
    // Convert to array, sort by totalPC (highest first), and round values
    return Array.from(skuMap.values())
      .map(item => ({
        ...item,
        totalPC: Math.round(item.totalPC),
        totalUC: Math.round(item.totalUC * 100) / 100, // 2 decimal places
      }))
      .sort((a, b) => b.totalPC - a.totalPC); // Sort by PC descending
  }, [filteredSalesData]);
  
  // Handle sales data upload
  const handleSalesDataUpload = async (file) => {
    if (!file) return;
    if (!canWrite) {
      alert("You don't have permission to upload data. Only admins can upload data.");
      return;
    }
    
    // Debug: Check distributors - detailed logging
    logger.log("=== Upload Sales Data - Distributors Check ===");
    logger.log("- distributors prop type:", typeof distributors);
    logger.log("- distributors is array:", Array.isArray(distributors));
    logger.log("- distributors.length:", distributors?.length || 0);
    logger.log("- distributors value:", distributors);
    
    if (distributors && distributors.length > 0) {
      logger.log("- ✅ Distributors found:", distributors.length);
      logger.log("- First 5 distributor names:", distributors.slice(0, 5).map(d => d.name || d.code));
      logger.log("- First 5 distributor codes:", distributors.slice(0, 5).map(d => d.code));
    } else {
      logger.error("❌ NO DISTRIBUTORS FOUND!");
      logger.error("- distributors is null/undefined:", distributors === null || distributors === undefined);
      logger.error("- distributors is empty array:", Array.isArray(distributors) && distributors.length === 0);
      logger.error("- Please check AdminDashboard is passing distributors prop correctly");
      logger.error("- Check browser console for 'ReportsDialog opened - Distributors check' message");
    }
    
    // Log distributor availability (no blocking warning if distributors exist)
    if (!distributors || distributors.length === 0) {
      logger.warn("⚠️ No distributors found in app! Upload will continue but all records will be skipped.");
      // Only show warning if truly no distributors exist
      showSnackbar("⚠️ No distributors found in app. Please add distributors in the Distributors section first, then upload again.", "warning");
      // Continue anyway - we can still save data, just with null distributor codes
    } else {
      logger.log("✅ Distributors available for matching:", distributors.length);
      // Don't show warning if distributors exist - only show it if some records fail to match later
    }
    
    // Validate file type
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "application/excel"
    ];
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
      showSnackbar("Please upload a valid Excel file (.xlsx or .xls)", "error");
      return;
    }
    
    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      showSnackbar("File size exceeds 10MB. Please upload a smaller file.", "error");
      return;
    }
    
    setUploading(true);
    setUploadProgress({ total: 0, processed: 0, saved: 0 });
    
    try {
      logger.log("Parsing Excel for sales data...");
      logger.log("File name:", file.name);
      logger.log("Available distributors:", distributors.length);
      
      // Parse Excel file (handles headers starting at row 4)
      const parseResult = await parseExcelFile(file);
      const salesDataFromFile = parseResult.salesData || [];
      const achievements = parseResult.achievements || {};
      
      logger.log(`Found ${salesDataFromFile.length} sales data records`);
      
      if (salesDataFromFile.length === 0 && Object.keys(achievements).length === 0) {
        showSnackbar("No sales data found in Excel file. Please check the file format.\n\nMake sure:\n- Headers are in row 4\n- 'Party Name / Address' column exists\n- Product columns contain quantities\n- Invoice Date column exists", "warning");
        setUploading(false);
        return;
      }
      
      setUploadProgress(prev => ({ ...prev, total: salesDataFromFile.length }));
      
      // Try to import Firebase functions
      let saveSalesDataBatchFn = null;
      let TimestampFn = null;
      
      try {
        const firebaseService = await import("../services/firebaseService");
        saveSalesDataBatchFn = firebaseService.saveSalesDataBatch;
        const firestore = await import("firebase/firestore");
        TimestampFn = firestore.Timestamp;
      } catch (e) {
        logger.warn("Firebase not available, saving to local state only");
      }
      
      // Enhanced distributor matching function
      const findDistributor = (saleName) => {
        if (!saleName) return null;
        if (!distributors || distributors.length === 0) return null; // No distributors available
        
        // Skip non-distributor rows (like "Total", "Grand Total", etc.)
        const normalizedForCheck = saleName.toString().trim().toLowerCase();
        if (normalizedForCheck === "total" || 
            normalizedForCheck.includes("total :") ||
            normalizedForCheck.includes("grand total") ||
            normalizedForCheck === "sum" ||
            normalizedForCheck.startsWith("si no") ||
            normalizedForCheck === "") {
          return null; // Not a distributor name
        }
        
        // Extract name part before comma (location suffix)
        let cleanSaleName = saleName.toString().trim();
        if (cleanSaleName.includes(",")) {
          cleanSaleName = cleanSaleName.split(",")[0].trim();
        }
        
        const normalize = (s) => {
          if (!s) return "";
          return s.toString()
            .trim()
            .toLowerCase()
            .replace(/\s+/g, " ")
            .replace(/[.,\-_]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
        };
        
        const normalizedSaleName = normalize(cleanSaleName);
        
        // Strategy 1: Try exact match
        let match = distributors.find(d => normalize(d.name) === normalizedSaleName);
        if (match) {
          logger.log(`Matched "${saleName}" -> "${match.name}" (exact match)`);
          return match;
        }
        
        // Strategy 2: Try partial match
        match = distributors.find(d => {
          const normalizedDistName = normalize(d.name);
          return normalizedSaleName.includes(normalizedDistName) || 
                 normalizedDistName.includes(normalizedSaleName);
        });
        if (match) {
          logger.log(`Matched "${saleName}" -> "${match.name}" (partial match)`);
          return match;
        }
        
        // Strategy 3: Try business terms removal
        const removeBusinessTerms = (name) => {
          return name
            .replace(/\b(private|limited|ltd|pvt|inc|corp|company|co)\b/gi, "")
            .replace(/\s+/g, " ")
            .trim();
        };
        
        const cleanedSaleName = normalize(removeBusinessTerms(cleanSaleName));
        match = distributors.find(d => {
          const cleanedDistName = normalize(removeBusinessTerms(d.name));
          return cleanedDistName === cleanedSaleName ||
                 cleanedSaleName.includes(cleanedDistName) ||
                 cleanedDistName.includes(cleanedSaleName);
        });
        if (match) {
          logger.log(`Matched "${saleName}" -> "${match.name}" (business terms removed)`);
          return match;
        }
        
        // Strategy 4: Try first words match
        const saleWords = normalizedSaleName.split(" ").filter(w => w.length > 2);
        if (saleWords.length > 0) {
          const firstWords = saleWords.slice(0, 2).join(" ");
          match = distributors.find(d => {
            const distWords = normalize(d.name).split(" ").filter(w => w.length > 2);
            const distFirstWords = distWords.slice(0, 2).join(" ");
            return distFirstWords === firstWords || 
                   distFirstWords.includes(firstWords) ||
                   firstWords.includes(distFirstWords);
          });
        }
        
        if (match) {
          logger.log(`Matched "${saleName}" -> "${match.name}" (first words match)`);
        } else {
          logger.warn(`Could not match "${saleName}" (cleaned: "${cleanSaleName}")`);
        }
        
        return match || null;
      };
      
      // Match distributors and prepare data for saving
      const salesDataToSave = salesDataFromFile.map(sale => {
        const distributor = findDistributor(sale.distributorName);
        
        return {
          distributorCode: distributor?.code || null,
          distributorName: sale.distributorName,
          matchedDistributorName: distributor?.name || null,
          invoiceDate: sale.invoiceDate,
          products: sale.products || [],
          csdPC: sale.csdPC || 0,
          csdUC: sale.csdUC || 0,
          waterPC: sale.waterPC || 0,
          waterUC: sale.waterUC || 0,
          totalUC: sale.totalUC || 0,
          source: "reports_upload",
        };
      });
      
      // Filter valid sales data (must have distributor match)
      // Note: We check for matchedDistributorName instead of distributorCode because
      // some distributors might not have codes assigned yet, but we still matched them
      const validSalesData = salesDataToSave.filter(sale => sale.matchedDistributorName);
      const unmatchedSalesData = salesDataToSave.filter(sale => !sale.matchedDistributorName);
      
      // Save to Firebase
      let savedToFirebase = 0;
      if (saveSalesDataBatchFn && validSalesData.length > 0) {
        try {
          const salesDataWithTimestamps = validSalesData.map(sale => ({
            ...sale,
            invoiceDate: TimestampFn.fromDate(sale.invoiceDate)
          }));
          
          await saveSalesDataBatchFn(salesDataWithTimestamps);
          savedToFirebase = validSalesData.length;
          logger.log(`✅ Saved ${savedToFirebase} sales data records to Firebase`);
        } catch (firebaseError) {
          logger.error("Error saving to Firebase:", firebaseError);
        }
      }
      
      // Update local state - REPLACE existing data with new upload
      // Track file information for management
      const localFormattedData = validSalesData.map(sale => ({
        ...sale,
        invoiceDate: sale.invoiceDate instanceof Date ? sale.invoiceDate : new Date(sale.invoiceDate),
        uploadedFileName: file.name, // Track which file this record came from
      }));
      
      // Add file to uploaded files list (keep history of all uploads)
      setUploadedFiles(prev => {
        // Check if file already exists (by name) - replace it
        const existingIndex = prev.findIndex(f => f.fileName === file.name);
        if (existingIndex >= 0) {
          // Replace existing file data
          const updated = [...prev];
          updated[existingIndex] = {
            fileName: file.name,
            uploadDate: new Date(),
            recordCount: validSalesData.length,
            data: localFormattedData,
          };
          return updated;
        } else {
          // Add new file to history
          return [...prev, {
            fileName: file.name,
            uploadDate: new Date(),
            recordCount: validSalesData.length,
            data: localFormattedData,
          }];
        }
      });
      
      // REPLACE all local sales data with new upload (as requested)
      setLocalSalesData(localFormattedData);
      setUploadProgress(prev => ({ ...prev, processed: salesDataFromFile.length, saved: validSalesData.length }));
      
      if (onSalesDataUploaded) {
        onSalesDataUploaded(localFormattedData);
      }
      
      // Show success message
      let message = `Successfully uploaded ${validSalesData.length} sales record(s)!`;
      if (savedToFirebase > 0) {
        message += ` ${savedToFirebase} record(s) saved to Firebase.`;
      }
      // Filter out non-distributor names from unmatched list (like "Total", etc.)
      const actualUnmatchedDistributors = unmatchedSalesData
        .map(s => s.distributorName)
        .filter(name => {
          const normalized = name?.toString().trim().toLowerCase() || "";
          return normalized && 
                 !normalized.includes("total") && 
                 !normalized.includes("sum") &&
                 normalized !== "" &&
                 !normalized.startsWith("si no");
        });
      
      const actualSkippedCount = actualUnmatchedDistributors.length;
      
      if (actualSkippedCount > 0) {
        const unmatchedNames = [...new Set(actualUnmatchedDistributors)].slice(0, 5).join(", ");
        const moreCount = actualSkippedCount > 5 ? ` and ${actualSkippedCount - 5} more` : "";
        const availableDistCount = distributors?.length || 0;
        
        message += `\n\n⚠️ ${actualSkippedCount} record(s) skipped - Distributor name from Excel not found in app: ${unmatchedNames}${moreCount}`;
        if (availableDistCount > 0) {
          message += `\n\n💡 Tip: Add missing distributors in the Distributors section, then upload again.`;
        }
        
        logger.warn("Unmatched distributors (excluding totals):", [...new Set(actualUnmatchedDistributors)].slice(0, 10));
        
        showSnackbar(message, "warning");
      } else {
        message += ` You can now generate reports using the uploaded data.`;
        showSnackbar(message, "success");
      }
      
    } catch (error) {
      logger.error("Error uploading sales data:", error);
      showSnackbar(`Failed to upload sales data: ${error.message || "Unknown error"}`, "error");
    } finally {
      setUploading(false);
      setUploadProgress({ total: 0, processed: 0, saved: 0 });
    }
  };
  
  // Trigger file upload
  const triggerFileUpload = () => {
    hiddenFileRef.current?.click();
  };
  
  const onFileChange = (e) => {
    if (!canWrite) {
      alert("You don't have permission to upload data. Only admins can upload data.");
      e.target.value = ""; // Reset
      return;
    }
    const file = e.target.files?.[0];
    if (file) {
      handleSalesDataUpload(file);
    }
    e.target.value = ""; // Reset so same file can be selected again
  };
  
  // Excel Export
  const handleDownloadExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      
      if (reportType === "performance") {
        const wsData = [
          ["Distributor Performance Report"],
          [startDate && endDate ? `Date Range: ${startDate} to ${endDate}` : "All Data"],
          [],
          ["Distributor", "CSD PC", "CSD UC", "Water PC", "Water UC"],
          ...performanceReport.map(row => [
            row.name,
            row.csdPC,
            row.csdUC.toFixed(2),
            row.waterPC,
            row.waterUC.toFixed(2),
          ]),
        ];
        
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, "Distributor Performance");
      } else {
        const wsData = [
          ["CSD SKU Sales Report"],
          [startDate && endDate ? `Date Range: ${startDate} to ${endDate}` : "All Data"],
          [],
          ["SKU", "Total PC", "Total UC"],
          ...skuReport.map(row => [
            row.sku,
            row.totalPC,
            row.totalUC.toFixed(2),
          ]),
        ];
        
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, "CSD SKU Sales");
      }
      
      XLSX.writeFile(wb, `Sales_Report_${new Date().toISOString().split("T")[0]}.xlsx`);
      showSnackbar("Report exported to Excel successfully!", "success");
    } catch (error) {
      logger.error("Error exporting to Excel:", error);
      showSnackbar("Failed to export to Excel: " + (error.message || "Unknown error"), "error");
    }
  };
  
  // PDF Export
  const handleDownloadPDF = async () => {
    if (!tableRef.current) return;
    
    setExportingPDF(true);
    try {
      // Find the TableContainer inside the Box ref
      const boxElement = tableRef.current;
      const tableContainer = boxElement.querySelector('.MuiTableContainer-root') || boxElement;
      
      // Temporarily remove height constraints
      const originalStyles = {
        maxHeight: tableContainer.style.maxHeight,
        overflow: tableContainer.style.overflow,
        height: tableContainer.style.height,
      };
      tableContainer.style.maxHeight = "none";
      tableContainer.style.overflow = "visible";
      tableContainer.style.height = "auto";
      
      // Scroll to top
      tableContainer.scrollTop = 0;
      
      // Wait for styles to apply
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Capture with full scrollable dimensions
      const canvas = await html2canvas(tableContainer, {
        scale: 2,
        useCORS: true,
        logging: false,
        width: tableContainer.scrollWidth,
        height: tableContainer.scrollHeight,
        windowWidth: tableContainer.scrollWidth,
        windowHeight: tableContainer.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        allowTaint: true,
        removeContainer: false,
      });
      
      // Restore original styles
      tableContainer.style.maxHeight = originalStyles.maxHeight;
      tableContainer.style.overflow = originalStyles.overflow;
      tableContainer.style.height = originalStyles.height;

      const imgData = canvas.toDataURL("image/png", 1.0);
      
      // Force landscape using positional constructor (most reliable across jsPDF versions)
      const pdf = new jsPDF("l", "mm", "a4");
      
      const pdfWidth = pdf.internal.pageSize.getWidth();   // ~297 mm
      const pdfHeight = pdf.internal.pageSize.getHeight();  // ~210 mm
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      const margin = 10; // 10mm margin on all sides
      const availableWidth = pdfWidth - (margin * 2);
      const availableHeight = pdfHeight - (margin * 2) - 15; // Extra space for title
      
      // Scale to fill full landscape width; only shrink vertically if needed
      const widthRatio = availableWidth / imgWidth;
      const ratio = (imgHeight * widthRatio > availableHeight)
        ? Math.min(widthRatio, availableHeight / imgHeight)
        : widthRatio;
      const imgScaledWidth = imgWidth * ratio;
      const imgScaledHeight = imgHeight * ratio;
      
      // Add title
      pdf.setFontSize(16);
      const reportTitle = reportType === "performance" ? "Distributor Performance Report" : "CSD SKU Sales Report";
      pdf.text(reportTitle, pdfWidth / 2, 12, { align: "center" });
      
      // Add date and filter info
      pdf.setFontSize(10);
      const dateStr = new Date().toLocaleDateString();
      let filterStr = "";
      if (startDate && endDate) {
        filterStr += `Date: ${startDate} - ${endDate}`;
      }
      if (reportType === "performance" && selectedRegion && selectedRegion !== "All") {
        if (filterStr) filterStr += " | ";
        filterStr += `Region: ${selectedRegion}`;
      }
      if (filterStr) {
        pdf.text(`Generated: ${dateStr} | ${filterStr}`, pdfWidth / 2, 18, { align: "center" });
      } else {
        pdf.text(`Generated: ${dateStr}`, pdfWidth / 2, 18, { align: "center" });
      }
      
      // Add the table image (centered horizontally, with margins)
      const startX = (pdfWidth - imgScaledWidth) / 2;
      const startY = 25; // Start after title
      
      // If content fits on one page
      if (imgScaledHeight <= availableHeight) {
        pdf.addImage(imgData, "PNG", startX, startY, imgScaledWidth, imgScaledHeight);
      } else {
        // Split across multiple pages
        let yPosition = startY;
        let sourceY = 0;
        const pageHeight = pdfHeight - startY - margin;
        
        while (sourceY < imgHeight) {
          // Calculate how much of the image fits on this page
          const remainingHeight = imgHeight - sourceY;
          const scaledRemainingHeight = remainingHeight * ratio;
          const heightToShow = Math.min(scaledRemainingHeight, pageHeight);
          const sourceHeight = heightToShow / ratio;
          
          // Create a temporary canvas for this page
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = imgWidth;
          pageCanvas.height = sourceHeight;
          const ctx = pageCanvas.getContext('2d');
          ctx.drawImage(canvas, 0, sourceY, imgWidth, sourceHeight, 0, 0, imgWidth, sourceHeight);
          
          const pageImgData = pageCanvas.toDataURL("image/png", 1.0);
          
          // Add image to PDF
          pdf.addImage(pageImgData, "PNG", startX, yPosition, imgScaledWidth, heightToShow);
          
          sourceY += sourceHeight;
          
          // If there's more content, add a new page
          if (sourceY < imgHeight) {
            // Use explicit signature for broader jsPDF compatibility.
            pdf.addPage("a4", "landscape");
            yPosition = margin;
          }
        }
      }
      
      const filename = `Sales_Report_${reportType === "performance" ? "Performance" : "SKU"}_${new Date().toISOString().split("T")[0]}.pdf`;
      pdf.save(filename);
      showSnackbar("Report exported to PDF successfully!", "success");
    } catch (error) {
      logger.error("Error exporting to PDF:", error);
      showSnackbar("Failed to export to PDF: " + (error.message || "Unknown error"), "error");
    } finally {
      setExportingPDF(false);
    }
  };
  
  // Calculate totals for performance report
  const performanceTotals = useMemo(() => {
    return performanceReport.reduce(
      (acc, row) => ({
        csdPC: acc.csdPC + row.csdPC,
        csdUC: acc.csdUC + row.csdUC,
        waterPC: acc.waterPC + row.waterPC,
        waterUC: acc.waterUC + row.waterUC,
      }),
      { csdPC: 0, csdUC: 0, waterPC: 0, waterUC: 0 }
    );
  }, [performanceReport]);
  
  return (
    <Dialog open={open} onClose={onClose} fullScreen>
      <AppBar position="static" sx={{ backgroundColor: "#d61916" }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Sales Reports
          </Typography>
          <IconButton color="inherit" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      
      <Box sx={{ p: 3 }}>
        {/* Upload Section */}
        <Box sx={{ mb: 3, display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <Button
            variant="contained"
            startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <UploadFileIcon />}
            onClick={triggerFileUpload}
            disabled={uploading || !canWrite}
            sx={{ backgroundColor: "#d61916", "&:hover": { backgroundColor: "#b01512" } }}
            title={!canWrite ? "You don't have permission to upload data. Only admins can upload data." : ""}
          >
            {uploading ? `Uploading... (${uploadProgress.processed}/${uploadProgress.total})` : "Upload Sales Data"}
          </Button>
          
          <input
            ref={hiddenFileRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={onFileChange}
            style={{ display: "none" }}
          />
          
          {uploadProgress.total > 0 && (
            <Typography variant="body2" color="text.secondary">
              {uploadProgress.saved} of {uploadProgress.total} records processed
            </Typography>
          )}
          
          {/* Distributor Status Indicator */}
          <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 1 }}>
            <Chip
              label={`${distributors?.length || 0} Distributor${distributors?.length !== 1 ? 's' : ''} Available`}
              color={distributors && distributors.length > 0 ? "success" : "warning"}
              size="small"
              variant="outlined"
            />
            <Chip
              label={`${localSalesData?.length || 0} Sales Record${(localSalesData?.length || 0) !== 1 ? 's' : ''} Loaded`}
              color={localSalesData && localSalesData.length > 0 ? "info" : "default"}
              size="small"
              variant="outlined"
            />
          </Box>
        </Box>
        
        {/* Uploaded Files Management Section - Show list of uploaded files */}
        {uploadedFiles && uploadedFiles.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                Uploaded Sales Data Files ({uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''})
              </Typography>
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<DeleteIcon />}
                onClick={() => {
                  if (window.confirm(`Are you sure you want to delete all ${uploadedFiles.length} uploaded file(s)? This will remove all sales data.`)) {
                    setUploadedFiles([]);
                    setLocalSalesData([]);
                    showSnackbar(`All uploaded files deleted`, "info");
                  }
                }}
              >
                Delete All Files
              </Button>
            </Box>
            <TableContainer component={Paper} sx={{ maxHeight: 300, mb: 2 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold", backgroundColor: "#e53935", color: "#fff", width: 60 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: "bold", backgroundColor: "#e53935", color: "#fff" }}>File Name</TableCell>
                    <TableCell sx={{ fontWeight: "bold", backgroundColor: "#e53935", color: "#fff" }}>Upload Date</TableCell>
                    <TableCell align="center" sx={{ fontWeight: "bold", backgroundColor: "#e53935", color: "#fff" }}>Records</TableCell>
                    <TableCell align="center" sx={{ fontWeight: "bold", backgroundColor: "#e53935", color: "#fff", width: 100 }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {uploadedFiles.map((file, index) => (
                    <TableRow key={file.fileName} hover>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell sx={{ fontWeight: "medium" }}>{file.fileName}</TableCell>
                      <TableCell>
                        {file.uploadDate instanceof Date
                          ? file.uploadDate.toLocaleString()
                          : new Date(file.uploadDate).toLocaleString()}
                      </TableCell>
                      <TableCell align="center">{file.recordCount}</TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            if (window.confirm(`Delete file "${file.fileName}"? This will remove ${file.recordCount} sales record(s).`)) {
                              // Remove file from uploaded files list
                              setUploadedFiles(prev => prev.filter(f => f.fileName !== file.fileName));
                              // Remove all records from this file
                              setLocalSalesData(prev => prev.filter(record => record.uploadedFileName !== file.fileName));
                              showSnackbar(`File "${file.fileName}" deleted`, "info");
                            }
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
        
        {/* Filter Section - Date and Distributor */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ mb: 2, display: "flex", gap: 2, alignItems: "flex-start", flexWrap: "wrap" }}>
            <TextField
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                validateDateRange(e.target.value, endDate);
              }}
              InputLabelProps={{ shrink: true }}
              error={!!dateError}
              size="small"
            />
            <TextField
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                validateDateRange(startDate, e.target.value);
              }}
              InputLabelProps={{ shrink: true }}
              error={!!dateError}
              helperText={dateError || (startDate && endDate ? `${filteredSalesData.length} records found` : "")}
              size="small"
            />
            
            {/* Region Filter - Only shown for "Distributor Performance" report */}
            {reportType === "performance" && (
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel id="region-filter-label">Filter by Region</InputLabel>
                <Select
                  labelId="region-filter-label"
                  id="region-filter"
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  label="Filter by Region"
                >
                  <MenuItem value="All">All Regions</MenuItem>
                  <MenuItem value="Southern">Southern</MenuItem>
                  <MenuItem value="Western">Western</MenuItem>
                  <MenuItem value="Eastern">Eastern</MenuItem>
                </Select>
              </FormControl>
            )}
            
            {(startDate || endDate || (reportType === "performance" && selectedRegion && selectedRegion !== "All")) && (
              <Button 
                variant="outlined" 
                onClick={() => { 
                  setStartDate(""); 
                  setEndDate(""); 
                  setSelectedRegion("All");
                }}
                size="small"
              >
                Clear All Filters
              </Button>
            )}
          </Box>
          
          {/* Active Filters Display - Only shown for "Distributor Performance" report */}
          {reportType === "performance" && selectedRegion && selectedRegion !== "All" && (
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
              <Typography variant="body2" color="text.secondary">
                Filtering by region:
              </Typography>
              <Chip
                label={selectedRegion}
                onDelete={() => setSelectedRegion("All")}
                size="small"
                color="primary"
                variant="outlined"
              />
            </Box>
          )}
        </Box>
        
        {/* Report Type Tabs */}
        <Tabs 
          value={reportType} 
          onChange={(e, val) => setReportType(val)} 
          variant="scrollable"
          scrollButtons="auto"
          sx={{ 
            mb: 2, 
            borderBottom: 1, 
            borderColor: "divider",
            minHeight: { xs: 40, sm: 48 },
            "& .MuiTab-root": {
              minHeight: { xs: 40, sm: 48 },
              fontSize: { xs: "0.75rem", sm: "0.875rem" },
              px: { xs: 1.5, sm: 3 },
              py: { xs: 0.5, sm: 1 },
              textTransform: "none",
              fontWeight: { xs: 600, sm: 500 }
            },
            "& .MuiTabs-scrollButtons": {
              width: { xs: 32, sm: 40 }
            }
          }}
        >
          <Tab label="Distributor Performance" value="performance" />
          <Tab label="CSD SKU Sales" value="sku" />
        </Tabs>
        
        {/* Report Content */}
        <Box ref={tableRef}>
          {reportType === "performance" ? (
            <TableContainer component={Paper} sx={{ maxHeight: "calc(100vh - 450px)" }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold", backgroundColor: "#e53935", color: "#fff", width: 60 }}>Rank</TableCell>
                    <TableCell sx={{ fontWeight: "bold", backgroundColor: "#e53935", color: "#fff" }}>Distributor</TableCell>
                    <TableCell align="center" sx={{ fontWeight: "bold", backgroundColor: "#fff3e0" }}>CSD PC</TableCell>
                    <TableCell align="center" sx={{ fontWeight: "bold", backgroundColor: "#fff3e0" }}>CSD UC</TableCell>
                    <TableCell align="center" sx={{ fontWeight: "bold", backgroundColor: "#e3f2fd" }}>Water PC</TableCell>
                    <TableCell align="center" sx={{ fontWeight: "bold", backgroundColor: "#e3f2fd" }}>Water UC</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {performanceReport.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                        <Typography variant="body1" color="text.secondary">
                          {localSalesData.length === 0
                            ? "No sales data available. Please upload sales data first."
                            : (startDate && endDate) || (selectedRegion && selectedRegion !== "All")
                            ? "No records found for the selected filters. Try adjusting the date range or region selection."
                            : "No sales data available."}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {performanceReport.map((row) => (
                        <TableRow key={row.name}>
                          <TableCell sx={{ fontWeight: "bold", color: row.rank <= 3 ? "#e53935" : "inherit" }}>
                            {row.rank}
                          </TableCell>
                          <TableCell sx={{ fontWeight: "medium" }}>{row.name}</TableCell>
                          <TableCell align="center">{row.csdPC.toLocaleString()}</TableCell>
                          <TableCell align="center">{row.csdUC.toFixed(2)}</TableCell>
                          <TableCell align="center">{row.waterPC.toLocaleString()}</TableCell>
                          <TableCell align="center">{row.waterUC.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow sx={{ backgroundColor: "#f5f5f5", fontWeight: "bold" }}>
                        <TableCell sx={{ fontWeight: "bold" }}></TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>Total</TableCell>
                        <TableCell align="center" sx={{ fontWeight: "bold" }}>{performanceTotals.csdPC.toLocaleString()}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: "bold" }}>{performanceTotals.csdUC.toFixed(2)}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: "bold" }}>{performanceTotals.waterPC.toLocaleString()}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: "bold" }}>{performanceTotals.waterUC.toFixed(2)}</TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <TableContainer component={Paper} sx={{ maxHeight: "calc(100vh - 450px)" }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold", backgroundColor: "#e53935", color: "#fff" }}>Rank</TableCell>
                    <TableCell sx={{ fontWeight: "bold", backgroundColor: "#e53935", color: "#fff" }}>SKU</TableCell>
                    <TableCell align="center" sx={{ fontWeight: "bold", backgroundColor: "#fff3e0" }}>Total PC</TableCell>
                    <TableCell align="center" sx={{ fontWeight: "bold", backgroundColor: "#fff3e0" }}>Total UC</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {skuReport.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 5 }}>
                        <Typography variant="body1" color="text.secondary">
                          {localSalesData.length === 0
                            ? "No sales data available. Please upload sales data first."
                            : startDate && endDate
                            ? "No CSD products found for the selected date range."
                            : "No CSD products found in sales data."}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    skuReport.map((row, index) => (
                      <TableRow key={row.sku}>
                        <TableCell sx={{ fontWeight: "medium" }}>{index + 1}</TableCell>
                        <TableCell sx={{ fontWeight: "medium" }}>{row.sku}</TableCell>
                        <TableCell align="center">{row.totalPC.toLocaleString()}</TableCell>
                        <TableCell align="center">{row.totalUC.toFixed(2)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
        
        {/* Download Buttons */}
        <Box sx={{ mt: 3, display: "flex", gap: 2, justifyContent: "flex-end" }}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadExcel}
            disabled={performanceReport.length === 0 && skuReport.length === 0}
          >
            Download Excel
          </Button>
          <Button
            variant="contained"
            startIcon={exportingPDF ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
            onClick={handleDownloadPDF}
            disabled={exportingPDF || (performanceReport.length === 0 && skuReport.length === 0)}
            sx={{ backgroundColor: "#d61916", "&:hover": { backgroundColor: "#b01512" } }}
          >
            {exportingPDF ? "Generating PDF..." : "Download PDF"}
          </Button>
        </Box>
      </Box>
      
      {/* Snackbar for notifications */}
      <AppSnackbar
        open={snackbar.open}
        severity={snackbar.severity}
        message={snackbar.message}
        autoHideDuration={4200}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      />
    </Dialog>
  );
}
