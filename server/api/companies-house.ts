import { Router } from "express";
import { authMiddleware } from "../lib/authUtils";

const router = Router();
router.use(authMiddleware);

const COMPANIES_HOUSE_BASE_URL = "https://api.company-information.service.gov.uk";

// Helper: Get Authorization Header for Companies House API
function getAuthHeader(): string {
  const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
  if (!apiKey) {
    throw new Error("Companies House API key (COMPANIES_HOUSE_API_KEY) is not configured in environment.");
  }
  return `Basic ${Buffer.from(`${apiKey.trim()}:`).toString("base64")}`;
}

// GET /api/companies-house/search?q={term}
// Searches live UK Companies House by Company Name or Registration Number
router.get("/search", async (req: any, res) => {
  try {
    const query = String(req.query.q || req.query.query || "").trim();
    if (!query) {
      return res.json({ items: [], total_results: 0 });
    }

    const authHeader = getAuthHeader();
    const chUrl = `${COMPANIES_HOUSE_BASE_URL}/search/companies?q=${encodeURIComponent(query)}&items_per_page=20`;

    const response = await fetch(chUrl, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({
        message: `Companies House API error (${response.status}): ${errText || response.statusText}`,
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("Companies House Search API Error:", error);
    res.status(500).json({ message: error.message || "Failed to search Companies House" });
  }
});

// GET /api/companies-house/company/:crn
// Fetches full company details from live UK Companies House API
router.get("/company/:crn", async (req: any, res) => {
  try {
    const { crn } = req.params;
    if (!crn) {
      return res.status(400).json({ message: "Company Registration Number (CRN) is required." });
    }

    const cleanCrn = String(crn).trim().toUpperCase();
    const authHeader = getAuthHeader();
    const chUrl = `${COMPANIES_HOUSE_BASE_URL}/company/${encodeURIComponent(cleanCrn)}`;

    const response = await fetch(chUrl, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({ message: `Company '${cleanCrn}' not found on Companies House.` });
      }
      const errText = await response.text();
      return res.status(response.status).json({
        message: `Companies House API error (${response.status}): ${errText || response.statusText}`,
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("Companies House API Error:", error);
    res.status(500).json({ message: error.message || "Failed to fetch company details from Companies House." });
  }
});

// GET /api/companies-house/company/:crn/officers
// Fetches live company directors/officers from UK Companies House API
router.get("/company/:crn/officers", async (req: any, res) => {
  try {
    const { crn } = req.params;
    if (!crn) {
      return res.status(400).json({ message: "Company Registration Number (CRN) is required." });
    }

    const cleanCrn = String(crn).trim().toUpperCase();
    const authHeader = getAuthHeader();
    const chUrl = `${COMPANIES_HOUSE_BASE_URL}/company/${encodeURIComponent(cleanCrn)}/officers`;

    const response = await fetch(chUrl, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return res.json({ items: [], total_results: 0 });
      }
      const errText = await response.text();
      return res.status(response.status).json({
        message: `Companies House API error (${response.status}): ${errText || response.statusText}`,
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("Companies House Officers API Error:", error);
    res.status(500).json({ message: error.message || "Failed to fetch company officers from Companies House." });
  }
});

// GET /api/companies-house/company/:crn/filing-history
router.get("/company/:crn/filing-history", async (req: any, res) => {
  try {
    const { crn } = req.params;
    if (!crn) return res.status(400).json({ message: "CRN required." });

    const cleanCrn = String(crn).trim().toUpperCase();
    const authHeader = getAuthHeader();
    const itemsPerPage = Math.min(parseInt(req.query.items_per_page || "25"), 100);
    const chUrl = `${COMPANIES_HOUSE_BASE_URL}/company/${encodeURIComponent(cleanCrn)}/filing-history?items_per_page=${itemsPerPage}`;

    const response = await fetch(chUrl, {
      method: "GET",
      headers: { Authorization: authHeader, Accept: "application/json" },
    });

    if (!response.ok) {
      if (response.status === 404) return res.json({ items: [], total_count: 0 });
      const errText = await response.text();
      return res.status(response.status).json({ message: `API error (${response.status}): ${errText}` });
    }

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("Companies House Filing History API Error:", error);
    res.status(500).json({ message: error.message || "Failed to fetch filing history." });
  }
});

// GET /api/companies-house/document-download
// Directly fetches the signed Amazon S3 PDF URL from Companies House Document API and redirects to it
router.get("/document-download", async (req: any, res) => {
  try {
    const { docUrl, crn } = req.query;
    if (!docUrl) {
      if (crn) {
        return res.redirect(`https://find-and-update.company-information.service.gov.uk/company/${encodeURIComponent(String(crn))}/filing-history`);
      }
      return res.status(400).json({ message: "Document URL or CRN is required." });
    }

    const authHeader = getAuthHeader();
    let cleanUrl = String(docUrl).trim();
    cleanUrl = cleanUrl.replace("https://frontend-doc-api.company-information.service.gov.uk", "https://document-api.company-information.service.gov.uk");
    cleanUrl = cleanUrl.replace("frontend-doc-api", "document-api");
    const contentUrl = cleanUrl.endsWith("/content") ? cleanUrl : `${cleanUrl.replace(/\/$/, "")}/content`;

    const response = await fetch(contentUrl, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        Accept: "application/pdf",
      },
      redirect: "manual",
    });

    if (response.status === 302) {
      const s3Url = response.headers.get("location");
      if (s3Url) {
        return res.redirect(s3Url);
      }
    }

    if (response.ok) {
      const arrayBuf = await response.arrayBuffer();
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", 'inline; filename="filing.pdf"');
      return res.send(Buffer.from(arrayBuf));
    }

    // Fallback: If document API failed, redirect to web filing history page
    if (crn) {
      return res.redirect(`https://find-and-update.company-information.service.gov.uk/company/${encodeURIComponent(String(crn))}/filing-history`);
    }

    res.status(response.status || 404).json({ message: "Document could not be retrieved from Companies House." });
  } catch (error: any) {
    console.error("Companies House Document Download Error:", error);
    if (req.query.crn) {
      return res.redirect(`https://find-and-update.company-information.service.gov.uk/company/${encodeURIComponent(String(req.query.crn))}/filing-history`);
    }
    res.status(500).json({ message: error.message || "Failed to download document." });
  }
});

// GET /api/companies-house/company/:crn/persons-with-significant-control
router.get("/company/:crn/persons-with-significant-control", async (req: any, res) => {
  try {
    const { crn } = req.params;
    if (!crn) return res.status(400).json({ message: "CRN required." });

    const cleanCrn = String(crn).trim().toUpperCase();
    const authHeader = getAuthHeader();
    const chUrl = `${COMPANIES_HOUSE_BASE_URL}/company/${encodeURIComponent(cleanCrn)}/persons-with-significant-control`;

    const response = await fetch(chUrl, {
      method: "GET",
      headers: { Authorization: authHeader, Accept: "application/json" },
    });

    if (!response.ok) {
      if (response.status === 404) return res.json({ items: [], total_results: 0 });
      const errText = await response.text();
      return res.status(response.status).json({ message: `API error (${response.status}): ${errText}` });
    }

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("Companies House PSC API Error:", error);
    res.status(500).json({ message: error.message || "Failed to fetch PSC." });
  }
});

// GET /api/companies-house/company/:crn/charges
router.get("/company/:crn/charges", async (req: any, res) => {
  try {
    const { crn } = req.params;
    if (!crn) return res.status(400).json({ message: "CRN required." });

    const cleanCrn = String(crn).trim().toUpperCase();
    const authHeader = getAuthHeader();
    const chUrl = `${COMPANIES_HOUSE_BASE_URL}/company/${encodeURIComponent(cleanCrn)}/charges`;

    const response = await fetch(chUrl, {
      method: "GET",
      headers: { Authorization: authHeader, Accept: "application/json" },
    });

    if (!response.ok) {
      if (response.status === 404) return res.json({ items: [], total_count: 0 });
      const errText = await response.text();
      return res.status(response.status).json({ message: `API error (${response.status}): ${errText}` });
    }

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("Companies House Charges API Error:", error);
    res.status(500).json({ message: error.message || "Failed to fetch charges." });
  }
});

export async function fetchFullCompanyBundle(crn: string) {
  const cleanCrn = String(crn).trim().toUpperCase();
  const authHeader = getAuthHeader();
  const headers = { Authorization: authHeader, Accept: "application/json" };

  const fetchJson = async (url: string) => {
    try {
      const resp = await fetch(url, { headers });
      if (resp.ok) return await resp.json();
      return null;
    } catch {
      return null;
    }
  };

  const [profile, officers, psc, filingHistory, charges] = await Promise.all([
    fetchJson(`${COMPANIES_HOUSE_BASE_URL}/company/${encodeURIComponent(cleanCrn)}`),
    fetchJson(`${COMPANIES_HOUSE_BASE_URL}/company/${encodeURIComponent(cleanCrn)}/officers`),
    fetchJson(`${COMPANIES_HOUSE_BASE_URL}/company/${encodeURIComponent(cleanCrn)}/persons-with-significant-control`),
    fetchJson(`${COMPANIES_HOUSE_BASE_URL}/company/${encodeURIComponent(cleanCrn)}/filing-history?items_per_page=20`),
    fetchJson(`${COMPANIES_HOUSE_BASE_URL}/company/${encodeURIComponent(cleanCrn)}/charges`),
  ]);

  return {
    profile,
    officers: officers?.items || [],
    psc: psc?.items || [],
    filingHistory: filingHistory?.items || [],
    charges: charges?.items || [],
    totalCharges: charges?.total_count || charges?.items?.length || 0,
  };
}

// GET /api/companies-house/company/:crn/all
// Fetches Profile, Officers, PSCs, Filing History, and Charges in parallel
router.get("/company/:crn/all", async (req: any, res) => {
  try {
    const { crn } = req.params;
    if (!crn) return res.status(400).json({ message: "CRN required." });

    const bundle = await fetchFullCompanyBundle(crn);
    if (!bundle.profile) {
      return res.status(404).json({ message: `Company '${crn}' not found on Companies House.` });
    }

    res.json(bundle);
  } catch (error: any) {
    console.error("Companies House Unified API Error:", error);
    res.status(500).json({ message: error.message || "Failed to fetch comprehensive company data." });
  }
});

export default router;
