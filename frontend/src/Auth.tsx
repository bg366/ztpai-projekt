import { useState } from "react";
import { Anchor, ArrowUpRight, Waves, ShieldCheck, MapPin } from "lucide-react";
import { api, setCsrf, type User } from "./api";
import { Field, Form } from "./ui";
export function Auth({ onLogin }: { onLogin: (user: User) => void }) {
  const [register, setRegister] = useState(false);
  return (
    <div className="auth-page">
      <section className="auth-story">
        <div className="brand">
          <Anchor />
          <span>
            MazurPort<small>MARINA • MAZURY</small>
          </span>
        </div>
        <div className="auth-copy">
          <p className="eyebrow">DOBRZE MIEĆ SWÓJ PORT</p>
          <h1>
            Mniej formalności.
            <br />
            Więcej jeziora.
          </h1>
          <p>
            Zarezerwuj miejsce dla swojego jachtu.
            <br />
            Resztą zajmiemy się na brzegu.
          </p>
          <div className="lake-art" aria-hidden="true">
            <div className="sun" />
            <div className="sail sail-one" />
            <div className="sail sail-two" />
            <div className="water-line line-one" />
            <div className="water-line line-two" />
            <div className="water-line line-three" />
          </div>
        </div>
        <div className="auth-footer">
          <span>
            <MapPin size={15} /> Szlak Wielkich Jezior Mazurskich
          </span>
          <Waves size={27} />
        </div>
      </section>
      <section className="auth-form-panel">
        <div className="auth-form">
          <p className="eyebrow">TWÓJ PORT, POD RĘKĄ</p>
          <h2>
            {register ? "Zacznij od dobrego miejsca." : "Witaj na pokładzie."}
          </h2>
          <p className="muted">
            {register
              ? "Załóż konto żeglarza i zaplanuj swój pobyt."
              : "Zaloguj się, aby zarządzać swoim pobytem."}
          </p>
          <Form
            key={String(register)}
            label={register ? "Utwórz konto" : "Zaloguj się"}
            onSubmit={async (f) => {
              const result = await api(
                "/auth/" + (register ? "register" : "login"),
                "POST",
                {
                  email: f.get("email"),
                  password: f.get("password"),
                  ...(register ? { name: f.get("name") } : {}),
                },
              );
              setCsrf(result.csrfToken);
              onLogin(result.user);
            }}
          >
            {register && <Field label="Imię i nazwisko" name="name" />}
            <Field
              label="Adres e-mail"
              name="email"
              type="email"
              placeholder="jan@example.com"
            />
            <label className="field">
              <span>Hasło</span>
              <input
                name="password"
                type="password"
                required
                minLength={10}
                maxLength={128}
                autoComplete={register ? "new-password" : "current-password"}
                placeholder="Co najmniej 10 znaków"
              />
            </label>
          </Form>
          <p className="auth-switch">
            {register ? "Masz już konto?" : "Pierwszy raz w porcie?"}{" "}
            <button
              className="text-button"
              onClick={() => setRegister(!register)}
            >
              {register ? "Zaloguj się" : "Utwórz konto"}{" "}
              <ArrowUpRight size={14} />
            </button>
          </p>
          <div className="auth-note">
            <ShieldCheck size={19} />
            <span>Twoje dane i rezerwacje są dostępne po zalogowaniu.</span>
          </div>
        </div>
        <p className="auth-bottom">MazurPort · System obsługi mariny</p>
      </section>
    </div>
  );
}
