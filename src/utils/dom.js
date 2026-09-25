// src/utils/dom.js
export const el = (id) => document.getElementById(id);

export const escapeHtml = (s) => {
  return (s==null?'':String(s)).replace(/[&<>"']/g, m=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));
};

export const openModal = (html) => {
  el('modal-root').innerHTML = `<div class="modal-backdrop" onclick="if(event.target===this) window.closeModal()"><div class="modal">${html}</div></div>`;
};

export const closeModal = () => {
  el('modal-root').innerHTML = '';
};

export const showToast = (msg, isError) => {
  const t = document.createElement('div');
  t.className = 'toast';
  if(isError) t.style.background = '#B3402F';
  t.textContent = msg;
  el('toast-root').appendChild(t);
  setTimeout(()=>t.remove(), 3200);
};

export const badge = (text, kind) => `<span class="badge badge-${kind}">${text}</span>`;

export const statusBadge = (status) => {
  const map = {
    present:['Hadir','success'], late:['Terlambat','warning'], absent:['Absen','danger'],
    on_leave:['Cuti','neutral'], holiday:['Libur','neutral'],
    pending:['Menunggu','warning'], approved:['Disetujui','success'],
    rejected:['Ditolak','danger'], cancelled:['Dibatalkan','neutral'], paid:['Dibayar','success'],
    active:['Aktif','success'], probation:['Probation','warning'],
    resigned:['Resign','neutral'], terminated:['Diberhentikan','danger'],
    open:['Dibuka','success'], closed:['Ditutup','neutral'], on_hold:['Ditunda','warning'],
    draft:['Draft','neutral'], calculated:['Terhitung','warning'], under_review:['Menunggu Review','warning'],
    approved:['Disetujui','success'], paid:['Sudah Dibayar','success'], locked:['Terkunci','neutral'],
    applied:['Melamar','neutral'], screening:['Screening','warning'],
    interview:['Interview','warning'], offer:['Penawaran','warning'], hired:['Diterima','success'],
    draft:['Draft','neutral'], processed:['Diproses','warning'],
    submitted:['Terkirim','warning'], acknowledged:['Diakui','success'],
    enrolled:['Terdaftar','neutral'], completed:['Selesai','success']
  };
  const v = map[status] || [status,'neutral'];
  return badge(v[0], v[1]);
};

// Preview foto
export const previewPhoto = (inputEl, previewId) => {
  const file = inputEl.files[0];
  if(!file) return;
  const url = URL.createObjectURL(file);
  const el2 = document.getElementById(previewId);
  if(el2) el2.src = url;
};

export const handleDocFileSelect = () => {
  const input = el('dc-file');
  if(!input.files || !input.files.length) return;
  const file = input.files[0];
  el('dc-file-info').style.display = 'block';
  el('dc-file-name').textContent = file.name;
  el('dc-file-size').textContent = (window.formatFileSize || ((b)=>b))(file.size);
  el('dc-file-icon').textContent = (window.getFileIcon || (()=>'📄'))(file.name);
};

export const clearDocFile = () => {
  el('dc-file').value = '';
  el('dc-file-info').style.display = 'none';
};
