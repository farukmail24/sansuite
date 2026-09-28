async function verify() {
  console.log("▶ 1. Testing Health Endpoint...");
  const healthRes = await fetch("https://sansuite.vercel.app/api/health");
  const health = await healthRes.json();
  console.log("   Health:", healthRes.status, JSON.stringify(health));

  console.log("▶ 2. Testing Favicon & Logo...");
  const favRes = await fetch("https://sansuite.vercel.app/favicon.svg");
  console.log("   Favicon:", favRes.status, favRes.headers.get("content-type"));
  const logoRes = await fetch("https://sansuite.vercel.app/logo.svg");
  console.log("   Logo:", logoRes.status, logoRes.headers.get("content-type"));

  console.log("▶ 3. Testing Authentication Login...");
  const loginRes = await fetch("https://sansuite.vercel.app/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@sanaccounts.com", password: "Admin@1234" })
  });
  const loginData = await loginRes.json();
  console.log("   Login Status:", loginRes.status, "User:", loginData.user?.email, "Role:", loginData.user?.role);

  if (loginData.token) {
    console.log("▶ 4. Testing Authenticated Practice Endpoint (/api/practice/clients)...");
    const clientsRes = await fetch("https://sansuite.vercel.app/api/practice/clients", {
      headers: { "Authorization": `Bearer ${loginData.token}` }
    });
    console.log("   Clients Endpoint Status:", clientsRes.status);
    const clients = await clientsRes.json();
    console.log("   Clients Response:", Array.isArray(clients) ? `Array(${clients.length}) records` : clients);

    console.log("▶ 5. Testing Media Settings Endpoint (/api/media-settings)...");
    const mediaRes = await fetch("https://sansuite.vercel.app/api/media-settings");
    console.log("   Media Settings Status:", mediaRes.status);
    const media = await mediaRes.json();
    console.log("   Media Settings:", JSON.stringify(media));
  }
}

setTimeout(verify, 30000);
