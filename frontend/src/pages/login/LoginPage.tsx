import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { RoleEnum } from "../../models/Enums";

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  //const login = useAuthStore((state) => state.login); //contains login function
  const { login } = useAuthStore();

  const handleInputChange: React.ChangeEventHandler<HTMLInputElement> = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    // console.log(event.target);
    const { id, value } = event.target;
    if (id === "email") {
      setEmail(value);
    } else if (id === "password") {
      setPassword(value);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const userResult = await login(email, password);

    if (userResult) {
      console.log("Login uspesan, redirekcija...");
      // Provera uloge i redirekcija na odgovarajući dashboard
      if (userResult?.UserRole === RoleEnum.Admin) {
        navigate("/admin-dashboard");
      } else if (userResult?.UserRole === RoleEnum.Professor) {
        navigate("/professor-dashboard");
      } else if (userResult?.UserRole === RoleEnum.Student) {
        navigate("/student-dashboard");
      }
    } else {
      setError("Neispravan email ili lozinka");
    }
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header text-center">
              <h3>Prijava</h3>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                {error && <div className="alert alert-danger">{error}</div>}
                <div className="mb-3">
                  <label htmlFor="email" className="form-label">
                    Email adresa
                  </label>
                  <input
                    type="email"
                    className="form-control"
                    id="email"
                    value={email} // Povezujemo input sa stanjem
                    onChange={handleInputChange} // Pozivamo hendler na svaku promenu
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="password" className="form-label">
                    Lozinka
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    id="password"
                    value={password} // Povezujemo input sa stanjem
                    onChange={handleInputChange} // Pozivamo hendler na svaku promenu
                  />
                </div>
                <div className="d-grid gap-2">
                  <button type="submit" className="btn btn-primary">
                    Prijavi se
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
