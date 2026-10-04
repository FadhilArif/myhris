const $=s=>document.querySelector(s);
document.querySelectorAll("[data-scroll]").forEach(b=>b.addEventListener("click",()=>$(b.dataset.scroll)?.scrollIntoView({behavior:"smooth",block:"start"})));
const inputs=["employees","hours","rate"].map(id=>$("#"+id));
function rupiah(n){return new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n)}
function calc(){const [e,h,r]=inputs.map(x=>Number(x.value)||0);$("#saving").textContent=rupiah(e>0?h*r:0)}
inputs.forEach(i=>i.addEventListener("input",calc));calc();
$("#trialForm").addEventListener("submit",e=>{e.preventDefault();const company=$("#company").value.trim(),email=$("#email").value.trim();const trial={company,email,createdAt:new Date().toISOString(),plan:"trial"};localStorage.setItem("peopleflow_trial",JSON.stringify(trial));$("#trialMsg").textContent="Workspace demo dibuat. Data trial tersimpan di browser ini.";e.target.reset();});
if(localStorage.getItem("peopleflow_trial"))$("#trialMsg").textContent="Trial workspace ditemukan di browser ini.";
