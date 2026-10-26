import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  connectWallet,
  contractConfig,
  emptyAddress,
  ensureHardhatNetwork,
  getConnectedAccount,
  getContract,
  getCurrentChainId,
  mapDonation
} from "./contract";
import "./App.css";

const roleOptions = [
  {
    id: "donor",
    title: "Donor",
    description: "Create verified surplus-food entries and track collection status."
  },
  {
    id: "student",
    title: "Student",
    description: "Browse, claim, and confirm pickup with full on-chain traceability."
  },
  {
    id: "admin",
    title: "Admin",
    description: "Monitor totals, status distribution, and wallet activity across the system."
  }
];

const statusOptions = [
  { value: "all", label: "All statuses" },
  { value: "0", label: "Available" },
  { value: "1", label: "Claimed" },
  { value: "2", label: "Completed" },
  { value: "3", label: "Expired" }
];

const defaultStats = {
  total: 0,
  available: 0,
  claimed: 0,
  completed: 0,
  expired: 0
};

const getStatusLabel = (status) =>
  ["Available", "Claimed", "Completed", "Expired"][status] || "Unknown";

const getStatusClassName = (status) => {
  if (status === 0) {
    return "badge available";
  }

  if (status === 1) {
    return "badge claimed";
  }

  if (status === 2) {
    return "badge completed";
  }

  return "badge expired";
};

