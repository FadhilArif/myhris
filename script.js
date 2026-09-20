// ==========================================
// 1. KONFIGURASI SUPABASE
// ==========================================
const SUPABASE_URL = 'https://xskfuiblphowpdjriieo.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhza2Z1aWJscGhvd3BkanJpaWVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4NTcwMTMsImV4cCI6MjEwNTQzMzAxM30.ZDy7zrmC1v0IDg2ELrWc_WByx8QUk_gi_Mw2O_JyEAM';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// State Global
let currentView = 'dashboard';
let currentData = { employees: [], attendance: [], payroll: [], recruitment: [], performance: [] };

// ==========================================
// 2. NAVIGASI / ROUTER SPA
// ==========================================
function showView(viewName) {
    // Sembunyikan semua view
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    // Tampilkan view yang dipilih
    document.getElementById(`view-${viewName}`).classList.add('active');
    
    // Update active state di sidebar
    document.querySelectorAll('.sidebar-menu a').forEach(el => el.classList.remove('active'));
    const menuEl = document.getElementById(`menu-${viewName}`);
    if (menuEl) menuEl.classList.add('active');

    currentView = viewName;

    // Muat data sesuai view
    if (viewName === 'employees') fetchEmployees();
    else if (viewName === 'attendance') fetchAttendance();
    else if (viewName === 'payroll') fetchPayroll();
    else if (viewName === 'recruitment') fetchRecruitment();
    else if (viewName === 'performance') fetchPerformance();
    else if (viewName === 'dashboard') fetchDashboardStats();
}

function toggleSubmenu(e) {
    e.preventDefault();
    const submenu = document.getElementById('submenu-karyawan');
    submenu.classList.toggle('open');
}

// ==========================================
// 3. FUNGSI CRUD - EMPLOYEES
// ==========================================
async function fetchEmployees() {
    const tbody = document.getElementById('employee-table-body');
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">Memuat data...</td></tr>`;
    
    const { data, error } = await supabaseClient.from('employees').select('*').order('id', { ascending: true });
    if (error) return tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: red;">Error: ${error.message}</td></tr>`;
    
    currentData.employees = data;
    tbody.innerHTML = data.length === 0 ? `<tr><td colspan="7" style="text-align: center;">Belum ada data.</td></tr>` : '';
    
    data.forEach((emp, index) => {
        tbody.innerHTML += `
            <tr>
                <td>${index + 1}</td><td><strong>${emp.employee_id}</strong></td><td>${emp.name}</td>
                <td>${emp.department}</td><td>${emp.role}</td>
                <td>${new Date(emp.join_date).toLocaleDateString('id-ID')}</td>
                <td class="actions-cell">
                    <i class="fa-solid fa-pen-to-square edit-icon" onclick="editEmployee(${emp.id})"></i>
                    <i class="fa-solid fa-trash delete-icon" onclick="deleteData('employees', ${emp.id})"></i>
                </td>
            </tr>`;
    });
    document.getElementById('total-count-emp').textContent = data.length;
}

// ==========================================
// 4. FUNGSI CRUD - ATTENDANCE
// ==========================================
async function fetchAttendance() {
    const tbody = document.getElementById('attendance-table-body');
    const { data, error } = await supabaseClient.from('attendance').select('*').order('id', { ascending: false });
    if (error) return tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: red;">Error: ${error.message}</td></tr>`;
    
    currentData.attendance = data;
    tbody.innerHTML = data.length === 0 ? `<tr><td colspan="7" style="text-align: center;">Belum ada data.</td></tr>` : '';
    
    data.forEach((item, index) => {
        tbody.innerHTML += `
            <tr>
                <td>${index + 1}</td><td>${item.employee_name}</td><td>${item.date}</td>
                <td><span style="color: ${item.status === 'Hadir' ? 'green' : 'orange'}">${item.status}</span></td>
                <td>${item.check_in || '-'}</td><td>${item.check_out || '-'}</td>
                <td class="actions-cell">
                    <i class="fa-solid fa-trash delete-icon" onclick="deleteData('attendance', ${item.id})"></i>
                </td>
            </tr>`;
    });
}

// ==========================================
// 5. FUNGSI CRUD - PAYROLL
// ==========================================
async function fetchPayroll() {
    const tbody = document.getElementById('payroll-table-body');
    const { data, error } = await supabaseClient.from('payroll').select('*').order('id', { ascending: false });
    if (error) return tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: red;">Error: ${error.message}</td></tr>`;
    
    currentData.payroll = data;
    tbody.innerHTML = data.length === 0 ? `<tr><td colspan="8" style="text-align: center;">Belum ada data.</td></tr>` : '';
    
    data.forEach((item, index) => {
        tbody.innerHTML += `
            <tr>
                <td>${index + 1}</td><td>${item.employee_name}</td><td>${item.month}</td>
                <td>Rp ${item.basic_salary.toLocaleString('id-ID')}</td>
                <td>Rp ${item.allowance.toLocaleString('id-ID')}</td>
                <td>Rp ${item.deduction.toLocaleString('id-ID')}</td>
                <td><strong>Rp ${item.net_salary.toLocaleString('id-ID')}</strong></td>
                <td class="actions-cell">
                    <i class="fa-solid fa-trash delete-icon" onclick="deleteData('payroll', ${item.id})"></i>
                </td>
            </tr>`;
    });
}

