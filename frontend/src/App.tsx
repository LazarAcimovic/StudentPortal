import { useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import Navbar from "./components/ui/Navbar";
import { registerNavigate } from "./lib/navigation";
import { useUserStore } from "./store/user/useUserStore";
import type { User } from "./shared/models/User";
import { APP_ROUTES, API_ROUTES } from "./config/constants";
import axiosClient from "./shared/api/axiosClient";

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    currentUser,
    setCurrentUser,
    clearCurrentUser,
    setHydrating,
    isHydrating,
  } = useUserStore();

  useEffect(() => {
    registerNavigate(navigate);
  }, [navigate]);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const hydrate = async () => {
      try {
        const res = await axiosClient.get<User>(API_ROUTES.ACCOUNT_ME, {
          signal,
          ...({ _retry: true } as object),
        });
        setCurrentUser(res.data);
      } catch (err: unknown) {
        const axiosErr = err as { name?: string; code?: string; response?: { status: number } };
        if (axiosErr?.name === "CanceledError" || axiosErr?.code === "ERR_CANCELED") return;

        if (axiosErr?.response?.status === 401) {
          try {
            await axiosClient.post(API_ROUTES.ACCOUNT_REFRESH, null, {
              signal,
              ...({ _retry: true } as object),
            });
            const res = await axiosClient.get<User>(API_ROUTES.ACCOUNT_ME, {
              signal,
              ...({ _retry: true } as object),
            });
            setCurrentUser(res.data);
          } catch {
            clearCurrentUser();
          }
        } else {
          clearCurrentUser();
        }
      } finally {
        if (!signal.aborted) {
          setHydrating(false);
        }
      }
    };

    hydrate();

    return () => {
      controller.abort();
    };
  }, [clearCurrentUser, setCurrentUser, setHydrating]);

  useEffect(() => {
    if (
      !isHydrating &&
      !currentUser &&
      location.pathname !== APP_ROUTES.HOME &&
      location.pathname !== APP_ROUTES.AUTH_LOGIN
    ) {
      navigate(APP_ROUTES.AUTH_LOGIN, { replace: true });
    }
  }, [currentUser, isHydrating, location.pathname, navigate]);

  if (isHydrating) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="flex-grow-1">
        <Outlet />
      </div>
      <ToastContainer position="top-right" autoClose={4000} />
    </>
  );
}

export default App;
