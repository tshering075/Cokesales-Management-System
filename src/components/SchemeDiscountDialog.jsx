import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Checkbox,
  Paper,
  Grid,
  Alert,
  Divider,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  InputAdornment,
  Tooltip,
  Avatar,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import AddIcon from "@mui/icons-material/Add";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import EventIcon from "@mui/icons-material/Event";
import PeopleIcon from "@mui/icons-material/People";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";

// Product SKUs grouped by category and size
const PRODUCT_SKUS = {
  "CSD 300ml": [
    "COKE 300 ML",
    "FANTA 300 ML",
    "SPRITE 300 ML",
    "CHARGED 300 ML",
  ],
  "CSD 500ml": [
    "COKE 500 ML",
    "FANTA 500 ML",
    "SPRITE 500 ML",
  ],
  "CSD 1.25L": [
    "COKE 1.25 L",
    "FANTA 1.25 L",
    "SPRITE 1.25 L",
  ],
  "Water 200ml": [
    "KINLEY WATER 200 ML",
  ],
  "Water 500ml": [
    "KINLEY WATER 500 ML",
  ],
  "Water 1L": [
    "KINLEY WATER 1 L",
  ],
};

// Flatten all SKUs for easy access
const ALL_SKUS = Object.values(PRODUCT_SKUS).flat();

