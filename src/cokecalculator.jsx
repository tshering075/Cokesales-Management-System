import React, { useState, useMemo, useEffect, useRef } from "react";
import html2canvas from "html2canvas";
import {
  Box,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  useMediaQuery,
  MenuItem,
  Select,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  Switch,
  FormControlLabel,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CheckIcon from "@mui/icons-material/Check";
import { getNextOrderNumber, getCurrentOrderNumber } from "./utils/orderNumber";
import AppSnackbar from "./components/AppSnackbar";
import { DEFAULT_SKUS, UC_DIVISOR, DEFAULT_SKU_NAMES, customProductLineName } from "./constants/productSkus";

/** Built-in CAN lines (multi-select); custom CAN products from admin are appended in `selectableCanSkus`. */
const BUILT_IN_CAN_PRODUCTS = [
  "Coke 300ml CAN",
  "Diet Coke 300ml CAN",
  "Coke Zero 300ml CAN",
  "Fanta 300ml CAN",
  "Sprite 300ml CAN",
  "Limca 300ml CAN",
  "Thums Up 300ml CAN",
  "Schweppes Tonic Water CAN",
  "Schweppes Soda Water CAN",
];

const DEFAULT_CAN_RATE = 750;

function CokeCalculator({
  distributorName,
  distributorCode,
  schemes = [],
  onPlaceOrder,
  productRates,
  initialInputs = null,
  fixedOrderNumber = null,
  placeOrderButtonText = "Place Order",
  submitOrderButtonText = "Submit Order",
  editContext = null
}) {
  const skus = useMemo(() => {
    const skuRates = productRates?.skuRates || {};
    const builtIn = DEFAULT_SKUS.map((sku) => {
      const saved = skuRates[sku.name];
      const kgPerCase = saved?.kgPerCase ?? sku.kgPerCase;
      const rate = saved?.rate ?? sku.rate;
      let ucMul = sku.ucMultiplier;
      if (saved && Object.prototype.hasOwnProperty.call(saved, "ucMultiplier")) {
        ucMul = saved.ucMultiplier;
      }
      const ucFormula =
        ucMul != null && typeof ucMul === "number" && !Number.isNaN(ucMul)
          ? (q) => (q * ucMul) / UC_DIVISOR
          : null;
      return { ...sku, kgPerCase, rate, ucMultiplier: ucMul, ucFormula };
    });

    const rawCustom = Array.isArray(productRates?.customProducts) ? productRates.customProducts : [];
    const customs = [];
    const seen = new Set();
    for (const p of rawCustom) {
      const lineName = customProductLineName(p?.name, p?.sku);
      if (!lineName || DEFAULT_SKU_NAMES.has(lineName) || seen.has(lineName)) continue;
      seen.add(lineName);
      const category =
        p.category === "Water" ? "Water" : p.category === "CAN" ? "CAN" : "CSD";
      const kgPerCase = Number(p.kgPerCase);
      const rate = Number(p.rate);
      const mulRaw = p.ucMultiplier;
      const ucMul =
        mulRaw === "" || mulRaw === null || mulRaw === undefined
          ? null
          : typeof mulRaw === "number"
            ? mulRaw
            : parseFloat(mulRaw);
      const ucFormula =
        ucMul != null && typeof ucMul === "number" && !Number.isNaN(ucMul)
          ? (q) => (q * ucMul) / UC_DIVISOR
          : null;
      customs.push({
        name: lineName,
        category,
        kgPerCase: Number.isFinite(kgPerCase) ? kgPerCase : 0,
        rate: Number.isFinite(rate) ? rate : 0,
        ucMultiplier: ucMul != null && !Number.isNaN(ucMul) ? ucMul : null,
        ucFormula,
        isCustom: true,
      });
    }

    return [...builtIn, ...customs];
  }, [productRates]);

  const selectableCanSkus = useMemo(() => {
    const customCanNames = skus.filter((s) => s.category === "CAN").map((s) => s.name);
    return [...BUILT_IN_CAN_PRODUCTS, ...customCanNames];
  }, [skus]);

  const canRate = useMemo(() => {
    return productRates?.canRate ?? DEFAULT_CAN_RATE;
  }, [productRates]);

  const [inputs, setInputs] = useState({});
  const [results, setResults] = useState([]);
  const [selectedCans, setSelectedCans] = useState([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [gstEnabled, setGstEnabled] = useState(true); // GST toggle - default ON
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const tableRef = React.useRef(null);
  const [caption, setCaption] = useState("");
  const [currentOrderNumber, setCurrentOrderNumber] = useState(null);
  const prefillPendingRef = useRef(false);

  useEffect(() => {
    if (initialInputs && typeof initialInputs === "object" && Object.keys(initialInputs).length > 0) {
      setInputs(initialInputs);
      setSelectedCans(
        Object.keys(initialInputs).filter(
          (sku) => selectableCanSkus.includes(sku) && Number(initialInputs[sku] || 0) > 0
        )
      );
      if (fixedOrderNumber) {
        setCurrentOrderNumber(fixedOrderNumber);
      }
      prefillPendingRef.current = true;
    }
  }, [initialInputs, fixedOrderNumber, selectableCanSkus]);

  useEffect(() => {
    if (prefillPendingRef.current) {
      prefillPendingRef.current = false;
      calculate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputs]);

  const handleChange = (sku, value) => {
    // Allow empty string for clearing
    if (value === "" || value === null || value === undefined) {
      setInputs({ ...inputs, [sku]: "" });
      return;
    }
    
    // Parse as integer, validate range
    let val = parseInt(value, 10);
    if (isNaN(val) || val < 0) {
      val = 0;
    }
    // Cap at reasonable maximum (1 million cases)
    if (val > 1000000) {
      val = 1000000;
      alert("Maximum value is 1,000,000 cases");
    }
    setInputs({ ...inputs, [sku]: val });
  };

  const calculate = () => {
    try {
      // Generate order number when calculation starts
      if (!currentOrderNumber) {
        const orderNo = getNextOrderNumber();
        setCurrentOrderNumber(orderNo);
      }
      
      let res = [];
      Object.keys(inputs).forEach((sku) => {
        try {
          let item = skus.find((s) => s.name === sku);
          let rate = item?.rate;
          let kgPerCase = item?.kgPerCase;
          let ucFormula = item?.ucFormula;
          if (!item && BUILT_IN_CAN_PRODUCTS.includes(sku)) {
            rate = canRate;
            kgPerCase = 8.28;
            ucFormula = null;
          }
          const cases = inputs[sku];
          if (cases <= 0) return; // Skip zero or negative cases
          
          if (!rate || !kgPerCase) {
            throw new Error(`Missing rate or weight data for ${sku}`);
          }
          
          // Apply schemes/discounts first to get finalCases (including free cases)
          let schemeApplied = null;
          let freeCases = 0;
          let discountAmount = 0;
          let finalAmount = cases * rate;
          let finalCases = cases;
          
          // Find applicable schemes for this SKU
          const category = item?.category === "Water" ? "Water" : "CSD";
          
          // Debug: Log available schemes and current SKU
          if (process.env.NODE_ENV === "development" && schemes.length > 0) {
            console.log(`🔍 Checking schemes for SKU: "${sku}" (Category: ${category})`, {
              totalSchemes: schemes.length,
              schemes: schemes.map(s => ({
                name: s.name,
                type: s.type,
                appliesTo: s.appliesTo,
                appliesToSKUs: s.appliesToSKUs,
                distributors: s.distributors
              }))
            });
          }
          
          const applicableSchemes = schemes.filter(scheme => {
            // Check if scheme is valid (within date range)
            const now = new Date();
            const startDate = new Date(scheme.startDate);
            const endDate = new Date(scheme.endDate);
            if (startDate > now || endDate < now) {
              if (process.env.NODE_ENV === "development") {
                console.log(`⏰ Scheme "${scheme.name}" is not active (dates: ${startDate.toISOString()} - ${endDate.toISOString()})`);
              }
              return false;
            }
            
            // If scheme has SKU-specific selection, check if this SKU is included
            if (scheme.appliesToSKUs && Array.isArray(scheme.appliesToSKUs) && scheme.appliesToSKUs.length > 0) {
              const matches = scheme.appliesToSKUs.includes(sku);
              if (process.env.NODE_ENV === "development") {
                console.log(`📦 SKU matching for scheme "${scheme.name}":`, {
                  sku,
                  appliesToSKUs: scheme.appliesToSKUs,
                  matches
                });
              }
              return matches;
            }
            
            // Fallback to category-based matching (for backward compatibility)
            const categoryMatch = scheme.appliesTo === "both" || scheme.appliesTo === category.toLowerCase();
            if (process.env.NODE_ENV === "development") {
              console.log(`📂 Category matching for scheme "${scheme.name}":`, {
                schemeAppliesTo: scheme.appliesTo,
                itemCategory: category.toLowerCase(),
                matches: categoryMatch
              });
            }
            return categoryMatch;
          });
          
          if (process.env.NODE_ENV === "development") {
            console.log(`✅ Found ${applicableSchemes.length} applicable schemes for "${sku}"`, applicableSchemes.map(s => s.name));
          }
          
          // Apply the first applicable scheme (priority to first scheme)
          if (applicableSchemes.length > 0) {
            const scheme = applicableSchemes[0];
            schemeApplied = scheme;
            
            if (scheme.type === "csd_scheme") {
              // Buy X Get Y Free scheme
              const buyQty = scheme.buyQuantity || 6;
              const freeQty = scheme.freeQuantity || 1;
              
              // Debug logging
              if (process.env.NODE_ENV === "development") {
                console.log(`🔍 CSD Scheme applied for ${sku}:`, {
                  cases,
                  buyQty,
                  freeQty,
                  qualifies: cases >= buyQty
                });
              }
              
              if (cases >= buyQty) {
                const sets = Math.floor(cases / buyQty);
                freeCases = sets * freeQty;
                finalCases = cases + freeCases; // Total cases including free
                finalAmount = cases * rate; // Only pay for purchased cases
                
                if (process.env.NODE_ENV === "development") {
                  console.log(`✅ Free cases calculated:`, {
                    sets,
                    freeCases,
                    totalCases: finalCases
                  });
                }
              } else {
                // Even if not enough quantity, mark that scheme is applicable
                // freeCases remains 0, but schemeApplied is set
                freeCases = 0;
                
                if (process.env.NODE_ENV === "development") {
                  console.log(`⚠️ Not enough quantity for free cases. Need ${buyQty}, have ${cases}`);
                }
              }
            } else if (scheme.type === "discount") {
              // Fixed discount amount per case
              const discountPerCase = scheme.discountAmount || 0;
              discountAmount = cases * discountPerCase;
              finalAmount = (cases * rate) - discountAmount;
            }
          }
          
          // Calculate total tons and total UC using finalCases (including free cases)
          const totalKg = finalCases * kgPerCase;
          const totalTon = totalKg / 1000;
          const totalUC = ucFormula ? ucFormula(finalCases) : null;
          
          if (!isFinite(totalKg) || !isFinite(totalTon) || !isFinite(finalAmount)) {
            throw new Error(`Invalid calculation result for ${sku}`);
          }
          
          res.push({ 
            sku, 
            cases, 
            rate, 
            totalAmount: finalAmount, 
            totalTon, 
            totalUC,
            schemeApplied,
            freeCases,
            discountAmount,
            finalCases: finalCases || cases
          });
        } catch (error) {
          // Log error for individual SKU but continue processing others
          if (process.env.NODE_ENV === "development") {
            console.error(`Error calculating for ${sku}:`, error);
          }
        }
      });
      setResults(res);
    } catch (error) {
      alert("An error occurred during calculation. Please check your inputs.");
    }
  };

  const reset = () => {
    setInputs({});
    setResults([]);
    setSelectedCans([]);
    setCurrentOrderNumber(null); // Reset order number
  };

  const handleSubmitOrder = async () => {
    // Capture table as PNG before placing order
    let tableImageData = null;
    if (tableRef.current) {
      try {
        const canvas = await html2canvas(tableRef.current, {
          backgroundColor: '#ffffff',
          scale: 2,
          logging: false,
          useCORS: true
        });
        tableImageData = canvas.toDataURL('image/png');
        console.log('✅ Table captured as PNG for email attachment');
      } catch (error) {
        console.error('Error capturing table as PNG:', error);
      }
    }

    const orderData = results.map(r => {
      const skuInfo = skus.find(s => s.name === r.sku);
      return {
        sku: r.sku,
        cases: r.finalCases || r.cases,
        rate: r.rate,
        totalAmount: r.totalAmount,
        totalTon: r.totalTon,
        totalUC: r.totalUC,
        category: skuInfo?.category || "CSD", // Add category for proper classification
        schemeApplied: r.schemeApplied ? {
          name: r.schemeApplied.name,
          type: r.schemeApplied.type,
          schemeDescription: r.schemeApplied.schemeDescription
        } : null,
        freeCases: r.freeCases || 0,
        discountAmount: r.discountAmount || 0,
        orderCaption: caption || "",
      };
    });

    // Get the order number (use current or generate new)
    const orderNumber = currentOrderNumber || getNextOrderNumber();

    if (onPlaceOrder) {
      // Pass order number, order data, table image, edit context, and caption
      onPlaceOrder(orderData, orderNumber, tableImageData, editContext, caption);
    }

    setOrderDialogOpen(false);
    setCaption("");
    // Reset order number for next calculation
    setCurrentOrderNumber(null);
  };
  const totalCasesSum = results.reduce((sum, r) => sum + (r.cases || 0), 0);
  const totalAmountSum = results.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
  const totalTonSum = results.reduce((sum, r) => sum + (r.totalTon || 0), 0);
  const totalDiscountSum = results.reduce((sum, r) => sum + (r.discountAmount || 0), 0);
  const totalFreeCasesSum = results.reduce((sum, r) => sum + (r.freeCases || 0), 0);
  // Calculate GST (5% on total amount after discount)
  // GST is not applicable for "Gelephu Grocery" distributor
  const isGelephuGrocery = distributorName && distributorName.toLowerCase().includes("gelephu grocery");
  // Use toggle state if GST is enabled, otherwise 0 (unless it's Gelephu Grocery which is always 0)
  const gstRate = (isGelephuGrocery || !gstEnabled) ? 0 : 0.05; // 5% or 0% based on toggle or Gelephu Grocery
  const grossTotal = totalAmountSum; // Amount after discount
  const gstAmount = grossTotal * gstRate;
  const netTotal = grossTotal + gstAmount;

  const totalUC_CSD = results
    .filter(r => skus.find(s => s.name === r.sku)?.category === "CSD")
    .reduce((sum, r) => sum + (r.totalUC || 0), 0);

  const totalUC_Kinley = results
    .filter(r => skus.find(s => s.name === r.sku)?.category === "Water")
    .reduce((sum, r) => sum + (r.totalUC || 0), 0);

  const getInputStyle = (item) => {
    const baseStyle = {
      fontWeight: "bold",
      color: "#000",
      textAlign: "left",
      fontSize: "0.9rem",
      borderRadius: "6px",
      padding: "0 8px",
      height: "36px",
      display: "flex",
      alignItems: "center",
      overflow: "hidden",
      textOverflow: "ellipsis",
    };

    if (item.name.startsWith("Coca Cola")) return { input: { ...baseStyle, background: "#fdecea" } };
    if (item.name.startsWith("Fanta")) return { input: { ...baseStyle, background: "#fff7e6" } };
    if (item.name.startsWith("Sprite")) return { input: { ...baseStyle, background: "#eafaf1" } };
    if (item.name.startsWith("Kinley")) return { input: { ...baseStyle, background: "#e6f2ff" } };
    if (item.name.startsWith("Charge")) return { input: { ...baseStyle, background: "#ffeaea" } };
    if (item.category === "CAN" || item.name.startsWith("CAN"))
      return {
        input: {
          ...baseStyle,
          background: "linear-gradient(90deg,rgb(241, 224, 224) 0%, #fff7e6 50%, #eafaf1 100%)",
          WebkitBackgroundClip: "padding-box",
        },
      };
    if (item.isCustom)
      return { input: { ...baseStyle, background: "#f3e5f5" } };
    return { input: { ...baseStyle, background: "#fffde7" } };
  };

  // Group SKUs by category
  const csdProducts = skus.filter(item => item.category === "CSD" && item.name !== "CAN 300ml");
  const waterProducts = skus.filter(item => item.category === "Water");

  return (
    <>
      <Box sx={{ minHeight: "100vh", background: "linear-gradient(135deg, #e53935 0%, #fbc02d 100%)", display: "flex", alignItems: "center", justifyContent: "center", p: isMobile ? 1 : 4 }}>
        <Paper elevation={6} sx={{ p: { xs: 2, sm: 3, md: 4 }, borderRadius: 4, maxWidth: isMobile ? "100%" : 900, width: "100%", background: "rgba(255,255,255,0.95)", boxSizing: "border-box", overflow: "hidden" }}>
          {/* Header Section */}
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <Typography variant={isMobile ? "h5" : "h4"} gutterBottom sx={{ fontWeight: "bold", color: "#e53935", letterSpacing: 1.5, mb: 1 }}>
              Coke Calculator
            </Typography>
            <Typography variant="subtitle2" sx={{ color: "#666", fontWeight: 400, fontSize: { xs: "0.8rem", sm: "0.9rem" }, px: { xs: 1, sm: 0 } }}>
              Enter the number of cases for each product to calculate totals (PC, UC, and weight in tons)
            </Typography>
          </Box>

          {/* CSD Products Section */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ 
              fontWeight: 600, 
              color: "#e53935", 
              mb: 2, 
              fontSize: { xs: "1rem", sm: "1.1rem" },
              pb: 1,
              borderBottom: "2px solid #e53935"
            }}>
              CSD Products
            </Typography>
            <Box sx={{ 
              display: "grid", 
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
              gap: { xs: 1.5, sm: 2 },
              width: "100%",
              boxSizing: "border-box"
            }}>
              {csdProducts.map((item) => (
                <TextField
                  key={item.name}
                  label={item.name}
                  type="number"
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ min: 0, style: { ...getInputStyle(item).input } }}
                  value={inputs[item.name] || ""}
                  placeholder="Enter Cases"
                  onChange={(e) => handleChange(item.name, e.target.value)}
                  size={isMobile ? "small" : "medium"}
                  sx={{
                    "& .MuiInputLabel-root": { fontWeight: "bold" },
                    "& .MuiOutlinedInput-root": {
                      transition: "all 0.2s",
                      "&:hover": {
                        transform: "translateY(-2px)",
                        boxShadow: 2
                      }
                    }
                  }}
                />
              ))}
            </Box>
          </Box>

          {/* CAN Products Section */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ 
              fontWeight: 600, 
              color: "#e53935", 
              mb: 2, 
              fontSize: { xs: "1rem", sm: "1.1rem" },
              pb: 1,
              borderBottom: "2px solid #e53935"
            }}>
              CAN Products
            </Typography>
            <Box 
              sx={{ 
                width: "100%",
                maxWidth: "100%",
                p: { xs: 2, sm: 2.5 },
                borderRadius: 3,
                bgcolor: "linear-gradient(135deg, #fff5f5 0%, #ffe8e8 100%)",
                background: "linear-gradient(135deg, #fff5f5 0%, #ffe8e8 100%)",
                border: "2px solid #e53935",
                boxSizing: "border-box",
                overflow: "hidden",
                boxShadow: "0 2px 8px rgba(229, 57, 53, 0.1)"
              }}
            >
              <Select
                multiple
                value={selectedCans}
                onChange={(e) => setSelectedCans(e.target.value)}
                displayEmpty
                renderValue={(selected) =>
                  selected.length === 0 ? (
                    <Typography sx={{ color: "#999", fontSize: { xs: "0.875rem", sm: "0.9rem" } }}>
                      Select CAN Products
                    </Typography>
                  ) : (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip 
                          key={value} 
                          label={value} 
                          size="small" 
                          sx={{ 
                            backgroundColor: "#e53935",
                            color: "white",
                            fontWeight: 500,
                            "&:hover": { backgroundColor: "#c62828" }
                          }} 
                        />
                      ))}
                    </Box>
                  )
                }
                sx={{ 
                  mb: 2,
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#e53935"
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#c62828"
                  }
                }}
                size={isMobile ? "small" : "medium"}
              >
                {selectableCanSkus.map((p) => (
                  <MenuItem key={p} value={p}>
                    {p}
                    {selectedCans.includes(p) && (
                      <CheckIcon color="success" sx={{ ml: 1 }} />
                    )}
                  </MenuItem>
                ))}
              </Select>

              {selectedCans.length > 0 && (
                <Box sx={{ 
                  display: "grid", 
                  gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
                  gap: 1.5,
                  width: "100%",
                  boxSizing: "border-box"
                }}>
                  {selectedCans.map((can) => (
                    <TextField
                      key={can}
                      label={`${can} Cases`}
                      type="number"
                      InputLabelProps={{ shrink: true }}
                      inputProps={{
                        min: 0,
                        style: {
                          ...getInputStyle(skus.find((s) => s.name === can) || { name: "CAN 300ml", category: "CAN" })
                            .input,
                        },
                      }}
                      value={inputs[can] || ""}
                      placeholder="Enter Cases"
                      onChange={(e) => handleChange(can, e.target.value)}
                      size={isMobile ? "small" : "medium"}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          transition: "all 0.2s",
                          "&:hover": {
                            transform: "translateY(-2px)",
                            boxShadow: 2
                          }
                        }
                      }}
                    />
                  ))}
                </Box>
              )}
            </Box>
          </Box>

          {/* Water Products Section */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ 
              fontWeight: 600, 
              color: "#1976d2", 
              mb: 2, 
              fontSize: { xs: "1rem", sm: "1.1rem" },
              pb: 1,
              borderBottom: "2px solid #1976d2"
            }}>
              Water Products
            </Typography>
            <Box sx={{ 
              display: "grid", 
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
              gap: { xs: 1.5, sm: 2 },
              width: "100%",
              boxSizing: "border-box"
            }}>
              {waterProducts.map((item) => (
                <TextField
                  key={item.name}
                  label={item.name}
                  type="number"
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ min: 0, style: { ...getInputStyle(item).input } }}
                  value={inputs[item.name] || ""}
                  placeholder="Enter Cases"
                  onChange={(e) => handleChange(item.name, e.target.value)}
                  size={isMobile ? "small" : "medium"}
                  sx={{
                    "& .MuiInputLabel-root": { fontWeight: "bold" },
                    "& .MuiOutlinedInput-root": {
                      transition: "all 0.2s",
                      "&:hover": {
                        transform: "translateY(-2px)",
                        boxShadow: 2
                      }
                    }
                  }}
                />
              ))}
            </Box>
          </Box>

          {/* GST Toggle Switch */}
          <Box sx={{ 
            display: "flex", 
            justifyContent: "center", 
            alignItems: "center",
            mb: 2,
            p: { xs: 1.5, sm: 2 },
            borderRadius: 2,
            background: "linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%)",
            border: "2px solid #ffc107",
            boxShadow: "0 2px 8px rgba(255, 193, 7, 0.2)"
          }}>
            <FormControlLabel
              control={
                <Switch
                  checked={gstEnabled}
                  onChange={(e) => setGstEnabled(e.target.checked)}
                  color="warning"
                  sx={{
                    "& .MuiSwitch-switchBase.Mui-checked": {
                      color: "#ff9800",
                    },
                    "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                      backgroundColor: "#ff9800",
                    },
                  }}
                />
              }
              label={
                <Typography sx={{ 
                  fontWeight: 700, 
                  fontSize: { xs: "0.9rem", sm: "1rem" },
                  color: "#f57c00"
                }}>
                  GST 5%
                </Typography>
              }
              sx={{ m: 0 }}
            />
          </Box>
            
          {/* Action Buttons Section */}
          <Box sx={{ 
            display: "flex", 
            flexDirection: { xs: "column", sm: "row" },
            gap: { xs: 1.5, sm: 2 },
            mb: 3,
            justifyContent: "center",
            alignItems: "center",
            flexWrap: "wrap"
          }}>
            <Button 
              variant="contained" 
              color="error" 
              size="large"
              onClick={calculate}
              fullWidth={isMobile}
              sx={{ 
                borderRadius: 3,
                px: { xs: 4, sm: 5 },
                py: { xs: 1.5, sm: 1.75 },
                textTransform: "none",
                fontWeight: 700,
                fontSize: { xs: "1rem", sm: "1.05rem" },
                boxShadow: 3,
                background: "linear-gradient(135deg, #e53935 0%, #c62828 100%)",
                "&:hover": {
                  boxShadow: 6,
                  transform: "translateY(-3px)",
                  background: "linear-gradient(135deg, #c62828 0%, #b71c1c 100%)"
                },
                transition: "all 0.3s ease"
              }}
            >
              Calculate
            </Button>
            <Button 
              variant="outlined" 
              color="warning" 
              size="large"
              onClick={reset}
              fullWidth={isMobile}
              sx={{ 
                borderRadius: 3,
                px: { xs: 4, sm: 5 },
                py: { xs: 1.5, sm: 1.75 },
                textTransform: "none",
                fontWeight: 700,
                fontSize: { xs: "1rem", sm: "1.05rem" },
                borderWidth: 2.5,
                borderColor: "#ff9800",
                color: "#ff9800",
                "&:hover": {
                  borderWidth: 2.5,
                  borderColor: "#f57c00",
                  color: "#f57c00",
                  transform: "translateY(-3px)",
                  boxShadow: 4,
                  backgroundColor: "rgba(255, 152, 0, 0.05)"
                },
                transition: "all 0.3s ease"
              }}
            >
              Reset
            </Button>

            {results.length > 0 && (
              <Button 
                variant="contained" 
                color="warning" 
                size="large"
                onClick={() => {
                  setCurrentOrderNumber(getNextOrderNumber());
                  setOrderDialogOpen(true);
                }}
                fullWidth={isMobile}
                sx={{ 
                  borderRadius: 3,
                  px: { xs: 4, sm: 5 },
                  py: { xs: 1.5, sm: 1.75 },
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: { xs: "1rem", sm: "1.05rem" },
                  boxShadow: 3,
                  background: "linear-gradient(135deg, #ff9800 0%, #f57c00 100%)",
                  "&:hover": {
                    boxShadow: 6,
                    transform: "translateY(-3px)",
                    background: "linear-gradient(135deg, #f57c00 0%, #e65100 100%)"
                  },
                  transition: "all 0.3s ease"
                }}
              >
                {placeOrderButtonText}
              </Button>
            )}
          </Box>

          {/* Live Preview Summary */}
          {results.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Card 
                elevation={4}
                sx={{ 
                  p: { xs: 2.5, sm: 3 },
                  borderRadius: 4,
                  background: "linear-gradient(135deg, #fffde7 0%, #fff9c4 100%)",
                  border: "3px solid #fbc02d",
                  boxShadow: "0 4px 12px rgba(251, 192, 45, 0.3)"
                }}
              >
                <Typography variant="h6" sx={{ 
                  mb: 2.5, 
                  fontWeight: 700, 
                  fontSize: { xs: "1.1rem", sm: "1.3rem" }, 
                  textAlign: "center",
                  color: "#e65100",
                  letterSpacing: 0.5
                }}>
                  Quick Summary
                </Typography>
                <Box sx={{ 
                  display: "grid", 
                  gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(4, 1fr)" },
                  gap: { xs: 2, sm: 2.5 },
                  mb: 1
                }}>
                  <Box sx={{ 
                    textAlign: "center",
                    p: { xs: 1, sm: 1.5 },
                    borderRadius: 2,
                    backgroundColor: "rgba(255, 255, 255, 0.6)",
                    transition: "all 0.2s",
                    "&:hover": {
                      backgroundColor: "rgba(255, 255, 255, 0.9)",
                      transform: "scale(1.05)"
                    }
                  }}>
                    <Typography variant="caption" sx={{ 
                      color: "#666", 
                      display: "block", 
                      mb: 1, 
                      fontSize: { xs: "0.75rem", sm: "0.8rem" },
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: 0.5
                    }}>
                      Total Cases
                    </Typography>
                    <Typography variant="h6" sx={{ 
                      fontWeight: "bold", 
                      color: "#e53935", 
                      fontSize: { xs: "1.1rem", sm: "1.3rem" },
                      lineHeight: 1.2
                    }}>
                      {totalCasesSum.toLocaleString()}
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    textAlign: "center",
                    p: { xs: 1, sm: 1.5 },
                    borderRadius: 2,
                    backgroundColor: "rgba(255, 255, 255, 0.6)",
                    transition: "all 0.2s",
                    "&:hover": {
                      backgroundColor: "rgba(255, 255, 255, 0.9)",
                      transform: "scale(1.05)"
                    }
                  }}>
                    <Typography variant="caption" sx={{ 
                      color: "#666", 
                      display: "block", 
                      mb: 1, 
                      fontSize: { xs: "0.75rem", sm: "0.8rem" },
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: 0.5
                    }}>
                      Total Amount
                    </Typography>
                    <Typography variant="h6" sx={{ 
                      fontWeight: "bold", 
                      color: "#e53935", 
                      fontSize: { xs: "1.1rem", sm: "1.3rem" },
                      lineHeight: 1.2
                    }}>
                      Nu {netTotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    textAlign: "center",
                    p: { xs: 1, sm: 1.5 },
                    borderRadius: 2,
                    backgroundColor: "rgba(255, 255, 255, 0.6)",
                    transition: "all 0.2s",
                    "&:hover": {
                      backgroundColor: "rgba(255, 255, 255, 0.9)",
                      transform: "scale(1.05)"
                    }
                  }}>
                    <Typography variant="caption" sx={{ 
                      color: "#666", 
                      display: "block", 
                      mb: 1, 
                      fontSize: { xs: "0.75rem", sm: "0.8rem" },
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: 0.5
                    }}>
                      Total Tons
                    </Typography>
                    <Typography variant="h6" sx={{ 
                      fontWeight: "bold", 
                      color: "#e53935", 
                      fontSize: { xs: "1.1rem", sm: "1.3rem" },
                      lineHeight: 1.2
                    }}>
                      {totalTonSum.toFixed(2)}
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    textAlign: "center",
                    p: { xs: 1, sm: 1.5 },
                    borderRadius: 2,
                    backgroundColor: "rgba(255, 255, 255, 0.6)",
                    transition: "all 0.2s",
                    "&:hover": {
                      backgroundColor: "rgba(255, 255, 255, 0.9)",
                      transform: "scale(1.05)"
                    }
                  }}>
                    <Typography variant="caption" sx={{ 
                      color: "#666", 
                      display: "block", 
                      mb: 1, 
                      fontSize: { xs: "0.75rem", sm: "0.8rem" },
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: 0.5
                    }}>
                      Total UC
                    </Typography>
                    <Typography variant="h6" sx={{ 
                      fontWeight: "bold", 
                      color: "#e53935", 
                      fontSize: { xs: "1.1rem", sm: "1.3rem" },
                      lineHeight: 1.2
                    }}>
                      {(totalUC_CSD + totalUC_Kinley).toFixed(2)}
                    </Typography>
                  </Box>
                </Box>
              </Card>
            </Box>
          )}

          {/* Detailed Results Table */}
          {results.length > 0 && (
            <TableContainer
              component={Paper}
              ref={tableRef}
              sx={{ 
                mt: 2, 
                background: "#fffde7", 
                borderRadius: 3, 
                boxShadow: 3, 
                border: "2px solid #fbc02d", 
                width: "100%"
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 2, pt: 1, pb: 1 }}>
              {/* Distributor Name on left */}
              <Box sx={{ fontWeight: "bold", color: "#000", fontSize: isMobile ? 12 : 14 }}>
                {distributorName || "Demo Distributor"}
              </Box>

              {/* Order No. in center */}
              <Box sx={{ fontWeight: "bold", fontSize: isMobile ? 12 : 14, textAlign: "center", flexGrow: 1 }}>
                Order No: {currentOrderNumber || getCurrentOrderNumber()}
              </Box>

              {/* Date on right */}
              <Box
                sx={{
                  fontWeight: "bold",
                  fontSize: isMobile ? 10 : 12, // smaller font
                  color: "#000",
                  letterSpacing: 0.5,
                }}
              >
                📅 {new Date().toLocaleDateString()}
              </Box>
            </Box>
              <Table size="small" sx={{ width: "100%" }}>
                <TableHead>
                  <TableRow sx={{ 
                    background: "linear-gradient(135deg, #e53935 0%, #c62828 100%)",
                    boxShadow: "0 2px 8px rgba(229, 57, 53, 0.3)"
                  }}>
                    <TableCell sx={{ 
                      fontWeight: "bold", 
                      color: "#ffffff", 
                      fontSize: isMobile ? 9 : 14, 
                      textAlign: "left", 
                      px: isMobile ? 0.5 : 1.5, 
                      py: isMobile ? 0.75 : 1.5, 
                      whiteSpace: "nowrap",
                      letterSpacing: "0.5px"
                    }}>
                      SKU
                    </TableCell>
                    <TableCell sx={{ 
                      fontWeight: "bold", 
                      color: "#ffffff", 
                      fontSize: isMobile ? 9 : 14, 
                      textAlign: "right", 
                      px: isMobile ? 0.5 : 1.5, 
                      py: isMobile ? 0.75 : 1.5, 
                      whiteSpace: "nowrap",
                      letterSpacing: "0.5px"
                    }}>
                      {isMobile ? "Qty" : "Qty/Cases"}
                    </TableCell>
                    <TableCell sx={{ 
                      fontWeight: "bold", 
                      color: "#ffffff", 
                      fontSize: isMobile ? 9 : 14, 
                      textAlign: "right", 
                      px: isMobile ? 0.5 : 1.5, 
                      py: isMobile ? 0.75 : 1.5, 
                      whiteSpace: "nowrap",
                      letterSpacing: "0.5px"
                    }}>
                      Rate
                    </TableCell>
                    <TableCell sx={{ 
                      fontWeight: "bold", 
                      color: "#ffffff", 
                      fontSize: isMobile ? 9 : 14, 
                      textAlign: "right", 
                      px: isMobile ? 0.5 : 1.5, 
                      py: isMobile ? 0.75 : 1.5, 
                      whiteSpace: "nowrap",
                      letterSpacing: "0.5px"
                    }}>
                      {isMobile ? "Amount" : "Total Amount"}
                    </TableCell>
                    <TableCell sx={{ 
                      fontWeight: "bold", 
                      color: "#ffffff", 
                      fontSize: isMobile ? 9 : 14, 
                      textAlign: "right", 
                      px: isMobile ? 0.5 : 1.5, 
                      py: isMobile ? 0.75 : 1.5, 
                      whiteSpace: "nowrap",
                      letterSpacing: "0.5px"
                    }}>
                      {isMobile ? "Tons" : "Total Tons"}
                    </TableCell>
                    <TableCell sx={{ 
                      fontWeight: "bold", 
                      color: "#ffffff", 
                      fontSize: isMobile ? 9 : 14, 
                      textAlign: "right", 
                      px: isMobile ? 0.5 : 1.5, 
                      py: isMobile ? 0.75 : 1.5, 
                      whiteSpace: "nowrap",
                      letterSpacing: "0.5px"
                    }}>
                      {isMobile ? "UC" : "Total UC"}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {results.map((r, i) => (
                    <TableRow 
                      key={i} 
                      sx={{ 
                        background: i % 2 === 0 ? "#f8f9fa" : "#ffffff",
                        "&:hover": { 
                          background: "#e3f2fd",
                          transform: "scale(1.01)",
                          transition: "all 0.2s ease-in-out",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                        },
                        transition: "all 0.2s ease-in-out"
                      }}
                    >
                      <TableCell sx={{ 
                        fontWeight: "bold", 
                        fontSize: isMobile ? 9 : 13, 
                        px: isMobile ? 0.5 : 1.5, 
                        py: isMobile ? 0.75 : 1.2, 
                        textAlign: "left", 
                        wordBreak: isMobile ? "break-word" : "normal",
                        color: "#212121"
                      }}>
                        <Typography sx={{ 
                          fontSize: isMobile ? 9 : 13, 
                          lineHeight: 1.4, 
                          fontWeight: "600",
                          color: "#212121"
                        }}>
                          {r.sku}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ 
                        fontWeight: "bold", 
                        fontSize: isMobile ? 9 : 13, 
                        px: isMobile ? 0.5 : 1.5, 
                        py: isMobile ? 0.75 : 1.2, 
                        textAlign: "right",
                        color: "#212121"
                      }}>
                        {r.finalCases > r.cases && r.freeCases > 0 ? (
                          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.4 }}>
                            <Typography component="span" sx={{ 
                              fontWeight: "bold", 
                              fontSize: isMobile ? 9 : 13,
                              color: "#212121"
                            }}>
                              {r.cases.toLocaleString()}
                            </Typography>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
                              <Typography component="span" sx={{ 
                                color: "#2e7d32", 
                                fontSize: isMobile ? 8 : 11, 
                                fontWeight: "bold" 
                              }}>
                                +{r.freeCases}
                              </Typography>
                              <Chip 
                                label="FREE" 
                                size="small" 
                                sx={{ 
                                  height: isMobile ? 18 : 20, 
                                  fontSize: isMobile ? 7 : 9, 
                                  backgroundColor: "#4caf50", 
                                  color: "white", 
                                  fontWeight: "bold",
                                  boxShadow: "0 2px 4px rgba(76, 175, 80, 0.3)"
                                }} 
                              />
                            </Box>
                          </Box>
                        ) : (
                          <Typography sx={{ 
                            fontSize: isMobile ? 9 : 13, 
                            fontWeight: "bold",
                            color: "#212121"
                          }}>
                            {r.cases.toLocaleString()}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ 
                        fontWeight: "bold", 
                        fontSize: isMobile ? 9 : 13, 
                        px: isMobile ? 0.5 : 1.5, 
                        py: isMobile ? 0.75 : 1.2, 
                        textAlign: "right",
                        color: "#212121"
                      }}>
                        {r.schemeApplied && r.schemeApplied.type === "discount" && r.discountAmount > 0 ? (
                          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.3 }}>
                            <Typography sx={{ 
                              fontSize: isMobile ? 9 : 13, 
                              fontWeight: "bold", 
                              color: "#1976d2",
                              textAlign: "right"
                            }}>
                              {(() => {
                                const discountPerCase = r.schemeApplied.discountAmount || 0;
                                const discountedRate = r.rate - discountPerCase;
                                return isMobile ? discountedRate : discountedRate.toLocaleString("en-IN", { maximumFractionDigits: 2 });
                              })()}
                            </Typography>
                            <Chip 
                              label="DISCOUNTED" 
                              size="small" 
                              sx={{ 
                                height: isMobile ? 18 : 20, 
                                fontSize: isMobile ? 7 : 9, 
                                backgroundColor: "#1976d2", 
                                color: "white", 
                                fontWeight: "bold",
                                boxShadow: "0 2px 4px rgba(25, 118, 210, 0.3)"
                              }} 
                            />
                          </Box>
                        ) : (
                          <Typography sx={{ 
                            fontSize: isMobile ? 9 : 13, 
                            fontWeight: "bold",
                            color: "#212121"
                          }}>
                            {isMobile ? r.rate : r.rate.toLocaleString()}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ 
                        fontWeight: "bold", 
                        fontSize: isMobile ? 9 : 13, 
                        px: isMobile ? 0.5 : 1.5, 
                        py: isMobile ? 0.75 : 1.2, 
                        textAlign: "right",
                        color: "#212121"
                      }}>
                        <Typography sx={{ 
                          fontSize: isMobile ? 9 : 13, 
                          fontWeight: "bold",
                          color: "#212121"
                        }}>
                          {isMobile ? Math.round(r.totalAmount).toLocaleString() : r.totalAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ 
                        fontWeight: "bold", 
                        fontSize: isMobile ? 9 : 13, 
                        px: isMobile ? 0.5 : 1.5, 
                        py: isMobile ? 0.75 : 1.2, 
                        textAlign: "right",
                        color: "#212121"
                      }}>
                        <Typography sx={{ 
                          fontSize: isMobile ? 9 : 13, 
                          fontWeight: "bold",
                          color: "#212121"
                        }}>
                          {r.totalTon.toFixed(3)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ 
                        fontWeight: "bold", 
                        fontSize: isMobile ? 9 : 13, 
                        px: isMobile ? 0.5 : 1.5, 
                        py: isMobile ? 0.75 : 1.2, 
                        textAlign: "right",
                        color: "#212121"
                      }}>
                        <Typography sx={{ 
                          fontSize: isMobile ? 9 : 13, 
                          fontWeight: "bold",
                          color: "#212121"
                        }}>
                          {r.totalUC !== null ? r.totalUC.toFixed(2) : "-"}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Total Discount Row */}
                  {totalDiscountSum > 0 && (
                    <TableRow sx={{ 
                      fontWeight: "bold", 
                      background: "linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)",
                      borderTop: "2px solid #f44336",
                      boxShadow: "0 2px 4px rgba(244, 67, 54, 0.2)"
                    }}>
                      <TableCell colSpan={3} sx={{ 
                        fontWeight: "bold", 
                        px: isMobile ? 0.5 : 1.5, 
                        py: isMobile ? 0.75 : 1.25, 
                        fontSize: isMobile ? 9 : 13, 
                        textAlign: "right" 
                      }}>
                        <Typography sx={{ 
                          fontWeight: "bold", 
                          color: "#c62828",
                          fontSize: isMobile ? 9 : 13
                        }}>
                          Total Discount:
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ 
                        fontWeight: "bold", 
                        px: isMobile ? 0.5 : 1.5, 
                        py: isMobile ? 0.75 : 1.25, 
                        fontSize: isMobile ? 9 : 13, 
                        textAlign: "right" 
                      }}>
                        <Typography sx={{ 
                          fontWeight: "bold", 
                          color: "#c62828",
                          fontSize: isMobile ? 9 : 13
                        }}>
                          {isMobile ? Math.round(totalDiscountSum).toLocaleString() : totalDiscountSum.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                        </Typography>
                      </TableCell>
                      <TableCell colSpan={2} sx={{ 
                        fontWeight: "bold", 
                        px: isMobile ? 0.5 : 1.5, 
                        py: isMobile ? 0.75 : 1.25, 
                        fontSize: isMobile ? 9 : 13, 
                        textAlign: "right" 
                      }}>
                        -
                      </TableCell>
                    </TableRow>
                  )}
                  
                  {/* Gross Total Row */}
                  <TableRow sx={{ 
                    fontWeight: "bold", 
                    background: "linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)",
                    borderTop: "3px solid #ff9800",
                    boxShadow: "0 2px 6px rgba(255, 152, 0, 0.2)"
                  }}>
                    <TableCell sx={{ 
                      fontWeight: "bold", 
                      px: isMobile ? 0.5 : 1.5, 
                      py: isMobile ? 0.75 : 1.5, 
                      fontSize: isMobile ? 10 : 14, 
                      textAlign: "left",
                      color: "#e65100"
                    }}>
                      Gross Total
                    </TableCell>
                    <TableCell sx={{ 
                      fontWeight: "bold", 
                      px: isMobile ? 0.5 : 1.5, 
                      py: isMobile ? 0.75 : 1.5, 
                      fontSize: isMobile ? 10 : 14, 
                      textAlign: "right",
                      color: "#212121"
                    }}>
                      <Typography sx={{ 
                        fontSize: isMobile ? 10 : 14, 
                        fontWeight: "bold",
                        color: "#212121"
                      }}>
                        {(totalCasesSum + totalFreeCasesSum).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ 
                      fontWeight: "bold", 
                      px: isMobile ? 0.5 : 1.5, 
                      py: isMobile ? 0.75 : 1.5, 
                      fontSize: isMobile ? 10 : 14, 
                      textAlign: "right",
                      color: "#757575"
                    }}>
                      -
                    </TableCell>
                    <TableCell sx={{ 
                      fontWeight: "bold", 
                      px: isMobile ? 0.5 : 1.5, 
                      py: isMobile ? 0.75 : 1.5, 
                      fontSize: isMobile ? 10 : 14, 
                      textAlign: "right", 
                      color: "#d32f2f" 
                    }}>
                      <Typography sx={{ 
                        fontSize: isMobile ? 10 : 14, 
                        fontWeight: "bold",
                        color: "#d32f2f"
                      }}>
                        {isMobile ? Math.round(totalAmountSum).toLocaleString() : totalAmountSum.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ 
                      fontWeight: "bold", 
                      px: isMobile ? 0.5 : 1.5, 
                      py: isMobile ? 0.75 : 1.5, 
                      fontSize: isMobile ? 10 : 14, 
                      textAlign: "right",
                      color: "#212121"
                    }}>
                      <Typography sx={{ 
                        fontSize: isMobile ? 10 : 14, 
                        fontWeight: "bold",
                        color: "#212121"
                      }}>
                        {totalTonSum.toFixed(3)}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ 
                      fontWeight: "bold", 
                      px: isMobile ? 0.5 : 1.5, 
                      py: isMobile ? 0.75 : 1.5, 
                      fontSize: isMobile ? 10 : 14, 
                      textAlign: "right",
                      color: "#757575"
                    }}>
                      -
                    </TableCell>
                  </TableRow>
                  
                  {/* GST Row - Only show if GST is enabled and applicable */}
                  {gstEnabled && !isGelephuGrocery && gstAmount > 0 && (
                    <TableRow sx={{ 
                      fontWeight: "bold", 
                      background: "linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%)",
                      borderTop: "2px solid #ffc107",
                      boxShadow: "0 2px 4px rgba(255, 193, 7, 0.2)"
                    }}>
                      <TableCell colSpan={3} sx={{ 
                        fontWeight: "bold", 
                        px: isMobile ? 0.5 : 1.5, 
                        py: isMobile ? 0.75 : 1, 
                        fontSize: isMobile ? 9 : 13, 
                        textAlign: "right",
                        color: "#f57c00"
                      }}>
                        <Typography sx={{ 
                          fontWeight: "bold",
                          fontSize: isMobile ? 9 : 13,
                          color: "#f57c00"
                        }}>
                          GST (5%):
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ 
                        fontWeight: "bold", 
                        px: isMobile ? 0.5 : 1.5, 
                        py: isMobile ? 0.75 : 1, 
                        fontSize: isMobile ? 9 : 13, 
                        textAlign: "right",
                        color: "#212121"
                      }}>
                        <Typography sx={{ 
                          fontWeight: "bold",
                          fontSize: isMobile ? 9 : 13,
                          color: "#212121"
                        }}>
                          {isMobile ? Math.round(gstAmount).toLocaleString() : gstAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                        </Typography>
                      </TableCell>
                      <TableCell colSpan={2} sx={{ 
                        fontWeight: "bold", 
                        px: isMobile ? 0.5 : 1.5, 
                        py: isMobile ? 0.75 : 1, 
                        fontSize: isMobile ? 9 : 13, 
                        textAlign: "right",
                        color: "#757575"
                      }}>
                        -
                      </TableCell>
                    </TableRow>
                  )}
                  
                  {/* Net Total Row */}
                  <TableRow sx={{ 
                    fontWeight: "bold", 
                    background: "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)",
                    borderTop: "3px solid #4caf50",
                    boxShadow: "0 4px 8px rgba(76, 175, 80, 0.3)"
                  }}>
                    <TableCell colSpan={3} sx={{ 
                      fontWeight: "bold", 
                      px: isMobile ? 0.5 : 1.5, 
                      py: isMobile ? 0.75 : 1.25, 
                      fontSize: isMobile ? 10 : 15, 
                      textAlign: "right",
                      color: "#1b5e20"
                    }}>
                      <Typography sx={{ 
                        fontWeight: "bold", 
                        fontSize: isMobile ? 10 : 15,
                        color: "#1b5e20"
                      }}>
                        Net Total:
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ 
                      fontWeight: "bold", 
                      px: isMobile ? 0.5 : 1.5, 
                      py: isMobile ? 0.75 : 1.25, 
                      fontSize: isMobile ? 10 : 15, 
                      textAlign: "right", 
                      color: "#2e7d32" 
                    }}>
                      <Typography sx={{ 
                        fontWeight: "bold", 
                        fontSize: isMobile ? 10 : 15,
                        color: "#2e7d32"
                      }}>
                        {isMobile ? Math.round(netTotal).toLocaleString() : netTotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                      </Typography>
                    </TableCell>
                    <TableCell colSpan={2} sx={{ 
                      fontWeight: "bold", 
                      px: isMobile ? 0.5 : 1.5, 
                      py: isMobile ? 0.75 : 1.25, 
                      fontSize: isMobile ? 10 : 15, 
                      textAlign: "right",
                      color: "#757575"
                    }}>
                      -
                    </TableCell>
                  </TableRow>
                  <TableRow sx={{ 
                    fontWeight: "bold", 
                    background: "#f5f5f5",
                    borderTop: "1px solid #e0e0e0"
                  }}>
                    <TableCell colSpan={5} sx={{ 
                      fontWeight: "bold", 
                      px: isMobile ? 0.5 : 1.5, 
                      py: isMobile ? 0.5 : 1, 
                      textAlign: "right", 
                      fontSize: isMobile ? 9 : 13,
                      color: "#424242"
                    }}>
                      <Typography sx={{ 
                        fontWeight: "bold",
                        fontSize: isMobile ? 9 : 13,
                        color: "#424242"
                      }}>
                        CSD UC:
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ 
                      fontWeight: "bold", 
                      px: isMobile ? 0.5 : 1.5, 
                      py: isMobile ? 0.5 : 1, 
                      textAlign: "right", 
                      fontSize: isMobile ? 9 : 13,
                      color: "#212121"
                    }}>
                      <Typography sx={{ 
                        fontWeight: "bold",
                        fontSize: isMobile ? 9 : 13,
                        color: "#212121"
                      }}>
                        {totalUC_CSD.toFixed(2)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow sx={{ 
                    fontWeight: "bold", 
                    background: "#f5f5f5"
                  }}>
                    <TableCell colSpan={5} sx={{ 
                      fontWeight: "bold", 
                      px: isMobile ? 0.5 : 1.5, 
                      py: isMobile ? 0.5 : 1, 
                      textAlign: "right", 
                      fontSize: isMobile ? 9 : 13,
                      color: "#424242"
                    }}>
                      <Typography sx={{ 
                        fontWeight: "bold",
                        fontSize: isMobile ? 9 : 13,
                        color: "#424242"
                      }}>
                        Water UC:
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ 
                      fontWeight: "bold", 
                      px: isMobile ? 0.5 : 1.5, 
                      py: isMobile ? 0.5 : 1, 
                      textAlign: "right", 
                      fontSize: isMobile ? 9 : 13,
                      color: "#212121"
                    }}>
                      <Typography sx={{ 
                        fontWeight: "bold",
                        fontSize: isMobile ? 9 : 13,
                        color: "#212121"
                      }}>
                        {totalUC_Kinley.toFixed(2)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Box>

      {/* Order Summary Dialog */}
      <Dialog open={orderDialogOpen} onClose={() => setOrderDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: "bold", color: "#e53935" }}>
          Order Summary
        </DialogTitle>
        <DialogContent>
       <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 2, pt: 1, pb: 1 }}>
        {/* Distributor Name on left */}
        <Box sx={{ fontWeight: "bold", color: "#000", fontSize: isMobile ? 12 : 14 }}>
          {distributorName || "Demo Distributor"}
        </Box>

        {/* Order No. in center */}
        <Box sx={{ fontWeight: "bold", fontSize: isMobile ? 12 : 14, textAlign: "center", flexGrow: 1 }}>
          Order No: {currentOrderNumber || getCurrentOrderNumber()}
        </Box>

        {/* Date on right */}
        <Box
          sx={{
            fontWeight: "bold",
            fontSize: isMobile ? 10 : 12, // smaller font
            color: "#000",
            letterSpacing: 0.5,
          }}
        >
          📅 {new Date().toLocaleDateString()}
        </Box>
      </Box>
          <TableContainer component={Paper} sx={{ background: "#ffffff", borderRadius: 2, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", border: "1px solid #e0e0e0" }}>
            <Table size="small" sx={{ width: "100%" }}>
              <TableHead>
                <TableRow sx={{ 
                  background: "linear-gradient(135deg, #e53935 0%, #c62828 100%)",
                  boxShadow: "0 2px 8px rgba(229, 57, 53, 0.3)"
                }}>
                  <TableCell sx={{ 
                    fontWeight: "bold", 
                    color: "#ffffff", 
                    fontSize: isMobile ? 9 : 14, 
                    textAlign: "left", 
                    px: isMobile ? 0.5 : 1.5, 
                    py: isMobile ? 0.75 : 1.5, 
                    whiteSpace: "nowrap",
                    letterSpacing: "0.5px"
                  }}>
                    SKU
                  </TableCell>
                  <TableCell sx={{ 
                    fontWeight: "bold", 
                    color: "#ffffff", 
                    fontSize: isMobile ? 9 : 14, 
                    textAlign: "right", 
                    px: isMobile ? 0.5 : 1.5, 
                    py: isMobile ? 0.75 : 1.5, 
                    whiteSpace: "nowrap",
                    letterSpacing: "0.5px"
                  }}>
                    {isMobile ? "Qty" : "Qty/Cases"}
                  </TableCell>
                  <TableCell sx={{ 
                    fontWeight: "bold", 
                    color: "#ffffff", 
                    fontSize: isMobile ? 9 : 14, 
                    textAlign: "right", 
                    px: isMobile ? 0.5 : 1.5, 
                    py: isMobile ? 0.75 : 1.5, 
                    whiteSpace: "nowrap",
                    letterSpacing: "0.5px"
                  }}>
                    Rate
                  </TableCell>
                  <TableCell sx={{ 
                    fontWeight: "bold", 
                    color: "#ffffff", 
                    fontSize: isMobile ? 9 : 14, 
                    textAlign: "right", 
                    px: isMobile ? 0.5 : 1.5, 
                    py: isMobile ? 0.75 : 1.5, 
                    whiteSpace: "nowrap",
                    letterSpacing: "0.5px"
                  }}>
                    {isMobile ? "Amount" : "Total Amount"}
                  </TableCell>
                  <TableCell sx={{ 
                    fontWeight: "bold", 
                    color: "#ffffff", 
                    fontSize: isMobile ? 9 : 14, 
                    textAlign: "right", 
                    px: isMobile ? 0.5 : 1.5, 
                    py: isMobile ? 0.75 : 1.5, 
                    whiteSpace: "nowrap",
                    letterSpacing: "0.5px"
                  }}>
                    {isMobile ? "Tons" : "Total Tons"}
                  </TableCell>
                  <TableCell sx={{ 
                    fontWeight: "bold", 
                    color: "#ffffff", 
                    fontSize: isMobile ? 9 : 14, 
                    textAlign: "right", 
                    px: isMobile ? 0.5 : 1.5, 
                    py: isMobile ? 0.75 : 1.5, 
                    whiteSpace: "nowrap",
                    letterSpacing: "0.5px"
                  }}>
                    {isMobile ? "UC" : "Total UC"}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {results.map((r, i) => (
                  <TableRow 
                    key={i} 
                    sx={{ 
                      background: i % 2 === 0 ? "#f8f9fa" : "#ffffff",
                      "&:hover": { 
                        background: "#e3f2fd",
                        transform: "scale(1.01)",
                        transition: "all 0.2s ease-in-out",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                      },
                      transition: "all 0.2s ease-in-out"
                    }}
                  >
                    <TableCell sx={{ fontWeight: "bold", fontSize: isMobile ? 9 : 13, px: isMobile ? 0.5 : 1.5, py: isMobile ? 0.75 : 1.2, textAlign: "left", whiteSpace: "nowrap", color: "#212121" }}>
                      <Typography sx={{ fontSize: isMobile ? 9 : 13, fontWeight: "600", color: "#212121" }}>{r.sku}</Typography>
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold", fontSize: isMobile ? 9 : 13, px: isMobile ? 0.5 : 1.5, py: isMobile ? 0.75 : 1.2, textAlign: "right", whiteSpace: "nowrap", color: "#212121" }}>
                      {r.finalCases > r.cases && r.freeCases > 0 ? (
                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.4 }}>
                          <Typography component="span" sx={{ fontWeight: "bold", fontSize: isMobile ? 9 : 13, color: "#212121" }}>{r.cases.toLocaleString()}</Typography>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
                            <Typography component="span" sx={{ color: "#2e7d32", fontSize: isMobile ? 8 : 11, fontWeight: "bold" }}>+{r.freeCases}</Typography>
                            <Chip label="FREE" size="small" sx={{ height: isMobile ? 18 : 20, fontSize: isMobile ? 7 : 9, backgroundColor: "#4caf50", color: "white", fontWeight: "bold", boxShadow: "0 2px 4px rgba(76, 175, 80, 0.3)" }} />
                          </Box>
                        </Box>
                      ) : (
                        <Typography sx={{ fontWeight: "bold", fontSize: isMobile ? 9 : 13, color: "#212121" }}>{r.cases.toLocaleString()}</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold", fontSize: isMobile ? 9 : 13, px: isMobile ? 0.5 : 1.5, py: isMobile ? 0.75 : 1.2, textAlign: "right", whiteSpace: "nowrap", color: "#212121" }}>
                      {r.schemeApplied && r.schemeApplied.type === "discount" && r.discountAmount > 0 ? (
                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.3 }}>
                          <Typography sx={{ fontSize: isMobile ? 9 : 13, fontWeight: "bold", color: "#1976d2", textAlign: "right" }}>
                            {(() => {
                              const discountPerCase = r.schemeApplied.discountAmount || 0;
                              const discountedRate = r.rate - discountPerCase;
                              return isMobile ? discountedRate : discountedRate.toLocaleString("en-IN", { maximumFractionDigits: 2 });
                            })()}
                          </Typography>
                          <Chip label="DISCOUNTED" size="small" sx={{ height: isMobile ? 18 : 20, fontSize: isMobile ? 7 : 9, backgroundColor: "#1976d2", color: "white", fontWeight: "bold", boxShadow: "0 2px 4px rgba(25, 118, 210, 0.3)" }} />
                        </Box>
                      ) : (
                        <Typography sx={{ fontSize: isMobile ? 9 : 13, fontWeight: "bold", color: "#212121" }}>
                          {isMobile ? r.rate : r.rate.toLocaleString()}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold", fontSize: isMobile ? 9 : 13, px: isMobile ? 0.5 : 1.5, py: isMobile ? 0.75 : 1.2, textAlign: "right", whiteSpace: "nowrap", color: "#212121" }}>
                      <Typography sx={{ fontSize: isMobile ? 9 : 13, fontWeight: "bold", color: "#212121" }}>
                        {isMobile ? Math.round(r.totalAmount).toLocaleString() : r.totalAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold", fontSize: isMobile ? 9 : 13, px: isMobile ? 0.5 : 1.5, py: isMobile ? 0.75 : 1.2, textAlign: "right", whiteSpace: "nowrap", color: "#212121" }}>
                      <Typography sx={{ fontSize: isMobile ? 9 : 13, fontWeight: "bold", color: "#212121" }}>{r.totalTon.toFixed(3)}</Typography>
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold", fontSize: isMobile ? 9 : 13, px: isMobile ? 0.5 : 1.5, py: isMobile ? 0.75 : 1.2, textAlign: "right", whiteSpace: "nowrap", color: "#212121" }}>
                      <Typography sx={{ fontSize: isMobile ? 9 : 13, fontWeight: "bold", color: "#212121" }}>{r.totalUC !== null ? r.totalUC.toFixed(2) : "-"}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
                {/* Total Discount Row */}
                {totalDiscountSum > 0 && (
                  <TableRow sx={{ 
                    fontWeight: "bold", 
                    background: "linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)",
                    borderTop: "2px solid #f44336",
                    boxShadow: "0 2px 4px rgba(244, 67, 54, 0.2)"
                  }}>
                    <TableCell colSpan={3} sx={{ fontWeight: "bold", px: isMobile ? 0.5 : 1.5, py: isMobile ? 0.75 : 1.25, fontSize: isMobile ? 9 : 13, textAlign: "right", whiteSpace: "nowrap" }}>
                      <Typography sx={{ fontWeight: "bold", color: "#c62828", fontSize: isMobile ? 9 : 13 }}>Total Discount:</Typography>
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold", px: isMobile ? 0.5 : 1.5, py: isMobile ? 0.75 : 1.25, fontSize: isMobile ? 9 : 13, textAlign: "right", whiteSpace: "nowrap" }}>
                      <Typography sx={{ fontWeight: "bold", color: "#c62828", fontSize: isMobile ? 9 : 13 }}>
                        {isMobile ? Math.round(totalDiscountSum).toLocaleString() : totalDiscountSum.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                      </Typography>
                    </TableCell>
                    <TableCell colSpan={2} sx={{ fontWeight: "bold", px: isMobile ? 0.5 : 1.5, py: isMobile ? 0.75 : 1.25, fontSize: isMobile ? 9 : 13, textAlign: "right", whiteSpace: "nowrap" }}>-</TableCell>
                  </TableRow>
                )}
                
                {/* Gross Total Row */}
                <TableRow sx={{ 
                  fontWeight: "bold", 
                  background: "linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)",
                  borderTop: "3px solid #ff9800",
                  boxShadow: "0 2px 6px rgba(255, 152, 0, 0.2)"
                }}>
                  <TableCell sx={{ fontWeight: "bold", px: isMobile ? 0.5 : 1.5, py: isMobile ? 0.75 : 1.5, fontSize: isMobile ? 10 : 14, textAlign: "left", whiteSpace: "nowrap", color: "#e65100" }}>Gross Total</TableCell>
                  <TableCell sx={{ fontWeight: "bold", px: isMobile ? 0.5 : 1.5, py: isMobile ? 0.75 : 1.5, fontSize: isMobile ? 10 : 14, textAlign: "right", whiteSpace: "nowrap", color: "#212121" }}>
                    <Typography sx={{ fontSize: isMobile ? 10 : 14, fontWeight: "bold", color: "#212121" }}>{(totalCasesSum + totalFreeCasesSum).toLocaleString()}</Typography>
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold", px: isMobile ? 0.5 : 1.5, py: isMobile ? 0.75 : 1.5, fontSize: isMobile ? 10 : 14, textAlign: "right", whiteSpace: "nowrap", color: "#757575" }}>-</TableCell>
                  <TableCell sx={{ fontWeight: "bold", px: isMobile ? 0.5 : 1.5, py: isMobile ? 0.75 : 1.5, fontSize: isMobile ? 10 : 14, textAlign: "right", color: "#d32f2f", whiteSpace: "nowrap" }}>
                    <Typography sx={{ fontSize: isMobile ? 10 : 14, fontWeight: "bold", color: "#d32f2f" }}>
                      {isMobile ? Math.round(totalAmountSum).toLocaleString() : totalAmountSum.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold", px: isMobile ? 0.5 : 1.5, py: isMobile ? 0.75 : 1.5, fontSize: isMobile ? 10 : 14, textAlign: "right", whiteSpace: "nowrap", color: "#212121" }}>
                    <Typography sx={{ fontSize: isMobile ? 10 : 14, fontWeight: "bold", color: "#212121" }}>{totalTonSum.toFixed(3)}</Typography>
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold", px: isMobile ? 0.5 : 1.5, py: isMobile ? 0.75 : 1.5, fontSize: isMobile ? 10 : 14, textAlign: "right", whiteSpace: "nowrap", color: "#757575" }}>-</TableCell>
                </TableRow>
                
                {/* GST Row - Only show if GST is enabled and applicable */}
                {gstEnabled && !isGelephuGrocery && gstAmount > 0 && (
                  <TableRow sx={{ 
                    fontWeight: "bold", 
                    background: "linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%)",
                    borderTop: "2px solid #ffc107",
                    boxShadow: "0 2px 4px rgba(255, 193, 7, 0.2)"
                  }}>
                    <TableCell colSpan={3} sx={{ fontWeight: "bold", px: isMobile ? 0.5 : 1.5, py: isMobile ? 0.75 : 1, fontSize: isMobile ? 9 : 13, textAlign: "right", whiteSpace: "nowrap", color: "#f57c00" }}>
                      <Typography sx={{ fontWeight: "bold", fontSize: isMobile ? 9 : 13, color: "#f57c00" }}>GST (5%):</Typography>
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold", px: isMobile ? 0.5 : 1.5, py: isMobile ? 0.75 : 1, fontSize: isMobile ? 9 : 13, textAlign: "right", whiteSpace: "nowrap", color: "#212121" }}>
                      <Typography sx={{ fontWeight: "bold", fontSize: isMobile ? 9 : 13, color: "#212121" }}>
                        {isMobile ? Math.round(gstAmount).toLocaleString() : gstAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                      </Typography>
                    </TableCell>
                    <TableCell colSpan={2} sx={{ fontWeight: "bold", px: isMobile ? 0.5 : 1.5, py: isMobile ? 0.75 : 1, fontSize: isMobile ? 9 : 13, textAlign: "right", whiteSpace: "nowrap", color: "#757575" }}>-</TableCell>
                  </TableRow>
                )}
                
                {/* Net Total Row */}
                <TableRow sx={{ 
                  fontWeight: "bold", 
                  background: "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)",
                  borderTop: "3px solid #4caf50",
                  boxShadow: "0 4px 8px rgba(76, 175, 80, 0.3)"
                }}>
                  <TableCell colSpan={3} sx={{ fontWeight: "bold", px: isMobile ? 0.5 : 1.5, py: isMobile ? 0.75 : 1.25, fontSize: isMobile ? 10 : 15, textAlign: "right", whiteSpace: "nowrap", color: "#1b5e20" }}>
                    <Typography sx={{ fontWeight: "bold", fontSize: isMobile ? 10 : 15, color: "#1b5e20" }}>Net Total:</Typography>
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold", px: isMobile ? 0.5 : 1.5, py: isMobile ? 0.75 : 1.25, fontSize: isMobile ? 10 : 15, textAlign: "right", color: "#2e7d32", whiteSpace: "nowrap" }}>
                    <Typography sx={{ fontWeight: "bold", fontSize: isMobile ? 10 : 15, color: "#2e7d32" }}>
                      {isMobile ? Math.round(netTotal).toLocaleString() : netTotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    </Typography>
                  </TableCell>
                  <TableCell colSpan={2} sx={{ fontWeight: "bold", px: isMobile ? 0.5 : 1.5, py: isMobile ? 0.75 : 1.25, fontSize: isMobile ? 10 : 15, textAlign: "right", whiteSpace: "nowrap", color: "#757575" }}>-</TableCell>
                </TableRow>
                
                <TableRow sx={{ fontWeight: "bold", background: "#f5f5f5", borderTop: "1px solid #e0e0e0" }}>
                  <TableCell colSpan={5} sx={{ fontWeight: "bold", px: isMobile ? 0.5 : 1.5, py: isMobile ? 0.5 : 1, textAlign: "right", fontSize: isMobile ? 9 : 13, whiteSpace: "nowrap", color: "#424242" }}>
                    <Typography sx={{ fontWeight: "bold", fontSize: isMobile ? 9 : 13, color: "#424242" }}>CSD UC:</Typography>
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold", px: isMobile ? 0.5 : 1.5, py: isMobile ? 0.5 : 1, textAlign: "right", fontSize: isMobile ? 9 : 13, whiteSpace: "nowrap", color: "#212121" }}>
                    <Typography sx={{ fontWeight: "bold", fontSize: isMobile ? 9 : 13, color: "#212121" }}>{totalUC_CSD.toFixed(2)}</Typography>
                  </TableCell>
                </TableRow>
                <TableRow sx={{ fontWeight: "bold", background: "#f5f5f5" }}>
                  <TableCell colSpan={5} sx={{ fontWeight: "bold", px: isMobile ? 0.5 : 1.5, py: isMobile ? 0.5 : 1, textAlign: "right", fontSize: isMobile ? 9 : 13, whiteSpace: "nowrap", color: "#424242" }}>
                    <Typography sx={{ fontWeight: "bold", fontSize: isMobile ? 9 : 13, color: "#424242" }}>Water UC:</Typography>
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold", px: isMobile ? 0.5 : 1.5, py: isMobile ? 0.5 : 1, textAlign: "right", fontSize: isMobile ? 9 : 13, whiteSpace: "nowrap", color: "#212121" }}>
                    <Typography sx={{ fontWeight: "bold", fontSize: isMobile ? 9 : 13, color: "#212121" }}>{totalUC_Kinley.toFixed(2)}</Typography>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
    
              {/* Caption Input Box */}
              <TextField
              label="Additional Info / Caption"
              multiline
              rows={3}
              fullWidth
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              sx={{
                mt: 2,
            "& .MuiInputBase-root": {
              backgroundColor: "#fffde7", // match table background
              borderRadius: 2,
            },
            "& .MuiInputLabel-root": { fontWeight: "bold", color: "#e53935" },
          }}
          placeholder="Write any additional info here..."
        />
        </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrderDialogOpen(false)} color="secondary">Cancel</Button>
          <Button onClick={handleSubmitOrder} color="primary" variant="contained">{submitOrderButtonText}</Button>
        </DialogActions>
      </Dialog>

      <AppSnackbar
        open={snackbarOpen}
        severity="success"
        message="Screenshot copied to clipboard!"
        autoHideDuration={2200}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      />
    </>
  );
}

export default CokeCalculator;