const shortenAddress = (address) => {
  if (!address) {
    return "Not connected";
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const formatTimestamp = (timestamp) => {
  if (!timestamp) {
    return "Not recorded";
  }

  return new Date(timestamp * 1000).toLocaleString();
};

const getRemainingTime = (expiresAt) => {
  if (!expiresAt) {
    return "Not set";
  }

  const remainingMs = expiresAt * 1000 - Date.now();

  if (remainingMs <= 0) {
    return "Expired";
  }

  const totalMinutes = Math.floor(remainingMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h left`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m left`;
  }

  return `${minutes}m left`;
};

function App() {
  const [donations, setDonations] = useState([]);
  const [stats, setStats] = useState(defaultStats);
  const [account, setAccount] = useState("");
  const [selectedRole, setSelectedRole] = useState("student");
  const [statusMessage, setStatusMessage] = useState("Connect MetaMask to access the blockchain dashboard.");
  const [notifications, setNotifications] = useState([]);
  const [notificationPermission, setNotificationPermission] = useState(
    typeof window !== "undefined" && "Notification" in window ? window.Notification.permission : "unsupported"
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState({
    foodDetails: "",
    quantity: "",
    pickupTime: "",
    pickupLocation: "",
    expiryTime: ""
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeActionId, setActiveActionId] = useState(null);
  const syncWalletStateRef = useRef(async () => {});
  const seenAvailableIdsRef = useRef(new Set());
  const hasLoadedOnceRef = useRef(false);

  const canCreateDonations = selectedRole === "donor";
  const canClaimDonations = selectedRole === "student";
  const isAdminView = selectedRole === "admin";
  const isAdminWallet = account && contractConfig.admin && account.toLowerCase() === contractConfig.admin.toLowerCase();

  const pushNotification = (notification) => {
    setNotifications((current) => [notification, ...current].slice(0, 6));
  };

  const maybeNotifyNewAvailableDonations = (items) => {
    const availableItems = items.filter((donation) => donation.status === 0);
    const nextAvailableIds = new Set(availableItems.map((donation) => donation.id));

    if (!hasLoadedOnceRef.current) {
      seenAvailableIdsRef.current = nextAvailableIds;
      hasLoadedOnceRef.current = true;
      return;
    }

    const newlyAvailable = availableItems.filter(
      (donation) => !seenAvailableIdsRef.current.has(donation.id)
    );

    if (!newlyAvailable.length) {
      seenAvailableIdsRef.current = nextAvailableIds;
      return;
    }

    newlyAvailable.forEach((donation) => {
      const notification = {
        id: `${donation.id}-${Date.now()}`,
        donationId: donation.id,
        foodDetails: donation.foodDetails,
        quantity: donation.quantity,
        pickupLocation: donation.pickupLocation || "Location shared on contact",
        createdAt: Date.now()
      };

      pushNotification(notification);

      if (typeof window !== "undefined" && "Notification" in window && window.Notification.permission === "granted") {
        const browserNotification = new window.Notification("New food available", {
          body: `${donation.foodDetails} • ${donation.quantity} servings • ${donation.pickupLocation || "Location shared on contact"}`
        });

        window.setTimeout(() => browserNotification.close(), 5000);
      }
    });

    seenAvailableIdsRef.current = nextAvailableIds;
  };

  const loadDashboardData = async (walletAddress = account) => {
    const contract = await getContract();
    const totalCount = Number(await contract.donationCount());
    const onChainStats = await contract.getDashboardStats();
    const items = [];

    for (let id = totalCount; id >= 1; id -= 1) {
      const donation = await contract.getDonation(id);
      items.push(mapDonation(donation));
    }

    setDonations(items);
    maybeNotifyNewAvailableDonations(items);
    setStats({
      total: Number(onChainStats.total ?? onChainStats[0]),
      available: Number(onChainStats.available ?? onChainStats[1]),
      claimed: Number(onChainStats.claimed ?? onChainStats[2]),
      completed: Number(onChainStats.completed ?? onChainStats[3]),
      expired: Number(onChainStats.expired ?? onChainStats[4])
    });
    setStatusMessage(
      items.length
        ? "Blockchain data loaded successfully. Switch roles to use donor, student, or admin actions."
        : "No donations on-chain yet. Create the first verified entry."
    );
  };

  syncWalletStateRef.current = async () => {
    if (!window.ethereum) {
      setAccount("");
      setDonations([]);
      setStats(defaultStats);
      setStatusMessage("MetaMask is not installed. Install it to connect to the Hardhat blockchain.");
      return;
    }

    try {
      const chainId = await getCurrentChainId();

      if (chainId !== contractConfig.chainIdHex) {
        setAccount("");
        setDonations([]);
        setStats(defaultStats);
        setStatusMessage("Switch MetaMask to the Hardhat local network (Chain ID 31337).");
        return;
      }

      const connectedAccount = await getConnectedAccount();
      setAccount(connectedAccount);

      if (!connectedAccount) {
        setDonations([]);
        setStats(defaultStats);
        setStatusMessage("Connect MetaMask to access the blockchain dashboard.");
        return;
      }

      await loadDashboardData(connectedAccount);
    } catch (error) {
      setStatusMessage(error.message || "Unable to synchronize wallet state.");
    }
  };

  useEffect(() => {
    syncWalletStateRef.current();

    if (!window.ethereum) {
      return undefined;
    }

    const handleAccountsChanged = (accounts) => {
      setAccount(accounts[0] || "");
      syncWalletStateRef.current();
    };

    const handleChainChanged = () => {
      syncWalletStateRef.current();
    };

    const intervalId = window.setInterval(() => {
      syncWalletStateRef.current();
    }, 30000);

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.clearInterval(intervalId);
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, []);

  const handleConnectWallet = async () => {
    try {
      setLoading(true);
      await ensureHardhatNetwork();
      const connectedAccount = await connectWallet();
      setAccount(connectedAccount);
      await loadDashboardData(connectedAccount);
    } catch (error) {
      setStatusMessage(error.message || "Unable to connect wallet.");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await syncWalletStateRef.current();
    } finally {
      setRefreshing(false);
    }
  };

  const handleEnableNotifications = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotificationPermission("unsupported");
      setStatusMessage("Browser notifications are not supported in this environment.");
      return;
    }

    try {
      const permission = await window.Notification.requestPermission();
      setNotificationPermission(permission);

      if (permission === "granted") {
        setStatusMessage("Browser notifications enabled for newly available food.");
        return;
      }

      setStatusMessage("Browser notifications were not enabled.");
    } catch (error) {
      setStatusMessage(error.message || "Unable to enable browser notifications.");
    }
  };

  const handleDismissNotification = (notificationId) => {
    setNotifications((current) => current.filter((notification) => notification.id !== notificationId));
  };

  const handleAdminRestoreDonation = async (donationId) => {
    const nextExpiryInput = window.prompt(
      "Enter a new expiry time for this donation in the format YYYY-MM-DDTHH:MM"
    );

    if (!nextExpiryInput) {
      return;
    }

    const newExpiresAt = Math.floor(new Date(nextExpiryInput).getTime() / 1000);

    if (!Number.isFinite(newExpiresAt) || newExpiresAt <= Math.floor(Date.now() / 1000)) {
      setStatusMessage("Enter a valid future expiry time to restore the donation.");
      return;
    }

    await runDonationAction(
      donationId,
      (contract) => contract.adminRestoreDonation(donationId, newExpiresAt),
      "Restoring donation in admin mode...",
      "Unable to restore donation."
    );
  };

  const handleRoleSwitch = (roleId) => {
    if (roleId === selectedRole) {
      return;
    }

    const nextRole = roleOptions.find((role) => role.id === roleId);

    if (!nextRole) {
      return;
    }

    const isReady = window.confirm(
      `Are you ready to switch to ${nextRole.title} mode? Only ${nextRole.title.toLowerCase()} actions will be enabled.`
    );

    if (!isReady) {
      return;
    }

    setSelectedRole(roleId);
    setStatusMessage(
      `Switched to ${nextRole.title} mode. Only actions allowed for ${nextRole.title.toLowerCase()} are enabled now.`
    );
  };

  const handleFormChange = (field) => (event) => {
    setForm((current) => ({
      ...current,
      [field]: event.target.value
    }));
  };

  const handleCreateDonation = async () => {
    if (!canCreateDonations) {
      setStatusMessage("Switch to Donor mode to create a donation.");
      return;
    }

    if (!form.foodDetails.trim() || !form.quantity) {
      setStatusMessage("Food name and quantity are required.");
      return;
    }

    const quantity = Number(form.quantity);
    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      setStatusMessage("Quantity must be a positive whole number.");
      return;
    }

    if (!form.expiryTime) {
      setStatusMessage("Expiry time is required so the donation can auto-close.");
      return;
    }

    const expiresAt = Math.floor(new Date(form.expiryTime).getTime() / 1000);

    if (!Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) {
      setStatusMessage("Choose an expiry time in the future.");
      return;
    }

    try {
      setLoading(true);
      setStatusMessage("Submitting donation to the blockchain...");

      const contract = await getContract();
      let tx;

      if (form.pickupTime.trim() || form.pickupLocation.trim()) {
        tx = await contract.createDonationDetailed(
          form.foodDetails.trim(),
          quantity,
          form.pickupTime.trim(),
          form.pickupLocation.trim(),
          expiresAt
        );
      } else {
        tx = await contract.createDonation(form.foodDetails.trim(), quantity, expiresAt);
      }

      await tx.wait();

      setForm({
        foodDetails: "",
        quantity: "",
        pickupTime: "",
        pickupLocation: "",
        expiryTime: ""
      });

      await loadDashboardData();
      setStatusMessage("Donation created successfully with automatic expiry tracking.");
    } catch (error) {
      setStatusMessage(error.message || "Unable to create donation.");
    } finally {
      setLoading(false);
    }
  };

  const runDonationAction = async (donationId, action, pendingMessage, errorMessage) => {
    try {
      setActiveActionId(donationId);
      setStatusMessage(pendingMessage);
      const contract = await getContract();
      const tx = await action(contract);
      await tx.wait();
      await loadDashboardData();
    } catch (error) {
      setStatusMessage(error.message || errorMessage);
    } finally {
      setActiveActionId(null);
    }
  };

  const filteredDonations = useMemo(() => {
    return donations.filter((donation) => {
      const matchesSearch = donation.foodDetails.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || String(donation.status) === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [donations, search, statusFilter]);

  const visibleDonations = useMemo(() => {
    if (isAdminView) {
      return filteredDonations;
    }

    if (selectedRole === "donor") {
      return filteredDonations.filter(
        (donation) => !account || donation.donor.toLowerCase() === account.toLowerCase()
      );
    }

    return filteredDonations;
  }, [account, filteredDonations, isAdminView, selectedRole]);

  const userActivity = useMemo(() => {
    if (!account) {
      return { donated: 0, claimed: 0, completed: 0 };
    }

    return donations.reduce(
      (summary, donation) => {
        if (donation.donor.toLowerCase() === account.toLowerCase()) {
          summary.donated += 1;
        }

        if (donation.claimer.toLowerCase() === account.toLowerCase()) {
          summary.claimed += 1;
        }

        if (
          donation.claimer.toLowerCase() === account.toLowerCase() &&
          donation.status === 2
        ) {
          summary.completed += 1;
        }

        return summary;
      },
      { donated: 0, claimed: 0, completed: 0 }
    );
  }, [account, donations]);

  const completionRate = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <div className="app-shell">
      <div className="container">
        <header className="hero">
          <div>
            <p className="eyebrow">Blockchain Powered Surplus Distribution</p>
              <h1>Food Donation Dashboard</h1>
              <p className="hero-copy">
                Switch between donor, student, and admin modes. Each mode only enables the actions it
                is supposed to perform.
            </p>
          </div>

          <div className="hero-panel">
            <div className="wallet-chip">
              <span>Connected wallet</span>
              <strong>{account ? shortenAddress(account) : "Not connected"}</strong>
            </div>
            <div className="wallet-chip">
              <span>Current mode</span>
              <strong>{roleOptions.find((role) => role.id === selectedRole)?.title}</strong>
            </div>
            <div className="wallet-chip">
              <span>Contract</span>
              <strong>{shortenAddress(contractConfig.address)}</strong>
            </div>
            <div className="wallet-chip">
              <span>Admin access</span>
              <strong>{isAdminWallet ? "Available to this wallet" : "Admin wallet only"}</strong>
            </div>
            <div className="hero-actions">
              <button type="button" onClick={handleConnectWallet} disabled={loading}>
                {account ? "Reconnect MetaMask" : "Connect MetaMask"}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                {refreshing ? "Refreshing..." : "Refresh Data"}
              </button>
            </div>
          </div>
        </header>

        <section className="status-banner">
          <p>{statusMessage}</p>
          <span>Network: Hardhat Local 31337</span>
        </section>

        <section className="panel notifications-panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Notification Center</p>
              <h2>New Available Food</h2>
            </div>
            <span className="pill">
              {notifications.length ? `${notifications.length} recent alerts` : "Waiting for new food"}
            </span>
          </div>

          <div className="notification-toolbar">
            <p className="helper-paragraph">
              The dashboard watches refreshes and alerts you when fresh donations become available.
            </p>
            <button
              type="button"
              className="secondary-dark-button"
              onClick={handleEnableNotifications}
              disabled={notificationPermission === "granted"}
            >
              {notificationPermission === "granted" ? "Browser Notifications Enabled" : "Enable Browser Notifications"}
            </button>
          </div>

          {notifications.length ? (
            <div className="notification-list">
              {notifications.map((notification) => (
                <article key={notification.id} className="notification-item">
                  <div>
                    <p className="notification-title">Donation #{notification.donationId}: {notification.foodDetails}</p>
                    <p className="notification-meta">
                      {notification.quantity} servings available at {notification.pickupLocation}
                    </p>
                    <p className="notification-meta">{new Date(notification.createdAt).toLocaleString()}</p>
                  </div>
                  <button
                    type="button"
                    className="notification-dismiss"
                    onClick={() => handleDismissNotification(notification.id)}
                  >
                    Dismiss
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-notifications">
              <h3>No new food alerts yet</h3>
              <p>Newly available donations will appear here automatically during dashboard refreshes.</p>
            </div>
          )}
        </section>

        <section className="stats-grid">
          <article className="stat-card">
            <span>Total donations</span>
            <strong>{stats.total}</strong>
            <p>All blockchain donation entries created so far.</p>
          </article>
          <article className="stat-card">
            <span>Available now</span>
            <strong>{stats.available}</strong>
            <p>Open donations ready for eligible students to claim.</p>
          </article>
          <article className="stat-card">
            <span>Claimed</span>
            <strong>{stats.claimed}</strong>
            <p>Items currently reserved but not yet confirmed as picked up.</p>
          </article>
          <article className="stat-card">
            <span>Expired</span>
            <strong>{stats.expired}</strong>
            <p>Auto-closed donations that passed their expiry window.</p>
          </article>
        </section>

        <section className="top-grid">
          <article className="panel form-panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Donor Workflow</p>
                <h2>Create Donation</h2>
              </div>
              <span className="pill">
                {canCreateDonations ? "Donor actions enabled" : "Switch to donor mode"}
              </span>
            </div>

            <div className="field-grid">
              <label>
                <span>Food name</span>
                <input
                  value={form.foodDetails}
                  onChange={handleFormChange("foodDetails")}
                  placeholder="Rice bowl, sandwiches, fruit packs..."
                  disabled={!canCreateDonations}
                />
              </label>
              <label>
                <span>Quantity</span>
                <input
                  type="number"
                  min="1"
                  value={form.quantity}
                  onChange={handleFormChange("quantity")}
                  placeholder="Number of servings"
                  disabled={!canCreateDonations}
                />
              </label>
              <label>
                <span>Pickup time</span>
                <input
                  value={form.pickupTime}
                  onChange={handleFormChange("pickupTime")}
                  placeholder="Today 8:30 PM"
                  disabled={!canCreateDonations}
                />
              </label>
              <label>
                <span>Pickup location</span>
                <input
                  value={form.pickupLocation}
                  onChange={handleFormChange("pickupLocation")}
                  placeholder="Hostel mess gate"
                  disabled={!canCreateDonations}
                />
              </label>
              <label className="full-width">
                <span>Expiry time</span>
                <input
                  type="datetime-local"
                  value={form.expiryTime}
                  onChange={handleFormChange("expiryTime")}
                  disabled={!canCreateDonations}
                />
              </label>
            </div>

            <button type="button" onClick={handleCreateDonation} disabled={loading || !canCreateDonations}>
              {loading ? "Submitting..." : "Create Donation"}
            </button>
          </article>

          <article className="panel role-panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Role Views</p>
                <h2>Switch Role</h2>
              </div>
              <span className="pill">Confirmation required</span>
            </div>

            <div className="role-tabs">
              {roleOptions.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  className={selectedRole === role.id ? "role-tab active" : "role-tab"}
                  onClick={() => handleRoleSwitch(role.id)}
                >
                  {role.title}
                </button>
              ))}
            </div>

            <div className="role-copy">
              <h3>{roleOptions.find((role) => role.id === selectedRole)?.title}</h3>
              <p>{roleOptions.find((role) => role.id === selectedRole)?.description}</p>
            </div>

            <div className="activity-grid">
              <div>
                <span>Donations created</span>
                <strong>{userActivity.donated}</strong>
              </div>
              <div>
                <span>Claims made</span>
                <strong>{userActivity.claimed}</strong>
              </div>
              <div>
                <span>Pickups completed</span>
                <strong>{userActivity.completed}</strong>
              </div>
            </div>
          </article>
        </section>

        <section className="panel filters-panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Discovery Tools</p>
              <h2>Search and Filter</h2>
            </div>
            <span className="pill">{visibleDonations.length} cards shown</span>
          </div>

          <div className="filter-row">
            <input
              className="search-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by food name"
            />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              {statusOptions.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="cards-grid">
          {visibleDonations.map((donation) => {
            const isOwnDonation = account && donation.donor.toLowerCase() === account.toLowerCase();
            const isClaimer = account && donation.claimer.toLowerCase() === account.toLowerCase();

            return (
              <article key={donation.id} className="donation-card">
                <div className="card-top">
                  <div>
                    <p className="section-label">Donation #{donation.id}</p>
                    <h3>{donation.foodDetails}</h3>
                  </div>
                  <span className={getStatusClassName(donation.status)}>
                    {getStatusLabel(donation.status)}
                  </span>
                </div>

                <div className="detail-grid">
                  <div>
                    <span>Quantity</span>
                    <strong>{donation.quantity} servings</strong>
                  </div>
                  <div>
                    <span>Pickup time</span>
                    <strong>{donation.pickupTime || "Flexible"}</strong>
                  </div>
                  <div>
                    <span>Pickup location</span>
                    <strong>{donation.pickupLocation || "Shared on contact"}</strong>
                  </div>
                  <div>
                    <span>Created</span>
                    <strong>{formatTimestamp(donation.createdAt)}</strong>
                  </div>
                  <div>
                    <span>Expires</span>
                    <strong>{formatTimestamp(donation.expiresAt)}</strong>
                  </div>
                  <div>
                    <span>Time remaining</span>
                    <strong>{getRemainingTime(donation.expiresAt)}</strong>
                  </div>
                </div>

                <div className="address-block">
                  <p><b>Donor:</b> {donation.donor}</p>
                  <p>
                    <b>Claimer:</b>{" "}
                    {donation.claimer === emptyAddress ? "Not claimed yet" : donation.claimer}
                  </p>
                </div>

                <div className="card-actions">
                  {isAdminView && isAdminWallet && donation.status !== 2 && donation.status !== 3 ? (
                    <button
                      type="button"
                      onClick={() =>
                        runDonationAction(
                          donation.id,
                          (contract) => contract.adminCloseDonation(donation.id),
                          "Closing donation in admin mode...",
                          "Unable to close donation."
                        )
                      }
                      disabled={activeActionId === donation.id}
                    >
                      {activeActionId === donation.id ? "Closing..." : "Admin Close"}
                    </button>
                  ) : null}

                  {isAdminView && isAdminWallet && donation.status === 3 ? (
                    <button
                      type="button"
                      onClick={() => handleAdminRestoreDonation(donation.id)}
                      disabled={activeActionId === donation.id}
                    >
                      {activeActionId === donation.id ? "Restoring..." : "Admin Restore"}
                    </button>
                  ) : null}

                  {donation.status === 0 && !isOwnDonation ? (
                    <button
                      type="button"
                      onClick={() =>
                        runDonationAction(
                          donation.id,
                          (contract) => contract.claimDonation(donation.id),
                          "Claiming donation on-chain...",
                          "Unable to claim donation."
                        )
                      }
                      disabled={!canClaimDonations || activeActionId === donation.id}
                    >
                      {activeActionId === donation.id ? "Claiming..." : "Claim Donation"}
                    </button>
                  ) : null}

                  {donation.status === 1 && isClaimer ? (
                    <button
                      type="button"
                      onClick={() =>
                        runDonationAction(
                          donation.id,
                          (contract) => contract.confirmPickup(donation.id),
                          "Confirming pickup on-chain...",
                          "Unable to confirm pickup."
                        )
                      }
                      disabled={!canClaimDonations || activeActionId === donation.id}
                    >
                      {activeActionId === donation.id ? "Confirming..." : "Confirm Pickup"}
                    </button>
                  ) : null}

                  {isOwnDonation ? <span className="helper-text">You posted this donation.</span> : null}
                  {donation.status === 2 ? (
                    <span className="helper-text">Pickup confirmed and permanently recorded.</span>
                  ) : null}
                  {donation.status === 3 ? (
                    <span className="helper-text">This donation auto-closed after its expiry time.</span>
                  ) : null}
                  {isAdminView && !isAdminWallet ? (
                    <span className="helper-text">Connect the configured admin wallet to use moderation tools.</span>
                  ) : null}
                  {!canClaimDonations && donation.status === 0 ? (
                    <span className="helper-text">Switch to student mode to claim donations.</span>
                  ) : null}
                </div>
              </article>
            );
          })}

          {!visibleDonations.length ? (
            <article className="empty-state">
              <h3>No donations match this view</h3>
              <p>
                Try switching roles, clearing filters, or creating a new donation to populate the
                blockchain dashboard.
              </p>
            </article>
          ) : null}
        </section>

        <section className="admin-grid">
          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Admin Analytics</p>
                <h2>System Oversight</h2>
              </div>
              <span className="pill">{isAdminView ? "Admin mode enabled" : "Switch to admin mode"}</span>
            </div>

            <div className="analytics-list">
              <div>
                <span>Admin wallet</span>
                <strong>{contractConfig.admin || "Set after deploy"}</strong>
              </div>
              <div>
                <span>Completion rate</span>
                <strong>{completionRate}%</strong>
              </div>
              <div>
                <span>Open opportunities</span>
                <strong>{stats.available}</strong>
              </div>
              <div>
                <span>Pending pickups</span>
                <strong>{stats.claimed}</strong>
              </div>
              <div>
                <span>Completed donations</span>
                <strong>{stats.completed}</strong>
              </div>
              <div>
                <span>Expired donations</span>
                <strong>{stats.expired}</strong>
              </div>
            </div>
          </article>

          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Admin Moderation</p>
                <h2>Separate Admin-Only Tools</h2>
              </div>
            </div>

            <div className="explanation-list">
              <p>
                <b>Admin Close:</b> in admin mode, the configured admin wallet can close active or
                claimed donations that should no longer be visible to students.
              </p>
              <p>
                <b>Admin Restore:</b> closed donations can be restored with a fresh expiry time if
                the listing should become available again.
              </p>
              <p>
                <b>Access separation:</b> these moderation buttons only appear in admin mode and only
                work for the wallet that matches the deployed admin address.
              </p>
              <p>
                <b>Operational control:</b> this keeps moderation separate from donor creation and
                student pickup flows while still preserving the on-chain history.
              </p>
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}

export default App;
