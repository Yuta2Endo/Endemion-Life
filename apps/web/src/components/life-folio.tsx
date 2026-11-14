import { Panel, Tag } from "@endemion/ui";
import type { Locale } from "@endemion/game-core";

const YEARS = [12, 18, 24, 31, 38, 44, 51, 57];

/** A sample folio for the home page: one life, shown as an archive object. */
export function LifeFolio({ locale }: { locale: Locale }) {
  const ru = locale === "ru";
  return (
    <Panel className="relative overflow-hidden p-0" data-testid="life-folio" tone="quiet">
      <div className="flex items-center justify-between border-b border-line px-5 py-3 text-[11px] tracking-[0.08em] text-bone-500">
        <span>{ru ? "ФОЛИО III" : "FOLIO III"}</span>
        <span>{ru ? "РОД ИЗ АШЕНСКИХ ЗЕМЕЛЬ" : "HOUSE OF THE ASHEN MARCH"}</span>
      </div>
      <div className="grid gap-5 p-5 sm:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="eyebrow text-gold-400">{ru ? "Жизнь 34 года" : "Life, year 34"}</p>
          <h2 className="mt-2 font-display text-4xl leading-none text-bone-100">Илэн</h2>
          <p className="mt-1 text-sm text-bone-400">{ru ? "Третий хранитель Пепельного договора" : "Third keeper of the Ashen Oath"}</p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            <Tag tone="neutral">{ru ? "Упрямый" : "Willful"}</Tag>
            <Tag tone="good">{ru ? "Клятва порядка" : "Order oath"}</Tag>
            <Tag tone="gold">{ru ? "Пепел 41" : "Ember 41"}</Tag>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            {[
              [ru ? "Профессия" : "Trade", ru ? "Кузнец" : "Smith"],
              [ru ? "Дом" : "House", ru ? "Эш-Капитель" : "Ash Capital"],
              [ru ? "Наследник" : "Heir", ru ? "Мара, 9 лет" : "Mara, age 9"],
              [ru ? "Репутация" : "Renown", "42"]
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-bone-500">{label}</dt>
                <dd className="mt-0.5 text-bone-200">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="border-t border-line pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
          <p className="eyebrow text-bone-500">{ru ? "Хроника" : "Chronicle"}</p>
          <ol className="mt-3 space-y-0">
            {YEARS.map((year, index) => (
              <li key={year} className="flex min-h-8 items-start gap-3">
                <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${index === 4 ? "bg-gold-400" : "bg-ink-500"}`} aria-hidden="true" />
                <span className="w-7 shrink-0 font-display text-sm text-bone-400">{year}</span>
                <span className={`text-xs leading-5 ${index === 4 ? "text-bone-100" : "text-bone-500"}`}>
                  {index === 4
                    ? (ru ? "Принял договор. Родилась Мара." : "Took the oath. Mara born.")
                    : (ru ? "Год отмечен в роду." : "A year entered the house record.")}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Panel>
  );
}
