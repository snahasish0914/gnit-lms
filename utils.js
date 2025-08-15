
export function ymd(d){
  const dt = (d instanceof Date)? d : new Date(d);
  const mm = String(dt.getMonth()+1).padStart(2,'0');
  const dd = String(dt.getDate()).padStart(2,'0');
  return `${dt.getFullYear()}-${mm}-${dd}`;
}
