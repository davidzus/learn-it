import {ReactNode} from "react";

const Card = ({title, actions, children}: { title: string; actions?: ReactNode; children: ReactNode }) => (
    <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold">{title}</h2>
            {actions}
        </div>
        {children}
    </section>
);

export default Card;
