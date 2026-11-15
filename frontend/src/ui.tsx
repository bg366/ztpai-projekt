import { useEffect, useState, type ReactNode, type FormEvent } from "react";
import {
  X,
  LoaderCircle,
  ChevronLeft,
  ChevronRight,
  Inbox,
  AlertCircle,
  Search,
} from "lucide-react";
import { api, names, type Page } from "./api";
export function useData<T>(path: string, version = 0) {
  const [data, setData] = useState<T>(),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api<T>(path)
      .then((value) => {
        if (active) setData(value);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [path, version]);
  return { data, error, loading };
}
export function Loader() {
  return (
    <div className="state">
      <LoaderCircle className="spin" size={24} />
      <p>Wczytywanie danych…</p>
    </div>
  );
}
export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="error" role="alert">
      <AlertCircle size={18} />
      <span>{message}</span>
    </div>
  );
}
export function Empty({
  title = "Jeszcze nic tutaj nie ma",
  children,
}: {
  title?: string;
  children?: ReactNode;
}) {
  return (
    <div className="state empty">
      <Inbox size={32} />
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  );
}
export function Badge({ value }: { value: string }) {
  return (
    <span className={`badge ${value.toLowerCase()}`}>
      {names[value] ?? value}
    </span>
  );
}
export function Header({
  eyebrow = "MAZURPORT",
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      {action}
    </header>
  );
}
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    const previous = document.activeElement as HTMLElement;
    const dialog = document.querySelector<HTMLDialogElement>("dialog");
    dialog?.showModal();
    return () => {
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      className="modal"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button className="icon-button" aria-label="Zamknij" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Form({
  onSubmit,
  children,
  label = "Zapisz",
  onCancel,
}: {
  onSubmit: (data: FormData) => Promise<void>;
  children?: ReactNode;
  label?: string;
  onCancel?: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await onSubmit(new FormData(event.currentTarget));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit}>
      {children}
      {error && <ErrorBox message={error} />}
      <div className="form-actions">
        {onCancel && (
          <button type="button" className="button secondary" onClick={onCancel}>
            Anuluj
          </button>
        )}
        <button className="button" disabled={busy}>
          {busy ? (
            <>
              <LoaderCircle size={17} className="spin" />
              Zapisywanie…
            </>
          ) : (
            label
          )}
        </button>
      </div>
    </form>
  );
}
export function Field({
  label,
  name,
  type = "text",
  value,
  required = true,
  min,
  max,
  step,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  value?: string | number;
  required?: boolean;
  min?: number | string;
  max?: number | string;
  step?: number;
  placeholder?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={value}
        required={required}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
      />
    </label>
  );
}
export function Pager({
  data,
  onPage,
}: {
  data: Page;
  onPage: (page: number) => void;
}) {
  return (
    <div className="pager">
      <span>
        {data.total} {data.total === 1 ? "wynik" : "wyników"} · Strona{" "}
        {data.page} z {Math.max(1, Math.ceil(data.total / data.limit))}
      </span>
      <div>
        <button
          className="icon-button"
          aria-label="Poprzednia strona"
          disabled={data.page <= 1}
          onClick={() => onPage(data.page - 1)}
        >
          <ChevronLeft size={18} />
        </button>
        <button
          className="icon-button"
          aria-label="Następna strona"
          disabled={data.page * data.limit >= data.total}
          onClick={() => onPage(data.page + 1)}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
export function Filters({
  search,
  setSearch,
  status,
  setStatus,
  statuses,
  sort,
  setSort,
}: {
  search: string;
  setSearch: (s: string) => void;
  status: string;
  setStatus: (s: string) => void;
  statuses?: string[];
  sort: string;
  setSort: (s: string) => void;
}) {
  return (
    <div className="filters">
      <label className="search">
        <Search size={18} />
        <input
          aria-label="Szukaj"
          placeholder="Szukaj…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      {statuses && (
        <select
          aria-label="Filtr statusu"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Wszystkie statusy</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {names[s]}
            </option>
          ))}
        </select>
      )}
      <select
        aria-label="Sortowanie"
        value={sort}
        onChange={(e) => setSort(e.target.value)}
      >
        <option value="newest">Najnowsze</option>
        <option value="oldest">Najstarsze</option>
        <option value="name">Alfabetycznie</option>
      </select>
    </div>
  );
}
export function useList(path: string, version: number) {
  const [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [sort, setSort] = useState("newest");
  const filter = (fn: (s: string) => void) => (s: string) => {
    setPage(1);
    fn(s);
  };
  const result = useData<Page>(
    `${path}?${new URLSearchParams({ page: String(page), limit: "8", search, status, sort })}`,
    version,
  );
  return {
    ...result,
    setPage,
    filters: {
      search,
      setSearch: filter(setSearch),
      status,
      setStatus: filter(setStatus),
      sort,
      setSort: filter(setSort),
    },
  };
}
export function Confirm({
  title,
  description,
  onClose,
  onConfirm,
  label = "Potwierdź",
}: {
  title: string;
  description: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  label?: string;
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="modal-description">{description}</p>
      <Form onSubmit={onConfirm} onCancel={onClose} label={label} />
    </Modal>
  );
}
