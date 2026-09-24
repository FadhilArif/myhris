// src/utils/tax.js
import { PTKP_2024, PPH21_BRACKETS, BPJS_CAP_JP } from '../config/constants.js';

export const hitungPPh21Setahun = (brutoSetahun, jhtSetahun, jpSetahun, ptkpKey) => {
  const ptkp = PTKP_2024[ptkpKey] || PTKP_2024['TK/0'];
  const biayaJabatan = Math.min(brutoSetahun * 0.05, 6_000_000);
  const pengurang = biayaJabatan + jhtSetahun + jpSetahun;

  let pkp = brutoSetahun - pengurang - ptkp;
  pkp = Math.floor(Math.max(0, pkp) / 1000) * 1000;
  if(pkp <= 0) return 0;

  let pajak = 0, sisa = pkp, prev = 0;
  for(const b of PPH21_BRACKETS){
    const lapisan = Math.min(sisa, b.max - prev);
    if(lapisan <= 0) break;
    pajak += lapisan * b.rate;
    sisa -= lapisan;
    prev = b.max;
    if(sisa <= 0) break;
  }
  return pajak;
};

export const hitungPPh21Bulanan = (gajiPokok, tunjanganBulanan, ptkpKey) => {
  const brutoBulanan = gajiPokok + tunjanganBulanan;
  const brutoSetahun = brutoBulanan * 12;
  const jhtSetahun = Math.min(gajiPokok, BPJS_CAP_JP) * 0.02 * 12;
  const jpSetahun  = Math.min(gajiPokok, BPJS_CAP_JP) * 0.01 * 12;
  const setahun = hitungPPh21Setahun(brutoSetahun, jhtSetahun, jpSetahun, ptkpKey);
  return Math.round(setahun / 12);
};
