function debugLog(message) {
    const log = document.getElementById("debug-log");
    if (log) {
      const waktu = new Date().toLocaleTimeString();
      log.textContent += `[${waktu}] ${message}\n`;
    }
    console.log(message);
  }
  
  const produkList = {
    "1gb": { name: "Panel 1GB", price: 30, ram: 1024, cpu: 50, disk: 5000 },
    "2gb": { name: "Panel 2GB", price: 5000, ram: 2048, cpu: 60, disk: 7000 },
    "4gb": { name: "Panel 4GB", price: 9000, ram: 4096, cpu: 80, disk: 10000 },
    "unli": { name: "Panel Unlimited", price: 30000, ram: 0, cpu: 0, disk: 0 }
  };
  
  const global = {
    api: "https://simpelz.fahriofficial.my.id",
    key: "new2025",
    merchantIdOrderKuota: "OK2142306",
    apiOrderKuota: "700336617360840832142306OKCT7A1A4292BE20CEF492B467C5B6EAC103",
    qrisOrderKuota: "00020101021126670016COM.NOBUBANK.WWW01189360050300000879140214520146378043870303UMI51440014ID.CO.QRIS.WWW0215ID20243618270230303UMI5204541153033605802ID5919STOK RESS OK21423066007CILEGON61054241162070703A016304F736",
    domainV2: "https://mikudevprivate.pteropanelku.biz.id",
    apikeyV2: "ptla_7gss1IvRmWISvixYyZ4fEQgPD6wLvakmAeZMyoT9HFQ",
    nestid: "5",
    eggV2: "15",
    locV2: "1"
  };
  
  document.getElementById("form-user").addEventListener("submit", async function (e) {
    e.preventDefault();
    const username = document.getElementById("username").value.trim();
    const ramKey = document.getElementById("ram").value;
    const selectedProduct = produkList[ramKey];
  
    if (!username || !selectedProduct) {
      alert("Lengkapi data terlebih dahulu!");
      return;
    }
  
    debugLog("Data valid. Memulai proses pembayaran...");
    const formSection = document.getElementById("form-section");
    const qrisSection = document.getElementById("qris-section");
    formSection.classList.add("hidden");
    qrisSection.classList.remove("hidden");
  
    const fee = 10;
    const totalAmount = selectedProduct.price + fee;
  
    try {
      const res = await fetch(`${global.api}/api/orkut/createpayment?apikey=${global.key}&amount=${totalAmount}&codeqr=${global.qrisOrderKuota}`);
      const data = await res.json();
      debugLog("QRIS berhasil dibuat.");
  
      if (data.result && data.result.qrImageUrl) {
        document.getElementById("qris-img").src = data.result.qrImageUrl;
        startCountdown(5 * 60);
        const polling = setInterval(async () => {
          const res = await fetch(`${global.api}/api/orkut/cekstatus?apikey=${global.key}&merchant=${global.merchantIdOrderKuota}&keyorkut=${global.apiOrderKuota}`);
          const status = await res.json();
          const jumlahBayar = parseInt(status?.data?.amount);
          debugLog("Cek status pembayaran: " + jumlahBayar);
  
          if (jumlahBayar === totalAmount) {
            clearInterval(polling);
            document.getElementById("status").innerText = "Pembayaran diterima. Mengatur akun panel...";
            debugLog("Pembayaran diterima. Membuat akun...");
  
            await buatAkunPanel(username, selectedProduct);
          }
        }, 7000);
  
        setTimeout(() => {
          clearInterval(polling);
          document.getElementById("status").innerText = "QRIS kadaluarsa.";
          debugLog("QRIS kadaluarsa.");
        }, 300000);
      } else {
        debugLog("Gagal mendapatkan gambar QR.");
        alert("Gagal membuat QRIS.");
      }
    } catch (err) {
      debugLog("Error membuat QRIS: " + err.message);
      alert("Gagal membuat QRIS.");
    }
  });
  
  function startCountdown(durasi) {
    const countdown = document.getElementById("countdown");
    let waktu = durasi;
    const timer = setInterval(() => {
      const m = Math.floor(waktu / 60);
      const s = waktu % 60;
      countdown.textContent = `QR akan kadaluarsa dalam: ${m}:${s.toString().padStart(2, '0')}`;
      if (--waktu < 0) clearInterval(timer);
    }, 1000);
  }
  
  async function buatAkunPanel(username, Obj) {
    const akunPanelEl = document.getElementById("akun-panel");
    let name = username.charAt(0).toUpperCase() + username.slice(1) + " Server";
    let email = username + "@gmail.com";
    let password = username + "001";
  
    try {
      let userRes = await fetch(`${global.domainV2}/api/application/users`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Authorization": "Bearer " + global.apikeyV2
        },
        body: JSON.stringify({
          email,
          username,
          first_name: name,
          last_name: "Server",
          language: "en",
          password
        })
      });
      let user = await userRes.json();
      if (user.errors) throw new Error("Gagal membuat user");
  
      let eggData = await (await fetch(`${global.domainV2}/api/application/nests/${global.nestid}/eggs/${global.eggV2}`, {
        headers: {
          "Authorization": "Bearer " + global.apikeyV2
        }
      })).json();
  
      let serverRes = await fetch(`${global.domainV2}/api/application/servers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + global.apikeyV2
        },
        body: JSON.stringify({
          name,
          user: user.attributes.id,
          egg: global.eggV2,
          docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
          startup: eggData.attributes.startup,
          environment: {
            INST: "npm",
            USER_UPLOAD: "0",
            AUTO_UPDATE: "0",
            CMD_RUN: "npm start"
          },
          limits: {
            memory: Obj.ram,
            swap: 0,
            disk: Obj.disk,
            io: 500,
            cpu: Obj.cpu
          },
          feature_limits: {
            databases: 5,
            backups: 5,
            allocations: 5
          },
          deploy: {
            locations: [global.locV2],
            dedicated_ip: false,
            port_range: []
          }
        })
      });
  
      let server = await serverRes.json();
      if (server.errors) throw new Error("Gagal membuat server");
  
      akunPanelEl.classList.remove("hidden");
      akunPanelEl.innerHTML = `
        <h3>Data Akun Panel:</h3>
        <p><b>Username:</b> ${username}</p>
        <p><b>Password:</b> ${password}</p>
        <p><b>RAM:</b> ${Obj.ram === 0 ? "Unlimited" : Obj.ram / 1024 + " GB"}</p>
        <p><b>CPU:</b> ${Obj.cpu === 0 ? "Unlimited" : Obj.cpu + "%"}</p>
        <p><b>Disk:</b> ${Obj.disk === 0 ? "Unlimited" : Obj.disk / 1000 + " GB"}</p>
        <p><b>Panel Login:</b> <a href="${global.domainV2}" target="_blank">${global.domainV2}</a></p>
      `;
      debugLog("Akun panel berhasil dibuat.");
    } catch (err) {
      debugLog("Gagal membuat akun panel: " + err.message);
      alert("Gagal membuat akun panel.");
    }
  }