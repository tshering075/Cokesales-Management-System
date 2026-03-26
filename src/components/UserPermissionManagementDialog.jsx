import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress,
  IconButton,
  List,
  Tab,
  Tabs,
  Paper,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Avatar,
  Card,
  CardContent,
  Grid,
  Fade,
  InputAdornment,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import PersonIcon from "@mui/icons-material/Person";
import EmailIcon from "@mui/icons-material/Email";
import SecurityIcon from "@mui/icons-material/Security";
import SearchIcon from "@mui/icons-material/Search";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { createAdminAccount, deleteUserDocument, getCurrentUser, getAdminByUid } from "../services/supabaseService";
import { supabase } from "../supabase";
import { logActivity, ACTIVITY_TYPES } from "../services/activityService";

// Role definitions
const ROLES = {
  admin: {
    label: "Admin",
    description: "Full read and write access to all features",
    color: "error",
    permissions: { read: true, write: true, delete: true, manageUsers: true }
  },
  viewer: {
    label: "Viewer",
    description: "Read-only access to view data",
    color: "info",
    permissions: { read: true, write: false, delete: false, manageUsers: false }
  }
};

function TabPanel({ children, value, index }) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function UserPermissionManagementDialog({ open, onClose }) {
  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.id) {
          setError("Access Denied: No active user session found.");
          setTimeout(() => {
            onClose();
            setError("");
          }, 3000);
          return;
        }

        // Prefer fresh role/permissions from Supabase to avoid stale localStorage denial.
        let adminDoc = await getAdminByUid(currentUser.id);

        // Fallback: some environments may store admin rows keyed by email only.
        if (!adminDoc && currentUser.email) {
          const { data: emailMatch, error: emailLookupError } = await supabase
            .from("admins")
            .select("*")
            .eq("email", currentUser.email)
            .limit(1);

          if (emailLookupError) {
            console.warn("Admin email fallback lookup failed:", emailLookupError);
          } else if (emailMatch && emailMatch.length > 0) {
            adminDoc = emailMatch[0];
          }
        }

        const dbRole = adminDoc?.role || null;
        const dbPermissions = adminDoc?.permissions || null;

        // Fall back to localStorage only if DB values are unavailable.
        const storedRole = localStorage.getItem('userRole') || localStorage.getItem('role');
        const storedPermissions = localStorage.getItem('userPermissions');
        let parsedStoredPermissions = null;
        if (storedPermissions) {
          try {
            parsedStoredPermissions = JSON.parse(storedPermissions);
          } catch (e) {
            console.warn('Error parsing permissions:', e);
          }
        }

        const effectiveRole = dbRole || storedRole;
        const effectivePermissions = dbPermissions || parsedStoredPermissions;
        const roleLower = (effectiveRole || "").toString().trim().toLowerCase();
        const isAdmin = roleLower === "admin" || roleLower === "administrator";
        const canManage = isAdmin || effectivePermissions?.manageUsers === true;

        // Keep cache aligned with authoritative DB values.
        if (dbRole) {
          localStorage.setItem("userRole", dbRole);
          localStorage.setItem("role", dbRole);
        }
        if (dbPermissions) {
          localStorage.setItem("userPermissions", JSON.stringify(dbPermissions));
        }
        
        console.log('Permission check:', {
          userId: currentUser.id,
          role: effectiveRole,
          isAdmin,
          permissions: effectivePermissions,
          canManage
        });
        
        // If no permission and not admin, close dialog and show error
        if (!canManage) {
          console.warn('Access denied: User does not have manageUsers permission and is not an admin');
          setError("Access Denied: You need 'Manage Users' permission or Admin role to access User & Permissions.");
          setTimeout(() => {
            onClose();
            setError("");
          }, 3000);
        } else {
          console.log('✅ User has access to User & Permissions');
        }
      } catch (error) {
        console.error('Error checking permissions:', error);
        // Don't close immediately on error - might be a temporary issue
        // Only close if it's a clear permission denial
        if (error.message?.includes('permission') || error.message?.includes('denied')) {
          setError("Error checking permissions. Please try again.");
          setTimeout(() => {
            onClose();
            setError("");
          }, 3000);
        } else {
          // For other errors, just log but don't close
          console.error('Non-permission error, keeping dialog open:', error);
        }
      }
    };
    if (open) {
      loadUser();
    }
  }, [open, onClose]);
  
  const [tabValue, setTabValue] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("viewer");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const loadingUsersRef = useRef(false);
  const [deletingUser, setDeletingUser] = useState(null);
  const deletedUserIdsRef = useRef(new Set()); // Track deleted user IDs to prevent re-adding
  const [, setEditingUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Load users when dialog opens
  useEffect(() => {
    let isMounted = true;

    if (open) {
      loadUsers(isMounted).catch(error => {
        if (error.name !== 'AbortError' && isMounted) {
          console.error('Error loading users:', error);
        }
      });
    } else {
      // Reset form when closing
      setEmail("");
      setPassword("");
      setName("");
      setRole("viewer");
      setShowPassword(false);
      setError("");
      setSuccess(false);
      setTabValue(0);
      setEditingUser(null);
      setSearchQuery("");
      setRoleFilter("all");
    }

    return () => {
      isMounted = false;
    };
  }, [open]);

  // Filter users
  useEffect(() => {
    let filtered = users;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
      );
    }

    if (roleFilter !== "all") {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    setFilteredUsers(filtered);
  }, [searchQuery, roleFilter, users]);

  const loadUsers = async (isMounted = true) => {
    if (!supabase) {
      console.warn("⚠️ Supabase not initialized - User & Permissions requires Supabase to be configured");
      if (isMounted) {
        setError("Supabase database not initialized. Please configure Supabase in your environment variables (REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY) to use User & Permissions management.");
        setLoadingUsers(false);
        loadingUsersRef.current = false;
        // Don't return early - show empty state instead
        setUsers([]);
      }
      return;
    }

    if (!isMounted) {
      return;
    }

    // Prevent multiple simultaneous loads
    if (loadingUsersRef.current) {
      console.log('⚠️ Load users already in progress, skipping...');
      return;
    }

    loadingUsersRef.current = true;
    setLoadingUsers(true);
    setError("");
    try {
      console.log("🔄 Loading users from Supabase database...");
      
      // Load users from Supabase (admins table)
      const { data: adminsData, error: adminsError } = await supabase
        .from("admins")
        .select("*")
        .order("created_at", { ascending: false });
      
      // Check if component unmounted during async operation
      if (!isMounted) {
        return;
      }
      
      if (adminsError) {
        throw adminsError;
      }
      
      console.log("✅ Loaded users from Supabase");
      
      const users = [];
      const userUids = new Set();
      const userEmails = new Set(); // Track emails to prevent duplicates
      
      // Process all records from Supabase and deduplicate
      (adminsData || []).forEach((data) => {
        const userId = data.id || data.uid;
        const userEmail = (data.email || "").toLowerCase().trim();
        
        // Skip if we've already seen this user (by uid or email)
        if (userUids.has(userId) || (userEmail && userEmails.has(userEmail))) {
          console.warn(`⚠️ Skipping duplicate user: ${data.email || userId}`);
          return; // Skip duplicate
        }
        
        userUids.add(userId);
        if (userEmail) {
          userEmails.add(userEmail);
        }
        
        // Check if user is active (lastActive within last 5 minutes)
        const lastActive = data.last_active || data.lastActive;
        let isActive = false;
        if (lastActive) {
          const lastActiveDate = lastActive instanceof Date ? lastActive : new Date(lastActive);
          if (lastActiveDate && !isNaN(lastActiveDate.getTime())) {
            const minutesSinceActive = (new Date() - lastActiveDate) / (1000 * 60);
            isActive = minutesSinceActive <= 5; // Active if last active within 5 minutes
          }
        }
        
        users.push({
          id: userId,
          uid: userId,
          email: data.email || "No email",
          name: data.name || "Unnamed User",
          role: data.role || "admin",
          createdAt: data.created_at || data.createdAt,
          permissions: data.permissions,
          lastActive: lastActive,
          isActive: isActive,
          collection: "admins"
        });
      });
      
      console.log(`📋 Found ${users.length} unique users in Supabase (${(adminsData || []).length} total records)`);
      
      // Check if component unmounted
      if (!isMounted) {
        return;
      }

      // Get currently logged-in user and add if not already in list
      const currentUser = await getCurrentUser();
      
      // Check if component unmounted after async operation
      if (!isMounted) {
        return;
      }
      
      if (currentUser && currentUser.id) {
        console.log("👤 Current logged-in user:", currentUser.id, currentUser.email);
        
        // Don't re-add current user if they were just deleted
        if (deletedUserIdsRef.current.has(currentUser.id)) {
          console.log("⚠️ Skipping current user - they were just deleted");
        } else if (!userUids.has(currentUser.id)) {
          // Current user is not in Supabase, add them to the list
          console.log("➕ Adding current user to list (not found in Supabase)");
          
          // Try to get their admin data from Supabase
          let currentUserData = null;
          try {
            currentUserData = await getAdminByUid(currentUser.id);
          } catch (e) {
            console.warn("Could not fetch current user data from Supabase:", e);
          }
          
          users.push({
            id: currentUser.id,
            uid: currentUser.id,
            email: currentUser.email || currentUserData?.email || "No email",
            name: currentUserData?.name || currentUser.email?.split('@')[0] || "Current User",
            role: currentUserData?.role || localStorage.getItem('userRole') || "admin",
            createdAt: currentUserData?.createdAt || null,
            permissions: currentUserData?.permissions || null,
            collection: "admins",
            isCurrentUser: true
          });
        } else {
          // Mark current user in the list
          const currentUserIndex = users.findIndex(u => u.uid === currentUser.id);
          if (currentUserIndex !== -1) {
            users[currentUserIndex].isCurrentUser = true;
          }
        }
      }
      
        // Sort by creation date (newest first), or by email if no date
        users.sort((a, b) => {
          // Current user always appears first
          if (a.isCurrentUser && !b.isCurrentUser) return -1;
          if (!a.isCurrentUser && b.isCurrentUser) return 1;
          
          const dateA = a.createdAt instanceof Date ? a.createdAt : 
                       (a.createdAt ? new Date(a.createdAt) : null);
        const dateB = b.createdAt instanceof Date ? b.createdAt : 
                     (b.createdAt ? new Date(b.createdAt) : null);
        
        if (dateA && dateB) {
          return dateB - dateA; // Newest first
        } else if (dateA) {
          return -1; // A has date, B doesn't - A comes first
        } else if (dateB) {
          return 1; // B has date, A doesn't - B comes first
        } else {
          // Neither has date, sort by email
          return (a.email || "").localeCompare(b.email || "");
        }
      });
      
      console.log(`✅ Loaded ${users.length} total users from Supabase database`);
      console.log("📊 Users breakdown:", {
        fromSupabase: (adminsData || []).length,
        currentUserAdded: currentUser && !userUids.has(currentUser.id) ? 1 : 0,
        total: users.length
      });
      
      if (users.length === 0) {
        console.warn("⚠️ No users found in Supabase. Make sure users are created in the 'admins' table.");
        setError("No users found. Create users using the 'Create User' tab.");
      }
      
      // Check if component unmounted before updating state
      if (!isMounted) {
        return;
      }

      // Update both users and filteredUsers lists
      setUsers(users);
      setFilteredUsers(users);
      console.log(`✅ Updated UI with ${users.length} users`);
    } catch (error) {
      // Don't show error if component unmounted or request was aborted
      if (error.name === 'AbortError') {
        console.log('Request aborted, ignoring error');
        return;
      }
      
      if (!isMounted) {
        return;
      }
      
      console.error("❌ Error loading users:", error);
      const errorMessage = error?.message || error?.error_description || error?.toString() || 'Unknown error';
      setError("Failed to load users: " + errorMessage);
      setUsers([]);
      setFilteredUsers([]);
    } finally {
      loadingUsersRef.current = false;
      if (isMounted) {
        setLoadingUsers(false);
      }
    }
  };

  const handleCreateUser = async () => {
    setError("");
    setSuccess(false);
    
    if (!email || !password || !name) {
      setError("All fields are required");
      return;
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address");
      return;
    }
    
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    
    setLoading(true);
    try {
      if (!supabase) {
        throw new Error("Supabase database not initialized. Please configure Supabase to create users.");
      }

      await createAdminAccount({
        email: email.trim(),
        password: password,
        name: name.trim(),
        role: role
      });
      
      const currentUser = await getCurrentUser();
      await logActivity(
        ACTIVITY_TYPES.USER_CREATED,
        `Created new user: ${name.trim()} (${email.trim()}) - Role: ${role}`,
        {
          newUserEmail: email.trim(),
          newUserName: name.trim(),
          newUserRole: role,
          userEmail: currentUser?.email,
          userName: currentUser?.email?.split('@')[0] || 'Admin',
        }
      );
      
      setSuccess(true);
      setEmail("");
      setPassword("");
      setName("");
      setRole("viewer");
      setShowPassword(false);
      
      await loadUsers();
      
      setTimeout(() => {
        setTabValue(1);
        setSuccess(false);
      }, 2000);
    } catch (error) {
      console.error("Error creating user:", error);
      const errorMessage = error?.message || error?.error_description || error?.toString() || 'Failed to create user';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUserRole = async (userId, newRole) => {
    if (!supabase) {
      setError("Supabase database not initialized. Please configure Supabase to update user roles.");
      return;
    }

    try {
      const userToUpdate = users.find(u => (u.id || u.uid) === userId);
      
      const { error } = await supabase
        .from("admins")
        .update({
          role: newRole,
          permissions: ROLES[newRole].permissions,
          updated_at: new Date().toISOString()
        })
        .eq("id", userId);
      
      if (error) throw error;
      
      const currentUser = await getCurrentUser();
      await logActivity(
        ACTIVITY_TYPES.USER_UPDATED,
        `Updated user role: ${userToUpdate?.name || userToUpdate?.email} → ${newRole}`,
        {
          updatedUserEmail: userToUpdate?.email,
          updatedUserName: userToUpdate?.name,
          oldRole: userToUpdate?.role,
          newRole,
          userEmail: currentUser?.email,
          userName: currentUser?.email?.split('@')[0] || 'Admin',
        }
      );
      
      await loadUsers();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Error updating user role:", error);
      const errorMessage = error?.message || error?.error_description || error?.toString() || 'Unknown error';
      setError("Failed to update user role: " + errorMessage);
    }
  };

  const handleDeleteUser = async (userId, userEmail) => {
    const currentUser = await getCurrentUser();
    const isCurrentUser = currentUser && (currentUser.id === userId || currentUser.email === userEmail);
    
    if (isCurrentUser) {
      const confirmMessage = `⚠️ WARNING: You are about to delete your own account!\n\n` +
        `This will remove you from the database, but you will remain logged in until you log out.\n\n` +
        `To fully remove your account, you'll need to:\n` +
        `1. Delete it from Supabase Dashboard → Authentication → Users\n` +
        `2. Or have another admin delete it after you log out\n\n` +
        `Are you sure you want to continue?`;
      
      if (!window.confirm(confirmMessage)) {
        return;
      }
    } else {
      if (!window.confirm(`Are you sure you want to delete user "${userEmail}"?\n\nThis will delete their account from Supabase database.`)) {
        return;
      }
    }

    if (!supabase) {
      setError("Supabase database not initialized. Please configure Supabase to delete users.");
      return;
    }

    setDeletingUser(userId);
    setError("");
    try {
      console.log(`🗑️ Starting deletion process for user: ${userEmail} (ID: ${userId})`);
      await logActivity(
        ACTIVITY_TYPES.USER_DELETED,
        `Deleted user: ${userEmail}`,
        {
          deletedUserEmail: userEmail,
          userEmail: currentUser?.email,
          userName: currentUser?.email?.split('@')[0] || 'Admin',
        }
      );
      
      // Delete from database (admins table)
      // Pass both userId and email to handle cases where ID might not match
      console.log(`💾 Attempting to delete from database: ${userId} (email: ${userEmail})`);
      const deleteResult = await deleteUserDocument(userId, userEmail);
      console.log('Delete result:', deleteResult);
      
      if (!deleteResult.success) {
        const errorMsg = deleteResult.error || 'Failed to delete user from database';
        console.error('Delete failed:', errorMsg);
        throw new Error(errorMsg);
      }
      
      // Track deleted user ID to prevent re-adding them
      deletedUserIdsRef.current.add(userId);
      
      // Immediately remove user from UI state (optimistic update)
      setUsers(prevUsers => prevUsers.filter(user => (user.id || user.uid) !== userId));
      setFilteredUsers(prevFiltered => prevFiltered.filter(user => (user.id || user.uid) !== userId));
      
      if (!deleteResult.deleted) {
        console.warn(`⚠️ User ${userId} was not found in database. They may exist only in Supabase Auth or were already deleted.`);
        // Don't throw error - user might not exist in database, which is fine
        // The user will still be removed from the UI
      } else {
        console.log(`✅ User successfully deleted from database`);
      }
      
      // Reload users list from database to ensure sync
      // But skip reload if we deleted the current user (they'll be re-added anyway since they're still logged in)
      if (!isCurrentUser) {
        console.log(`✅ User deletion completed. Reloading users list from database...`);
        try {
          await loadUsers();
        } catch (reloadError) {
          // Ignore abort errors during reload
          if (reloadError.name !== 'AbortError') {
            console.warn('Error reloading users after deletion:', reloadError);
          }
        }
      } else {
        console.log(`⚠️ Skipping reload - deleted user was current user. They will remain in list until you log out.`);
        setError("User removed from database. However, since you're still logged in, you'll remain visible until you log out. To fully remove your account, delete it from Supabase Dashboard → Authentication → Users.");
      }
      
      // Show success message
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Error deleting user:", error);
      const errorMessage = error?.message || error?.error_description || error?.toString() || 'Unknown error';
      setError("Failed to delete user: " + errorMessage);
    } finally {
      setDeletingUser(null);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setError("");
    setSuccess(false);
    setEditingUser(null);
  };

  const getRoleChip = (userRole) => {
    const roleInfo = ROLES[userRole] || ROLES.viewer;
    return (
      <Chip
        label={roleInfo.label}
        color={roleInfo.color}
        size="small"
        sx={{ fontWeight: 600 }}
      />
    );
  };

  const adminCount = users.filter(u => u.role === "admin").length;
  const viewerCount = users.filter(u => u.role === "viewer").length;

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      fullScreen 
      maxWidth={false} 
      fullWidth
      disableEnforceFocus={false}
      disableAutoFocus={false}
    >
      <DialogTitle
        sx={{
          bgcolor: "primary.main",
          color: "white",
          py: 2,
          px: 3,
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar sx={{ bgcolor: "rgba(255,255,255,0.2)", width: 48, height: 48 }}>
              <SecurityIcon />
            </Avatar>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600, color: "white" }}>
                User & Permission Management
              </Typography>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.8)" }}>
                Manage user accounts and role-based access control
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ color: "white" }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 0, bgcolor: "#f5f5f5" }}>
        {error && (
          <Alert severity="error" sx={{ m: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ m: 2 }} onClose={() => setSuccess(false)}>
            {tabValue === 0 ? "User created successfully! They can now login." : "User updated successfully!"}
          </Alert>
        )}

        <Box sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "white" }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: { xs: 40, sm: 64 },
              "& .MuiTab-root": {
                minHeight: { xs: 40, sm: 64 },
                textTransform: "none",
                fontSize: { xs: "0.7rem", sm: "0.95rem" },
                fontWeight: 500,
                px: { xs: 1.5, sm: 3 },
                py: { xs: 0.5, sm: 1 },
                "& .MuiTab-icon": {
                  fontSize: { xs: 16, sm: 20 },
                  marginRight: { xs: 0.5, sm: 1 }
                }
              },
              "& .MuiTabs-scrollButtons": {
                width: { xs: 32, sm: 40 }
              }
            }}
          >
            <Tab label="Create User" icon={<AddIcon />} iconPosition="start" />
            <Tab label={`Manage Users (${users.length})`} icon={<PersonIcon />} iconPosition="start" />
          </Tabs>
        </Box>

        {/* Create User Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ maxWidth: 800, mx: "auto" }}>
            <Card sx={{ mb: 3, boxShadow: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <PersonIcon color="primary" />
                  Create New User
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Create a new user account with role-based permissions. Admin has full access, Viewer has read-only access.
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="User Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PersonIcon color="action" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Email Address"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <EmailIcon color="action" />
                          </InputAdornment>
                        ),
                      }}
                      helperText="This will be used for login"
                    />
                  </Grid>
                  
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SecurityIcon color="action" />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowPassword(!showPassword)}
                              edge="end"
                            >
                              {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      helperText="Minimum 6 characters. User should change this after first login."
                    />
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <FormControl fullWidth required>
                      <InputLabel>Role</InputLabel>
                      <Select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        label="Role"
                      >
                        {Object.entries(ROLES).map(([key, roleInfo]) => (
                          <MenuItem key={key} value={key}>
                            <Box>
                              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                {roleInfo.label}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {roleInfo.description}
                              </Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card sx={{ boxShadow: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <AdminPanelSettingsIcon color="primary" />
                  Permissions Preview
                </Typography>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    bgcolor: role === "admin" ? "rgba(211, 47, 47, 0.1)" : "rgba(33, 150, 243, 0.1)",
                    borderRadius: 2,
                  }}
                >
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography variant="body2" sx={{ minWidth: 120, fontWeight: 600 }}>
                        Read Access:
                      </Typography>
                      <Chip
                        label={ROLES[role].permissions.read ? "Yes" : "No"}
                        color={ROLES[role].permissions.read ? "success" : "default"}
                        size="small"
                      />
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography variant="body2" sx={{ minWidth: 120, fontWeight: 600 }}>
                        Write Access:
                      </Typography>
                      <Chip
                        label={ROLES[role].permissions.write ? "Yes" : "No"}
                        color={ROLES[role].permissions.write ? "success" : "default"}
                        size="small"
                      />
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography variant="body2" sx={{ minWidth: 120, fontWeight: 600 }}>
                        Delete Access:
                      </Typography>
                      <Chip
                        label={ROLES[role].permissions.delete ? "Yes" : "No"}
                        color={ROLES[role].permissions.delete ? "success" : "default"}
                        size="small"
                      />
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography variant="body2" sx={{ minWidth: 120, fontWeight: 600 }}>
                        Manage Users:
                      </Typography>
                      <Chip
                        label={ROLES[role].permissions.manageUsers ? "Yes" : "No"}
                        color={ROLES[role].permissions.manageUsers ? "success" : "default"}
                        size="small"
                      />
                    </Box>
                  </Box>
                </Paper>
              </CardContent>
            </Card>
          </Box>
        </TabPanel>

        {/* Manage Users Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ p: 2 }}>
            {/* Stats Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Card sx={{ bgcolor: "primary.main", color: "white", boxShadow: 3 }}>
                  <CardContent>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {users.length}
                    </Typography>
                    <Typography variant="body2">Total Users</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Card sx={{ bgcolor: "error.main", color: "white", boxShadow: 3 }}>
                  <CardContent>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {adminCount}
                    </Typography>
                    <Typography variant="body2">Admins</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Card sx={{ bgcolor: "info.main", color: "white", boxShadow: 3 }}>
                  <CardContent>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {viewerCount}
                    </Typography>
                    <Typography variant="body2">Viewers</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Search and Filter */}
            <Paper sx={{ p: 2, mb: 2, boxShadow: 2 }}>
              <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
                <TextField
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  size="small"
                  sx={{ flexGrow: 1, minWidth: 200 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Filter by Role</InputLabel>
                  <Select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    label="Filter by Role"
                  >
                    <MenuItem value="all">All Roles</MenuItem>
                    <MenuItem value="admin">Admins Only</MenuItem>
                    <MenuItem value="viewer">Viewers Only</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Paper>

            {loadingUsers ? (
              <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 8 }}>
                <Box sx={{ textAlign: "center" }}>
                  <CircularProgress size={48} />
                  <Typography sx={{ mt: 2, color: "text.secondary" }}>
                    Loading users...
                  </Typography>
                </Box>
              </Box>
            ) : filteredUsers.length === 0 ? (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <PersonIcon sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  {searchQuery || roleFilter !== "all"
                    ? "No users match your filters"
                    : "No users found"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {searchQuery || roleFilter !== "all"
                    ? "Try adjusting your search or filter criteria"
                    : "Create your first user using the 'Create User' tab"}
                </Typography>
              </Box>
            ) : (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: "block" }}>
                  Showing {filteredUsers.length} of {users.length} users
                </Typography>
                <List sx={{ p: 0 }}>
                  {filteredUsers.map((user, index) => (
                    <Fade in={true} timeout={300} key={user.id || user.uid}>
                      <Card
                        sx={{
                          mb: 2,
                          boxShadow: 2,
                          borderRadius: 2,
                          transition: "all 0.2s ease-in-out",
                          "&:hover": {
                            boxShadow: 4,
                            transform: "translateY(-2px)",
                          },
                        }}
                      >
                        <CardContent>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                            <Avatar
                              sx={{
                                bgcolor: user.role === "admin" ? "error.main" : "info.main",
                                width: 56,
                                height: 56,
                              }}
                            >
                              {user.name.charAt(0).toUpperCase()}
                            </Avatar>
                            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5, flexWrap: "wrap" }}>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                  {user.name || "Unnamed User"}
                                </Typography>
                                {user.isCurrentUser && (
                                  <Chip
                                    label="You"
                                    size="small"
                                    color="primary"
                                    sx={{ fontSize: "0.7rem", height: 22, fontWeight: 600 }}
                                  />
                                )}
                                {user.isActive && (
                                  <Chip
                                    label="Active"
                                    size="small"
                                    color="success"
                                    sx={{ fontSize: "0.7rem", height: 22, fontWeight: 600 }}
                                  />
                                )}
                                {!user.isActive && !user.isCurrentUser && (
                                  <Chip
                                    label="Inactive"
                                    size="small"
                                    color="default"
                                    variant="outlined"
                                    sx={{ fontSize: "0.7rem", height: 22, fontWeight: 600 }}
                                  />
                                )}
                                {getRoleChip(user.role)}
                              </Box>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, display: "flex", alignItems: "center", gap: 0.5 }}>
                                <EmailIcon fontSize="small" />
                                {user.email}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1, fontFamily: "monospace" }}>
                                User ID: {user.uid}
                              </Typography>
                              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1 }}>
                                <Chip
                                  label={`Read ${user.permissions?.read ? "✓" : "✗"}`}
                                  size="small"
                                  color={user.permissions?.read ? "success" : "default"}
                                  variant="outlined"
                                />
                                <Chip
                                  label={`Write ${user.permissions?.write ? "✓" : "✗"}`}
                                  size="small"
                                  color={user.permissions?.write ? "success" : "default"}
                                  variant="outlined"
                                />
                                <Chip
                                  label={`Delete ${user.permissions?.delete ? "✓" : "✗"}`}
                                  size="small"
                                  color={user.permissions?.delete ? "success" : "default"}
                                  variant="outlined"
                                />
                              </Box>
                              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 0.5 }}>
                                {user.createdAt && (
                                  <Typography variant="caption" color="text.secondary">
                                    Created: {user.createdAt.toDate ? 
                                      new Date(user.createdAt.toDate()).toLocaleDateString() : 
                                      (user.createdAt instanceof Date ? user.createdAt.toLocaleDateString() : "Unknown")}
                                  </Typography>
                                )}
                                {user.lastSignInTime && (
                                  <Typography variant="caption" color="text.secondary">
                                    Last Sign In: {user.lastSignInTime instanceof Date ? 
                                      user.lastSignInTime.toLocaleDateString() : 
                                      new Date(user.lastSignInTime).toLocaleDateString()}
                                  </Typography>
                                )}
                                {user.disabled && (
                                  <Chip
                                    label="Disabled"
                                    size="small"
                                    color="error"
                                    variant="outlined"
                                    sx={{ fontSize: "0.65rem", height: 18 }}
                                  />
                                )}
                                {user.emailVerified === false && (
                                  <Chip
                                    label="Email Not Verified"
                                    size="small"
                                    color="warning"
                                    variant="outlined"
                                    sx={{ fontSize: "0.65rem", height: 18 }}
                                  />
                                )}
                              </Box>
                            </Box>
                            <Box sx={{ display: "flex", gap: 1, flexDirection: { xs: "column", sm: "row" } }}>
                              <Tooltip title="Change Role">
                                <FormControl size="small" sx={{ minWidth: 120 }}>
                                  <Select
                                    value={user.role || "viewer"}
                                    onChange={(e) => handleUpdateUserRole(user.id || user.uid, e.target.value)}
                                  >
                                    {Object.keys(ROLES).map((roleKey) => (
                                      <MenuItem key={roleKey} value={roleKey}>
                                        {ROLES[roleKey].label}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              </Tooltip>
                              <Tooltip title="Delete User">
                                <IconButton
                                  onClick={() => handleDeleteUser(user.id || user.uid, user.email)}
                                  disabled={deletingUser === (user.id || user.uid)}
                                  color="error"
                                  size="small"
                                >
                                  {deletingUser === (user.id || user.uid) ? (
                                    <CircularProgress size={20} />
                                  ) : (
                                    <DeleteIcon />
                                  )}
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Fade>
                  ))}
                </List>
              </Box>
            )}
          </Box>
        </TabPanel>
      </DialogContent>
      <DialogActions sx={{ bgcolor: "white", borderTop: "1px solid #e0e0e0", px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
        {tabValue === 0 && (
          <Button
            onClick={handleCreateUser}
            variant="contained"
            disabled={loading || !email || !password || !name}
            startIcon={loading ? <CircularProgress size={16} /> : <AddIcon />}
          >
            {loading ? "Creating..." : "Create User"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default UserPermissionManagementDialog;

// Export role definitions for use in other components
export { ROLES };
