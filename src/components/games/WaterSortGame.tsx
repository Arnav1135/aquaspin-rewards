import { WaterSortPro } from './water-sort-pro/components/WaterSortPro';

interface Props { onClose: () => void }

export function WaterSortGame({ onClose }: Props) {
  return (
    <div className="w-full h-full relative group overflow-hidden">
      <WaterSortPro onClose={onClose} />
    </div>
  );
}
