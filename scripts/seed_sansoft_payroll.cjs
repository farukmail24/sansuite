const mysql = require('mysql2/promise');

async function seedSansoft() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'sansuite'
  });

  console.log('Connected to MySQL sansuite database...');

  const clientId = 34;

  // 1. Verify / Update PAYE Scheme for SANSOFT LIMITED
  const [schemes] = await conn.query("SELECT * FROM paye_schemes WHERE client_id = ?", [clientId]);
  let schemeId;

  if (schemes.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO paye_schemes (
        client_id, employer_name, hmrc_office_number, paye_reference, accounts_office_reference,
        default_pay_frequency, payment_mode, bank_name, bank_sort_code, bank_account_number,
        tax_year, employment_allowance, small_employers_relief, payslip_template
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        clientId, 'SANSOFT LIMITED', '120', '120/AC98765', '120PA00012345',
        'Monthly', 'BACS', 'Barclays Bank UK', '20-04-15', '83920184',
        '2024-25', 1, 1, 'classic'
      ]
    );
    schemeId = res.insertId;
    console.log(`Created new PAYE scheme ID ${schemeId} for SANSOFT LIMITED`);
  } else {
    schemeId = schemes[0].id;
    await conn.query(
      `UPDATE paye_schemes SET 
        employer_name = 'SANSOFT LIMITED',
        hmrc_office_number = '120',
        paye_reference = '120/AC98765',
        accounts_office_reference = '120PA00012345',
        tax_year = '2024-25',
        employment_allowance = 1,
        default_pay_frequency = 'Monthly',
        payment_mode = 'BACS',
        bank_name = 'Barclays Bank UK',
        bank_sort_code = '20-04-15',
        bank_account_number = '83920184'
       WHERE id = ?`,
      [schemeId]
    );
    console.log(`Updated existing PAYE scheme ID ${schemeId} for SANSOFT LIMITED`);
  }

  // 2. Departments
  await conn.query("DELETE FROM payroll_departments WHERE client_id = ?", [clientId]);
  const [depRes1] = await conn.query(
    "INSERT INTO payroll_departments (client_id, name, code, description) VALUES (?, ?, ?, ?)",
    [clientId, 'Software Engineering', 'ENG', 'Core software and SaaS platform development team']
  );
  const [depRes2] = await conn.query(
    "INSERT INTO payroll_departments (client_id, name, code, description) VALUES (?, ?, ?, ?)",
    [clientId, 'Product & UX Design', 'DES', 'User research, UI/UX design, and product prototyping']
  );
  const [depRes3] = await conn.query(
    "INSERT INTO payroll_departments (client_id, name, code, description) VALUES (?, ?, ?, ?)",
    [clientId, 'Executive & Operations', 'OPS', 'Executive leadership, finance, and general operations']
  );
  const engDepId = depRes1.insertId;
  const desDepId = depRes2.insertId;
  const opsDepId = depRes3.insertId;
  console.log(`Created 3 departments: ENG (${engDepId}), DES (${desDepId}), OPS (${opsDepId})`);

  // 3. Pension Scheme (NEST)
  await conn.query("DELETE FROM payroll_pension_schemes WHERE client_id = ?", [clientId]);
  const [pensionRes] = await conn.query(
    `INSERT INTO payroll_pension_schemes (
      client_id, provider, scheme_name, employer_ref, employer_rate, employee_rate,
      earnings_basis, staging_date, re_enrolment_date, papdis_enabled, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      clientId, 'NEST', 'NEST Workplace Pension - Sansoft', 'NEST-SAN-9941',
      3.00, 5.00, 'Qualifying Earnings', '2022-04-06', '2025-04-06', 1, 'Active'
    ]
  );
  const pensionSchemeId = pensionRes.insertId;
  console.log(`Created pension scheme ID ${pensionSchemeId}`);

  // 4. Employees
  // Clean up existing payslips, pay runs, submissions, and employees for this scheme to avoid orphan data
  const [existingRuns] = await conn.query("SELECT id FROM pay_runs WHERE paye_scheme_id = ?", [schemeId]);
  const runIds = existingRuns.map(r => r.id);
  if (runIds.length > 0) {
    await conn.query(`DELETE FROM rti_submissions WHERE pay_run_id IN (${runIds.join(',')})`);
    await conn.query(`DELETE FROM payslips WHERE pay_run_id IN (${runIds.join(',')})`);
    await conn.query(`DELETE FROM pay_runs WHERE id IN (${runIds.join(',')})`);
  }
  await conn.query("DELETE FROM payroll_pension_assessments WHERE client_id = ?", [clientId]);
  await conn.query("DELETE FROM payroll_pension_letters WHERE client_id = ?", [clientId]);
  await conn.query("DELETE FROM employees WHERE paye_scheme_id = ?", [schemeId]);

  // Insert 4 employees with realistic details
  // Arif Ullah (Director, £48,000/yr -> £4,000/mo)
  const [e1] = await conn.query(
    `INSERT INTO employees (
      paye_scheme_id, department_id, first_name, last_name, email, ni_number, tax_code, tax_basis,
      is_director, director_ni_method, ni_category, gender, birth_date, hire_date, pay_frequency,
      salary_type, gross_rate, bank_sort_code, bank_account_number, bank_account_name, status,
      ytd_gross_pay, ytd_tax_paid, ytd_employee_ni, ytd_employer_ni
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      schemeId, opsDepId, 'Arif', 'Ullah', 'arif.ullah@sansoft.co.uk', 'QQ123456A', '1257L', 'Cumulative',
      1, 'Annual', 'A', 'Male', '1985-06-15', '2021-02-01', 'Monthly',
      'AnnualSalary', 48000.00, '20-04-15', '83920184', 'Mr Arif Ullah', 'Active',
      8000.00, 1181.00, 472.32, 894.80 // 2 months YTD
    ]
  );
  const emp1Id = e1.insertId;

  // Sarah Jenkins (Senior Frontend Engineer, £39,000/yr -> £3,250/mo)
  const [e2] = await conn.query(
    `INSERT INTO employees (
      paye_scheme_id, department_id, first_name, last_name, email, ni_number, tax_code, tax_basis,
      is_director, director_ni_method, ni_category, gender, birth_date, hire_date, pay_frequency,
      salary_type, gross_rate, bank_sort_code, bank_account_number, bank_account_name, status,
      ytd_gross_pay, ytd_tax_paid, ytd_employee_ni, ytd_employer_ni
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      schemeId, engDepId, 'Sarah', 'Jenkins', 'sarah.j@sansoft.co.uk', 'JA283910B', '1257L', 'Cumulative',
      0, 'Annual', 'A', 'Female', '1992-11-20', '2022-09-01', 'Monthly',
      'AnnualSalary', 39000.00, '30-90-89', '48291048', 'Ms Sarah Jenkins', 'Active',
      6500.00, 881.00, 352.32, 687.80 // 2 months YTD
    ]
  );
  const emp2Id = e2.insertId;

  // David Smith (Lead Cloud Architect, £45,000/yr -> £3,750/mo)
  const [e3] = await conn.query(
    `INSERT INTO employees (
      paye_scheme_id, department_id, first_name, last_name, email, ni_number, tax_code, tax_basis,
      is_director, director_ni_method, ni_category, gender, birth_date, hire_date, pay_frequency,
      salary_type, gross_rate, bank_sort_code, bank_account_number, bank_account_name, status,
      ytd_gross_pay, ytd_tax_paid, ytd_employee_ni, ytd_employer_ni
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      schemeId, engDepId, 'David', 'Smith', 'david.smith@sansoft.co.uk', 'NW910283C', '1257L', 'Cumulative',
      0, 'Annual', 'A', 'Male', '1988-03-12', '2023-01-15', 'Monthly',
      'AnnualSalary', 45000.00, '60-12-34', '90182374', 'Mr David Smith', 'Active',
      7500.00, 1081.00, 432.32, 825.80 // 2 months YTD
    ]
  );
  const emp3Id = e3.insertId;

  // Emily Clarke (Product Designer, £33,000/yr -> £2,750/mo, Leaver on 2025-05-31)
  const [e4] = await conn.query(
    `INSERT INTO employees (
      paye_scheme_id, department_id, first_name, last_name, email, ni_number, tax_code, tax_basis,
      is_director, director_ni_method, ni_category, gender, birth_date, hire_date, leaving_date, pay_frequency,
      salary_type, gross_rate, bank_sort_code, bank_account_number, bank_account_name, status,
      ytd_gross_pay, ytd_tax_paid, ytd_employee_ni, ytd_employer_ni
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      schemeId, desDepId, 'Emily', 'Clarke', 'emily.clarke@sansoft.co.uk', 'PL827391D', '1257L', 'Cumulative',
      0, 'Annual', 'A', 'Female', '1995-08-04', '2023-06-01', '2024-05-31', 'Monthly',
      'AnnualSalary', 33000.00, '40-05-20', '18293041', 'Miss Emily Clarke', 'Leaver',
      5500.00, 681.00, 272.32, 549.80 // 2 months YTD
    ]
  );
  const emp4Id = e4.insertId;

  console.log(`Inserted 4 employees: Arif (${emp1Id}), Sarah (${emp2Id}), David (${emp3Id}), Emily (${emp4Id})`);

  // 5. Pension Assessments
  const allEmpIds = [emp1Id, emp2Id, emp3Id, emp4Id];
  for (const empId of allEmpIds) {
    await conn.query(
      `INSERT INTO payroll_pension_assessments (
        client_id, employee_id, assessment_date, worker_category, action_taken
      ) VALUES (?, ?, ?, ?, ?)`,
      [clientId, empId, '2024-04-06', 'Eligible Jobholder', 'Enrolled']
    );

    await conn.query(
      `INSERT INTO payroll_pension_letters (
        client_id, employee_id, letter_type, generated_date, sent_date, sent_status
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [clientId, empId, 'Auto Enrolment Enrolment Notice (TPR Compliant)', '2024-04-06', '2024-04-07', 'Sent']
    );
  }
  console.log('Created pension assessments and TPR compliance letters.');

  // 6. Pay Runs & Payslips
  // Helper for monthly payslip numbers
  const staffCalcs = [
    { id: emp1Id, gross: 4000.00, tax: 590.50, eeNi: 236.16, erNi: 447.40, eePen: 174.00, erPen: 104.40, net: 2999.34 },
    { id: emp2Id, gross: 3250.00, tax: 440.50, eeNi: 176.16, erNi: 343.90, eePen: 136.50, erPen: 81.90, net: 2496.84 },
    { id: emp3Id, gross: 3750.00, tax: 540.50, eeNi: 216.16, erNi: 412.90, eePen: 161.50, erPen: 96.90, net: 2831.84 },
    { id: emp4Id, gross: 2750.00, tax: 340.50, eeNi: 136.16, erNi: 274.90, eePen: 111.50, erPen: 66.90, net: 2161.84 },
  ];

  // Pay Run 1: Period 1 (April 2024) - Approved & RTI Filed
  const [pr1] = await conn.query(
    `INSERT INTO pay_runs (
      paye_scheme_id, tax_year, pay_period, start_date, end_date, payment_date, status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [schemeId, '2024-25', 1, '2024-04-06', '2024-05-05', '2024-04-28', 'Approved', 'April 2024 Monthly Pay Run - Finalised & Filed']
  );
  const pr1Id = pr1.insertId;

  for (const s of staffCalcs) {
    await conn.query(
      `INSERT INTO payslips (
        pay_run_id, employee_id, gross_pay, income_tax, employee_ni, employer_ni,
        pension_employee, pension_employer, net_pay, student_loan
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [pr1Id, s.id, s.gross, s.tax, s.eeNi, s.erNi, s.eePen, s.erPen, s.net, 0.00]
    );
  }

  // RTI FPS 1
  await conn.query(
    `INSERT INTO rti_submissions (
      pay_run_id, scheme_id, submission_type, tax_year, period_name, correlation_id,
      submitted_at, status, is_zero_fps, employment_allowance_claimed
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      pr1Id, schemeId, 'FPS', '2024-25', 'Period 1 (Apr 2024)', 'HMRC-FPS-20240428-SAN9941',
      '2024-04-28 14:32:10', 'Accepted', 0, 0.00
    ]
  );
  console.log(`Created Pay Run 1 (ID ${pr1Id}) with 4 payslips and Accepted FPS submission.`);

  // Pay Run 2: Period 2 (May 2024) - Approved & RTI Filed
  const [pr2] = await conn.query(
    `INSERT INTO pay_runs (
      paye_scheme_id, tax_year, pay_period, start_date, end_date, payment_date, status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [schemeId, '2024-25', 2, '2024-05-06', '2024-06-05', '2024-05-28', 'Approved', 'May 2024 Monthly Pay Run - Finalised & Emily Clarke P45 Issued']
  );
  const pr2Id = pr2.insertId;

  for (const s of staffCalcs) {
    await conn.query(
      `INSERT INTO payslips (
        pay_run_id, employee_id, gross_pay, income_tax, employee_ni, employer_ni,
        pension_employee, pension_employer, net_pay, student_loan
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [pr2Id, s.id, s.gross, s.tax, s.eeNi, s.erNi, s.eePen, s.erPen, s.net, 0.00]
    );
  }

  // RTI FPS 2
  await conn.query(
    `INSERT INTO rti_submissions (
      pay_run_id, scheme_id, submission_type, tax_year, period_name, correlation_id,
      submitted_at, status, is_zero_fps, employment_allowance_claimed
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      pr2Id, schemeId, 'FPS', '2024-25', 'Period 2 (May 2024)', 'HMRC-FPS-20240528-SAN9941',
      '2024-05-28 16:15:40', 'Accepted', 0, 5000.00
    ]
  );

  // RTI EPS 2 (Employer Payment Summary for Employment Allowance)
  await conn.query(
    `INSERT INTO rti_submissions (
      pay_run_id, scheme_id, submission_type, tax_year, period_name, correlation_id,
      submitted_at, status, is_zero_fps, employment_allowance_claimed, state_aid_sector
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      pr2Id, schemeId, 'EPS', '2024-25', 'Period 2 EPS (May 2024)', 'HMRC-EPS-20240529-SAN9941',
      '2024-05-29 10:05:00', 'Accepted', 0, 5000.00, 'Industrial'
    ]
  );
  console.log(`Created Pay Run 2 (ID ${pr2Id}) with 4 payslips, Accepted FPS and Accepted EPS submissions.`);

  // Pay Run 3: Period 3 (June 2024) - Calculated / Ready to Process & Review
  const [pr3] = await conn.query(
    `INSERT INTO pay_runs (
      paye_scheme_id, tax_year, pay_period, start_date, end_date, payment_date, status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [schemeId, '2024-25', 3, '2024-06-06', '2024-07-05', '2024-06-28', 'Calculated', 'June 2024 Monthly Pay Run - Ready for Final Approval & Live RTI']
  );
  const pr3Id = pr3.insertId;

  // Only the 3 active staff for Period 3
  const activeStaffCalcs = staffCalcs.filter(s => s.id !== emp4Id);
  for (const s of activeStaffCalcs) {
    await conn.query(
      `INSERT INTO payslips (
        pay_run_id, employee_id, gross_pay, income_tax, employee_ni, employer_ni,
        pension_employee, pension_employer, net_pay, student_loan
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [pr3Id, s.id, s.gross, s.tax, s.eeNi, s.erNi, s.eePen, s.erPen, s.net, 0.00]
    );
  }
  console.log(`Created Pay Run 3 (ID ${pr3Id}) with 3 calculated payslips (Draft/Calculated state).`);

  console.log('\n--- SEED COMPLETED SUCCESSFULLY FOR SANSOFT LIMITED ---');
  await conn.end();
}

seedSansoft().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
