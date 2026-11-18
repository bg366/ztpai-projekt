import { useEffect, useState } from "react";
import {
  Anchor,
  LayoutDashboard,
  Ship,
  CalendarDays,
  MapPin,
  Wrench,
  Users,
  Bell,
  History,
  LogOut,
  Menu,
  X,
  ArrowUpRight,
  CheckCircle2,
} from "lucide-react";
import { api, setCsrf, names, type User } from "./api";
import { Auth } from "./Auth";
import { Loader } from "./ui";
import {
  Dashboard,
  Boats,
  Berths,
  Reservations,
  Availability,
  Faults,
  UserAdmin,
  Notifications,
  Activity,
} from "./pages";
const navigation = [
  { id: "dashboard", label: "Przegląd", icon: LayoutDashboard },
  { id: "availability", label: "Znajdź miejsce", icon: MapPin },
  { id: "reservations", label: "Rezerwacje", icon: CalendarDays },
  { id: "boats", label: "Moje jachty", icon: Ship },
  { id: "berths", label: "Miejsca portowe", icon: Anchor },
  { id: "faults", label: "Usterki", icon: Wrench },
  { id: "notifications", label: "Powiadomienia", icon: Bell },
  { id: "activity", label: "Dziennik portu", icon: History, staff: true },
  { id: "users", label: "Użytkownicy", icon: Users, admin: true },
];
export function App() {
  const [user, setUser] = useState<User | null>(null),
    [loading, setLoading] = useState(true),
    [page, setPage] = useState("dashboard"),
    [mobile, setMobile] = useState(false),
    [narrow, setNarrow] = useState(() => window.innerWidth <= 720),
    [version, setVersion] = useState(0),
    [toast, setToast] = useState("");
  useEffect(() => {
    const expired = () => {
      setUser(null);
      setCsrf("");
    };
    window.addEventListener("mazurport:session-expired", expired);
    api("/auth/me")
      .then((result) => {
        setCsrf(result.csrfToken);
        setUser(result.user);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () =>
      window.removeEventListener("mazurport:session-expired", expired);
  }, []);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 720px)");
    const change = () => setNarrow(query.matches);
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(id);
  }, [toast]);
  function navigate(next: string) {
    setPage(next);
    setMobile(false);
    window.scrollTo(0, 0);
  }
  const changed = (message = "Zmiany zapisane.") => {
    setVersion((v) => v + 1);
    setToast(message);
  };
  if (loading) return <Loader />;
  if (!user)
    return (
      <Auth
        onLogin={(u) => {
          setUser(u);
          navigate("dashboard");
        }}
      />
    );
  const props = { user, version, changed, navigate };
  return (
    <div className="app-shell">
      <button
        className="mobile-menu icon-button"
        aria-label="Otwórz menu"
        onClick={() => setMobile(true)}
      >
        <Menu />
      </button>
      {mobile && (
        <button
          className="sidebar-overlay"
          aria-label="Zamknij menu"
          onClick={() => setMobile(false)}
        />
      )}
      <aside
        className={`sidebar ${mobile ? "is-open" : ""}`}
        inert={narrow && !mobile}
        aria-hidden={narrow && !mobile}
      >
        <div className="brand">
          <Anchor size={29} />
          <span>
            MazurPort<small>MARINA • MAZURY</small>
          </span>
          <button
            className="mobile-close icon-button"
            aria-label="Zamknij menu"
            onClick={() => setMobile(false)}
          >
            <X />
          </button>
        </div>
        <p className="nav-caption">TWÓJ PORT</p>
        <nav>
          {navigation
            .filter(
              (n) =>
                (!n.staff || user.role !== "SAILOR") &&
                (!n.admin || user.role === "ADMIN"),
            )
            .map((n) => (
              <button
                key={n.id}
                className={page === n.id ? "active" : ""}
                onClick={() => navigate(n.id)}
              >
                <n.icon size={19} />
                {n.label}
                {page === n.id && <span className="nav-dot" />}
              </button>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <a href="/api/docs/" target="_blank" rel="noreferrer">
            Dokumentacja API <ArrowUpRight size={15} />
          </a>
          <div className="profile">
            <span className="avatar">
              {user.name
                .split(" ")
                .map((s) => s[0])
                .slice(0, 2)
                .join("")}
            </span>
            <div>
              <strong>{user.name}</strong>
              <small>{names[user.role]}</small>
            </div>
            <button
              className="icon-button"
              aria-label="Wyloguj się"
              onClick={async () => {
                try {
                  await api("/auth/logout", "POST");
                  setUser(null);
                  setCsrf("");
                } catch (e) {
                  setToast((e as Error).message);
                }
              }}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
      <main className="main">
        <div className="topbar">
          <span>
            <span className="status-dot" /> Port online
          </span>
          <span>Wszystkie terminy: czas polski</span>
        </div>
        {page === "dashboard" && <Dashboard {...props} />}{" "}
        {page === "boats" && <Boats {...props} />}{" "}
        {page === "berths" && <Berths {...props} />}{" "}
        {page === "reservations" && <Reservations {...props} />}{" "}
        {page === "availability" && <Availability {...props} />}{" "}
        {page === "faults" && <Faults {...props} />}{" "}
        {page === "users" && user.role === "ADMIN" && <UserAdmin {...props} />}{" "}
        {page === "notifications" && <Notifications {...props} />}{" "}
        {page === "activity" && user.role !== "SAILOR" && (
          <Activity {...props} />
        )}
        <footer className="page-footer">
          <span>MazurPort</span>
          <span>Spokojny port. Dobry rejs.</span>
        </footer>
      </main>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={20} />
          {toast}
          <button
            aria-label="Zamknij komunikat"
            className="icon-button"
            onClick={() => setToast("")}
          >
            <X size={17} />
          </button>
        </div>
      )}
    </div>
  );
}
