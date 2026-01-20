import { Transaction } from "./types";
import { isOnline } from "./connectivity";
import { getGoogleSheetsConfig, saveGoogleSheetsConfig } from "./storage";

// Google OAuth Client ID - can be set via environment variable or hardcoded
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

// Google Sheets API base URL
const SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

// OAuth scope for Google Sheets
const SCOPE = "https://www.googleapis.com/auth/spreadsheets";

// check if Google Identity Services is loaded
function isGisLoaded(): boolean {
  return typeof window !== "undefined" && "google" in window;
}

// load Google Identity Services script
function loadGisScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isGisLoaded()) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Failed to load Google Identity Services"));
    document.head.appendChild(script);
  });
}

// initialize Google Identity Services
async function initializeGis(): Promise<void> {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error(
      "Google Client ID is not configured. Please set VITE_GOOGLE_CLIENT_ID environment variable."
    );
  }

  await loadGisScript();

  if (!isGisLoaded()) {
    throw new Error("Google Identity Services failed to load");
  }

  // initialize Google Identity Services
  if (window.google?.accounts?.id) {
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
    });
  }
}

// authenticate with Google using OAuth 2.0
export async function authenticateGoogle(): Promise<{
  accessToken: string;
  refreshToken?: string;
}> {
  if (!isOnline()) {
    throw new Error("Device is offline. Cannot authenticate.");
  }

  await initializeGis();

  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      reject(new Error("Google OAuth2 not available"));
      return;
    }

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPE,
      callback: (response: {
        access_token: string;
        refresh_token?: string;
        error?: string;
        error_description?: string;
      }) => {
        if (response.error) {
          // provide more helpful error messages
          let errorMessage = response.error;
          if (response.error === "access_denied") {
            errorMessage =
              "Access denied. If the app is in testing mode, make sure your email is added as a test user in Google Cloud Console (OAuth consent screen → Test users).";
          } else if (response.error_description) {
            errorMessage = `${response.error}: ${response.error_description}`;
          }
          reject(new Error(errorMessage));
          return;
        }
        if (response.access_token) {
          resolve({
            accessToken: response.access_token,
            refreshToken: response.refresh_token,
          });
        } else {
          reject(new Error("No access token received"));
        }
      },
    });

    tokenClient.requestAccessToken({ prompt: "consent" });
  });
}

// refresh access token using Google Identity Services
async function refreshAccessToken(): Promise<string> {
  if (!isOnline()) {
    throw new Error("Device is offline. Cannot refresh token.");
  }

  await initializeGis();

  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      reject(new Error("Google OAuth2 not available"));
      return;
    }

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPE,
      callback: (response: {
        access_token: string;
        refresh_token?: string;
        error?: string;
        error_description?: string;
      }) => {
        if (response.error) {
          reject(
            new Error(
              response.error_description ||
                `Token refresh failed: ${response.error}`
            )
          );
          return;
        }
        if (response.access_token) {
          // update stored config with new token
          const config = getGoogleSheetsConfig();
          if (config) {
            saveGoogleSheetsConfig({
              ...config,
              accessToken: response.access_token,
              // update refresh token if provided
              refreshToken: response.refresh_token || config.refreshToken,
            });
          }
          resolve(response.access_token);
        } else {
          reject(new Error("No access token received during refresh"));
        }
      },
    });

    // request new token without prompt (uses existing session)
    tokenClient.requestAccessToken();
  });
}

// get valid access token (refresh if needed)
async function getValidAccessToken(): Promise<string | null> {
  const config = getGoogleSheetsConfig();
  if (!config?.accessToken) {
    return null;
  }

  return config.accessToken;
}

// make API call with automatic token refresh on 401
async function makeAuthenticatedRequest(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  let accessToken = await getValidAccessToken();
  if (!accessToken) {
    throw new Error("Not authenticated. Please connect your Google account.");
  }

  // make initial request
  let response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  // if 401, try to refresh token and retry once
  if (response.status === 401) {
    try {
      accessToken = await refreshAccessToken();
      // retry the request with new token
      response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${accessToken}`,
        },
      });
    } catch (_refreshError) {
      // if refresh fails, throw error that will prompt re-authentication
      throw new Error(
        "Authentication expired. Please reconnect your Google account."
      );
    }
  }

  return response;
}

// extract sheet ID from Google Sheets URL
export function extractSheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

// validate sheet URL format
export function validateSheetUrl(url: string): boolean {
  return extractSheetId(url) !== null;
}

// create a new Google Sheet
export async function createSheet(name: string): Promise<string> {
  if (!isOnline()) {
    throw new Error("Device is offline. Cannot create sheet.");
  }

  const response = await makeAuthenticatedRequest(
    "https://sheets.googleapis.com/v4/spreadsheets",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          title: name,
        },
        sheets: [
          {
            properties: {
              title: "Transactions",
            },
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to create sheet");
  }

  const data = await response.json();
  return data.spreadsheetId;
}

// verify access to a sheet
export async function verifySheetAccess(sheetId: string): Promise<boolean> {
  if (!isOnline()) {
    return false; // silent failure when offline
  }

  try {
    const response = await makeAuthenticatedRequest(
      `${SHEETS_API_BASE}/${sheetId}?fields=spreadsheetId`,
      {
        headers: {},
      }
    );

    return response.ok;
  } catch {
    return false;
  }
}

// format transaction date for export (DD/MM/YYYY)
export function formatDate(date: string): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// prepare transaction data for Google Sheets export
// Returns array with headers as first row, then transaction rows
export function prepareTransactionData(
  transactions: Transaction[]
): string[][] {
  const headers = [
    "date",
    "reason",
    "amount",
    "paymentMode",
    "type",
    "necessity",
  ];
  const values = [
    headers,
    ...transactions.map((t) => [
      formatDate(t.date),
      t.reason,
      t.amount.toString(),
      t.paymentMode,
      t.type,
      t.necessity || "",
    ]),
  ];
  return values;
}

// sync transactions to Google Sheet
export async function syncTransactionsToSheet(
  transactions: Transaction[]
): Promise<void> {
  if (!isOnline()) {
    // silent failure when offline - no error thrown
    return;
  }

  const config = getGoogleSheetsConfig();
  if (!config?.sheetId) {
    throw new Error("No sheet configured. Please set up Google Sheets sync.");
  }

  // prepare data - headers first, then transactions
  const values = prepareTransactionData(transactions);

  // clear existing data and write new data
  // use range that covers all rows (A1:F covers 6 columns, rows will be determined by data length)
  const range = `Transactions!A1:F${values.length}`;
  const url = `${SHEETS_API_BASE}/${config.sheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`;

  const response = await makeAuthenticatedRequest(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      values,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to sync transactions");
  }
}

// disconnect Google Sheets (clear stored tokens)
export function disconnectGoogleSheets(): void {
  saveGoogleSheetsConfig(null);
}

// declare global types for Google Identity Services
declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: { client_id: string }) => void;
        };
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: {
              access_token: string;
              error?: string;
            }) => void;
          }) => {
            requestAccessToken: (options?: { prompt?: string }) => void;
          };
        };
      };
    };
  }
}
