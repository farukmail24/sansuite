export class HMRC_Gateway {
  static generateCT600_XML(data: any): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<GovTalkMessage xmlns="http://www.govtalk.gov.uk/CM/envelope">
  <EnvelopeVersion>2.0</EnvelopeVersion>
  <Header>
    <MessageDetails>
      <Class>HMRC-CT-CT600</Class>
      <Qualifier>request</Qualifier>
      <Function>submit</Function>
      <CorrelationID>${Date.now()}</CorrelationID>
    </MessageDetails>
    <SenderDetails>
      <IDAuthentication>
        <SenderID>${data.gatewayId || 'TEST_USER'}</SenderID>
        <Authentication>
          <Method>clear</Method>
          <Value>${data.gatewayPassword || 'TEST_PASS'}</Value>
        </Authentication>
      </IDAuthentication>
    </SenderDetails>
  </Header>
  <GovTalkDetails>
    <Keys>
      <Key Type="UTR">${data.utr || '1234567890'}</Key>
    </Keys>
  </GovTalkDetails>
  <Body>
    <CT600>
      <CompanyInformation>
        <CompanyName>${data.companyName || 'Demo Limited'}</CompanyName>
        <CompanyRegistrationNumber>${data.crn || '01234567'}</CompanyRegistrationNumber>
      </CompanyInformation>
      <TaxCalculation>
        <Turnover>${data.turnover || '0.00'}</Turnover>
        <TradingProfit>${data.tradingProfit || '0.00'}</TradingProfit>
        <TaxableProfits>${data.taxableProfits || '0.00'}</TaxableProfits>
        <TaxDue>${data.taxDue || '0.00'}</TaxDue>
      </TaxCalculation>
    </CT600>
  </Body>
</GovTalkMessage>`;
  }

  static generateRTI_FPS_XML(data: any): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<GovTalkMessage xmlns="http://www.govtalk.gov.uk/CM/envelope">
  <Header>
    <MessageDetails>
      <Class>HMRC-PAYE-RTI-FPS</Class>
      <Qualifier>request</Qualifier>
      <Function>submit</Function>
    </MessageDetails>
  </Header>
  <Body>
    <IRenvelope xmlns="http://www.govtalk.gov.uk/taxation/PAYE/RTI/FullPaymentSubmission/25-26">
      <Employer>
        <Name>${data.employerName || 'Demo Employer'}</Name>
        <PAYEReference>${data.payeReference || '123/AB456'}</PAYEReference>
      </Employer>
      ${data.employees ? data.employees.map((emp: any) => `
      <Employee>
        <EmployeeDetails>
          <Name>
            <Forename>${emp.firstName}</Forename>
            <Surname>${emp.lastName}</Surname>
          </Name>
          <NINO>${emp.niNumber}</NINO>
          <TaxCode>${emp.taxCode}</TaxCode>
        </EmployeeDetails>
        <Employment>
          <TaxablePay>${emp.grossPay}</TaxablePay>
          <TaxDeducted>${emp.incomeTax}</TaxDeducted>
          <NIPayable>${emp.employeeNi}</NIPayable>
        </Employment>
      </Employee>
      `).join('') : ''}
    </IRenvelope>
  </Body>
</GovTalkMessage>`;
  }

  static generateVAT9Box_JSON(vatData: {
    periodKey: string;
    vatDueSales: number;       // Box 1
    vatDueAcquisitions: number; // Box 2
    totalVatDue: number;        // Box 3
    vatReclaimedCurrPeriod: number; // Box 4
    netVatDue: number;          // Box 5
    totalValueSalesExVAT: number; // Box 6
    totalValuePurchasesExVAT: number; // Box 7
    totalValueGoodsSuppliesExVAT: number; // Box 8
    totalAcquisitionsExVAT: number; // Box 9
    finalised?: boolean;
  }) {
    return {
      periodKey: vatData.periodKey,
      vatDueSales: Number(vatData.vatDueSales.toFixed(2)),
      vatDueAcquisitions: Number(vatData.vatDueAcquisitions.toFixed(2)),
      totalVatDue: Number(vatData.totalVatDue.toFixed(2)),
      vatReclaimedCurrPeriod: Number(vatData.vatReclaimedCurrPeriod.toFixed(2)),
      netVatDue: Number(vatData.netVatDue.toFixed(2)),
      totalValueSalesExVAT: Math.round(vatData.totalValueSalesExVAT),
      totalValuePurchasesExVAT: Math.round(vatData.totalValuePurchasesExVAT),
      totalValueGoodsSuppliesExVAT: Math.round(vatData.totalValueGoodsSuppliesExVAT),
      totalAcquisitionsExVAT: Math.round(vatData.totalAcquisitionsExVAT),
      finalised: vatData.finalised ?? true
    };
  }

  static validateVat9Box(vatData: {
    vatDueSales: number;
    vatDueAcquisitions: number;
    totalVatDue: number;
    vatReclaimedCurrPeriod: number;
    netVatDue: number;
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const expectedBox3 = Number((vatData.vatDueSales + vatData.vatDueAcquisitions).toFixed(2));
    if (Math.abs(vatData.totalVatDue - expectedBox3) > 0.01) {
      errors.push(`Box 3 (${vatData.totalVatDue}) does not equal Box 1 (${vatData.vatDueSales}) + Box 2 (${vatData.vatDueAcquisitions})`);
    }

    const expectedBox5 = Number(Math.abs(vatData.totalVatDue - vatData.vatReclaimedCurrPeriod).toFixed(2));
    if (Math.abs(vatData.netVatDue - expectedBox5) > 0.01) {
      errors.push(`Box 5 (${vatData.netVatDue}) does not equal |Box 3 (${vatData.totalVatDue}) - Box 4 (${vatData.vatReclaimedCurrPeriod})|`);
    }

    return { valid: errors.length === 0, errors };
  }
}

