export default function ValueBox({ value, unit }) {
  return (
    <div
      style={{
        background: "#eaeaea",
        border: "1px solid #333",
        fontSize: 10,
        padding: "2px 4px",
        marginBottom: 3,
        textAlign: "center",
        width: 60
      }}
    >
      {value} {unit}
    </div>
  );
}