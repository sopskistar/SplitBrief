import { LoaderCircle } from 'lucide-react';
export default function Loading() {
  return (
    <div className="loading-preview" role="status">
      <LoaderCircle className="spin" size={19} />
      Opening SplitBrief…
    </div>
  );
}
