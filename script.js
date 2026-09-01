const SUPABASE_URL = "https://foaujmoctmcadmonfslv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_LoCWbn2KdXSJfjykpy1Dsw_Poyk6eEe";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variabel Global Data
let namaTokoAktif = "";
let filterStatusAktif = 'Semua';
let daftarBarangGlobal = [];
let keranjang = [];
let ketikTimer; 

// ==========================================
// LOGIKA TEMA & DARK MODE
// ==========================================
const themeButtons = document.querySelectorAll('.theme-btn');
const darkModeToggle = document.getElementById('darkModeToggle');
const modeIcon = document.getElementById('modeIcon');
let savedTheme = localStorage.getItem('appTheme') || 'default';
let savedMode = localStorage.getItem('appMode') || 'light';

setTheme(savedTheme);
setMode(savedMode);

themeButtons.forEach(btn => {
  btn.addEventListener('click', function() {
    savedTheme = this.getAttribute('data-theme-val');
    setTheme(savedTheme);
    localStorage.setItem('appTheme', savedTheme);
  });
});

darkModeToggle.addEventListener('click', function() {
  savedMode = savedMode === 'light' ? 'dark' : 'light';
  setMode(savedMode);
  localStorage.setItem('appMode', savedMode);
});

function setTheme(themeName) {
  document.body.setAttribute('data-theme', themeName);
  themeButtons.forEach(b => b.classList.remove('active'));
  const activeBtn = document.querySelector(`.theme-btn[data-theme-val="${themeName}"]`);
  if (activeBtn) activeBtn.classList.add('active');
}

function setMode(modeState) {
  if (modeState === 'dark') {
    document.body.setAttribute('data-mode', 'dark');
    modeIcon.className = 'bi bi-sun-fill text-warning';
  } else {
    document.body.removeAttribute('data-mode');
    modeIcon.className = 'bi bi-moon-stars-fill text-primary';
  }
}

// ==========================================
// LOGIKA LOGIN (SUPABASE)
// ==========================================
window.onload = function() {
  const sessionToko = sessionStorage.getItem('loginToko');
  if (sessionToko) {
    namaTokoAktif = sessionToko;
    bukaAplikasi(namaTokoAktif);
  }
};

