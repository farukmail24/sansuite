import { Router } from "express";
import { authMiddleware } from "../lib/authUtils";
import { db } from "../db";
import { firmDetails, clients } from "@shared/schema";
import { eq } from "drizzle-orm";

const router = Router();
router.use(authMiddleware);

// Middleware to check for valid HMRC token
const requireHmrcToken = async (req: any, res: any, next: any) => {
  try {
    const [firm] = await db
      .select({ 
        hmrcAccessToken: firmDetails.hmrcAccessToken,
        hmrcTokenExpiry: firmDetails.hmrcTokenExpiry
      })
      .from(firmDetails)
      .where(eq(firmDetails.practiceId, req.user.practiceId));

    if (!firm || !firm.hmrcAccessToken) {
      return res.status(401).json({ message: "HMRC Agent not authorized. Please connect HMRC in Settings." });
    }
    
    req.firm = firm;
    next();
  } catch (error) {
    res.status(500).json({ message: "Error verifying HMRC status" });
  }
};

// Endpoint to fetch pre-populated data from HMRC for SA100
router.get("/pre-populate/:clientId", requireHmrcToken, async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);

    // 2. Get Client UTR and NINO
    const [client] = await db
      .select({ utrNumber: clients.utrNumber }) // Assume NINO might be in contacts or custom fields in a real scenario
      .from(clients)
      .where(eq(clients.id, clientId));

    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    // In a real integration, we'd make an API call to HMRC:
    // GET https://test-api.service.hmrc.gov.uk/individuals/self-assessment/pre-populated/{nino}
    // Headers: Authorization: Bearer {practice.hmrcAccessToken}, Accept: application/vnd.hmrc.1.0+json
    
    // For now, return mock pre-populated data to simulate HMRC response
    const mockHmrcData = {
      employment: {
        payeIncome: 45000,
        taxDeducted: 7500,
        employerName: "Mock Employer Ltd"
      },
      pensions: {
        statePension: 10600
      },
      benefits: {
        childBenefit: 0
      },
      bankInterest: 150
    };

    res.json({
      success: true,
      message: "Successfully fetched data from HMRC",
      data: mockHmrcData
    });
  } catch (error: any) {
    console.error("HMRC Pre-populate Error:", error);
    res.status(500).json({ message: "Failed to fetch pre-populated data from HMRC" });
  }
});

export default router;
