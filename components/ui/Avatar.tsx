interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  src?: string;
}

function hashColor(name: string): string {
  const colors = ['#2B3DE8', '#0EA574', '#F59E0B', '#E24B4A', '#8B5CF6', '#EC4899', '#14B8A6'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

const sizes = { sm: 'w-7 h-7 text-[11px]', md: 'w-9 h-9 text-[13px]', lg: 'w-12 h-12 text-[15px]' };

export function Avatar({ name, size = 'md', src }: AvatarProps) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const bg = hashColor(name);

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${sizes[size]} rounded-full object-cover shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center font-bold text-white shrink-0`}
      style={{ backgroundColor: bg }}
    >
      {initials}
    </div>
  );
}
