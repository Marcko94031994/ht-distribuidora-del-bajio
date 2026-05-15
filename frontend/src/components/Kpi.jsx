export default function K({label,v}){
  return (
    <div className="kpi">
      <span>{label}</span>
      <strong>{v}</strong>
    </div>
  );
}

