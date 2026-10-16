import { useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import Navbar from "./components/ui/Navbar";
import { registerNavigate } from "./lib/navigation";
import { useUserStore, type User } from "./store/user/useUserStore";
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

    axiosClient
      .get<User>(API_ROUTES.ACCOUNT_ME, {
        signal: controller.signal,
        ...({ _retry: true } as object),
      })
      .then((res) => {
        setCurrentUser(res.data);
      })
      .catch((err) => {
        if (err?.name !== "CanceledError" && err?.code !== "ERR_CANCELED") {
          clearCurrentUser();
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setHydrating(false);
        }
      });

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

  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
}

export default App;
