import Icon from './Icon';
import { useTheme } from '../lib/theme';

type Props = {
  className?: string;
  withLabel?: boolean;
};

/** 日间 / 夜间模式切换按钮，前后台共用 */
export default function ThemeToggle({ className = '', withLabel = false }: Props) {
  const { theme, toggle } = useTheme();
  const isDay = theme === 'day';
  const label = isDay ? '切换到夜间模式' : '切换到日间模式';

  if (withLabel) {
    return (
      <button
        type='button'
        onClick={toggle}
        title={label}
        aria-label={label}
        className={
          'inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-[12.5px] font-medium text-white/70 transition hover:bg-white/10 hover:text-white ' +
          className
        }
      >
        <Icon name={isDay ? 'sun' : 'moon'} size={15} />
        {isDay ? '日间' : '夜间'}
      </button>
    );
  }

  return (
    <button
      type='button'
      onClick={toggle}
      title={label}
      aria-label={label}
      className={'theme-toggle ' + className}
    >
      <Icon name={isDay ? 'sun' : 'moon'} size={17} />
    </button>
  );
}
