/**
 * Skeleton — animated placeholder shown while content is loading.
 *
 * Variants
 * --------
 * "card"      – rounded box, 120 px tall, full width
 * "list-item" – full width, 64 px tall; circle avatar on left + two text
 *               lines on the right
 * "chart"     – full width, 200 px tall, rounded
 * "stat"      – small box, 80 px tall, half width
 */

const BASE = "animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700";

function SkeletonCard() {
  return <div className={`${BASE} h-[120px] w-full`} />;
}

function SkeletonListItem() {
  return (
    <div className="flex w-full animate-pulse items-center gap-3 px-1 py-1">
      {/* Circle avatar */}
      <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gray-200 dark:bg-gray-700" />

      {/* Two text lines */}
      <div className="flex flex-1 flex-col gap-2">
        <div className="h-3.5 w-3/5 rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="h-3 w-2/5 rounded-full bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );
}

function SkeletonChart() {
  return <div className={`${BASE} h-[200px] w-full`} />;
}

function SkeletonStat() {
  return <div className={`${BASE} h-[80px] w-1/2`} />;
}

const VARIANTS = {
  card: SkeletonCard,
  "list-item": SkeletonListItem,
  chart: SkeletonChart,
  stat: SkeletonStat,
};

/**
 * @param {{ variant?: "card" | "list-item" | "chart" | "stat" }} props
 */
function Skeleton({ variant = "card" }) {
  const Variant = VARIANTS[variant];

  if (!Variant) {
    console.warn(`[Skeleton] Unknown variant "${variant}". Falling back to "card".`);
    return <SkeletonCard />;
  }

  return <Variant />;
}

export default Skeleton;