export default function SchemeDiscountDialog({
  open,
  onClose,
  distributors = [],
  schemes = [],
  onSaveScheme,
  onDeleteScheme,
  isFirebaseConfigured = false,
}) {
  // Debug: Log distributors prop whenever it changes
  useEffect(() => {
    console.log('📋 SchemeDiscountDialog - Distributors prop updated:', {
      count: distributors.length,
      isArray: Array.isArray(distributors),
      distributors: distributors.slice(0, 3), // Show first 3 for debugging
      allHaveCodes: distributors.every(d => d && d.code),
      someHaveCodes: distributors.some(d => d && d.code)
    });
  }, [distributors]);
  
  // Debug: Log when dialog opens
  useEffect(() => {
    if (open) {
      console.log('📋 SchemeDiscountDialog opened:', {
        distributorsCount: distributors.length,
        hasDistributors: Array.isArray(distributors) && distributors.length > 0,
        distributorsWithCodes: distributors.filter(d => d && d.code).length
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const [schemeType, setSchemeType] = useState("csd_scheme");
  const [schemeName, setSchemeName] = useState("");
  const [buyQuantity, setBuyQuantity] = useState(6);
  const [freeQuantity, setFreeQuantity] = useState(1);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedDistributors, setSelectedDistributors] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSKUs, setSelectedSKUs] = useState([]);
  const [skuSearchTerm, setSkuSearchTerm] = useState("");
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    if (open) {
      setSchemeType("csd_scheme");
      setSchemeName("");
      setBuyQuantity(6);
      setFreeQuantity(1);
      setDiscountAmount(0);
      setStartDate("");
      setEndDate("");
      setSelectedDistributors([]);
      setSearchTerm("");
      setSelectedSKUs([]);
      setSkuSearchTerm("");
      setTabValue(0);
    }
  }, [open]);
  
  // Clean up undefined values whenever selectedDistributors changes
  // Use a ref to prevent infinite loops
  const prevDistributorsRef = useRef(selectedDistributors);
  useEffect(() => {
    const hasUndefined = selectedDistributors.some(code => code === undefined || code === null || code === '');
    if (hasUndefined && JSON.stringify(prevDistributorsRef.current) !== JSON.stringify(selectedDistributors)) {
      const cleaned = selectedDistributors.filter(code => code !== undefined && code !== null && code !== '');
      console.warn('🧹 Cleaning up undefined values from selectedDistributors:', {
        before: selectedDistributors,
        after: cleaned
      });
      setSelectedDistributors(cleaned);
      prevDistributorsRef.current = cleaned;
    } else {
      prevDistributorsRef.current = selectedDistributors;
    }
  }, [selectedDistributors]);

  // First, filter to only valid distributors with codes
  const validDistributors = distributors.filter(d => {
    if (!d) return false;
    // Must have a code
    if (!d.code || d.code === undefined || d.code === null || String(d.code).trim() === '') {
      return false;
    }
    return true;
  });
  
  // Then filter by search term
  const filteredDistributors = validDistributors.filter(
    (d) => {
      if (!searchTerm) return true; // Show all if no search term
      const searchLower = searchTerm.toLowerCase();
      const nameMatch = d.name?.toLowerCase().includes(searchLower) || false;
      const codeMatch = String(d.code).toLowerCase().includes(searchLower) || false;
      return nameMatch || codeMatch;
    }
  );
  
  // Debug logging
  useEffect(() => {
    if (open) {
      console.log('🔍 Distributor filtering debug:', {
        totalDistributors: distributors.length,
        validDistributors: validDistributors.length,
        filteredDistributors: filteredDistributors.length,
        searchTerm: searchTerm || '(none)',
        sampleDistributors: validDistributors.slice(0, 3).map(d => ({ name: d.name, code: d.code }))
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, searchTerm, distributors.length]);

  const handleToggleDistributor = (distributorCode) => {
    // Validate that distributorCode is valid
    if (!distributorCode || distributorCode === undefined || distributorCode === null || distributorCode === '') {
      console.error('❌ Invalid distributor code:', distributorCode);
      return;
    }
    
    setSelectedDistributors((prev) => {
      // Filter out any existing undefined/null values
      const cleanPrev = prev.filter(code => code !== undefined && code !== null && code !== '');
      
      if (cleanPrev.includes(distributorCode)) {
        return cleanPrev.filter((code) => code !== distributorCode);
      } else {
        return [...cleanPrev, distributorCode];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedDistributors.length === filteredDistributors.length) {
      setSelectedDistributors([]);
    } else {
      // Only include distributors with valid codes
      const validCodes = filteredDistributors
        .map((d) => d.code)
        .filter(code => code !== undefined && code !== null && code !== '');
      setSelectedDistributors(validCodes);
    }
  };

  const handleSave = () => {
    // Immediately clean up any undefined values in state
    const cleanedDistributors = selectedDistributors.filter(code => code !== undefined && code !== null && code !== '');
    const cleanedSKUs = selectedSKUs.filter(sku => sku !== undefined && sku !== null && sku !== '');
    
    // Update state if cleanup was needed
    if (cleanedDistributors.length !== selectedDistributors.length) {
      console.warn('🧹 Cleaned undefined values from selectedDistributors in handleSave:', {
        before: selectedDistributors,
        after: cleanedDistributors
      });
      setSelectedDistributors(cleanedDistributors);
    }
    if (cleanedSKUs.length !== selectedSKUs.length) {
      console.warn('🧹 Cleaned undefined values from selectedSKUs in handleSave:', {
        before: selectedSKUs,
        after: cleanedSKUs
      });
      setSelectedSKUs(cleanedSKUs);
    }
    
    // Use cleaned arrays for validation
    const validDistributors = cleanedDistributors;
    const validSKUs = cleanedSKUs;
    
    // Debug: Log current state before validation
    console.log('🔍 handleSave called with state:', {
      selectedDistributorsCount: selectedDistributors.length,
      selectedDistributors: selectedDistributors,
      cleanedDistributorsCount: validDistributors.length,
      cleanedDistributors: validDistributors,
      selectedSKUsCount: selectedSKUs.length,
      distributorsPropCount: distributors.length,
      schemeName: schemeName
    });
    
    if (!schemeName.trim()) {
      alert("Please enter a scheme name");
      return;
    }

    if (!startDate || !endDate) {
      alert("Please select start and end dates");
      return;
    }

    if (new Date(startDate) >= new Date(endDate)) {
      alert("End date must be after start date");
      return;
    }

    // Validate distributors - this is critical (use cleaned arrays)
    if (!Array.isArray(validDistributors) || validDistributors.length === 0) {
      console.error('❌ No valid distributors selected!', {
        originalSelectedDistributors: selectedDistributors,
        cleanedDistributors: validDistributors,
        isArray: Array.isArray(validDistributors),
        length: validDistributors?.length,
        distributorsProp: distributors
      });
      alert("Please select at least one distributor");
      return;
    }

    if (validSKUs.length === 0) {
      alert("Please select at least one product SKU");
      return;
    }

    if (schemeType === "csd_scheme" && (buyQuantity <= 0 || freeQuantity < 0)) {
      alert("Buy quantity must be greater than 0, and free quantity must be 0 or more");
      return;
    }

    if (schemeType === "discount" && discountAmount <= 0) {
      alert("Discount amount must be greater than 0");
      return;
    }

    // Determine appliesTo for backward compatibility (use cleaned arrays)
    const csdSKUs = validSKUs.filter(sku => 
      PRODUCT_SKUS["CSD 300ml"].includes(sku) ||
      PRODUCT_SKUS["CSD 500ml"].includes(sku) ||
      PRODUCT_SKUS["CSD 1.25L"].includes(sku)
    );
    const waterSKUs = validSKUs.filter(sku =>
      PRODUCT_SKUS["Water 200ml"].includes(sku) ||
      PRODUCT_SKUS["Water 500ml"].includes(sku) ||
      PRODUCT_SKUS["Water 1L"].includes(sku)
    );
    let appliesTo = "csd";
    if (csdSKUs.length > 0 && waterSKUs.length > 0) {
      appliesTo = "both";
    } else if (waterSKUs.length > 0) {
      appliesTo = "water";
    }
    
    // Process the already-cleaned arrays
    const distributorsArray = validDistributors
      .map(d => String(d).trim())
      .filter(d => d.length > 0);
    
    const skusArray = validSKUs
      .map(s => String(s).trim())
      .filter(s => s.length > 0);
    
    // Final validation - distributors must not be empty
    if (distributorsArray.length === 0) {
      console.error('❌ Distributors array is empty after processing!', {
        originalSelectedDistributors: selectedDistributors,
        cleanedDistributors: validDistributors,
        processedDistributors: distributorsArray,
        distributorsProp: distributors,
        distributorsPropLength: distributors.length
      });
      alert("Please select at least one distributor. The selected distributors appear to be invalid. Please check that distributors have valid codes.");
      return;
    }
    
    // Final check before building schemeData
    if (distributorsArray.length === 0) {
      console.error('❌ CRITICAL: Distributors array is empty!', {
        selectedDistributors,
        distributorsArray,
        filtered: distributorsArray
      });
      alert("ERROR: No valid distributors selected. Please select at least one distributor and try again.");
      return;
    }
    
    const schemeData = {
      id: `scheme_${Date.now()}`,
      type: schemeType,
      name: schemeName.trim(),
      appliesTo: appliesTo, // For backward compatibility
      appliesToSKUs: skusArray.length > 0 ? skusArray : [], // Ensure it's always an array
      startDate: startDate,
      endDate: endDate,
      distributors: distributorsArray, // This should NEVER be empty at this point
      createdAt: new Date().toISOString(),
    };
    
    // Debug: Log the scheme data before saving
    console.log('📝 Saving scheme with distributors:', {
      selectedDistributorsCount: selectedDistributors.length,
      selectedDistributors: selectedDistributors,
      distributorsArrayCount: distributorsArray.length,
      distributorsArray: distributorsArray,
      schemeDistributorsCount: schemeData.distributors.length,
      schemeDistributors: schemeData.distributors,
      isArray: Array.isArray(schemeData.distributors),
      schemeDataKeys: Object.keys(schemeData)
    });
    
    // Final validation - this should never fail if we got here
    if (!schemeData.distributors || schemeData.distributors.length === 0) {
      console.error('❌ CRITICAL ERROR: Scheme data has empty distributors!', schemeData);
      alert("ERROR: Failed to prepare scheme data. Please try again.");
      return;
    }

    // Add scheme-specific fields based on type - only add fields for the current scheme type
    if (schemeType === "csd_scheme") {
      const buyQty = Number(buyQuantity);
      const freeQty = Number(freeQuantity);
      if (!isNaN(buyQty) && buyQty >= 0) {
        schemeData.buyQuantity = buyQty;
      }
      if (!isNaN(freeQty) && freeQty >= 0) {
        schemeData.freeQuantity = freeQty;
      }
      schemeData.schemeDescription = `Buy ${buyQuantity}, Get ${freeQuantity} Free (${buyQuantity}+${freeQuantity})`;
      // Explicitly do NOT include discountAmount for CSD schemes
    } else if (schemeType === "discount") {
      const discountAmt = Number(discountAmount);
      if (!isNaN(discountAmt) && discountAmt >= 0) {
        schemeData.discountAmount = discountAmt;
      }
      schemeData.schemeDescription = `₹${discountAmount} Discount per Case`;
      // Explicitly do NOT include buyQuantity or freeQuantity for discount schemes
    }
    
    // Final validation: ensure no undefined values, but preserve arrays
    Object.keys(schemeData).forEach(key => {
      if (schemeData[key] === undefined) {
        delete schemeData[key];
      }
    });
    
    // Final check: ensure distributors and appliesToSKUs are arrays
    if (!Array.isArray(schemeData.distributors)) {
      schemeData.distributors = [];
    }
    if (!Array.isArray(schemeData.appliesToSKUs)) {
      schemeData.appliesToSKUs = [];
    }
    
    // Debug: Final check before sending
    console.log('📤 Final scheme data before save:', {
      name: schemeData.name,
      distributorsCount: schemeData.distributors?.length || 0,
      distributors: schemeData.distributors,
      appliesToSKUsCount: schemeData.appliesToSKUs?.length || 0,
      hasDistributors: 'distributors' in schemeData,
      isDistributorsArray: Array.isArray(schemeData.distributors)
    });

    onSaveScheme(schemeData);

    setSchemeName("");
    setBuyQuantity(6);
    setFreeQuantity(1);
    setDiscountAmount(0);
    setStartDate("");
    setEndDate("");
    setSelectedDistributors([]);
    setSelectedSKUs([]);
    setTabValue(1);
  };

  const handleDelete = (schemeId) => {
    if (window.confirm("Are you sure you want to delete this scheme?")) {
      onDeleteScheme(schemeId);
    }
  };

  const activeSchemes = schemes.filter((scheme) => {
    const now = new Date();
    const end = new Date(scheme.endDate);
    return end >= now;
  });

  const expiredSchemes = schemes.filter((scheme) => {
    const now = new Date();
    const end = new Date(scheme.endDate);
    return end < now;
  });

  return (
    <Dialog open={open} onClose={onClose} fullScreen>
      <AppBar sx={{ position: "relative", bgcolor: "#e53935" }}>
        <Toolbar>
          <LocalOfferIcon sx={{ mr: 2 }} />
          <Typography sx={{ flex: 1 }} variant="h6" component="div">
            Scheme & Discount Management
          </Typography>
          <IconButton edge="end" color="inherit" onClick={onClose} aria-label="close">
            <CloseIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ bgcolor: "#f5f5f5", minHeight: "100vh", p: { xs: 2, sm: 3 } }}>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            mb: 3,
            bgcolor: "white",
            borderRadius: 3,
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            minHeight: { xs: 40, sm: 72 },
            "& .MuiTab-root": {
              minHeight: { xs: 40, sm: 72 },
              fontSize: { xs: "0.7rem", sm: "1rem" },
              fontWeight: 700,
              textTransform: "none",
              px: { xs: 1.5, sm: 3 },
              py: { xs: 0.5, sm: 1 },
              transition: "all 0.2s",
              "&:hover": {
                bgcolor: "rgba(229, 57, 53, 0.05)"
              },
              "& .MuiTab-icon": {
                fontSize: { xs: 16, sm: 20 },
                marginRight: { xs: 0.5, sm: 1 }
              }
            },
            "& .Mui-selected": {
              color: "#e53935",
              fontWeight: 800
            },
            "& .MuiTabs-scrollButtons": {
              width: { xs: 32, sm: 40 }
            }
          }}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Create New Scheme" icon={<AddIcon />} iconPosition="start" />
          <Tab label={`Active Schemes (${activeSchemes.length})`} icon={<CheckCircleIcon />} iconPosition="start" />
          <Tab label={`Expired Schemes (${expiredSchemes.length})`} icon={<CancelIcon />} iconPosition="start" />
        </Tabs>

        {tabValue === 0 && (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, lg: 7 }}>
              <Card elevation={4} sx={{ borderRadius: 4, border: "1px solid #e0e0e0" }}>
                <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
                  <Box display="flex" alignItems="center" gap={2} mb={3} pb={2} borderBottom="3px solid #e53935">
                    <Avatar sx={{ bgcolor: "#e53935", width: 48, height: 48 }}>
                      <LocalOfferIcon sx={{ color: "white", fontSize: 28 }} />
                    </Avatar>
                    <Box>
                      <Typography variant="h5" fontWeight={700} color="primary" sx={{ mb: 0.5 }}>
                        Create New Scheme/Discount
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Set up promotional schemes or discounts for distributors
                      </Typography>
                    </Box>
                  </Box>

                  <FormControl fullWidth margin="normal" sx={{ mb: 2 }}>
                    <InputLabel>Scheme Type</InputLabel>
                    <Select
                      value={schemeType}
                      onChange={(e) => setSchemeType(e.target.value)}
                      label="Scheme Type"
                    >
                      <MenuItem value="csd_scheme">CSD Scheme (Buy X Get Y Free)</MenuItem>
                      <MenuItem value="discount">Discount (₹)</MenuItem>
                    </Select>
                  </FormControl>

                  <TextField
                    fullWidth
                    margin="normal"
                    label="Scheme Name"
                    value={schemeName}
                    onChange={(e) => setSchemeName(e.target.value)}
                    placeholder="e.g., Summer Scheme 2024"
                    sx={{ mb: 2 }}
                  />

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      Select Product SKUs
                    </Typography>
                    <TextField
                      fullWidth
                      margin="normal"
                      size="small"
                      placeholder="Search SKUs..."
                      value={skuSearchTerm}
                      onChange={(e) => setSkuSearchTerm(e.target.value)}
                      sx={{ mb: 1 }}
                    />
                    <Box sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
                      <Button size="small" variant="outlined" onClick={() => {
                        if (selectedSKUs.length === ALL_SKUS.length) {
                          setSelectedSKUs([]);
                        } else {
                          setSelectedSKUs([...ALL_SKUS]);
                        }
                      }}>
                        {selectedSKUs.length === ALL_SKUS.length ? "Deselect All" : "Select All"}
                      </Button>
                      <Chip
                        label={`${selectedSKUs.length} selected`}
                        color="primary"
                        sx={{ fontWeight: 600 }}
                      />
                    </Box>
                    <Paper
                      sx={{
                        maxHeight: 250,
                        overflow: "auto",
                        border: "2px solid #e0e0e0",
                        borderRadius: 2,
                        p: 1,
                      }}
                    >
                      {Object.entries(PRODUCT_SKUS).map(([category, skuList]) => {
                        const filteredSKUs = skuList.filter(sku =>
                          sku.toLowerCase().includes(skuSearchTerm.toLowerCase())
                        );
                        if (filteredSKUs.length === 0) return null;
                        
                        return (
                          <Box key={category} sx={{ mb: 2 }}>
                            <Typography
                              variant="subtitle2"
                              fontWeight="bold"
                              sx={{ mb: 1, color: "#e53935", textTransform: "uppercase" }}
                            >
                              {category}
                            </Typography>
                            {filteredSKUs.map((sku) => (
                              <Box
                                key={sku}
                                sx={{
                                  p: 1,
                                  borderBottom: "1px solid #f0f0f0",
                                  "&:hover": { bgcolor: "#f5f5f5" },
                                  display: "flex",
                                  alignItems: "center",
                                }}
                              >
                                <Checkbox
                                  checked={selectedSKUs.includes(sku)}
                                  onChange={() => {
                                    setSelectedSKUs((prev) =>
                                      prev.includes(sku)
                                        ? prev.filter((s) => s !== sku)
                                        : [...prev, sku]
                                    );
                                  }}
                                  color="primary"
                                  size="small"
                                />
                                <Typography variant="body2">{sku}</Typography>
                              </Box>
                            ))}
                          </Box>
                        );
                      })}
                    </Paper>
                  </Box>

                  {schemeType === "csd_scheme" ? (
                    <>
                      <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid size={{ xs: 6 }}>
                          <TextField
                            fullWidth
                            label="Buy Quantity"
                            type="number"
                            value={buyQuantity}
                            onChange={(e) => setBuyQuantity(e.target.value)}
                            helperText="Cases to buy"
                          />
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <TextField
                            fullWidth
                            label="Free Quantity"
                            type="number"
                            value={freeQuantity}
                            onChange={(e) => setFreeQuantity(e.target.value)}
                            helperText="Free cases"
                          />
                        </Grid>
                      </Grid>
                      <Alert
                        severity="info"
                        sx={{
                          mb: 2,
                          bgcolor: "#e3f2fd",
                          "& .MuiAlert-icon": { color: "#1976d2" },
                        }}
                      >
                        <Typography variant="body2" fontWeight="bold">
                          Scheme Preview: Buy {buyQuantity}, Get {freeQuantity} Free ({buyQuantity}+{freeQuantity})
                        </Typography>
                      </Alert>
                    </>
                  ) : (
                    <TextField
                      fullWidth
                      margin="normal"
                      label="Discount Amount"
                      type="number"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(e.target.value)}
                      helperText="Fixed discount amount per case (e.g., ₹5, ₹10, ₹15, ₹20)"
                      inputProps={{ min: 0, step: 0.01 }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Typography sx={{ color: "#666", fontWeight: 600 }}>₹</Typography>
                          </InputAdornment>
                        ),
                      }}
                      sx={{ mb: 2 }}
                    />
                  )}

                  <Divider sx={{ my: 3 }} />

                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <EventIcon color="primary" />
                    <Typography variant="h6" fontWeight="bold">
                      Validity Period
                    </Typography>
                  </Box>

                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid size={{ xs: 6 }}>
                      <TextField
                        fullWidth
                        label="Start Date"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <TextField
                        fullWidth
                        label="End Date"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 3 }} />

                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <PeopleIcon color="primary" />
                    <Typography variant="h6" fontWeight="bold">
                      Select Distributors
                    </Typography>
                  </Box>

                  <TextField
                    fullWidth
                    margin="normal"
                    size="small"
                    placeholder="Search distributors by name or code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    sx={{ mb: 2 }}
                  />

                  <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                    <Button size="small" variant="outlined" onClick={handleSelectAll}>
                      {selectedDistributors.length === filteredDistributors.length
                        ? "Deselect All"
                        : "Select All"}
                    </Button>
                    <Chip
                      label={`${selectedDistributors.length} selected`}
                      color="primary"
                      sx={{ fontWeight: 600 }}
                    />
                  </Box>

                  <Paper
                    sx={{
                      maxHeight: 300,
                      overflow: "auto",
                      border: "2px solid #e0e0e0",
                      borderRadius: 2,
                    }}
                  >
                    {distributors.length === 0 ? (
                      <Box sx={{ p: 3, textAlign: "center" }}>
                        <Typography color="error" fontWeight="bold">
                          No distributors available
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                          Please add distributors first from the Distributors menu in the sidebar.
                        </Typography>
                      </Box>
                    ) : validDistributors.length === 0 ? (
                      <Box sx={{ p: 3, textAlign: "center" }}>
                        <Typography color="warning.main" fontWeight="bold">
                          No valid distributors found
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                          Found {distributors.length} distributor(s), but none have valid codes.
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                          Please ensure distributors have valid codes in the Distributors menu.
                        </Typography>
                      </Box>
                    ) : filteredDistributors.length === 0 ? (
                      <Box sx={{ p: 3, textAlign: "center" }}>
                        <Typography color="text.secondary">
                          No distributors found matching "{searchTerm}"
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                          Try clearing the search or check the distributor name/code.
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                          Showing {validDistributors.length} valid distributor(s) total.
                        </Typography>
                      </Box>
                    ) : (
                      filteredDistributors.map((distributor) => (
                          <Box
                            key={distributor.code}
                            sx={{
                              p: 1.5,
                              borderBottom: "1px solid #f0f0f0",
                              "&:hover": { bgcolor: "#f5f5f5" },
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            <Checkbox
                              checked={selectedDistributors.includes(distributor.code)}
                              onChange={() => handleToggleDistributor(distributor.code)}
                              color="primary"
                            />
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body1" fontWeight={500}>
                                {distributor.name || 'Unnamed Distributor'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Code: {distributor.code}
                              </Typography>
                            </Box>
                          </Box>
                        ))
                    )}
                  </Paper>
                </CardContent>
                <CardActions sx={{ p: 3, pt: 0, justifyContent: "flex-end" }}>
                  <Button onClick={onClose} variant="outlined" sx={{ mr: 1 }}>
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSave}
                    startIcon={<SaveIcon />}
                    sx={{ px: 4, py: 1.5 }}
                  >
                    Save Scheme
                  </Button>
                </CardActions>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, lg: 5 }}>
              <Card elevation={3} sx={{ borderRadius: 3, height: "100%" }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Quick Preview
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  {schemeName && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Scheme Name
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {schemeName}
                      </Typography>
                    </Box>
                  )}
                  {startDate && endDate && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Validity
                      </Typography>
                      <Typography variant="body1">
                        {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
                      </Typography>
                    </Box>
                  )}
                  {selectedSKUs.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Selected SKUs ({selectedSKUs.length})
                      </Typography>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {selectedSKUs.slice(0, 5).map((sku) => (
                          <Chip
                            key={sku}
                            label={sku}
                            size="small"
                            color="secondary"
                            variant="outlined"
                          />
                        ))}
                        {selectedSKUs.length > 5 && (
                          <Chip label={`+${selectedSKUs.length - 5} more`} size="small" />
                        )}
                      </Box>
                    </Box>
                  )}
                  {selectedDistributors.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Selected Distributors ({selectedDistributors.length})
                      </Typography>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {selectedDistributors.slice(0, 5).map((code) => {
                          const dist = distributors.find((d) => d.code === code);
                          return (
                            <Chip
                              key={code}
                              label={dist?.name || code}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          );
                        })}
                        {selectedDistributors.length > 5 && (
                          <Chip label={`+${selectedDistributors.length - 5} more`} size="small" />
                        )}
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {tabValue === 1 && (
          <Card elevation={3} sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                Active Schemes
              </Typography>
              <Divider sx={{ mb: 3 }} />
              {activeSchemes.length === 0 ? (
                <Alert severity="info">No active schemes</Alert>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: "#f5f5f5" }}>
                        <TableCell sx={{ fontWeight: "bold" }}>Scheme Name</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>Type</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>Description</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>Applies To</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>Validity</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>Distributors</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }} align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {activeSchemes.map((scheme) => (
                        <TableRow key={scheme.id} hover>
                          <TableCell>
                            <Typography fontWeight={600}>{scheme.name}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={scheme.type === "csd_scheme" ? "CSD Scheme" : "Discount"}
                              color="primary"
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{scheme.schemeDescription}</TableCell>
                          <TableCell>
                            {scheme.appliesToSKUs && scheme.appliesToSKUs.length > 0 ? (
                              <Tooltip title={scheme.appliesToSKUs.join(", ")}>
                                <Chip
                                  label={`${scheme.appliesToSKUs.length} SKU(s)`}
                                  size="small"
                                  variant="outlined"
                                />
                              </Tooltip>
                            ) : (
                              <Chip
                                label={scheme.appliesTo === "csd" ? "CSD" : scheme.appliesTo === "water" ? "Water" : "Both"}
                                size="small"
                                variant="outlined"
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            {new Date(scheme.startDate).toLocaleDateString()} - {new Date(scheme.endDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {scheme.distributors && scheme.distributors.length > 0 ? (
                              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                                {scheme.distributors.map((distCode) => {
                                  const distributor = distributors.find((d) => d.code === distCode);
                                  return (
                                    <Chip
                                      key={distCode}
                                      label={distributor?.name || distCode}
                                      size="small"
                                      variant="outlined"
                                      color="primary"
                                    />
                                  );
                                })}
                              </Box>
                            ) : (
                              <Chip label="0" size="small" />
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDelete(scheme.id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        )}

        {tabValue === 2 && (
          <Card elevation={3} sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                Expired Schemes
              </Typography>
              <Divider sx={{ mb: 3 }} />
              {expiredSchemes.length === 0 ? (
                <Alert severity="info">No expired schemes</Alert>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: "#f5f5f5" }}>
                        <TableCell sx={{ fontWeight: "bold" }}>Scheme Name</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>Type</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>Description</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>Ended On</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>Distributors</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }} align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {expiredSchemes.map((scheme) => (
                        <TableRow key={scheme.id} hover sx={{ opacity: 0.7 }}>
                          <TableCell>
                            <Typography>{scheme.name}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={scheme.type === "csd_scheme" ? "CSD Scheme" : "Discount"}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{scheme.schemeDescription}</TableCell>
                          <TableCell>{new Date(scheme.endDate).toLocaleDateString()}</TableCell>
                          <TableCell>
                            {scheme.distributors && scheme.distributors.length > 0 ? (
                              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                                {scheme.distributors.map((distCode) => {
                                  const distributor = distributors.find((d) => d.code === distCode);
                                  return (
                                    <Chip
                                      key={distCode}
                                      label={distributor?.name || distCode}
                                      size="small"
                                      variant="outlined"
                                      color="primary"
                                    />
                                  );
                                })}
                              </Box>
                            ) : (
                              <Chip label="0" size="small" />
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDelete(scheme.id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        )}
      </Box>
    </Dialog>
  );
}
