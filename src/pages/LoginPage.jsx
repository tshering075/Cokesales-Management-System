import React, { useState } from "react";
import { 
  Box, 
  Paper, 
  Typography, 
  TextField, 
  Button, 
  CircularProgress,
  InputAdornment,
  IconButton,
  Fade,
  Zoom,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import PersonIcon from "@mui/icons-material/Person";
import LockIcon from "@mui/icons-material/Lock";
import "./LoginPage.css";
import { validateDistributorLogin, validateAdminLogin } from "../utils/distributorAuth";
import { signInDistributor, signInAdmin, supabase } from "../services/supabaseService";
import { logActivity, ACTIVITY_TYPES } from "../services/activityService";
import AppSnackbar from "../components/AppSnackbar";
import DayNightThemeToggle from "../components/DayNightThemeToggle";
import { useDayNightTheme } from "../theme/AppThemeProvider";

function LoginPage({ onLogin }) {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [, setDistributorInfo] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({ userId: "", password: "" });

  const navigate = useNavigate();
  const theme = useTheme();
  const { isDayView } = useDayNightTheme();
  const isDarkUi = isDayView;

  const inputSurfaceSx = isDarkUi
    ? {
        backgroundColor: theme.palette.action.hover,
        "&:hover": { backgroundColor: theme.palette.action.selected },
        "&.Mui-focused": {
          backgroundColor: theme.palette.background.paper,
          boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.28)}`,
        },
      }
    : {
        backgroundColor: "#f8f9fa",
        "&:hover": { backgroundColor: "#f0f0f0" },
        "&.Mui-focused": {
          backgroundColor: "#fff",
          boxShadow: "0 0 0 3px rgba(229, 57, 53, 0.1)",
        },
      };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const isSupabaseConfigured = supabase !== null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(false);
    setErrorMessage("");
    setLoading(true);
    
    // Input validation
    const trimmedUserId = (userId || "").trim();
    const trimmedPassword = (password || "").trim();
    
    // Clear previous errors
    setFieldErrors({ userId: "", password: "" });
    
    let hasErrors = false;
    
    if (!trimmedUserId || trimmedUserId.length < 1) {
      setFieldErrors(prev => ({
        ...prev,
        userId: isSupabaseConfigured
          ? "Distributor code (or admin email) is required"
          : "User ID is required",
      }));
      hasErrors = true;
    }
    
    if (!trimmedPassword || trimmedPassword.length < 1) {
      setFieldErrors(prev => ({ ...prev, password: "Password is required" }));
      hasErrors = true;
    }
    
    if (hasErrors) {
      setError(true);
      setErrorMessage("Please fill in all required fields");
      setLoading(false);
      return;
    }
    
    try {
      let normalizedSupabaseError = "";
      // Try Supabase Auth first if configured
      if (isSupabaseConfigured) {
        let supabaseAuthError = null;
        try {
          // Distributor: code + password vs distributors.credentials in Supabase. Admin: email + Auth next.
          const distributor = await signInDistributor(trimmedUserId, trimmedPassword);
          if (distributor) {
            setDistributorInfo({ name: distributor.name, code: distributor.code });
            
            // Log login activity (non-blocking - fire and forget)
            logActivity(
              ACTIVITY_TYPES.LOGIN,
              `Distributor logged in: ${distributor.name} (${distributor.code})`,
              {
                distributorName: distributor.name,
                distributorCode: distributor.code,
                userEmail: trimmedUserId,
                userName: distributor.name,
              }
            ).catch(err => console.error('Activity logging error:', err));
            
            onLogin("distributor", distributor);
            setSuccess(true);
            // Navigate immediately without delay
            navigate("/distributor");
            setLoading(false);
            return;
          }
        } catch (distributorError) {
          console.log("Supabase distributor login failed, trying admin login:", distributorError);
          supabaseAuthError = distributorError;
          // Try admin login
          try {
            const admin = await signInAdmin(trimmedUserId, trimmedPassword);
            if (admin) {
              // Store admin email for email sending
              if (admin.email) {
                localStorage.setItem('admin_email', admin.email);
                console.log('✅ Admin email stored:', admin.email);
              }
              // Get actual role from Firestore (admin or viewer)
              const actualRole = admin.role || "admin"; // Default to admin for backward compatibility
              // Store role and permissions for permission checks
              localStorage.setItem("userRole", actualRole);
              if (admin.permissions) {
                localStorage.setItem("userPermissions", JSON.stringify(admin.permissions));
              }
              
              // Log login activity (non-blocking - fire and forget)
              logActivity(
                ACTIVITY_TYPES.LOGIN,
                `User logged in: ${admin.email} (${actualRole})`,
                {
                  userEmail: admin.email,
                  userName: admin.name || admin.email?.split('@')[0] || 'User',
                  role: actualRole,
                }
              ).catch(err => console.error('Activity logging error:', err));
              
              onLogin(actualRole); // Pass actual role (admin or viewer)
              setSuccess(true);
              // Navigate immediately without delay
              navigate("/admin");
              setLoading(false);
              return;
            }
          } catch (adminError) {
            console.log("Supabase auth failed, trying localStorage fallback:", adminError);
            supabaseAuthError = adminError;
          }
        }

        // Keep Supabase error message, but still allow local fallback below.
        if (supabaseAuthError) {
          const rawMsg = supabaseAuthError?.message || "";
          normalizedSupabaseError =
            rawMsg.includes("Invalid login credentials")
              ? "Invalid email or password"
              : rawMsg.includes("Email not confirmed")
              ? "Email not confirmed. Please confirm from inbox first, or disable email confirmation in Supabase Auth settings."
              : rawMsg || "Login failed. Please try again.";
        }
      }

      // Fallback to localStorage authentication
      // Check if it's a distributor login
      const distributor = validateDistributorLogin(trimmedUserId, trimmedPassword);
      if (distributor) {
        setDistributorInfo({ name: distributor.name, code: distributor.code });
        onLogin("distributor", distributor);
        setSuccess(true);
        setTimeout(() => navigate("/distributor"), 1500);
        setLoading(false);
        return;
      }

      // Check if it's admin login
      if (validateAdminLogin(trimmedUserId, trimmedPassword)) {
        onLogin("admin");
        setSuccess(true);
        setTimeout(() => navigate("/admin"), 1500);
        setLoading(false);
        return;
      }

      // Invalid credentials
      setError(true);
      setErrorMessage(normalizedSupabaseError || "Invalid User ID or Password");
      setLoading(false);
    } catch (error) {
      setError(true);
      setErrorMessage(error.message || "Login failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <Box
      className={`login-container${isDarkUi ? " login-container--day" : ""}`}
      sx={{ position: "relative" }}
    >
      <Box sx={{ position: "absolute", top: { xs: 10, sm: 14 }, right: { xs: 10, sm: 14 }, zIndex: 30 }}>
        <DayNightThemeToggle
          sx={{
            color: "#fff",
            bgcolor: "rgba(0,0,0,0.22)",
            "&:hover": { bgcolor: "rgba(0,0,0,0.38)" },
          }}
        />
      </Box>
      {/* Coke fill with bubbles */}
      <div className="coke-fill">
        {Array.from({ length: 25 }).map((_, i) => {
          const size = Math.floor(Math.random() * 10) + 5;
          const left = Math.random() * 100;
          const duration = Math.random() * 5 + 4;
          const delay = Math.random() * 5;
          return (
            <div
              key={i}
              className="bubble"
              style={{
                width: `${size}px`,
                height: `${size}px`,
                left: `${left}%`,
                animationDuration: `${duration}s`,
                animationDelay: `${delay}s`,
              }}
            ></div>
          );
        })}
      </div>

      {/* Login box */}
      <Fade in timeout={800}>
        <Paper
          elevation={10}
          className="login-box"
          sx={
            isDarkUi
              ? {
                  bgcolor: "rgba(30, 30, 32, 0.94)",
                  backgroundImage: "none",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  boxShadow: "0 12px 40px rgba(0, 0, 0, 0.5)",
                }
              : undefined
          }
        >
          <Box sx={{ textAlign: "center", mb: 4 }}>
            <Zoom in timeout={1000}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: "primary.main",
                  mb: 0.5,
                  letterSpacing: 0.5,
                  fontFamily: "'Segoe UI', 'Roboto', sans-serif",
                  textShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
              >
                Welcome Back
              </Typography>
            </Zoom>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 400 }}>
              CokeSales Management System — sign in to access your dashboard
            </Typography>
          </Box>

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label={isSupabaseConfigured ? "Distributor code / admin email" : "User ID"}
              variant="outlined"
              value={userId}
              autoComplete="username"
              onChange={(e) => {
                setUserId(e.target.value);
                if (fieldErrors.userId) {
                  setFieldErrors(prev => ({ ...prev, userId: "" }));
                }
                setError(false);
              }}
              error={!!fieldErrors.userId}
              helperText={fieldErrors.userId || undefined}
              FormHelperTextProps={{ sx: { mx: 0 } }}
              sx={{ mb: 2.5 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon sx={{ color: "primary.main", fontSize: 20 }} />
                  </InputAdornment>
                ),
                sx: {
                  borderRadius: "12px",
                  transition: "all 0.3s ease",
                  ...inputSurfaceSx,
                },
              }}
              InputLabelProps={{
                sx: {
                  fontWeight: 500,
                }
              }}
            />

            <TextField
              fullWidth
              label="Password"
              type={showPassword ? "text" : "password"}
              variant="outlined"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) {
                  setFieldErrors(prev => ({ ...prev, password: "" }));
                }
                setError(false);
              }}
              error={!!fieldErrors.password}
              helperText={fieldErrors.password}
              sx={{ mb: 3 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon sx={{ color: "primary.main", fontSize: 20 }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleTogglePasswordVisibility}
                      edge="end"
                      sx={{ color: "text.secondary" }}
                    >
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
                sx: {
                  borderRadius: "12px",
                  transition: "all 0.3s ease",
                  ...inputSurfaceSx,
                },
              }}
              InputLabelProps={{
                sx: {
                  fontWeight: 500,
                }
              }}
            />

            <Zoom in timeout={600}>
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading}
                color="primary"
                sx={{
                  fontWeight: 600,
                  borderRadius: "12px",
                  py: 1.5,
                  fontSize: "1rem",
                  textTransform: "none",
                  boxShadow: (t) => `0 4px 12px ${alpha(t.palette.primary.main, 0.35)}`,
                  transition: "all 0.3s ease",
                  "&:hover": {
                    bgcolor: "primary.dark",
                    boxShadow: (t) => `0 6px 16px ${alpha(t.palette.primary.main, 0.45)}`,
                    transform: "translateY(-2px)",
                  },
                  "&:active": {
                    transform: "translateY(0)",
                  },
                  "&:disabled": {
                    bgcolor: "action.disabledBackground",
                    color: "action.disabled",
                  },
                }}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />
                ) : (
                  "Sign In"
                )}
              </Button>
            </Zoom>
          </form>

          <Box
            component="nav"
            aria-label="Legal"
            sx={{
              mt: 3,
              pt: 2,
              borderTop: 1,
              borderColor: "divider",
              textAlign: "center",
            }}
          >
            <Typography variant="caption" color="text.secondary">
              <Box
                component={RouterLink}
                to="/"
                sx={{ color: "primary.main", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
              >
                Home
              </Box>
              {" · "}
              <Box
                component="a"
                href={`${process.env.PUBLIC_URL || ""}/privacy-policy.html`}
                sx={{ color: "primary.main", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
              >
                Privacy Policy
              </Box>
              {" · "}
              <Box
                component="a"
                href={`${process.env.PUBLIC_URL || ""}/terms-of-service.html`}
                sx={{ color: "primary.main", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
              >
                Terms of Service
              </Box>
            </Typography>
          </Box>
        </Paper>
      </Fade>

      {/* Error Snackbar */}
      <AppSnackbar
        open={error}
        severity="error"
        message={errorMessage || "Invalid User ID or Password"}
        autoHideDuration={2500}
        onClose={() => setError(false)}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      />

      {/* ✅ Success Snackbar */}
      <AppSnackbar
        open={success}
        severity="success"
        message="Successfully Logged In!"
        autoHideDuration={2000}
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      />
    </Box>
  );
}

export default LoginPage;
