// src/utils/format.js
export const fmtMoney = (n) => 'Rp' + Math.round(n||0).toLocaleString('id-ID');

export const fmtDate = (d) => {
  if(!d) return '-';
  return new Date(d).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'});
};

export const fmtDateTime = (d) => {
  if(!d) return '-';
  return new Date(d).toLocaleString('id-ID',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
};

export const formatNumberInput = (el) => {
  let value = el.value.replace(/[^0-9]/g, '');
  el.value = value ? parseInt(value, 10).toLocaleString('id-ID') : '';
};

export const formatFileSize = (bytes) => {
  if(bytes < 1024) return bytes + ' B';
  if(bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
  return (bytes/1024/1024).toFixed(1) + ' MB';
};

export const getFileIcon = (filename) => {
  const ext = filename.split('.').pop().toLowerCase();
  if(['pdf'].includes(ext)) return '📕';
  if(['jpg','jpeg','png','webp','gif'].includes(ext)) return '🖼️';
  if(['doc','docx'].includes(ext)) return '📘';
  if(['xls','xlsx'].includes(ext)) return '📗';
  return '📄';
};
