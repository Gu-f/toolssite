type ToolHeaderProps = {
  title: string;
};

export default function ToolHeader({ title }: ToolHeaderProps) {
  return (
    <div className="tool-header">
      <h1>{title}</h1>
    </div>
  );
}
