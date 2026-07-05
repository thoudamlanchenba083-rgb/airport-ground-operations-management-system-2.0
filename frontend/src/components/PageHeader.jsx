export default function PageHeader({ icon: Icon, chip = 'icon-chip-blue', title, subtitle, actions }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className={`icon-chip ${chip} !w-11 !h-11 !rounded-2xl`}>
            <Icon size={20} strokeWidth={2.1} />
          </div>
        )}
        <div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white leading-tight">{title}</h2>
          {subtitle && <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2.5">{actions}</div>}
    </div>
  )
}
