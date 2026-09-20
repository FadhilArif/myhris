// ==========================================
// 1. KONFIGURASI SUPABASE
// ==========================================
// Ganti dengan URL dan Anon Key dari project Supabase Anda
const SUPABASE_URL = 'https://xskfuiblphowpdjriieo.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhza2Z1aWJscGhvd3BkanJpaWVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4NTcwMTMsImV4cCI6MjEwNTQzMzAxM30.ZDy7zrmC1v0IDg2ELrWc_WByx8QUk_gi_Mw2O_JyEAM';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variabel Global untuk menyimpan data asli (untuk keperluan search & export)
let allEmployees = []; 

// ==========================================
// 2. FUNGSI CRUD (GATEWAY)
// ==========================================

// READ: Mengambil data dari Supabase
async function fetchEmployees() {
    const tbody = document.getElementById('employee-table-body');
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">Memuat data...</td></tr>`;

    const { data, error } = await supabaseClient
        .from('employees')
        .select('*')
        .order('id', { ascending: true });

    if (error) {
        console.error('Error fetching data:', error);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--danger);">Gagal memuat data: ${error.message}</td></tr>`;
        return;
    }

    allEmployees = data; // Simpan data asli
    renderTable(allEmployees);
    updateStats(allEmployees);
}

// CREATE: Menambah data ke Supabase
async function addEmployee(employeeData) {
    const { error } = await supabaseClient
        .from('employees')
        .insert([employeeData]);

    if (error) {
        console.error('Error adding data:', error);
        alert('Gagal menambah data: ' + error.message);
        return;
    }

    alert('Karyawan berhasil ditambahkan!');
    closeModal();
    fetchEmployees(); 
}

// UPDATE: Mengubah data di Supabase
async function updateEmployee(id, updatedData) {
    const { error } = await supabaseClient
        .from('employees')
        .update(updatedData)
        .eq('id', id);

    if (error) {
        console.error('Error updating data:', error);
        alert('Gagal mengupdate data: ' + error.message);
        return;
    }

    alert('Data karyawan berhasil diupdate!');
    closeModal();
    fetchEmployees();
}

// DELETE: Menghapus satu data dari Supabase
async function deleteEmployee(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus karyawan ini?')) return;

    const { error } = await supabaseClient
        .from('employees')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting data:', error);
        alert('Gagal menghapus data.');
        return;
    }

    fetchEmployees();
}

// DELETE ALL: Menghapus semua data
async function deleteAll() {
    if (!confirm('PERINGATAN! Apakah Anda yakin ingin menghapus SEMUA data karyawan? Tindakan ini tidak dapat dibatalkan.')) return;

    // Supabase membutuhkan kondisi untuk delete, kita gunakan neq (not equal) dengan id 0 agar semua terhapus
    const { error } = await supabaseClient
        .from('employees')
        .delete()
        .neq('id', 0);

    if (error) {
        console.error('Error deleting all data:', error);
        alert('Gagal menghapus semua data: ' + error.message);
        return;
    }

    alert('Semua data karyawan berhasil dihapus.');
    fetchEmployees();
}

// ==========================================
// 3. FUNGSI UI / RENDERING
// ==========================================

function renderTable(data) {
    const tbody = document.getElementById('employee-table-body');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">Belum ada data karyawan.</td></tr>`;
        return;
    }

    data.forEach((emp, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${emp.employee_id}</strong></td>
            <td>${emp.name}</td>
            <td>${emp.department}</td>
            <td>${emp.role}</td>
            <td>${new Date(emp.join_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
            <td class="actions-cell">
                <i class="fa-solid fa-pen-to-square edit-icon" title="Edit" onclick="editEmployee(${emp.id})"></i>
                <i class="fa-solid fa-trash delete-icon" title="Hapus" onclick="deleteEmployee(${emp.id})"></i>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function updateStats(data) {
    document.getElementById('total-employees').textContent = data.length;
    document.getElementById('total-count').textContent = data.length;
    
    // Hitung departemen unik
    const depts = [...new Set(data.map(emp => emp.department))];
    document.getElementById('total-departments').textContent = depts.length;

    // Update timestamp
    const now = new Date();
    document.getElementById('last-updated').textContent = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

// ==========================================
// 4. FUNGSI MODAL & FORM
// ==========================================

const modal = document.getElementById('employeeModal');
const form = document.getElementById('employeeForm');
const modalTitle = document.getElementById('modal-title');
const submitBtn = document.getElementById('modal-submit-btn');

function openModal() {
    // Reset form untuk mode Tambah
    form.reset();
    document.getElementById('emp_db_id').value = '';
    modalTitle.textContent = 'Tambah Karyawan Baru';
    submitBtn.textContent = 'Simpan Karyawan';
    modal.classList.add('active');
}

function closeModal() {
    modal.classList.remove('active');
    form.reset();
}

function editEmployee(id) {
    // Cari data karyawan berdasarkan ID
    const emp = allEmployees.find(e => e.id === id);
    if (!emp) return;

    // Isi form dengan data yang ada
    document.getElementById('emp_db_id').value = emp.id;
    document.getElementById('emp_id').value = emp.employee_id;
    document.getElementById('emp_name').value = emp.name;
    document.getElementById('emp_dept').value = emp.department;
    document.getElementById('emp_role').value = emp.role;
    document.getElementById('emp_date').value = emp.join_date;

    // Ubah tampilan modal
    modalTitle.textContent = 'Edit Karyawan';
    submitBtn.textContent = 'Update Karyawan';
    modal.classList.add('active');
}

// Handle Form Submit (Create atau Update)
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const dbId = document.getElementById('emp_db_id').value;
    
    const employeeData = {
        employee_id: document.getElementById('emp_id').value,
        name: document.getElementById('emp_name').value,
        department: document.getElementById('emp_dept').value,
        role: document.getElementById('emp_role').value,
        join_date: document.getElementById('emp_date').value,
    };

    if (dbId) {
        // Mode Edit (Update)
        await updateEmployee(dbId, employeeData);
    } else {
        // Mode Tambah (Create)
        await addEmployee(employeeData);
    }
});

// ==========================================
// 5. FITUR PENCARIAN & EXPORT
// ==========================================

// Fitur Search
document.getElementById('search-input').addEventListener('input', (e) => {
    const keyword = e.target.value.toLowerCase();
    const filtered = allEmployees.filter(emp => 
        emp.name.toLowerCase().includes(keyword) ||
        emp.employee_id.toLowerCase().includes(keyword) ||
        emp.department.toLowerCase().includes(keyword) ||
        emp.role.toLowerCase().includes(keyword)
    );
    renderTable(filtered);
    updateStats(filtered);
});

// Fitur Export ke CSV
function exportToCSV() {
    if (allEmployees.length === 0) {
        alert('Tidak ada data untuk diexport.');
        return;
    }

    const headers = ['ID Karyawan', 'Nama Lengkap', 'Departemen', 'Jabatan', 'Tanggal Masuk'];
    const rows = allEmployees.map(emp => [
        emp.employee_id,
        emp.name,
        emp.department,
        emp.role,
        emp.join_date
    ]);

    let csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(",") + "\n"
        + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "data_karyawan.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ==========================================
// 6. INISIALISASI
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    fetchEmployees();
});