// ==========================================
// 6. FUNGSI CRUD - RECRUITMENT
// ==========================================
async function fetchRecruitment() {
    const tbody = document.getElementById('recruitment-table-body');
    const { data, error } = await supabaseClient.from('applicants').select('*').order('id', { ascending: false });
    if (error) return tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: red;">Error: ${error.message}</td></tr>`;
    
    currentData.recruitment = data;
    tbody.innerHTML = data.length === 0 ? `<tr><td colspan="6" style="text-align: center;">Belum ada data.</td></tr>` : '';
    
    data.forEach((item, index) => {
        tbody.innerHTML += `
            <tr>
                <td>${index + 1}</td><td>${item.name}</td><td>${item.position}</td>
                <td>${item.status}</td><td>${item.applied_date}</td>
                <td class="actions-cell">
                    <i class="fa-solid fa-trash delete-icon" onclick="deleteData('applicants', ${item.id})"></i>
                </td>
            </tr>`;
    });
}

// ==========================================
// 7. FUNGSI CRUD - PERFORMANCE
// ==========================================
async function fetchPerformance() {
    const tbody = document.getElementById('performance-table-body');
    const { data, error } = await supabaseClient.from('performance').select('*').order('id', { ascending: false });
    if (error) return tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: red;">Error: ${error.message}</td></tr>`;
    
    currentData.performance = data;
    tbody.innerHTML = data.length === 0 ? `<tr><td colspan="6" style="text-align: center;">Belum ada data.</td></tr>` : '';
    
    data.forEach((item, index) => {
        tbody.innerHTML += `
            <tr>
                <td>${index + 1}</td><td>${item.employee_name}</td><td>${item.period}</td>
                <td><strong>${item.score}</strong></td><td>${item.notes || '-'}</td>
                <td class="actions-cell">
                    <i class="fa-solid fa-trash delete-icon" onclick="deleteData('performance', ${item.id})"></i>
                </td>
            </tr>`;
    });
}

// ==========================================
// 8. FUNGSI DELETE UNIVERSAL
// ==========================================
async function deleteData(table, id) {
    if (!confirm('Yakin ingin menghapus data ini?')) return;
    const { error } = await supabaseClient.from(table).delete().eq('id', id);
    if (error) return alert('Gagal menghapus: ' + error.message);
    
    // Refresh view
    if (table === 'employees') fetchEmployees();
    else if (table === 'attendance') fetchAttendance();
    else if (table === 'payroll') fetchPayroll();
    else if (table === 'applicants') fetchRecruitment();
    else if (table === 'performance') fetchPerformance();
}

// ==========================================
// 9. MODAL & FORM DINAMIS
// ==========================================
const modal = document.getElementById('universalModal');
const form = document.getElementById('universalForm');
const formFields = document.getElementById('dynamic-form-fields');
const modalTitle = document.getElementById('modal-title');

function openModal(type, data = null) {
    form.reset();
    formFields.innerHTML = '';
    modal.classList.add('active');

    let fields = [];
    let title = '';

    if (type === 'employee') {
        title = data ? 'Edit Karyawan' : 'Tambah Karyawan';
        fields = [
            { id: 'employee_id', label: 'ID Karyawan', type: 'text', value: data?.employee_id },
            { id: 'name', label: 'Nama Lengkap', type: 'text', value: data?.name },
            { id: 'department', label: 'Departemen', type: 'text', value: data?.department },
            { id: 'role', label: 'Jabatan', type: 'text', value: data?.role },
            { id: 'join_date', label: 'Tanggal Masuk', type: 'date', value: data?.join_date }
        ];
    } else if (type === 'attendance') {
        title = 'Tambah Absensi';
        fields = [
            { id: 'employee_name', label: 'Nama Karyawan', type: 'text' },
            { id: 'date', label: 'Tanggal', type: 'date' },
            { id: 'status', label: 'Status', type: 'select', options: ['Hadir', 'Izin', 'Sakit', 'Alpha'] },
            { id: 'check_in', label: 'Check In', type: 'time' },
            { id: 'check_out', label: 'Check Out', type: 'time' }
        ];
    } else if (type === 'payroll') {
        title = 'Tambah Payroll';
        fields = [
            { id: 'employee_name', label: 'Nama Karyawan', type: 'text' },
            { id: 'month', label: 'Bulan', type: 'text', placeholder: 'Contoh: Januari 2026' },
            { id: 'basic_salary', label: 'Gaji Pokok', type: 'number' },
            { id: 'allowance', label: 'Tunjangan', type: 'number' },
            { id: 'deduction', label: 'Potongan', type: 'number' }
        ];
    } else if (type === 'recruitment') {
        title = 'Tambah Pelamar';
        fields = [
            { id: 'name', label: 'Nama Pelamar', type: 'text' },
            { id: 'position', label: 'Posisi', type: 'text' },
            { id: 'status', label: 'Status', type: 'select', options: ['Screening', 'Interview', 'Hired', 'Rejected'] }
        ];
    } else if (type === 'performance') {
        title = 'Tambah Penilaian';
        fields = [
            { id: 'employee_name', label: 'Nama Karyawan', type: 'text' },
            { id: 'period', label: 'Periode', type: 'text', placeholder: 'Contoh: Q1 2026' },
            { id: 'score', label: 'Skor (1-100)', type: 'number' },
            { id: 'notes', label: 'Catatan', type: 'textarea' }
        ];
    }

    modalTitle.textContent = title;
    
    // Render fields
    fields.forEach(f => {
        let inputHTML = '';
        if (f.type === 'select') {
            inputHTML = `<select id="field-${f.id}" required>${f.options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}</select>`;
        } else if (f.type === 'textarea') {
            inputHTML = `<textarea id="field-${f.id}" rows="3"></textarea>`;
        } else {
            inputHTML = `<input type="${f.type}" id="field-${f.id}" required ${f.placeholder ? `placeholder="${f.placeholder}"` : ''} value="${f.value || ''}">`;
        }
        
        formFields.innerHTML += `
            <div class="form-group">
                <label>${f.label}</label>
                ${inputHTML}
            </div>`;
    });

    // Simpan tipe dan ID data ke form dataset
    form.dataset.type = type;
    form.dataset.id = data ? data.id : '';
}

