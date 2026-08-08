import { WaterSortPro } from './water-sort-pro/components/WaterSortPro';
import { ErrorBoundary } from '../ui/ErrorBoundary';

interface Props { onClose: () => void }

export function WaterSortGame({ onClose }: Props) {
  return (
    <ErrorBoundary>
      <div className="w-full h-full relative group overflow-hidden">
        <WaterSortPro onClose={onClose} />
      </div>
    </ErrorBoundary>
  );
}