async function prosesLogin() {
  const user = document.getElementById('loginUsername').value.trim();
  const pass = document.getElementById('loginPassword').value.trim();
  const btn = document.getElementById('btnLogin');
  const alertBox = document.getElementById('alertBoxLogin');

  if (!user || !pass) {
    alertBox.className = 'alert alert-danger mb-4 shadow-sm';
    alertBox.innerText = 'Username dan Password wajib diisi!';
    alertBox.classList.remove('d-none');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Verifikasi...';

  try {
    const { data, error } = await supabase
      .from('stores')
      .select('store_name')
      .eq('username', user)
      .eq('password', pass)
      .maybeSingle();

    btn.disabled = false;
    btn.innerHTML = 'Masuk <i class="bi bi-box-arrow-in-right"></i>';

    if (error || !data) {
      alertBox.className = 'alert alert-danger mb-4 shadow-sm';
      alertBox.innerText = 'Username atau password salah!';
      alertBox.classList.remove('d-none');
    } else {
      alertBox.classList.add('d-none');
      namaTokoAktif = data.store_name;
      sessionStorage.setItem('loginToko', namaTokoAktif); 
      bukaAplikasi(namaTokoAktif);
    }
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = 'Masuk <i class="bi bi-box-arrow-in-right"></i>';
    alertBox.className = 'alert alert-danger mb-4 shadow-sm';
    alertBox.innerText = "Gagal terhubung ke database.";
    alertBox.classList.remove('d-none');
  }
}

async function bukaAplikasi(namaToko) {
  document.getElementById('pageLogin').classList.add('d-none');
  document.getElementById('pageMainApp').classList.remove('d-none');
  document.getElementById('pageMainApp').classList.add('fade-in');
  document.getElementById('namaToko').value = namaToko; 
  
  document.getElementById('inputBarang').disabled = true;
  document.getElementById('inputBarang').placeholder = "Mengambil data barang... ⏳";
  
  try {
    const { data, error } = await supabase
      .from('items')
      .select('id, name, stock');

    if (!error && data) {
      const formatted = data.map(i => ({ id: i.id, nama: i.name, stok: i.stock }));
      siapkanData(formatted);
    } else {
      throw error;
    }
  } catch (error) {
    console.error("Gagal load daftar barang:", error);
    document.getElementById('inputBarang').placeholder = "Gagal memuat barang 😢. Refresh halaman.";
  }
}

function logout() {
  sessionStorage.removeItem('loginToko');
  namaTokoAktif = "";
  document.getElementById('loginUsername').value = "";
  document.getElementById('loginPassword').value = "";
  document.getElementById('pageMainApp').classList.add('d-none');
  document.getElementById('pageLogin').classList.remove('d-none');
  document.getElementById('pageLogin').classList.add('fade-in');
  
  switchTab('order'); 
}

function switchTab(tabName) {
  document.getElementById('pageOrder').classList.toggle('d-none', tabName !== 'order');
  document.getElementById('pageHistory').classList.toggle('d-none', tabName !== 'history');
  
  document.getElementById('tabOrder').classList.toggle('active', tabName === 'order');
  document.getElementById('tabHistory').classList.toggle('active', tabName === 'history');

  if (tabName === 'history') {
    renderHistori();
    refreshHistori();
  }
}

// ==========================================
// FORM ORDER & KERANJANG
// ==========================================
function siapkanData(data) {
  daftarBarangGlobal = data;
  document.getElementById('inputBarang').disabled = false;
  document.getElementById('inputBarang').placeholder = "Ketik nama/kode barang... 🔍";
}

const inputBarang = document.getElementById('inputBarang');
const dropdownBarang = document.getElementById('dropdownBarang');

function triggerPencarian() {
  if (inputBarang.value.trim().length > 0) {
    inputBarang.dispatchEvent(new Event('input'));
  }
}

inputBarang.addEventListener('input', function() {
  const keyword = this.value.toLowerCase().trim();
  const showEmpty = document.getElementById('switchStok').checked;
  
  clearTimeout(ketikTimer);
  if (keyword.length === 0) {
    dropdownBarang.style.display = 'none';
    dropdownBarang.innerHTML = '';
    return;
  }
  
  dropdownBarang.innerHTML = '<div class="p-3 text-center txt-sub fw-bold small">Mencari barang... 🏃💨</div>';
  dropdownBarang.style.display = 'block';

  ketikTimer = setTimeout(function() {
    const hasilPencarian = daftarBarangGlobal.filter(item => {
      const cocok = String(item.nama || '').toLowerCase().includes(keyword) || String(item.id || '').toLowerCase().includes(keyword);
      if (!cocok) return false;
      if (!showEmpty && item.stok <= 0) return false;
      return true;
    });

    dropdownBarang.innerHTML = ''; 
    if (hasilPencarian.length === 0) {
      dropdownBarang.innerHTML = `<div class="p-3 text-center txt-sub fw-bold small">${showEmpty ? 'Oops, barang tidak ketemu 🙈' : 'Barang tidak ketemu (atau stok habis) 🙈'}</div>`;
    } else {
      const fragment = document.createDocumentFragment();
      hasilPencarian.slice(0, 50).forEach(item => {
        const div = document.createElement('div');
        let badgeClass = item.stok > 0 ? 'bg-success text-white' : 'bg-danger text-white';
        let stokText = item.stok > 0 ? `Sisa: ${item.stok}` : 'Habis 😭';
        if (item.stok <= 0) { div.style.opacity = '0.5'; }
        
        div.className = 'custom-dropdown-item';
        div.innerHTML = `<div><div class="item-name">${item.nama.toUpperCase()}</div><div class="item-id">${item.id}</div></div>
                         <div><span class="badge ${badgeClass}">${stokText}</span></div>`;
        div.addEventListener('click', function() {
          if (item.stok <= 0) {
            alert('Waduh, barang kosong! 😭');
            inputBarang.focus();
            return;
          }
          inputBarang.value = `${item.id} - ${item.nama.toUpperCase()}`;
          dropdownBarang.style.display = 'none';
          document.getElementById('inputJumlah').focus(); 
        });
        fragment.appendChild(div);
      });
      dropdownBarang.appendChild(fragment);
    }
  }, 300); 
});

document.addEventListener('click', function(e) {
  if (!inputBarang.contains(e.target) && !dropdownBarang.contains(e.target)) {
    dropdownBarang.style.display = 'none';
  }
});

inputBarang.addEventListener('focus', function() {
  if (this.value.trim().length > 0) this.dispatchEvent(new Event('input'));
});

function tambahKeKeranjang() {
  const valBarang = inputBarang.value.trim();
  const inputJumlah = parseInt(document.getElementById('inputJumlah').value);
  if (!valBarang) { alert("Pilih barangnya dulu ya! 🥺"); return; }
  if (!inputJumlah || inputJumlah <= 0) { alert("Jumlah tidak valid! ✌️"); return; }
  const dataAsli = daftarBarangGlobal.find(item => `${item.id} - ${item.nama.toUpperCase()}` === valBarang);
  if (!dataAsli) { alert("Barang gak valid! 🔍"); return; }
  if (dataAsli.stok <= 0) { alert("Stok barang kosong! 😭"); return; }

  const idx = keranjang.findIndex(item => item.namaBarang === valBarang);
  let totalDiminta = inputJumlah;
  if (idx !== -1) { totalDiminta += keranjang[idx].jumlah; }
  if (totalDiminta > dataAsli.stok) { alert(`Stok gak cukup! Sisa cuma ${dataAsli.stok}. 😅`); return; }

  if (idx !== -1) {
    keranjang[idx].jumlah += inputJumlah;
  } else {
    keranjang.push({ namaBarang: valBarang, jumlah: inputJumlah });
  }
  inputBarang.value = '';
  document.getElementById('inputJumlah').value = '1';
  inputBarang.focus();
  renderKeranjang();
}

function hapusDariKeranjang(index) {
  keranjang.splice(index, 1);
  renderKeranjang();
}

function renderKeranjang() {
  const tbody = document.getElementById('bodyKeranjang');
  tbody.innerHTML = '';
  if (keranjang.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 txt-sub">Keranjangmu masih kosong nih, ayo diisi! 🥺</td></tr>';
    return;
  }
  keranjang.forEach((item, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="text-center txt-sub">${index + 1}</td><td class="txt-theme">${item.namaBarang}</td>
                    <td class="text-center fs-5 txt-main">${item.jumlah}</td><td class="text-center"><button class="btn btn-sm btn-outline-danger btn-hapus" onclick="hapusDariKeranjang(${index})"><i class="bi bi-trash3-fill"></i></button></td>`;
    tbody.appendChild(tr);
  });
}

// ==========================================
// SIMPAN ORDER (SUPABASE)
// ==========================================
async function kirimOrder() {
  const catatan = document.getElementById('catatan').value.trim();
  const btnSubmit = document.getElementById('btnSubmitOrder');
  const alertBox = document.getElementById('alertBoxOrder');

  if (keranjang.length === 0) {
    alert("Keranjang kosong! Tambah minimal 1 barang 🛒");
    inputBarang.focus();
    return;
  }

  const itemsPayload = keranjang.map(item => {
    let idSplit = "-", namaSplit = item.namaBarang;
    if (item.namaBarang.includes(" - ")) {
      const parts = item.namaBarang.split(" - ");
      idSplit = parts[0].trim();
      parts.shift();
      namaSplit = parts.join(" - ").trim(); 
    }
    return { idBarang: idSplit, namaBarang: namaSplit, jumlah: item.jumlah };
  });

  const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
  const totalQty = keranjang.reduce((acc, curr) => acc + curr.jumlah, 0);

  btnSubmit.disabled = true;
  btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Menerbangkan Pesanan... 🚀';

  try {
    const { error } = await supabase
      .from('orders')
      .insert([{
        id: orderId,
        store_name: namaTokoAktif,
        notes: catatan || '-',
        status: 'Pending',
        items: itemsPayload,
        total_qty: totalQty
      }]);

    btnSubmit.disabled = false;
    btnSubmit.innerHTML = 'Kirim Pesanan Sekarang 🚀';

    if (!error) {
      alertBox.className = 'alert alert-success mt-3 shadow-sm';
      alertBox.innerHTML = `🎉 Yeay! Pesanan terkirim.<br>ID Pesanan: <b class="fs-5">${orderId}</b><br><small>(Silakan pantau status di tab Riwayat)</small>`;
      alertBox.classList.remove('d-none');
      
      document.getElementById('catatan').value = '';
      keranjang = [];
      renderKeranjang();
      window.scrollTo(0, 0);
      refreshHistori();
    } else {
      throw error;
    }
  } catch (err) {
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = 'Kirim Pesanan Sekarang 🚀';
    alertBox.className = 'alert alert-danger mt-3 shadow-sm';
    alertBox.innerHTML = `🚨 Waduh: ${err.message || 'Gagal menyimpan pesanan'}`;
    alertBox.classList.remove('d-none');
    window.scrollTo(0, 0);
  }
}

// ==========================================
// RIWAYAT & UPDATE STATUS (SUPABASE)
// ==========================================
function setFilterHistory(status, btnElement) {
  filterStatusAktif = status;
  
  document.querySelectorAll('.filter-btn').forEach(b => {
    b.classList.remove('active', 'btn-dark', 'text-white');
    b.classList.add('btn-outline-secondary');
  });
  
  btnElement.classList.remove('btn-outline-secondary');
  btnElement.classList.add('active', 'btn-dark', 'text-white');
  
  renderHistori();
}

async function refreshHistori() {
  const btn = document.getElementById('btnRefreshHistori');
  const icon = document.getElementById('iconRefresh');
  const alertBox = document.getElementById('alertBoxRiwayat');
  
  icon.classList.add('spin-anim');
  btn.disabled = true;
  alertBox.classList.add('d-none');

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('store_name', namaTokoAktif)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      const mapped = data.map(o => ({
        idPesanan: o.id,
        tanggal: new Date(o.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        status: o.status,
        catatan: o.notes,
        totalQty: o.total_qty,
        items: o.items
      }));

      const keyStorage = 'riwayatOrder_' + namaTokoAktif;
      localStorage.setItem(keyStorage, JSON.stringify(mapped));
      renderHistori();
    } else {
      throw error;
    }
  } catch(e) {
    alertBox.className = 'alert alert-danger mb-3 shadow-sm';
    alertBox.innerText = "Koneksi gagal saat refresh riwayat.";
    alertBox.classList.remove('d-none');
  } finally {
    icon.classList.remove('spin-anim');
    btn.disabled = false;
  }
}

function renderHistori() {
  const keyStorage = 'riwayatOrder_' + namaTokoAktif;
  let history = JSON.parse(localStorage.getItem(keyStorage)) || [];
  const container = document.getElementById('listHistori');
  container.innerHTML = '';

  if (filterStatusAktif !== 'Semua') {
    history = history.filter(item => {
      const sts = item.status ? item.status.toLowerCase() : 'pending';
      return sts.includes(filterStatusAktif.toLowerCase());
    });
  }

  if (history.length === 0) {
    container.innerHTML = `<div class="text-center py-5 txt-sub border border-dashed rounded" style="border-color: var(--input-border);">Belum ada riwayat pesanan untuk kategori <b>${filterStatusAktif}</b>. 🥺</div>`;
    return;
  }

  history.forEach(item => {
    const sts = item.status ? item.status.toLowerCase() : 'pending';
    let badgeColor = 'secondary', badgeIcon = 'bi-circle';
    
    if (sts.includes('pending')) { badgeColor = 'warning text-dark'; badgeIcon = 'bi-hourglass-split'; }
    else if (sts.includes('proses')) { badgeColor = 'info text-dark'; badgeIcon = 'bi-box-seam'; }
    else if (sts.includes('kirim')) { badgeColor = 'primary text-white'; badgeIcon = 'bi-truck'; }
    else if (sts.includes('selesai')) { badgeColor = 'success text-white'; badgeIcon = 'bi-check-circle-fill'; }
    else if (sts.includes('batal')) { badgeColor = 'danger text-white'; badgeIcon = 'bi-x-circle-fill'; }
    
    let itemListHtml = '';
    if (item.items && item.items.length > 0) {
      const displayItems = item.items.slice(0, 2);
      itemListHtml = `<ul class="mb-0 ps-3 mt-2 text-start">`;
      displayItems.forEach(brg => { itemListHtml += `<li>${brg.namaBarang} (x${brg.jumlah})</li>`; });
      if (item.items.length > 2) { itemListHtml += `<li class="txt-sub fst-italic">...dan ${item.items.length - 2} barang lainnya</li>`; }
      itemListHtml += `</ul>`;
    }

    const div = document.createElement('div');
    div.className = 'section-box mb-3 p-3 shadow-sm bg-white fade-in';
    div.style.border = '1px solid var(--input-border)';
    
    let actionButtons = `
      <button class="btn btn-outline-primary flex-fill fw-bold" onclick="bukaModalDetail('${item.idPesanan}')" style="border-radius: 12px; border-width: 2px;">
        <i class="bi bi-receipt"></i> Detail
      </button>
    `;

    if (sts.includes('kirim')) {
      actionButtons += `
        <button id="btnSelesai_${item.idPesanan}" class="btn btn-outline-success flex-fill fw-bold" onclick="bukaModalKonfirmasi('${item.idPesanan}')" style="border-radius: 12px; border-width: 2px;">
          <i class="bi bi-check2-circle"></i> Terima Pesanan
        </button>`;
    }

    div.innerHTML = `
      <div class="d-flex justify-content-between align-items-start flex-wrap mb-2">
        <div>
          <div class="fw-bold fs-5 txt-theme mb-1">${item.idPesanan}</div>
          <div class="small txt-sub"><i class="bi bi-calendar-event"></i> ${item.tanggal}</div>
        </div>
        <span class="badge bg-${badgeColor} mt-1 fs-6"><i class="bi ${badgeIcon}"></i> ${item.status || 'Pending'}</span>
      </div>
      <div class="small txt-main mt-1 fw-bold"><i class="bi bi-boxes"></i> Total Item: ${item.totalQty} qty</div>
      <div class="small txt-main">${itemListHtml}</div>
      <div class="d-flex gap-2 mt-3">
        ${actionButtons}
      </div>
    `;
    container.appendChild(div);
  });
}

function bukaModalDetail(idPesanan) {
  const keyStorage = 'riwayatOrder_' + namaTokoAktif;
  let history = JSON.parse(localStorage.getItem(keyStorage)) || [];
  const item = history.find(o => o.idPesanan === idPesanan);
  
  if (!item) return;

  let tbodyHtml = '';
  item.items.forEach((brg, idx) => {
    tbodyHtml += `
      <tr>
        <td class="text-center txt-sub">${idx + 1}</td>
        <td class="txt-main fw-bold"><div class="small txt-sub fw-normal">${brg.idBarang}</div>${brg.namaBarang}</td>
        <td class="text-center fs-5 txt-theme">${brg.jumlah}</td>
      </tr>
    `;
  });

  const sts = item.status ? item.status.toLowerCase() : 'pending';
  let badgeColor = 'secondary', badgeIcon = 'bi-circle';
  if (sts.includes('pending')) { badgeColor = 'warning text-dark'; badgeIcon = 'bi-hourglass-split'; }
  else if (sts.includes('proses')) { badgeColor = 'info text-dark'; badgeIcon = 'bi-box-seam'; }
  else if (sts.includes('kirim')) { badgeColor = 'primary text-white'; badgeIcon = 'bi-truck'; }
  else if (sts.includes('selesai')) { badgeColor = 'success text-white'; badgeIcon = 'bi-check-circle-fill'; }
  else if (sts.includes('batal')) { badgeColor = 'danger text-white'; badgeIcon = 'bi-x-circle-fill'; }

  document.getElementById('bodyDetailPesanan').innerHTML = `
    <div class="mb-3">
      <div class="fw-bold fs-5 txt-theme">${item.idPesanan}</div>
      <div class="small txt-sub"><i class="bi bi-calendar-event"></i> ${item.tanggal}</div>
      <span class="badge bg-${badgeColor} mt-2 fs-6"><i class="bi ${badgeIcon}"></i> ${item.status || 'Pending'}</span>
    </div>
    
    <div class="section-box p-3 mb-4" style="border: 1px solid var(--input-border); background: var(--input-bg); padding: 15px !important;">
      <label class="form-label fw-bold txt-main small mb-1">📝 Catatan Order</label>
      <div class="txt-sub small fw-semibold">${item.catatan && item.catatan !== '-' ? item.catatan : 'Tidak ada catatan tambahan.'}</div>
    </div>

    <h6 class="fw-bold mb-2 txt-main"><i class="bi bi-cart"></i> Rincian Barang:</h6>
    <div class="table-responsive">
      <table class="table-cart w-100 mb-0">
        <thead>
          <tr>
            <th width="40" class="text-center">No</th>
            <th>Nama Barang</th>
            <th width="80" class="text-center">Qty</th>
          </tr>
        </thead>
        <tbody>
          ${tbodyHtml}
        </tbody>
      </table>
    </div>
  `;

  const modalDetail = new bootstrap.Modal(document.getElementById('modalDetailPesanan'));
  modalDetail.show();
}

let pesananDikonfirmasi = "";

function bukaModalKonfirmasi(idPesanan) {
  pesananDikonfirmasi = idPesanan;
  document.getElementById('inputKodeKonfirmasi').value = '';
  document.getElementById('alertModalKonfirmasi').classList.add('d-none');
  const modalKonfirmasi = new bootstrap.Modal(document.getElementById('modalKodeUnik'));
  modalKonfirmasi.show();
}

async function prosesKonfirmasiUnik() {
  const kode = document.getElementById('inputKodeKonfirmasi').value.trim();
  const alertBox = document.getElementById('alertModalKonfirmasi');
  const btn = document.getElementById('btnSubmitKonfirmasi');

  if (!kode) {
    alertBox.className = 'alert alert-danger mt-3 small fw-bold py-2';
    alertBox.innerText = 'Kode unik wajib diisi!';
    alertBox.classList.remove('d-none');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Cek Kode...';
  alertBox.classList.add('d-none');

  try {
    const { data, error } = await supabase
      .from('orders')
      .update({ status: 'Selesai' })
      .eq('id', pesananDikonfirmasi)
      .eq('unique_code', kode)
      .select();

    btn.disabled = false;
    btn.innerHTML = 'Konfirmasi Diterima';

    if (!error && data && data.length > 0) {
      const modalEl = document.getElementById('modalKodeUnik');
      const modalInstance = bootstrap.Modal.getInstance(modalEl);
      modalInstance.hide();
      
      const alertRiwayat = document.getElementById('alertBoxRiwayat');
      alertRiwayat.className = 'alert alert-success mb-3 shadow-sm fade-in';
      alertRiwayat.innerHTML = `<i class="bi bi-check-circle-fill"></i> Pesanan ${pesananDikonfirmasi} berhasil diselesaikan.`;
      alertRiwayat.classList.remove('d-none');
      
      refreshHistori();
    } else {
      alertBox.className = 'alert alert-danger mt-3 small fw-bold py-2';
      alertBox.innerText = 'Kode unik tidak cocok atau pesanan tidak ditemukan!';
      alertBox.classList.remove('d-none');
    }
  } catch(e) {
    btn.disabled = false;
    btn.innerHTML = 'Konfirmasi Diterima';
    alertBox.className = 'alert alert-danger mt-3 small fw-bold py-2';
    alertBox.innerText = 'Koneksi gagal. Coba lagi.';
    alertBox.classList.remove('d-none');
  }
}