function closeModal() {
    modal.classList.remove('active');
}

// ==========================================
// 10. HANDLE FORM SUBMIT
// ==========================================
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const type = form.dataset.type;
    const id = form.dataset.id;
    const formData = {};

    // Ambil nilai dari field dinamis
    formFields.querySelectorAll('input, select, textarea').forEach(input => {
        const key = input.id.replace('field-', '');
        formData[key] = input.value;
    });

    let table = '';
    let payload = {};

    if (type === 'employee') {
        table = 'employees';
        payload = {
            employee_id: formData.employee_id, name: formData.name,
            department: formData.department, role: formData.role, join_date: formData.join_date
        };
    } else if (type === 'attendance') {
        table = 'attendance';
        payload = {
            employee_name: formData.employee_name, date: formData.date,
            status: formData.status, check_in: formData.check_in, check_out: formData.check_out
        };
    } else if (type === 'payroll') {
        table = 'payroll';
        const basic = parseFloat(formData.basic_salary) || 0;
        const allow = parseFloat(formData.allowance) || 0;
        const deduct = parseFloat(formData.deduction) || 0;
        payload = {
            employee_name: formData.employee_name, month: formData.month,
            basic_salary: basic, allowance: allow, deduction: deduct,
            net_salary: basic + allow - deduct
        };
    } else if (type === 'recruitment') {
        table = 'applicants';
        payload = { name: formData.name, position: formData.position, status: formData.status };
    } else if (type === 'performance') {
        table = 'performance';
        payload = { employee_name: formData.employee_name, period: formData.period, score: parseInt(formData.score), notes: formData.notes };
    }

    let error;
    if (id) {
        // Update
        const res = await supabaseClient.from(table).update(payload).eq('id', id);
        error = res.error;
    } else {
        // Insert
        const res = await supabaseClient.from(table).insert([payload]);
        error = res.error;
    }

    if (error) return alert('Gagal menyimpan: ' + error.message);

    closeModal();
    // Refresh view
    if (type === 'employee') fetchEmployees();
    else if (type === 'attendance') fetchAttendance();
    else if (type === 'payroll') fetchPayroll();
    else if (type === 'recruitment') fetchRecruitment();
    else if (type === 'performance') fetchPerformance();
});

// ==========================================
// 11. DASHBOARD STATS
// ==========================================
async function fetchDashboardStats() {
    // Total Karyawan
    const { count: empCount } = await supabaseClient.from('employees').select('*', { count: 'exact', head: true });
    document.getElementById('dash-total-emp').textContent = empCount || 0;

    // Total Pelamar
    const { count: appCount } = await supabaseClient.from('applicants').select('*', { count: 'exact', head: true });
    document.getElementById('dash-total-applicant').textContent = appCount || 0;

    // Total Payroll
    const { data: payrollData } = await supabaseClient.from('payroll').select('net_salary');
    const totalPayroll = payrollData ? payrollData.reduce((sum, item) => sum + (item.net_salary || 0), 0) : 0;
    document.getElementById('dash-total-payroll').textContent = 'Rp ' + totalPayroll.toLocaleString('id-ID');

    // Absensi Hari Ini
    const today = new Date().toISOString().split('T')[0];
    const { count: attCount } = await supabaseClient.from('attendance').select('*', { count: 'exact', head: true }).eq('date', today);
    document.getElementById('dash-total-attendance').textContent = attCount || 0;
}

// ==========================================
// 12. EDIT EMPLOYEE (KHUSUS)
// ==========================================
function editEmployee(id) {
    const emp = currentData.employees.find(e => e.id === id);
    if (emp) openModal('employee', emp);
}

// ==========================================
// 13. INISIALISASI
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    showView('dashboard');
});
