import { useEffect, useState } from "react";
import "./App.css";

// Public FastAPI backend used by both local and deployed frontend
const API_BASE_URL = "https://oil-hse-ai.onrender.com";

function App() {
  const [backendStatus, setBackendStatus] = useState("Checking...");
  const [reports, setReports] = useState([]);
  const [activePage, setActivePage] = useState("Dashboard");

  // Demo authentication for prototype presentation (not production security)
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const handleLogin = (event) => {
    event.preventDefault();

    if (loginUsername === "hse_admin" && loginPassword === "admin123") {
      setIsAuthenticated(true);
      setLoginError("");
      setActivePage("Dashboard");
      setLoginPassword("");
    } else {
      setLoginError("Invalid username or password.");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setLoginUsername("");
    setLoginPassword("");
    setLoginError("");
    setActivePage("Dashboard");
  };

  // Upload states
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploading, setUploading] = useState(false);

  // AI analysis states
  const [analysisResults, setAnalysisResults] = useState({});
  const [analyzingReport, setAnalyzingReport] = useState(null);

  // Alerts
  const [alerts, setAlerts] = useState([]);

  // --------------------------------------------------
  // Load reports
  // --------------------------------------------------

  const loadReports = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/reports`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch reports");
      }

      const data = await response.json();

      setReports(data);
    } catch (error) {
      console.error("Error fetching reports:", error);
    }
  };

  // --------------------------------------------------
  // Load alerts
  // --------------------------------------------------

  const loadAlerts = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/alerts`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch alerts");
      }

      const data = await response.json();

      setAlerts(data);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      setAlerts([]);
    }
  };

  // --------------------------------------------------
  // Check backend and load data
  // --------------------------------------------------

  useEffect(() => {
    // Check backend
    fetch(`${API_BASE_URL}/health`)
      .then((response) => response.json())
      .then((data) => {
        setBackendStatus(data.status);
      })
      .catch(() => {
        setBackendStatus("Backend not connected");
      });

    // Load reports
    loadReports();

    // Load alerts
    loadAlerts();
  }, []);

  // --------------------------------------------------
  // Upload reports
  // --------------------------------------------------

  const handleFileChange = (event) => {
    const file = event.target.files[0];

    if (file) {
      setSelectedFile(file);
      setUploadMessage("");
    }
  };

  const handleUpload = async () => {
  if (!selectedFile) {
    setUploadMessage("Please select a CSV or Excel file first.");
    return;
  }

  setUploading(true);
  setUploadMessage("");

  try {
    const formData = new FormData();

    formData.append("file", selectedFile);

    const response = await fetch(
      `${API_BASE_URL}/upload-reports`,
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await response.json();

    if (data.success) {
      setUploadMessage(
        `✅ File validated successfully!\n\n` +
        `Reports received: ${data.rows_received}\n` +
        `Valid reports: ${data.valid_rows}\n` +
        `Invalid reports: ${data.invalid_rows}\n` +
        `Reports stored: ${data.rows_inserted}`
      );

      // Refresh reports and alerts
      await loadReports();
      await loadAlerts();

      // Clear selected file
      setSelectedFile(null);
    } else {
      setUploadMessage(
        `❌ Upload/Validation failed.\n\n${data.message}`
      );
    }

  } catch (error) {

    console.error(error);

    setUploadMessage(
      "❌ Could not connect to the backend server."
    );

  } finally {

    setUploading(false);

  }
};
  // --------------------------------------------------
  // Format date for Indian display
  // YYYY-MM-DD → DD/MM/YYYY
  // --------------------------------------------------

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return "N/A";
    }

    const dateText = String(dateValue);

    const parts = dateText.split("-");

    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    return dateText;
  };

  // --------------------------------------------------
  // Continuous report numbers for display
  // Keeps database report_id unchanged internally
  // --------------------------------------------------

  const reportNumberMap = {};

  reports.forEach((report, index) => {
    reportNumberMap[report.report_id] = index + 1;
  });

  // --------------------------------------------------
  // AI Analysis
  // --------------------------------------------------

  const handleAnalyze = async (report) => {
    setAnalyzingReport(report.report_id);

    try {
      const response = await fetch(
        `${API_BASE_URL}/analyze-report?report_text=${encodeURIComponent(
          report.report_text
        )}`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Analysis failed: ${response.status}`
        );
      }

      const data = await response.json();

      setAnalysisResults((previousResults) => ({
        ...previousResults,
        [report.report_id]: data,
      }));

      // Refresh alerts after analysis
      await loadAlerts();
    } catch (error) {
      console.error(
        "AI analysis error:",
        error
      );

      setAnalysisResults((previousResults) => ({
        ...previousResults,
        [report.report_id]: {
          error:
            "AI analysis failed. Please try again.",
        },
      }));
    } finally {
      setAnalyzingReport(null);
    }
  };

    // --------------------------------------------------
  // Dashboard precursor data
  // --------------------------------------------------

  const precursorCounts = {};

  alerts.forEach((alert) => {
    if (alert.precursors) {
      alert.precursors.forEach((precursor) => {
        precursorCounts[precursor] =
          (precursorCounts[precursor] || 0) + 1;
      });
    }
  });

   const precursorData = Object.entries(
    precursorCounts
  );

  // --------------------------------------------------
  // Dashboard alert summary
  // --------------------------------------------------

  const totalAlerts = alerts.length;

  const uniquePrecursors = new Set();

  alerts.forEach((alert) => {
    if (alert.precursors) {
      alert.precursors.forEach((precursor) => {
        uniquePrecursors.add(precursor);
      });
    }
  });

  const precursorTypeCount = uniquePrecursors.size;

  // --------------------------------------------------
  // Main UI
  // --------------------------------------------------

  const uiStyles = `
    .login-page {
      min-height: 100vh;
      width: 100%;
      display: flex;
      align-items: stretch;
      justify-content: flex-end;
      background: #123b5d url("/oil-login-background.png") left center / cover no-repeat;
      padding: 0;
      box-sizing: border-box;
      position: relative;
      overflow: hidden;
    }

    .login-page::after {
      content: "";
      position: absolute;
      inset: 0;
      background: linear-gradient(
        90deg,
        rgba(8, 34, 58, 0.08) 0%,
        rgba(8, 34, 58, 0.04) 45%,
        rgba(8, 34, 58, 0.42) 100%
      );
      pointer-events: none;
    }

    .login-card {
      position: relative;
      z-index: 2;
      width: min(430px, 42vw);
      min-width: 360px;
      margin: 4.5vh 5vw 4.5vh 2vw;
      align-self: center;
      background: rgba(255, 255, 255, 0.94);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.85);
      border-radius: 20px;
      padding: 34px;
      box-shadow: 0 18px 50px rgba(4, 28, 51, 0.30);
      box-sizing: border-box;
    }

    .login-brand {
      text-align: center;
      margin-bottom: 28px;
    }

    .login-logo {
      width: 62px;
      height: 62px;
      margin: 0 auto 14px;
      border-radius: 16px;
      background: #123b5d;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      font-weight: 800;
    }

    .login-brand h1 {
      margin: 0;
      color: #123b5d;
      font-size: 27px;
    }

    .login-brand p {
      margin: 7px 0 0;
      color: #64748b;
      font-size: 14px;
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .login-field label {
      display: block;
      margin-bottom: 7px;
      color: #334155;
      font-size: 13px;
      font-weight: 700;
    }

    .login-field input {
      width: 100%;
      box-sizing: border-box;
      padding: 12px 13px;
      border: 1px solid #cbd5e1;
      border-radius: 9px;
      outline: none;
      font-size: 14px;
      color: #1e293b;
      background: #ffffff;
    }

    .login-field input:focus {
      border-color: #1976d2;
      box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.10);
    }

    .login-button {
      margin-top: 5px;
      width: 100%;
      border: none;
      border-radius: 9px;
      padding: 13px 16px;
      background: #1976d2;
      color: #ffffff;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
    }

    .login-button:hover {
      background: #1565c0;
    }

    .login-error {
      padding: 10px 12px;
      border-radius: 8px;
      background: #fff5f5;
      border: 1px solid #fecaca;
      color: #b91c1c;
      font-size: 13px;
    }

    .demo-credentials {
      margin-top: 20px;
      padding: 12px 14px;
      border-radius: 9px;
      background: #f4f8fc;
      border: 1px solid #dbe8f5;
      color: #475569;
      font-size: 12px;
      line-height: 1.6;
    }

    .logout-button {
      margin-top: 16px;
      width: 100%;
      border: 1px solid #dbe3ef;
      border-radius: 8px;
      padding: 9px 12px;
      background: #ffffff;
      color: #b91c1c;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }

    .logout-button:hover {
      background: #fff5f5;
      border-color: #fecaca;
    }



    @media (max-width: 900px) {
      .login-page {
        background-position: center left;
      }

      .login-card {
        width: min(430px, 82vw);
        min-width: 0;
        margin-right: 5vw;
      }
    }

    @media (max-width: 650px) {
      .login-page {
        justify-content: center;
        background-position: 28% center;
      }

      .login-page::after {
        background: rgba(8, 34, 58, 0.46);
      }

      .login-card {
        width: calc(100% - 32px);
        margin: 16px;
        padding: 28px 24px;
      }
    }

    .file-select-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 12px 22px;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      background: #ffffff;
      color: #17365d;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 2px 6px rgba(15, 23, 42, 0.06);
    }

    .file-select-button:hover {
      border-color: #2196f3;
      background: #f4f9ff;
      transform: translateY(-1px);
    }

    .file-select-button input[type="file"] {
      display: none;
    }

    .selected-file-modern {
      margin-top: 14px;
      padding: 11px 14px;
      border-radius: 9px;
      background: #f1f7ff;
      border: 1px solid #d7e8fb;
      color: #334155;
      display: flex;
      align-items: center;
      gap: 8px;
      max-width: 520px;
      margin-left: auto;
      margin-right: auto;
    }

    .selected-file-modern span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .modern-upload-button,
    .analysis-action-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border: none;
      border-radius: 10px;
      padding: 12px 22px;
      margin-top: 18px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 10px rgba(15, 23, 42, 0.10);
    }

    .modern-upload-button {
      background: #2196f3;
      color: white;
    }

    .modern-upload-button:hover:not(:disabled) {
      background: #1976d2;
      transform: translateY(-1px);
      box-shadow: 0 6px 14px rgba(33, 150, 243, 0.25);
    }

    .analysis-action-button {
      margin-top: 0;
      background: #eef6ff;
      color: #1565c0;
      border: 1px solid #cfe4fb;
      box-shadow: none;
      padding: 9px 15px;
      white-space: nowrap;
    }

    .analysis-action-button:hover:not(:disabled) {
      background: #2196f3;
      color: white;
      border-color: #2196f3;
      transform: translateY(-1px);
      box-shadow: 0 4px 10px rgba(33, 150, 243, 0.22);
    }

    .modern-upload-button:disabled,
    .analysis-action-button:disabled {
      opacity: 0.65;
      cursor: not-allowed;
      transform: none;
    }
  `;

  if (!isAuthenticated) {
    return (
      <div className="login-page">
        <style>{uiStyles}</style>

        <div className="login-card">
          <div className="login-brand">
            <div className="login-logo">O</div>
            <h1>OIL HSE AI</h1>
            <p>Smarter Insights&nbsp;&nbsp;|&nbsp;&nbsp;Safer Operations</p>
            <div style={{
              marginTop: "14px",
              color: "#1976d2",
              fontSize: "12px",
              fontWeight: "700",
              letterSpacing: "0.3px"
            }}>
              AI-POWERED SAFETY ANALYSIS
            </div>
          </div>

          <form className="login-form" onSubmit={handleLogin}>
            <div className="login-field">
              <label htmlFor="login-username">Username</label>
              <input
                id="login-username"
                type="text"
                placeholder="Enter username"
                value={loginUsername}
                onChange={(event) => {
                  setLoginUsername(event.target.value);
                  setLoginError("");
                }}
                autoComplete="username"
              />
            </div>

            <div className="login-field">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                placeholder="Enter password"
                value={loginPassword}
                onChange={(event) => {
                  setLoginPassword(event.target.value);
                  setLoginError("");
                }}
                autoComplete="current-password"
              />
            </div>

            {loginError && (
              <div className="login-error">{loginError}</div>
            )}

            <button className="login-button" type="submit">
              Login
            </button>
          </form>

          <div className="demo-credentials">
            <strong>Demo credentials</strong><br />
            Username: <strong>hse_admin</strong><br />
            Password: <strong>admin123</strong>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <style>{uiStyles}</style>

      {/* ================================================= */}
      {/* SIDEBAR                                           */}
      {/* ================================================= */}

      <aside className="sidebar">

        <div className="logo">

          <div className="logo-icon">
            O
          </div>

          <div>
            <h2>OIL HSE AI</h2>
            <p>Safety Intelligence</p>
          </div>

        </div>

        <nav>

          <a
            className={
              activePage === "Dashboard"
                ? "active"
                : ""
            }
            onClick={() =>
              setActivePage("Dashboard")
            }
          >
            Dashboard
          </a>

          <a
            className={
              activePage === "Upload Reports"
                ? "active"
                : ""
            }
            onClick={() =>
              setActivePage("Upload Reports")
            }
          >
            Upload Reports
          </a>

          <a
            className={
              activePage === "HSE Reports"
                ? "active"
                : ""
            }
            onClick={() =>
              setActivePage("HSE Reports")
            }
          >
            HSE Reports
          </a>

          <a
            className={
              activePage === "AI Analysis"
                ? "active"
                : ""
            }
            onClick={() =>
              setActivePage("AI Analysis")
            }
          >
            AI Analysis
          </a>

          <a
            className={
              activePage === "Alerts"
                ? "active"
                : ""
            }
            onClick={() =>
              setActivePage("Alerts")
            }
          >
            Alerts
          </a>

        </nav>

        <div className="sidebar-bottom">
          <p>OIL HSE AI SYSTEM</p>
          <span>Smart Automation</span>
          <button className="logout-button" onClick={handleLogout}>
            ↪ Logout
          </button>
        </div>

      </aside>

      {/* ================================================= */}
      {/* MAIN CONTENT                                      */}
      {/* ================================================= */}

      <main className="main">

        {/* ================================================= */}
        {/* DASHBOARD                                         */}
        {/* ================================================= */}

        {activePage === "Dashboard" && (

          <section>

            <header className="header">

              <div>
                <h1>
                  HSE Safety Dashboard
                </h1>

                <p>
                  AI-powered analysis of Unsafe Acts,
                  Unsafe Conditions and Near-Miss reports
                </p>

                <p>
                  Backend Status:{" "}
                  {backendStatus}
                </p>
              </div>

              <div className="user">

                <div className="user-avatar">
                  A
                </div>

                <div>
                  <strong>
                    HSE Analyst
                  </strong>

                  <span>
                    Safety Team
                  </span>
                </div>

              </div>

            </header>

            {/* Statistics */}

            <section className="stats">

              <div className="stat-card">

                <div className="stat-icon">
                  📄
                </div>

                <div>
                  <p>Total Reports</p>

                  <h2>
                    {reports.length}
                  </h2>

                  <span>
                    Reports in database
                  </span>
                </div>

              </div>

              <div className="stat-card danger">

                <div className="stat-icon">
                  ⚠️
                </div>

                <div>
                  <p>SIF Potential</p>

                  <h2>
                    {
                      reports.filter(
                        (report) =>
                          report.sif_potential
                      ).length
                    }
                  </h2>

                  <span>
                    Reports requiring attention
                  </span>
                </div>

              </div>

              <div className="stat-card warning">

                <div className="stat-icon">
                  🔎
                </div>

                <div>
                  <p>Near Miss</p>

                  <h2>
                    {
                      reports.filter(
                        (report) =>
                          report.report_type ===
                          "Near Miss"
                      ).length
                    }
                  </h2>

                  <span>
                    Near-miss reports
                  </span>
                </div>

              </div>

              <div className="stat-card success">

                <div className="stat-icon">
                  ✓
                </div>

                <div>
                  <p>Available</p>

                  <h2>
                    {reports.length}
                  </h2>

                  <span>
                    Reports ready for analysis
                  </span>
                </div>

              </div>
                            <div className="stat-card danger">

                <div className="stat-icon">
                  🚨
                </div>

                <div>
                  <p>SIF Alerts</p>

                  <h2>
                    {totalAlerts}
                  </h2>

                  <span>
                    Alerts generated by AI
                  </span>
                </div>

              </div>


              <div className="stat-card warning">

                <div className="stat-icon">
                  ⚠️
                </div>

                <div>
                  <p>Precursor Types</p>

                  <h2>
                    {precursorTypeCount}
                  </h2>

                  <span>
                    Safety risks detected
                  </span>
                </div>

              </div>

            </section>

            {/* Analytics */}

            <section className="content-grid">

              <div className="panel large">

                <div className="panel-header">

                  <div>
                    <h3>
                      SIF Precursor Analysis
                    </h3>

                    <p>
                      AI-based identification of
                      potential serious safety risks
                    </p>
                  </div>

                </div>

                                <div
                  style={{
                    padding: "20px 10px",
                  }}
                >

                  {precursorData.length === 0 ? (

                    <div className="empty-state">

                      <h3>
                        No precursor data available
                      </h3>

                      <p>
                        Analyze SIF-potential reports to
                        see detected safety precursors.
                      </p>

                    </div>

                  ) : (

                    <div>

                      {precursorData.map(
                        ([precursor, count]) => {

                          const maxCount = Math.max(
                            ...precursorData.map(
                              ([, value]) => value
                            )
                          );

                          const barWidth =
                            (count / maxCount) * 100;

                          return (

                            <div
                              key={precursor}
                              style={{
                                marginBottom: "18px",
                              }}
                            >

                              <div
                                style={{
                                  display: "flex",
                                  justifyContent:
                                    "space-between",
                                  marginBottom: "6px",
                                  fontWeight: "600",
                                }}
                              >

                                <span>
                                  {precursor}
                                </span>

                                <span>
                                  {count}
                                </span>

                              </div>

                              <div
                                style={{
                                  width: "100%",
                                  height: "12px",
                                  background:
                                    "#e5e7eb",
                                  borderRadius:
                                    "10px",
                                  overflow:
                                    "hidden",
                                }}
                              >

                                <div
                                  style={{
                                    width: `${barWidth}%`,
                                    height: "100%",
                                    background:
                                      "#dc2626",
                                    borderRadius:
                                      "10px",
                                    transition:
                                      "width 0.5s ease",
                                  }}
                                ></div>

                              </div>

                            </div>

                          );
                        }
                      )}

                    </div>

                  )}

                </div>

              </div>

              <div className="panel">

                <div className="panel-header">

                  <div>
                    <h3>
                      Report Classification
                    </h3>

                    <p>
                      Current database classification
                    </p>
                  </div>

                </div>

                <div className="classification">

                  <div className="classification-row">
                    <span>
                      SIF-Potential
                    </span>

                    <strong>
                      {
                        reports.filter(
                          (report) =>
                            report.sif_potential
                        ).length
                      }
                    </strong>
                  </div>
                   <div className="progress">
                     <div
                    className="progress-danger"
                    style={{
                     width: `${
                     reports.length > 0
                     ? (reports.filter(
                     (report) =>
                     report.sif_potential
                     ).length /
                       reports.length) *
                        100
                        : 0
                         }%`,
                         }}
                       ></div>
                   </div>
                  

                  <div className="classification-row">
                    <span>
                      Non-SIF-Potential
                    </span>

                    <strong>
                      {
                        reports.filter(
                          (report) =>
                            !report.sif_potential
                        ).length
                      }
                    </strong>
                  </div>

                  <div className="progress">
  <div
    className="progress-safe"
    style={{
      width: `${
        reports.length > 0
          ? (reports.filter(
              (report) =>
                !report.sif_potential
            ).length /
              reports.length) *
            100
          : 0
      }%`,
    }}
  ></div>
</div>

                </div>

              </div>

            </section>

            {/* Recent Reports */}

            <section className="panel reports-panel">

              <div className="panel-header">

                <div>
                  <h3>
                    Recent HSE Reports
                  </h3>

                  <p>
                    Reports currently stored in PostgreSQL
                  </p>
                </div>

                <button
                  onClick={() =>
                    setActivePage("HSE Reports")
                  }
                >
                  View All Reports
                </button>

              </div>

              <div className="table-wrapper">

                <table>

                <thead>

                  <tr>
                   <th>ID</th>
                   <th>Date</th>
                   <th>Type</th>
                   <th>Report</th>
                   <th>SIF Potential</th>
                  </tr>

                </thead>

                  <tbody>

                    {reports
                      .slice(-5)
                      .reverse()
                      .map((report) => (

                        <tr
                          key={report.report_id}
                        >

                          <td>
                            #{reportNumberMap[report.report_id]}
                          </td>

                          <td>
                            {formatDate(report.report_date)}
                          </td>

                          <td>
                            {report.report_type}
                          </td>

                          <td>
                            {report.report_text}
                          </td>
                          <td>
                            {report.sif_potential ? "🚨 YES" : "✓ NO"}
                          </td>

                        </tr>

                      ))}

                  </tbody>

                </table>

              </div>

            </section>

          </section>

        )}

        {/* ================================================= */}
        {/* UPLOAD REPORTS                                    */}
        {/* ================================================= */}

        {activePage === "Upload Reports" && (

          <section>

            <header className="header">

              <div>
                <h1>
                  Upload HSE Reports
                </h1>

                <p>
                  Upload CSV or Excel files
                  containing HSE safety reports
                </p>
              </div>

              <div className="user">

                <div className="user-avatar">
                  A
                </div>

                <div>
                  <strong>
                    HSE User
                  </strong>

                  <span>
                    Safety Department
                  </span>
                </div>

              </div>

            </header>

            <div className="panel">

              <div className="panel-header">

                <div>
                  <h2>
                    Upload Reports
                  </h2>

                  <p>
                    Supported formats: CSV and Excel
                    (.xlsx)
                  </p>
                </div>

              </div>
              <div className="upload-workflow">

  <div className="workflow-step">
    <span>1</span>
    <strong>Upload</strong>
    <small>Select CSV or Excel file</small>
  </div>

  <div className="workflow-arrow">→</div>

  <div className="workflow-step">
    <span>2</span>
    <strong>Validate</strong>
    <small>Check report data</small>
  </div>

  <div className="workflow-arrow">→</div>

  <div className="workflow-step">
    <span>3</span>
    <strong>Store</strong>
    <small>Save to PostgreSQL</small>
  </div>

  <div className="workflow-arrow">→</div>

  <div className="workflow-step">
    <span>4</span>
    <strong>Analyze</strong>
    <small>Detect SIF precursors</small>
  </div>

  <div className="workflow-arrow">→</div>

  <div className="workflow-step">
    <span>5</span>
    <strong>Alert</strong>
    <small>Generate safety alert</small>
  </div>

</div>
              <div className="upload-box">

                <div className="upload-icon">
                  ↑
                </div>

                <h3>
                  Select HSE Report File
                </h3>

                <p>
                  Choose a CSV or Excel file
                  from your computer
                </p>

                <label className="file-select-button">
                  <span>📁 Choose File</span>
                  <input
                    type="file"
                    accept=".csv,.xlsx"
                    onChange={handleFileChange}
                  />
                </label>

                {selectedFile && (

                  <div className="selected-file-modern">

                    <strong>
                      Selected file:
                    </strong>

                    <span>
                      {selectedFile.name}
                    </span>

                  </div>

                )}

                <button
                  className="modern-upload-button"
                  onClick={handleUpload}
                  disabled={uploading}
                >
                  <span>{uploading ? "⏳" : "↑"}</span>
                  {uploading
                    ? "Uploading..."
                    : "Upload Reports"}
                </button>

                {uploadMessage && (

                  <div className="upload-message">
                    {uploadMessage}
                  </div>

                )}

              </div>

            </div>

          </section>

        )}

        {/* ================================================= */}
        {/* HSE REPORTS                                      */}
        {/* ================================================= */}

        {activePage === "HSE Reports" && (

          <section>

            <header className="header">

              <div>
                <h1>
                  HSE Reports
                </h1>

                <p>
                  Reports retrieved from PostgreSQL database
                </p>
              </div>

              <div className="user">

                <div className="user-avatar">
                  A
                </div>

                <div>
                  <strong>
                    HSE User
                  </strong>

                  <span>
                    Safety Department
                  </span>
                </div>

              </div>

            </header>

            <div className="panel">

              <div className="panel-header">

                <div>
                  <h2>
                    HSE Reports
                  </h2>

                  <p>
                    Unsafe Act, Unsafe Condition
                    and Near-Miss reports
                  </p>
                </div>

                <strong>
                  Total: {reports.length}
                </strong>

              </div>

              {reports.length === 0 ? (

                <div className="empty-state">

                  <h3>
                    No reports found
                  </h3>

                  <p>
                    No HSE reports are currently
                    available in the database.
                  </p>

                </div>

              ) : (

                <div className="table-wrapper">

                  <table>

                    <thead>

                      <tr>
                        <th>Report ID</th>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Report</th>
                        <th>SIF Potential</th>
                        <th>Confidence</th>
                        <th>Action</th>
                      </tr>

                    </thead>

                    <tbody>

                      {reports.map(
                        (report) => (

                          <tr
                            key={
                              report.report_id
                            }
                          >

                            <td>
                              #
                              {
                                reportNumberMap[report.report_id]
                              }
                            </td>

                            <td>
                              
                              {formatDate(report.report_date)}
                              
                            </td>

                            <td>
                              {
                                report.report_type
                              }
                            </td>

                            <td>
                              {
                                report.report_text
                              }
                            </td>

                            <td>

                             {report.sif_potential ? (
                             <span className="status-badge danger">
                             🚨 SIF Potential
                              </span>
                              ) : (
                              <span className="status-badge safe">
                              ✓ Non-SIF
                              </span>
                              )}

                            </td>

                              
                              
                                

                            

                            <td>

                              {report.confidence_score !==
                              null
                                ? `${(
                                    report.confidence_score *
                                    100
                                  ).toFixed(0)}%`
                                : "Not analyzed"}

                            </td>
                            <td>

                             <button
                              className="analysis-action-button"
                              onClick={async () => {
                                await handleAnalyze(report);
                                setActivePage("AI Analysis");
                              }}
                              disabled={
                                analyzingReport ===
                                report.report_id
                              }
                            >
                              <span>✦</span>
                              {analyzingReport ===
                              report.report_id
                                ? "Analyzing..."
                                : "Run Analysis"}
                            </button>

                            </td> 

                          </tr>

                        )
                      )}

                    </tbody>

                  </table>

                </div>

              )}

            </div>

          </section>

        )}

        {/* ================================================= */}
        {/* AI ANALYSIS                                      */}
        {/* ================================================= */}

        {activePage === "AI Analysis" && (

          <section>

            <header className="header">

              <div>
                <h1>
                  AI Analysis
                </h1>

                <p>
                  AI-based analysis of HSE safety reports
                </p>
              </div>

              <div className="user">

                <div className="user-avatar">
                  A
                </div>

                <div>
                  <strong>
                    HSE User
                  </strong>

                  <span>
                    Safety Department
                  </span>
                </div>

              </div>

            </header>

            <div className="panel">

              <div className="panel-header">

                <div>
                  <h2>
                    Reports for AI Analysis
                  </h2>

                  <p>
                    Select a report to run the SIF precursor analysis.
                  </p>
                </div>

              </div>

              {reports.length === 0 ? (

                <div className="empty-state">

                  <h3>
                    No reports available for analysis.
                  </h3>

                  <p>
                    Upload HSE reports first.
                  </p>

                </div>

              ) : (

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
                    gap: "18px",
                    padding: "8px 0 20px",
                  }}
                >

                  {reports.map(
                    (report) => {

                      const result =
                        analysisResults[
                          report.report_id
                        ];

                      return (

                        <div
                          key={
                            report.report_id
                          }
                          className="analysis-card"
                          style={{
                            background: "#ffffff",
                            border: "1px solid #dbe3ef",
                            borderRadius: "14px",
                            padding: "20px",
                            boxShadow: "0 4px 14px rgba(15, 23, 42, 0.06)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "14px",
                            minWidth: 0,
                          }}
                        >

                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              gap: "12px",
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  fontSize: "12px",
                                  fontWeight: "700",
                                  color: "#64748b",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.6px",
                                  marginBottom: "4px",
                                }}
                              >
                                HSE Safety Report
                              </div>

                              <h3
                                style={{
                                  margin: 0,
                                  fontSize: "20px",
                                  color: "#10233f",
                                }}
                              >
                                Report #{reportNumberMap[report.report_id]}
                              </h3>
                            </div>

                            <div
                              style={{
                                background: "#eef6ff",
                                color: "#1677e8",
                                borderRadius: "20px",
                                padding: "6px 10px",
                                fontSize: "12px",
                                fontWeight: "700",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {report.report_type}
                            </div>
                          </div>

                          <div
                            style={{
                              background: "#f8fafc",
                              border: "1px solid #e6ebf2",
                              borderRadius: "10px",
                              padding: "14px",
                              color: "#243b5a",
                              lineHeight: "1.55",
                              fontSize: "14px",
                            }}
                          >
                            <div
                              style={{
                                fontSize: "12px",
                                fontWeight: "700",
                                color: "#64748b",
                                marginBottom: "6px",
                              }}
                            >
                              Report Description
                            </div>

                            {report.report_text}
                          </div>

                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              flexWrap: "wrap",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "13px",
                                color: "#475569",
                              }}
                            >
                              <strong>Date:</strong> {formatDate(report.report_date)}
                            </span>

                            <span
                              style={{
                                color: "#cbd5e1",
                              }}
                            >
                              •
                            </span>

                            <span
                              style={{
                                fontSize: "13px",
                                color: "#475569",
                              }}
                            >
                              <strong>Type:</strong> {report.report_type}
                            </span>
                          </div>

                          <button
                            onClick={() =>
                              handleAnalyze(
                                report
                              )
                            }
                            disabled={
                              analyzingReport ===
                              report.report_id
                            }
                            style={{
                              width: "100%",
                              border: "none",
                              borderRadius: "9px",
                              padding: "11px 16px",
                              background:
                                analyzingReport === report.report_id
                                  ? "#94a3b8"
                                  : "#1688f7",
                              color: "#ffffff",
                              fontSize: "14px",
                              fontWeight: "700",
                              cursor:
                                analyzingReport === report.report_id
                                  ? "not-allowed"
                                  : "pointer",
                              boxShadow:
                                analyzingReport === report.report_id
                                  ? "none"
                                  : "0 4px 10px rgba(22, 136, 247, 0.22)",
                              transition: "all 0.2s ease",
                            }}
                          >
                            {analyzingReport === report.report_id
                              ? "⏳ Analyzing..."
                              : "✦ Run AI Analysis"}
                          </button>

                          {result && (

                            <div
                              className="analysis-result"
                              style={{
                                margin: 0,
                                padding: "15px",
                                borderRadius: "10px",
                                border:
                                  result.error
                                    ? "1px solid #fecaca"
                                    : "1px solid #dbeafe",
                                background:
                                  result.error
                                    ? "#fff7f7"
                                    : "#f8fbff",
                              }}
                            >

                              {result.error ? (

                                <p style={{ margin: 0 }}>
                                  <strong>Error:</strong>{" "}
                                  {result.error}
                                </p>

                              ) : (

                                <>

                                  <p style={{ margin: "0 0 8px" }}>
                                    <strong>SIF Potential:</strong>{" "}
                                    <span
                                      style={{
                                        fontWeight: "800",
                                        color: result.sif_potential
                                          ? "#dc2626"
                                          : "#15803d",
                                      }}
                                    >
                                      {result.sif_potential
                                        ? "YES"
                                        : "NO"}
                                    </span>
                                  </p>

                                  <p style={{ margin: "0 0 8px" }}>
                                    <strong>Confidence:</strong>{" "}
                                    {result.confidence_score !==
                                    undefined
                                      ? `${Math.round(
                                          result.confidence_score *
                                            100
                                        )}%`
                                      : "Not available"}
                                  </p>

                                  <p style={{ margin: "0 0 8px" }}>
                                    <strong>Detected Precursors:</strong>{" "}
                                    {result.precursors &&
                                    result.precursors.length > 0
                                      ? result.precursors.join(", ")
                                      : "None detected"}
                                  </p>

                                  <p style={{ margin: 0 }}>
                                    <strong>Life-Saving Rule:</strong>{" "}
                                    {result.life_saving_rule ||
                                      "None detected"}
                                  </p>

                                  {result.sif_potential && (
                                    <div
                                      className="ai-explanation"
                                      style={{
                                        marginTop: "12px",
                                        paddingTop: "12px",
                                        borderTop: "1px solid #dbeafe",
                                      }}
                                    >

                                      <p style={{ margin: "0 0 6px" }}>
                                        <strong>
                                          Why was this report flagged?
                                        </strong>
                                      </p>

                                      <p style={{ margin: 0, lineHeight: "1.5" }}>
                                        The report contains safety indicators
                                        related to{" "}
                                        <strong>
                                          {result.precursors &&
                                          result.precursors.length > 0
                                            ? result.precursors.join(", ")
                                            : "identified safety risks"}
                                        </strong>
                                        . These indicators are treated as
                                        potential SIF precursors by the analysis system.
                                      </p>

                                    </div>
                                  )}

                                </>

                              )}

                            </div>

                          )}

                        </div>

                      );

                    }
                  )}

                </div>

              )}

            </div>

          </section>

        )}

        {/* ================================================= */}
{/* ALERTS                                           */}
{/* ================================================= */}

{activePage === "Alerts" && (

  <section>

    <header className="header">

      <div>
        <h1>
          Safety Alerts
        </h1>

        <p>
          High-risk safety reports identified by the SIF analysis system
        </p>
      </div>

      <div className="user">

        <div className="user-avatar">
          A
        </div>

        <div>
          <strong>
            HSE User
          </strong>

          <span>
            Safety Department
          </span>
        </div>

      </div>

    </header>


    {/* ================================================= */}
    {/* ALERT SUMMARY */}
    {/* ================================================= */}

    <section className="stats">

      <div className="stat-card danger">

        <div className="stat-icon">
          🚨
        </div>

        <div>
          <p>SIF Alerts</p>

          <h2>
            {alerts.length}
          </h2>

          <span>
            Reports requiring attention
          </span>
        </div>

      </div>


      <div className="stat-card warning">

        <div className="stat-icon">
          ⚠️
        </div>

        <div>
          <p>High-Risk Reports</p>

          <h2>
            {alerts.filter(
              (alert) => alert.sif_potential
            ).length}
          </h2>

          <span>
            Potential SIF precursors
          </span>
        </div>

      </div>


      <div className="stat-card">

        <div className="stat-icon">
          🔎
        </div>

        <div>
          <p>Precursor Types</p>

          <h2>
            {
              new Set(
                alerts.flatMap(
                  (alert) =>
                    alert.precursors || []
                )
              ).size
            }
          </h2>

          <span>
            Safety risks detected
          </span>
        </div>

      </div>

    </section>


    {/* ================================================= */}
    {/* SAFETY ALERTS */}
    {/* ================================================= */}

    <div className="panel">

      <div className="panel-header">

        <div>

          <h2>
            Active Safety Alerts
          </h2>

          <p>
            SIF-potential reports requiring HSE attention
          </p>

        </div>

        <strong>
          Total Alerts: {alerts.length}
        </strong>

      </div>


      {alerts.length === 0 ? (

        <div className="empty-state">

          <h3>
            No safety alerts
          </h3>

          <p>
            No SIF-potential reports were detected.
          </p>

        </div>

      ) : (

        <div
          style={{
            display: "grid",
            gap: "18px",
            padding: "10px 0"
          }}
        >

          {alerts.map((alert) => (

            <div
              key={alert.report_id}
              style={{
                border: "1px solid #fecaca",
                borderLeft: "5px solid #dc2626",
                borderRadius: "10px",
                padding: "20px",
                background: "#fffafa",
                boxShadow:
                  "0 2px 8px rgba(0,0,0,0.06)"
              }}
            >

              {/* Alert Header */}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "15px",
                  marginBottom: "15px",
                  flexWrap: "wrap"
                }}
              >

                <div>

                  <div
                    style={{
                      display: "inline-block",
                      padding: "6px 12px",
                      borderRadius: "20px",
                      background: "#fee2e2",
                      color: "#b91c1c",
                      fontWeight: "700",
                      fontSize: "13px",
                      marginBottom: "8px"
                    }}
                  >
                    🚨 SIF POTENTIAL
                  </div>

                  <h3
                    style={{
                      margin: "4px 0",
                      fontSize: "18px"
                    }}
                  >
                    Safety Alert — Report #
                    {reportNumberMap[alert.report_id]}
                  </h3>

                </div>


                {/* Confidence */}

                <div
                  style={{
                    textAlign: "center",
                    minWidth: "100px",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    background: "#fff7ed"
                  }}
                >

                  <div
                    style={{
                      fontSize: "12px",
                      color: "#6b7280"
                    }}
                  >
                    Confidence
                  </div>

                  <strong
                    style={{
                      fontSize: "20px",
                      color: "#dc2626"
                    }}
                  >
                    {alert.confidence_score !==
                    undefined
                      ? `${Math.round(
                          alert.confidence_score * 100
                        )}%`
                      : "N/A"}
                  </strong>

                </div>

              </div>


              {/* Report Information */}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "12px",
                  marginBottom: "16px"
                }}
              >

                <div
                  style={{
                    padding: "12px",
                    background: "#f8fafc",
                    borderRadius: "7px"
                  }}
                >
                  <small
                    style={{
                      color: "#6b7280"
                    }}
                  >
                    Report ID
                  </small>

                  <div
                    style={{
                      fontWeight: "600",
                      marginTop: "3px"
                    }}
                  >
                    #{reportNumberMap[alert.report_id]}
                  </div>
                </div>


                <div
                  style={{
                    padding: "12px",
                    background: "#f8fafc",
                    borderRadius: "7px"
                  }}
                >
                  <small
                    style={{
                      color: "#6b7280"
                    }}
                  >
                    Date
                  </small>

                  <div
                    style={{
                      fontWeight: "600",
                      marginTop: "3px"
                    }}
                  >
                    {formatDate(alert.report_date)}
                  </div>
                </div>


                <div
                  style={{
                    padding: "12px",
                    background: "#f8fafc",
                    borderRadius: "7px"
                  }}
                >
                  <small
                    style={{
                      color: "#6b7280"
                    }}
                  >
                    Report Type
                  </small>

                  <div
                    style={{
                      fontWeight: "600",
                      marginTop: "3px"
                    }}
                  >
                    {alert.report_type}
                  </div>
                </div>

              </div>


              {/* Original Report */}

              <div
                style={{
                  padding: "15px",
                  background: "#f8fafc",
                  borderRadius: "8px",
                  marginBottom: "15px"
                }}
              >

                <strong>
                  Report Description
                </strong>

                <p
                  style={{
                    margin:
                      "8px 0 0 0",
                    lineHeight: "1.6"
                  }}
                >
                  {alert.report_text}
                </p>

              </div>


              {/* Analysis Results */}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "15px"
                }}
              >

                {/* Precursors */}

                <div
                  style={{
                    padding: "15px",
                    borderRadius: "8px",
                    background: "#fff7ed",
                    border:
                      "1px solid #fed7aa"
                  }}
                >

                  <strong>
                    Detected Precursors
                  </strong>

                  <div
                    style={{
                      marginTop: "10px",
                      display: "flex",
                      gap: "7px",
                      flexWrap: "wrap"
                    }}
                  >

                    {alert.precursors &&
                    alert.precursors.length > 0 ? (

                      alert.precursors.map(
                        (precursor, index) => (

                          <span
                            key={index}
                            style={{
                              padding:
                                "5px 10px",
                              borderRadius:
                                "15px",
                              background:
                                "#ffedd5",
                              color:
                                "#c2410c",
                              fontSize:
                                "12px",
                              fontWeight:
                                "600"
                            }}
                          >
                            {precursor}
                          </span>

                        )
                      )

                    ) : (

                      <span>
                        None detected
                      </span>

                    )}

                  </div>

                </div>


                {/* Life Saving Rule */}

                <div
                  style={{
                    padding: "15px",
                    borderRadius: "8px",
                    background: "#eff6ff",
                    border:
                      "1px solid #bfdbfe"
                  }}
                >

                  <strong>
                    Life-Saving Rule
                  </strong>

                  <p
                    style={{
                      margin:
                        "10px 0 0 0",
                      color: "#1d4ed8",
                      fontWeight: "600"
                    }}
                  >
                    {alert.life_saving_rule ||
                      "None detected"}
                  </p>

                </div>

              </div>


              {/* Footer */}

              <div
                style={{
                  marginTop: "16px",
                  paddingTop: "12px",
                  borderTop:
                    "1px solid #e5e7eb",
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "10px"
                }}
              >

                <span
                  style={{
                    color: "#b91c1c",
                    fontWeight: "600",
                    fontSize: "13px"
                  }}
                >
                  ⚠️ Requires HSE attention
                </span>

                <span
                  style={{
                    color: "#6b7280",
                    fontSize: "12px"
                  }}
                >
                  Generated by SIF analysis system
                </span>

              </div>

            </div>

          ))}

        </div>

      )}

    </div>

  </section>

)}

      </main>

    </div>
  );
}

export default App;